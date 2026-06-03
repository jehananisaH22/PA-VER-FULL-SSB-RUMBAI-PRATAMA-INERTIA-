<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon; 

class Jadwal_Latihan extends Model
{
    use HasFactory;

    protected $table = 'jadwal_latihan';
    public $timestamps = false; // 🔥 PENTING
    protected $primaryKey = 'id_jadwal';
    protected $appends = ['hari', 'jam'];
    protected $keyType = 'int';

     
    protected $fillable = [
        'tanggal',
        'jam_mulai',
        'jam_selesai',
        'lokasi',
        'kategori_umur',
        'id_pelatih',
    ];


public function user()
{
    return $this->belongsTo(User::class, 'user_id');
    }

public function siswa()
{
    return $this->belongsToMany(
        \App\Models\Siswa::class,
        'jadwal_siswa',
        'id_jadwal',
        'id_siswa' // sesuai nama kolom kamu
    );
}

public function pelatih()
{
    return $this->belongsTo(Pelatih::class, 'id_pelatih', 'id_pelatih');
}


    public function getHariAttribute()
{
    return Carbon::parse($this->tanggal)->translatedFormat('l'); // contoh: Selasa
}

    public function getJamAttribute()
    {
    return Carbon::parse($this->jam_mulai)->format('H:i') . ' - ' .
           Carbon::parse($this->jam_selesai)->format('H:i');
}



}
