<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\OrangTua;
use App\Models\Pelatih;
use App\Models\Siswa;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class RoleAccessTest extends TestCase
{
    public function test_admin_can_open_admin_dashboard(): void
    {
        $user = User::factory()->create(['role' => 'admin']);

        $this->actingAs($user)
            ->get('/admin/dashboard')
            ->assertOk();
    }

    public function test_parent_can_open_parent_dashboard(): void
    {
        $user = User::factory()->create(['role' => 'orang_tua']);

        $this->actingAs($user)
            ->get('/orang-tua/dashboard')
            ->assertOk();
    }

    public function test_parent_login_without_child_redirects_to_registration_form(): void
    {
        $user = User::factory()->create([
            'role' => 'orang_tua',
            'email' => 'parent-no-child@example.com',
            'password' => Hash::make('Password1!'),
            'email_verified_at' => now(),
        ]);

        OrangTua::create([
            'user_id' => $user->id,
            'nama_ortu' => $user->name,
            'email' => $user->email,
            'password' => $user->password,
            'no_hp' => '081234567801',
        ]);

        $this->post('/api/login', [
            'email' => $user->email,
            'password' => 'Password1!',
            'role' => 'orang_tua',
        ], ['X-Inertia' => 'true'])
            ->assertRedirect('/register/form');
    }

    public function test_existing_verified_parent_without_child_can_resume_from_register_page(): void
    {
        $user = User::factory()->create([
            'role' => 'orang_tua',
            'name' => 'Jehan',
            'email' => 'resume-parent@example.com',
            'password' => Hash::make('Password1!'),
            'email_verified_at' => now(),
        ]);

        OrangTua::create([
            'user_id' => $user->id,
            'nama_ortu' => 'Jehan',
            'email' => $user->email,
            'password' => $user->password,
            'no_hp' => '081234567804',
        ]);

        $this->post('/api/register', [
            'nama' => 'Jehan',
            'email' => $user->email,
            'no_hp' => '081234567804',
            'password' => 'Password1!',
        ], ['X-Inertia' => 'true'])
            ->assertRedirect('/register/form');

        $this->assertAuthenticatedAs($user);
    }

    public function test_existing_verified_parent_with_child_can_resume_to_child_picker(): void
    {
        $user = User::factory()->create([
            'role' => 'orang_tua',
            'name' => 'Parent Anak',
            'email' => 'resume-parent-child@example.com',
            'password' => Hash::make('Password1!'),
            'email_verified_at' => now(),
        ]);
        $parent = OrangTua::create([
            'user_id' => $user->id,
            'nama_ortu' => 'Parent Anak',
            'email' => $user->email,
            'password' => $user->password,
            'no_hp' => '081234567805',
        ]);
        Siswa::create([
            'user_id' => $user->id,
            'id_ortu' => $parent->id_ortu,
            'nama_siswa' => 'Anak Resume',
            'nama_ayah' => 'Ayah',
            'nama_ibu' => 'Ibu',
            'umur' => 10,
            'status' => 'Active',
        ]);

        $this->post('/api/register', [
            'nama' => 'Parent Anak',
            'email' => $user->email,
            'no_hp' => '081234567805',
            'password' => 'Password1!',
        ], ['X-Inertia' => 'true'])
            ->assertRedirect('/orang-tua/dashboard');

        $this->assertTrue((bool) session('show_child_picker_after_login'));
    }

    public function test_parent_login_with_child_redirects_to_dashboard_picker(): void
    {
        $user = User::factory()->create([
            'role' => 'orang_tua',
            'email' => 'parent-with-child@example.com',
            'password' => Hash::make('Password1!'),
            'email_verified_at' => now(),
        ]);
        $parent = OrangTua::create([
            'user_id' => $user->id,
            'nama_ortu' => $user->name,
            'email' => $user->email,
            'password' => $user->password,
            'no_hp' => '081234567802',
        ]);
        Siswa::create([
            'user_id' => $user->id,
            'id_ortu' => $parent->id_ortu,
            'nama_siswa' => 'Anak Login',
            'nama_ayah' => 'Ayah',
            'nama_ibu' => 'Ibu',
            'umur' => 10,
            'status' => 'Active',
        ]);

        $this->post('/api/login', [
            'email' => $user->email,
            'password' => 'Password1!',
            'role' => 'orang_tua',
        ], ['X-Inertia' => 'true'])
            ->assertRedirect('/orang-tua/dashboard');
    }

    public function test_coach_can_open_coach_dashboard(): void
    {
        $user = User::factory()->create(['role' => 'pelatih']);

        $this->actingAs($user)
            ->get('/pelatih/dashboard')
            ->assertOk();
    }

    public function test_coach_dashboard_repairs_missing_coach_profile(): void
    {
        $user = User::factory()->create([
            'role' => 'pelatih',
            'name' => 'Pelatih Tanpa Profil',
            'email' => 'coach-no-profile@example.com',
        ]);

        $this->assertDatabaseMissing('pelatih', [
            'user_id' => $user->id,
        ]);

        $this->actingAs($user)
            ->get('/pelatih/dashboard')
            ->assertOk();

        $this->assertDatabaseHas('pelatih', [
            'user_id' => $user->id,
            'nama_pelatih' => 'Pelatih Tanpa Profil',
            'email' => 'coach-no-profile@example.com',
        ]);
    }

    public function test_wrong_role_is_rejected_for_json_api(): void
    {
        $user = User::factory()->create(['role' => 'pelatih']);

        $this->actingAs($user)
            ->getJson('/api/admin/dashboard')
            ->assertForbidden()
            ->assertJson([
                'status' => false,
                'message' => 'Akses ditolak',
            ]);
    }
}
