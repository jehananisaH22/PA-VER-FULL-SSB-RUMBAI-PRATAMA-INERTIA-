<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Performa_Siswa extends Model
{
    protected $table = 'performa_siswa';
    protected $primaryKey = 'id_performa';

    protected $fillable = [
        'id_performa',
        'id_siswa',
        'tanggal_penilaian',
        'dribbling',
        'passing',
        'shooting',
        'rata_rata',
        'keterangan'
    ];

    public $timestamps = false;

    public function siswa()
    {
        return $this->belongsTo(Siswa::class, 'id_siswa');
    }
}
