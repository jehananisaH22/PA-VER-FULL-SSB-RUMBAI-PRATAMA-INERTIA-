import { useState } from "react"; 
import { Head, router, usePage } from "@inertiajs/react"; 
import "./ResetPassword.css"; 

import LogoSBB from "../../../assets/LogoSBB.png"; 
import LoginBoy from "../../../assets/login_boy.png"; 

const kataKunciPattern = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/; 

export default function ResetPassword({ 
  initialEmail = "", 
  token = "", 
  mode = "reset", 
  onBack, 
  onOpenLogin, 
  onResetPassword
}) {
  const { errors = {}, flash = {} } = usePage().props; 
  const isForgotMode = mode === "forgot" || !token; 
  const [email, setEmail] = useState(initialEmail || ""); 
  const [password, setPassword] = useState(""); 
  const [confirmPassword, setConfirmPassword] = useState(""); 
  const [showPassword, setShowPassword] = useState(false); 
  const [status, setStatus] = useState(null); 
  const back = () => onBack ? onBack() : router.visit("/login"); 
  const openLogin = () => onOpenLogin ? onOpenLogin() : router.visit("/login"); 

  const handleSubmit = (event) => {
    event.preventDefault(); 
    const normalizedEmail = email.trim().toLowerCase(); 

    if (isForgotMode) {
      if (!normalizedEmail) {
        setStatus({ type: "error", text: "Email wajib diisi." }); 
        return;
      } 

      router.post("/api/forgot-password", { 
        email: normalizedEmail
      }, { 
        preserveScroll: true, 
        onSuccess: () => {
          setStatus({ type: "success", text: "Link reset password sudah dikirim ke email." });
        }, 
        onError: (nextErrors) => {
          setStatus({ 
            type: "error", 
            text: nextErrors.email || "Email tidak ditemukan atau link gagal dikirim."
          });
        }
      }); 
      return;
    } 

    const nextPassword = password.trim(); 
    const repeatedPassword = confirmPassword.trim(); 

    if (!normalizedEmail || !nextPassword || !repeatedPassword) {
      setStatus({ type: "error", text: "Semua field wajib diisi." }); 
      return;
    } 

    if (!kataKunciPattern.test(nextPassword)) {
      setStatus({ 
        type: "error", 
        text: "Kata kunci minimal 8 karakter dan wajib mengandung huruf, angka, dan simbol."
      }); 
      return;
    } 

    if (nextPassword !== repeatedPassword) {
      setStatus({ type: "error", text: "Konfirmasi kata kunci belum sama." }); 
      return;
    } 

    if (!token && !onResetPassword) {
      setStatus({ type: "error", text: "Token reset tidak ditemukan. Gunakan link reset dari email." }); 
      return;
    } 

    const result = onResetPassword?.({ 
      email: normalizedEmail, 
      password: nextPassword, 
      token
    }); 

    if (onResetPassword && !result?.ok) {
      setStatus({ type: "error", text: result?.message || "Reset kata kunci gagal." }); 
      return;
    } 

    if (!onResetPassword) {
      router.post("/api/reset-password", { 
        email: normalizedEmail, 
        token, 
        password: nextPassword, 
        password_confirmation: repeatedPassword
      }, { 
        preserveScroll: true, 
        onSuccess: () => {
          setPassword(""); 
          setConfirmPassword(""); 
          setStatus({ type: "success", text: "Kata kunci berhasil diperbarui." });
        }, 
        onError: (nextErrors) => {
          setStatus({ 
            type: "error", 
            text: nextErrors.email || nextErrors.token || nextErrors.password || "Reset kata kunci gagal."
          });
        }
      }); 
      return;
    } 

    setPassword(""); 
    setConfirmPassword(""); 
    setStatus({ type: "success", text: result.message || "Kata kunci berhasil diperbarui." });
  }; 

  return (
    <div className="resetPasswordPage">
       <Head title="Reset Password" />
       <main className="resetPasswordShell">
         <section className="resetPasswordVisual" aria-hidden="true">
           <div className="resetPasswordShape" />
           <img className="resetPasswordLogo" src={LogoSBB} alt="Logo SSB" />
           <img className="resetPasswordBoy" src={LoginBoy} alt="Pemain sepak bola" />
        </section>

         <section className="resetPasswordPanel">
           <form className="resetPasswordForm" onSubmit={handleSubmit}>
             <h1>{isForgotMode ? "Lupa Password" : "Reset Password"}</h1>

             <label htmlFor="reset-email">Email</label>
             <input
              id="reset-email"
              type="email"
              placeholder="Masukkan Email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value); 
                setStatus(null);
              }} />
            

            {!isForgotMode && (
            <>
                 <label htmlFor="reset-password">Kata Kunci Baru</label>
                 <div className="resetPasswordInputWrap">
                   <input
                  id="reset-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Buat Kata Kunci Baru"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value); 
                    setStatus(null);
                  }} />
                
                   <button
                  type="button"
                  className="resetPasswordToggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Sembunyikan kata kunci" : "Tampilkan kata kunci"}>
                  
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                 <label htmlFor="reset-confirm-password">Konfirmasi Kata Kunci</label>
                 <input
                id="reset-confirm-password"
                type={showPassword ? "text" : "password"}
                placeholder="Ulangi Kata Kunci Baru"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value); 
                  setStatus(null);
                }} />
              
              </>)
            }

            {(status || flash.success) && (
            <p className={`resetPasswordStatus resetPasswordStatus-${status?.type || "success"}`}>
                {status?.text || flash.success}
              </p>)
            }
            {!status && !flash.success && Object.keys(errors).length > 0 && (
            <p className="resetPasswordStatus resetPasswordStatus-error">
                {errors.email || errors.token || errors.password || "Reset kata kunci gagal."}
              </p>)
            }

             <div className="resetPasswordActions">
               <button type="button" className="resetPasswordGhostBtn" onClick={back}>
                Back
              </button>
               <button type="submit" className="resetPasswordSubmitBtn">
                {isForgotMode ? "Kirim Link Reset" : "Simpan Password"}
              </button>
            </div>

             <button type="button" className="resetPasswordLoginBtn" onClick={openLogin}>
              Kembali ke Login
            </button>
          </form>
        </section>
      </main>
    </div>);

}
