import { useEffect, useMemo, useRef, useState } from "react";
import { router } from "@inertiajs/react";
import TataLetakPelatih from "./TataLetakPelatih";
import "./PerformaPelatih.css";

const categoryLabel = {
  u10: "U-10",
  u11: "U-11",
  u12: "U-12",
};

const categoryOptions = [
  { value: "u10", label: "U-10" },
  { value: "u11", label: "U-11" },
  { value: "u12", label: "U-12" },
];

const scoreFields = ["dribbling", "passing", "shooting"];

const monthOptions = [
  { value: "januari", label: "Januari" },
  { value: "februari", label: "Februari" },
  { value: "maret", label: "Maret" },
  { value: "april", label: "April" },
  { value: "mei", label: "Mei" },
  { value: "juni", label: "Juni" },
  { value: "juli", label: "Juli" },
  { value: "agustus", label: "Agustus" },
  { value: "september", label: "September" },
  { value: "oktober", label: "Oktober" },
  { value: "november", label: "November" },
  { value: "desember", label: "Desember" },
];

const monthDisplayNames = [
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

const weekdayDisplayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function getCategoryLabel(category) {
  return categoryLabel[category] || "Semua Kategori";
}

function formatScheduleTarget(category, studentName) {
  if (studentName && studentName !== "all") return studentName;
  if (category && category !== "all") return `Semua ${getCategoryLabel(category)}`;
  return "Semua Siswa";
}

function getScheduleStudentNames(schedule) {
  if (Array.isArray(schedule?.studentNames)) {
    return schedule.studentNames
      .map((name) => String(name || "").trim())
      .filter((name) => name && name !== "all");
  }

  return schedule?.studentName && schedule.studentName !== "all" ? [schedule.studentName] : [];
}

function getScheduleStudentIds(schedule) {
  return Array.isArray(schedule?.studentIds)
    ? schedule.studentIds.map((id) => String(id)).filter(Boolean)
    : [];
}

function formatScheduleTargetLabel(schedule) {
  const studentNames = getScheduleStudentNames(schedule);
  if (studentNames.length === 1) return studentNames[0];
  if (studentNames.length > 1) return `${studentNames.length} siswa dipilih`;
  return formatScheduleTarget(schedule?.category, schedule?.studentName);
}

function formatScheduleLabel(schedule) {
  if (!schedule) return "-";
  return `${schedule.day} | ${schedule.time} | ${formatScheduleTargetLabel(schedule)}`;
}

function normalizeScore(value) {
  const number = Number(value);
  if (Number.isNaN(number)) return "";
  return String(Math.max(0, Math.min(100, number)));
}

function getTodayDate() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function getTodayDateInputValue() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}

function formatInputDateToSlash(value) {
  const [yyyy, mm, dd] = String(value || "").split("-");
  if (!yyyy || !mm || !dd) return getTodayDate();
  return `${dd}/${mm}/${yyyy}`;
}

function parseDateInputValue(value) {
  const [yyyy, mm, dd] = String(value || "").split("-").map(Number);
  const date = new Date(yyyy, (mm || 1) - 1, dd || 1);
  if (!yyyy || !mm || !dd || Number.isNaN(date.getTime())) return new Date();
  return date;
}

function formatDateInputValue(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getMonthStartDate(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function isSameDate(leftDate, rightDate) {
  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
  );
}

function getCalendarDates(viewMonth) {
  const firstDate = getMonthStartDate(viewMonth);
  const startDate = new Date(firstDate);
  startDate.setDate(firstDate.getDate() - firstDate.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return date;
  });
}

function getMonthYearFromInputDate(value) {
  const [yyyy, mm] = String(value || "").split("-");
  const monthIndex = Number(mm) - 1;
  return {
    month: monthOptions[monthIndex]?.value || "januari",
    year: yyyy || String(new Date().getFullYear()),
  };
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

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 3.75v3M17 3.75v3M4.75 9.25h14.5M6.25 5.25h11.5a2 2 0 0 1 2 2v10.5a2 2 0 0 1-2 2H6.25a2 2 0 0 1-2-2V7.25a2 2 0 0 1 2-2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M12.5 4.5 7 10l5.5 5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M7.5 4.5 13 10l-5.5 5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CoachPerformanceSelect({ value, onChange, options, ariaLabel, className = "" }) {
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
    <div
      className={`coachPerformanceCustomSelect ${className} ${isOpen ? "isOpen" : ""}`.trim()}
      ref={rootRef}
    >
      <button
        type="button"
        className="coachPerformanceSelectTrigger"
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setIsOpen(false);
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
      >
        <span>{selectedOption?.label}</span>
        <span className="coachPerformanceSelectIcon">
          <ChevronDownIcon />
        </span>
      </button>

      {isOpen ? (
        <div className="coachPerformanceSelectMenu" role="listbox" aria-label={ariaLabel}>
          {options.map((option) => (
            <button
              key={option.value || "empty"}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={`coachPerformanceSelectOption ${option.value === value ? "isSelected" : ""}`}
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

function CoachPerformanceDatePicker({ value, onChange, ariaLabel }) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);
  const selectedDate = parseDateInputValue(value);
  const [viewMonth, setViewMonth] = useState(getMonthStartDate(selectedDate));
  const today = new Date();
  const calendarDates = getCalendarDates(viewMonth);

  useEffect(() => {
    if (isOpen) {
      setViewMonth(getMonthStartDate(parseDateInputValue(value)));
    }
  }, [isOpen, value]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handlePickDate = (date) => {
    onChange(formatDateInputValue(date));
    setIsOpen(false);
  };

  return (
    <div className={`coachPerformanceDatePicker ${isOpen ? "isOpen" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="coachPerformanceDateTrigger"
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setIsOpen(false);
          }
        }}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
      >
        <span>{formatInputDateToSlash(value)}</span>
        <span className="coachPerformanceDateIcon">
          <CalendarIcon />
        </span>
      </button>

      {isOpen ? (
        <div className="coachPerformanceCalendar" role="dialog" aria-label={ariaLabel}>
          <div className="coachPerformanceCalendarHead">
            <strong>
              {monthDisplayNames[viewMonth.getMonth()]} {viewMonth.getFullYear()}
            </strong>
            <div className="coachPerformanceCalendarNav">
              <button
                type="button"
                onClick={() => setViewMonth((currentMonth) => addMonths(currentMonth, -1))}
                aria-label="Bulan sebelumnya"
              >
                <ArrowLeftIcon />
              </button>
              <button
                type="button"
                onClick={() => setViewMonth((currentMonth) => addMonths(currentMonth, 1))}
                aria-label="Bulan berikutnya"
              >
                <ArrowRightIcon />
              </button>
            </div>
          </div>

          <div className="coachPerformanceCalendarGrid" aria-hidden="true">
            {weekdayDisplayNames.map((dayName) => (
              <span key={dayName} className="coachPerformanceCalendarWeekday">
                {dayName}
              </span>
            ))}
          </div>

          <div className="coachPerformanceCalendarGrid">
            {calendarDates.map((date) => {
              const dateValue = formatDateInputValue(date);
              const isOutsideMonth = date.getMonth() !== viewMonth.getMonth();
              const isSelected = isSameDate(date, selectedDate);
              const isToday = isSameDate(date, today);

              return (
                <button
                  key={dateValue}
                  type="button"
                  className={`coachPerformanceCalendarDay ${isOutsideMonth ? "isMuted" : ""} ${
                    isSelected ? "isSelected" : ""
                  } ${isToday ? "isToday" : ""}`}
                  onClick={() => handlePickDate(date)}
                  aria-label={formatInputDateToSlash(dateValue)}
                  aria-pressed={isSelected}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="coachPerformanceCalendarToday"
            onClick={() => handlePickDate(today)}
          >
            Hari ini
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function PerformaPelatih(props) {
  const {
    userName,
    studentDirectory = [],
    trainingSchedules = [],
    history: incomingHistory = [],
    currentCoachName,
    onSavePerformance,
  } = props;
  const currentCoach = currentCoachName || userName || "Pelatih";
  const [activeSection, setActiveSection] = useState("input");
  const [selectedCategory, setSelectedCategory] = useState("u10");
  const [selectedHistoryCategory, setSelectedHistoryCategory] = useState("all");
  const [selectedScheduleId, setSelectedScheduleId] = useState("");
  const [selectedDate, setSelectedDate] = useState(getTodayDateInputValue());
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [localHistory, setLocalHistory] = useState(incomingHistory);
  const [scores, setScores] = useState({});
  const [toast, setToast] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const scoreInputRefs = useRef({});

  useEffect(() => {
    setLocalHistory(incomingHistory);
  }, [incomingHistory]);

  useEffect(() => {
    if (!toast) return undefined;

    const timerId = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timerId);
  }, [toast]);

  const filteredSchedules = useMemo(() => {
    if (!selectedCategory || !Array.isArray(trainingSchedules)) return [];

    return trainingSchedules
      .filter((item) => {
        if (selectedCategory === "all") {
          return true;
        }
        return item.category === "all" || item.category === selectedCategory;
      })
      .sort((leftItem, rightItem) => {
        const leftPriority = leftItem.category === selectedCategory ? 0 : 1;
        const rightPriority = rightItem.category === selectedCategory ? 0 : 1;
        return leftPriority - rightPriority;
      });
  }, [selectedCategory, trainingSchedules]);

  const scheduleOptions = useMemo(() => {
    if (!selectedCategory) {
      return [{ value: "", label: "Pilih kategori dulu" }];
    }

    if (filteredSchedules.length === 0) {
      return [{ value: "", label: "Belum ada jadwal latihan" }];
    }

    return [
      { value: "", label: "Pilih Jadwal" },
      ...filteredSchedules.map((item) => ({
        value: item.id,
        label: formatScheduleLabel(item),
      })),
    ];
  }, [filteredSchedules, selectedCategory]);

  const selectedSchedule = useMemo(
    () => filteredSchedules.find((item) => item.id === selectedScheduleId) || null,
    [filteredSchedules, selectedScheduleId]
  );

  const visiblePlayers = useMemo(
    () => {
      const selectedStudentIds = getScheduleStudentIds(selectedSchedule);

      if (selectedStudentIds.length > 0) {
        return studentDirectory.filter((item) => selectedStudentIds.includes(String(item.id)));
      }

      const selectedStudentNames = getScheduleStudentNames(selectedSchedule);

      if (selectedStudentNames.length > 0) {
        const playerFromDirectory = studentDirectory
          .filter((item) =>
            selectedStudentNames.some(
              (studentName) => normalizeText(item.name) === normalizeText(studentName)
            )
          )
          .map((item) => ({ id: item.id, name: item.name, category: item.category }));

        return playerFromDirectory.length > 0
          ? playerFromDirectory
          : selectedStudentNames.map((name) => ({
              id: name,
              name,
              category: selectedSchedule?.category || selectedCategory,
            }));
      }

      const playersFromDirectory = studentDirectory
        .filter((item) => item.category === selectedCategory)
        .map((item) => ({ id: item.id, name: item.name, category: item.category }));

      return playersFromDirectory;
    },
    [selectedCategory, selectedSchedule, studentDirectory]
  );

  const ownHistory = useMemo(
    () => localHistory.filter((item) => !item.coach || item.coach === currentCoach),
    [localHistory, currentCoach]
  );

  const historyCategoryOptions = useMemo(() => {
    const availableCategories = new Set(ownHistory.map((item) => item.category).filter(Boolean));
    const options = categoryOptions.filter((option) => availableCategories.has(option.value));

    return [{ value: "all", label: "Semua Kategori" }, ...options];
  }, [ownHistory]);

  const filteredHistory = useMemo(() => {
    if (selectedHistoryCategory === "all") return ownHistory;
    return ownHistory.filter((item) => item.category === selectedHistoryCategory);
  }, [ownHistory, selectedHistoryCategory]);

  const isScoreRowComplete = (player) => {
    const row = scores[player.id] || {};
    return row.dribbling && row.passing && row.shooting;
  };

  const canSave =
    Boolean(selectedSchedule) &&
    visiblePlayers.length > 0 &&
    visiblePlayers.some((player) => isScoreRowComplete(player));

  const handleScoreChange = (playerId, key, value) => {
    setScores((prev) => ({
      ...prev,
      [playerId]: {
        ...(prev[playerId] || {}),
        [key]: normalizeScore(value),
      },
    }));
  };

  const focusScoreInput = (rowIndex, fieldIndex) => {
    const maxRow = visiblePlayers.length - 1;
    const maxField = scoreFields.length - 1;
    const nextRow = Math.min(Math.max(rowIndex, 0), maxRow);
    const nextField = Math.min(Math.max(fieldIndex, 0), maxField);
    const nextInput = scoreInputRefs.current[`${nextRow}-${nextField}`];

    if (nextInput) {
      nextInput.focus();
      nextInput.select();
    }
  };

  const handleScoreKeyDown = (event, rowIndex, fieldIndex) => {
    const directions = {
      ArrowRight: [rowIndex, fieldIndex + 1],
      ArrowLeft: [rowIndex, fieldIndex - 1],
      ArrowDown: [rowIndex + 1, fieldIndex],
      ArrowUp: [rowIndex - 1, fieldIndex],
    };
    const nextPosition = directions[event.key];

    if (!nextPosition) return;

    event.preventDefault();
    focusScoreInput(nextPosition[0], nextPosition[1]);
  };

  const savePerformanceToServer = async (rows) => {
    if (!window.axios || !selectedSchedule?.rawId) return false;

    const payloadRows = rows
      .map((row) =>
        row.studentId
          ? {
              id_siswa: row.studentId,
              dribbling: row.dribbling,
              passing: row.passing,
              shooting: row.shooting,
            }
          : null
      )
      .filter(Boolean);

    if (payloadRows.length === 0) return false;

    const response = await window.axios.post(`/api/pelatih/performa-siswa/input/${selectedSchedule.rawId}`, {
      tanggal_penilaian: selectedDate,
      data: payloadRows,
    });

    return response.data?.status !== false;
  };

  const handleConfirmSave = async () => {
    if (isSaving) return;

    const { month, year } = getMonthYearFromInputDate(selectedDate);
    const scheduleLabel = formatScheduleLabel(selectedSchedule);
    const skippedCount = visiblePlayers.filter((player) => !isScoreRowComplete(player)).length;
    const newRows = visiblePlayers
      .filter((player) => isScoreRowComplete(player))
      .map((player) => ({
        id: `${Date.now()}-${player.id}`,
        studentId: player.id,
        coach: currentCoach,
        date: formatInputDateToSlash(selectedDate),
        month,
        year,
        category: player.category || selectedCategory,
        scheduleId: selectedSchedule?.id || "",
        scheduleLabel,
        player: player.name,
        dribbling: scores[player.id]?.dribbling || "",
        passing: scores[player.id]?.passing || "",
        shooting: scores[player.id]?.shooting || "",
        createdAt: Date.now(),
      }));

    setIsSaving(true);
    setToast(null);

    try {
      const isSuccess = onSavePerformance
        ? await onSavePerformance(newRows)
        : await savePerformanceToServer(newRows);

      if (!isSuccess) {
        setToast({
          type: "error",
          message: "Nilai performa gagal disimpan. Data siswa belum cocok dengan jadwal.",
        });
        return;
      }

      setLocalHistory((prev) => [...newRows, ...prev]);
      setShowConfirmSave(false);
      setActiveSection("history");
      setToast({
        type: "success",
        message:
          skippedCount > 0
            ? `Nilai performa berhasil disimpan. ${skippedCount} siswa kosong dilewati.`
            : "Nilai performa berhasil disimpan.",
      });
      router.reload({ preserveScroll: true, only: ["history"] });
    } catch (error) {
      const isServerError = Number(error?.response?.status || 0) >= 500;
      setToast({
        type: "error",
        message:
          isServerError
            ? "Nilai performa gagal disimpan. Coba lagi atau cek koneksi server."
            : error?.response?.data?.message ||
          "Nilai performa gagal disimpan. Cek jadwal dan nilai siswa lalu coba lagi.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <TataLetakPelatih activeTab="performance" title="Performa Latihan" {...props}>
      {toast ? (
        <div
          className={`coachPerformanceToast ${toast.type === "error" ? "isError" : "isSuccess"}`}
          role="status"
        >
          <strong>{toast.type === "error" ? "Gagal" : "Berhasil"}</strong>
          <span>{toast.message}</span>
        </div>
      ) : null}

      <section className="coachAttendanceSwitchWrap">
        <button
          type="button"
          className={`coachAttendanceSwitch ${activeSection === "input" ? "is-active" : ""}`}
          onClick={() => setActiveSection("input")}
        >
          Input Nilai
        </button>
        <button
          type="button"
          className={`coachAttendanceSwitch ${activeSection === "history" ? "is-active" : ""}`}
          onClick={() => setActiveSection("history")}
        >
          History Nilai
        </button>
      </section>

      <div className="coachTabContent" key={`performance-${activeSection}`}>
        {activeSection === "input" ? (
          <section className="coachCard coachPerformanceInputCard coachSectionSwap">
          <h2>Input Performa Latihan</h2>

          <div className="coachPerformanceFilters">
            <div className="coachPerformanceField">
              <span>Kategori Usia</span>
              <CoachPerformanceSelect
                value={selectedCategory}
                onChange={(nextCategory) => {
                  setSelectedCategory(nextCategory);
                  setSelectedScheduleId("");
                }}
                options={categoryOptions}
                ariaLabel="Pilih kategori usia performa latihan"
              />
            </div>

            <div className="coachPerformanceField">
              <span>Jadwal</span>
              <CoachPerformanceSelect
                value={selectedSchedule ? selectedScheduleId : ""}
                onChange={setSelectedScheduleId}
                options={scheduleOptions}
                ariaLabel="Pilih jadwal performa latihan"
              />
            </div>

            <div className="coachPerformanceField">
              <span>Tanggal Input</span>
              <CoachPerformanceDatePicker
                value={selectedDate}
                onChange={setSelectedDate}
                ariaLabel="Pilih tanggal input performa latihan"
              />
            </div>
          </div>

          <div className="coachTableWrap coachPerformanceInputTableWrap">
            <table className="coachTable coachPerformanceInputTable">
              <thead>
                <tr>
                  <th>Nama Siswa</th>
                  <th>Dribbling</th>
                  <th>Passing</th>
                  <th>Shooting</th>
                </tr>
              </thead>
              <tbody>
                {visiblePlayers.map((player, rowIndex) => (
                  <tr key={player.id}>
                    <td>{player.name}</td>
                    {scoreFields.map((field, fieldIndex) => (
                      <td key={field}>
                        <input
                          ref={(node) => {
                            if (node) {
                              scoreInputRefs.current[`${rowIndex}-${fieldIndex}`] = node;
                            } else {
                              delete scoreInputRefs.current[`${rowIndex}-${fieldIndex}`];
                            }
                          }}
                          type="number"
                          min="0"
                          max="100"
                          value={scores[player.id]?.[field] || ""}
                          onChange={(event) => handleScoreChange(player.id, field, event.target.value)}
                          onKeyDown={(event) => handleScoreKeyDown(event, rowIndex, fieldIndex)}
                          className="coachScoreInput"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="coachPerformanceSaveRow">
            <button
              type="button"
              className="coachPerformanceSaveBtn"
              disabled={!canSave || isSaving}
              onClick={() => setShowConfirmSave(true)}
            >
              Simpan
            </button>
          </div>
          </section>
        ) : (
          <section className="coachCard coachTableCard coachPerformanceHistoryCard coachSectionSwap">
          <h2>History Nilai Saya</h2>
          <div className="coachTableWrap">
            <table className="coachTable">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Jadwal</th>
                  <th>Bulan</th>
                  <th>Tahun</th>
                  <th>
                    <CoachPerformanceSelect
                      value={selectedHistoryCategory}
                      onChange={setSelectedHistoryCategory}
                      options={historyCategoryOptions}
                      ariaLabel="Filter kategori history nilai"
                      className="coachPerformanceHistoryCategorySelect"
                    />
                  </th>
                  <th>Nama Siswa</th>
                  <th>Dribbling</th>
                  <th>Passing</th>
                  <th>Shooting</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.length > 0 ? (
                  filteredHistory.map((item) => (
                    <tr key={item.id}>
                      <td>{item.date}</td>
                      <td>{item.scheduleLabel || "-"}</td>
                      <td>{monthOptions.find((m) => m.value === item.month)?.label || item.month}</td>
                      <td>{item.year}</td>
                      <td>{categoryLabel[item.category] || item.category}</td>
                      <td>{item.player}</td>
                      <td>{item.dribbling}</td>
                      <td>{item.passing}</td>
                      <td>{item.shooting}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9}>Belum ada history nilai untuk kategori yang dipilih.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          </section>
        )}
      </div>

      {showConfirmSave && (
        <div className="coachModalOverlay" role="dialog" aria-modal="true" aria-label="Konfirmasi simpan nilai">
          <div className="coachModalCard">
            <h3>Konfirmasi Simpan</h3>
            <p>Apakah yakin ingin menyimpan nilai performa ini?</p>
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
                onClick={handleConfirmSave}
                disabled={isSaving}
              >
                {isSaving ? "Menyimpan..." : "Iya"}
              </button>
            </div>
          </div>
        </div>
      )}
    </TataLetakPelatih>
  );
}


