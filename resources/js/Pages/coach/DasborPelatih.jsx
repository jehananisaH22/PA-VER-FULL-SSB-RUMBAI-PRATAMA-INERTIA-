import { useEffect, useMemo, useRef, useState } from "react";
import { router } from "@inertiajs/react";
import TataLetakPelatih from "./TataLetakPelatih";
import "./DasborPelatih.css";
import ProfileIcon from "../../../assets/Profile.png";
import PlaceMarkerIcon from "../../../assets/PlaceMarker.png";

const categoryFilterOptions = [
  { value: "all", label: "Semua Kategori" },
  { value: "u10", label: "U-10" },
  { value: "u11", label: "U-11" },
  { value: "u12", label: "U-12" },
];

function normalizeCategory(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function average(rows, key) {
  if (rows.length === 0) return 0;
  return Math.round(rows.reduce((sum, row) => sum + Number(row[key] || 0), 0) / rows.length);
}

const monthOrder = {
  januari: 1,
  februari: 2,
  maret: 3,
  april: 4,
  mei: 5,
  juni: 6,
  juli: 7,
  agustus: 8,
  september: 9,
  oktober: 10,
  november: 11,
  desember: 12,
};

function periodScore(item) {
  const year = Number(item.year || 0);
  const month = monthOrder[String(item.month || "").toLowerCase()] || 0;
  if (year > 0 && month > 0) return year * 100 + month;

  if (Number.isFinite(Number(item.createdAt))) return Number(item.createdAt);

  return 0;
}

function latestPeriodRows(rows = []) {
  const scoredRows = rows.filter((item) => periodScore(item) > 0);
  if (scoredRows.length === 0) return rows;

  const latestScore = Math.max(...scoredRows.map(periodScore));
  return scoredRows.filter((item) => periodScore(item) === latestScore);
}

function buildAttendanceGroups(rows = []) {
  const buildGroup = (category) => {
    const categoryRows = category === "all"
      ? rows
      : rows.filter((item) => normalizeCategory(item.category) === category);
    const filtered = latestPeriodRows(categoryRows);

    return [
      { label: "Hadir", value: average(filtered, "hadir"), color: "#5dae2f" },
      { label: "Sakit", value: average(filtered, "sakit"), color: "#4d8f2c" },
      { label: "Izin", value: average(filtered, "izin"), color: "#376d1f" },
    ];
  };

  return {
    all: buildGroup("all"),
    u10: buildGroup("u10"),
    u11: buildGroup("u11"),
    u12: buildGroup("u12"),
  };
}

function buildPerformanceGroups(rows = []) {
  const buildGroup = (category) => {
    const categoryRows = category === "all"
      ? rows
      : rows.filter((item) => normalizeCategory(item.category) === category);
    const filtered = latestPeriodRows(categoryRows);

    return {
      dribbling: average(filtered, "dribbling"),
      passing: average(filtered, "passing"),
      shooting: average(filtered, "shooting"),
    };
  };

  return {
    all: buildGroup("all"),
    u10: buildGroup("u10"),
    u11: buildGroup("u11"),
    u12: buildGroup("u12"),
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

function CoachDashboardSelect({ value, onChange, ariaLabel }) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);
  const selectedOption =
    categoryFilterOptions.find((option) => option.value === value) || categoryFilterOptions[0];

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
      className={`coachCategorySelect ${isOpen ? "isOpen" : ""}`}
      ref={rootRef}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="coachCategorySelectTrigger"
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
        <span>{selectedOption.label}</span>
        <span className="coachCategorySelectIcon">
          <ChevronDownIcon />
        </span>
      </button>

      {isOpen ? (
        <div className="coachCategorySelectMenu" role="listbox" aria-label={ariaLabel}>
          {categoryFilterOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={`coachCategorySelectOption ${option.value === value ? "isSelected" : ""}`}
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

export default function DasborPelatih(props) {
  const coachName = props.currentCoachName || props.userName || "Pelatih";
  const attendanceRecaps = props.attendanceRecaps || [];
  const rawPerformanceHistory = props.history || props.performanceHistory || [];
  const rawCoachNotes = props.notes || props.coachNotes || [];
  const dashboardCoachNotes = rawCoachNotes
    .map((item) => ({
      player: item.player || item.studentName,
      note: item.note,
      createdAt: Number(item.createdAt || 0),
    }))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);
  const dashboardSchedules = (props.trainingSchedules || []).map((item) => ({
      day: item.day,
      time: item.time,
      location: item.place || item.location,
    }));
  const dashboardPerformanceRows = useMemo(() => rawPerformanceHistory.map((item) => ({
      name: item.player || item.studentName,
      player: item.player || item.studentName,
      category: item.category,
      dribbling: item.dribbling,
      passing: item.passing,
      shooting: item.shooting,
      createdAt: Number(item.createdAt || 0),
      month: item.month,
      year: item.year,
    })).sort((a, b) => periodScore(b) - periodScore(a)), [rawPerformanceHistory]);
  const attendanceDataByCategory = useMemo(
    () => buildAttendanceGroups(attendanceRecaps),
    [attendanceRecaps]
  );
  const performanceByCategory = useMemo(
    () => buildPerformanceGroups(dashboardPerformanceRows),
    [dashboardPerformanceRows]
  );
  const [selectedAttendanceCategory, setSelectedAttendanceCategory] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTableCategory, setSelectedTableCategory] = useState("all");
  const donutData = useMemo(
    () => attendanceDataByCategory[selectedAttendanceCategory] || attendanceDataByCategory.all,
    [selectedAttendanceCategory]
  );
  const totalAttendance = useMemo(
    () => donutData.reduce((acc, item) => acc + item.value, 0),
    [donutData]
  );
  const [activeDonutLabel, setActiveDonutLabel] = useState("Total");
  const activeDonutItem = useMemo(() => {
    if (activeDonutLabel === "Total") return { label: "Total", value: totalAttendance };
    const matched = donutData.find((item) => item.label === activeDonutLabel);
    return matched ? { label: matched.label, value: matched.value } : { label: "Total", value: totalAttendance };
  }, [activeDonutLabel, donutData, totalAttendance]);
  const performance = performanceByCategory[selectedCategory] || performanceByCategory.all;
  const filteredLatestPerformance = useMemo(() => {
    const filtered = selectedTableCategory === "all"
      ? dashboardPerformanceRows
      : dashboardPerformanceRows.filter(
      (item) => normalizeCategory(item.category) === selectedTableCategory
    );
    return latestPeriodRows(filtered);
  }, [dashboardPerformanceRows, selectedTableCategory]);
  const performanceRows = [
    { key: "dribbling", label: "Dribbling", value: performance.dribbling, colorClass: "barOne" },
    { key: "passing", label: "Passing", value: performance.passing, colorClass: "barTwo" },
    { key: "shooting", label: "Shooting", value: performance.shooting, colorClass: "barThree" },
  ];

  useEffect(() => {
    const refreshId = window.setInterval(() => {
      router.reload({
        only: ["trainingSchedules", "attendanceRecaps", "history", "performanceHistory", "notes", "coachNotes", "notifications"],
        preserveScroll: true,
        preserveState: true,
      });
    }, 10000);

    return () => window.clearInterval(refreshId);
  }, []);

  const circumference = 2 * Math.PI * 42;
  const segmentGap = 3.8;
  const donutSegments = useMemo(
    () =>
      donutData.map((item, index) => {
        const rawLength = totalAttendance > 0 ? (item.value / totalAttendance) * circumference : 0;
        const dash = Math.max(rawLength - segmentGap, 0);
        const previousTotal = donutData
          .slice(0, index)
          .reduce((sum, entry) => sum + (totalAttendance > 0 ? (entry.value / totalAttendance) * circumference : 0), 0);
        return {
          ...item,
          dash,
          dashOffset: -(previousTotal + segmentGap / 2),
        };
      }),
    [donutData, totalAttendance, circumference]
  );

  return (
    <TataLetakPelatih activeTab="dashboard" title="Dashboard" showTitle={false} {...props}>
      <section className="coachCard coachIdentity coachDashItem">
        <div className="coachIdentityAvatar">
          <img src={ProfileIcon} alt="Coach" />
        </div>
        <div>
          <h2>{coachName}</h2>
          <p>Coach</p>
        </div>
      </section>

      <section className="coachGridTwo coachDashItem coachDashDelay2">
        <article
          className="coachCard coachPanel coachAttendancePanel"
          onClick={() => setActiveDonutLabel("Total")}
        >
          <div className="coachAttendanceHead">
            <h2>Total Kehadiran Minggu Ini</h2>
            <CoachDashboardSelect
              value={selectedAttendanceCategory}
              onChange={setSelectedAttendanceCategory}
              ariaLabel="Filter kategori kehadiran"
            />
          </div>
          <div className="coachDonutChartInteractive" key={selectedAttendanceCategory}>
            <svg viewBox="0 0 100 100" className="coachDonutSvg" aria-label="Grafik Kehadiran">
              {donutSegments.map((item) => {
                const segment = (
                  <circle
                    key={item.label}
                    className="coachDonutSegment"
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke={item.color}
                    strokeWidth="16"
                    strokeDasharray={`${item.dash} ${circumference - item.dash}`}
                    strokeDashoffset={item.dashOffset}
                    strokeLinecap="round"
                    onMouseEnter={() => setActiveDonutLabel(item.label)}
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveDonutLabel(item.label);
                    }}
                  />
                );
                return segment;
              })}
            </svg>
            <div className="coachDonutCenterValue show">
              <span className="coachDonutCenterNumber">{activeDonutItem.value}</span>
              <span className="coachDonutCenterLabel">{activeDonutItem.label}</span>
            </div>
          </div>
          <ul className="coachLegend">
            {donutData.map((item) => (
              <li
                key={item.label}
                onMouseEnter={() => setActiveDonutLabel(item.label)}
              >
                <span style={{ background: item.color }} />
                {item.label}
              </li>
            ))}
          </ul>
        </article>

        <article className="coachCard coachPanel coachPerformancePanel">
          <div className="coachPerformanceHead">
            <h2>Rata-Rata Nilai Performa Bulan Ini</h2>
            <CoachDashboardSelect
              value={selectedCategory}
              onChange={setSelectedCategory}
              ariaLabel="Filter kategori performa"
            />
          </div>
          <div className="coachPerformanceRows" key={selectedCategory}>
            {performanceRows.map((row) => (
              <div className="coachPerformanceRow" key={row.key}>
                <span className="coachPerformanceLabel">{row.label}</span>
                <div className="coachPerformanceTrack">
                  <span
                    className={`coachPerformanceFill ${row.colorClass}`}
                    style={{ width: row.value > 0 ? `${Math.min(row.value, 100)}%` : "0%" }}
                  />
                </div>
                <b className="coachPerformanceValue">{row.value}</b>
              </div>
            ))}
          </div>
          <ul className="coachBarLegend">
            <li><span className="barOne" />Dribbling</li>
            <li><span className="barTwo" />Passing</li>
            <li><span className="barThree" />Shooting</li>
          </ul>
        </article>
      </section>

      <section className="coachGridTwo coachDashItem coachDashDelay3">
        <article className="coachCard coachPanel">
          <h2>Catatan Pelatih Terkini</h2>
          <div className="coachList">
            {dashboardCoachNotes.length > 0 ? dashboardCoachNotes.map((item, index) => (
              <article key={`${item.player}-${index}`} className="coachListItem">
                <h3>{item.player}</h3>
                <p>{item.note}</p>
              </article>
            )) : <p className="coachEmptyText">Belum ada catatan pelatih.</p>}
          </div>
        </article>

        <article className="coachCard coachPanel">
          <h2>Jadwal Latihan</h2>
          <div className="coachList">
            {dashboardSchedules.length > 0 ? dashboardSchedules.map((item) => (
              <article key={`${item.day}-${item.time}`} className="coachScheduleItem">
                <img src={PlaceMarkerIcon} alt="" className="coachScheduleIcon" />
                <p>
                  <b>{item.day}</b> ({item.time}) {item.location}
                </p>
              </article>
            )) : <p className="coachEmptyText">Belum ada jadwal latihan.</p>}
          </div>
        </article>
      </section>

      <section className="coachCard coachTableCard coachDashItem coachDashDelay4">
        <div className="coachTableHead">
          <h2>Performa Terakhir yang Diupdate</h2>
          <CoachDashboardSelect
            value={selectedTableCategory}
            onChange={setSelectedTableCategory}
            ariaLabel="Filter kategori performa terakhir"
          />
        </div>
        <div className="coachTableWrap">
          <table className="coachTable">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Kategori</th>
                <th>Dribbling</th>
                <th>Passing</th>
                <th>Shooting</th>
              </tr>
            </thead>
            <tbody>
              {filteredLatestPerformance.length > 0 ? (
                filteredLatestPerformance.map((item) => (
                  <tr key={item.name}>
                    <td>{item.name}</td>
                    <td>{item.category}</td>
                    <td>{item.dribbling}</td>
                    <td>{item.passing}</td>
                    <td>{item.shooting}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>Belum ada data untuk kategori ini.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </TataLetakPelatih>
  );
}


