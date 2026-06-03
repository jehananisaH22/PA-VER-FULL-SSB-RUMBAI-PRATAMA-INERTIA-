<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('users') || ! Schema::hasColumn('users', 'email')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql' || $driver === 'mariadb') {
            $this->dropMySqlIndex('users_email_unique');

            if (Schema::hasColumn('users', 'role') && ! $this->mySqlIndexExists('users_email_role_unique')) {
                DB::statement('ALTER TABLE users ADD UNIQUE users_email_role_unique (email, role)');
            }

            return;
        }

        if ($driver === 'sqlite') {
            DB::statement('DROP INDEX IF EXISTS users_email_unique');

            if (Schema::hasColumn('users', 'role')) {
                DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS users_email_role_unique ON users (email, role)');
            }
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('users') || ! Schema::hasColumn('users', 'email')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql' || $driver === 'mariadb') {
            $this->dropMySqlIndex('users_email_role_unique');

            if (! $this->mySqlIndexExists('users_email_unique')) {
                DB::statement('ALTER TABLE users ADD UNIQUE users_email_unique (email)');
            }

            return;
        }

        if ($driver === 'sqlite') {
            DB::statement('DROP INDEX IF EXISTS users_email_role_unique');
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email)');
        }
    }

    private function dropMySqlIndex(string $indexName): void
    {
        if ($this->mySqlIndexExists($indexName)) {
            DB::statement("ALTER TABLE users DROP INDEX {$indexName}");
        }
    }

    private function mySqlIndexExists(string $indexName): bool
    {
        $database = DB::getDatabaseName();

        $result = DB::selectOne(
            'SELECT COUNT(1) AS aggregate
             FROM information_schema.statistics
             WHERE table_schema = ? AND table_name = ? AND index_name = ?',
            [$database, 'users', $indexName]
        );

        return (int) ($result->aggregate ?? 0) > 0;
    }
};
