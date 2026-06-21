import { useState } from "react"; 
import { router, usePage } from "@inertiajs/react"; 
import "../../css/Daftar.css"; 

import LogoSBB from "../../assets/LogoSBB.png"; 
import DaftarBoy from "../../assets/regist_boy.png"; 

const kataKunciPattern = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/; 
const nomorHandphonePattern = /^\d{10,13}$/; 

export default function Daftar({ onBack, onOpenRegistration }) {
  const { errors = {} } = usePage().props; 
  const [showPassword, setShowPassword] = useState(false); 
  const [passwordError, setPasswordError] = useState(""); 
  const [phoneError, setPhoneError] = useState(""); 
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const [formValues, setFormValues] = useState({ 
    name: "", 
    email: "", 
    phone: "", 
    password: ""
  }); 

  const handleChange = (event) => {
    const { id, value } = event.target; 
    const nextValue = id === "phone" ? value.replace(/\D/g, "").slice(0, 13) : value; 
    setFormValues((prev) => ({ ...prev, [id]: nextValue })); 

    if (id === "password") {
      const trimmedPassword = nextValue.trim(); 
      if (!trimmedPassword) {
        setPasswordError("");
      } else if (!kataKunciPattern.test(trimmedPassword)) {
          setPasswordError("Kata kunci minimal 8 karakter dan wajib mengandung huruf, angka, dan simbol.");
        } else {
          setPasswordError("");
        }
    } 

    if (id === "phone") {
      const trimmedPhone = nextValue.trim(); 
      if (!trimmedPhone) {
        setPhoneError("");
      } else if (!nomorHandphonePattern.test(trimmedPhone)) {
          setPhoneError("No handphone hanya boleh angka dan harus 10 sampai 13 digit.");
        } else {
          setPhoneError("");
        }
    }
  }; 

  const isNameValid = formValues.name.trim().length > 0; 
  const isEmailValid = formValues.email.trim().length > 0; 
  const isPhoneValid = nomorHandphonePattern.test(formValues.phone.trim()); 
  const isPasswordValid = kataKunciPattern.test(formValues.password.trim()); 
  const isFormValid = isNameValid && isEmailValid && isPhoneValid && isPasswordValid; 

  const handleSubmit = (event) => {
    event.preventDefault(); 
    const trimmedPassword = formValues.password.trim(); 
    const trimmedPhone = formValues.phone.trim(); 

    if (!nomorHandphonePattern.test(trimmedPhone)) {
      setPhoneError("No handphone hanya boleh angka dan harus 10 sampai 13 digit."); 
      return;
    } 

    if (!kataKunciPattern.test(trimmedPassword)) {
      setPasswordError("Kata kunci minimal 8 karakter dan wajib mengandung huruf, angka, dan simbol."); 
      return;
    } 

    if (onOpenRegistration) {
      onOpenRegistration(formValues); 
      return;
    } 

    router.post("/api/register", { 
      nama: formValues.name.trim(), 
      email: formValues.email.trim().toLowerCase(), 
      no_hp: trimmedPhone, 
      password: trimmedPassword
    }, { 
      preserveScroll: true, 
      onStart: () => setIsSubmitting(true), 
      onFinish: () => setIsSubmitting(false)
    });
  }; 

  const handleBack = () => {
    if (onBack) {
      onBack(); 
      return;
    } 

    router.visit("/");
  }; 

  return (
    <div className="registerPage">
       <main className="registerShell">
         <div className="registerMain">
         <section className="registerLeft" aria-hidden="true">
           <div className="registerShape" />
           <img className="registerLogo" src={LogoSBB} alt="Logo SSB" />
           <img className="registerBoy" src={DaftarBoy} alt="Pemain sepak bola" />
        </section>

         <section className="registerRight">
           <form className="registerForm" onSubmit={handleSubmit}>
             <h1>Daftar</h1>

             <label htmlFor="name">Username</label>
             <input id="name" type="text" placeholder="Masukkan Username" value={formValues.name} onChange={handleChange} required />
            {errors.nama || errors.name ? <p className="phoneError">{errors.nama || errors.name}</p> : null}

             <label htmlFor="email">Email</label>
             <input id="email" type="email" placeholder="Masukkan Email" value={formValues.email} onChange={handleChange} required />
            {errors.email ? <p className="phoneError">{errors.email}</p> : null}

             <label htmlFor="phone">No Handphone</label>
             <input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                pattern="[0-9]*"
                maxLength={13}
                placeholder="Masukkan No Handphone"
                value={formValues.phone}
                onChange={handleChange}
                aria-describedby="register-phone-hint register-phone-error"
                aria-invalid={Boolean(phoneError)}
                required />
              
             <p id="register-phone-hint" className="phoneHint">
              Hanya angka, 10-13 digit. {formValues.phone.length}/13 digit.
            </p>
            {phoneError ? (
              <p id="register-phone-error" className="phoneError">
                {phoneError}
              </p>) :
              null}
            {errors.phone ? <p className="phoneError">{errors.phone}</p> : null}
            {errors.no_hp ? <p className="phoneError">{errors.no_hp}</p> : null}

             <label htmlFor="password">Kata Kunci</label>
             <div className="passwordWrap">
               <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Buat Kata Kunci"
                  value={formValues.password}
                  onChange={handleChange}
                  aria-describedby="register-password-hint register-password-error"
                  aria-invalid={Boolean(passwordError)}
                  required />
                
               <button
                  type="button"
                  className="passwordToggle"
                  aria-label={showPassword ? "Sembunyikan kata kunci" : "Tampilkan kata kunci"}
                  onClick={() => setShowPassword((prev) => !prev)}>
                  
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
             <p id="register-password-hint" className="passwordHint">
              Minimal 8 karakter, wajib ada huruf, angka, dan simbol.
            </p>
            {passwordError ? (
              <p id="register-password-error" className="passwordError">
                {passwordError}
              </p>) :
              null}
            {errors.password ? <p className="passwordError">{errors.password}</p> : null}

             <div className="formActions">
               <button className="backBtn" type="button" onClick={handleBack}>
                Back
              </button>
               <button className="submitBtn" type="submit" disabled={!isFormValid || isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Daftar"}
              </button>
            </div>
          </form>
        </section>
        </div>
      </main>
    </div>);

}
