<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\OrangTua;
use App\Models\Pelatih;
use App\Models\Siswa;
use Inertia\Testing\AssertableInertia as Assert;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class RoleAccessTest extends TestCase
{
    public function test_admin_logout_clears_session_and_redirects_to_admin_login(): void
    {
        $user = User::factory()->create(['role' => 'admin']);

        $this->actingAs($user)
            ->post('/logout')
            ->assertRedirect('/login/admin');

        $this->assertGuest();
    }

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

    public function test_parent_child_registration_page_returns_to_parent_dashboard(): void
    {
        $user = User::factory()->create(['role' => 'orang_tua']);

        $this->actingAs($user)
            ->get('/orang-tua/daftar-anak')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('HalamanFormPendaftaran')
                ->where('returnToDashboard', true)
                ->where('dashboardUrl', '/orang-tua/dashboard')
            );
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

    public function test_parent_registration_with_reused_contact_without_child_requires_existing_password(): void
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

        $existingUserCount = User::where('email', $user->email)
            ->where('role', 'orang_tua')
            ->count();
        $existingParentCount = OrangTua::where('no_hp', '081234567804')->count();

        $this->post('/api/register', [
            'nama' => 'Jehan',
            'email' => $user->email,
            'no_hp' => '081234567804',
            'password' => 'PasswordBaru2!',
        ], ['X-Inertia' => 'true'])
            ->assertSessionHasErrors(['email', 'no_hp']);

        $this->assertGuest();
        $this->assertSame($existingUserCount, User::where('email', $user->email)->where('role', 'orang_tua')->count());
        $this->assertSame($existingParentCount, OrangTua::where('no_hp', '081234567804')->count());
    }

    public function test_parent_registration_with_reused_contact_and_existing_child_requires_existing_password(): void
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

        $existingUserCount = User::where('email', $user->email)
            ->where('role', 'orang_tua')
            ->count();
        $existingParentCount = OrangTua::where('no_hp', '081234567805')->count();

        $this->post('/api/register', [
            'nama' => 'Parent Anak',
            'email' => $user->email,
            'no_hp' => '081234567805',
            'password' => 'PasswordBaru2!',
        ], ['X-Inertia' => 'true'])
            ->assertSessionHasErrors(['email', 'no_hp']);

        $this->assertGuest();
        $this->assertFalse((bool) session('show_child_picker_after_login'));
        $this->assertSame($existingUserCount, User::where('email', $user->email)->where('role', 'orang_tua')->count());
        $this->assertSame($existingParentCount, OrangTua::where('no_hp', '081234567805')->count());
    }

    public function test_parent_registration_with_existing_email_and_password_resumes_existing_account(): void
    {
        $user = User::factory()->create([
            'role' => 'orang_tua',
            'name' => 'Username Lama',
            'email' => 'existing-parent-username@example.com',
            'password' => Hash::make('Password1!'),
            'email_verified_at' => now(),
        ]);

        OrangTua::create([
            'user_id' => $user->id,
            'nama_ortu' => 'Username Lama',
            'email' => $user->email,
            'password' => $user->password,
            'no_hp' => '081234567808',
        ]);

        $existingUserCount = User::where('email', $user->email)
            ->where('role', 'orang_tua')
            ->count();

        $this->post('/api/register', [
            'nama' => 'Username Baru',
            'email' => $user->email,
            'no_hp' => '081234567808',
            'password' => 'Password1!',
        ], ['X-Inertia' => 'true'])
            ->assertRedirect('/register/form');

        $this->assertAuthenticatedAs($user);
        $this->assertSame($existingUserCount, User::where('email', $user->email)->where('role', 'orang_tua')->count());
        $this->assertSame('Username Lama', $user->fresh()->name);
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

    public function test_parent_password_reset_updates_first_matching_parent_account(): void
    {
        $email = 'shared-parent-login@example.com';
        $oldUser = User::factory()->create([
            'role' => 'orang_tua',
            'name' => 'Jehan Anisa',
            'email' => $email,
            'password' => Hash::make('PasswordLama1!'),
            'email_verified_at' => now(),
        ]);
        $oldParent = OrangTua::create([
            'user_id' => $oldUser->id,
            'nama_ortu' => 'Jehan Anisa',
            'email' => $email,
            'password' => $oldUser->password,
            'no_hp' => '081234567806',
        ]);
        Siswa::create([
            'user_id' => $oldUser->id,
            'id_ortu' => $oldParent->id_ortu,
            'nama_siswa' => 'Jehan Anisa',
            'nama_ayah' => 'Ayah',
            'nama_ibu' => 'Ibu',
            'umur' => 10,
            'status' => 'Inactive',
        ]);

        $newUser = User::factory()->create([
            'role' => 'orang_tua',
            'name' => 'Orangtua Galang',
            'email' => $email,
            'password' => Hash::make('PasswordBaru1!'),
            'email_verified_at' => now(),
        ]);
        $newParent = OrangTua::create([
            'user_id' => $newUser->id,
            'nama_ortu' => 'Orangtua Galang',
            'email' => $email,
            'password' => $newUser->password,
            'no_hp' => '081234567807',
        ]);
        $galang = Siswa::create([
            'user_id' => $newUser->id,
            'id_ortu' => $newParent->id_ortu,
            'nama_siswa' => 'Galang Rambu Anarki',
            'nama_ayah' => 'Ayah',
            'nama_ibu' => 'Ibu',
            'umur' => 12,
            'status' => 'Inactive',
        ]);

        DB::table('password_reset_tokens')->insert([
            'email' => $email,
            'token' => Hash::make('valid-reset-token'),
            'created_at' => now(),
        ]);

        $this->postJson('/api/reset-password', [
            'email' => $email,
            'token' => 'valid-reset-token',
            'password' => 'Asu0101!',
            'password_confirmation' => 'Asu0101!',
        ])->assertOk();

        $this->assertTrue(Hash::check('Asu0101!', $oldUser->fresh()->password));
        $this->assertFalse(Hash::check('Asu0101!', $newUser->fresh()->password));

        $this->post('/api/login', [
            'email' => $email,
            'password' => 'Asu0101!',
            'role' => 'orang_tua',
        ], ['X-Inertia' => 'true'])
            ->assertRedirect('/orang-tua/dashboard')
            ->assertSessionMissing('id_siswa');
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
