<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use App\Models\User;
use App\Models\Siswa;
use App\Models\OrangTua;
use App\Models\Admin;
use App\Models\Pelatih;
use App\Models\Notifikasi;
use App\Models\NotifikasiTerkirim;
use App\Models\Pembayaran;
use App\Models\BuktiPembayaran;
use App\Models\Jadwal_Latihan;
use App\Models\Promosi;
use App\Models\Pencapaian;
use App\Models\Presensi;
use App\Models\Catatan_Pelatih;
use App\Models\Performa_Siswa;
use App\Models\MasterBadge;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use App\Models\Pendaftaran_Siswa;
use App\Support\SsbInertiaData;
use Carbon\Carbon;
use Inertia\Inertia;



class DashboardController extends Controller
{
public function parentSection(?string $section = null)
{
    $parentPages = [
        'dashboard' => 'parent/DasborOrangTua',
        'kehadiran' => 'parent/KehadiranOrangTua',
        'performa' => 'parent/PerformaOrangTua',
        'prestasi' => 'parent/PrestasiOrangTua',
        'catatan-pelatih' => 'parent/CatatanPelatihOrangTua',
        'pembayaran' => 'parent/PembayaranOrangTua',
        'upload-ulang' => 'parent/UploadUlangBerkasOrangTua',
    ];

    $section = $section ?: 'dashboard';

    abort_unless(array_key_exists($section, $parentPages), 404);

    return Inertia::render($parentPages[$section], SsbInertiaData::parentPayload());
}

public function coachSection(?string $section = null)
{
    $coachPages = [
        'dashboard' => 'coach/DasborPelatih',
        'kehadiran' => 'coach/KehadiranPelatih',
        'performa' => 'coach/PerformaPelatih',
        'catatan' => 'coach/CatatanPelatih',
        'pembayaran' => 'coach/PembayaranPelatih',
    ];

    $section = $section ?: 'dashboard';

    abort_unless(array_key_exists($section, $coachPages), 404);

    $coach = Auth::user()?->role === 'pelatih'
        ? Auth::user()
        : User::query()->where('role', 'pelatih')->first();
    $coachProfile = $this->currentCoachProfile($coach);
    $coachName = $coachProfile?->nama_pelatih ?? $coach?->name ?? 'Pelatih';
    $coachStudentIds = $coachProfile
        ? $this->studentIdsForCoach((int) $coachProfile->id_pelatih)
        : [];

    $attendanceRecaps = SsbInertiaData::attendanceRecaps($coachStudentIds, true);
    $performanceHistory = SsbInertiaData::performanceHistory($coachStudentIds, true);
    $coachNotes = SsbInertiaData::coachNotes($coachStudentIds, true);

    return Inertia::render($coachPages[$section], [
        'userName' => $coachName,
        'currentCoachName' => $coachName,
        'notifications' => SsbInertiaData::coachNotifications($coach?->id),
        'studentDirectory' => SsbInertiaData::studentDirectory(true, $coachStudentIds),
        'trainingSchedules' => SsbInertiaData::schedules(null, true, $coachProfile?->id_pelatih),
        'attendanceRecaps' => $attendanceRecaps,
        'history' => $performanceHistory,
        'performanceHistory' => $performanceHistory,
        'notes' => $coachNotes,
        'coachNotes' => $coachNotes,
        'paymentSubmissions' => SsbInertiaData::paymentRows(true, $coachStudentIds),
    ]);
}

private function currentCoachProfile(?User $user = null): ?Pelatih
{
    $user = $user ?: Auth::user();

    if (! $user || $user->role !== 'pelatih') {
        return null;
    }

    return Pelatih::resolveForUser($user);
}

private function studentIdsForCoach(int $coachId): array
{
    $explicitStudentIds = DB::table('jadwal_siswa')
        ->join('jadwal_latihan', 'jadwal_siswa.id_jadwal', '=', 'jadwal_latihan.id_jadwal')
        ->join('siswa', 'jadwal_siswa.id_siswa', '=', 'siswa.id_siswa')
        ->where(function ($query) use ($coachId) {
            $query->where('jadwal_latihan.id_pelatih', $coachId)
                ->orWhereNull('jadwal_latihan.id_pelatih');
        })
        ->whereRaw('LOWER(COALESCE(siswa.status, "")) = ?', ['active'])
        ->pluck('jadwal_siswa.id_siswa')
        ->map(fn ($id) => (int) $id)
        ->unique()
        ->values()
        ->all();

    $routineStudentIds = DB::table('jadwal_latihan')
        ->where(function ($query) use ($coachId) {
            $query->where('id_pelatih', $coachId)
                ->orWhereNull('id_pelatih');
        })
        ->get()
        ->flatMap(function ($schedule) {
            $scheduleDate = Carbon::parse($schedule->tanggal);
            $isRoutineSchedule = in_array($scheduleDate->dayOfWeek, [Carbon::WEDNESDAY, Carbon::SUNDAY], true);

            if (! $isRoutineSchedule) {
                return [];
            }

            $storedCategory = $schedule->kategori_umur !== null
                ? SsbInertiaData::categoryValue((string) $schedule->kategori_umur)
                : null;

            return DB::table('siswa')
                ->whereRaw('LOWER(COALESCE(status, "")) = ?', ['active'])
                ->select('id_siswa', 'umur')
                ->get()
                ->filter(function ($student) use ($storedCategory) {
                    if (! $storedCategory || $storedCategory === 'all') {
                        return true;
                    }

                    return SsbInertiaData::categoryValue(SsbInertiaData::categoryFromAge((int) $student->umur)) === $storedCategory;
                })
                ->pluck('id_siswa');
        })
        ->map(fn ($id) => (int) $id)
        ->all();

    return collect($explicitStudentIds)
        ->merge($routineStudentIds)
        ->unique()
        ->values()
        ->all();
}

private function adminActivityHistoryRows(): array
{
    return DB::table('admin_activity_logs')
        ->orderByDesc('created_at')
        ->orderByDesc('id')
        ->limit(120)
        ->get()
        ->map(fn ($item) => [
            'id' => $item->id,
            'title' => $item->title,
            'description' => $item->description,
            'createdAt' => Carbon::parse($item->created_at)->timestamp * 1000,
            'created_at' => $item->created_at,
            'adminName' => $item->admin_name,
        ])
        ->all();
}

public function adminSection(?string $section = null)
{
    $adminMenus = [
        'dashboard' => 'Home',
        'pendaftaran' => 'Pendaftaran',
        'siswa' => 'Siswa',
        'pelatih' => 'Pelatih',
        'pembayaran' => 'Pembayaran',
        'jadwal-latihan' => 'Jadwal Latihan',
        'media-promosi' => 'Media Promosi',
        'prestasi' => 'Prestasi',
    ];

    $section = $section ?: 'dashboard';

    abort_unless(array_key_exists($section, $adminMenus), 404);

    $paymentRows = SsbInertiaData::paymentRows();

    return Inertia::render('Admin/DasborAdmin', [
        'activeMenu' => $adminMenus[$section],
        'userName' => Auth::user()?->name ?? 'Admin SSB',
        'notifications' => SsbInertiaData::adminNotifications(Auth::id()),
        'incomingRegistrations' => SsbInertiaData::registrationRows(),
        'registrationPaymentSubmissions' => collect($paymentRows)
            ->where('source', 'registration')
            ->values()
            ->all(),
        'coachPaymentSubmissions' => collect($paymentRows)
            ->where('source', 'coach')
            ->values()
            ->all(),
        'parentProfiles' => DB::table('orang_tua')
            ->leftJoin('siswa', 'orang_tua.id_ortu', '=', 'siswa.id_ortu')
            ->select('orang_tua.*', 'siswa.nama_siswa', 'siswa.nama_ibu', 'siswa.nama_ayah', 'siswa.umur')
            ->get()
            ->groupBy('email')
            ->map(fn ($rows) => [
                'phone' => $rows->first()->no_hp ?: '-',
                'motherName' => $rows->first()->nama_ibu ?: '-',
                'fatherName' => $rows->first()->nama_ayah ?: '-',
                'age' => $rows->first()->umur ?: '-',
                'validationStatus' => 'pending',
                'children' => $rows->pluck('nama_siswa')->filter()->values()->all(),
            ])
            ->all(),
        'adminStudents' => SsbInertiaData::students(true),
        'adminCoaches' => SsbInertiaData::coaches(),
        'adminCatatanPelatih' => SsbInertiaData::coachNotes(null, true),
        'adminAttendanceRecaps' => SsbInertiaData::attendanceRecaps(null, true),
        'adminPerformanceHistory' => SsbInertiaData::performanceHistory(null, true),
        'trainingSchedules' => SsbInertiaData::schedules(null, true),
        'mediaArticles' => SsbInertiaData::mediaArticles(),
        'achievements' => SsbInertiaData::achievements(),
        'adminActivityHistory' => $this->adminActivityHistoryRows(),
        'scheduleStudentDirectory' => SsbInertiaData::students(true),
    ]);
}

   
public function siswaDashboard(Request $request)
{
    if (! $request->expectsJson()) {
        return Inertia::render('parent/DasborOrangTua', SsbInertiaData::parentPayload());
    }

    $user = Auth::user();

    if ($user->role !== 'orang_tua') {
        return response()->json([
            'status' => false,
            'message' => 'Akses ditolak'
        ], 403);
    }

    $selectedChildId = session('id_siswa');

    $siswaQuery = $user->siswa();

    if ($selectedChildId) {
        $siswaQuery->where('id_siswa', $selectedChildId);
    }

    $siswa = $siswaQuery->first();

    if (!$siswa) {
        return response()->json([
            'status' => false,
            'message' => 'Data siswa tidak ditemukan'
        ], 404);
    }

    $pembayaranBelum = $siswa->pembayaran()
        ->whereIn('status', ['Belum', 'Lunas'])
        ->whereIn('jenis', ['Pendaftaran', 'Bulanan'])
        ->get();

    return response()->json([
        'status' => true,
        'message' => 'Dashboard siswa',
        'data' => [
            'nama_siswa' => $siswa->nama_siswa,
            'userName' => $user->name,
            'status_siswa' => $siswa->status,
            'pembayaranBelum' => $pembayaranBelum
        ]
    ]);
}

public function adminDashboard()
{
    if (! request()->expectsJson()) {
        $paymentRows = SsbInertiaData::paymentRows();

        return Inertia::render('Admin/DasborAdmin', [
            'activeMenu' => 'Home',
            'userName' => Auth::user()?->name ?? 'Admin SSB',
            'notifications' => SsbInertiaData::adminNotifications(Auth::id()),
            'incomingRegistrations' => SsbInertiaData::registrationRows(),
            'registrationPaymentSubmissions' => collect($paymentRows)
                ->where('source', 'registration')
                ->values()
                ->all(),
            'coachPaymentSubmissions' => collect($paymentRows)
                ->where('source', 'coach')
                ->values()
                ->all(),
            'parentProfiles' => DB::table('orang_tua')
                ->leftJoin('siswa', 'orang_tua.id_ortu', '=', 'siswa.id_ortu')
                ->select('orang_tua.*', 'siswa.nama_siswa', 'siswa.nama_ibu', 'siswa.nama_ayah', 'siswa.umur')
                ->get()
                ->groupBy('email')
                ->map(fn ($rows) => [
                    'phone' => $rows->first()->no_hp ?: '-',
                    'motherName' => $rows->first()->nama_ibu ?: '-',
                    'fatherName' => $rows->first()->nama_ayah ?: '-',
                    'age' => $rows->first()->umur ?: '-',
                    'validationStatus' => 'pending',
                    'children' => $rows->pluck('nama_siswa')->filter()->values()->all(),
                ])
                ->all(),
            'adminStudents' => SsbInertiaData::students(true),
            'adminCoaches' => SsbInertiaData::coaches(),
            'adminCatatanPelatih' => SsbInertiaData::coachNotes(null, true),
            'adminAttendanceRecaps' => SsbInertiaData::attendanceRecaps(null, true),
            'adminPerformanceHistory' => SsbInertiaData::performanceHistory(null, true),
            'trainingSchedules' => SsbInertiaData::schedules(null, true),
            'mediaArticles' => SsbInertiaData::mediaArticles(),
            'achievements' => SsbInertiaData::achievements(),
            'adminActivityHistory' => $this->adminActivityHistoryRows(),
            'scheduleStudentDirectory' => SsbInertiaData::students(true),
        ]);
    }

    if (auth()->user()->role !== 'admin') {
        return response()->json([
            'status' => false,
            'message' => 'Akses ditolak'
        ], 403);
    }

    // 🔥 CARD
    $totalSiswa = Siswa::count();
    $totalPelatih = Pelatih::count();

    $kategoriUmur = Siswa::selectRaw('umur, COUNT(*) as total')
        ->groupBy('umur')
        ->orderBy('umur')
        ->get()
        ->mapWithKeys(function ($item) {
            return [
                'U-' . $item->umur => (int) $item->total
            ];
        });

    // 🔥 PRESTASI
    $achievementMonthExpression = DB::connection()->getDriverName() === 'sqlite'
        ? "CAST(strftime('%m', tanggal_diberikan) AS INTEGER)"
        : 'MONTH(tanggal_diberikan)';

    $prestasiRaw = Pencapaian::selectRaw("{$achievementMonthExpression} as bulan, COUNT(*) as total")
        ->groupBy('bulan')
        ->pluck('total', 'bulan');

    $bulanList = [
        1 => 'januari', 2 => 'februari', 3 => 'maret',
        4 => 'april', 5 => 'mei', 6 => 'juni',
        7 => 'juli', 8 => 'agustus', 9 => 'september',
        10 => 'oktober', 11 => 'november', 12 => 'desember'
    ];

    $prestasi = [];
    foreach ($bulanList as $key => $nama) {
        $prestasi[$nama] = (int) ($prestasiRaw[$key] ?? 0);
    }

    // 🔥 KEHADIRAN
    $kehadiranRaw = Presensi::selectRaw('status_kehadiran, COUNT(*) as total')
        ->groupBy('status_kehadiran')
        ->pluck('total', 'status_kehadiran');

    $kehadiran = [
        'hadir' => (int) ($kehadiranRaw['Hadir'] ?? 0),
        'sakit' => (int) ($kehadiranRaw['Sakit'] ?? 0),
        'alpha' => (int) (($kehadiranRaw['Alpha'] ?? 0) + ($kehadiranRaw['Izin'] ?? 0)),
        'izin'  => (int) (($kehadiranRaw['Alpha'] ?? 0) + ($kehadiranRaw['Izin'] ?? 0)),
    ];

    // 🔥 HISTORY PEMBAYARAN
    $history = Pembayaran::with('siswa:id_siswa,nama_siswa')
        ->orderBy('tanggal_bayar', 'desc')
        ->limit(5)
        ->get()
        ->map(function ($item) {
            return [
                'nama' => $item->siswa->nama_siswa ?? '-',
                'jenis' => $item->jenis,
                'tanggal' => $item->tanggal_bayar,
                'nominal' => (int) $item->jumlah,
                'status' => $item->status
            ];
        });

    // 🔥 VALIDASI PEMBAYARAN
    $validasiPembayaran = BuktiPembayaran::with('siswa:id_siswa,nama_siswa')
        ->where('status', 'Menunggu validasi')
        ->get()
        ->map(function ($item) {
            return [
                'nama' => $item->siswa->nama_siswa ?? '-',
                'tanggal' => $item->tanggal_bukti_bayar,
                'status' => $item->status
            ];
        });

    // 🔥 PELATIH
    $listPelatih = Pelatih::pluck('nama_pelatih');

    // 🔥 VALIDASI BERKAS
$validasiBerkas = Pendaftaran_Siswa::with([
    'siswa.user:id,email',
    'siswa.orangtua:id_ortu,no_hp' // ✅ FIX DI SINI
])
->get()
->map(function ($item) {
    return [
        'nama' => optional($item->siswa)->nama_siswa ?? '-',
        'email' => optional($item->siswa->user)->email ?? '-',
        'no_hp' => optional($item->siswa->orangtua)->no_hp ?? '-',
        'status' => $item->status_approval
    ];
});

    return response()->json([
        'status' => true,
        'message' => 'Dashboard admin',
        'data' => [
            'card' => [
                'total_siswa' => $totalSiswa,
                'kategori_umur' => $kategoriUmur, // ✅ INI YANG BENAR
                'pelatih' => $totalPelatih
            ],
            'prestasi' => $prestasi,
            'kehadiran' => $kehadiran,
            'history_pembayaran' => $history,
            'validasi_pembayaran' => $validasiPembayaran,
            'pelatih' => $listPelatih,
            'validasi_berkas' => $validasiBerkas
        ]
    ]);
}

public function pelatihDashboard()
{
    if (! request()->expectsJson()) {
        $coach = Auth::user()?->role === 'pelatih'
            ? Auth::user()
            : User::query()->where('role', 'pelatih')->first();
        $coachProfile = $this->currentCoachProfile($coach);
        $coachName = $coachProfile?->nama_pelatih ?? $coach?->name ?? 'Pelatih';

        $coachStudentIds = $coachProfile
            ? $this->studentIdsForCoach((int) $coachProfile->id_pelatih)
            : [];
        $attendanceRecaps = SsbInertiaData::attendanceRecaps($coachStudentIds, true);
        $performanceHistory = SsbInertiaData::performanceHistory($coachStudentIds, true);
        $coachNotes = SsbInertiaData::coachNotes($coachStudentIds, true);

        return Inertia::render('coach/DasborPelatih', [
            'userName' => $coachName,
            'currentCoachName' => $coachName,
            'notifications' => SsbInertiaData::coachNotifications($coach?->id),
            'studentDirectory' => SsbInertiaData::studentDirectory(true, $coachStudentIds),
            'trainingSchedules' => SsbInertiaData::schedules(null, true, $coachProfile?->id_pelatih),
            'attendanceRecaps' => $attendanceRecaps,
            'history' => $performanceHistory,
            'performanceHistory' => $performanceHistory,
            'notes' => $coachNotes,
            'coachNotes' => $coachNotes,
            'paymentSubmissions' => SsbInertiaData::paymentRows(true, $coachStudentIds),
        ]);
    }

    if (auth()->user()->role !== 'pelatih') {
        return response()->json([
            'status' => false,
            'message' => 'Akses ditolak'
        ], 403);
    }

    $user = auth()->user();

    // 🔥 PROFIL
    $pelatih = Pelatih::where('user_id', $user->id)->first();
    $coachStudentIds = $pelatih ? $this->studentIdsForCoach((int) $pelatih->id_pelatih) : [];

    // 🔥 KEHADIRAN MINGGU INI
    $kehadiranRaw = Presensi::whereIn('id_siswa', $coachStudentIds)
        ->whereBetween('created_at', [
            now()->startOfWeek(),
            now()->endOfWeek()
        ])
        ->selectRaw('status_kehadiran, COUNT(*) as total')
        ->groupBy('status_kehadiran')
        ->pluck('total', 'status_kehadiran');

    $kehadiran = [
        'hadir' => (int) ($kehadiranRaw['Hadir'] ?? 0),
        'sakit' => (int) ($kehadiranRaw['Sakit'] ?? 0),
        'alpha' => (int) (($kehadiranRaw['Alpha'] ?? 0) + ($kehadiranRaw['Izin'] ?? 0)),
        'izin'  => (int) (($kehadiranRaw['Alpha'] ?? 0) + ($kehadiranRaw['Izin'] ?? 0)),
        'total' => (int) $kehadiranRaw->sum()
    ];

    // 🔥 RATA-RATA PERFORMA BULAN INI (FIX: tambah year)
    $avg = Performa_Siswa::whereIn('id_siswa', $coachStudentIds)
        ->whereMonth('tanggal_penilaian', now()->month)
        ->whereYear('tanggal_penilaian', now()->year)
        ->selectRaw('
            AVG(dribbling) as dribbling,
            AVG(passing) as passing,
            AVG(shooting) as shooting
        ')
        ->first();

    $rataPerforma = [
        'dribbling' => (int) ($avg->dribbling ?? 0),
        'passing'   => (int) ($avg->passing ?? 0),
        'shooting'  => (int) ($avg->shooting ?? 0),
    ];

    // 🔥 PERFORMA 12 BULAN (UNTUK CHART)
    $monthExpression = DB::connection()->getDriverName() === 'sqlite'
        ? "CAST(strftime('%m', tanggal_penilaian) AS INTEGER)"
        : 'MONTH(tanggal_penilaian)';

    $performaBulananRaw = Performa_Siswa::whereIn('id_siswa', $coachStudentIds)
        ->whereYear('tanggal_penilaian', now()->year)
        ->selectRaw("
            {$monthExpression} as bulan,
            AVG(dribbling) as dribbling,
            AVG(passing) as passing,
            AVG(shooting) as shooting
        ")
        ->groupBy('bulan')
        ->orderBy('bulan')
        ->get();

    $performa12Bulan = collect(range(1,12))->map(function ($bulan) use ($performaBulananRaw) {
        $data = $performaBulananRaw->firstWhere('bulan', $bulan);

        return [
            'bulan' => $bulan,
            'dribbling' => (int) ($data->dribbling ?? 0),
            'passing'   => (int) ($data->passing ?? 0),
            'shooting'  => (int) ($data->shooting ?? 0),
        ];
    });

    // 🔥 CATATAN PELATIH
    $catatan = Catatan_Pelatih::with('siswa:id_siswa,nama_siswa,umur')
        ->latest()
        ->limit(5)
        ->get()
        ->map(function ($item) {
            return [
                'nama' => $item->siswa->nama_siswa ?? '-',
                'kategori' => 'U-' . ($item->siswa->umur ?? '-'),
                'catatan' => $item->catatan
            ];
        });

    // 🔥 JADWAL LATIHAN
    $jadwal = Jadwal_Latihan::orderBy('tanggal', 'desc')
        ->limit(5)
        ->get()
        ->map(function ($item) {
            return [
                'tanggal' => Carbon::parse($item->tanggal)->translatedFormat('l, d-m-Y'),
                'jam' => $item->jam_mulai . ' - ' . $item->jam_selesai,
                'lokasi' => $item->lokasi
            ];
        });

    // 🔥 PERFORMA TERAKHIR
    $performaTerakhir = Performa_Siswa::with('siswa:id_siswa,nama_siswa,umur')
        ->orderBy('tanggal_penilaian', 'desc')
        ->limit(5)
        ->get()
        ->map(function ($item) {
            return [
                'nama' => $item->siswa->nama_siswa ?? '-',
                'kategori' => 'U-' . ($item->siswa->umur ?? '-'),
                'tanggal' => Carbon::parse($item->tanggal_penilaian)->format('d-m-Y'),
                'dribbling' => (int) $item->dribbling,
                'passing'   => (int) $item->passing,
                'shooting'  => (int) $item->shooting,
            ];
        });

    return response()->json([
        'status' => true,
        'message' => 'Dashboard pelatih',
        'data' => [
            'profil' => [
                'nama' => $pelatih->nama_pelatih ?? '-',
                'role' => 'Coach'
            ],
            'kehadiran_mingguan' => $kehadiran,
            'performa_bulan_ini' => $rataPerforma,
            'performa_12_bulan' => $performa12Bulan,
            'catatan_terbaru' => $catatan,
            'jadwal_latihan' => $jadwal,
            'performa_terakhir' => $performaTerakhir
        ]
    ]);
}

}
