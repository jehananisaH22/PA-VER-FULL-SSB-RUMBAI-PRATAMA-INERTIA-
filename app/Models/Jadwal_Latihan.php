<?php // Membuka file PHP.

namespace App\Models; // Menentukan namespace model Laravel.

use Carbon\Carbon; // Mengimpor Carbon untuk mengolah tanggal dan waktu.
use Illuminate\Database\Eloquent\Factories\HasFactory; // Mengimpor trait factory untuk kebutuhan seeding/testing.
use Illuminate\Database\Eloquent\Model; // Mengimpor class dasar Eloquent Model.

class Jadwal_Latihan extends Model // Mendefinisikan model untuk data jadwal latihan.
{
    use HasFactory; // Mengaktifkan fitur factory pada model.

    protected $table = 'jadwal_latihan'; // Menentukan nama tabel yang digunakan model.
    public $timestamps = false; // Menonaktifkan kolom created_at dan updated_at.
    protected $primaryKey = 'id_jadwal'; // Menentukan primary key tabel.
    protected $appends = ['hari', 'jam']; // Menambahkan atribut virtual hari dan jam saat model diubah ke array/JSON.
    protected $keyType = 'int'; // Menentukan tipe primary key sebagai integer.

    protected $fillable = [ // Menentukan kolom yang boleh diisi secara mass assignment.
        'tanggal', // Kolom tanggal latihan.
        'jam_mulai', // Kolom jam mulai latihan.
        'jam_selesai', // Kolom jam selesai latihan.
        'lokasi', // Kolom lokasi latihan.
        'kategori_umur', // Kolom kategori umur peserta latihan.
        'id_pelatih', // Kolom id pelatih yang terhubung dengan jadwal.
    ]; // Menutup daftar kolom fillable.

    public function user() // Membuat relasi jadwal latihan ke user.
    {
        return $this->belongsTo(User::class, 'user_id'); // Menghubungkan jadwal dengan satu user berdasarkan user_id.
    } // Menutup fungsi relasi user.

    public function siswa() // Membuat relasi jadwal latihan ke banyak siswa.
    {
        return $this->belongsToMany( // Menghubungkan jadwal dan siswa melalui tabel pivot.
            \App\Models\Siswa::class, // Model siswa yang berelasi dengan jadwal.
            'jadwal_siswa', // Nama tabel pivot penghubung jadwal dan siswa.
            'id_jadwal', // Foreign key jadwal pada tabel pivot.
            'id_siswa' // Foreign key siswa pada tabel pivot.
        ); // Mengakhiri definisi relasi many-to-many.
    } // Menutup fungsi relasi siswa.

    public function pelatih() // Membuat relasi jadwal latihan ke pelatih.
    {
        return $this->belongsTo(Pelatih::class, 'id_pelatih', 'id_pelatih'); // Menghubungkan jadwal dengan satu pelatih.
    } // Menutup fungsi relasi pelatih.

    public function getHariAttribute() // Membuat accessor atribut hari.
    {
        return Carbon::parse($this->tanggal)->translatedFormat('l'); // Mengubah tanggal menjadi nama hari, contoh: Selasa.
    } // Menutup accessor hari.

    public function getJamAttribute() // Membuat accessor atribut jam.
    {
        return Carbon::parse($this->jam_mulai)->format('H:i') . ' - ' . // Mengubah jam mulai ke format HH:mm.
            Carbon::parse($this->jam_selesai)->format('H:i'); // Mengubah jam selesai ke format HH:mm.
    } // Menutup accessor jam.
} // Menutup class Jadwal_Latihan.
