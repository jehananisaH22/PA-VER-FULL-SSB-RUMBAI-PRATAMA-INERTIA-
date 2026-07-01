<?php

namespace Tests\Unit;

use App\Models\Siswa;
use Carbon\Carbon;
use Tests\TestCase;

class SiswaAgeCategoryTest extends TestCase
{
    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_kategori_umur_uses_stored_age_and_clamps_to_ssb_age_groups(): void
    {
        $this->assertSame('-', $this->studentWithAge(0)->kategori_umur);
        $this->assertSame('U-6', $this->studentWithAge(4)->kategori_umur);
        $this->assertSame('U-12', $this->studentWithAge(12)->kategori_umur);
        $this->assertSame('U-16', $this->studentWithAge(19)->kategori_umur);
    }

    public function test_kategori_umur_prefers_birth_date_over_stored_age(): void
    {
        Carbon::setTestNow('2026-07-02 10:00:00');

        $student = Siswa::create([
            'nama_siswa' => 'Siswa Tanggal Lahir',
            'tanggal_lahir' => '2015-07-02',
            'umur' => 99,
            'status' => 'Active',
        ]);

        $this->assertSame('U-11', $student->kategori_umur);
    }

    private function studentWithAge(int $age): Siswa
    {
        return Siswa::create([
            'nama_siswa' => 'Siswa Umur ' . $age,
            'umur' => $age,
            'status' => 'Active',
        ]);
    }
}
