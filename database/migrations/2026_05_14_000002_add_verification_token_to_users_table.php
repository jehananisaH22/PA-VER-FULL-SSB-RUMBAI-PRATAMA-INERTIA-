<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('users', 'verification_token')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->string('verification_token', 100)->nullable()->after('email_verified_at');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('users', 'verification_token')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('verification_token');
        });
    }
};
