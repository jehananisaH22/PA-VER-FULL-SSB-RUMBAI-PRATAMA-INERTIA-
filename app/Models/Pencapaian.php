<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Pencapaian extends Model
{
    protected $table = 'pencapaian';
    protected $primaryKey = 'id_pencapaian';
    public $timestamps = false;

    protected $fillable = [
        'id_siswa',
        'id_badge',
        'nama_prestasi',
        'tanggal_diberikan',

    ];

    public function siswa()
    {
        return $this->belongsTo(Siswa::class, 'id_siswa', 'id_siswa');
    }

    public function badge()
    {
        return $this->belongsTo(MasterBadge::class, 'id_badge', 'id_badge');
    }
}
