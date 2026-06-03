<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Promosi extends Model
{
    protected $table = 'promosi';
    protected $primaryKey = 'id_promosi';
    public $timestamps = false;

    protected $fillable = [
        'group_id',
        'id_siswa',
        'judul',
        'isi_promosi',
        'tanggal_promosi',
        'dibuat_oleh',
        'foto_promosi',
        'kategori',
    ];

    protected $appends = ['kategori_umur'];

    public function siswa()
    {
        return $this->belongsTo(Siswa::class, 'id_siswa', 'id_siswa');
    }

    public function dibuatOleh()
    {
        return $this->belongsTo(Admin::class, 'dibuat_oleh', 'id_admin');
    }

    public function getKategoriUmurAttribute()
    {
        if (!$this->relationLoaded('siswa') || !$this->siswa) {
            return null;
        }

        return 'U-' . $this->siswa->umur;
    }
}
