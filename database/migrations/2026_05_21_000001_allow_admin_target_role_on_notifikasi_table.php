<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('notifikasi') || DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement("ALTER TABLE notifikasi MODIFY target_role ENUM('orang_tua', 'pelatih', 'siswa', 'semua', 'admin') NULL");
    }

    public function down(): void
    {
        if (! Schema::hasTable('notifikasi')) {
            return;
        }

        DB::table('notifikasi')
            ->where('target_role', 'admin')
            ->update(['target_role' => 'semua']);

        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement("ALTER TABLE notifikasi MODIFY target_role ENUM('orang_tua', 'pelatih', 'siswa', 'semua') NULL");
    }
};
