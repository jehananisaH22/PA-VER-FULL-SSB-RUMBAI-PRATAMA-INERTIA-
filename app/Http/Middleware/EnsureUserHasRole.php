<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();
        $allowedRoles = collect($roles)
            ->flatMap(fn (string $role) => explode('|', $role))
            ->map(fn (string $role) => $this->normalizeRole($role))
            ->filter()
            ->unique()
            ->values()
            ->all();

        if (! $user) {
            return $request->expectsJson()
                ? response()->json(['status' => false, 'message' => 'Belum login'], 401)
                : redirect()->route('login');
        }

        if (! in_array($this->normalizeRole((string) $user->role), $allowedRoles, true)) {
            return $request->expectsJson()
                ? response()->json(['status' => false, 'message' => 'Akses ditolak'], 403)
                : redirect($this->dashboardPathForRole((string) $user->role));
        }

        return $next($request);
    }

    private function normalizeRole(string $role): string
    {
        return match (strtolower(trim($role))) {
            'orangtua', 'orang-tua' => 'orang_tua',
            default => strtolower(trim($role)),
        };
    }

    private function dashboardPathForRole(string $role): string
    {
        return match ($this->normalizeRole($role)) {
            'admin' => '/admin/dashboard',
            'pelatih' => '/pelatih/dashboard',
            'orang_tua' => '/orang-tua/dashboard',
            default => '/',
        };
    }
}
