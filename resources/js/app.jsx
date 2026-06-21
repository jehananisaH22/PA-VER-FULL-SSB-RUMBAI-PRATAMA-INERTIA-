import { useCallback, useEffect, useMemo, useState } from "react"; 
import Beranda from "./components/Beranda"; 
import Daftar from "./components/Daftar"; 
import HalamanFormPendaftaran from "./components/HalamanFormPendaftaran"; 
import HalamanBuktiPembayaranPendaftaran from "./components/HalamanBuktiPembayaranPendaftaran"; 
import ModalPilihAnakOrangTua from "./components/ModalPilihAnakOrangTua"; 
import Berita from "./components/Berita"; 
import Galeri from "./components/Galeri"; 
import PemilihPeran from "./features/auth/PemilihPeran"; 
import RoleLogin from "./features/auth/RoleLogin"; 
import DasborOrangTua from "./features/parent/DasborOrangTua"; 
import KehadiranOrangTua from "./features/parent/KehadiranOrangTua"; 
import PrestasiOrangTua from "./features/parent/PrestasiOrangTua"; 
import PerformaOrangTua from "./features/parent/PerformaOrangTua"; 
import CatatanPelatihOrangTua from "./features/parent/CatatanPelatihOrangTua"; 
import PembayaranOrangTua from "./features/parent/PembayaranOrangTua"; 
import UploadUlangBerkasOrangTua from "./features/parent/UploadUlangBerkasOrangTua"; 
import DasborPelatih from "./features/coach/DasborPelatih"; 
import KehadiranPelatih from "./features/coach/KehadiranPelatih"; 
import PerformaPelatih from "./features/coach/PerformaPelatih"; 
import CatatanPelatih from "./features/coach/CatatanPelatih"; 
import PembayaranPelatih from "./features/coach/PembayaranPelatih"; 
import DasborAdmin from "./features/admin/DasborAdmin"; 
import Berita1 from "./assets/Berita1.png"; 
import Berita2 from "./assets/Berita2.png"; 

const routePaths = { 
  landing: "/", 
  register: "/register", 
  "register-form": "/register/form", 
  "register-payment-proof": "/register/payment-proof", 
  "login-select": "/login", 
  "login-role": "/login/role", 
  "parent-dashboard": "/orang-tua/dashboard", 
  "parent-attendance": "/orang-tua/kehadiran", 
  "parent-performance": "/orang-tua/performa", 
  "parent-achievements": "/orang-tua/prestasi", 
  "parent-coach-notes": "/orang-tua/catatan-pelatih", 
  "parent-payments": "/orang-tua/pembayaran", 
  "parent-reupload": "/orang-tua/upload-ulang", 
  "coach-dashboard": "/pelatih/dashboard", 
  "coach-attendance": "/pelatih/kehadiran", 
  "coach-performance": "/pelatih/performa", 
  "coach-notes": "/pelatih/catatan", 
  "coach-payments": "/pelatih/pembayaran", 
  galeri: "/galeri", 
  "berita-list": "/berita"
}; 

const adminMenuSlugs = { 
  Home: "dashboard", 
  Pendaftaran: "pendaftaran", 
  Siswa: "siswa", 
  Pelatih: "pelatih", 
  Pembayaran: "pembayaran", 
  "Jadwal Latihan": "jadwal-latihan", 
  "Media Promosi": "media-promosi", 
  Prestasi: "prestasi"
}; 

const adminSlugToMenu = Object.fromEntries(
  Object.entries(adminMenuSlugs).map(([menu, slug]) => [slug, menu])
); 

const pageTitles = { 
  landing: "Beranda", 
  register: "Daftar", 
  "register-form": "Form Pendaftaran", 
  "register-payment-proof": "Bukti Pembayaran", 
  "login-select": "Pilih Login", 
  "login-role": "Login", 
  "parent-dashboard": "Dashboard Orang Tua", 
  "parent-attendance": "Kehadiran Orang Tua", 
  "parent-performance": "Performa Orang Tua", 
  "parent-achievements": "Prestasi Orang Tua", 
  "parent-coach-notes": "Catatan Pelatih Orang Tua", 
  "parent-payments": "Pembayaran Orang Tua", 
  "parent-reupload": "Upload Ulang Berkas", 
  "coach-dashboard": "Dashboard Pelatih", 
  "coach-attendance": "Kehadiran Pelatih", 
  "coach-performance": "Performa Pelatih", 
  "coach-notes": "Catatan Pelatih", 
  "coach-payments": "Pembayaran Pelatih", 
  "admin-dashboard": "Dashboard Admin", 
  galeri: "Galeri", 
  "berita-list": "Berita", 
  "berita-detail": "Detail Berita"
}; 

const ageCategoryNumbers = Array.from({ length: 11 }, (_, index) => index + 6); 
const coachCategoryLabels = Object.fromEntries(
  ageCategoryNumbers.map((age) => [`u${age}`, `U-${age}`])
); 

const coachPaymentTypeLabels = { 
  pendaftaran: "Pendaftaran", 
  bulanan: "Uang Bulanan", 
  harian: "Uang Harian"
}; 

const coachMonthValues = [
"januari",
"februari",
"maret",
"april",
"mei",
"juni",
"juli",
"agustus",
"september",
"oktober",
"november",
"desember"]; 


const coachMonthLabels = { 
  januari: "Januari", 
  februari: "Februari", 
  maret: "Maret", 
  april: "April", 
  mei: "Mei", 
  juni: "Juni", 
  juli: "Juli", 
  agustus: "Agustus", 
  september: "September", 
  oktober: "Oktober", 
  november: "November", 
  desember: "Desember"
}; 

const defaultStudentDirectory = [
{ id: 1, name: "Asep Wibowo", category: "u10" },
{ id: 2, name: "Farel Nanda", category: "u10" },
{ id: 3, name: "Rizki Saputra", category: "u11" },
{ id: 4, name: "Doni Alfi", category: "u11" },
{ id: 5, name: "M. Udin", category: "u12" },
{ id: 6, name: "Dimas Alfi", category: "u12" },
{ id: 7, name: "Bima Pratama", category: "u12" }]; 


const initialAdminStudents = defaultStudentDirectory.map((item) => ({ 
  id: item.id, 
  name: item.name, 
  email: `${item.name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "")}@email.com`, 
  category: coachCategoryLabels[item.category] || "U-10"
})); 

const initialAdminCoaches = [
{ id: 1, name: "Zulfahmi", email: "zulfahmi123@gmail.com" },
{ id: 2, name: "Pelatih Budi", email: "budi.pelatih@gmail.com" },
{ id: 3, name: "Pelatih 2", email: "pelatih2@ssbrumbai.com" },
{ id: 4, name: "Pelatih 3", email: "pelatih3@ssbrumbai.com" }]; 


const initialAdminCatatanPelatih = [
{ 
  id: 1, 
  coachName: "Zulfahmi", 
  studentName: "Asep Wibowo", 
  date: "06/08/2024", 
  note: "Latihan endurance di rumah ya tetap jaga kesehatan"
},
{ 
  id: 2, 
  coachName: "Pelatih Budi", 
  studentName: "Rizki Saputra", 
  date: "10/08/2024", 
  note: "Passing kaki kiri sudah meningkat, lanjutkan 15 menit per hari"
}]; 


const initialAdminTrainingSchedules = [
{ 
  id: "schedule-sunday", 
  day: "Minggu", 
  time: "07.15-09.30 WIB", 
  place: "Lapangan Mesjid Da'wah Rumbai Pesisir", 
  category: "u10", 
  studentName: "all"
},
{ 
  id: "schedule-wednesday", 
  day: "Rabu", 
  time: "16.25-17.55 WIB", 
  place: "Lapangan Mesjid Da'wah Rumbai Pesisir", 
  category: "u11", 
  studentName: "all"
}]; 


const adminTrainingScheduleDrafts = [
{ 
  day: "Senin", 
  time: "16.00-17.30 WIB", 
  place: "Lapangan Utama SSB Rumbai Pratama"
},
{ 
  day: "Selasa", 
  time: "16.00-17.30 WIB", 
  place: "Lapangan Utama SSB Rumbai Pratama"
},
{ 
  day: "Kamis", 
  time: "16.00-17.30 WIB", 
  place: "Lapangan Utama SSB Rumbai Pratama"
},
{ 
  day: "Sabtu", 
  time: "07.00-09.00 WIB", 
  place: "Lapangan Utama SSB Rumbai Pratama"
}]; 


const initialAdminMediaArticles = [
{ 
  id: 1, 
  title: "Menyabet Juara IV Festival Woner U-10", 
  body:
  "SSB Rumbai Pratama kembali mencatat momen membanggakan dengan meraih Juara IV pada Festival Woner kategori U-10. Hasil ini menjadi bukti perkembangan latihan anak-anak yang semakin solid, disiplin, dan percaya diri saat bertanding.\n\nTim tampil kompak sepanjang turnamen dan mampu menunjukkan semangat juang yang tinggi. Hasil ini juga menjadi motivasi besar untuk terus berkembang di kompetisi berikutnya.", 
  image: Berita1, 
  imageName: "festival-woner-u10.png", 
  postedAt: 1727740800000, 
  targetKeys: ["group:u10"]
},
{ 
  id: 2, 
  title: "Persiapan Latihan Rutin Sebelum Liga", 
  body:
  "Program latihan rutin terus dimatangkan menjelang agenda liga berikutnya. Fokus latihan kali ini diarahkan pada transisi permainan, passing cepat, dan komunikasi antar pemain di lapangan.\n\nPelatih berharap ritme latihan yang konsisten bisa menjaga kondisi fisik sekaligus meningkatkan chemistry tim di setiap kelompok umur.", 
  image: Berita2, 
  imageName: "latihan-rutin-sebelum-liga.png", 
  postedAt: 1726358400000, 
  targetKeys: ["group:u11", "group:u12"]
}]; 


const initialAdminAchievements = [
{ 
  id: 1, 
  studentId: 1, 
  studentName: "Asep Wibowo", 
  category: "U-10", 
  title: "Menyabet Juara IV Festival Woner U-10", 
  createdAt: 1727740800000
}]; 


const initialKehadiranPelatihRecaps = [
{ id: 1, coachName: "Zulfahmi", playerName: "Asep Wibowo", category: "u10", month: "januari", year: "2026", hadir: 95, sakit: 3, izin: 2, fromDate: "2026-01-01", toDate: "2026-01-31", createdAt: Date.parse("2026-01-31T09:00:00") },
{ id: 2, coachName: "Zulfahmi", playerName: "Rizki Saputra", category: "u11", month: "januari", year: "2026", hadir: 92, sakit: 5, izin: 3, fromDate: "2026-01-01", toDate: "2026-01-31", createdAt: Date.parse("2026-01-31T09:10:00") },
{ id: 3, coachName: "Zulfahmi", playerName: "M. Udin", category: "u12", month: "januari", year: "2026", hadir: 90, sakit: 6, izin: 4, fromDate: "2026-01-01", toDate: "2026-01-31", createdAt: Date.parse("2026-01-31T09:20:00") },
{ id: 4, coachName: "Zulfahmi", playerName: "Asep Wibowo", category: "u10", month: "februari", year: "2026", hadir: 94, sakit: 4, izin: 2, fromDate: "2026-02-01", toDate: "2026-02-28", createdAt: Date.parse("2026-02-28T09:00:00") },
{ id: 5, coachName: "Zulfahmi", playerName: "Rizki Saputra", category: "u11", month: "februari", year: "2026", hadir: 93, sakit: 4, izin: 3, fromDate: "2026-02-01", toDate: "2026-02-28", createdAt: Date.parse("2026-02-28T09:10:00") },
{ id: 6, coachName: "Zulfahmi", playerName: "M. Udin", category: "u12", month: "februari", year: "2026", hadir: 89, sakit: 7, izin: 4, fromDate: "2026-02-01", toDate: "2026-02-28", createdAt: Date.parse("2026-02-28T09:20:00") }]; 


const initialPerformaPelatihHistory = [
{ id: 1, coach: "Zulfahmi", date: "31/01/2026", month: "januari", year: "2026", category: "u10", player: "Asep Wibowo", dribbling: "78", passing: "82", shooting: "84", createdAt: Date.parse("2026-01-31T10:00:00") },
{ id: 2, coach: "Zulfahmi", date: "28/02/2026", month: "februari", year: "2026", category: "u10", player: "Asep Wibowo", dribbling: "80", passing: "84", shooting: "86", createdAt: Date.parse("2026-02-28T10:00:00") },
{ id: 3, coach: "Zulfahmi", date: "31/01/2026", month: "januari", year: "2026", category: "u11", player: "Rizki Saputra", dribbling: "76", passing: "81", shooting: "83", createdAt: Date.parse("2026-01-31T10:10:00") },
{ id: 4, coach: "Zulfahmi", date: "28/02/2026", month: "februari", year: "2026", category: "u11", player: "Rizki Saputra", dribbling: "79", passing: "83", shooting: "85", createdAt: Date.parse("2026-02-28T10:10:00") },
{ id: 5, coach: "Zulfahmi", date: "31/01/2026", month: "januari", year: "2026", category: "u12", player: "M. Udin", dribbling: "81", passing: "86", shooting: "89", createdAt: Date.parse("2026-01-31T10:20:00") },
{ id: 6, coach: "Zulfahmi", date: "28/02/2026", month: "februari", year: "2026", category: "u12", player: "M. Udin", dribbling: "83", passing: "88", shooting: "91", createdAt: Date.parse("2026-02-28T10:20:00") }]; 


const storageKeys = { 
  parentProfiles: "ssb-parent-profiles", 
  parentNotifications: "ssb-parent-notifications", 
  parentPaymentInfo: "ssb-parent-payment-info", 
  globalNotifications: "ssb-global-notifications", 
  authSession: "ssb-auth-session", 
  adminValidationIncoming: "ssb-admin-validation-incoming", 
  adminRegistrationPayments: "ssb-admin-registration-payments", 
  coachPaymentSubmissions: "ssb-coach-payment-submissions", 
  coachAttendanceRecaps: "ssb-coach-attendance-recaps", 
  coachPerformanceHistory: "ssb-coach-performance-history", 
  adminTrainingSchedules: "ssb-admin-training-schedules", 
  adminStudents: "ssb-admin-students", 
  adminCoaches: "ssb-admin-coaches", 
  adminCatatanPelatih: "ssb-admin-coach-notes", 
  adminMediaArticles: "ssb-admin-media-articles", 
  adminAchievements: "ssb-admin-achievements", 
  adminActivityHistory: "ssb-admin-activity-history"
}; 

function readStoredJson(key, fallbackValue) {
  if (typeof window === "undefined") return fallbackValue; 

  try {
    const rawValue = window.localStorage.getItem(key); 
    return rawValue ? JSON.parse(rawValue) : fallbackValue;
  } catch (error) {
    console.warn(`Gagal membaca localStorage untuk ${key}`, error); 
    return fallbackValue;
  }
} 

function normalizeAdminActivityHistory(rows = []) {
  if (!Array.isArray(rows)) return []; 

  return rows.
  map((item, index) => {
    const createdAt = Number(item?.createdAt) || Date.parse(item?.created_at || "") || Date.now(); 
    const title = String(item?.title || "").trim(); 
    if (!title) return null; 

    return { 
      id: item?.id || `${createdAt}-${index}`, 
      title, 
      description: String(item?.description || "").trim(), 
      createdAt
    };
  }).
  filter(Boolean).
  sort((leftItem, rightItem) => Number(rightItem.createdAt || 0) - Number(leftItem.createdAt || 0)).
  slice(0, 120);
} 

function normalizeAuthSession(session) {
  if (!session || typeof session !== "object") {
    return { 
      isLoggedIn: false, 
      userRoleKey: null, 
      userRole: null, 
      activeParentEmail: "", 
      activeParentChild: ""
    };
  } 

  return { 
    isLoggedIn: Boolean(session.isLoggedIn), 
    userRoleKey: session.userRoleKey || null, 
    userRole: session.userRole || null, 
    activeParentEmail: session.activeParentEmail || "", 
    activeParentChild: session.activeParentChild || ""
  };
} 

function sanitizeValidationRowsForStorage(rows = []) {
  return rows.map((row) => ({
    ...row, 
    fileObjects: Object.fromEntries(
      Object.entries(row.fileObjects || {}).map(([fieldKey, files]) => [
      fieldKey,
      Array.isArray(files) ? files.map(() => null) : []]
      )
    )
  }));
} 

function sanitizeRegistrationPaymentsForStorage(rows = []) {
  return rows.map((row) => ({
    ...row, 
    proofFile: null
  }));
} 

function normalizeScheduleStudentNames(item) {
  const sourceNames = Array.isArray(item?.studentNames) ?
  item.studentNames :
  item?.studentName && item.studentName !== "all" ?
  [item.studentName] :
  []; 

  return Array.from(
    new Set(
      sourceNames.
      map((name) => String(name || "").trim()).
      filter((name) => name && name !== "all")
    )
  );
} 

function normalizeTrainingScheduleItem(item, fallbackId) {
  const studentNames = normalizeScheduleStudentNames(item); 

  return { 
    id: item?.id || fallbackId, 
    day: String(item?.day || "-").trim() || "-", 
    time: String(item?.time || "-").trim() || "-", 
    place: String(item?.place || "-").trim() || "-", 
    category: normalizeStudentCategoryKey(item?.category) || "all", 
    studentName: studentNames.length === 1 ? studentNames[0] : "all", 
    studentNames
  };
} 

function normalizeTrainingSchedules(rows = []) {
  return Array.isArray(rows) ?
  rows.map((item, index) => normalizeTrainingScheduleItem(item, `schedule-${index + 1}`)) :
  initialAdminTrainingSchedules.map((item, index) =>
  normalizeTrainingScheduleItem(item, `default-schedule-${index + 1}`)
  );
} 

function normalizeAdminStudentItem(item, fallbackId) {
  return { 
    id: item?.id ?? fallbackId, 
    name: item?.name || "Siswa Baru", 
    email: item?.email || "-", 
    category: item?.category || "U-10"
  };
} 

function normalizeAdminStudents(rows = []) {
  return Array.isArray(rows) ?
  rows.map((item, index) => normalizeAdminStudentItem(item, index + 1)) :
  initialAdminStudents.map((item, index) => normalizeAdminStudentItem(item, index + 1));
} 

function resolveStudentCategoryFromAge(ageValue) {
  const ageNumber = Number(ageValue); 
  if (!Number.isFinite(ageNumber)) return "U-10"; 
  const normalizedAge = Math.min(16, Math.max(6, Math.trunc(ageNumber))); 
  return `U-${normalizedAge}`;
} 

function upsertAdminStudents(prevStudents = [], nextStudents = []) {
  if (!Array.isArray(nextStudents) || nextStudents.length === 0) return prevStudents; 

  const currentStudents = [...prevStudents]; 
  let hasChanges = false; 

  nextStudents.forEach((student) => {
    const normalizedName = (student?.name || "").trim().toLowerCase(); 
    const normalizedEmail = (student?.email || "").trim().toLowerCase(); 

    if (!normalizedName) return; 

    const existingIndex = currentStudents.findIndex((item) => {
      const itemName = (item?.name || "").trim().toLowerCase(); 
      const itemEmail = (item?.email || "").trim().toLowerCase(); 

      if (normalizedEmail && itemEmail && itemEmail === normalizedEmail) return true; 
      return itemName === normalizedName;
    }); 

    if (existingIndex >= 0) {
      const existingStudent = currentStudents[existingIndex]; 
      const nextStudent = {
        ...existingStudent, 
        name: student.name || existingStudent.name, 
        email: student.email || existingStudent.email, 
        category: student.category || existingStudent.category
      }; 

      if (
      nextStudent.name !== existingStudent.name ||
      nextStudent.email !== existingStudent.email ||
      nextStudent.category !== existingStudent.category)
      {
        currentStudents[existingIndex] = nextStudent; 
        hasChanges = true;
      } 
      return;
    } 

    currentStudents.push(
      normalizeAdminStudentItem(
        { 
          id: student.id ?? Date.now() + currentStudents.length, 
          name: student.name, 
          email: student.email, 
          category: student.category
        },
        currentStudents.length + 1
      )
    ); 
    hasChanges = true;
  }); 

  return hasChanges ? currentStudents : prevStudents;
} 

function normalizeAdminCoachItem(item, fallbackId) {
  return { 
    id: item?.id ?? fallbackId, 
    name: item?.name || "Pelatih", 
    email: item?.email || "-"
  };
} 

function normalizeAdminCoaches(rows = []) {
  return Array.isArray(rows) ?
  rows.map((item, index) => normalizeAdminCoachItem(item, index + 1)) :
  initialAdminCoaches.map((item, index) => normalizeAdminCoachItem(item, index + 1));
} 

function normalizeAdminCoachNoteItem(item, fallbackId) {
  return { 
    id: item?.id ?? fallbackId, 
    coachName: item?.coachName || "-", 
    studentName: item?.studentName || "-", 
    date: item?.date || "-", 
    note: item?.note || ""
  };
} 

function normalizeAdminCatatanPelatih(rows = []) {
  return Array.isArray(rows) ?
  rows.map((item, index) => normalizeAdminCoachNoteItem(item, index + 1)) :
  initialAdminCatatanPelatih.map((item, index) => normalizeAdminCoachNoteItem(item, index + 1));
} 

function normalizeKehadiranPelatihItem(item, fallbackId) {
  const hadir = Math.max(0, Math.min(100, Number(item?.hadir) || 0)); 
  const sakit = Math.max(0, Math.min(100, Number(item?.sakit) || 0)); 
  const izin = Math.max(0, Math.min(100, Number(item?.izin) || 0)); 

  return { 
    id: item?.id ?? fallbackId, 
    coachName: item?.coachName || "Zulfahmi", 
    playerName: item?.playerName || "Siswa", 
    category: normalizeStudentCategoryKey(item?.category) || "u10", 
    scheduleId: item?.scheduleId || "", 
    scheduleLabel: item?.scheduleLabel || "", 
    month: coachMonthValues.includes(item?.month) ? item.month : "januari", 
    year: String(item?.year || new Date().getFullYear()), 
    hadir, 
    sakit, 
    izin, 
    fromDate: item?.fromDate || "", 
    toDate: item?.toDate || "", 
    createdAt: Number(item?.createdAt) || Date.now()
  };
} 

function normalizeKehadiranPelatihRecaps(rows = []) {
  return Array.isArray(rows) && rows.length > 0 ?
  rows.map((item, index) => normalizeKehadiranPelatihItem(item, index + 1)) :
  initialKehadiranPelatihRecaps.map((item, index) =>
  normalizeKehadiranPelatihItem(item, index + 1)
  );
} 

function normalizePerformaPelatihItem(item, fallbackId) {
  return { 
    id: item?.id ?? fallbackId, 
    coach: item?.coach || "Zulfahmi", 
    date: item?.date || "01/01/2026", 
    scheduleId: item?.scheduleId || "", 
    scheduleLabel: item?.scheduleLabel || "", 
    month: coachMonthValues.includes(item?.month) ? item.month : "januari", 
    year: String(item?.year || new Date().getFullYear()), 
    category: normalizeStudentCategoryKey(item?.category) || "u10", 
    player: item?.player || "Siswa", 
    dribbling: String(item?.dribbling ?? ""), 
    passing: String(item?.passing ?? ""), 
    shooting: String(item?.shooting ?? ""), 
    createdAt: Number(item?.createdAt) || Date.now()
  };
} 

function normalizePerformaPelatihHistory(rows = []) {
  return Array.isArray(rows) && rows.length > 0 ?
  rows.map((item, index) => normalizePerformaPelatihItem(item, index + 1)) :
  initialPerformaPelatihHistory.map((item, index) =>
  normalizePerformaPelatihItem(item, index + 1)
  );
} 

function parseSlashDateToTimestamp(value) {
  const [day, month, year] = String(value || "").split("/"); 
  if (!day || !month || !year) return Date.now(); 
  return new Date(`${year}-${month}-${day}T08:00:00`).getTime();
} 

function formatMonthYearLabel(month, year) {
  return `${coachMonthLabels[month] || month} ${year}`;
} 

function formatAchievementDate(value) {
  return new Intl.DateTimeFormat("id-ID", { 
    day: "2-digit", 
    month: "short", 
    year: "numeric"
  }).format(new Date(Number(value) || Date.now()));
} 

function normalizeAdminAchievementItem(item, fallbackId) {
  const createdAt = Number(item?.createdAt) || Date.now(); 

  return { 
    id: item?.id ?? fallbackId, 
    studentId: item?.studentId ?? null, 
    studentName: item?.studentName || "Siswa", 
    category: item?.category || "U-10", 
    title: item?.title || "Prestasi Baru", 
    createdAt, 
    dateLabel: item?.dateLabel || formatAchievementDate(createdAt)
  };
} 

function normalizeAdminAchievements(rows = []) {
  return Array.isArray(rows) && rows.length > 0 ?
  rows.map((item, index) => normalizeAdminAchievementItem(item, index + 1)) :
  initialAdminAchievements.map((item, index) =>
  normalizeAdminAchievementItem(item, index + 1)
  );
} 

function normalizeStudentCategoryKey(categoryValue) {
  const normalized = String(categoryValue || "").
  toLowerCase().
  replace(/[^a-z0-9]/g, ""); 

  if (normalized === "u10") return "u10"; 
  const ageMatch = normalized.match(/^u?(\d{1,2})$/); 
  if (ageMatch) {
    const age = Number(ageMatch[1]); 
    if (age >= 6 && age <= 16) return `u${age}`;
  } 
  if (normalized === "all") return "all"; 
  return "";
} 

function formatArticleDate(postedAt) {
  return new Intl.DateTimeFormat("id-ID", { 
    day: "2-digit", 
    month: "long", 
    year: "numeric"
  }).format(new Date(Number(postedAt) || Date.now()));
} 

function createArticleExcerpt(body, maxLength = 132) {
  const normalized = String(body || "").replace(/\s+/g, " ").trim(); 
  if (!normalized) return "Belum ada ringkasan berita."; 
  if (normalized.length <= maxLength) return normalized; 
  return `${normalized.slice(0, maxLength).trimEnd()}...`;
} 

function normalizeMediaArticleItem(item, fallbackId) {
  const postedAt = Number(item?.postedAt) || Date.now(); 

  return { 
    id: Number(item?.id) || fallbackId, 
    title: item?.title || "Berita Baru", 
    body: item?.body || "", 
    image: item?.image || Berita1, 
    imageName: item?.imageName || "foto-berita.jpg", 
    postedAt, 
    dateLabel: item?.dateLabel || formatArticleDate(postedAt), 
    excerpt: item?.excerpt || createArticleExcerpt(item?.body || ""), 
    targetKeys: Array.isArray(item?.targetKeys) ? item.targetKeys.filter(Boolean) : []
  };
} 

function normalizeMediaArticles(rows = []) {
  return Array.isArray(rows) && rows.length > 0 ?
  rows.map((item, index) => normalizeMediaArticleItem(item, index + 1)) :
  initialAdminMediaArticles.map((item, index) => normalizeMediaArticleItem(item, index + 1));
} 

function resolveMediaArticlePlayers(targetKeys = [], students = []) {
  const playerMap = new Map(); 

  targetKeys.forEach((key) => {
    if (!key) return; 

    if (key.startsWith("group:")) {
      const categoryKey = key.split(":")[1]; 
      students.
      filter((student) => normalizeStudentCategoryKey(student.category) === categoryKey).
      forEach((student) => {
        playerMap.set(student.id, { 
          id: student.id, 
          name: student.name, 
          category: student.category
        });
      }); 
      return;
    } 

    if (key.startsWith("student:")) {
      const studentId = Number(key.split(":")[1]); 
      const matchedStudent = students.find((student) => Number(student.id) === studentId); 
      if (matchedStudent) {
        playerMap.set(matchedStudent.id, { 
          id: matchedStudent.id, 
          name: matchedStudent.name, 
          category: matchedStudent.category
        });
      }
    }
  }); 

  return Array.from(playerMap.values()).sort((leftItem, rightItem) =>
  leftItem.name.localeCompare(rightItem.name, "id-ID")
  );
} 

function normalizeParentNotificationItem(item, fallbackId) {
  if (typeof item === "string") {
    return { 
      id: fallbackId, 
      text: item, 
      read: false
    };
  } 

  return {
    ...item, 
    id: item?.id ?? fallbackId, 
    text: item?.text || "", 
    read: Boolean(item?.read)
  };
} 

function normalizeParentNotificationMap(map = {}) {
  return Object.fromEntries(
    Object.entries(map).map(([email, items]) => [
    email,
    Array.isArray(items) ?
    items.map((item, index) =>
    normalizeParentNotificationItem(item, `${email}-notification-${index}`)
    ) :
    []]
    )
  );
} 

function createParentNotification({ id, text, action }) {
  return { 
    id, 
    text, 
    action, 
    read: false
  };
} 

function normalizeGlobalNotificationItem(item, fallbackId) {
  if (typeof item === "string") {
    return { 
      id: fallbackId, 
      text: item, 
      read: false
    };
  } 

  return {
    ...item, 
    id: item?.id ?? fallbackId, 
    text: item?.text || "", 
    read: Boolean(item?.read)
  };
} 

function createGlobalNotification({ id, text }) {
  return { 
    id, 
    text, 
    read: false
  };
} 

function normalizeParentIdentityName(value) {
  return String(value || "").
  trim().
  toLowerCase().
  replace(/\s+/g, " ");
} 

function mergeUniqueItems(...groups) {
  return Array.from(
    new Set(
      groups.
      flat().
      map((item) => String(item || "").trim()).
      filter(Boolean)
    )
  );
} 

function findParentProfileEntry(parentProfiles, { email = "", parentName = "" } = {}) {
  const normalizedEmail = String(email || "").trim().toLowerCase(); 
  if (normalizedEmail && parentProfiles[normalizedEmail]) {
    return [normalizedEmail, parentProfiles[normalizedEmail]];
  } 

  const linkedEmailEntry = Object.entries(parentProfiles).find(([, profile]) =>
  (profile?.linkedEmails || []).some(
    (item) => String(item || "").trim().toLowerCase() === normalizedEmail
  )
  ); 
  if (normalizedEmail && linkedEmailEntry) {
    return linkedEmailEntry;
  } 

  const normalizedParentName = normalizeParentIdentityName(parentName); 
  if (!normalizedParentName) return null; 

  return (
    Object.entries(parentProfiles).find(
      ([, profile]) =>
      normalizeParentIdentityName(profile?.userName) === normalizedParentName
    ) || null);

} 

function resolveParentAccountEmail(parentProfiles, { email = "", parentName = "" } = {}) {
  const matchedEntry = findParentProfileEntry(parentProfiles, { email, parentName }); 
  if (matchedEntry) return matchedEntry[0]; 
  return String(email || "").trim().toLowerCase();
} 

const defaultParentProfiles = { 
  "user1@gmail.com": { 
    userName: "user1", 
    children: ["Asep Wibowo"], 
    paymentStatus: "unpaid", 
    paymentProofStatus: "pending", 
    accountCreated: true, 
    validationStatus: "pending", 
    password: "user1", 
    linkedEmails: ["user1@gmail.com"]
  }, 
  "udinanjay@gmail.com": { 
    userName: "udin anjay", 
    children: ["Udin Anjay", "Bima Pratama"], 
    paymentStatus: "paid", 
    paymentProofStatus: "valid", 
    accountCreated: true, 
    validationStatus: "valid", 
    password: "asu", 
    linkedEmails: ["udinanjay@gmail.com"]
  }
}; 

const initialCoachPaymentSubmissions = [
{ 
  id: "coach-payment-1", 
  createdAt: 1722902400000, 
  studentId: 1, 
  studentName: "Asep Wibowo", 
  category: "u10", 
  categoryLabel: "U-10", 
  paymentType: "bulanan", 
  paymentTypeLabel: "Uang Bulanan", 
  paidDate: "2024-08-06", 
  paidDateLabel: "06 Agustus 2024", 
  amount: 100000, 
  proofFileName: "IMG-2024-08-06", 
  proofFile: null, 
  proofFileType: "", 
  status: "Menunggu Verifikasi", 
  source: "coach"
},
{ 
  id: "coach-payment-2", 
  createdAt: 1722902400001, 
  studentId: 2, 
  studentName: "M. Udin", 
  category: "u12", 
  categoryLabel: "U-12", 
  paymentType: "pendaftaran", 
  paymentTypeLabel: "Pendaftaran", 
  paidDate: "2024-08-06", 
  paidDateLabel: "06 Agustus 2024", 
  amount: 280000, 
  proofFileName: "IMG-2024-08-06", 
  proofFile: null, 
  proofFileType: "", 
  status: "Menunggu Verifikasi", 
  source: "coach"
}]; 


const buildPathForPage = (page, options = {}) => {
  if (page === "berita-detail") {
    return `/berita/${options.articleId || 1}`;
  } 

  if (page === "admin-dashboard") {
    const adminSection = options.adminSection || "Home"; 
    return `/admin/${adminMenuSlugs[adminSection] || adminMenuSlugs.Home}`;
  } 

  return routePaths[page] || routePaths.landing;
}; 

const getRouteStateFromPath = (pathname) => {
  const normalizedPath = pathname || "/"; 

  if (!normalizedPath || normalizedPath === "/") {
    return { page: "landing", articleId: 1, adminSection: "Home" };
  } 

  if (normalizedPath === "/berita") {
    return { page: "berita-list", articleId: 1, adminSection: "Home" };
  } 

  if (normalizedPath.startsWith("/berita/")) {
    const articleId = Number(normalizedPath.split("/")[2]) || 1; 
    return { page: "berita-detail", articleId, adminSection: "Home" };
  } 

  if (normalizedPath.startsWith("/admin")) {
    const adminSlug = normalizedPath.split("/")[2] || adminMenuSlugs.Home; 
    return { 
      page: "admin-dashboard", 
      articleId: 1, 
      adminSection: adminSlugToMenu[adminSlug] || "Home"
    };
  } 

  const matchedPage = Object.entries(routePaths).find(([, path]) => path === normalizedPath); 

  return { 
    page: matchedPage?.[0] || "landing", 
    articleId: 1, 
    adminSection: "Home"
  };
}; 

const parentPages = new Set([
"parent-dashboard",
"parent-attendance",
"parent-performance",
"parent-achievements",
"parent-coach-notes",
"parent-payments",
"parent-reupload"]
); 

const coachPages = new Set([
"coach-dashboard",
"coach-attendance",
"coach-performance",
"coach-notes",
"coach-payments"]
); 

const adminPages = new Set(["admin-dashboard"]); 

export default function App() {
  const [initialAuthSession] = useState(() =>
  normalizeAuthSession(null)
  ); 
  const [activePage, setActivePage] = useState("landing"); 
  const [activeBeritaId, setActiveBeritaId] = useState(1); 
  const [isLoggedIn, setIsLoggedIn] = useState(initialAuthSession.isLoggedIn); 
  const [userRoleKey, setUserRoleKey] = useState(initialAuthSession.userRoleKey); 
  const [userRole, setUserRole] = useState(initialAuthSession.userRole); 
  const [notifications, setNotifications] = useState(() => {
    const storedNotifications = readStoredJson(storageKeys.globalNotifications, []); 
    return Array.isArray(storedNotifications) ?
    storedNotifications.map((item, index) =>
    normalizeGlobalNotificationItem(item, `global-notification-${index}`)
    ) :
    [];
  }); 
  const [parentNotificationsByEmail, setParentNotificationsByEmail] = useState(() =>
  normalizeParentNotificationMap(readStoredJson(storageKeys.parentNotifications, {}))
  ); 
  const [parentPaymentInfoByEmail, setParentPaymentInfoByEmail] = useState(() =>
  readStoredJson(storageKeys.parentPaymentInfo, {})
  ); 
  const [activeParentEmail, setActiveParentEmail] = useState(initialAuthSession.activeParentEmail); 
  const [activeParentChild, setActiveParentChild] = useState(initialAuthSession.activeParentChild); 
  const [parentReuploadRequestsByEmail, setParentReuploadRequestsByEmail] = useState({}); 
  const [parentProfiles, setParentProfiles] = useState(() =>
  readStoredJson(storageKeys.parentProfiles, defaultParentProfiles)
  ); 
  const [authRole, setAuthRole] = useState(null); 
  const [logoutConfirm, setLogoutConfirm] = useState(null); 
  const [logoutSuccess, setLogoutSuccess] = useState(null); 
  const [adminScheduleUpdateToast, setAdminScheduleUpdateToast] = useState(null); 
  const [registrationAccountDraft, setRegistrationAccountDraft] = useState({ 
    name: "", 
    email: "", 
    phone: "", 
    password: ""
  }); 
  const [registrationFormDraft, setRegistrationFormDraft] = useState(null); 
  const [registrationPaymentDraft, setRegistrationPaymentDraft] = useState(null); 
  const [adminValidationIncoming, setAdminValidationIncoming] = useState(() =>
  readStoredJson(storageKeys.adminValidationIncoming, [])
  ); 
  const [adminRegistrationPayments, setAdminRegistrationPayments] = useState(() =>
  readStoredJson(storageKeys.adminRegistrationPayments, [])
  ); 
  const [coachPaymentSubmissions, setCoachPaymentSubmissions] = useState(() =>
  readStoredJson(storageKeys.coachPaymentSubmissions, initialCoachPaymentSubmissions)
  ); 
  const [coachAttendanceRecaps, setKehadiranPelatihRecaps] = useState(() =>
  normalizeKehadiranPelatihRecaps(
    readStoredJson(storageKeys.coachAttendanceRecaps, initialKehadiranPelatihRecaps)
  )
  ); 
  const [coachPerformanceHistory, setPerformaPelatihHistory] = useState(() =>
  normalizePerformaPelatihHistory(
    readStoredJson(
      storageKeys.coachPerformanceHistory,
      readStoredJson("coach_performance_history_v1", initialPerformaPelatihHistory)
    )
  )
  ); 
  const [adminStudents, setAdminStudents] = useState(() =>
  normalizeAdminStudents(readStoredJson(storageKeys.adminStudents, initialAdminStudents))
  ); 
  const [adminCoaches, setAdminCoaches] = useState(() =>
  normalizeAdminCoaches(readStoredJson(storageKeys.adminCoaches, initialAdminCoaches))
  ); 
  const [adminCatatanPelatih, setAdminCatatanPelatih] = useState(() =>
  normalizeAdminCatatanPelatih(readStoredJson(storageKeys.adminCatatanPelatih, initialAdminCatatanPelatih))
  ); 
  const [adminTrainingSchedules, setAdminTrainingSchedules] = useState(() =>
  normalizeTrainingSchedules(
    readStoredJson(storageKeys.adminTrainingSchedules, initialAdminTrainingSchedules)
  )
  ); 
  const [adminMediaArticles, setAdminMediaArticles] = useState(() =>
  normalizeMediaArticles(readStoredJson(storageKeys.adminMediaArticles, initialAdminMediaArticles))
  ); 
  const [adminAchievements, setAdminAchievements] = useState(() =>
  normalizeAdminAchievements(readStoredJson(storageKeys.adminAchievements, initialAdminAchievements))
  ); 
  const [adminActivityHistory, setAdminActivityHistory] = useState(() => {
    const storedHistory = readStoredJson(storageKeys.adminActivityHistory, []); 
    return normalizeAdminActivityHistory(storedHistory);
  }); 
  const [activeAdminSection, setActiveAdminSection] = useState("Home"); 

  const recordAdminActivity = useCallback(({ title, description }) => {
    const normalizedTitle = (title || "").trim(); 
    if (!normalizedTitle) return; 

    const createdAt = Date.now(); 
    const activityItem = { 
      id: `${createdAt}-${Math.random().toString(36).slice(2, 8)}`, 
      title: normalizedTitle, 
      description: (description || "").trim(), 
      createdAt
    }; 

    setAdminActivityHistory((prev) => normalizeAdminActivityHistory([activityItem, ...prev])); 

    if (typeof window !== "undefined" && window.axios) {
      window.axios.post("/api/admin/activity-history", { 
        title: activityItem.title, 
        description: activityItem.description
      }).catch((error) => {
        console.warn("Gagal menyimpan history admin ke database.", error);
      });
    }
  }, []); 

  const tokenizeChildName = useCallback(
    (value) =>
    (value || "").
    toLowerCase().
    replace(/[^a-z0-9\s]/g, " ").
    split(/\s+/).
    filter((item) => item.length >= 3),
    []
  ); 

  const namesRoughlyMatch = useCallback((leftValue, rightValue) => {
    const normalizedLeft = (leftValue || "").trim().toLowerCase(); 
    const normalizedRight = (rightValue || "").trim().toLowerCase(); 
    if (!normalizedLeft || !normalizedRight) return false; 
    if (normalizedLeft === normalizedRight) return true; 

    const leftTokens = tokenizeChildName(leftValue); 
    const rightTokens = tokenizeChildName(rightValue); 
    if (leftTokens.length === 0 || rightTokens.length === 0) return false; 

    return leftTokens.some((token) => rightTokens.includes(token));
  }, [tokenizeChildName]); 

  const studentDirectory = [
  ...adminStudents.map((item) => ({ 
    id: item.id, 
    name: item.name, 
    category:
    Object.entries(coachCategoryLabels).find(([, label]) => label === item.category)?.[0] || "u10"
  })),
  ...coachPaymentSubmissions.
  filter((item) => item.studentName && item.category).
  map((item, index) => ({ 
    id: item.studentId || `payment-student-${index + 1}`, 
    name: item.studentName, 
    category: item.category
  }))].
  filter(
    (item, index, array) =>
    array.findIndex(
      (entry) =>
      entry.category === item.category &&
      entry.name.trim().toLowerCase() === item.name.trim().toLowerCase()
    ) === index
  ); 
  const publicMediaArticles = useMemo(
    () =>
    [...adminMediaArticles].
    sort((leftItem, rightItem) => rightItem.postedAt - leftItem.postedAt).
    map((article) => ({
      ...article, 
      excerpt: createArticleExcerpt(article.body), 
      players: resolveMediaArticlePlayers(article.targetKeys, adminStudents)
    })),
    [adminMediaArticles, adminStudents]
  ); 
  const pendingImportedRegistrationStudents = useMemo(
    () =>
    adminValidationIncoming.
    filter((item) => item.status === "Valid" && !item.studentImported).
    map((item) => ({ 
      registrationKey: item.key || `${item.email}-${item.childName || item.name}`.toLowerCase(), 
      name: (item.childName || item.name || "").trim(), 
      email: (item.email || "").trim().toLowerCase(), 
      category: resolveStudentCategoryFromAge(item.age)
    })).
    filter((item) => item.name),
    [adminValidationIncoming]
  ); 

  const activeParentProfile = parentProfiles[activeParentEmail] || { 
    userName: "user1", 
    paymentStatus: "unpaid", 
    paymentProofStatus: "pending", 
    accountCreated: true, 
    validationStatus: "pending"
  }; 
  const activeParentNotifications = parentNotificationsByEmail[activeParentEmail] || []; 
  const activeParentReuploadRequest = parentReuploadRequestsByEmail[activeParentEmail] || null; 
  const activeParentChildren =
  activeParentProfile.children?.length > 0 ?
  activeParentProfile.children :
  [activeParentProfile.userName || "Anak"]; 
  const selectedParentChildName =
  activeParentChild && activeParentChildren.includes(activeParentChild) ?
  activeParentChild :
  ""; 
  const displayParentChildName =
  selectedParentChildName || activeParentChildren[0] || activeParentProfile.userName || "Anak"; 
  const activeParentStudentRecord =
  studentDirectory.find((item) => namesRoughlyMatch(item.name, displayParentChildName)) || null; 
  const activeParentChildCategory = activeParentStudentRecord?.category || ""; 
  const activeParentChildCategoryLabel = coachCategoryLabels[activeParentChildCategory] || "-"; 
  const activeParentPaymentInfo =
  activeParentEmail && selectedParentChildName ?
  parentPaymentInfoByEmail[activeParentEmail]?.[selectedParentChildName] || null :
  null; 
  const activeParentTrainingSchedules = useMemo(
    () =>
    adminTrainingSchedules.
    filter((item) => {
      const scheduleStudentNames = normalizeScheduleStudentNames(item); 
      const matchesStudent = scheduleStudentNames.some((studentName) =>
      namesRoughlyMatch(studentName, displayParentChildName)
      ); 

      if (matchesStudent) return true; 

      const matchesCategory =
      item.category === "all" ||
      activeParentChildCategory && item.category === activeParentChildCategory; 

      return matchesCategory && scheduleStudentNames.length === 0;
    }).
    map((item) => ({
      ...item, 
      categoryLabel:
      item.category === "all" ? "Semua Siswa" : coachCategoryLabels[item.category] || "Semua Siswa", 
      targetLabel: (() => {
        const scheduleStudentNames = normalizeScheduleStudentNames(item); 
        if (scheduleStudentNames.length === 1) return scheduleStudentNames[0]; 
        if (scheduleStudentNames.length > 1) return `${scheduleStudentNames.length} siswa terpilih`; 
        return item.category === "all" ?
        "Semua Siswa" :
        coachCategoryLabels[item.category] || "Semua Siswa";
      })()
    })),
    [activeParentChildCategory, adminTrainingSchedules, displayParentChildName, namesRoughlyMatch]
  ); 
  const activePrestasiOrangTua = useMemo(
    () =>
    adminAchievements.
    filter((item) => namesRoughlyMatch(item.studentName, displayParentChildName)).
    sort((leftItem, rightItem) => rightItem.createdAt - leftItem.createdAt),
    [adminAchievements, displayParentChildName, namesRoughlyMatch]
  ); 
  const activeKehadiranOrangTuaRecaps = useMemo(
    () =>
    coachAttendanceRecaps.
    filter((item) => namesRoughlyMatch(item.playerName, displayParentChildName)).
    sort((leftItem, rightItem) => rightItem.createdAt - leftItem.createdAt),
    [coachAttendanceRecaps, displayParentChildName, namesRoughlyMatch]
  ); 
  const activePerformaOrangTuaHistory = useMemo(
    () =>
    coachPerformanceHistory.
    filter((item) => namesRoughlyMatch(item.player, displayParentChildName)).
    sort((leftItem, rightItem) => rightItem.createdAt - leftItem.createdAt),
    [coachPerformanceHistory, displayParentChildName, namesRoughlyMatch]
  ); 
  const hasActiveParentReupload = Boolean(activeParentEmail && activeParentReuploadRequest); 
  const coachNotesForApp = adminCatatanPelatih.map((item) => {
    const matchedStudent = studentDirectory.find((student) =>
    namesRoughlyMatch(student.name, item.studentName)
    ); 

    return { 
      id: item.id, 
      category: matchedStudent?.category || "u10", 
      player: item.studentName, 
      note: item.note, 
      coach: item.coachName, 
      date: item.date, 
      createdAt: parseSlashDateToTimestamp(item.date)
    };
  }); 
  const activeCatatanPelatihOrangTua = useMemo(
    () =>
    coachNotesForApp.
    filter((item) => namesRoughlyMatch(item.player, displayParentChildName)).
    sort((leftItem, rightItem) => rightItem.createdAt - leftItem.createdAt),
    [coachNotesForApp, displayParentChildName, namesRoughlyMatch]
  ); 
  const isParentActive =
  activeParentProfile.paymentStatus === "paid" &&
  activeParentProfile.validationStatus === "valid" &&
  activeParentProfile.paymentProofStatus === "valid"; 
  const parentUiPaymentStatus = isParentActive ? "paid" : "unpaid"; 

  useEffect(() => {
    if (!logoutSuccess) return undefined; 
    const timeoutId = setTimeout(() => setLogoutSuccess(null), 5000); 
    return () => clearTimeout(timeoutId);
  }, [logoutSuccess]); 

  useEffect(() => {
    if (!adminScheduleUpdateToast) return undefined; 
    const timeoutId = setTimeout(() => setAdminScheduleUpdateToast(null), 5000); 
    return () => clearTimeout(timeoutId);
  }, [adminScheduleUpdateToast]); 

  useEffect(() => {
    if (typeof window === "undefined" || !window.axios) return undefined; 
    if (activePage !== "admin-dashboard" && userRoleKey !== "admin") return undefined; 

    let isMounted = true; 
    window.axios.get("/api/admin/activity-history").
    then((response) => {
      if (!isMounted) return; 
      const rows = response?.data?.data; 
      if (Array.isArray(rows)) {
        setAdminActivityHistory(normalizeAdminActivityHistory(rows));
      }
    }).
    catch((error) => {
      console.warn("Gagal membaca history admin dari database.", error);
    }); 

    return () => {
      isMounted = false;
    };
  }, [activePage, userRoleKey]); 

  useEffect(() => {
    if (typeof window === "undefined") return; 
    window.localStorage.removeItem(storageKeys.authSession);
  }, []); 

  useEffect(() => {
    if (typeof window === "undefined") return; 
    window.localStorage.setItem(storageKeys.parentProfiles, JSON.stringify(parentProfiles));
  }, [parentProfiles]); 

  useEffect(() => {
    if (typeof window === "undefined") return; 
    window.localStorage.setItem(
      storageKeys.parentNotifications,
      JSON.stringify(parentNotificationsByEmail)
    );
  }, [parentNotificationsByEmail]); 

  useEffect(() => {
    if (typeof window === "undefined") return; 
    window.localStorage.setItem(
      storageKeys.parentPaymentInfo,
      JSON.stringify(parentPaymentInfoByEmail)
    );
  }, [parentPaymentInfoByEmail]); 

  useEffect(() => {
    if (typeof window === "undefined") return; 
    window.localStorage.setItem(
      storageKeys.globalNotifications,
      JSON.stringify(notifications)
    );
  }, [notifications]); 

  useEffect(() => {
    if (typeof window === "undefined") return; 
    window.localStorage.removeItem(storageKeys.authSession);
  }, [activeParentChild, activeParentEmail, isLoggedIn, userRole, userRoleKey]); 

  useEffect(() => {
    if (typeof window === "undefined") return; 
    window.localStorage.setItem(
      storageKeys.adminValidationIncoming,
      JSON.stringify(sanitizeValidationRowsForStorage(adminValidationIncoming))
    );
  }, [adminValidationIncoming]); 

  useEffect(() => {
    if (typeof window === "undefined") return; 
    window.localStorage.setItem(
      storageKeys.adminRegistrationPayments,
      JSON.stringify(sanitizeRegistrationPaymentsForStorage(adminRegistrationPayments))
    );
  }, [adminRegistrationPayments]); 

  useEffect(() => {
    if (typeof window === "undefined") return; 
    window.localStorage.setItem(
      storageKeys.coachPaymentSubmissions,
      JSON.stringify(sanitizeRegistrationPaymentsForStorage(coachPaymentSubmissions))
    );
  }, [coachPaymentSubmissions]); 

  useEffect(() => {
    if (typeof window === "undefined") return; 
    window.localStorage.setItem(
      storageKeys.coachAttendanceRecaps,
      JSON.stringify(coachAttendanceRecaps)
    );
  }, [coachAttendanceRecaps]); 

  useEffect(() => {
    if (typeof window === "undefined") return; 
    window.localStorage.setItem(
      storageKeys.coachPerformanceHistory,
      JSON.stringify(coachPerformanceHistory)
    );
  }, [coachPerformanceHistory]); 

  useEffect(() => {
    if (typeof window === "undefined") return; 
    window.localStorage.setItem(storageKeys.adminStudents, JSON.stringify(adminStudents));
  }, [adminStudents]); 

  useEffect(() => {
    if (typeof window === "undefined") return; 
    window.localStorage.setItem(storageKeys.adminCoaches, JSON.stringify(adminCoaches));
  }, [adminCoaches]); 

  useEffect(() => {
    if (typeof window === "undefined") return; 
    window.localStorage.setItem(storageKeys.adminCatatanPelatih, JSON.stringify(adminCatatanPelatih));
  }, [adminCatatanPelatih]); 

  useEffect(() => {
    if (typeof window === "undefined") return; 
    window.localStorage.setItem(
      storageKeys.adminTrainingSchedules,
      JSON.stringify(adminTrainingSchedules)
    );
  }, [adminTrainingSchedules]); 

  useEffect(() => {
    if (typeof window === "undefined") return; 
    window.localStorage.setItem(storageKeys.adminMediaArticles, JSON.stringify(adminMediaArticles));
  }, [adminMediaArticles]); 

  useEffect(() => {
    if (typeof window === "undefined") return; 
    window.localStorage.setItem(storageKeys.adminAchievements, JSON.stringify(adminAchievements));
  }, [adminAchievements]); 

  useEffect(() => {
    if (typeof window === "undefined") return; 
    window.localStorage.setItem(storageKeys.adminActivityHistory, JSON.stringify(adminActivityHistory));
  }, [adminActivityHistory]); 

  useEffect(() => {
    if (pendingImportedRegistrationStudents.length === 0) return; 

    setAdminStudents((prev) =>
    upsertAdminStudents(
      prev,
      pendingImportedRegistrationStudents.map((item) => ({ 
        name: item.name, 
        email: item.email, 
        category: item.category
      }))
    )
    ); 

    setAdminValidationIncoming((prev) =>
    prev.map((item) => {
      const registrationKey = item.key || `${item.email}-${item.childName || item.name}`.toLowerCase(); 
      return pendingImportedRegistrationStudents.some((entry) => entry.registrationKey === registrationKey) ?
      { ...item, studentImported: true } :
      item;
    })
    );
  }, [pendingImportedRegistrationStudents]); 

  useEffect(() => {
    if (publicMediaArticles.length === 0) return; 
    const stillExists = publicMediaArticles.some((item) => item.id === activeBeritaId); 
    if (!stillExists) {
      setActiveBeritaId(publicMediaArticles[0].id);
    }
  }, [activeBeritaId, publicMediaArticles]); 

  const renderWithOverlay = (page) => (
  <>
      {page}
      {logoutConfirm && (
    <div className="appOverlay" role="dialog" aria-modal="true" aria-label="Konfirmasi logout">
           <div className="appModalCard">
             <h3>Konfirmasi Logout</h3>
             <p>Yakin akan logout dari akun ini?</p>
             <div className="appModalActions">
               <button
            type="button"
            className="appModalBtn appModalBtnGhost"
            onClick={() => setLogoutConfirm(null)}>
            
                Tidak
              </button>
               <button
            type="button"
            className="appModalBtn appModalBtnPrimary"
            onClick={() => {
              const roleName = logoutConfirm; 
              setLogoutConfirm(null); 
              setIsLoggedIn(false); 
              setUserRoleKey(null); 
              setUserRole(null); 
              setAuthRole(null); 
              setActiveParentEmail(""); 
              setActiveParentChild(""); 
              navigateToPage("landing"); 
              setLogoutSuccess(`Logout ${roleName} berhasil.`);
            }}>
            
                Iya
              </button>
            </div>
          </div>
        </div>)
    }
      {logoutSuccess && (
    <div className="appToastCenter appToastSuccess" role="status" aria-live="polite">
           <strong>Berhasil</strong>
           <span>{logoutSuccess}</span>
        </div>)
    }
      {adminScheduleUpdateToast && (
    <div className="appToastCenter appToastSuccess" role="status" aria-live="polite">
           <strong>Berhasil</strong>
           <span>{adminScheduleUpdateToast}</span>
        </div>)
    }
      {isLoggedIn &&
    userRoleKey === "orangtua" &&
    parentPages.has(activePage) &&
    activePage !== "parent-reupload" &&
    activeParentChildren.length > 1 &&
    !selectedParentChildName && (
    <ModalPilihAnakOrangTua
      open
      childrenOptions={activeParentChildren}
      onSelectChild={(childName) => setActiveParentChild(childName)} />)

    }
    </>); 

  const navigateToPage = (page, options = {}) => {
    let nextPage = page; 

    if (!options.skipGuard && parentPages.has(page)) {
      if (!isLoggedIn || userRoleKey !== "orangtua") {
        nextPage = "landing";
      } else if (!activeParentEmail) {
          nextPage = "parent-dashboard";
        } else if (!selectedParentChildName && page !== "parent-dashboard") {
            nextPage = "parent-dashboard";
          } else if (hasActiveParentReupload && page !== "parent-reupload") {
              nextPage = "parent-reupload";
            } else if (!isParentActive && page !== "parent-dashboard" && page !== "parent-reupload") {
                nextPage = "parent-dashboard";
              }
    } 

    if (!options.skipGuard && coachPages.has(page) && (!isLoggedIn || userRoleKey !== "pelatih")) {
      nextPage = "landing";
    } 

    if (!options.skipGuard && adminPages.has(page) && (!isLoggedIn || userRoleKey !== "admin")) {
      nextPage = "landing";
    } 

    if (options.articleId) {
      setActiveBeritaId(options.articleId);
    } 

    setActiveAdminSection(
      nextPage === "admin-dashboard" ? options.adminSection || "Home" : "Home"
    ); 
    setActivePage(nextPage); 

    if (options.skipHistory) return; 

    const nextPath = buildPathForPage(nextPage, { 
      articleId: options.articleId || activeBeritaId, 
      adminSection: options.adminSection || activeAdminSection
    }); 

    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }
  }; 
  const openBeritaList = () => navigateToPage("berita-list"); 
  const openBeritaDetail = (id) => {
    setActiveBeritaId(id); 
    navigateToPage("berita-detail", { articleId: id });
  }; 
  const openGaleriPage = () => navigateToPage("galeri"); 
  const clearNotifications = () =>
  setNotifications((prev) =>
  prev.map((item, index) => ({
    ...normalizeGlobalNotificationItem(item, `global-notification-${index}`), 
    read: true
  }))
  ); 

  const findParentTargetsByChildName = (childName) => {
    const normalizedChildName = (childName || "").trim().toLowerCase(); 
    const queryTokens = tokenizeChildName(childName); 

    if (!normalizedChildName) return []; 

    return Object.entries(parentProfiles).flatMap(([email, profile]) =>
    (profile.children || []).
    filter((item) => {
      const normalizedItem = item.trim().toLowerCase(); 
      if (normalizedItem === normalizedChildName) return true; 

      const itemTokens = tokenizeChildName(item); 
      if (itemTokens.length === 0 || queryTokens.length === 0) return false; 

      return queryTokens.some((token) => itemTokens.includes(token));
    }).
    map((item) => ({ 
      email, 
      childName: item
    }))
    );
  }; 

  const findParentTargetsByCategory = (category) => {
    if (!category || category === "all") return []; 

    const categoryStudentNames = Array.from(
      new Set(
        coachPaymentSubmissions.
        filter((item) => item.category === category).
        map((item) => item.studentName).
        filter(Boolean)
      )
    ); 

    const matchedTargets = categoryStudentNames.flatMap((studentName) =>
    findParentTargetsByChildName(studentName)
    ); 

    return matchedTargets.filter(
      (target, index, array) =>
      array.findIndex(
        (item) => item.email === target.email && item.childName === target.childName
      ) === index
    );
  }; 

  const buildParentNotificationTargets = ({ studentName, category }) => {
    const normalizedStudentName = (studentName || "").trim().toLowerCase(); 

    if (normalizedStudentName && normalizedStudentName !== "semua siswa") {
      const studentTargets = findParentTargetsByChildName(studentName); 
      if (studentTargets.length > 0) return studentTargets;
    } 

    const categoryTargets = findParentTargetsByCategory(category); 
    if (categoryTargets.length > 0) return categoryTargets; 

    return Object.entries(parentProfiles).flatMap(([email, profile]) =>
    (profile.children || []).map((childName) => ({ 
      email, 
      childName
    }))
    );
  }; 

  const clearParentNotifications = () => {
    if (!activeParentEmail) return; 
    setParentNotificationsByEmail((prev) => ({
      ...prev, 
      [activeParentEmail]: (prev[activeParentEmail] || []).map((item) => ({
        ...item, 
        read: true
      }))
    }));
  }; 
  const requestLogout = () => {
    const roleName = userRole || "Akun"; 
    setLogoutConfirm(roleName);
  }; 
  const handleLoginSuccess = (role, payload) => {
    if (role.key === "orangtua") {
      const payloadEmail = (payload?.email || "").trim().toLowerCase(); 
      const parentEmail = resolveParentAccountEmail(parentProfiles, { 
        email: payloadEmail, 
        parentName: payload?.userName
      }); 
      if (!parentEmail) {
        navigateToPage("login-role"); 
        return;
      } 
      setIsLoggedIn(true); 
      setUserRoleKey(role.key); 
      setUserRole(role.label); 
      const defaultProfile = { userName: "user1", paymentStatus: "unpaid", validationStatus: "pending" }; 
      const nextProfile = { 
        userName: payload?.userName || parentProfiles[parentEmail]?.userName || defaultProfile.userName, 
        children:
        parentProfiles[parentEmail]?.children ||
        payload?.children ||
        [payload?.userName || parentProfiles[parentEmail]?.userName || "Anak"], 
        paymentStatus:
        payload?.paymentStatus || parentProfiles[parentEmail]?.paymentStatus || defaultProfile.paymentStatus, 
        paymentProofStatus:
        payload?.paymentProofStatus ||
        parentProfiles[parentEmail]?.paymentProofStatus ||
        "pending", 
        validationStatus:
        payload?.validationStatus || parentProfiles[parentEmail]?.validationStatus || defaultProfile.validationStatus, 
        accountCreated: payload?.accountCreated ?? parentProfiles[parentEmail]?.accountCreated ?? true, 
        password: parentProfiles[parentEmail]?.password || "", 
        tempPassword: parentProfiles[parentEmail]?.tempPassword || "", 
        linkedEmails: mergeUniqueItems(
          parentProfiles[parentEmail]?.linkedEmails || [],
          payload?.linkedEmails || [],
          [payloadEmail, parentEmail]
        )
      }; 
      setParentProfiles((prev) => ({ ...prev, [parentEmail]: nextProfile })); 
      setActiveParentEmail(parentEmail); 
      setActiveParentChild(""); 
      const hasPendingReuploadRequest = Boolean(parentReuploadRequestsByEmail[parentEmail]); 
      navigateToPage(hasPendingReuploadRequest ? "parent-reupload" : "parent-dashboard", { 
        skipGuard: true
      }); 
      return;
    } 
    setIsLoggedIn(true); 
    setUserRoleKey(role.key); 
    setUserRole(role.label); 
    const welcomeNotif = createGlobalNotification({ 
      id: Date.now(), 
      text: `Selamat datang! Login ${role.label} berhasil.`
    }); 
    setNotifications((prev) => [welcomeNotif, ...prev]); 
    if (role.key === "pelatih") {
      navigateToPage("coach-dashboard", { skipGuard: true }); 
      return;
    } 
    if (role.key === "admin") {
      navigateToPage("admin-dashboard", { adminSection: "Home", skipGuard: true }); 
      return;
    } 
    navigateToPage("landing");
  }; 
  const openLoginSelector = () => navigateToPage("login-select"); 
  const openRoleLogin = (role) => {
    setAuthRole(role); 
    navigateToPage("login-role");
  }; 

  const handleOpenRegistrationForm = (accountDraft) => {
    if (accountDraft) {
      setRegistrationAccountDraft(accountDraft);
    } 
    navigateToPage("register-form");
  }; 

  const handleOpenRegistrationPaymentProof = (registrationPayload) => {
    setRegistrationPaymentDraft({ 
      childName: registrationPayload?.childName || registrationPayload?.name || "", 
      parentName: registrationAccountDraft.name || "", 
      email: registrationAccountDraft.email || registrationPayload?.email || "", 
      registrationYear: new Date().getFullYear(), 
      formValues: registrationPayload?.formValues || null, 
      uploadedFiles: registrationPayload?.uploadedFiles || null
    }); 
    navigateToPage("register-payment-proof");
  }; 

  const handleSubmitRegistration = (registrationPayload) => {
    const createdAt = Date.now(); 
    const normalizedEmail = (registrationPayload?.email || "").trim().toLowerCase(); 
    const parentName =
    registrationAccountDraft.name.trim() || registrationPayload?.parentName || "Orang Tua"; 
    const resolvedParentEmail = resolveParentAccountEmail(parentProfiles, { 
      email: normalizedEmail, 
      parentName
    }); 
    const childName = (registrationPayload?.childName || registrationPayload?.name || "-").trim(); 
    const childCategory = resolveStudentCategoryFromAge(registrationPayload?.age); 
    const itemKey = `${resolvedParentEmail || normalizedEmail}-${childName}`.toLowerCase(); 
    const isExistingRegistration = adminValidationIncoming.some((item) => item.key === itemKey); 

    if (resolvedParentEmail) {
      setParentProfiles((prev) => {
        const existingProfile = prev[resolvedParentEmail] || {}; 
        const duplicateProfile =
        normalizedEmail && resolvedParentEmail !== normalizedEmail ? prev[normalizedEmail] || {} : {}; 
        const nextProfiles = { ...prev }; 

        if (normalizedEmail && resolvedParentEmail !== normalizedEmail) {
          delete nextProfiles[normalizedEmail];
        } 

        nextProfiles[resolvedParentEmail] = {
          ...duplicateProfile,
          ...existingProfile, 
          userName:
          registrationAccountDraft.name.trim() ||
          registrationPayload.name ||
          existingProfile.userName ||
          duplicateProfile.userName ||
          "Orang Tua", 
          phone:
          registrationAccountDraft.phone.trim() ||
          registrationPayload.phone ||
          existingProfile.phone ||
          duplicateProfile.phone ||
          "-", 
          paymentStatus: existingProfile.paymentStatus || duplicateProfile.paymentStatus || "unpaid", 
          paymentProofStatus:
          existingProfile.paymentProofStatus || duplicateProfile.paymentProofStatus || "pending", 
          validationStatus:
          existingProfile.validationStatus || duplicateProfile.validationStatus || "pending", 
          accountCreated:
          existingProfile.accountCreated || duplicateProfile.accountCreated || false, 
          password:
          existingProfile.password ||
          duplicateProfile.password ||
          registrationAccountDraft.password.trim(), 
          tempPassword: existingProfile.tempPassword || duplicateProfile.tempPassword || "", 
          children: mergeUniqueItems(
            existingProfile.children || [],
            duplicateProfile.children || [],
            [(registrationPayload.childName || registrationPayload.name || "").trim()]
          ), 
          linkedEmails: mergeUniqueItems(
            existingProfile.linkedEmails || [],
            duplicateProfile.linkedEmails || [],
            [resolvedParentEmail, normalizedEmail]
          )
        }; 

        return nextProfiles;
      });
    } 

    if (childName && resolvedParentEmail) {
      setAdminStudents((prev) =>
      upsertAdminStudents(prev, [
      { 
        name: childName, 
        email: resolvedParentEmail, 
        category: childCategory
      }]
      )
      );
    } 

    setAdminValidationIncoming((prev) => {
      const existingIndex = prev.findIndex((item) => item.key === itemKey); 
      if (existingIndex >= 0) {
        const next = [...prev]; 
        next[existingIndex] = {
          ...next[existingIndex],
          ...registrationPayload, 
          key: itemKey, 
          createdAt, 
          email: resolvedParentEmail || normalizedEmail, 
          childName, 
          name: childName, 
          phone: registrationPayload?.phone || registrationAccountDraft.phone.trim() || "-", 
          status: next[existingIndex].status || "Belum Diperiksa"
        }; 
        return next;
      } 
      return [
      ...prev,
      { 
        key: itemKey, 
        createdAt,
        ...registrationPayload, 
        email: resolvedParentEmail || normalizedEmail, 
        childName, 
        name: childName, 
        phone: registrationPayload?.phone || registrationAccountDraft.phone.trim() || "-"
      }];

    }); 

    if (!isExistingRegistration) {
      setNotifications((prev) => [
      createGlobalNotification({ 
        id: createdAt + 1, 
        text: `[Pendaftaran Baru] ${parentName} (${resolvedParentEmail || normalizedEmail || "-"}) mengirim berkas pendaftaran untuk ${childName}.`
      }),
      ...prev]
      );
    }
  }; 

  const handleSubmitRegistrationPaymentProof = (paymentPayload) => {
    const createdAt = Date.now(); 
    const normalizedEmail = (paymentPayload?.email || "").trim().toLowerCase(); 
    const childName = (paymentPayload?.studentName || paymentPayload?.childName || "").trim(); 
    const parentName = (paymentPayload?.parentName || "").trim(); 
    const resolvedParentEmail = resolveParentAccountEmail(parentProfiles, { 
      email: normalizedEmail, 
      parentName
    }); 
    if (!resolvedParentEmail || !childName || !paymentPayload?.proofFile) return; 

    const itemKey = `${resolvedParentEmail}-${childName}`.toLowerCase(); 
    setAdminValidationIncoming((prev) => {
      const existingIndex = prev.findIndex((item) => item.key === itemKey); 
      if (existingIndex >= 0) {
        const existingItem = prev[existingIndex]; 
        const nextFiles = {
          ...(existingItem.files || {}), 
          paymentProof: [paymentPayload.proofFile.name]
        }; 
        const nextFileObjects = {
          ...(existingItem.fileObjects || {}), 
          paymentProof: [paymentPayload.proofFile]
        }; 
        const next = [...prev]; 
        next[existingIndex] = {
          ...existingItem, 
          files: nextFiles, 
          fileObjects: nextFileObjects, 
          createdAt, 
          email: resolvedParentEmail
        }; 
        return next;
      } 

      return [
      ...prev,
      { 
        key: itemKey, 
        createdAt, 
        name: childName, 
        childName, 
        email: resolvedParentEmail, 
        phone: registrationAccountDraft.phone || "-", 
        motherName: "-", 
        fatherName: "-", 
        age: "-", 
        status: "Belum Diperiksa", 
        files: { 
          paymentProof: [paymentPayload.proofFile.name]
        }, 
        fileObjects: { 
          paymentProof: [paymentPayload.proofFile]
        }
      }];

    }); 

    setAdminRegistrationPayments((prev) => {
      const existingIndex = prev.findIndex((item) => item.key === itemKey); 
      const nextItem = { 
        id: existingIndex >= 0 ? prev[existingIndex].id : `${itemKey}-${createdAt}`, 
        key: itemKey, 
        createdAt, 
        childName, 
        parentName, 
        email: resolvedParentEmail, 
        paymentType: paymentPayload.paymentType || "Pendaftaran", 
        period: paymentPayload.period || "-", 
        paidDate: paymentPayload.paidDate || "", 
        amount: Number(paymentPayload.amount) || 0, 
        proofFileName: paymentPayload.proofFile.name, 
        proofFile: paymentPayload.proofFile, 
        proofFileType: paymentPayload.proofFile.type || "", 
        status: existingIndex >= 0 ? prev[existingIndex].status : "Menunggu Verifikasi", 
        source: "registration"
      }; 

      if (existingIndex >= 0) {
        const next = [...prev]; 
        next[existingIndex] = nextItem; 
        return next.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
      } 

      return [nextItem, ...prev];
    }); 

    if (resolvedParentEmail && childName) {
      setParentProfiles((prev) => {
        const existingProfile = prev[resolvedParentEmail] || {}; 
        const duplicateProfile =
        normalizedEmail && resolvedParentEmail !== normalizedEmail ? prev[normalizedEmail] || {} : {}; 
        const nextProfiles = { ...prev }; 

        if (normalizedEmail && resolvedParentEmail !== normalizedEmail) {
          delete nextProfiles[normalizedEmail];
        } 

        nextProfiles[resolvedParentEmail] = {
          ...duplicateProfile,
          ...existingProfile, 
          userName: existingProfile.userName || duplicateProfile.userName || parentName || "Orang Tua", 
          children: mergeUniqueItems(
            existingProfile.children || [],
            duplicateProfile.children || [],
            [childName]
          ), 
          paymentStatus: existingProfile.paymentStatus || duplicateProfile.paymentStatus || "unpaid", 
          paymentProofStatus: "pending", 
          validationStatus:
          existingProfile.validationStatus || duplicateProfile.validationStatus || "pending", 
          accountCreated:
          existingProfile.accountCreated ?? duplicateProfile.accountCreated ?? true, 
          password: existingProfile.password || duplicateProfile.password || "", 
          tempPassword: existingProfile.tempPassword || duplicateProfile.tempPassword || "", 
          linkedEmails: mergeUniqueItems(
            existingProfile.linkedEmails || [],
            duplicateProfile.linkedEmails || [],
            [resolvedParentEmail, normalizedEmail]
          )
        }; 

        return nextProfiles;
      });
    } 

    setNotifications((prev) => [
    createGlobalNotification({ 
      id: createdAt + 11, 
      text: `[Pembayaran Pendaftaran] ${childName} (${resolvedParentEmail}) mengunggah bukti pembayaran.`
    }),
    ...prev]
    );
  }; 

  const handleCoachPaymentUpload = (payload) => {
    const createdAt = Date.now(); 
    if (!payload?.studentName || !payload?.proofFile || !payload?.paymentType) return; 

    setCoachPaymentSubmissions((prev) => [
    { 
      id: `coach-${createdAt}`, 
      createdAt, 
      studentId: payload.studentId, 
      studentName: payload.studentName, 
      category: payload.category, 
      categoryLabel: payload.categoryLabel || coachCategoryLabels[payload.category] || "-", 
      paymentType: payload.paymentType, 
      paymentTypeLabel: coachPaymentTypeLabels[payload.paymentType] || payload.paymentType, 
      paidDate: payload.paidDate, 
      paidDateLabel: payload.paidDateLabel, 
      amount: Number(payload.amount) || 0, 
      proofFileName: payload.proofFile.name, 
      proofFile: payload.proofFile, 
      proofFileType: payload.proofFile.type || "", 
      status: "Menunggu Verifikasi", 
      source: "coach"
    },
    ...prev]
    ); 

    setNotifications((prev) => [
    createGlobalNotification({ 
      id: createdAt + 20, 
      text: `[Pembayaran Pelatih] ${payload.studentName} mengunggah bukti pembayaran ${coachPaymentTypeLabels[payload.paymentType] || payload.paymentType}.`
    }),
    ...prev]
    );
  }; 

  const handleCoachPaymentDelete = (paymentId) => {
    setCoachPaymentSubmissions((prev) => prev.filter((item) => item.id !== paymentId));
  }; 

  const handleAdminUpdateTrainingSchedule = ({ id, field, value }) => {
    if (!id || !field) return; 

    const scheduleFieldLabels = { 
      day: "Hari jadwal", 
      time: "Waktu jadwal", 
      place: "Tempat jadwal", 
      category: "Kategori jadwal", 
      studentName: "Target siswa jadwal", 
      studentNames: "Target siswa jadwal"
    }; 

    let hasUpdated = false; 

    setAdminTrainingSchedules((prev) =>
    prev.map((item) => {
      if (item.id !== id) return item; 

      const previousValue = Array.isArray(item[field]) ?
      JSON.stringify(item[field]) :
      String(item[field] ?? "").trim(); 
      const nextValue = Array.isArray(value) ? JSON.stringify(value) : String(value ?? "").trim(); 

      if (previousValue === nextValue) {
        return item;
      } 

      const nextItem = {
        ...item, 
        [field]: value
      }; 

      if (field === "studentNames") {
        const studentNames = normalizeScheduleStudentNames({ studentNames: value }); 
        nextItem.studentNames = studentNames; 
        nextItem.studentName = studentNames.length === 1 ? studentNames[0] : "all";
      } 

      if (field === "category" && value !== "all") {
        const studentNames = normalizeScheduleStudentNames(nextItem); 
        const matchingStudentNames = studentNames.filter((studentName) =>
        studentDirectory.some(
          (student) =>
          student.category === value &&
          student.name.trim().toLowerCase() === studentName.trim().toLowerCase()
        )
        ); 

        if (matchingStudentNames.length > 0) {
          nextItem.studentNames = matchingStudentNames; 
          nextItem.studentName = matchingStudentNames.length === 1 ? matchingStudentNames[0] : "all";
        } else {
          nextItem.studentNames = []; 
          nextItem.studentName = "all";
        }
      } 

      if (field === "category" && value === "all") {
        const studentNames = normalizeScheduleStudentNames(nextItem); 
        nextItem.studentNames = studentNames; 
        nextItem.studentName = studentNames.length === 1 ? studentNames[0] : "all";
      } 

      hasUpdated = true; 
      return nextItem;
    })
    ); 

    if (hasUpdated) {
      setAdminScheduleUpdateToast(
        `${scheduleFieldLabels[field] || "Jadwal latihan"} sudah diupdate.`
      ); 
      recordAdminActivity({ 
        title: "Mengubah jadwal latihan", 
        description: `${scheduleFieldLabels[field] || "Jadwal latihan"} diperbarui.`
      });
    }
  }; 

  const handleAdminAddTrainingSchedule = () => {
    setAdminTrainingSchedules((prev) => {
      const draft = adminTrainingScheduleDrafts[prev.length % adminTrainingScheduleDrafts.length]; 
      const nextItem = normalizeTrainingScheduleItem(
        { 
          id: `schedule-${Date.now()}`,
          ...draft, 
          category: "all", 
          studentName: "all"
        },
        `schedule-${prev.length + 1}`
      ); 

      return [...prev, nextItem];
    }); 
    recordAdminActivity({ 
      title: "Menambah jadwal latihan", 
      description: "Admin menambahkan jadwal latihan baru."
    });
  }; 

  const handleAdminDeleteTrainingSchedule = (scheduleId) => {
    const deletedSchedule = adminTrainingSchedules.find((item) => item.id === scheduleId); 
    setAdminTrainingSchedules((prev) => prev.filter((item) => item.id !== scheduleId)); 
    recordAdminActivity({ 
      title: "Menghapus jadwal latihan", 
      description: deletedSchedule ?
      `${deletedSchedule.day || "Jadwal"} ${deletedSchedule.time || ""}`.trim() :
      "Admin menghapus jadwal latihan."
    });
  }; 

  const handleAdminSaveMediaArticle = (payload) => {
    const trimmedTitle = payload?.title?.trim() || ""; 
    const trimmedBody = payload?.body?.trim() || ""; 
    const image = payload?.image || ""; 

    if (!trimmedTitle || !trimmedBody || !image) return false; 

    setAdminMediaArticles((prev) => {
      const existingArticle = prev.find((item) => item.id === payload.id); 

      if (existingArticle) {
        return prev.map((item) =>
        item.id === payload.id ?
        normalizeMediaArticleItem(
          {
            ...item, 
            title: trimmedTitle, 
            body: trimmedBody, 
            image, 
            imageName: payload?.imageName || item.imageName, 
            targetKeys: payload?.targetKeys || []
          },
          item.id
        ) :
        item
        );
      } 

      const nextId = prev.length > 0 ? Math.max(...prev.map((item) => Number(item.id) || 0)) + 1 : 1; 
      return [
      normalizeMediaArticleItem(
        { 
          id: nextId, 
          title: trimmedTitle, 
          body: trimmedBody, 
          image, 
          imageName: payload?.imageName || "foto-berita.jpg", 
          postedAt: Date.now(), 
          targetKeys: payload?.targetKeys || []
        },
        nextId
      ),
      ...prev];

    }); 

    recordAdminActivity({ 
      title: payload?.id ? "Mengubah berita" : "Mempublikasikan berita", 
      description: trimmedTitle
    }); 

    return true;
  }; 

  const handleAdminDeleteMediaArticle = (articleId) => {
    const deletedArticle = adminMediaArticles.find((item) => item.id === articleId); 
    setAdminMediaArticles((prev) => prev.filter((item) => item.id !== articleId)); 
    recordAdminActivity({ 
      title: "Menghapus berita", 
      description: deletedArticle?.title || "Admin menghapus berita."
    });
  }; 

  const handleAdminAddAchievement = ({ studentId, title }) => {
    const normalizedTitle = (title || "").trim(); 
    if (!studentId || !normalizedTitle) return false; 

    const matchedStudent = adminStudents.find((item) => Number(item.id) === Number(studentId)); 
    if (!matchedStudent) return false; 

    setAdminAchievements((prev) => [
    normalizeAdminAchievementItem(
      { 
        id: Date.now(), 
        studentId: matchedStudent.id, 
        studentName: matchedStudent.name, 
        category: matchedStudent.category, 
        title: normalizedTitle, 
        createdAt: Date.now()
      },
      Date.now()
    ),
    ...prev]
    ); 

    recordAdminActivity({ 
      title: "Menambah prestasi", 
      description: `${matchedStudent.name} - ${normalizedTitle}`
    }); 

    return true;
  }; 

  const handleAdminDeleteStudent = (studentId) => {
    const deletedStudent = adminStudents.find((student) => student.id === studentId); 
    setAdminStudents((prev) => prev.filter((student) => student.id !== studentId)); 
    recordAdminActivity({ 
      title: "Menghapus data siswa", 
      description: deletedStudent?.name || "Admin menghapus data siswa."
    });
  }; 

  const handleAdminAddCoach = ({ name, email }) => {
    setAdminCoaches((prev) => [
    ...prev,
    { 
      id: Date.now(), 
      name, 
      email
    }]
    ); 
    recordAdminActivity({ 
      title: "Menambah pelatih", 
      description: `${name}${email ? ` (${email})` : ""}`
    });
  }; 

  const handleAdminDeleteCoach = (coachId) => {
    const deletedCoachName =
    adminCoaches.find((coach) => coach.id === coachId)?.name || ""; 

    setAdminCoaches((prev) => prev.filter((coach) => coach.id !== coachId)); 
    recordAdminActivity({ 
      title: "Menghapus pelatih", 
      description: deletedCoachName || "Admin menghapus data pelatih."
    }); 

    if (deletedCoachName) {
      setAdminCatatanPelatih((prev) =>
      prev.filter((item) => item.coachName !== deletedCoachName)
      );
    }
  }; 

  const handleCoachSubmitAttendance = ({ 
    category, 
    scheduleId = "", 
    scheduleLabel = "", 
    fromDate, 
    toDate, 
    players = [], 
    statuses = {}, 
    coachName = "Zulfahmi"
  }) => {
    if (!fromDate || !toDate || !Array.isArray(players) || players.length === 0) return false; 

    const startDate = new Date(fromDate); 
    const month = coachMonthValues[startDate.getMonth()] || coachMonthValues[0]; 
    const year = String(startDate.getFullYear() || new Date().getFullYear()); 
    const createdAt = Date.now(); 
    const nextRows = players.
    filter((player) => player?.name && statuses[player.id]).
    map((player, index) => {
      const status = statuses[player.id]; 
      return normalizeKehadiranPelatihItem(
        { 
          id: `${createdAt}-${index + 1}`, 
          coachName, 
          playerName: player.name, 
          category: category && category !== "all" ? category : player.category, 
          scheduleId, 
          scheduleLabel, 
          month, 
          year, 
          hadir: status === "hadir" ? 100 : 0, 
          sakit: status === "sakit" ? 100 : 0, 
          izin: status === "izin" ? 100 : 0, 
          fromDate, 
          toDate, 
          createdAt: createdAt + index
        },
        `${createdAt}-${index + 1}`
      );
    }); 

    if (nextRows.length === 0) return false; 

    setKehadiranPelatihRecaps((prev) => {
      const nextKeys = new Set(
        nextRows.map(
          (item) =>
          `${item.playerName.toLowerCase()}-${item.month}-${item.year}-${item.scheduleId || "no-schedule"}`
        )
      ); 
      const retainedRows = prev.filter(
        (item) =>
        !nextKeys.has(
          `${item.playerName.toLowerCase()}-${item.month}-${item.year}-${item.scheduleId || "no-schedule"}`
        )
      ); 
      return [...nextRows, ...retainedRows];
    }); 

    setNotifications((prev) => [
    createGlobalNotification({ 
      id: createdAt + 100, 
      text: `[Kehadiran] ${coachName} memperbarui rekap ${scheduleLabel || "jadwal latihan"} untuk ${formatMonthYearLabel(month, year)}.`
    }),
    ...prev]
    ); 

    return true;
  }; 

  const handleCoachSavePerformance = (rows = []) => {
    if (!Array.isArray(rows) || rows.length === 0) return false; 

    const normalizedRows = rows.map((item, index) =>
    normalizePerformaPelatihItem(
      {
        ...item, 
        id: item.id ?? `${Date.now()}-${index + 1}`, 
        createdAt: Number(item.createdAt) || Date.now() + index
      },
      `${Date.now()}-${index + 1}`
    )
    ); 

    setPerformaPelatihHistory((prev) => {
      const nextKeys = new Set(
        normalizedRows.map(
          (item) => `${item.player.toLowerCase()}-${item.month}-${item.year}-${item.coach}`
        )
      ); 
      const retainedRows = prev.filter(
        (item) =>
        !nextKeys.has(`${item.player.toLowerCase()}-${item.month}-${item.year}-${item.coach}`)
      ); 
      return [...normalizedRows, ...retainedRows];
    }); 

    const latestRow = normalizedRows[0]; 
    setNotifications((prev) => [
    createGlobalNotification({ 
      id: Date.now() + 200, 
      text: `[Performa] ${latestRow.coach} menyimpan nilai ${formatMonthYearLabel(latestRow.month, latestRow.year)}.`
    }),
    ...prev]
    ); 

    return true;
  }; 

  const handleCoachSaveNote = ({ player, note, coach, date }) => {
    setAdminCatatanPelatih((prev) => [
    { 
      id: Date.now(), 
      coachName: coach, 
      studentName: player, 
      date, 
      note
    },
    ...prev]
    ); 

    setNotifications((prev) => [
    createGlobalNotification({ 
      id: Date.now() + 1, 
      text: `[Catatan Pelatih] ${coach} menambahkan catatan untuk ${player}.`
    }),
    ...prev]
    );
  }; 

  const handleCoachDeleteNote = (noteId) => {
    setAdminCatatanPelatih((prev) => prev.filter((item) => item.id !== noteId));
  }; 

  const handleAdminUpdatePaymentStatus = ({ id, source, status }) => {
    const updatedAt = Date.now(); 
    if (!id || !status) return; 

    if (source === "coach") {
      let updatedItem = null; 
      setCoachPaymentSubmissions((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item; 
        updatedItem = { ...item, status }; 
        return updatedItem;
      })
      ); 

      if (updatedItem) {
        setNotifications((prev) => [
        createGlobalNotification({ 
          id: updatedAt, 
          text: `[Validasi Pembayaran] ${updatedItem.studentName} ditandai ${status.toLowerCase()} oleh admin.`
        }),
        ...prev]
        ); 
        recordAdminActivity({ 
          title: "Memvalidasi pembayaran", 
          description: `${updatedItem.studentName || "Siswa"} ditandai ${status.toLowerCase()}.`
        }); 

        const matchedParents = findParentTargetsByChildName(updatedItem.studentName || ""); 
        const uniqueParentEmails = Array.from(new Set(matchedParents.map((item) => item.email))); 

        if (uniqueParentEmails.length > 0 && updatedItem.paymentType === "pendaftaran") {
          setParentProfiles((prev) => {
            const next = { ...prev }; 

            uniqueParentEmails.forEach((email) => {
              next[email] = {
                ...(prev[email] || {}), 
                paymentStatus: status === "Sudah Dibayar" ? "paid" : "unpaid", 
                paymentProofStatus: status === "Sudah Dibayar" ? "valid" : "pending"
              };
            }); 

            return next;
          }); 

          setParentNotificationsByEmail((prev) => {
            const next = { ...prev }; 

            uniqueParentEmails.forEach((email, index) => {
              next[email] = [
              createParentNotification({ 
                id: updatedAt + index + 1, 
                text:
                status === "Sudah Dibayar" ?
                "Pembayaran pendaftaran telah divalidasi admin. Akun siap diaktifkan setelah validasi berkas." :
                "Pembayaran pendaftaran diperiksa admin dan masih belum sesuai. Silakan cek kembali pembayaran Anda."
              }),
              ...(prev[email] || [])];

            }); 

            return next;
          });
        }
      } 
      return;
    } 

    let updatedRegistration = null; 
    setAdminRegistrationPayments((prev) =>
    prev.map((item) => {
      if (item.id !== id) return item; 
      updatedRegistration = { ...item, status }; 
      return updatedRegistration;
    })
    ); 

    if (updatedRegistration?.email) {
      recordAdminActivity({ 
        title: "Memvalidasi pembayaran", 
        description: `${updatedRegistration.childName || updatedRegistration.parentName || "Pendaftar"} ditandai ${status.toLowerCase()}.`
      }); 
      setParentProfiles((prev) => ({
        ...prev, 
        [updatedRegistration.email]: {
          ...(prev[updatedRegistration.email] || {}), 
          paymentStatus: status === "Sudah Dibayar" ? "paid" : "unpaid", 
          paymentProofStatus: status === "Sudah Dibayar" ? "valid" : "pending"
        }
      })); 

      setParentNotificationsByEmail((prev) => ({
        ...prev, 
        [updatedRegistration.email]: [
        createParentNotification({ 
          id: updatedAt + 1, 
          text:
          status === "Sudah Dibayar" ?
          "Bukti pembayaran telah divalidasi admin. Pembayaran dinyatakan lunas." :
          "Bukti pembayaran diperiksa admin dan masih belum sesuai. Silakan cek kembali pembayaran Anda."
        }),
        ...(prev[updatedRegistration.email] || [])]

      }));
    }
  }; 

  const handleAdminSendPaymentNotification = ({ category, studentName, notificationType, message }) => {
    const createdAt = Date.now(); 
    const trimmedMessage = message?.trim() || "Admin mengirim pemberitahuan pembayaran."; 
    const trimmedStudentName = studentName?.trim() || ""; 
    const categoryLabel =
    category === "all" ? "" : coachCategoryLabels[category] || category || ""; 
    const detailParts = [trimmedStudentName, notificationType, categoryLabel].filter(Boolean); 
    const detailText = detailParts.length > 0 ? ` (${detailParts.join(" | ")})` : ""; 

    setNotifications((prev) => [
    createGlobalNotification({ 
      id: createdAt, 
      text: `[Notifikasi Pembayaran]${detailText} ${trimmedMessage}`
    }),
    ...prev]
    ); 

    const parentTargets = buildParentNotificationTargets({ 
      studentName: trimmedStudentName, 
      category
    }); 
    if (parentTargets.length === 0) return; 

    const parentNotificationTitle = notificationType || "Info Pembayaran"; 
    const parentNotificationText = `[${parentNotificationTitle}] ${trimmedMessage}`; 
    const uniqueParentEmails = Array.from(new Set(parentTargets.map((item) => item.email))); 

    setParentNotificationsByEmail((prev) => {
      const next = { ...prev }; 

      uniqueParentEmails.forEach((email, index) => {
        next[email] = [
        createParentNotification({ 
          id: createdAt + index + 1, 
          text: parentNotificationText
        }),
        ...(prev[email] || [])];

      }); 

      return next;
    }); 

    setParentPaymentInfoByEmail((prev) => {
      const next = { ...prev }; 

      parentTargets.forEach(({ email, childName }) => {
        next[email] = {
          ...(prev[email] || {}), 
          [childName]: { 
            id: createdAt, 
            title: parentNotificationTitle, 
            message: trimmedMessage, 
            categoryLabel
          }
        };
      }); 

      return next;
    }); 

    recordAdminActivity({ 
      title: "Mengirim notifikasi pembayaran", 
      description: `${trimmedStudentName || "Semua siswa"} - ${trimmedMessage}`
    });
  }; 

  const handleAdminSendValidationNotification = ({ 
    name, 
    email, 
    phone, 
    message, 
    document, 
    invalidIdentityFields = [], 
    invalidUploadFields = []
  }) => {
    const createdAt = Date.now(); 
    const normalizedName = normalizeParentIdentityName(name); 
    let targetEmail = resolveParentAccountEmail(parentProfiles, { 
      email, 
      parentName: name
    });

    // Fallback akun demo orang tua agar notifikasi validasi tidak hilang.
    if (!targetEmail && normalizedName.includes("udin")) {
      targetEmail = "udinanjay@gmail.com";
    } 

    const normalizedChildName = (document?.childName || name || "").trim().toLowerCase(); 
    setAdminValidationIncoming((prev) =>
    prev.map((item) => {
      const itemChildName = (item.childName || item.name || "").trim().toLowerCase(); 
      const isSameDocument =
      itemChildName === normalizedChildName && (
      targetEmail ? (item.email || "").trim().toLowerCase() === targetEmail : true); 

      if (!isSameDocument) return item; 

      return {
        ...item, 
        status: "Perlu Perbaikan", 
        invalidIdentityFields, 
        invalidUploadFields, 
        createdAt
      };
    })
    ); 

    if (targetEmail) {
      const validationNotifPrefix = `[Validasi Berkas] ${name}:`; 
      setParentNotificationsByEmail((prev) => ({
        ...prev, 
        [targetEmail]: [
        createParentNotification({ 
          id: createdAt, 
          text: `[Validasi Berkas] ${name}: ${message}`, 
          action: { 
            type: "open-reupload", 
            label: "Perbaiki Sekarang"
          }
        }),
        ...(prev[targetEmail] || []).filter(
          (item) => typeof item?.text !== "string" || !item.text.startsWith(validationNotifPrefix)
        )]

      })); 
      setParentReuploadRequestsByEmail((prev) => ({
        ...prev, 
        [targetEmail]: { 
          id: createdAt, 
          name, 
          email: targetEmail, 
          phone: phone || "", 
          message, 
          document: document || null, 
          invalidIdentityFields, 
          invalidUploadFields
        }
      })); 
      setParentProfiles((prev) => ({
        ...prev, 
        [targetEmail]: {
          ...(prev[targetEmail] || {}), 
          userName: (name || prev[targetEmail]?.userName || "Orang Tua").trim(), 
          paymentStatus: prev[targetEmail]?.paymentStatus || "unpaid", 
          paymentProofStatus:
          invalidUploadFields.includes("paymentProof") ?
          "needs_fix" :
          prev[targetEmail]?.paymentProofStatus || "pending", 
          accountCreated: true, 
          validationStatus: "needs_fix", 
          linkedEmails: mergeUniqueItems(prev[targetEmail]?.linkedEmails || [], [targetEmail])
        }
      })); 
      if (isLoggedIn && userRoleKey === "orangtua" && activeParentEmail === targetEmail) {
        navigateToPage("parent-reupload");
      }
    }
    // Simulasi pengiriman email dari front-end.
    // Integrasi SMTP/API email bisa dipasang di backend.
    console.info(
      `[EMAIL_SIMULATION] to=${targetEmail || email} subject=Upload Ulang Berkas message=${message} invalidIdentity=${invalidIdentityFields.join("|")} invalidUpload=${invalidUploadFields.join("|")}`
    ); 
    recordAdminActivity({ 
      title: "Mengirim notifikasi validasi", 
      description: `${name || "Pendaftar"} - ${message}`
    });
  }; 

  const handleAdminCreateParentAccount = ({ name, email, phone, childName, age }) => {
    const createdAt = Date.now(); 
    const requestedEmail = (email || "").trim().toLowerCase(); 
    const targetEmail = resolveParentAccountEmail(parentProfiles, { 
      email: requestedEmail, 
      parentName: name
    }); 
    if (!targetEmail) return; 
    let accountWasExisting = false; 
    let nextPaymentStatus = "unpaid"; 

    setParentProfiles((prev) => {
      const existingProfile = prev[targetEmail]; 
      const duplicateProfile =
      requestedEmail && requestedEmail !== targetEmail ? prev[requestedEmail] || {} : {}; 
      accountWasExisting = Boolean(existingProfile?.accountCreated); 
      nextPaymentStatus = existingProfile?.paymentStatus || duplicateProfile?.paymentStatus || "unpaid"; 
      const nextProfiles = { ...prev }; 
      if (requestedEmail && requestedEmail !== targetEmail) {
        delete nextProfiles[requestedEmail];
      } 
      nextProfiles[targetEmail] = {
        ...(duplicateProfile || {}),
        ...(existingProfile || {}), 
        userName: (name || childName || existingProfile?.userName || duplicateProfile?.userName || "Orang Tua").trim(), 
        paymentStatus: nextPaymentStatus, 
        paymentProofStatus:
        nextPaymentStatus === "paid" ?
        "valid" :
        existingProfile?.paymentProofStatus || duplicateProfile?.paymentProofStatus || "pending", 
        accountCreated: true, 
        validationStatus: "valid", 
        phone: phone || existingProfile?.phone || duplicateProfile?.phone || "-", 
        tempPassword: existingProfile?.tempPassword || duplicateProfile?.tempPassword || "", 
        password: existingProfile?.password || duplicateProfile?.password || "", 
        children: mergeUniqueItems(
          existingProfile?.children || [],
          duplicateProfile?.children || [],
          [(childName || name || "").trim()]
        ), 
        linkedEmails: mergeUniqueItems(
          existingProfile?.linkedEmails || [],
          duplicateProfile?.linkedEmails || [],
          [targetEmail, requestedEmail]
        )
      }; 
      return nextProfiles;
    }); 

    const normalizedChildName = (childName || name || "").trim().toLowerCase(); 
    setAdminStudents((prev) =>
    upsertAdminStudents(prev, [
    { 
      name: (childName || name || "").trim(), 
      email: targetEmail, 
      category: resolveStudentCategoryFromAge(age)
    }]
    )
    ); 

    setAdminValidationIncoming((prev) =>
    prev.map((item) => {
      const itemChildName = (item.childName || item.name || "").trim().toLowerCase(); 
      const isSameDocument =
      itemChildName === normalizedChildName &&
      (item.email || "").trim().toLowerCase() === targetEmail; 

      if (!isSameDocument) return item; 

      return {
        ...item, 
        status: "Valid", 
        invalidIdentityFields: [], 
        invalidUploadFields: [], 
        studentImported: true, 
        createdAt
      };
    })
    ); 

    const validationSuccessBody =
    nextPaymentStatus === "paid" ?
    "Berkas anda sudah valid dan pembayaran sudah terkonfirmasi. Akun sekarang aktif." :
    "Berkas anda sudah valid. Silakan lanjutkan pembayaran pendaftaran agar akun aktif."; 
    const validationSuccessText = `[Validasi Berkas] ${validationSuccessBody}`; 
    const validationNotifPrefix = "[Validasi Berkas]"; 
    setParentNotificationsByEmail((prev) => ({
      ...prev, 
      [targetEmail]: [
      createParentNotification({ 
        id: createdAt, 
        text: validationSuccessText
      }),
      ...(prev[targetEmail] || []).filter(
        (item) => typeof item?.text !== "string" || !item.text.startsWith(validationNotifPrefix)
      )]

    })); 

    setParentReuploadRequestsByEmail((prev) => ({
      ...prev, 
      [targetEmail]: null
    })); 

    setNotifications((prev) => [
    createGlobalNotification({ 
      id: createdAt + 1, 
      text:
      nextPaymentStatus === "paid" ?
      `[Validasi Berkas] ${name} (${targetEmail}) valid dan akun aktif.` :
      `[Validasi Berkas] ${name} (${targetEmail}) valid dan menunggu pembayaran.`
    }),
    ...prev]
    ); 

    recordAdminActivity({ 
      title: "Membuat akun orang tua", 
      description: `${childName || name || "Siswa"} (${targetEmail})`
    }); 

    if (accountWasExisting) {
      console.info(
        `[EMAIL_SIMULATION] to=${targetEmail} subject=Validasi Berkas Berhasil message=${validationSuccessBody}`
      ); 
      return;
    } 

    console.info(
      `[EMAIL_SIMULATION] to=${targetEmail} subject=Notifikasi Akun SSB Aktif message=Akun sudah dibuat. Kata kunci tidak dikirim ulang karena sudah dibuat saat pendaftaran. Pembayaran: Transfer rek BCA 1234567890 a.n. SSB Rumbai Pratama atau bayar di tempat saat latihan.`
    );
  }; 

  const handleMarkParentAsPaid = () => {
    if (!activeParentEmail) return; 
    setParentNotificationsByEmail((prev) => ({
      ...prev, 
      [activeParentEmail]: [
      createParentNotification({ 
        id: Date.now(), 
        text: "Akun masih nonaktif. Menunggu validasi dokumen dan pembayaran oleh admin."
      }),
      ...(prev[activeParentEmail] || [])]

    }));
  }; 

  const handleParentReuploadSubmit = (payload) => {
    const createdAt = Date.now(); 
    const identityChildName = payload.originalChildName || payload.childName; 
    const itemKey = `${payload.email}-${identityChildName}`.toLowerCase(); 
    setAdminValidationIncoming((prev) => {
      const existingIndex = prev.findIndex((item) => item.key === itemKey); 
      const existingItem = existingIndex >= 0 ? prev[existingIndex] : null; 

      const invalidUploadFields = payload.invalidUploadFields || []; 
      const baseFiles = existingItem?.files || payload.baseDocument?.files || {}; 
      const baseFileObjects = existingItem?.fileObjects || payload.baseDocument?.fileObjects || {}; 
      const nextFiles = { ...baseFiles }; 
      const nextFileObjects = { ...baseFileObjects }; 

      invalidUploadFields.forEach((fieldKey) => {
        if (payload.files?.[fieldKey]) {
          nextFiles[fieldKey] = payload.files[fieldKey];
        } 
        if (payload.fileObjects?.[fieldKey]) {
          nextFileObjects[fieldKey] = payload.fileObjects[fieldKey];
        }
      }); 

      const nextItem = {
        ...(existingItem || payload.baseDocument || {}), 
        key: itemKey, 
        createdAt,
        ...payload, 
        status: "Belum Diperiksa", 
        invalidIdentityFields: [], 
        invalidUploadFields: [], 
        files: nextFiles, 
        fileObjects: nextFileObjects
      }; 

      if (existingIndex >= 0) {
        const next = [...prev]; 
        next[existingIndex] = nextItem; 
        return next;
      } 
      return [...prev, nextItem];
    }); 

    setParentNotificationsByEmail((prev) => ({
      ...prev, 
      [activeParentEmail]: [
      createParentNotification({ 
        id: createdAt + 1, 
        text: "Upload ulang berkas berhasil dikirim. Menunggu validasi admin."
      }),
      ...(prev[activeParentEmail] || [])]

    })); 

    setParentProfiles((prev) => ({
      ...prev, 
      [activeParentEmail]: {
        ...(prev[activeParentEmail] || activeParentProfile), 
        validationStatus: "pending", 
        paymentProofStatus:
        (payload.invalidUploadFields || []).includes("paymentProof") ?
        "pending" :
        prev[activeParentEmail]?.paymentProofStatus || activeParentProfile.paymentProofStatus
      }
    })); 

    setNotifications((prev) => [
    createGlobalNotification({ 
      id: createdAt + 2, 
      text: `[Upload Ulang Berkas] ${payload.childName} (${payload.email || "-"}) mengirim ulang berkas dan menunggu validasi admin.`
    }),
    ...prev]
    ); 

    setParentReuploadRequestsByEmail((prev) => ({
      ...prev, 
      [activeParentEmail]: null
    }));
  }; 

  useEffect(() => {
    const syncStateWithLocation = () => {
      const routeState = getRouteStateFromPath(window.location.pathname); 
      const resolvedAdminSection =
      routeState.page === "admin-dashboard" ? routeState.adminSection : "Home"; 
      const resolvedPath = buildPathForPage(routeState.page, { 
        articleId: routeState.articleId, 
        adminSection: resolvedAdminSection
      }); 

      navigateToPage(routeState.page, { 
        articleId: routeState.articleId, 
        adminSection: resolvedAdminSection, 
        skipHistory: true
      }); 

      if (window.location.pathname !== resolvedPath) {
        window.history.replaceState({}, "", resolvedPath);
      }
    }; 

    syncStateWithLocation(); 
    window.addEventListener("popstate", syncStateWithLocation); 

    return () => window.removeEventListener("popstate", syncStateWithLocation);
    // `navigateToPage` sengaja tidak dimasukkan ke dependency agar sinkronisasi path tidak membuat listener popstate berganti terus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
  activeAdminSection,
  activeBeritaId,
  activeParentEmail,
  hasActiveParentReupload,
  isLoggedIn,
  isParentActive,
  selectedParentChildName,
  userRoleKey]
  ); 

  useEffect(() => {
    const title = activePage === "admin-dashboard" ?
    `${activeAdminSection === "Home" ? "Dashboard Admin" : activeAdminSection} | SSB Rumbai Pratama` :
    `${pageTitles[activePage] || "SSB Rumbai Pratama"} | SSB Rumbai Pratama`; 

    document.title = title;
  }, [activeAdminSection, activePage]); 

  if (activePage === "register") {
    return renderWithOverlay(
      <Daftar
        onBack={() => navigateToPage("landing")}
        onOpenRegistration={handleOpenRegistrationForm} />

    );
  } 

  if (activePage === "register-form") {
    return renderWithOverlay(
      <HalamanFormPendaftaran
        onOpenHome={() => navigateToPage("landing")}
        onBackToDaftar={() => navigateToPage("register")}
        registrationAccount={registrationAccountDraft}
        registrationFormDraft={registrationFormDraft}
        onRegistrationFormDraftChange={setRegistrationFormDraft}
        onSubmitRegistration={handleSubmitRegistration}
        onOpenPaymentProof={handleOpenRegistrationPaymentProof} />

    );
  } 

  if (activePage === "register-payment-proof") {
    return renderWithOverlay(
      <HalamanBuktiPembayaranPendaftaran
        onOpenHome={() => navigateToPage("landing")}
        onBackToDaftar={() => navigateToPage("register-form")}
        paymentDraft={registrationPaymentDraft}
        onPaymentDraftChange={setRegistrationPaymentDraft}
        onSubmitPaymentProof={handleSubmitRegistrationPaymentProof} />

    );
  } 

  if (activePage === "login-select") {
    return renderWithOverlay(
      <PemilihPeran
        onBack={() => navigateToPage("landing")}
        onSelectRole={openRoleLogin} />

    );
  } 

  if (activePage === "login-role") {
    return renderWithOverlay(
      <RoleLogin
        role={authRole || "orangtua"}
        parentAccounts={parentProfiles}
        onBack={() => navigateToPage("login-select")}
        onChangeRole={() => navigateToPage("login-select")}
        onLoginSuccess={handleLoginSuccess} />

    );
  } 

  if (activePage === "parent-dashboard") {
    return renderWithOverlay(
      <DasborOrangTua
        onLogout={requestLogout}
        onSelectChild={() => setActiveParentChild("")}
        onOpenAttendance={() => navigateToPage("parent-attendance")}
        onOpenPerformance={() => navigateToPage("parent-performance")}
        onOpenAchievements={() => navigateToPage("parent-achievements")}
        onOpenCatatanPelatih={() => navigateToPage("parent-coach-notes")}
        onOpenPayments={() => navigateToPage("parent-payments")}
        onOpenReupload={() => navigateToPage("parent-reupload")}
        onOpenReuploadFromNotif={() => navigateToPage("parent-reupload")}
        userName={displayParentChildName}
        childCategoryLabel={activeParentChildCategoryLabel}
        paymentStatus={parentUiPaymentStatus}
        isAccountInactive={!isParentActive}
        isAccountReady={Boolean(activeParentProfile.accountCreated)}
        notifications={activeParentNotifications}
        paymentInfo={activeParentPaymentInfo}
        trainingSchedules={activeParentTrainingSchedules}
        achievements={activePrestasiOrangTua}
        attendanceRecaps={activeKehadiranOrangTuaRecaps}
        performanceHistory={activePerformaOrangTuaHistory}
        coachNotes={activeCatatanPelatihOrangTua}
        onClearNotifications={clearParentNotifications}
        reuploadRequest={activeParentReuploadRequest}
        onMarkAsPaid={handleMarkParentAsPaid}
        canSwitchChild={activeParentChildren.length > 1 && !hasActiveParentReupload} />

    );
  } 

  if (activePage === "parent-attendance") {
    return renderWithOverlay(
      <KehadiranOrangTua
        onLogout={requestLogout}
        onSelectChild={() => setActiveParentChild("")}
        onOpenDashboard={() => navigateToPage("parent-dashboard")}
        onOpenPerformance={() => navigateToPage("parent-performance")}
        onOpenAchievements={() => navigateToPage("parent-achievements")}
        onOpenCatatanPelatih={() => navigateToPage("parent-coach-notes")}
        onOpenPayments={() => navigateToPage("parent-payments")}
        onOpenReuploadFromNotif={() => navigateToPage("parent-reupload")}
        userName={displayParentChildName}
        paymentStatus={parentUiPaymentStatus}
        isAccountInactive={!isParentActive}
        notifications={activeParentNotifications}
        achievements={activePrestasiOrangTua}
        attendanceRecaps={activeKehadiranOrangTuaRecaps}
        onClearNotifications={clearParentNotifications}
        onMarkAsPaid={handleMarkParentAsPaid}
        canSwitchChild={activeParentChildren.length > 1 && !hasActiveParentReupload} />

    );
  } 

  if (activePage === "parent-performance") {
    return renderWithOverlay(
      <PerformaOrangTua
        onLogout={requestLogout}
        onSelectChild={() => setActiveParentChild("")}
        onOpenDashboard={() => navigateToPage("parent-dashboard")}
        onOpenAttendance={() => navigateToPage("parent-attendance")}
        onOpenAchievements={() => navigateToPage("parent-achievements")}
        onOpenCatatanPelatih={() => navigateToPage("parent-coach-notes")}
        onOpenPayments={() => navigateToPage("parent-payments")}
        onOpenReuploadFromNotif={() => navigateToPage("parent-reupload")}
        userName={displayParentChildName}
        childCategoryLabel={activeParentChildCategoryLabel}
        paymentStatus={parentUiPaymentStatus}
        isAccountInactive={!isParentActive}
        notifications={activeParentNotifications}
        performanceHistory={activePerformaOrangTuaHistory}
        coachNotes={activeCatatanPelatihOrangTua}
        onClearNotifications={clearParentNotifications}
        onMarkAsPaid={handleMarkParentAsPaid}
        canSwitchChild={activeParentChildren.length > 1 && !hasActiveParentReupload}
        userAvatar={activeParentStudentRecord?.avatar || activeParentProfile?.avatar || null} />

    );
  } 

  if (activePage === "parent-achievements") {
    return renderWithOverlay(
      <PrestasiOrangTua
        onLogout={requestLogout}
        onSelectChild={() => setActiveParentChild("")}
        onOpenDashboard={() => navigateToPage("parent-dashboard")}
        onOpenAttendance={() => navigateToPage("parent-attendance")}
        onOpenPerformance={() => navigateToPage("parent-performance")}
        onOpenCatatanPelatih={() => navigateToPage("parent-coach-notes")}
        onOpenPayments={() => navigateToPage("parent-payments")}
        onOpenReuploadFromNotif={() => navigateToPage("parent-reupload")}
        userName={displayParentChildName}
        paymentStatus={parentUiPaymentStatus}
        isAccountInactive={!isParentActive}
        notifications={activeParentNotifications}
        notes={activeCatatanPelatihOrangTua}
        onClearNotifications={clearParentNotifications}
        onMarkAsPaid={handleMarkParentAsPaid}
        canSwitchChild={activeParentChildren.length > 1 && !hasActiveParentReupload} />

    );
  } 

  if (activePage === "parent-coach-notes") {
    return renderWithOverlay(
      <CatatanPelatihOrangTua
        onLogout={requestLogout}
        onSelectChild={() => setActiveParentChild("")}
        onOpenDashboard={() => navigateToPage("parent-dashboard")}
        onOpenAttendance={() => navigateToPage("parent-attendance")}
        onOpenPerformance={() => navigateToPage("parent-performance")}
        onOpenAchievements={() => navigateToPage("parent-achievements")}
        onOpenPayments={() => navigateToPage("parent-payments")}
        onOpenReuploadFromNotif={() => navigateToPage("parent-reupload")}
        userName={displayParentChildName}
        paymentStatus={parentUiPaymentStatus}
        isAccountInactive={!isParentActive}
        notifications={activeParentNotifications}
        onClearNotifications={clearParentNotifications}
        onMarkAsPaid={handleMarkParentAsPaid}
        canSwitchChild={activeParentChildren.length > 1 && !hasActiveParentReupload} />

    );
  } 

  if (activePage === "parent-payments") {
    return renderWithOverlay(
      <PembayaranOrangTua
        onLogout={requestLogout}
        onSelectChild={() => setActiveParentChild("")}
        onOpenDashboard={() => navigateToPage("parent-dashboard")}
        onOpenAttendance={() => navigateToPage("parent-attendance")}
        onOpenPerformance={() => navigateToPage("parent-performance")}
        onOpenAchievements={() => navigateToPage("parent-achievements")}
        onOpenCatatanPelatih={() => navigateToPage("parent-coach-notes")}
        onOpenReuploadFromNotif={() => navigateToPage("parent-reupload")}
        userName={displayParentChildName}
        paymentStatus={parentUiPaymentStatus}
        isAccountInactive={!isParentActive}
        isAccountReady={Boolean(activeParentProfile.accountCreated)}
        notifications={activeParentNotifications}
        onClearNotifications={clearParentNotifications}
        onMarkAsPaid={handleMarkParentAsPaid}
        canSwitchChild={activeParentChildren.length > 1 && !hasActiveParentReupload} />

    );
  } 

  if (activePage === "parent-reupload") {
    return renderWithOverlay(
      <UploadUlangBerkasOrangTua
        key={`parent-reupload-${activeParentReuploadRequest?.id || "none"}`}
        onLogout={requestLogout}
        onSelectChild={() => setActiveParentChild("")}
        onOpenDashboard={() => navigateToPage("parent-dashboard")}
        onOpenAttendance={() => navigateToPage("parent-attendance")}
        onOpenPerformance={() => navigateToPage("parent-performance")}
        onOpenAchievements={() => navigateToPage("parent-achievements")}
        onOpenCatatanPelatih={() => navigateToPage("parent-coach-notes")}
        onOpenPayments={() => navigateToPage("parent-payments")}
        onOpenReuploadFromNotif={() => navigateToPage("parent-reupload")}
        userName={displayParentChildName}
        isAccountInactive={!isParentActive}
        notifications={activeParentNotifications}
        onClearNotifications={clearParentNotifications}
        reuploadRequest={activeParentReuploadRequest}
        onSubmitReupload={handleParentReuploadSubmit}
        canSwitchChild={activeParentChildren.length > 1 && !hasActiveParentReupload} />

    );
  } 

  if (activePage === "coach-dashboard") {
    return renderWithOverlay(
      <DasborPelatih
        onLogout={requestLogout}
        onOpenDashboard={() => navigateToPage("coach-dashboard")}
        onOpenAttendance={() => navigateToPage("coach-attendance")}
        onOpenPerformance={() => navigateToPage("coach-performance")}
        onOpenCatatanPelatih={() => navigateToPage("coach-notes")}
        onOpenPayments={() => navigateToPage("coach-payments")}
        notifications={[]}
        onClearNotifications={() => {}}
        studentDirectory={studentDirectory}
        attendanceRecaps={coachAttendanceRecaps}
        currentCoachName="Zulfahmi"
        onSubmitAttendance={handleCoachSubmitAttendance} />

    );
  } 


  if (activePage === "coach-attendance") {
    return renderWithOverlay(
      <KehadiranPelatih
        onLogout={requestLogout}
        onOpenDashboard={() => navigateToPage("coach-dashboard")}
        onOpenAttendance={() => navigateToPage("coach-attendance")}
        onOpenPerformance={() => navigateToPage("coach-performance")}
        onOpenCatatanPelatih={() => navigateToPage("coach-notes")}
        onOpenPayments={() => navigateToPage("coach-payments")}
        notifications={[]}
        onClearNotifications={() => {}}
        studentDirectory={studentDirectory}
        trainingSchedules={adminTrainingSchedules}
        attendanceRecaps={coachAttendanceRecaps}
        currentCoachName="Zulfahmi"
        onSubmitAttendance={handleCoachSubmitAttendance} />

    );
  } 

  if (activePage === "coach-performance") {
    return renderWithOverlay(
      <PerformaPelatih
        onLogout={requestLogout}
        onOpenDashboard={() => navigateToPage("coach-dashboard")}
        onOpenAttendance={() => navigateToPage("coach-attendance")}
        onOpenPerformance={() => navigateToPage("coach-performance")}
        onOpenCatatanPelatih={() => navigateToPage("coach-notes")}
        onOpenPayments={() => navigateToPage("coach-payments")}
        notifications={[]}
        onClearNotifications={() => {}}
        studentDirectory={studentDirectory}
        trainingSchedules={adminTrainingSchedules}
        history={coachPerformanceHistory}
        currentCoachName="Zulfahmi"
        onSavePerformance={handleCoachSavePerformance} />

    );
  } 

  if (activePage === "coach-notes") {
    return renderWithOverlay(
      <CatatanPelatih
        onLogout={requestLogout}
        onOpenDashboard={() => navigateToPage("coach-dashboard")}
        onOpenAttendance={() => navigateToPage("coach-attendance")}
        onOpenPerformance={() => navigateToPage("coach-performance")}
        onOpenCatatanPelatih={() => navigateToPage("coach-notes")}
        onOpenPayments={() => navigateToPage("coach-payments")}
        notifications={[]}
        onClearNotifications={() => {}}
        notes={coachNotesForApp}
        studentDirectory={studentDirectory}
        currentCoachName="Zulfahmi"
        onSaveNote={handleCoachSaveNote}
        onDeleteNote={handleCoachDeleteNote} />

    );
  } 

  if (activePage === "coach-payments") {
    return renderWithOverlay(
      <PembayaranPelatih
        onLogout={requestLogout}
        onOpenDashboard={() => navigateToPage("coach-dashboard")}
        onOpenAttendance={() => navigateToPage("coach-attendance")}
        onOpenPerformance={() => navigateToPage("coach-performance")}
        onOpenCatatanPelatih={() => navigateToPage("coach-notes")}
        onOpenPayments={() => navigateToPage("coach-payments")}
        paymentSubmissions={coachPaymentSubmissions}
        studentDirectory={studentDirectory}
        onUploadPayment={handleCoachPaymentUpload}
        onDeletePayment={handleCoachPaymentDelete}
        notifications={[]}
        onClearNotifications={() => {}} />

    );
  } 

  if (activePage === "admin-dashboard") {
    return renderWithOverlay(
      <DasborAdmin
        key={`admin-dashboard-${adminValidationIncoming.length}`}
        onLogout={requestLogout}
        activeMenu={activeAdminSection}
        onNavigateMenu={(menuKey) =>
        navigateToPage("admin-dashboard", { adminSection: menuKey })
        }
        notifications={notifications}
        onClearNotifications={clearNotifications}
        userName="Zulfahmi"
        incomingRegistrations={adminValidationIncoming}
        registrationPaymentSubmissions={adminRegistrationPayments}
        coachPaymentSubmissions={coachPaymentSubmissions}
        parentProfiles={parentProfiles}
        adminStudents={adminStudents}
        adminCoaches={adminCoaches}
        adminCatatanPelatih={adminCatatanPelatih}
        trainingSchedules={adminTrainingSchedules}
        mediaArticles={publicMediaArticles}
        achievements={adminAchievements}
        adminActivityHistory={adminActivityHistory}
        scheduleStudentDirectory={studentDirectory}
        onSendValidationNotification={handleAdminSendValidationNotification}
        onUpdatePaymentStatus={handleAdminUpdatePaymentStatus}
        onUpdateTrainingSchedule={handleAdminUpdateTrainingSchedule}
        onAddTrainingSchedule={handleAdminAddTrainingSchedule}
        onDeleteTrainingSchedule={handleAdminDeleteTrainingSchedule}
        onSaveMediaArticle={handleAdminSaveMediaArticle}
        onDeleteMediaArticle={handleAdminDeleteMediaArticle}
        onAddAchievement={handleAdminAddAchievement}
        onDeleteStudent={handleAdminDeleteStudent}
        onAddCoach={handleAdminAddCoach}
        onDeleteCoach={handleAdminDeleteCoach}
        onSendPaymentNotification={handleAdminSendPaymentNotification}
        onCreateParentAccount={handleAdminCreateParentAccount}
        onRecordAdminActivity={recordAdminActivity} />

    );
  } 

  if (activePage === "galeri") {
    return renderWithOverlay(
      <Galeri
        onOpenHome={() => navigateToPage("landing")}
        onOpenDaftar={() => navigateToPage("register")}
        onOpenLogin={openLoginSelector}
        onOpenBerita={openBeritaList}
        isLoggedIn={isLoggedIn}
        userRole={userRole}
        notifications={[]}
        onClearNotifications={() => {}}
        onLogout={requestLogout} />

    );
  } 

  if (activePage === "berita-list") {
    return renderWithOverlay(
      <Berita
        mode="list"
        articles={publicMediaArticles}
        onOpenHome={() => navigateToPage("landing")}
        onOpenDaftar={() => navigateToPage("register")}
        onOpenLogin={openLoginSelector}
        onOpenGaleri={openGaleriPage}
        onOpenList={openBeritaList}
        onOpenDetail={openBeritaDetail}
        isLoggedIn={isLoggedIn}
        userRole={userRole}
        notifications={[]}
        onClearNotifications={() => {}}
        onLogout={requestLogout} />

    );
  } 

  if (activePage === "berita-detail") {
    return renderWithOverlay(
      <Berita
        mode="detail"
        articles={publicMediaArticles}
        selectedArticle={publicMediaArticles.find((item) => item.id === activeBeritaId)}
        onOpenHome={() => navigateToPage("landing")}
        onOpenDaftar={() => navigateToPage("register")}
        onOpenLogin={openLoginSelector}
        onOpenGaleri={openGaleriPage}
        onOpenList={openBeritaList}
        onOpenDetail={openBeritaDetail}
        isLoggedIn={isLoggedIn}
        userRole={userRole}
        notifications={[]}
        onClearNotifications={() => {}}
        onLogout={requestLogout} />

    );
  } 

  return renderWithOverlay(
    <Beranda
      articles={publicMediaArticles}
      onOpenDaftar={() => navigateToPage("register")}
      onOpenLogin={openLoginSelector}
      onOpenBeritaList={openBeritaList}
      onOpenBeritaDetail={openBeritaDetail}
      onOpenGaleri={openGaleriPage}
      isLoggedIn={isLoggedIn}
      userRole={userRole}
      notifications={[]}
      onClearNotifications={() => {}}
      onLogout={requestLogout}
      userAvatar={activeParentStudentRecord?.avatar || activeParentProfile?.avatar || null} />

  );
}
