<?php

namespace Tests\Feature;

use App\Mail\SendPasswordMail;
use App\Models\Jadwal_Latihan;
use App\Models\Pelatih;
use App\Models\Siswa;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class AdminCoachAccountTest extends TestCase
{
    public function test_admin_can_add_coach_with_email_already_used_by_parent_role(): void
    {
        Mail::fake();

        $email = 'jean.humairah@gmail.com';
        $admin = User::factory()->create(['role' => 'admin']);

        User::factory()->create([
            'email' => $email,
            'role' => 'orang_tua',
        ]);

        $this->actingAs($admin)
            ->postJson('/api/admin/tambah-pelatih', [
                'nama' => 'TestPelatih',
                'email' => $email,
                'no_hp' => '082285939464',
                'password' => 'password123',
                'password_confirmation' => 'password123',
            ])
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('users', [
            'email' => $email,
            'role' => 'orang_tua',
        ]);

        $this->assertDatabaseHas('users', [
            'email' => $email,
            'role' => 'pelatih',
        ]);

        $this->assertDatabaseHas('pelatih', [
            'email' => $email,
            'nama_pelatih' => 'TestPelatih',
        ]);

        Mail::assertSent(SendPasswordMail::class);
    }

    public function test_login_uses_email_and_role_when_same_email_exists_in_multiple_roles(): void
    {
        $email = 'shared.login@gmail.com';

        User::factory()->create([
            'email' => $email,
            'role' => 'orang_tua',
            'password' => Hash::make('parent123'),
        ]);

        $coach = User::factory()->create([
            'email' => $email,
            'role' => 'pelatih',
            'password' => Hash::make('coach123'),
        ]);

        $this->postJson('/api/login', [
            'email' => $email,
            'password' => 'coach123',
            'role' => 'pelatih',
        ])
            ->assertOk()
            ->assertJsonPath('role', 'pelatih');

        $this->assertAuthenticatedAs($coach);
    }

    public function test_admin_can_delete_coach_with_existing_training_history(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $coachUser = User::factory()->create(['role' => 'pelatih']);

        $pelatih = Pelatih::create([
            'user_id' => $coachUser->id,
            'nama_pelatih' => 'Pelatih Riwayat',
            'email' => 'riwayat.pelatih@example.test',
            'no_hp' => '+628123456789',
        ]);

        $siswa = Siswa::create([
            'nama_siswa' => 'Siswa Riwayat',
            'umur' => 12,
            'status' => 'Active',
        ]);

        $jadwal = Jadwal_Latihan::create([
            'id_pelatih' => $pelatih->id_pelatih,
            'tanggal' => '2026-06-15',
            'jam_mulai' => '07:30:00',
            'jam_selesai' => '09:30:00',
            'lokasi' => 'Lapangan Test',
            'kategori_umur' => 'U-12',
        ]);

        DB::table('presensi')->insert([
            'id_siswa' => $siswa->id_siswa,
            'id_jadwal' => $jadwal->id_jadwal,
            'id_pelatih' => $pelatih->id_pelatih,
            'tanggal_presensi' => '2026-06-15',
            'status_kehadiran' => 'Hadir',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('performa_siswa')->insert([
            'id_siswa' => $siswa->id_siswa,
            'id_jadwal' => $jadwal->id_jadwal,
            'id_pelatih' => $pelatih->id_pelatih,
            'tanggal_penilaian' => '2026-06-15',
            'dribbling' => 80,
            'passing' => 80,
            'shooting' => 80,
            'rata_rata' => 80,
            'keterangan' => 'Baik',
        ]);

        DB::table('catatan_pelatih')->insert([
            'id_siswa' => $siswa->id_siswa,
            'id_pelatih' => $pelatih->id_pelatih,
            'tanggal_catatan' => '2026-06-15',
            'catatan' => 'Catatan riwayat',
        ]);

        $notifikasiId = DB::table('notifikasi')->insertGetId([
            'judul' => 'Tes',
            'isi' => 'Tes hapus pelatih',
            'target_role' => 'pelatih',
            'tanggal_kirim' => now(),
        ]);

        DB::table('notifikasi_terkirim')->insert([
            'id_notifikasi' => $notifikasiId,
            'user_id' => $coachUser->id,
            'id_pelatih' => $pelatih->id_pelatih,
            'status_baca' => 'Belum Dibaca',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($admin)
            ->deleteJson("/api/admin/hapus-pelatih/{$pelatih->id_pelatih}")
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('pelatih', ['id_pelatih' => $pelatih->id_pelatih]);
        $this->assertDatabaseMissing('users', ['id' => $coachUser->id]);
        $this->assertDatabaseHas('jadwal_latihan', [
            'id_jadwal' => $jadwal->id_jadwal,
            'id_pelatih' => null,
        ]);
        $this->assertDatabaseHas('presensi', [
            'id_siswa' => $siswa->id_siswa,
            'id_pelatih' => null,
        ]);
        $this->assertDatabaseHas('performa_siswa', [
            'id_siswa' => $siswa->id_siswa,
            'id_pelatih' => null,
        ]);
        $this->assertDatabaseHas('catatan_pelatih', [
            'id_siswa' => $siswa->id_siswa,
            'id_pelatih' => null,
        ]);
        $this->assertDatabaseHas('notifikasi_terkirim', [
            'id_notifikasi' => $notifikasiId,
            'id_pelatih' => null,
            'user_id' => null,
        ]);
    }
}
