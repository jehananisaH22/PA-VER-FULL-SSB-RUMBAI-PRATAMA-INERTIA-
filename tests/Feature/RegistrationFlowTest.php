<?php

namespace Tests\Feature;

use App\Models\OrangTua;
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
            ->assertJsonPath('success', true);

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

        session()->forget('id_siswa');
        $parentPayload = SsbInertiaData::parentPayload();

        $this->assertTrue($parentPayload['openChildPickerOnLoad']);
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
        $scheduleA = Jadwal_Latihan::create([
            'id_pelatih' => $coachA->id_pelatih,
            'tanggal' => '2026-06-01',
            'jam_mulai' => '08:00:00',
            'jam_selesai' => '10:00:00',
            'lokasi' => 'Lapangan A',
        ]);
        $scheduleB = Jadwal_Latihan::create([
            'id_pelatih' => $coachB->id_pelatih,
            'tanggal' => '2026-06-02',
            'jam_mulai' => '08:00:00',
            'jam_selesai' => '10:00:00',
            'lokasi' => 'Lapangan B',
        ]);
        DB::table('jadwal_siswa')->insert([
            ['id_jadwal' => $scheduleA->id_jadwal, 'id_siswa' => $existingActiveStudent->id_siswa],
            ['id_jadwal' => $scheduleB->id_jadwal, 'id_siswa' => $existingActiveStudent->id_siswa],
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
            'id_jadwal' => $scheduleA->id_jadwal,
            'id_siswa' => $siswa->id_siswa,
        ]);
        $this->assertDatabaseHas('jadwal_siswa', [
            'id_jadwal' => $scheduleB->id_jadwal,
            'id_siswa' => $siswa->id_siswa,
        ]);
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
