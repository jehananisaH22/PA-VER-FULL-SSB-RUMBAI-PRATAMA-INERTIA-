<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Jadwal_Latihan;
use App\Models\OrangTua;
use App\Models\Pelatih;
use App\Models\Siswa;
use App\Models\User;
use App\Support\SsbInertiaData;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AdminToParentCoachFlowTest extends TestCase
{
    private function createAdminParentCoachData(): array
    {
        $adminUser = User::factory()->create([
            'role' => 'admin',
            'name' => 'Admin Test',
            'email' => 'admin-flow@example.com',
        ]);
        $admin = Admin::create([
            'user_id' => $adminUser->id,
            'nama_admin' => 'Admin Test',
            'email' => $adminUser->email,
            'password' => $adminUser->password,
        ]);

        $coachUser = User::factory()->create([
            'role' => 'pelatih',
            'name' => 'Pelatih Flow',
            'email' => 'coach-flow@example.com',
        ]);
        $pelatih = Pelatih::create([
            'user_id' => $coachUser->id,
            'nama_pelatih' => 'Pelatih Flow',
            'email' => $coachUser->email,
            'no_hp' => '081100000001',
        ]);

        $parentUser = User::factory()->create([
            'role' => 'orang_tua',
            'name' => 'Ortu Flow',
            'email' => 'ortu-flow@example.com',
        ]);
        $orangTua = OrangTua::create([
            'user_id' => $parentUser->id,
            'nama_ortu' => 'Ortu Flow',
            'email' => $parentUser->email,
            'password' => $parentUser->password,
            'no_hp' => '081100000002',
        ]);
        $siswa = Siswa::create([
            'user_id' => $parentUser->id, // DIUBAH: Dihubungkan langsung ke parentUser->id
            'id_ortu' => $orangTua->id_ortu,
            'nama_siswa' => 'Siswa Flow',
            'nama_ayah' => 'Ayah',
            'nama_ibu' => 'Ibu',
            'umur' => 10,
            'status' => 'Active',
        ]);

        return compact('adminUser', 'admin', 'coachUser', 'pelatih', 'parentUser', 'siswa');
    }

    public function test_admin_schedule_and_achievement_reach_parent_and_coach_payloads(): void
    {
        [
            'adminUser' => $adminUser,
            'coachUser' => $coachUser,
            'pelatih' => $pelatih,
            'parentUser' => $parentUser,
            'siswa' => $siswa,
        ] = $this->createAdminParentCoachData();

        $scheduleResponse = $this->actingAs($adminUser)
            ->postJson('/api/admin/tambah-jadwal', [
                'tanggal' => '2026-06-04', 
                'jam_mulai' => '15:00:00',
                'jam_selesai' => '16:30:00',
                'lokasi' => 'Lapangan Admin Flow',
                'kategori_umur' => 'u10',
                'id_pelatih' => $pelatih->id_pelatih,
                'id_siswa' => [$siswa->id_siswa],
            ])
            ->assertOk()
            ->assertJsonPath('status', true);

        $scheduleId = $scheduleResponse->json('data.id_jadwal');

        $this->actingAs($adminUser)
            ->postJson('/api/admin/prestasi/tambah-prestasi', [
                'id_siswa' => [$siswa->id_siswa],
                'nama_prestasi' => 'Juara Admin Flow',
                'tanggal_diberikan' => '2026-06-05',
            ])
            ->assertCreated()
            ->assertJsonPath('success', true);

        $this->actingAs($parentUser);
        session(['id_siswa' => $siswa->id_siswa]);
        $parentPayload = SsbInertiaData::parentPayload();
        $parentSchedule = collect($parentPayload['trainingSchedules'])->firstWhere('rawId', $scheduleId);

        $this->assertNotNull($parentSchedule);
        $this->assertSame('Lapangan Admin Flow', $parentSchedule['place']);
        $this->assertSame('15.00-16.30 WIB', $parentSchedule['time']);
        $this->assertSame('u10', $parentSchedule['category']);
        $this->assertSame([$siswa->nama_siswa], $parentSchedule['studentNames']);
        $this->assertTrue(
            collect($parentPayload['achievements'])->contains(
                fn ($achievement) => $achievement['title'] === 'Juara Admin Flow'
            )
        );

        $this->actingAs($coachUser);
        $coachSchedules = SsbInertiaData::schedules(null, true, $pelatih->id_pelatih);
        $coachSchedule = collect($coachSchedules)->firstWhere('rawId', $scheduleId);

        $this->assertNotNull($coachSchedule);
        $this->assertSame($parentSchedule['place'], $coachSchedule['place']);
        $this->assertSame($parentSchedule['time'], $coachSchedule['time']);
        $this->assertSame($parentSchedule['category'], $coachSchedule['category']);
        $this->assertSame($parentSchedule['studentNames'], $coachSchedule['studentNames']);
    }

    public function test_updated_admin_schedule_syncs_to_parent_and_coach_payloads(): void
    {
        [
            'adminUser' => $adminUser,
            'coachUser' => $coachUser,
            'pelatih' => $pelatih,
            'parentUser' => $parentUser,
            'siswa' => $siswa,
        ] = $this->createAdminParentCoachData();

        $scheduleId = $this->actingAs($adminUser)
            ->postJson('/api/admin/tambah-jadwal', [
                'tanggal' => '2026-06-01', 
                'jam_mulai' => '07:30:00',
                'jam_selesai' => '09:30:00',
                'lokasi' => 'Lapangan Lama',
                'kategori_umur' => 'u10',
                'id_pelatih' => $pelatih->id_pelatih,
                'id_siswa' => [$siswa->id_siswa],
            ])
            ->assertOk()
            ->json('data.id_jadwal');

        $this->actingAs($adminUser)
            ->putJson("/api/admin/jadwal-latihan/{$scheduleId}", [
                'tanggal' => '2026-06-04', 
                'jam_mulai' => '16:30:00',
                'jam_selesai' => '17:30:00',
                'lokasi' => "Lapangan Mesjid Da'wah Rumbai",
                'kategori_umur' => 'u10',
                'id_pelatih' => $pelatih->id_pelatih,
                'id_siswa' => [$siswa->id_siswa],
            ])
            ->assertOk()
            ->assertJsonPath('status', true);

        $this->actingAs($parentUser);
        session(['id_siswa' => $siswa->id_siswa]);
        $parentSchedule = collect(SsbInertiaData::parentPayload()['trainingSchedules'])
            ->firstWhere('rawId', $scheduleId);

        $this->actingAs($coachUser);
        $coachSchedule = collect(SsbInertiaData::schedules(null, true, $pelatih->id_pelatih))
            ->firstWhere('rawId', $scheduleId);

        $this->assertNotNull($parentSchedule);
        $this->assertNotNull($coachSchedule);
        $this->assertSame('Kamis', $parentSchedule['day']);
        $this->assertSame('2026-06-04', $parentSchedule['date']);
        $this->assertSame('16.30-17.30 WIB', $parentSchedule['time']);
        $this->assertSame("Lapangan Mesjid Da'wah Rumbai", $parentSchedule['place']);
        $this->assertSame($parentSchedule['day'], $coachSchedule['day']);
        $this->assertSame($parentSchedule['date'], $coachSchedule['date']);
        $this->assertSame($parentSchedule['time'], $coachSchedule['time']);
        $this->assertSame($parentSchedule['place'], $coachSchedule['place']);
    }

    public function test_schedule_payload_category_reflects_selected_students_only(): void
    {
        [
            'adminUser' => $adminUser,
            'pelatih' => $pelatih,
            'parentUser' => $parentUser,
            'siswa' => $u10Student,
        ] = $this->createAdminParentCoachData();

        $u11Student = Siswa::create([
            'user_id' => $parentUser->id, // DIUBAH
            'id_ortu' => $u10Student->id_ortu,
            'nama_siswa' => 'Siswa U11 Flow',
            'nama_ayah' => 'Ayah',
            'nama_ibu' => 'Ibu',
            'umur' => 11,
            'status' => 'Active',
        ]);

        $u12Student = Siswa::create([
            'user_id' => $parentUser->id, // DIUBAH
            'id_ortu' => $u10Student->id_ortu,
            'nama_siswa' => 'Siswa U12 Flow',
            'nama_ayah' => 'Ayah',
            'nama_ibu' => 'Ibu',
            'umur' => 12,
            'status' => 'Active',
        ]);

        $u11ScheduleResponse = $this->actingAs($adminUser)
            ->postJson('/api/admin/tambah-jadwal', [
                'tanggal' => '2026-06-04', 
                'jam_mulai' => '16:00:00',
                'jam_selesai' => '17:30:00',
                'lokasi' => 'Lapangan U11',
                'id_pelatih' => $pelatih->id_pelatih,
                'id_siswa' => [$u11Student->id_siswa],
            ])
            ->assertOk()
            ->json('data.id_jadwal');

        $mixedScheduleResponse = $this->actingAs($adminUser)
            ->postJson('/api/admin/tambah-jadwal', [
                'tanggal' => '2026-06-08', 
                'jam_mulai' => '16:00:00',
                'jam_selesai' => '17:30:00',
                'lokasi' => 'Lapangan Semua',
                'id_pelatih' => $pelatih->id_pelatih,
                'id_siswa' => [$u10Student->id_siswa, $u11Student->id_siswa, $u12Student->id_siswa],
            ])
            ->assertOk()
            ->json('data.id_jadwal');

        $explicitAllScheduleResponse = $this->actingAs($adminUser)
            ->postJson('/api/admin/tambah-jadwal', [
                'tanggal' => '2026-06-09', 
                'jam_mulai' => '16:00:00',
                'jam_selesai' => '17:30:00',
                'lokasi' => 'Lapangan Semua Eksplisit',
                'kategori_umur' => 'all',
                'id_siswa' => [$u11Student->id_siswa],
            ])
            ->assertOk()
            ->json('data.id_jadwal');

        $schedules = collect(SsbInertiaData::schedules());
        $u11Schedule = $schedules->firstWhere('rawId', $u11ScheduleResponse);
        $mixedSchedule = $schedules->firstWhere('rawId', $mixedScheduleResponse);
        $explicitAllSchedule = $schedules->firstWhere('rawId', $explicitAllScheduleResponse);

        $this->assertSame('u11', $u11Schedule['category']);
        $this->assertSame([$u11Student->nama_siswa], $u11Schedule['studentNames']);
        $this->assertSame('all', $mixedSchedule['category']);
        $this->assertSame('all', $explicitAllSchedule['category']);
        $this->assertEqualsCanonicalizing(
            [$u10Student->nama_siswa, $u11Student->nama_siswa, $u12Student->nama_siswa],
            $mixedSchedule['studentNames']
        );
    }

    public function test_admin_schedule_rejects_students_outside_selected_category(): void
    {
        [
            'adminUser' => $adminUser,
            'pelatih' => $pelatih,
            'parentUser' => $parentUser,
            'siswa' => $u10Student,
        ] = $this->createAdminParentCoachData();

        $u11Student = Siswa::create([
            'user_id' => $parentUser->id,
            'id_ortu' => $u10Student->id_ortu,
            'nama_siswa' => 'Siswa U11 Guard',
            'nama_ayah' => 'Ayah',
            'nama_ibu' => 'Ibu',
            'umur' => 11,
            'status' => 'Active',
        ]);

        $this->actingAs($adminUser)
            ->postJson('/api/admin/tambah-jadwal', [
                'tanggal' => '2026-06-01', 
                'jam_mulai' => '16:00:00',
                'jam_selesai' => '17:30:00',
                'lokasi' => 'Lapangan Guard',
                'id_pelatih' => $pelatih->id_pelatih,
                'kategori_umur' => 'u11',
                'id_siswa' => [$u10Student->id_siswa, $u11Student->id_siswa],
            ])
            ->assertStatus(422)
            ->assertJsonPath('status', false);

        $validScheduleId = $this->actingAs($adminUser)
            ->postJson('/api/admin/tambah-jadwal', [
                'tanggal' => '2026-06-02', 
                'jam_mulai' => '16:00:00',
                'jam_selesai' => '17:30:00',
                'lokasi' => 'Lapangan Guard Valid',
                'id_pelatih' => $pelatih->id_pelatih,
                'kategori_umur' => 'u11',
                'id_siswa' => [$u11Student->id_siswa],
            ])
            ->assertOk()
            ->json('data.id_jadwal');

        $this->actingAs($adminUser)
            ->putJson("/api/admin/jadwal-latihan/{$validScheduleId}", [
                'tanggal' => '2026-06-02',
                'jam_mulai' => '16:00:00',
                'jam_selesai' => '17:30:00',
                'lokasi' => 'Lapangan Guard Valid',
                'id_pelatih' => $pelatih->id_pelatih,
                'kategori_umur' => 'u11',
                'id_siswa' => [$u10Student->id_siswa],
            ])
            ->assertStatus(422)
            ->assertJsonPath('status', false);

        $this->assertDatabaseHas('jadwal_siswa', [
            'id_jadwal' => $validScheduleId,
            'id_siswa' => $u11Student->id_siswa,
        ]);
        $this->assertDatabaseMissing('jadwal_siswa', [
            'id_jadwal' => $validScheduleId,
            'id_siswa' => $u10Student->id_siswa,
        ]);
    }

    public function test_admin_notifications_reach_parent_and_coach_payloads(): void
    {
        [
            'adminUser' => $adminUser,
            'coachUser' => $coachUser,
            'pelatih' => $pelatih,
            'parentUser' => $parentUser,
            'siswa' => $siswa,
        ] = $this->createAdminParentCoachData();

        $this->actingAs($adminUser)
            ->postJson('/api/notifikasi/kirim', [
                'judul' => 'Info Pelatih',
                'isi' => 'Jadwal admin untuk pelatih.',
                'target_role' => 'pelatih',
                'id_pelatih' => [$pelatih->id_pelatih],
            ])
            ->assertOk()
            ->assertJsonPath('status', true)
            ->assertJsonPath('jumlah_penerima', 1);

        $coachNotifications = SsbInertiaData::coachNotifications($coachUser->id);

        $this->assertTrue(
            collect($coachNotifications)->contains(
                fn ($notification) => str_contains($notification['text'], 'Info Pelatih')
            )
        );

        $this->actingAs($adminUser)
            ->postJson('/api/notifikasi/kirim', [
                'judul' => 'Info Semua',
                'isi' => 'Pesan admin untuk semua.',
                'target_role' => 'semua',
            ])
            ->assertOk()
            ->assertJsonPath('status', true);

        $this->actingAs($parentUser);
        session(['id_siswa' => $siswa->id_siswa]);
        $parentPayload = SsbInertiaData::parentPayload();

        $this->assertTrue(
            collect($parentPayload['notifications'])->contains(
                fn ($notification) => str_contains($notification['text'], 'Info Semua')
            )
        );

        $this->assertDatabaseHas('notifikasi_terkirim', [
            'user_id' => $parentUser->id,
            'id_siswa' => $siswa->id_siswa,
        ]);
    }

    public function test_admin_student_target_notification_uses_parent_user_when_student_user_is_empty(): void
    {
        [
            'adminUser' => $adminUser,
            'parentUser' => $parentUser,
            'siswa' => $siswa,
        ] = $this->createAdminParentCoachData();

        $this->actingAs($adminUser)
            ->postJson('/api/notifikasi/kirim', [
                'judul' => 'Info Siswa',
                'isi' => 'Pesan admin untuk siswa tertentu.',
                'target_role' => 'siswa',
                'id_siswa' => [$siswa->id_siswa],
            ])
            ->assertOk()
            ->assertJsonPath('status', true)
            ->assertJsonPath('jumlah_penerima', 1);

        $this->assertDatabaseHas('notifikasi_terkirim', [
            'user_id' => $parentUser->id,
            'id_siswa' => $siswa->id_siswa,
        ]);

        $this->actingAs($parentUser)
            ->getJson('/api/notifikasi')
            ->assertOk()
            ->assertJsonPath('status', true)
            ->assertJsonPath('count', 1)
            ->assertJsonPath('data.0.judul', 'Info Siswa');
    }
}