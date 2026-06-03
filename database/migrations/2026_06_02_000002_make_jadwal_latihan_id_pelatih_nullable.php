<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('jadwal_latihan') || ! Schema::hasColumn('jadwal_latihan', 'id_pelatih')) {
            return;
        }

        if (DB::getDriverName() === 'mysql') {
            $foreignKey = DB::selectOne("
                SELECT CONSTRAINT_NAME
                FROM information_schema.KEY_COLUMN_USAGE
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'jadwal_latihan'
                  AND COLUMN_NAME = 'id_pelatih'
                  AND REFERENCED_TABLE_NAME IS NOT NULL
                LIMIT 1
            ");

            if ($foreignKey?->CONSTRAINT_NAME) {
                DB::statement('ALTER TABLE jadwal_latihan DROP FOREIGN KEY `' . str_replace('`', '``', $foreignKey->CONSTRAINT_NAME) . '`');
            }

            DB::statement('ALTER TABLE jadwal_latihan MODIFY id_pelatih BIGINT UNSIGNED NULL');
        }
    }

    public function down(): void
    {
        // Kept nullable because schedules are now managed globally, not per coach.
    }
};
