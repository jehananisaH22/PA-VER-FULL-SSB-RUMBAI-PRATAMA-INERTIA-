<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\OrangTua;
use App\Models\Siswa;
use App\Models\User;
use App\Services\SiswaPaymentStatusService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class MonthlyPaymentLockTest extends TestCase
{
    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_previous_month_debt_stays_locked_until_admin_accepts_the_full_amount(): void
    {
        Carbon::setTestNow('2026-06-22 10:00:00');

        $parentUser = User::factory()->create([
            'role' => 'orang_tua',
            'email' => 'monthly-lock-parent@example.com',
        ]);
        $parent = OrangTua::create([
            'user_id' => $parentUser->id,
            'nama_ortu' => 'Orang Tua Galang',
            'email' => $parentUser->email,
            'password' => $parentUser->password,
            'no_hp' => '081200000099',
        ]);
        $student = Siswa::create([
            'user_id' => $parentUser->id,
            'id_ortu' => $parent->id_ortu,
            'nama_siswa' => 'Galang Rambu Anarki',
            'nama_ayah' => 'Ayah Galang',
            'nama_ibu' => 'Ibu Galang',
            'umur' => 12,
            'status' => 'Active',
        ]);

        DB::table('pendaftaran')->insert([
            'id_siswa' => $student->id_siswa,
            'tanggal_daftar' => '2026-05-01',
            'status_approval' => 'Disetujui',
        ]);
        $registrationPaymentId = DB::table('pembayaran')->insertGetId([
            'id_siswa' => $student->id_siswa,
            'periode' => '2026-05',
            'jumlah' => 280000,
            'tanggal_bayar' => '2026-05-01',
            'status' => 'Lunas',
            'jenis' => 'Pendaftaran',
        ], 'id_pembayaran');
        DB::table('bukti_pembayaran')->insert([
            'id_pembayaran' => $registrationPaymentId,
            'id_siswa' => $student->id_siswa,
            'periode' => '2026-05',
            'tanggal_bukti_bayar' => '2026-05-01',
            'status' => 'diterima',
            'bukti_bayar' => 'test/registration.pdf',
        ]);

        $service = app(SiswaPaymentStatusService::class);
        $student->load('pendaftaran');

        $this->assertSame(100000.0, $service->overdueSummary($student)['remainingAmount']);
        $this->assertSame('Mei 2026', $service->overdueSummary($student)['periodLabel']);
        $this->assertSame('Inactive', $service->syncMonthlyStatus($student)->status);

        $partialPaymentId = DB::table('pembayaran')->insertGetId([
            'id_siswa' => $student->id_siswa,
            'periode' => '2026-05',
            'jumlah' => 40000,
            'tanggal_bayar' => '2026-06-10',
            'status' => 'Lunas',
            'jenis' => 'Harian',
        ], 'id_pembayaran');
        DB::table('bukti_pembayaran')->insert([
            'id_pembayaran' => $partialPaymentId,
            'id_siswa' => $student->id_siswa,
            'periode' => '2026-05',
            'tanggal_bukti_bayar' => '2026-06-10',
            'status' => 'diterima',
            'bukti_bayar' => 'test/partial-one.pdf',
        ]);
        // Bukti ganda untuk satu transaksi tidak boleh membuat nominal terhitung dua kali.
        DB::table('bukti_pembayaran')->insert([
            'id_pembayaran' => $partialPaymentId,
            'id_siswa' => $student->id_siswa,
            'periode' => '2026-05',
            'tanggal_bukti_bayar' => '2026-06-10',
            'status' => 'diterima',
            'bukti_bayar' => 'test/partial-two.pdf',
        ]);

        $partialSummary = $service->overdueSummary($student->fresh()->load('pendaftaran'));
        $this->assertSame(40000.0, $partialSummary['paidAmount']);
        $this->assertSame(60000.0, $partialSummary['remainingAmount']);

        $finalPaymentId = DB::table('pembayaran')->insertGetId([
            'id_siswa' => $student->id_siswa,
            'periode' => '2026-05',
            'jumlah' => 60000,
            'tanggal_bayar' => '2026-06-22',
            'status' => 'Belum',
            'jenis' => 'Harian',
        ], 'id_pembayaran');
        $finalProofId = DB::table('bukti_pembayaran')->insertGetId([
            'id_pembayaran' => $finalPaymentId,
            'id_siswa' => $student->id_siswa,
            'periode' => '2026-05',
            'tanggal_bukti_bayar' => '2026-06-22',
            'status' => 'Menunggu validasi',
            'bukti_bayar' => 'test/final.pdf',
        ], 'id_bukti_pembayaran');

        $pendingSummary = $service->overdueSummary($student->fresh()->load('pendaftaran'));
        $this->assertSame(60000.0, $pendingSummary['remainingAmount']);
        $this->assertSame(60000.0, $pendingSummary['pendingAmount']);
        $this->assertSame('Inactive', $student->fresh()->status);

        $adminUser = User::factory()->create(['role' => 'admin']);
        Admin::create([
            'user_id' => $adminUser->id,
            'nama_admin' => 'Admin Pembayaran',
            'email' => $adminUser->email,
            'password' => $adminUser->password,
        ]);

        $this->actingAs($adminUser)
            ->postJson("/api/admin/bukti/diterima/{$finalProofId}")
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertNull($service->overdueSummary($student->fresh()->load('pendaftaran')));
        $this->assertSame('Active', $student->fresh()->status);
    }

    public function test_student_who_joined_after_the_previous_month_is_not_locked(): void
    {
        Carbon::setTestNow('2026-06-22 10:00:00');

        $student = Siswa::create([
            'nama_siswa' => 'Siswa Baru Juni',
            'nama_ayah' => 'Ayah',
            'nama_ibu' => 'Ibu',
            'umur' => 10,
            'status' => 'Active',
        ]);
        DB::table('pendaftaran')->insert([
            'id_siswa' => $student->id_siswa,
            'tanggal_daftar' => '2026-06-01',
            'status_approval' => 'Disetujui',
        ]);
        $registrationPaymentId = DB::table('pembayaran')->insertGetId([
            'id_siswa' => $student->id_siswa,
            'periode' => '2026-06',
            'jumlah' => 280000,
            'tanggal_bayar' => '2026-06-01',
            'status' => 'Lunas',
            'jenis' => 'Pendaftaran',
        ], 'id_pembayaran');
        DB::table('bukti_pembayaran')->insert([
            'id_pembayaran' => $registrationPaymentId,
            'id_siswa' => $student->id_siswa,
            'periode' => '2026-06',
            'tanggal_bukti_bayar' => '2026-06-01',
            'status' => 'diterima',
            'bukti_bayar' => 'test/new-student.pdf',
        ]);

        $this->assertNull(
            app(SiswaPaymentStatusService::class)->overdueSummary($student->load('pendaftaran'))
        );
    }
}
