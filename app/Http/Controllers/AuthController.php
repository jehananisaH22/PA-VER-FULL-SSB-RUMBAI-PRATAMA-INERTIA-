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

        $validated = $request->validate([
            'nama' => 'required|string|max:100',
            'email' => ['required', 'email'],
            'no_hp' => ['required', 'regex:/^[0-9]{10,13}$/'],
            'password' => [
                'required',
                'confirmed',
                PasswordRule::min(8)->letters()->numbers()->symbols(),
            ],
        ]);

        $existingUsers = User::query()
            ->whereRaw('LOWER(email) = ?', [$validated['email']])
            ->where('role', 'orang_tua')
            ->orderByDesc('id')
            ->get();
        $existingUser = $existingUsers->first();
        $existingParent = OrangTua::query()
            ->whereRaw('LOWER(email) = ?', [$validated['email']])
            ->orderByRaw('CASE WHEN user_id IS NULL THEN 1 ELSE 0 END')
            ->orderByDesc('user_id')
            ->first();
        if (! $existingUser) {
            $existingParent ??= OrangTua::query()
                ->where('no_hp', $validated['no_hp'])
                ->orderByRaw('CASE WHEN user_id IS NULL THEN 1 ELSE 0 END')
                ->orderByDesc('user_id')
                ->first();
        }

        if ($existingUser || $existingParent) {
            return $this->resumeExistingParentRegistration($request, $validated, $existingUser, $existingParent, $existingUsers);
        }

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

            $link = url('/verify-email?token=' . $token . '&email=' . urlencode($user->email));

            Mail::to($user->email)->send(new VerifyEmailMail($user->name, $link));

            DB::commit();

            Log::info('USER CREATED', [
                'user_id' => $user->id,
                'token_generated' => $token,
                'token_saved' => $user->verification_token,
            ]);

            $request->session()->put('registration.account', [
                'userId' => $user->id,
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

    private function resumeExistingParentRegistration(Request $request, array $validated, ?User $existingUser, ?OrangTua $existingParent, $existingUsers = null)
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

        $sameEmailAccount = $parentUser
            && strtolower((string) $parentUser->email) === strtolower((string) $validated['email']);
        $samePhoneOnly = ! $sameEmailAccount
            && $parentProfile
            && (string) $parentProfile->no_hp === (string) $validated['no_hp'];

        if (! $sameEmailAccount || $samePhoneOnly) {
            throw ValidationException::withMessages([
                'email' => 'Email atau no handphone sudah terdaftar, tetapi datanya tidak cocok dengan akun orang tua ini.',
                'no_hp' => 'No handphone sudah terdaftar pada akun lain.',
            ]);
        }

        $parentUsers = collect($existingUsers ?: []);
        if ($parentUsers->isEmpty()) {
            $parentUsers = User::query()
                ->whereRaw('LOWER(email) = ?', [$validated['email']])
                ->where('role', 'orang_tua')
                ->orderByDesc('id')
                ->get();
        }
        $passwordAlreadyUsed = $parentUsers->contains(
            fn ($user) => Hash::check($validated['password'], (string) $user->password)
        );
        $hasVerifiedParentUser = $parentUsers->contains(fn ($user) => (bool) $user->email_verified_at);

        if (! $hasVerifiedParentUser) {
            throw ValidationException::withMessages([
                'email' => 'Email sudah terdaftar tetapi belum diverifikasi. Silakan cek email verifikasi terlebih dahulu.',
            ]);
        }

        if ($passwordAlreadyUsed) {
            throw ValidationException::withMessages([
                'password' => 'Untuk daftar akun baru dengan email yang sama, kata kunci harus berbeda dari semua akun sebelumnya.',
            ]);
        }

        return $this->registerAdditionalParentAccess($request, $validated, $parentProfile);
    }

    private function registerAdditionalParentAccess(Request $request, array $validated, ?OrangTua $linkedParent)
    {
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

            $parentProfile = OrangTua::create([
                'user_id' => $user->id,
                'nama_ortu' => $validated['nama'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'no_hp' => $validated['no_hp'],
            ]);

            DB::commit();
        } catch (\Throwable $e) {
            if (DB::transactionLevel() > 0) {
                DB::rollBack();
            }

            Log::error('REGISTER ADDITIONAL PARENT ACCESS FAILED', [
                'email' => $validated['email'],
                'message' => $e->getMessage(),
            ]);

            return response()->json([
                'status' => false,
                'message' => 'Akses tambahan orang tua gagal dibuat.',
                'error' => $e->getMessage(),
            ], 500);
        }

        $link = url('/verify-email?token=' . $token . '&email=' . urlencode($user->email));
        Mail::to($user->email)->send(new VerifyEmailMail($user->name, $link));

        $request->session()->forget([
            'id_siswa',
            'show_child_picker_after_login',
        ]);
        $request->session()->put('registration.account', [
            'userId' => $user->id,
            'name' => $parentProfile->nama_ortu ?: $user->name,
            'email' => $user->email,
            'phone' => $parentProfile->no_hp,
            'verificationLink' => $link,
        ]);

        if ($request->header('X-Inertia') || ! $request->expectsJson()) {
            return redirect('/register/verify-notice');
        }

        return response()->json([
            'status' => true,
            'message' => 'Akun baru dibuat untuk email yang sama. Silakan verifikasi email terlebih dahulu.',
            'next_url' => '/register/verify-notice',
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
                $sessionUser = $this->registrationSessionUser($request);

                if ($sessionUser) {
                    $this->markEmailVerified($sessionUser);
                    Auth::login($sessionUser);
                    $request->session()->regenerate();

                    return $this->redirectVerifiedParentToRegistration($request, $sessionUser);
                }

                $authenticatedUser = $request->user();

                if (
                    $authenticatedUser
                    && $authenticatedUser->role === 'orang_tua'
                    && $authenticatedUser->email_verified_at
                    && $request->filled('email')
                    && hash_equals(strtolower($authenticatedUser->email), strtolower($request->email))
                ) {
                    $parent = $authenticatedUser->orangTua;

                    $request->session()->put('registration.account', [
                        'userId' => $authenticatedUser->id,
                        'name' => $authenticatedUser->name,
                        'email' => $authenticatedUser->email,
                        'phone' => optional($parent)->no_hp,
                    ]);

                    return redirect('/register/form')
                        ->with('success', 'Email sudah diverifikasi. Silakan lengkapi berkas pendaftaran.');
                }

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
                $sessionUser = $this->registrationSessionUser($request);

                if ($sessionUser) {
                    $this->markEmailVerified($sessionUser);
                    Auth::login($sessionUser);
                    $request->session()->regenerate();

                    return $this->redirectVerifiedParentToRegistration($request, $sessionUser);
                }

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
                    'userId' => $user->id,
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

    private function registrationSessionUser(Request $request): ?User
    {
        $account = $request->session()->get('registration.account', []);
        $userId = $account['userId'] ?? null;
        $email = strtolower(trim((string) ($account['email'] ?? $request->email)));

        if (! $userId || $email === '') {
            return null;
        }

        $user = User::query()
            ->where('id', $userId)
            ->where('role', 'orang_tua')
            ->first();

        if (! $user || ! hash_equals(strtolower($user->email), $email)) {
            return null;
        }

        return $user;
    }

    private function markEmailVerified(User $user): void
    {
        if (! $user->email_verified_at || $user->verification_token) {
            $user->update([
                'email_verified_at' => now(),
                'verification_token' => null,
            ]);
            $user->refresh();
        }
    }

    private function redirectVerifiedParentToRegistration(Request $request, User $user)
    {
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
            'userId' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => optional($parent)->no_hp,
        ]);

        return redirect('/register/form')
            ->with('success', 'Email berhasil diverifikasi. Silakan lengkapi berkas pendaftaran.');
    }

    public function verificationStatus(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $user = User::query()
            ->where('id', $request->session()->get('registration.account.userId'))
            ->where('role', 'orang_tua')
            ->first();

        if (! $user) {
            $user = User::query()
                ->whereRaw('LOWER(email) = ?', [strtolower($request->email)])
                ->where('role', 'orang_tua')
                ->orderByDesc('id')
                ->first();
        }

        if (
            $user
            && $user->role === 'orang_tua'
            && $user->email_verified_at
            && ! Auth::check()
            && (int) $request->session()->get('registration.account.userId') === (int) $user->id
        ) {
            Auth::login($user);
            $request->session()->regenerate();
        }

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
            'switch_child_id' => 'nullable|integer|exists:siswa,id_siswa',
        ]);

        $matchingUsers = User::whereRaw('LOWER(email) = ?', [$request->email])
            ->where('role', $request->role)
            ->orderByDesc('id')
            ->get();
        $switchChildId = $request->role === 'orang_tua' && $request->filled('switch_child_id')
            ? (int) $request->switch_child_id
            : null;
        $user = $matchingUsers->first(function ($candidate) use ($request, $switchChildId) {
            if (! Hash::check($request->password, $candidate->password)) {
                return false;
            }

            return ! $switchChildId || $this->parentUserOwnsStudent($candidate, $switchChildId);
        });

        if (! $user) {
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

                if ($switchChildId) {
                    $targetChild = $anak->firstWhere('id_siswa', $switchChildId);

                    if (! $targetChild) {
                        return $this->loginFailed($request, 'Anak tidak ditemukan untuk akun ini.', 404);
                    }

                    $request->session()->put('id_siswa', $switchChildId);
                    $request->session()->forget('show_child_picker_after_login');

                    return redirect('/orang-tua/dashboard');
                }

                $directChildren = $this->directStudentsForParentUser($user);

                if ($directChildren->count() === 1) {
                    $request->session()->put('id_siswa', (int) $directChildren->first()->id_siswa);
                    $request->session()->forget('show_child_picker_after_login');

                    return redirect('/orang-tua/dashboard');
                }

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
                'selected_child_id' => $switchChildId,
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

        $users = User::whereRaw('LOWER(email) = ?', [$request->email])
            ->whereIn('role', ['orang_tua', 'admin', 'pelatih'])
            ->orderByDesc('id')
            ->get();
        $user = $users->first();

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

        if ($user->role === 'orang_tua') {
            User::whereRaw('LOWER(email) = ?', [$request->email])
                ->where('role', 'orang_tua')
                ->update(['password' => $hashedPassword]);

            DB::table('orang_tua')
                ->whereRaw('LOWER(email) = ?', [$request->email])
                ->update(['password' => $hashedPassword]);
        }

        if ($user->role === 'admin') {
            $user->update([
                'password' => $hashedPassword,
            ]);

            DB::table('admin')
                ->where('user_id', $user->id)
                ->orWhereRaw('LOWER(email) = ?', [$request->email])
                ->update(['password' => $hashedPassword]);
        }

        if ($user->role === 'pelatih') {
            $user->update([
                'password' => $hashedPassword,
            ]);

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

    private function directStudentsForParentUser(User $user)
    {
        $parentIds = DB::table('orang_tua')
            ->where('user_id', $user->id)
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
            ->orderByDesc('id_siswa')
            ->get();
    }

    private function parentUserOwnsStudent(User $user, int $studentId): bool
    {
        return DB::table('siswa')
            ->leftJoin('orang_tua', 'siswa.id_ortu', '=', 'orang_tua.id_ortu')
            ->where('siswa.id_siswa', $studentId)
            ->where(function ($query) use ($user) {
                $query->where('siswa.user_id', $user->id)
                    ->orWhere('orang_tua.user_id', $user->id);
            })
            ->exists();
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
