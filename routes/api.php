<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\MenuUtamaController;
use App\Http\Controllers\NotifikasiController;
use App\Http\Controllers\PelatihController;
use App\Http\Controllers\SiswaController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;



Route::middleware('web')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
    Route::get('/verify-email', [AuthController::class, 'verifyEmail']); // tidak dipakai di frontend React; dipakai dari link verifikasi email
    Route::get('/verification-status', [AuthController::class, 'verificationStatus']);
    Route::get('/csrf-token', fn () => response()->json(['csrfToken' => csrf_token()]));

    Route::get('/menu-utama', [MenuUtamaController::class, 'index']); // tidak dipakai di frontend React; diganti dengan route web
    Route::get('/menu-utama/instagram', [MenuUtamaController::class, 'instagram']); // tidak dipakai di frontend React; diganti dengan route web

    Route::middleware('auth')->group(function () {
        Route::get('/user', fn (Request $request) => $request->user()); // tidak dipakai di frontend React; diganti dengan route web
        Route::get('/landing', [AuthController::class, 'landingPage']); // tidak dipakai di frontend React; diganti dengan route web

        Route::middleware('role:orang_tua')->group(function () {
            Route::get('/registrasi-siswa', [SiswaController::class, 'registrasi_siswa']); // tidak dipakai di frontend React
            Route::post('/daftar-siswa', [SiswaController::class, 'daftar_siswa']);
        });

        Route::prefix('anak')->middleware('role:orang_tua')->group(function () {
            Route::get('/', [SiswaController::class, 'getanak']);
            Route::post('/pilih', [SiswaController::class, 'setAnak']);
        });

        Route::prefix('siswa')->middleware('role:orang_tua')->group(function () {
            Route::get('/dashboard', [DashboardController::class, 'siswaDashboard']); // tidak dipakai di frontend React; diganti dengan route web
            Route::get('/kehadiran', [SiswaController::class, 'kehadiranSiswa']); // tidak dipakai di frontend React; diganti dengan route web
            Route::get('/performa', [SiswaController::class, 'performaSiswa']); // tidak dipakai di frontend React; diganti dengan route web
            Route::get('/prestasi', [SiswaController::class, 'prestasiSiswa']); // tidak dipakai di frontend React; diganti dengan route web
            Route::get('/catatan-pelatih', [SiswaController::class, 'catatanPelatihSiswa']); // tidak dipakai di frontend React; diganti dengan route web
            Route::get('/histori-pembayaran', [SiswaController::class, 'historyPembayaranSiswa']); // tidak dipakai di frontend React; diganti dengan route web
            Route::get('/revisi-pendaftaran/{id_siswa}', [SiswaController::class, 'revisi_pendaftaran']); // tidak dipakai di frontend React; diganti dengan route web
            Route::post('/update-pendaftaran/{id_siswa}', [SiswaController::class, 'update_pendaftaran']);
            Route::get('/upload-bukti/{id_pembayaran}/{id_siswa}', [SiswaController::class, 'Upload_Bukti_Pembayaran']); // tidak dipakai di frontend React
            Route::post('/upload-bukti/{id_pembayaran}', [SiswaController::class, 'Store_Bukti_Pembayaran']); // tidak dipakai di frontend React; diganti upload-bukti-pendaftaran atau upload dari pelatih
            Route::post('/upload-bukti-pendaftaran', [SiswaController::class, 'Store_Bukti_Pendaftaran']);
            Route::post('/profil/{id_siswa}', [SiswaController::class, 'updateProfilSiswaMandiri']);
        });

        Route::prefix('admin')->middleware('role:admin')->group(function () {
            Route::get('/dashboard', [DashboardController::class, 'adminDashboard']); // tidak dipakai di frontend React; diganti dengan route web
            Route::get('/activity-history', [AdminController::class, 'HistoryAktivitasAdmin']);
            Route::post('/activity-history', [AdminController::class, 'StoreAktivitasAdmin']);

            Route::get('/pendaftaran-siswa', [AdminController::class, 'Admin_Pendaftaran_siswa']); // tidak dipakai di frontend React; diganti dengan route web
            Route::get('/file-pendaftaran-siswa/{folder}/{filename}', [AdminController::class, 'lihatfilePendaftaran']); // dipakai tidak langsung untuk preview file dari data Inertia
            Route::get('/pendaftaran/{id}', [AdminController::class, 'Admin_validasi_Pendaftaran_siswa']); // tidak dipakai di frontend React; diganti dengan route web
            Route::post('/pendaftaran/{id}/validasi', [AdminController::class, 'submitValidasi']);
            Route::get('/pembayaran-admin', [AdminController::class, 'pembayaran_admin']); // tidak dipakai di frontend React; diganti dengan route web
            Route::get('/bukti-pembayaran-admin/{id_siswa}', [AdminController::class, 'buktipembayaran_admin']); // tidak dipakai di frontend React
            Route::get('/lihat-bukti/{folder}/{file}', [AdminController::class, 'lihatBukti_pembayaran_admin']) // dipakai tidak langsung untuk preview bukti pembayaran dari data Inertia
                ->withoutMiddleware('role:admin')
                ->middleware('role:admin,pelatih');
            Route::post('/bukti/diterima/{id}', [AdminController::class, 'Bukti_Diterima']);
            Route::post('/bukti/ditolak/{id}', [AdminController::class, 'Bukti_Ditolak']);
            Route::get('/history-pembayaran', [AdminController::class, 'history_pembayaran']); // tidak dipakai di frontend React; diganti dengan route web

            Route::get('/data-siswa', [AdminController::class, 'Data_Siswa']); // tidak dipakai di frontend React; diganti dengan route web
            Route::post('/siswa/{id_siswa}/profil', [AdminController::class, 'Update_Profil_Siswa']);
            Route::delete('/siswa/{id_siswa}', [AdminController::class, 'Hapus_Siswa']);
            Route::get('/performa-siswa/{id_siswa}', [AdminController::class, 'performaperSiswa']); // tidak dipakai di frontend React
            Route::get('/kehadiran-siswa/{id_siswa}', [AdminController::class, 'Rekap_Absensi_PerSiswa']); // tidak dipakai di frontend React

            Route::get('/data-pelatih', [AdminController::class, 'Data_Pelatih']); // tidak dipakai di frontend React; diganti dengan route web
            Route::post('/tambah-pelatih', [AdminController::class, 'Tambah_Pelatih']);
            Route::put('/edit-pelatih/{id}', [AdminController::class, 'Update_Pelatih']); // tidak dipakai di frontend React; tampilan sekarang tidak ada edit data pelatih
            Route::delete('/hapus-pelatih/{id}', [AdminController::class, 'Hapus_Pelatih']);

            Route::get('/jadwal-latihan', [AdminController::class, 'Jadwallatihan_Siswa']); // tidak dipakai di frontend React; data jadwal dikirim lewat route web
            Route::get('/jadwal-latihan/{id}', [AdminController::class, 'JadwalperPelatih']); // tidak dipakai di frontend React
            Route::post('/tambah-jadwal', [AdminController::class, 'Tambah_Jadwal']);
            Route::put('/jadwal-latihan/{id}', [AdminController::class, 'Update_Jadwal']);
            Route::delete('/jadwal-latihan/{id}', [AdminController::class, 'Hapus_Jadwal']);

            Route::get('/media-promosi', [AdminController::class, 'MediaPromosiAdmin']); // tidak dipakai di frontend React; diganti dengan route web
            Route::post('/tambah_media-promosi', [AdminController::class, 'TambahMediaPromosi']);
            Route::post('/media-promosi/{id}', [AdminController::class, 'UpdateMediaPromosi']);
            Route::delete('/media-promosi/{id}', [AdminController::class, 'HapusMediaPromosi']);
            Route::post('/media-promosi/group/{group_id}', [AdminController::class, 'UpdateMediaPromosiByGroup']); // tidak dipakai di frontend React; sudah digabung di UpdateMediaPromosi
            Route::delete('/media-promosi/group/{group_id}', [AdminController::class, 'HapusMediaPromosiByGroup']);

            Route::get('/prestasi/form', [AdminController::class, 'FormPrestasiAdmin']); // tidak dipakai di frontend React; diganti dengan route web
            Route::post('/prestasi/tambah-prestasi', [AdminController::class, 'StorePrestasiAdmin']);
            Route::get('/prestasi/histori', [AdminController::class, 'HistoryPrestasiAdmin']); // tidak dipakai di frontend React; diganti dengan route web
            Route::put('/prestasi/{id}', [AdminController::class, 'UpdatePrestasiAdmin']);
            Route::delete('/prestasi/{id}', [AdminController::class, 'HapusPrestasiAdmin']);
        });

        Route::prefix('notifikasi')->group(function () {
            Route::get('/', [NotifikasiController::class, 'getNotifikasi']); // tidak dipakai di frontend React; notifikasi dikirim dari data Inertia
            Route::post('/kirim', [NotifikasiController::class, 'kirimNotif'])->middleware('role:admin,pelatih');
            Route::post('/baca/{id}', [NotifikasiController::class, 'tandaiBaca']);
        });

        Route::prefix('pelatih')->middleware('role:pelatih')->group(function () {
            Route::get('/dashboard', [DashboardController::class, 'pelatihDashboard']); // tidak dipakai di frontend React; diganti dengan route web

            Route::get('/presensi', [PelatihController::class, 'kehadiran']); // tidak dipakai di frontend React; diganti dengan route web
            Route::post('/presensi/input', [PelatihController::class, 'Input_Presensi']);
            Route::get('/presensi/rekap', [PelatihController::class, 'Rekap_Absensi']); // tidak dipakai di frontend React; diganti dengan route web

            Route::get('/performa-siswa/{id}', [PelatihController::class, 'Performa_Siswa']); // tidak dipakai di frontend React
            Route::post('/performa-siswa/input/{id}', [PelatihController::class, 'Input_Performa_Siswa']);
            Route::put('/performa-siswa/update/{id}', [PelatihController::class, 'Update_Performa_Siswa']); // tidak dipakai langsung di frontend React; method hanya meneruskan ke Input_Performa_Siswa

            Route::get('/catatan-pelatih', [PelatihController::class, 'Catatan_Pelatih']); // tidak dipakai di frontend React; data dikirim lewat route web
            Route::post('/catatan-pelatih/tambah', [PelatihController::class, 'Tambah_Catatan_Pelatih']);
            Route::put('/catatan-pelatih/update/{id}', [PelatihController::class, 'Update_Catatan_Pelatih']); // tidak dipakai di frontend React; tampilan sekarang tidak ada edit catatan
            Route::delete('/catatan-pelatih/hapus/{id}', [PelatihController::class, 'Hapus_Catatan_Pelatih']);

            Route::get('/bukti-pembayaran/form', [PelatihController::class, 'FormUploadBuktiPembayaran']); // tidak dipakai di frontend React; data form dikirim lewat route web
            Route::post('/bukti-pembayaran/tambah', [PelatihController::class, 'Store_Bukti_Pembayaran_Pelatih']);
            Route::get('/bukti-pembayaran/histori', [PelatihController::class, 'History_Bukti_Pembayaran_Pelatih']); // tidak dipakai di frontend React; data histori dikirim lewat route web
            Route::delete('/bukti-pembayaran/{id}', [PelatihController::class, 'Hapus_Bukti_Pembayaran_Pelatih']);
        });
    });
});
