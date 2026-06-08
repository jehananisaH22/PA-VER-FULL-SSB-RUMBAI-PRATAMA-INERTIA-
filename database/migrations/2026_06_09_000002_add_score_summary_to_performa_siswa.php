<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('performa_siswa')) {
            return;
        }

        Schema::table('performa_siswa', function (Blueprint $table) {
            if (! Schema::hasColumn('performa_siswa', 'rata_rata')) {
                $table->decimal('rata_rata', 5, 2)->nullable()->after('shooting');
            }

            if (! Schema::hasColumn('performa_siswa', 'keterangan')) {
                $table->string('keterangan')->nullable()->after('rata_rata');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('performa_siswa')) {
            return;
        }

        Schema::table('performa_siswa', function (Blueprint $table) {
            if (Schema::hasColumn('performa_siswa', 'keterangan')) {
                $table->dropColumn('keterangan');
            }

            if (Schema::hasColumn('performa_siswa', 'rata_rata')) {
                $table->dropColumn('rata_rata');
            }
        });
    }
};
