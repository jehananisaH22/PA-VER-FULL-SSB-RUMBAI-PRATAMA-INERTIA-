<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('catatan_pelatih') || ! Schema::hasColumn('catatan_pelatih', 'id_pelatih')) {
            return;
        }

        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        $this->dropCoachForeignKeys();

        $coachIdType = $this->coachIdColumnType();

        DB::statement("ALTER TABLE catatan_pelatih MODIFY id_pelatih {$coachIdType} NULL");

        if (! $this->hasCoachForeignKey()) {
            DB::statement(
                'ALTER TABLE catatan_pelatih ADD CONSTRAINT catatan_pelatih_id_pelatih_foreign FOREIGN KEY (id_pelatih) REFERENCES pelatih(id_pelatih) ON DELETE SET NULL'
            );
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('catatan_pelatih') || ! Schema::hasColumn('catatan_pelatih', 'id_pelatih')) {
            return;
        }

        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        $this->dropCoachForeignKeys();

        $coachIdType = $this->coachIdColumnType();

        DB::statement("ALTER TABLE catatan_pelatih MODIFY id_pelatih {$coachIdType} NOT NULL");

        if (! $this->hasCoachForeignKey()) {
            DB::statement(
                'ALTER TABLE catatan_pelatih ADD CONSTRAINT fk_cttn_pelatih FOREIGN KEY (id_pelatih) REFERENCES pelatih(id_pelatih) ON DELETE CASCADE'
            );
        }
    }

    private function coachIdColumnType(): string
    {
        $column = DB::table('information_schema.COLUMNS')
            ->where('TABLE_SCHEMA', DB::getDatabaseName())
            ->where('TABLE_NAME', 'pelatih')
            ->where('COLUMN_NAME', 'id_pelatih')
            ->value('COLUMN_TYPE');

        return $column ?: 'BIGINT UNSIGNED';
    }

    private function dropCoachForeignKeys(): void
    {
        $foreignKeys = DB::table('information_schema.KEY_COLUMN_USAGE')
            ->where('TABLE_SCHEMA', DB::getDatabaseName())
            ->where('TABLE_NAME', 'catatan_pelatih')
            ->where('COLUMN_NAME', 'id_pelatih')
            ->whereNotNull('REFERENCED_TABLE_NAME')
            ->pluck('CONSTRAINT_NAME');

        foreach ($foreignKeys as $foreignKey) {
            DB::statement("ALTER TABLE catatan_pelatih DROP FOREIGN KEY `{$foreignKey}`");
        }
    }

    private function hasCoachForeignKey(): bool
    {
        return DB::table('information_schema.KEY_COLUMN_USAGE')
            ->where('TABLE_SCHEMA', DB::getDatabaseName())
            ->where('TABLE_NAME', 'catatan_pelatih')
            ->where('COLUMN_NAME', 'id_pelatih')
            ->where('REFERENCED_TABLE_NAME', 'pelatih')
            ->exists();
    }
};
