import { useEffect, useMemo, useRef, useState } from "react";
import TataLetakPelatih from "./TataLetakPelatih";
import "./KehadiranPelatih.css";

const statusOptions = [
  { value: "hadir", label: "Hadir" },
  { value: "alpha", label: "Alpha" },
  { value: "sakit", label: "Sakit" },
];

const meetingsPerMonth = 8;

const baseCategoryOptions = [
  { value: "", label: "Pilih Kategori" },
  { value: "u10", label: "U-10" },
  { value: "u11", label: "U-11" },
  { value: "u12", label: "U-12" },
];

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

function getCurrentMonthOptionValue() {
  return monthOptions[new Date().getMonth()]?.value || "januari";
}

const yearOptions = [
  ...Array.from({ length: 3 }, (_, index) => {
    const year = String(new Date().getFullYear() - index);
    return { value: year, label: year };
  }),
];

const calendarMonthNames = [
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

const calendarDayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const dayNameToIndex = {
  minggu: 0,
  min: 0,
  sunday: 0,
  senin: 1,
  sen: 1,
  monday: 1,
  selasa: 2,
  sel: 2,
  tuesday: 2,
  rabu: 3,
  rab: 3,
  wednesday: 3,
  kamis: 4,
  kam: 4,
  thursday: 4,
  jumat: 5,
  jum: 5,
  friday: 5,
  sabtu: 6,
  sab: 6,
  saturday: 6,
};
const routineScheduleWeekdays = new Set([0, 3]);
const routineScheduleSlots = new Set([
  "3|16.30-17.30",
  "0|07.30-09.30",
]);

const recapCategoryOptions = [
  { value: "all", label: "Kategori" },
  { value: "u10", label: "U-10" },
  { value: "u11", label: "U-11" },
  { value: "u12", label: "U-12" },
];

const attendanceToastStorageKey = "ssb-coach-attendance-toast";
const attendanceToastElementId = "ssb-coach-attendance-toast";
let attendanceToastTimerId = null;

function readStoredAttendanceToast() {
  if (typeof window === "undefined") return null;

  try {
    const storedToast = window.sessionStorage.getItem(attendanceToastStorageKey);
    if (!storedToast) return null;
    const parsedToast = JSON.parse(storedToast);
    return parsedToast?.message ? parsedToast : null;
  } catch {
    window.sessionStorage.removeItem(attendanceToastStorageKey);
    return null;
  }
}

function storeAttendanceToast(nextToast) {
  if (typeof window === "undefined") return;

  if (!nextToast) {
    window.sessionStorage.removeItem(attendanceToastStorageKey);
    return;
  }

  window.sessionStorage.setItem(attendanceToastStorageKey, JSON.stringify(nextToast));
}

function removeAttendanceToastElement() {
  if (typeof document === "undefined") return;

  if (attendanceToastTimerId) {
    window.clearTimeout(attendanceToastTimerId);
    attendanceToastTimerId = null;
  }

  document.getElementById(attendanceToastElementId)?.remove();
}

function renderAttendanceToast(nextToast) {
  if (typeof document === "undefined" || !nextToast) return;

  removeAttendanceToastElement();

  const toastElement = document.createElement("div");
  toastElement.id = attendanceToastElementId;
  toastElement.className = `coachAttendanceToast ${nextToast.type === "error" ? "isError" : "isSuccess"}`;
  toastElement.setAttribute("role", "status");

  const textElement = document.createElement("div");
  textElement.className = "coachAttendanceToastText";

  const titleElement = document.createElement("strong");
  titleElement.textContent = nextToast.type === "error" ? "Gagal" : "Berhasil";

  const messageElement = document.createElement("span");
  messageElement.textContent = nextToast.message;

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "coachAttendanceToastClose";
  closeButton.setAttribute("aria-label", "Tutup notifikasi");
  closeButton.textContent = "x";
  closeButton.addEventListener("click", () => {
    storeAttendanceToast(null);
    removeAttendanceToastElement();
  });

  textElement.append(titleElement, messageElement);
  toastElement.append(textElement, closeButton);
  document.body.appendChild(toastElement);

  if (nextToast.autoCloseMs !== null) {
    attendanceToastTimerId = window.setTimeout(() => {
      storeAttendanceToast(null);
      removeAttendanceToastElement();
    }, Number(nextToast.autoCloseMs || 30000));
  }
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function getCategoryLabel(category) {
  return baseCategoryOptions.find((option) => option.value === category)?.label || "Semua Kategori";
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

function formatScheduleTargetLabel(schedule) {
  const studentNames = getScheduleStudentNames(schedule);
  if (studentNames.length === 1) return studentNames[0];
  if (studentNames.length > 1) return `${studentNames.length} siswa dipilih`;
  return formatScheduleTarget(schedule?.category, schedule?.studentName);
}

function getSchedulePlayersForCategory(schedule, selectedCategory, studentDirectory = []) {
  if (!schedule || !selectedCategory) return [];

  const selectedStudentIds = Array.isArray(schedule?.studentIds)
    ? schedule.studentIds.map((id) => String(id)).filter(Boolean)
    : [];

  if (selectedStudentIds.length > 0) {
    return studentDirectory.filter(
      (item) => selectedStudentIds.includes(String(item.id)) && item.category === selectedCategory
    );
  }

  const selectedStudentNames = getScheduleStudentNames(schedule);
  if (selectedStudentNames.length > 0) {
    const nameSet = new Set(selectedStudentNames.map((name) => normalizeText(name)));
    return studentDirectory.filter(
      (item) => item.category === selectedCategory && nameSet.has(normalizeText(item.name))
    );
  }

  if (schedule.category && schedule.category !== "all") {
    return studentDirectory.filter((item) => item.category === schedule.category);
  }

  return studentDirectory.filter((item) => item.category === selectedCategory);
}

function formatScheduleTargetLabelForCategory(schedule, selectedCategory, studentDirectory = []) {
  const categoryPlayers = getSchedulePlayersForCategory(schedule, selectedCategory, studentDirectory);

  if (categoryPlayers.length === 1) return categoryPlayers[0].name;
  if (categoryPlayers.length > 1) return `${categoryPlayers.length} siswa dipilih`;

  return formatScheduleTargetLabel(schedule);
}

function formatScheduleLabel(schedule, selectedCategory, studentDirectory = []) {
  if (!schedule) return "-";
  const place = [schedule.place, schedule.location, schedule.lokasi]
    .find((value) => value && value !== "-");

  return [
    schedule.day,
    schedule.time,
    place,
    formatScheduleTargetLabelForCategory(schedule, selectedCategory, studentDirectory),
  ].filter(Boolean).join(" | ");
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseIsoDate(value) {
  if (!value) return null;
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function formatDateDisplay(value) {
  const date = parseIsoDate(value);
  if (!date) return "Pilih tanggal";
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

function normalizeAttendanceStatus(value) {
  const status = normalizeText(value);
  if (status === "izin") return "alpha";
  if (["hadir", "alpha", "sakit"].includes(status)) return status;
  return "";
}

function formatMeetingPercent(count) {
  return `${Math.round((Number(count || 0) / meetingsPerMonth) * 100)}%`;
}

function getMonthIndexFromValue(monthValue) {
  return Math.max(0, monthOptions.findIndex((month) => month.value === monthValue));
}

function getScheduleWeekday(schedule) {
  const date = parseIsoDate(schedule?.date);
  if (date) return date.getDay();

  return dayNameToIndex[normalizeText(schedule?.day)] ?? null;
}

function isRoutineSchedule(schedule) {
  if (schedule?.isRoutine === true) return true;
  if (schedule?.isRoutine === false) return false;

  const weekday = getScheduleWeekday(schedule);
  const time = String(schedule?.time || "")
    .replace(/\s*WIB\s*/i, "")
    .replace(/\s+/g, "");

  return routineScheduleWeekdays.has(weekday) && routineScheduleSlots.has(`${weekday}|${time}`);
}

function scheduleMatchesRecapFilter(schedule, category, scheduleId) {
  if (!schedule) return false;
  const categoryMatch = category === "all" || schedule.category === "all" || schedule.category === category;
  const scheduleMatch = scheduleId === "all" || schedule.id === scheduleId;

  return categoryMatch && scheduleMatch;
}

function buildMonthlyMeetingSlots(
  yearValue,
  monthValue,
  schedules = [],
  category = "all",
  scheduleId = "all",
  mode = "routine"
) {
  const year = Number(yearValue) || new Date().getFullYear();
  const monthIndex = getMonthIndexFromValue(monthValue);
  const selectedSchedules = schedules
    .filter((schedule) => scheduleMatchesRecapFilter(schedule, category, scheduleId))
    .filter((schedule) => {
      if (mode === "extra") return !isRoutineSchedule(schedule);
      if (mode === "all") return true;
      return isRoutineSchedule(schedule);
    })
    .map((schedule) => ({
      ...schedule,
      weekday: getScheduleWeekday(schedule),
    }))
    .filter((schedule) => Number.isInteger(schedule.weekday));

  const slots = [];
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  selectedSchedules.forEach((schedule) => {
    if (mode === "extra") {
      const scheduleDate = schedule?.date ? parseIsoDate(schedule.date) : null;
      if (!scheduleDate) return;
      if (scheduleDate.getFullYear() !== year || scheduleDate.getMonth() !== monthIndex) return;

      const isoDate = toIsoDate(scheduleDate);
      slots.push({
        date: isoDate,
        dateLabel: `${String(scheduleDate.getDate()).padStart(2, "0")} ${calendarMonthNames[monthIndex].slice(0, 3)}`,
        time: schedule.time || "",
        scheduleId: schedule.id,
        sortKey: `${isoDate} ${schedule.time || ""}`,
      });
      return;
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, monthIndex, day);
      if (date.getDay() !== schedule.weekday) continue;

      const isoDate = toIsoDate(date);
      slots.push({
        date: isoDate,
        dateLabel: `${String(day).padStart(2, "0")} ${calendarMonthNames[monthIndex].slice(0, 3)}`,
        time: schedule.time || "",
        scheduleId: schedule.id,
        sortKey: `${isoDate} ${schedule.time || ""}`,
      });
    }
  });

  return Array.from(new Map(
    slots
      .sort((left, right) => left.sortKey.localeCompare(right.sortKey))
      .map((slot) => [`${slot.date}-${slot.time}`, slot])
  ).values()).slice(0, mode === "routine" ? meetingsPerMonth : undefined);
}

function entryMatchesSlot(entry, slot) {
  if (!entry || !slot) return false;
  return entry.date === slot.date && (!entry.scheduleId || !slot.scheduleId || entry.scheduleId === slot.scheduleId);
}

function sameDate(left, right) {
  if (!left || !right) return false;
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function SoftSelect({
  value,
  onChange,
  options,
  className = "",
  displayLabel,
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);
  const selectedOption = options.find((option) => option.value === value) || options[0];
  const triggerLabel = displayLabel || selectedOption.label;

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
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev);
          }
        }}
        aria-expanded={isOpen}
        disabled={disabled}
      >
        <span className="coachSoftSelectLabel">{triggerLabel}</span>
        <span className="coachSoftSelectChevron" aria-hidden="true">
          <svg viewBox="0 0 20 20" fill="none">
            <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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
                <span className="coachSoftSelectOptionLabel">{option.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CoachDatePicker({ value, onChange, disabled = false, allowedWeekdays = null, allowedDates = null }) {
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const selectedDate = parseIsoDate(value);
  const today = new Date();
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(selectedDate || today);
  const [panelStyle, setPanelStyle] = useState({});

  useEffect(() => {
    if (selectedDate) {
      setViewDate(selectedDate);
    }
  }, [value]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target) &&
        panelRef.current &&
        !panelRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    let frameId = 0;

    const updatePanelPosition = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        const rect = rootRef.current?.getBoundingClientRect();
        if (!rect) return;

        const gap = 8;
        const margin = 12;
        const panelRect = panelRef.current?.getBoundingClientRect();
        const panelHeight = panelRect?.height || 380;
        const panelWidth = Math.min(
          Math.max(rect.width, 320),
          360,
          window.innerWidth - margin * 2
        );
        const left = Math.min(
          Math.max(rect.left, margin),
          window.innerWidth - panelWidth - margin
        );
        const topBelow = rect.bottom + gap;
        const topAbove = rect.top - panelHeight - gap;
        const canOpenBelow = topBelow + panelHeight <= window.innerHeight - margin;
        const top = canOpenBelow ? topBelow : Math.max(margin, topAbove);

        setPanelStyle({
          left: `${left}px`,
          top: `${top}px`,
          width: `${panelWidth}px`,
        });
      });
    };

    updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [isOpen]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - firstDay.getDay());

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + index);
      return date;
    });
  }, [viewDate]);

  const moveMonth = (direction) => {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
  };

  const isDateAllowed = (date) => {
    const dateValue = toIsoDate(date);
    if (Array.isArray(allowedDates)) return allowedDates.includes(dateValue);
    return !Array.isArray(allowedWeekdays) || allowedWeekdays.includes(date.getDay());
  };

  const selectDate = (date) => {
    if (!isDateAllowed(date)) return;
    onChange(toIsoDate(date));
    setViewDate(date);
    setIsOpen(false);
  };

  const selectToday = () => {
    const currentToday = new Date();
    selectDate(currentToday);
  };

  return (
    <div className={`coachDatePicker ${isOpen ? "is-open" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="coachDatePickerTrigger"
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev);
          }
        }}
        aria-expanded={isOpen}
        disabled={disabled}
      >
        <span>{formatDateDisplay(value)}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 3v3M17 3v3M4.5 9h15M6.5 5h11A2.5 2.5 0 0 1 20 7.5v10A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-10A2.5 2.5 0 0 1 6.5 5Z" />
        </svg>
      </button>

      {isOpen && !disabled ? (
        <div className="coachCalendarPanel" ref={panelRef} style={panelStyle}>
          <div className="coachCalendarHead">
            <strong>{`${calendarMonthNames[viewDate.getMonth()]} ${viewDate.getFullYear()}`}</strong>
            <div className="coachCalendarNav">
              <button type="button" onClick={() => moveMonth(-1)} aria-label="Bulan sebelumnya">
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M12.5 4.5 7 10l5.5 5.5" />
                </svg>
              </button>
              <button type="button" onClick={() => moveMonth(1)} aria-label="Bulan berikutnya">
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M7.5 4.5 13 10l-5.5 5.5" />
                </svg>
              </button>
            </div>
          </div>

          <div className="coachCalendarWeekdays">
            {calendarDayNames.map((dayName) => (
              <span key={dayName}>{dayName}</span>
            ))}
          </div>

          <div className="coachCalendarGrid">
            {calendarDays.map((date) => {
              const isOutsideMonth = date.getMonth() !== viewDate.getMonth();
              const isSelected = sameDate(date, selectedDate);
              const isToday = sameDate(date, today);
              const isAllowed = isDateAllowed(date);

              return (
                <button
                  key={toIsoDate(date)}
                  type="button"
                  className={[
                    "coachCalendarDay",
                    isOutsideMonth ? "isOutside" : "",
                    isSelected ? "isSelected" : "",
                    isToday ? "isToday" : "",
                    !isAllowed ? "isDisabled" : "",
                  ].filter(Boolean).join(" ")}
                  onClick={() => selectDate(date)}
                  disabled={!isAllowed}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="coachCalendarTodayBtn"
            onClick={selectToday}
            disabled={!isDateAllowed(today)}
          >
            Hari ini
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function KehadiranPelatih(props) {
  const {
    studentDirectory = [],
    trainingSchedules = [],
    attendanceRecaps = [],
    onSubmitAttendance,
    currentCoachName = "Pelatih",
  } = props;

  const [activeSection, setActiveSection] = useState("input");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedScheduleId, setSelectedScheduleId] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthOptionValue);
  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()));
  const [selectedRecapCategory, setSelectedRecapCategory] = useState("all");
  const [selectedRecapSchedule, setSelectedRecapSchedule] = useState("all");
  const [selectedRecapInputBy, setSelectedRecapInputBy] = useState("all");
  const [attendanceDate, setAttendanceDate] = useState("");
  const [statuses, setStatuses] = useState({});
  const [localAttendanceRecaps, setLocalAttendanceRecaps] = useState(attendanceRecaps);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (nextToast) => {
    storeAttendanceToast(nextToast);
    renderAttendanceToast(nextToast);
  };

  const clearToast = () => {
    storeAttendanceToast(null);
    removeAttendanceToastElement();
  };

  useEffect(() => {
    setLocalAttendanceRecaps(attendanceRecaps);
  }, [attendanceRecaps]);

  useEffect(() => {
    const storedToast = readStoredAttendanceToast();
    if (storedToast) {
      renderAttendanceToast(storedToast);
    }

    return () => {
      if (attendanceToastTimerId) {
        window.clearTimeout(attendanceToastTimerId);
        attendanceToastTimerId = null;
      }
    };
  }, []);

  const categoryOptions = useMemo(() => {
    const availableValues = new Set([
      "",
      ...trainingSchedules.map((item) => item.category || ""),
      ...studentDirectory.map((item) => item.category || ""),
    ]);
    return baseCategoryOptions.filter((option) => availableValues.has(option.value));
  }, [studentDirectory, trainingSchedules]);

  const filteredSchedules = useMemo(() => {
    if (!selectedCategory || !Array.isArray(trainingSchedules)) return [];

    return trainingSchedules
      .filter((item) => item.category === "all" || item.category === selectedCategory)
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
        label: formatScheduleLabel(item, selectedCategory, studentDirectory),
      })),
    ];
  }, [filteredSchedules, selectedCategory, studentDirectory]);

  const selectedSchedule = useMemo(
    () => filteredSchedules.find((item) => item.id === selectedScheduleId) || null,
    [filteredSchedules, selectedScheduleId]
  );
  const selectedScheduleAllowedWeekdays = useMemo(() => {
    if (selectedSchedule && !isRoutineSchedule(selectedSchedule)) return null;
    const weekday = getScheduleWeekday(selectedSchedule);
    return Number.isInteger(weekday) ? [weekday] : null;
  }, [selectedSchedule]);
  const selectedScheduleAllowedDates = useMemo(() => {
    if (!selectedSchedule || isRoutineSchedule(selectedSchedule) || !selectedSchedule.date) return null;
    return [selectedSchedule.date];
  }, [selectedSchedule]);

  useEffect(() => {
    if (!selectedSchedule) {
      setAttendanceDate("");
    }
  }, [selectedSchedule]);

  const visiblePlayers = useMemo(() => {
    if (!selectedSchedule) return [];
    return getSchedulePlayersForCategory(selectedSchedule, selectedCategory, studentDirectory);
  }, [selectedCategory, selectedSchedule, studentDirectory]);

  useEffect(() => {
    if (visiblePlayers.length === 0) {
      setStatuses({});
      return;
    }

    setStatuses((prev) => {
      const nextStatuses = {};
      visiblePlayers.forEach((player) => {
        nextStatuses[player.id] = prev[player.id] || "hadir";
      });
      return nextStatuses;
    });
  }, [visiblePlayers]);

  const selectedScheduleSummary = useMemo(() => {
    if (!selectedSchedule) return "";
    return formatScheduleLabel(selectedSchedule, selectedCategory, studentDirectory);
  }, [selectedCategory, selectedSchedule, studentDirectory]);

  const recapScheduleOptions = useMemo(() => {
    const scheduleMap = new Map();
    const visibleSchedules = activeSection === "extraRecap"
      ? trainingSchedules.filter((schedule) => !isRoutineSchedule(schedule))
      : trainingSchedules.filter((schedule) => isRoutineSchedule(schedule));
    const visibleScheduleIds = new Set(visibleSchedules.map((schedule) => String(schedule.id)));
    const knownScheduleIds = new Set(trainingSchedules.map((schedule) => String(schedule.id)));
    const hasUsableLabel = (value) => {
      const label = normalizeText(value);
      return label && label !== "-" && label !== "jadwal";
    };

    visibleSchedules.forEach((schedule) => {
      if (!schedule.id) return;
      const label = formatScheduleLabel(schedule, selectedRecapCategory, studentDirectory);
      if (hasUsableLabel(label)) {
        scheduleMap.set(String(schedule.id), label);
      }
    });

    localAttendanceRecaps.forEach((item) => {
      if (!item.scheduleId) return;
      const scheduleId = String(item.scheduleId);

      if (!knownScheduleIds.has(scheduleId) || !visibleScheduleIds.has(scheduleId)) return;
      if (!scheduleMap.has(scheduleId) && hasUsableLabel(item.scheduleLabel)) {
        scheduleMap.set(scheduleId, item.scheduleLabel);
      }
    });

    return [
      { value: "all", label: "Semua Jadwal" },
      ...Array.from(scheduleMap.entries()).map(([value, label]) => ({
        value,
        label,
      })),
    ];
  }, [activeSection, localAttendanceRecaps, selectedRecapCategory, studentDirectory, trainingSchedules]);

  useEffect(() => {
    if (activeSection === "recap" || activeSection === "extraRecap") {
      setSelectedRecapSchedule("all");
    }
  }, [activeSection]);

  const recapInputByOptions = useMemo(() => {
    const inputByNames = new Set();

    localAttendanceRecaps.forEach((item) => {
      const inputBy = String(item.inputBy || item.coachName || "").trim();
      if (inputBy) {
        inputByNames.add(inputBy);
      }
    });

    return [
      { value: "all", label: "Semua Penginput" },
      ...Array.from(inputByNames)
        .sort((left, right) => left.localeCompare(right))
        .map((name) => ({ value: name, label: name })),
    ];
  }, [localAttendanceRecaps]);

  const visibleRecap = useMemo(() => {
    return localAttendanceRecaps.filter((item) => {
      const isMonthYearMatch = item.month === selectedMonth && item.year === selectedYear;
      const isCategoryMatch =
        selectedRecapCategory === "all" || item.category === selectedRecapCategory;
      const isScheduleMatch =
        selectedRecapSchedule === "all" ||
        item.scheduleId === selectedRecapSchedule ||
        (Array.isArray(item.scheduleIds) && item.scheduleIds.includes(selectedRecapSchedule)) ||
        (Array.isArray(item.entries) && item.entries.some((entry) => entry.scheduleId === selectedRecapSchedule));
      const itemInputBy = String(item.inputBy || item.coachName || "").trim();
      const isInputByMatch =
        selectedRecapInputBy === "all" || itemInputBy === selectedRecapInputBy;

      return isMonthYearMatch && isCategoryMatch && isScheduleMatch && isInputByMatch;
    });
  }, [
    localAttendanceRecaps,
    selectedMonth,
    selectedYear,
    selectedRecapCategory,
    selectedRecapSchedule,
    selectedRecapInputBy,
  ]);

  const recapMeetingSlots = useMemo(
    () => buildMonthlyMeetingSlots(
      selectedYear,
      selectedMonth,
      trainingSchedules,
      selectedRecapCategory,
      selectedRecapSchedule,
      "routine"
    ),
    [selectedMonth, selectedRecapCategory, selectedRecapSchedule, selectedYear, trainingSchedules]
  );

  const extraRecapMeetingSlots = useMemo(
    () => buildMonthlyMeetingSlots(
      selectedYear,
      selectedMonth,
      trainingSchedules,
      selectedRecapCategory,
      selectedRecapSchedule,
      "extra"
    ),
    [selectedMonth, selectedRecapCategory, selectedRecapSchedule, selectedYear, trainingSchedules]
  );

  const recapMatrixRows = useMemo(() => {
    return visibleRecap.map((row) => {
      const entries = Array.isArray(row.entries) ? row.entries : [];
      const cells = Array.from({ length: meetingsPerMonth }, (_, index) => {
        const slot = recapMeetingSlots[index] || null;
        const entry = slot
          ? entries.find((item) => entryMatchesSlot(item, slot)) || null
          : entries[index] || null;
        const status = normalizeAttendanceStatus(entry?.status || entry?.statusLabel);

        return {
          meeting: index + 1,
          dateLabel: slot?.dateLabel || entry?.dateLabel || "",
          time: slot?.time || "",
          status,
          label: statusOptions.find((option) => option.value === status)?.label || "-",
        };
      });

      const countByStatus = (status) => {
        return cells.filter((cell) => cell.status === status).length;
      };

      return {
        ...row,
        cells,
        hadirCount: countByStatus("hadir"),
        alphaCount: countByStatus("alpha"),
        sakitCount: countByStatus("sakit"),
      };
    });
  }, [recapMeetingSlots, visibleRecap]);

  const extraRecapMatrixRows = useMemo(() => {
    if (extraRecapMeetingSlots.length === 0) return [];

    return visibleRecap
      .map((row) => {
        const entries = Array.isArray(row.entries) ? row.entries : [];
        const cells = extraRecapMeetingSlots.map((slot, index) => {
          const entry = entries.find((item) => entryMatchesSlot(item, slot)) || null;
          const status = normalizeAttendanceStatus(entry?.status || entry?.statusLabel);

          return {
            meeting: index + 1,
            dateLabel: slot?.dateLabel || entry?.dateLabel || "",
            time: slot?.time || "",
            status,
            label: statusOptions.find((option) => option.value === status)?.label || "-",
          };
        });

        return {
          ...row,
          cells,
          hadirCount: cells.filter((cell) => cell.status === "hadir").length,
          alphaCount: cells.filter((cell) => cell.status === "alpha").length,
          sakitCount: cells.filter((cell) => cell.status === "sakit").length,
        };
      })
      .filter((row) => row.cells.some((cell) => cell.status));
  }, [extraRecapMeetingSlots, visibleRecap]);

  const isInputValid =
    Boolean(selectedSchedule) &&
    attendanceDate &&
    visiblePlayers.length > 0 &&
    visiblePlayers.every((player) => Boolean(statuses[player.id]));

  const selectedSchedulePlace = [
    selectedSchedule?.place,
    selectedSchedule?.location,
    selectedSchedule?.lokasi,
  ].find((value) => value && value !== "-") || "";

  const saveAttendanceToServer = async (payload) => {
    if (!window.axios || !selectedSchedule?.rawId) return false;

    const response = await window.axios.post("/api/pelatih/presensi/input", {
      id_jadwal: selectedSchedule.rawId,
      tanggal: payload.fromDate,
      data: payload.players.map((player) => ({
        id_siswa: player.id,
        status: statuses[player.id],
      })),
    });

    return response.data?.status !== false;
  };

  const handleSubmitAttendance = async () => {
    if (!isInputValid || isSubmitting) return;
    setIsSubmitting(true);
    clearToast();

    const payload = {
      category: selectedCategory || visiblePlayers[0]?.category || "",
      scheduleId: selectedSchedule?.id || "",
      scheduleLabel: selectedScheduleSummary,
      fromDate: attendanceDate,
      toDate: attendanceDate,
      players: visiblePlayers,
      statuses,
      coachName: currentCoachName,
    };

    let isSuccess = true;

    try {
      isSuccess = onSubmitAttendance ? await onSubmitAttendance(payload) : await saveAttendanceToServer(payload);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        "Kehadiran gagal disubmit. Cek jadwal dan status siswa lalu coba lagi.";
      showToast({ type: "error", message, autoCloseMs: 30000 });
      isSuccess = false;
    }

    if (isSuccess) {
      const toPercent = (value) => Math.round((Number(value || 0) / meetingsPerMonth) * 100);
      const startDate = new Date(attendanceDate);
      const monthIndex = startDate.getMonth();
      const nextMonth = monthOptions[monthIndex]?.value || selectedMonth;
      const nextYear = String(startDate.getFullYear() || selectedYear);

      setLocalAttendanceRecaps((prev) => [
        ...visiblePlayers.map((player, index) => ({
          id: `${Date.now()}-${index}`,
          coachName: currentCoachName,
          inputBy: currentCoachName,
          playerName: player.name || player,
          category: selectedCategory,
          scheduleId: selectedSchedule?.id || "",
          scheduleIds: selectedSchedule?.id ? [selectedSchedule.id] : [],
          scheduleLabel: selectedScheduleSummary,
          month: nextMonth,
          year: nextYear,
          meetingsTotal: meetingsPerMonth,
          entries: [{
            meeting: 1,
            date: attendanceDate,
            dateLabel: formatDateDisplay(attendanceDate).slice(0, 5),
            status: normalizeAttendanceStatus(statuses[player.id]),
            statusLabel: statusOptions.find((status) => status.value === statuses[player.id])?.label || "-",
            scheduleId: selectedSchedule?.id || "",
            scheduleLabel: selectedScheduleSummary,
          }],
          hadirCount: statuses[player.id] === "hadir" ? 1 : 0,
          sakitCount: statuses[player.id] === "sakit" ? 1 : 0,
          alphaCount: statuses[player.id] === "alpha" ? 1 : 0,
          hadir: toPercent(statuses[player.id] === "hadir" ? 1 : 0),
          sakit: toPercent(statuses[player.id] === "sakit" ? 1 : 0),
          alpha: toPercent(statuses[player.id] === "alpha" ? 1 : 0),
          izin: toPercent(statuses[player.id] === "alpha" ? 1 : 0),
        })),
        ...prev,
      ]);
    }

    if (isSuccess) {
      const startDate = new Date(attendanceDate);
      const monthIndex = startDate.getMonth();
      const nextMonth = monthOptions[monthIndex]?.value || selectedMonth;
      const nextYear = String(startDate.getFullYear() || selectedYear);
      const nextRecapCategory = selectedCategory || "all";
      const nextRecapSchedule = selectedSchedule?.id || "all";

      setSelectedMonth(nextMonth);
      setSelectedYear(nextYear);
      setSelectedRecapCategory(nextRecapCategory);
      setSelectedRecapSchedule(nextRecapSchedule);
      showToast({
        type: "success",
        message: "Data kehadiran berhasil disubmit. Rekap kehadiran sudah diperbarui.",
        autoCloseMs: null,
      });

      await new Promise((resolve) => window.setTimeout(resolve, 900));

      setActiveSection("recap");
      setSelectedCategory("");
      setSelectedScheduleId("");
      setAttendanceDate("");
      setStatuses({});
    }

    setIsSubmitting(false);
  };

  return (
    <TataLetakPelatih activeTab="attendance" title="Kehadiran" {...props}>
      <section className="coachAttendanceSwitchWrap">
        <button
          type="button"
          className={`coachAttendanceSwitch ${activeSection === "input" ? "is-active" : ""}`}
          onClick={() => setActiveSection("input")}
        >
          Input Kehadiran
        </button>
        <button
          type="button"
          className={`coachAttendanceSwitch ${activeSection === "recap" ? "is-active" : ""}`}
          onClick={() => setActiveSection("recap")}
        >
          Rekap Kehadiran
        </button>
        <button
          type="button"
          className={`coachAttendanceSwitch ${activeSection === "extraRecap" ? "is-active" : ""}`}
          onClick={() => setActiveSection("extraRecap")}
        >
          Rekap Latihan Tambahan
        </button>
      </section>

      <div className="coachTabContent" key={`attendance-${activeSection}`}>
        {activeSection === "input" ? (
          <section className="coachGridAttendance coachSectionSwap">
            <article className="coachCard coachAttendanceInputCard">
              <h2>Input Kehadiran</h2>

              <label className="coachFieldLabel">Pilih Kategori</label>
              <SoftSelect
                className="coachAttendanceSelect"
                value={selectedCategory}
                onChange={(nextCategory) => {
                  setSelectedCategory(nextCategory);
                  setSelectedScheduleId("");
                  setAttendanceDate("");
                  setStatuses({});
                }}
                options={categoryOptions}
              />

              <label className="coachFieldLabel">Pilih Jadwal</label>
              <SoftSelect
                className="coachAttendanceSelect"
                value={selectedSchedule ? selectedScheduleId : ""}
                onChange={(nextScheduleId) => {
                  setSelectedScheduleId(nextScheduleId);
                  setAttendanceDate("");
                  setStatuses({});
                }}
                options={scheduleOptions}
                disabled={!selectedCategory || filteredSchedules.length === 0}
              />

              <p className="coachFieldHint">
                {selectedSchedule
                  ? `${selectedScheduleSummary} | ${visiblePlayers.length} siswa`
                  : selectedCategory
                    ? filteredSchedules.length > 0
                      ? "Pilih jadwal dari data yang sudah dibuat admin."
                      : "Belum ada jadwal dari admin untuk kategori ini."
                    : "Pilih kategori dulu, lalu pilih jadwal yang tersedia."}
              </p>

              {selectedSchedulePlace ? (
                <div className="coachScheduleMetaBox">
                  <span className="coachScheduleMetaLabel">Tempat latihan</span>
                  <strong>{selectedSchedulePlace}</strong>
                </div>
              ) : null}

              <label className="coachFieldLabel" htmlFor="coach-attendance-date">
                Tanggal Absensi
              </label>
              <div className="coachDateField">
                <CoachDatePicker
                  value={attendanceDate}
                  onChange={setAttendanceDate}
                  disabled={!selectedSchedule}
                  allowedWeekdays={selectedScheduleAllowedWeekdays}
                  allowedDates={selectedScheduleAllowedDates}
                />
              </div>
              <p className="coachFieldHint">
                Pilih tanggal latihan harian sesuai hari jadwal yang dipilih.
              </p>

              <button
                type="button"
                className="coachAttendanceSubmitBtn"
                disabled={!isInputValid || isSubmitting}
                onClick={handleSubmitAttendance}
              >
                {isSubmitting ? "Mengirim..." : "Submit"}
              </button>
            </article>

            <article className="coachCard coachAttendanceTableCard">
              <h2>Absensi</h2>
              <div className="coachTableWrap">
                <table className="coachTable">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Nama</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiblePlayers.length > 0 ? (
                      visiblePlayers.map((row, index) => (
                        <tr key={row.id}>
                          <td>{index + 1}</td>
                          <td>{row.name}</td>
                          <td>
                            <div className="coachStatusChips">
                              {statusOptions.map((status) => (
                                <button
                                  type="button"
                                  key={status.value}
                                  className={`coachStatusChip is-${status.value} ${statuses[row.id] === status.value ? "is-active" : ""}`}
                                  onClick={() =>
                                    setStatuses((prev) => ({
                                      ...prev,
                                      [row.id]: status.value,
                                    }))
                                  }
                                >
                                  <span>{status.label}</span>
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3}>
                          {selectedCategory && filteredSchedules.length === 0
                            ? "Admin belum mengatur jadwal untuk kategori ini."
                            : "Pilih jadwal dulu untuk menampilkan daftar siswa."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </section>
        ) : activeSection === "recap" ? (
            <section className="coachCard coachTableCard coachRecapCard coachSectionSwap">
              <div className="coachTableHead">
                <h2>Rekap Kehadiran Pemain</h2>
                <div className="coachRecapFilters">
                  <SoftSelect
                    className="coachRecapSelect"
                    value={selectedMonth}
                    onChange={setSelectedMonth}
                    options={monthOptions}
                  />
                  <SoftSelect
                    className="coachRecapSelect"
                    value={selectedYear}
                    onChange={setSelectedYear}
                    options={yearOptions}
                  />
                  <SoftSelect
                    className="coachRecapSelect"
                    value={selectedRecapSchedule}
                    onChange={setSelectedRecapSchedule}
                    options={recapScheduleOptions}
                  />
                </div>
              </div>
              <div className="coachTableWrap">
                <table className="coachTable coachAttendanceMatrixTable">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Nama</th>
                      <th>
                        <SoftSelect
                          className="coachCategoryHeaderSoftSelect"
                          value={selectedRecapCategory}
                          onChange={setSelectedRecapCategory}
                          options={recapCategoryOptions}
                          displayLabel="Kategori"
                        />
                      </th>
                      {Array.from({ length: meetingsPerMonth }, (_, index) => (
                        <th key={`meeting-head-${index + 1}`}>
                          <span className="coachMeetingHead">
                            <span>P{index + 1}</span>
                            <small>{recapMeetingSlots[index]?.dateLabel || "Pertemuan"}</small>
                            {recapMeetingSlots[index]?.time ? (
                              <small>{recapMeetingSlots[index].time.replace(" WIB", "")}</small>
                            ) : null}
                          </span>
                        </th>
                      ))}
                      <th>Hadir</th>
                      <th>Alpha</th>
                      <th>Sakit</th>
                      <th>% Hadir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recapMatrixRows.length > 0 ? (
                      recapMatrixRows.map((row, rowIndex) => (
                        <tr key={row.id}>
                          <td>{rowIndex + 1}</td>
                          <td>{row.playerName || row.player}</td>
                          <td>{getCategoryLabel(row.category)}</td>
                          {row.cells.map((cell) => (
                            <td key={`${row.id}-meeting-${cell.meeting}`}>
                              <span className={`coachAttendanceStatusBadge ${cell.status ? `is-${cell.status}` : "is-empty"}`}>
                                {cell.label}
                              </span>
                              {cell.time ? <small className="coachMeetingDate">{cell.time.replace(" WIB", "")}</small> : null}
                            </td>
                          ))}
                          <td>{row.hadirCount}</td>
                          <td>{row.alphaCount}</td>
                          <td>{row.sakitCount}</td>
                          <td>{formatMeetingPercent(row.hadirCount)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={15}>Belum ada data untuk filter yang dipilih.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
        ) : (
          <section className="coachCard coachTableCard coachRecapCard coachSectionSwap">
            <div className="coachTableHead">
              <div className="coachAdditionalRecapHead">
                <div>
                  <h2>Rekap Latihan Tambahan</h2>
                  <p>Jadwal di luar Rabu dan Minggu pada filter yang dipilih.</p>
                </div>
              </div>
              <div className="coachRecapFilters">
                <SoftSelect
                  className="coachRecapSelect"
                  value={selectedMonth}
                  onChange={setSelectedMonth}
                  options={monthOptions}
                />
                <SoftSelect
                  className="coachRecapSelect"
                  value={selectedYear}
                  onChange={setSelectedYear}
                  options={yearOptions}
                />
                <SoftSelect
                  className="coachRecapSelect"
                  value={selectedRecapSchedule}
                  onChange={setSelectedRecapSchedule}
                  options={recapScheduleOptions}
                />
              </div>
            </div>
            <div className="coachTableWrap">
              <table className="coachTable coachAttendanceMatrixTable coachAttendanceExtraMatrixTable">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Nama</th>
                    <th>
                      <SoftSelect
                        className="coachCategoryHeaderSoftSelect"
                        value={selectedRecapCategory}
                        onChange={setSelectedRecapCategory}
                        options={recapCategoryOptions}
                        displayLabel="Kategori"
                      />
                    </th>
                    {extraRecapMeetingSlots.map((slot, index) => (
                      <th key={`extra-meeting-head-${slot.date}-${slot.scheduleId}-${index}`}>
                        <span className="coachMeetingHead">
                          <span>T{index + 1}</span>
                          <small>{slot.dateLabel || "Tambahan"}</small>
                          {slot.time ? <small>{slot.time.replace(" WIB", "")}</small> : null}
                        </span>
                      </th>
                    ))}
                    <th>Hadir</th>
                    <th>Alpha</th>
                    <th>Sakit</th>
                    <th>% Hadir</th>
                  </tr>
                </thead>
                <tbody>
                  {extraRecapMeetingSlots.length === 0 ? (
                    <tr>
                      <td colSpan={7}>Belum ada jadwal tambahan untuk filter yang dipilih.</td>
                    </tr>
                  ) : extraRecapMatrixRows.length > 0 ? (
                    extraRecapMatrixRows.map((row, rowIndex) => (
                      <tr key={`extra-${row.id}`}>
                        <td>{rowIndex + 1}</td>
                        <td>{row.playerName || row.player}</td>
                        <td>{getCategoryLabel(row.category)}</td>
                        {row.cells.map((cell) => (
                          <td key={`extra-${row.id}-meeting-${cell.meeting}`}>
                            <span className={`coachAttendanceStatusBadge ${cell.status ? `is-${cell.status}` : "is-empty"}`}>
                              {cell.label}
                            </span>
                            {cell.time ? <small className="coachMeetingDate">{cell.time.replace(" WIB", "")}</small> : null}
                          </td>
                        ))}
                        <td>{row.hadirCount}</td>
                        <td>{row.alphaCount}</td>
                        <td>{row.sakitCount}</td>
                        <td>{`${Math.round((row.hadirCount / extraRecapMeetingSlots.length) * 100)}%`}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={extraRecapMeetingSlots.length + 7}>
                        Belum ada data kehadiran untuk jadwal tambahan pada filter ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </TataLetakPelatih>
  );
}


