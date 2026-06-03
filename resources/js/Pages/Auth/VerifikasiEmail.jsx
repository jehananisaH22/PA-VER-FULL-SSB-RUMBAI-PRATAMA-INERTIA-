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
          params: { email },
        });

        if (isMounted && response.data?.verified) {
          router.visit(response.data?.next_url || "/register/form", {
            replace: true,
            preserveScroll: false,
          });
        }
      } catch {
        // Keep the verification page open while the email check is unavailable.
      }
    };

    checkVerificationStatus();
    const intervalId = window.setInterval(checkVerificationStatus, 3000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [email]);

  const openEmailInbox = () => {
    const domain = email.split("@")[1]?.toLowerCase() || "";

    if (domain === "gmail.com" || domain === "googlemail.com") {
      window.open("https://mail.google.com/", "_blank", "noopener,noreferrer");
      return;
    }

    if (["outlook.com", "hotmail.com", "live.com"].includes(domain)) {
      window.open("https://outlook.live.com/mail/", "_blank", "noopener,noreferrer");
      return;
    }

    if (domain === "yahoo.com" || domain === "ymail.com") {
      window.open("https://mail.yahoo.com/", "_blank", "noopener,noreferrer");
      return;
    }

    window.open(`mailto:${email}`, "_blank", "noopener,noreferrer");
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
              onClick={openEmailInbox}
            >
              Buka Email
            </button>
          </div>
        </section>
      </main>
    </>
  );
}
