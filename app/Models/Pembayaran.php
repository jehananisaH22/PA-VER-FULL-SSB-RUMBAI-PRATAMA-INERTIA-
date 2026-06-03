<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Pembayaran extends Model
{
    use HasFactory;

    protected $table = 'pembayaran';
    protected $primaryKey = 'id_pembayaran';
    public $timestamps = false;
    


    protected $fillable = [
    'id_pembayaran',
    'id_siswa',
    'periode',
    'jumlah',
    'tanggal_bayar',
    'status',
    'jenis'
];
    
    public function siswa()
{
    return $this->belongsTo(Siswa::class, 'id_siswa', 'id_siswa');
}


}
