import { useEffect, useMemo, useRef, useState } from "react";
import Pagination from "../../components/Pagination";
import { createPortal } from "react-dom";
import { router } from "@inertiajs/react";
import "./HalamanSiswaAdmin.css";

const categoryOptions = [
  { value: "Semua", label: "Semua" },
  { value: "U-10", label: "U-10" },
  { value: "U-11", label: "U-11" },
  { value: "U-12", label: "U-12" },
];

const monthOptions = [
  { value: "01", label: "Januari" },
  { value: "02", label: "Februari" },
  { value: "03", label: "Maret" },
  { value: "04", label: "April" },
  { value: "05", label: "Mei" },
  { value: "06", label: "Juni" },
  { value: "07", label: "Juli" },
  { value: "08", label: "Agustus" },
  { value: "09", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];

const yearOptions = [
  ...Array.from({ length: 3 }, (_, index) => {
    const year = String(new Date().getFullYear() - index);
    return { value: year, label: year };
  }),
];

const monthNameToNumber = {
  januari: "01",
  februari: "02",
  maret: "03",
  april: "04",
  mei: "05",
  juni: "06",
  juli: "07",
  agustus: "08",
  september: "09",
  oktober: "10",
  november: "11",
  desember: "12",
};

function normalizeMonth(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (/^\d{1,2}$/.test(raw)) return raw.padStart(2, "0");
  return monthNameToNumber[raw] || raw;
}

function sameStudent(row, student) {
  if (!row || !student) return false;
  if (row.studentId && Number(row.studentId) === Number(student.id)) return true;
  const rowName = String(row.playerName || row.player || row.studentName || "").trim().toLowerCase();
  const studentName = String(student.name || "").trim().toLowerCase();
  return Boolean(rowName && studentName && rowName === studentName);
}

function TimeDropdown({ options, value, onChange, ariaLabel }) {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef(null);
  const selectedOption = options.find((item) => item.value === value) || options[0];

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleOutsideClick = (event) => {
      if (!pickerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  return (
    <div className="adminStudentsTimePicker" ref={pickerRef}>
      <button
        type="button"
        className={`adminStudentsTimeTrigger ${isOpen ? "isOpen" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
      >
        <span>{selectedOption.label}</span>
        <i aria-hidden="true" />
      </button>
      {isOpen && (
        <div className="adminStudentsTimeMenu" role="listbox" aria-label={ariaLabel}>
          {options.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`adminStudentsTimeItem ${item.value === value ? "isActive" : ""}`}
              onClick={() => {
                onChange(item.value);
                setIsOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HalamanSiswaAdmin({
  students = [],
  attendanceRecaps = [],
  performanceHistory = [],
  onDeleteStudent,
  onRecordAdminActivity,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [activeDonutLabel, setActiveDonutLabel] = useState(null);
  const [selectedDonutLabel, setSelectedDonutLabel] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(() => String(new Date().getMonth() + 1).padStart(2, "0"));
  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()));
  const [studentPickFxKey, setStudentPickFxKey] = useState(0);
  const [isStudentSwitching, setIsStudentSwitching] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeletingStudent, setIsDeletingStudent] = useState(false);
  const [statusToast, setStatusToast] = useState(null);
  const toastTimerRef = useRef(null);

  useEffect(() => {
    if (!isStudentSwitching) return undefined;
    const timeoutId = setTimeout(() => setIsStudentSwitching(false), 620);
    return () => clearTimeout(timeoutId);
  }, [isStudentSwitching, studentPickFxKey]);

  useEffect(() => {
    if (!deleteTarget) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setDeleteTarget(null);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [deleteTarget]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const showToast = (type, title, message) => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }

    setStatusToast({ type, title, message });
    toastTimerRef.current = window.setTimeout(() => setStatusToast(null), 5000);
  };

  const getApiErrorMessage = (error) => {
    const response = error?.response?.data;
    if (response?.message) return response.message;
    if (response?.errors) {
      const firstError = Object.values(response.errors).flat().find(Boolean);
      if (firstError) return firstError;
    }
    if (error?.message) return error.message;
    return "Data siswa belum bisa dihapus. Coba ulangi sebentar lagi.";
  };

  const handleCategoryChange = (value) => {
    setSelectedCategory(value);
  };

  const handleSelectStudent = (studentId) => {
    setSelectedStudentId(studentId);
    setActiveDonutLabel(null);
    setSelectedDonutLabel(null);
    setStudentPickFxKey((prev) => prev + 1);
    setIsStudentSwitching(true);
  };

  const handleMonthChange = (value) => setSelectedMonth(value);

  const handleYearChange = (value) => setSelectedYear(value);

  const safeSelectedStudentId = useMemo(
    () =>
      selectedStudentId && students.some((student) => student.id === selectedStudentId)
        ? selectedStudentId
        : null,
    [selectedStudentId, students]
  );

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === safeSelectedStudentId) || null,
    [safeSelectedStudentId, students]
  );

  const filteredStudents = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return students.filter((student) => {
      const byCategory = selectedCategory === "Semua" || student.category === selectedCategory;
      const bySearch =
        !normalizedQuery ||
        student.name.toLowerCase().includes(normalizedQuery) ||
        student.email.toLowerCase().includes(normalizedQuery);
      return byCategory && bySearch;
    });
  }, [searchQuery, selectedCategory, students]);

  const tableMotionKey = `${selectedCategory}-${searchQuery.trim().toLowerCase()}`;
  const chartMotionKey = `${safeSelectedStudentId ?? "none"}-${selectedMonth}-${selectedYear}`;
  const [studentsPage, setStudentsPage] = useState(1);
  const [studentsPageSize, setStudentsPageSize] = useState(10);

  const totalStudents = filteredStudents.length;
  const pagedStudents = useMemo(() => {
    const start = (studentsPage - 1) * studentsPageSize;
    return filteredStudents.slice(start, start + studentsPageSize);
  }, [filteredStudents, studentsPage, studentsPageSize]);

  const handleDelete = async (studentId) => {
    setIsDeletingStudent(true);
    let wasDeleted = false;

    try {
      if (window.axios) {
        await window.axios.delete(`/api/admin/siswa/${studentId}`);
      } else {
        const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");
        const response = await fetch(`/api/admin/siswa/${studentId}`, {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            "X-CSRF-TOKEN": token || "",
          },
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.message || "Data siswa belum bisa dihapus.");
        }
      }

      onDeleteStudent?.(studentId);
      onRecordAdminActivity?.({
        title: "Menghapus data siswa",
        description: deleteTarget?.name || "Admin menghapus data siswa.",
      });
      wasDeleted = true;
      showToast("success", "Berhasil", "Data siswa berhasil dihapus.");
    } catch (error) {
      showToast("error", "Gagal", getApiErrorMessage(error));
    } finally {
      setIsDeletingStudent(false);
    }

    if (wasDeleted && safeSelectedStudentId === studentId) {
      setSelectedStudentId(null);
      setActiveDonutLabel(null);
      setSelectedDonutLabel(null);
    }

    return wasDeleted;
  };

  const openDeleteModal = (student) => {
    setDeleteTarget(student);
  };

  const closeDeleteModal = () => {
    if (isDeletingStudent) return;
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const wasDeleted = await handleDelete(deleteTarget.id);
    if (wasDeleted) {
      setDeleteTarget(null);
    }
  };

  const donutData = useMemo(() => {
    if (!selectedStudent) return [];
    const rows = attendanceRecaps.filter((item) =>
      sameStudent(item, selectedStudent) &&
      normalizeMonth(item.month) === selectedMonth &&
      String(item.year) === String(selectedYear)
    );

    if (rows.length === 0) return [];

    const average = (key) =>
      Math.round(rows.reduce((sum, row) => sum + Number(row[key] || 0), 0) / rows.length);

    return [
      { label: "Hadir", value: average("hadir"), color: "#5daf2f" },
      { label: "Sakit", value: average("sakit"), color: "#468f28" },
      { label: "Izin", value: average("izin"), color: "#2f5b23" },
    ];
  }, [attendanceRecaps, selectedMonth, selectedStudent, selectedYear]);

  const performanceData = useMemo(() => {
    if (!selectedStudent) return [];
    const rows = performanceHistory.filter((item) =>
      sameStudent(item, selectedStudent) &&
      normalizeMonth(item.month) === selectedMonth &&
      String(item.year) === String(selectedYear)
    );

    if (rows.length === 0) return [];

    const average = (key) =>
      Math.round(rows.reduce((sum, row) => sum + Number(row[key] || 0), 0) / rows.length);

    return [
      { label: "Dribbling", value: average("dribbling"), color: "#78d33e" },
      { label: "Passing", value: average("passing"), color: "#5eb126" },
      { label: "Shooting", value: average("shooting"), color: "#478722" },
    ];
  }, [performanceHistory, selectedMonth, selectedStudent, selectedYear]);

  const circumference = 2 * Math.PI * 42;
  const segmentGap = 3.8;
  const donutSegments = useMemo(
    () =>
      donutData.map((item, index) => {
        const rawLength = (item.value / 100) * circumference;
        const dash = Math.max(rawLength - segmentGap, 0);
        const previousTotal = donutData
          .slice(0, index)
          .reduce((sum, entry) => sum + (entry.value / 100) * circumference, 0);
        return {
          ...item,
          dash,
          dashOffset: -(previousTotal + segmentGap / 2),
        };
      }),
    [donutData, circumference]
  );

  const displayDonutItem = useMemo(() => {
    const active = donutData.find((item) => item.label === activeDonutLabel);
    if (active) return active;
    const selected = donutData.find((item) => item.label === selectedDonutLabel);
    return selected || null;
  }, [activeDonutLabel, donutData, selectedDonutLabel]);

  const handleDonutHover = (label) => {
    if (selectedDonutLabel) return;
    setActiveDonutLabel(label);
  };
  const clearDonutHover = () => {
    if (selectedDonutLabel) return;
    setActiveDonutLabel(null);
  };

  return (
    <section className="adminStudentsPage">
      {statusToast && (
        <div className={`adminStudentsToast ${statusToast.type === "error" ? "isError" : "isSuccess"}`} role="status">
          <strong>{statusToast.title}</strong>
          <span>{statusToast.message}</span>
        </div>
      )}

      <article className="adminCard adminStudentsCard">
        <div className="adminStudentsToolbar">
          <TimeDropdown
            options={categoryOptions}
            value={selectedCategory}
            onChange={handleCategoryChange}
            aria-label="Pilih kategori siswa"
          />
          <input
            type="search"
            placeholder="Cari nama atau email siswa"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            aria-label="Cari siswa"
          />
        </div>

        <div className="adminTableWrap adminStudentsTableWrap" key={`table-${tableMotionKey}`}>
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Nama</th>
                <th>Email</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length > 0 ? (
                pagedStudents.map((student, index) => (
                  <tr key={student.id} style={{ "--row-index": index }}>
                    <td>{(studentsPage - 1) * studentsPageSize + index + 1}</td>
                    <td>
                      <button
                        type="button"
                        className={`adminStudentsNameBtn ${safeSelectedStudentId === student.id ? "isActive" : ""}`}
                        onClick={() => handleSelectStudent(student.id)}
                      >
                        {student.name}
                      </button>
                    </td>
                    <td>{student.email}</td>
                    <td>
                      <div className="adminStudentsActionGroup">
                        <button
                          type="button"
                          className="adminStudentsProfileBtn"
                          onClick={() => router.visit(`/admin/siswa/${student.id}/profil`)}
                        >
                          Perbaiki Profil
                        </button>
                      <button
                        type="button"
                        className="adminStudentsDeleteBtn"
                        onClick={() => openDeleteModal(student)}
                      >
                        Hapus
                      </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="adminStudentsEmpty">
                    Data siswa tidak ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {!selectedStudent && (
          <p className="adminStudentsHint adminStudentsSelectHint">
            Keterangan: Klik nama siswa pada tabel untuk menampilkan data kehadiran dan performa.
          </p>
        )}
      </article>

      <div className="adminTablePagination">
        <Pagination
          total={totalStudents}
          page={studentsPage}
          pageSize={studentsPageSize}
          onPageChange={(p) => setStudentsPage(p)}
          onPageSizeChange={(s) => {
            setStudentsPageSize(s);
            setStudentsPage(1);
          }}
        />
      </div>

      {selectedStudent && (
        <section
          className={`adminStudentsChartsGrid ${isStudentSwitching ? "isSwitching" : ""}`}
          key={`chart-${safeSelectedStudentId}-${chartMotionKey}`}
        >
          <article className="adminCard adminStudentsChartCard adminStudentsAttendanceCard">
            <div className="adminStudentsChartHead">
              <h3>Kehadiran</h3>
              <div className="adminStudentsTimeControls">
                <TimeDropdown
                  options={monthOptions}
                  value={selectedMonth}
                  onChange={handleMonthChange}
                  aria-label="Pilih bulan kehadiran"
                />
                <TimeDropdown
                  options={yearOptions}
                  value={selectedYear}
                  onChange={handleYearChange}
                  aria-label="Pilih tahun kehadiran"
                />
              </div>
            </div>
            <p className="adminStudentsHint">
              Keterangan: Persentase kehadiran siswa pada periode terpilih.
            </p>
            {donutData.length > 0 ? (
              <div className="adminStudentsAttendanceBody">
                <div className="adminStudentsDonutWrap">
                  <div
                    className="adminStudentsDonutChart"
                    key={`donut-${safeSelectedStudentId}-${studentPickFxKey}-${selectedMonth}-${selectedYear}`}
                  >
                    <svg viewBox="0 0 100 100" className="adminStudentsDonutSvg" aria-label="Grafik Kehadiran Siswa">
                      {donutSegments.map((item) => (
                        <circle
                          key={item.label}
                          className="adminStudentsDonutSegment"
                          cx="50"
                          cy="50"
                          r="42"
                          fill="none"
                          stroke={item.color}
                          strokeWidth="16"
                          strokeDasharray={`${item.dash} ${circumference - item.dash}`}
                          strokeDashoffset={item.dashOffset}
                          strokeLinecap="round"
                          onMouseEnter={() => handleDonutHover(item.label)}
                          onMouseLeave={clearDonutHover}
                          onClick={() => setSelectedDonutLabel(item.label)}
                        />
                      ))}
                    </svg>
                    <div className="adminStudentsDonutCenterRingOuter" />
                    <div className="adminStudentsDonutCenterRingInner" />
                    <div className={`adminStudentsDonutCenterValue ${displayDonutItem ? "show" : ""}`}>
                      {displayDonutItem && (
                        <>
                          <span className="adminStudentsDonutCenterNumber">{displayDonutItem.value}%</span>
                          <span className="adminStudentsDonutCenterLabel">{displayDonutItem.label}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <ul className="adminStudentsLegend adminStudentsLegendDetailed">
                  {donutData.map((item) => (
                    <li
                      key={item.label}
                      onMouseEnter={() => handleDonutHover(item.label)}
                      onMouseLeave={clearDonutHover}
                      onClick={() => setSelectedDonutLabel(item.label)}
                    >
                      <span style={{ background: item.color }} />
                      <label>{item.label}</label>
                      <strong>{item.value}%</strong>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="adminStudentsHint">Belum ada data kehadiran untuk siswa ini pada periode terpilih.</p>
            )}
          </article>

          <article className="adminCard adminStudentsChartCard adminStudentsPerformanceCard">
            <div className="adminStudentsChartHead">
              <h3>Rata-Rata Nilai Performa</h3>
              <div className="adminStudentsTimeControls">
                <TimeDropdown
                  options={monthOptions}
                  value={selectedMonth}
                  onChange={handleMonthChange}
                  aria-label="Pilih bulan performa"
                />
                <TimeDropdown
                  options={yearOptions}
                  value={selectedYear}
                  onChange={handleYearChange}
                  aria-label="Pilih tahun performa"
                />
              </div>
            </div>
            <p className="adminStudentsHint">
              Keterangan: Nilai rata-rata teknik dasar untuk {selectedStudent.name}.
            </p>
            {performanceData.length > 0 ? (
              <>
                <div
                  className="adminStudentsBars"
                  key={`bars-${safeSelectedStudentId}-${studentPickFxKey}-${selectedMonth}-${selectedYear}`}
                >
                  {performanceData.map((item, index) => (
                    <div key={item.label} className="adminStudentsBarRow">
                      <label className="adminStudentsBarLabel">{item.label}</label>
                      <div className="adminStudentsBarTrack">
                        <span
                          style={{
                            "--bar-width": `${item.value}%`,
                            "--bar-delay": `${index * 90}ms`,
                            background: item.color,
                          }}
                        />
                      </div>
                      <strong>{item.value}%</strong>
                    </div>
                  ))}
                </div>
                <ul className="adminStudentsPerfLegend">
                  {performanceData.map((item) => (
                    <li key={item.label}>
                      <span style={{ background: item.color }} />
                      {item.label}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="adminStudentsHint">Belum ada data performa untuk siswa ini pada periode terpilih.</p>
            )}
          </article>
        </section>
      )}

      {deleteTarget &&
        createPortal(
          <div
            className="adminStudentsModalOverlay"
            role="dialog"
            aria-modal="true"
            aria-label="Konfirmasi hapus siswa"
            onClick={closeDeleteModal}
          >
            <div className="adminStudentsModalCard" onClick={(event) => event.stopPropagation()}>
              <h4>Hapus Data Siswa</h4>
              <p>
                Yakin ingin menghapus data <strong>{deleteTarget.name}</strong>?
              </p>
              <div className="adminStudentsModalActions">
                <button
                  type="button"
                  className="adminStudentsModalBtn ghost"
                  onClick={closeDeleteModal}
                  disabled={isDeletingStudent}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="adminStudentsModalBtn danger"
                  onClick={confirmDelete}
                  disabled={isDeletingStudent}
                >
                  {isDeletingStudent ? "Menghapus..." : "Ya, Hapus"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </section>
  );
}
