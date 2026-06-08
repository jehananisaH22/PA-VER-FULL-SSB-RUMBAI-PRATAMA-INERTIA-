<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

class Catatan_Pelatih extends Model
{
    protected $table = 'catatan_pelatih';
    protected $primaryKey = 'id_catatan';

    protected $fillable = [
        'id_catatan',
        'id_siswa',
        'id_pelatih',
        'catatan',
        'tanggal_catatan'
    ];

    public $timestamps = false;


    public function siswa()
    {
        return $this->belongsTo(Siswa::class, 'id_siswa');
    }


    public function pelatih()
    {
        return $this->belongsTo(Pelatih::class, 'id_pelatih');
    }

    public function toInertiaNote(): array
    {
        $tanggal = $this->tanggal_catatan ? Carbon::parse($this->tanggal_catatan) : null;

        return [
            'id' => $this->id_catatan,
            'coachName' => $this->pelatih?->nama_pelatih ?? 'Pelatih',
            'coach' => $this->pelatih?->nama_pelatih ?? 'Pelatih',
            'studentName' => $this->siswa?->nama_siswa ?? '-',
            'player' => $this->siswa?->nama_siswa ?? '-',
            'category' => $this->siswa?->kategori_umur
                ? strtolower(str_replace('-', '', $this->siswa->kategori_umur))
                : '-',
            'date' => $tanggal?->format('d/m/Y') ?? '-',
            'note' => $this->catatan,
            'title' => $this->catatan,
            'createdAt' => $tanggal?->timestamp * 1000,
        ];
    }
}
