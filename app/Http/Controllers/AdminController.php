<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use App\Models\User;
use App\Models\Siswa;
use App\Models\OrangTua;
use App\Models\Admin;
use App\Models\Pelatih;
use App\Models\Notifikasi;
use App\Models\NotifikasiTerkirim;
use App\Models\Pembayaran;
use App\Models\BuktiPembayaran;
use App\Models\Jadwal_Latihan;
use App\Models\Promosi;
use App\Models\Pencapaian;
use App\Models\MasterBadge;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use App\Models\Pendaftaran_Siswa;
use App\Services\SiswaPaymentStatusService;
use App\Services\Payment\PaymentValidationService;
use App\Mail\SendPasswordMail;
use Carbon\Carbon;
use Inertia\Inertia;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;

class AdminController extends Controller
{
    public function HistoryAktivitasAdmin(Request $request)
    {
        $query = DB::table('admin_activity_logs')
            ->orderByDesc('created_at')
            ->orderByDesc('id');

        if ($request->filled('month')) {
            $query->whereMonth('created_at', (int) $request->month);
        }

        if ($request->filled('year')) {
            $query->whereYear('created_at', (int) $request->year);
        }

        $history = $query
            ->limit(120)
            ->get()
            ->map(fn ($item) => [
                'id' => $item->id,
                'title' => $item->title,
                'description' => $item->description,
                'createdAt' => Carbon::parse($item->created_at)->timestamp * 1000,
                'created_at' => $item->created_at,
                'adminName' => $item->admin_name,
            ]);

        return response()->json([
            'status' => true,
            'data' => $history,
        ]);
    }

    public function StoreAktivitasAdmin(Request $request)
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $user = $request->user();
        $existing = DB::table('admin_activity_logs')
            ->where('title', $validated['title'])
            ->where('description', $validated['description'] ?? null)
            ->where('created_at', '>=', now()->subSeconds(15))
            ->orderByDesc('id')
            ->first();

        if ($existing) {
            return response()->json([
                'status' => true,
                'message' => 'History admin sudah tersimpan.',
                'data' => [
                    'id' => $existing->id,
                    'title' => $existing->title,
                    'description' => $existing->description,
                    'createdAt' => Carbon::parse($existing->created_at)->timestamp * 1000,
                    'created_at' => $existing->created_at,
                    'adminName' => $existing->admin_name,
                ],
            ]);
        }

        $id = DB::table('admin_activity_logs')->insertGetId([
            'user_id' => $user?->id,
            'admin_name' => $user?->name,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $item = DB::table('admin_activity_logs')->where('id', $id)->first();

        return response()->json([
            'status' => true,
            'message' => 'History admin berhasil disimpan.',
            'data' => [
                'id' => $item->id,
                'title' => $item->title,
                'description' => $item->description,
                'createdAt' => Carbon::parse($item->created_at)->timestamp * 1000,
                'created_at' => $item->created_at,
                'adminName' => $item->admin_name,
            ],
        ], 201);
    }

    public function Admin_Pendaftaran_siswa(Request $request)
{
    $query = \App\Models\Pendaftaran_Siswa::with([
        'siswa',
        'siswa.orangtua'
    ]);

    // SUMMARY
    $summary = [
        'disetujui' => \App\Models\Pendaftaran_Siswa::where('status_approval', 'Disetujui')->count(),
        'revisi'    => \App\Models\Pendaftaran_Siswa::where('status_approval', 'Revisi')->count(),
        'ditolak'   => \App\Models\Pendaftaran_Siswa::where('status_approval', 'Ditolak')->count(),
    ];

if ($request->filled('search')) {
    $query->where(function ($q) use ($request) {

        // search nama siswa
        $q->whereHas('siswa', function ($sub) use ($request) {
            $sub->where('nama_siswa', 'like', '%' . $request->search . '%');
        })

        // OR search status approval
        ->orWhere('status_approval', 'like', '%' . $request->search . '%');
    });
}

    // FILTER STATUS
    if ($request->filled('status')) {
        $query->where('status_approval', $request->status);
    }

    // PAGINATION
    $pendaftaran = $query
        ->orderBy('tanggal_daftar', 'desc')
        ->paginate(10);

    return response()->json([
        'status' => true,
        'message' => 'Data pendaftaran siswa',
        'data' => $pendaftaran,
        'summary' => $summary
    ]);
}


public function Admin_validasi_Pendaftaran_siswa($id)
{
    $pendaftaran = Pendaftaran_Siswa::with(['siswa.orangtua'])
        ->where('id_pendaftaran', $id)
        ->first()
        ?: Pendaftaran_Siswa::with(['siswa.orangtua'])
            ->where('id_siswa', $id)
            ->latest('id_pendaftaran')
            ->first();

    if (!$pendaftaran) {
        return response()->json([
            'success' => false,
            'message' => 'Data tidak ditemukan'
        ], 404);
    }

    $buktiPembayaran = BuktiPembayaran::with('pembayaran')
        ->where('id_siswa', $pendaftaran->id_siswa)
        ->whereHas('pembayaran', function ($query) {
            $query->where('jenis', 'Pendaftaran');
        })
        ->orderByDesc('tanggal_bukti_bayar')
        ->orderByDesc('id_bukti_pembayaran')
        ->first();

    $buktiPath = $buktiPembayaran?->bukti_bayar;

    // FIX SAFE PAYMENT URL
    $buktiUrl = $buktiPath
        ? url('/api/admin/lihat-bukti/pembayaran/' . basename($buktiPath))
        : null;

    $pendaftaran->setAttribute('bukti_pembayaran_pendaftaran', $buktiPembayaran);

    if ($pendaftaran->siswa) {
        $displayStudent = $pendaftaran->siswa->replicate();
        $displayStudent->setAttribute('id_siswa', $pendaftaran->siswa->id_siswa);
        $displayStudent->setAttribute('nama_siswa', $pendaftaran->pending_nama_siswa ?: $pendaftaran->siswa->nama_siswa);
        $displayStudent->setAttribute('nama_ayah', $pendaftaran->pending_nama_ayah ?: $pendaftaran->siswa->nama_ayah);
        $displayStudent->setAttribute('nama_ibu', $pendaftaran->pending_nama_ibu ?: $pendaftaran->siswa->nama_ibu);
        $displayBirthDate = ($pendaftaran->pending_tanggal_lahir ?? null) ?: $pendaftaran->siswa->tanggal_lahir;
        $displayAge = $displayBirthDate
            ? Carbon::parse($displayBirthDate)->age
            : ($pendaftaran->pending_umur ?: $pendaftaran->siswa->umur);
        $displayStudent->setAttribute('umur', $displayAge);
        $displayStudent->setAttribute('tanggal_lahir', $displayBirthDate);
        $displayStudent->setAttribute('akta_kelahiran', $pendaftaran->pending_akta_kelahiran ?: $pendaftaran->siswa->akta_kelahiran);
        $displayStudent->setAttribute('kartu_keluarga', $pendaftaran->pending_kartu_keluarga ?: $pendaftaran->siswa->kartu_keluarga);
        $displayStudent->setAttribute('rapor', $pendaftaran->pending_rapor ?: $pendaftaran->siswa->rapor);
        $displayStudent->setAttribute('pas_photo_3x4', $pendaftaran->pending_pas_photo_3x4 ?: $pendaftaran->siswa->pas_photo_3x4);
        $displayStudent->setRelation('orangtua', $pendaftaran->siswa->orangtua);
        $pendaftaran->setRelation('siswa', $displayStudent);
    }

    $pendaftaran->setAttribute('files', [
        'birthCert' => array_values(array_filter([$pendaftaran->siswa?->akta_kelahiran])),
        'reportCard' => array_values(array_filter([$pendaftaran->siswa?->rapor])),
        'familyCard' => array_values(array_filter([$pendaftaran->siswa?->kartu_keluarga])),
        'photo' => array_values(array_filter([$pendaftaran->siswa?->pas_photo_3x4])),
        'paymentProof' => array_values(array_filter([$buktiPath])),
    ]);

    // ✅ FIXED ALL URL (IMPORTANT: /api ADDED)
    $pendaftaran->setAttribute('fileObjects', [
        'birthCert' => array_values(array_filter([
            $pendaftaran->siswa?->akta_kelahiran
                ? url('/api/admin/file-pendaftaran-siswa/akta/' . basename($pendaftaran->siswa->akta_kelahiran))
                : null,
        ])),

        'reportCard' => array_values(array_filter([
            $pendaftaran->siswa?->rapor
                ? url('/api/admin/file-pendaftaran-siswa/rapor/' . basename($pendaftaran->siswa->rapor))
                : null,
        ])),

        'familyCard' => array_values(array_filter([
            $pendaftaran->siswa?->kartu_keluarga
                ? url('/api/admin/file-pendaftaran-siswa/kk/' . basename($pendaftaran->siswa->kartu_keluarga))
                : null,
        ])),

        'photo' => array_values(array_filter([
            $pendaftaran->siswa?->pas_photo_3x4
                ? url('/api/admin/file-pendaftaran-siswa/foto/' . basename($pendaftaran->siswa->pas_photo_3x4))
                : null,
        ])),

        'paymentProof' => array_values(array_filter([$buktiUrl])),
    ]);

    $pendaftaran->setAttribute('invalidIdentityFields', array_values(array_filter([
        $pendaftaran->val_nama_siswa === 'tidak_valid' ? 'childName' : null,
        $pendaftaran->val_nama_ayah === 'tidak_valid' ? 'fatherName' : null,
        $pendaftaran->val_nama_ibu === 'tidak_valid' ? 'motherName' : null,
        $pendaftaran->val_umur === 'tidak_valid' ? 'age' : null,
    ])));

    $pendaftaran->setAttribute('invalidUploadFields', array_values(array_filter([
        $pendaftaran->val_akta === 'tidak_valid' ? 'birthCert' : null,
        $pendaftaran->val_kk === 'tidak_valid' ? 'familyCard' : null,
        $pendaftaran->val_rapor === 'tidak_valid' ? 'reportCard' : null,
        $pendaftaran->val_foto === 'tidak_valid' ? 'photo' : null,
        $buktiPembayaran?->status === 'ditolak' ? 'paymentProof' : null,
    ])));

    return response()->json([
        'success' => true,
        'data' => $pendaftaran
    ]);
}

public function lihatfilePendaftaran($jenis, $filename)
{
    $allowed = ['akta', 'kk', 'rapor', 'foto'];

    if (!in_array($jenis, $allowed)) {
        return response()->json([
            'success' => false,
            'message' => 'Jenis file tidak valid'
        ], 403);
    }

    // FIX double extension bug
    $filename = preg_replace('/(\.png)+$/', '.png', $filename);

    $path = storage_path("app/private/$jenis/$filename");

    if (!file_exists($path)) {
        return response()->json([
            'success' => false,
            'message' => 'File tidak ditemukan',
            'debug_path' => $path
        ], 404);
    }

    return response()->file($path);
}


public function submitValidasi(Request $request, $id)
{
    $pendaftaran = Pendaftaran_Siswa::with(['siswa.orangtua'])
        ->where('id_pendaftaran', $id)
        ->firstOrFail();

    $fields = [
        'val_nama_siswa',
        'val_nama_ibu',
        'val_nama_ayah',
        'val_umur',
        'val_akta',
        'val_kk',
        'val_rapor',
        'val_foto',
    ];

    foreach ($fields as $field) {
        if (!$request->has($field)) {
            return response()->json([
                'success' => false,
                'message' => "$field wajib dikirim"
            ], 422);
        }
    }

    foreach ($fields as $field) {
        $pendaftaran->$field = $request->$field;
    }

    $values = array_map(fn($v) => strtolower(trim($v ?? '')), $request->only($fields));
    $paymentProofStatus = strtolower(trim((string) $request->input('val_bukti_pembayaran', 'valid')));

    if (in_array('tidak_valid', $values, true) || $paymentProofStatus !== 'valid') {
        $statusApproval = 'Revisi';
    } elseif (count(array_unique($values)) === 1 && reset($values) === 'valid') {
        $statusApproval = 'Disetujui';
    } else {
        $statusApproval = 'Revisi';
    }

    $pendaftaran->status_approval = $statusApproval;
    $pendaftaran->save();

    // =========================
    // PAYMENT LOGIC
    // =========================
    $paymentCreated = false;
    $paymentData = null;

    if ($statusApproval === 'Disetujui') {
        $this->applyPendingRegistrationRevision($pendaftaran);
        $pendaftaran->load('siswa.orangtua');

        $cekPembayaran = Pembayaran::where('id_siswa', $pendaftaran->id_siswa)
            ->where('jenis', 'Pendaftaran')
            ->first();

        if (!$cekPembayaran) {
            $paymentData = Pembayaran::create([
                'id_siswa'      => $pendaftaran->id_siswa,
                'periode'       => date('Y'),
                'jumlah'        => 280000,
                'tanggal_bayar' => now()->toDateString(),
                'status'        => 'Lunas',
                'jenis'         => 'Pendaftaran',
            ]);

            $paymentCreated = true;
        } else {
            $cekPembayaran->update([
                'tanggal_bayar' => $cekPembayaran->tanggal_bayar ?: now()->toDateString(),
                'status' => 'Lunas',
            ]);

            $paymentData = $cekPembayaran->fresh();
        }

        $latestRegistrationProof = BuktiPembayaran::where('id_siswa', $pendaftaran->id_siswa)
            ->whereHas('pembayaran', fn ($query) => $query->where('jenis', 'Pendaftaran'))
            ->latest('id_bukti_pembayaran')
            ->first();

        if ($latestRegistrationProof) {
            $latestRegistrationProof->update(['status' => 'diterima']);
        }

        $this->activateStudentAccount($pendaftaran->siswa);

        $this->sendStudentNotification(
            $pendaftaran->siswa,
            'Akun Diaktifkan',
            'Pendaftaran dan bukti pembayaran sudah valid. Akun siswa sekarang aktif.'
        );
    } else {
        if ($pendaftaran->siswa) {
            $pendaftaran->siswa->update([
                'status' => 'Inactive',
            ]);
        }

        if ($paymentProofStatus !== 'valid') {
            $latestRegistrationProof = BuktiPembayaran::where('id_siswa', $pendaftaran->id_siswa)
                ->whereHas('pembayaran', fn ($query) => $query->where('jenis', 'Pendaftaran'))
                ->latest('id_bukti_pembayaran')
                ->first();

            if ($latestRegistrationProof) {
                $latestRegistrationProof->update(['status' => 'ditolak']);
            }
        }

        $this->sendStudentNotification(
            $pendaftaran->siswa,
            'Pendaftaran Perlu Perbaikan',
            'Admin menandai data pendaftaran belum valid. Silakan upload ulang data yang diminta.'
        );
    }

    $this->recordAdminActivity(
        $statusApproval === 'Disetujui' ? 'Memvalidasi pendaftaran siswa' : 'Meminta revisi pendaftaran siswa',
        ($pendaftaran->siswa?->nama_siswa ?? 'Siswa') . ' - status ' . $statusApproval
    );

    return response()->json([
        'success' => true,
        'message' => 'Validasi berhasil disimpan',
        'status_approval' => $statusApproval,
        'payment_created' => $paymentCreated,
        'data_pembayaran' => $paymentData,
        'siswa_status' => $pendaftaran->siswa?->fresh()?->status,
        'data' => $pendaftaran->fresh()
    ]);
}

private function applyPendingRegistrationRevision(Pendaftaran_Siswa $pendaftaran): void
{
    $siswa = $pendaftaran->siswa;

    if (! $siswa) {
        return;
    }

    $studentUpdates = [];

    if ($pendaftaran->pending_tanggal_lahir) {
        $studentUpdates['tanggal_lahir'] = $pendaftaran->pending_tanggal_lahir;
        $studentUpdates['umur'] = Carbon::parse($pendaftaran->pending_tanggal_lahir)->age;
    } elseif ($pendaftaran->pending_umur !== null && $pendaftaran->pending_umur !== '') {
        $studentUpdates['umur'] = $pendaftaran->pending_umur;
    }

    $pendingMap = [
        'pending_nama_siswa' => 'nama_siswa',
        'pending_nama_ayah' => 'nama_ayah',
        'pending_nama_ibu' => 'nama_ibu',
        'pending_akta_kelahiran' => 'akta_kelahiran',
        'pending_kartu_keluarga' => 'kartu_keluarga',
        'pending_rapor' => 'rapor',
        'pending_pas_photo_3x4' => 'pas_photo_3x4',
    ];

    foreach ($pendingMap as $pendingColumn => $studentColumn) {
        $pendingValue = $pendaftaran->{$pendingColumn};

        if ($pendingValue !== null && $pendingValue !== '') {
            $studentUpdates[$studentColumn] = $pendingValue;
        }

        $pendaftaran->{$pendingColumn} = null;
    }

    $pendaftaran->pending_tanggal_lahir = null;
    $pendaftaran->pending_umur = null;

    if (! empty($studentUpdates)) {
        $siswa->update($studentUpdates);
    }

    $pendaftaran->save();
}


public function pembayaran_admin(Request $request)
{
    $siswaList = Siswa::select('id_siswa', 'nama_siswa')
        ->whereRaw('LOWER(COALESCE(status, "")) = ?', ['active'])
        ->orderBy('nama_siswa')
        ->get();

    $query = Pembayaran::with(['siswa.pendaftaran'])
        ->whereHas('siswa');

    // =========================
    // FILTER: NAMA SISWA
    // =========================
    if ($request->filled('nama_siswa')) {
        $query->whereHas('siswa', function ($q) use ($request) {
            $q->where('nama_siswa', 'like', '%' . $request->nama_siswa . '%');
        });
    }

    // =========================
    // FILTER: JENIS
    // =========================
    if ($request->filled('jenis')) {
        $query->where('jenis', $request->jenis);
    }

    // =========================
    // FILTER: STATUS
    // =========================
    if ($request->filled('status')) {
        $query->where('status', $request->status);
    }

    // =========================
    // PAGINATION
    // =========================
    $pembayaran = $query->orderBy('id_pembayaran', 'desc')
        ->paginate(10)
        ->withQueryString();

    $pembayaran->getCollection()->transform(function ($item) {
        if (strtolower((string) $item->jenis) !== 'harian') {
            return $item;
        }

        $month = substr((string) ($item->periode ?: $item->tanggal_bayar), 0, 7);
        $monthlyTarget = SiswaPaymentStatusService::MONTHLY_TARGET;
        $monthlyPaid = DB::table('pembayaran')
            ->join('bukti_pembayaran', 'pembayaran.id_pembayaran', '=', 'bukti_pembayaran.id_pembayaran')
            ->where('pembayaran.id_siswa', $item->id_siswa)
            ->where('pembayaran.jenis', 'Harian')
            ->where('pembayaran.periode', 'like', $month . '%')
            ->whereRaw('LOWER(TRIM(bukti_pembayaran.status)) = ?', ['diterima'])
            ->sum('pembayaran.jumlah');
        $monthlyPending = DB::table('pembayaran')
            ->join('bukti_pembayaran', 'pembayaran.id_pembayaran', '=', 'bukti_pembayaran.id_pembayaran')
            ->where('pembayaran.id_siswa', $item->id_siswa)
            ->where('pembayaran.jenis', 'Harian')
            ->where('pembayaran.periode', 'like', $month . '%')
            ->whereRaw('LOWER(TRIM(bukti_pembayaran.status)) = ?', ['menunggu validasi'])
            ->sum('pembayaran.jumlah');

        $item->monthly_target = $monthlyTarget;
        $item->monthly_paid_amount = (float) $monthlyPaid;
        $item->monthly_pending_amount = (float) $monthlyPending;
        $item->monthly_remaining_amount = max(0, $monthlyTarget - (float) $monthlyPaid);

        return $item;
    });

    return response()->json([
        'success' => true,
        'message' => 'Data pembayaran berhasil diambil',
        'data' => $pembayaran,
        'filters' => [
            'nama_siswa' => $request->nama_siswa,
            'jenis' => $request->jenis,
            'status' => $request->status,
        ],
        'siswa_list' => $siswaList
    ]);
}


public function buktipembayaran_admin(Request $request, $id_siswa)
{
    $siswa = Siswa::findOrFail($id_siswa);

    $query = BuktiPembayaran::with('siswa')
        ->where('id_siswa', $id_siswa)
        ->whereHas('pembayaran', function ($q) use ($request) {
            if ($request->filled('jenis')) {
                $q->where('jenis', $request->jenis);
            }
        });

    $data = $query->orderBy('tanggal_bukti_bayar', 'DESC')
        ->paginate(10)
        ->withQueryString();

    // summary
    $baseQuery = BuktiPembayaran::where('id_siswa', $id_siswa);

    $pending = (clone $baseQuery)->where('status', 'Menunggu validasi')->count();
    $diterima = (clone $baseQuery)->where('status', 'diterima')->count();
    $ditolak = (clone $baseQuery)->where('status', 'ditolak')->count();

    return response()->json([
        'success' => true,
        'message' => 'Data bukti pembayaran berhasil diambil',
        'siswa' => $siswa,
        'data' => $data,
        'summary' => [
            'pending' => $pending,
            'diterima' => $diterima,
            'ditolak' => $ditolak
        ]
    ]);
}


public function lihatBukti_pembayaran_admin($folder, $file)
{
    $user = auth()->user();

    if (!in_array($user->role, ['admin', 'pelatih'])) {
        return response()->json(['message' => 'Unauthorized'], 403);
    }

    $folder = trim(str_replace(['..', '\\'], ['', '/'], $folder), '/');
    $file = basename($file);

    $possiblePaths = [
        storage_path("app/private/{$folder}/{$file}"),
        storage_path("app/public/{$folder}/{$file}"),
        storage_path("app/{$folder}/{$file}"),
    ];

    $path = collect($possiblePaths)->first(fn ($candidate) => file_exists($candidate));

    if (!$path) {
        return response()->json(['message' => 'File tidak ditemukan'], 404);
    }

    return response()->file($path);
}


public function Bukti_Diterima($id, PaymentValidationService $paymentValidationService)
{
    try {
        $result = $paymentValidationService->accept((int) $id);
        $bukti = $result['proof'];
        $pembayaran = $result['payment'];
        $studentActivated = $result['studentActivated'];

        $this->sendStudentNotification(
            $bukti->siswa,
            'Pembayaran Diterima',
            'Bukti pembayaran ' . ($pembayaran?->jenis ?? '') . ' sudah divalidasi admin dan dinyatakan lunas.'
        );

        $this->recordAdminActivity(
            'Memvalidasi pembayaran',
            ($bukti->siswa?->nama_siswa ?? 'Siswa') . ' - ' . ($pembayaran?->jenis ?? 'Pembayaran') . ' diterima'
        );

        return response()->json([
            'success' => true,
            'message' => $studentActivated
                ? 'Bukti diterima, akun siswa sudah aktif dan pembayaran lunas'
                : 'Bukti diterima dan pembayaran lunas. Akun siswa menunggu validasi dokumen pendaftaran.',
            'data' => [
                'bukti' => $bukti,
                'siswa_status' => $bukti->siswa?->fresh()?->status,
                'pembayaran_status' => $pembayaran?->status
            ]
        ]);

    } catch (\Throwable $e) {
        return response()->json([
            'success' => false,
            'message' => 'Gagal approve bukti',
            'error' => $e->getMessage()
        ], 500);
    }
}


public function Bukti_Ditolak($id, PaymentValidationService $paymentValidationService)
{
    try {
        $result = $paymentValidationService->reject((int) $id);
        $bukti = $result['proof'];
        $pembayaran = $result['payment'];

        $this->sendStudentNotification(
            $bukti->siswa,
            'Pembayaran Ditolak',
            'Bukti pembayaran ' . ($pembayaran?->jenis ?? '') . ' belum valid. Silakan upload ulang bukti pembayaran.'
        );

        $this->recordAdminActivity(
            'Menolak pembayaran',
            ($bukti->siswa?->nama_siswa ?? 'Siswa') . ' - ' . ($pembayaran?->jenis ?? 'Pembayaran') . ' ditolak'
        );

        return response()->json([
            'success' => true,
            'message' => 'Bukti ditolak, siswa tetap inactive dan bukti pembayaran perlu diupload ulang',
            'data' => [
                'bukti' => $bukti,
                'siswa_status' => $bukti->siswa?->fresh()?->status,
                'pembayaran_status' => $pembayaran?->status,
                'status_approval' => $bukti->siswa?->pendaftaran?->status_approval,
            ],
        ]);

    } catch (\Throwable $e) {
        return response()->json([
            'success' => false,
            'message' => 'Gagal reject bukti',
            'error' => $e->getMessage()
        ], 500);
    }
}


public function history_pembayaran(Request $request)
{
    // =========================
    // QUERY HISTORY DARI TABEL PEMBAYARAN
    // =========================
    $query = Pembayaran::with([
            'siswa:id_siswa,nama_siswa'
        ]);

    // =========================
    // FILTER: NAMA SISWA
    // =========================
    if ($request->filled('nama_siswa')) {
        $query->whereHas('siswa', function ($q) use ($request) {
            $q->where('nama_siswa', 'like', '%' . $request->nama_siswa . '%');
        });
    }

    // =========================
    // FILTER: JENIS
    // =========================
    if ($request->filled('jenis')) {
        $query->where('jenis', $request->jenis);
    }

    // =========================
    // FILTER: STATUS
    // =========================
    if ($request->filled('status')) {
        $query->where('status', $request->status);
    }

    // =========================
    // FILTER: TANGGAL BAYAR
    // =========================
    if ($request->filled('tanggal_bayar')) {
        $query->whereDate('tanggal_bayar', $request->tanggal_bayar);
    }

    // =========================
    // DATA HISTORY (SORT TERBARU)
    // =========================
   $history = $query
    ->orderBy('tanggal_bayar', 'desc')
    ->paginate(10)
    ->withQueryString();

    // =========================
    // RESPONSE
    // =========================
    return response()->json([
        'success' => true,
        'message' => 'History pembayaran berhasil diambil',
        'data' => $history,
        'filters' => [
            'nama_siswa' => $request->nama_siswa,
            'jenis' => $request->jenis,
            'status' => $request->status,
            'tanggal_bayar' => $request->tanggal_bayar,
        ]
    ]);
}


public function Data_Siswa(Request $request)
{
    $query = Siswa::with('user');

    // =========================
    // SEARCH (NAMA + EMAIL + PARAM EMAIL)
    // =========================
    if ($request->filled('nama_siswa') || $request->filled('email')) {

        $search = $request->nama_siswa ?? $request->email;

        $query->where(function ($q) use ($search) {
            $q->where('nama_siswa', 'like', "%$search%")
              ->orWhereHas('user', function ($q2) use ($search) {
                  $q2->where('email', 'like', "%$search%");
              });
        });
    }

    // =========================
    // FILTER KATEGORI UMUR U-6 SAMPAI U-16
    // =========================
    if ($request->filled('kategori_umur')) {
        if (preg_match('/U(\d+)/', strtoupper($request->kategori_umur), $match)) {
            $this->applyStudentAgeFilter($query, (int) $match[1]);
        }
    }

    // =========================
    // RESULT
    // =========================
    $siswa = $query
        ->orderBy('nama_siswa', 'desc')
        ->paginate(10)
        ->withQueryString();

    return response()->json([
        'success' => true,
        'message' => 'Data siswa berhasil diambil',
        'data' => $siswa
    ]);
}

public function Profil_Siswa_Admin($id_siswa)
{
    $siswa = Siswa::query()
        ->leftJoin('orang_tua', 'siswa.id_ortu', '=', 'orang_tua.id_ortu')
        ->leftJoin('profil_siswa', 'siswa.id_siswa', '=', 'profil_siswa.id_siswa')
        ->where('siswa.id_siswa', $id_siswa)
        ->select(
            'siswa.id_siswa',
            'siswa.nama_siswa',
            'siswa.nik',
            'siswa.no_kk',
            'siswa.nisn',
            'siswa.tempat_lahir',
            'siswa.tanggal_lahir',
            'siswa.umur',
            'siswa.status',
            'siswa.id_ortu',
            'orang_tua.nama_ortu',
            'orang_tua.email',
            'orang_tua.no_hp',
            'profil_siswa.alamat',
            'profil_siswa.foto',
            'profil_siswa.tinggi_badan',
            'profil_siswa.berat_badan'
        )
        ->firstOrFail();

    return Inertia::render('Admin/PerbaikiProfilSiswaAdmin', [
        'userName' => Auth::user()?->name ?? 'Admin SSB',
        'student' => [
            'id' => $siswa->id_siswa,
            'name' => $siswa->nama_siswa,
            'nik' => $siswa->nik ?: '',
            'familyNumber' => $siswa->no_kk ?: '',
            'nisn' => $siswa->nisn ?: '',
            'birthPlace' => $siswa->tempat_lahir ?: '',
            'birthDate' => $siswa->tanggal_lahir ?: '',
            'email' => $siswa->email ?: '-',
            'parentName' => $siswa->nama_ortu ?: '',
            'parentPhone' => $siswa->no_hp ?: '',
            'age' => $siswa->tanggal_lahir ? \Carbon\Carbon::parse($siswa->tanggal_lahir)->age : $siswa->umur,
            'status' => $siswa->status,
            'address' => $siswa->alamat ?: '',
            'height' => $siswa->tinggi_badan,
            'weight' => $siswa->berat_badan,
            'photo' => $siswa->foto ? asset('storage/' . ltrim($siswa->foto, '/')) : null,
            'photoName' => $siswa->foto,
        ],
    ]);
}

public function Update_Profil_Siswa(Request $request, $id_siswa)
{
    $siswa = Siswa::findOrFail($id_siswa);

    $validated = $request->validate([
        'nama_siswa' => 'required|string|max:100',
        'nik' => 'nullable|string|max:20',
        'no_kk' => 'nullable|string|max:20',
        'nisn' => 'nullable|string|max:20',
        'tempat_lahir' => 'nullable|string|max:100',
        'tanggal_lahir' => 'nullable|date',
        'nama_ortu' => 'nullable|string|max:100',
        'no_hp_ortu' => 'nullable|string|max:20',
        'umur' => 'nullable|integer|min:6|max:16',
        'alamat' => 'nullable|string|max:255',
        'tinggi_badan' => 'nullable|integer|min:1|max:250',
        'berat_badan' => 'nullable|integer|min:1|max:250',
        'foto' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
    ]);

    if (! empty($validated['tanggal_lahir'])) {
        $calculatedAge = \Carbon\Carbon::parse($validated['tanggal_lahir'])->age;

        if ($calculatedAge < 6 || $calculatedAge > 16) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'tanggal_lahir' => 'Umur siswa harus berada di antara 6 sampai 16 tahun.',
                'umur' => 'Umur siswa harus berada di antara 6 sampai 16 tahun.',
            ]);
        }

        $validated['umur'] = $calculatedAge;
    }

    $profil = DB::table('profil_siswa')->where('id_siswa', $siswa->id_siswa)->first();
    $fotoPath = $profil->foto ?? null;

    if ($request->hasFile('foto')) {
        if ($fotoPath && Storage::disk('public')->exists($fotoPath)) {
            Storage::disk('public')->delete($fotoPath);
        }

        $fotoPath = $request->file('foto')->store('profil-siswa', 'public');
    }

    DB::transaction(function () use ($siswa, $validated, $fotoPath) {
        $siswa->update([
            'nama_siswa' => $validated['nama_siswa'],
            'nik' => $validated['nik'] ?? null,
            'no_kk' => $validated['no_kk'] ?? null,
            'nisn' => $validated['nisn'] ?? null,
            'tempat_lahir' => $validated['tempat_lahir'] ?? null,
            'tanggal_lahir' => $validated['tanggal_lahir'] ?? null,
            'umur' => $validated['umur'] ?? $siswa->umur,
        ]);

        if ($siswa->id_ortu) {
            DB::table('orang_tua')
                ->where('id_ortu', $siswa->id_ortu)
                ->update([
                    'nama_ortu' => $validated['nama_ortu'] ?? null,
                    'no_hp' => $validated['no_hp_ortu'] ?? null,
                ]);
        }

        DB::table('profil_siswa')->updateOrInsert(
            ['id_siswa' => $siswa->id_siswa],
            [
                'id_ortu' => $siswa->id_ortu,
                'alamat' => $validated['alamat'] ?? null,
                'foto' => $fotoPath,
                'tinggi_badan' => $validated['tinggi_badan'] ?? null,
                'berat_badan' => $validated['berat_badan'] ?? null,
            ]
        );
    });

    $this->syncActiveStudentToCategorySchedules($siswa->fresh());

    $this->recordAdminActivity(
        'Mengubah profil siswa',
        $siswa->fresh()?->nama_siswa ?? $validated['nama_siswa']
    );

    return response()->json([
        'success' => true,
        'message' => 'Profil siswa berhasil diperbarui.',
    ]);
}

public function Hapus_Siswa($id_siswa)
{
    $siswa = Siswa::findOrFail($id_siswa);
    $studentName = $siswa->nama_siswa;

    $deleted = DB::transaction(function () use ($siswa) {
        $studentId = $siswa->id_siswa;
        $paymentIds = DB::table('pembayaran')
            ->where('id_siswa', $studentId)
            ->pluck('id_pembayaran');

        $profilePhoto = DB::table('profil_siswa')
            ->where('id_siswa', $studentId)
            ->value('foto');

        $studentFiles = collect([
            $siswa->akta_kelahiran,
            $siswa->kartu_keluarga,
            $siswa->rapor,
            $siswa->pas_photo_3x4,
            $profilePhoto,
        ])->filter()->values();

        $proofFiles = DB::table('bukti_pembayaran')
            ->where('id_siswa', $studentId)
            ->pluck('bukti_bayar')
            ->filter();

        $counts = [
            'notifikasi_terkirim' => DB::table('notifikasi_terkirim')->where('id_siswa', $studentId)->delete(),
            'jadwal_siswa' => DB::table('jadwal_siswa')->where('id_siswa', $studentId)->delete(),
            'presensi' => DB::table('presensi')->where('id_siswa', $studentId)->delete(),
            'performa_siswa' => DB::table('performa_siswa')->where('id_siswa', $studentId)->delete(),
            'catatan_pelatih' => DB::table('catatan_pelatih')->where('id_siswa', $studentId)->delete(),
            'pencapaian' => DB::table('pencapaian')->where('id_siswa', $studentId)->delete(),
            'promosi' => DB::table('promosi')->where('id_siswa', $studentId)->delete(),
            'bukti_pembayaran' => DB::table('bukti_pembayaran')->where('id_siswa', $studentId)->delete(),
            'pembayaran' => $paymentIds->isNotEmpty()
                ? DB::table('pembayaran')->whereIn('id_pembayaran', $paymentIds)->delete()
                : 0,
            'pendaftaran' => DB::table('pendaftaran')->where('id_siswa', $studentId)->delete(),
            'profil_siswa' => DB::table('profil_siswa')->where('id_siswa', $studentId)->delete(),
        ];

        $siswa->delete();
        $counts['siswa'] = 1;

        $studentFiles
            ->merge($proofFiles)
            ->unique()
            ->each(function ($path) {
                $path = ltrim((string) $path, '/');
                if ($path !== '' && Storage::disk('public')->exists($path)) {
                    Storage::disk('public')->delete($path);
                }
            });

        return $counts;
    });

    $this->recordAdminActivity(
        'Menghapus data siswa',
        $studentName
    );

    return response()->json([
        'success' => true,
        'message' => "Data siswa {$studentName} berhasil dihapus dari database.",
        'deleted' => $deleted,
    ]);
}

public function performaperSiswa(Request $request, $id_siswa)
{
    $bulan = $request->bulan;
    $tahun = $request->tahun;

    $query = DB::table('performa_siswa')
        ->where('id_siswa', $id_siswa);

    // ✅ filter dari tanggal_penilaian
    if ($bulan) {
        $query->whereMonth('tanggal_penilaian', $bulan);
    }

    if ($tahun) {
        $query->whereYear('tanggal_penilaian', $tahun);
    }

    $data = $query->selectRaw('
        COUNT(*) as total_latihan,
        AVG(dribbling) as rata_dribbling,
        AVG(passing) as rata_passing,
        AVG(shooting) as rata_shooting
    ')->first();

    if (!$data || $data->total_latihan == 0) {
        return response()->json([
            'status' => false,
            'message' => 'Belum ada data performa'
        ]);
    }

    return response()->json([
        'status' => true,
        'id_siswa' => $id_siswa,
        'filter' => [
            'bulan' => $bulan,
            'tahun' => $tahun
        ],
        'data' => $data
    ]);
}

public function Rekap_Absensi_PerSiswa(Request $request, $id_siswa)
{
    $bulan = $request->bulan ?? now()->month;
    $tahun = $request->tahun ?? now()->year;

    $siswa = Siswa::find($id_siswa);

    if (!$siswa) {
        return response()->json([
            'status' => false,
            'message' => 'Siswa tidak ditemukan'
        ], 404);
    }

    $presensi = $siswa->presensi()
        ->whereMonth('created_at', $bulan)
        ->whereYear('created_at', $tahun)
        ->get();

    $total = $presensi->count();

    $hadir = $presensi->where('status_kehadiran', 'Hadir')->count();
    $sakit = $presensi->where('status_kehadiran', 'Sakit')->count();
    $izin  = $presensi->where('status_kehadiran', 'Izin')->count();

    return response()->json([
        'status' => true,
        'message' => 'Rekap absensi per siswa berhasil',
        'id_siswa' => $siswa->id_siswa,
        'nama_siswa' => $siswa->nama_siswa,
        'umur' => $this->categoryLabelFromStudent($siswa),

        'filter' => [
            'bulan' => $bulan,
            'tahun' => $tahun
        ],

        // 🔢 jumlah
        'hadir' => $hadir,
        'sakit' => $sakit,
        'izin'  => $izin,
        'total' => $total,

        // 📊 persen
        'persen_hadir' => $total ? round(($hadir / $total) * 100, 1) : 0,
        'persen_sakit' => $total ? round(($sakit / $total) * 100, 1) : 0,
        'persen_izin'  => $total ? round(($izin / $total) * 100, 1) : 0,
    ]);
}

public function Data_Pelatih(Request $request)
{
    $pelatih = Pelatih::with('user');

    // =========================
    // FILTER NAMA PELATIH
    // =========================
    if ($request->filled('nama_pelatih')) {
        $pelatih->where('nama_pelatih', 'like', '%' . $request->nama_pelatih . '%');
    }

    // =========================
    // FILTER EMAIL (dari tabel user)
    // =========================
    if ($request->filled('email')) {
        $pelatih->whereHas('user', function ($q) use ($request) {
            $q->where('email', 'like', '%' . $request->email . '%');
        });
    }

    $result = $pelatih
        ->orderBy('nama_pelatih', 'desc')
        ->paginate(10)
        ->withQueryString();

    $result->getCollection()->transform(function ($item) {
        $item->accountStatus = $item->account_status ?: 'pending';
        $item->invitationSentAt = $item->invitation_sent_at;
        $item->acceptedAt = $item->accepted_at;

        return $item;
    });

    return response()->json([
        'success' => true,
        'message' => 'Data pelatih berhasil diambil',
        'data' => $result
    ]);
}

public function Tambah_Pelatih(Request $request)
{
    $request->merge([
        'nama' => trim((string) $request->nama),
        'email' => strtolower(trim((string) $request->email)),
        'no_hp' => trim((string) $request->no_hp),
        'password_confirmation' => $request->input('password_confirmation', $request->input('password')),
    ]);

    Log::info('REGISTER REQUEST', $request->except('password', 'password_confirmation'));

  $request->validate([
    'nama' => 'required|string|max:100|unique:pelatih,nama_pelatih',
    'email' => [
        'required',
        'email',
        Rule::unique('users', 'email')->where(fn ($query) => $query->where('role', 'pelatih')),
    ],
    'password' => 'required|min:6|confirmed',
    'no_hp' => 'required|string|max:100',
], [
    'nama.required' => 'Nama wajib diisi',
    'nama.unique' => 'Nama pelatih sudah digunakan',

    'email.required' => 'Email wajib diisi',
    'email.email' => 'Format email tidak valid',
    'email.unique' => 'Email sudah digunakan',

    'password.required' => 'Password wajib diisi',
    'password.min' => 'Password minimal 6 karakter',
    'password.confirmed' => 'Password tidak sama',

    'no_hp.required' => 'No HP wajib diisi',
]);

    $emailSent = false;

    DB::beginTransaction();

    try {

        $user = User::create([
            'name' => $request->nama,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => 'pelatih',
            'email_verified_at' => now(),
        ]);

        // format no HP
        $no_hp = str_replace(' ', '', $request->no_hp);

        if (substr($no_hp, 0, 1) === '0') {
            $no_hp = '+62' . substr($no_hp, 1);
        } elseif (substr($no_hp, 0, 2) === '62') {
            $no_hp = '+' . $no_hp;
        } elseif (substr($no_hp, 0, 3) !== '+62') {
            $no_hp = '+62' . $no_hp;
        }

        $pelatih = Pelatih::create([
            'user_id' => $user->id,
            'nama_pelatih' => $request->nama,
            'email' => $request->email,
            'no_hp' => $no_hp,
            'account_status' => 'pending',
        ]);

        DB::commit();

        $this->recordAdminActivity(
            'Menambahkan pelatih',
            $pelatih->nama_pelatih . ' - ' . $pelatih->email
        );

        $emailSent = $this->sendCoachPasswordEmail($pelatih, $user, (string) $request->password);

        return response()->json([
            'success' => true,
            'message' => $emailSent
                ? 'Pelatih berhasil ditambahkan'
                : 'Pelatih berhasil ditambahkan, tetapi email password gagal dikirim. Password yang diinput tetap dapat digunakan untuk login.',
            'data' => [
                'user' => $user,
                'pelatih' => $pelatih,
                'emailSent' => $emailSent,
            ]
        ]);

    } catch (\Illuminate\Database\QueryException $e) {
        DB::rollBack();

        Log::error('Gagal menambahkan pelatih karena database', [
            'email' => $request->email,
            'error' => $e->getMessage(),
        ]);

        $message = str_contains(strtolower($e->getMessage()), 'duplicate')
            ? 'Email atau nama pelatih sudah digunakan.'
            : 'Gagal menambahkan pelatih karena masalah database.';

        return response()->json([
            'success' => false,
            'message' => $message,
            'error' => $e->getMessage()
        ], 500);
    } catch (\Exception $e) {
        DB::rollBack();

        Log::error('Gagal menambahkan pelatih', [
            'email' => $request->email,
            'error' => $e->getMessage(),
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Gagal menambahkan pelatih',
            'error' => $e->getMessage()
        ], 500);
    }
}

private function sendCoachPasswordEmail(Pelatih $pelatih, User $user, string $plainPassword): bool
{
    try {
        Mail::to($user->email)->send(new SendPasswordMail($user->name, $user->email, $plainPassword));

        $pelatih->update(['invitation_sent_at' => now()]);
        $pelatih->refresh();

        return true;
    } catch (\Throwable $mailError) {
        Log::error('Gagal mengirim email password pelatih', [
            'pelatih_id' => $pelatih->id_pelatih,
            'email' => $user->email,
            'mailer' => config('mail.default'),
            'smtp_host' => config('mail.mailers.smtp.host'),
            'smtp_port' => config('mail.mailers.smtp.port'),
            'smtp_scheme' => config('mail.mailers.smtp.scheme'),
            'error' => $mailError->getMessage(),
        ]);

        return false;
    }
}

public function Update_Pelatih(Request $request, $id)
{
    $pelatih = Pelatih::findOrFail($id);

    // =========================
    // VALIDASI
    // =========================
    $request->validate([
        'nama' => 'required|string|max:100',
        'email' => 'required|email',
        'no_hp' => 'required|string|max:100',
    ]);

    // =========================
    // UPDATE USER (optional sync email/name)
    // =========================
    if ($pelatih->user) {
        $pelatih->user->update([
            'name' => $request->nama,
            'email' => $request->email,
        ]);
    }

    // =========================
    // UPDATE PELATIH
    // =========================
    $pelatih->update([
        'nama_pelatih' => $request->nama,
        'email' => $request->email,
        'no_hp' => $request->no_hp,
    ]);

    $this->recordAdminActivity(
        'Mengubah data pelatih',
        $pelatih->fresh()?->nama_pelatih ?? $request->nama
    );

    return response()->json([
        'success' => true,
        'message' => 'Berhasil update pelatih',
        'data' => $pelatih
    ]);
}

public function Hapus_Pelatih($id)
{
    $pelatih = Pelatih::findOrFail($id);
    $pelatihName = $pelatih->nama_pelatih;
    $pelatihEmail = $pelatih->email;
    $userId = $pelatih->user_id;

    DB::beginTransaction();

    try {
        foreach ([
            'jadwal_latihan',
            'presensi',
            'performa_siswa',
            'catatan_pelatih',
        ] as $table) {
            if (
                \Illuminate\Support\Facades\Schema::hasTable($table) &&
                \Illuminate\Support\Facades\Schema::hasColumn($table, 'id_pelatih')
            ) {
                DB::table($table)
                    ->where('id_pelatih', $pelatih->id_pelatih)
                    ->update(['id_pelatih' => null]);
            }
        }

        if (
            \Illuminate\Support\Facades\Schema::hasTable('notifikasi_terkirim') &&
            \Illuminate\Support\Facades\Schema::hasColumn('notifikasi_terkirim', 'id_pelatih')
        ) {
            DB::table('notifikasi_terkirim')
                ->where('id_pelatih', $pelatih->id_pelatih)
                ->update(['id_pelatih' => null]);
        }

        if ($userId) {
            if (
                \Illuminate\Support\Facades\Schema::hasTable('notifikasi_terkirim') &&
                \Illuminate\Support\Facades\Schema::hasColumn('notifikasi_terkirim', 'user_id')
            ) {
                $notificationUserIdIsNullable = DB::getDriverName() !== 'mysql'
                    || DB::table('information_schema.COLUMNS')
                        ->where('TABLE_SCHEMA', DB::getDatabaseName())
                        ->where('TABLE_NAME', 'notifikasi_terkirim')
                        ->where('COLUMN_NAME', 'user_id')
                        ->value('IS_NULLABLE') === 'YES';

                $notificationUserRows = DB::table('notifikasi_terkirim')
                    ->where('user_id', $userId);

                if ($notificationUserIdIsNullable) {
                    $notificationUserRows->update(['user_id' => null]);
                } else {
                    $notificationUserRows->delete();
                }
            }

            DB::table('pelatih')
                ->where('id_pelatih', $pelatih->id_pelatih)
                ->update(['user_id' => null]);
        }

        $pelatih->delete();

        if ($userId) {
            User::where('id', $userId)->delete();
        }

        DB::commit();

        $this->recordAdminActivity(
            'Menghapus data pelatih',
            $pelatihName . ($pelatihEmail ? ' - ' . $pelatihEmail : '')
        );

        return response()->json([
            'success' => true,
            'message' => 'Pelatih berhasil dihapus'
        ]);

    } catch (\Throwable $e) {
        DB::rollBack();

        return response()->json([
            'success' => false,
            'message' => 'Gagal menghapus pelatih',
            'error' => $e->getMessage()
        ], 500);
    }
}

public function Jadwallatihan_Siswa(Request $request)
{
    $id_pelatih = $request->id_pelatih;

    $jadwal = \App\Models\Jadwal_Latihan::with('siswa.user')
        ->when($id_pelatih, function ($query) use ($id_pelatih) {
            $query->where('id_pelatih', $id_pelatih);
        })
        ->paginate(10);

    return response()->json([
        'status' => true,
        'total_jadwal_aktif' => $jadwal->total(),
        'data' => $jadwal
    ]);
}

public function JadwalperPelatih($id_pelatih)
{
    $jadwal = \App\Models\Jadwal_Latihan::with('siswa', 'pelatih')
        ->where('id_pelatih', $id_pelatih)
        ->get();

    if ($jadwal->isEmpty()) {
        return response()->json([
            'status' => false,
            'message' => 'Jadwal pelatih tidak ditemukan'
        ], 404);
    }

    return response()->json([
        'status' => true,
        'total' => $jadwal->count(),
        'data' => $jadwal
    ]);
}

public function Tambah_Jadwal(Request $request)
{
    $request->validate([
        'tanggal' => 'required|date',
        'jam_mulai' => 'required',
        'jam_selesai' => 'required',
        'lokasi' => 'required',
        'kategori_umur' => 'nullable|string',
        'id_pelatih' => 'nullable|exists:pelatih,id_pelatih',
        'id_siswa' => 'required|array',
        'id_siswa.*' => 'exists:siswa,id_siswa',
    ]);

    $kategoriUmur = $request->has('kategori_umur')
        ? $this->normalizeScheduleCategoryValue($request->input('kategori_umur'))
        : null;

    $categoryMismatchResponse = $this->scheduleStudentCategoryMismatchResponse(
        $request->input('id_siswa', []),
        $kategoriUmur
    );

    if ($categoryMismatchResponse) {
        return $categoryMismatchResponse;
    }

    $jadwal = \App\Models\Jadwal_Latihan::create([
        'tanggal' => $request->tanggal,
        'jam_mulai' => $request->jam_mulai,
        'jam_selesai' => $request->jam_selesai,
        'lokasi' => $request->lokasi,
        'kategori_umur' => $kategoriUmur,
        'id_pelatih' => $request->id_pelatih,
    ]);

    $jadwal->siswa()->attach($request->id_siswa);

    $this->recordAdminActivity(
        'Menambahkan jadwal latihan',
        Carbon::parse($jadwal->tanggal)->format('d-m-Y') . ' ' . $jadwal->jam_mulai . '-' . $jadwal->jam_selesai . ' di ' . $jadwal->lokasi
    );

    return response()->json([
        'status' => true,
        'message' => 'Jadwal berhasil ditambahkan',
        'data' => $jadwal->load(['siswa', 'pelatih'])
    ]);
}

public function Update_Jadwal(Request $request, $id)
{
    $request->validate([
        'tanggal' => 'required|date',
        'jam_mulai' => 'required',
        'jam_selesai' => 'required',
        'lokasi' => 'required',
        'kategori_umur' => 'nullable|string',
        'id_pelatih' => 'nullable|exists:pelatih,id_pelatih',
        'id_siswa' => 'required|array',
        'id_siswa.*' => 'exists:siswa,id_siswa',
    ]);

    $kategoriUmur = $request->has('kategori_umur')
        ? $this->normalizeScheduleCategoryValue($request->input('kategori_umur'))
        : null;
    $categoryMismatchResponse = $this->scheduleStudentCategoryMismatchResponse(
        $request->input('id_siswa', []),
        $kategoriUmur
    );

    if ($categoryMismatchResponse) {
        return $categoryMismatchResponse;
    }

    $jadwal = \App\Models\Jadwal_Latihan::findOrFail($id);

    $jadwal->update([
        'tanggal' => $request->tanggal,
        'jam_mulai' => $request->jam_mulai,
        'jam_selesai' => $request->jam_selesai,
        'lokasi' => $request->lokasi,
        'kategori_umur' => $kategoriUmur,
        'id_pelatih' => $request->id_pelatih,
    ]);

    $jadwal->siswa()->sync($request->id_siswa);

    $this->recordAdminActivity(
        'Mengubah jadwal latihan',
        Carbon::parse($jadwal->tanggal)->format('d-m-Y') . ' ' . $jadwal->jam_mulai . '-' . $jadwal->jam_selesai . ' di ' . $jadwal->lokasi
    );

    return response()->json([
        'status' => true,
        'message' => 'Jadwal berhasil diupdate',
        'data' => $jadwal->load(['siswa', 'pelatih'])
    ]);
}

public function Hapus_Jadwal($id)
{
    $jadwal = \App\Models\Jadwal_Latihan::find($id);

    if (! $jadwal) {
        return response()->json([
            'status' => true,
            'message' => 'Jadwal sudah tidak ada dan tampilan akan diperbarui.'
        ]);
    }

    $description = Carbon::parse($jadwal->tanggal)->format('d-m-Y') . ' ' . $jadwal->jam_mulai . '-' . $jadwal->jam_selesai . ' di ' . $jadwal->lokasi;

    $jadwal->siswa()->detach();
    $jadwal->delete();

    $this->recordAdminActivity(
        'Menghapus jadwal latihan',
        $description
    );

    return response()->json([
        'status' => true,
        'message' => 'Jadwal berhasil dihapus'
    ]);
}

public function MediaPromosiAdmin(Request $request)
{
    $query = Promosi::with(['siswa:id_siswa,nama_siswa,tanggal_lahir,umur,status', 'dibuatOleh:id_admin,nama_admin']);

    if ($request->filled('search')) {
        $search = $request->search;

        $query->where(function ($q) use ($search) {
            $q->where('judul', 'like', '%' . $search . '%')
              ->orWhere('isi_promosi', 'like', '%' . $search . '%')
              ->orWhereHas('siswa', function ($siswaQuery) use ($search) {
                  $siswaQuery->where('nama_siswa', 'like', '%' . $search . '%');
              });
        });
    }

    if ($request->filled('id_siswa')) {
        $query->where('id_siswa', $request->id_siswa);
    }

    if ($request->filled('kategori_umur')) {
        $umur = $this->extractUmurFromKategori($request->kategori_umur);

        if (!is_null($umur)) {
            $query->whereHas('siswa', function ($siswaQuery) use ($umur) {
                $this->applyStudentAgeFilter($siswaQuery, $umur);
            });
        }
    }

    if ($request->filled('tanggal_publish')) {
        $query->whereDate('tanggal_promosi', $request->tanggal_publish);
    }

    $promosi = $query->orderBy('tanggal_promosi', 'desc')
        ->orderBy('id_promosi', 'desc')
        ->paginate(10)
        ->through(function ($item) {
            return $this->formatMediaPromosi($item);
        })
        ->withQueryString();

    $allStudentOptions = Siswa::select('id_siswa', 'nama_siswa', 'tanggal_lahir', 'umur', 'status')
        ->orderBy('nama_siswa')
        ->get();
    $kategoriUmur = $this->categoryOptionsFromStudents($allStudentOptions);

    $siswaQuery = Siswa::select('id_siswa', 'nama_siswa', 'tanggal_lahir', 'umur', 'status')
        ->orderBy('nama_siswa');

    if ($request->filled('kategori_umur')) {
        $umur = $this->extractUmurFromKategori($request->kategori_umur);

        if (!is_null($umur)) {
            $this->applyStudentAgeFilter($siswaQuery, $umur);
        }
    }

    $siswaOptions = $siswaQuery->get()->map(function ($siswa) {
        return [
            'id_siswa' => $siswa->id_siswa,
            'nama_siswa' => $siswa->nama_siswa,
            'kategori_umur' => $this->categoryLabelFromStudent($siswa),
            'status' => $siswa->status,
        ];
    });

    return response()->json([
        'success' => true,
        'message' => 'Data media promosi berhasil diambil',
        'data' => $promosi,
        'filters' => [
            'search' => $request->search,
            'id_siswa' => $request->id_siswa,
            'kategori_umur' => $request->kategori_umur,
            'tanggal_publish' => $request->tanggal_publish,
        ],
        'options' => [
            'kategori_umur' => $kategoriUmur,
            'siswa' => $siswaOptions,
        ],
    ]);
}

public function DetailMediaPromosi($id)
{
    $promosi = Promosi::with(['siswa:id_siswa,nama_siswa,tanggal_lahir,umur,status', 'dibuatOleh:id_admin,nama_admin'])
        ->findOrFail($id);

    return response()->json([
        'success' => true,
        'message' => 'Detail media promosi berhasil diambil',
        'data' => $this->formatMediaPromosi($promosi),
    ]);
}

public function TambahMediaPromosi(Request $request)
{
    $validated = $request->validate([
        'kategori' => 'nullable|in:Berita,Galeri',
        'target_mode' => 'nullable|in:semua,kategori,siswa',
        'judul' => 'required|string|max:100',
        'isi_promosi' => 'nullable|string|max:10000',
        'tanggal_promosi' => 'required|date',
        'kategori_umur' => 'nullable|array|min:1',
        'kategori_umur.*' => 'required|string',
        'id_siswa' => 'nullable|array|min:1',
        'id_siswa.*' => 'required|exists:siswa,id_siswa',
        'foto_promosi' => 'required|image|mimes:jpg,jpeg,png,webp|max:10240',
    ]);

    $kategori = $validated['kategori'] ?? 'Berita';
    $targetMode = $kategori === 'Galeri' ? 'semua' : ($validated['target_mode'] ?? 'semua');

    if ($kategori === 'Berita' && trim((string) ($validated['isi_promosi'] ?? '')) === '') {
        return response()->json([
            'success' => false,
            'message' => 'Isi berita wajib diisi',
        ], 422);
    }

    if ($targetMode === 'kategori' && !$request->filled('kategori_umur')) {
        return response()->json([
            'success' => false,
            'message' => 'kategori_umur wajib diisi jika target_mode adalah kategori',
        ], 422);
    }

    if ($targetMode === 'siswa' && empty($validated['id_siswa'])) {
        return response()->json([
            'success' => false,
            'message' => 'id_siswa wajib diisi jika target_mode adalah siswa',
        ], 422);
    }

    $siswaQuery = Siswa::query();

    if ($targetMode === 'kategori') {
        $umurList = collect($validated['kategori_umur'])
            ->map(fn ($kategori) => $this->extractUmurFromKategori($kategori))
            ->filter(fn ($umur) => !is_null($umur))
            ->unique()
            ->values();

        if ($umurList->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'kategori_umur tidak valid',
            ], 422);
        }

        $this->applyStudentAgeFilterAny($siswaQuery, $umurList);
    }

    if ($targetMode === 'siswa') {
        $siswaQuery->whereIn('id_siswa', $validated['id_siswa']);
    }

    $siswaTargets = $kategori === 'Galeri'
        ? collect([(object) ['id_siswa' => null]])
        : $siswaQuery
            ->select('id_siswa', 'nama_siswa', 'tanggal_lahir', 'umur', 'status')
            ->orderBy('nama_siswa')
            ->get();

    if ($siswaTargets->isEmpty()) {
        return response()->json([
            'success' => false,
            'message' => 'Tidak ada siswa yang sesuai dengan target promosi',
        ], 404);
    }

    $admin = Admin::where('user_id', auth()->id())->first();

    if (!$admin) {
        return response()->json([
            'success' => false,
            'message' => 'Data admin tidak ditemukan'
        ], 404);
    }

    $fotoPath = null;
    if ($request->hasFile('foto_promosi')) {
        $fotoPath = $request->file('foto_promosi')->store('promosi', 'public');
    }

    $groupId = (string) Str::uuid();

    $promosi = $siswaTargets->map(function ($siswa) use ($validated, $fotoPath, $admin, $groupId, $kategori) {
        return Promosi::create([
            'group_id' => $groupId,
            'judul' => $validated['judul'],
            'isi_promosi' => $validated['isi_promosi'] ?? '',
            'id_siswa' => $siswa->id_siswa,
            'tanggal_promosi' => $validated['tanggal_promosi'],
            'dibuat_oleh' => $admin->id_admin,
            'foto_promosi' => $fotoPath,
            'kategori' => $kategori,
        ])->load(['siswa:id_siswa,nama_siswa,tanggal_lahir,umur,status', 'dibuatOleh:id_admin,nama_admin']);
    })->values();

    $this->recordAdminActivity(
        'Menambahkan media promosi',
        $kategori . ' - ' . $validated['judul'] . ' (' . $promosi->count() . ' target)'
    );

    return response()->json([
        'success' => true,
        'message' => 'Media promosi berhasil ditambahkan',
        'target_mode' => $targetMode,
        'kategori_umur' => $targetMode === 'kategori' ? array_values($validated['kategori_umur']) : null,
        'total_data' => $promosi->count(),
        'data' => $promosi->map(fn ($item) => $this->formatMediaPromosi($item))->values(),
    ], 201);
}

public function UpdateMediaPromosi(Request $request, $id)
{
    $promosiAwal = Promosi::findOrFail($id);

    $validated = $request->validate([
        'kategori' => 'nullable|in:Berita,Galeri',
        'target_mode' => 'nullable|in:semua,kategori,siswa',
        'judul' => 'required|string|max:100',
        'isi_promosi' => 'nullable|string|max:10000',
        'tanggal_promosi' => 'required|date',
        'kategori_umur' => 'nullable|array|min:1',
        'kategori_umur.*' => 'required|string',
        'id_siswa' => 'nullable|array|min:1',
        'id_siswa.*' => 'required|exists:siswa,id_siswa',
        'foto_promosi' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:10240',
    ]);

    $kategori = $validated['kategori'] ?? $promosiAwal->kategori ?? 'Berita';
    $targetMode = $kategori === 'Galeri' ? 'semua' : ($validated['target_mode'] ?? 'semua');

    if ($kategori === 'Berita' && trim((string) ($validated['isi_promosi'] ?? '')) === '') {
        return response()->json([
            'success' => false,
            'message' => 'Isi berita wajib diisi',
        ], 422);
    }

    if ($targetMode === 'kategori' && !$request->filled('kategori_umur')) {
        return response()->json([
            'success' => false,
            'message' => 'kategori_umur wajib diisi jika target_mode adalah kategori',
        ], 422);
    }

    if ($targetMode === 'siswa' && empty($validated['id_siswa'])) {
        return response()->json([
            'success' => false,
            'message' => 'id_siswa wajib diisi jika target_mode adalah siswa',
        ], 422);
    }

    $siswaQuery = Siswa::query();

    if ($targetMode === 'kategori') {
        $umurList = collect($validated['kategori_umur'])
            ->map(fn ($kategori) => $this->extractUmurFromKategori($kategori))
            ->filter(fn ($umur) => !is_null($umur))
            ->unique()
            ->values();

        if ($umurList->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'kategori_umur tidak valid',
            ], 422);
        }

        $this->applyStudentAgeFilterAny($siswaQuery, $umurList);
    }

    if ($targetMode === 'siswa') {
        $siswaQuery->whereIn('id_siswa', $validated['id_siswa']);
    }

    $siswaTargets = $kategori === 'Galeri'
        ? collect([(object) ['id_siswa' => null]])
        : $siswaQuery
            ->select('id_siswa', 'nama_siswa', 'tanggal_lahir', 'umur', 'status')
            ->orderBy('nama_siswa')
            ->get();

    if ($siswaTargets->isEmpty()) {
        return response()->json([
            'success' => false,
            'message' => 'Tidak ada siswa yang sesuai dengan target promosi',
        ], 404);
    }

    DB::beginTransaction();

    try {
        $fotoLama = $promosiAwal->foto_promosi;
        $fotoPath = $fotoLama;

        if ($request->hasFile('foto_promosi')) {
            $fotoPath = $request->file('foto_promosi')->store('promosi', 'public');
        }

        // Prioritaskan group_id untuk identifikasi batch.
        $batchLama = Promosi::query();
        if (!empty($promosiAwal->group_id)) {
            $batchLama->where('group_id', $promosiAwal->group_id);
        } else {
            // Fallback untuk data lama yang belum punya group_id.
            $batchLama
                ->where('dibuat_oleh', $promosiAwal->dibuat_oleh)
                ->whereDate('tanggal_promosi', $promosiAwal->tanggal_promosi)
                ->where('judul', $promosiAwal->judul)
                ->where('isi_promosi', $promosiAwal->isi_promosi)
                ->where(function ($query) use ($promosiAwal) {
                    if (is_null($promosiAwal->foto_promosi)) {
                        $query->whereNull('foto_promosi');
                    } else {
                        $query->where('foto_promosi', $promosiAwal->foto_promosi);
                    }
                });
        }

        $batchLamaIds = $batchLama->pluck('id_promosi');

        $groupIdBaru = (string) Str::uuid();

        if ($batchLamaIds->isNotEmpty()) {
            Promosi::whereIn('id_promosi', $batchLamaIds)->delete();
        }

        $promosiBaru = $siswaTargets->map(function ($siswa) use ($validated, $fotoPath, $promosiAwal, $groupIdBaru, $kategori) {
            return Promosi::create([
                'group_id' => $groupIdBaru,
                'judul' => $validated['judul'],
                'isi_promosi' => $validated['isi_promosi'] ?? '',
                'id_siswa' => $siswa->id_siswa,
                'tanggal_promosi' => $validated['tanggal_promosi'],
                'dibuat_oleh' => $promosiAwal->dibuat_oleh,
                'foto_promosi' => $fotoPath,
                'kategori' => $kategori,
            ])->load(['siswa:id_siswa,nama_siswa,tanggal_lahir,umur,status', 'dibuatOleh:id_admin,nama_admin']);
        })->values();

        if ($request->hasFile('foto_promosi') && $fotoLama && Storage::disk('public')->exists($fotoLama)) {
            Storage::disk('public')->delete($fotoLama);
        }

        DB::commit();

        $this->recordAdminActivity(
            'Mengubah media promosi',
            $kategori . ' - ' . $validated['judul'] . ' (' . $promosiBaru->count() . ' target)'
        );

        return response()->json([
            'success' => true,
            'message' => 'Media promosi berhasil diupdate',
            'target_mode' => $targetMode,
            'kategori_umur' => $targetMode === 'kategori' ? array_values($validated['kategori_umur']) : null,
            'total_data' => $promosiBaru->count(),
            'data' => $promosiBaru->map(fn ($item) => $this->formatMediaPromosi($item))->values(),
        ]);
    } catch (\Throwable $e) {
        DB::rollBack();

        return response()->json([
            'success' => false,
            'message' => 'Gagal update media promosi',
            'error' => $e->getMessage(),
        ], 500);
    }
}

public function HapusMediaPromosi($id)
{
    $promosi = Promosi::findOrFail($id);
    $description = ($promosi->kategori ?? 'Media') . ' - ' . $promosi->judul;

    if ($promosi->foto_promosi && Storage::disk('public')->exists($promosi->foto_promosi)) {
        Storage::disk('public')->delete($promosi->foto_promosi);
    }

    $promosi->delete();

    $this->recordAdminActivity(
        'Menghapus media promosi',
        $description
    );

    return response()->json([
        'success' => true,
        'message' => 'Media promosi berhasil dihapus',
    ]);
}

public function UpdateMediaPromosiByGroup(Request $request, $groupId)
{
    $promosi = Promosi::where('group_id', $groupId)->orderBy('id_promosi')->firstOrFail();
    return $this->UpdateMediaPromosi($request, $promosi->id_promosi);
}

public function HapusMediaPromosiByGroup($groupId)
{
    $promosiGroup = Promosi::where('group_id', $groupId)->get();

    if ($promosiGroup->isEmpty()) {
        return response()->json([
            'success' => false,
            'message' => 'Group media promosi tidak ditemukan',
        ], 404);
    }

    $fotoPath = $promosiGroup->first()->foto_promosi;
    $description = ($promosiGroup->first()->kategori ?? 'Media') . ' - ' . $promosiGroup->first()->judul . ' (' . $promosiGroup->count() . ' data)';

    Promosi::where('group_id', $groupId)->delete();

    if ($fotoPath && Storage::disk('public')->exists($fotoPath)) {
        Storage::disk('public')->delete($fotoPath);
    }

    $this->recordAdminActivity(
        'Menghapus media promosi',
        $description
    );

    return response()->json([
        'success' => true,
        'message' => 'Group media promosi berhasil dihapus',
    ]);
}

private function formatMediaPromosi(Promosi $promosi): array
{
    return [
        'id_promosi' => $promosi->id_promosi,
        'group_id' => $promosi->group_id,
        'judul' => $promosi->judul,
        'isi_promosi' => $promosi->isi_promosi,
        'tanggal_promosi' => $promosi->tanggal_promosi,
        'kategori' => $promosi->kategori,
        'foto_promosi' => $promosi->foto_promosi,
        'foto_url' => $promosi->foto_promosi ? asset('storage/' . ltrim($promosi->foto_promosi, '/')) : null,
        'id_siswa' => $promosi->id_siswa,
        'nama_siswa' => $promosi->siswa->nama_siswa ?? null,
        'kategori_umur' => $this->categoryLabelFromStudent($promosi->siswa),
        'status_siswa' => $promosi->siswa->status ?? null,
        'dibuat_oleh' => $promosi->dibuat_oleh,
        'nama_admin' => $promosi->dibuatOleh->nama_admin ?? null,
    ];
}

public function FormPrestasiAdmin(Request $request)
{
    $request->validate([
        'kategori_umur' => 'nullable|string',
        'search' => 'nullable|string|max:100',
        'status' => 'nullable|in:Active,Inactive',
        'per_page' => 'nullable|integer|min:1|max:100',
    ]);

    $allStudentOptions = Siswa::select('id_siswa', 'tanggal_lahir', 'umur')->get();
    $kategoriUmur = $this->categoryOptionsFromStudents($allStudentOptions);

    $siswaQuery = Siswa::select('id_siswa', 'nama_siswa', 'tanggal_lahir', 'umur', 'status')
        ->orderBy('nama_siswa');

    if ($request->filled('kategori_umur')) {
        $umur = $this->extractUmurFromKategori($request->kategori_umur);

        if (is_null($umur)) {
            return response()->json([
                'success' => false,
                'message' => 'Format kategori_umur tidak valid. Gunakan format seperti U-10.',
            ], 422);
        }

        $this->applyStudentAgeFilter($siswaQuery, $umur);
    }

    if ($request->filled('status')) {
        $siswaQuery->where('status', $request->status);
    }

    if ($request->filled('search')) {
        $siswaQuery->where('nama_siswa', 'like', '%' . $request->search . '%');
    }

    $perPage = (int) ($request->per_page ?? 10);
    $siswa = $siswaQuery->paginate($perPage)->through(function ($item) {
        return [
            'id_siswa' => $item->id_siswa,
            'nama_siswa' => $item->nama_siswa,
            'kategori_umur' => $this->categoryLabelFromStudent($item),
            'status' => $item->status,
        ];
    })->withQueryString();

    return response()->json([
        'success' => true,
        'message' => 'Data form prestasi berhasil diambil',
        'filters' => [
            'kategori_umur' => $request->kategori_umur,
            'search' => $request->search,
            'status' => $request->status,
        ],
        'data' => [
            'kategori_umur' => $kategoriUmur,
            'siswa' => $siswa,
            'total_siswa' => $siswa->total(),
        ],
    ]);
}

public function StorePrestasiAdmin(Request $request)
{
    $validated = $request->validate([
        'id_siswa' => 'required|array',
        'id_siswa.*' => 'exists:siswa,id_siswa',
        'nama_prestasi' => 'required|string|max:255',
        'tanggal_diberikan' => 'nullable|date',
    ]);

    DB::beginTransaction();

    try {
        $prestasiIds = [];

        foreach ($validated['id_siswa'] as $id) {
            $prestasi = Pencapaian::create([
                'id_siswa' => $id,
                'id_badge' => null, // 🔥 nonaktifkan badge
                'nama_prestasi' => $validated['nama_prestasi'],
                'tanggal_diberikan' => $validated['tanggal_diberikan'] ?? now()->toDateString(),
            ]);

            $prestasiIds[] = $prestasi->id_pencapaian;
        }

        DB::commit();

        $data = Pencapaian::with([
            'siswa:id_siswa,nama_siswa,tanggal_lahir,umur',
        ])->whereIn('id_pencapaian', $prestasiIds)->get();

        $this->recordAdminActivity(
            'Menambahkan prestasi siswa',
            $validated['nama_prestasi'] . ' untuk ' . $data->pluck('siswa.nama_siswa')->filter()->implode(', ')
        );

        return response()->json([
            'success' => true,
            'message' => 'Prestasi berhasil disimpan (tanpa badge)',
            'data' => $data,
        ], 201);

    } catch (\Throwable $e) {
        DB::rollBack();

        return response()->json([
            'success' => false,
            'message' => 'Gagal menyimpan prestasi',
            'error' => $e->getMessage(),
        ], 500);
    }
}

public function HistoryPrestasiAdmin(Request $request)
{
    $query = Pencapaian::with([
        'siswa:id_siswa,nama_siswa,tanggal_lahir,umur',
    ]);

    // 🔍 Filter kategori umur
    if ($request->filled('kategori_umur')) {
        $umur = $this->extractUmurFromKategori($request->kategori_umur);

        if (!is_null($umur)) {
            $query->whereHas('siswa', function ($siswaQuery) use ($umur) {
                $this->applyStudentAgeFilter($siswaQuery, $umur);
            });
        }
    }

    // 🔍 Search (tanpa badge)
    if ($request->filled('search')) {
        $search = $request->search;

        $query->where(function ($q) use ($search) {
            $q->whereHas('siswa', function ($siswaQuery) use ($search) {
                $siswaQuery->where('nama_siswa', 'like', '%' . $search . '%');
            })
            ->orWhere('nama_prestasi', 'like', '%' . $search . '%'); // 🔥 langsung ke field
        });
    }

    $prestasi = $query->orderBy('tanggal_diberikan', 'desc')
        ->orderBy('id_pencapaian', 'desc')
        ->paginate(10)
        ->through(function ($item, $index) use ($request) {
            $page = (int) ($request->get('page', 1));
            $perPage = 10;
            $nomor = (($page - 1) * $perPage) + $index + 1;

            return [
                'no' => $nomor,
                'id_pencapaian' => $item->id_pencapaian,
                'id_siswa' => $item->id_siswa,
                'nama_siswa' => $item->siswa->nama_siswa ?? null,
                'kategori_umur' => $this->categoryLabelFromStudent($item->siswa),
                'nama_prestasi' => $item->nama_prestasi, // 🔥 FIX
                'tanggal_diberikan' => $item->tanggal_diberikan,
            ];
        });

    // 🔽 Filter dropdown kategori umur
    $kategoriUmur = $this->categoryOptionsFromStudents(
        Siswa::select('id_siswa', 'tanggal_lahir', 'umur')->get()
    );

    return response()->json([
        'success' => true,
        'message' => 'History prestasi berhasil diambil',
        'filters' => [
            'kategori_umur' => $request->kategori_umur,
            'search' => $request->search,
        ],
        'options' => [
            'kategori_umur' => $kategoriUmur,
        ],
        'data' => $prestasi,
    ]);
}

public function UpdatePrestasiAdmin(Request $request, $id)
{
    $validated = $request->validate([
        'nama_prestasi' => 'required|string|max:255',
        'tanggal_diberikan' => 'nullable|date',
    ]);

    $prestasi = Pencapaian::with('siswa:id_siswa,nama_siswa')
        ->findOrFail($id);

    $prestasi->update([
        'nama_prestasi' => $validated['nama_prestasi'],
        'tanggal_diberikan' => $validated['tanggal_diberikan'] ?? $prestasi->tanggal_diberikan,
    ]);

    $prestasi->refresh()->load('siswa:id_siswa,nama_siswa,tanggal_lahir,umur');

    $this->recordAdminActivity(
        'Mengubah prestasi siswa',
        $prestasi->nama_prestasi . ' untuk ' . ($prestasi->siswa->nama_siswa ?? 'Siswa')
    );

    return response()->json([
        'success' => true,
        'message' => 'Prestasi berhasil diperbarui',
        'data' => [
            'id_pencapaian' => $prestasi->id_pencapaian,
            'id_siswa' => $prestasi->id_siswa,
            'nama_siswa' => $prestasi->siswa->nama_siswa ?? null,
            'kategori_umur' => $this->categoryLabelFromStudent($prestasi->siswa),
            'nama_prestasi' => $prestasi->nama_prestasi,
            'tanggal_diberikan' => $prestasi->tanggal_diberikan,
        ],
    ]);
}

public function HapusPrestasiAdmin($id)
{
    $prestasi = Pencapaian::with('siswa:id_siswa,nama_siswa')
        ->findOrFail($id);

    $description = $prestasi->nama_prestasi . ' untuk ' . ($prestasi->siswa->nama_siswa ?? 'Siswa');
    $prestasi->delete();

    $this->recordAdminActivity('Menghapus prestasi siswa', $description);

    return response()->json([
        'success' => true,
        'message' => 'Prestasi berhasil dihapus',
    ]);
}

private function recordAdminActivity(string $title, ?string $description = null): void
{
    try {
        $user = Auth::user();
        $exists = DB::table('admin_activity_logs')
            ->where('title', $title)
            ->where('description', $description)
            ->where('created_at', '>=', now()->subSeconds(15))
            ->exists();

        if ($exists) {
            return;
        }

        DB::table('admin_activity_logs')->insert([
            'user_id' => $user?->id,
            'admin_name' => $user?->name,
            'title' => $title,
            'description' => $description,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    } catch (\Throwable $e) {
        Log::warning('Gagal menyimpan history admin.', [
            'title' => $title,
            'error' => $e->getMessage(),
        ]);
    }
}

private function extractUmurFromKategori(?string $kategoriUmur): ?int
{
    if (!$kategoriUmur) {
        return null;
    }

    if (preg_match('/U-(\d+)/i', $kategoriUmur, $match)) {
        return (int) $match[1];
    }

    if (preg_match('/U(\d+)/i', $kategoriUmur, $match)) {
        return (int) $match[1];
    }

    return null;
}

private function sendStudentNotification(?Siswa $siswa, string $judul, string $isi): void
{
    if (! $siswa) {
        return;
    }

    if ($judul === 'Akun Diaktifkan') {
        $this->activateStudentAccount($siswa);
    }

    $notif = Notifikasi::create([
        'judul' => $judul,
        'isi' => $isi,
        'target_role' => 'orang_tua',
        'tanggal_kirim' => now(),
    ]);

    $userId = $this->parentUserIdForStudent($siswa);

    if (! $userId) {
        Log::warning('Notifikasi siswa tidak memiliki penerima orang tua.', [
            'id_siswa' => $siswa->id_siswa,
            'judul' => $judul,
        ]);
    }

    DB::table('notifikasi_terkirim')->insert([
        'id_notifikasi' => $notif->id_notifikasi,
        'user_id' => $userId,
        'id_siswa' => $siswa->id_siswa,
        'id_admin' => null,
        'id_pelatih' => null,
        'status_baca' => 'Belum Dibaca',
        'tanggal_baca' => null,
        'created_at' => now(),
        'updated_at' => now(),
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

    $parentEmail = $siswa->orangtua?->email;

    if ($parentEmail) {
        $userId = User::whereRaw('LOWER(email) = ?', [strtolower($parentEmail)])
            ->whereRaw('LOWER(TRIM(role)) = ?', ['orang_tua'])
            ->value('id');

        return $userId ? (int) $userId : null;
    }

    return null;
}

private function studentCategoryValue(?int $age): string
{
    if ($age === null || $age < 6 || $age > 16) {
        return 'all';
    }

    return 'u' . $age;
}

private function studentAgeValue(?object $student): ?int
{
    if (! $student) {
        return null;
    }

    if (! empty($student->tanggal_lahir)) {
        return Carbon::parse($student->tanggal_lahir)->age;
    }

    return $student->umur !== null ? (int) $student->umur : null;
}

private function studentCategoryFromModel(?object $student): string
{
    return $this->studentCategoryValue($this->studentAgeValue($student));
}

private function applyStudentAgeFilter($query, int $age): void
{
    $oldestBirthDate = now()->subYears($age + 1)->addDay()->toDateString();
    $youngestBirthDate = now()->subYears($age)->toDateString();

    $query->where(function ($builder) use ($age, $oldestBirthDate, $youngestBirthDate) {
        $builder
            ->whereBetween('tanggal_lahir', [$oldestBirthDate, $youngestBirthDate])
            ->orWhere(function ($fallback) use ($age) {
                $fallback->whereNull('tanggal_lahir')->where('umur', $age);
            });
    });
}

private function applyStudentAgeFilterAny($query, $ages): void
{
    $ageValues = collect($ages)
        ->filter(fn ($age) => $age !== null)
        ->map(fn ($age) => (int) $age)
        ->unique()
        ->values();

    if ($ageValues->isEmpty()) {
        return;
    }

    $query->where(function ($builder) use ($ageValues) {
        foreach ($ageValues as $age) {
            $oldestBirthDate = now()->subYears($age + 1)->addDay()->toDateString();
            $youngestBirthDate = now()->subYears($age)->toDateString();

            $builder->orWhere(function ($ageQuery) use ($age, $oldestBirthDate, $youngestBirthDate) {
                $ageQuery
                    ->whereBetween('tanggal_lahir', [$oldestBirthDate, $youngestBirthDate])
                    ->orWhere(function ($fallback) use ($age) {
                        $fallback->whereNull('tanggal_lahir')->where('umur', $age);
                    });
            });
        }
    });
}

private function categoryLabelFromStudent(?object $student): ?string
{
    $age = $this->studentAgeValue($student);

    return $age ? 'U-' . $age : null;
}

private function categoryOptionsFromStudents($students)
{
    return collect($students)
        ->map(fn ($student) => $this->categoryLabelFromStudent($student))
        ->filter()
        ->unique()
        ->sortBy(fn ($category) => (int) preg_replace('/\D/', '', $category))
        ->values();
}

private function normalizeScheduleCategoryValue(?string $category): string
{
    $normalized = strtolower(preg_replace('/[^a-z0-9]/', '', (string) $category));

    if (preg_match('/^u?(\d{1,2})$/', $normalized, $match)) {
        $age = (int) $match[1];

        if ($age >= 6 && $age <= 16) {
            return 'u' . $age;
        }
    }

    return 'all';
}

private function scheduleStudentCategoryMismatchResponse(array $studentIds, ?string $category)
{
    $normalizedCategory = $this->normalizeScheduleCategoryValue($category);

    if ($normalizedCategory === 'all') {
        return null;
    }

    $mismatchedStudents = Siswa::query()
        ->whereIn('id_siswa', $studentIds)
        ->get(['id_siswa', 'nama_siswa', 'tanggal_lahir', 'umur'])
        ->filter(fn (Siswa $siswa) => $this->studentCategoryFromModel($siswa) !== $normalizedCategory)
        ->values();

    if ($mismatchedStudents->isEmpty()) {
        return null;
    }

    return response()->json([
        'status' => false,
        'message' => 'Target siswa tidak sesuai kategori jadwal.',
        'errors' => [
            'id_siswa' => [
                'Siswa berikut tidak sesuai kategori ' . strtoupper(str_replace('u', 'U-', $normalizedCategory)) . ': ' .
                $mismatchedStudents->pluck('nama_siswa')->implode(', '),
            ],
        ],
    ], 422);
}

private function syncActiveStudentToCategorySchedules(?Siswa $siswa): void
{
    if (! $siswa || strtolower((string) $siswa->status) !== 'active') {
        return;
    }

    $studentCategory = $this->studentCategoryFromModel($siswa);

    $schedules = Jadwal_Latihan::with('siswa:id_siswa,tanggal_lahir,umur')
        ->orderBy('id_jadwal')
        ->get()
        ->values();

    if ($schedules->isEmpty()) {
        return;
    }

    $matchingSchedules = $schedules->filter(function (Jadwal_Latihan $jadwal) use ($studentCategory) {
        $storedCategory = $this->normalizeScheduleCategoryValue($jadwal->kategori_umur ?? null);

        if ($storedCategory !== 'all') {
            return $storedCategory === $studentCategory;
        }

        if ($jadwal->siswa->isEmpty()) {
            return true;
        }

        $scheduleCategories = $jadwal->siswa
            ->map(fn ($student) => $this->studentCategoryFromModel($student))
            ->unique();

        return $scheduleCategories->contains($studentCategory);
    });

    if ($matchingSchedules->isEmpty()) {
        $matchingSchedules = collect([$schedules->first()]);
    }

    $matchingSchedules->each(function (Jadwal_Latihan $jadwal) use ($siswa) {
        $jadwal->siswa()->syncWithoutDetaching([$siswa->id_siswa]);
    });
}

private function activateStudentAccount(?Siswa $siswa): void
{
    if (! $siswa) {
        return;
    }

    if (! $this->studentRegistrationPaymentIsApproved($siswa)) {
        $siswa->update(['status' => 'Inactive']);
        return;
    }

    $siswa->update(['status' => 'Active']);
    $this->syncActiveStudentToCategorySchedules($siswa->fresh());
}

private function studentRegistrationPaymentIsApproved(Siswa $siswa): bool
{
    $registrationIsApproved = Pendaftaran_Siswa::where('id_siswa', $siswa->id_siswa)
        ->where('status_approval', 'Disetujui')
        ->exists();

    if (! $registrationIsApproved) {
        return false;
    }

    return Pembayaran::query()
        ->join('bukti_pembayaran', 'pembayaran.id_pembayaran', '=', 'bukti_pembayaran.id_pembayaran')
        ->where('pembayaran.id_siswa', $siswa->id_siswa)
        ->where('pembayaran.jenis', 'Pendaftaran')
        ->where('pembayaran.status', 'Lunas')
        ->whereRaw('LOWER(bukti_pembayaran.status) = ?', ['diterima'])
        ->exists();
}
}
