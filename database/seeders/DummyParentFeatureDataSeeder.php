<?php

namespace Database\Seeders;

use App\Models\OrangTua;
use App\Models\Pelatih;
use App\Models\Siswa;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

class DummyParentFeatureDataSeeder extends Seeder
{
    private const EMAIL = 'ortu.u10.01@ssbrumbai.test';
    private const PASSWORD = 'SsbDummy123';

    public function run(): void
    {
        DB::transaction(function () {
            $user = User::updateOrCreate(
                ['email' => self::EMAIL, 'role' => 'orang_tua'],
                [
                    'name' => 'Orang Tua Dummy U-10 01',
                    'password' => Hash::make(self::PASSWORD),
                    'email_verified_at' => now(),
                ]
            );

            $parent = OrangTua::updateOrCreate(
                ['email' => self::EMAIL],
                [
                    'user_id' => $user->id,
                    'nama_ortu' => 'Orang Tua Dummy U-10 01',
                    'password' => self::PASSWORD,
                    'no_hp' => '0899100001',
                ]
            );

            $coach = $this->ensureCoach();
            $this->ensureStudent($user, $parent);

            $students = Siswa::query()
                ->where('user_id', $user->id)
                ->orWhere('id_ortu', $parent->id_ortu)
                ->get();

            foreach ($students as $student) {
                $this->normalizeStudent($student, $user, $parent);
                $student->refresh();

                $this->seedRegistration($student);
                $this->seedSchedulesAndAttendance($student, $coach);
                $this->seedPerformance($student);
                $this->seedCoachNotes($student, $coach);
                $this->seedAchievements($student);
                $this->seedPayments($student);
                $this->seedNotifications($user, $student);
            }
        });
    }

    private function ensureCoach(): Pelatih
    {
        $coachUser = User::updateOrCreate(
            ['email' => 'pelatih.dummy@ssbrumbai.test', 'role' => 'pelatih'],
            [
                'name' => 'Pelatih Dummy',
                'password' => Hash::make(self::PASSWORD),
                'email_verified_at' => now(),
            ]
        );

        return Pelatih::updateOrCreate(
            ['email' => 'pelatih.dummy@ssbrumbai.test'],
            [
                'user_id' => $coachUser->id,
                'nama_pelatih' => 'Pelatih Dummy',
                'no_hp' => '089900000001',
            ]
        );
    }

    private function ensureStudent(User $user, OrangTua $parent): Siswa
    {
        $student = Siswa::updateOrCreate(
            ['nama_siswa' => 'Siswa Dummy U-10 01'],
            [
                'user_id' => $user->id,
                'id_ortu' => $parent->id_ortu,
                'nik' => '1471100000000001',
                'no_kk' => '1472100000000001',
                'nisn' => '1000000001',
                'tempat_lahir' => 'Pekanbaru',
                'tanggal_lahir' => '2016-01-10',
                'nama_ayah' => 'Ayah Dummy U-10 01',
                'nama_ibu' => 'Ibu Dummy U-10 01',
                'umur' => 10,
                'akta_kelahiran' => 'dummy/akta-u10-01.pdf',
                'kartu_keluarga' => 'dummy/kk-u10-01.pdf',
                'rapor' => 'dummy/rapor-u10-01.pdf',
                'pas_photo_3x4' => 'dummy/foto-u10-01.jpg',
                'status' => 'Active',
            ]
        );

        DB::table('profil_siswa')->updateOrInsert(
            ['id_siswa' => $student->id_siswa],
            [
                'id_ortu' => $parent->id_ortu,
                'alamat' => 'Jl. Dummy SSB Rumbai No. 1001',
                'tinggi_badan' => 141,
                'berat_badan' => 32,
                'foto' => null,
            ]
        );

        return $student;
    }

    private function normalizeStudent(Siswa $student, User $user, OrangTua $parent): void
    {
        $student->update([
            'user_id' => $user->id,
            'id_ortu' => $parent->id_ortu,
            'nik' => $student->nik ?: '147110000000' . str_pad((string) $student->id_siswa, 4, '0', STR_PAD_LEFT),
            'no_kk' => $student->no_kk ?: '147210000000' . str_pad((string) $student->id_siswa, 4, '0', STR_PAD_LEFT),
            'nisn' => $student->nisn ?: '10' . str_pad((string) $student->id_siswa, 8, '0', STR_PAD_LEFT),
            'tempat_lahir' => $student->tempat_lahir ?: 'Pekanbaru',
            'tanggal_lahir' => $student->tanggal_lahir ?: '2016-01-10',
            'nama_ayah' => $student->nama_ayah ?: 'Ayah Dummy U-10 01',
            'nama_ibu' => $student->nama_ibu ?: 'Ibu Dummy U-10 01',
            'umur' => $student->umur ?: 10,
            'akta_kelahiran' => $student->akta_kelahiran ?: 'dummy/akta-' . $student->id_siswa . '.pdf',
            'kartu_keluarga' => $student->kartu_keluarga ?: 'dummy/kk-' . $student->id_siswa . '.pdf',
            'rapor' => $student->rapor ?: 'dummy/rapor-' . $student->id_siswa . '.pdf',
            'pas_photo_3x4' => $student->pas_photo_3x4 ?: 'dummy/foto-' . $student->id_siswa . '.jpg',
            'status' => 'Active',
        ]);

        DB::table('profil_siswa')->updateOrInsert(
            ['id_siswa' => $student->id_siswa],
            [
                'id_ortu' => $parent->id_ortu,
                'alamat' => 'Jl. Dummy SSB Rumbai No. ' . $student->id_siswa,
                'tinggi_badan' => 141,
                'berat_badan' => 32,
                'foto' => null,
            ]
        );
    }

    private function seedRegistration(Siswa $student): void
    {
        DB::table('pendaftaran')->updateOrInsert(
            ['id_siswa' => $student->id_siswa],
            [
                'tanggal_daftar' => Carbon::today()->subMonths(4)->toDateString(),
                'status_approval' => 'Disetujui',
                'val_nama_siswa' => 'valid',
                'val_nama_ibu' => 'valid',
                'val_nama_ayah' => 'valid',
                'val_umur' => 'valid',
                'val_akta' => 'valid',
                'val_kk' => 'valid',
                'val_rapor' => 'valid',
                'val_foto' => 'valid',
            ]
        );
    }

    private function seedSchedulesAndAttendance(Siswa $student, Pelatih $coach): void
    {
        $statuses = ['Hadir', 'Hadir', 'Izin', 'Hadir', 'Sakit', 'Hadir', 'Hadir', 'Hadir'];

        foreach ($statuses as $index => $status) {
            $date = Carbon::today()->subWeeks(7 - $index)->next(Carbon::SATURDAY);
            $scheduleAttrs = [
                'tanggal' => $date->toDateString(),
                'jam_mulai' => '15:30:00',
                'lokasi' => 'Lapangan SSB Rumbai - U-10',
            ];
            $scheduleValues = [
                'jam_selesai' => '17:00:00',
                'id_pelatih' => $coach->id_pelatih,
            ];

            if (Schema::hasColumn('jadwal_latihan', 'kategori_umur')) {
                $scheduleValues['kategori_umur'] = 'u10';
            }

            DB::table('jadwal_latihan')->updateOrInsert($scheduleAttrs, $scheduleValues);

            $schedule = DB::table('jadwal_latihan')
                ->where($scheduleAttrs)
                ->first();

            if (! $schedule) {
                continue;
            }

            DB::table('jadwal_siswa')->updateOrInsert([
                'id_jadwal' => $schedule->id_jadwal,
                'id_siswa' => $student->id_siswa,
            ]);

            DB::table('presensi')->updateOrInsert(
                [
                    'id_siswa' => $student->id_siswa,
                    'id_jadwal' => $schedule->id_jadwal,
                ],
                [
                    'id_pelatih' => $coach->id_pelatih,
                    'status_kehadiran' => $status,
                    'created_at' => $date->copy()->setTime(17, 5),
                    'updated_at' => $date->copy()->setTime(17, 5),
                ]
            );
        }
    }

    private function seedPerformance(Siswa $student): void
    {
        $rows = [
            [-5, 72, 75, 70, 'Mulai konsisten mengikuti instruksi dasar.'],
            [-4, 76, 78, 74, 'Kontrol bola makin rapi saat latihan kecil.'],
            [-3, 80, 81, 77, 'Passing pendek lebih akurat dan cepat.'],
            [-2, 83, 84, 80, 'Berani mengambil keputusan saat game internal.'],
            [-1, 86, 85, 83, 'Finishing meningkat, tetap jaga posisi badan.'],
            [0, 88, 87, 85, 'Performa stabil dan aktif membantu transisi tim.'],
        ];

        foreach ($rows as [$monthOffset, $dribbling, $passing, $shooting, $note]) {
            $date = Carbon::today()->addMonths($monthOffset)->day(15);
            $keys = [
                'id_siswa' => $student->id_siswa,
                'tanggal_penilaian' => $date->toDateString(),
            ];
            $values = array_filter([
                    'dribbling' => $dribbling,
                    'passing' => $passing,
                    'shooting' => $shooting,
                    'rata_rata' => Schema::hasColumn('performa_siswa', 'rata_rata')
                        ? round(($dribbling + $passing + $shooting) / 3, 2)
                        : null,
                    'keterangan' => Schema::hasColumn('performa_siswa', 'keterangan') ? $note : null,
                ], fn ($value) => $value !== null);

            $existingId = DB::table('performa_siswa')->where($keys)->value('id_performa');

            if ($existingId) {
                DB::table('performa_siswa')->where('id_performa', $existingId)->update($values);
                continue;
            }

            DB::table('performa_siswa')->insert(array_merge(
                ['id_performa' => $this->nextId('performa_siswa', 'id_performa')],
                $keys,
                $values
            ));
        }
    }

    private function nextId(string $table, string $column): int
    {
        return ((int) DB::table($table)->lockForUpdate()->orderByDesc($column)->value($column)) + 1;
    }

    private function seedCoachNotes(Siswa $student, Pelatih $coach): void
    {
        $notes = [
            [-21, 'Anak sudah lebih percaya diri saat membawa bola. Latihan kontrol sentuhan pertama perlu dilanjutkan.'],
            [-10, 'Passing ke rekan mulai lebih terarah. Dorong anak untuk tetap komunikasi saat bermain.'],
            [-2, 'Stamina dan fokus latihan bagus. Target berikutnya mempercepat pengambilan keputusan di area depan.'],
        ];

        foreach ($notes as [$daysAgo, $note]) {
            DB::table('catatan_pelatih')->updateOrInsert(
                [
                    'id_siswa' => $student->id_siswa,
                    'tanggal_catatan' => Carbon::today()->subDays(abs($daysAgo))->toDateString(),
                ],
                [
                    'id_pelatih' => $coach->id_pelatih,
                    'catatan' => $note,
                ]
            );
        }
    }

    private function seedAchievements(Siswa $student): void
    {
        $badges = [
            ['Pemain Disiplin', 'Hadir dan mengikuti instruksi latihan dengan baik.', 'badge-discipline'],
            ['Passing Terbaik', 'Akurasi passing meningkat pada sesi latihan mingguan.', 'badge-passing'],
            ['Semangat Latihan', 'Menunjukkan antusiasme tinggi dalam game internal.', 'badge-spirit'],
        ];

        foreach ($badges as [$name, $description, $icon]) {
            DB::table('master_badge')->updateOrInsert(
                ['nama_badge' => $name],
                ['deskripsi' => $description, 'icon_badge' => $icon]
            );
        }

        $achievements = [
            ['Pemain Disiplin', Carbon::today()->subMonths(2)->day(20)->toDateString()],
            ['Passing Terbaik', Carbon::today()->subMonth()->day(18)->toDateString()],
            ['Semangat Latihan', Carbon::today()->day(5)->toDateString()],
        ];

        foreach ($achievements as [$name, $date]) {
            $badgeId = DB::table('master_badge')->where('nama_badge', $name)->value('id_badge');

            DB::table('pencapaian')->updateOrInsert(
                [
                    'id_siswa' => $student->id_siswa,
                    'nama_prestasi' => $name,
                ],
                [
                    'id_badge' => $badgeId,
                    'tanggal_diberikan' => $date,
                ]
            );
        }
    }

    private function seedPayments(Siswa $student): void
    {
        $payments = [
            ['Pendaftaran', 'Pendaftaran', 280000, Carbon::today()->subMonths(4)->day(8), 'Lunas', 'diterima'],
            ['Bulanan', Carbon::today()->subMonths(2)->format('F Y'), 150000, Carbon::today()->subMonths(2)->day(10), 'Lunas', 'diterima'],
            ['Bulanan', Carbon::today()->subMonth()->format('F Y'), 150000, Carbon::today()->subMonth()->day(10), 'Lunas', 'diterima'],
            ['Bulanan', Carbon::today()->format('F Y'), 150000, Carbon::today()->day(6), 'Belum', 'Menunggu validasi'],
        ];

        foreach ($payments as [$type, $period, $amount, $date, $paymentStatus, $proofStatus]) {
            DB::table('pembayaran')->updateOrInsert(
                [
                    'id_siswa' => $student->id_siswa,
                    'jenis' => $type,
                    'periode' => $period,
                ],
                [
                    'jumlah' => $amount,
                    'tanggal_bayar' => $date->toDateString(),
                    'status' => $paymentStatus,
                ]
            );

            $payment = DB::table('pembayaran')
                ->where('id_siswa', $student->id_siswa)
                ->where('jenis', $type)
                ->where('periode', $period)
                ->first();

            if (! $payment) {
                continue;
            }

            DB::table('bukti_pembayaran')->updateOrInsert(
                [
                    'id_pembayaran' => $payment->id_pembayaran,
                    'id_siswa' => $student->id_siswa,
                ],
                [
                    'periode' => $period,
                    'tanggal_bukti_bayar' => $date->toDateString(),
                    'status' => $proofStatus,
                    'bukti_bayar' => 'bukti/dummy-' . $student->id_siswa . '-' . strtolower($type) . '-' . str_replace(' ', '-', strtolower($period)) . '.jpg',
                ]
            );
        }
    }

    private function seedNotifications(User $user, Siswa $student): void
    {
        $notifications = [
            ['Pembayaran', 'Pembayaran bulan ini sedang menunggu validasi admin.', 4, 'Belum Dibaca'],
            ['Catatan Pelatih', 'Pelatih menambahkan catatan latihan terbaru untuk Siswa Dummy U-10 01.', 2, 'Belum Dibaca'],
            ['Prestasi', 'Selamat, anak Anda mendapatkan badge Semangat Latihan.', 1, 'Sudah Dibaca'],
        ];

        foreach ($notifications as [$title, $body, $daysAgo, $readStatus]) {
            DB::table('notifikasi')->updateOrInsert(
                [
                    'judul' => $title,
                    'isi' => $body,
                    'target_role' => 'orang_tua',
                ],
                [
                    'tanggal_kirim' => Carbon::now()->subDays($daysAgo),
                ]
            );

            $notificationId = DB::table('notifikasi')
                ->where('judul', $title)
                ->where('isi', $body)
                ->where('target_role', 'orang_tua')
                ->value('id_notifikasi');

            if (! $notificationId) {
                continue;
            }

            DB::table('notifikasi_terkirim')->updateOrInsert(
                [
                    'id_notifikasi' => $notificationId,
                    'user_id' => $user->id,
                    'id_siswa' => $student->id_siswa,
                ],
                [
                    'id_admin' => null,
                    'id_pelatih' => null,
                    'status_baca' => $readStatus,
                    'tanggal_baca' => $readStatus === 'Sudah Dibaca' ? Carbon::now()->subHours(6) : null,
                    'created_at' => Carbon::now()->subDays($daysAgo),
                    'updated_at' => Carbon::now()->subDays($daysAgo),
                ]
            );
        }
    }
}
