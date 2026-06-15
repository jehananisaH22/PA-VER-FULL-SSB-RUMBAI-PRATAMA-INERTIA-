<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('presensi') || ! Schema::hasColumn('presensi', 'status_kehadiran')) {
            return;
        }

        // Mengubah kolom menjadi VARCHAR(20) secara aman untuk MySQL & SQLite
        Schema::table('presensi', function (Blueprint $table) {
            $table->string('status_kehadiran', 20)->change();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('presensi') || ! Schema::hasColumn('presensi', 'status_kehadiran')) {
            return;
        }

        // Mengembalikan kolom menjadi ENUM secara aman
        Schema::table('presensi', function (Blueprint $table) {
            $table->enum('status_kehadiran', ['Hadir', 'Sakit', 'Alpha', 'Izin'])->change();
        });
    }
};