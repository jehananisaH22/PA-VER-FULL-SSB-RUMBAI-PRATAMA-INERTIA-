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
                'jumlah' => 42000,
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
        $this->assertSame(100000.0, $payload['monthlyPaymentSummary']['targetAmount']);
        $this->assertSame(0.0, $payload['monthlyPaymentSummary']['paidAmount']);
        $this->assertSame(42000.0, $payload['monthlyPaymentSummary']['pendingAmount']);
        $this->assertSame(100000.0, $payload['monthlyPaymentSummary']['remainingAmount']);
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

    public function test_coach_attendance_uses_exact_admin_schedule_date(): void
    {
        [
            'coachUser' => $coachUser,
            'siswa' => $siswa,
            'jadwal' => $jadwal,
        ] = $this->createCoachParentFlowData();

        $jadwal->update(['tanggal' => '2026-06-03']);

        $this->actingAs($coachUser)
            ->postJson('/api/pelatih/presensi/input', [
                'id_jadwal' => $jadwal->id_jadwal,
                'tanggal' => '2026-06-03',
                'data' => [
                    ['id_siswa' => $siswa->id_siswa, 'status' => 'hadir'],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('status', true)
            ->assertJsonPath('schedule.tanggal', '2026-06-03');

        $storedAttendance = DB::table('presensi')
            ->where('id_jadwal', $jadwal->id_jadwal)
            ->where('id_siswa', $siswa->id_siswa)
            ->first();

        $this->assertSame('2026-06-03', substr((string) $storedAttendance->created_at, 0, 10));
    }

    public function test_coach_attendance_rejects_date_outside_admin_schedule_date(): void
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

    public function test_coach_inputs_reject_same_weekday_when_date_is_not_admin_schedule_date(): void
    {
        [
            'coachUser' => $coachUser,
            'siswa' => $siswa,
            'jadwal' => $jadwal,
        ] = $this->createCoachParentFlowData();

        $jadwal->update(['tanggal' => '2026-06-03']);

        $this->actingAs($coachUser)
            ->postJson('/api/pelatih/presensi/input', [
                'id_jadwal' => $jadwal->id_jadwal,
                'tanggal' => '2026-06-10',
                'data' => [
                    ['id_siswa' => $siswa->id_siswa, 'status' => 'hadir'],
                ],
            ])
            ->assertStatus(422)
            ->assertJsonPath('status', false)
            ->assertJsonPath('schedule_date', '2026-06-03')
            ->assertJsonPath('attendance_date', '2026-06-10');

        $this->actingAs($coachUser)
            ->postJson("/api/pelatih/performa-siswa/input/{$jadwal->id_jadwal}", [
                'tanggal_penilaian' => '2026-06-10',
                'data' => [[
                    'id_siswa' => $siswa->id_siswa,
                    'dribbling' => 80,
                    'passing' => 80,
                    'shooting' => 80,
                ]],
            ])
            ->assertStatus(422)
            ->assertJsonPath('status', false)
            ->assertJsonPath('schedule_date', '2026-06-03')
            ->assertJsonPath('input_date', '2026-06-10');

        $this->assertDatabaseMissing('presensi', ['id_jadwal' => $jadwal->id_jadwal]);
        $this->assertDatabaseMissing('performa_siswa', ['id_jadwal' => $jadwal->id_jadwal]);
    }

    public function test_additional_schedule_requires_exact_date_for_attendance_and_performance(): void
    {
        [
            'coachUser' => $coachUser,
            'siswa' => $siswa,
            'jadwal' => $jadwal,
        ] = $this->createCoachParentFlowData();

        $attendancePayload = [
            'id_jadwal' => $jadwal->id_jadwal,
            'tanggal' => '2026-06-08',
            'data' => [
                ['id_siswa' => $siswa->id_siswa, 'status' => 'hadir'],
            ],
        ];

        $this->actingAs($coachUser)
            ->postJson('/api/pelatih/presensi/input', $attendancePayload)
            ->assertStatus(422)
            ->assertJsonPath('status', false);

        $this->actingAs($coachUser)
            ->postJson("/api/pelatih/performa-siswa/input/{$jadwal->id_jadwal}", [
                'tanggal_penilaian' => '2026-06-08',
                'data' => [[
                    'id_siswa' => $siswa->id_siswa,
                    'dribbling' => 80,
                    'passing' => 80,
                    'shooting' => 80,
                ]],
            ])
            ->assertStatus(422)
            ->assertJsonPath('status', false);

        $this->assertDatabaseMissing('presensi', ['id_jadwal' => $jadwal->id_jadwal]);
        $this->assertDatabaseMissing('performa_siswa', ['id_jadwal' => $jadwal->id_jadwal]);
    }

    public function test_coach_cannot_input_performance_for_another_coachs_schedule(): void
    {
        [
            'coachUser' => $coachUser,
            'siswa' => $siswa,
            'jadwal' => $jadwal,
        ] = $this->createCoachParentFlowData();

        $otherCoachUser = User::factory()->create([
            'role' => 'pelatih',
            'email' => 'other-coach@example.com',
        ]);
        $otherCoach = Pelatih::create([
            'user_id' => $otherCoachUser->id,
            'nama_pelatih' => 'Coach Lain',
            'email' => $otherCoachUser->email,
            'no_hp' => '083333333333',
        ]);
        $jadwal->update(['id_pelatih' => $otherCoach->id_pelatih]);

        $this->actingAs($coachUser)
            ->postJson("/api/pelatih/performa-siswa/input/{$jadwal->id_jadwal}", [
                'tanggal_penilaian' => '2026-06-01',
                'data' => [[
                    'id_siswa' => $siswa->id_siswa,
                    'dribbling' => 80,
                    'passing' => 80,
                    'shooting' => 80,
                ]],
            ])
            ->assertNotFound();

        $this->assertDatabaseMissing('performa_siswa', ['id_jadwal' => $jadwal->id_jadwal]);
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
                'jenis' => 'Harian',
                'jumlah' => 100000,
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
        $this->assertSame('harian', $coachPaymentRows->first()['paymentType']);
        $this->assertSame(100000.0, $coachPaymentRows->first()['amount']);
        $this->assertSame(100000.0, $coachPaymentRows->first()['monthlyTarget']);
        $this->assertSame(0.0, $coachPaymentRows->first()['monthlyPaidAmount']);
        $this->assertSame(100000.0, $coachPaymentRows->first()['monthlyPendingAmount']);
        $this->assertEquals(100000, $coachPaymentRows->first()['monthlyRemainingAmount']);
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
                'jenis' => 'Harian',
                'jumlah' => 100000,
                'monthly_paid_amount' => 0,
                'monthly_pending_amount' => 100000,
                'monthly_remaining_amount' => 100000,
                'status' => 'Belum',
            ]);
    }

    public function test_coach_can_note_upload_payment_and_input_performance_for_shared_active_schedule(): void
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
        $otherSchedule = Jadwal_Latihan::create([
            'id_pelatih' => null,
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
                'jenis' => 'Harian',
                'jumlah' => 125000,
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
