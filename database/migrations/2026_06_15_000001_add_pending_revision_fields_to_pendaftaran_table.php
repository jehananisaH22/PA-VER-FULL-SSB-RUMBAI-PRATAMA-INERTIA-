<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('pendaftaran')) {
            return;
        }

        Schema::table('pendaftaran', function (Blueprint $table) {
            if (! Schema::hasColumn('pendaftaran', 'pending_nama_siswa')) {
                $table->string('pending_nama_siswa', 100)->nullable()->after('val_foto');
            }

            if (! Schema::hasColumn('pendaftaran', 'pending_nama_ayah')) {
                $table->string('pending_nama_ayah', 100)->nullable()->after('pending_nama_siswa');
            }

            if (! Schema::hasColumn('pendaftaran', 'pending_nama_ibu')) {
                $table->string('pending_nama_ibu', 100)->nullable()->after('pending_nama_ayah');
            }

            if (! Schema::hasColumn('pendaftaran', 'pending_umur')) {
                $table->unsignedTinyInteger('pending_umur')->nullable()->after('pending_nama_ibu');
            }

            if (! Schema::hasColumn('pendaftaran', 'pending_akta_kelahiran')) {
                $table->string('pending_akta_kelahiran')->nullable()->after('pending_umur');
            }

            if (! Schema::hasColumn('pendaftaran', 'pending_kartu_keluarga')) {
                $table->string('pending_kartu_keluarga')->nullable()->after('pending_akta_kelahiran');
            }

            if (! Schema::hasColumn('pendaftaran', 'pending_rapor')) {
                $table->string('pending_rapor')->nullable()->after('pending_kartu_keluarga');
            }

            if (! Schema::hasColumn('pendaftaran', 'pending_pas_photo_3x4')) {
                $table->string('pending_pas_photo_3x4')->nullable()->after('pending_rapor');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('pendaftaran')) {
            return;
        }

        Schema::table('pendaftaran', function (Blueprint $table) {
            foreach ([
                'pending_pas_photo_3x4',
                'pending_rapor',
                'pending_kartu_keluarga',
                'pending_akta_kelahiran',
                'pending_umur',
                'pending_nama_ibu',
                'pending_nama_ayah',
                'pending_nama_siswa',
            ] as $column) {
                if (Schema::hasColumn('pendaftaran', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
