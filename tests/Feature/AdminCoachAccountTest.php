<?php

namespace Tests\Feature;

use App\Mail\SendPasswordMail;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class AdminCoachAccountTest extends TestCase
{
    public function test_admin_can_add_coach_with_email_already_used_by_parent_role(): void
    {
        Mail::fake();

        $email = 'jean.humairah@gmail.com';
        $admin = User::factory()->create(['role' => 'admin']);

        User::factory()->create([
            'email' => $email,
            'role' => 'orang_tua',
        ]);

        $this->actingAs($admin)
            ->postJson('/api/admin/tambah-pelatih', [
                'nama' => 'TestPelatih',
                'email' => $email,
                'no_hp' => '082285939464',
                'password' => 'password123',
                'password_confirmation' => 'password123',
            ])
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('users', [
            'email' => $email,
            'role' => 'orang_tua',
        ]);

        $this->assertDatabaseHas('users', [
            'email' => $email,
            'role' => 'pelatih',
        ]);

        $this->assertDatabaseHas('pelatih', [
            'email' => $email,
            'nama_pelatih' => 'TestPelatih',
        ]);

        Mail::assertSent(SendPasswordMail::class);
    }

    public function test_login_uses_email_and_role_when_same_email_exists_in_multiple_roles(): void
    {
        $email = 'shared.login@gmail.com';

        User::factory()->create([
            'email' => $email,
            'role' => 'orang_tua',
            'password' => Hash::make('parent123'),
        ]);

        $coach = User::factory()->create([
            'email' => $email,
            'role' => 'pelatih',
            'password' => Hash::make('coach123'),
        ]);

        $this->postJson('/api/login', [
            'email' => $email,
            'password' => 'coach123',
            'role' => 'pelatih',
        ])
            ->assertOk()
            ->assertJsonPath('role', 'pelatih');

        $this->assertAuthenticatedAs($coach);
    }
}
