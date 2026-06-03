<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BuktiPembayaran extends Model
{
    use HasFactory;

    protected $table = 'bukti_pembayaran';
    protected $primaryKey = 'id_bukti_pembayaran';
    public $incrementing = true;
    public $timestamps = false; // 🔥 PENTING


    protected $fillable = [
      'id_bukti_pembayaran',
      'id_pembayaran',
      'id_siswa',
      'periode',
      'tanggal_bukti_bayar',
      'status',
      'bukti_bayar'
    ];


    public function siswa()
{
    return $this->belongsTo(Siswa::class, 'id_siswa');

}

public function pembayaran()
{
    return $this->belongsTo(Pembayaran::class, 'id_pembayaran');
}

}
