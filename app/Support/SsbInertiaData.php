<?php

namespace App\Support;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class SsbInertiaData
{
    private static function activeStatusValues(): array
    {
        return ['active', 'aktif'];
    }

    private static function activeStudentIds(): array
    {
        return DB::table('siswa')
            ->whereIn(DB::raw('LOWER(COALESCE(status, ""))'), self::activeStatusValues())
            ->pluck('id_siswa')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }

    public static function categoryFromAge(?int $age): string
    {
        if ($age !== null && $age <= 10) {
            return 'U-10';
        }

        if ($age === 11) {
            return 'U-11';
        }

        return 'U-12';
    }

    public static function categoryValue(string $category): string
    {
        return strtolower(str_replace('-', '', $category));
    }

    public static function monthKey($date): string
    {
        return strtolower(Carbon::parse($date)->locale('id')->translatedFormat('F'));
    }

    public static function dateSlash($date): string
    {
        return Carbon::parse($date)->format('d/m/Y');
    }

    public static function timestamp($date): int
    {
        return Carbon::parse($date)->getTimestamp() * 1000;
    }

    public static function students(bool $activeOnly = false, ?array $studentIds = null): array
    {
        $query = DB::table('siswa')
            ->leftJoin('orang_tua', 'siswa.id_ortu', '=', 'orang_tua.id_ortu')
            ->select('siswa.*', 'orang_tua.email as parent_email');

        if ($activeOnly) {
            $query->whereIn(DB::raw('LOWER(COALESCE(siswa.status, ""))'), self::activeStatusValues());
        }

        if ($studentIds !== null) {
            $query->whereIn('siswa.id_siswa', $studentIds);
        }

        return $query
            ->orderBy('siswa.nama_siswa')
            ->get()
            ->map(function ($student) {
                return [
                    'id' => $student->id_siswa,
                    'name' => $student->nama_siswa,
                    'email' => $student->parent_email ?: '-',
                    'category' => self::categoryFromAge((int) $student->umur),
                    'status' => $student->status,
                ];
            })
            ->values()
            ->all();
    }

    public static function studentDirectory(bool $activeOnly = false, ?array $studentIds = null): array
    {
        return collect(self::students($activeOnly, $studentIds))
            ->map(fn ($student) => [
                ...$student,
                'category' => self::categoryValue($student['category']),
            ])
            ->all();
    }

    private static function attendanceDateValue(object $row): mixed
    {
        $attendanceDate = property_exists($row, 'tanggal_presensi') ? $row->tanggal_presensi : null;

        return $attendanceDate ?: ($row->created_at ?: $row->tanggal);
    }

    public static function coaches(): array
    {
        $coachRows = DB::table('pelatih')->orderBy('nama_pelatih')->get();

        if ($coachRows->isEmpty()) {
            $coachRows = User::query()
                ->where('role', 'pelatih')
                ->get()
                ->map(fn ($user) => (object) [
                    'id_pelatih' => $user->id,
                    'nama_pelatih' => $user->name,
                    'email' => $user->email,
                    'no_hp' => null,
                ]);
        }

        return $coachRows
            ->map(fn ($coach) => [
                'id' => $coach->id_pelatih,
                'name' => $coach->nama_pelatih,
                'email' => $coach->email ?: '-',
                'phone' => $coach->no_hp ?: '-',
            ])
            ->values()
            ->all();
    }

    public static function schedules(?array $studentIds = null, bool $activeOnly = false, ?int $coachId = null): array
    {
        $rows = DB::table('jadwal_latihan')
            ->leftJoin('pelatih', 'jadwal_latihan.id_pelatih', '=', 'pelatih.id_pelatih')
            ->select('jadwal_latihan.*', 'pelatih.nama_pelatih')
            ->when($coachId, function ($query) use ($coachId) {
                $query->where(function ($builder) use ($coachId) {
                    $builder->where('jadwal_latihan.id_pelatih', $coachId)
                        ->orWhereNull('jadwal_latihan.id_pelatih');
                });
            })
            ->orderByDesc('jadwal_latihan.tanggal')
            ->get();

        return $rows->map(function ($schedule) use ($studentIds, $activeOnly) {
            $students = DB::table('jadwal_siswa')
                ->join('siswa', 'jadwal_siswa.id_siswa', '=', 'siswa.id_siswa')
                ->where('jadwal_siswa.id_jadwal', $schedule->id_jadwal)
                ->when($activeOnly, function ($query) {
                    $query->whereIn(DB::raw('LOWER(COALESCE(siswa.status, ""))'), self::activeStatusValues());
                })
                ->select('siswa.id_siswa', 'siswa.nama_siswa', 'siswa.umur')
                ->get();

            $storedCategory = $schedule->kategori_umur !== null
                ? self::categoryValue((string) $schedule->kategori_umur)
                : null;
            $date = Carbon::parse($schedule->tanggal)->locale('id');
            $isRoutineSchedule = in_array($date->dayOfWeek, [Carbon::WEDNESDAY, Carbon::SUNDAY], true);

            if ($isRoutineSchedule && $students->isEmpty()) {
                $routineStudents = DB::table('siswa')
                    ->whereIn(DB::raw('LOWER(COALESCE(status, ""))'), self::activeStatusValues())
                    ->select('id_siswa', 'nama_siswa', 'umur')
                    ->orderBy('nama_siswa')
                    ->get();

                if ($storedCategory && $storedCategory !== 'all') {
                    $routineStudents = $routineStudents
                        ->filter(fn ($student) => self::categoryValue(self::categoryFromAge((int) $student->umur)) === $storedCategory)
                        ->values();
                }

                if ($activeOnly && $routineStudents->isEmpty()) {
                    return null;
                }

                $students = $routineStudents;
            }

            if ($activeOnly && $students->isEmpty()) {
                return null;
            }

            if ($studentIds !== null && $students->isNotEmpty()) {
                $hasSelectedStudent = $students
                    ->pluck('id_siswa')
                    ->intersect($studentIds)
                    ->isNotEmpty();

                if (! $hasSelectedStudent) {
                    return null;
                }
            }

            $studentCategories = $students
                ->map(fn ($student) => self::categoryValue(self::categoryFromAge((int) $student->umur)))
                ->unique()
                ->values();
            $firstCategory = $storedCategory
                ?: ($studentCategories->count() === 1 ? $studentCategories->first() : 'all');
            $studentNames = $students->pluck('nama_siswa')->values()->all();
            $selectedStudentIds = $students->pluck('id_siswa')->values()->all();
            $displayStudentNames = $studentNames;

            return [
                'id' => 'schedule-' . $schedule->id_jadwal,
                'rawId' => $schedule->id_jadwal,
                'scheduleId' => 'schedule-' . $schedule->id_jadwal,
                'day' => $date->translatedFormat('l'),
                'date' => $date->toDateString(),
                'time' => Carbon::parse($schedule->jam_mulai)->format('H.i') . '-' .
                    Carbon::parse($schedule->jam_selesai)->format('H.i') . ' WIB',
                'place' => $schedule->lokasi ?: '-',
                'location' => $schedule->lokasi ?: '-',
                'category' => $firstCategory,
                'categoryLabel' => $firstCategory === 'all' ? 'Semua Kategori' : strtoupper(str_replace('u', 'U-', $firstCategory)),
                'targetLabel' => count($displayStudentNames) > 0 ? implode(', ', array_slice($displayStudentNames, 0, 2)) : 'Semua Siswa',
                'studentName' => count($displayStudentNames) === 1 ? $displayStudentNames[0] : (count($displayStudentNames) > 1 ? 'multiple' : 'all'),
                'studentNames' => $displayStudentNames,
                'studentIds' => $selectedStudentIds,
                'coachId' => $schedule->id_pelatih ? (int) $schedule->id_pelatih : null,
                'coachName' => $schedule->nama_pelatih ?: '-',
                'isRoutine' => $isRoutineSchedule,
            ];
        })->filter()->values()->all();
    }

    public static function attendanceRecaps(?array $studentIds = null, bool $activeOnly = false): array
    {
        $query = DB::table('presensi')
            ->join('siswa', 'presensi.id_siswa', '=', 'siswa.id_siswa')
            ->leftJoin('jadwal_latihan', 'presensi.id_jadwal', '=', 'jadwal_latihan.id_jadwal')
            ->leftJoin('pelatih', 'presensi.id_pelatih', '=', 'pelatih.id_pelatih')
            ->select(
                'presensi.*',
                'siswa.nama_siswa',
                'siswa.umur',
                'jadwal_latihan.tanggal',
                'jadwal_latihan.jam_mulai',
                'jadwal_latihan.jam_selesai',
                'jadwal_latihan.lokasi',
                'pelatih.nama_pelatih'
            );

        if ($activeOnly) {
            $query->whereIn(DB::raw('LOWER(COALESCE(siswa.status, ""))'), self::activeStatusValues());
        }

        if ($studentIds !== null) {
            $query->whereIn('presensi.id_siswa', $studentIds);
        }

        return $query->get()
            ->groupBy(fn ($row) => $row->id_siswa . '-' . Carbon::parse(self::attendanceDateValue($row))->format('Y-m'))
            ->map(function ($rows) {
                $rows = $rows->sortBy(fn ($row) => Carbon::parse(self::attendanceDateValue($row))->format('Y-m-d'))->values();
                $first = $rows->first();
                $date = Carbon::parse(self::attendanceDateValue($first));
                $expectedMeetings = 8;
                $actualMeetings = max($rows->count(), 1);
                $countStatus = fn ($status) => $rows->filter(
                    fn ($row) => strtolower(trim((string) $row->status_kehadiran)) === strtolower($status)
                )->count();
                $alphaCount = $rows->filter(
                    fn ($row) => in_array(strtolower(trim((string) $row->status_kehadiran)), ['alpha', 'izin'], true)
                )->count();
                $meetingEntries = $rows
                    ->take($expectedMeetings)
                    ->values()
                    ->map(function ($row, $index) {
                        $meetingDate = Carbon::parse(self::attendanceDateValue($row));
                        $status = strtolower(trim((string) $row->status_kehadiran));

                        return [
                            'meeting' => $index + 1,
                            'date' => $meetingDate->format('Y-m-d'),
                            'dateLabel' => $meetingDate->locale('id')->translatedFormat('d M'),
                            'status' => $status === 'izin' ? 'alpha' : $status,
                            'statusLabel' => $status === 'izin' ? 'Alpha' : ucfirst($status),
                            'scheduleId' => $row->id_jadwal ? 'schedule-' . $row->id_jadwal : null,
                            'scheduleLabel' => $row->tanggal
                                ? Carbon::parse($row->tanggal)->locale('id')->translatedFormat('l') . ' | ' .
                                    Carbon::parse($row->jam_mulai)->format('H.i') . '-' .
                                    Carbon::parse($row->jam_selesai)->format('H.i') . ' WIB | ' .
                                    ($row->lokasi ?: '-')
                                : '-',
                        ];
                    })
                    ->all();

                return [
                    'id' => $first->id_siswa . '-' . $date->format('Ym'),
                    'studentId' => $first->id_siswa,
                    'player' => $first->nama_siswa,
                    'playerName' => $first->nama_siswa,
                    'category' => self::categoryValue(self::categoryFromAge((int) $first->umur)),
                    'month' => self::monthKey($date),
                    'year' => $date->format('Y'),
                    'scheduleId' => $first->id_jadwal ? 'schedule-' . $first->id_jadwal : null,
                    'scheduleIds' => $rows
                        ->pluck('id_jadwal')
                        ->filter()
                        ->map(fn ($id) => 'schedule-' . $id)
                        ->unique()
                        ->values()
                        ->all(),
                    'scheduleLabel' => $first->tanggal ? Carbon::parse($first->tanggal)->locale('id')->translatedFormat('l, d F Y') : '-',
                    'coachName' => $first->nama_pelatih ?: 'Pelatih',
                    'inputBy' => $first->nama_pelatih ?: 'Pelatih',
                    'meetingsTotal' => $expectedMeetings,
                    'entries' => $meetingEntries,
                    'hadirCount' => $countStatus('Hadir'),
                    'sakitCount' => $countStatus('Sakit'),
                    'alphaCount' => $alphaCount,
                    'hadir' => (int) round(($countStatus('Hadir') / $actualMeetings) * 100),
                    'sakit' => (int) round(($countStatus('Sakit') / $actualMeetings) * 100),
                    'alpha' => (int) round(($alphaCount / $actualMeetings) * 100),
                    'izin' => (int) round(($alphaCount / $actualMeetings) * 100),
                    'createdAt' => self::timestamp($date),
                ];
            })
            ->sortByDesc('createdAt')
            ->values()
            ->all();
    }

    public static function performanceHistory(?array $studentIds = null, bool $activeOnly = false): array
    {
        $query = DB::table('performa_siswa')
            ->join('siswa', 'performa_siswa.id_siswa', '=', 'siswa.id_siswa')
            ->leftJoin('jadwal_latihan', 'performa_siswa.id_jadwal', '=', 'jadwal_latihan.id_jadwal')
            ->leftJoin('pelatih', 'performa_siswa.id_pelatih', '=', 'pelatih.id_pelatih')
            ->select(
                'performa_siswa.*',
                'siswa.nama_siswa',
                'siswa.umur',
                'jadwal_latihan.tanggal as jadwal_tanggal',
                'jadwal_latihan.jam_mulai',
                'jadwal_latihan.jam_selesai',
                'jadwal_latihan.lokasi',
                'pelatih.nama_pelatih'
            );

        if ($activeOnly) {
            $query->whereIn(DB::raw('LOWER(COALESCE(siswa.status, ""))'), self::activeStatusValues());
        }

        if ($studentIds !== null) {
            $query->whereIn('performa_siswa.id_siswa', $studentIds);
        }

        return $query
            ->orderByDesc('tanggal_penilaian')
            ->orderByDesc('id_performa')
            ->get()
            ->map(function ($row) {
                $date = Carbon::parse($row->tanggal_penilaian);
                $average = round(((float) $row->dribbling + (float) $row->passing + (float) $row->shooting) / 3, 2);
                $isRoutineSchedule = $row->jadwal_tanggal
                    ? in_array(Carbon::parse($row->jadwal_tanggal)->dayOfWeek, [Carbon::WEDNESDAY, Carbon::SUNDAY], true)
                    : true;

                return [
                    'id' => $row->id_performa,
                    'studentId' => $row->id_siswa,
                    'studentName' => $row->nama_siswa,
                    'player' => $row->nama_siswa,
                    'category' => self::categoryValue(self::categoryFromAge((int) $row->umur)),
                    'rawScheduleId' => $row->id_jadwal ? (int) $row->id_jadwal : null,
                    'scheduleId' => $row->id_jadwal ? 'schedule-' . $row->id_jadwal : null,
                    'scheduleLabel' => $row->jadwal_tanggal
                        ? Carbon::parse($row->jadwal_tanggal)->locale('id')->translatedFormat('l') . ' | ' .
                            Carbon::parse($row->jam_mulai)->format('H.i') . '-' .
                            Carbon::parse($row->jam_selesai)->format('H.i') . ' WIB | ' .
                            ($row->lokasi ?: '-')
                        : '-',
                    'scheduleDate' => $row->jadwal_tanggal ? Carbon::parse($row->jadwal_tanggal)->toDateString() : null,
                    'scheduleTime' => $row->jam_mulai && $row->jam_selesai
                        ? Carbon::parse($row->jam_mulai)->format('H.i') . '-' . Carbon::parse($row->jam_selesai)->format('H.i') . ' WIB'
                        : null,
                    'scheduleLocation' => $row->lokasi ?: null,
                    'isRoutine' => $isRoutineSchedule,
                    'coach' => $row->nama_pelatih ?: 'Pelatih',
                    'coachName' => $row->nama_pelatih ?: 'Pelatih',
                    'month' => self::monthKey($date),
                    'year' => $date->format('Y'),
                    'date' => self::dateSlash($date),
                    'dribbling' => (int) $row->dribbling,
                    'passing' => (int) $row->passing,
                    'shooting' => (int) $row->shooting,
                    'average' => $row->rata_rata !== null ? round((float) $row->rata_rata, 2) : $average,
                    'rataRata' => $row->rata_rata !== null ? round((float) $row->rata_rata, 2) : $average,
                    'createdAt' => self::timestamp($date),
                ];
            })
            ->values()
            ->all();
    }

    public static function coachNotes(?array $studentIds = null, bool $activeOnly = false): array
    {
        $query = DB::table('catatan_pelatih')
            ->join('siswa', 'catatan_pelatih.id_siswa', '=', 'siswa.id_siswa')
            ->leftJoin('pelatih', 'catatan_pelatih.id_pelatih', '=', 'pelatih.id_pelatih')
            ->select('catatan_pelatih.*', 'siswa.nama_siswa', 'siswa.umur', 'pelatih.nama_pelatih');

        if ($activeOnly) {
            $query->whereIn(DB::raw('LOWER(COALESCE(siswa.status, ""))'), self::activeStatusValues());
        }

        if ($studentIds !== null) {
            $query->whereIn('catatan_pelatih.id_siswa', $studentIds);
        }

        return $query
            ->orderByDesc('tanggal_catatan')
            ->orderByDesc('id_catatan')
            ->get()
            ->map(fn ($row) => [
                'id' => $row->id_catatan,
                'coachName' => $row->nama_pelatih ?: 'Pelatih',
                'coach' => $row->nama_pelatih ?: 'Pelatih',
                'studentName' => $row->nama_siswa,
                'player' => $row->nama_siswa,
                'category' => self::categoryValue(self::categoryFromAge((int) $row->umur)),
                'date' => self::dateSlash($row->tanggal_catatan),
                'note' => $row->catatan,
                'title' => $row->catatan,
                'createdAt' => self::timestamp($row->tanggal_catatan),
            ])
            ->values()
            ->all();
    }

    public static function achievements(?array $studentIds = null): array
    {
        $query = DB::table('pencapaian')
            ->join('siswa', 'pencapaian.id_siswa', '=', 'siswa.id_siswa')
            ->select('pencapaian.*', 'siswa.nama_siswa', 'siswa.umur');

        if ($studentIds !== null) {
            $query->whereIn('pencapaian.id_siswa', $studentIds);
        }

        return $query->orderByDesc('tanggal_diberikan')->get()
            ->map(fn ($row) => [
                'id' => $row->id_pencapaian,
                'studentId' => $row->id_siswa,
                'studentName' => $row->nama_siswa,
                'category' => self::categoryFromAge((int) $row->umur),
                'title' => $row->nama_prestasi,
                'dateLabel' => Carbon::parse($row->tanggal_diberikan)->locale('id')->translatedFormat('d F Y'),
                'createdAt' => self::timestamp($row->tanggal_diberikan),
            ])
            ->values()
            ->all();
    }

    public static function mediaArticles(): array
    {
        return DB::table('promosi')
            ->leftJoin('siswa', 'promosi.id_siswa', '=', 'siswa.id_siswa')
            ->select(
                'promosi.*',
                'siswa.nama_siswa',
                'siswa.umur'
            )
            ->orderByDesc('promosi.tanggal_promosi')
            ->orderByDesc('promosi.id_promosi')
            ->get()
            ->groupBy(fn ($row) => $row->group_id ?: 'single-' . $row->id_promosi)
            ->map(function ($rows) {
                $first = $rows->first();
                $date = $first->tanggal_promosi ? Carbon::parse($first->tanggal_promosi) : now();
                $players = $rows
                    ->filter(fn ($row) => $row->id_siswa)
                    ->map(fn ($row) => [
                        'id' => $row->id_siswa,
                        'name' => $row->nama_siswa,
                        'category' => self::categoryFromAge((int) $row->umur),
                    ])
                    ->unique('id')
                    ->values()
                    ->all();

                return [
                    'id' => $first->id_promosi,
                    'groupId' => $first->group_id,
                    'title' => $first->judul,
                    'excerpt' => str($first->isi_promosi)->limit(140)->toString(),
                    'body' => $first->isi_promosi,
                    'image' => $first->foto_promosi ? asset('storage/' . ltrim($first->foto_promosi, '/')) : null,
                    'imageName' => $first->foto_promosi,
                    'dateLabel' => $date->locale('id')->translatedFormat('d F Y'),
                    'postedAt' => self::timestamp($date),
                    'category' => $first->kategori,
                    'players' => $players,
                    'targetKeys' => collect($players)
                        ->map(fn ($player) => 'student:' . $player['id'])
                        ->values()
                        ->all(),
                ];
            })
            ->values()
            ->all();
    }

    public static function registrationRows(): array
    {
        return DB::table('pendaftaran')
            ->join('siswa', 'pendaftaran.id_siswa', '=', 'siswa.id_siswa')
            ->leftJoin('orang_tua', 'siswa.id_ortu', '=', 'orang_tua.id_ortu')
            ->select('pendaftaran.*', 'siswa.*', 'orang_tua.email', 'orang_tua.no_hp')
            ->orderByRaw("CASE WHEN pendaftaran.status_approval = 'Menunggu' THEN 0 WHEN pendaftaran.status_approval = 'Revisi' THEN 1 ELSE 2 END")
            ->orderByDesc('pendaftaran.tanggal_daftar')
            ->orderByDesc('pendaftaran.id_pendaftaran')
            ->get()
            ->map(function ($row) {
                $paymentProof = DB::table('bukti_pembayaran')
                    ->join('pembayaran', 'bukti_pembayaran.id_pembayaran', '=', 'pembayaran.id_pembayaran')
                    ->where('bukti_pembayaran.id_siswa', $row->id_siswa)
                    ->where('pembayaran.jenis', 'Pendaftaran')
                    ->select('bukti_pembayaran.bukti_bayar', 'bukti_pembayaran.status')
                    ->orderByDesc('bukti_pembayaran.tanggal_bukti_bayar')
                    ->orderByDesc('bukti_pembayaran.id_bukti_pembayaran')
                    ->first();
                $paymentProofPath = $paymentProof?->bukti_bayar;
                $paymentProofUrl = $paymentProofPath
                    ? url('/api/admin/lihat-bukti/' . dirname($paymentProofPath) . '/' . basename($paymentProofPath))
                    : null;
                $displayName = $row->pending_nama_siswa ?: $row->nama_siswa;
                $displayFatherName = $row->pending_nama_ayah ?: $row->nama_ayah;
                $displayMotherName = $row->pending_nama_ibu ?: $row->nama_ibu;
                $displayAge = $row->pending_umur ?: $row->umur;
                $displayBirthCert = $row->pending_akta_kelahiran ?: $row->akta_kelahiran;
                $displayReportCard = $row->pending_rapor ?: $row->rapor;
                $displayFamilyCard = $row->pending_kartu_keluarga ?: $row->kartu_keluarga;
                $displayPhoto = $row->pending_pas_photo_3x4 ?: $row->pas_photo_3x4;
                $documentFileUrls = [
                    'birthCert' => $displayBirthCert ? url('/api/admin/file-pendaftaran-siswa/akta/' . basename($displayBirthCert)) : null,
                    'reportCard' => $displayReportCard ? url('/api/admin/file-pendaftaran-siswa/rapor/' . basename($displayReportCard)) : null,
                    'familyCard' => $displayFamilyCard ? url('/api/admin/file-pendaftaran-siswa/kk/' . basename($displayFamilyCard)) : null,
                    'photo' => $displayPhoto ? url('/api/admin/file-pendaftaran-siswa/foto/' . basename($displayPhoto)) : null,
                    'paymentProof' => $paymentProofUrl,
                ];
                $invalidIdentityFields = [];
                if (($row->val_nama_siswa ?? null) === 'tidak_valid') $invalidIdentityFields[] = 'childName';
                if (($row->val_nama_ibu ?? null) === 'tidak_valid') $invalidIdentityFields[] = 'motherName';
                if (($row->val_nama_ayah ?? null) === 'tidak_valid') $invalidIdentityFields[] = 'fatherName';
                if (($row->val_umur ?? null) === 'tidak_valid') $invalidIdentityFields[] = 'age';

                $invalidUploadFields = [];
                if (($row->val_akta ?? null) === 'tidak_valid') $invalidUploadFields[] = 'birthCert';
                if (($row->val_rapor ?? null) === 'tidak_valid') $invalidUploadFields[] = 'reportCard';
                if (($row->val_kk ?? null) === 'tidak_valid') $invalidUploadFields[] = 'familyCard';
                if (($row->val_foto ?? null) === 'tidak_valid') $invalidUploadFields[] = 'photo';
                if (($paymentProof->status ?? null) === 'ditolak') $invalidUploadFields[] = 'paymentProof';

                return [
                    'no' => $row->id_pendaftaran,
                    'createdAt' => self::timestamp($row->tanggal_daftar) + (int) $row->id_pendaftaran,
                    'name' => $displayName,
                    'childName' => $displayName,
                    'email' => $row->email ?: '-',
                    'phone' => $row->no_hp ?: '-',
                    'status' => match ($row->status_approval) {
                        'Disetujui' => 'Valid',
                        'Ditolak' => 'Tidak Valid',
                        'Revisi' => 'Perlu Perbaikan',
                        default => 'Belum Diperiksa',
                    },
                    'motherName' => $displayMotherName ?: '-',
                    'fatherName' => $displayFatherName ?: '-',
                    'age' => $displayAge ?: '-',
                    'files' => [
                        'birthCert' => array_filter([$displayBirthCert]),
                        'reportCard' => array_filter([$displayReportCard]),
                        'familyCard' => array_filter([$displayFamilyCard]),
                        'photo' => array_filter([$displayPhoto]),
                        'paymentProof' => array_filter([$paymentProofPath]),
                    ],
                    'fileObjects' => array_map(
                        fn ($url) => array_values(array_filter([$url])),
                        $documentFileUrls
                    ),
                    'invalidIdentityFields' => $invalidIdentityFields,
                    'invalidUploadFields' => array_values(array_unique($invalidUploadFields)),
                ];
            })
            ->values()
            ->all();
    }

    public static function paymentRows(bool $activeOnly = false, ?array $studentIds = null): array
    {
        $query = DB::table('bukti_pembayaran')
            ->join('pembayaran', 'bukti_pembayaran.id_pembayaran', '=', 'pembayaran.id_pembayaran')
            ->join('siswa', 'bukti_pembayaran.id_siswa', '=', 'siswa.id_siswa')
            ->select(
                'bukti_pembayaran.*',
                'pembayaran.jumlah',
                'pembayaran.jenis',
                'pembayaran.tanggal_bayar',
                'pembayaran.periode as periode_pembayaran',
                'siswa.nama_siswa',
                'siswa.umur'
            );

        if ($activeOnly) {
            $query->whereIn(DB::raw('LOWER(COALESCE(siswa.status, ""))'), self::activeStatusValues());
        }

        if ($studentIds !== null) {
            $query->whereIn('bukti_pembayaran.id_siswa', $studentIds);
        }

        $rows = $query
            ->orderByDesc('bukti_pembayaran.tanggal_bukti_bayar')
            ->get();

        $monthlyDailyQuery = DB::table('pembayaran')
            ->leftJoin('bukti_pembayaran', 'pembayaran.id_pembayaran', '=', 'bukti_pembayaran.id_pembayaran')
            ->join('siswa', 'pembayaran.id_siswa', '=', 'siswa.id_siswa')
            ->select(
                'pembayaran.id_pembayaran',
                'pembayaran.id_siswa',
                'pembayaran.periode',
                'pembayaran.tanggal_bayar',
                'pembayaran.jumlah'
            )
            ->where('pembayaran.jenis', 'Harian')
            ->where(function ($builder) {
                $builder->whereNull('bukti_pembayaran.status')
                    ->orWhereRaw('LOWER(bukti_pembayaran.status) <> ?', ['ditolak']);
            });

        if ($activeOnly) {
            $monthlyDailyQuery->whereIn(DB::raw('LOWER(COALESCE(siswa.status, ""))'), self::activeStatusValues());
        }

        if ($studentIds !== null) {
            $monthlyDailyQuery->whereIn('pembayaran.id_siswa', $studentIds);
        }

        $monthlyDailyTotals = $monthlyDailyQuery
            ->get()
            ->unique('id_pembayaran')
            ->groupBy(function ($row) {
                $periodSource = $row->periode ?: $row->tanggal_bayar;
                $month = substr((string) $periodSource, 0, 7);

                return $row->id_siswa . '|' . $month;
            })
            ->map(fn ($items) => (float) $items->sum('jumlah'));

        return $rows
            ->map(function ($row) use ($monthlyDailyTotals) {
                $paymentType = strtolower(trim((string) $row->jenis));
                $proofStatus = strtolower(trim((string) $row->status));
                $isRegistration = $paymentType === 'pendaftaran';
                $isDaily = $paymentType === 'harian';
                $hasProofFile = filled($row->bukti_bayar);
                $periodSource = $row->periode_pembayaran ?: $row->periode ?: $row->tanggal_bayar ?: $row->tanggal_bukti_bayar;
                $month = substr((string) $periodSource, 0, 7);
                $monthlyTarget = $isDaily ? 100000.0 : null;
                $monthlyPaid = $isDaily ? (float) ($monthlyDailyTotals[$row->id_siswa . '|' . $month] ?? 0) : null;
                $monthlyRemaining = $isDaily ? max(0, $monthlyTarget - $monthlyPaid) : null;
                $statusLabel = match (true) {
                    in_array($proofStatus, ['diterima', 'lunas', 'sudah dibayar'], true) => 'Sudah Dibayar',
                    in_array($proofStatus, ['ditolak', 'tidak valid'], true) => 'Belum Dibayar',
                    $hasProofFile => 'Menunggu Verifikasi',
                    default => 'Belum Dibayar',
                };

                return [
                    'id' => $row->id_bukti_pembayaran,
                    'source' => $isRegistration ? 'registration' : 'coach',
                    'studentId' => $row->id_siswa,
                    'studentName' => $row->nama_siswa,
                    'childName' => $row->nama_siswa,
                    'category' => self::categoryValue(self::categoryFromAge((int) $row->umur)),
                    'paymentType' => $paymentType,
                    'paymentTypeLabel' => $row->jenis,
                    'amount' => (float) $row->jumlah,
                    'monthlyTarget' => $monthlyTarget,
                    'monthlyPaidAmount' => $monthlyPaid,
                    'monthlyRemainingAmount' => $monthlyRemaining,
                    'paidDate' => $row->tanggal_bayar ?: $row->tanggal_bukti_bayar,
                    'period' => $row->periode_pembayaran ?: $row->periode,
                    'status' => $statusLabel,
                    'proofFile' => $row->bukti_bayar ? asset('storage/' . ltrim($row->bukti_bayar, '/')) : null,
                    'proofFileName' => $row->bukti_bayar,
                    'createdAt' => self::timestamp($row->tanggal_bukti_bayar),
                ];
            })
            ->values()
            ->all();
    }

    public static function adminNotifications(?int $adminUserId = null): array
    {
        $adminProfileId = $adminUserId
            ? DB::table('admin')->where('user_id', $adminUserId)->value('id_admin')
            : null;

        $query = DB::table('notifikasi_terkirim')
            ->join('notifikasi', 'notifikasi_terkirim.id_notifikasi', '=', 'notifikasi.id_notifikasi')
            ->whereIn('notifikasi.target_role', ['admin', 'semua']);

        if ($adminUserId || $adminProfileId) {
            $query->where(function ($builder) use ($adminUserId, $adminProfileId) {
                if ($adminUserId) {
                    $builder->where('notifikasi_terkirim.user_id', $adminUserId);
                }

                if ($adminProfileId) {
                    $builder->orWhere('notifikasi_terkirim.id_admin', $adminProfileId);
                }
            });
        }

        return $query
            ->orderByDesc('notifikasi_terkirim.id_notifikasi_terkirim')
            ->limit(30)
            ->get()
            ->map(function ($row) {
                $title = trim((string) ($row->judul ?? ''));
                $message = trim((string) ($row->isi ?? ''));

                return [
                    'id' => $row->id_notifikasi_terkirim,
                    'title' => $title,
                    'message' => $message,
                    'text' => trim(($title ? "[{$title}] " : '') . $message),
                    'read' => strtolower((string) $row->status_baca) === 'sudah dibaca',
                    'createdAt' => $row->created_at,
                    'actionMenu' => self::adminNotificationMenu($title, $message),
                ];
            })
            ->values()
            ->all();
    }

    private static function adminNotificationMenu(?string $title, ?string $message): string
    {
        $text = strtolower(trim(($title ?? '') . ' ' . ($message ?? '')));

        if (str_contains($text, 'pembayaran') || str_contains($text, 'bukti bayar')) {
            return 'Pembayaran';
        }

        if (str_contains($text, 'pendaftaran') || str_contains($text, 'berkas')) {
            return 'Pendaftaran';
        }

        if (str_contains($text, 'profil siswa') || str_contains($text, 'profil')) {
            return 'Siswa';
        }

        if (str_contains($text, 'jadwal')) {
            return 'Jadwal Latihan';
        }

        if (str_contains($text, 'prestasi')) {
            return 'Prestasi';
        }

        return 'Home';
    }

    public static function coachNotifications(?int $coachUserId = null): array
    {
        $coachProfileId = $coachUserId
            ? DB::table('pelatih')->where('user_id', $coachUserId)->value('id_pelatih')
            : null;

        $query = DB::table('notifikasi_terkirim')
            ->join('notifikasi', 'notifikasi_terkirim.id_notifikasi', '=', 'notifikasi.id_notifikasi')
            ->whereIn('notifikasi.target_role', ['pelatih', 'semua']);

        if ($coachUserId || $coachProfileId) {
            $query->where(function ($builder) use ($coachUserId, $coachProfileId) {
                if ($coachUserId) {
                    $builder->where('notifikasi_terkirim.user_id', $coachUserId);
                }

                if ($coachProfileId) {
                    $builder->orWhere('notifikasi_terkirim.id_pelatih', $coachProfileId);
                }
            });
        }

        return $query
            ->orderByDesc('notifikasi_terkirim.id_notifikasi_terkirim')
            ->limit(30)
            ->get()
            ->map(fn ($row) => [
                'id' => $row->id_notifikasi_terkirim,
                'text' => trim(($row->judul ? "[{$row->judul}] " : '') . ($row->isi ?? '')),
                'read' => strtolower((string) $row->status_baca) === 'sudah dibaca',
                'createdAt' => $row->created_at,
            ])
            ->values()
            ->all();
    }

    public static function paymentHistory(array $studentIds): array
    {
        if (count($studentIds) === 0) {
            return [];
        }

        return DB::table('pembayaran')
            ->leftJoin('bukti_pembayaran', 'pembayaran.id_pembayaran', '=', 'bukti_pembayaran.id_pembayaran')
            ->whereIn('pembayaran.id_siswa', $studentIds)
            ->select(
                'pembayaran.*',
                'bukti_pembayaran.status as status_bukti',
                'bukti_pembayaran.tanggal_bukti_bayar'
            )
            ->orderByDesc(DB::raw('COALESCE(bukti_pembayaran.tanggal_bukti_bayar, pembayaran.tanggal_bayar)'))
            ->orderByDesc('pembayaran.id_pembayaran')
            ->get()
            ->map(function ($row) {
                $paymentDate = $row->tanggal_bukti_bayar ?: $row->tanggal_bayar;
                $proofStatus = strtolower((string) ($row->status_bukti ?? ''));

                return [
                    'id' => $row->id_pembayaran,
                    'date' => $paymentDate
                        ? Carbon::parse($paymentDate)->locale('id')->translatedFormat('d F Y')
                        : '-',
                    'type' => match ($row->jenis) {
                        'Pendaftaran' => 'Uang Pendaftaran',
                        'Bulanan' => 'Iuran Bulanan',
                        'Harian' => 'Pembayaran Harian',
                        default => 'Pembayaran',
                    },
                    'status' => match (true) {
                        $row->status === 'Lunas' => 'Lunas',
                        $proofStatus === 'menunggu validasi' => 'Menunggu Validasi',
                        $proofStatus === 'ditolak' => 'Ditolak',
                        default => 'Belum Lunas',
                    },
                ];
            })
            ->values()
            ->all();
    }

    public static function monthlyPaymentSummary(array $studentIds): ?array
    {
        if (count($studentIds) === 0) {
            return null;
        }

        $period = now()->format('Y-m');
        $target = 100000.0;
        $paid = (float) DB::table('pembayaran')
            ->leftJoin('bukti_pembayaran', 'pembayaran.id_pembayaran', '=', 'bukti_pembayaran.id_pembayaran')
            ->whereIn('pembayaran.id_siswa', $studentIds)
            ->where('pembayaran.jenis', 'Harian')
            ->where('pembayaran.periode', 'like', $period . '%')
            ->where(function ($query) {
                $query->whereNull('bukti_pembayaran.status')
                    ->orWhereRaw('LOWER(bukti_pembayaran.status) <> ?', ['ditolak']);
            })
            ->sum('pembayaran.jumlah');
        $remaining = max(0, $target - $paid);

        return [
            'targetAmount' => $target,
            'paidAmount' => $paid,
            'remainingAmount' => $remaining,
            'period' => $period,
            'periodLabel' => now()->locale('id')->translatedFormat('F Y'),
            'status' => $remaining <= 0 ? 'complete' : 'partial',
        ];
    }

    private static function studentHasApprovedRegistrationPayment(int $studentId): bool
    {
        $registrationIsApproved = DB::table('pendaftaran')
            ->where('id_siswa', $studentId)
            ->where('status_approval', 'Disetujui')
            ->exists();

        if (! $registrationIsApproved) {
            return false;
        }

        return DB::table('pembayaran')
            ->join('bukti_pembayaran', 'pembayaran.id_pembayaran', '=', 'bukti_pembayaran.id_pembayaran')
            ->where('pembayaran.id_siswa', $studentId)
            ->where('pembayaran.jenis', 'Pendaftaran')
            ->where('pembayaran.status', 'Lunas')
            ->whereRaw('LOWER(bukti_pembayaran.status) = ?', ['diterima'])
            ->exists();
    }

    public static function parentPayload(): array
    {
        $user = Auth::user();
        $parentRows = $user
            ? DB::table('orang_tua')
                ->where(function ($query) use ($user) {
                    $query->where('user_id', $user->id)
                        ->orWhere('email', $user->email);
                })
                ->orderByDesc('user_id')
                ->get()
            : collect();
        $parent = $parentRows->first();
        $parentIds = $parentRows->pluck('id_ortu')->filter()->unique()->values();

        $students = $user
            ? DB::table('siswa')
                ->where(function ($query) use ($parentIds, $user) {
                    if ($parentIds->isNotEmpty()) {
                        $query->whereIn('id_ortu', $parentIds);
                        $query->orWhere('user_id', $user->id);
                        return;
                    }

                    $query->where('user_id', $user->id);
                })
                ->orderBy('nama_siswa')
                ->get()
                ->unique('id_siswa')
                ->values()
            : collect();

        if ($students->isEmpty() && $user) {
            $possibleNames = collect([
                    $user->name,
                    $parent->nama_ortu ?? null,
                ])
                ->filter()
                ->map(fn ($name) => mb_strtolower(trim($name)))
                ->unique()
                ->values();

            if ($possibleNames->isNotEmpty()) {
                $students = DB::table('siswa')
                    ->whereIn(DB::raw('LOWER(nama_siswa)'), $possibleNames)
                    ->orderBy('nama_siswa')
                    ->get()
                    ->unique('id_siswa')
                    ->values();
            }
        }

        $mustChooseChildAfterLogin = (bool) session('show_child_picker_after_login', false);

        if ($mustChooseChildAfterLogin) {
            session()->forget('id_siswa');
        }

        $selectedStudentId = session('id_siswa') ? (int) session('id_siswa') : null;

        if ($selectedStudentId && ! $students->contains('id_siswa', $selectedStudentId)) {
            $selectedStudentId = null;
            session()->forget('id_siswa');
        }

        $directStudents = $user
            ? $students->filter(fn ($student) => (int) ($student->user_id ?? 0) === (int) $user->id)->values()
            : collect();
        if (! $selectedStudentId && $directStudents->count() === 1) {
            $selectedStudentId = (int) $directStudents->first()->id_siswa;
            session(['id_siswa' => $selectedStudentId]);
            $mustChooseChildAfterLogin = false;
        }

        if (
            ! $selectedStudentId
            && $students->count() === 1
            && $user
            && (int) ($students->first()->user_id ?? 0) === (int) $user->id
        ) {
            $selectedStudentId = (int) $students->first()->id_siswa;
            session(['id_siswa' => $selectedStudentId]);
            $mustChooseChildAfterLogin = false;
        }

        $activeStudent = $selectedStudentId
            ? $students->firstWhere('id_siswa', (int) $selectedStudentId)
            : null;

        if (! $activeStudent && $students->isNotEmpty()) {
            $studentIdsWithRevision = $students->pluck('id_siswa')->filter()->values();
            $revisionStudentId = $studentIdsWithRevision->isNotEmpty()
                ? DB::table('pendaftaran')
                    ->whereIn('id_siswa', $studentIdsWithRevision)
                    ->where('status_approval', 'Revisi')
                    ->orderByDesc('tanggal_daftar')
                    ->orderByDesc('id_pendaftaran')
                    ->value('id_siswa')
                : null;

            if (! $revisionStudentId && $studentIdsWithRevision->isNotEmpty()) {
                $revisionStudentId = DB::table('bukti_pembayaran')
                    ->join('pembayaran', 'bukti_pembayaran.id_pembayaran', '=', 'pembayaran.id_pembayaran')
                    ->whereIn('bukti_pembayaran.id_siswa', $studentIdsWithRevision)
                    ->where('bukti_pembayaran.status', 'ditolak')
                    ->where('pembayaran.jenis', 'Pendaftaran')
                    ->orderByDesc('bukti_pembayaran.tanggal_bukti_bayar')
                    ->orderByDesc('bukti_pembayaran.id_bukti_pembayaran')
                    ->value('bukti_pembayaran.id_siswa');
            }

            if ($revisionStudentId) {
                $activeStudent = $students->firstWhere('id_siswa', (int) $revisionStudentId);
                $selectedStudentId = $activeStudent ? (int) $activeStudent->id_siswa : $selectedStudentId;

                if ($selectedStudentId) {
                    session(['id_siswa' => $selectedStudentId]);
                    $mustChooseChildAfterLogin = false;
                }
            }
        }

        $shouldOpenChildPicker = $students->count() > 0 && (
            $mustChooseChildAfterLogin
            || ! $selectedStudentId
        );

        session()->forget('show_child_picker_after_login');

        $firstStudent = $activeStudent;
        $studentIds = $firstStudent ? [$firstStudent->id_siswa] : [];
        $studentIsActive = $firstStudent
            ? strtolower((string) $firstStudent->status) === 'active'
                && self::studentHasApprovedRegistrationPayment((int) $firstStudent->id_siswa)
            : false;
        $studentProfile = $firstStudent
            ? DB::table('profil_siswa')->where('id_siswa', $firstStudent->id_siswa)->first()
            : null;
        $revisionRegistration = $studentIds
            ? DB::table('pendaftaran')
                ->join('siswa', 'pendaftaran.id_siswa', '=', 'siswa.id_siswa')
                ->leftJoin('orang_tua', 'siswa.id_ortu', '=', 'orang_tua.id_ortu')
                ->whereIn('pendaftaran.id_siswa', $studentIds)
                ->where('pendaftaran.status_approval', 'Revisi')
                ->select('pendaftaran.*', 'siswa.nama_siswa', 'siswa.nama_ayah', 'siswa.nama_ibu', 'siswa.umur', 'orang_tua.email', 'orang_tua.no_hp')
                ->orderByDesc('pendaftaran.tanggal_daftar')
                ->first()
            : null;
        $rejectedRegistrationProof = $studentIds
            ? DB::table('bukti_pembayaran')
                ->join('pembayaran', 'bukti_pembayaran.id_pembayaran', '=', 'pembayaran.id_pembayaran')
                ->whereIn('bukti_pembayaran.id_siswa', $studentIds)
                ->where('bukti_pembayaran.status', 'ditolak')
                ->where('pembayaran.jenis', 'Pendaftaran')
                ->select('bukti_pembayaran.*')
                ->orderByDesc('bukti_pembayaran.tanggal_bukti_bayar')
                ->orderByDesc('bukti_pembayaran.id_bukti_pembayaran')
                ->first()
            : null;
        $revisionSource = $revisionRegistration ?: (
            $rejectedRegistrationProof && $firstStudent
                ? (object) [
                    'id_pendaftaran' => null,
                    'id_siswa' => $firstStudent->id_siswa,
                    'nama_siswa' => $firstStudent->nama_siswa,
                    'nama_ayah' => $firstStudent->nama_ayah,
                    'nama_ibu' => $firstStudent->nama_ibu,
                    'umur' => $firstStudent->umur,
                    'email' => $parent->email ?? '',
                    'no_hp' => $parent->no_hp ?? '',
                    'val_nama_siswa' => 'valid',
                    'val_nama_ayah' => 'valid',
                    'val_nama_ibu' => 'valid',
                    'val_umur' => 'valid',
                    'val_akta' => 'valid',
                    'val_kk' => 'valid',
                    'val_rapor' => 'valid',
                    'val_foto' => 'valid',
                ]
                : null
        );

        $reuploadRequest = null;
        if ($revisionSource || $rejectedRegistrationProof) {
            $invalidIdentityFields = [];
            if (($revisionSource->val_nama_siswa ?? null) === 'tidak_valid') $invalidIdentityFields[] = 'childName';
            if (($revisionSource->val_nama_ayah ?? null) === 'tidak_valid') $invalidIdentityFields[] = 'fatherName';
            if (($revisionSource->val_nama_ibu ?? null) === 'tidak_valid') $invalidIdentityFields[] = 'motherName';
            if (($revisionSource->val_umur ?? null) === 'tidak_valid') $invalidIdentityFields[] = 'age';

            $invalidUploadFields = [];
            if (($revisionSource->val_akta ?? null) === 'tidak_valid') $invalidUploadFields[] = 'birthCert';
            if (($revisionSource->val_kk ?? null) === 'tidak_valid') $invalidUploadFields[] = 'familyCard';
            if (($revisionSource->val_rapor ?? null) === 'tidak_valid') $invalidUploadFields[] = 'reportCard';
            if (($revisionSource->val_foto ?? null) === 'tidak_valid') $invalidUploadFields[] = 'photo';
            if ($rejectedRegistrationProof) $invalidUploadFields[] = 'paymentProof';

            $reuploadRequest = [
                'id' => $revisionSource->id_pendaftaran ?? $rejectedRegistrationProof->id_bukti_pembayaran ?? null,
                'studentId' => $revisionSource->id_siswa ?? $rejectedRegistrationProof->id_siswa ?? null,
                'name' => $revisionSource->nama_siswa ?? $firstStudent->nama_siswa ?? '',
                'email' => $revisionSource->email ?? $parent->email ?? '',
                'phone' => $revisionSource->no_hp ?? $parent->no_hp ?? '',
                'message' => $rejectedRegistrationProof
                    ? 'Bukti pembayaran pendaftaran tidak valid. Silakan upload ulang bukti pembayaran.'
                    : 'Admin menandai data pendaftaran tidak valid. Silakan upload ulang bagian yang ditandai.',
                'document' => [
                    'id_siswa' => $revisionSource->id_siswa ?? $firstStudent->id_siswa ?? null,
                    'childName' => $revisionSource->nama_siswa ?? $firstStudent->nama_siswa ?? '',
                    'fatherName' => $revisionSource->nama_ayah ?? '',
                    'motherName' => $revisionSource->nama_ibu ?? '',
                    'age' => $revisionSource->umur ?? '',
                ],
                'invalidIdentityFields' => array_values(array_unique($invalidIdentityFields)),
                'invalidUploadFields' => array_values(array_unique($invalidUploadFields)),
            ];
        }

        return [
            'userName' => $firstStudent->nama_siswa ?? '',
            'studentProfile' => [
                'photo' => $studentProfile?->foto ? asset('storage/' . ltrim($studentProfile->foto, '/')) : null,
                'nik' => $firstStudent->nik ?? '',
                'familyNumber' => $firstStudent->no_kk ?? '',
                'nisn' => $firstStudent->nisn ?? '',
                'birthPlace' => $firstStudent->tempat_lahir ?? '',
                'birthDate' => $firstStudent->tanggal_lahir ?? '',
                'age' => $firstStudent->umur ?? '',
                'parentName' => $parent->nama_ortu ?? '',
                'parentPhone' => $parent->no_hp ?? '',
                'parentEmail' => $parent->email ?? '',
                'address' => $studentProfile->alamat ?? '',
                'height' => $studentProfile->tinggi_badan ?? null,
                'weight' => $studentProfile->berat_badan ?? null,
            ],
            'selectedChildId' => $selectedStudentId ? (int) $selectedStudentId : null,
            'hasSelectedChild' => (bool) $selectedStudentId && ! $shouldOpenChildPicker,
            'childCategoryLabel' => $firstStudent ? self::categoryFromAge((int) $firstStudent->umur) : '-',
            'paymentStatus' => $firstStudent
                ? ($studentIsActive ? 'paid' : 'unpaid')
                : 'unselected',
            'isAccountReady' => (bool) $parent,
            'canSwitchChild' => $students->count() > 1,
            'childrenOptions' => $students
                ->map(fn ($student) => [
                    'id' => $student->id_siswa,
                    'id_siswa' => $student->id_siswa,
                    'name' => $student->nama_siswa,
                    'nama_siswa' => $student->nama_siswa,
                ])
                ->values()
                ->all(),
            'openChildPickerOnLoad' => $shouldOpenChildPicker,
            'trainingSchedules' => self::schedules($studentIds),
            'achievements' => self::achievements($studentIds),
            'attendanceRecaps' => self::attendanceRecaps($studentIds),
            'performanceHistory' => self::performanceHistory($studentIds),
            'coachNotes' => self::coachNotes($studentIds),
            'notes' => self::coachNotes($studentIds),
            'paymentHistory' => self::paymentHistory($studentIds),
            'monthlyPaymentSummary' => self::monthlyPaymentSummary($studentIds),
            'notifications' => self::parentNotifications($studentIds, $user?->id),
            'reuploadRequest' => $reuploadRequest,
        ];
    }

    private static function parentNotifications(array $studentIds = [], ?int $userId = null): array
    {
        if (empty($studentIds) && ! $userId) {
            return [];
        }

        return DB::table('notifikasi_terkirim')
            ->join('notifikasi', 'notifikasi_terkirim.id_notifikasi', '=', 'notifikasi.id_notifikasi')
            ->where(function ($query) use ($studentIds, $userId) {
                if (! empty($studentIds)) {
                    $query->whereIn('notifikasi_terkirim.id_siswa', $studentIds);
                }

                if ($userId) {
                    $method = empty($studentIds) ? 'where' : 'orWhere';
                    $query->{$method}('notifikasi_terkirim.user_id', $userId);
                }
            })
            ->orderByDesc('notifikasi_terkirim.id_notifikasi_terkirim')
            ->limit(20)
            ->get()
            ->map(fn ($row) => [
                'id' => $row->id_notifikasi_terkirim,
                'text' => trim(($row->judul ? "[{$row->judul}] " : '') . ($row->isi ?? '')),
                'read' => strtolower((string) $row->status_baca) === 'sudah dibaca',
                'createdAt' => $row->created_at,
            ])
            ->values()
            ->all();
    }
}