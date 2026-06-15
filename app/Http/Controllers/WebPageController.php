<?php

namespace App\Http\Controllers;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class WebPageController extends Controller
{
    public function register()
    {
        return Inertia::render('Daftar');
    }

    public function verifyNotice(Request $request)
    {
        $account = $request->session()->get('registration.account');
        $userId = $account['userId'] ?? null;
        $email = strtolower(trim((string) ($account['email'] ?? '')));
        $verificationLink = $account['verificationLink'] ?? '';

        if (! $verificationLink && $email !== '') {
            $user = User::query()
                ->when($userId, fn ($query) => $query->where('id', $userId))
                ->when(! $userId, fn ($query) => $query->whereRaw('LOWER(email) = ?', [$email])->orderByDesc('id'))
                ->whereNotNull('verification_token')
                ->first();

            if ($user) {
                $verificationLink = url('/verify-email?token=' . $user->verification_token . '&email=' . urlencode($user->email));
            }
        }

        return Inertia::render('Auth/VerifikasiEmail', [
            'email' => $email,
            'verificationLink' => $verificationLink,
        ]);
    }

    public function registrationForm(Request $request)
    {
        $this->restoreVerifiedRegistrationUser($request);

        $user = Auth::user();
        $isAddingChildFromRegistration = $request->session()->has('registration.account');

        if ($user && $user->role === 'orang_tua') {
            $parentIds = DB::table('orang_tua')
                ->where(function ($query) use ($user) {
                    $query->where('user_id', $user->id)
                        ->orWhereRaw('LOWER(email) = ?', [strtolower($user->email)]);
                })
                ->pluck('id_ortu')
                ->filter()
                ->unique()
                ->values();

            $hasChild = DB::table('siswa')
                ->where(function ($query) use ($user, $parentIds) {
                    $query->where('user_id', $user->id);

                    if ($parentIds->isNotEmpty()) {
                        $query->orWhereIn('id_ortu', $parentIds);
                    }
                })
                ->exists();

            if ($hasChild && ! $isAddingChildFromRegistration) {
                $request->session()->forget([
                    'registration.form',
                    'registration.account',
                    'id_siswa',
                ]);
                $request->session()->put('show_child_picker_after_login', true);

                return redirect('/orang-tua/dashboard');
            }
        }

        return Inertia::render('HalamanFormPendaftaran', [
            'registrationAccount' => $request->session()->get('registration.account'),
            'registrationFormDraft' => $request->session()->get('registration.form'),
        ]);
    }

    public function paymentProof(Request $request)
    {
        $this->restoreVerifiedRegistrationUser($request);

        $paymentWasSubmitted = (bool) $request->session()->get('registrationPaymentSuccess', false);
        $account = $request->session()->get('registration.account');
        $form = $request->session()->get('registration.form');
        $studentId = $form['studentId'] ?? null;

        if (! $paymentWasSubmitted && Auth::check() && Auth::user()->role === 'orang_tua') {
            if (! $studentId) {
                return redirect('/orang-tua/dashboard');
            }

            $hasSubmittedProof = DB::table('bukti_pembayaran')
                ->join('pembayaran', 'bukti_pembayaran.id_pembayaran', '=', 'pembayaran.id_pembayaran')
                ->where('bukti_pembayaran.id_siswa', $studentId)
                ->where('pembayaran.jenis', 'Pendaftaran')
                ->whereIn('bukti_pembayaran.status', ['Menunggu validasi', 'diterima'])
                ->exists();

            if ($hasSubmittedProof) {
                $request->session()->forget([
                    'registration.form',
                    'registration.account',
                    'id_siswa',
                    'show_child_picker_after_login',
                ]);
                Auth::logout();

                $request->session()->flash('registrationPaymentSuccess', true);
            }
        }

        return Inertia::render('HalamanBuktiPembayaranPendaftaran', [
            'paymentDraft' => [
                'childName' => $form['childName'] ?? $form['formValues']['childName'] ?? '',
                'parentName' => $account['name'] ?? '',
                'email' => $account['email'] ?? '',
                'registrationYear' => $form['registrationYear'] ?? now()->year,
                'studentId' => $form['studentId'] ?? null,
                'registrationId' => $form['registrationId'] ?? null,
            ],
        ]);
    }

    public function resetPassword(Request $request)
    {
        $email = strtolower(trim((string) $request->query('email', '')));
        $token = trim((string) $request->query('token', ''));

        if ($email !== '' && $token !== '') {
            $request->session()->put('password_reset_context', [
                'email' => $email,
                'token' => $token,
                'opened_at' => now()->timestamp,
            ]);
        }

        return Inertia::render('Auth/ResetPassword', [
            'initialEmail' => $email,
            'token' => $token,
        ]);
    }

    public function forgotPassword(Request $request)
    {
        return Inertia::render('Auth/ResetPassword', [
            'initialEmail' => $request->query('email', ''),
            'token' => '',
            'mode' => 'forgot',
        ]);
    }

    public function login(?string $role = null)
    {
        $allowedRoles = ['orangtua', 'pelatih', 'admin'];

        abort_if($role !== null && ! in_array($role, $allowedRoles, true), 404);

        return Inertia::render('Auth/RoleLogin', [
            'role' => $role,
            'initialEmail' => request()->query('email', ''),
            'switchChildId' => request()->query('switch_child_id'),
        ]);
    }

    private function restoreVerifiedRegistrationUser(Request $request): void
    {
        if (Auth::check()) {
            return;
        }

        $account = $request->session()->get('registration.account', []);
        $userId = $account['userId'] ?? null;
        $email = strtolower(trim((string) ($account['email'] ?? '')));

        if (! $userId || $email === '') {
            return;
        }

        $user = User::query()
            ->where('id', $userId)
            ->where('role', 'orang_tua')
            ->whereRaw('LOWER(email) = ?', [$email])
            ->whereNotNull('email_verified_at')
            ->first();

        if (! $user) {
            return;
        }

        Auth::login($user);
        $request->session()->regenerate();
    }

    public function profile(?string $role = null)
    {
        $role = $role ?: 'orangtua';

        $roleAliases = [
            'orangtua' => ['orangtua', 'orang_tua'],
            'pelatih' => ['pelatih'],
            'admin' => ['admin'],
        ];

        abort_unless(array_key_exists($role, $roleAliases), 404);

        $user = Auth::user();
        if (! $user || ! in_array($user->role, $roleAliases[$role], true)) {
            $user = User::query()->whereIn('role', $roleAliases[$role])->first();
        }

        $parentRows = $role === 'orangtua' && $user
            ? DB::table('orang_tua')
                ->where(function ($query) use ($user) {
                    $query->where('user_id', $user->id)
                        ->orWhereRaw('LOWER(email) = ?', [strtolower($user->email)]);
                })
                ->orderByDesc('user_id')
                ->get()
            : collect();
        $parent = $parentRows->first();
        $parentIds = $parentRows->pluck('id_ortu')->filter()->unique()->values();
        $selectedStudentId = $role === 'orangtua' && session('id_siswa')
            ? (int) session('id_siswa')
            : null;
        $children = $parentIds->isNotEmpty()
            ? DB::table('siswa')
                ->leftJoin('profil_siswa', 'siswa.id_siswa', '=', 'profil_siswa.id_siswa')
                ->whereIn('siswa.id_ortu', $parentIds)
                ->when($selectedStudentId, function ($query) use ($selectedStudentId) {
                    $query->where('siswa.id_siswa', $selectedStudentId);
                })
                ->orderBy('siswa.nama_siswa')
                ->select(
                    'siswa.nama_siswa',
                    'siswa.id_siswa',
                    'siswa.nik',
                    'siswa.no_kk',
                    'siswa.nisn',
                    'siswa.tempat_lahir',
                    'siswa.tanggal_lahir',
                    'siswa.umur',
                    'profil_siswa.alamat',
                    'profil_siswa.tinggi_badan',
                    'profil_siswa.berat_badan'
                )
                ->get()
            : collect();
        $coach = $role === 'pelatih' && $user
            ? DB::table('pelatih')->where('user_id', $user->id)->orWhere('email', $user->email)->first()
            : null;

        return Inertia::render('Auth/ProfilPengguna', [
            'profile' => match ($role) {
                'admin' => $this->adminProfile($user),
                'pelatih' => $this->coachProfile($user, $coach),
                default => $this->parentProfile($user, $parent, $children),
            },
        ]);
    }

    private function adminProfile(?User $user): array
    {
        return [
            'roleKey' => 'admin',
            'roleLabel' => 'Admin',
            'name' => $user->name ?? 'Admin',
            'email' => $user->email ?? '-',
            'phone' => '-',
            'accountStatus' => $user ? 'Aktif' : 'Tidak Aktif',
            'dashboardUrl' => '/admin/dashboard',
            'accessSummary' => 'Akun admin dapat mengelola pendaftaran, siswa, pelatih, pembayaran, jadwal latihan, media promosi, dan prestasi.',
            'details' => [
                ['label' => 'Nama Admin', 'value' => $user->name ?? '-'],
                ['label' => 'Email', 'value' => $user->email ?? '-'],
                ['label' => 'Level Akses', 'value' => 'Administrator'],
            ],
            'sections' => [[
                'title' => 'Data Database',
                'items' => [
                    ['label' => 'Siswa', 'value' => DB::table('siswa')->count() . ' data'],
                    ['label' => 'Pelatih', 'value' => DB::table('pelatih')->count() . ' data'],
                    ['label' => 'Pendaftaran', 'value' => DB::table('pendaftaran')->count() . ' data'],
                    ['label' => 'Pembayaran', 'value' => DB::table('pembayaran')->count() . ' data'],
                ],
            ]],
        ];
    }

    private function coachProfile(?User $user, ?object $coach): array
    {
        return [
            'roleKey' => 'pelatih',
            'roleLabel' => 'Pelatih',
            'name' => $coach->nama_pelatih ?? $user->name ?? 'Pelatih',
            'email' => $coach->email ?? $user->email ?? '-',
            'phone' => $coach->no_hp ?? '-',
            'accountStatus' => $user ? 'Aktif' : 'Tidak Aktif',
            'dashboardUrl' => '/pelatih/dashboard',
            'accessSummary' => 'Akun pelatih dapat mengelola kehadiran, performa latihan, catatan pelatih, dan bukti pembayaran.',
            'details' => [
                ['label' => 'Nama Pelatih', 'value' => $coach->nama_pelatih ?? $user->name ?? '-'],
                ['label' => 'Email', 'value' => $coach->email ?? $user->email ?? '-'],
                ['label' => 'No HP', 'value' => $coach->no_hp ?? '-'],
            ],
            'sections' => [[
                'title' => 'Akses Pelatih',
                'items' => [
                    ['label' => 'Jadwal Latihan', 'value' => DB::table('jadwal_latihan')->count() . ' data'],
                    ['label' => 'Presensi', 'value' => DB::table('presensi')->count() . ' data'],
                    ['label' => 'Performa', 'value' => DB::table('performa_siswa')->count() . ' data'],
                    ['label' => 'Catatan', 'value' => DB::table('catatan_pelatih')->count() . ' data'],
                ],
            ]],
        ];
    }

    private function parentProfile(?User $user, ?object $parent, $children): array
    {
        $childRows = collect($children);
        $childNames = $childRows
            ->map(fn ($child) => is_object($child) ? $child->nama_siswa : $child)
            ->filter()
            ->values()
            ->all();
        $childDetailItems = $childRows
            ->flatMap(function ($child) {
                if (! is_object($child)) {
                    return [['label' => 'Nama Anak', 'value' => $child]];
                }

                $birthDate = $child->tanggal_lahir
                    ? Carbon::parse($child->tanggal_lahir)->format('d/m/Y')
                    : '-';

                return [
                    ['label' => 'Nama Anak', 'value' => $child->nama_siswa],
                    ['label' => 'NIK', 'value' => $child->nik ?: '-'],
                    ['label' => 'No KK', 'value' => $child->no_kk ?: '-'],
                    ['label' => 'NISN', 'value' => $child->nisn ?: '-'],
                    ['label' => 'Tempat Lahir', 'value' => $child->tempat_lahir ?: '-'],
                    ['label' => 'Tanggal Lahir', 'value' => $birthDate],
                    ['label' => 'Umur', 'value' => $child->umur ?: '-'],
                    ['label' => 'Alamat', 'value' => $child->alamat ?: '-'],
                    ['label' => 'Tinggi Badan', 'value' => $child->tinggi_badan ? $child->tinggi_badan . ' cm' : '-'],
                    ['label' => 'Berat Badan', 'value' => $child->berat_badan ? $child->berat_badan . ' kg' : '-'],
                ];
            })
            ->values()
            ->all();
        $childDetails = $childRows
            ->map(function ($child) {
                if (! is_object($child)) {
                    return [
                        'name' => $child,
                        'items' => [],
                    ];
                }

                $birthDate = $child->tanggal_lahir
                    ? Carbon::parse($child->tanggal_lahir)->format('d/m/Y')
                    : '-';

                return [
                    'id' => $child->id_siswa,
                    'name' => $child->nama_siswa,
                    'editableProfile' => [
                        'alamat' => $child->alamat ?: '',
                        'tinggi_badan' => $child->tinggi_badan ?: '',
                        'berat_badan' => $child->berat_badan ?: '',
                    ],
                    'items' => [
                        ['label' => 'NIK', 'value' => $child->nik ?: '-'],
                        ['label' => 'No KK', 'value' => $child->no_kk ?: '-'],
                        ['label' => 'NISN', 'value' => $child->nisn ?: '-'],
                        ['label' => 'Tempat Lahir', 'value' => $child->tempat_lahir ?: '-'],
                        ['label' => 'Tanggal Lahir', 'value' => $birthDate],
                        ['label' => 'Umur', 'value' => $child->umur ?: '-'],
                        ['label' => 'Alamat', 'value' => $child->alamat ?: '-'],
                        ['label' => 'Tinggi Badan', 'value' => $child->tinggi_badan ? $child->tinggi_badan . ' cm' : '-'],
                        ['label' => 'Berat Badan', 'value' => $child->berat_badan ? $child->berat_badan . ' kg' : '-'],
                    ],
                ];
            })
            ->values()
            ->all();

        return [
            'roleKey' => 'orangtua',
            'roleLabel' => 'Orang Tua',
            'name' => $parent->nama_ortu ?? $user->name ?? 'Orang Tua',
            'email' => $parent->email ?? $user->email ?? '-',
            'phone' => $parent->no_hp ?? '-',
            'accountStatus' => $parent ? 'Aktif' : 'Tidak Aktif',
            'children' => $childNames,
            'childDetails' => $childDetails,
            'paymentStatus' => 'paid',
            'paymentProofStatus' => 'valid',
            'validationStatus' => 'valid',
            'dashboardUrl' => '/orang-tua/dashboard',
            'accessSummary' => 'Akun orang tua dapat memantau data anak, kehadiran, performa latihan, prestasi, catatan pelatih, dan pembayaran.',
            'details' => [
                ['label' => 'Nama Wali', 'value' => $parent->nama_ortu ?? $user->name ?? '-'],
                ['label' => 'Email', 'value' => $parent->email ?? $user->email ?? '-'],
                ['label' => 'Jumlah Anak', 'value' => count($childNames) . ' siswa'],
            ],
            'sections' => [[
                'title' => 'Data Anak',
                'items' => $childDetailItems,
            ]],
        ];
    }
}
