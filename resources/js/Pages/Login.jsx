import { useState } from "react";
import { Head, router } from "@inertiajs/react";
import "../../css/Login.css";

import LogoSBB from "../../assets/LogoSBB.png";
import LoginBoy from "../../assets/login_boy.png";

export default function Login({ onBack, onLoginSuccess }) {
  const [showPassword, setShowPassword] = useState(false);
  const back = () => (onBack ? onBack() : router.visit("/"));
  const handleSubmit = (event) => {
    event.preventDefault();
    if (onLoginSuccess) {
      onLoginSuccess();
      return;
    }
    router.visit("/admin/dashboard");
  };

  return (
    <div className="loginPage">
      <Head title="Login" />
      <main className="loginShell">
        <div className="loginMain">
          <section className="loginLeft" aria-hidden="true">
            <div className="loginShape" />
            <img className="loginLogo" src={LogoSBB} alt="Logo SSB" />
            <img className="loginBoy" src={LoginBoy} alt="Pemain sepak bola" />
          </section>

          <section className="loginRight">
            <form className="loginForm" onSubmit={handleSubmit}>
              <h1>Login</h1>

              <label htmlFor="login-email">Email</label>
              <input id="login-email" type="email" placeholder="Masukkan Email" />

              <label htmlFor="login-password">Kata Kunci</label>
              <div className="loginPasswordWrap">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan Kata Kunci"
                />
                <button
                  type="button"
                  className="loginPasswordToggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Sembunyikan kata kunci" : "Tampilkan kata kunci"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              <div className="loginActions">
                <button type="button" className="loginBackBtn" onClick={back}>
                  Back
                </button>
                <button type="submit" className="loginSubmitBtn">
                  Login
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}


