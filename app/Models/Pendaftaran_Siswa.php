<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Pendaftaran_Siswa extends Model
{
  protected $table = 'pendaftaran';

    protected $primaryKey = 'id_pendaftaran'; // 🔥 PENTING

    public $incrementing = true; // kalau auto increment
    protected $keyType = 'int';
         public $timestamps = false; // 🔥 PENTING


    protected $fillable = [
        'id_siswa',
        'val_nama_siswa',
        'val_nama_ibu',
        'val_nama_ayah',
        'val_umur',
        'val_akta',
        'val_kk',
        'val_rapor',
        'val_foto',
        'pending_nama_siswa',
        'pending_nama_ayah',
        'pending_nama_ibu',
        'pending_umur',
        'pending_akta_kelahiran',
        'pending_kartu_keluarga',
        'pending_rapor',
        'pending_pas_photo_3x4',
    'status_approval',
    'tanggal_daftar',
        
    ];

    public function siswa()
    {
        return $this->belongsTo(Siswa::class, 'id_siswa', 'id_siswa');
    }

}