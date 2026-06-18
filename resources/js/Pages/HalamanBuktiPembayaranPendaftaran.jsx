import { useEffect, useMemo, useRef, useState } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import GreenSelect from "../components/GreenSelect";
import "../../css/HalamanBuktiPembayaranPendaftaran.css";

import LogoSBB from "../../assets/LogoSBB.png";
import NotifIcon from "../../assets/notif.png";
import ProfileIcon from "../../assets/Profile.png";

const ACCEPTED_UPLOAD_TYPES = ".jpg,.jpeg,.png,.webp,.pdf";
const ACCEPTED_UPLOAD_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "pdf"];
const MAX_UPLOAD_SIZE_MB = 5;
const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;

export default function HalamanBuktiPembayaranPendaftaran({
  onOpenHome,
  onBackToDaftar,
  paymentDraft,
  onPaymentDraftChange,
  onSubmitPaymentProof,
}) {
  const { errors = {}, flash = {} } = usePage().props;
  const inputRef = useRef(null);
  const registrationYear = Number(paymentDraft?.registrationYear || new Date().getFullYear());
  const now = new Date();
  const currentYear = now.getFullYear();
  const yearPeriodOptions = [];
  for (let year = currentYear; year >= registrationYear; year -= 1) {
    yearPeriodOptions.push(String(year));
  }

const page = usePage();

const user = page.props?.auth?.user;
const [localUser, setLocalUser] = useState(null);

console.log(ProfileIcon);

useEffect(() => {
  setLocalUser(user);
}, [user]);
  
  const [formValues, setFormValues] = useState({
    studentName: paymentDraft?.formValues?.studentName || paymentDraft?.childName || "",
    paymentType: paymentDraft?.formValues?.paymentType || "Pendaftaran dan Bulanan",
    period: paymentDraft?.formValues?.period || String(currentYear),
    amount: paymentDraft?.formValues?.amount || "280000",
    paidDay: paymentDraft?.formValues?.paidDay || String(now.getDate()).padStart(2, "0"),
    paidMonth: paymentDraft?.formValues?.paidMonth || String(now.getMonth() + 1).padStart(2, "0"),
    paidYear: paymentDraft?.formValues?.paidYear || String(now.getFullYear()),
  });
  const [proofFile, setProofFile] = useState(paymentDraft?.proofFile || null);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const openHome = () => (onOpenHome ? onOpenHome() : router.visit("/"));
  const backToDaftar = () => (onBackToDaftar ? onBackToDaftar() : router.visit("/register"));
  const openParentLogin = () => router.visit("/login/orangtua");

  useEffect(() => {
    if (flash.registrationPaymentSuccess) {
      setIsSuccessOpen(true);
    }
  }, [flash.registrationPaymentSuccess]);

  useEffect(() => {
    onPaymentDraftChange?.((prev) => ({
      ...(prev || {}),
      childName: formValues.studentName.trim() || paymentDraft?.childName || "",
      parentName: prev?.parentName || paymentDraft?.parentName || "",
      email: prev?.email || paymentDraft?.email || "",
      registrationYear: prev?.registrationYear || paymentDraft?.registrationYear || currentYear,
      formValues,
      proofFile,
    }));
  }, [currentYear, formValues, onPaymentDraftChange, paymentDraft?.childName, paymentDraft?.email, paymentDraft?.parentName, paymentDraft?.registrationYear, proofFile]);

  const isComplete = useMemo(
    () =>
      formValues.studentName.trim() &&
      formValues.paymentType.trim() &&
      formValues.period.trim() &&
      String(formValues.amount).trim() &&
      formValues.paidDay &&
      formValues.paidMonth &&
      formValues.paidYear &&
      proofFile,
    [formValues, proofFile]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => {
      if (name !== "paymentType") {
        if (name === "amount") {
          return { ...prev, amount: value.replace(/[^0-9]/g, "") };
        }
        return { ...prev, [name]: value };
      }
      return prev;
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!isComplete) return;
    onSubmitPaymentProof?.({
      ...formValues,
      amount: Number(formValues.amount) || 0,
      paidDate: `${formValues.paidYear}-${formValues.paidMonth}-${formValues.paidDay}`,
      email: paymentDraft?.email || "",
      parentName: paymentDraft?.parentName || "",
      proofFile,
      proofFileName: proofFile.name,
      submittedAt: Date.now(),
    });
    router.post("/api/siswa/upload-bukti-pendaftaran", {
      student_name: formValues.studentName.trim(),
      jenis: formValues.paymentType,
      periode: formValues.period,
      jumlah: Number(formValues.amount) || 0,
      tanggal_bukti_bayar: `${formValues.paidYear}-${formValues.paidMonth}-${formValues.paidDay}`,
      bukti_bayar: proofFile,
    }, {
      forceFormData: true,
      preserveScroll: true,
      onStart: () => setIsSubmitting(true),
      onFinish: () => setIsSubmitting(false),
      onSuccess: () => setIsSuccessOpen(true),
      onError: () => setIsSuccessOpen(false),
    });
  };

  const setSelectValue = (name, value) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleProofFileChange = (file) => {
    if (!file) {
      setProofFile(null);
      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED_UPLOAD_EXTENSIONS.includes(extension || "")) {
      window.alert("File harus berupa gambar JPG, JPEG, PNG, WEBP, atau PDF.");
      if (inputRef.current) inputRef.current.value = "";
      setProofFile(null);
      return;
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      window.alert(`Ukuran file maksimal ${MAX_UPLOAD_SIZE_MB} MB.`);
      if (inputRef.current) inputRef.current.value = "";
      setProofFile(null);
      return;
    }

    setProofFile(file);
  };
  

  return (
    <div className="regPaymentPage">
      <Head title="Bukti Pembayaran Pendaftaran" />
      <header className="regPaymentTopbar">
        <div className="regPaymentTopInner">
          <button type="button" className="regPaymentLogoBtn" onClick={openHome}>
            <img src={LogoSBB} alt="Logo SSB" />
          </button>
          <nav className="regPaymentNavLinks">
            <button type="button" onClick={openHome}>Beranda</button>
            <button type="button" className="is-active" onClick={backToDaftar}>
              Daftar
            </button>
          </nav>
          <div className="regPaymentNavRight">
            <button type="button" className="regPaymentIconBtn" aria-label="Notifikasi">
              <img src={NotifIcon} alt="" />
            </button>
           <button className="regPaymentProfileBtn">
  <img src={ProfileIcon} alt="" />
  {localUser && (
    <span className="regPaymentProfileName">
      {localUser.name}
    </span>
  )}
</button>
          </div>
        </div>
      </header>

      <main className="regPaymentMain">
        <section className="regPaymentCard">
          <h1>Upload Bukti Pembayaran Pendaftaran</h1>
          <p className="regPaymentSub">
            Lengkapi data pembayaran dan unggah bukti pembayaran.
          </p>

          <form className="regPaymentForm" onSubmit={handleSubmit}>
            <label>
              <span>Nama Siswa</span>
              <input
                type="text"
                name="studentName"
                value={formValues.studentName}
                onChange={handleChange}
                placeholder="Masukkan nama siswa"
                readOnly
                required
              />
            </label>

            <label>
              <span>Jenis Pembayaran</span>
              <input type="text" value="Pendaftaran dan Bulanan" readOnly />
            </label>

            <label>
              <span>Periode</span>
              <GreenSelect
                value={formValues.period}
                onChange={(nextValue) => setSelectValue("period", nextValue)}
                ariaLabel="Pilih periode pembayaran"
                className="regPaymentGreenSelect"
                options={yearPeriodOptions}
              />
            </label>

            <label>
              <span>Jumlah Pembayaran</span>
              <input
                type="text"
                inputMode="numeric"
                name="amount"
                value={formValues.amount}
                readOnly
                placeholder="Masukkan jumlah pembayaran"
                required
              />
            </label>

            <div className="regPaymentDateGroup">
              <span>Tanggal Bayar</span>
              <div className="regPaymentDateGrid">
                <GreenSelect
                  value={formValues.paidDay}
                  onChange={(nextValue) => setSelectValue("paidDay", nextValue)}
                  ariaLabel="Pilih tanggal bayar"
                  className="regPaymentGreenSelect"
                  options={Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, "0"))}
                />
                <GreenSelect
                  value={formValues.paidMonth}
                  onChange={(nextValue) => setSelectValue("paidMonth", nextValue)}
                  ariaLabel="Pilih bulan bayar"
                  className="regPaymentGreenSelect"
                  options={Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"))}
                />
                <GreenSelect
                  value={formValues.paidYear}
                  onChange={(nextValue) => setSelectValue("paidYear", nextValue)}
                  ariaLabel="Pilih tahun bayar"
                  className="regPaymentGreenSelect"
                  options={yearPeriodOptions}
                />
              </div>
            </div>

            <div className="regPaymentUploadBox">
              <strong>Bukti Pembayaran</strong>
              <p>Format gambar/PDF, 1 file.</p>
              <p>Maksimal {MAX_UPLOAD_SIZE_MB} MB.</p>
              <button
                type="button"
                className="regPaymentUploadBtn"
                onClick={() => inputRef.current?.click()}
              >
                Pilih File
              </button>
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_UPLOAD_TYPES}
                onChange={(event) => handleProofFileChange(event.target.files?.[0] || null)}
                required={!proofFile}
              />
              {proofFile && <span className="regPaymentFileName">{proofFile.name}</span>}
            </div>

            <div className="regPaymentActions">
              <button type="button" className="regPaymentBackBtn" onClick={backToDaftar}>
                Back
              </button>
              <button type="submit" className="regPaymentSubmitBtn" disabled={!isComplete || isSubmitting}>
                {isSubmitting ? "Mengirim..." : "Kirim Bukti Pembayaran"}
              </button>
            </div>
            {Object.keys(errors).length > 0 ? (
              <p className="regPaymentError">
                {errors.bukti_bayar || errors.periode || errors.jumlah || errors.tanggal_bukti_bayar || "Lengkapi data pembayaran dan pilih file bukti pembayaran."}
              </p>
            ) : null}
          </form>
        </section>
      </main>

      {isSuccessOpen && (
        <div className="regPaymentOverlay" role="dialog" aria-modal="true">
          <div className="regPaymentSuccessCard">
            <div className="regPaymentSuccessIcon">{"\u2713"}</div>
            <p>Data dan berkas Anda berhasil dikirim. Saat ini, pendaftaran Anda sedang dalam proses verifikasi oleh admin.</p>
            <p>Anda sudah bisa login, tetapi akun anak tetap nonaktif sampai admin memvalidasi berkas dan pembayaran.</p>
            <p>Terima kasih telah mendaftar di SSB Rumbai Pratama.</p>
            <button type="button" onClick={openParentLogin}>Login</button>
          </div>
        </div>
      )}
    </div>
  );
}


