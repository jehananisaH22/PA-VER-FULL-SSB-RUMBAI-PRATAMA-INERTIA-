<?php

namespace App\Services;

use App\Models\Siswa;
use App\Models\Notifikasi;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class SiswaPaymentStatusService
{
    public const MONTHLY_TARGET = 100000.0;

    public function monthlySummary(Siswa $siswa, ?string $period = null): array
    {
        $period = $period ?: now()->format('Y-m');
        $target = self::MONTHLY_TARGET;
        $acceptedPaid = $this->paidAmount($siswa->id_siswa, $period, ['diterima']);
        $pendingPaid = $this->paidAmount($siswa->id_siswa, $period, ['menunggu validasi']);
        $remaining = max(0, $target - $acceptedPaid);
        $periodDate = Carbon::createFromFormat('Y-m', $period)->startOfMonth()->locale('id');

        return [
            'period' => $period,
            'periodLabel' => $periodDate->translatedFormat('F Y'),
            'targetAmount' => $target,
            'paidAmount' => $acceptedPaid,
            'pendingAmount' => $pendingPaid,
            'remainingAmount' => $remaining,
            'status' => $remaining <= 0 ? 'complete' : 'partial',
        ];
    }

    public function syncMonthlyStatus(Siswa $siswa): Siswa
    {
        $previousPeriod = now()->subMonthNoOverflow()->format('Y-m');
        $periodEnd = Carbon::createFromFormat('Y-m', $previousPeriod)->endOfMonth();

        if ($this->studentJoinedAfter($siswa, $periodEnd) || ! $this->hasApprovedRegistration($siswa)) {
            return $siswa;
        }

        $summary = $this->monthlySummary($siswa, $previousPeriod);

        if ($summary['remainingAmount'] > 0 && in_array(strtolower((string) $siswa->status), ['active', 'aktif'], true)) {
            $siswa->forceFill(['status' => 'Inactive'])->save();
            $siswa->refresh();
        }

        if ($summary['remainingAmount'] > 0) {
            $this->notifyAdminsOfOverduePayment($siswa, $summary);
        }

        if (
            $summary['remainingAmount'] <= 0
            && strtolower((string) $siswa->status) !== 'active'
            && $this->hasApprovedRegistration($siswa)
        ) {
            $siswa->forceFill(['status' => 'Active'])->save();
            $siswa->refresh();
        }

        return $siswa;
    }

    public function overdueSummary(Siswa $siswa): ?array
    {
        $period = now()->subMonthNoOverflow()->format('Y-m');
        $periodEnd = Carbon::createFromFormat('Y-m', $period)->endOfMonth();

        if ($this->studentJoinedAfter($siswa, $periodEnd) || ! $this->hasApprovedRegistration($siswa)) {
            return null;
        }

        $summary = $this->monthlySummary($siswa, $period);

        if ($summary['remainingAmount'] <= 0) {
            return null;
        }

        return $summary + [
            'isLocked' => true,
            'studentId' => (int) $siswa->id_siswa,
            'studentName' => $siswa->nama_siswa,
        ];
    }

    public function syncAfterPaymentValidation(?Siswa $siswa): ?Siswa
    {
        return $siswa ? $this->syncMonthlyStatus($siswa) : null;
    }

    private function paidAmount(int $studentId, string $period, array $proofStatuses): float
    {
        $normalizedStatuses = array_map(
            fn ($status) => strtolower(trim((string) $status)),
            $proofStatuses
        );

        return (float) DB::table('pembayaran')
            ->join('bukti_pembayaran', 'pembayaran.id_pembayaran', '=', 'bukti_pembayaran.id_pembayaran')
            ->where('pembayaran.id_siswa', $studentId)
            ->where('pembayaran.jenis', 'Harian')
            ->where('pembayaran.periode', 'like', $period . '%')
            ->whereIn(DB::raw('LOWER(TRIM(bukti_pembayaran.status))'), $normalizedStatuses)
            ->select('pembayaran.id_pembayaran', 'pembayaran.jumlah')
            ->distinct()
            ->get()
            ->sum(fn ($payment) => (float) $payment->jumlah);
    }

    private function studentJoinedAfter(Siswa $siswa, Carbon $periodEnd): bool
    {
        $registrationDate = $siswa->pendaftaran?->tanggal_daftar;

        if (! $registrationDate) {
            return false;
        }

        return Carbon::parse($registrationDate)->startOfDay()->greaterThan($periodEnd);
    }

    private function hasApprovedRegistration(Siswa $siswa): bool
    {
        return DB::table('pendaftaran')
            ->where('id_siswa', $siswa->id_siswa)
            ->where('status_approval', 'Disetujui')
            ->exists()
            && DB::table('pembayaran')
                ->join('bukti_pembayaran', 'pembayaran.id_pembayaran', '=', 'bukti_pembayaran.id_pembayaran')
                ->where('pembayaran.id_siswa', $siswa->id_siswa)
                ->where('pembayaran.jenis', 'Pendaftaran')
                ->where('pembayaran.status', 'Lunas')
                ->whereRaw('LOWER(TRIM(bukti_pembayaran.status)) = ?', ['diterima'])
            ->exists();
    }

    private function notifyAdminsOfOverduePayment(Siswa $siswa, array $summary): void
    {
        $notificationId = DB::table('notifikasi_terkirim')
            ->join('notifikasi', 'notifikasi_terkirim.id_notifikasi', '=', 'notifikasi.id_notifikasi')
            ->where('notifikasi_terkirim.id_siswa', $siswa->id_siswa)
            ->where('notifikasi.target_role', 'admin')
            ->where('notifikasi.judul', 'Tunggakan Pembayaran')
            ->where('notifikasi.isi', 'like', '%' . $summary['periodLabel'] . '%')
            ->value('notifikasi.id_notifikasi');

        $admins = User::query()
            ->where('users.role', 'admin')
            ->leftJoin('admin', 'users.id', '=', 'admin.user_id')
            ->select('users.id as user_id', 'admin.id_admin')
            ->get();

        if ($admins->isEmpty()) {
            return;
        }

        $message = sprintf(
            '%s memiliki kekurangan pembayaran periode %s sebesar Rp%s. Pantau pelunasan pada menu Pembayaran.',
            $siswa->nama_siswa,
            $summary['periodLabel'],
            number_format($summary['remainingAmount'], 0, ',', '.')
        );

        if ($notificationId) {
            DB::table('notifikasi')->where('id_notifikasi', $notificationId)->update(['isi' => $message]);
        } else {
            $notificationId = Notifikasi::create([
                'judul' => 'Tunggakan Pembayaran',
                'isi' => $message,
                'target_role' => 'admin',
                'tanggal_kirim' => now(),
            ])->id_notifikasi;
        }

        $admins->each(function ($admin) use ($notificationId, $siswa) {
            $deliveryExists = DB::table('notifikasi_terkirim')
                ->where('id_notifikasi', $notificationId)
                ->where('user_id', $admin->user_id)
                ->exists();

            if (! $deliveryExists) {
                DB::table('notifikasi_terkirim')->insert([
                'id_notifikasi' => $notificationId,
                'user_id' => $admin->user_id,
                'id_siswa' => $siswa->id_siswa,
                'id_admin' => $admin->id_admin,
                'id_pelatih' => null,
                'status_baca' => 'Belum Dibaca',
                'tanggal_baca' => null,
                'created_at' => now(),
                'updated_at' => now(),
                ]);
            }
        });
    }
}
