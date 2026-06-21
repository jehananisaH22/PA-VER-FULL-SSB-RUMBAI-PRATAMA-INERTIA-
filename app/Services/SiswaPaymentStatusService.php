<?php

namespace App\Services;

use App\Models\Siswa;
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
        $periodDate = Carbon::createFromFormat('Y-m', $period)->startOfMonth();

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

        if ($this->studentJoinedAfter($siswa, $periodEnd)) {
            return $siswa;
        }

        if (! $this->hasDailyPaymentInPeriod($siswa->id_siswa, $previousPeriod)) {
            return $siswa;
        }

        $summary = $this->monthlySummary($siswa, $previousPeriod);

        if ($summary['remainingAmount'] > 0 && strtolower((string) $siswa->status) === 'active') {
            $siswa->forceFill(['status' => 'Inactive'])->save();
            $siswa->refresh();
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
            ->sum('pembayaran.jumlah');
    }

    private function hasDailyPaymentInPeriod(int $studentId, string $period): bool
    {
        return DB::table('pembayaran')
            ->where('id_siswa', $studentId)
            ->where('jenis', 'Harian')
            ->where('periode', 'like', $period . '%')
            ->exists();
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
}
