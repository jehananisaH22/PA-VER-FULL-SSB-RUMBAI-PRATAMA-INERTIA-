<?php

namespace Tests\Unit;

use App\Models\Admin;
use App\Models\Siswa;
use App\Models\User;
use App\Services\SiswaPaymentStatusService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SiswaPaymentStatusServiceTest extends TestCase
{
    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_monthly_summary_counts_only_accepted_daily_payments_and_tracks_pending_amounts(): void
    {
        Carbon::setTestNow('2026-06-22 10:00:00');

        $student = $this->approvedStudent();
        $this->dailyPayment($student, '2026-06', 40000, 'diterima');
        $this->dailyPayment($student, '2026-06', 20000, ' DITERIMA ', duplicateAcceptedProof: true);
        $this->dailyPayment($student, '2026-06', 25000, 'Menunggu validasi');
        $this->dailyPayment($student, '2026-06', 100000, 'ditolak');
        $this->dailyPayment($student, '2026-05', 100000, 'diterima');

        $summary = app(SiswaPaymentStatusService::class)->monthlySummary($student, '2026-06');

        $this->assertSame('2026-06', $summary['period']);
        $this->assertSame('Juni 2026', $summary['periodLabel']);
        $this->assertSame(100000.0, $summary['targetAmount']);
        $this->assertSame(60000.0, $summary['paidAmount']);
        $this->assertSame(25000.0, $summary['pendingAmount']);
        $this->assertSame(40000.0, $summary['remainingAmount']);
        $this->assertSame('partial', $summary['status']);
    }

    public function test_monthly_summary_is_complete_when_accepted_payments_reach_target(): void
    {
        $student = $this->approvedStudent();
        $this->dailyPayment($student, '2026-06', 120000, 'diterima');

        $summary = app(SiswaPaymentStatusService::class)->monthlySummary($student, '2026-06');

        $this->assertSame(120000.0, $summary['paidAmount']);
        $this->assertEquals(0.0, $summary['remainingAmount']);
        $this->assertSame('complete', $summary['status']);
    }

    public function test_sync_monthly_status_deactivates_active_student_with_previous_month_debt_and_notifies_admin_once(): void
    {
        Carbon::setTestNow('2026-06-22 10:00:00');

        $adminUser = $this->adminUser();
        $student = $this->approvedStudent(status: 'Active', registeredAt: '2026-05-01');
        $this->dailyPayment($student, '2026-05', 35000, 'diterima');

        $service = app(SiswaPaymentStatusService::class);
        $syncedStudent = $service->syncMonthlyStatus($student->load('pendaftaran'));
        $service->syncMonthlyStatus($student->fresh()->load('pendaftaran'));

        $this->assertSame('Inactive', $syncedStudent->status);
        $this->assertDatabaseHas('notifikasi', [
            'judul' => 'Tunggakan Pembayaran',
            'target_role' => 'admin',
        ]);
        $this->assertDatabaseHas('notifikasi_terkirim', [
            'user_id' => $adminUser->id,
            'id_siswa' => $student->id_siswa,
            'status_baca' => 'Belum Dibaca',
        ]);
        $this->assertDatabaseCount('notifikasi', 1);
        $this->assertDatabaseCount('notifikasi_terkirim', 1);

        $summary = $service->overdueSummary($student->fresh()->load('pendaftaran'));

        $this->assertSame(35000.0, $summary['paidAmount']);
        $this->assertSame(65000.0, $summary['remainingAmount']);
        $this->assertTrue($summary['isLocked']);
        $this->assertSame($student->id_siswa, $summary['studentId']);
    }

    public function test_sync_monthly_status_reactivates_inactive_student_after_previous_month_is_fully_paid(): void
    {
        Carbon::setTestNow('2026-06-22 10:00:00');

        $student = $this->approvedStudent(status: 'Inactive', registeredAt: '2026-05-01');
        $this->dailyPayment($student, '2026-05', 100000, 'diterima');

        $syncedStudent = app(SiswaPaymentStatusService::class)
            ->syncMonthlyStatus($student->load('pendaftaran'));

        $this->assertSame('Active', $syncedStudent->status);
        $this->assertDatabaseCount('notifikasi', 0);
    }

    public function test_overdue_summary_ignores_students_without_business_eligibility_for_monthly_lock(): void
    {
        Carbon::setTestNow('2026-06-22 10:00:00');

        $service = app(SiswaPaymentStatusService::class);
        $newStudent = $this->approvedStudent(registeredAt: '2026-06-01');
        $unapprovedStudent = $this->studentWithRegistration('Menunggu', '2026-05-01');

        $this->assertNull($service->overdueSummary($newStudent->load('pendaftaran')));
        $this->assertNull($service->overdueSummary($unapprovedStudent->load('pendaftaran')));
    }

    private function approvedStudent(string $status = 'Active', string $registeredAt = '2026-05-01'): Siswa
    {
        $student = $this->studentWithRegistration('Disetujui', $registeredAt, $status);

        $registrationPaymentId = DB::table('pembayaran')->insertGetId([
            'id_siswa' => $student->id_siswa,
            'periode' => $registeredAt,
            'jumlah' => 280000,
            'tanggal_bayar' => $registeredAt,
            'status' => 'Lunas',
            'jenis' => 'Pendaftaran',
        ], 'id_pembayaran');

        DB::table('bukti_pembayaran')->insert([
            'id_pembayaran' => $registrationPaymentId,
            'id_siswa' => $student->id_siswa,
            'periode' => $registeredAt,
            'tanggal_bukti_bayar' => $registeredAt,
            'status' => 'diterima',
            'bukti_bayar' => 'test/registration.pdf',
        ]);

        return $student;
    }

    private function studentWithRegistration(
        string $approvalStatus,
        string $registeredAt,
        string $status = 'Active'
    ): Siswa {
        $student = Siswa::create([
            'nama_siswa' => 'Siswa Bisnis ' . uniqid(),
            'umur' => 12,
            'status' => $status,
        ]);

        DB::table('pendaftaran')->insert([
            'id_siswa' => $student->id_siswa,
            'tanggal_daftar' => $registeredAt,
            'status_approval' => $approvalStatus,
        ]);

        return $student;
    }

    private function dailyPayment(
        Siswa $student,
        string $period,
        float $amount,
        string $proofStatus,
        bool $duplicateAcceptedProof = false
    ): void {
        $paymentId = DB::table('pembayaran')->insertGetId([
            'id_siswa' => $student->id_siswa,
            'periode' => $period,
            'jumlah' => $amount,
            'tanggal_bayar' => $period . '-10',
            'status' => 'Lunas',
            'jenis' => 'Harian',
        ], 'id_pembayaran');

        $proof = [
            'id_pembayaran' => $paymentId,
            'id_siswa' => $student->id_siswa,
            'periode' => $period,
            'tanggal_bukti_bayar' => $period . '-10',
            'status' => $proofStatus,
            'bukti_bayar' => 'test/payment.pdf',
        ];

        DB::table('bukti_pembayaran')->insert($proof);

        if ($duplicateAcceptedProof) {
            DB::table('bukti_pembayaran')->insert($proof + [
                'bukti_bayar' => 'test/payment-duplicate.pdf',
            ]);
        }
    }

    private function adminUser(): User
    {
        $user = User::factory()->create(['role' => 'admin']);

        Admin::create([
            'user_id' => $user->id,
            'nama_admin' => 'Admin Unit Test',
            'email' => $user->email,
            'password' => $user->password,
        ]);

        return $user;
    }
}
