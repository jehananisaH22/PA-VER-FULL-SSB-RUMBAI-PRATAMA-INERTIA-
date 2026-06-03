<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Notifikasi extends Model
{
    protected $table = 'notifikasi';
     public $timestamps = false; // 🔥 PENTING
     protected $primaryKey = 'id_notifikasi';


    protected $fillable = [
        'judul',
        'isi',
         'target_role',
        'tanggal_kirim',
    ];

  public function users()
{
    return $this->belongsToMany(User::class, 'notifikasi_terkirim', 
        'id_notifikasi', 'user_id')
        ->withPivot('status_baca', 'tanggal_baca')
        ->withTimestamps();
}
public function notifikasi()
    {
        return $this->belongsTo(Notifikasi::class, 'id_notifikasi', 'id_notifikasi');
    }

}
