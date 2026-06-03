<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MasterBadge extends Model
{
    protected $table = 'master_badge';
    protected $primaryKey = 'id_badge';
    public $timestamps = false;

    protected $fillable = [
        'nama_badge',
        'deskripsi',
        'icon_badge',
    ];

    public function pencapaian()
    {
        return $this->hasMany(Pencapaian::class, 'id_badge', 'id_badge');
    }
}
