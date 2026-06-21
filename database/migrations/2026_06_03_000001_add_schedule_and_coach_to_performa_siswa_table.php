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
                $table->foreignId('id_jadwal')
                    ->nullable()
                    ->after('id_siswa')
                    ->constrained('jadwal_latihan', 'id_jadwal')
                    ->nullOnDelete();
            }

            if (! Schema::hasColumn('performa_siswa', 'id_pelatih')) {
                $table->foreignId('id_pelatih')
                    ->nullable()
                    ->after('id_jadwal')
                    ->constrained('pelatih', 'id_pelatih')
                    ->nullOnDelete();
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
                $table->dropConstrainedForeignId('id_pelatih');
            }

            if (Schema::hasColumn('performa_siswa', 'id_jadwal')) {
                $table->dropConstrainedForeignId('id_jadwal');
            }
        });
    }
};
