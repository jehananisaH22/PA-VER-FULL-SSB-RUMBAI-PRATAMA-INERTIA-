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

        Schema::table('pendaftaran', function (Blueprint $table) {
            $table->date('pending_tanggal_lahir')->nullable()->after('pending_umur');
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
