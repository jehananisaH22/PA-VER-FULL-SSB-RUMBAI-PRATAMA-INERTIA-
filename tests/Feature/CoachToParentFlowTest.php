<?php

namespace Tests\Feature;

use App\Models\Jadwal_Latihan;
use App\Models\Admin;
use App\Models\OrangTua;
use App\Models\Pelatih;
use App\Models\Siswa;
use App\Models\User;
use App\Support\SsbInertiaData;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CoachToParentFlowTest extends TestCase
{
    private function createCoachParentFlowData(): array
    {
        $coachUser = User::factory()->create([
            'role' => 'pelatih',
            'name' => 'Coach Test',
            'email' => 'coach@example.com',
        ]);
        $pelatih = Pelatih::create([
            'user_id' => $coachUser->id,
            'nama_pelatih' => 'Coach Test',
            'email' => $coachUser->email,
            'no_hp' => '081111111111',
        ]);

        $parentUser = User::factory()->create([
            'role' => 'orang_tua',
            'name' => 'Parent Test',
            'email' => 'parent-flow@example.com',
        ]);
        $orangTua = OrangTua::create([
            'user_id' => $parentUser->id,
            'nama_ortu' => 'Parent Test',
            'email' => $parentUser->email,
            'password' => $parentUser->password,
            'no_hp' => '082222222222',
        ]);
        $siswa = Siswa::create([
            'user_id' => $parentUser->id,
            'id_ortu' => $orangTua->id_ortu,
            'nama_siswa' => 'Anak Coach',
            'nama_ayah' => 'Ayah',
            'nama_ibu' => 'Ibu',
            'umur' => 10,
            'status' => 'Active',
        ]);

        $jadwal = Jadwal_Latihan::create([
            'id_pelatih' => $pelatih->id_pelatih,
            'tanggal' => '2026-06-01', 
            'jam_mulai' => '08:00:00',
            'jam_selesai' => '10:00:00',
            'lokasi' => 'Lapangan Test',
        ]);
        DB::table('jadwal_siswa')->insert([
            'id_jadwal' => $jadwal->id_jadwal,
            'id_siswa' => $siswa->id_siswa,
        ]);

        return compact('coachUser', 'pelatih', 'parentUser', 'siswa', 'jadwal');
    }

    public function test_coach_inputs_are_saved_and_visible_to_parent_payload(): void
    {
        Storage::fake('public');

        [
            'coachUser' => $coachUser,
            'parentUser' => $parentUser,
            'siswa' => $siswa,
            'jadwal' => $jadwal,
        ] = $this->createCoachParentFlowData();

        $this->actingAs($coachUser)
            ->postJson('/api/pelatih/presensi/input', [
                'id_jadwal' => $jadwal->id_jadwal,
                'tanggal' => '2026-06-01',
                'data' => [
                    ['id_siswa' => $siswa->id_siswa, 'status' => 'hadir'],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('status', true);

        $this->actingAs($coachUser)
            ->postJson("/api/pelatih/performa-siswa/input/{$jadwal->id_jadwal}", [
                'tanggal_penilaian' => '2026-06-01',
                'data' => [
                    [
                        'id_siswa' => $siswa->id_siswa,
                        'dribbling' => 88,
                        'passing' => 87,
                        'shooting' => 86,
                    ],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('status', true);

        $this->actingAs($coachUser)
            ->postJson('/api/pelatih/catatan-pelatih/tambah', [
                'catatan' => 'Perlu latihan finishing.',
                'data' => [
                    ['id_siswa' => $siswa->id_siswa],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('status', true);

        $this->actingAs($coachUser)
            ->post('/api/pelatih/bukti-pembayaran/tambah', [
                'id_siswa' => $siswa->id_siswa,
                'jenis' => 'Harian',
                'tanggal_bukti_bayar' => '2026-06-01',
                'bukti_bayar' => UploadedFile::fake()->create('bukti.pdf', 20, 'application/pdf'),
            ])
            ->assertCreated()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('presensi', [
            'id_siswa' => $siswa->id_siswa,
            'id_jadwal' => $jadwal->id_jadwal,
            'status_kehadiran' => 'Hadir',
        ]);
        $this->assertDatabaseHas('performa_siswa', [
            'id_siswa' => $siswa->id_siswa,
            'dribbling' => 88,
            'passing' => 87,
            'shooting' => 86,
        ]);
        $this->assertDatabaseHas('catatan_pelatih', [
            'id_siswa' => $siswa->id_siswa,
            'catatan' => 'Perlu latihan finishing.',
        ]);
        $this->assertDatabaseHas('bukti_pembayaran', [
            'id_siswa' => $siswa->id_siswa,
            'status' => 'Menunggu validasi',
        ]);

        $this->actingAs($parentUser);
        session(['id_siswa' => $siswa->id_siswa]);

        $payload = SsbInertiaData::parentPayload();

        $this->assertNotEmpty($payload['attendanceRecaps']);
        $this->assertSame(88, $payload['performanceHistory'][0]['dribbling']);
        $this->assertSame('Perlu latihan finishing.', $payload['coachNotes'][0]['note']);
        $this->assertSame('Menunggu Validasi', $payload['paymentHistory'][0]['status']);
        $this->assertCount(4, $payload['notifications']);
    }

    public function test_coach_alpha_attendance_is_visible_to_parent_payload(): void
    {
        [
            'coachUser' => $coachUser,
            'parentUser' => $parentUser,
            'siswa' => $siswa,
            'jadwal' => $jadwal,
        ] = $this->createCoachParentFlowData();

        $this->actingAs($coachUser)
            ->postJson('/api/pelatih/presensi/input', [
                'id_jadwal' => $jadwal->id_jadwal,
                'tanggal' => '2026-06-01',
                'data' => [
                    ['id_siswa' => $siswa->id_siswa, 'status' => 'alpha'],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('status', true);

        $this->assertDatabaseHas('presensi', [
            'id_siswa' => $siswa->id_siswa,
            'id_jadwal' => $jadwal->id_jadwal,
            'status_kehadiran' => 'Alpha',
        ]);

        $this->actingAs($parentUser);
        session(['id_siswa' => $siswa->id_siswa]);

        $payload = SsbInertiaData::parentPayload();

        $this->assertSame(100, $payload['attendanceRecaps'][0]['alpha']);
        $this->assertSame(0, $payload['attendanceRecaps'][0]['hadir']);
    }

    public function test_coach_attendance_uses_daily_date_matching_admin_schedule_day(): void
    {
        [
            'coachUser' => $coachUser,
            'siswa' => $siswa,
            'jadwal' => $jadwal,
        ] = $this->createCoachParentFlowData();

        $this->actingAs($coachUser)
            ->postJson('/api/pelatih/presensi/input', [
                'id_jadwal' => $jadwal->id_jadwal,
                'tanggal' => '2026-06-08', 
                'data' => [
                    ['id_siswa' => $siswa->id_siswa, 'status' => 'hadir'],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('status', true)
            ->assertJsonPath('schedule.tanggal', '2026-06-01');

        $storedAttendance = DB::table('presensi')
            ->where('id_jadwal', $jadwal->id_jadwal)
            ->where('id_siswa', $siswa->id_siswa)
            ->first();

        $this->assertSame('2026-06-08', substr((string) $storedAttendance->created_at, 0, 10));
    }

    public function test_coach_attendance_rejects_daily_date_outside_schedule_day(): void
    {
        [
            'coachUser' => $coachUser,
            'siswa' => $siswa,
            'jadwal' => $jadwal,
        ] = $this->createCoachParentFlowData();

        $this->actingAs($coachUser)
            ->postJson('/api/pelatih/presensi/input', [
                'id_jadwal' => $jadwal->id_jadwal,
                'tanggal' => '2026-06-03', 
                'data' => [
                    ['id_siswa' => $siswa->id_siswa, 'status' => 'hadir'],
                ],
            ])
            ->assertStatus(422)
            ->assertJsonPath('status', false);
    }

    public function test_parent_dashboard_requires_child_picker_when_no_child_is_selected(): void
    {
        [
            'parentUser' => $parentUser,
            'siswa' => $siswa,
        ] = $this->createCoachParentFlowData();

        $siswa->update(['user_id' => null]); // DIUBAH: Simulasikan anak belum terikat ke user akun orang tua
        $this->actingAs($parentUser);
        session()->forget('id_siswa');

        $payload = SsbInertiaData::parentPayload();

        $this->assertTrue($payload['openChildPickerOnLoad']);
        $this->assertNull($payload['selectedChildId']);
        $this->assertFalse($payload['hasSelectedChild']);
        $this->assertSame('', $payload['userName']);
        $this->assertCount(1, $payload['childrenOptions']);

        $siswa->update(['user_id' => $parentUser->id]); // DIUBAH
        session(['id_siswa' => $siswa->id_siswa]);

        $selectedPayload = SsbInertiaData::parentPayload();

        $this->assertFalse($selectedPayload['openChildPickerOnLoad']);
        $this->assertSame($siswa->id_siswa, $selectedPayload['selectedChildId']);
        $this->assertTrue($selectedPayload['hasSelectedChild']);
        $this->assertSame('Anak Coach', $selectedPayload['userName']);
    }

    public function test_parent_dashboard_keeps_revision_child_selected_when_session_is_empty(): void
    {
        [
            'parentUser' => $parentUser,
            'siswa' => $siswa,
        ] = $this->createCoachParentFlowData();

        DB::table('pendaftaran')->insert([
            'id_siswa' => $siswa->id_siswa,
            'tanggal_daftar' => now(),
            'status_approval' => 'Revisi',
            'val_nama_siswa' => 'tidak_valid',
            'val_nama_ayah' => 'valid',
            'val_nama_ibu' => 'valid',
            'val_umur' => 'valid',
            'val_akta' => 'valid',
            'val_kk' => 'valid',
            'val_rapor' => 'valid',
            'val_foto' => 'valid',
        ]);

        $this->actingAs($parentUser);
        session()->forget('id_siswa');

        $payload = SsbInertiaData::parentPayload();

        $this->assertFalse($payload['openChildPickerOnLoad']);
        $this->assertSame($siswa->id_siswa, $payload['selectedChildId']);
        $this->assertTrue($payload['hasSelectedChild']);
        $this->assertSame('Anak Coach', $payload['userName']);
        $this->assertSame($siswa->id_siswa, session('id_siswa'));
    }

    public function test_coach_payment_upload_is_visible_to_admin_payment_data(): void
    {
        Storage::fake('public');

        [
            'coachUser' => $coachUser,
            'siswa' => $siswa,
        ] = $this->createCoachParentFlowData();
        $admin = User::factory()->create(['role' => 'admin']);
        Admin::create([
            'user_id' => $admin->id,
            'nama_admin' => 'Admin Sinkron',
            'email' => $admin->email,
            'password' => $admin->password,
        ]);

        $this->actingAs($coachUser)
            ->post('/api/pelatih/bukti-pembayaran/tambah', [
                'id_siswa' => $siswa->id_siswa,
                'jenis' => 'Bulanan',
                'tanggal_bukti_bayar' => '2026-06-01',
                'bukti_bayar' => UploadedFile::fake()->create('bukti-admin.pdf', 20, 'application/pdf'),
            ])
            ->assertCreated()
            ->assertJsonPath('success', true);

        $coachPaymentRows = collect(SsbInertiaData::paymentRows())
            ->where('source', 'coach')
            ->where('studentId', $siswa->id_siswa)
            ->values();

        $this->assertCount(1, $coachPaymentRows);
        $this->assertSame('bulanan', $coachPaymentRows->first()['paymentType']);
        $this->assertSame('Menunggu Verifikasi', $coachPaymentRows->first()['status']);
        $this->assertTrue(collect(SsbInertiaData::adminNotifications($admin->id))->contains(
            fn ($notification) => str_contains($notification['text'], 'Bukti Pembayaran Pelatih')
        ));

        $this->actingAs($admin)
            ->getJson('/api/admin/pembayaran-admin')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonFragment([
                'id_siswa' => $siswa->id_siswa,
                'jenis' => 'Bulanan',
                'status' => 'Belum',
            ]);
    }

    public function test_coach_can_note_upload_payment_and_input_performance_for_any_active_scheduled_student(): void
    {
        Storage::fake('public');

        [
            'coachUser' => $coachUser,
            'pelatih' => $pelatih,
        ] = $this->createCoachParentFlowData();

        $otherParent = User::factory()->create(['role' => 'orang_tua']);
        $otherOrangTua = OrangTua::create([
            'user_id' => $otherParent->id,
            'nama_ortu' => 'Other Parent',
            'email' => $otherParent->email,
            'password' => $otherParent->password,
            'no_hp' => '083333333333',
        ]);
        $otherStudent = Siswa::create([
            'user_id' => $otherParent->id,
            'id_ortu' => $otherOrangTua->id_ortu,
            'nama_siswa' => 'Anak Lain',
            'nama_ayah' => 'Ayah',
            'nama_ibu' => 'Ibu',
            'umur' => 11,
            'status' => 'Active',
        ]);
        $otherCoachUser = User::factory()->create(['role' => 'pelatih']); // DIUBAH: Bind user_id yang sah
        $otherCoach = Pelatih::create([
            'user_id' => $otherCoachUser->id, // DIUBAH
            'nama_pelatih' => 'Coach Lain',
            'email' => 'other-coach@example.com',
            'no_hp' => '084444444444',
        ]);
        $otherSchedule = Jadwal_Latihan::create([
            'id_pelatih' => $otherCoach->id_pelatih,
            'tanggal' => '2026-06-02', 
            'jam_mulai' => '08:00:00',
            'jam_selesai' => '10:00:00',
            'lokasi' => 'Lapangan Lain',
        ]);
        DB::table('jadwal_siswa')->insert([
            'id_jadwal' => $otherSchedule->id_jadwal,
            'id_siswa' => $otherStudent->id_siswa,
        ]);

        $this->actingAs($coachUser)
            ->postJson('/api/pelatih/catatan-pelatih/tambah', [
                'id_pelatih' => $pelatih->id_pelatih,
                'catatan' => 'Catatan untuk siswa aktif.',
                'data' => [
                    ['id_siswa' => $otherStudent->id_siswa],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('status', true);

        $this->actingAs($coachUser)
            ->post('/api/pelatih/bukti-pembayaran/tambah', [
                'id_siswa' => $otherStudent->id_siswa,
                'jenis' => 'Bulanan',
                'tanggal_bukti_bayar' => '2026-06-02',
                'bukti_bayar' => UploadedFile::fake()->create('bukti-lain.pdf', 20, 'application/pdf'),
            ])
            ->assertCreated()
            ->assertJsonPath('success', true);

        $this->actingAs($coachUser)
            ->postJson("/api/pelatih/performa-siswa/input/{$otherSchedule->id_jadwal}", [
                'tanggal_penilaian' => '2026-06-02',
                'data' => [
                    [
                        'id_siswa' => $otherStudent->id_siswa,
                        'dribbling' => 90,
                        'passing' => 90,
                        'shooting' => 90,
                    ],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('status', true);

        $this->assertDatabaseHas('catatan_pelatih', [
            'id_siswa' => $otherStudent->id_siswa,
            'catatan' => 'Catatan untuk siswa aktif.',
        ]);
        $this->assertDatabaseHas('bukti_pembayaran', [
            'id_siswa' => $otherStudent->id_siswa,
            'status' => 'Menunggu validasi',
        ]);
        $this->assertDatabaseHas('performa_siswa', [
            'id_siswa' => $otherStudent->id_siswa,
            'dribbling' => 90,
        ]);
    }
}
