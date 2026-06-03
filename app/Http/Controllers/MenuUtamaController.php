<?php

namespace App\Http\Controllers;

use App\Models\Promosi;
use Illuminate\Foundation\Application;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class MenuUtamaController extends Controller
{
    private const INSTAGRAM_PROFILE_URL = 'https://www.instagram.com/ssbrumbaipratama/';

    public function index(Request $request)
    {
        $payload = $this->menuPayload();

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Data menu utama berhasil diambil',
                'user' => $this->currentUserPayload(),
                'data' => $payload,
            ]);
        }

        return Inertia::render('Welcome', [
            'laravelVersion' => Application::VERSION,
            'phpVersion' => PHP_VERSION,
            'articles' => $payload['articles'],
            'berita' => $payload['berita'],
            'galeri' => $payload['galeri'],
            'instagram' => $payload['instagram'],
        ]);
    }

    public function berita(Request $request)
    {
        $articles = $this->articles();

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Data berita berhasil diambil',
                'user' => $this->currentUserPayload(),
                'data' => $articles,
            ]);
        }

        return Inertia::render('Berita', [
            'mode' => 'list',
            'articles' => $articles,
        ]);
    }

    public function galeri(Request $request)
    {
        $gallery = $this->galleryItems();

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Data galeri berhasil diambil',
                'user' => $this->currentUserPayload(),
                'data' => $gallery,
            ]);
        }

        return Inertia::render('Galeri', [
            'galleryItems' => $gallery,
            'instagram' => [
                'source' => 'manual_link',
                'profile_url' => self::INSTAGRAM_PROFILE_URL,
            ],
        ]);
    }

    public function instagram(Request $request)
    {
        $feed = $this->instagramItems();

        $payload = [
            'source' => 'fallback_promosi',
            'profile_url' => self::INSTAGRAM_PROFILE_URL,
            'items' => $feed,
        ];

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Data instagram berhasil diambil',
                'user' => $this->currentUserPayload(),
                'instagram' => $payload,
                'notes' => [
                    'Untuk feed live Instagram, integrasikan Meta Graph API dan ganti source menjadi graph_api.',
                ],
            ]);
        }

        return Inertia::render('Galeri', [
            'galleryItems' => $this->galleryItems(),
            'instagram' => $payload,
        ]);
    }

    private function menuPayload(): array
    {
        return [
            'articles' => $this->articles(),
            'berita' => $this->apiBeritaItems(),
            'galeri' => $this->galleryItems(),
            'instagram' => [
                'source' => 'manual_link',
                'profile_url' => self::INSTAGRAM_PROFILE_URL,
                'items' => $this->instagramItems(),
            ],
        ];
    }

    private function articles()
    {
        return Promosi::query()
            ->leftJoin('siswa', 'promosi.id_siswa', '=', 'siswa.id_siswa')
            ->where('kategori', 'Berita')
            ->orderByDesc('promosi.tanggal_promosi')
            ->orderByDesc('promosi.id_promosi')
            ->get([
                'promosi.*',
                'siswa.nama_siswa',
                'siswa.umur',
            ])
            ->groupBy(fn ($item) => $item->group_id ?: 'single-' . $item->id_promosi)
            ->map(fn ($rows) => $this->toArticlePayload($rows))
            ->values()
            ->all();
    }

    private function apiBeritaItems()
    {
        return collect($this->articles())
            ->map(fn (array $item) => [
                'id_promosi' => $item['id'],
                'judul' => $item['title'],
                'isi' => $item['body'],
                'tanggal' => $item['postedAt'],
                'foto' => $item['imageName'],
                'foto_url' => $item['image'],
                'kategori' => $item['category'],
            ])
            ->values()
            ->all();
    }

    private function galleryItems()
    {
        return Promosi::query()
            ->whereNotNull('foto_promosi')
            ->where('foto_promosi', '!=', '')
            ->whereIn('kategori', ['Galeri', 'Akun Sosial'])
            ->orderByDesc('tanggal_promosi')
            ->orderByDesc('id_promosi')
            ->limit(20)
            ->get([
                'id_promosi',
                'judul',
                'foto_promosi',
                'tanggal_promosi',
                'kategori',
            ])
            ->map(fn (Promosi $item) => [
                'id' => $item->id_promosi,
                'id_promosi' => $item->id_promosi,
                'title' => $item->judul,
                'judul' => $item->judul,
                'date' => $item->tanggal_promosi,
                'image' => $this->toStorageUrl($item->foto_promosi),
                'foto' => $item->foto_promosi,
                'foto_url' => $this->toStorageUrl($item->foto_promosi),
                'category' => $item->kategori,
                'kategori' => $item->kategori,
            ])
            ->values()
            ->all();
    }

    private function instagramItems()
    {
        return Promosi::query()
            ->where('kategori', 'Akun Sosial')
            ->whereNotNull('foto_promosi')
            ->where('foto_promosi', '!=', '')
            ->orderByDesc('tanggal_promosi')
            ->orderByDesc('id_promosi')
            ->limit(12)
            ->get([
                'id_promosi',
                'judul',
                'isi_promosi',
                'tanggal_promosi',
                'foto_promosi',
                'kategori',
            ])
            ->map(fn (Promosi $item) => [
                'id' => $item->id_promosi,
                'caption' => $item->judul ?: $item->isi_promosi,
                'media_url' => $this->toStorageUrl($item->foto_promosi),
                'thumbnail_url' => $this->toStorageUrl($item->foto_promosi),
                'permalink' => self::INSTAGRAM_PROFILE_URL,
                'timestamp' => $item->tanggal_promosi,
                'source' => 'promosi_akun_sosial',
            ])
            ->values()
            ->all();
    }

    private function toArticlePayload($rows): array
    {
        $rows = collect($rows);
        $item = $rows->first();
        $date = $item->tanggal_promosi ? Carbon::parse($item->tanggal_promosi) : null;
        $players = $rows
            ->filter(fn ($row) => $row->id_siswa)
            ->map(fn ($row) => [
                'id' => $row->id_siswa,
                'name' => $row->nama_siswa,
                'category' => $row->umur ? 'U-' . $row->umur : '-',
            ])
            ->unique('id')
            ->values()
            ->all();

        return [
            'id' => $item->id_promosi,
            'groupId' => $item->group_id,
            'title' => $item->judul,
            'excerpt' => str($item->isi_promosi)->limit(140)->toString(),
            'body' => $item->isi_promosi,
            'image' => $this->toStorageUrl($item->foto_promosi),
            'imageName' => $item->foto_promosi,
            'dateLabel' => $date?->locale('id')->translatedFormat('d F Y') ?? '-',
            'postedAt' => $date?->timestamp * 1000,
            'category' => $item->kategori,
            'players' => $players,
        ];
    }

    private function currentUserPayload(): ?array
    {
        $user = Auth::user();

        if (! $user) {
            return null;
        }

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
        ];
    }

    private function toStorageUrl(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        return asset('storage/' . ltrim($path, '/'));
    }
}
