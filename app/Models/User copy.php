<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Models\OrangTua;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
protected $fillable = [
    'name',
    'email',
    'password',
    'role',
    'created_at'
];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
    ];

   
public function notifikasi()
{
    return $this->belongsToMany(Notifikasi::class, 'notifikasi_terkirim', 
        'user_id', 'id_notifikasi')
        ->withPivot('id_notifikasi_terkirim', 'status_baca', 'tanggal_baca')
        ->withTimestamps();
}

public function siswa()
{
    return $this->hasOne(Siswa::class, 'user_id');
}

public function orangTua()
{
    return $this->hasOne(OrangTua::class, 'user_id');
}



}
