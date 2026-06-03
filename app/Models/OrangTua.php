<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrangTua extends Model
{
    protected $table = 'orang_tua';
    protected $primaryKey = 'id_ortu';

     public $timestamps = false; // 🔥 PENTING


    protected $fillable = [
        'nama_ortu',
        'email',
        'password',
        'no_hp',
        'user_id',
    ];

public function user()
{
    return $this->belongsTo(User::class, 'user_id');
}

public function siswa()
{
    return $this->hasMany(Siswa::class, 'id_ortu', 'id_ortu');
}

    
}
