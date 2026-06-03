<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Akun Anda</title>
</head>
<body>
    <h2>Halo, {{ $nama }}</h2>

    <p>Akun Anda berhasil dibuat. Berikut detail login:</p>

    <table>
        <tr>
            <td><strong>Email</strong></td>
            <td>: {{ $email }}</td>
        </tr>
        <tr>
            <td><strong>Password</strong></td>
            <td>: {{ $password }}</td>
        </tr>
    </table>

    <br>

    <p>Silakan login menggunakan akun di atas.</p>

    <p><strong>Demi keamanan, segera ubah password Anda setelah login.</strong></p>

    <br>

    <p>Terima kasih.</p>
</body>
</html>
