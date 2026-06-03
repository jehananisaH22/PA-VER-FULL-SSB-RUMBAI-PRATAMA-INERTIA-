<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Verifikasi Email - SSB Rumbai Pratama</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
    <div style="max-width: 600px; margin: auto; background: #ffffff; padding: 30px; border-radius: 10px;">
        <h2 style="color: #1e3a8a; text-align: center;">
            Sekolah Sepak Bola Rumbai Pratama
        </h2>

        <hr>

        <p>Halo <b>{{ $name }}</b>,</p>

        <p>
            Terima kasih telah mendaftar di <b>Sekolah Sepak Bola Rumbai Pratama</b>.
            Untuk mengaktifkan akun Anda, silakan verifikasi email dengan mengklik tombol di bawah ini:
        </p>

        <div style="text-align: center; margin: 30px 0;">
            <a href="{{ $link }}"
               style="background-color: #1e3a8a; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Verifikasi Email
            </a>
        </div>

        <p>Jika Anda tidak merasa mendaftar, abaikan email ini.</p>

        <br>

        <p style="font-size: 12px; color: #666;">
            &copy; {{ date('Y') }} Sekolah Sepak Bola Rumbai Pratama. All rights reserved.
        </p>
    </div>
</body>
</html>
