<?php

namespace Tests\Unit;

use App\Models\Jadwal_Latihan;
use App\Models\Siswa;
use App\Services\Payment\PaymentValidationService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PaymentValidationServiceTest extends TestCase
{
    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_accept_registration_payment_activates_student_when_documents_are_valid(): void
    {
        Carbon::setTestNow('2026-06-22 10:00:00');

        $student = Siswa::create([
            'nama_siswa' => 'Siswa Validasi Pendaftaran',
            'umur' => 12,
            'status' => 'Inactive',
        ]);
        $this->registration($student, 'Menunggu', validDocuments: true);
        $proofId = $this->paymentProof($student, 'Pendaftaran', '2026-06', 280000);
        $schedule = Jadwal_Latihan::create([
            'tanggal' => '2026-06-30',
            'jam_mulai' => '08:00:00',
            'jam_selesai' => '10:00:00',
            'lokasi' => 'Lapangan Unit',
            'kategori_umur' => 'U-12',
        ]);

        $result = app(PaymentValidationService::class)->accept($proofId);

        $this->assertTrue($result['studentActivated']);
        $this->assertSame('diterima', $result['proof']->status);
        $this->assertSame('Lunas', $result['payment']->status);
        $this->assertDatabaseHas('siswa', [
            'id_siswa' => $student->id_siswa,
            'status' => 'Active',
        ]);
        $this->assertDatabaseHas('pendaftaran', [
            'id_siswa' => $student->id_siswa,
            'status_approval' => 'Disetujui',
        ]);
        $this->assertDatabaseHas('jadwal_siswa', [
            'id_jadwal' => $schedule->id_jadwal,
            'id_siswa' => $student->id_siswa,
        ]);
    }

    public function test_reject_registration_payment_marks_student_inactive_and_registration_revision(): void
    {
        $student = Siswa::create([
            'nama_siswa' => 'Siswa Bukti Ditolak',
            'umur' => 10,
            'status' => 'Active',
        ]);
        $this->registration($student, 'Disetujui', validDocuments: true);
        $proofId = $this->paymentProof($student, 'Pendaftaran', '2026-06', 280000);

        $result = app(PaymentValidationService::class)->reject($proofId);

        $this->assertSame('ditolak', $result['proof']->status);
        $this->assertSame('Belum', $result['payment']->status);
        $this->assertDatabaseHas('siswa', [
            'id_siswa' => $student->id_siswa,
            'status' => 'Inactive',
        ]);
        $this->assertDatabaseHas('pendaftaran', [
            'id_siswa' => $student->id_siswa,
            'status_approval' => 'Revisi',
        ]);
    }

    public function test_accept_daily_payment_reactivates_student_when_previous_month_target_is_paid(): void
    {
        Carbon::setTestNow('2026-06-22 10:00:00');

        $student = Siswa::create([
            'nama_siswa' => 'Siswa Harian Lunas',
            'umur' => 11,
            'status' => 'Inactive',
        ]);
        $this->registration($student, 'Disetujui', validDocuments: true);
        $this->acceptedRegistrationPayment($student);
        $proofId = $this->paymentProof($student, 'Harian', '2026-05', 100000);

        $result = app(PaymentValidationService::class)->accept($proofId);

        $this->assertTrue($result['studentActivated']);
        $this->assertSame('diterima', $result['proof']->status);
        $this->assertDatabaseHas('siswa', [
            'id_siswa' => $student->id_siswa,
            'status' => 'Active',
        ]);
    }

    private function registration(Siswa $student, string $status, bool $validDocuments): void
    {
        $documentStatus = $validDocuments ? 'valid' : null;

        DB::table('pendaftaran')->insert([
            'id_siswa' => $student->id_siswa,
            'tanggal_daftar' => '2026-05-01',
            'status_approval' => $status,
            'val_nama_siswa' => $documentStatus,
            'val_nama_ibu' => $documentStatus,
            'val_nama_ayah' => $documentStatus,
            'val_umur' => $documentStatus,
            'val_akta' => $documentStatus,
            'val_kk' => $documentStatus,
            'val_rapor' => $documentStatus,
            'val_foto' => $documentStatus,
        ]);
    }

    private function paymentProof(Siswa $student, string $type, string $period, float $amount): int
    {
        $paymentId = DB::table('pembayaran')->insertGetId([
            'id_siswa' => $student->id_siswa,
            'periode' => $period,
            'jumlah' => $amount,
            'tanggal_bayar' => null,
            'status' => 'Belum',
            'jenis' => $type,
        ], 'id_pembayaran');

        return DB::table('bukti_pembayaran')->insertGetId([
            'id_pembayaran' => $paymentId,
            'id_siswa' => $student->id_siswa,
            'periode' => $period,
            'tanggal_bukti_bayar' => $period . '-10',
            'status' => 'Menunggu validasi',
            'bukti_bayar' => 'test/payment.pdf',
        ], 'id_bukti_pembayaran');
    }

    private function acceptedRegistrationPayment(Siswa $student): void
    {
        $paymentId = DB::table('pembayaran')->insertGetId([
            'id_siswa' => $student->id_siswa,
            'periode' => '2026-05',
            'jumlah' => 280000,
            'tanggal_bayar' => '2026-05-01',
            'status' => 'Lunas',
            'jenis' => 'Pendaftaran',
        ], 'id_pembayaran');

        DB::table('bukti_pembayaran')->insert([
            'id_pembayaran' => $paymentId,
            'id_siswa' => $student->id_siswa,
            'periode' => '2026-05',
            'tanggal_bukti_bayar' => '2026-05-01',
            'status' => 'diterima',
            'bukti_bayar' => 'test/registration.pdf',
        ]);
    }
}
