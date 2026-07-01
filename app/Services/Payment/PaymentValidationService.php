<?php

namespace App\Services\Payment;

use App\Models\BuktiPembayaran;
use App\Models\Jadwal_Latihan;
use App\Models\Pembayaran;
use App\Models\Pendaftaran_Siswa;
use App\Models\Siswa;
use App\Services\SiswaPaymentStatusService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class PaymentValidationService
{
    public function accept(int $proofId): array
    {
        return DB::transaction(function () use ($proofId) {
            $proof = BuktiPembayaran::with(['siswa.orangtua', 'siswa.pendaftaran', 'pembayaran'])
                ->findOrFail($proofId);
            $payment = $proof->pembayaran ?: Pembayaran::find($proof->id_pembayaran);
            $isRegistrationPayment = $this->isRegistrationPayment($payment);

            $proof->update(['status' => 'diterima']);

            if ($payment) {
                $payment->update([
                    'status' => 'Lunas',
                    'tanggal_bayar' => $payment->tanggal_bayar
                        ?: ($proof->tanggal_bukti_bayar ?: now()->toDateString()),
                ]);
            }

            $studentActivated = false;

            if ($isRegistrationPayment && $proof->siswa?->pendaftaran) {
                $registration = $proof->siswa->pendaftaran;

                if ($this->documentsAreExplicitlyValid($registration)) {
                    $registration->update(['status_approval' => 'Disetujui']);
                    $this->activateStudentAccount($proof->siswa);
                    $studentActivated = true;
                } elseif ($proof->siswa) {
                    $proof->siswa->update(['status' => 'Inactive']);
                }
            } elseif (! $isRegistrationPayment) {
                app(SiswaPaymentStatusService::class)->syncAfterPaymentValidation($proof->siswa);
                $studentActivated = strtolower((string) $proof->siswa?->fresh()?->status) === 'active';
            }

            return [
                'proof' => $proof->fresh(['siswa', 'pembayaran']),
                'payment' => $payment?->fresh(),
                'studentActivated' => $studentActivated,
            ];
        });
    }

    public function reject(int $proofId): array
    {
        return DB::transaction(function () use ($proofId) {
            $proof = BuktiPembayaran::with(['siswa.orangtua', 'siswa.pendaftaran', 'pembayaran'])
                ->findOrFail($proofId);
            $payment = $proof->pembayaran ?: Pembayaran::find($proof->id_pembayaran);
            $isRegistrationPayment = $this->isRegistrationPayment($payment);

            $proof->update(['status' => 'ditolak']);

            if ($isRegistrationPayment && $proof->siswa) {
                $proof->siswa->update(['status' => 'Inactive']);
            }

            if ($payment) {
                $payment->update(['status' => 'Belum']);
            }

            if ($isRegistrationPayment && $proof->siswa?->pendaftaran) {
                $proof->siswa->pendaftaran->update(['status_approval' => 'Revisi']);
            }

            return [
                'proof' => $proof->fresh(['siswa.pendaftaran', 'pembayaran']),
                'payment' => $payment?->fresh(),
            ];
        });
    }

    private function isRegistrationPayment(?Pembayaran $payment): bool
    {
        return strtolower((string) ($payment?->jenis ?? '')) === 'pendaftaran';
    }

    private function documentsAreExplicitlyValid(Pendaftaran_Siswa $registration): bool
    {
        $documentFields = [
            $registration->val_nama_siswa,
            $registration->val_nama_ibu,
            $registration->val_nama_ayah,
            $registration->val_umur,
            $registration->val_akta,
            $registration->val_kk,
            $registration->val_rapor,
            $registration->val_foto,
        ];

        $normalizedValues = collect($documentFields)
            ->map(fn ($value) => strtolower(trim($value ?? 'valid')));

        return $normalizedValues->every(fn ($value) => $value === 'valid')
            && $normalizedValues->count() === 8
            && collect($documentFields)->every(fn ($value) => ! is_null($value));
    }

    private function activateStudentAccount(?Siswa $student): void
    {
        if (! $student) {
            return;
        }

        if (! $this->studentRegistrationPaymentIsApproved($student)) {
            $student->update(['status' => 'Inactive']);
            return;
        }

        $student->update(['status' => 'Active']);
        $this->syncActiveStudentToCategorySchedules($student->fresh());
    }

    private function studentRegistrationPaymentIsApproved(Siswa $student): bool
    {
        $registrationIsApproved = Pendaftaran_Siswa::where('id_siswa', $student->id_siswa)
            ->where('status_approval', 'Disetujui')
            ->exists();

        if (! $registrationIsApproved) {
            return false;
        }

        return Pembayaran::query()
            ->join('bukti_pembayaran', 'pembayaran.id_pembayaran', '=', 'bukti_pembayaran.id_pembayaran')
            ->where('pembayaran.id_siswa', $student->id_siswa)
            ->where('pembayaran.jenis', 'Pendaftaran')
            ->where('pembayaran.status', 'Lunas')
            ->whereRaw('LOWER(bukti_pembayaran.status) = ?', ['diterima'])
            ->exists();
    }

    private function syncActiveStudentToCategorySchedules(?Siswa $student): void
    {
        if (! $student || strtolower((string) $student->status) !== 'active') {
            return;
        }

        $studentCategory = $this->studentCategoryFromModel($student);

        $schedules = Jadwal_Latihan::with('siswa:id_siswa,tanggal_lahir,umur')
            ->orderBy('id_jadwal')
            ->get()
            ->values();

        if ($schedules->isEmpty()) {
            return;
        }

        $matchingSchedules = $schedules->filter(function (Jadwal_Latihan $schedule) use ($studentCategory) {
            $storedCategory = $this->normalizeScheduleCategoryValue($schedule->kategori_umur ?? null);

            if ($storedCategory !== 'all') {
                return $storedCategory === $studentCategory;
            }

            if ($schedule->siswa->isEmpty()) {
                return true;
            }

            $scheduleCategories = $schedule->siswa
                ->map(fn ($student) => $this->studentCategoryFromModel($student))
                ->unique();

            return $scheduleCategories->contains($studentCategory);
        });

        if ($matchingSchedules->isEmpty()) {
            $matchingSchedules = collect([$schedules->first()]);
        }

        $matchingSchedules->each(function (Jadwal_Latihan $schedule) use ($student) {
            $schedule->siswa()->syncWithoutDetaching([$student->id_siswa]);
        });
    }

    private function normalizeScheduleCategoryValue(?string $category): string
    {
        $normalized = strtolower(preg_replace('/[^a-z0-9]/', '', (string) $category));

        if (preg_match('/^u?(\d{1,2})$/', $normalized, $match)) {
            $age = (int) $match[1];

            if ($age >= 6 && $age <= 16) {
                return 'u' . $age;
            }
        }

        return 'all';
    }

    private function studentCategoryFromModel(?object $student): string
    {
        return $this->studentCategoryValue($this->studentAgeValue($student));
    }

    private function studentAgeValue(?object $student): ?int
    {
        if (! $student) {
            return null;
        }

        if (! empty($student->tanggal_lahir)) {
            return Carbon::parse($student->tanggal_lahir)->age;
        }

        return $student->umur !== null ? (int) $student->umur : null;
    }

    private function studentCategoryValue(?int $age): string
    {
        if ($age === null) {
            return 'all';
        }

        $age = max(6, min(16, $age));

        return 'u' . $age;
    }
}
