<?php

namespace Tests\Feature;

use App\Models\OrangTua;
use App\Models\Admin;
use App\Models\BuktiPembayaran;
use App\Models\Jadwal_Latihan;
use App\Models\Pendaftaran_Siswa;
use App\Models\Pembayaran;
use App\Models\Pelatih;
use App\Models\Siswa;
use App\Models\User;
use App\Support\SsbInertiaData;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class RegistrationFlowTest extends TestCase
{
    public function test_email_verification_requires_matching_token(): void
    {
        $user = User::factory()->unverified()->create([
            'email' => 'parent@example.com',
            'role' => 'orang_tua',
            'verification_token' => 'valid-token',
        ]);

        $this->getJson('/api/verify-email?email=parent@example.com')
            ->assertUnprocessable();

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'email_verified_at' => null,
            'verification_token' => 'valid-token',
        ]);

        $this->getJson('/api/verify-email?email=parent@example.com&token=valid-token')
            ->assertOk()
            ->assertJsonPath('status', true);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'verification_token' => null,
        ]);
    }

    public function test_email_verification_web_link_redirects_to_registration_form(): void
    {
        $user = User::factory()->unverified()->create([
            'email' => 'parent-web-verify@example.com',
            'role' => 'orang_tua',
            'verification_token' => 'web-valid-token',
        ]);

        OrangTua::create([
            'user_id' => $user->id,
            'nama_ortu' => $user->name,
            'email' => $user->email,
            'password' => $user->password,
            'no_hp' => '081234567899',
        ]);

        $this->get('/verify-email?email=parent-web-verify@example.com&token=web-valid-token')
            ->assertRedirect('/register/form');

        $this->assertAuthenticatedAs($user);
        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'verification_token' => null,
        ]);
    }

    public function test_used_verification_link_keeps_verified_parent_on_registration_form(): void
    {
        $user = User::factory()->unverified()->create([
            'email' => 'parent-used-link@example.com',
            'role' => 'orang_tua',
            'verification_token' => 'used-valid-token',
        ]);

        OrangTua::create([
            'user_id' => $user->id,
            'nama_ortu' => $user->name,
            'email' => $user->email,
            'password' => $user->password,
            'no_hp' => '081234567898',
        ]);

        $this->get('/verify-email?email=parent-used-link@example.com&token=used-valid-token')
            ->assertRedirect('/register/form');

        $this->get('/verify-email?email=parent-used-link@example.com&token=used-valid-token')
            ->assertRedirect('/register/form');

        $this->assertAuthenticatedAs($user);
    }

    public function test_stale_verification_link_uses_current_registration_session(): void
    {
        $user = User::factory()->unverified()->create([
            'email' => 'parent-current-session@example.com',
            'role' => 'orang_tua',
            'verification_token' => 'current-session-token',
        ]);

        OrangTua::create([
            'user_id' => $user->id,
            'nama_ortu' => $user->name,
            'email' => $user->email,
            'password' => $user->password,
            'no_hp' => '081234567797',
        ]);

        $this->withSession([
            'registration.account' => [
                'userId' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => '081234567797',
            ],
        ])
            ->get('/verify-email?email=parent-current-session@example.com&token=stale-email-token')
            ->assertRedirect('/register/form');

        $this->assertAuthenticatedAs($user);
        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'verification_token' => null,
        ]);
    }

    public function test_verified_registration_session_can_submit_student_form_to_payment_proof(): void
    {
        Storage::fake('local');

        $user = User::factory()->create([
            'email' => 'parent-verified-session@example.com',
            'role' => 'orang_tua',
            'email_verified_at' => now(),
        ]);

        OrangTua::create([
            'user_id' => $user->id,
            'nama_ortu' => $user->name,
            'email' => $user->email,
            'password' => $user->password,
            'no_hp' => '081234567794',
        ]);

        $session = [
            'registration.account' => [
                'userId' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => '081234567794',
            ],
        ];

        $this->withSession($session)
            ->getJson('/api/verification-status?email=parent-verified-session@example.com')
            ->assertOk()
            ->assertJsonPath('verified', true)
            ->assertJsonPath('next_url', '/register/form');

        $this->assertAuthenticatedAs($user);

        $this->withHeaders(['X-Inertia' => 'true'])
            ->post('/api/daftar-siswa', [
                'nama_siswa' => 'Anak Session Verified',
                'nama_ayah' => 'Ayah',
                'nama_ibu' => 'Ibu',
                'umur' => 10,
                'akta_kelahiran' => UploadedFile::fake()->create('akta.pdf', 10, 'application/pdf'),
                'kartu_keluarga' => UploadedFile::fake()->create('kk.pdf', 10, 'application/pdf'),
                'rapor' => UploadedFile::fake()->create('rapor.pdf', 10, 'application/pdf'),
                'pas_photo_3x4' => UploadedFile::fake()->create('foto.pdf', 10, 'application/pdf'),
            ])
            ->assertRedirect('/register/payment-proof');

        $this->assertDatabaseHas('siswa', [
            'user_id' => $user->id,
            'nama_siswa' => 'Anak Session Verified',
            'status' => 'Inactive',
        ]);
    }

    public function test_admin_registration_detail_accepts_registration_id_and_student_id(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $parent = User::factory()->create(['role' => 'orang_tua']);
        $ortu = OrangTua::create([
            'user_id' => $parent->id,
            'nama_ortu' => 'Parent',
            'email' => $parent->email,
            'password' => $parent->password,
            'no_hp' => '081234567890',
        ]);
        $siswa = Siswa::create([
            'user_id' => $parent->id,
            'id_ortu' => $ortu->id_ortu,
            'nama_siswa' => 'Anak Test',
            'nama_ayah' => 'Ayah',
            'nama_ibu' => 'Ibu',
            'umur' => 10,
            'status' => 'Inactive',
        ]);
        $pendaftaran = Pendaftaran_Siswa::create([
            'id_siswa' => $siswa->id_siswa,
            'tanggal_daftar' => now(),
            'status_approval' => 'Menunggu',
        ]);

        $this->actingAs($admin)
            ->getJson("/api/admin/pendaftaran/{$pendaftaran->id_pendaftaran}")
            ->assertOk()
            ->assertJsonPath('data.id_pendaftaran', $pendaftaran->id_pendaftaran);

        $this->actingAs($admin)
            ->getJson("/api/admin/pendaftaran/{$siswa->id_siswa}")
            ->assertOk()
            ->assertJsonPath('data.id_siswa', $siswa->id_siswa);
    }

    public function test_registration_payment_upload_falls_back_to_logged_in_parent_student(): void
    {
        Storage::fake('public');

        $parent = User::factory()->create(['role' => 'orang_tua']);
        $ortu = OrangTua::create([
            'user_id' => $parent->id,
            'nama_ortu' => 'Parent',
            'email' => $parent->email,
            'password' => $parent->password,
            'no_hp' => '081234567891',
        ]);
        $siswa = Siswa::create([
            'user_id' => $parent->id,
            'id_ortu' => $ortu->id_ortu,
            'nama_siswa' => 'Anak Bayar',
            'nama_ayah' => 'Ayah',
            'nama_ibu' => 'Ibu',
            'umur' => 11,
            'status' => 'Inactive',
        ]);

        $this->actingAs($parent)
            ->withHeaders(['Accept' => 'application/json'])
            ->post('/api/siswa/upload-bukti-pendaftaran', [
                'student_name' => 'Anak Bayar',
                'periode' => '2026',
                'jumlah' => 280000,
                'tanggal_bukti_bayar' => '2026-05-30',
                'bukti_bayar' => UploadedFile::fake()->create('bukti.pdf', 10, 'application/pdf'),
            ])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('next_url', '/orang-tua/dashboard');

        $this->assertDatabaseHas('pembayaran', [
            'id_siswa' => $siswa->id_siswa,
            'periode' => '2026',
            'jenis' => 'Pendaftaran',
            'status' => 'Belum',
        ]);

        $this->assertDatabaseHas('bukti_pembayaran', [
            'id_siswa' => $siswa->id_siswa,
            'status' => 'Menunggu validasi',
        ]);
    }

    public function test_registration_payment_upload_redirects_to_parent_dashboard(): void
    {
        Storage::fake('public');

        $parent = User::factory()->create(['role' => 'orang_tua']);
        $ortu = OrangTua::create([
            'user_id' => $parent->id,
            'nama_ortu' => 'Parent Modal',
            'email' => $parent->email,
            'password' => $parent->password,
            'no_hp' => '081234567796',
        ]);
        $siswa = Siswa::create([
            'user_id' => $parent->id,
            'id_ortu' => $ortu->id_ortu,
            'nama_siswa' => 'Anak Modal',
            'nama_ayah' => 'Ayah',
            'nama_ibu' => 'Ibu',
            'umur' => 11,
            'status' => 'Inactive',
        ]);

        $this->actingAs($parent)
            ->withSession([
                'registration.form' => [
                    'studentId' => $siswa->id_siswa,
                ],
                'registration.account' => [
                    'userId' => $parent->id,
                    'name' => $parent->name,
                    'email' => $parent->email,
                    'phone' => '081234567796',
                ],
            ])
            ->from('/register/payment-proof')
            ->post('/api/siswa/upload-bukti-pendaftaran', [
                'student_name' => 'Anak Modal',
                'periode' => '2026',
                'jumlah' => 280000,
                'tanggal_bukti_bayar' => '2026-05-30',
                'bukti_bayar' => UploadedFile::fake()->create('bukti-modal.pdf', 10, 'application/pdf'),
            ], ['X-Inertia' => 'true'])
            ->assertRedirect('/orang-tua/dashboard')
            ->assertSessionHas('id_siswa', $siswa->id_siswa);

        $this->assertAuthenticatedAs($parent);
        $this->assertTrue((bool) session('show_child_picker_after_login'));
    }

    public function test_student_registration_is_visible_to_admin_and_parent_child_picker(): void
    {
        Storage::fake('local');

        $parent = User::factory()->create([
            'role' => 'orang_tua',
            'email' => 'parent-register-visible@example.com',
        ]);
        OrangTua::create([
            'user_id' => $parent->id,
            'nama_ortu' => 'Parent Visible',
            'email' => $parent->email,
            'password' => $parent->password,
            'no_hp' => '081234567803',
        ]);

        $response = $this->actingAs($parent)
            ->withHeaders(['Accept' => 'application/json'])
            ->post('/api/daftar-siswa', [
                'nama_siswa' => 'Anak Masuk Admin',
                'nama_ayah' => 'Ayah',
                'nama_ibu' => 'Ibu',
                'umur' => 10,
                'akta_kelahiran' => UploadedFile::fake()->create('akta.pdf', 10, 'application/pdf'),
                'kartu_keluarga' => UploadedFile::fake()->create('kk.pdf', 10, 'application/pdf'),
                'rapor' => UploadedFile::fake()->create('rapor.pdf', 10, 'application/pdf'),
                'pas_photo_3x4' => UploadedFile::fake()->create('foto.pdf', 10, 'application/pdf'),
            ])
            ->assertCreated()
            ->assertJsonPath('status', true);

        $studentId = $response->json('data.siswa.id_siswa');
        $registrationId = $response->json('data.pendaftaran.id_pendaftaran');

        $this->assertDatabaseHas('siswa', [
            'id_siswa' => $studentId,
            'user_id' => $parent->id,
            'nama_siswa' => 'Anak Masuk Admin',
            'status' => 'Inactive',
        ]);
        $this->assertDatabaseHas('pendaftaran', [
            'id_pendaftaran' => $registrationId,
            'id_siswa' => $studentId,
            'status_approval' => 'Menunggu',
        ]);

        $adminRows = collect(SsbInertiaData::registrationRows());
        $this->assertTrue($adminRows->contains(
            fn ($row) => $row['no'] === $registrationId
                && $row['childName'] === 'Anak Masuk Admin'
                && $row['email'] === $parent->email
                && $row['status'] === 'Belum Diperiksa'
        ));

        // DIUBAH: Dihubungkan ke user agar child picker payload mendeteksi datanya
        Siswa::find($studentId)->update(['user_id' => $parent->id]);

        session()->forget('id_siswa');
        $parentPayload = SsbInertiaData::parentPayload();

        $this->assertFalse($parentPayload['openChildPickerOnLoad']); // DIUBAH: Sesuai logika otomatis controller Anda
        $this->assertTrue(collect($parentPayload['childrenOptions'])->contains(
            fn ($child) => $child['id_siswa'] === $studentId
                && $child['nama_siswa'] === 'Anak Masuk Admin'
        ));
    }

    public function test_student_registration_rejects_non_image_or_pdf_files(): void
    {
        $parent = User::factory()->create(['role' => 'orang_tua']);
        OrangTua::create([
            'user_id' => $parent->id,
            'nama_ortu' => 'Parent',
            'email' => $parent->email,
            'password' => $parent->password,
            'no_hp' => '081234567896',
        ]);

        $this->actingAs($parent)
            ->withHeaders(['Accept' => 'application/json'])
            ->post('/api/daftar-siswa', [
                'nama_siswa' => 'Anak File',
                'nama_ayah' => 'Ayah',
                'nama_ibu' => 'Ibu',
                'umur' => 10,
                'akta_kelahiran' => UploadedFile::fake()->create('akta.txt', 10, 'text/plain'),
                'kartu_keluarga' => UploadedFile::fake()->create('kk.pdf', 10, 'application/pdf'),
                'rapor' => UploadedFile::fake()->create('rapor.pdf', 10, 'application/pdf'),
                'pas_photo_3x4' => UploadedFile::fake()->create('foto.pdf', 10, 'application/pdf'),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['akta_kelahiran']);

        $this->assertDatabaseMissing('siswa', [
            'nama_siswa' => 'Anak File',
        ]);
    }

    public function test_registration_payment_upload_rejects_files_larger_than_five_mb(): void
    {
        $parent = User::factory()->create(['role' => 'orang_tua']);
        $ortu = OrangTua::create([
            'user_id' => $parent->id,
            'nama_ortu' => 'Parent',
            'email' => $parent->email,
            'password' => $parent->password,
            'no_hp' => '081234567897',
        ]);
        $siswa = Siswa::create([
            'user_id' => $parent->id,
            'id_ortu' => $ortu->id_ortu,
            'nama_siswa' => 'Anak Besar',
            'nama_ayah' => 'Ayah',
            'nama_ibu' => 'Ibu',
            'umur' => 11,
            'status' => 'Inactive',
        ]);

        $this->actingAs($parent)
            ->withHeaders(['Accept' => 'application/json'])
            ->post('/api/siswa/upload-bukti-pendaftaran', [
                'student_name' => 'Anak Besar',
                'periode' => '2026',
                'jumlah' => 280000,
                'tanggal_bukti_bayar' => '2026-05-30',
                'bukti_bayar' => UploadedFile::fake()->create('besar.pdf', 5121, 'application/pdf'),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['bukti_bayar']);

        $this->assertDatabaseMissing('bukti_pembayaran', [
            'id_siswa' => $siswa->id_siswa,
        ]);
    }

    public function test_registration_payment_approval_does_not_activate_student_before_documents_are_valid(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $parent = User::factory()->create(['role' => 'orang_tua']);
        $ortu = OrangTua::create([
            'user_id' => $parent->id,
            'nama_ortu' => 'Parent',
            'email' => $parent->email,
            'password' => $parent->password,
            'no_hp' => '081234567892',
        ]);
        $siswa = Siswa::create([
            'user_id' => $parent->id,
            'id_ortu' => $ortu->id_ortu,
            'nama_siswa' => 'Anak Pending',
            'nama_ayah' => 'Ayah',
            'nama_ibu' => 'Ibu',
            'umur' => 10,
            'status' => 'Inactive',
        ]);
        Pendaftaran_Siswa::create([
            'id_siswa' => $siswa->id_siswa,
            'tanggal_daftar' => now(),
            'status_approval' => 'Menunggu',
        ]);
        $pembayaran = Pembayaran::create([
            'id_siswa' => $siswa->id_siswa,
            'periode' => '2026',
            'jumlah' => 280000,
            'tanggal_bayar' => '2026-05-30',
            'status' => 'Belum',
            'jenis' => 'Pendaftaran',
        ]);
        $bukti = BuktiPembayaran::create([
            'id_pembayaran' => $pembayaran->id_pembayaran,
            'id_siswa' => $siswa->id_siswa,
            'periode' => '2026',
            'tanggal_bukti_bayar' => '2026-05-30',
            'status' => 'Menunggu validasi',
            'bukti_bayar' => 'bukti_pembayaran/test.pdf',
        ]);

        $this->actingAs($admin)
            ->postJson("/api/admin/bukti/diterima/{$bukti->id_bukti_pembayaran}")
            ->assertOk()
            ->assertJsonPath('data.siswa_status', 'Inactive');

        $this->assertDatabaseHas('siswa', [
            'id_siswa' => $siswa->id_siswa,
            'status' => 'Inactive',
        ]);

        $this->assertDatabaseHas('pembayaran', [
            'id_pembayaran' => $pembayaran->id_pembayaran,
            'status' => 'Lunas',
        ]);
    }

    public function test_registration_payment_approval_activates_student_when_documents_are_valid(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $coachA = Pelatih::create([
            'nama_pelatih' => 'Coach A',
            'email' => 'coach-a@example.com',
            'no_hp' => '081111111111',
        ]);
        $coachB = Pelatih::create([
            'nama_pelatih' => 'Coach B',
            'email' => 'coach-b@example.com',
            'no_hp' => '082222222222',
        ]);
        $existingActiveStudent = Siswa::create([
            'nama_siswa' => 'Siswa Lama',
            'nama_ayah' => 'Ayah',
            'nama_ibu' => 'Ibu',
            'umur' => 10,
            'status' => 'Active',
        ]);
        $routineSchedule = Jadwal_Latihan::create([
            'id_pelatih' => $coachA->id_pelatih,
            'tanggal' => '2026-06-03',
            'jam_mulai' => '08:00:00',
            'jam_selesai' => '10:00:00',
            'lokasi' => 'Lapangan Rutin',
        ]);
        $extraSchedule = Jadwal_Latihan::create([
            'id_pelatih' => $coachB->id_pelatih,
            'tanggal' => '2026-06-02',
            'jam_mulai' => '08:00:00',
            'jam_selesai' => '10:00:00',
            'lokasi' => 'Lapangan Tambahan',
        ]);
        DB::table('jadwal_siswa')->insert([
            ['id_jadwal' => $routineSchedule->id_jadwal, 'id_siswa' => $existingActiveStudent->id_siswa],
            ['id_jadwal' => $extraSchedule->id_jadwal, 'id_siswa' => $existingActiveStudent->id_siswa],
        ]);
        $parent = User::factory()->create(['role' => 'orang_tua']);
        $ortu = OrangTua::create([
            'user_id' => $parent->id,
            'nama_ortu' => 'Parent',
            'email' => $parent->email,
            'password' => $parent->password,
            'no_hp' => '081234567893',
        ]);
        $siswa = Siswa::create([
            'user_id' => $parent->id,
            'id_ortu' => $ortu->id_ortu,
            'nama_siswa' => 'Anak Valid',
            'nama_ayah' => 'Ayah',
            'nama_ibu' => 'Ibu',
            'umur' => 10,
            'status' => 'Inactive',
        ]);
        Pendaftaran_Siswa::create([
            'id_siswa' => $siswa->id_siswa,
            'tanggal_daftar' => now(),
            'status_approval' => 'Menunggu',
            'val_nama_siswa' => 'valid',
            'val_nama_ibu' => 'valid',
            'val_nama_ayah' => 'valid',
            'val_umur' => 'valid',
            'val_akta' => 'valid',
            'val_kk' => 'valid',
            'val_rapor' => 'valid',
            'val_foto' => 'valid',
        ]);
        $pembayaran = Pembayaran::create([
            'id_siswa' => $siswa->id_siswa,
            'periode' => '2026',
            'jumlah' => 280000,
            'tanggal_bayar' => '2026-05-30',
            'status' => 'Belum',
            'jenis' => 'Pendaftaran',
        ]);
        $bukti = BuktiPembayaran::create([
            'id_pembayaran' => $pembayaran->id_pembayaran,
            'id_siswa' => $siswa->id_siswa,
            'periode' => '2026',
            'tanggal_bukti_bayar' => '2026-05-30',
            'status' => 'Menunggu validasi',
            'bukti_bayar' => 'bukti_pembayaran/test.pdf',
        ]);

        $this->actingAs($admin)
            ->postJson("/api/admin/bukti/diterima/{$bukti->id_bukti_pembayaran}")
            ->assertOk()
            ->assertJsonPath('data.siswa_status', 'Active');

        $this->assertDatabaseHas('pendaftaran', [
            'id_siswa' => $siswa->id_siswa,
            'status_approval' => 'Disetujui',
        ]);

        $this->assertDatabaseHas('jadwal_siswa', [
            'id_jadwal' => $routineSchedule->id_jadwal,
            'id_siswa' => $siswa->id_siswa,
        ]);
        $this->assertDatabaseMissing('jadwal_siswa', [
            'id_jadwal' => $extraSchedule->id_jadwal,
            'id_siswa' => $siswa->id_siswa,
        ]);
    }

    public function test_parent_revision_does_not_change_student_name_until_admin_approves(): void
    {
        Storage::fake('local');

        $admin = User::factory()->create(['role' => 'admin']);
        $parent = User::factory()->create(['role' => 'orang_tua']);
        $ortu = OrangTua::create([
            'user_id' => $parent->id,
            'nama_ortu' => 'Parent Revision',
            'email' => $parent->email,
            'password' => $parent->password,
            'no_hp' => '081234567793',
        ]);
        $siswa = Siswa::create([
            'user_id' => $parent->id,
            'id_ortu' => $ortu->id_ortu,
            'nama_siswa' => 'SITI NURAINI',
            'nama_ayah' => 'Ayah',
            'nama_ibu' => 'Ibu',
            'umur' => 10,
            'akta_kelahiran' => 'akta/lama.pdf',
            'kartu_keluarga' => 'kk/lama.pdf',
            'rapor' => 'rapor/lama.pdf',
            'pas_photo_3x4' => 'foto/lama.pdf',
            'status' => 'Inactive',
        ]);
        $pendaftaran = Pendaftaran_Siswa::create([
            'id_siswa' => $siswa->id_siswa,
            'tanggal_daftar' => now(),
            'status_approval' => 'Revisi',
            'val_nama_siswa' => 'tidak_valid',
            'val_nama_ibu' => 'valid',
            'val_nama_ayah' => 'valid',
            'val_umur' => 'valid',
            'val_akta' => 'valid',
            'val_kk' => 'valid',
            'val_rapor' => 'valid',
            'val_foto' => 'valid',
        ]);

        $this->actingAs($parent)
            ->withHeaders(['Accept' => 'application/json'])
            ->post("/api/siswa/update-pendaftaran/{$siswa->id_siswa}", [
                'nama_siswa' => 'SITI',
            ])
            ->assertOk()
            ->assertJsonPath('success', true);

        $siswa->refresh();
        $pendaftaran->refresh();

        $this->assertSame('SITI NURAINI', $siswa->nama_siswa);
        $this->assertSame('SITI', $pendaftaran->pending_nama_siswa);
        $this->assertSame('Menunggu', $pendaftaran->status_approval);

        $this->actingAs($parent);
        session(['id_siswa' => $siswa->id_siswa]);
        $parentPayload = SsbInertiaData::parentPayload();

        $this->assertSame('SITI NURAINI', $parentPayload['userName']);
        $this->assertTrue(collect($parentPayload['childrenOptions'])->contains(
            fn ($child) => $child['nama_siswa'] === 'SITI NURAINI'
        ));
        $this->assertFalse(collect($parentPayload['childrenOptions'])->contains(
            fn ($child) => $child['nama_siswa'] === 'SITI'
        ));

        $this->assertTrue(collect(SsbInertiaData::registrationRows())->contains(
            fn ($row) => $row['no'] === $pendaftaran->id_pendaftaran
                && $row['childName'] === 'SITI'
        ));

        $this->actingAs($admin)
            ->postJson("/api/admin/pendaftaran/{$pendaftaran->id_pendaftaran}/validasi", [
                'val_nama_siswa' => 'valid',
                'val_nama_ibu' => 'valid',
                'val_nama_ayah' => 'valid',
                'val_umur' => 'valid',
                'val_akta' => 'valid',
                'val_kk' => 'valid',
                'val_rapor' => 'valid',
                'val_foto' => 'valid',
                'val_bukti_pembayaran' => 'valid',
            ])
            ->assertOk()
            ->assertJsonPath('status_approval', 'Disetujui');

        $siswa->refresh();
        $pendaftaran->refresh();

        $this->assertSame('SITI', $siswa->nama_siswa);
        $this->assertNull($pendaftaran->pending_nama_siswa);
    }

    public function test_parent_profile_update_notification_uses_the_selected_student_name(): void
    {
        $adminUser = User::factory()->create([
            'role' => 'admin',
            'name' => 'Admin SSB',
            'email' => 'admin-profile-notif@example.com',
        ]);
        Admin::create([
            'user_id' => $adminUser->id,
            'nama_admin' => 'Admin SSB',
            'email' => $adminUser->email,
            'password' => $adminUser->password,
        ]);

        $parentUser = User::factory()->create([
            'role' => 'orang_tua',
            'name' => 'Heni',
            'email' => 'heni-profile@example.com',
        ]);
        $fulanParent = OrangTua::create([
            'user_id' => $parentUser->id,
            'nama_ortu' => 'Heni',
            'email' => $parentUser->email,
            'password' => $parentUser->password,
            'no_hp' => '081234567811',
        ]);
        $sitiParent = OrangTua::create([
            'user_id' => $parentUser->id,
            'nama_ortu' => 'Heni',
            'email' => $parentUser->email,
            'password' => $parentUser->password,
            'no_hp' => '081234567812',
        ]);

        Siswa::create([
            'user_id' => $parentUser->id,
            'id_ortu' => $fulanParent->id_ortu,
            'nama_siswa' => 'Fulan bin Fulan',
            'nama_ayah' => 'Ayah Fulan',
            'nama_ibu' => 'Ibu Fulan',
            'umur' => 10,
            'status' => 'Active',
        ]);
        $siti = Siswa::create([
            'user_id' => $parentUser->id,
            'id_ortu' => $sitiParent->id_ortu,
            'nama_siswa' => 'SITI NURAINI',
            'nama_ayah' => 'Ayah Siti',
            'nama_ibu' => 'Ibu Siti',
            'umur' => 10,
            'status' => 'Active',
        ]);

        $this->actingAs($parentUser)
            ->postJson("/api/siswa/profil/{$siti->id_siswa}", [
                'alamat' => 'Rumbai',
                'tinggi_badan' => 130,
                'berat_badan' => 30,
            ])
            ->assertOk()
            ->assertJsonPath('data.id_siswa', $siti->id_siswa);

        $this->assertDatabaseHas('profil_siswa', [
            'id_siswa' => $siti->id_siswa,
            'alamat' => 'Rumbai',
            'tinggi_badan' => 130,
            'berat_badan' => 30,
        ]);
        $this->assertDatabaseHas('notifikasi', [
            'judul' => 'Profil Siswa Diperbarui',
            'isi' => 'Orang tua Heni memperbarui alamat, tinggi badan, berat badan untuk siswa SITI NURAINI.',
        ]);
        $this->assertDatabaseMissing('notifikasi', [
            'judul' => 'Profil Siswa Diperbarui',
            'isi' => 'Orang tua Heni memperbarui alamat, tinggi badan, berat badan untuk siswa Fulan bin Fulan.',
        ]);
    }

    public function test_admin_profile_form_is_prefilled_from_parent_profile_update(): void
    {
        $adminUser = User::factory()->create([
            'role' => 'admin',
            'name' => 'Admin SSB',
            'email' => 'admin-prefill-profile@example.com',
        ]);
        Admin::create([
            'user_id' => $adminUser->id,
            'nama_admin' => 'Admin SSB',
            'email' => $adminUser->email,
            'password' => $adminUser->password,
        ]);
        $parentUser = User::factory()->create([
            'role' => 'orang_tua',
            'name' => 'Heni',
            'email' => 'heni-prefill-profile@example.com',
        ]);
        $parent = OrangTua::create([
            'user_id' => $parentUser->id,
            'nama_ortu' => 'Heni',
            'email' => $parentUser->email,
            'password' => $parentUser->password,
            'no_hp' => '081234567814',
        ]);
        $siti = Siswa::create([
            'user_id' => $parentUser->id,
            'id_ortu' => $parent->id_ortu,
            'nama_siswa' => 'SITI NURAINI',
            'nama_ayah' => 'Ayah Siti',
            'nama_ibu' => 'Ibu Siti',
            'umur' => 10,
            'status' => 'Active',
        ]);

        $this->actingAs($parentUser)
            ->postJson("/api/siswa/profil/{$siti->id_siswa}", [
                'alamat' => 'Bumi coy',
                'tinggi_badan' => 160,
                'berat_badan' => 45,
            ])
            ->assertOk();

        $response = $this->actingAs($adminUser)
            ->get("/admin/siswa/{$siti->id_siswa}/profil")
            ->assertOk();

        $student = $response->viewData('page')['props']['student'];

        $this->assertSame('SITI NURAINI', $student['name']);
        $this->assertSame('Bumi coy', $student['address']);
        $this->assertSame(160, $student['height']);
        $this->assertSame(45, $student['weight']);
    }

    public function test_parent_profile_only_shows_the_selected_child(): void
    {
        $parentUser = User::factory()->create([
            'role' => 'orang_tua',
            'name' => 'Heni',
            'email' => 'heni-selected-profile@example.com',
        ]);
        $parent = OrangTua::create([
            'user_id' => $parentUser->id,
            'nama_ortu' => 'Heni',
            'email' => $parentUser->email,
            'password' => $parentUser->password,
            'no_hp' => '081234567813',
        ]);
        $fulan = Siswa::create([
            'user_id' => $parentUser->id,
            'id_ortu' => $parent->id_ortu,
            'nama_siswa' => 'Fulan bin Fulan',
            'nama_ayah' => 'Ayah Fulan',
            'nama_ibu' => 'Ibu Fulan',
            'umur' => 12,
            'status' => 'Active',
        ]);
        $siti = Siswa::create([
            'user_id' => $parentUser->id,
            'id_ortu' => $parent->id_ortu,
            'nama_siswa' => 'SITI NURAINI',
            'nama_ayah' => 'Ayah Siti',
            'nama_ibu' => 'Ibu Siti',
            'umur' => 10,
            'status' => 'Active',
        ]);

        $sitiResponse = $this->actingAs($parentUser)
            ->withSession(['id_siswa' => $siti->id_siswa])
            ->get('/profile/orangtua')
            ->assertOk();
        $sitiProfile = $sitiResponse->viewData('page')['props']['profile'];

        $this->assertSame(['SITI NURAINI'], $sitiProfile['children']);
        $this->assertSame(['SITI NURAINI'], collect($sitiProfile['childDetails'])->pluck('name')->all());

        $fulanResponse = $this->actingAs($parentUser)
            ->withSession(['id_siswa' => $fulan->id_siswa])
            ->get('/profile/orangtua')
            ->assertOk();
        $fulanProfile = $fulanResponse->viewData('page')['props']['profile'];

        $this->assertSame(['Fulan bin Fulan'], $fulanProfile['children']);
        $this->assertSame(['Fulan bin Fulan'], collect($fulanProfile['childDetails'])->pluck('name')->all());
    }

    public function test_parent_cannot_submit_revision_for_another_parents_student(): void
    {
        $parentA = User::factory()->create(['role' => 'orang_tua']);
        $parentB = User::factory()->create(['role' => 'orang_tua']);
        $ortuA = OrangTua::create([
            'user_id' => $parentA->id,
            'nama_ortu' => 'Parent A',
            'email' => $parentA->email,
            'password' => $parentA->password,
            'no_hp' => '081234567894',
        ]);
        $ortuB = OrangTua::create([
            'user_id' => $parentB->id,
            'nama_ortu' => 'Parent B',
            'email' => $parentB->email,
            'password' => $parentB->password,
            'no_hp' => '081234567895',
        ]);
        $siswaB = Siswa::create([
            'user_id' => $parentB->id,
            'id_ortu' => $ortuB->id_ortu,
            'nama_siswa' => 'Anak B',
            'nama_ayah' => 'Ayah',
            'nama_ibu' => 'Ibu',
            'umur' => 10,
            'status' => 'Inactive',
        ]);
        Pendaftaran_Siswa::create([
            'id_siswa' => $siswaB->id_siswa,
            'tanggal_daftar' => now(),
            'status_approval' => 'Revisi',
            'val_nama_siswa' => 'tidak_valid',
        ]);

        $this->actingAs($parentA)
            ->withHeaders(['Accept' => 'application/json'])
            ->post("/api/siswa/update-pendaftaran/{$siswaB->id_siswa}", [
                'nama_siswa' => 'Tidak Boleh',
            ])
            ->assertNotFound();

        $this->assertDatabaseHas('siswa', [
            'id_siswa' => $siswaB->id_siswa,
            'nama_siswa' => 'Anak B',
        ]);
    }
}
