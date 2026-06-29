<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Pelatih extends Model
{
    use HasFactory;

    protected $table = 'pelatih';

    protected $primaryKey = 'id_pelatih';

    protected $fillable = [
        'user_id',
        'nama_pelatih',
        'email',
        'no_hp',
        'account_status',
        'invitation_sent_at',
        'accepted_at',
    ];

    public $timestamps = False;

    public static function resolveForUser(?User $user): ?self
    {
        if (! $user || $user->role !== 'pelatih') {
            return null;
        }

        $pelatih = self::where('user_id', $user->id)
            ->orWhereRaw('LOWER(email) = ?', [strtolower((string) $user->email)])
            ->orWhereRaw('LOWER(nama_pelatih) = ?', [strtolower((string) $user->name)])
            ->orderByRaw('CASE WHEN user_id = ? THEN 0 WHEN LOWER(email) = ? THEN 1 ELSE 2 END', [
                $user->id,
                strtolower((string) $user->email),
            ])
            ->first();

        if (! $pelatih) {
            return self::create([
                'user_id' => $user->id,
                'nama_pelatih' => $user->name ?: 'Pelatih',
                'email' => $user->email,
                'no_hp' => '-',
                'account_status' => 'accepted',
                'accepted_at' => now(),
            ]);
        }

        $updates = [];

        if (! $pelatih->user_id) {
            $updates['user_id'] = $user->id;
        }

        if (! $pelatih->email) {
            $updates['email'] = $user->email;
        }

        if (! $pelatih->nama_pelatih) {
            $updates['nama_pelatih'] = $user->name ?: 'Pelatih';
        }

        if ($updates) {
            $pelatih->update($updates);
            $pelatih->refresh();
        }

        return $pelatih;
    }

    // Relasi ke tabel users
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function jadwal()
{
    return $this->hasMany(Jadwal_Latihan::class, 'id_pelatih');
}

public function catatan()
{
    return $this->hasMany(Catatan_Pelatih::class, 'id_pelatih');
}

public function toInertiaDirectory(): array
{
    return [
        'id' => $this->id_pelatih,
        'name' => $this->nama_pelatih,
        'email' => $this->email ?: '-',
        'phone' => $this->no_hp ?: '-',
        'accountStatus' => $this->account_status ?: 'pending',
        'invitationSentAt' => $this->invitation_sent_at,
        'acceptedAt' => $this->accepted_at,
    ];
}


}
