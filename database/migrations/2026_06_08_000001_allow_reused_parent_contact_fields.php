<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if (Schema::hasTable('users')) {
            if ($driver === 'mysql' || $driver === 'mariadb') {
                $this->dropMySqlIndex('users', 'users_email_role_unique');
                $this->dropMySqlIndex('users', 'users_email_unique');
            } elseif ($driver === 'sqlite') {
                DB::statement('DROP INDEX IF EXISTS users_email_role_unique');
                DB::statement('DROP INDEX IF EXISTS users_email_unique');
            }
        }

        if (Schema::hasTable('orang_tua')) {
            if ($driver === 'mysql' || $driver === 'mariadb') {
                $this->dropMySqlIndex('orang_tua', 'orang_tua_no_hp_unique');
            } elseif ($driver === 'sqlite') {
                DB::statement('DROP INDEX IF EXISTS orang_tua_no_hp_unique');
            }
        }
    }

    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql' || $driver === 'mariadb') {
            if (Schema::hasTable('users') && ! $this->hasDuplicateUsersByEmailRole() && ! $this->mySqlIndexExists('users', 'users_email_role_unique')) {
                DB::statement('ALTER TABLE users ADD UNIQUE users_email_role_unique (email, role)');
            }

            if (Schema::hasTable('orang_tua') && ! $this->hasDuplicateParentPhones() && ! $this->mySqlIndexExists('orang_tua', 'orang_tua_no_hp_unique')) {
                DB::statement('ALTER TABLE orang_tua ADD UNIQUE orang_tua_no_hp_unique (no_hp)');
            }

            return;
        }

        if ($driver === 'sqlite') {
            if (Schema::hasTable('users')) {
                DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS users_email_role_unique ON users (email, role)');
            }

            if (Schema::hasTable('orang_tua')) {
                DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS orang_tua_no_hp_unique ON orang_tua (no_hp)');
            }
        }
    }

    private function dropMySqlIndex(string $table, string $indexName): void
    {
        if ($this->mySqlIndexExists($table, $indexName)) {
            DB::statement("ALTER TABLE {$table} DROP INDEX {$indexName}");
        }
    }

    private function mySqlIndexExists(string $table, string $indexName): bool
    {
        $database = DB::getDatabaseName();

        $result = DB::selectOne(
            'SELECT COUNT(1) AS aggregate
             FROM information_schema.statistics
             WHERE table_schema = ? AND table_name = ? AND index_name = ?',
            [$database, $table, $indexName]
        );

        return (int) ($result->aggregate ?? 0) > 0;
    }

    private function hasDuplicateUsersByEmailRole(): bool
    {
        $result = DB::selectOne(
            'SELECT COUNT(1) AS aggregate
             FROM (
                SELECT LOWER(email), role
                FROM users
                GROUP BY LOWER(email), role
                HAVING COUNT(1) > 1
             ) duplicates'
        );

        return (int) ($result->aggregate ?? 0) > 0;
    }

    private function hasDuplicateParentPhones(): bool
    {
        $result = DB::selectOne(
            'SELECT COUNT(1) AS aggregate
             FROM (
                SELECT no_hp
                FROM orang_tua
                WHERE no_hp IS NOT NULL
                GROUP BY no_hp
                HAVING COUNT(1) > 1
             ) duplicates'
        );

        return (int) ($result->aggregate ?? 0) > 0;
    }
};
