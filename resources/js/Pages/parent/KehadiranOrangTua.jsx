import { useMemo, useState } from "react";
import "./KehadiranOrangTua.css";
import { parentRoutes, visitOrCall } from "./parentNavigation";
import SiteFooter from "../SiteFooter";
import { router } from '@inertiajs/react';


import LogoSBB from "../../../assets/LogoSBB.png";
import ProfileIcon from "../../../assets/Profile.png";
import LoncengNotifikasiOrangTua from "./LoncengNotifikasiOrangTua";
import useParentChildSwitcher from "./useParentChildSwitcher";

const MONTH_NAMES = {
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
  desember: "Desember",
};

export default function KehadiranOrangTua({
  onLogout,
  onSelectChild,
  onOpenHome,
  onOpenDashboard,
  onOpenPerformance,
  onOpenAchievements,
  onOpenCatatanPelatih,
  onOpenPayments,
  userName,
  paymentStatus,
  attendanceRecaps = [],
  notifications = [],
  onClearNotifications,
  canSwitchChild = false,
  childrenOptions = [],
  selectedChildId = null,
  studentProfile, // 👈 TAMBAH INI
}) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeDonutItem, setActiveDonutItem] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [chartMotionKey, setChartMotionKey] = useState(0);
  const { activeChildName, openChildPicker, childPickerModal } = useParentChildSwitcher(
    userName,
    childrenOptions,
    false,
    selectedChildId
  );
  const displayUserName = activeChildName || userName;
  const profilePhoto = studentProfile?.photo || ProfileIcon;

  const showChildPickerAction = canSwitchChild || childrenOptions.length > 1;
  const openSelectChild = () => {
    if (onSelectChild) {
      onSelectChild();
      return;
    }

    openChildPicker();
  };

  const daftarAnak = () => {
      router.visit('/orang-tua/daftar-anak');
  };

  const isActive = paymentStatus === "paid";
  const openHome = visitOrCall(onOpenHome, parentRoutes.home);
  const logout = visitOrCall(onLogout, parentRoutes.logout);
  const openProfile = visitOrCall(undefined, parentRoutes.profile);
  const openDashboard = visitOrCall(onOpenDashboard, parentRoutes.dashboard);
  const openPerformance = visitOrCall(onOpenPerformance, parentRoutes.performance);
  const openAchievements = visitOrCall(onOpenAchievements, parentRoutes.achievements);
  const openNotes = visitOrCall(onOpenCatatanPelatih, parentRoutes.notes);
  const openPayments = visitOrCall(onOpenPayments, parentRoutes.payments);
  const attendanceRows = useMemo(
    () =>
      attendanceRecaps
        .map((item) => ({
          key: `${item.year}-${item.month}`,
          month: MONTH_NAMES[item.month] || item.month,
          percent: `${item.hadir}%`,
          monthValue: String(
            Object.keys(MONTH_NAMES).findIndex((monthKey) => monthKey === item.month) + 1
          ).padStart(2, "0"),
          year: item.year,
          createdAt: Number(item.createdAt) || 0,
        }))
        .sort((leftItem, rightItem) => rightItem.createdAt - leftItem.createdAt),
    [attendanceRecaps]
  );
  const effectiveSelectedMonth = useMemo(() => {
    if (attendanceRows.length === 0) {
      const now = new Date();
      return selectedMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    }
    const hasSelectedMonth = attendanceRows.some(
      (item) => `${item.year}-${item.monthValue}` === selectedMonth
    );
    if (selectedMonth && hasSelectedMonth) return selectedMonth;
    return `${attendanceRows[0].year}-${attendanceRows[0].monthValue}`;
  }, [attendanceRows, selectedMonth]);

  const donutData = useMemo(() => {
    const [yearText, monthText] = effectiveSelectedMonth.split("-");
    const matchedRecap = attendanceRecaps.find((item) => {
      const monthIndex = Object.keys(MONTH_NAMES).findIndex((monthKey) => monthKey === item.month);
      const normalizedMonth = String(monthIndex + 1).padStart(2, "0");
      return item.year === yearText && normalizedMonth === monthText;
    });
    const hadir = matchedRecap?.hadir ?? 0;
    const alpha = matchedRecap?.alpha ?? 0;
    const sakit = matchedRecap?.sakit ?? 0;
    return [
      { label: "Hadir", value: hadir, color: "#5daf2f" },
      { label: "Alpha", value: alpha, color: "#2f5b23" },
      { label: "Sakit", value: sakit, color: "#468f28" },
    ];
  }, [attendanceRecaps, effectiveSelectedMonth]);
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

  

  return (
    <div className="attendancePage">
      <header className="attendanceTopbar">
        <div className="attendanceTopInner">
          <button type="button" className="attendanceLogoBtn" onClick={openHome}>
            <img src={LogoSBB} alt="Logo SSB" />
          </button>
          <nav className="attendanceNavLinks">
            <button type="button" onClick={openDashboard}>
              Dashboard
            </button>
            <button type="button" className="is-active">
              Kehadiran
            </button>
            <button type="button" onClick={openPerformance}>Performa Latihan</button>
            <button type="button" onClick={openAchievements}>Prestasi</button>
            <button type="button" onClick={openNotes}>Catatan Pelatih</button>
            <button type="button" onClick={openPayments}>Pembayaran</button>
          </nav>
          <div className="attendanceNavRight">
            <LoncengNotifikasiOrangTua notifications={notifications} onClearNotifications={onClearNotifications} />
            <div className="attendanceProfileWrap">
              <button
                type="button"
                className="attendanceProfileBtn"
                onClick={() => setIsProfileOpen((prev) => !prev)}
              >
                <img src={profilePhoto} alt="Profil" />
                <span>{displayUserName}</span>
              </button>
              {isProfileOpen && (
                <div className="attendanceProfileMenu">
                  <button type="button" onClick={openProfile}>
                    Profil
                  </button>
                  

                  <button type="button" onClick={daftarAnak}>
    Daftar Anak
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

                  
                  <button type="button" onClick={logout}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="attendanceMain">
        <div className="attendanceContainer">
          <section className="attendanceCard">
            <div className="attendanceHeader">
              <div className="attendanceTitleWrap">
                <span className="attendanceCalendarIcon" />
                <h1>Kehadiran</h1>
              </div>
              <label className="attendanceMonthPicker">
                <span className="attendanceMonthIcon" />
                <input
                  type="month"
                  value={effectiveSelectedMonth}
                  onChange={(event) => {
                    setSelectedMonth(event.target.value);
                    setActiveDonutItem(null);
                    setChartMotionKey((prev) => prev + 1);
                  }}
                />
              </label>
            </div>

            <div className="attendanceDonutWrap">
              {isActive ? (
                <div className="attendanceDonutChart" key={`${selectedMonth}-${chartMotionKey}`}>
                  <svg viewBox="0 0 100 100" className="attendanceDonutSvg" aria-label="Grafik Kehadiran">
                    {donutSegments.map((item) => {
                      const segment = (
                        <circle
                          key={item.label}
                          className="attendanceDonutSegment"
                          cx="50"
                          cy="50"
                          r="42"
                          fill="none"
                          stroke={item.color}
                          strokeWidth="16"
                          strokeDasharray={`${item.dash} ${circumference - item.dash}`}
                          strokeDashoffset={item.dashOffset}
                          strokeLinecap="round"
                          onMouseEnter={() => setActiveDonutItem(item)}
                          onMouseLeave={() => setActiveDonutItem(null)}
                        />
                      );
                      return segment;
                    })}
                  </svg>
                  <div
                    className={`attendanceDonutCenterValue ${activeDonutItem ? "show" : ""}`}
                  >
                    {activeDonutItem && (
                      <>
                        <span className="attendanceDonutCenterNumber">{activeDonutItem.value}%</span>
                        <span className="attendanceDonutCenterLabel">{activeDonutItem.label}</span>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="attendanceEmptyBox">Fitur terkunci. Status masih nonaktif.</div>
              )}
            </div>

            {isActive ? (
              <ul className="attendanceLegend">
                <li
                  onMouseEnter={() => setActiveDonutItem(donutData[0])}
                  onMouseLeave={() => setActiveDonutItem(null)}
                >
                  <span className="dot hadir" />
                  Hadir <b>{donutData[0].value}%</b>
                </li>
                <li
                  onMouseEnter={() => setActiveDonutItem(donutData[1])}
                  onMouseLeave={() => setActiveDonutItem(null)}
                >
                  <span className="dot alpha" />
                  Alpha <b>{donutData[1].value}%</b>
                </li>
                <li
                  onMouseEnter={() => setActiveDonutItem(donutData[2])}
                  onMouseLeave={() => setActiveDonutItem(null)}
                >
                  <span className="dot sakit" />
                  Sakit <b>{donutData[2].value}%</b>
                </li>
              </ul>
            ) : (
              <div className="attendanceUnlockWrap">
              </div>
            )}

            <div className="attendanceListHeader">
              <h2>Daftar Kehadiran</h2>
            </div>

            {isActive ? (
              <div className="attendanceTableWrap">
                <table className="attendanceTable">
                  <thead>
                    <tr>
                      <th>Bulan</th>
                      <th>Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRows.map((row) => (
                      <tr key={row.key}>
                        <td>{row.month}</td>
                        <td>{row.percent}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="attendanceTableEmpty">Data kehadiran belum tersedia.</div>
            )}
          </section>
        </div>
      </main>

      <SiteFooter />
      {childPickerModal}
    </div>
  );
}


