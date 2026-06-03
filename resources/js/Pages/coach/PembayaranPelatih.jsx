import { useEffect, useMemo, useRef, useState } from "react";
import { router } from "@inertiajs/react";
import TataLetakPelatih from "./TataLetakPelatih";
import "./PembayaranPelatih.css";

const categoryOptions = [
  { value: "all", label: "Pilih Kategori Umur" },
  { value: "u10", label: "U-10" },
  { value: "u11", label: "U-11" },
  { value: "u12", label: "U-12" },
];

const paymentTypeOptions = [
  { value: "", label: "Pilih Jenis Pembayaran" },
  { value: "pendaftaran", label: "Pendaftaran" },
  { value: "bulanan", label: "Bulanan" },
  { value: "harian", label: "Harian" },
];

const categoryLabel = {
  u10: "U-10",
  u11: "U-11",
  u12: "U-12",
};

const paymentAmounts = {
  pendaftaran: 280000,
  bulanan: 100000,
  harian: 35000,
};

const backendPaymentType = {
  pendaftaran: "Pendaftaran",
  bulanan: "Bulanan",
  harian: "Harian",
};
const ACCEPTED_UPLOAD_TYPES = ".jpg,.jpeg,.png,.webp,.pdf";
const ACCEPTED_UPLOAD_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "pdf"];
const MAX_UPLOAD_SIZE_MB = 5;
const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;
const coachPaymentToastStorageKey = "ssb-coach-payment-toast";
const coachPaymentToastElementId = "ssb-coach-payment-toast";

function readStoredCoachPaymentToast() {
  if (typeof window === "undefined") return null;

  try {
    const storedToast = window.sessionStorage.getItem(coachPaymentToastStorageKey);
    return storedToast ? JSON.parse(storedToast) : null;
  } catch {
    return null;
  }
}

function removeCoachPaymentToastElement() {
  if (typeof document === "undefined") return;

  const existingToast = document.getElementById(coachPaymentToastElementId);
  if (existingToast) {
    existingToast.remove();
  }
}

function showCoachPaymentToast(nextToast) {
  if (typeof window === "undefined" || typeof document === "undefined" || !nextToast) return;

  removeCoachPaymentToastElement();
  window.sessionStorage.setItem(coachPaymentToastStorageKey, JSON.stringify(nextToast));

  const toastElement = document.createElement("div");
  toastElement.id = coachPaymentToastElementId;
  toastElement.className = `coachPaymentToast ${nextToast.type === "error" ? "isError" : "isSuccess"}`;
  toastElement.setAttribute("role", "status");

  const titleElement = document.createElement("strong");
  titleElement.textContent = nextToast.type === "error" ? "Gagal" : "Berhasil";

  const messageElement = document.createElement("span");
  messageElement.textContent = nextToast.message || "";

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Tutup notifikasi");
  closeButton.textContent = "x";
  closeButton.addEventListener("click", () => {
    window.sessionStorage.removeItem(coachPaymentToastStorageKey);
    removeCoachPaymentToastElement();
  });

  toastElement.append(titleElement, messageElement, closeButton);
  document.body.appendChild(toastElement);

  if (nextToast.autoCloseMs) {
    window.setTimeout(() => {
      const storedToast = readStoredCoachPaymentToast();
      if (storedToast?.id === nextToast.id) {
        window.sessionStorage.removeItem(coachPaymentToastStorageKey);
        removeCoachPaymentToastElement();
      }
    }, nextToast.autoCloseMs);
  }
}

function notifyCoachPayment(type, message) {
  showCoachPaymentToast({
    id: Date.now(),
    type,
    message,
    autoCloseMs: type === "error" ? 12000 : 8000,
  });
}

function getTodayDateLong() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const yyyy = now.getFullYear();
  const monthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  return `${dd} ${monthNames[now.getMonth()]} ${yyyy}`;
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M15.8 15.8L21 21M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 16V4M12 4l-4 4M12 4l4 4M5 20h14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SoftSelect({ value, onChange, options, className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);
  const selectedOption = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    function handleOutsideClick(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div className={`coachSoftSelect ${className} ${isOpen ? "is-open" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="coachSoftSelectTrigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        <span>{selectedOption.label}</span>
        <span className="coachSoftSelectChevron" aria-hidden="true">
          <svg viewBox="0 0 20 20" fill="none">
            <path
              d="M5 7.5L10 12.5L15 7.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
      {isOpen && (
        <ul className="coachSoftSelectMenu" role="listbox">
          {options.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                className={`coachSoftSelectOption ${value === option.value ? "is-selected" : ""}`}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PembayaranPelatih({
  paymentSubmissions = [],
  studentDirectory = [],
  onUploadPayment,
  onDeletePayment,
  ...layoutProps
}) {
  const fileInputRef = useRef(null);
  const searchWrapRef = useRef(null);
  const [activeSection, setActiveSection] = useState("upload");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [selectedPaymentType, setSelectedPaymentType] = useState("");
  const [isStudentMenuOpen, setIsStudentMenuOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewZoom, setPreviewZoom] = useState(1);
  const [localPaymentSubmissions, setLocalPaymentSubmissions] = useState(paymentSubmissions);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingPaymentIds, setDeletingPaymentIds] = useState([]);

  useEffect(() => {
    setLocalPaymentSubmissions(paymentSubmissions);
  }, [paymentSubmissions]);

  useEffect(() => {
    const storedToast = readStoredCoachPaymentToast();
    if (storedToast) {
      showCoachPaymentToast(storedToast);
    }

    return removeCoachPaymentToastElement;
  }, []);

  const availableStudents = useMemo(() => {
    return studentDirectory.map((student, index) => ({
      id: student.id ?? index + 1,
      name: student.name,
      category: student.category,
    }));
  }, [studentDirectory]);

  const normalizedSearch = searchText.trim().toLowerCase();

  const studentsByCategory = useMemo(() => {
    return availableStudents.filter((student) => {
      return selectedCategory === "all" || student.category === selectedCategory;
    });
  }, [availableStudents, selectedCategory]);

  const studentSuggestions = useMemo(() => {
    return studentsByCategory.filter((student) => {
      if (!normalizedSearch) return true;
      return student.name.toLowerCase().startsWith(normalizedSearch);
    });
  }, [studentsByCategory, normalizedSearch]);

  const selectedStudent = useMemo(() => {
    if (selectedStudentId == null) return null;
    const found = availableStudents.find((student) => student.id === selectedStudentId) || null;
    if (!found) return null;
    const stillInCategory = selectedCategory === "all" || found.category === selectedCategory;
    return stillInCategory ? found : null;
  }, [availableStudents, selectedStudentId, selectedCategory]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!searchWrapRef.current?.contains(event.target)) {
        setIsStudentMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const visibleHistory = useMemo(() => {
    return localPaymentSubmissions
      .filter((item) => {
        const itemName = (item.studentName || "").toLowerCase();
        const categoryMatch = selectedCategory === "all" || item.category === selectedCategory;
        const nameMatch = !normalizedSearch || itemName.startsWith(normalizedSearch);
        return categoryMatch && nameMatch;
      })
      .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
  }, [localPaymentSubmissions, selectedCategory, normalizedSearch]);

  const canSaveUpload = Boolean(selectedFile && selectedStudent && selectedPaymentType);

  const handleFileChange = (file) => {
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED_UPLOAD_EXTENSIONS.includes(extension || "")) {
      notifyCoachPayment("error", "File harus berupa gambar JPG, JPEG, PNG, WEBP, atau PDF.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      notifyCoachPayment("error", `Ukuran file maksimal ${MAX_UPLOAD_SIZE_MB} MB.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const uploadPaymentToServer = async (submission) => {
    if (!window.axios) return false;

    const formData = new FormData();
    formData.append("id_siswa", submission.studentId);
    formData.append("jenis", backendPaymentType[submission.paymentType] || submission.paymentTypeLabel);
    formData.append("tanggal_bukti_bayar", new Date(submission.paidDate).toISOString().slice(0, 10));
    formData.append("bukti_bayar", submission.proofFile);

    const response = await window.axios.post("/api/pelatih/bukti-pembayaran/tambah", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    if (response.data?.success === false) return false;

    return response.data?.data || true;
  };

  const handleSaveUpload = async () => {
    if (!canSaveUpload || isSaving) return;
    const student = selectedStudent;
    if (!student) return;
    const nextSubmission = {
      id: Date.now(),
      studentId: student.id,
      studentName: student.name,
      category: student.category,
      categoryLabel: categoryLabel[student.category],
      paymentType: selectedPaymentType,
      paymentTypeLabel:
        paymentTypeOptions.find((item) => item.value === selectedPaymentType)?.label || "",
      paidDate: new Date().toISOString(),
      paidDateLabel: getTodayDateLong(),
      amount: paymentAmounts[selectedPaymentType] || 0,
      proofFile: selectedFile,
      proofFileName: selectedFile.name,
      proofFileType: selectedFile.type,
      createdAt: Date.now(),
    };

    setIsSaving(true);
    removeCoachPaymentToastElement();

    try {
      const uploadResult = onUploadPayment
        ? await onUploadPayment(nextSubmission)
        : await uploadPaymentToServer(nextSubmission);

      if (uploadResult === false) {
        notifyCoachPayment("error", "Bukti pembayaran gagal disimpan.");
        return;
      }

      const savedSubmission =
        uploadResult && typeof uploadResult === "object"
          ? {
              ...nextSubmission,
              id: uploadResult.id_bukti_pembayaran || uploadResult.id || nextSubmission.id,
              proofFile:
                uploadResult.bukti_bayar && typeof uploadResult.bukti_bayar === "string"
                  ? `/storage/${uploadResult.bukti_bayar.replace(/^\/+/, "")}`
                  : nextSubmission.proofFile,
              proofFileName: uploadResult.bukti_bayar || nextSubmission.proofFileName,
            }
          : nextSubmission;

      setLocalPaymentSubmissions((prev) => [savedSubmission, ...prev]);
      notifyCoachPayment("success", "Bukti pembayaran berhasil disimpan.");
      router.reload({ preserveScroll: true, only: ["paymentSubmissions"] });
    } catch (error) {
      notifyCoachPayment(
        "error",
          Number(error?.response?.status || 0) >= 500
            ? "Bukti pembayaran gagal disimpan. Coba lagi atau cek koneksi server."
            : error?.response?.data?.message || "Bukti pembayaran gagal disimpan."
      );
      return;
    } finally {
      setIsSaving(false);
    }

    setSelectedFile(null);
    setSelectedPaymentType("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setActiveSection("history");
    setShowConfirmSave(false);
  };

  const handleDeleteHistory = async (item) => {
    if (deletingPaymentIds.includes(item.id)) return;

    setDeletingPaymentIds((prev) => [...prev, item.id]);
    removeCoachPaymentToastElement();

    try {
      let deleteResult = true;

      if (onDeletePayment) {
        deleteResult = await onDeletePayment(item.id);
      } else if (window.axios && item.id) {
        const response = await window.axios.delete(`/api/pelatih/bukti-pembayaran/${item.id}`);
        deleteResult = response.data?.success !== false;
      }

      if (deleteResult === false) {
        notifyCoachPayment("error", "Bukti pembayaran gagal dihapus.");
        return;
      }

      setLocalPaymentSubmissions((prev) => prev.filter((entry) => entry.id !== item.id));
      setDeleteTarget(null);
      notifyCoachPayment("success", "Bukti pembayaran berhasil dihapus.");
      router.reload({ preserveScroll: true, only: ["paymentSubmissions"] });
    } catch {
      notifyCoachPayment("error", "Bukti pembayaran gagal dihapus. Coba lagi.");
      return;
    } finally {
      setDeletingPaymentIds((prev) => prev.filter((id) => id !== item.id));
    }

    if (previewItem?.id === item.id) setPreviewItem(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
    }
  };

  const handleOpenFile = (item) => {
    if (!item.proofFile) return;
    if (typeof item.proofFile === "string") {
      window.open(item.proofFile, "_blank", "noopener,noreferrer");
      return;
    }
    const objectUrl = URL.createObjectURL(item.proofFile);
    if ((item.proofFileType || "").startsWith("image/")) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewItem(item);
      setPreviewUrl(objectUrl);
      setPreviewZoom(1);
      return;
    }
    window.open(objectUrl, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
  };

  const handlePickStudent = (student) => {
    setSelectedStudentId(student.id);
    setSearchText(student.name);
    setIsStudentMenuOpen(false);
  };

  return (
    <TataLetakPelatih activeTab="payments" title="Pembayaran" {...layoutProps}>
      <section className="coachCard coachPaymentCard">
        <h2>Bukti Pembayaran</h2>

        <div className="coachPaymentSwitch">
          <button
            type="button"
            className={activeSection === "upload" ? "is-active" : ""}
            onClick={() => setActiveSection("upload")}
          >
            Upload Bukti Pembayaran
          </button>
          <button
            type="button"
            className={activeSection === "history" ? "is-active" : ""}
            onClick={() => {
              setIsStudentMenuOpen(false);
              setActiveSection("history");
            }}
          >
            History Bukti Pembayaran
          </button>
        </div>

        <div className="coachPaymentFilters">
          <SoftSelect
            className="coachPaymentSelect"
            value={selectedCategory}
            onChange={(nextCategory) => {
              setSelectedCategory(nextCategory);
              setSelectedStudentId(null);
              setIsStudentMenuOpen(false);
            }}
            options={categoryOptions}
          />

          <div className="coachPaymentSearch" ref={searchWrapRef}>
            <input
              type="text"
              placeholder="Cari Nama Siswa"
              value={searchText}
              onFocus={() => {
                if (activeSection === "upload") setIsStudentMenuOpen(true);
              }}
              onChange={(event) => {
                setSearchText(event.target.value);
                setSelectedStudentId(null);
                if (activeSection === "upload") setIsStudentMenuOpen(true);
              }}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  activeSection === "upload" &&
                  isStudentMenuOpen &&
                  studentSuggestions.length > 0
                ) {
                  event.preventDefault();
                  handlePickStudent(studentSuggestions[0]);
                }
              }}
            />
            <span aria-hidden="true">
              <SearchIcon />
            </span>
            {activeSection === "upload" && isStudentMenuOpen ? (
              <div className="coachPaymentStudentDropdown">
                {studentSuggestions.length > 0 ? (
                  studentSuggestions.map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      className="coachPaymentStudentOption"
                      onClick={() => handlePickStudent(student)}
                    >
                      <strong>{student.name}</strong>
                      <small>{categoryLabel[student.category]}</small>
                    </button>
                  ))
                ) : (
                  <p className="coachPaymentStudentEmpty">Siswa tidak ditemukan.</p>
                )}
              </div>
            ) : null}
          </div>

          {activeSection === "upload" && (
            <SoftSelect
              className="coachPaymentTypeSelect"
              value={selectedPaymentType}
              onChange={setSelectedPaymentType}
              options={paymentTypeOptions}
            />
          )}
        </div>

        <div className="coachTabContent" key={`payments-${activeSection}`}>
          {activeSection === "upload" ? (
            <div className="coachPaymentUploadArea coachSectionSwap">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_UPLOAD_TYPES}
              className="coachPaymentFileInput"
              onChange={(event) => handleFileChange(event.target.files?.[0] || null)}
            />
            <button
              type="button"
              className="coachPaymentDropZone"
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="coachPaymentUploadIcon">
                <UploadIcon />
              </span>
              <strong>{selectedFile ? selectedFile.name : "Upload your file here"}</strong>
              <small>
                {selectedStudent
                  ? `Target siswa: ${selectedStudent.name} (${categoryLabel[selectedStudent.category]})`
                  : "Pilih siswa dari dropdown sesuai kategori"}
              </small>
              <small>
                {selectedPaymentType
                  ? `Jenis pembayaran: ${
                      paymentTypeOptions.find((item) => item.value === selectedPaymentType)?.label
                    }`
                  : "Pilih jenis pembayaran terlebih dahulu"}
              </small>
              <small>JPG, PNG, WEBP, atau PDF. Maks {MAX_UPLOAD_SIZE_MB} MB.</small>
            </button>

            <div className="coachPaymentSaveRow">
              <button
                type="button"
                className="coachPaymentSaveBtn"
                disabled={!canSaveUpload || isSaving}
                onClick={() => setShowConfirmSave(true)}
              >
                {isSaving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
            </div>
          ) : (
            <div className="coachPaymentHistoryList coachSectionSwap">
            {visibleHistory.length > 0 ? (
              visibleHistory.map((item, index) => (
                <article className="coachPaymentHistoryItem" key={item.id}>
                  <span>{index + 1}</span>
                  <strong>
                    {item.studentName} ({item.categoryLabel || categoryLabel[item.category] || "-"})
                  </strong>
                  <span>{item.categoryLabel || categoryLabel[item.category] || "-"}</span>
                  <span className="coachPaymentTypeBadge">
                    {item.paymentTypeLabel ||
                      paymentTypeOptions.find((option) => option.value === item.paymentType)?.label ||
                      "-"}
                  </span>
                  <time>{item.paidDateLabel || getTodayDateLong()}</time>
                  <div className="coachPaymentHistoryActions">
                    <button
                      type="button"
                      className="coachPaymentHistoryFileBtn"
                      onClick={() => handleOpenFile(item)}
                      disabled={!item.proofFile}
                    >
                      {item.proofFileName || "Bukti Pembayaran"}
                    </button>
                    <button
                      type="button"
                      className="coachPaymentHistoryDeleteBtn"
                      disabled={deletingPaymentIds.includes(item.id)}
                      onClick={() => setDeleteTarget(item)}
                    >
                      {deletingPaymentIds.includes(item.id) ? "Menghapus..." : "Hapus"}
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <p className="coachPaymentEmpty">Data history tidak ditemukan.</p>
            )}
            </div>
          )}
        </div>
      </section>

      {showConfirmSave && (
        <div className="coachModalOverlay" role="dialog" aria-modal="true" aria-label="Konfirmasi simpan pembayaran">
          <div className="coachModalCard">
            <h3>Konfirmasi Simpan</h3>
            <p>Apakah Anda yakin untuk menyimpan bukti pembayaran ini?</p>
            <div className="coachModalActions">
              <button
                type="button"
                className="coachModalBtn ghost"
                onClick={() => setShowConfirmSave(false)}
                disabled={isSaving}
              >
                Tidak
              </button>
              <button
                type="button"
                className="coachModalBtn primary"
                onClick={handleSaveUpload}
                disabled={isSaving}
              >
                {isSaving ? "Menyimpan..." : "Iya"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="coachModalOverlay" role="dialog" aria-modal="true" aria-label="Konfirmasi hapus bukti pembayaran">
          <div className="coachModalCard">
            <h3>Konfirmasi Hapus</h3>
            <p>Apakah yakin ingin menghapus bukti pembayaran {deleteTarget.studentName}?</p>
            <div className="coachModalActions">
              <button
                type="button"
                className="coachModalBtn ghost"
                onClick={() => setDeleteTarget(null)}
                disabled={deletingPaymentIds.includes(deleteTarget.id)}
              >
                Tidak
              </button>
              <button
                type="button"
                className="coachModalBtn primary"
                onClick={() => handleDeleteHistory(deleteTarget)}
                disabled={deletingPaymentIds.includes(deleteTarget.id)}
              >
                {deletingPaymentIds.includes(deleteTarget.id) ? "Menghapus..." : "Iya"}
              </button>
            </div>
          </div>
        </div>
      )}

      {previewItem && previewUrl && (
        <div className="coachModalOverlay" role="dialog" aria-modal="true" aria-label="Preview bukti pembayaran">
          <div className="coachPaymentPreviewCard">
            <div className="coachPaymentPreviewHead">
              <h3>Preview Bukti Pembayaran</h3>
              <div className="coachPaymentPreviewZoom">
                <button
                  type="button"
                  className="coachPaymentPreviewZoomBtn"
                  onClick={() => setPreviewZoom((prev) => Math.max(0.5, Number((prev - 0.25).toFixed(2))))}
                >
                  -
                </button>
                <span>{Math.round(previewZoom * 100)}%</span>
                <button
                  type="button"
                  className="coachPaymentPreviewZoomBtn"
                  onClick={() => setPreviewZoom((prev) => Math.min(3, Number((prev + 0.25).toFixed(2))))}
                >
                  +
                </button>
                <button
                  type="button"
                  className="coachPaymentPreviewZoomReset"
                  onClick={() => setPreviewZoom(1)}
                >
                  Reset
                </button>
              </div>
            </div>
            <div className="coachPaymentPreviewViewport">
              <img
                src={previewUrl}
                alt={previewItem.proofFileName || "Bukti Pembayaran"}
                style={{ width: `${previewZoom * 100}%` }}
              />
            </div>
            <div className="coachModalActions">
              <button
                type="button"
                className="coachModalBtn primary"
                onClick={() => {
                  if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                  }
                  setPreviewUrl("");
                  setPreviewItem(null);
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </TataLetakPelatih>
  );
}


