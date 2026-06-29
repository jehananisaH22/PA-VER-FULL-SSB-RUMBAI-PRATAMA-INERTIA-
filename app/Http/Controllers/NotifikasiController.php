<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;
use App\Models\NotifikasiTerkirim;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

use App\Models\User;
use App\Models\Siswa;
use App\Models\OrangTua;
use App\Models\Admin;
use App\Models\Pelatih;
use App\Models\Notifikasi;
use App\Models\Pembayaran;
use App\Models\BuktiPembayaran;
use App\Models\Jadwal_Latihan;


class NotifikasiController extends Controller
{
public function getNotifikasi(Request $request)
{
    $user = Auth::user();

    if (!$user) {
        return response()->json([
            'status' => false,
            'message' => 'Unauthorized'
        ]);
    }

    $role = $user->role;

    $query = NotifikasiTerkirim::with(['notifikasi', 'siswa', 'admin', 'pelatih']);

    // =====================
    // SISWA / ORANG TUA
    // =====================
if ($role === 'orang_tua') {

    $userId = auth()->id();
    $userEmail = strtolower((string) $user->email);

    $idSiswaList = \App\Models\Siswa::where(function ($q) use ($userId, $userEmail) {
        $q->where('user_id', $userId)
            ->orWhereHas('orangtua', function ($ortu) use ($userId) {
                $ortu->where('user_id', $userId);
            })
            ->orWhereHas('orangtua', function ($ortu) use ($userEmail) {
                $ortu->whereRaw('LOWER(email) = ?', [$userEmail]);
            });
    })->pluck('id_siswa');

    $query->where(function ($q) use ($idSiswaList, $userId) {
        $q->whereIn('id_siswa', $idSiswaList)
            ->orWhere('user_id', $userId);
    });
}
elseif ($role === 'siswa') {

    $userId = auth()->id();

    $idSiswa = \App\Models\Siswa::where('user_id', $userId)->value('id_siswa');

    $query->where('id_siswa', $idSiswa);
}

    // =====================
    // ADMIN
    // =====================
    elseif ($role === 'admin') {
        $admin = Admin::where('user_id', $user->id)->first();

        if (!$admin) {
            return response()->json([
                'status' => true,
                'role' => $role,
                'count' => 0,
                'data' => []
            ]);
        }

        $query->where(function ($q) use ($user, $admin) {
            $q->where('user_id', $user->id)
                ->orWhere('id_admin', $admin->id_admin);
        });
    }

    // =====================
    // PELATIH (FIXED 100%)
    // =====================
elseif ($role === 'pelatih') {

    $pelatih = \App\Models\Pelatih::where('user_id', $user->id)->first();

    if (!$pelatih) {
        return response()->json([
            'status' => true,
            'role' => $role,
            'count' => 0,
            'data' => []
        ]);
    }

    $query->where('id_pelatih', $pelatih->id_pelatih);
}

     else {
        return response()->json([
            'status' => false,
            'message' => 'Role tidak dikenali'
        ], 400);
    }

    $data = $query
        ->orderByDesc('id_notifikasi_terkirim')
        ->get()
        ->map(function ($item) {

            $nama_penerima = null;
            $role_penerima = null;

            if ($item->siswa) {
                $nama_penerima = $item->siswa->nama_siswa;
                $role_penerima = 'siswa';
            }
            elseif ($item->admin) {
                $nama_penerima = $item->admin->name ?? 'Admin';
                $role_penerima = 'admin';
            }
            elseif ($item->pelatih) {
                $nama_penerima = $item->pelatih->nama_pelatih ?? 'Pelatih';
                $role_penerima = 'pelatih';
            }

            return [
                'id' => $item->id_notifikasi_terkirim,
                'judul' => $item->notifikasi->judul ?? null,
                'isi' => $item->notifikasi->isi ?? null,
                'nama_penerima' => $nama_penerima,
                'role_penerima' => $role_penerima,
                'status_baca' => $item->status_baca,
                'tanggal' => optional($item->created_at)->format('Y-m-d H:i'),
            ];
        });

    return response()->json([
        'status' => true,
        'role' => $role,
        'count' => $data->count(),
        'data' => $data
    ]);
}

public function kirimNotif(Request $request)
{
    $request->validate([
        'judul' => 'required',
        'isi' => 'required',
        'target_role' => 'required',
    ]);

    // NORMALISASI ROLE
    $target = strtolower(trim($request->target_role));

    $notif = Notifikasi::create([
        'judul' => $request->judul,
        'isi' => $request->isi,
        'target_role' => $target,
        'tanggal_kirim' => now(),
    ]);

    $penerima = [];

    // helper aman array / single
    $toArray = function ($value) {
        if (!$value) return null;
        return is_array($value) ? $value : [$value];
    };

    // ===================== SISWA =====================
if ($target === 'siswa') {

    $siswaList = \App\Models\Siswa::with(['orangtua:id_ortu,user_id,nama_ortu', 'user'])
        ->whereIn('id_siswa', (array) $request->id_siswa)
        ->get();

    foreach ($siswaList as $siswa) {
        $parentUserId = $siswa->user_id ?: $siswa->orangtua?->user_id;

        if (!$parentUserId) {
            continue;
        }

        \DB::table('notifikasi_terkirim')->insert([
            'id_notifikasi' => $notif->id_notifikasi,
            'user_id' => $parentUserId,
            'id_siswa' => $siswa->id_siswa,
            'id_admin' => null,
            'id_pelatih' => null,
            'status_baca' => 'Belum Dibaca',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $penerima[] = [
            'role' => 'orang_tua',
            'id' => $parentUserId,
            'nama' => $siswa->orangtua?->nama_ortu ?? optional($siswa->user)->name ?? 'Orang Tua',
        ];
    }
}

    // ===================== ADMIN =====================
    elseif ($target === 'admin') {

        $adminList = Admin::query()
            ->join('users', 'admin.user_id', '=', 'users.id')
            ->whereRaw('LOWER(TRIM(users.role)) = ?', ['admin'])
            ->when($request->id_admin, function ($query) use ($request, $toArray) {
                $ids = $toArray($request->id_admin);

                $query->where(function ($q) use ($ids) {
                    $q->whereIn('admin.id_admin', $ids)
                        ->orWhereIn('users.id', $ids);
                });
            })
            ->select('admin.id_admin', 'admin.nama_admin', 'users.id as user_id', 'users.name')
            ->get();

        foreach ($adminList as $admin) {

            \DB::table('notifikasi_terkirim')->insert([
                'id_notifikasi' => $notif->id_notifikasi,
                'id_siswa' => null,
                'id_admin' => $admin->id_admin,
                'id_pelatih' => null,
                'user_id' => $admin->user_id,
                'status_baca' => 'Belum Dibaca',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $penerima[] = [
                'role' => 'admin',
                'id' => $admin->id_admin,
                'nama' => $admin->name ?? $admin->nama_admin,
            ];
        }
    }

    // ===================== PELATIH =====================
elseif ($target === 'pelatih') {

    $pelatihList = \App\Models\Pelatih::with('user');

    if ($request->filled('id_pelatih')) {
        $pelatihList->whereIn('id_pelatih', (array) $request->id_pelatih);
    }

    $pelatihList = $pelatihList->get();

    foreach ($pelatihList as $pelatih) {

        \DB::table('notifikasi_terkirim')->insert([
            'id_notifikasi' => $notif->id_notifikasi,
            'id_siswa' => null,
            'id_admin' => null,
            'id_pelatih' => $pelatih->id_pelatih,
            'user_id' => $pelatih->user_id,
            'status_baca' => 'Belum Dibaca',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $penerima[] = [
            'role' => 'pelatih',
            'id' => $pelatih->id_pelatih,
            'nama' => $pelatih->user->name ?? $pelatih->nama_pelatih,
        ];
    }
}

    // ===================== ORANG TUA =====================
    elseif ($target === 'orang_tua') {

        $siswaQuery = \App\Models\Siswa::with('orangtua:id_ortu,user_id,nama_ortu,email');

        if ($request->filled('id_siswa')) {
            $siswaQuery->whereIn('id_siswa', (array) $request->id_siswa);
        }

        if ($request->filled('kategori_umur')) {
            $umur = null;
            if (preg_match('/U-?(\d+)/i', (string) $request->kategori_umur, $match)) {
                $umur = (int) $match[1];
            }

            if ($umur) {
                $siswaQuery->where('umur', $umur);
            }
        }

        if ($request->filled('nama_siswa')) {
            $siswaQuery->where('nama_siswa', 'like', '%' . $request->nama_siswa . '%');
        }

        $siswaList = $siswaQuery->get();

        foreach ($siswaList as $siswa) {
            $parentUserId = $this->parentUserIdForStudent($siswa);

            if (!$parentUserId) {
                continue;
            }

            \DB::table('notifikasi_terkirim')->insert([
                'id_notifikasi' => $notif->id_notifikasi,
                'id_siswa' => $siswa->id_siswa,
                'id_admin' => null,
                'id_pelatih' => null,
                'user_id' => $parentUserId,
                'status_baca' => 'Belum Dibaca',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $penerima[] = [
                'role' => 'orang_tua',
                'id' => $parentUserId,
                'id_siswa' => $siswa->id_siswa,
                'nama_siswa' => $siswa->nama_siswa,
                'nama' => $siswa->orangtua?->nama_ortu ?? optional($siswa->user)->name ?? 'Orang Tua',
            ];
        }
    }

    // ===================== SEMUA =====================
    elseif ($target === 'semua') {

        // SISWA
        foreach (\App\Models\Siswa::with('orangtua:id_ortu,user_id,nama_ortu,email')->get() as $siswa) {
        $parentUserId = $this->parentUserIdForStudent($siswa);

        if (!$parentUserId) {
            continue;
        }

        \DB::table('notifikasi_terkirim')->insert([
    'id_notifikasi' => $notif->id_notifikasi,
    'user_id' => $parentUserId,
    'id_siswa' => $siswa->id_siswa,
    'id_admin' => null,
    'id_pelatih' => null,
    'status_baca' => 'Belum Dibaca',
    'created_at' => now(),
    'updated_at' => now(),
]);

            $penerima[] = [
                'role' => 'siswa',
                'id' => $siswa->id_siswa,
                'nama' => $siswa->nama_siswa,
            ];
        }

        // ADMIN
        foreach (Admin::query()
            ->join('users', 'admin.user_id', '=', 'users.id')
            ->whereRaw('LOWER(TRIM(users.role)) = ?', ['admin'])
            ->select('admin.id_admin', 'admin.nama_admin', 'users.id as user_id', 'users.name')
            ->get() as $admin) {
         \DB::table('notifikasi_terkirim')->insert([
    'id_notifikasi' => $notif->id_notifikasi,
    'user_id' => $admin->user_id,
    'id_siswa' => null,
    'id_admin' => $admin->id_admin,
    'id_pelatih' => null,
    'status_baca' => 'Belum Dibaca',
    'created_at' => now(),
    'updated_at' => now(),
]);

            $penerima[] = [
                'role' => 'admin',
                'id' => $admin->id_admin,
                'nama' => $admin->name ?? $admin->nama_admin,
            ];
        }

        // PELATIH
        foreach (Pelatih::with('user')->get() as $pelatih) {
          \DB::table('notifikasi_terkirim')->insert([
    'id_notifikasi' => $notif->id_notifikasi,
    'user_id' => $pelatih->user_id,
    'id_siswa' => null,
    'id_admin' => null,
    'id_pelatih' => $pelatih->id_pelatih,
    'status_baca' => 'Belum Dibaca',
    'created_at' => now(),
    'updated_at' => now(),
]);

            $penerima[] = [
                'role' => 'pelatih',
                'id' => $pelatih->id_pelatih,
                'nama' => $pelatih->user->name ?? $pelatih->nama_pelatih,
            ];
        }
    }

    $this->recordAdminNotificationActivity(
        $request->user(),
        'Mengirim notifikasi',
        $request->judul . ' ke ' . str_replace('_', ' ', $target) . ' (' . count($penerima) . ' penerima)'
    );

    return response()->json([
        'status' => true,
        'message' => 'Notifikasi berhasil dikirim',
        'target' => $target,
        'jumlah_penerima' => count($penerima),
        'penerima' => $penerima
    ]);
}

public function tandaiBaca($id)
{
    $notif = NotifikasiTerkirim::find($id);

    if (!$notif) {
        return response()->json([
            'status' => false,
            'message' => 'Notifikasi tidak ditemukan'
        ], 404);
    }

    $notif->update([
        'status_baca' => 'Sudah Dibaca',
        'tanggal_baca' => now()
    ]);

    return response()->json([
        'status' => true,
        'message' => 'Berhasil ditandai dibaca'
    ]);
}

private function parentUserIdForStudent(Siswa $siswa): ?int
{
    if ($siswa->user_id) {
        return (int) $siswa->user_id;
    }

    $siswa->loadMissing('orangtua');

    if ($siswa->orangtua?->user_id) {
        return (int) $siswa->orangtua->user_id;
    }

    if ($siswa->orangtua?->email) {
        $userId = User::whereRaw('LOWER(email) = ?', [strtolower($siswa->orangtua->email)])
            ->whereRaw('LOWER(TRIM(role)) = ?', ['orang_tua'])
            ->value('id');

        return $userId ? (int) $userId : null;
    }

    return null;
}

private function recordAdminNotificationActivity(?User $user, string $title, ?string $description = null): void
{
    if ($user?->role !== 'admin') {
        return;
    }

    try {
        $exists = DB::table('admin_activity_logs')
            ->where('title', $title)
            ->where('description', $description)
            ->where('created_at', '>=', now()->subSeconds(15))
            ->exists();

        if ($exists) {
            return;
        }

        DB::table('admin_activity_logs')->insert([
            'user_id' => $user->id,
            'admin_name' => $user->name,
            'title' => $title,
            'description' => $description,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    } catch (\Throwable $e) {
        Log::warning('Gagal menyimpan history notifikasi admin.', [
            'title' => $title,
            'error' => $e->getMessage(),
        ]);
    }
}


}
