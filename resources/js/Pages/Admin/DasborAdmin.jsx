import { useEffect, useMemo, useRef, useState } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import "./DasborAdmin.css";
import LogoSBB from "../../../assets/LogoSBB.png";
import MenuPng from "../../../assets/Menu.png";
import HomePng from "../../../assets/Home.png";
import PendaftaranPng from "../../../assets/Pendaftaran.png";
import SiswaPng from "../../../assets/Siswa.png";
import PelatihPng from "../../../assets/Pelatih.png";
import PembayaranPng from "../../../assets/Pembayaran.png";
import JadwalLatihanPng from "../../../assets/JadwalLatihan.png";
import MediaPromosiPng from "../../../assets/MediaPromosi.png";
import PrestasiPng from "../../../assets/Prestasi.png";
import ValidasiPendaftaranAdminPage from "./ValidasiPendaftaranAdmin";
import HalamanSiswaAdminPage from "./HalamanSiswaAdmin";
import HalamanPelatihAdminPage from "./HalamanPelatihAdmin";
import HalamanPembayaranAdminPage from "./HalamanPembayaranAdmin";
import BagianPrestasiAdminPage from "./BagianPrestasiAdmin";
import BagianJadwalLatihanAdminPage from "./BagianJadwalLatihanAdmin";
import BagianMediaPromosiAdminPage from "./BagianMediaPromosiAdmin";
import SiteFooter from "../SiteFooter";
import GreenSelect from "../../components/GreenSelect";

const ageCategoryStats = [
  { label: "U-10", value: 18 },
  { label: "U-12", value: 16 },
  { label: "U-11", value: 14 },
];

function isActiveStudentStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();
  return normalized === "" || normalized === "active" || normalized === "aktif";
}

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

const shortMonthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const currentYear = String(new Date().getFullYear());
const currentMonthName = monthNames[new Date().getMonth()];

function normalizeMonthName(value) {
  return String(value || "").trim().toLowerCase();
}

function formatAdminActivityDate(value) {
  const date = new Date(Number(value) || value || Date.now());
  if (Number.isNaN(date.getTime())) return "-";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}-${month}-${year} ${hours}.${minutes}`;
}

function normalizeAdminActivityRows(rows = []) {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((item, index) => {
      const createdAt = Number(item?.createdAt) || Date.parse(item?.created_at || "") || Date.now();
      const title = String(item?.title || "").trim();
      if (!title) return null;

      return {
        id: item?.id || `${createdAt}-${index}`,
        title,
        description: String(item?.description || "").trim(),
        createdAt,
      };
    })
    .filter(Boolean)
    .sort((leftItem, rightItem) => Number(rightItem.createdAt || 0) - Number(leftItem.createdAt || 0))
    .slice(0, 120);
}

function getScheduleRawId(scheduleId) {
  const rawValue = String(scheduleId || "").replace(/^schedule-/i, "");
  const numericId = Number(rawValue);
  return Number.isFinite(numericId) && numericId > 0 ? numericId : null;
}

function normalizeScheduleCategoryKey(value) {
  const normalized = String(value || "all").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (normalized === "u10" || normalized === "10") return "u10";
  if (normalized === "u11" || normalized === "11") return "u11";
  if (normalized === "u12" || normalized === "12") return "u12";
  return "all";
}

function categoryFromStudent(student) {
  const category = normalizeScheduleCategoryKey(student?.category);
  if (category !== "all") return category;

  const age = Number(student?.age ?? student?.umur);
  if (Number.isFinite(age)) {
    if (age <= 10) return "u10";
    if (age === 11) return "u11";
    return "u12";
  }

  return "all";
}

const scheduleDayIndexes = {
  minggu: 0,
  senin: 1,
  selasa: 2,
  rabu: 3,
  kamis: 4,
  jumat: 5,
  sabtu: 6,
};

function formatLocalDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDateInput(value) {
  if (!value) return null;
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isWednesdayOrSundayDate(value) {
  const date = parseLocalDateInput(value);
  if (!date) return false;
  return date.getDay() === 0 || date.getDay() === 3;
}

function isRoutineTrainingSchedule(schedule) {
  if (schedule?.isRoutine === true) return true;
  const date = parseLocalDateInput(schedule?.date);
  if (!date) return false;
  return date.getDay() === 0 || date.getDay() === 3;
}

function getNextDateForScheduleDay(dayName, fallbackDate) {
  const normalizedDay = String(dayName || "").trim().toLowerCase();
  const targetDay = scheduleDayIndexes[normalizedDay];

  const fallback = parseLocalDateInput(fallbackDate);
  if (fallback) {
    if (targetDay === undefined || fallback.getDay() === targetDay) {
      return formatLocalDateInput(fallback);
    }
  }

  const date = fallback || new Date();

  if (targetDay !== undefined) {
    const currentDay = date.getDay();
    const daysUntilTarget = (targetDay - currentDay + 7) % 7;
    date.setDate(date.getDate() + daysUntilTarget);
  }

  return formatLocalDateInput(date);
}

function parseScheduleTimeRange(timeValue) {
  const cleaned = String(timeValue || "").replace(/WIB/gi, "").trim();
  const [startRaw, endRaw] = cleaned.split("-").map((item) => item?.trim());
  const normalizeTime = (value, fallback) => {
    const match = String(value || "").match(/(\d{1,2})[.:](\d{2})/);
    if (!match) return fallback;
    return `${match[1].padStart(2, "0")}:${match[2]}:00`;
  };

  return {
    jam_mulai: normalizeTime(startRaw, "16:00:00"),
    jam_selesai: normalizeTime(endRaw, "17:30:00"),
  };
}

const validationIdentityFields = [
  { key: "childName", label: "Nama Anak" },
  { key: "motherName", label: "Nama Ibu" },
  { key: "fatherName", label: "Nama Ayah" },
  { key: "age", label: "Umur" },
];

const validationUploadFields = [
  { key: "birthCert", label: "Upload Fotocopy Akta Kelahiran", note: "(1 Lembar)" },
  { key: "reportCard", label: "Upload Fotocopy Rapor (Biodata)", note: "(1 Lembar)" },
  { key: "familyCard", label: "Upload Fotocopy Kartu Keluarga", note: "(1 Lembar)" },
  { key: "photo", label: "Upload Pas Foto Warna 3x4", note: "(2 Lembar)" },
  { key: "paymentProof", label: "Upload Bukti Pembayaran Pendaftaran", note: "(1 Lembar)" },
];

const validationStatusPriority = {
  "Belum Diperiksa": 0,
  "Perlu Perbaikan": 1,
  "Tidak Valid": 2,
  Valid: 3,
};

const getValidationIdentityKey = (item) => `${item.email}-${item.name}`.toLowerCase();

const mergeValidationRows = (baseRows, incomingRows = []) => {
  const nextRows = [...baseRows];
  const existingIndexMap = new Map(
    nextRows.map((item, index) => [getValidationIdentityKey(item), index])
  );
  let nextNo = nextRows.length ? Math.max(...nextRows.map((item) => item.no)) + 1 : 1;

  incomingRows.forEach((registration) => {
    const normalized = {
      no: registration.no,
      name: registration.name || registration.childName || "Pendaftar Baru",
      email: registration.email || "-",
      phone: registration.phone || "-",
      status: registration.status,
      createdAt: registration.createdAt || Date.now(),
      childName: registration.childName || registration.name || "-",
      motherName: registration.motherName || "-",
      fatherName: registration.fatherName || "-",
      age: registration.age || "-",
      invalidIdentityFields: registration.invalidIdentityFields || [],
      invalidUploadFields: registration.invalidUploadFields || [],
      files: registration.files || {},
      fileObjects: registration.fileObjects || {},
    };
    const identityKey = getValidationIdentityKey(normalized);
    const existingIndex = existingIndexMap.get(identityKey);

    if (existingIndex !== undefined) {
      const existingRow = nextRows[existingIndex];
      const existingSort = Number(existingRow.createdAt ?? 0);
      const incomingSort = Number(normalized.createdAt ?? 0);
      if (incomingSort > existingSort) {
        nextRows[existingIndex] = {
          ...existingRow,
          ...normalized,
          status: normalized.status || existingRow.status || "Belum Diperiksa",
          no: normalized.no || existingRow.no,
        };
      }
      if (normalized.no) {
        nextRows[existingIndex] = {
          ...nextRows[existingIndex],
          no: normalized.no,
        };
      }
      return;
    }

    nextRows.push({
      no: normalized.no || nextNo,
      ...normalized,
      status: normalized.status || "Belum Diperiksa",
    });
    existingIndexMap.set(identityKey, nextRows.length - 1);
    nextNo = Math.max(nextNo + 1, Number(normalized.no || 0) + 1);
  });
  return nextRows;
};

const menuItems = [
  { key: "Home", icon: HomePng },
  { key: "Pendaftaran", icon: PendaftaranPng },
  { key: "Siswa", icon: SiswaPng },
  { key: "Pelatih", icon: PelatihPng },
  { key: "Pembayaran", icon: PembayaranPng },
  { key: "Jadwal Latihan", icon: JadwalLatihanPng },
  { key: "Media Promosi", icon: MediaPromosiPng },
  { key: "Prestasi", icon: PrestasiPng },
];

const adminMenuTitles = {
  Home: "Dashboard Admin",
  Pendaftaran: "Rekap Validasi",
  Siswa: "Data Siswa",
  Pelatih: "Data Pelatih",
  Pembayaran: "Pembayaran",
  "Jadwal Latihan": "Jadwal Latihan",
  "Media Promosi": "Media Promosi",
  Prestasi: "Prestasi",
};

const adminMenuSlugs = {
  Home: "dashboard",
  Pendaftaran: "pendaftaran",
  Siswa: "siswa",
  Pelatih: "pelatih",
  Pembayaran: "pembayaran",
  "Jadwal Latihan": "jadwal-latihan",
  "Media Promosi": "media-promosi",
  Prestasi: "prestasi",
};

const buildAdminMenuUrl = (menuKey) => {
  const slug = adminMenuSlugs[menuKey] || adminMenuSlugs.Home;
  return slug === adminMenuSlugs.Home ? "/admin/dashboard" : `/admin/dashboard/${slug}`;
};

const paymentCategoryOptions = [
  { value: "Semua", label: "Semua" },
  { value: "Pendaftaran", label: "Pendaftaran" },
  { value: "Pembayaran Harian", label: "Pembayaran Harian" },
];

function normalizeAdminPaymentType(value) {
  const normalized = String(value || "").trim().toLowerCase().replace(/\s+/g, "");
  if (["pendaftaran", "uangpendaftaran"].includes(normalized)) return "pendaftaran";
  if (["bulanan", "uangbulanan", "iuranbulanan", "pembayaranbulanan"].includes(normalized)) return "bulanan";
  if (["harian", "pembayaranharian"].includes(normalized)) return "harian";
  return normalized || "";
}

function adminPaymentCategoryFromType(value) {
  const type = normalizeAdminPaymentType(value);
  if (type === "harian") return "Pembayaran Harian";
  return "Pendaftaran";
}

function adminPaymentTypeLabel(value) {
  const type = normalizeAdminPaymentType(value);
  if (type === "harian") return "Harian";
  if (type === "pendaftaran") return "Pendaftaran";
  return value || "-";
}

const performanceCategoryOptions = [
  { value: "all", label: "Semua Kategori" },
  { value: "u10", label: "U-10" },
  { value: "u11", label: "U-11" },
  { value: "u12", label: "U-12" },
];

const formatDateId = (value) => {
  if (!value) return "-";
  const timestamp = Number(value);
  const date = Number.isNaN(timestamp) ? new Date(value) : new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID");
};

const formatCurrencyId = (value) => `Rp${Number(value || 0).toLocaleString("id-ID")},00`;

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3a5 5 0 0 0-5 5v2.8c0 .8-.2 1.6-.6 2.3L5 15v1h14v-1l-1.4-1.9a4.7 4.7 0 0 1-.6-2.3V8a5 5 0 0 0-5-5Zm0 18a2.5 2.5 0 0 0 2.4-2h-4.8a2.5 2.5 0 0 0 2.4 2Z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12Zm0 2.3c-3.9 0-7 2.2-7 4.8V21h14v-1.9c0-2.6-3.1-4.8-7-4.8Z" />
    </svg>
  );
}

function CountUpNumber({ value, duration = 900 }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let frameId = 0;
    const startTime = performance.now();
    const startValue = 0;
    const targetValue = Number(value) || 0;

    const animate = (time) => {
      const progress = Math.min((time - startTime) / duration, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      const nextValue = Math.round(startValue + (targetValue - startValue) * eased);
      setDisplayValue(nextValue);
      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [duration, value]);

  return <>{displayValue}</>;
}

function AdminFilterDropdown({
  value,
  options,
  isOpen,
  dropdownRef,
  onToggle,
  onSelect,
  ariaLabel,
}) {
  const selectedOption = options.find((item) => item.value === value) || options[0];

  return (
    <div className="adminFilterDropdown" ref={dropdownRef}>
      <button
        type="button"
        className={`adminFilterDropdownTrigger ${isOpen ? "isOpen" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        onClick={onToggle}
      >
        <span>{selectedOption?.label || "-"}</span>
        <i aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="adminFilterDropdownMenu" role="listbox" aria-label={ariaLabel}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`adminFilterDropdownItem ${option.value === value ? "isActive" : ""}`}
              onClick={() => onSelect(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function normalizePerformanceCategory(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^0-9a-z]/g, "");
}

function AdminEmptyState({ children }) {
  return <div className="adminEmptyState">{children}</div>;
}

function ValidasiPendaftaranAdmin({
  validationDocumentRows = [],
  setValidationDocumentRows,
  validationUploadFields = [],
  validationIdentityFields = [],
  getValidationChipClass,
  onSendValidationNotification,
  onCreateParentAccount,
  requestedOpenDocNo,
  onHandledRequestedOpenDocNo,
}) {
  const [selectedDocNo, setSelectedDocNo] = useState(validationDocumentRows[0]?.no ?? null);
  const selectedDocument =
    validationDocumentRows.find((item) => item.no === selectedDocNo) ?? validationDocumentRows[0] ?? null;

  useEffect(() => {
    if (!requestedOpenDocNo) return;
    setSelectedDocNo(requestedOpenDocNo);
    onHandledRequestedOpenDocNo?.();
  }, [onHandledRequestedOpenDocNo, requestedOpenDocNo]);

  useEffect(() => {
    if (selectedDocNo || validationDocumentRows.length === 0) return;
    setSelectedDocNo(validationDocumentRows[0].no);
  }, [selectedDocNo, validationDocumentRows]);

  const updateDocumentStatus = (row, status) => {
    setValidationDocumentRows?.((prevRows) =>
      prevRows.map((item) => (item.no === row.no ? { ...item, status } : item))
    );

    if (status === "Valid") {
      onCreateParentAccount?.({
        name: row.name,
        email: row.email,
        phone: row.phone,
        childName: row.childName,
        age: row.age,
      });
    }
  };

  const requestRevision = (row) => {
    const message = "Mohon lengkapi atau perbaiki data pendaftaran yang belum sesuai.";
    setValidationDocumentRows?.((prevRows) =>
      prevRows.map((item) => (item.no === row.no ? { ...item, status: "Perlu Perbaikan" } : item))
    );
    onSendValidationNotification?.({
      name: row.name,
      email: row.email,
      phone: row.phone,
      message,
      document: row,
      invalidIdentityFields: validationIdentityFields.map((item) => item.id),
      invalidUploadFields: validationUploadFields.map((item) => item.id),
    });
  };

  return (
    <section className="adminSectionPanel">
      <div className="adminSectionHead">
        <div>
          <h2>Validasi Berkas Pendaftaran</h2>
          <p>Periksa identitas, dokumen, dan status akun orang tua dari pendaftar baru.</p>
        </div>
      </div>

      <div className="adminSectionSplit">
        <article className="adminCard adminSectionCard">
          <div className="adminTableWrap">
            <table>
              <thead>
                <tr>
                  <th>Nama Anak</th>
                  <th>Email</th>
                  <th>No HP</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {validationDocumentRows.map((row) => (
                  <tr key={row.no || `${row.email}-${row.name}`}>
                    <td>{row.childName || row.name}</td>
                    <td>{row.email || "-"}</td>
                    <td>{row.phone || "-"}</td>
                    <td>
                      <span className={`adminChip ${getValidationChipClass(row.status)}`}>{row.status}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="adminSmallAction"
                        onClick={() => setSelectedDocNo(row.no)}
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
                {validationDocumentRows.length === 0 && (
                  <tr>
                    <td colSpan="5">
                      <AdminEmptyState>Belum ada pendaftaran yang perlu divalidasi.</AdminEmptyState>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="adminCard adminSectionCard adminDetailCard">
          {selectedDocument ? (
            <>
              <div className="adminDetailHead">
                <div>
                  <h3>{selectedDocument.childName || selectedDocument.name}</h3>
                  <p>{selectedDocument.email || "-"}</p>
                </div>
                <span className={`adminChip ${getValidationChipClass(selectedDocument.status)}`}>
                  {selectedDocument.status}
                </span>
              </div>

              <div className="adminDetailGrid">
                <div>
                  <span>Nama Ibu</span>
                  <strong>{selectedDocument.motherName || "-"}</strong>
                </div>
                <div>
                  <span>Nama Ayah</span>
                  <strong>{selectedDocument.fatherName || "-"}</strong>
                </div>
                <div>
                  <span>Usia</span>
                  <strong>{selectedDocument.age || "-"}</strong>
                </div>
                <div>
                  <span>No HP</span>
                  <strong>{selectedDocument.phone || "-"}</strong>
                </div>
              </div>

              <div className="adminFileList">
                <h4>Dokumen</h4>
                {Object.entries(selectedDocument.files || {}).map(([field, files]) => (
                  <div key={field}>
                    <span>{validationUploadFields.find((item) => item.id === field)?.label || field}</span>
                    <strong>{files?.length ? files.join(", ") : "-"}</strong>
                  </div>
                ))}
              </div>

              <div className="adminSectionActions">
                <button
                  type="button"
                  className="adminGhostAction"
                  onClick={() => requestRevision(selectedDocument)}
                >
                  Minta Perbaikan
                </button>
                <button
                  type="button"
                  className="adminPrimaryAction"
                  onClick={() => updateDocumentStatus(selectedDocument, "Valid")}
                >
                  Tandai Valid
                </button>
              </div>
            </>
          ) : (
            <AdminEmptyState>Pilih data pendaftaran untuk melihat detail.</AdminEmptyState>
          )}
        </article>
      </div>
    </section>
  );
}

function HalamanSiswaAdmin({ students = [], onDeleteStudent }) {
  const [localStudents, setLocalStudents] = useState(students);

  useEffect(() => setLocalStudents(students), [students]);

  const rows = onDeleteStudent ? students : localStudents;
  const deleteStudent = (studentId) => {
    if (onDeleteStudent) {
      onDeleteStudent(studentId);
      return;
    }
    setLocalStudents((prev) => prev.filter((item) => item.id !== studentId));
  };

  return (
    <section className="adminSectionPanel">
      <div className="adminSectionHead">
        <div>
          <h2>Data Siswa</h2>
          <p>Daftar siswa aktif berdasarkan akun yang sudah masuk ke sistem.</p>
        </div>
      </div>

      <article className="adminCard adminSectionCard">
        <div className="adminTableWrap">
          <table>
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>Kategori</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((student) => (
                <tr key={student.id || student.email}>
                  <td>{student.name}</td>
                  <td>{student.email || "-"}</td>
                  <td>{student.category || "-"}</td>
                  <td>
                    <button
                      type="button"
                      className="adminSmallAction adminDangerAction"
                      onClick={() => deleteStudent(student.id)}
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan="4">
                    <AdminEmptyState>Belum ada data siswa.</AdminEmptyState>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

function HalamanPelatihAdmin({ coaches = [], coachNotes = [], onAddCoach, onDeleteCoach }) {
  const [localCoaches, setLocalCoaches] = useState(coaches);
  const [formValues, setFormValues] = useState({ name: "", email: "" });

  useEffect(() => setLocalCoaches(coaches), [coaches]);

  const rows = onAddCoach || onDeleteCoach ? coaches : localCoaches;
  const addCoach = (event) => {
    event.preventDefault();
    const name = formValues.name.trim();
    const email = formValues.email.trim();
    if (!name || !email) return;

    if (onAddCoach) {
      onAddCoach({ name, email });
    } else {
      setLocalCoaches((prev) => [...prev, { id: Date.now(), name, email }]);
    }
    setFormValues({ name: "", email: "" });
  };

  const deleteCoach = (coachId) => {
    if (onDeleteCoach) {
      onDeleteCoach(coachId);
      return;
    }
    setLocalCoaches((prev) => prev.filter((item) => item.id !== coachId));
  };

  return (
    <section className="adminSectionPanel">
      <div className="adminSectionHead">
        <div>
          <h2>Data Pelatih</h2>
          <p>Kelola pelatih dan lihat catatan latihan terbaru.</p>
        </div>
      </div>

      <div className="adminSectionSplit">
        <article className="adminCard adminSectionCard">
          <form className="adminInlineForm" onSubmit={addCoach}>
            <input
              type="text"
              placeholder="Nama pelatih"
              value={formValues.name}
              onChange={(event) => setFormValues((prev) => ({ ...prev, name: event.target.value }))}
            />
            <input
              type="email"
              placeholder="Email"
              value={formValues.email}
              onChange={(event) => setFormValues((prev) => ({ ...prev, email: event.target.value }))}
            />
            <button type="submit" className="adminPrimaryAction">Tambah</button>
          </form>

          <div className="adminTableWrap">
            <table>
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Email</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((coach) => (
                  <tr key={coach.id || coach.email}>
                    <td>{coach.name}</td>
                    <td>{coach.email || "-"}</td>
                    <td>
                      <button
                        type="button"
                        className="adminSmallAction adminDangerAction"
                        onClick={() => deleteCoach(coach.id)}
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="adminCard adminSectionCard">
          <h3>Catatan Terbaru</h3>
          <div className="adminStackList">
            {coachNotes.map((note) => (
              <div key={note.id}>
                <strong>{note.studentName}</strong>
                <span>{note.coachName} - {note.date}</span>
                <p>{note.note}</p>
              </div>
            ))}
            {coachNotes.length === 0 && <AdminEmptyState>Belum ada catatan pelatih.</AdminEmptyState>}
          </div>
        </article>
      </div>
    </section>
  );
}

function HalamanPembayaranAdmin({
  registrationPaymentSubmissions = [],
  coachPaymentSubmissions = [],
  onUpdatePaymentStatus,
  onSendPaymentNotification,
  activeTab = "validation",
  onActiveTabChange,
}) {
  const baseRows = useMemo(() => {
    const registrationRows = registrationPaymentSubmissions.map((item) => ({
      id: item.id,
      source: "registration",
      name: item.childName || item.parentName || "-",
      type: item.paymentType || "Pendaftaran",
      date: item.paidDate || item.createdAt,
      amount: item.amount,
      status: item.status || "Menunggu Verifikasi",
      proofFileName: item.proofFileName || "-",
    }));

    const coachRows = coachPaymentSubmissions.map((item) => ({
      id: item.id,
      source: "coach",
      name: item.studentName || "-",
      type: item.paymentTypeLabel || item.paymentType || "-",
      date: item.paidDate || item.createdAt,
      amount: item.amount,
      status: item.status || "Menunggu Verifikasi",
      proofFileName: item.proofFileName || "-",
    }));

    return [...coachRows, ...registrationRows].sort((a, b) => Number(b.date || 0) - Number(a.date || 0));
  }, [coachPaymentSubmissions, registrationPaymentSubmissions]);
  const [localRows, setLocalRows] = useState(baseRows);

  useEffect(() => setLocalRows(baseRows), [baseRows]);

  const rows = onUpdatePaymentStatus ? baseRows : localRows;
  const shownRows = activeTab === "history" ? rows : rows.filter((item) => item.status === "Menunggu Verifikasi");
  const updatePayment = (row, status) => {
    if (onUpdatePaymentStatus) {
      onUpdatePaymentStatus({ id: row.id, source: row.source, status });
    } else {
      setLocalRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, status } : item)));
    }
    onSendPaymentNotification?.({ id: row.id, source: row.source, status });
  };

  return (
    <section className="adminSectionPanel">
      <div className="adminSectionHead">
        <div>
          <h2>Validasi Pembayaran</h2>
          <p>Periksa bukti pembayaran pendaftaran dan pembayaran harian.</p>
        </div>
        <div className="adminTabGroup">
          <button
            type="button"
            className={activeTab === "validation" ? "isActive" : ""}
            onClick={() => onActiveTabChange?.("validation")}
          >
            Validasi
          </button>
          <button
            type="button"
            className={activeTab === "history" ? "isActive" : ""}
            onClick={() => onActiveTabChange?.("history")}
          >
            Riwayat
          </button>
        </div>
      </div>

      <article className="adminCard adminSectionCard">
        <div className="adminTableWrap">
          <table>
            <thead>
              <tr>
                <th>Nama</th>
                <th>Jenis</th>
                <th>Tanggal</th>
                <th>Nominal</th>
                <th>Bukti</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {shownRows.map((row) => (
                <tr key={`${row.source}-${row.id}`}>
                  <td>{row.name}</td>
                  <td>{row.type}</td>
                  <td>{formatDateId(row.date)}</td>
                  <td>{formatCurrencyId(row.amount)}</td>
                  <td>{row.proofFileName}</td>
                  <td>
                    <span className={`adminChip ${row.status === "Sudah Dibayar" ? "isPaid" : "isPending"}`}>
                      {row.status}
                    </span>
                  </td>
                  <td>
                    <div className="adminRowActions">
                      <button
                        type="button"
                        className="adminSmallAction"
                        onClick={() => updatePayment(row, "Sudah Dibayar")}
                      >
                        Valid
                      </button>
                      <button
                        type="button"
                        className="adminSmallAction adminDangerAction"
                        onClick={() => updatePayment(row, "Belum Dibayar")}
                      >
                        Tolak
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {shownRows.length === 0 && (
                <tr>
                  <td colSpan="7">
                    <AdminEmptyState>Tidak ada pembayaran pada tab ini.</AdminEmptyState>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

function BagianPrestasiAdmin({ students = [], achievements = [], onAddAchievement }) {
  const [localAchievements, setLocalAchievements] = useState(achievements);
  const [formValues, setFormValues] = useState({ studentId: students[0]?.id || "", title: "" });

  useEffect(() => setLocalAchievements(achievements), [achievements]);
  useEffect(() => {
    if (!formValues.studentId && students[0]?.id) {
      setFormValues((prev) => ({ ...prev, studentId: students[0].id }));
    }
  }, [formValues.studentId, students]);

  const rows = onAddAchievement ? achievements : localAchievements;
  const addAchievement = (event) => {
    event.preventDefault();
    const student = students.find((item) => Number(item.id) === Number(formValues.studentId));
    const title = formValues.title.trim();
    if (!student || !title) return;

    if (onAddAchievement) {
      onAddAchievement({ studentId: student.id, title });
    } else {
      setLocalAchievements((prev) => [
        {
          id: Date.now(),
          studentId: student.id,
          studentName: student.name,
          category: student.category,
          title,
          createdAt: Date.now(),
        },
        ...prev,
      ]);
    }
    setFormValues((prev) => ({ ...prev, title: "" }));
  };

  return (
    <section className="adminSectionPanel">
      <div className="adminSectionHead">
        <div>
          <h2>Prestasi</h2>
          <p>Catat dan pantau prestasi siswa.</p>
        </div>
      </div>

      <article className="adminCard adminSectionCard">
        <form className="adminInlineForm" onSubmit={addAchievement}>
          <GreenSelect
            value={formValues.studentId}
            onChange={(nextValue) => setFormValues((prev) => ({ ...prev, studentId: nextValue }))}
            ariaLabel="Pilih siswa prestasi"
            className="adminInlineGreenSelect"
            options={students.map((student) => ({ value: student.id, label: student.name }))}
          />
          <input
            type="text"
            placeholder="Judul prestasi"
            value={formValues.title}
            onChange={(event) => setFormValues((prev) => ({ ...prev, title: event.target.value }))}
          />
          <button type="submit" className="adminPrimaryAction">Tambah</button>
        </form>

        <div className="adminStackList">
          {rows.map((item) => (
            <div key={item.id}>
              <strong>{item.title}</strong>
              <span>{item.studentName} - {item.category} - {formatDateId(item.createdAt)}</span>
            </div>
          ))}
          {rows.length === 0 && <AdminEmptyState>Belum ada prestasi siswa.</AdminEmptyState>}
        </div>
      </article>
    </section>
  );
}

function BagianJadwalLatihanAdmin({
  trainingSchedules = [],
  scheduleStudentDirectory = [],
  onUpdateTrainingSchedule,
  onAddTrainingSchedule,
  onSaveTrainingSchedule,
  onDeleteTrainingSchedule,
}) {
  const [localSchedules, setLocalSchedules] = useState(trainingSchedules);

  useEffect(() => setLocalSchedules(trainingSchedules), [trainingSchedules]);

  const rows = onUpdateTrainingSchedule || onAddTrainingSchedule || onDeleteTrainingSchedule
    ? trainingSchedules
    : localSchedules;

  const updateSchedule = (id, field, value) => {
    if (onUpdateTrainingSchedule) {
      onUpdateTrainingSchedule({ id, field, value });
    } else {
      setLocalSchedules((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
    }
  };

  const addSchedule = () => {
    if (onAddTrainingSchedule) {
      onAddTrainingSchedule();
      return;
    }
    setLocalSchedules((prev) => [
      ...prev,
      {
        id: `schedule-${Date.now()}`,
        day: "Senin",
        time: "16.00-17.30 WIB",
        place: "Lapangan Utama SSB Rumbai Pratama",
        category: "all",
        studentName: "all",
      },
    ]);
  };

  const deleteSchedule = (id) => {
    if (onDeleteTrainingSchedule) {
      onDeleteTrainingSchedule(id);
      return;
    }
    setLocalSchedules((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <section className="adminSectionPanel">
      <div className="adminSectionHead">
        <div>
          <h2>Jadwal Latihan</h2>
          <p>Atur jadwal latihan berdasarkan kategori atau siswa tertentu.</p>
        </div>
        <button type="button" className="adminPrimaryAction" onClick={addSchedule}>Tambah Jadwal</button>
      </div>

      <article className="adminCard adminSectionCard">
        <div className="adminScheduleList">
          {rows.map((schedule) => (
            <div key={schedule.id} className="adminScheduleEditor">
              <input
                type="text"
                value={schedule.day || ""}
                onChange={(event) => updateSchedule(schedule.id, "day", event.target.value)}
                aria-label="Hari"
              />
              <input
                type="text"
                value={schedule.time || ""}
                onChange={(event) => updateSchedule(schedule.id, "time", event.target.value)}
                aria-label="Waktu"
              />
              <input
                type="text"
                value={schedule.place || ""}
                onChange={(event) => updateSchedule(schedule.id, "place", event.target.value)}
                aria-label="Tempat"
              />
              <GreenSelect
                value={schedule.category || "all"}
                onChange={(nextValue) => updateSchedule(schedule.id, "category", nextValue)}
                ariaLabel="Kategori"
                className="adminScheduleGreenSelect"
                options={[
                  { value: "all", label: "Semua Kategori" },
                  { value: "u10", label: "U-10" },
                  { value: "u11", label: "U-11" },
                  { value: "u12", label: "U-12" },
                ]}
              />
              <GreenSelect
                value={schedule.studentName || "all"}
                onChange={(nextValue) => updateSchedule(schedule.id, "studentName", nextValue)}
                ariaLabel="Siswa"
                className="adminScheduleGreenSelect"
                options={[
                  { value: "all", label: "Semua Siswa" },
                  ...scheduleStudentDirectory.map((student) => ({
                    value: student.name,
                    label: student.name,
                  })),
                ]}
              />
              <button
                type="button"
                className="adminSmallAction adminDangerAction"
                onClick={() => deleteSchedule(schedule.id)}
              >
                Hapus
              </button>
            </div>
          ))}
          {rows.length === 0 && <AdminEmptyState>Belum ada jadwal latihan.</AdminEmptyState>}
        </div>
      </article>
    </section>
  );
}

function BagianMediaPromosiAdmin({ articles = [], onSaveArticle, onDeleteArticle }) {
  const [localArticles, setLocalArticles] = useState(articles);
  const [formValues, setFormValues] = useState({ title: "", body: "" });

  useEffect(() => setLocalArticles(articles), [articles]);

  const rows = onSaveArticle || onDeleteArticle ? articles : localArticles;
  const saveArticle = (event) => {
    event.preventDefault();
    const title = formValues.title.trim();
    const body = formValues.body.trim();
    if (!title || !body) return;

    const payload = {
      id: Date.now(),
      title,
      body,
      image: Berita1,
      imageName: "media-promosi.png",
      postedAt: Date.now(),
    };

    const saved = onSaveArticle?.(payload);
    if (!onSaveArticle || saved) {
      setLocalArticles((prev) => [payload, ...prev]);
    }
    setFormValues({ title: "", body: "" });
  };

  const deleteArticle = (articleId) => {
    if (onDeleteArticle) {
      onDeleteArticle(articleId);
      return;
    }
    setLocalArticles((prev) => prev.filter((item) => item.id !== articleId));
  };

  return (
    <section className="adminSectionPanel">
      <div className="adminSectionHead">
        <div>
          <h2>Media Promosi</h2>
          <p>Kelola berita dan publikasi singkat untuk halaman publik.</p>
        </div>
      </div>

      <div className="adminSectionSplit">
        <article className="adminCard adminSectionCard">
          <form className="adminArticleForm" onSubmit={saveArticle}>
            <input
              type="text"
              placeholder="Judul berita"
              value={formValues.title}
              onChange={(event) => setFormValues((prev) => ({ ...prev, title: event.target.value }))}
            />
            <textarea
              placeholder="Isi berita"
              value={formValues.body}
              onChange={(event) => setFormValues((prev) => ({ ...prev, body: event.target.value }))}
            />
            <button type="submit" className="adminPrimaryAction">Simpan</button>
          </form>
        </article>

        <article className="adminCard adminSectionCard">
          <div className="adminStackList">
            {rows.map((article) => (
              <div key={article.id}>
                <strong>{article.title}</strong>
                <span>{formatDateId(article.postedAt)} - {article.imageName || "tanpa gambar"}</span>
                <p>{article.body}</p>
                <button
                  type="button"
                  className="adminSmallAction adminDangerAction"
                  onClick={() => deleteArticle(article.id)}
                >
                  Hapus
                </button>
              </div>
            ))}
            {rows.length === 0 && <AdminEmptyState>Belum ada media promosi.</AdminEmptyState>}
          </div>
        </article>
      </div>
    </section>
  );
}

export default function DasborAdmin({
  onLogout,
  activeMenu,
  onNavigateMenu,
  notifications = [],
  userName = "Zulfahmi",
  incomingRegistrations = [],
  registrationPaymentSubmissions = [],
  coachPaymentSubmissions = [],
  parentProfiles = {},
  adminStudents = [],
  adminCoaches = [],
  adminCatatanPelatih = [],
  adminAttendanceRecaps = [],
  adminPerformanceHistory = [],
  trainingSchedules = [],
  mediaArticles = [],
  achievements = [],
  adminActivityHistory = [],
  scheduleStudentDirectory = [],
  onSendValidationNotification,
  onUpdatePaymentStatus,
  onUpdateTrainingSchedule,
  onAddTrainingSchedule,
  onSaveTrainingSchedule,
  onDeleteTrainingSchedule,
  onSaveMediaArticle,
  onDeleteMediaArticle,
  onAddAchievement,
  onDeleteStudent,
  onAddCoach,
  onDeleteCoach,
  onSendPaymentNotification,
  onCreateParentAccount,
  onRecordAdminActivity,
  onClearNotifications,
}) {
  const { props: inertiaProps = {} } = usePage();
  const currentActiveMenu = activeMenu || inertiaProps.activeMenu || "Home";
  const initialAdminActivityHistory =
    adminActivityHistory.length > 0 ? adminActivityHistory : inertiaProps.adminActivityHistory || [];
  const resolvedAdminStudents = adminStudents.filter((student) =>
    isActiveStudentStatus(student?.status)
  );
  const resolvedAdminCoaches = adminCoaches;
  const resolvedCoachNotes = adminCatatanPelatih;
  const resolvedMediaArticles = mediaArticles;
  const resolvedAchievements = achievements;
  const resolvedScheduleStudentDirectory =
    scheduleStudentDirectory.length > 0 ? scheduleStudentDirectory : resolvedAdminStudents;
  const [localTrainingSchedules, setLocalTrainingSchedules] = useState(trainingSchedules);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [selectedAgeCategory, setSelectedAgeCategory] = useState(ageCategoryStats[0].label);
  const [isAgeMenuOpen, setIsAgeMenuOpen] = useState(false);
  const [selectedAchievementYear, setSelectedAchievementYear] = useState(currentYear);
  const [activeAchievementMonth, setActiveAchievementMonth] = useState(null);
  const [isYearMenuOpen, setIsYearMenuOpen] = useState(false);
  const [yearQuery, setYearQuery] = useState(currentYear);
  const [selectedAttendanceMonth, setSelectedAttendanceMonth] = useState(currentMonthName);
  const [selectedAttendanceYear, setSelectedAttendanceYear] = useState(currentYear);
  const [isAttendanceMonthOpen, setIsAttendanceMonthOpen] = useState(false);
  const [isAttendanceYearOpen, setIsAttendanceYearOpen] = useState(false);
  const [activeAttendanceItem, setActiveAttendanceItem] = useState(null);
  const [selectedPerformanceCategory, setSelectedPerformanceCategory] = useState("all");
  const [isPerformanceCategoryOpen, setIsPerformanceCategoryOpen] = useState(false);
  const [localValidationDocumentRows, setLocalValidationDocumentRows] = useState([]);
  const [registrationRequestedDocNo, setRegistrationRequestedDocNo] = useState(null);
  const [selectedPaymentCategory, setSelectedPaymentCategory] = useState("Semua");
  const [isPaymentCategoryOpen, setIsPaymentCategoryOpen] = useState(false);
  const [selectedActivityMonth, setSelectedActivityMonth] = useState(currentMonthName);
  const [selectedActivityYear, setSelectedActivityYear] = useState(currentYear);
  const [isActivityMonthOpen, setIsActivityMonthOpen] = useState(false);
  const [isActivityYearOpen, setIsActivityYearOpen] = useState(false);
  const [localAdminActivityHistory, setLocalAdminActivityHistory] = useState(() =>
    normalizeAdminActivityRows(initialAdminActivityHistory)
  );
  const [paymentActiveTab, setPaymentActiveTab] = useState("validation");
  const [studentNotificationTargetName, setStudentNotificationTargetName] = useState(null);
  const [localNotifications, setLocalNotifications] = useState(notifications);
  const ageMenuRef = useRef(null);
  const yearMenuRef = useRef(null);
  const attendanceMonthRef = useRef(null);
  const attendanceYearRef = useRef(null);
  const performanceCategoryRef = useRef(null);
  const paymentCategoryRef = useRef(null);
  const activityMonthRef = useRef(null);
  const activityYearRef = useRef(null);
  const scheduleSaveTimersRef = useRef({});
  const resolvedTrainingSchedules =
    onUpdateTrainingSchedule || onAddTrainingSchedule || onDeleteTrainingSchedule
      ? trainingSchedules
      : localTrainingSchedules;
  const isValidationDocsPage = currentActiveMenu === "Pendaftaran";
  const isStudentsPage = currentActiveMenu === "Siswa";
  const isCoachesPage = currentActiveMenu === "Pelatih";
  const isPaymentsPage = currentActiveMenu === "Pembayaran";
  const isAchievementsPage = currentActiveMenu === "Prestasi";
  const isSchedulePage = currentActiveMenu === "Jadwal Latihan";
  const isMediaPage = currentActiveMenu === "Media Promosi";
  const unreadNotificationsCount = localNotifications.filter((item) => !item?.read).length;
  const hasNotifications = localNotifications.length > 0;

  useEffect(() => {
    setLocalNotifications(notifications);
  }, [notifications]);

  useEffect(() => {
    if (!isValidationDocsPage) return undefined;

    const refreshRegistrationRows = () => {
      router.reload({
        only: ["incomingRegistrations", "registrationPaymentSubmissions", "notifications"],
        preserveScroll: true,
        preserveState: true,
      });
    };

    const intervalId = window.setInterval(refreshRegistrationRows, 10000);
    return () => window.clearInterval(intervalId);
  }, [isValidationDocsPage]);

  useEffect(() => {
    if (currentActiveMenu !== "Home") return undefined;

    const refreshAdminDashboardData = () => {
      router.reload({
        only: [
          "incomingRegistrations",
          "registrationPaymentSubmissions",
          "coachPaymentSubmissions",
          "adminStudents",
          "adminCoaches",
          "adminAttendanceRecaps",
          "adminPerformanceHistory",
          "achievements",
          "notifications",
        ],
        preserveScroll: true,
        preserveState: true,
      });
    };

    const intervalId = window.setInterval(refreshAdminDashboardData, 10000);
    return () => window.clearInterval(intervalId);
  }, [currentActiveMenu]);

  useEffect(() => {
    if (!window.axios) return undefined;

    let isMounted = true;
    window.axios.get("/api/admin/activity-history")
      .then((response) => {
        if (!isMounted) return;
        setLocalAdminActivityHistory(normalizeAdminActivityRows(response?.data?.data || []));
      })
      .catch((error) => {
        console.warn("Gagal memuat history admin.", error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setLocalTrainingSchedules(trainingSchedules);
  }, [trainingSchedules]);

  useEffect(() => () => {
    Object.values(scheduleSaveTimersRef.current).forEach((timerId) => {
      window.clearTimeout(timerId);
    });
  }, []);

  const recordAdminActivity = ({ title, description }) => {
    const normalizedTitle = String(title || "").trim();
    if (!normalizedTitle) return;

    if (onRecordAdminActivity) {
      onRecordAdminActivity({ title: normalizedTitle, description });
      return;
    }

    const createdAt = Date.now();
    const optimisticItem = {
      id: `${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
      title: normalizedTitle,
      description: String(description || "").trim(),
      createdAt,
    };

    setLocalAdminActivityHistory((prev) => normalizeAdminActivityRows([optimisticItem, ...prev]));

    if (!window.axios) return;

    window.axios.post("/api/admin/activity-history", {
      title: optimisticItem.title,
      description: optimisticItem.description,
    }).then((response) => {
      const savedItem = response?.data?.data;
      if (!savedItem) return;
      setLocalAdminActivityHistory((prev) =>
        normalizeAdminActivityRows([savedItem, ...prev.filter((item) => item.id !== optimisticItem.id)])
      );
    }).catch((error) => {
      console.warn("Gagal menyimpan history admin.", error);
    });
  };
  const dynamicAgeStats = useMemo(
    () => [
      { label: "U-10", value: resolvedAdminStudents.filter((item) => item.category === "U-10").length },
      { label: "U-11", value: resolvedAdminStudents.filter((item) => item.category === "U-11").length },
      { label: "U-12", value: resolvedAdminStudents.filter((item) => item.category === "U-12").length },
    ],
    [resolvedAdminStudents]
  );
  const totalStudentsCount = resolvedAdminStudents.length;

  const validationDocumentRows = useMemo(
    () => {
      const tokenizeName = (value) =>
        (value || "")
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, " ")
          .split(/\s+/)
          .filter((item) => item.length >= 3);

      const findParentByChildName = (studentName) => {
        const queryTokens = tokenizeName(studentName);
        const normalizedStudentName = (studentName || "").trim().toLowerCase();

        return Object.entries(parentProfiles).find(([, profile]) =>
          (profile.children || []).some((childName) => {
            const normalizedChildName = childName.trim().toLowerCase();
            if (normalizedChildName === normalizedStudentName) return true;

            const childTokens = tokenizeName(childName);
            return queryTokens.some((token) => childTokens.includes(token));
          })
        );
      };

      const coachRegistrationRows = coachPaymentSubmissions
        .filter((item) => item.paymentType === "pendaftaran")
        .map((item) => {
          const matchedParent = findParentByChildName(item.studentName);
          const parentEmail = matchedParent?.[0] || "-";
          const parentProfile = matchedParent?.[1] || {};

          return {
            key: `coach-registration-${item.id}`,
            createdAt: Number(item.createdAt || 0),
            name: item.studentName || "Pendaftar Baru",
            childName: item.studentName || "Pendaftar Baru",
            email: parentEmail,
            phone: parentProfile.phone || "-",
            status:
              parentProfile.validationStatus === "valid"
                ? "Valid"
                : parentProfile.validationStatus === "needs_fix"
                  ? "Perlu Perbaikan"
                  : "Belum Diperiksa",
            motherName: parentProfile.motherName || "-",
            fatherName: parentProfile.fatherName || "-",
            age: parentProfile.age || "-",
            files: {
              paymentProof: item.proofFileName ? [item.proofFileName] : [],
            },
            fileObjects: {
              paymentProof: item.proofFile ? [item.proofFile] : [],
            },
          };
        });

      return mergeValidationRows(localValidationDocumentRows, [
        ...incomingRegistrations,
        ...coachRegistrationRows,
      ]);
    },
    [coachPaymentSubmissions, incomingRegistrations, localValidationDocumentRows, parentProfiles]
  );

  const setValidationDocumentRows = (nextValue) => {
    setLocalValidationDocumentRows((prevRows) => {
      const currentRows = mergeValidationRows(prevRows, incomingRegistrations);
      if (typeof nextValue === "function") {
        return nextValue(currentRows);
      }
      return nextValue;
    });
  };

  const currentAttendanceData = useMemo(() => {
    const rows = adminAttendanceRecaps.filter(
      (item) =>
        normalizeMonthName(item.month) === normalizeMonthName(selectedAttendanceMonth) &&
        String(item.year) === String(selectedAttendanceYear)
    );

    if (rows.length === 0) {
      return [
        { label: "Hadir", value: 0, color: "#61b22d" },
        { label: "Sakit", value: 0, color: "#4f8f26" },
        { label: "Izin", value: 0, color: "#2f6420" },
      ];
    }

    const average = (key) =>
      Math.round(rows.reduce((sum, row) => sum + Number(row[key] || 0), 0) / rows.length);

    return [
      { label: "Hadir", value: average("hadir"), color: "#61b22d" },
      { label: "Sakit", value: average("sakit"), color: "#4f8f26" },
      { label: "Izin", value: average("izin"), color: "#2f6420" },
    ];
  }, [adminAttendanceRecaps, selectedAttendanceMonth, selectedAttendanceYear]);

  const totalAttendance = useMemo(
    () => currentAttendanceData.reduce((sum, item) => sum + item.value, 0),
    [currentAttendanceData]
  );

  const donutRadius = 42;
  const donutCircumference = 2 * Math.PI * donutRadius;

  const donutSegments = useMemo(() => {
    const result = currentAttendanceData.reduce(
      (acc, item) => {
        const ratio = totalAttendance === 0 ? 0 : item.value / totalAttendance;
        const dash = ratio * donutCircumference;
        const segment = {
          ...item,
          percent: Math.round(Number(item.value || 0)),
          dash,
          dashOffset: -acc.offset,
        };
        return {
          offset: acc.offset + dash,
          items: [...acc.items, segment],
        };
      },
      { offset: 0, items: [] }
    );
    return result.items;
  }, [currentAttendanceData, donutCircumference, totalAttendance]);

  const selectedAgeStat = useMemo(
    () =>
      dynamicAgeStats.find((item) => item.label === selectedAgeCategory) ??
      dynamicAgeStats[0] ??
      ageCategoryStats[0],
    [dynamicAgeStats, selectedAgeCategory]
  );

  const availableYears = useMemo(() => {
    const years = resolvedAchievements
      .map((item) => {
        if (item.year) return String(item.year);
        if (item.createdAt) return String(new Date(Number(item.createdAt)).getFullYear());
        return null;
      })
      .filter(Boolean);

    return Array.from(new Set([currentYear, ...years])).sort((a, b) => Number(b) - Number(a));
  }, [resolvedAchievements]);

  useEffect(() => {
    if (!resolvedAchievements.length) return;

    const hasSelectedAchievementYear = resolvedAchievements.some((item) => {
      const itemYear = item.year
        ? String(item.year)
        : item.createdAt
          ? String(new Date(Number(item.createdAt)).getFullYear())
          : "";

      return itemYear === String(selectedAchievementYear);
    });

    if (hasSelectedAchievementYear) return;

    const latestYear = resolvedAchievements
      .map((item) => {
        if (item.year) return String(item.year);
        if (item.createdAt) return String(new Date(Number(item.createdAt)).getFullYear());
        return null;
      })
      .filter(Boolean)
      .sort((leftYear, rightYear) => Number(rightYear) - Number(leftYear))[0];

    if (!latestYear) return;

    setSelectedAchievementYear(latestYear);
    setYearQuery(latestYear);
  }, [resolvedAchievements, selectedAchievementYear]);

  const attendanceYearOptions = useMemo(() => {
    const years = adminAttendanceRecaps
      .map((item) => (item.year ? String(item.year) : null))
      .filter(Boolean);

    return Array.from(new Set([currentYear, ...years])).sort((a, b) => Number(b) - Number(a));
  }, [adminAttendanceRecaps]);

  useEffect(() => {
    if (!adminAttendanceRecaps.length) return;

    const hasSelectedAttendancePeriod = adminAttendanceRecaps.some(
      (item) =>
        normalizeMonthName(item.month) === normalizeMonthName(selectedAttendanceMonth) &&
        String(item.year) === String(selectedAttendanceYear)
    );

    if (hasSelectedAttendancePeriod) return;

    const latest = [...adminAttendanceRecaps]
      .map((item) => {
        const monthIndex = monthNames.findIndex(
          (month) => normalizeMonthName(month) === normalizeMonthName(item.month)
        );

        return {
          ...item,
          monthIndex,
          sortValue: Number(item.year || 0) * 100 + (monthIndex + 1),
        };
      })
      .filter((item) => item.monthIndex >= 0 && item.year)
      .sort((leftItem, rightItem) => rightItem.sortValue - leftItem.sortValue)[0];

    if (!latest) return;

    setSelectedAttendanceMonth(monthNames[latest.monthIndex]);
    setSelectedAttendanceYear(String(latest.year));
  }, [adminAttendanceRecaps, selectedAttendanceMonth, selectedAttendanceYear]);

  const activityMonthOptions = useMemo(
    () => monthNames.map((month) => ({ value: month, label: month })),
    []
  );

  const activityYearOptions = useMemo(() => {
    const years = localAdminActivityHistory
      .map((item) => {
        const date = new Date(Number(item?.createdAt) || item?.createdAt || 0);
        return Number.isNaN(date.getTime()) ? null : String(date.getFullYear());
      })
      .filter(Boolean);

    return Array.from(new Set([currentYear, ...years])).sort((a, b) => Number(b) - Number(a))
      .map((year) => ({ value: year, label: year }));
  }, [localAdminActivityHistory]);

  const filteredYears = useMemo(() => {
    const query = yearQuery.trim();
    if (!query || query === selectedAchievementYear) return availableYears;
    return availableYears.filter((year) => year.includes(query));
  }, [availableYears, selectedAchievementYear, yearQuery]);

  const achievementData = useMemo(() => {
    const counts = monthNames.map((month) => ({
      month,
      value: resolvedAchievements.filter((item) => {
        const itemYear = item.year
          ? String(item.year)
          : item.createdAt
            ? String(new Date(Number(item.createdAt)).getFullYear())
            : "";
        const itemMonth = item.month
          ? normalizeMonthName(item.month)
          : item.createdAt
            ? normalizeMonthName(monthNames[new Date(Number(item.createdAt)).getMonth()])
            : "";

        return itemYear === String(selectedAchievementYear) && itemMonth === normalizeMonthName(month);
      }).length,
    }));
    const maxValue = Math.max(...counts.map((item) => item.value), 1);

    return counts.map((item) => ({
      ...item,
      height: item.value === 0 ? 0 : Math.max(8, Math.round((item.value / maxValue) * 100)),
    }));
  }, [resolvedAchievements, selectedAchievementYear]);

  const monthlyPerformanceAverages = useMemo(() => {
    const rows = adminPerformanceHistory.filter((item) => {
      const itemMonth = item.month
        ? normalizeMonthName(item.month)
        : item.date
          ? normalizeMonthName(monthNames[(new Date(item.date).getMonth())] || "")
          : "";
      const itemYear = item.year
        ? String(item.year)
        : item.date
          ? String(new Date(item.date).getFullYear())
          : "";
      const itemCategory = normalizePerformanceCategory(item.category);
      const selectedCategory = normalizePerformanceCategory(selectedPerformanceCategory);

      return (
        itemMonth === normalizeMonthName(currentMonthName) &&
        itemYear === currentYear &&
        (selectedPerformanceCategory === "all" || itemCategory === selectedCategory)
      );
    });

    const average = (key) => {
      if (rows.length === 0) return 0;
      const values = rows.map((row) => Number(row[key] || 0)).filter((value) => !Number.isNaN(value));
      if (values.length === 0) return 0;
      return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
    };

    return [
      { key: "dribbling", label: "Dribbling", value: average("dribbling"), color: "#6bd63c" },
      { key: "passing", label: "Passing", value: average("passing"), color: "#55aa30" },
      { key: "shooting", label: "Shooting", value: average("shooting"), color: "#3d8424" },
    ];
  }, [adminPerformanceHistory, selectedPerformanceCategory]);

  const sortedValidationRows = useMemo(
    () =>
      [...validationDocumentRows].sort((a, b) => {
        const aPriority = validationStatusPriority[a.status] ?? 4;
        const bPriority = validationStatusPriority[b.status] ?? 4;
        if (aPriority !== bPriority) return aPriority - bPriority;

        const aSort = Number(a.createdAt ?? a.no ?? 0);
        const bSort = Number(b.createdAt ?? b.no ?? 0);
        return bSort - aSort;
      }),
    [validationDocumentRows]
  );
  const adminPendingFilesRows = useMemo(
    () =>
      sortedValidationRows.slice(0, 8).map((item) => ({
        no: item.no,
        name: item.childName || item.name,
        email: item.email,
        phone: item.phone,
        status: item.status,
      })),
    [sortedValidationRows]
  );
  const allPaymentRows = useMemo(() => {
    const registrationRows = registrationPaymentSubmissions.map((item) => ({
      id: item.id,
      name: item.childName || item.parentName || "-",
      type: adminPaymentTypeLabel(item.paymentType || "Pendaftaran"),
      date: item.paidDate
        ? new Date(item.paidDate).toLocaleDateString("id-ID")
        : item.createdAt
          ? new Date(item.createdAt).toLocaleDateString("id-ID")
          : "-",
      amount: `Rp${Number(item.amount || 0).toLocaleString("id-ID")},00`,
      status: item.status || "Menunggu Verifikasi",
      proofFileName: item.proofFileName || "-",
      category: adminPaymentCategoryFromType(item.paymentType || "Pendaftaran"),
      createdAt: Number(item.createdAt || 0),
    }));

    const coachRows = coachPaymentSubmissions.map((item) => ({
      id: item.id,
      name: item.studentName || "-",
      type: adminPaymentTypeLabel(item.paymentTypeLabel || item.paymentType),
      date: item.paidDate
        ? new Date(item.paidDate).toLocaleDateString("id-ID")
        : item.createdAt
          ? new Date(item.createdAt).toLocaleDateString("id-ID")
          : "-",
      amount: `Rp${Number(item.amount || 0).toLocaleString("id-ID")},00`,
      status: item.status || "Menunggu Verifikasi",
      proofFileName: item.proofFileName || "-",
      category: adminPaymentCategoryFromType(item.paymentTypeLabel || item.paymentType),
      createdAt: Number(item.createdAt || 0),
    }));

    return [...coachRows, ...registrationRows]
      .filter((item) => normalizeAdminPaymentType(item.type) !== "bulanan")
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [coachPaymentSubmissions, registrationPaymentSubmissions]);
  const pendingPaymentRows = useMemo(
    () => allPaymentRows.filter((item) => item.status === "Menunggu Verifikasi"),
    [allPaymentRows]
  );
  const filteredPendingPayments = useMemo(() => {
    const pendingRows = pendingPaymentRows;
    if (selectedPaymentCategory === "Semua") return pendingRows;
    return pendingRows.filter((item) => item.category === selectedPaymentCategory);
  }, [pendingPaymentRows, selectedPaymentCategory]);
  const filteredAdminActivityHistory = useMemo(() => {
    return localAdminActivityHistory
      .filter((item) => {
        const date = new Date(Number(item?.createdAt) || item?.createdAt || 0);
        if (Number.isNaN(date.getTime())) return false;

        return (
          normalizeMonthName(monthNames[date.getMonth()]) === normalizeMonthName(selectedActivityMonth) &&
          String(date.getFullYear()) === String(selectedActivityYear)
        );
      })
      .sort((leftItem, rightItem) => Number(rightItem.createdAt || 0) - Number(leftItem.createdAt || 0))
      .slice(0, 20);
  }, [localAdminActivityHistory, selectedActivityMonth, selectedActivityYear]);
  const latestPendingPaymentId = filteredPendingPayments[0]?.id ?? null;
  const latestPendingValidationNo =
    adminPendingFilesRows.find((item) => item.status === "Belum Diperiksa")?.no ?? null;

  const getValidationChipClass = (status) => {
    if (status === "Valid") return "isPaid";
    if (status === "Tidak Valid") return "isUnpaid";
    if (status === "Perlu Perbaikan") return "isNeedsFix";
    return "isPending";
  };

  const navigateAdminMenu = (menuKey, options = {}) => {
    if (menuKey === "Pembayaran" && !options.keepPaymentTab) {
      setPaymentActiveTab("validation");
    }

    if (onNavigateMenu) {
      onNavigateMenu(menuKey);
      return;
    }

    router.get(buildAdminMenuUrl(menuKey), {}, {
      preserveScroll: true,
      preserveState: true,
    });
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
      return;
    }

    router.visit("/");
  };

  const handleOpenProfile = () => {
    setShowProfileMenu(false);
    router.visit("/profile/admin");
  };

  const markAdminNotificationsRead = async () => {
    const unreadIds = localNotifications
      .filter((item) => !item?.read && item?.id)
      .map((item) => item.id);

    if (unreadIds.length === 0) return;

    setLocalNotifications((prev) => prev.map((item) => ({ ...item, read: true })));

    if (window.axios && unreadIds.length > 0) {
      await Promise.allSettled(
        unreadIds.map((id) => window.axios.post(`/api/notifikasi/baca/${id}`))
      );
    }

    if (onClearNotifications) {
      onClearNotifications();
    }

    router.reload({ only: ["notifications"], preserveScroll: true, preserveState: true });
  };

  const markSingleAdminNotificationRead = async (notification) => {
    if (!notification?.id || notification?.read) return;

    setLocalNotifications((prev) =>
      prev.map((item) => item.id === notification.id ? { ...item, read: true } : item)
    );

    if (window.axios) {
      await window.axios.post(`/api/notifikasi/baca/${notification.id}`).catch(() => {});
    }
  };

  const handleAdminNotificationClick = async (notification) => {
    await markSingleAdminNotificationRead(notification);
    setShowNotificationMenu(false);
    const notificationText = String(notification?.text || "");
    const isStudentProfileNotification = /profil siswa/i.test(notificationText);
    const targetMenu = isStudentProfileNotification ? "Siswa" : notification?.actionMenu || "Home";

    if (targetMenu === "Siswa") {
      const matchedName = notificationText.match(/untuk siswa\s+(.+?)(?:\.|$)/i)?.[1]?.trim();
      setStudentNotificationTargetName(matchedName || null);
    }

    navigateAdminMenu(targetMenu);
  };

  const openValidationDetail = (docNo) => {
    navigateAdminMenu("Pendaftaran");
    setRegistrationRequestedDocNo(docNo);
  };

  useEffect(() => {
    if (!isAgeMenuOpen) return undefined;
    const handleOutsideClick = (event) => {
      if (!ageMenuRef.current?.contains(event.target)) {
        setIsAgeMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isAgeMenuOpen]);

  useEffect(() => {
    if (!isYearMenuOpen) return undefined;
    const handleOutsideClick = (event) => {
      if (!yearMenuRef.current?.contains(event.target)) {
        setIsYearMenuOpen(false);
        setYearQuery(selectedAchievementYear);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isYearMenuOpen, selectedAchievementYear]);

  useEffect(() => {
    if (!isAttendanceMonthOpen && !isAttendanceYearOpen) return undefined;
    const handleOutsideClick = (event) => {
      if (!attendanceMonthRef.current?.contains(event.target)) {
        setIsAttendanceMonthOpen(false);
      }
      if (!attendanceYearRef.current?.contains(event.target)) {
        setIsAttendanceYearOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isAttendanceMonthOpen, isAttendanceYearOpen]);

  useEffect(() => {
    if (!isPerformanceCategoryOpen) return undefined;
    const handleOutsideClick = (event) => {
      if (!performanceCategoryRef.current?.contains(event.target)) {
        setIsPerformanceCategoryOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isPerformanceCategoryOpen]);

  useEffect(() => {
    if (!isPaymentCategoryOpen) return undefined;
    const handleOutsideClick = (event) => {
      if (!paymentCategoryRef.current?.contains(event.target)) {
        setIsPaymentCategoryOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isPaymentCategoryOpen]);

  useEffect(() => {
    if (!isActivityMonthOpen && !isActivityYearOpen) return undefined;
    const handleOutsideClick = (event) => {
      if (!activityMonthRef.current?.contains(event.target)) {
        setIsActivityMonthOpen(false);
      }
      if (!activityYearRef.current?.contains(event.target)) {
        setIsActivityYearOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isActivityMonthOpen, isActivityYearOpen]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;

      router.reload({
        only: ["notifications"],
        preserveScroll: true,
        preserveState: true,
      });
    }, 12000);

    return () => window.clearInterval(intervalId);
  }, []);

  const applyYear = (yearValue) => {
    setSelectedAchievementYear(yearValue);
    setYearQuery(yearValue);
    setActiveAchievementMonth(null);
    setIsYearMenuOpen(false);
  };

  const buildTrainingSchedulePayload = (schedule) => {
    const selectedNames = Array.isArray(schedule?.studentNames)
      ? schedule.studentNames
      : schedule?.studentName && schedule.studentName !== "all"
        ? [schedule.studentName]
        : [];
    const category = normalizeScheduleCategoryKey(schedule?.category);
    const selectedNameSet = new Set(
      selectedNames.map((name) => String(name || "").trim().toLowerCase()).filter(Boolean)
    );
    const matchingStudents = resolvedScheduleStudentDirectory.filter((student) => {
      const studentCategory = categoryFromStudent(student);
      const studentName = String(student?.name || student?.nama_siswa || "").trim().toLowerCase();
      const matchesCategory = category === "all" || studentCategory === category;

      if (selectedNameSet.size > 0) {
        return selectedNameSet.has(studentName) && matchesCategory;
      }

      return matchesCategory;
    });
    const studentIds = matchingStudents
      .map((student) => Number(student?.id ?? student?.id_siswa))
      .filter((id) => Number.isFinite(id) && id > 0);
    const { jam_mulai, jam_selesai } = parseScheduleTimeRange(schedule?.time);
    const tanggal = getNextDateForScheduleDay(schedule?.day, schedule?.date);
    return {
      tanggal,
      jam_mulai,
      jam_selesai,
      lokasi: String(schedule?.place || schedule?.location || "").trim(),
      kategori_umur: category,
      id_siswa: studentIds,
    };
  };

  const reloadTrainingSchedules = () => {
    router.reload({
      only: ["trainingSchedules", "adminActivityHistory"],
      preserveScroll: true,
      preserveState: true,
    });
  };

  const saveTrainingSchedule = async (schedule) => {
    const rawId = getScheduleRawId(schedule?.rawId || schedule?.id);
    if (!window.axios) return false;

    const payload = buildTrainingSchedulePayload(schedule);
    if (!payload.lokasi) {
      throw new Error("Tempat latihan wajib diisi sebelum jadwal disimpan.");
    }

    if (payload.id_siswa.length === 0) {
      throw new Error("Pilih target siswa dulu sebelum jadwal disimpan.");
    }

    if (!isRoutineTrainingSchedule(schedule) && isWednesdayOrSundayDate(payload.tanggal)) {
      throw new Error("Latihan tambahan harus di luar hari Rabu dan Minggu.");
    }

    const applySavedScheduleToLocalRows = (rawScheduleId) => {
      const normalizedRawId = Number(rawScheduleId || rawId);
      if (!Number.isFinite(normalizedRawId) || normalizedRawId <= 0) return;

      setLocalTrainingSchedules((prev) =>
        prev.map((item) => {
          const itemRawId = getScheduleRawId(item.rawId || item.id || item.scheduleId);
          const isSameSchedule =
            item.id === schedule.id ||
            item.scheduleId === schedule.scheduleId ||
            itemRawId === normalizedRawId;

          return isSameSchedule
            ? {
                ...item,
                ...schedule,
                rawId: normalizedRawId,
                id: `schedule-${normalizedRawId}`,
                scheduleId: `schedule-${normalizedRawId}`,
                date: payload.tanggal,
                place: payload.lokasi,
                location: payload.lokasi,
              }
            : item;
        })
      );
    };

    if (rawId) {
      await window.axios.put(`/api/admin/jadwal-latihan/${rawId}`, payload, { timeout: 12000 });
      applySavedScheduleToLocalRows(rawId);
      return true;
    }

    const response = await window.axios.post("/api/admin/tambah-jadwal", payload, { timeout: 12000 });
    const savedSchedule = response?.data?.data;
    const savedId = savedSchedule?.id_jadwal;

    if (savedId) {
      applySavedScheduleToLocalRows(savedId);
    }

    return true;
  };

  const handleDefaultUpdateTrainingSchedule = ({ id, field, value }) => {
    if (!id || !field) return;

    setLocalTrainingSchedules((prev) => {
      const nextRows = prev.map((item) => {
        if (item.id !== id) return item;

        const nextItem = { ...item, [field]: value };
        if (field === "place") {
          nextItem.location = value;
        }

        if (field === "day") {
          nextItem.date = getNextDateForScheduleDay(value, nextItem.date);
        }

        if (field === "studentNames") {
          nextItem.studentNames = Array.isArray(value) ? value : [];
          nextItem.studentName = nextItem.studentNames.length === 1 ? nextItem.studentNames[0] : "all";
        }

        if (field === "category") {
          nextItem.studentNames = [];
          nextItem.studentName = "all";
        }

        return nextItem;
      });

      return nextRows;
    });
  };

  const handleDefaultAddTrainingSchedule = async () => {
    const draftId = `draft-${Date.now()}`;
    const draftSchedule = {
      id: draftId,
      rawId: null,
      scheduleId: draftId,
      day: "Senin",
      time: "16.00-17.30 WIB",
      place: "",
      location: "",
      category: "all",
      studentName: "all",
      studentNames: [],
    };

    setLocalTrainingSchedules((prev) => [draftSchedule, ...prev]);
    return true;
  };

  const handleDefaultSaveTrainingSchedule = async (scheduleId) => {
    const schedule = typeof scheduleId === "object" && scheduleId !== null
      ? scheduleId
      : localTrainingSchedules.find(
          (item) => item.id === scheduleId || item.scheduleId === scheduleId
        );

    if (!schedule) {
      throw new Error("Jadwal tidak ditemukan di tampilan.");
    }

    return saveTrainingSchedule(schedule);
  };

  const handleDefaultDeleteTrainingSchedule = async (scheduleId) => {
    const rawId = getScheduleRawId(scheduleId);
    if (!rawId || !window.axios) return;

    const removeScheduleFromView = () => {
      setLocalTrainingSchedules((prev) =>
        prev.filter((item) => {
          const itemRawId = getScheduleRawId(item.rawId || item.id || item.scheduleId);
          return item.id !== scheduleId && item.scheduleId !== scheduleId && itemRawId !== rawId;
        })
      );
    };

    try {
      await window.axios.delete(`/api/admin/jadwal-latihan/${rawId}`);
      removeScheduleFromView();
      reloadTrainingSchedules();
      return true;
    } catch (error) {
      console.warn("Gagal menghapus jadwal latihan.", error);
      if (error?.response?.status === 404) {
        removeScheduleFromView();
        reloadTrainingSchedules();
        return true;
      }

      throw error;
    }
  };

  const effectiveUpdateTrainingSchedule = onUpdateTrainingSchedule || handleDefaultUpdateTrainingSchedule;
  const effectiveAddTrainingSchedule = onAddTrainingSchedule || handleDefaultAddTrainingSchedule;
  const effectiveSaveTrainingSchedule = onSaveTrainingSchedule || handleDefaultSaveTrainingSchedule;
  const effectiveDeleteTrainingSchedule = onDeleteTrainingSchedule || handleDefaultDeleteTrainingSchedule;

  return (
    <>
    <Head title={adminMenuTitles[currentActiveMenu] || "Dashboard Admin"} />
    <div className={`adminPage ${isMenuOpen ? "menuOpen" : "menuClosed"}`}>
      {isMenuOpen && (
        <button
          type="button"
          className="adminSidebarBackdrop"
          aria-label="Tutup sidebar"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      <div className="adminSidebarDock">
        <div className="adminSidebarBrand" aria-label="Logo SSB">
          <img src={LogoSBB} alt="Logo SSB" />
        </div>
        <aside className={`adminSidebar ${isMenuOpen ? "isOpen" : "isCollapsed"}`}>
          <div className="adminSidebarShell">
            <button
              type="button"
              className="adminMenuHeader"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-expanded={isMenuOpen}
              aria-controls="admin-sidebar-menu"
            >
              <span className="adminMenuIcon"><img src={MenuPng} alt="" /></span>
              {isMenuOpen && <strong>Menu</strong>}
            </button>

            <nav
              id="admin-sidebar-menu"
              className="adminMenuList isOpen"
              aria-label="Navigasi admin"
            >
              {menuItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={currentActiveMenu === item.key ? "isActive" : ""}
                  onClick={() => navigateAdminMenu(item.key)}
                >
                  <span className="adminNavIcon">
                    <img src={item.icon} alt="" />
                  </span>
                  {isMenuOpen && <span>{item.key}</span>}
                </button>
              ))}
            </nav>
          </div>
        </aside>
      </div>

      <div className="adminMain">
        <header className="adminTopbar">
          <h1>
            {adminMenuTitles[currentActiveMenu] || "Dashboard Admin"}
          </h1>
          <div className="adminTopActions">
            <button
              type="button"
              className="adminTopIcon"
              aria-label="Notifikasi"
              onClick={() => {
                setShowNotificationMenu((prev) => !prev);
                setShowProfileMenu(false);
              }}
            >
              <BellIcon />
              {unreadNotificationsCount > 0 && <span>{unreadNotificationsCount}</span>}
            </button>
            {showNotificationMenu && (
              <div className="adminNotifyMenu">
                {hasNotifications ? (
                  <>
                    <ul>
                      {localNotifications.slice(0, 8).map((item) => (
                        <li key={item.id} className={!item?.read ? "isUnread" : "isRead"}>
                          <button
                            type="button"
                            className="adminNotifyItemBtn"
                            onClick={() => handleAdminNotificationClick(item)}
                          >
                            <span className="adminNotifyDot" aria-hidden="true" />
                            <span className="adminNotifyText">{item.text}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      className="adminNotifyMarkRead"
                      disabled={unreadNotificationsCount === 0}
                      onClick={async () => {
                        await markAdminNotificationsRead();
                        setShowNotificationMenu(false);
                      }}
                    >
                      Tandai Dibaca
                    </button>
                  </>
                ) : (
                  <p>Tidak ada notifikasi.</p>
                )}
              </div>
            )}

            <div className="adminProfileWrap">
              <button
                type="button"
                className="adminProfileBtn"
                onClick={() => {
                  setShowProfileMenu((prev) => !prev);
                  setShowNotificationMenu(false);
                }}
              >
                <span className="adminTopIcon">
                  <UserIcon />
                </span>
                <strong>{userName}</strong>
              </button>
              {showProfileMenu && (
                <div className="adminProfileMenu">
                  <button type="button" onClick={handleOpenProfile}>
                    Profil
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      handleLogout();
                    }}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {isValidationDocsPage ? (
          <ValidasiPendaftaranAdminPage
            validationDocumentRows={validationDocumentRows}
            setValidationDocumentRows={setValidationDocumentRows}
            validationUploadFields={validationUploadFields}
            validationIdentityFields={validationIdentityFields}
            getValidationChipClass={getValidationChipClass}
            onSendValidationNotification={onSendValidationNotification}
            onCreateParentAccount={onCreateParentAccount}
            onRecordAdminActivity={recordAdminActivity}
            requestedOpenDocNo={currentActiveMenu === "Pendaftaran" ? registrationRequestedDocNo : null}
            onHandledRequestedOpenDocNo={() => setRegistrationRequestedDocNo(null)}
          />
        ) : isStudentsPage ? (
          <HalamanSiswaAdminPage
            students={resolvedAdminStudents}
            attendanceRecaps={adminAttendanceRecaps}
            performanceHistory={adminPerformanceHistory}
            onDeleteStudent={onDeleteStudent}
            onRecordAdminActivity={recordAdminActivity}
            requestedStudentName={currentActiveMenu === "Siswa" ? studentNotificationTargetName : null}
            onHandledRequestedStudentName={() => setStudentNotificationTargetName(null)}
          />
        ) : isCoachesPage ? (
          <HalamanPelatihAdminPage
            coaches={resolvedAdminCoaches}
            coachNotes={resolvedCoachNotes}
            onAddCoach={onAddCoach}
            onDeleteCoach={onDeleteCoach}
            onRecordAdminActivity={recordAdminActivity}
          />
        ) : isPaymentsPage ? (
          <HalamanPembayaranAdminPage
            registrationPaymentSubmissions={registrationPaymentSubmissions}
            coachPaymentSubmissions={coachPaymentSubmissions}
            students={resolvedAdminStudents}
            onUpdatePaymentStatus={onUpdatePaymentStatus}
            onSendPaymentNotification={onSendPaymentNotification}
            activeTab={paymentActiveTab}
            onActiveTabChange={setPaymentActiveTab}
          />
        ) : isAchievementsPage ? (
          <BagianPrestasiAdminPage
            students={resolvedAdminStudents}
            achievements={resolvedAchievements}
            onAddAchievement={onAddAchievement}
            onRecordAdminActivity={recordAdminActivity}
          />
        ) : isSchedulePage ? (
          <BagianJadwalLatihanAdminPage
            trainingSchedules={resolvedTrainingSchedules}
            scheduleStudentDirectory={resolvedScheduleStudentDirectory}
            onUpdateTrainingSchedule={effectiveUpdateTrainingSchedule}
            onAddTrainingSchedule={effectiveAddTrainingSchedule}
            onSaveTrainingSchedule={effectiveSaveTrainingSchedule}
            onDeleteTrainingSchedule={effectiveDeleteTrainingSchedule}
          />
        ) : isMediaPage ? (
          <BagianMediaPromosiAdminPage
            articles={resolvedMediaArticles}
            students={resolvedAdminStudents}
            onSaveArticle={onSaveMediaArticle}
            onDeleteArticle={onDeleteMediaArticle}
            onRecordAdminActivity={recordAdminActivity}
          />
        ) : (
          <>
        <section className="adminStatsGrid">
          <article className="adminCard adminStatCard">
            <div className="adminStatIcon"><UserIcon /></div>
            <div className="adminStatBody">
              <strong><CountUpNumber value={totalStudentsCount} /></strong>
              <p>Total Siswa</p>
            </div>
          </article>

          <article className={`adminCard adminStatCard adminStatCardAge ${isAgeMenuOpen ? "isMenuOpen" : ""}`}>
            <div className="adminStatIcon"><UserIcon /></div>
            <div className="adminStatBody adminStatBodyAge">
              <strong><CountUpNumber value={selectedAgeStat.value} /></strong>
              <p className="adminStatAgeText">{selectedAgeStat.label}</p>
              <div className="adminStatAgePickerWrap" ref={ageMenuRef}>
                <button
                  type="button"
                  id="age-category-select"
                  className={`adminStatAgeTrigger ${isAgeMenuOpen ? "isOpen" : ""}`}
                  aria-haspopup="listbox"
                  aria-expanded={isAgeMenuOpen}
                  aria-label="Pilih kategori umur"
                  onClick={() => setIsAgeMenuOpen((prev) => !prev)}
                >
                  <span className="adminStatAgeChevron" />
                </button>
                {isAgeMenuOpen && (
                  <div className="adminStatAgeMenu" role="listbox" aria-label="Kategori umur">
                    {dynamicAgeStats.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        className={`adminStatAgeMenuItem ${selectedAgeCategory === item.label ? "isActive" : ""}`}
                        onClick={() => {
                          setSelectedAgeCategory(item.label);
                          setIsAgeMenuOpen(false);
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </article>

          <article className="adminCard adminStatCard">
              <div className="adminStatIcon"><UserIcon /></div>
              <div className="adminStatBody">
                <strong><CountUpNumber value={resolvedAdminCoaches.length} /></strong>
                <p>Pelatih Aktif</p>
              </div>
          </article>
        </section>

        <section className="adminContentGrid adminHomeOverviewGrid">
          <article
            className="adminCard adminPanelWide adminPanelChart"
            onClick={() => {
              if (activeAchievementMonth) {
                setActiveAchievementMonth(null);
              }
            }}
          >
            <div className="adminPanelChartHead">
              <h2>Prestasi</h2>
              <div className="adminPanelYearPicker" ref={yearMenuRef}>
                <span>Tahun</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  className="adminPanelYearInput"
                  value={yearQuery}
                  onFocus={() => setIsYearMenuOpen(true)}
                  onChange={(event) => {
                    const nextValue = event.target.value.replace(/[^0-9]/g, "").slice(0, 4);
                    setYearQuery(nextValue);
                    setIsYearMenuOpen(true);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && yearQuery.length === 4) {
                      applyYear(yearQuery);
                    }
                    if (event.key === "Escape") {
                      setIsYearMenuOpen(false);
                      setYearQuery(selectedAchievementYear);
                    }
                  }}
                  aria-label="Ketik atau pilih tahun"
                />
                <button
                  type="button"
                  className="adminPanelYearToggle"
                  onClick={() => setIsYearMenuOpen((prev) => !prev)}
                  aria-label="Buka daftar tahun"
                >
                  <i aria-hidden="true" />
                </button>
                {isYearMenuOpen && (
                  <div className="adminPanelYearMenu" role="listbox" aria-label="Daftar tahun">
                    {filteredYears.map((year) => (
                      <button
                        key={year}
                        type="button"
                        className={`adminPanelYearItem ${selectedAchievementYear === year ? "isActive" : ""}`}
                        onClick={() => applyYear(year)}
                      >
                        {year}
                      </button>
                    ))}
                    {yearQuery.length === 4 && !availableYears.includes(yearQuery) && (
                      <button
                        type="button"
                        className="adminPanelYearItem adminPanelYearItemCustom"
                        onClick={() => applyYear(yearQuery)}
                      >
                        Gunakan {yearQuery}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="adminBarChart" role="img" aria-label="Grafik prestasi bulanan">
              {achievementData.map((item, index) => (
                <button
                  key={`${selectedAchievementYear}-${item.month}`}
                  type="button"
                  className={`adminBarColButton ${
                    activeAchievementMonth && activeAchievementMonth !== item.month ? "isDimmed" : ""
                  } ${activeAchievementMonth === item.month ? "isActive" : ""}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveAchievementMonth((prev) => (prev === item.month ? null : item.month));
                  }}
                  aria-label={`Prestasi ${item.month} ${item.value}`}
                >
                  <div className={`adminBarCol ${index % 2 === 0 ? "isDark" : "isBright"}`}>
                    <strong className={`adminBarValue ${item.value === 0 ? "isZero" : ""}`}>{item.value}</strong>
                    <div className="adminBarTrack">
                      <span
                        style={{
                          height: `${item.height ?? item.value}%`,
                          animationDelay: `${index * 0.08}s`,
                          animationDuration: `${520 + (item.height ?? item.value) * 4}ms`,
                        }}
                      />
                    </div>
                    <small>{shortMonthNames[index] || item.month}</small>
                  </div>
                </button>
              ))}
            </div>
          </article>

          <article className="adminCard adminPanelNarrow adminPerformanceAverageCard">
            <div className="adminPerformanceAverageHead">
              <h2>Rata-Rata Nilai Performa Bulan Ini</h2>
              <AdminFilterDropdown
                value={selectedPerformanceCategory}
                options={performanceCategoryOptions}
                isOpen={isPerformanceCategoryOpen}
                dropdownRef={performanceCategoryRef}
                ariaLabel="Filter kategori rata-rata performa"
                onToggle={() => setIsPerformanceCategoryOpen((prev) => !prev)}
                onSelect={(nextValue) => {
                  setSelectedPerformanceCategory(nextValue);
                  setIsPerformanceCategoryOpen(false);
                }}
              />
            </div>

            <div className="adminPerformanceAverageBars">
              {monthlyPerformanceAverages.map((item) => (
                <div className="adminPerformanceAverageRow" key={item.key}>
                  <span>{item.label}</span>
                  <div className="adminPerformanceAverageTrack" aria-hidden="true">
                    <i style={{ width: `${Math.min(Math.max(item.value, 0), 100)}%`, background: item.color }} />
                  </div>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>

            <div className="adminPerformanceAverageLegend">
              {monthlyPerformanceAverages.map((item) => (
                <span key={`legend-${item.key}`}>
                  <i style={{ background: item.color }} />
                  {item.label}
                </span>
              ))}
            </div>
          </article>

          <article className="adminCard adminPanelNarrow adminPanelAttendance">
            <div className="adminAttendanceHead">
              <h2>Kehadiran</h2>
              <div className="adminAttendanceFilters">
                <div className="adminAttendanceMonthPicker" ref={attendanceMonthRef}>
                  <span>Bulan</span>
                  <button
                    type="button"
                    className={`adminAttendancePickerTrigger ${isAttendanceMonthOpen ? "isOpen" : ""}`}
                    aria-haspopup="listbox"
                    aria-expanded={isAttendanceMonthOpen}
                    onClick={() => {
                      setIsAttendanceMonthOpen((prev) => !prev);
                      setIsAttendanceYearOpen(false);
                    }}
                  >
                    {selectedAttendanceMonth}
                    <i aria-hidden="true" />
                  </button>
                  {isAttendanceMonthOpen && (
                    <div className="adminAttendancePickerMenu" role="listbox" aria-label="Pilih bulan">
                      {monthNames.map((month) => (
                        <button
                          key={month}
                          type="button"
                          className={`adminAttendancePickerItem ${
                            month === selectedAttendanceMonth ? "isActive" : ""
                          }`}
                          onClick={() => {
                            setSelectedAttendanceMonth(month);
                            setActiveAttendanceItem(null);
                            setIsAttendanceMonthOpen(false);
                          }}
                        >
                          {month}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="adminAttendanceYearPicker" ref={attendanceYearRef}>
                  <span>Tahun</span>
                  <button
                    type="button"
                    className={`adminAttendancePickerTrigger ${isAttendanceYearOpen ? "isOpen" : ""}`}
                    aria-haspopup="listbox"
                    aria-expanded={isAttendanceYearOpen}
                    onClick={() => {
                      setIsAttendanceYearOpen((prev) => !prev);
                      setIsAttendanceMonthOpen(false);
                    }}
                  >
                    {selectedAttendanceYear}
                    <i aria-hidden="true" />
                  </button>
                  {isAttendanceYearOpen && (
                    <div className="adminAttendancePickerMenu" role="listbox" aria-label="Pilih tahun">
                      {attendanceYearOptions.map((year) => (
                        <button
                          key={year}
                          type="button"
                          className={`adminAttendancePickerItem ${
                            year === selectedAttendanceYear ? "isActive" : ""
                          }`}
                          onClick={() => {
                            setSelectedAttendanceYear(year);
                            setActiveAttendanceItem(null);
                            setIsAttendanceYearOpen(false);
                          }}
                        >
                          {year}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="adminDonutWrap">
              <div className="adminDonut">
                <svg viewBox="0 0 100 100" className="adminDonutSvg" aria-label="Grafik Kehadiran">
                  {donutSegments.map((item) => (
                    <circle
                      key={item.label}
                      className="adminDonutSegment"
                      cx="50"
                      cy="50"
                      r={donutRadius}
                      fill="none"
                      stroke={item.color}
                      strokeWidth="16"
                      strokeDasharray={`${item.dash} ${donutCircumference - item.dash}`}
                      strokeDashoffset={item.dashOffset}
                      strokeLinecap="round"
                      onMouseEnter={() => setActiveAttendanceItem(item)}
                      onMouseLeave={() => setActiveAttendanceItem(null)}
                      onClick={() =>
                        setActiveAttendanceItem((prev) => (prev?.label === item.label ? null : item))
                      }
                    />
                  ))}
                </svg>
                <div className="adminDonutInner" />
                <div className={`adminDonutCenterValue ${activeAttendanceItem ? "show" : ""}`}>
                  {activeAttendanceItem && (
                    <>
                      <span className="adminDonutCenterNumber">{activeAttendanceItem.percent}%</span>
                      <span className="adminDonutCenterLabel">{activeAttendanceItem.label}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <ul className="adminLegend">
              {donutSegments.map((item) => (
                <li
                  key={item.label}
                  onMouseEnter={() => setActiveAttendanceItem(item)}
                  onMouseLeave={() => setActiveAttendanceItem(null)}
                  onClick={() => {
                    setActiveAttendanceItem((prev) => (prev?.label === item.label ? null : item));
                  }}
                >
                  <span style={{ backgroundColor: item.color }} />
                  <label>{item.label}</label>
                  <strong>{item.percent}%</strong>
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section className="adminContentGrid adminContentGridPaymentFocus">
          <article className="adminCard adminPanelWide adminPaymentValidationCard">
            <div className="adminPaymentValidationHead">
              <h2>Validasi Pembayaran</h2>
              <AdminFilterDropdown
                value={selectedPaymentCategory}
                options={paymentCategoryOptions}
                isOpen={isPaymentCategoryOpen}
                dropdownRef={paymentCategoryRef}
                ariaLabel="Filter kategori pembayaran"
                onToggle={() => setIsPaymentCategoryOpen((prev) => !prev)}
                onSelect={(nextValue) => {
                  setSelectedPaymentCategory(nextValue);
                  setIsPaymentCategoryOpen(false);
                }}
              />
            </div>
            <div className="adminListSimple">
              {filteredPendingPayments.length > 0 ? (
                filteredPendingPayments.map((item) => (
                  <div key={item.id || item.name}>
                    <span className="adminListItemLabel">
                      {item.id === latestPendingPaymentId && (
                        <span className="adminRowAlertDot" aria-hidden="true" />
                      )}
                      {item.name} - {item.category}
                      {item.proofFileName !== "-" ? ` - ${item.proofFileName}` : ""}
                    </span>
                    <span className={`adminChip ${item.status === "Menunggu Verifikasi" ? "isPending" : "isUnpaid"}`}>
                      {item.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="adminListSimpleEmpty">Tidak ada pembayaran yang menunggu verifikasi.</div>
              )}
            </div>
          </article>
          <article className="adminCard adminPanelNarrow adminActivityHistoryCard">
            <div className="adminActivityHistoryHead">
              <h2>History Admin</h2>
              <div className="adminActivityHistoryFilters">
                <AdminFilterDropdown
                  value={selectedActivityMonth}
                  options={activityMonthOptions}
                  isOpen={isActivityMonthOpen}
                  dropdownRef={activityMonthRef}
                  ariaLabel="Filter bulan history admin"
                  onToggle={() => setIsActivityMonthOpen((prev) => !prev)}
                  onSelect={(nextValue) => {
                    setSelectedActivityMonth(nextValue);
                    setIsActivityMonthOpen(false);
                  }}
                />
                <AdminFilterDropdown
                  value={selectedActivityYear}
                  options={activityYearOptions}
                  isOpen={isActivityYearOpen}
                  dropdownRef={activityYearRef}
                  ariaLabel="Filter tahun history admin"
                  onToggle={() => setIsActivityYearOpen((prev) => !prev)}
                  onSelect={(nextValue) => {
                    setSelectedActivityYear(nextValue);
                    setIsActivityYearOpen(false);
                  }}
                />
              </div>
            </div>
            <div className="adminActivityHistoryList">
              {filteredAdminActivityHistory.length > 0 ? (
                filteredAdminActivityHistory.map((item) => (
                  <div key={item.id || `${item.title}-${item.createdAt}`} className="adminActivityHistoryItem">
                    <div>
                      <strong>{item.title}</strong>
                      {item.description && <p>{item.description}</p>}
                    </div>
                    <time dateTime={new Date(Number(item.createdAt) || item.createdAt).toISOString()}>
                      {formatAdminActivityDate(item.createdAt)}
                    </time>
                  </div>
                ))
              ) : (
                <div className="adminActivityHistoryEmpty">
                  Belum ada history admin pada bulan ini.
                </div>
              )}
            </div>
          </article>
        </section>

        <section className="adminContentGrid adminContentGridCoachDocs">
          <article className="adminCard adminPanelNarrow adminCoachCard">
            <h2>Pelatih</h2>
            <div className="adminCoachList">
              {resolvedAdminCoaches.map((coach) => (
                <div key={coach.id}>
                  <span className="avatar"><UserIcon /></span>
                  <strong>{coach.name}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="adminCard adminPanelWide adminFilesCard">
            <h2>Validasi Berkas</h2>
            <div className="adminTableWrap">
              <table>
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Email</th>
                    <th>No HP</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {adminPendingFilesRows.map((item) => (
                    <tr key={item.email}>
                      <td>
                        <span className="adminListItemLabel">
                          {item.no === latestPendingValidationNo && item.status === "Belum Diperiksa" && (
                            <span className="adminRowAlertDot" aria-hidden="true" />
                          )}
                          {item.name}
                        </span>
                      </td>
                      <td>{item.email}</td>
                      <td>{item.phone}</td>
                      <td>
                        <button
                          type="button"
                          className={`adminChip adminChipStatusAction ${getValidationChipClass(item.status)}`}
                          onClick={() => openValidationDetail(item.no)}
                        >
                          {item.status}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
          </>
        )}
        <div className="adminSiteFooterWrap">
          <SiteFooter />
        </div>
      </div>
    </div>
    </>
  );
}
