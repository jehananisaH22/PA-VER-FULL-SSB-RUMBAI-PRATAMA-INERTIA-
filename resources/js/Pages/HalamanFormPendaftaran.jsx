import { useEffect, useMemo, useRef, useState } from "react"; 
import { Head, router, usePage } from "@inertiajs/react"; 
import "../../css/HalamanFormPendaftaran.css"; 

import LogoSBB from "../../assets/LogoSBB.png"; 
import NotifIcon from "../../assets/notif.png"; 
import ProfileIcon from "../../assets/Profile.png"; 



const uploadFields = [
{ 
  id: "akta", 
  label: "Upload Fotocopy Akta Kelahiran (1 Lembar)"
},
{ 
  id: "kk", 
  label: "Upload Fotocopy Kartu Keluarga (1 Lembar)"
},
{ 
  id: "rapor", 
  label: "Upload Fotocopy Rapor (Biodata) (1 Lembar)"
},
{ 
  id: "pasfoto", 
  label: "Upload Pas Foto Warna 3x4 (2 Lembar)"
}]; 

const ACCEPTED_UPLOAD_TYPES = ".jpg,.jpeg,.png,.webp,.pdf"; 
const ACCEPTED_UPLOAD_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "pdf"]; 
const MAX_UPLOAD_SIZE_MB = 5; 
const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024; 

function calculateAgeFromBirthDate(value) {
  if (!value) return ""; 
  const birthDate = new Date(value); 
  if (Number.isNaN(birthDate.getTime())) return ""; 

  const today = new Date(); 
  let age = today.getFullYear() - birthDate.getFullYear(); 
  const monthDiff = today.getMonth() - birthDate.getMonth(); 
  if (monthDiff < 0 || monthDiff === 0 && today.getDate() < birthDate.getDate()) {
    age -= 1;
  } 

  return age >= 0 ? String(age) : "";
} 

function errorMessage(error) {
  if (Array.isArray(error)) return error[0] || "";
  return error || "";
}

export default function HalamanFormPendaftaran({ 
  onOpenHome, 
  onBackToDaftar, 
  registrationAccount, 
  registrationFormDraft, 
  returnToDashboard = false,
  dashboardUrl = "/orang-tua/dashboard",
  onRegistrationFormDraftChange, 
  onSubmitRegistration, 
  onOpenPaymentProof
}) {
  const { errors = {} } = usePage().props; 
  const fileInputRefs = useRef({}); 
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(true); 
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const [formValues, setFormValues] = useState({ 
    childName: registrationFormDraft?.formValues?.childName || "", 
    fatherName: registrationFormDraft?.formValues?.fatherName || "", 
    motherName: registrationFormDraft?.formValues?.motherName || "", 
    birthDate: registrationFormDraft?.formValues?.birthDate || ""
  }); 
  const [uploadedFiles, setUploadedFiles] = useState({ 
    akta: registrationFormDraft?.uploadedFiles?.akta || null, 
    kk: registrationFormDraft?.uploadedFiles?.kk || null, 
    rapor: registrationFormDraft?.uploadedFiles?.rapor || null, 
    pasfoto: registrationFormDraft?.uploadedFiles?.pasfoto || null
  }); 
  const openHome = () => {
    if (returnToDashboard) {
      router.visit(dashboardUrl);
      return;
    }

    onOpenHome ? onOpenHome() : router.visit("/");
  };
  const backToDaftar = () => {
    if (returnToDashboard) {
      router.visit("/orang-tua/daftar-anak");
      return;
    }

    onBackToDaftar ? onBackToDaftar() : router.visit("/register");
  }; 


  const page = usePage(); 

  const user = page.props?.auth?.user; 
  const [localUser, setLocalUser] = useState(null); 

  useEffect(() => {
    setLocalUser(user);
  }, [user]); 

  useEffect(() => {
    onRegistrationFormDraftChange?.({ 
      formValues, 
      uploadedFiles
    });
  }, [formValues, uploadedFiles, onRegistrationFormDraftChange]); 

  const isFormComplete = useMemo(() => {
    const hasAllText =
    formValues.childName.trim() &&
    formValues.fatherName.trim() &&
    formValues.motherName.trim() &&
    String(formValues.birthDate).trim(); 
    const hasAllFiles = Object.values(uploadedFiles).every((file) => !!file); 
    return Boolean(hasAllText && hasAllFiles);
  }, [formValues, uploadedFiles]); 

  const handleSubmit = (event) => {
    event.preventDefault(); 
    if (!isFormComplete) return; 
    const calculatedAge = calculateAgeFromBirthDate(formValues.birthDate); 
    const payload = { 
      name: formValues.childName.trim(), 
      email: registrationAccount?.email?.trim() || "", 
      phone: registrationAccount?.phone?.trim() || "", 
      status: "Belum Diperiksa", 
      childName: formValues.childName.trim(), 
      motherName: formValues.motherName.trim(), 
      fatherName: formValues.fatherName.trim(), 
      age: calculatedAge, 
      birthDate: formValues.birthDate, 
      files: { 
        birthCert: uploadedFiles.akta ? [uploadedFiles.akta.name] : [], 
        familyCard: uploadedFiles.kk ? [uploadedFiles.kk.name] : [], 
        reportCard: uploadedFiles.rapor ? [uploadedFiles.rapor.name] : [], 
        photo: uploadedFiles.pasfoto ? [uploadedFiles.pasfoto.name] : []
      }, 
      fileObjects: { 
        birthCert: uploadedFiles.akta ? [uploadedFiles.akta] : [], 
        familyCard: uploadedFiles.kk ? [uploadedFiles.kk] : [], 
        reportCard: uploadedFiles.rapor ? [uploadedFiles.rapor] : [], 
        photo: uploadedFiles.pasfoto ? [uploadedFiles.pasfoto] : []
      }, 
      formValues, 
      uploadedFiles
    }; 
    onSubmitRegistration?.(payload); 
    if (onOpenPaymentProof) {
      onOpenPaymentProof(payload); 
      return;
    } 
    router.post("/api/daftar-siswa", { 
      nama_siswa: formValues.childName.trim(), 
      nama_ayah: formValues.fatherName.trim(), 
      nama_ibu: formValues.motherName.trim(), 
      tanggal_lahir: formValues.birthDate, 
      akta_kelahiran: uploadedFiles.akta, 
      kartu_keluarga: uploadedFiles.kk, 
      rapor: uploadedFiles.rapor, 
      pas_photo_3x4: uploadedFiles.pasfoto
    }, { 
      forceFormData: true, 
      preserveScroll: true, 
      onStart: () => setIsSubmitting(true), 
      onFinish: () => setIsSubmitting(false)
    });
  }; 

  const handleTextChange = (event) => {
    const { name, value } = event.target; 
    setFormValues((prev) => ({ ...prev, [name]: value }));
  }; 

  const handleFileChange = (fieldId, file) => {
    if (file) {
      const extension = file.name.split(".").pop()?.toLowerCase(); 
      if (!ACCEPTED_UPLOAD_EXTENSIONS.includes(extension || "")) {
        window.alert("File harus berupa gambar JPG, JPEG, PNG, WEBP, atau PDF."); 
        if (fileInputRefs.current[fieldId]) fileInputRefs.current[fieldId].value = ""; 
        return;
      } 

      if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        window.alert(`Ukuran file maksimal ${MAX_UPLOAD_SIZE_MB} MB.`); 
        if (fileInputRefs.current[fieldId]) fileInputRefs.current[fieldId].value = ""; 
        return;
      }
    } 

    setUploadedFiles((prev) => ({ ...prev, [fieldId]: file || null }));
  }; 

  const handleViewFile = (fieldId) => {
    const file = uploadedFiles[fieldId]; 
    if (!file) return; 
    const objectUrl = URL.createObjectURL(file); 
    window.open(objectUrl, "_blank", "noopener,noreferrer"); 
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
  }; 

  const handleRemoveFile = (fieldId) => {
    setUploadedFiles((prev) => ({ ...prev, [fieldId]: null })); 
    if (fileInputRefs.current[fieldId]) {
      fileInputRefs.current[fieldId].value = "";
    }
  }; 

  return (
    <div className="enrollPage">
       <Head title="Form Pendaftaran" />
       <header className="enrollTopbar">
         <div className="enrollTopInner">
           <button type="button" className="enrollLogoBtn" onClick={openHome}>
             <img src={LogoSBB} alt="Logo SSB" />
          </button>

           <nav className="enrollNavLinks">
             <button type="button" onClick={openHome}>
              {returnToDashboard ? "Kembali" : "Beranda"}
            </button>
             <button type="button" className="is-active" onClick={backToDaftar}>
              Daftar
            </button>
          </nav>

           <div className="enrollNavRight">
             <button type="button" className="enrollIconBtn" aria-label="Notifikasi">
               <img src={NotifIcon} alt="" />
            </button>
           <button type="button" className="enrollIconBtn" aria-label="Profil">
   <img src={ProfileIcon} alt="" />
{localUser && <span>{localUser.name}</span>}
</button>
          </div>
        </div>
      </header>

       <main className="enrollMain">
         <section className="enrollContainer">
           <h1>Pendaftaran</h1>

           <form className="enrollForm" onSubmit={handleSubmit}>
             <div className="enrollTextGrid">
               <label>
                 <span>Nama Anak</span>
                 <input
                  type="text"
                  name="childName"
                  value={formValues.childName}
                  onChange={handleTextChange}
                  placeholder="Masukkan Nama"
                  required />
                
              </label>
               <label>
                 <span>Tanggal Lahir</span>
                 <input
                  type="date"
                  name="birthDate"
                  value={formValues.birthDate}
                  onChange={handleTextChange}
                  required />
                
                {(errors.tanggal_lahir || errors.umur) && (
                <small>{errorMessage(errors.tanggal_lahir) || errorMessage(errors.umur)}</small>)
                }
              </label>
               <label>
                 <span>Nama Ayah</span>
                 <input
                  type="text"
                  name="fatherName"
                  value={formValues.fatherName}
                  onChange={handleTextChange}
                  placeholder="Masukkan Nama"
                  required />
                
              </label>
               <label>
                 <span>Nama Ibu</span>
                 <input
                  type="text"
                  name="motherName"
                  value={formValues.motherName}
                  onChange={handleTextChange}
                  placeholder="Masukkan Nama"
                  required />
                
              </label>
            </div>

             <div className="enrollUploadGrid">
              {uploadFields.map((field) => (
              <div key={field.id} className="enrollUploadItem">
                   <p>{field.label}</p>
                   <div className="enrollUploadControl">
                     <label htmlFor={`file-${field.id}`} className="enrollUploadBtn">
                      Add file
                    </label>
                     <input
                    id={`file-${field.id}`}
                    type="file"
                    accept={ACCEPTED_UPLOAD_TYPES}
                    required={!uploadedFiles[field.id]}
                    ref={(element) => {
                      fileInputRefs.current[field.id] = element;
                    }}
                    onChange={(event) => handleFileChange(field.id, event.target.files?.[0])} />
                  
                     <small className="enrollUploadHint">JPG, PNG, WEBP, atau PDF. Maks {MAX_UPLOAD_SIZE_MB} MB.</small>
                  </div>
                  {uploadedFiles[field.id] && (
                <div className="enrollFileRow">
                       <button
                    type="button"
                    className="enrollFileNameBtn"
                    onClick={() => handleViewFile(field.id)}>
                    
                        {uploadedFiles[field.id].name}
                      </button>
                       <button
                    type="button"
                    className="enrollFileDeleteBtn"
                    onClick={() => handleRemoveFile(field.id)}>
                    
                        Hapus
                      </button>
                    </div>)
                }
                </div>)
              )}
            </div>

             <div className="enrollWarningActions">
               <button
                type="button"
                className="enrollWarningTrigger"
                onClick={() => setIsWarningModalOpen(true)}>
                
                Lihat Peringatan Pembayaran
              </button>
            </div>

             <button type="submit" className="enrollSubmitBtn" disabled={!isFormComplete || isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Upload Bukti Pembayaran"}
            </button>
            {Object.keys(errors).length > 0 ? (
            <p className="enrollSubmitError">
                Lengkapi data pendaftaran dan pastikan semua file sudah dipilih.
              </p>) :
            null}
          </form>
        </section>
      </main>

      {isWarningModalOpen ? (
      <div
        className="enrollWarningOverlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="enroll-warning-title"
        onClick={() => setIsWarningModalOpen(false)}>
        
           <article className="enrollWarningModal" onClick={(event) => event.stopPropagation()}>
             <button
            type="button"
            className="enrollWarningClose"
            aria-label="Tutup peringatan"
            onClick={() => setIsWarningModalOpen(false)}>
            
              ×
            </button>
             <div className="enrollWarningTitleRow">
               <span className="enrollWarningIcon">!</span>
               <h2 id="enroll-warning-title">Peringatan</h2>
            </div>

             <p>
              Dimohon untuk melakukan pembayaran uang pendaftaran sebesar  <strong>Rp280.000</strong>, sudah
              termasuk:
            </p>
             <ol>
               <li>1 stel baju latihan</li>
               <li>Kaos kaki</li>
               <li>Deker</li>
            </ol>
             <p>
              Biaya dibayarkan langsung di tempat latihan.
            </p>
             <p>
              Iuran bulanan sebesar  <strong>Rp100.000</strong> dibayarkan sebelum tanggal 10 setiap
              bulannya.
            </p>
          </article>
        </div>) :
      null}
    </div>);

}
