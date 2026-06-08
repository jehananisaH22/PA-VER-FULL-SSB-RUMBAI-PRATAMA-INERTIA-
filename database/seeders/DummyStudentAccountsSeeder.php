<?php

namespace Database\Seeders;

use App\Models\Jadwal_Latihan;
use App\Models\OrangTua;
use App\Models\Pelatih;
use App\Models\Siswa;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DummyStudentAccountsSeeder extends Seeder
{
    private const PASSWORD = 'SsbDummy123';

    public function run(): void
    {
        DB::transaction(function () {
            $coach = $this->ensureCoach();
            $studentsByCategory = [];

            foreach ($this->dummyStudents() as $item) {
                $user = User::updateOrCreate(
                    ['email' => $item['email'], 'role' => 'orang_tua'],
                    [
                        'name' => $item['parent_name'],
                        'password' => self::PASSWORD,
                        'email_verified_at' => now(),
                    ]
                );

                $parent = OrangTua::updateOrCreate(
                    ['email' => $item['email']],
                    [
                        'user_id' => $user->id,
                        'nama_ortu' => $item['parent_name'],
                        'password' => self::PASSWORD,
                        'no_hp' => $item['phone'],
                    ]
                );

                $student = Siswa::updateOrCreate(
                    ['nama_siswa' => $item['student_name']],
                    [
                        'user_id' => $user->id,
                        'id_ortu' => $parent->id_ortu,
                        'nik' => $item['nik'],
                        'no_kk' => $item['family_number'],
                        'nisn' => $item['nisn'],
                        'tempat_lahir' => 'Pekanbaru',
                        'tanggal_lahir' => $item['birth_date'],
                        'nama_ayah' => $item['father_name'],
                        'nama_ibu' => $item['mother_name'],
                        'umur' => $item['age'],
                        'status' => 'Active',
                    ]
                );

                DB::table('profil_siswa')->updateOrInsert(
                    ['id_siswa' => $student->id_siswa],
                    [
                        'id_ortu' => $parent->id_ortu,
                        'alamat' => 'Jl. Dummy SSB Rumbai No. ' . $item['number'],
                        'tinggi_badan' => $item['height'],
                        'berat_badan' => $item['weight'],
                        'foto' => null,
                    ]
                );

                DB::table('pendaftaran')->updateOrInsert(
                    ['id_siswa' => $student->id_siswa],
                    [
                        'tanggal_daftar' => now()->toDateString(),
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

                $studentsByCategory[$item['category']][] = $student->id_siswa;
            }

            $this->ensureSchedules($coach, $studentsByCategory);
        });
    }

    private function ensureCoach(): Pelatih
    {
        $user = User::updateOrCreate(
            ['email' => 'pelatih.dummy@ssbrumbai.test', 'role' => 'pelatih'],
            [
                'name' => 'Pelatih Dummy',
                'password' => self::PASSWORD,
                'email_verified_at' => now(),
            ]
        );

        return Pelatih::updateOrCreate(
            ['email' => 'pelatih.dummy@ssbrumbai.test'],
            [
                'user_id' => $user->id,
                'nama_pelatih' => 'Pelatih Dummy',
                'no_hp' => '089900000001',
            ]
        );
    }

    private function ensureSchedules(Pelatih $coach, array $studentsByCategory): void
    {
        $scheduleMap = [
            'U-10' => ['offset' => 1, 'start' => '15:30:00', 'end' => '17:00:00'],
            'U-11' => ['offset' => 2, 'start' => '15:30:00', 'end' => '17:00:00'],
            'U-12' => ['offset' => 3, 'start' => '15:30:00', 'end' => '17:00:00'],
        ];

        foreach ($scheduleMap as $category => $meta) {
            $schedule = Jadwal_Latihan::updateOrCreate(
                [
                    'tanggal' => Carbon::today()->addDays($meta['offset'])->toDateString(),
                    'jam_mulai' => $meta['start'],
                    'lokasi' => 'Lapangan SSB Rumbai - ' . $category,
                ],
                [
                    'jam_selesai' => $meta['end'],
                    'id_pelatih' => $coach->id_pelatih,
                ]
            );

            $schedule->siswa()->sync($studentsByCategory[$category] ?? []);
        }
    }

    private function dummyStudents(): array
    {
        $rows = [];
        $categories = [
            'U-10' => ['age' => 10, 'year' => 2016],
            'U-11' => ['age' => 11, 'year' => 2015],
            'U-12' => ['age' => 12, 'year' => 2014],
        ];

        foreach ($categories as $category => $meta) {
            $categoryNumber = (int) str_replace('U-', '', $category);

            for ($index = 1; $index <= 10; $index++) {
                $number = ($categoryNumber * 100) + $index;
                $rows[] = [
                    'category' => $category,
                    'number' => $number,
                    'student_name' => sprintf('Siswa Dummy %s %02d', $category, $index),
                    'parent_name' => sprintf('Orang Tua Dummy %s %02d', $category, $index),
                    'father_name' => sprintf('Ayah Dummy %s %02d', $category, $index),
                    'mother_name' => sprintf('Ibu Dummy %s %02d', $category, $index),
                    'email' => sprintf('ortu.u%d.%02d@ssbrumbai.test', $categoryNumber, $index),
                    'phone' => sprintf('0899%02d%04d', $categoryNumber, $index),
                    'nik' => sprintf('1471%02d%010d', $categoryNumber, $index),
                    'family_number' => sprintf('1472%02d%010d', $categoryNumber, $index),
                    'nisn' => sprintf('%02d%08d', $categoryNumber, $index),
                    'birth_date' => Carbon::create($meta['year'], min($index, 12), 10)->toDateString(),
                    'age' => $meta['age'],
                    'height' => 130 + $categoryNumber + $index,
                    'weight' => 28 + $index,
                ];
            }
        }

        return $rows;
    }
}
