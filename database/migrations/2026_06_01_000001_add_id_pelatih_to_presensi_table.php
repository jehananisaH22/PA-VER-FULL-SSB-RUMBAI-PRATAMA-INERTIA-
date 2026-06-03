<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('presensi') || Schema::hasColumn('presensi', 'id_pelatih')) {
            return;
        }

        Schema::table('presensi', function (Blueprint $table) {
            $table->unsignedBigInteger('id_pelatih')
                ->nullable()
                ->after('id_jadwal')
                ->index();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('presensi') || ! Schema::hasColumn('presensi', 'id_pelatih')) {
            return;
        }

        Schema::table('presensi', function (Blueprint $table) {
            $table->dropColumn('id_pelatih');
        });
    }
};
