<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('siswa', function (Blueprint $table) {
            if (! Schema::hasColumn('siswa', 'nik')) {
                $table->string('nik', 20)->nullable()->after('nama_siswa');
            }

            if (! Schema::hasColumn('siswa', 'no_kk')) {
                $table->string('no_kk', 20)->nullable()->after('nik');
            }

            if (! Schema::hasColumn('siswa', 'nisn')) {
                $table->string('nisn', 20)->nullable()->after('no_kk');
            }
        });
    }

    public function down(): void
    {
        Schema::table('siswa', function (Blueprint $table) {
            if (Schema::hasColumn('siswa', 'nisn')) {
                $table->dropColumn('nisn');
            }

            if (Schema::hasColumn('siswa', 'no_kk')) {
                $table->dropColumn('no_kk');
            }

            if (Schema::hasColumn('siswa', 'nik')) {
                $table->dropColumn('nik');
            }
        });
    }
};
