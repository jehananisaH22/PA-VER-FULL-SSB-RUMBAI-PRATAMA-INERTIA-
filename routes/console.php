<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Facades\Storage;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('registrations:purge-expired {--days=30} {--dry-run}', function () {
    $days = max(1, (int) $this->option('days'));
    $cutoffDate = now()->subDays($days)->toDateString();

    $registrations = DB::table('pendaftaran')
        ->join('siswa', 'pendaftaran.id_siswa', '=', 'siswa.id_siswa')
        ->whereIn('pendaftaran.status_approval', ['Menunggu', 'Revisi'])
        ->whereDate('pendaftaran.tanggal_daftar', '<=', $cutoffDate)
        ->select(
            'pendaftaran.id_pendaftaran',
            'pendaftaran.id_siswa',
            'siswa.akta_kelahiran',
            'siswa.kartu_keluarga',
            'siswa.rapor',
            'siswa.pas_photo_3x4',
            'pendaftaran.pending_akta_kelahiran',
            'pendaftaran.pending_kartu_keluarga',
            'pendaftaran.pending_rapor',
            'pendaftaran.pending_pas_photo_3x4'
        )
        ->get();

    if ($registrations->isEmpty()) {
        $this->info("Tidak ada pendaftaran kedaluwarsa lebih dari {$days} hari.");
        return 0;
    }

    if ($this->option('dry-run')) {
        $this->info("Ditemukan {$registrations->count()} pendaftaran kedaluwarsa lebih dari {$days} hari.");
        return 0;
    }

    DB::transaction(function () use ($registrations) {
        $studentIds = $registrations->pluck('id_siswa')->unique()->values();
        $paymentIds = DB::table('pembayaran')
            ->whereIn('id_siswa', $studentIds)
            ->pluck('id_pembayaran');

        $proofFiles = DB::table('bukti_pembayaran')
            ->whereIn('id_siswa', $studentIds)
            ->orWhereIn('id_pembayaran', $paymentIds)
            ->pluck('bukti_bayar')
            ->filter();

        $studentFiles = $registrations
            ->flatMap(fn ($registration) => [
                $registration->akta_kelahiran,
                $registration->kartu_keluarga,
                $registration->rapor,
                $registration->pas_photo_3x4,
                $registration->pending_akta_kelahiran,
                $registration->pending_kartu_keluarga,
                $registration->pending_rapor,
                $registration->pending_pas_photo_3x4,
            ])
            ->filter();

        $proofFiles->each(fn ($path) => Storage::disk('public')->delete($path));
        $studentFiles->each(fn ($path) => Storage::disk('local')->delete($path));

        DB::table('bukti_pembayaran')
            ->whereIn('id_siswa', $studentIds)
            ->orWhereIn('id_pembayaran', $paymentIds)
            ->delete();
        DB::table('pembayaran')->whereIn('id_siswa', $studentIds)->delete();
        DB::table('pendaftaran')->whereIn('id_siswa', $studentIds)->delete();
        DB::table('notifikasi_terkirim')->whereIn('id_siswa', $studentIds)->delete();
        DB::table('jadwal_siswa')->whereIn('id_siswa', $studentIds)->delete();
        DB::table('profil_siswa')->whereIn('id_siswa', $studentIds)->delete();
        DB::table('siswa')->whereIn('id_siswa', $studentIds)->delete();
    });

    $this->info("Berhasil menghapus {$registrations->count()} pendaftaran kedaluwarsa.");
    return 0;
})->purpose('Delete stale pending or revision registrations after the allowed revision window');

Schedule::command('registrations:purge-expired')->daily();
