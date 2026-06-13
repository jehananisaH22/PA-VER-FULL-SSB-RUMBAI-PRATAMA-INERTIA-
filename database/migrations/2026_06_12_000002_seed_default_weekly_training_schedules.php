<?php

use Carbon\Carbon;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('jadwal_latihan') || ! Schema::hasTable('jadwal_siswa')) {
            return;
        }

        $studentIds = Schema::hasTable('siswa')
            ? DB::table('siswa')
                ->whereRaw('LOWER(COALESCE(status, "")) = ?', ['active'])
                ->pluck('id_siswa')
                ->all()
            : [];

        $defaults = [
            [
                'weekday' => Carbon::WEDNESDAY,
                'jam_mulai' => '16:30:00',
                'jam_selesai' => '17:30:00',
            ],
            [
                'weekday' => Carbon::SUNDAY,
                'jam_mulai' => '07:30:00',
                'jam_selesai' => '09:30:00',
            ],
        ];

        foreach ($defaults as $default) {
            $scheduleId = DB::table('jadwal_latihan')
                ->where('jam_mulai', $default['jam_mulai'])
                ->where('jam_selesai', $default['jam_selesai'])
                ->where(function ($query) {
                    $query->where('kategori_umur', 'all')->orWhereNull('kategori_umur');
                })
                ->orderBy('id_jadwal')
                ->value('id_jadwal');

            if (! $scheduleId) {
                $date = Carbon::now()->next($default['weekday'])->toDateString();

                $scheduleId = DB::table('jadwal_latihan')->insertGetId([
                    'id_pelatih' => null,
                    'tanggal' => $date,
                    'jam_mulai' => $default['jam_mulai'],
                    'jam_selesai' => $default['jam_selesai'],
                    'lokasi' => 'Lapangan Mesjid Da\'wah Rumbai Pesisir',
                    'kategori_umur' => 'all',
                ]);
            }

            foreach ($studentIds as $studentId) {
                DB::table('jadwal_siswa')->updateOrInsert([
                    'id_jadwal' => $scheduleId,
                    'id_siswa' => $studentId,
                ]);
            }
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('jadwal_latihan')) {
            return;
        }

        DB::table('jadwal_latihan')
            ->whereNull('id_pelatih')
            ->where('kategori_umur', 'all')
            ->where(function ($query) {
                $query
                    ->where(function ($builder) {
                        $builder->where('jam_mulai', '16:30:00')->where('jam_selesai', '17:30:00');
                    })
                    ->orWhere(function ($builder) {
                        $builder->where('jam_mulai', '07:30:00')->where('jam_selesai', '09:30:00');
                    });
            })
            ->delete();
    }
};
