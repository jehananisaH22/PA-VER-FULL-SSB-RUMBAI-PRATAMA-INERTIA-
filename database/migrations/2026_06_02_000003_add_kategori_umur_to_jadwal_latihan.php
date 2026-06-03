<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('jadwal_latihan') || Schema::hasColumn('jadwal_latihan', 'kategori_umur')) {
            return;
        }

        Schema::table('jadwal_latihan', function (Blueprint $table) {
            $table->string('kategori_umur', 20)->nullable()->after('lokasi');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('jadwal_latihan') || ! Schema::hasColumn('jadwal_latihan', 'kategori_umur')) {
            return;
        }

        Schema::table('jadwal_latihan', function (Blueprint $table) {
            $table->dropColumn('kategori_umur');
        });
    }
};
