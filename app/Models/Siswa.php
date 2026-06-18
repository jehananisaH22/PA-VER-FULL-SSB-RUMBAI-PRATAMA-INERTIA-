<?php

// app/Models/Siswa.php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;

class Siswa extends Model
{
    protected $table = 'siswa';
    protected $primaryKey = 'id_siswa'; // 🔥 WAJIB


    protected $fillable = [
        'nama_siswa',
        'nik',
        'no_kk',
        'nisn',
        'tempat_lahir',
        'tanggal_lahir',
        'nama_ayah',
        'nama_ibu',
        'umur',
        'id_ortu',
        'user_id',
        'akta_kelahiran',
        'kartu_keluarga',
        'rapor',
        'pas_photo_3x4',
        'status'
    ];

    public $timestamps = false;

    public function pendaftaran()
{
    return $this->hasOne(Pendaftaran_Siswa::class, 'id_siswa');
}

public function orangtua()
{
    return $this->belongsTo(OrangTua::class, 'id_ortu');
}

public function user()
{
    return $this->belongsTo(User::class, 'user_id');
}

 public function notifikasiTerkirim()
    {
        return $this->belongsToMany(notifikasiTerkirim::class, 'notifikasi_terkirim', 'id_siswa', 'id_notifikasi')
                    ->withPivot('status_baca')
                    ->withTimestamps();
    }

public function notifikasi()
{
    return $this->belongsToMany(
        \App\Models\Notifikasi::class,
        'notifikasi_terkirim',
        'id_siswa',
        'id_notifikasi'
    )->withPivot('status_baca')
     ->withTimestamps();
}

   public function pembayaran()
    {
        return $this->hasMany(Pembayaran::class, 'id_siswa', 'id_siswa');
    }

    public function bukti_pembayaran()
{
    return $this->hasMany(BuktiPembayaran::class, 'id_siswa', 'id_siswa');
}

public function presensi()
{
    return $this->hasMany(Presensi::class, 'id_siswa');
}


public function catatan()
{
    return $this->hasMany(Catatan_Pelatih::class, 'id_siswa');
}

public function jadwal()
{
    return $this->belongsToMany(
        \App\Models\Jadwal_Latihan::class,
        'jadwal_siswa',
        'id_siswa',
        'id_jadwal'
    );
}

public function promosi()
{
    return $this->hasMany(Promosi::class, 'id_siswa', 'id_siswa');
}

public function pencapaian()
{
    return $this->hasMany(Pencapaian::class, 'id_siswa', 'id_siswa');
}

public function getKategoriUmurAttribute(): string
{
    $umur = $this->tanggal_lahir
        ? Carbon::parse($this->tanggal_lahir)->age
        : (int) $this->umur;

    if ($umur <= 0) {
        return '-';
    }

    return 'U-' . max(6, min(16, $umur));
}

public function toInertiaDirectory(): array
{
    return [
        'id' => $this->id_siswa,
        'name' => $this->nama_siswa,
        'email' => $this->orangtua?->email ?? $this->user?->email ?? '-',
        'category' => $this->kategori_umur,
    ];
}



}
