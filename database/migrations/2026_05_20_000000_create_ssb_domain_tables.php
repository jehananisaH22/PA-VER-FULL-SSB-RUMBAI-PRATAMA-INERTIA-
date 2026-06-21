<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                if (! Schema::hasColumn('users', 'role')) {
                    $table->string('role')->default('orang_tua')->after('email');
                }

                if (! Schema::hasColumn('users', 'verification_token')) {
                    $table->string('verification_token', 100)->nullable()->after('email_verified_at');
                }
            });
        }

        if (! Schema::hasTable('admin')) {
            Schema::create('admin', function (Blueprint $table) {
                $table->id('id_admin');
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('nama_admin', 100);
                $table->string('email')->nullable();
                $table->string('password')->nullable();
            });
        }

        if (! Schema::hasTable('orang_tua')) {
            Schema::create('orang_tua', function (Blueprint $table) {
                $table->id('id_ortu');
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('nama_ortu', 100);
                $table->string('email')->nullable();
                $table->string('password')->nullable();
                $table->string('no_hp', 20)->nullable()->unique();
            });
        }

        if (! Schema::hasTable('pelatih')) {
            Schema::create('pelatih', function (Blueprint $table) {
                $table->id('id_pelatih');
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('nama_pelatih', 100);
                $table->string('email')->nullable();
                $table->string('no_hp', 20)->nullable();
            });
        }

        if (! Schema::hasTable('siswa')) {
            Schema::create('siswa', function (Blueprint $table) {
                $table->id('id_siswa');
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('id_ortu')->nullable()->constrained('orang_tua', 'id_ortu')->nullOnDelete();
                $table->string('nama_siswa', 100);
                $table->string('nik', 20)->nullable();
                $table->string('no_kk', 20)->nullable();
                $table->string('nisn', 20)->nullable();
                $table->string('tempat_lahir', 100)->nullable();
                $table->date('tanggal_lahir')->nullable();
                $table->string('nama_ayah', 100)->nullable();
                $table->string('nama_ibu', 100)->nullable();
                $table->unsignedTinyInteger('umur')->nullable();
                $table->string('akta_kelahiran')->nullable();
                $table->string('kartu_keluarga')->nullable();
                $table->string('rapor')->nullable();
                $table->string('pas_photo_3x4')->nullable();
                $table->string('status', 30)->default('Inactive');
            });
        } else {
            Schema::table('siswa', function (Blueprint $table) {
                if (! Schema::hasColumn('siswa', 'nik')) {
                    $table->string('nik', 20)->nullable();
                }

                if (! Schema::hasColumn('siswa', 'no_kk')) {
                    $table->string('no_kk', 20)->nullable();
                }

                if (! Schema::hasColumn('siswa', 'nisn')) {
                    $table->string('nisn', 20)->nullable();
                }

                if (! Schema::hasColumn('siswa', 'tempat_lahir')) {
                    $table->string('tempat_lahir', 100)->nullable();
                }

                if (! Schema::hasColumn('siswa', 'tanggal_lahir')) {
                    $table->date('tanggal_lahir')->nullable();
                }
            });
        }

        if (! Schema::hasTable('profil_siswa')) {
            Schema::create('profil_siswa', function (Blueprint $table) {
                $table->id('id_profil');
                $table->foreignId('id_siswa')->unique()->constrained('siswa', 'id_siswa')->cascadeOnDelete();
                $table->foreignId('id_ortu')->nullable()->constrained('orang_tua', 'id_ortu')->nullOnDelete();
                $table->string('alamat')->nullable();
                $table->unsignedSmallInteger('tinggi_badan')->nullable();
                $table->unsignedSmallInteger('berat_badan')->nullable();
                $table->string('foto')->nullable();
            });
        }

        if (! Schema::hasTable('pendaftaran')) {
            Schema::create('pendaftaran', function (Blueprint $table) {
                $table->id('id_pendaftaran');
                $table->foreignId('id_siswa')->constrained('siswa', 'id_siswa')->cascadeOnDelete();
                $table->date('tanggal_daftar')->nullable();
                $table->string('status_approval', 30)->default('Menunggu');
                $table->string('val_nama_siswa', 20)->nullable();
                $table->string('val_nama_ibu', 20)->nullable();
                $table->string('val_nama_ayah', 20)->nullable();
                $table->string('val_umur', 20)->nullable();
                $table->string('val_akta', 20)->nullable();
                $table->string('val_kk', 20)->nullable();
                $table->string('val_rapor', 20)->nullable();
                $table->string('val_foto', 20)->nullable();
            });
        }

        if (! Schema::hasTable('jadwal_latihan')) {
            Schema::create('jadwal_latihan', function (Blueprint $table) {
                $table->id('id_jadwal');
                $table->foreignId('id_pelatih')->nullable()->constrained('pelatih', 'id_pelatih')->nullOnDelete();
                $table->date('tanggal');
                $table->time('jam_mulai')->nullable();
                $table->time('jam_selesai')->nullable();
                $table->string('lokasi')->nullable();
            });
        }

        if (! Schema::hasTable('jadwal_siswa')) {
            Schema::create('jadwal_siswa', function (Blueprint $table) {
                $table->foreignId('id_jadwal')->constrained('jadwal_latihan', 'id_jadwal')->cascadeOnDelete();
                $table->foreignId('id_siswa')->constrained('siswa', 'id_siswa')->cascadeOnDelete();
                $table->primary(['id_jadwal', 'id_siswa']);
            });
        }

        if (! Schema::hasTable('pembayaran')) {
            Schema::create('pembayaran', function (Blueprint $table) {
                $table->id('id_pembayaran');
                $table->foreignId('id_siswa')->constrained('siswa', 'id_siswa')->cascadeOnDelete();
                $table->string('periode')->nullable();
                $table->decimal('jumlah', 12, 2)->default(0);
                $table->date('tanggal_bayar')->nullable();
                $table->string('status', 30)->default('Belum');
                $table->string('jenis', 30);
            });
        }

        if (! Schema::hasTable('bukti_pembayaran')) {
            Schema::create('bukti_pembayaran', function (Blueprint $table) {
                $table->id('id_bukti_pembayaran');
                $table->foreignId('id_pembayaran')->constrained('pembayaran', 'id_pembayaran')->cascadeOnDelete();
                $table->foreignId('id_siswa')->constrained('siswa', 'id_siswa')->cascadeOnDelete();
                $table->string('periode')->nullable();
                $table->date('tanggal_bukti_bayar')->nullable();
                $table->string('status', 30)->default('Menunggu validasi');
                $table->string('bukti_bayar')->nullable();
            });
        }

        if (! Schema::hasTable('presensi')) {
            Schema::create('presensi', function (Blueprint $table) {
                $table->id('id_presensi');
                $table->foreignId('id_siswa')->constrained('siswa', 'id_siswa')->cascadeOnDelete();
                $table->foreignId('id_jadwal')->nullable()->constrained('jadwal_latihan', 'id_jadwal')->nullOnDelete();
                $table->foreignId('id_pelatih')->nullable()->constrained('pelatih', 'id_pelatih')->nullOnDelete();
                $table->string('status_kehadiran', 20);
                $table->timestamps();
                $table->unique(['id_siswa', 'id_jadwal']);
            });
        }

        if (! Schema::hasTable('performa_siswa')) {
            Schema::create('performa_siswa', function (Blueprint $table) {
                $table->id('id_performa');
                $table->foreignId('id_siswa')->constrained('siswa', 'id_siswa')->cascadeOnDelete();
                $table->foreignId('id_jadwal')->nullable()->constrained('jadwal_latihan', 'id_jadwal')->nullOnDelete();
                $table->foreignId('id_pelatih')->nullable()->constrained('pelatih', 'id_pelatih')->nullOnDelete();
                $table->date('tanggal_penilaian')->nullable();
                $table->unsignedTinyInteger('dribbling')->default(0);
                $table->unsignedTinyInteger('passing')->default(0);
                $table->unsignedTinyInteger('shooting')->default(0);
                $table->decimal('rata_rata', 5, 2)->nullable();
                $table->string('keterangan')->nullable();
            });
        }

        if (! Schema::hasTable('catatan_pelatih')) {
            Schema::create('catatan_pelatih', function (Blueprint $table) {
                $table->id('id_catatan');
                $table->foreignId('id_siswa')->constrained('siswa', 'id_siswa')->cascadeOnDelete();
                $table->foreignId('id_pelatih')->nullable()->constrained('pelatih', 'id_pelatih')->nullOnDelete();
                $table->text('catatan');
                $table->date('tanggal_catatan')->nullable();
            });
        }

        if (! Schema::hasTable('master_badge')) {
            Schema::create('master_badge', function (Blueprint $table) {
                $table->id('id_badge');
                $table->string('nama_badge');
                $table->text('deskripsi')->nullable();
                $table->string('icon_badge')->nullable();
            });
        }

        if (! Schema::hasTable('pencapaian')) {
            Schema::create('pencapaian', function (Blueprint $table) {
                $table->id('id_pencapaian');
                $table->foreignId('id_siswa')->constrained('siswa', 'id_siswa')->cascadeOnDelete();
                $table->foreignId('id_badge')->nullable()->constrained('master_badge', 'id_badge')->nullOnDelete();
                $table->string('nama_prestasi')->nullable();
                $table->date('tanggal_diberikan')->nullable();
            });
        }

        if (! Schema::hasTable('promosi')) {
            Schema::create('promosi', function (Blueprint $table) {
                $table->id('id_promosi');
                $table->uuid('group_id')->nullable();
                $table->foreignId('id_siswa')->nullable()->constrained('siswa', 'id_siswa')->cascadeOnDelete();
                $table->foreignId('dibuat_oleh')->nullable()->constrained('admin', 'id_admin')->nullOnDelete();
                $table->string('judul', 100)->nullable();
                $table->text('isi_promosi')->nullable();
                $table->date('tanggal_promosi')->nullable();
                $table->string('foto_promosi')->nullable();
                $table->string('kategori', 30)->nullable();
            });
        }

        if (! Schema::hasTable('notifikasi')) {
            Schema::create('notifikasi', function (Blueprint $table) {
                $table->id('id_notifikasi');
                $table->string('judul')->nullable();
                $table->text('isi')->nullable();
                $table->string('target_role', 30)->nullable();
                $table->dateTime('tanggal_kirim')->nullable();
            });
        }

        if (! Schema::hasTable('notifikasi_terkirim')) {
            Schema::create('notifikasi_terkirim', function (Blueprint $table) {
                $table->id('id_notifikasi_terkirim');
                $table->foreignId('id_notifikasi')->constrained('notifikasi', 'id_notifikasi')->cascadeOnDelete();
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('id_siswa')->nullable()->constrained('siswa', 'id_siswa')->cascadeOnDelete();
                $table->foreignId('id_admin')->nullable()->constrained('admin', 'id_admin')->cascadeOnDelete();
                $table->foreignId('id_pelatih')->nullable()->constrained('pelatih', 'id_pelatih')->cascadeOnDelete();
                $table->string('status_baca', 30)->default('Belum Dibaca');
                $table->dateTime('tanggal_baca')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        foreach ([
            'notifikasi_terkirim',
            'notifikasi',
            'promosi',
            'pencapaian',
            'master_badge',
            'catatan_pelatih',
            'performa_siswa',
            'presensi',
            'bukti_pembayaran',
            'pembayaran',
            'jadwal_siswa',
            'jadwal_latihan',
            'pendaftaran',
            'profil_siswa',
            'siswa',
            'pelatih',
            'orang_tua',
            'admin',
        ] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
