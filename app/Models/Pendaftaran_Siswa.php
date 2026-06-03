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
    'status_approval',
    'tanggal_daftar',
        
    ];

    public function siswa()
    {
        return $this->belongsTo(Siswa::class, 'id_siswa', 'id_siswa');
    }

}
