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
    Route::get('/verify-email', [AuthController::class, 'verifyEmail']);
    Route::get('/verification-status', [AuthController::class, 'verificationStatus']);
    Route::get('/csrf-token', fn () => response()->json(['csrfToken' => csrf_token()]));

    Route::get('/menu-utama', [MenuUtamaController::class, 'index']);
    Route::get('/menu-utama/instagram', [MenuUtamaController::class, 'instagram']);

    Route::middleware('auth')->group(function () {
        Route::get('/user', fn (Request $request) => $request->user());
        Route::get('/landing', [AuthController::class, 'landingPage']);

        Route::middleware('role:orang_tua')->group(function () {
            Route::get('/registrasi-siswa', [SiswaController::class, 'registrasi_siswa']);
            Route::post('/daftar-siswa', [SiswaController::class, 'daftar_siswa']);
        });

        Route::prefix('anak')->middleware('role:orang_tua')->group(function () {
            Route::get('/', [SiswaController::class, 'getanak']);
            Route::post('/pilih', [SiswaController::class, 'setAnak']);
        });

        Route::prefix('siswa')->middleware('role:orang_tua')->group(function () {
            Route::get('/dashboard', [DashboardController::class, 'siswaDashboard']);
            Route::get('/kehadiran', [SiswaController::class, 'kehadiranSiswa']);
            Route::get('/performa', [SiswaController::class, 'performaSiswa']);
            Route::get('/prestasi', [SiswaController::class, 'prestasiSiswa']);
            Route::get('/catatan-pelatih', [SiswaController::class, 'catatanPelatihSiswa']);
            Route::get('/histori-pembayaran', [SiswaController::class, 'historyPembayaranSiswa']);
            Route::get('/revisi-pendaftaran/{id_siswa}', [SiswaController::class, 'revisi_pendaftaran']);
            Route::post('/update-pendaftaran/{id_siswa}', [SiswaController::class, 'update_pendaftaran']);
            Route::get('/upload-bukti/{id_pembayaran}/{id_siswa}', [SiswaController::class, 'Upload_Bukti_Pembayaran']);
            Route::post('/upload-bukti/{id_pembayaran}', [SiswaController::class, 'Store_Bukti_Pembayaran']);
            Route::post('/upload-bukti-pendaftaran', [SiswaController::class, 'Store_Bukti_Pendaftaran']);
            Route::post('/profil/{id_siswa}', [SiswaController::class, 'updateProfilSiswaMandiri']);
        });

        Route::prefix('admin')->middleware('role:admin')->group(function () {
            Route::get('/dashboard', [DashboardController::class, 'adminDashboard']);
            Route::get('/activity-history', [AdminController::class, 'HistoryAktivitasAdmin']);
            Route::post('/activity-history', [AdminController::class, 'StoreAktivitasAdmin']);

            Route::get('/pendaftaran-siswa', [AdminController::class, 'Admin_Pendaftaran_siswa']);
            Route::get('/file-pendaftaran-siswa/{folder}/{filename}', [AdminController::class, 'lihatfilePendaftaran']);
            Route::get('/pendaftaran/{id}', [AdminController::class, 'Admin_validasi_Pendaftaran_siswa']);
            Route::post('/pendaftaran/{id}/validasi', [AdminController::class, 'submitValidasi']);
            Route::get('/pembayaran-admin', [AdminController::class, 'pembayaran_admin']);
            Route::get('/bukti-pembayaran-admin/{id_siswa}', [AdminController::class, 'buktipembayaran_admin']);
            Route::get('/lihat-bukti/{folder}/{file}', [AdminController::class, 'lihatBukti_pembayaran_admin'])
                ->withoutMiddleware('role:admin')
                ->middleware('role:admin,pelatih');
            Route::post('/bukti/diterima/{id}', [AdminController::class, 'Bukti_Diterima']);
            Route::post('/bukti/ditolak/{id}', [AdminController::class, 'Bukti_Ditolak']);
            Route::get('/history-pembayaran', [AdminController::class, 'history_pembayaran']);

            Route::get('/data-siswa', [AdminController::class, 'Data_Siswa']);
            Route::post('/siswa/{id_siswa}/profil', [AdminController::class, 'Update_Profil_Siswa']);
            Route::delete('/siswa/{id_siswa}', [AdminController::class, 'Hapus_Siswa']);
            Route::get('/performa-siswa/{id_siswa}', [AdminController::class, 'performaperSiswa']);
            Route::get('/kehadiran-siswa/{id_siswa}', [AdminController::class, 'Rekap_Absensi_PerSiswa']);

            Route::get('/data-pelatih', [AdminController::class, 'Data_Pelatih']);
            Route::post('/tambah-pelatih', [AdminController::class, 'Tambah_Pelatih']);
            Route::put('/edit-pelatih/{id}', [AdminController::class, 'Update_Pelatih']);
            Route::delete('/hapus-pelatih/{id}', [AdminController::class, 'Hapus_Pelatih']);

            Route::get('/jadwal-latihan', [AdminController::class, 'Jadwallatihan_Siswa']);
            Route::get('/jadwal-latihan/{id}', [AdminController::class, 'JadwalperPelatih']);
            Route::post('/tambah-jadwal', [AdminController::class, 'Tambah_Jadwal']);
            Route::put('/jadwal-latihan/{id}', [AdminController::class, 'Update_Jadwal']);
            Route::delete('/jadwal-latihan/{id}', [AdminController::class, 'Hapus_Jadwal']);

            Route::get('/media-promosi', [AdminController::class, 'MediaPromosiAdmin']);
            Route::get('/media-promosi/{id}', [AdminController::class, 'DetailMediaPromosi']);
            Route::post('/tambah_media-promosi', [AdminController::class, 'TambahMediaPromosi']);
            Route::post('/media-promosi/{id}', [AdminController::class, 'UpdateMediaPromosi']);
            Route::delete('/media-promosi/{id}', [AdminController::class, 'HapusMediaPromosi']);
            Route::post('/media-promosi/group/{group_id}', [AdminController::class, 'UpdateMediaPromosiByGroup']);
            Route::delete('/media-promosi/group/{group_id}', [AdminController::class, 'HapusMediaPromosiByGroup']);

            Route::get('/prestasi/form', [AdminController::class, 'FormPrestasiAdmin']);
            Route::post('/prestasi/tambah-prestasi', [AdminController::class, 'StorePrestasiAdmin']);
            Route::get('/prestasi/histori', [AdminController::class, 'HistoryPrestasiAdmin']);
        });

        Route::prefix('notifikasi')->group(function () {
            Route::get('/', [NotifikasiController::class, 'getNotifikasi']);
            Route::post('/kirim', [NotifikasiController::class, 'kirimNotif'])->middleware('role:admin,pelatih');
            Route::post('/baca/{id}', [NotifikasiController::class, 'tandaiBaca']);
        });

        Route::prefix('pelatih')->middleware('role:pelatih')->group(function () {
            Route::get('/dashboard', [DashboardController::class, 'pelatihDashboard']);

            Route::get('/presensi', [PelatihController::class, 'kehadiran']);
            Route::post('/presensi/input', [PelatihController::class, 'Input_Presensi']);
            Route::get('/presensi/rekap', [PelatihController::class, 'Rekap_Absensi']);

            Route::get('/performa-siswa/{id}', [PelatihController::class, 'Performa_Siswa']);
            Route::post('/performa-siswa/input/{id}', [PelatihController::class, 'Input_Performa_Siswa']);
            Route::put('/performa-siswa/update/{id}', [PelatihController::class, 'Update_Performa_Siswa']);

            Route::get('/catatan-pelatih', [PelatihController::class, 'Catatan_Pelatih']);
            Route::get('/catatan-pelatih/{id}', [PelatihController::class, 'Catatan_perPelatih']);
            Route::post('/catatan-pelatih/tambah', [PelatihController::class, 'Tambah_Catatan_Pelatih']);
            Route::put('/catatan-pelatih/update/{id}', [PelatihController::class, 'Update_Catatan_Pelatih']);
            Route::delete('/catatan-pelatih/hapus/{id}', [PelatihController::class, 'Hapus_Catatan_Pelatih']);

            Route::get('/bukti-pembayaran/form', [PelatihController::class, 'FormUploadBuktiPembayaran']);
            Route::post('/bukti-pembayaran/tambah', [PelatihController::class, 'Store_Bukti_Pembayaran_Pelatih']);
            Route::get('/bukti-pembayaran/histori', [PelatihController::class, 'History_Bukti_Pembayaran_Pelatih']);
            Route::delete('/bukti-pembayaran/{id}', [PelatihController::class, 'Hapus_Bukti_Pembayaran_Pelatih']);
        });
    });
});
