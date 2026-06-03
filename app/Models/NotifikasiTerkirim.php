<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NotifikasiTerkirim extends Model
{
    protected $table = 'notifikasi_terkirim';
    protected $primaryKey = 'id_notifikasi_terkirim';
    public $timestamps = false;

    protected $fillable = [
        'id_notifikasi',
        'user_id',
        'id_siswa',
        'status_baca',
        'tanggal_baca'
    ];

public function notifikasi()
{
    return $this->belongsTo(Notifikasi::class, 'id_notifikasi', 'id_notifikasi');
}

public function siswa()
{
    return $this->belongsTo(Siswa::class, 'id_siswa', 'id_siswa');
}

public function admin()
{
    return $this->belongsTo(User::class, 'id_admin', 'id');
}

public function pelatih()
{
    return $this->belongsTo(Pelatih::class, 'id_pelatih', 'id_pelatih');
}

}