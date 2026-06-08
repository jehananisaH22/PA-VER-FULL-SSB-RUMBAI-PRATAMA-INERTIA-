<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('performa_siswa')) {
            return;
        }

        Schema::table('performa_siswa', function (Blueprint $table) {
            if (! Schema::hasColumn('performa_siswa', 'id_jadwal')) {
                $table->unsignedBigInteger('id_jadwal')
                    ->nullable()
                    ->after('id_siswa');
            }

            if (! Schema::hasColumn('performa_siswa', 'id_pelatih')) {
                $table->unsignedBigInteger('id_pelatih')
                    ->nullable()
                    ->after('id_jadwal');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('performa_siswa')) {
            return;
        }

        Schema::table('performa_siswa', function (Blueprint $table) {
            if (Schema::hasColumn('performa_siswa', 'id_pelatih')) {
                $table->dropColumn('id_pelatih');
            }

            if (Schema::hasColumn('performa_siswa', 'id_jadwal')) {
                $table->dropColumn('id_jadwal');
            }
        });
    }
};
