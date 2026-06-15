<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\BuktiPembayaran;
use App\Models\OrangTua;
use App\Models\Pendaftaran_Siswa;
use App\Models\Siswa;
use App\Models\User;
use App\Models\Pelatih;
use App\Support\SsbInertiaData;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FullSystemFlowTest extends TestCase
{
    public function test_complete_public_registration_admin_revision_activation_coach_parent_flow(): void
    {
        Mail::fake();
        Storage::fake('local');
        Storage::fake('public');

        $adminUser = User::factory()->create([
            'role' => 'admin',
            'name' => 'Admin Full Flow',
            'email' => 'admin-full-flow@gmail.com',
        ]);
        $admin = Admin::create([
            'user_id' => $adminUser->id,
            'nama_admin' => 'Admin Full Flow',
            'email' => $adminUser->email,
            'password' => $adminUser->password,
        ]);

        $this->get('/')->assertOk();
        $this->get('/galeri')->assertOk();
        $this->get('/berita')->assertOk();
        $this->get('/register')->assertOk();

        $this->postJson('/api/register', [
            'nama' => 'Orang Tua Full Flow',
            'email' => 'ortu-full-flow@gmail.com',
            'no_hp' => '081234567001',
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
        ])
            ->assertCreated()
            ->assertJsonPath('status', true);

        $parentUser = User::where('email', 'ortu-full-flow@gmail.com')
            ->where('role', 'orang_tua')
            ->firstOrFail();
        $token = $parentUser->verification_token;

        $this->getJson('/api/verification-status?email=ortu-full-flow@gmail.com')
            ->assertOk()
            ->assertJsonPath('verified', false);

        $this->getJson('/api/verify-email?email=ortu-full-flow@gmail.com&token=' . $token)
            ->assertOk()
            ->assertJsonPath('status', true);

        $this->getJson('/api/verification-status?email=ortu-full-flow@gmail.com')
            ->assertOk()
            ->assertJsonPath('verified', true);

        $this->actingAs($parentUser)
            ->withHeaders(['Accept' => 'application/json'])
            ->post('/api/daftar-siswa', [
                'nama_siswa' => 'Anak Full Flow',
                'nama_ayah' => 'Ayah Full Flow',
                'nama_ibu' => 'Ibu Full Flow',
                'umur' => 10,
                'akta_kelahiran' => UploadedFile::fake()->create('akta.pdf', 20, 'application/pdf'),
                'kartu_keluarga' => UploadedFile::fake()->create('kk.jpg', 20, 'image/jpeg'),
                'rapor' => UploadedFile::fake()->create('rapor.pdf', 20, 'application/pdf'),
                'pas_photo_3x4' => UploadedFile::fake()->create('foto.jpg', 20, 'image/jpeg'),
            ])
            ->assertCreated()
            ->assertJsonPath('status', true);

        $siswa = Siswa::where('nama_siswa', 'Anak Full Flow')->firstOrFail();
        $pendaftaran = Pendaftaran_Siswa::where('id_siswa', $siswa->id_siswa)->firstOrFail();

        $this->assertSame('Inactive', $siswa->status);
        $this->assertDatabaseHas('notifikasi_terkirim', [
            'user_id' => $adminUser->id,
            'id_admin' => $admin->id_admin,
        ]);

        $this->actingAs($parentUser)
            ->withSession([
                'registration.form' => [
                    'studentId' => $siswa->id_siswa,
                    'registrationId' => $pendaftaran->id_pendaftaran,
                ],
            ])
            ->postJson('/api/siswa/upload-bukti-pendaftaran', [
                'periode' => '2026',
                'jumlah' => 280000,
                'tanggal_bukti_bayar' => '2026-06-01',
                'bukti_bayar' => UploadedFile::fake()->create('bukti-pendaftaran.pdf', 20, 'application/pdf'),
            ])
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->actingAs($adminUser)
            ->getJson('/api/admin/pendaftaran-siswa')
            ->assertOk()
            ->assertJsonPath('status', true);

        $this->actingAs($adminUser)
            ->getJson("/api/admin/pendaftaran/{$pendaftaran->id_pendaftaran}")
            ->assertOk()
            ->assertJsonPath('data.id_siswa', $siswa->id_siswa);

        $this->actingAs($adminUser)
            ->postJson("/api/admin/pendaftaran/{$pendaftaran->id_pendaftaran}/validasi", [
                'val_nama_siswa' => 'tidak_valid',
                'val_nama_ibu' => 'valid',
                'val_nama_ayah' => 'valid',
                'val_umur' => 'valid',
                'val_akta' => 'tidak_valid',
                'val_kk' => 'valid',
                'val_rapor' => 'valid',
                'val_foto' => 'valid',
                'val_bukti_pembayaran' => 'tidak_valid',
            ])
            ->assertOk()
            ->assertJsonPath('status_approval', 'Revisi')
            ->assertJsonPath('siswa_status', 'Inactive');

        $this->actingAs($parentUser);
        $siswa->update(['user_id' => $parentUser->id]); // DIUBAH
        session(['id_siswa' => $siswa->id_siswa]);
        $revisionPayload = SsbInertiaData::parentPayload();
        $this->assertSame($siswa->id_siswa, $revisionPayload['reuploadRequest']['studentId']);
        $this->assertContains('childName', $revisionPayload['reuploadRequest']['invalidIdentityFields']);
        $this->assertContains('birthCert', $revisionPayload['reuploadRequest']['invalidUploadFields']);
        $this->assertContains('paymentProof', $revisionPayload['reuploadRequest']['invalidUploadFields']);

        $this->post('/api/login', [
            'email' => 'ortu-full-flow@gmail.com',
            'password' => 'Password1!',
            'role' => 'orang_tua',
        ], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('status', true)
            ->assertJsonPath('action', 'pilih_anak');

        $this->actingAs($parentUser)
            ->withHeaders(['Accept' => 'application/json'])
            ->post("/api/siswa/update-pendaftaran/{$siswa->id_siswa}", [
                'nama_siswa' => 'Anak Full Flow Revisi',
                'akta_kelahiran' => UploadedFile::fake()->create('akta-revisi.pdf', 20, 'application/pdf'),
                'paymentProof' => UploadedFile::fake()->create('bukti-revisi.jpg', 20, 'image/jpeg'),
            ])
            ->assertOk()
            ->assertJsonPath('success', true);

        $siswa->refresh();
        $pendaftaran->refresh();
        $this->assertSame('Anak Full Flow', $siswa->nama_siswa);
        $this->assertSame('Anak Full Flow Revisi', $pendaftaran->pending_nama_siswa);
        $this->assertSame('Menunggu', $pendaftaran->status_approval);
        $this->assertTrue(collect(SsbInertiaData::registrationRows())->contains(
            fn ($row) => $row['no'] === $pendaftaran->id_pendaftaran
                && $row['childName'] === 'Anak Full Flow Revisi'
        ));

        $this->actingAs($adminUser)
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
            ->assertJsonPath('status_approval', 'Disetujui')
            ->assertJsonPath('siswa_status', 'Active');
        $siswa->refresh();
        $pendaftaran->refresh();
        $this->assertSame('Anak Full Flow Revisi', $siswa->nama_siswa);
        $this->assertNull($pendaftaran->pending_nama_siswa);

        $this->assertDatabaseHas('siswa', [
            'id_siswa' => $siswa->id_siswa,
            'nama_siswa' => 'Anak Full Flow Revisi',
            'status' => 'Active',
        ]);
        $this->assertDatabaseHas('pendaftaran', [
            'id_siswa' => $siswa->id_siswa,
            'status_approval' => 'Disetujui',
        ]);
        $this->assertDatabaseHas('pembayaran', [
            'id_siswa' => $siswa->id_siswa,
            'jenis' => 'Pendaftaran',
            'status' => 'Lunas',
        ]);
        $this->assertDatabaseHas('bukti_pembayaran', [
            'id_siswa' => $siswa->id_siswa,
            'status' => 'diterima',
        ]);

        $this->actingAs($adminUser)
            ->postJson('/api/admin/tambah-pelatih', [
                'nama' => 'Pelatih Full Flow',
                'email' => 'pelatihfullflow@gmail.com',
                'password' => 'coachpass',
                'password_confirmation' => 'coachpass',
                'no_hp' => '081234567002',
            ])
            ->assertOk()
            ->assertJsonPath('success', true);

        $coachUser = User::where('email', 'pelatihfullflow@gmail.com')
            ->where('role', 'pelatih')
            ->firstOrFail();
        $pelatih = $coachUser->pelatih;

        $scheduleResponse = $this->actingAs($adminUser)
            ->postJson('/api/admin/tambah-jadwal', [
                'tanggal' => '2026-06-01', 
                'jam_mulai' => '15:00:00',
                'jam_selesai' => '17:00:00',
                'lokasi' => 'Lapangan Full Flow',
                'id_pelatih' => $pelatih->id_pelatih,
                'id_siswa' => [$siswa->id_siswa],
            ])
            ->assertOk()
            ->assertJsonPath('status', true);
        $scheduleId = $scheduleResponse->json('data.id_jadwal');

        $this->actingAs($adminUser)
            ->postJson('/api/admin/prestasi/tambah-prestasi', [
                'id_siswa' => [$siswa->id_siswa],
                'nama_prestasi' => 'Prestasi Full Flow',
                'tanggal_diberikan' => '2026-06-02',
            ])
            ->assertCreated()
            ->assertJsonPath('success', true);

        $this->actingAs($adminUser)
            ->postJson('/api/notifikasi/kirim', [
                'judul' => 'Info Orang Tua Full Flow',
                'isi' => 'Pesan untuk orang tua.',
                'target_role' => 'siswa',
                'id_siswa' => [$siswa->id_siswa],
            ])
            ->assertOk()
            ->assertJsonPath('jumlah_penerima', 1);

        $this->actingAs($adminUser)
            ->postJson('/api/notifikasi/kirim', [
                'judul' => 'Info Pelatih Full Flow',
                'isi' => 'Pesan untuk pelatih.',
                'target_role' => 'pelatih',
                'id_pelatih' => [$pelatih->id_pelatih],
            ])
            ->assertOk()
            ->assertJsonPath('jumlah_penerima', 1);

        $this->post('/api/login', [
            'email' => 'pelatihfullflow@gmail.com',
            'password' => 'coachpass',
            'role' => 'pelatih',
        ], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('status', true);

        $this->actingAs($coachUser)
            ->getJson('/api/pelatih/dashboard')
            ->assertOk();

        $this->actingAs($coachUser)
            ->postJson('/api/pelatih/presensi/input', [
                'id_jadwal' => $scheduleId,
                'tanggal' => '2026-06-01',
                'data' => [
                    ['id_siswa' => $siswa->id_siswa, 'status' => 'hadir'],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('status', true);

        $this->actingAs($coachUser)
            ->postJson("/api/pelatih/performa-siswa/input/{$scheduleId}", [
                'tanggal_penilaian' => '2026-06-01',
                'data' => [
                    [
                        'id_siswa' => $siswa->id_siswa,
                        'dribbling' => 80,
                        'passing' => 81,
                        'shooting' => 82,
                    ],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('status', true);

        $this->actingAs($coachUser)
            ->postJson('/api/pelatih/catatan-pelatih/tambah', [
                'catatan' => 'Catatan penuh dari pelatih.',
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
                'jumlah' => 100000,
                'tanggal_bukti_bayar' => '2026-06-01',
                'bukti_bayar' => UploadedFile::fake()->create('bukti-harian.pdf', 20, 'application/pdf'),
            ])
            ->assertCreated()
            ->assertJsonPath('success', true);

        $this->actingAs($adminUser)
            ->getJson('/api/admin/pembayaran-admin')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonFragment([
                'id_siswa' => $siswa->id_siswa,
                'jenis' => 'Harian',
                'jumlah' => 100000,
                'monthly_remaining_amount' => 0,
                'status' => 'Belum',
            ]);

        $coachProof = BuktiPembayaran::where('id_siswa', $siswa->id_siswa)
            ->whereHas('pembayaran', fn ($query) => $query->where('jenis', 'Harian'))
            ->latest('id_bukti_pembayaran')
            ->firstOrFail();

        $this->actingAs($adminUser)
            ->postJson("/api/admin/bukti/diterima/{$coachProof->id_bukti_pembayaran}")
            ->assertOk();

        $this->actingAs($parentUser);
        $siswa->update(['user_id' => $parentUser->id]); // DIUBAH
        session(['id_siswa' => $siswa->id_siswa]);
        $parentPayload = SsbInertiaData::parentPayload();

        $this->assertTrue(collect($parentPayload['trainingSchedules'])->contains(
            fn ($schedule) => (int) $schedule['rawId'] === (int) $scheduleId
        ));
        $this->assertTrue(collect($parentPayload['achievements'])->contains(
            fn ($achievement) => $achievement['title'] === 'Prestasi Full Flow'
        ));
        $this->assertSame(100, $parentPayload['attendanceRecaps'][0]['hadir']);
        $this->assertSame(80, $parentPayload['performanceHistory'][0]['dribbling']);
        $this->assertSame('Catatan penuh dari pelatih.', $parentPayload['coachNotes'][0]['note']);
        $this->assertTrue(collect($parentPayload['paymentHistory'])->contains(
            fn ($payment) => $payment['type'] === 'Pembayaran Harian' && $payment['status'] === 'Lunas'
        ));
        $this->assertTrue(collect($parentPayload['notifications'])->contains(
            fn ($notification) => str_contains($notification['text'], 'Info Orang Tua Full Flow')
        ));

        $coachNotifications = SsbInertiaData::coachNotifications($coachUser->id);
        $this->assertTrue(collect($coachNotifications)->contains(
            fn ($notification) => str_contains($notification['text'], 'Info Pelatih Full Flow')
        ));
    }
}
