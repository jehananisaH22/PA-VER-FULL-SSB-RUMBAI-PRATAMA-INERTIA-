<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('pelatih')) {
            return;
        }

        Schema::table('pelatih', function (Blueprint $table) {
            if (! Schema::hasColumn('pelatih', 'account_status')) {
                $table->string('account_status', 30)->default('pending')->after('no_hp');
            }

            if (! Schema::hasColumn('pelatih', 'invitation_sent_at')) {
                $table->timestamp('invitation_sent_at')->nullable()->after('account_status');
            }

            if (! Schema::hasColumn('pelatih', 'accepted_at')) {
                $table->timestamp('accepted_at')->nullable()->after('invitation_sent_at');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('pelatih')) {
            return;
        }

        Schema::table('pelatih', function (Blueprint $table) {
            foreach ([
                'accepted_at',
                'invitation_sent_at',
                'account_status',
            ] as $column) {
                if (Schema::hasColumn('pelatih', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
