<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('orang_tua')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql' || $driver === 'mariadb') {
            $this->dropMySqlIndex('email');
            $this->dropMySqlIndex('orang_tua_email_unique');

            return;
        }

        if ($driver === 'sqlite') {
            DB::statement('DROP INDEX IF EXISTS email');
            DB::statement('DROP INDEX IF EXISTS orang_tua_email_unique');
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('orang_tua')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql' || $driver === 'mariadb') {
            if (! $this->hasDuplicateParentEmails() && ! $this->mySqlIndexExists('email')) {
                DB::statement('ALTER TABLE orang_tua ADD UNIQUE email (email)');
            }

            return;
        }

        if ($driver === 'sqlite') {
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS email ON orang_tua (email)');
        }
    }

    private function dropMySqlIndex(string $indexName): void
    {
        if ($this->mySqlIndexExists($indexName)) {
            DB::statement("ALTER TABLE orang_tua DROP INDEX {$indexName}");
        }
    }

    private function mySqlIndexExists(string $indexName): bool
    {
        $database = DB::getDatabaseName();

        $result = DB::selectOne(
            'SELECT COUNT(1) AS aggregate
             FROM information_schema.statistics
             WHERE table_schema = ? AND table_name = ? AND index_name = ?',
            [$database, 'orang_tua', $indexName]
        );

        return (int) ($result->aggregate ?? 0) > 0;
    }

    private function hasDuplicateParentEmails(): bool
    {
        $result = DB::selectOne(
            'SELECT COUNT(1) AS aggregate
             FROM (
                SELECT LOWER(email)
                FROM orang_tua
                WHERE email IS NOT NULL
                GROUP BY LOWER(email)
                HAVING COUNT(1) > 1
             ) duplicates'
        );

        return (int) ($result->aggregate ?? 0) > 0;
    }
};
