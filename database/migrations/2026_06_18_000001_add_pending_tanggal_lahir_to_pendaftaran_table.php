<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('pendaftaran') || Schema::hasColumn('pendaftaran', 'pending_tanggal_lahir')) {
            return;
        }

        $afterColumn = Schema::hasColumn('pendaftaran', 'pending_umur')
            ? 'pending_umur'
            : 'pending_nama_ibu';

        Schema::table('pendaftaran', function (Blueprint $table) use ($afterColumn) {
            $table->date('pending_tanggal_lahir')->nullable()->after($afterColumn);
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('pendaftaran') || ! Schema::hasColumn('pendaftaran', 'pending_tanggal_lahir')) {
            return;
        }

        Schema::table('pendaftaran', function (Blueprint $table) {
            $table->dropColumn('pending_tanggal_lahir');
        });
    }
};
