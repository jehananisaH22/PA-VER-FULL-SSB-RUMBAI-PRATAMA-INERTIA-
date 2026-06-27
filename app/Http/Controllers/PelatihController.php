<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Jadwal_Latihan;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\Siswa;
use App\Models\Pelatih;
use App\Models\Presensi;
use App\Models\Catatan_Pelatih;
use App\Models\Performa_Siswa;
use App\Models\Pembayaran;
use App\Models\BuktiPembayaran;
use App\Models\Notifikasi;
use App\Support\SsbInertiaData;
use App\Services\SiswaPaymentStatusService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

class PelatihController extends Controller
{
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

  private function studentCategoryLabel(?object $student): ?string
  {
    $age = $this->studentAgeValue($student);

    return $age ? 'U-' . $age : null;
  }

  private function categoryOptionsFromStudents($students)
  {
    return collect($students)
        ->map(fn ($student) => $this->studentCategoryLabel($student))
        ->filter()
        ->unique()
        ->sortBy(fn ($category) => (int) preg_replace('/\D/', '', $category))
        ->values();
  }

  private function filterStudentsByCategory($students, ?string $category)
  {
    $age = $this->extractUmur($category);

    if ($age === null) {
        return collect($students);
    }

    return collect($students)
        ->filter(fn ($student) => $this->studentAgeValue($student) === $age)
        ->values();
  }

  private function applyStudentAgeFilter($query, int $age): void
  {
    $oldestBirthDate = now()->subYears($age + 1)->addDay()->toDateString();
    $youngestBirthDate = now()->subYears($age)->toDateString();

    $query->where(function ($builder) use ($age, $oldestBirthDate, $youngestBirthDate) {
        $builder
            ->whereBetween('tanggal_lahir', [$oldestBirthDate, $youngestBirthDate])
            ->orWhere(function ($fallback) use ($age) {
                $fallback->whereNull('tanggal_lahir')->where('umur', $age);
            });
    });
  }

  private function activeStatusValues(): array
  {
    return ['active', 'aktif'];
  }

  private function currentPelatih(): ?Pelatih
  {
    $user = Auth::user();

    if (! $user || $user->role !== 'pelatih') {
        return null;
    }

    return Pelatih::resolveForUser($user);
  }

  private function studentIdsForPelatih(Pelatih $pelatih): array
  {
    $explicitStudentIds = DB::table('jadwal_siswa')
        ->join('jadwal_latihan', 'jadwal_siswa.id_jadwal', '=', 'jadwal_latihan.id_jadwal')
        ->join('siswa', 'jadwal_siswa.id_siswa', '=', 'siswa.id_siswa')
        ->where(function ($query) use ($pelatih) {
            $query->where('jadwal_latihan.id_pelatih', $pelatih->id_pelatih)
                ->orWhereNull('jadwal_latihan.id_pelatih');
        })
        ->whereIn(DB::raw('LOWER(COALESCE(siswa.status, ""))'), $this->activeStatusValues())
        ->pluck('jadwal_siswa.id_siswa')
        ->map(fn ($id) => (int) $id)
        ->unique()
        ->values()
        ->all();

    return collect($explicitStudentIds)
        ->unique()
        ->values()
        ->all();
  }

  private function studentIdsForPaymentPelatih(Pelatih $pelatih): array
  {
    $explicitIds = DB::table('jadwal_siswa')
        ->join('jadwal_latihan', 'jadwal_siswa.id_jadwal', '=', 'jadwal_latihan.id_jadwal')
        ->where(function ($query) use ($pelatih) {
            $query->where('jadwal_latihan.id_pelatih', $pelatih->id_pelatih)
                ->orWhereNull('jadwal_latihan.id_pelatih');
        })
        ->pluck('jadwal_siswa.id_siswa');

    return $explicitIds->map(fn ($id) => (int) $id)->unique()->values()->all();
  }

  private function activeStudentIdsForSchedule(object $jadwal): array
  {
    if ($jadwal instanceof Jadwal_Latihan && $jadwal->relationLoaded('siswa')) {
        $explicitStudentIds = $jadwal->siswa
            ->filter(fn ($student) => in_array(strtolower((string) $student->status), $this->activeStatusValues(), true))
            ->pluck('id_siswa')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    } else {
        $explicitStudentIds = DB::table('jadwal_siswa')
            ->join('siswa', 'jadwal_siswa.id_siswa', '=', 'siswa.id_siswa')
            ->where('jadwal_siswa.id_jadwal', $jadwal->id_jadwal)
            ->whereIn(DB::raw('LOWER(COALESCE(siswa.status, ""))'), $this->activeStatusValues())
            ->pluck('siswa.id_siswa')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }

    return $explicitStudentIds;
  }

  public function Kehadiran(Request $request)
{
    $pelatih = $this->currentPelatih();

    if (! $pelatih) {
        return response()->json([
            'status' => false,
            'message' => 'Data pelatih tidak ditemukan'
        ], 404);
    }

    $jadwalQuery = Jadwal_Latihan::with(['siswa' => function ($q) use ($request) {
        $q->whereIn(DB::raw('LOWER(COALESCE(status, ""))'), $this->activeStatusValues());

        // FILTER UMUR (U-12 → 12)
    }])->whereHas('siswa', function ($query) {
        $query->whereIn(DB::raw('LOWER(COALESCE(status, ""))'), $this->activeStatusValues());
    })
    ->where(function ($query) use ($pelatih) {
        $query->where('id_pelatih', $pelatih->id_pelatih)
            ->orWhereNull('id_pelatih');
    });

    // ambil jadwal terbaru
    $jadwal = $jadwalQuery
        ->orderBy('id_jadwal', 'desc')
        ->first();

    return response()->json([
        'status' => true,
        'jadwal' => $jadwal
    ]);
}

    public function getJadwal()
{
    $jadwal = \App\Models\Jadwal_Latihan::whereHas('siswa', function ($query) {
        $query->whereIn(DB::raw('LOWER(COALESCE(status, ""))'), $this->activeStatusValues());
    });

    $pelatih = $this->currentPelatih();

    if ($pelatih) {
        $jadwal->where(function ($query) use ($pelatih) {
            $query->where('id_pelatih', $pelatih->id_pelatih)
                ->orWhereNull('id_pelatih');
        });
    }

    $jadwal = $jadwal->get();

    return response()->json([
        'status' => true,
        'data' => $jadwal
    ]);
}

public function Input_Presensi(Request $request)
{
    $pelatih = $this->currentPelatih();

    if (! $pelatih) {
        return response()->json([
            'status' => false,
            'message' => 'Data pelatih tidak ditemukan'
        ], 404);
    }

    $request->validate([
        'id_jadwal' => 'required|exists:jadwal_latihan,id_jadwal',
        'tanggal' => 'nullable|date',
        'data' => 'required|array',
        'data.*.id_siswa' => 'required|exists:siswa,id_siswa',
        'data.*.status' => 'required'
    ]);

    $jadwal = Jadwal_Latihan::with('siswa')
        ->where('id_jadwal', $request->id_jadwal)
        ->where(function ($query) use ($pelatih) {
            $query->where('id_pelatih', $pelatih->id_pelatih)
                ->orWhereNull('id_pelatih');
        })
        ->firstOrFail();

    $attendanceDate = $request->filled('tanggal')
        ? Carbon::parse($request->tanggal)
        : now();
    $scheduleDate = Carbon::parse($jadwal->tanggal);
    $validStudentIds = $this->activeStudentIdsForSchedule($jadwal);

    if (! $attendanceDate->isSameDay($scheduleDate)) {
        return response()->json([
            'status' => false,
            'message' => 'Tanggal absensi harus sama dengan tanggal jadwal latihan yang dipilih.',
            'schedule_date' => $scheduleDate->toDateString(),
            'attendance_date' => $attendanceDate->toDateString(),
            'schedule_day' => $scheduleDate->locale('id')->translatedFormat('l'),
            'attendance_day' => $attendanceDate->locale('id')->translatedFormat('l'),
        ], 422);
    }

    $savedCount = 0;
    $savedStudentIds = [];

    foreach ($request->data as $item) {
        if (! in_array((int) $item['id_siswa'], $validStudentIds, true)) {
            continue;
        }

        $status = ucfirst(strtolower((string) $item['status']));
        if ($status === 'Izin') {
            $status = 'Alpha';
        }

        if (! in_array($status, ['Hadir', 'Sakit', 'Alpha'], true)) {
            continue;
        }

        $presensiKeys = [
            'id_siswa' => $item['id_siswa'],
            'id_jadwal' => $request->id_jadwal,
        ];

        if (Schema::hasColumn('presensi', 'tanggal_presensi')) {
            $presensiKeys['tanggal_presensi'] = $attendanceDate->toDateString();
        }

        $presensi = Presensi::firstOrNew($presensiKeys);

        $presensi->id_pelatih = $pelatih->id_pelatih;
        if (Schema::hasColumn('presensi', 'tanggal_presensi')) {
            $presensi->tanggal_presensi = $attendanceDate->toDateString();
        }
        $presensi->status_kehadiran = $status;
        $presensi->created_at = $attendanceDate->copy()->startOfDay();
        $presensi->updated_at = now();
        $presensi->save();

        $savedCount++;
        $savedStudentIds[] = (int) $item['id_siswa'];
    }

    if ($savedCount === 0) {
        return response()->json([
            'status' => false,
            'message' => 'Tidak ada presensi yang tersimpan. Pastikan siswa termasuk dalam jadwal yang dipilih.',
        ], 422);
    }

    $this->notifyParentsOfStudents(
        $savedStudentIds,
        'Kehadiran Diperbarui',
        'Pelatih sudah menginput data kehadiran latihan.'
    );
    $this->notifyAdmins(
        'Kehadiran Pelatih Masuk',
        ($pelatih->nama_pelatih ?? 'Pelatih') . ' menginput kehadiran untuk ' . count(array_unique($savedStudentIds)) . ' siswa.'
    );

    return response()->json([
        'status' => true,
        'message' => 'Presensi berhasil disimpan',
        'saved' => $savedCount,
        'schedule' => [
            'id_jadwal' => $jadwal->id_jadwal,
            'tanggal' => $scheduleDate->toDateString(),
            'lokasi' => $jadwal->lokasi,
        ],
    ]);
}



public function Rekap_Absensi(Request $request)
{
    $bulan = $request->bulan ?? now()->month;
    $tahun = $request->tahun ?? now()->year;

    $pelatih = $this->currentPelatih();
    $studentIds = $pelatih ? $this->studentIdsForPelatih($pelatih) : null;

    $siswa = Siswa::whereIn(DB::raw('LOWER(COALESCE(status, ""))'), $this->activeStatusValues())
        ->when($studentIds !== null, fn ($query) => $query->whereIn('id_siswa', $studentIds))
        ->get();

    $rekap = $siswa->map(function ($s) use ($bulan, $tahun) {

        $presensi = $s->presensi()
            ->whereMonth('created_at', $bulan)
            ->whereYear('created_at', $tahun)
            ->get();

        $total = $presensi->count();

        $hadir = $presensi->where('status_kehadiran', 'Hadir')->count();
        $sakit = $presensi->where('status_kehadiran', 'Sakit')->count();
        $alpha  = $presensi->filter(fn ($row) => in_array($row->status_kehadiran, ['Alpha', 'Izin'], true))->count();

        return [
            'id_siswa' => $s->id_siswa,
            'nama_siswa' => $s->nama_siswa ?? '-',

            'umur' => $this->studentCategoryLabel($s),

            'hadir' => $total ? round(($hadir / $total) * 100, 1) : 0,
            'sakit' => $total ? round(($sakit / $total) * 100, 1) : 0,
            'alpha'  => $total ? round(($alpha / $total) * 100, 1) : 0,

            'total' => $total,
        ];
            });

    return response()->json([
        'status' => true,
        'message' => 'Rekap semua siswa per bulan berhasil',
        'bulan' => $bulan,
        'tahun' => $tahun,
        'data' => $rekap
    ]);
}

public function Performa_Siswa(Request $request, $id)
{
    $pelatih = $this->currentPelatih();

    if (!$pelatih) {
        return response()->json([
            'status' => false,
            'message' => 'Data pelatih tidak ditemukan'
        ], 404);
    }

    // 🔥 batasi akses hanya milik pelatih
    $jadwal = Jadwal_Latihan::with(['siswa' => function ($query) {
            $query->whereIn(DB::raw('LOWER(COALESCE(status, ""))'), $this->activeStatusValues());
        }])
        ->where('id_jadwal', $id)
        ->where(function ($query) use ($pelatih) {
            $query->where('id_pelatih', $pelatih->id_pelatih)
                ->orWhereNull('id_pelatih');
        })
        ->first();

    if (!$jadwal) {
        return response()->json([
            'status' => false,
            'message' => 'Jadwal tidak ditemukan'
        ], 404);
    }

    return response()->json([
        'status' => true,
        'jadwal' => $jadwal,
    ]);
}


public function Input_Performa_Siswa(Request $request, $id)
{
    $pelatih = $this->currentPelatih();

    if (! $pelatih) {
        return response()->json([
            'status' => false,
            'message' => 'Data pelatih tidak ditemukan'
        ], 404);
    }

    // 🔥 WAJIB: load relasi siswa
    $jadwal = Jadwal_Latihan::with(['siswa' => function ($query) {
            $query->whereIn(DB::raw('LOWER(COALESCE(status, ""))'), $this->activeStatusValues());
        }])
        ->where('id_jadwal', $id)
        ->where(function ($query) use ($pelatih) {
            $query->where('id_pelatih', $pelatih->id_pelatih)
                ->orWhereNull('id_pelatih');
        })
        ->first();

    if (!$jadwal) {
        return response()->json([
            'status' => false,
            'message' => 'Jadwal tidak ditemukan'
        ], 404);
    }

    $request->validate([
        'tanggal_penilaian' => 'nullable|date',
        'data' => 'required|array',
        'data.*.id_siswa' => 'required|exists:siswa,id_siswa',
        'data.*.dribbling' => 'required|numeric|min:0|max:100',
        'data.*.passing' => 'required|numeric|min:0|max:100',
        'data.*.shooting' => 'required|numeric|min:0|max:100',
    ]);

    $tanggal = $request->filled('tanggal_penilaian')
        ? Carbon::parse($request->tanggal_penilaian)
        : now();
    $scheduleDate = Carbon::parse($jadwal->tanggal);

    if (! $tanggal->isSameDay($scheduleDate)) {
        return response()->json([
            'status' => false,
            'message' => 'Tanggal input performa harus sama dengan tanggal jadwal latihan yang dipilih.',
            'schedule_date' => $scheduleDate->toDateString(),
            'input_date' => $tanggal->toDateString(),
            'schedule_day' => $scheduleDate->locale('id')->translatedFormat('l'),
            'input_day' => $tanggal->locale('id')->translatedFormat('l'),
        ], 422);
    }

    $validStudentIds = $this->activeStudentIdsForSchedule($jadwal);
    $savedStudentIds = [];

    DB::transaction(function () use ($request, $jadwal, $pelatih, $tanggal, $validStudentIds, &$savedStudentIds) {
        $nextId = ((int) DB::table('performa_siswa')
            ->lockForUpdate()
            ->orderByDesc('id_performa')
            ->value('id_performa')) + 1;

        foreach ($request->data as $item) {

        // 🔥 cek siswa di jadwal (lebih aman pakai contains)
        if (! in_array((int) $item['id_siswa'], $validStudentIds, true)) {
            continue;
        }

            $keys = [
                'id_siswa' => $item['id_siswa'],
                'id_jadwal' => $jadwal->id_jadwal,
                'tanggal_penilaian' => $tanggal->toDateString(),
            ];
            $values = [
                'id_pelatih' => $pelatih->id_pelatih,
                'dribbling' => $item['dribbling'],
                'passing' => $item['passing'],
                'shooting' => $item['shooting'],
                'rata_rata' => round(((float) $item['dribbling'] + (float) $item['passing'] + (float) $item['shooting']) / 3, 2),
            ];
            $existingPerformance = Performa_Siswa::where($keys)->first();

            if ($existingPerformance) {
                $existingPerformance->update($values);
            } else {
                Performa_Siswa::create(array_merge(
                    ['id_performa' => $nextId++],
                    $keys,
                    $values
                ));
            }

            $savedStudentIds[] = (int) $item['id_siswa'];
        }
    });

    if (count($savedStudentIds) === 0) {
        return response()->json([
            'status' => false,
            'message' => 'Tidak ada nilai performa yang tersimpan. Pastikan siswa termasuk dalam jadwal yang dipilih.',
        ], 422);
    }

    $this->notifyParentsOfStudents(
        $savedStudentIds,
        'Performa Latihan Diperbarui',
        'Pelatih sudah menginput nilai performa latihan.'
    );
    $this->notifyAdmins(
        'Performa Pelatih Masuk',
        ($pelatih->nama_pelatih ?? 'Pelatih') . ' menginput performa latihan untuk ' . count(array_unique($savedStudentIds)) . ' siswa.'
    );

    return response()->json([
        'status' => true,
        'message' => 'Performa berhasil disimpan',
        'saved' => count(array_unique($savedStudentIds)),
        'schedule' => [
            'id_jadwal' => $jadwal->id_jadwal,
            'tanggal' => $scheduleDate->toDateString(),
            'lokasi' => $jadwal->lokasi,
        ],
    ]);
}

public function Update_Performa_Siswa(Request $request, $id_jadwal)
{
    return $this->Input_Performa_Siswa($request, $id_jadwal);
}


public function Catatan_Pelatih(Request $request)
{
    $query = Catatan_Pelatih::with(['siswa', 'pelatih'])
        ->whereHas('siswa', function ($query) {
            $query->whereIn(DB::raw('LOWER(COALESCE(status, ""))'), $this->activeStatusValues());
        });

    $pelatih = $this->currentPelatih();

    if ($pelatih) {
        $query->where('id_pelatih', $pelatih->id_pelatih);
        $query->whereIn('id_siswa', $this->studentIdsForPelatih($pelatih));
    }

    if ($request->filled('id_pelatih')) {
        $query->where('id_pelatih', $request->id_pelatih);
    }

    if ($request->filled('id_siswa')) {
        $query->where('id_siswa', $request->id_siswa);
    }

    $data = $query
        ->orderByDesc('tanggal_catatan')
        ->get();

    return response()->json([
        'status' => true,
        'message' => 'Data catatan pelatih',
        'data' => $data
    ]);
}

public function Catatan_perPelatih($id_pelatih)
{
    $data = Catatan_Pelatih::with(['siswa', 'pelatih'])
        ->where('id_pelatih', $id_pelatih)
        ->whereHas('siswa', function ($query) {
            $query->whereIn(DB::raw('LOWER(COALESCE(status, ""))'), $this->activeStatusValues());
        })
        ->orderByDesc('tanggal_catatan')
        ->get();

    return response()->json([
        'status' => true,
        'message' => 'Data catatan pelatih',
        'data' => $data
    ]);
}

public function Tambah_Catatan_Pelatih(Request $request)
{
    $request->validate([
        'id_pelatih' => 'nullable',
        'catatan' => 'required',
        'data' => 'required|array',
        'data.*.id_siswa' => 'required|exists:siswa,id_siswa'
    ]);

    $pelatih = $this->currentPelatih();
    $idPelatih = $pelatih?->id_pelatih ?: $request->id_pelatih;

    if (! $idPelatih) {
        return response()->json([
            'status' => false,
            'message' => 'Data pelatih tidak ditemukan'
        ], 404);
    }

    $insert = [];
    $studentIds = [];
    $allowedStudentIds = $pelatih ? $this->studentIdsForPelatih($pelatih) : null;

    try {
        DB::transaction(function () use ($request, $idPelatih, $allowedStudentIds, &$insert, &$studentIds) {
            foreach ($request->data as $item) {
                if ($allowedStudentIds !== null && ! in_array((int) $item['id_siswa'], $allowedStudentIds, true)) {
                    continue;
                }

                $isActiveStudent = Siswa::where('id_siswa', $item['id_siswa'])
                    ->whereIn(DB::raw('LOWER(COALESCE(status, ""))'), $this->activeStatusValues())
                    ->exists();

                if (! $isActiveStudent) {
                    continue;
                }

                $catatan = Catatan_Pelatih::create([
                    'id_siswa' => $item['id_siswa'],
                    'id_pelatih' => $idPelatih,
                    'catatan' => $request->catatan,
                    'tanggal_catatan' => now()->toDateString()
                ]);

                $catatan->load(['siswa', 'pelatih']);
                $studentIds[] = (int) $catatan->id_siswa;
                $tanggal = $catatan->tanggal_catatan
                    ? Carbon::parse($catatan->tanggal_catatan)
                    : now();

                $insert[] = [
                    'id_catatan' => $catatan->id_catatan,
                    'id' => $catatan->id_catatan,
                    'id_siswa' => $catatan->id_siswa,
                    'studentId' => $catatan->id_siswa,
                    'nama_siswa' => $catatan->siswa->nama_siswa ?? null,
                    'studentName' => $catatan->siswa->nama_siswa ?? null,
                    'player' => $catatan->siswa->nama_siswa ?? null,
                    'umur' => $this->studentCategoryLabel($catatan->siswa),
                    'category' => $catatan->siswa?->kategori_umur
                        ? strtolower(str_replace('-', '', $catatan->siswa->kategori_umur))
                        : null,
                    'id_pelatih' => $catatan->id_pelatih,
                    'nama_pelatih' => $catatan->pelatih->nama_pelatih ?? null,
                    'coach' => $catatan->pelatih->nama_pelatih ?? 'Pelatih',
                    'coachName' => $catatan->pelatih->nama_pelatih ?? 'Pelatih',
                    'catatan' => $catatan->catatan,
                    'note' => $catatan->catatan,
                    'title' => $catatan->catatan,
                    'tanggal_catatan' => $catatan->tanggal_catatan,
                    'date' => $tanggal->format('d/m/Y'),
                    'createdAt' => $tanggal->timestamp * 1000,
                ];
            }
        });
    } catch (\Throwable $e) {
        report($e);

        return response()->json([
            'status' => false,
            'message' => 'Catatan gagal disimpan. Silakan coba lagi.'
        ], 500);
    }

    if (count($insert) === 0) {
        return response()->json([
            'status' => false,
            'message' => 'Tidak ada catatan yang tersimpan. Pastikan siswa aktif.'
        ], 422);
    }

    $this->notifyParentsOfStudents(
        array_values(array_unique($studentIds)),
        'Catatan Pelatih Baru',
        'Pelatih menambahkan catatan baru untuk siswa.',
        (int) $idPelatih
    );
    $coachName = Pelatih::where('id_pelatih', $idPelatih)->value('nama_pelatih') ?: 'Pelatih';
    $this->notifyAdmins(
        'Catatan Pelatih Masuk',
        $coachName . ' menambahkan catatan untuk ' . count(array_unique($studentIds)) . ' siswa.'
    );

    return response()->json([
        'status' => true,
        'message' => 'Catatan berhasil disimpan untuk siswa',
        'data' => $insert
    ]);
}

public function Update_Catatan_Pelatih(Request $request, $id)
{
    $catatan = Catatan_Pelatih::find($id);

    if (!$catatan) {
        return response()->json([
            'status' => false,
            'message' => 'Data tidak ditemukan'
        ], 404);
    }

    $request->validate([
        'id_siswa' => 'required|exists:siswa,id_siswa',
        'id_pelatih' => 'nullable',
        'catatan' => 'required'
    ]);

    $pelatih = $this->currentPelatih();

    if ($pelatih && (int) $catatan->id_pelatih !== (int) $pelatih->id_pelatih) {
        return response()->json([
            'status' => false,
            'message' => 'Catatan pelatih lain tidak bisa diupdate'
        ], 403);
    }

    $isActiveStudent = Siswa::where('id_siswa', $request->id_siswa)
        ->whereIn(DB::raw('LOWER(COALESCE(status, ""))'), $this->activeStatusValues())
        ->exists();

    if (
        ! $isActiveStudent
        || ($pelatih && ! in_array((int) $request->id_siswa, $this->studentIdsForPelatih($pelatih), true))
    ) {
        return response()->json([
            'status' => false,
            'message' => 'Siswa belum aktif atau tidak termasuk jadwal pelatih.'
        ], 422);
    }

    $idPelatih = $pelatih?->id_pelatih ?: $request->id_pelatih;

    $catatan->update([
        'id_siswa' => $request->id_siswa,
        'id_pelatih' => $idPelatih,
        'catatan' => $request->catatan
    ]);

    // reload relasi biar data fresh
    $catatan->load(['siswa', 'pelatih']);

    return response()->json([
        'status' => true,
        'message' => 'Catatan berhasil diupdate',
        'data' => [
            'id_catatan' => $catatan->id_catatan,
            'id_siswa' => $catatan->id_siswa,
            'nama_siswa' => $catatan->siswa->nama_siswa ?? null,
            'umur' => $this->studentCategoryLabel($catatan->siswa),

            'id_pelatih' => $catatan->id_pelatih,
            'nama_pelatih' => $catatan->pelatih->nama_pelatih ?? null,

            'catatan' => $catatan->catatan,
            'tanggal_catatan' => $catatan->tanggal_catatan,
            'updated_at' => $catatan->updated_at
        ]
    ]);
}

public function Hapus_Catatan_Pelatih($id)
{
    $catatan = Catatan_Pelatih::find($id);

    if (!$catatan) {
        return response()->json([
            'status' => false,
            'message' => 'Data tidak ditemukan'
        ], 404);
    }

    $user = Auth::user();
    if ($user?->role === 'pelatih') {
        $pelatih = Pelatih::resolveForUser($user);

        if (! $pelatih || (int) $catatan->id_pelatih !== (int) $pelatih->id_pelatih) {
            return response()->json([
                'status' => false,
                'message' => 'Catatan pelatih lain tidak bisa dihapus'
            ], 403);
        }
    }

    $catatan->delete();

    return response()->json([
        'status' => true,
        'message' => 'Catatan berhasil dihapus'
    ]);
}

public function FormUploadBuktiPembayaran(Request $request)
{
    $pelatih = $this->currentPelatih();
    $allowedStudentIds = $pelatih ? $this->studentIdsForPaymentPelatih($pelatih) : null;

    $studentOptionRows = Siswa::select('id_siswa', 'nama_siswa', 'tanggal_lahir', 'umur', 'status')
        ->when($allowedStudentIds !== null, fn ($query) => $query->whereIn('id_siswa', $allowedStudentIds))
        ->orderBy('nama_siswa')
        ->get();

    $kategoriUmur = $this->categoryOptionsFromStudents($studentOptionRows);

    $studentsForOptions = $this->filterStudentsByCategory($studentOptionRows, $request->input('kategori_umur'));

    if ($request->filled('search')) {
        $search = strtolower((string) $request->search);
        $studentsForOptions = $studentsForOptions
            ->filter(fn ($student) => str_contains(strtolower((string) $student->nama_siswa), $search))
            ->values();
    }

    $siswa = $studentsForOptions->map(function ($item) {
        return [
            'id_siswa' => $item->id_siswa,
            'nama_siswa' => $item->nama_siswa,
            'kategori_umur' => $this->studentCategoryLabel($item),
            'status' => $item->status,
        ];
    });

    return response()->json([
        'success' => true,
        'message' => 'Data form upload bukti pembayaran berhasil diambil',
        'filters' => [
            'kategori_umur' => $request->kategori_umur,
            'search' => $request->search,
        ],
        'data' => [
            'kategori_umur' => $kategoriUmur,
            'jenis_pembayaran' => ['Pendaftaran', 'Harian'],
            'siswa' => $siswa,
        ],
    ]);
}

public function Store_Bukti_Pembayaran_Pelatih(Request $request)
{
    $pelatih = $this->currentPelatih();

    if (! $pelatih) {
        return response()->json([
            'success' => false,
            'message' => 'Data pelatih tidak ditemukan',
        ], 404);
    }

    $validated = $request->validate([
        'id_siswa' => 'required|exists:siswa,id_siswa',
        'jenis' => 'required|in:Harian,Pendaftaran',
        'tanggal_bukti_bayar' => 'required|date',
        'jumlah' => 'nullable|numeric|min:1',
        'bukti_bayar' => 'required|file|mimes:jpg,jpeg,png,webp,pdf|max:5120',
    ]);

    if ($validated['jenis'] !== 'Pendaftaran' && ! $request->filled('jumlah')) {
        return response()->json([
            'success' => false,
            'message' => 'Nominal pembayaran wajib diisi sesuai bukti pembayaran.',
        ], 422);
    }

    DB::beginTransaction();

    try {
        $siswa = Siswa::where('id_siswa', $validated['id_siswa'])->first();

        if (
            ! $siswa
            || ! in_array((int) $siswa->id_siswa, $this->studentIdsForPaymentPelatih($pelatih), true)
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Siswa tidak termasuk jadwal pelatih.',
            ], 422);
        }
        $tanggal = Carbon::parse($validated['tanggal_bukti_bayar']);
        $overduePayment = $validated['jenis'] === 'Harian'
            ? app(SiswaPaymentStatusService::class)->overdueSummary($siswa->loadMissing('pendaftaran'))
            : null;
        $periode = $validated['jenis'] === 'Harian'
            ? ($overduePayment['period'] ?? $tanggal->format('Y-m-d'))
            : $tanggal->format('Y-m');
        $jumlah = $validated['jenis'] === 'Pendaftaran'
            ? 280000
            : (float) $validated['jumlah'];

        $pembayaran = $validated['jenis'] === 'Pendaftaran'
            ? Pembayaran::where('id_siswa', $siswa->id_siswa)
                ->where('jenis', $validated['jenis'])
                ->where('periode', $periode)
                ->first()
            : null;

        if (!$pembayaran) {
            $nextPaymentId = ((int) DB::table('pembayaran')
                ->lockForUpdate()
                ->orderByDesc('id_pembayaran')
                ->value('id_pembayaran')) + 1;

            $pembayaran = Pembayaran::create([
                'id_pembayaran' => $nextPaymentId,
                'id_siswa' => $siswa->id_siswa,
                'jenis' => $validated['jenis'],
                'periode' => $periode,
                'jumlah' => $jumlah,
                'tanggal_bayar' => $tanggal->toDateString(),
                'status' => 'Belum',
            ]);
        }

        if (!$pembayaran->tanggal_bayar) {
            $pembayaran->update([
                'tanggal_bayar' => $tanggal->toDateString(),
            ]);
        }

        $filePath = $request->file('bukti_bayar')->store('bukti_pembayaran', 'public');

        $bukti = BuktiPembayaran::where('id_pembayaran', $pembayaran->id_pembayaran)->first();

        if ($bukti) {
            if ($bukti->bukti_bayar && Storage::disk('public')->exists($bukti->bukti_bayar)) {
                Storage::disk('public')->delete($bukti->bukti_bayar);
            }

            $bukti->update([
                'id_siswa' => $siswa->id_siswa,
                'periode' => $periode,
                'tanggal_bukti_bayar' => $tanggal->toDateString(),
                'status' => 'Menunggu validasi',
                'bukti_bayar' => $filePath,
            ]);
        } else {
            $nextProofId = ((int) DB::table('bukti_pembayaran')
                ->lockForUpdate()
                ->orderByDesc('id_bukti_pembayaran')
                ->value('id_bukti_pembayaran')) + 1;

            $bukti = BuktiPembayaran::create([
                'id_bukti_pembayaran' => $nextProofId,
                'id_pembayaran' => $pembayaran->id_pembayaran,
                'id_siswa' => $siswa->id_siswa,
                'periode' => $periode,
                'tanggal_bukti_bayar' => $tanggal->toDateString(),
                'status' => 'Menunggu validasi',
                'bukti_bayar' => $filePath,
            ]);
        }

        $pembayaran->update([
            'jumlah' => $jumlah,
            'tanggal_bayar' => $tanggal->toDateString(),
            'status' => 'Belum',
        ]);

        DB::commit();

        $this->notifyParentsOfStudents(
            [$siswa->id_siswa],
            'Bukti Pembayaran Masuk',
            'Pelatih sudah mengupload bukti pembayaran. Menunggu validasi admin.'
        );
        $this->notifyAdmins(
            'Bukti Pembayaran Pelatih',
            ($pelatih->nama_pelatih ?? 'Pelatih') . " mengupload bukti pembayaran {$validated['jenis']} untuk {$siswa->nama_siswa}. Data masuk ke validasi pembayaran admin."
        );

        return response()->json([
            'success' => true,
            'message' => 'Bukti pembayaran berhasil diupload',
            'data' => $bukti->load(['siswa', 'pembayaran']),
        ], 201);
    } catch (\Throwable $e) {
        DB::rollBack();

        return response()->json([
            'success' => false,
            'message' => 'Upload bukti pembayaran gagal',
            'error' => $e->getMessage(),
        ], 500);
    }
}

public function History_Bukti_Pembayaran_Pelatih(Request $request)
{
    $query = BuktiPembayaran::with([
        'siswa:id_siswa,nama_siswa,tanggal_lahir,umur',
        'pembayaran:id_pembayaran,id_siswa,jenis,status',
    ]);
    $pelatih = $this->currentPelatih();

    if ($pelatih) {
        $query->whereIn('id_siswa', $this->studentIdsForPaymentPelatih($pelatih));
    }

    if ($request->filled('search')) {
        $query->whereHas('siswa', function ($siswaQuery) use ($request) {
            $siswaQuery->where('nama_siswa', 'like', '%' . $request->search . '%');
        });
    }

    if ($request->filled('kategori_umur')) {
        $umur = $this->extractUmur($request->kategori_umur);

        if (! is_null($umur)) {
            $query->whereHas('siswa', function ($siswaQuery) use ($umur) {
                $this->applyStudentAgeFilter($siswaQuery, $umur);
            });
        }
    }

    if ($request->filled('jenis')) {
        $query->whereHas('pembayaran', function ($pembayaranQuery) use ($request) {
            $pembayaranQuery->where('jenis', $request->jenis);
        });
    }

    $history = $query->orderBy('tanggal_bukti_bayar', 'desc')
        ->orderBy('id_bukti_pembayaran', 'desc')
        ->paginate(10)
        ->through(function ($item) {
            return [
                'id_bukti_pembayaran' => $item->id_bukti_pembayaran,
                'id_pembayaran' => $item->id_pembayaran,
                'id_siswa' => $item->id_siswa,
                'nama_siswa' => $item->siswa->nama_siswa ?? null,
                'kategori_umur' => $this->studentCategoryLabel($item->siswa),
                'jenis' => $item->pembayaran->jenis ?? null,
                'periode' => $item->periode,
                'tanggal_bukti_bayar' => $item->tanggal_bukti_bayar,
                'status' => $item->status,
                'bukti_bayar' => $item->bukti_bayar,
                'nama_file' => $item->bukti_bayar ? basename($item->bukti_bayar) : null,
            ];
        });

    $historyStudentRows = Siswa::select('id_siswa', 'tanggal_lahir', 'umur')
        ->when($pelatih, fn ($query) => $query->whereIn('id_siswa', $this->studentIdsForPaymentPelatih($pelatih)))
        ->get();
    $kategoriUmur = $this->categoryOptionsFromStudents($historyStudentRows);

    return response()->json([
        'success' => true,
        'message' => 'History bukti pembayaran berhasil diambil',
        'filters' => [
            'kategori_umur' => $request->kategori_umur,
            'jenis' => $request->jenis,
            'search' => $request->search,
        ],
        'options' => [
            'kategori_umur' => $kategoriUmur,
            'jenis_pembayaran' => ['Pendaftaran', 'Harian'],
        ],
        'data' => $history,
    ]);
}

public function Hapus_Bukti_Pembayaran_Pelatih($id)
{
    $bukti = BuktiPembayaran::find($id);

    if (!$bukti) {
        return response()->json([
            'success' => false,
            'message' => 'Data bukti pembayaran tidak ditemukan',
        ], 404);
    }

    $pelatih = $this->currentPelatih();

    if ($pelatih && ! in_array((int) $bukti->id_siswa, $this->studentIdsForPelatih($pelatih), true)) {
        return response()->json([
            'success' => false,
            'message' => 'Bukti pembayaran siswa di luar jadwal pelatih tidak bisa dihapus',
        ], 403);
    }

    DB::beginTransaction();

    try {
        if ($bukti->bukti_bayar && Storage::disk('public')->exists($bukti->bukti_bayar)) {
            Storage::disk('public')->delete($bukti->bukti_bayar);
        }

        $pembayaran = Pembayaran::find($bukti->id_pembayaran);
        $bukti->delete();

        if ($pembayaran) {
            $masihAdaBukti = BuktiPembayaran::where('id_pembayaran', $pembayaran->id_pembayaran)->exists();

            if (!$masihAdaBukti) {
                $pembayaran->update([
                    'tanggal_bayar' => null,
                    'status' => 'Belum',
                ]);
            }
        }

        DB::commit();

        return response()->json([
            'success' => true,
            'message' => 'Bukti pembayaran berhasil dihapus',
        ]);
    } catch (\Throwable $e) {
        DB::rollBack();

        return response()->json([
            'success' => false,
            'message' => 'Gagal menghapus bukti pembayaran',
            'error' => $e->getMessage(),
        ], 500);
    }
}

private function extractUmur(?string $kategoriUmur): ?int
{
    if (!$kategoriUmur) {
        return null;
    }

    if (preg_match('/U-(\d+)/i', $kategoriUmur, $match)) {
        return (int) $match[1];
    }

    if (preg_match('/U(\d+)/i', $kategoriUmur, $match)) {
        return (int) $match[1];
    }

    return null;
}

private function notifyParentsOfStudents(array $studentIds, string $judul, string $isi, ?int $idPelatih = null): void
{
    $studentIds = collect($studentIds)
        ->filter()
        ->map(fn ($id) => (int) $id)
        ->unique()
        ->values();

    if ($studentIds->isEmpty()) {
        return;
    }

    $recipients = Siswa::with('orangtua:id_ortu,user_id')
        ->whereIn('id_siswa', $studentIds)
        ->get()
        ->map(function (Siswa $siswa) use ($idPelatih) {
            $userId = $siswa->user_id ?: $siswa->orangtua?->user_id;

            if (! $userId) {
                return null;
            }

            return [
                'user_id' => (int) $userId,
                'id_siswa' => (int) $siswa->id_siswa,
                'id_pelatih' => $idPelatih,
            ];
        })
        ->filter()
        ->values();

    if ($recipients->isEmpty()) {
        return;
    }

    $notif = Notifikasi::create([
        'judul' => $judul,
        'isi' => $isi,
        'target_role' => 'orang_tua',
        'tanggal_kirim' => now(),
    ]);

    $recipients->each(function (array $recipient) use ($notif) {
            DB::table('notifikasi_terkirim')->insert([
                'id_notifikasi' => $notif->id_notifikasi,
                'user_id' => $recipient['user_id'],
                'id_siswa' => $recipient['id_siswa'],
                'id_admin' => null,
                'id_pelatih' => $recipient['id_pelatih'],
                'status_baca' => 'Belum Dibaca',
                'tanggal_baca' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });
}

private function notifyAdmins(string $judul, string $isi): void
{
    $adminUsers = User::where('role', 'admin')
        ->leftJoin('admin', 'users.id', '=', 'admin.user_id')
        ->select('users.id as user_id', 'admin.id_admin')
        ->get();

    if ($adminUsers->isEmpty()) {
        return;
    }

    $notif = Notifikasi::create([
        'judul' => $judul,
        'isi' => $isi,
        'target_role' => 'admin',
        'tanggal_kirim' => now(),
    ]);

    $adminUsers->each(function ($adminUser) use ($notif) {
        DB::table('notifikasi_terkirim')->insert([
            'id_notifikasi' => $notif->id_notifikasi,
            'user_id' => $adminUser->user_id,
            'id_siswa' => null,
            'id_admin' => $adminUser->id_admin,
            'id_pelatih' => null,
            'status_baca' => 'Belum Dibaca',
            'tanggal_baca' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    });
}




}
