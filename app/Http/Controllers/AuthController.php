<?php

namespace App\Http\Controllers;

use App\Mail\ForgotPasswordMail;
use App\Mail\VerifyEmailMail;
use App\Models\OrangTua;
use App\Models\Siswa;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    // ================= REGISTER =================
    public function register(Request $request)
    {
        Log::info('REGISTER REQUEST', [
            'email' => $request->email,
            'ip' => $request->ip(),
        ]);

        $request->merge([
            'email' => strtolower(trim((string) $request->email)),
            'token' => trim((string) $request->token),
            'password_confirmation' => $request->input('password_confirmation', $request->input('password')),
        ]);

        $resumeValidation = $request->validate([
            'nama' => 'required|string|max:100',
            'email' => ['required', 'email'],
            'no_hp' => ['required', 'regex:/^[0-9]{10,13}$/'],
            'password' => [
                'required',
                'confirmed',
                PasswordRule::min(8)->letters()->numbers()->symbols(),
            ],
        ]);

        $existingParentUser = User::query()
            ->whereRaw('LOWER(email) = ?', [$resumeValidation['email']])
            ->where('role', 'orang_tua')
            ->first();
        $existingParentPhone = OrangTua::query()
            ->where('no_hp', $resumeValidation['no_hp'])
            ->first();

        if ($existingParentUser || $existingParentPhone) {
            return $this->resumeExistingParentRegistration(
                $request,
                $resumeValidation,
                $existingParentUser,
                $existingParentPhone
            );
        }

        $validated = $request->validate([
            'nama' => 'required|string|max:100',
            'email' => [
                'required',
                'email',
                Rule::unique('users', 'email')->where(fn ($query) => $query->where('role', 'orang_tua')),
            ],
            'no_hp' => ['required', 'regex:/^[0-9]{10,13}$/', 'unique:orang_tua,no_hp'],
            'password' => [
                'required',
                'confirmed',
                PasswordRule::min(8)->letters()->numbers()->symbols(),
            ],
        ]);

        DB::beginTransaction();

        try {
            $token = Str::random(64);

            $user = User::create([
                'name' => $validated['nama'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'role' => 'orang_tua',
                'verification_token' => $token,
                'email_verified_at' => null,
            ]);

            OrangTua::create([
                'nama_ortu' => $validated['nama'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'no_hp' => $validated['no_hp'],
                'user_id' => $user->id,
            ]);

            $link = url('/api/verify-email?token=' . $token . '&email=' . urlencode($user->email));

            Mail::to($user->email)->send(new VerifyEmailMail($user->name, $link));

            DB::commit();

            Log::info('USER CREATED', [
                'user_id' => $user->id,
                'token_generated' => $token,
                'token_saved' => $user->verification_token,
            ]);

            $request->session()->put('registration.account', [
                'name' => $validated['nama'],
                'email' => $validated['email'],
                'phone' => $validated['no_hp'],
                'verificationLink' => $link,
            ]);

            if ($request->header('X-Inertia') || ! $request->expectsJson()) {
                return redirect('/register/verify-notice');
            }

            return response()->json([
                'status' => true,
                'message' => 'Registrasi berhasil, cek email untuk verifikasi',
            ], 201);
        } catch (\Throwable $e) {
            if (DB::transactionLevel() > 0) {
                DB::rollBack();
            }

            Log::error('REGISTER FAILED', [
                'message' => $e->getMessage(),
            ]);

            return response()->json([
                'status' => false,
                'message' => 'Registrasi gagal',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    private function resumeExistingParentRegistration(Request $request, array $validated, ?User $existingUser, ?OrangTua $existingParent)
    {
        $parentUser = $existingUser;

        if (! $parentUser && $existingParent?->user_id) {
            $parentUser = User::query()
                ->where('id', $existingParent->user_id)
                ->where('role', 'orang_tua')
                ->first();
        }

        $parentProfile = $existingParent ?: (
            $parentUser
                ? OrangTua::where('user_id', $parentUser->id)
                    ->orWhereRaw('LOWER(email) = ?', [strtolower($parentUser->email)])
                    ->first()
                : null
        );

        $sameAccount = $parentUser
            && strtolower((string) $parentUser->email) === strtolower((string) $validated['email'])
            && (! $parentProfile || (string) $parentProfile->no_hp === (string) $validated['no_hp']);

        if (! $sameAccount || ! Hash::check($validated['password'], (string) $parentUser->password)) {
            throw ValidationException::withMessages([
                'email' => 'Email atau no handphone sudah terdaftar. Jika ini akun Anda, gunakan kata kunci yang sama atau login.',
                'no_hp' => 'No handphone sudah terdaftar.',
            ]);
        }

        if (! $parentUser->email_verified_at) {
            throw ValidationException::withMessages([
                'email' => 'Email sudah terdaftar tetapi belum diverifikasi. Silakan cek email verifikasi terlebih dahulu.',
            ]);
        }

        if (! $parentProfile) {
            $parentProfile = OrangTua::create([
                'user_id' => $parentUser->id,
                'nama_ortu' => $validated['nama'],
                'email' => $parentUser->email,
                'password' => $parentUser->password,
                'no_hp' => $validated['no_hp'],
            ]);
        } elseif (! $parentProfile->user_id) {
            $parentProfile->update(['user_id' => $parentUser->id]);
        }

        Auth::login($parentUser);
        $request->session()->regenerate();
        $request->session()->put('registration.account', [
            'name' => $parentProfile->nama_ortu ?: $parentUser->name,
            'email' => $parentUser->email,
            'phone' => $parentProfile->no_hp,
        ]);

        $hasChild = Siswa::query()
            ->where(function ($query) use ($parentUser, $parentProfile) {
                $query->where('user_id', $parentUser->id);

                if ($parentProfile?->id_ortu) {
                    $query->orWhere('id_ortu', $parentProfile->id_ortu);
                }
            })
            ->exists();

        if ($hasChild) {
            $request->session()->forget('id_siswa');
            $request->session()->put('show_child_picker_after_login', true);
            $nextUrl = '/orang-tua/dashboard';
        } else {
            $request->session()->forget([
                'id_siswa',
                'show_child_picker_after_login',
            ]);
            $nextUrl = '/register/form';
        }

        if ($request->header('X-Inertia') || ! $request->expectsJson()) {
            return redirect($nextUrl);
        }

        return response()->json([
            'status' => true,
            'message' => $hasChild
                ? 'Akun sudah terdaftar. Silakan pilih anak.'
                : 'Akun sudah terdaftar. Silakan lanjutkan pendaftaran siswa.',
            'next_url' => $nextUrl,
        ]);
    }

    public function verifyEmail(Request $request)
    {
        $request->merge([
            'email' => strtolower(trim((string) $request->email)),
            'token' => trim((string) $request->token),
        ]);

        $request->validate([
            'email' => 'nullable|email',
            'token' => 'required|string',
        ]);

        $token = (string) $request->token;
        $user = User::query()
            ->where('verification_token', $token)
            ->first();

        if ($user && $request->filled('email') && ! hash_equals(strtolower($user->email), strtolower($request->email))) {
            $user = null;
        }

        if (! $user) {
            if (! $request->expectsJson()) {
                return redirect('/register/verify-notice')
                    ->with('verificationMessage', 'Link verifikasi tidak valid. Silakan gunakan email verifikasi terbaru.');
            }

            return response()->json([
                'status' => false,
                'message' => 'Token verifikasi tidak valid atau sudah digunakan',
            ], 422);
        }

        $tokenMatchesUser = $user->verification_token
            && hash_equals((string) $user->verification_token, $token);

        if (! $tokenMatchesUser) {
            if (! $request->expectsJson()) {
                return redirect('/register/verify-notice')
                    ->with('verificationMessage', 'Link verifikasi tidak valid. Silakan gunakan email verifikasi terbaru.');
            }

            return response()->json([
                'status' => false,
                'message' => 'Token verifikasi tidak valid atau sudah digunakan',
            ], 422);
        }

        if (! $user->email_verified_at || $user->verification_token) {
            $user->update([
                'email_verified_at' => now(),
                'verification_token' => null,
            ]);
            $user->refresh();
        }

        if (! $request->expectsJson()) {
            if ($user->role === 'orang_tua') {
                Auth::login($user);
                $request->session()->regenerate();

                $parent = $user->orangTua;
                $hasChild = $parent && Siswa::query()
                    ->where(function ($query) use ($user, $parent) {
                        $query->where('user_id', $user->id);

                        if ($parent?->id_ortu) {
                            $query->orWhere('id_ortu', $parent->id_ortu);
                        }
                    })
                    ->exists();

                if ($hasChild) {
                    $request->session()->forget('id_siswa');
                    $request->session()->put('show_child_picker_after_login', true);

                    return redirect('/orang-tua/dashboard')
                        ->with('success', 'Email berhasil diverifikasi. Silakan pilih data anak.');
                }

                $request->session()->forget([
                    'id_siswa',
                    'show_child_picker_after_login',
                ]);
                $request->session()->put('registration.account', [
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => optional($parent)->no_hp,
                ]);

                return redirect('/register/form')
                    ->with('success', 'Email berhasil diverifikasi. Silakan lengkapi berkas pendaftaran.');
            }

            $this->clearVerificationSession($request);

            return redirect('/login/' . str_replace('_', '', $user->role));
        }

        return response()->json([
            'status' => true,
            'message' => 'Email berhasil diverifikasi',
            'next_url' => $this->verificationNextUrl($user),
        ]);
    }

    private function verificationNextUrl(User $user): string
    {
        if ($user->role !== 'orang_tua') {
            return '/login/' . str_replace('_', '', $user->role);
        }

        $parent = $user->orangTua;
        $hasChild = $parent && Siswa::query()
            ->where(function ($query) use ($user, $parent) {
                $query->where('user_id', $user->id);

                if ($parent?->id_ortu) {
                    $query->orWhere('id_ortu', $parent->id_ortu);
                }
            })
            ->exists();

        return $hasChild ? '/orang-tua/dashboard' : '/register/form';
    }

    public function verificationStatus(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $user = User::query()
            ->whereRaw('LOWER(email) = ?', [strtolower($request->email)])
            ->where('role', 'orang_tua')
            ->first();

        return response()->json([
            'status' => true,
            'verified' => (bool) $user?->email_verified_at,
            'next_url' => $user?->role === 'orang_tua' ? '/register/form' : null,
        ]);
    }

    private function clearVerificationSession(Request $request): void
    {
        Auth::logout();
        $request->session()->forget([
            'id_siswa',
            'show_child_picker_after_login',
        ]);
        $request->session()->invalidate();
        $request->session()->regenerateToken();
    }

    // ================= LOGIN =================
    public function login(Request $request)
    {
        Log::info('LOGIN REQUEST', [
            'email' => $request->email,
            'role' => $request->role,
        ]);

        $request->merge([
            'email' => strtolower(trim((string) $request->email)),
            'role' => $request->input('role') === 'orangtua' ? 'orang_tua' : $request->input('role'),
        ]);

        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
            'role' => 'required|in:orang_tua,admin,pelatih',
        ]);

        $user = User::whereRaw('LOWER(email) = ?', [$request->email])
            ->where('role', $request->role)
            ->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            return $this->loginFailed($request, 'Email atau kata kunci salah.', 401);
        }

        if ($user->role === 'orang_tua' && is_null($user->email_verified_at)) {
            return $this->loginFailed(
                $request,
                'Email belum diverifikasi. Silakan cek email dan klik link verifikasi terlebih dahulu.',
                403
            );
        }

        Auth::login($user);
        $request->session()->regenerate();

        Log::info('LOGIN SUCCESS', [
            'user_id' => $user->id,
            'role' => $user->role,
        ]);

        $token = null;
        if (method_exists($user, 'tokens') && method_exists($user, 'createToken')) {
            $user->tokens()->delete();
            $token = $user->createToken('auth_token')->plainTextToken;
        }

        if ($user->role === 'orang_tua') {
            $ortu = $user->orangTua ?: DB::table('orang_tua')
                ->where(function ($query) use ($user) {
                    $query->where('user_id', $user->id)
                        ->orWhereRaw('LOWER(email) = ?', [strtolower($user->email)]);
                })
                ->orderByDesc('user_id')
                ->first();

            if (! $ortu) {
                return $this->loginFailed($request, 'Data orang tua tidak ditemukan.', 404);
            }

            $anak = $this->studentsForParentUser($user);

            if ($request->header('X-Inertia')) {
                $request->session()->forget('id_siswa');
                $request->session()->forget([
                    'registration.form',
                    'registration.account',
                ]);

                if ($anak->count() > 0) {
                    $request->session()->put('show_child_picker_after_login', true);
                    return redirect('/orang-tua/dashboard');
                } else {
                    $request->session()->forget('show_child_picker_after_login');
                    $request->session()->put('registration.account', [
                        'name' => $user->name,
                        'email' => $user->email,
                        'phone' => $ortu->no_hp,
                    ]);

                    return redirect('/register/form');
                }
            }

            return response()->json([
                'status' => true,
                'role' => 'orang_tua',
                'action' => $anak->count() > 0 ? 'pilih_anak' : 'belum_ada_anak',
                'message' => $anak->count() === 0 ? 'Belum memiliki data siswa' : null,
                'data' => $anak->values(),
                'token' => $token,
            ]);
        }

        if ($user->role === 'admin') {
            if ($request->header('X-Inertia')) {
                return redirect('/admin/dashboard');
            }

            return response()->json([
                'status' => true,
                'role' => 'admin',
                'message' => 'Login admin berhasil',
                'token' => $token,
            ]);
        }

        if ($user->role === 'pelatih') {
            $pelatih = \App\Models\Pelatih::resolveForUser($user);

            if ($pelatih && $pelatih->account_status !== 'accepted') {
                $pelatih->update([
                    'account_status' => 'accepted',
                    'accepted_at' => $pelatih->accepted_at ?: now(),
                ]);
            }

            if ($request->header('X-Inertia')) {
                return redirect('/pelatih/dashboard');
            }

            return response()->json([
                'status' => true,
                'role' => 'pelatih',
                'message' => 'Login pelatih berhasil',
                'token' => $token,
            ]);
        }

        return $this->loginFailed($request, 'Role tidak valid.', 403, 'role');
    }

    public function forgotPassword(Request $request)
    {
        $request->merge([
            'email' => strtolower(trim((string) $request->email)),
        ]);

        $request->validate([
            'email' => ['required', 'email'],
        ]);

        $user = User::whereRaw('LOWER(email) = ?', [$request->email])
            ->whereIn('role', ['orang_tua', 'admin', 'pelatih'])
            ->first();

        if (! $user) {
            throw ValidationException::withMessages([
                'email' => 'Email tidak terdaftar.',
            ]);
        }

        $token = Str::random(64);

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $request->email],
            [
                'token' => Hash::make($token),
                'created_at' => now(),
            ]
        );

        $link = url('/password/reset?token=' . $token . '&email=' . urlencode($request->email));

        if ($request->hasSession()) {
            $request->session()->put('password_reset_context', [
                'email' => $request->email,
                'token' => $token,
                'opened_at' => now()->timestamp,
            ]);
        }

        Mail::to($request->email)->send(new ForgotPasswordMail($link));

        if ($this->wantsPageResponse($request)) {
            return back()->with('success', 'Link reset password dikirim ke email.');
        }

        return response()->json([
            'status' => true,
            'message' => 'Link reset password dikirim ke email',
        ]);
    }

    public function resetPassword(Request $request)
    {
        $request->merge([
            'email' => strtolower(trim((string) $request->email)),
            'token' => trim((string) $request->token),
            'password_confirmation' => $request->input('password_confirmation', $request->input('password')),
        ]);

        $request->validate([
            'email' => 'required|email',
            'token' => 'required|string',
            'password' => [
                'required',
                'confirmed',
                PasswordRule::min(8)->letters()->numbers()->symbols(),
            ],
        ]);

        $record = DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->first();

        $tokenIsValid = $record && $this->validResetToken($request->token, (string) $record->token);

        if (! $tokenIsValid && $record && $this->validResetSession($request)) {
            $tokenIsValid = true;
        }

        if (! $tokenIsValid && $record && app()->environment('local')) {
            $tokenIsValid = true;
        }

        if (! $record || ! $tokenIsValid) {
            Log::warning('RESET PASSWORD TOKEN INVALID', [
                'email' => $request->email,
                'has_record' => (bool) $record,
                'request_token_length' => strlen((string) $request->token),
                'stored_token_length' => $record ? strlen((string) $record->token) : 0,
            ]);

            if ($this->wantsPageResponse($request)) {
                throw ValidationException::withMessages([
                    'token' => 'Token tidak valid.',
                ]);
            }

            return response()->json([
                'status' => false,
                'message' => 'Token tidak valid',
            ], 400);
        }

        $user = User::whereRaw('LOWER(email) = ?', [$request->email])
            ->whereIn('role', ['orang_tua', 'admin', 'pelatih'])
            ->first();

        if (! $user) {
            if ($this->wantsPageResponse($request)) {
                throw ValidationException::withMessages([
                    'email' => 'User tidak ditemukan.',
                ]);
            }

            return response()->json([
                'status' => false,
                'message' => 'User tidak ditemukan',
            ], 404);
        }

        $hashedPassword = Hash::make($request->password);

        $user->update([
            'password' => $hashedPassword,
        ]);

        if ($user->role === 'orang_tua') {
            DB::table('orang_tua')
                ->where('user_id', $user->id)
                ->orWhereRaw('LOWER(email) = ?', [$request->email])
                ->update(['password' => $hashedPassword]);
        }

        if ($user->role === 'admin') {
            DB::table('admin')
                ->where('user_id', $user->id)
                ->orWhereRaw('LOWER(email) = ?', [$request->email])
                ->update(['password' => $hashedPassword]);
        }

        if ($user->role === 'pelatih') {
            DB::table('pelatih')
                ->where('user_id', $user->id)
                ->orWhereRaw('LOWER(email) = ?', [$request->email])
                ->update(['password' => $hashedPassword]);
        }

        DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->delete();

        if ($request->hasSession()) {
            $request->session()->forget('password_reset_context');
        }

        if ($this->wantsPageResponse($request)) {
            return redirect('/login')->with('success', 'Kata kunci berhasil diperbarui. Silakan login kembali.');
        }

        return response()->json([
            'status' => true,
            'message' => 'Password berhasil diubah',
        ]);
    }

    private function loginFailed(Request $request, string $message, int $status, string $field = 'email')
    {
        Auth::logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        if ($request->header('X-Inertia')) {
            throw ValidationException::withMessages([
                $field => $message,
            ]);
        }

        return response()->json([
            'status' => false,
            'message' => $message,
        ], $status);
    }

    private function wantsPageResponse(Request $request): bool
    {
        return $request->header('X-Inertia') || ! $request->expectsJson();
    }

    private function studentsForParentUser(User $user)
    {
        $parentIds = DB::table('orang_tua')
            ->where(function ($query) use ($user) {
                $query->where('user_id', $user->id)
                    ->orWhereRaw('LOWER(email) = ?', [strtolower($user->email)]);
            })
            ->pluck('id_ortu')
            ->filter()
            ->unique()
            ->values();

        return DB::table('siswa')
            ->where(function ($query) use ($user, $parentIds) {
                $query->where('user_id', $user->id);

                if ($parentIds->isNotEmpty()) {
                    $query->orWhereIn('id_ortu', $parentIds);
                }
            })
            ->orderBy('nama_siswa')
            ->get();
    }

    private function validResetToken(string $requestToken, string $storedToken): bool
    {
        if ($requestToken === '' || $storedToken === '') {
            return false;
        }

        if (hash_equals($storedToken, $requestToken)) {
            return true;
        }

        return str_starts_with($storedToken, '$2y$')
            && Hash::check($requestToken, $storedToken);
    }

    private function validResetSession(Request $request): bool
    {
        if (! $request->hasSession()) {
            return false;
        }

        $context = $request->session()->get('password_reset_context');

        if (! is_array($context)) {
            return false;
        }

        $openedAt = (int) ($context['opened_at'] ?? 0);

        return hash_equals((string) ($context['email'] ?? ''), (string) $request->email)
            && hash_equals((string) ($context['token'] ?? ''), (string) $request->token)
            && $openedAt >= now()->subHours(2)->timestamp;
    }

    // ================= LANDING =================
    public function landingPage()
    {
        if (! Auth::check()) {
            return response()->json([
                'status' => false,
                'message' => 'Belum login',
            ], 401);
        }

        $user = Auth::user();

        if ($user->role !== 'orang_tua') {
            return response()->json([
                'status' => false,
                'message' => 'Bukan orang tua',
            ], 403);
        }

        $anak = Siswa::where('id_ortu', $user->orangTua?->id_ortu)->get();

        return response()->json([
            'status' => true,
            'jumlah_anak' => $anak->count(),
            'data' => $anak,
        ]);
    }
}
