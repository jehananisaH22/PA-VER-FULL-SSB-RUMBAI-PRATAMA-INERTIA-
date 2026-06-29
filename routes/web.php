<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\MenuUtamaController;
use App\Http\Controllers\WebPageController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;


Route::get('/', [MenuUtamaController::class, 'index']);
Route::get('/berita', [MenuUtamaController::class, 'berita']);
Route::get('/galeri', [MenuUtamaController::class, 'galeri']);


Route::post('/logout', function (Request $request) {
    $loginPath = match (Auth::user()?->role) {
        'admin' => '/login/admin',
        'pelatih' => '/login/pelatih',
        'orang_tua' => '/login/orangtua',
        default => '/login',
    };

    Auth::logout();

    $request->session()->invalidate();
    $request->session()->regenerateToken();

    return redirect($loginPath);
})->middleware('web');

Route::get('/register', [WebPageController::class, 'register']);
Route::get('/register/verify-notice', [WebPageController::class, 'verifyNotice']);
Route::get('/verify-email', [AuthController::class, 'verifyEmail']);
Route::get('/register/form', [WebPageController::class, 'registrationForm']);
Route::get('/register/payment-proof', [WebPageController::class, 'paymentProof']);

Route::get('/password/forgot', [WebPageController::class, 'forgotPassword']);
Route::get('/password/reset', [WebPageController::class, 'resetPassword']);
Route::get('/profile/{role?}', [WebPageController::class, 'profile']);

Route::get('/login/role', fn () => redirect('/login'));
Route::get('/login/{role?}', [WebPageController::class, 'login'])->name('login');

Route::middleware('auth')->group(function () {
    Route::middleware('role:admin')->group(function () {
        Route::get('/admin', fn () => redirect('/admin/dashboard'));
        Route::get('/admin-dashboard', fn () => redirect('/admin/dashboard'));
        Route::get('/admin/siswa/{id_siswa}/profil', [AdminController::class, 'Profil_Siswa_Admin']);
        Route::get('/admin/dashboard/{section?}', [DashboardController::class, 'adminSection']);
    });

    Route::middleware('role:orang_tua')->group(function () {
        Route::get('/orang-tua', fn () => redirect('/orang-tua/dashboard'));
        Route::get('/parent-dashboard', fn () => redirect('/orang-tua/dashboard'));
        Route::get('/parent-attendance', fn () => redirect('/orang-tua/kehadiran'));
        Route::get('/parent-performance', fn () => redirect('/orang-tua/performa'));
        Route::get('/parent-achievements', fn () => redirect('/orang-tua/prestasi'));
        Route::get('/parent-coach-notes', fn () => redirect('/orang-tua/catatan-pelatih'));
        Route::get('/parent-payments', fn () => redirect('/orang-tua/pembayaran'));
        Route::get('/parent-reupload', fn () => redirect('/orang-tua/upload-ulang'));
        Route::get('/orang-tua/daftar-anak', function () {
            return inertia('HalamanFormPendaftaran', [
                'returnToDashboard' => true,
                'dashboardUrl' => '/orang-tua/dashboard',
            ]);
        });
        Route::get('/orang-tua/{section?}', [DashboardController::class, 'parentSection']);

        
    });

    Route::middleware('role:pelatih')->group(function () {
        Route::get('/pelatih', fn () => redirect('/pelatih/dashboard'));
        Route::get('/coach-dashboard', fn () => redirect('/pelatih/dashboard'));
        Route::get('/coach-attendance', fn () => redirect('/pelatih/kehadiran'));
        Route::get('/coach-performance', fn () => redirect('/pelatih/performa'));
        Route::get('/coach-notes', fn () => redirect('/pelatih/catatan'));
        Route::get('/coach-payments', fn () => redirect('/pelatih/pembayaran'));
        Route::get('/pelatih/{section?}', [DashboardController::class, 'coachSection']);
    });
});

Route::fallback(fn () => redirect('/'));
