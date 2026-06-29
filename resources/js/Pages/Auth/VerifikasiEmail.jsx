import { Head, router } from "@inertiajs/react"; 
import { useEffect } from "react"; 
import "./VerifikasiEmail.css"; 

import LogoSBB from "../../../assets/LogoSBB.png"; 

export default function VerifikasiEmail({ email = "", verificationLink = "" }) {
  useEffect(() => {
    if (!email || !window.axios) return undefined; 

    let isMounted = true; 
    const checkVerificationStatus = async () => {
      try {
        const response = await window.axios.get("/api/verification-status", { 
          params: { email }
        }); 

        if (isMounted && response.data?.verified) {
          router.visit(response.data?.next_url || "/register/form", { 
            replace: true, 
            preserveScroll: false
          });
        }
      } catch {

        // Keep the verification page open while the email check is unavailable.
      }}; 

    checkVerificationStatus(); 
    const intervalId = window.setInterval(checkVerificationStatus, 3000); 

    return () => {
      isMounted = false; 
      window.clearInterval(intervalId);
    };
  }, [email]); 

  const openEmailInbox = () => {
    const normalizedEmail = email.trim().toLowerCase(); 
    const domain = normalizedEmail.split("@")[1] || ""; 
    const goToInbox = (url) => {
      const inboxWindow = window.open(url, "ssb_verification_inbox"); 

      if (inboxWindow) {
        inboxWindow.opener = null; 
        inboxWindow.focus(); 
        return;
      } 

      window.alert("Browser memblokir tab email. Izinkan pop-up untuk membuka inbox email.");
    }; 

    if (domain === "gmail.com" || domain === "googlemail.com") {
      goToInbox("https://mail.google.com/mail/u/0/#search/Verifikasi%20Email%20SSB%20System"); 
      return;
    } 

    if (["mahasiswa.pcr.ac.id", "pcr.ac.id"].includes(domain)) {
      goToInbox("https://mail.google.com/mail/u/0/#search/Verifikasi%20Email%20SSB%20System");
      return;
    }

    if (["outlook.com", "hotmail.com", "live.com"].includes(domain)) {
      goToInbox("https://outlook.live.com/mail/0/inbox"); 
      return;
    } 

    if (domain === "yahoo.com" || domain === "ymail.com") {
      goToInbox("https://mail.yahoo.com/"); 
      return;
    } 

    if (["icloud.com", "me.com", "mac.com"].includes(domain)) {
      goToInbox("https://www.icloud.com/mail/"); 
      return;
    } 

    if (["proton.me", "protonmail.com"].includes(domain)) {
      goToInbox("https://mail.proton.me/"); 
      return;
    } 

    window.alert("Domain email ini tidak punya alamat inbox otomatis di sistem. Buka inbox email dari website/aplikasi email yang biasa digunakan, lalu cari email Verifikasi Email SSB System.");
  }; 

  return (
    <>
       <Head title="Verifikasi Email" />
       <main className="emailVerifyPage">
         <section className="emailVerifyCard">
           <img src={LogoSBB} alt="Logo SSB" />
           <h1>Verifikasi Email</h1>
           <p>
            Link verifikasi sudah dikirim ke email
            {email ? <strong> {email}</strong> : ""}. Buka email tersebut lalu klik link
            verifikasi untuk melanjutkan pendaftaran.
          </p>
           <div className="emailVerifyActions">
             <button type="button" onClick={() => router.visit("/register")}>
              Kembali
            </button>
             <button
              type="button"
              className="primary"
              onClick={openEmailInbox}>
              
              Buka Email
            </button>
          </div>
        </section>
      </main>
    </>);

}
