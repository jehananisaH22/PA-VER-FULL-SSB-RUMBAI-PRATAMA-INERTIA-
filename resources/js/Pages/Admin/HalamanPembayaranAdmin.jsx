import { useEffect, useMemo, useRef, useState } from "react";
import Pagination from "../../components/Pagination";
import { createPortal } from "react-dom";
import { router } from "@inertiajs/react";
import "./HalamanPembayaranAdmin.css";

const ageOptions = [
  { value: "all", label: "Pilih Kategori Usia" },
  { value: "u10", label: "U-10" },
  { value: "u11", label: "U-11" },
  { value: "u12", label: "U-12" },
];

const notificationTypeOptions = [
  "Tagihan Pembayaran",
  "Pengingat Bukti Pembayaran",
  "Konfirmasi Validasi",
];

const validationStatusOptions = [
  "Menunggu Verifikasi",
  "Sudah Dibayar",
  "Belum Dibayar",
];

const dummyPaymentRows = [
  {
    id: "dummy-payment-1",
    source: "dummy",
    sourceLabel: "Pelatih",
    studentName: "Rafa Mahendra",
    category: "u10",
    categoryLabel: "U-10",
    paymentType: "bulanan",
    paymentTypeLabel: "Bulanan",
    paidDate: "2026-05-10",
    paidDateLabel: "10/05/2026",
    amount: 100000,
    proofFile: null,
    proofFileName: "dummy-bukti-bulanan.jpg",
    proofFileType: "image/jpeg",
    status: "Menunggu Verifikasi",
    createdAt: 1778374800000,
  },
  {
    id: "dummy-payment-2",
    source: "dummy",
    sourceLabel: "Pendaftaran",
    studentName: "Dimas Pratama",
    category: "u11",
    categoryLabel: "U-11",
    paymentType: "pendaftaran",
    paymentTypeLabel: "Pendaftaran",
    paidDate: "2026-05-08",
    paidDateLabel: "08/05/2026",
    amount: 280000,
    proofFile: null,
    proofFileName: "dummy-bukti-pendaftaran.jpg",
    proofFileType: "image/jpeg",
    status: "Sudah Dibayar",
    createdAt: 1778202000000,
  },
  {
    id: "dummy-payment-3",
    source: "dummy",
    sourceLabel: "Pelatih",
    studentName: "Farel Akbar",
    category: "u12",
    categoryLabel: "U-12",
    paymentType: "harian",
    paymentTypeLabel: "Harian",
    paidDate: "2026-05-04",
    paidDateLabel: "04/05/2026",
    amount: 35000,
    proofFile: null,
    proofFileName: "dummy-bukti-harian.jpg",
    proofFileType: "image/jpeg",
    status: "Belum Dibayar",
    createdAt: 1777856400000,
  },
];

const dummyPaymentIds = new Set(dummyPaymentRows.map((row) => row.id));

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M15.8 15.8 21 21M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HistoryTabIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 7.5v5l3 1.75M21 12a9 9 0 1 1-2.64-6.36M21 4.5v4.75h-4.75"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NotificationTabIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6.25 9.25a5.75 5.75 0 1 1 11.5 0v3.17l1.17 2.1a.75.75 0 0 1-.65 1.12H5.73a.75.75 0 0 1-.65-1.12l1.17-2.1V9.25ZM10 18.25a2 2 0 0 0 4 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ValidationTabIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 7h10M7 12h10M7 17h10M4 7h.01M4 12h.01M4 17h.01"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M5 7.5 10 12.5 15 7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <circle cx="40" cy="40" r="36" fill="#4f9d25" />
      <path
        d="M24 41.5 35 52 57 28"
        fill="none"
        stroke="#fff"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatCurrency(amount) {
  return `Rp${Number(amount || 0).toLocaleString("id-ID")},00`;
}

function formatTableDate(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
  return value;
}

function getChipClass(status) {
  if (status === "Sudah Dibayar") return "isPaid";
  if (status === "Belum Dibayar") return "isUnpaid";
  return "isPending";
}

function getStatusSelectClass(status) {
  if (status === "Sudah Dibayar") return "is-paid";
  if (status === "Belum Dibayar") return "is-unpaid";
  return "is-pending";
}

function normalizeCategoryValue(value) {
  const normalized = String(value || "").trim().toLowerCase().replace(/\s+/g, "");
  if (["u10", "u-10", "10"].includes(normalized)) return "u10";
  if (["u11", "u-11", "11"].includes(normalized)) return "u11";
  if (["u12", "u-12", "12"].includes(normalized)) return "u12";
  return normalized || "all";
}

function getCategoryLabel(value) {
  const normalized = normalizeCategoryValue(value);
  return ageOptions.find((option) => option.value === normalized)?.label || value || "-";
}

function normalizeNotificationStudent(student) {
  const studentName = student.name || student.studentName || student.nama_siswa || student.childName || "";
  const category = normalizeCategoryValue(student.category || student.categoryLabel || student.kategori || "");
  return {
    studentId: student.id || student.studentId || student.id_siswa || null,
    studentName,
    category,
    categoryLabel: getCategoryLabel(category),
  };
}

function AdminPaymentSelect({
  value,
  onChange,
  options,
  ariaLabel,
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);
  const selectedOption = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div className={`adminPaymentFilterSelect ${isOpen ? "is-open" : ""} ${className}`} ref={rootRef}>
      <button
        type="button"
        className="adminPaymentFilterSelectTrigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
      >
        <span>{selectedOption?.label}</span>
        <span className="adminPaymentFilterSelectIcon">
          <ChevronDownIcon />
        </span>
      </button>

      {isOpen ? (
        <div className="adminPaymentFilterSelectMenu" role="listbox" aria-label={ariaLabel}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`adminPaymentFilterSelectOption ${option.value === value ? "is-selected" : ""}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AdminPaymentStatusDropdown({
  value,
  onChange,
  options,
  ariaLabel,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [menuStyle, setMenuStyle] = useState(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const updateMenuPosition = () => {
      const triggerRect = triggerRef.current?.getBoundingClientRect();
      if (!triggerRect) return;

      const menuWidth = Math.max(Math.round(triggerRect.width), 168);
      const left = Math.min(
        Math.max(16, triggerRect.right - menuWidth),
        window.innerWidth - menuWidth - 16
      );
      const top = triggerRect.bottom + 8;

      setMenuStyle({
        position: "fixed",
        top,
        left,
        width: menuWidth,
        maxHeight: Math.max(132, window.innerHeight - top - 16),
      });
    };

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      const target = event.target;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div className={`adminPaymentStatusDropdown ${isOpen ? "is-open" : ""}`} ref={rootRef}>
      <button
        type="button"
        className={`adminPaymentStatusTrigger ${getStatusSelectClass(value)}`}
        ref={triggerRef}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
      >
        <span>{value}</span>
        <span className="adminPaymentStatusTriggerIcon" aria-hidden="true">
          <ChevronDownIcon />
        </span>
      </button>

      {isOpen && menuStyle
        ? createPortal(
            <div
              className="adminPaymentStatusMenu adminPaymentStatusMenuPortal"
              role="listbox"
              aria-label={ariaLabel}
              ref={menuRef}
              style={menuStyle}
            >
              {options.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`adminPaymentStatusOption ${getStatusSelectClass(option)} ${option === value ? "is-selected" : ""}`}
                  onClick={() => {
                    onChange(option);
                    setIsOpen(false);
                  }}
                >
                  {option}
                </button>
              ))}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

function buildPaymentRows(registrationPaymentSubmissions, coachPaymentSubmissions) {
  const registrationRows = registrationPaymentSubmissions.map((item) => ({
    id: item.id,
    source: item.source || "registration",
    sourceLabel: "Pendaftaran",
    studentName: item.childName || item.parentName || "-",
    category: item.category || "",
    categoryLabel: item.categoryLabel || "-",
    paymentType: item.paymentType || "Pendaftaran",
    paymentTypeLabel: item.paymentType === "Bulanan" ? "Uang Bulanan" : item.paymentType || "-",
    paidDate: item.paidDate || item.createdAt,
    paidDateLabel: formatTableDate(item.paidDate || item.createdAt),
    amount: Number(item.amount) || 0,
    proofFile: item.proofFile || null,
    proofFileName: item.proofFileName || "-",
    proofFileType: item.proofFileType || "",
    status: item.status || "Menunggu Verifikasi",
    createdAt: Number(item.createdAt || 0),
  }));

  const coachRows = coachPaymentSubmissions.map((item) => ({
    id: item.id,
    source: item.source || "coach",
    sourceLabel: "Pelatih",
    studentName: item.studentName || "-",
    category: item.category || "",
    categoryLabel: item.categoryLabel || "-",
    paymentType: item.paymentType || "-",
    paymentTypeLabel: item.paymentTypeLabel || item.paymentType || "-",
    paidDate: item.paidDate || item.createdAt,
    paidDateLabel: formatTableDate(item.paidDate || item.createdAt),
    amount: Number(item.amount) || 0,
    proofFile: item.proofFile || null,
    proofFileName: item.proofFileName || "-",
    proofFileType: item.proofFileType || "",
    status: item.status || "Menunggu Verifikasi",
    createdAt: Number(item.createdAt || 0),
  }));

  const rows = [...coachRows, ...registrationRows].sort((a, b) => b.createdAt - a.createdAt);
  return rows;
}

export default function HalamanPembayaranAdmin({
  registrationPaymentSubmissions = [],
  coachPaymentSubmissions = [],
  students = [],
  onUpdatePaymentStatus,
  onSendPaymentNotification,
  activeTab: controlledActiveTab,
  onActiveTabChange,
}) {
  const notificationStudentSearchRef = useRef(null);
  const [localActiveTab, setLocalActiveTab] = useState("validation");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationCategory, setNotificationCategory] = useState("all");
  const [notificationStudentName, setNotificationStudentName] = useState("");
  const [isNotificationStudentMenuOpen, setIsNotificationStudentMenuOpen] = useState(false);
  const [notificationType, setNotificationType] = useState(notificationTypeOptions[0]);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [previewRow, setPreviewRow] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [localStatusById, setLocalStatusById] = useState({});
  const [pendingStatusIds, setPendingStatusIds] = useState([]);
  const activeTab = controlledActiveTab || localActiveTab;
  const setActiveTab = onActiveTabChange || setLocalActiveTab;

  const paymentRows = useMemo(
    () => {
      const rows = buildPaymentRows(registrationPaymentSubmissions, coachPaymentSubmissions);
      const visibleRows = rows.length > 0 ? rows : dummyPaymentRows;

      return visibleRows.map((row) => ({
        ...row,
        status: localStatusById[row.id] || row.status,
      }));
    },
    [registrationPaymentSubmissions, coachPaymentSubmissions, localStatusById]
  );

  const filteredRows = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return paymentRows.filter((row) => {
      const categoryMatch = selectedCategory === "all" || row.category === selectedCategory;
      const nameMatch = !normalizedQuery || row.studentName.toLowerCase().includes(normalizedQuery);
      return categoryMatch && nameMatch;
    });
  }, [paymentRows, searchQuery, selectedCategory]);

  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsPageSize, setPaymentsPageSize] = useState(10);
  const totalPayments = filteredRows.length;
  const pagedPayments = useMemo(() => {
    const start = (paymentsPage - 1) * paymentsPageSize;
    return filteredRows.slice(start, start + paymentsPageSize);
  }, [filteredRows, paymentsPage, paymentsPageSize]);

  const notificationStudentOptions = useMemo(() => {
    const normalizedQuery = notificationStudentName.trim().toLowerCase();
    const rowsByStudent = [
      ...students.map(normalizeNotificationStudent),
      ...paymentRows.map(normalizeNotificationStudent),
    ].filter((row) => row.studentName);

    return rowsByStudent
      .filter((row) => notificationCategory === "all" || row.category === notificationCategory)
      .filter((row) => {
        if (!normalizedQuery) return true;
        return row.studentName.toLowerCase().includes(normalizedQuery);
      })
      .filter((row, index, array) =>
        array.findIndex(
          (item) =>
            item.category === row.category &&
            item.studentName.trim().toLowerCase() === row.studentName.trim().toLowerCase()
        ) === index
      )
      .slice(0, 8);
  }, [notificationCategory, notificationStudentName, paymentRows, students]);

  const selectedNotificationStudent = useMemo(() => {
    const normalizedName = notificationStudentName.trim().toLowerCase();
    if (!normalizedName) return null;

    const rowsByStudent = [
      ...students.map(normalizeNotificationStudent),
      ...paymentRows.map(normalizeNotificationStudent),
    ].filter((row) => row.studentName);

    return rowsByStudent.find((row) => {
      const nameMatch = row.studentName.trim().toLowerCase() === normalizedName;
      const categoryMatch = notificationCategory === "all" || row.category === notificationCategory;
      return nameMatch && categoryMatch;
    }) || null;
  }, [notificationCategory, notificationStudentName, paymentRows, students]);

  useEffect(() => {
    const trimmedName = notificationStudentName.trim();
    if (!trimmedName || notificationCategory === "all") return;

    const rowsByStudent = [
      ...students.map(normalizeNotificationStudent),
      ...paymentRows.map(normalizeNotificationStudent),
    ].filter((row) => row.studentName);
    const stillMatchesCategory = rowsByStudent.some(
      (row) =>
        row.category === notificationCategory &&
        row.studentName.trim().toLowerCase() === trimmedName.toLowerCase()
    );

    if (!stillMatchesCategory) {
      setNotificationStudentName("");
    }
  }, [notificationCategory, notificationStudentName, paymentRows, students]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (registrationPaymentSubmissions.length > 0 || coachPaymentSubmissions.length > 0) return;

    setLocalStatusById((prev) => {
      const next = { ...prev };
      let changed = false;

      dummyPaymentIds.forEach((id) => {
        if (next[id]) {
          delete next[id];
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [registrationPaymentSubmissions.length, coachPaymentSubmissions.length]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!notificationStudentSearchRef.current?.contains(event.target)) {
        setIsNotificationStudentMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!successMessage) return undefined;

    const timerId = window.setTimeout(() => {
      setSuccessMessage("");
    }, 2800);

    return () => window.clearTimeout(timerId);
  }, [successMessage]);

  const closePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl("");
    setPreviewRow(null);
  };

  const openProof = (row) => {
    if (!row?.proofFile) return;
    if (typeof row.proofFile === "string") {
      window.open(row.proofFile, "_blank", "noopener,noreferrer");
      return;
    }
    const objectUrl = URL.createObjectURL(row.proofFile);
    if ((row.proofFileType || "").startsWith("image/")) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(objectUrl);
      setPreviewRow(row);
      return;
    }
    window.open(objectUrl, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
  };

  const handleSendNotification = async () => {
    const trimmedMessage = notificationMessage.trim();
    const trimmedStudentName = notificationStudentName.trim();
    if (!trimmedMessage) return;

    const payload = {
      category: notificationCategory,
      studentId: selectedNotificationStudent?.studentId || null,
      studentName: selectedNotificationStudent?.studentName || trimmedStudentName || "Semua siswa",
      notificationType,
      message: trimmedMessage,
    };

    if (onSendPaymentNotification) {
      onSendPaymentNotification(payload);
    } else if (window.axios) {
      const categoryLabel = ageOptions.find((option) => option.value === notificationCategory)?.label;

      await window.axios.post("/api/notifikasi/kirim", {
        judul: notificationType,
        isi: trimmedMessage,
        target_role: "orang_tua",
        id_siswa: payload.studentId ? [payload.studentId] : undefined,
        nama_siswa: payload.studentId ? undefined : (trimmedStudentName || undefined),
        kategori_umur:
          !payload.studentId && notificationCategory !== "all"
            ? categoryLabel
            : undefined,
      });

      router.reload({
        preserveScroll: true,
        only: ["notifications", "adminActivityHistory"],
      });
    }

    setNotificationMessage("");
    setNotificationStudentName("");
    setNotificationType(notificationTypeOptions[0]);
    setNotificationCategory("all");
    setSuccessMessage("Notifikasi berhasil dikirim");
  };

  const updatePaymentStatusOnServer = async (row, nextStatus) => {
    if (!row?.id || pendingStatusIds.includes(row.id)) return;
    if (nextStatus === "Menunggu Verifikasi" || row.source === "dummy") {
      setLocalStatusById((prev) => ({ ...prev, [row.id]: nextStatus }));
      return;
    }

    setPendingStatusIds((prev) => [...prev, row.id]);
    setLocalStatusById((prev) => ({ ...prev, [row.id]: nextStatus }));

    try {
      if (onUpdatePaymentStatus) {
        await onUpdatePaymentStatus({
          id: row.id,
          source: row.source,
          status: nextStatus,
        });
      } else if (window.axios) {
        const endpoint =
          nextStatus === "Sudah Dibayar"
            ? `/api/admin/bukti/diterima/${row.id}`
            : `/api/admin/bukti/ditolak/${row.id}`;
        await window.axios.post(endpoint);
      }

      setSuccessMessage(
        nextStatus === "Sudah Dibayar"
          ? "Pembayaran berhasil divalidasi"
          : "Pembayaran ditandai belum valid"
      );

      router.reload({
        preserveScroll: true,
        only: ["registrationPaymentSubmissions", "coachPaymentSubmissions", "notifications"],
      });
    } catch (error) {
      setLocalStatusById((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
      setSuccessMessage(
        error?.response?.data?.message || "Validasi pembayaran gagal diproses"
      );
    } finally {
      setPendingStatusIds((prev) => prev.filter((id) => id !== row.id));
    }
  };

  return (
    <section className="adminPaymentPage">
      <div className="adminPaymentToolbar">
        <label className="adminPaymentSearchBar">
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Cari"
            aria-label="Cari pembayaran"
          />
          <span aria-hidden="true">
            <SearchIcon />
          </span>
        </label>

        <div className="adminPaymentTabs" role="tablist" aria-label="Navigasi pembayaran admin">
          <button
            type="button"
            className={activeTab === "notification" ? "is-active" : ""}
            onClick={() => setActiveTab("notification")}
          >
            <span className="adminPaymentTabLabel">Notifikasi</span>
            <span className="adminPaymentTabIcon" aria-hidden="true">
              <NotificationTabIcon />
            </span>
          </button>
          <button
            type="button"
            className={activeTab === "validation" ? "is-active" : ""}
            onClick={() => setActiveTab("validation")}
          >
            <span className="adminPaymentTabLabel">Validasi Pembayaran</span>
            <span className="adminPaymentTabIcon" aria-hidden="true">
              <ValidationTabIcon />
            </span>
          </button>
        </div>
      </div>

      {activeTab === "notification" ? (
        <>
          <div className="adminPaymentFilterRow">
            <AdminPaymentSelect
              value={notificationCategory}
              onChange={setNotificationCategory}
              options={ageOptions}
              ariaLabel="Pilih kategori usia untuk notifikasi"
            />

            <label className="adminPaymentFilterSearch" ref={notificationStudentSearchRef}>
              <input
                type="text"
                value={notificationStudentName}
                onChange={(event) => setNotificationStudentName(event.target.value)}
                onFocus={() => setIsNotificationStudentMenuOpen(true)}
                placeholder="Cari Nama Siswa"
                autoComplete="off"
                aria-label="Cari nama siswa untuk notifikasi"
              />
              <span aria-hidden="true">
                <SearchIcon />
              </span>
              {isNotificationStudentMenuOpen ? (
                <div className="adminPaymentStudentDropdown">
                  {notificationStudentOptions.length > 0 ? (
                    notificationStudentOptions.map((row) => (
                      <button
                        key={`${row.studentId || row.studentName}-${row.category}`}
                        type="button"
                        className={`adminPaymentStudentOption ${notificationStudentName === row.studentName ? "is-selected" : ""}`}
                        onClick={() => {
                          setNotificationStudentName(row.studentName);
                          setNotificationCategory(row.category || "all");
                          setIsNotificationStudentMenuOpen(false);
                        }}
                      >
                        {row.studentName}
                      </button>
                    ))
                  ) : (
                    <p className="adminPaymentStudentEmpty">Nama siswa tidak ditemukan.</p>
                  )}
                </div>
              ) : null}
            </label>

            <AdminPaymentSelect
              value={notificationType}
              onChange={setNotificationType}
              options={notificationTypeOptions.map((option) => ({ value: option, label: option }))}
              ariaLabel="Pilih jenis notifikasi pembayaran"
              className="adminPaymentFilterSelectWide"
            />
          </div>

          <article className="adminCard adminPaymentComposeCard">
            <textarea
              value={notificationMessage}
              onChange={(event) => setNotificationMessage(event.target.value)}
              placeholder="Ketik Pesan"
              aria-label="Tulis notifikasi pembayaran"
            />
            <div className="adminPaymentComposeActions">
              <button
                type="button"
                className="adminPaymentPrimaryBtn"
                onClick={handleSendNotification}
                disabled={!notificationMessage.trim()}
              >
                Kirim
              </button>
            </div>
          </article>
        </>
      ) : (
        <>
          <div className="adminPaymentFilterRow">
            <AdminPaymentSelect
              value={selectedCategory}
              onChange={setSelectedCategory}
              options={ageOptions}
              ariaLabel="Filter kategori pembayaran"
            />
          </div>

          <article className="adminCard adminPaymentSurface">
            {activeTab === "history" ? (
              <div className="adminPaymentSurfaceHead">
                <div>
                  <span>Riwayat</span>
                  <h2>History Pembayaran</h2>
                </div>
                <HistoryTabIcon />
              </div>
            ) : null}
            <div className="adminTableWrap adminPaymentTableWrap">
              <table>
                <thead>
                  <tr>
                    <th>Nama Siswa</th>
                    <th>Jenis Pembayaran</th>
                    <th>Waktu</th>
                    <th>Nominal</th>
                    <th>Bukti</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length > 0 ? (
                    pagedPayments.map((row) => (
                      <tr key={row.id}>
                        <td className="adminPaymentNameCell">
                          <strong>{row.studentName}</strong>
                        </td>
                        <td>{row.paymentTypeLabel}</td>
                        <td>{row.paidDateLabel}</td>
                        <td>{formatCurrency(row.amount)}</td>
                        <td>
                          <button
                            type="button"
                            className="adminPaymentProofBtn"
                            onClick={() => openProof(row)}
                            disabled={!row.proofFile}
                          >
                            {row.proofFile ? "Lihat Bukti" : "Belum Ada Bukti"}
                          </button>
                        </td>
                        <td>
                          {activeTab === "validation" ? (
                            <AdminPaymentStatusDropdown
                              value={row.status}
                              options={validationStatusOptions}
                              onChange={(nextStatus) => updatePaymentStatusOnServer(row, nextStatus)}
                              aria-label={`Validasi pembayaran ${row.studentName}`}
                            />
                          ) : (
                            <span className={`adminChip ${getChipClass(row.status)}`}>{row.status}</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="adminPaymentEmptyCell">
                        Data pembayaran belum tersedia.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>
          <div className="adminTablePagination">
            <Pagination
              total={totalPayments}
              page={paymentsPage}
              pageSize={paymentsPageSize}
              onPageChange={(p) => setPaymentsPage(p)}
              onPageSizeChange={(s) => {
                setPaymentsPageSize(s);
                setPaymentsPage(1);
              }}
            />
          </div>
        </>
      )}

      {successMessage ? (
        <div className="adminPaymentToast" role="status" aria-live="polite">
          <strong>Berhasil</strong>
          <span>{successMessage}</span>
          <button type="button" onClick={() => setSuccessMessage("")} aria-label="Tutup notifikasi">
            x
          </button>
        </div>
      ) : null}

      {previewRow && previewUrl ? (
        <div className="adminPaymentOverlay" role="dialog" aria-modal="true" aria-label="Preview bukti pembayaran">
          <div className="adminPaymentPreviewCard">
            <div className="adminPaymentPreviewHead">
              <div>
                <h3>Bukti Pembayaran</h3>
                <p>
                  {previewRow.studentName} | {previewRow.paymentTypeLabel}
                </p>
              </div>
              <button type="button" className="adminPaymentPreviewClose" onClick={closePreview}>
                Tutup
              </button>
            </div>
            <div className="adminPaymentPreviewBody">
              <img src={previewUrl} alt={previewRow.proofFileName || "Bukti pembayaran"} />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

