<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('jadwal_latihan') || ! Schema::hasColumn('jadwal_latihan', 'kategori_umur')) {
            return;
        }

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE jadwal_latihan MODIFY kategori_umur VARCHAR(20) NULL DEFAULT NULL');
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('jadwal_latihan') || ! Schema::hasColumn('jadwal_latihan', 'kategori_umur')) {
            return;
        }

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE jadwal_latihan MODIFY kategori_umur VARCHAR(20) NOT NULL DEFAULT 'all'");
        }
    }
};
