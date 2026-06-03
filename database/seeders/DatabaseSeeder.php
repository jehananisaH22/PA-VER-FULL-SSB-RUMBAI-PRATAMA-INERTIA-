<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $users = [
            [
                'name' => 'Admin SSB',
                'email' => 'admin01@gmail.com',
                'role' => 'admin',
                'password' => 'asu01',
            ],
            [
                'name' => 'Zulfahmi',
                'email' => 'pelatih01@gmail.com',
                'role' => 'pelatih',
                'password' => 'Password1!',
            ],
            [
                'name' => 'Udin Anjay',
                'email' => 'udinanjay@gmail.com',
                'role' => 'orangtua',
                'password' => 'asu01',
            ],
        ];

        foreach ($users as $user) {
            User::updateOrCreate(
                ['email' => $user['email']],
                $user
            );
        }
    }
}
