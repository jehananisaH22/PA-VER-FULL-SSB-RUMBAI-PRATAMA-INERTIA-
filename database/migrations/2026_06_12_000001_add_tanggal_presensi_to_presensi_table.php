<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('presensi')) {
            return;
        }

        Schema::table('presensi', function (Blueprint $table) {
            if (! Schema::hasColumn('presensi', 'tanggal_presensi')) {
                $table->date('tanggal_presensi')->nullable()->after('id_pelatih');
            }
        });

        DB::table('presensi')
            ->whereNull('tanggal_presensi')
            ->update(['tanggal_presensi' => DB::raw('DATE(created_at)')]);

        try {
            Schema::table('presensi', function (Blueprint $table) {
                $table->dropUnique('presensi_id_siswa_id_jadwal_unique');
            });
        } catch (\Throwable $e) {
            // The old index may not exist on databases created after this migration.
        }

        try {
            Schema::table('presensi', function (Blueprint $table) {
                $table->unique(['id_siswa', 'id_jadwal', 'tanggal_presensi'], 'presensi_siswa_jadwal_tanggal_unique');
            });
        } catch (\Throwable $e) {
            // Keep migration idempotent for local databases that already have the new index.
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('presensi')) {
            return;
        }

        try {
            Schema::table('presensi', function (Blueprint $table) {
                $table->dropUnique('presensi_siswa_jadwal_tanggal_unique');
            });
        } catch (\Throwable $e) {
            //
        }

        Schema::table('presensi', function (Blueprint $table) {
            if (Schema::hasColumn('presensi', 'tanggal_presensi')) {
                $table->dropColumn('tanggal_presensi');
            }
        });

        try {
            Schema::table('presensi', function (Blueprint $table) {
                $table->unique(['id_siswa', 'id_jadwal']);
            });
        } catch (\Throwable $e) {
            //
        }
    }
};
