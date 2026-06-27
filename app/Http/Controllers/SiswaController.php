<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\OrangTua;
use App\Models\Siswa;
use App\Models\Performa_Siswa;
use App\Models\Catatan_Pelatih;
use App\Models\Pencapaian;
use App\Models\Pendaftaran_Siswa;
use App\Models\Pembayaran;
use App\Models\BuktiPembayaran;
use App\Models\Notifikasi;


class SiswaController extends Controller
{
private const MIN_REGISTRATION_AGE = 6;
private const MAX_REGISTRATION_AGE = 16;

private function ageFromBirthDate(?string $birthDate): ?int
{
    if (! $birthDate) {
        return null;
    }

    return Carbon::parse($birthDate)->age;
}

private function validatedRegistrationAge(Request $request, array $validated): int
{
    $age = $request->filled('tanggal_lahir')
        ? $this->ageFromBirthDate($validated['tanggal_lahir'])
        : (int) ($validated['umur'] ?? 0);

    if ($age < self::MIN_REGISTRATION_AGE || $age > self::MAX_REGISTRATION_AGE) {
        throw \Illuminate\Validation\ValidationException::withMessages([
            'tanggal_lahir' => 'Umur siswa maksimal 16 tahun.',
            'umur' => 'Umur siswa maksimal 16 tahun.',
        ]);
    }

    return $age;
}

public function updateProfilSiswaMandiri(Request $request, $id_siswa)
{
    $user = Auth::user();

    if (! $user || $user->role !== 'orang_tua') {
        return response()->json([
            'status' => false,
            'message' => 'Akses ditolak',
        ], 403);
    }

    $parentRows = OrangTua::where(function ($query) use ($user) {
            $query->where('user_id', $user->id)
                ->orWhereRaw('LOWER(email) = ?', [strtolower($user->email)]);
        })
        ->get();
    $ortu = $parentRows->first();

    if (! $ortu) {
        return response()->json([
            'status' => false,
            'message' => 'Data orang tua tidak ditemukan',
        ], 404);
    }

    $parentIds = $parentRows
        ->pluck('id_ortu')
        ->filter()
        ->unique()
        ->values();

    $siswa = Siswa::where('id_siswa', $id_siswa)
        ->where(function ($query) use ($user, $parentIds) {
            $query->where('user_id', $user->id);

            if ($parentIds->isNotEmpty()) {
                $query->orWhereIn('id_ortu', $parentIds);
            }
        })
        ->firstOrFail();

    $studentParent = $parentRows->firstWhere('id_ortu', $siswa->id_ortu) ?: $ortu;

    $validated = $request->validate([
        'alamat' => 'nullable|string|max:255',
        'tinggi_badan' => 'nullable|integer|min:1|max:250',
        'berat_badan' => 'nullable|integer|min:1|max:250',
    ]);

    DB::table('profil_siswa')->updateOrInsert(
        ['id_siswa' => $siswa->id_siswa],
        [
            'id_ortu' => $studentParent->id_ortu,
            'alamat' => $validated['alamat'] ?? null,
            'tinggi_badan' => $validated['tinggi_badan'] ?? null,
            'berat_badan' => $validated['berat_badan'] ?? null,
        ]
    );

    $updatedFields = collect([
        'alamat' => 'alamat',
        'tinggi_badan' => 'tinggi badan',
        'berat_badan' => 'berat badan',
    ])
        ->filter(fn ($_label, $key) => $request->has($key))
        ->values()
        ->implode(', ');

    $this->notifyAdmins(
        'Profil Siswa Diperbarui',
        "Orang tua {$studentParent->nama_ortu} memperbarui {$updatedFields} untuk siswa {$siswa->nama_siswa}."
    );

    return response()->json([
        'status' => true,
        'message' => 'Profil siswa berhasil diperbarui.',
        'data' => [
            'id_siswa' => $siswa->id_siswa,
            'alamat' => $validated['alamat'] ?? '',
            'tinggi_badan' => $validated['tinggi_badan'] ?? '',
            'berat_badan' => $validated['berat_badan'] ?? '',
        ],
    ]);
}

   public function registrasi_siswa()
{
    return response()->json([
        'status' => true,
        'message' => 'Silahkan Daftarkan Siswa Anda',
        'data' => Auth::user()
    ]);
}

public function daftar_siswa(Request $request)
{
    // VALIDASI
    try {
        $validated = $request->validate([
            'nama_siswa' => 'required',
            'nama_ayah'  => 'required',
            'nama_ibu'   => 'required',
            'tanggal_lahir' => 'required_without:umur|date|before_or_equal:today',
            'umur'       => 'nullable|integer|min:6|max:16',
            'akta_kelahiran' => 'required|file|mimes:jpg,jpeg,png,webp,pdf|max:5120',
            'kartu_keluarga' => 'required|file|mimes:jpg,jpeg,png,webp,pdf|max:5120',
            'rapor' => 'required|file|mimes:jpg,jpeg,png,webp,pdf|max:5120',
            'pas_photo_3x4' => 'required|file|mimes:jpg,jpeg,png,webp,pdf|max:5120',
        ]);
        $validated['umur'] = $this->validatedRegistrationAge($request, $validated);
    } catch (\Illuminate\Validation\ValidationException $e) {
        if ($request->header('X-Inertia')) {
            return back()->withErrors($e->errors())->withInput();
        }

        return response()->json([
            'status' => false,
            'message' => 'Validasi gagal',
            'errors' => $e->errors()
        ], 422);
    }

    DB::beginTransaction();

    try {
        $user = Auth::user();

        if (!$user) {
            return response()->json([
                'status' => false,
                'message' => 'Unauthorized'
            ], 401);
        }

        $ortu = $this->resolveOrangTuaForUser($user);

        if (!$ortu) {
            if ($request->header('X-Inertia')) {
                return back()->withErrors([
                    'pendaftaran' => 'Data orang tua tidak ditemukan. Silakan login ulang.',
                ])->withInput();
            }

            return response()->json([
                'status' => false,
                'message' => 'Data orang tua tidak ditemukan'
            ], 404);
        }

        // 🔥 SIMPAN FILE
        $akta  = $request->file('akta_kelahiran')->store('akta');
        $kk    = $request->file('kartu_keluarga')->store('kk');
        $rapor = $request->file('rapor')->store('rapor');
        $foto  = $request->file('pas_photo_3x4')->store('foto');

        // 🔥 SIMPAN SISWA
        $siswa = Siswa::create([
            'nama_siswa' => $validated['nama_siswa'],
            'nama_ayah'  => $validated['nama_ayah'],
            'nama_ibu'   => $validated['nama_ibu'],
            'tanggal_lahir' => $validated['tanggal_lahir'] ?? null,
            'umur'       => $validated['umur'],
            'id_ortu'    => $ortu->id_ortu,
            'user_id'    => $user->id,

            'akta_kelahiran' => $akta,
            'kartu_keluarga' => $kk,
            'rapor'          => $rapor,
            'pas_photo_3x4'  => $foto,

            'status' => 'Inactive',
        ]);

        // 🔥 SIMPAN PENDAFTARAN
        $pendaftaran = Pendaftaran_Siswa::create([
            'id_siswa' => $siswa->id_siswa,
            'tanggal_daftar' => now(),
            'status_approval' => 'Menunggu',
        ]);

        DB::commit();

        $this->notifyAdmins(
            'Pendaftaran Baru',
            "Orang tua {$user->name} mendaftarkan siswa {$siswa->nama_siswa}. Data masuk ke validasi pendaftaran."
        );

        $request->session()->put('registration.form', [
            'childName' => $validated['nama_siswa'],
            'fatherName' => $validated['nama_ayah'],
            'motherName' => $validated['nama_ibu'],
            'age' => $validated['umur'],
            'birthDate' => $validated['tanggal_lahir'] ?? '',
            'formValues' => [
                'childName' => $validated['nama_siswa'],
                'fatherName' => $validated['nama_ayah'],
                'motherName' => $validated['nama_ibu'],
                'age' => $validated['umur'],
                'birthDate' => $validated['tanggal_lahir'] ?? '',
            ],
            'studentId' => $siswa->id_siswa,
            'registrationId' => $pendaftaran->id_pendaftaran,
        ]);

        if ($request->header('X-Inertia')) {
            return redirect('/register/payment-proof');
        }

        return response()->json([
            'status' => true,
            'message' => 'Pendaftaran siswa berhasil',
            'data' => [
                'siswa' => $siswa,
                'pendaftaran' => $pendaftaran
            ]
        ], 201);

    } catch (\Exception $e) {

        DB::rollBack();

        Log::error('DAFTAR SISWA GAGAL', [
            'error' => $e->getMessage(),
            'user_id' => Auth::id()
        ]);

        if ($request->header('X-Inertia')) {
            return back()->withErrors([
                'pendaftaran' => 'Pendaftaran siswa gagal disimpan. Silakan coba lagi.',
            ])->withInput();
        }

        return response()->json([
            'status' => false,
            'message' => 'Pendaftaran siswa gagal',
            'error' => $e->getMessage() // opsional (debug)
        ], 500);
    }
}


public function getAnak()
{
    $user = Auth::user();

    if (! $user) {
        return response()->json([
            'status' => false,
            'message' => 'Belum login',
            'data' => [],
        ], 401);
    }

    $ortu = $this->resolveOrangTuaForUser($user);
    $ortuIds = $this->parentIdsForUser($user);

    $anak = $this->studentQueryForParent($user, $ortuIds)
        ->orderBy('nama_siswa')
        ->get(['id_siswa', 'nama_siswa']);

    if ($anak->isEmpty()) {
        $possibleNames = collect([
                $user->name,
                $ortu?->nama_ortu,
            ])
            ->filter()
            ->map(fn ($name) => mb_strtolower(trim($name)))
            ->unique()
            ->values();

        $anak = \App\Models\Siswa::query()
            ->whereIn(DB::raw('LOWER(nama_siswa)'), $possibleNames)
            ->orderBy('id_siswa')
            ->get(['id_siswa', 'nama_siswa']);
    }

    return response()->json([
        'status' => true,
        'message' => 'Data anak berhasil diambil',
        'data' => $anak
    ]);
}

public function setAnak(Request $request)
{
    $user = Auth::user();
    $idSiswa = (int) $request->input('id_siswa');
    $namaSiswa = trim((string) $request->input('nama_siswa', $request->input('name', '')));

    $ortu = $this->resolveOrangTuaForUser($user);
    $ortuIds = $this->parentIdsForUser($user);
    $siswaQuery = $this->studentQueryForParent($user, $ortuIds);

    if ($idSiswa > 0) {
        $siswaQuery->where('id_siswa', $idSiswa);
    } elseif ($namaSiswa !== '') {
        $siswaQuery->where('nama_siswa', $namaSiswa);
    } else {
        return response()->json([
            'status' => false,
            'message' => 'Data anak tidak valid. Pilih nama anak yang tersedia.',
        ], 422);
    }

    $siswa = $siswaQuery->orderBy('id_siswa')->first(['id_siswa', 'nama_siswa', 'id_ortu', 'user_id']);

    if (! $siswa && ($idSiswa > 0 || $namaSiswa !== '')) {
        $fallbackQuery = \App\Models\Siswa::query();

        if ($idSiswa > 0) {
            $fallbackQuery->where('id_siswa', $idSiswa);
        } else {
            $fallbackQuery->whereRaw('LOWER(nama_siswa) = ?', [mb_strtolower($namaSiswa)]);
        }

        $siswa = $fallbackQuery->orderBy('id_siswa')->first(['id_siswa', 'nama_siswa', 'id_ortu', 'user_id']);
    }

    if (!$siswa) {
        return response()->json([
            'status' => false,
            'message' => 'Anak tidak ditemukan. Pastikan data siswa sudah terdaftar.'
        ], 404);
    }

    if ($ortu && ($siswa->id_ortu !== $ortu->id_ortu || $siswa->user_id !== $user->id)) {
        $siswa->forceFill([
            'id_ortu' => $ortu->id_ortu,
            'user_id' => $user->id,
        ])->save();
    }

    session(['id_siswa' => $siswa->id_siswa]);

    return response()->json([
        'status' => true,
        'message' => 'Anak berhasil dipilih',
        'data' => [
            'id_siswa' => $siswa->id_siswa,
            'nama_siswa' => $siswa->nama_siswa,
        ]
    ]);
}

private function resolveOrangTuaForUser($user): ?OrangTua
{
    if (! $user) {
        return null;
    }

    $parent = OrangTua::where(function ($query) use ($user) {
            $query->where('user_id', $user->id)
                ->orWhereRaw('LOWER(email) = ?', [strtolower($user->email)]);
        })
        ->orderByDesc('user_id')
        ->first();

    if ($parent) {
        $updates = [];

        if (! $parent->user_id) {
            $updates['user_id'] = $user->id;
        }

        if (! $parent->email) {
            $updates['email'] = $user->email;
        }

        if (! $parent->nama_ortu) {
            $updates['nama_ortu'] = $user->name;
        }

        if ($updates) {
            $parent->forceFill($updates)->save();
            $parent->refresh();
        }

        return $parent;
    }

    return OrangTua::create([
        'user_id' => $user->id,
        'nama_ortu' => $user->name,
        'email' => $user->email,
        'password' => $user->password ?? '',
        'no_hp' => $user->no_hp ?? null,
    ]);
}

private function parentIdsForUser($user)
{
    if (! $user) {
        return collect();
    }

    return OrangTua::where(function ($query) use ($user) {
            $query->where('user_id', $user->id)
                ->orWhere('email', $user->email);
        })
        ->pluck('id_ortu')
        ->filter()
        ->unique()
        ->values();
}

private function studentQueryForParent($user, $ortuIds)
{
    return \App\Models\Siswa::query()
        ->where(function ($query) use ($ortuIds, $user) {
            if ($ortuIds->isNotEmpty()) {
                $query->whereIn('id_ortu', $ortuIds);
                $query->orWhere('user_id', $user->id);
                return;
            }

            $query->where('user_id', $user->id);
        });
}

public function revisi_pendaftaran($id_siswa)
{
    $user = Auth::user();
    $ortuIds = $this->parentIdsForUser($user);
    $siswa = $this->studentQueryForParent($user, $ortuIds)
        ->where('id_siswa', $id_siswa)
        ->firstOrFail();

    $pendaftaran = Pendaftaran_Siswa::with('siswa')
        ->where('id_siswa', $siswa->id_siswa)
        ->firstOrFail();

    $invalidIdentityFields = [];
    $invalidUploadFields = [];

    // IDENTITAS
    if ($pendaftaran->val_nama_siswa == 'tidak_valid') $invalidIdentityFields[] = 'nama_siswa';
    if ($pendaftaran->val_nama_ayah == 'tidak_valid') $invalidIdentityFields[] = 'nama_ayah';
    if ($pendaftaran->val_nama_ibu == 'tidak_valid') $invalidIdentityFields[] = 'nama_ibu';
    if ($pendaftaran->val_umur == 'tidak_valid') $invalidIdentityFields[] = 'umur';

    // FILE
    if ($pendaftaran->val_akta == 'tidak_valid') $invalidUploadFields[] = 'akta_kelahiran';
    if ($pendaftaran->val_kk == 'tidak_valid') $invalidUploadFields[] = 'kartu_keluarga';
    if ($pendaftaran->val_rapor == 'tidak_valid') $invalidUploadFields[] = 'rapor';
    if ($pendaftaran->val_foto == 'tidak_valid') $invalidUploadFields[] = 'pas_photo_3x4';

    $buktiPembayaranDitolak = BuktiPembayaran::with('pembayaran')
        ->where('id_siswa', $id_siswa)
        ->where('status', 'ditolak')
        ->whereHas('pembayaran', function ($query) {
            $query->where('jenis', 'Pendaftaran');
        })
        ->orderByDesc('tanggal_bukti_bayar')
        ->orderByDesc('id_bukti_pembayaran')
        ->first();

    if ($buktiPembayaranDitolak) {
        $invalidUploadFields[] = 'bukti_bayar';
    }

    $frontendUploadFields = collect($invalidUploadFields)
        ->map(fn ($field) => match ($field) {
            'akta_kelahiran' => 'birthCert',
            'kartu_keluarga' => 'familyCard',
            'rapor' => 'reportCard',
            'pas_photo_3x4' => 'photo',
            'bukti_bayar' => 'paymentProof',
            default => $field,
        })
        ->unique()
        ->values()
        ->all();

    return response()->json([
        'success' => true,
        'data' => [
            'siswa' => $pendaftaran->siswa,
            'invalidIdentityFields' => $invalidIdentityFields,
            'invalidUploadFields' => $frontendUploadFields,
            'invalidUploadDatabaseFields' => array_values(array_unique($invalidUploadFields)),
            'bukti_pembayaran' => $buktiPembayaranDitolak,
        ]
    ]);
}

public function update_pendaftaran(Request $request, $id_siswa)
{
    \Log::info('Update revisi pendaftaran', [
        'id_siswa' => $id_siswa,
        'user' => auth()->user()
    ]);

    DB::beginTransaction();

    try {
        $user = Auth::user();
        $ortuIds = $this->parentIdsForUser($user);
        $siswa = $this->studentQueryForParent($user, $ortuIds)
            ->where('id_siswa', $id_siswa)
            ->first();

        if (! $siswa) {
            DB::rollBack();

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data siswa tidak ditemukan atau tidak sesuai dengan akun orang tua.',
                ], 404);
            }

            return back()->withErrors([
                'siswa' => 'Data siswa tidak ditemukan atau tidak sesuai dengan akun orang tua.',
            ]);
        }

        // =========================
        // AMBIL DATA VALIDASI
        // =========================
        $pendaftaran = Pendaftaran_Siswa::where('id_siswa', $siswa->id_siswa)->firstOrFail();

        // =========================
        // VALIDASI DINAMIS
        // =========================
        $rules = [];

        if ($pendaftaran->val_nama_siswa === 'tidak_valid') {
            $rules['nama_siswa'] = 'required|string';
        }

        if ($pendaftaran->val_nama_ayah === 'tidak_valid') {
            $rules['nama_ayah'] = 'required|string';
        }

        if ($pendaftaran->val_nama_ibu === 'tidak_valid') {
            $rules['nama_ibu'] = 'required|string';
        }

        if ($pendaftaran->val_umur === 'tidak_valid') {
            $rules['tanggal_lahir'] = 'required_without:umur|date|before_or_equal:today';
            $rules['umur'] = 'nullable|integer|min:6|max:16';
        }

        if ($pendaftaran->val_akta === 'tidak_valid') {
            $rules['akta_kelahiran'] = 'nullable|file|mimes:jpg,jpeg,png,webp,pdf|max:5120';
        }

        if ($pendaftaran->val_kk === 'tidak_valid') {
            $rules['kartu_keluarga'] = 'nullable|file|mimes:jpg,jpeg,png,webp,pdf|max:5120';
        }

        if ($pendaftaran->val_rapor === 'tidak_valid') {
            $rules['rapor'] = 'nullable|file|mimes:jpg,jpeg,png,webp,pdf|max:5120';
        }

        if ($pendaftaran->val_foto === 'tidak_valid') {
            $rules['pas_photo_3x4'] = 'nullable|file|mimes:jpg,jpeg,png,webp,pdf|max:5120';
        }

        $buktiPembayaranDitolak = BuktiPembayaran::with('pembayaran')
            ->where('id_siswa', $id_siswa)
            ->where('status', 'ditolak')
            ->whereHas('pembayaran', function ($query) {
                $query->where('jenis', 'Pendaftaran');
            })
            ->orderByDesc('tanggal_bukti_bayar')
            ->orderByDesc('id_bukti_pembayaran')
            ->first();

        if ($buktiPembayaranDitolak) {
            $rules['bukti_bayar'] = 'required_without:paymentProof|file|mimes:jpg,jpeg,png,webp,pdf|max:5120';
            $rules['paymentProof'] = 'required_without:bukti_bayar|file|mimes:jpg,jpeg,png,webp,pdf|max:5120';
        }

        // =========================
        // VALIDATE REQUEST
        // =========================
        $validated = $request->validate($rules);

        $revisionAge = null;
        if ($pendaftaran->val_umur === 'tidak_valid') {
            $revisionAge = $this->validatedRegistrationAge($request, $validated);
        }

        // =========================
        // SIMPAN REVISI KE PENDING, DATA SISWA UTAMA MENUNGGU APPROVAL ADMIN
        // =========================
        if ($pendaftaran->val_nama_siswa === 'tidak_valid' && $request->filled('nama_siswa')) {
            $pendaftaran->pending_nama_siswa = $request->nama_siswa;
        }

        if ($pendaftaran->val_nama_ayah === 'tidak_valid' && $request->filled('nama_ayah')) {
            $pendaftaran->pending_nama_ayah = $request->nama_ayah;
        }

        if ($pendaftaran->val_nama_ibu === 'tidak_valid' && $request->filled('nama_ibu')) {
            $pendaftaran->pending_nama_ibu = $request->nama_ibu;
        }

        if ($pendaftaran->val_umur === 'tidak_valid' && $revisionAge !== null) {
            $pendaftaran->pending_umur = $revisionAge;
            $pendaftaran->pending_tanggal_lahir = $validated['tanggal_lahir'] ?? null;
        }

        // =========================
        // SIMPAN FILE REVISI KE PENDING
        // =========================
        if ($pendaftaran->val_akta === 'tidak_valid' && $request->hasFile('akta_kelahiran')) {
            $path = $request->file('akta_kelahiran')->store('akta');
            $pendaftaran->pending_akta_kelahiran = $path;
        }

        if ($pendaftaran->val_kk === 'tidak_valid' && $request->hasFile('kartu_keluarga')) {
            $path = $request->file('kartu_keluarga')->store('kk');
            $pendaftaran->pending_kartu_keluarga = $path;
        }

        if ($pendaftaran->val_rapor === 'tidak_valid' && $request->hasFile('rapor')) {
            $path = $request->file('rapor')->store('rapor');
            $pendaftaran->pending_rapor = $path;
        }

        if ($pendaftaran->val_foto === 'tidak_valid' && $request->hasFile('pas_photo_3x4')) {
            $path = $request->file('pas_photo_3x4')->store('foto');
            $pendaftaran->pending_pas_photo_3x4 = $path;
        }

        if ($buktiPembayaranDitolak && ($request->hasFile('bukti_bayar') || $request->hasFile('paymentProof'))) {
            $file = $request->file('bukti_bayar') ?: $request->file('paymentProof');
            $path = $file->store('bukti_pembayaran', 'public');

            $buktiPembayaranDitolak->update([
                'tanggal_bukti_bayar' => now()->toDateString(),
                'status' => 'Menunggu validasi',
                'bukti_bayar' => $path,
            ]);

            $pembayaran = Pembayaran::find($buktiPembayaranDitolak->id_pembayaran);
            if ($pembayaran) {
                $pembayaran->update([
                    'tanggal_bayar' => now()->toDateString(),
                    'status' => 'Belum',
                ]);
            }
        }

        // =========================
        // SAVE
        // =========================
        $pendaftaran->status_approval = 'Menunggu';
        $pendaftaran->tanggal_daftar = now();
        $pendaftaran->save();

        DB::commit();

        $this->notifyAdmins(
            'Revisi Pendaftaran Masuk',
            "Orang tua mengirim revisi pendaftaran untuk {$siswa->nama_siswa}. Silakan validasi ulang berkas."
        );

        $response = [
            'success' => true,
            'message' => 'Revisi pendaftaran berhasil diperbarui',
            'data' => $pendaftaran->fresh()
        ];

        if ($request->header('X-Inertia')) {
            return back()->with('success', $response['message']);
        }

        return response()->json($response);

    } catch (\Illuminate\Validation\ValidationException $e) {
        DB::rollBack();

        if ($request->header('X-Inertia')) {
            return back()->withErrors($e->errors())->withInput();
        }

        throw $e;
    } catch (\Exception $e) {
        DB::rollBack();

        \Log::error('UPDATE REVISI GAGAL', [
            'error' => $e->getMessage(),
            'line' => $e->getLine(),
            'file' => $e->getFile()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Gagal update revisi',
            'error' => $e->getMessage()
        ], 422);
    }
}


public function Store_Bukti_Pendaftaran(Request $request)
{
    $validated = $request->validate([
        'periode' => 'required|string',
        'jumlah' => 'required|numeric',
        'tanggal_bukti_bayar' => 'required|date',
        'bukti_bayar' => 'required|file|mimes:jpg,jpeg,png,webp,pdf|max:5120',
    ]);

    $registrationForm = $request->session()->get('registration.form', []);
    $idSiswa = $registrationForm['studentId'] ?? session('id_siswa');

    if (! $idSiswa && Auth::check() && $request->filled('student_name')) {
        $ortu = OrangTua::where('user_id', Auth::id())
            ->orWhere('email', Auth::user()->email)
            ->first();

        $idSiswa = $ortu
            ? Siswa::where('id_ortu', $ortu->id_ortu)
                ->whereRaw('LOWER(nama_siswa) = ?', [mb_strtolower(trim((string) $request->student_name))])
                ->latest('id_siswa')
                ->value('id_siswa')
            : null;
    }

    if (! $idSiswa) {
        if ($request->expectsJson()) {
            return response()->json([
                'success' => false,
                'message' => 'Data siswa belum ditemukan. Ulangi dari form pendaftaran.',
            ], 422);
        }

        return back()->withErrors([
            'bukti_bayar' => 'Data siswa belum ditemukan. Ulangi dari form pendaftaran.',
        ]);
    }

    $user = Auth::user();
    $ortuIds = $this->parentIdsForUser($user);
    $ownedStudent = $this->studentQueryForParent($user, $ortuIds)
        ->where('id_siswa', $idSiswa)
        ->exists();

    if (! $ownedStudent) {
        if ($request->expectsJson()) {
            return response()->json([
                'success' => false,
                'message' => 'Data siswa tidak sesuai dengan akun orang tua yang sedang login.',
            ], 403);
        }

        return back()->withErrors([
            'bukti_bayar' => 'Data siswa tidak sesuai dengan akun orang tua yang sedang login.',
        ]);
    }

    DB::beginTransaction();

    try {
        $siswa = Siswa::where('id_siswa', $idSiswa)->firstOrFail();

        $pembayaran = Pembayaran::firstOrCreate(
            [
                'id_siswa' => $siswa->id_siswa,
                'periode' => $validated['periode'],
                'jenis' => 'Pendaftaran',
            ],
            [
                'jumlah' => $validated['jumlah'],
                'tanggal_bayar' => $validated['tanggal_bukti_bayar'],
                'status' => 'Belum',
            ]
        );

        $pembayaran->update([
            'jumlah' => $validated['jumlah'],
            'tanggal_bayar' => $validated['tanggal_bukti_bayar'],
            'status' => 'Belum',
        ]);

        $filePath = $request->file('bukti_bayar')->store('bukti_pembayaran', 'public');

        BuktiPembayaran::updateOrCreate(
            [
                'id_pembayaran' => $pembayaran->id_pembayaran,
                'id_siswa' => $siswa->id_siswa,
            ],
            [
                'periode' => $validated['periode'],
                'tanggal_bukti_bayar' => $validated['tanggal_bukti_bayar'],
                'status' => 'Menunggu validasi',
                'bukti_bayar' => $filePath,
            ]
        );

        DB::commit();

        $request->session()->forget([
            'registration.form',
            'registration.account',
        ]);
        $request->session()->put('id_siswa', $siswa->id_siswa);
        $request->session()->put('show_child_picker_after_login', true);

        $this->notifyAdmins(
            'Bukti Pembayaran Pendaftaran',
            "Orang tua mengirim bukti pembayaran pendaftaran untuk {$siswa->nama_siswa}. Data masuk ke validasi pembayaran."
        );

        if ($request->header('X-Inertia')) {
            return redirect('/orang-tua/dashboard')
                ->with('success', 'Bukti pembayaran berhasil dikirim. Silakan pilih data anak.');
        }

        return response()->json([
            'success' => true,
            'message' => 'Bukti pembayaran berhasil dikirim',
            'next_url' => '/orang-tua/dashboard',
        ]);
    } catch (\Throwable $e) {
        DB::rollBack();

        Log::error('UPLOAD BUKTI PENDAFTARAN GAGAL', [
            'error' => $e->getMessage(),
            'user_id' => Auth::id(),
        ]);

        if ($request->expectsJson()) {
            return response()->json([
                'success' => false,
                'message' => 'Upload bukti pembayaran gagal.',
            ], 500);
        }

        return back()->withErrors([
            'bukti_bayar' => 'Upload bukti pembayaran gagal.',
        ]);
    }
}


public function Upload_Bukti_Pembayaran($id_pembayaran, $id_siswa)
{
    $siswa = Siswa::with('pembayaran')
        ->where('id_siswa', $id_siswa)
        ->firstOrFail();

$pembayaranBelum = Pembayaran::where('id_pembayaran', $id_pembayaran)
    ->first();

if (!$pembayaranBelum || $pembayaranBelum->id_siswa != $id_siswa) {
    return response()->json([
        'success' => false,
        'message' => 'Data pembayaran tidak cocok'
    ], 404);
}

    if (!$pembayaranBelum) {
        return response()->json([
            'success' => false,
            'message' => 'Pembayaran belum ditemukan'
        ], 404);
    }

    return response()->json([
        'success' => true,
        'message' => 'Data siap upload bukti',
        'data' => [
            'siswa' => $siswa,
            'pembayaran' => $pembayaranBelum
        ]
    ]);
}


public function Store_Bukti_Pembayaran(Request $request, $id_pembayaran)
{
    $request->validate([
        'tanggal_bukti_bayar' => 'required|date',
        'bukti_bayar' => 'required|file|mimes:jpg,jpeg,png,webp,pdf|max:5120'
    ]);

    DB::beginTransaction();

    try {

        $pembayaran = Pembayaran::where('id_pembayaran', $id_pembayaran)
            ->firstOrFail();

        $filePath = $request->file('bukti_bayar')
            ->store('bukti_pembayaran', 'public');

        $bukti = BuktiPembayaran::create([
            'id_pembayaran' => $pembayaran->id_pembayaran,
            'id_siswa' => $pembayaran->id_siswa,
            'periode' => $pembayaran->periode,
            'tanggal_bukti_bayar' => $request->tanggal_bukti_bayar,
            'status' => 'Menunggu validasi',
            'bukti_bayar' => $filePath
        ]);

        $pembayaran->update([
            'tanggal_bayar' => $request->tanggal_bukti_bayar
        ]);

        DB::commit();

        $siswa = Siswa::find($pembayaran->id_siswa);
        $this->notifyAdmins(
            'Bukti Pembayaran Masuk',
            "Orang tua mengirim bukti pembayaran {$pembayaran->jenis} untuk " . ($siswa?->nama_siswa ?? 'siswa') . ". Data masuk ke pembayaran admin."
        );

        return response()->json([
            'success' => true,
            'message' => 'Bukti pembayaran berhasil diupload',
            'data' => $bukti
        ]);

    } catch (\Throwable $e) {
        DB::rollBack();

        return response()->json([
            'success' => false,
            'message' => 'Upload gagal',
            'error' => $e->getMessage()
        ], 500);
    }
}

public function kehadiranSiswa(Request $request)
{
    $user = Auth::user();
    $bulan = (int) ($request->bulan ?? now()->month);
    $tahun = (int) ($request->tahun ?? now()->year);
    $tahunRekap = (int) ($request->tahun_rekap ?? $tahun);

    if ($bulan < 1 || $bulan > 12) {
        return response()->json([
            'status' => false,
            'message' => 'Bulan harus bernilai 1 sampai 12'
        ], 422);
    }

    $ortu = OrangTua::where('user_id', $user->id)->first();

    if (!$ortu) {
        return response()->json([
            'status' => false,
            'message' => 'Data orang tua tidak ditemukan'
        ], 404);
    }

    $idSiswa = $request->id_siswa ?? session('id_siswa');

    $siswaQuery = Siswa::where('id_ortu', $ortu->id_ortu);

    if ($idSiswa) {
        $siswaQuery->where('id_siswa', $idSiswa);
    }

    $siswa = $siswaQuery->first(['id_siswa', 'nama_siswa', 'umur']);

    if (!$siswa) {
        return response()->json([
            'status' => false,
            'message' => $idSiswa
                ? 'Anak tidak ditemukan atau tidak terkait dengan akun orang tua ini'
                : 'Silakan pilih anak terlebih dahulu'
        ], 404);
    }

    session(['id_siswa' => $siswa->id_siswa]);

    $presensiBulanIni = $siswa->presensi()
        ->whereMonth('created_at', $bulan)
        ->whereYear('created_at', $tahun)
        ->get();

    $ringkasanBulanIni = $this->formatRingkasanKehadiran($presensiBulanIni);

    $createdYearExpression = $this->datePartExpression('year', 'created_at');
    $createdMonthExpression = $this->datePartExpression('month', 'created_at');

    $riwayatBulanan = $siswa->presensi()
        ->selectRaw("{$createdYearExpression} as tahun, {$createdMonthExpression} as bulan, COUNT(*) as total")
        ->selectRaw("SUM(CASE WHEN status_kehadiran = 'Hadir' THEN 1 ELSE 0 END) as hadir")
        ->selectRaw("SUM(CASE WHEN status_kehadiran = 'Sakit' THEN 1 ELSE 0 END) as sakit")
        ->selectRaw("SUM(CASE WHEN status_kehadiran = 'Izin' THEN 1 ELSE 0 END) as izin")
        ->whereYear('created_at', $tahunRekap)
        ->groupBy('tahun', 'bulan')
        ->orderByDesc('tahun')
        ->orderByDesc('bulan')
        ->get()
        ->map(function ($item) {
            $persentaseHadir = $item->total > 0
                ? round(($item->hadir / $item->total) * 100, 1)
                : 0;

            return [
                'tahun' => (int) $item->tahun,
                'bulan' => (int) $item->bulan,
                'nama_bulan' => $this->namaBulanIndonesia((int) $item->bulan),
                'hadir' => (int) $item->hadir,
                'sakit' => (int) $item->sakit,
                'izin' => (int) $item->izin,
                'total' => (int) $item->total,
                'persentase_hadir' => $persentaseHadir,
            ];
        })
        ->values();

    return response()->json([
        'status' => true,
        'message' => 'Rekap kehadiran anak berhasil diambil',
        'anak' => [
            'id_siswa' => $siswa->id_siswa,
            'nama_siswa' => $siswa->nama_siswa,
            'umur' => 'U-' . $siswa->umur,
        ],
        'filter' => [
            'bulan' => $bulan,
            'nama_bulan' => $this->namaBulanIndonesia($bulan),
            'tahun' => $tahun,
            'tahun_rekap' => $tahunRekap,
        ],
        'bulan_berjalan' => $ringkasanBulanIni,
        'grafik_bulan_berjalan' => [
            [
                'label' => 'Hadir',
                'jumlah' => $ringkasanBulanIni['hadir'],
                'persentase' => $ringkasanBulanIni['persen_hadir'],
            ],
            [
                'label' => 'Sakit',
                'jumlah' => $ringkasanBulanIni['sakit'],
                'persentase' => $ringkasanBulanIni['persen_sakit'],
            ],
            [
                'label' => 'Izin',
                'jumlah' => $ringkasanBulanIni['izin'],
                'persentase' => $ringkasanBulanIni['persen_izin'],
            ],
        ],
        'rekap_bulanan' => $riwayatBulanan,
    ]);
}

private function formatRingkasanKehadiran($presensi)
{
    $total = $presensi->count();
    $hadir = $presensi->where('status_kehadiran', 'Hadir')->count();
    $sakit = $presensi->where('status_kehadiran', 'Sakit')->count();
    $izin = $presensi->where('status_kehadiran', 'Izin')->count();

    return [
        'hadir' => $hadir,
        'sakit' => $sakit,
        'izin' => $izin,
        'total' => $total,
        'persen_hadir' => $total ? round(($hadir / $total) * 100, 1) : 0,
        'persen_sakit' => $total ? round(($sakit / $total) * 100, 1) : 0,
        'persen_izin' => $total ? round(($izin / $total) * 100, 1) : 0,
    ];
}

private function namaBulanIndonesia(int $bulan): string
{
    $namaBulan = [
        1 => 'Januari',
        2 => 'Februari',
        3 => 'Maret',
        4 => 'April',
        5 => 'Mei',
        6 => 'Juni',
        7 => 'Juli',
        8 => 'Agustus',
        9 => 'September',
        10 => 'Oktober',
        11 => 'November',
        12 => 'Desember',
    ];

    return $namaBulan[$bulan] ?? '-';
}

private function datePartExpression(string $part, string $column): string
{
    if (DB::connection()->getDriverName() === 'sqlite') {
        $format = strtolower($part) === 'year' ? '%Y' : '%m';

        return "CAST(strftime('{$format}', {$column}) AS INTEGER)";
    }

    return strtoupper($part) . "({$column})";
}

public function performaSiswa(Request $request)
{
    $user = Auth::user();
    $idSiswaRequest = $request->id_siswa ?? session('id_siswa');

    if ($user->role === 'orang_tua') {
        $ortu = OrangTua::where('user_id', $user->id)->first();

        if (!$ortu) {
            return response()->json([
                'status' => false,
                'message' => 'Data orang tua tidak ditemukan'
            ], 404);
        }

        $siswaQuery = Siswa::where('id_ortu', $ortu->id_ortu);

        if ($idSiswaRequest) {
            $siswaQuery->where('id_siswa', $idSiswaRequest);
        }

        $siswa = $siswaQuery->first(['id_siswa', 'nama_siswa', 'umur']);
    } else {
        $siswa = Siswa::where('user_id', $user->id)
            ->first(['id_siswa', 'nama_siswa', 'umur']);
    }

    if (!$siswa) {
        return response()->json([
            'status' => false,
            'message' => $idSiswaRequest
                ? 'Siswa tidak ditemukan atau tidak terkait dengan akun ini'
                : 'Silakan pilih siswa terlebih dahulu'
        ], 404);
    }

    session(['id_siswa' => $siswa->id_siswa]);

    $profil = DB::table('profil_siswa')
    ->where('id_siswa', $siswa->id_siswa)
    ->first();

    $performanceYearExpression = $this->datePartExpression('year', 'tanggal_penilaian');
    $performanceMonthExpression = $this->datePartExpression('month', 'tanggal_penilaian');

    $tahunOptions = Performa_Siswa::where('id_siswa', $siswa->id_siswa)
        ->selectRaw("{$performanceYearExpression} as tahun")
        ->whereNotNull('tanggal_penilaian')
        ->distinct()
        ->orderBy('tahun', 'desc')
        ->pluck('tahun')
        ->map(fn ($tahun) => (int) $tahun)
        ->values();

    $tahunDipilih = (int) ($request->tahun ?: ($tahunOptions->first() ?? now()->year));

    $performaBulanan = Performa_Siswa::where('id_siswa', $siswa->id_siswa)
        ->whereYear('tanggal_penilaian', $tahunDipilih)
        ->selectRaw("{$performanceMonthExpression} as bulan")
        ->selectRaw('AVG(dribbling) as dribbling')
        ->selectRaw('AVG(passing) as passing')
        ->selectRaw('AVG(shooting) as shooting')
        ->groupBy('bulan')
        ->orderBy('bulan')
        ->get()
        ->keyBy(fn ($item) => (int) $item->bulan);

    $grafikBatang = collect(range(1, 12))->map(function ($bulan) use ($performaBulanan) {
        $data = $performaBulanan->get($bulan);
        $rataRata = $data
            ? round((((float) $data->dribbling) + ((float) $data->passing) + ((float) $data->shooting)) / 3, 1)
            : null;

        return [
            'bulan' => $bulan,
            'nama_bulan' => $this->namaBulanIndonesia($bulan),
            'total_nilai' => $rataRata,
        ];
    })->values();

    $performaPerBulan = collect(range(1, 12))->map(function ($bulan) use ($performaBulanan, $tahunDipilih) {
        $data = $performaBulanan->get($bulan);

        if (!$data) {
            return [
                'bulan' => $bulan,
                'nama_bulan' => $this->namaBulanIndonesia($bulan),
                'waktu' => $this->namaBulanIndonesia($bulan) . ' ' . $tahunDipilih,
                'dribbling' => null,
                'passing' => null,
                'shooting' => null,
                'rata_rata' => null,
                'keterangan' => null,
            ];
        }

        $dribbling = round((float) $data->dribbling, 1);
        $passing = round((float) $data->passing, 1);
        $shooting = round((float) $data->shooting, 1);
        $rataRata = round(($dribbling + $passing + $shooting) / 3, 1);

        return [
            'bulan' => $bulan,
            'nama_bulan' => $this->namaBulanIndonesia($bulan),
            'waktu' => $this->namaBulanIndonesia($bulan) . ' ' . $tahunDipilih,
            'dribbling' => $dribbling,
            'passing' => $passing,
            'shooting' => $shooting,
            'rata_rata' => $rataRata,
            'keterangan' => $this->tentukanKeteranganPerforma($rataRata),
        ];
    })->values();

    $catatanPelatih = Catatan_Pelatih::with('pelatih:id_pelatih,nama_pelatih')
        ->where('id_siswa', $siswa->id_siswa)
        ->orderBy('tanggal_catatan', 'desc')
        ->orderBy('id_catatan', 'desc')
        ->get()
        ->map(function ($item) {
            return [
                'id_catatan' => $item->id_catatan,
                'id_pelatih' => $item->id_pelatih,
                'nama_pelatih' => $item->pelatih->nama_pelatih ?? null,
                'catatan' => $item->catatan,
                'tanggal_catatan' => $item->tanggal_catatan,
            ];
        })
        ->values();

   return response()->json([
    'status' => true,
    'message' => 'Data performa siswa berhasil diambil',

    'siswa' => [
        'id_siswa' => $siswa->id_siswa,
        'nama_siswa' => $siswa->nama_siswa,
        'umur' => 'U-' . $siswa->umur,
    ],

    'profil_siswa' => [
        'foto' => $profil?->foto
            ? asset('storage/' . ltrim($profil->foto, '/'))
            : null,
    ],

    'filter' => [
        'tahun' => $tahunDipilih,
        'tahun_options' => $tahunOptions->isNotEmpty()
            ? $tahunOptions
            : collect([(int) now()->year]),
    ],

    'grafik_performa' => $grafikBatang,
    'catatan_pelatih' => $catatanPelatih,
    'performa_per_bulan' => $performaPerBulan,
]);
}

private function tentukanKeteranganPerforma(float $rataRata): string
{
    if ($rataRata >= 85) {
        return 'A';
    }

    if ($rataRata >= 70) {
        return 'B';
    }

    if ($rataRata >= 55) {
        return 'C';
    }

    return 'D';
}

public function prestasiSiswa(Request $request)
{
    $user = Auth::user();
    $idSiswaRequest = $request->id_siswa ?? session('id_siswa');
    $bulanDipilih = (int) ($request->bulan ?? now()->month);
    $tahunSekarang = now()->year;

    if ($bulanDipilih < 1 || $bulanDipilih > 12) {
        return response()->json([
            'status' => false,
            'message' => 'Bulan harus bernilai 1 sampai 12'
        ], 422);
    }

    if ($user->role === 'orang_tua') {
        $ortu = OrangTua::where('user_id', $user->id)->first();

        if (!$ortu) {
            return response()->json([
                'status' => false,
                'message' => 'Data orang tua tidak ditemukan'
            ], 404);
        }

        $siswaQuery = Siswa::where('id_ortu', $ortu->id_ortu);

        if ($idSiswaRequest) {
            $siswaQuery->where('id_siswa', $idSiswaRequest);
        }

        $siswa = $siswaQuery->first(['id_siswa', 'nama_siswa', 'umur']);
    } else {
        $siswa = Siswa::where('user_id', $user->id)
            ->first(['id_siswa', 'nama_siswa', 'umur']);
    }

    if (!$siswa) {
        return response()->json([
            'status' => false,
            'message' => $idSiswaRequest
                ? 'Siswa tidak ditemukan atau tidak terkait dengan akun ini'
                : 'Silakan pilih siswa terlebih dahulu'
        ], 404);
    }

    session(['id_siswa' => $siswa->id_siswa]);

    $achievementYearExpression = $this->datePartExpression('year', 'tanggal_diberikan');

    $tahunOptions = Pencapaian::where('id_siswa', $siswa->id_siswa)
        ->selectRaw("{$achievementYearExpression} as tahun")
        ->whereNotNull('tanggal_diberikan')
        ->distinct()
        ->orderBy('tahun', 'desc')
        ->pluck('tahun')
        ->map(fn ($tahun) => (int) $tahun)
        ->values();

    $tahunDipilih = (int) ($request->tahun ?: ($tahunOptions->first() ?? $tahunSekarang));

    $prestasi = Pencapaian::with('badge:id_badge,nama_badge,deskripsi,icon_badge')
        ->where('id_siswa', $siswa->id_siswa)
        ->whereMonth('tanggal_diberikan', $bulanDipilih)
        ->whereYear('tanggal_diberikan', $tahunDipilih)
        ->orderBy('tanggal_diberikan', 'desc')
        ->orderBy('id_pencapaian', 'desc')
        ->get()
        ->map(function ($item) {
            return [
                'id_pencapaian' => $item->id_pencapaian,
                'id_badge' => $item->id_badge,
                'nama_prestasi' => $item->badge->nama_badge ?? null,
                'deskripsi' => $item->badge->deskripsi ?? null,
                'icon_badge' => $item->badge->icon_badge ?? null,
                'tanggal_diberikan' => $item->tanggal_diberikan,
            ];
        })
        ->values();

    $bulanOptions = collect(range(1, 12))->map(function ($bulan) {
        return [
            'bulan' => $bulan,
            'nama_bulan' => $this->namaBulanIndonesia($bulan),
        ];
    })->values();

    return response()->json([
        'status' => true,
        'message' => 'Data prestasi siswa berhasil diambil',
        'siswa' => [
            'id_siswa' => $siswa->id_siswa,
            'nama_siswa' => $siswa->nama_siswa,
            'umur' => 'U-' . $siswa->umur,
        ],
        'filter' => [
            'bulan' => $bulanDipilih,
            'nama_bulan' => $this->namaBulanIndonesia($bulanDipilih),
            'tahun' => $tahunDipilih,
        ],
        'options' => [
            'bulan' => $bulanOptions,
            'tahun' => $tahunOptions->isNotEmpty()
                ? $tahunOptions
                : collect([(int) $tahunSekarang]),
        ],
        'total_prestasi' => $prestasi->count(),
        'data' => $prestasi,
    ]);
}

public function catatanPelatihSiswa(Request $request)
{
    $user = Auth::user();
    $idSiswaRequest = $request->id_siswa ?? session('id_siswa');
    $bulanDipilih = (int) ($request->bulan ?? now()->month);
    $tahunSekarang = now()->year;

    if ($bulanDipilih < 1 || $bulanDipilih > 12) {
        return response()->json([
            'status' => false,
            'message' => 'Bulan harus bernilai 1 sampai 12'
        ], 422);
    }

    if ($user->role === 'orang_tua') {
        $ortu = OrangTua::where('user_id', $user->id)->first();

        if (!$ortu) {
            return response()->json([
                'status' => false,
                'message' => 'Data orang tua tidak ditemukan'
            ], 404);
        }

        $siswaQuery = Siswa::where('id_ortu', $ortu->id_ortu);

        if ($idSiswaRequest) {
            $siswaQuery->where('id_siswa', $idSiswaRequest);
        }

        $siswa = $siswaQuery->first(['id_siswa', 'nama_siswa', 'umur']);
    } else {
        $siswa = Siswa::where('user_id', $user->id)
            ->first(['id_siswa', 'nama_siswa', 'umur']);
    }

    if (!$siswa) {
        return response()->json([
            'status' => false,
            'message' => $idSiswaRequest
                ? 'Siswa tidak ditemukan atau tidak terkait dengan akun ini'
                : 'Silakan pilih siswa terlebih dahulu'
        ], 404);
    }

    session(['id_siswa' => $siswa->id_siswa]);

    $noteYearExpression = $this->datePartExpression('year', 'tanggal_catatan');

    $tahunOptions = Catatan_Pelatih::where('id_siswa', $siswa->id_siswa)
        ->selectRaw("{$noteYearExpression} as tahun")
        ->whereNotNull('tanggal_catatan')
        ->distinct()
        ->orderBy('tahun', 'desc')
        ->pluck('tahun')
        ->map(fn ($tahun) => (int) $tahun)
        ->values();

    $tahunDipilih = (int) ($request->tahun ?: ($tahunOptions->first() ?? $tahunSekarang));

    $catatan = Catatan_Pelatih::with('pelatih:id_pelatih,nama_pelatih')
        ->where('id_siswa', $siswa->id_siswa)
        ->whereMonth('tanggal_catatan', $bulanDipilih)
        ->whereYear('tanggal_catatan', $tahunDipilih)
        ->orderBy('tanggal_catatan', 'desc')
        ->orderBy('id_catatan', 'desc')
        ->get()
        ->map(function ($item) {
            return [
                'id_catatan' => $item->id_catatan,
                'id_pelatih' => $item->id_pelatih,
                'nama_pelatih' => $item->pelatih->nama_pelatih ?? null,
                'catatan' => $item->catatan,
                'tanggal_catatan' => $item->tanggal_catatan,
            ];
        })
        ->values();

    $bulanOptions = collect(range(1, 12))->map(function ($bulan) {
        return [
            'bulan' => $bulan,
            'nama_bulan' => $this->namaBulanIndonesia($bulan),
        ];
    })->values();

    return response()->json([
        'status' => true,
        'message' => 'Data catatan pelatih siswa berhasil diambil',
        'siswa' => [
            'id_siswa' => $siswa->id_siswa,
            'nama_siswa' => $siswa->nama_siswa,
            'umur' => 'U-' . $siswa->umur,
        ],
        'filter' => [
            'bulan' => $bulanDipilih,
            'nama_bulan' => $this->namaBulanIndonesia($bulanDipilih),
            'tahun' => $tahunDipilih,
        ],
        'options' => [
            'bulan' => $bulanOptions,
            'tahun' => $tahunOptions->isNotEmpty()
                ? $tahunOptions
                : collect([(int) $tahunSekarang]),
        ],
        'total_catatan' => $catatan->count(),
        'data' => $catatan,
    ]);
}

public function historyPembayaranSiswa(Request $request)
{
    $user = Auth::user();
    $idSiswaRequest = $request->id_siswa ?? session('id_siswa');

    if ($user->role === 'orang_tua') {
        $ortu = OrangTua::where('user_id', $user->id)->first();

        if (!$ortu) {
            return response()->json([
                'status' => false,
                'message' => 'Data orang tua tidak ditemukan'
            ], 404);
        }

        $siswaQuery = Siswa::where('id_ortu', $ortu->id_ortu);

        if ($idSiswaRequest) {
            $siswaQuery->where('id_siswa', $idSiswaRequest);
        }

        $siswa = $siswaQuery->first(['id_siswa', 'nama_siswa', 'umur', 'status']);
    } else {
        $siswa = Siswa::where('user_id', $user->id)
            ->first(['id_siswa', 'nama_siswa', 'umur', 'status']);
    }

    if (!$siswa) {
        return response()->json([
            'status' => false,
            'message' => $idSiswaRequest
                ? 'Siswa tidak ditemukan atau tidak terkait dengan akun ini'
                : 'Silakan pilih siswa terlebih dahulu'
        ], 404);
    }

    session(['id_siswa' => $siswa->id_siswa]);

    $query = Pembayaran::where('id_siswa', $siswa->id_siswa);

    if ($request->filled('jenis')) {
        $query->where('jenis', $request->jenis);
    }

    if ($request->filled('status')) {
        $query->where('status', $request->status);
    }

    $pembayaran = $query
        ->orderByRaw('CASE WHEN tanggal_bayar IS NULL THEN 0 ELSE 1 END ASC')
        ->orderBy('id_pembayaran', 'desc')
        ->get();

    $buktiPembayaran = BuktiPembayaran::where('id_siswa', $siswa->id_siswa)
        ->whereIn('id_pembayaran', $pembayaran->pluck('id_pembayaran'))
        ->orderBy('tanggal_bukti_bayar', 'desc')
        ->orderBy('id_bukti_pembayaran', 'desc')
        ->get()
        ->groupBy('id_pembayaran');

    $data = $pembayaran->map(function ($item) use ($buktiPembayaran) {
        $buktiTerakhir = optional($buktiPembayaran->get($item->id_pembayaran))->first();

        return [
            'id_pembayaran' => $item->id_pembayaran,
            'jenis' => $item->jenis,
            'periode' => $item->periode,
            'jumlah' => $item->jumlah,
            'status_pembayaran' => $item->status,
            'tanggal_bayar' => $item->tanggal_bayar,
            'status_bukti' => $buktiTerakhir->status ?? null,
            'tanggal_bukti_bayar' => $buktiTerakhir->tanggal_bukti_bayar ?? null,
            'bukti_bayar' => $buktiTerakhir->bukti_bayar ?? null,
        ];
    })->values();

    $summaryBukti = BuktiPembayaran::where('id_siswa', $siswa->id_siswa);

    return response()->json([
        'status' => true,
        'message' => 'History pembayaran siswa berhasil diambil',
        'siswa' => [
            'id_siswa' => $siswa->id_siswa,
            'nama_siswa' => $siswa->nama_siswa,
            'umur' => 'U-' . $siswa->umur,
            'status' => $siswa->status,
        ],
        'filters' => [
            'jenis' => $request->jenis,
            'status' => $request->status,
        ],
        'summary' => [
            'total_tagihan' => $data->count(),
            'belum_lunas' => $data->where('status_pembayaran', 'Belum')->count(),
            'lunas' => $data->where('status_pembayaran', 'Lunas')->count(),
            'pending' => (clone $summaryBukti)->where('status', 'Menunggu validasi')->count(),
            'diterima' => (clone $summaryBukti)->where('status', 'diterima')->count(),
            'ditolak' => (clone $summaryBukti)->where('status', 'ditolak')->count(),
        ],
        'data' => $data,
    ]);
}

private function notifyAdmins(string $judul, string $isi): void
{
    $notif = Notifikasi::create([
        'judul' => $judul,
        'isi' => $isi,
        'target_role' => 'admin',
        'tanggal_kirim' => now(),
    ]);

    DB::table('admin')
        ->join('users', 'admin.user_id', '=', 'users.id')
        ->whereRaw('LOWER(TRIM(users.role)) = ?', ['admin'])
        ->select('admin.id_admin', 'users.id as user_id')
        ->orderBy('admin.id_admin')
        ->get()
        ->each(function ($admin) use ($notif) {
            DB::table('notifikasi_terkirim')->insert([
                'id_notifikasi' => $notif->id_notifikasi,
                'user_id' => $admin->user_id,
                'id_siswa' => null,
                'id_admin' => $admin->id_admin,
                'id_pelatih' => null,
                'status_baca' => 'Belum Dibaca',
                'tanggal_baca' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });
}



}
