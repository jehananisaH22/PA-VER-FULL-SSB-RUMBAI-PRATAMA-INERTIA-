import { useMemo, useRef, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import "./DasborOrangTua.css";
import "./UploadUlangBerkasOrangTua.css";
import { parentRoutes, visitOrCall } from "./parentNavigation";
import LogoSBB from "../../../assets/LogoSBB.png";
import ProfileIcon from "../../../assets/Profile.png";
import LoncengNotifikasiOrangTua from "./LoncengNotifikasiOrangTua";
import useParentChildSwitcher from "./useParentChildSwitcher";

const uploadFields = [
  { key: "birthCert", label: "Upload Fotocopy Akta Kelahiran (1 Lembar)" },
  { key: "reportCard", label: "Upload Fotocopy Rapor (Biodata) (1 Lembar)" },
  { key: "familyCard", label: "Upload Fotocopy Kartu Keluarga (1 Lembar)" },
  { key: "photo", label: "Upload Pas Foto Warna 3x4 (2 Lembar)" },
  { key: "paymentProof", label: "Upload Bukti Pembayaran Pendaftaran (1 Lembar)" },
];
const identityFields = [
  { key: "childName", label: "Nama Anak" },
  { key: "fatherName", label: "Nama Ayah" },
  { key: "motherName", label: "Nama Ibu" },
  { key: "age", label: "Umur" },
];
const ACCEPTED_UPLOAD_TYPES = ".jpg,.jpeg,.png,.webp,.pdf";
const ACCEPTED_UPLOAD_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "pdf"];
const MAX_UPLOAD_SIZE_MB = 5;
const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;

export default function UploadUlangBerkasOrangTua({
  onLogout,
  onSelectChild,
  onOpenHome,
  onOpenDashboard,
  onOpenAttendance,
  onOpenPerformance,
  onOpenAchievements,
  onOpenCatatanPelatih,
  onOpenPayments,
  userName,
  notifications = [],
  onClearNotifications,
  reuploadRequest,
  onSubmitReupload,
  canSwitchChild = false,
  childrenOptions = [],
  selectedChildId = null,
}) {
  const { flash = {} } = usePage().props;
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSubmitSuccessOpen, setIsSubmitSuccessOpen] = useState(() =>
    String(flash.success || "").toLowerCase().includes("revisi pendaftaran")
  );
  const baseDoc = reuploadRequest?.document || {};
  const hasActiveRequest = Boolean(reuploadRequest);
  const shouldSuppressChildPicker = isSubmitSuccessOpen || !hasActiveRequest;
  const { activeChildName, openChildPicker, childPickerModal } = useParentChildSwitcher(
    userName,
    shouldSuppressChildPicker ? [] : childrenOptions,
    false,
    selectedChildId
  );
  const displayUserName = activeChildName || userName;
  const showChildPickerAction = canSwitchChild || childrenOptions.length > 1;
  const openSelectChild = () => {
    if (onSelectChild) {
      onSelectChild();
      return;
    }

    openChildPicker();
  };
  const fileInputRefs = useRef({});
  const invalidIdentityKeys = reuploadRequest?.invalidIdentityFields || [];
  const invalidUploadKeys = reuploadRequest?.invalidUploadFields || [];
  const requiredIdentityFields = identityFields.filter((field) =>
    invalidIdentityKeys.includes(field.key)
  );
  const requiredUploadFields = uploadFields.filter((field) => invalidUploadKeys.includes(field.key));
  const hasPartialTargets = requiredIdentityFields.length > 0 || requiredUploadFields.length > 0;
  const isRevisionLocked = Boolean(reuploadRequest);
  const openHome = visitOrCall(onOpenHome, parentRoutes.home);
  const logout = visitOrCall(onLogout, parentRoutes.logout);
  const openProfile = visitOrCall(undefined, parentRoutes.profile);
  const openDashboard = visitOrCall(onOpenDashboard, parentRoutes.dashboard);
  const openAttendance = visitOrCall(onOpenAttendance, parentRoutes.attendance);
  const openPerformance = visitOrCall(onOpenPerformance, parentRoutes.performance);
  const openAchievements = visitOrCall(onOpenAchievements, parentRoutes.achievements);
  const openNotes = visitOrCall(onOpenCatatanPelatih, parentRoutes.notes);
  const openPayments = visitOrCall(onOpenPayments, parentRoutes.payments);

  const [formValues, setFormValues] = useState({
    childName: baseDoc.childName || baseDoc.name || "",
    fatherName: baseDoc.fatherName || "",
    motherName: baseDoc.motherName || "",
    age: baseDoc.age || "",
  });
  const [uploadedFiles, setUploadedFiles] = useState({
    birthCert: null,
    reportCard: null,
    familyCard: null,
    photo: null,
    paymentProof: null,
  });

  const isComplete = useMemo(() => {
    const textKeys = hasPartialTargets
      ? requiredIdentityFields.map((item) => item.key)
      : Object.keys(formValues);
    const fileKeys = hasPartialTargets
      ? requiredUploadFields.map((item) => item.key)
      : Object.keys(uploadedFiles);
    const hasText = textKeys.every((fieldKey) => String(formValues[fieldKey]).trim());
    const hasFiles = fileKeys.every((fieldKey) => Boolean(uploadedFiles[fieldKey]));
    return hasText && hasFiles;
  }, [formValues, hasPartialTargets, requiredIdentityFields, requiredUploadFields, uploadedFiles]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!isComplete || !reuploadRequest) return;
    const studentId = reuploadRequest.studentId || baseDoc.id_siswa;
    const payload = {
      email: reuploadRequest.email,
      phone: reuploadRequest.phone,
      originalChildName: baseDoc.childName || baseDoc.name || formValues.childName.trim(),
      name: formValues.childName.trim(),
      childName: formValues.childName.trim(),
      fatherName: formValues.fatherName.trim(),
      motherName: formValues.motherName.trim(),
      age: String(formValues.age).trim(),
      status: "Belum Diperiksa",
      invalidIdentityFields: invalidIdentityKeys,
      invalidUploadFields: invalidUploadKeys,
      files: Object.fromEntries(
        uploadFields
          .filter((field) => invalidUploadKeys.includes(field.key))
          .map((field) => [field.key, uploadedFiles[field.key] ? [uploadedFiles[field.key].name] : []])
      ),
      fileObjects: Object.fromEntries(
        uploadFields
          .filter((field) => invalidUploadKeys.includes(field.key))
          .map((field) => [field.key, uploadedFiles[field.key] ? [uploadedFiles[field.key]] : []])
      ),
      baseDocument: baseDoc,
    };

    const updatePayload = {
      nama_siswa: formValues.childName.trim(),
      nama_ayah: formValues.fatherName.trim(),
      nama_ibu: formValues.motherName.trim(),
      umur: String(formValues.age).trim(),
      akta_kelahiran: uploadedFiles.birthCert,
      kartu_keluarga: uploadedFiles.familyCard,
      rapor: uploadedFiles.reportCard,
      pas_photo_3x4: uploadedFiles.photo,
      paymentProof: uploadedFiles.paymentProof,
    };

    if (studentId) {
      router.post(`/api/siswa/update-pendaftaran/${studentId}`, updatePayload, {
        forceFormData: true,
        preserveScroll: true,
        onSuccess: () => {
          onSubmitReupload?.(payload);
          setIsSubmitSuccessOpen(true);
        },
      });
      return;
    }

    onSubmitReupload?.(payload);
    setIsSubmitSuccessOpen(true);
  };

  const handlePreviewFile = (fieldKey) => {
    const file = uploadedFiles[fieldKey];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    window.open(objectUrl, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
  };

  const handleFileChange = (fieldKey, file) => {
    if (file) {
      const extension = file.name.split(".").pop()?.toLowerCase();
      if (!ACCEPTED_UPLOAD_EXTENSIONS.includes(extension || "")) {
        window.alert("File harus berupa gambar JPG, JPEG, PNG, WEBP, atau PDF.");
        if (fileInputRefs.current[fieldKey]) fileInputRefs.current[fieldKey].value = "";
        return;
      }

      if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        window.alert(`Ukuran file maksimal ${MAX_UPLOAD_SIZE_MB} MB.`);
        if (fileInputRefs.current[fieldKey]) fileInputRefs.current[fieldKey].value = "";
        return;
      }
    }

    setUploadedFiles((prev) => ({
      ...prev,
      [fieldKey]: file || null,
    }));
  };

  return (
    <div className="parentPage parentPageReupload">
      <header className="parentTopbar">
        <div className="parentTopInner">
          <button
            type="button"
            className="parentLogoBtn"
            onClick={openHome}
            disabled={isRevisionLocked}
          >
            <img src={LogoSBB} alt="Logo SSB" />
          </button>
          <nav className="parentNavLinks">
            <button type="button" onClick={openDashboard} disabled={isRevisionLocked}>Dashboard</button>
            <button type="button" onClick={openAttendance} disabled={isRevisionLocked}>Kehadiran</button>
            <button type="button" onClick={openPerformance} disabled={isRevisionLocked}>Performa Latihan</button>
            <button type="button" onClick={openAchievements} disabled={isRevisionLocked}>Prestasi</button>
            <button type="button" onClick={openNotes} disabled={isRevisionLocked}>Catatan Pelatih</button>
            <button type="button" onClick={openPayments} disabled={isRevisionLocked}>Pembayaran</button>
          </nav>
          <div className="parentNavRight">
            <LoncengNotifikasiOrangTua notifications={notifications} onClearNotifications={onClearNotifications} />
            <div className="parentProfileWrap">
              <button
                type="button"
                className="parentProfileBtn"
                onClick={() => setIsProfileOpen((prev) => !prev)}
              >
                <img src={ProfileIcon} alt="" />
                <span>{displayUserName}</span>
              </button>
              {isProfileOpen && (
                <div className="parentProfileMenu">
                  <button type="button" onClick={openProfile}>
                    Profil
                  </button>
                  {showChildPickerAction && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        openSelectChild();
                      }}
                    >
                      Pilih Anak
                    </button>
                  )}
                  <button type="button" onClick={logout}>Logout</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="parentMain parentReuploadMain">
        <section className="parentReuploadCard">
          <div className="parentReuploadHead">
            <h1>Upload Ulang Berkas</h1>
            {hasActiveRequest ? (
              <p className="parentReuploadLead">
                Admin menandai berkas tidak valid. Silakan upload ulang hanya bagian yang ditandai.
              </p>
            ) : (
              <p className="parentReuploadLead">
                Tidak ada permintaan revisi aktif saat ini.
              </p>
            )}
            {hasActiveRequest && hasPartialTargets && (
              <div className="parentReuploadTargetBox">
                <p>Bagian yang harus diperbaiki</p>
                <div className="parentReuploadTargets">
                  {[...requiredIdentityFields.map((item) => item.label), ...requiredUploadFields.map((item) => item.label)].map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>
              </div>
            )}
            {hasActiveRequest && isRevisionLocked && (
              <p className="parentReuploadLockInfo">Menu navigasi dikunci sampai upload ulang selesai dikirim.</p>
            )}
            {!hasActiveRequest && <p className="parentReuploadEmptyInfo">Silakan kembali ke dashboard.</p>}
          </div>

          {hasActiveRequest ? (
          <form className="parentReuploadForm" onSubmit={handleSubmit}>
            <div className="parentReuploadTextGrid">
              {(hasPartialTargets ? requiredIdentityFields : identityFields).map((field) => (
                <label key={field.key}>
                  <span>{field.label}</span>
                  <input
                    type={field.key === "age" ? "number" : "text"}
                    min={field.key === "age" ? "1" : undefined}
                    value={formValues[field.key]}
                    onChange={(event) =>
                      setFormValues((prev) => ({ ...prev, [field.key]: event.target.value }))
                    }
                    disabled={!reuploadRequest}
                    required
                  />
                </label>
              ))}
            </div>

            <div className="parentReuploadUploadGrid">
              {(hasPartialTargets ? requiredUploadFields : uploadFields).map((field) => (
                <div key={field.key} className="parentReuploadUploadItem">
                  <p>{field.label}</p>
                  <label htmlFor={`reupload-${field.key}`} className="parentReuploadUploadBtn">
                    Pilih File
                  </label>
                  <input
                    id={`reupload-${field.key}`}
                    type="file"
                    accept={ACCEPTED_UPLOAD_TYPES}
                    required
                    disabled={!reuploadRequest}
                    ref={(element) => {
                      fileInputRefs.current[field.key] = element;
                    }}
                    onChange={(event) => handleFileChange(field.key, event.target.files?.[0] || null)}
                  />
                  <small className="parentReuploadUploadHint">JPG, PNG, WEBP, atau PDF. Maks {MAX_UPLOAD_SIZE_MB} MB.</small>
                  {uploadedFiles[field.key] && (
                    <div className="parentReuploadFileRow">
                      <span>{uploadedFiles[field.key].name}</span>
                      <button type="button" onClick={() => handlePreviewFile(field.key)}>
                        Lihat
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setUploadedFiles((prev) => ({ ...prev, [field.key]: null }))
                        }
                      >
                        Hapus
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="parentReuploadActions">
              <button type="submit" className="parentReuploadSubmitBtn" disabled={!isComplete}>
                Kirim Ulang
              </button>
            </div>
          </form>
          ) : (
            <div className="parentReuploadActions isEmpty">
              <button type="button" className="parentReuploadBackBtn" onClick={openDashboard}>
                Kembali ke Dashboard
              </button>
            </div>
          )}
        </section>
      </main>

      {isSubmitSuccessOpen && (
        <div className="parentReuploadSuccessOverlay" role="dialog" aria-modal="true" aria-label="Upload ulang berhasil">
          <div className="parentReuploadSuccessCard">
            <h3>Berhasil Dikirim</h3>
            <p>Form perbaikan dan berkas baru berhasil dikirim.</p>
            <p>Perubahan Anda akan divalidasi ulang oleh admin. Mohon tunggu sampai admin menyelesaikan pemeriksaan.</p>
            <button
              type="button"
              onClick={() => setIsSubmitSuccessOpen(false)}
            >
              Oke
            </button>
          </div>
        </div>
      )}
      {hasActiveRequest && !isSubmitSuccessOpen && childPickerModal}
    </div>
  );
}



