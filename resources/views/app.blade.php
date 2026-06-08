<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        @php
            $hotFile = public_path('hot');
            $manifestFile = public_path('build/manifest.json');
            $viteIsRunning = false;

            if (file_exists($hotFile)) {
                $viteUrl = trim(file_get_contents($hotFile));
                $viteHost = parse_url($viteUrl, PHP_URL_HOST) ?: '127.0.0.1';
                $vitePort = parse_url($viteUrl, PHP_URL_PORT) ?: 5173;
                $socket = @fsockopen($viteHost, $vitePort, $errorCode, $errorMessage, 0.2);

                if ($socket) {
                    fclose($socket);
                    $viteIsRunning = true;
                } elseif (file_exists($manifestFile)) {
                    @unlink($hotFile);
                }
            }

            $canLoadAssets = $viteIsRunning || file_exists($manifestFile);
        @endphp

        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        <title inertia>{{ config('app.name', 'Laravel') }}</title>

        @if ($canLoadAssets)
            @if ($viteIsRunning)
                @viteReactRefresh
            @endif

            @vite(['resources/css/app.css', 'resources/js/app.js'])
            @inertiaHead
        @else
            <style>
                body {
                    align-items: center;
                    background: #f8fafc;
                    color: #0f172a;
                    display: flex;
                    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                    justify-content: center;
                    min-height: 100vh;
                    margin: 0;
                }

                .asset-warning {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
                    max-width: 560px;
                    padding: 28px;
                }

                .asset-warning h1 {
                    font-size: 22px;
                    margin: 0 0 10px;
                }

                .asset-warning p {
                    color: #475569;
                    line-height: 1.6;
                    margin: 0 0 16px;
                }

                .asset-warning code {
                    background: #f1f5f9;
                    border-radius: 6px;
                    display: inline-block;
                    padding: 4px 8px;
                }
            </style>
        @endif
    </head>
    <body class="font-sans antialiased">
        @if ($canLoadAssets)
            @inertia
        @else
            <main class="asset-warning">
                <h1>Asset aplikasi belum siap</h1>
                <p>Jalankan Vite dengan <code>npm run dev</code> atau buat asset produksi dengan <code>npm run build</code>, lalu refresh halaman ini.</p>
            </main>
        @endif
    </body>
</html>
