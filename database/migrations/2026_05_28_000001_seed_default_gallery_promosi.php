<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE promosi MODIFY id_siswa INT(11) NULL");
            DB::statement("ALTER TABLE promosi MODIFY kategori ENUM('Akun Sosial','Berita','Galeri') NULL DEFAULT 'Berita'");
        }

        $sourceDir = resource_path('assets');
        $galleryFiles = [
            ['file' => 'Galeri1.png', 'title' => 'Latihan Rutin SSB Rumbai Pratama'],
            ['file' => 'Galeri2.png', 'title' => 'Kegiatan Latihan Teknik Dasar'],
            ['file' => 'Galeri3.png', 'title' => 'Suasana Latihan Pemain Muda'],
            ['file' => 'Galeri4.png', 'title' => 'Pembinaan Sepak Bola Usia Dini'],
            ['file' => 'Galeri5.png', 'title' => 'Semangat Pemain Saat Latihan'],
            ['file' => 'Galeri6.png', 'title' => 'Dokumentasi Kegiatan SSB'],
        ];

        foreach ($galleryFiles as $index => $item) {
            $sourcePath = $sourceDir . DIRECTORY_SEPARATOR . $item['file'];
            $storagePath = 'promosi/galeri-default/' . $item['file'];

            if (! File::exists($sourcePath)) {
                continue;
            }

            if (! Storage::disk('public')->exists($storagePath)) {
                Storage::disk('public')->put($storagePath, File::get($sourcePath));
            }

            $exists = DB::table('promosi')
                ->where('kategori', 'Galeri')
                ->where('foto_promosi', $storagePath)
                ->exists();

            if ($exists) {
                continue;
            }

            DB::table('promosi')->insert([
                'group_id' => null,
                'id_siswa' => null,
                'dibuat_oleh' => null,
                'judul' => $item['title'],
                'isi_promosi' => '',
                'tanggal_promosi' => now()->subDays(count($galleryFiles) - $index)->toDateString(),
                'foto_promosi' => $storagePath,
                'kategori' => 'Galeri',
            ]);
        }
    }

    public function down(): void
    {
        $paths = collect([
            'Galeri1.png',
            'Galeri2.png',
            'Galeri3.png',
            'Galeri4.png',
            'Galeri5.png',
            'Galeri6.png',
        ])->map(fn ($file) => 'promosi/galeri-default/' . $file);

        DB::table('promosi')
            ->where('kategori', 'Galeri')
            ->whereIn('foto_promosi', $paths->all())
            ->delete();

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE promosi MODIFY kategori ENUM('Akun Sosial','Berita') NULL DEFAULT 'Berita'");
        }
    }
};
