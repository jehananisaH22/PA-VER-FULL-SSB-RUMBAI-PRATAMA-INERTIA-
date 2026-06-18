import { useEffect, useMemo, useRef, useState } from "react";
import "./PrestasiOrangTua.css";
import { parentRoutes, visitOrCall } from "./parentNavigation";
import SiteFooter from "../SiteFooter";
import { router } from '@inertiajs/react';


import LogoSBB from "../../../assets/LogoSBB.png";
import ProfileIcon from "../../../assets/Profile.png";
import TrophyIcon from "../../../assets/Trophy.png";
import LoncengNotifikasiOrangTua from "./LoncengNotifikasiOrangTua";
import useParentChildSwitcher from "./useParentChildSwitcher";

const DEFAULT_ACHIEVEMENT_YEAR = String(new Date().getFullYear());
const DEFAULT_ACHIEVEMENT_MONTH = String(new Date().getMonth() + 1).padStart(2, "0");

function resolveCreatedAt(value) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0;
}

const MONTH_NAMES = [
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

function formatAchievementDate(value) {
  const date = new Date(resolveCreatedAt(value));
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default function PrestasiOrangTua({
  onLogout,
  onSelectChild,
  onOpenHome,
  onOpenDashboard,
  onOpenAttendance,
  onOpenPerformance,
  onOpenCatatanPelatih,
  onOpenPayments,
  userName,
  paymentStatus,
  achievements = [],
  notifications = [],
  onClearNotifications,
  canSwitchChild = false,
  childrenOptions = [],
  selectedChildId = null,
     studentProfile, // 👈 TAMBAH INI
}) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(DEFAULT_ACHIEVEMENT_YEAR);
  const [selectedMonthNum, setSelectedMonthNum] = useState(DEFAULT_ACHIEVEMENT_MONTH);
  const [openPicker, setOpenPicker] = useState(null);
  const pickerRef = useRef(null);
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
  const isActive = paymentStatus === "paid";
  const openHome = visitOrCall(onOpenHome, parentRoutes.home);
  const logout = visitOrCall(onLogout, parentRoutes.logout);
  const openProfile = visitOrCall(undefined, parentRoutes.profile);
  const openDashboard = visitOrCall(onOpenDashboard, parentRoutes.dashboard);
  const openAttendance = visitOrCall(onOpenAttendance, parentRoutes.attendance);
  const openPerformance = visitOrCall(onOpenPerformance, parentRoutes.performance);
  const openNotes = visitOrCall(onOpenCatatanPelatih, parentRoutes.notes);
  const openPayments = visitOrCall(onOpenPayments, parentRoutes.payments);
  const availableYears = useMemo(() => {
    const years = Array.from(
      new Set(
        achievements
          .map((item) => resolveCreatedAt(item.createdAt))
          .filter((value) => value > 0)
          .map((value) => String(new Date(value).getFullYear()))
      )
    ).sort((leftItem, rightItem) => Number(rightItem) - Number(leftItem));

    return years.length > 0 ? years : [DEFAULT_ACHIEVEMENT_YEAR];
  }, [achievements]);
  const effectiveSelectedYear = availableYears.includes(selectedYear)
    ? selectedYear
    : availableYears[0];
  const selectedMonth = `${effectiveSelectedYear}-${selectedMonthNum}`;

  const filteredItems = useMemo(
    () =>
      achievements.filter((item) => {
        const date = new Date(resolveCreatedAt(item.createdAt));
        const year = String(date.getFullYear());
        const month = String(date.getMonth() + 1).padStart(2, "0");
        return `${year}-${month}` === selectedMonth;
      }),
    [achievements, selectedMonth]
  );
  const monthLabel = MONTH_NAMES[Number(selectedMonthNum) - 1] || "Bulan";

  useEffect(() => {
    function handleOutsideClick(event) {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setOpenPicker(null);
      }
    }

    if (openPicker) {
      document.addEventListener("mousedown", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [openPicker]);

  const daftarAnak = () => {
    router.visit('/orang-tua/daftar-anak');
};

  return (
    <div className="achievementPage">
      <header className="achievementTopbar">
        <div className="achievementTopInner">
          <button type="button" className="achievementLogoBtn" onClick={openHome}>
            <img src={LogoSBB} alt="Logo SSB" />
          </button>
          <nav className="achievementNavLinks">
            <button type="button" onClick={openDashboard}>Dashboard</button>
            <button type="button" onClick={openAttendance}>Kehadiran</button>
            <button type="button" onClick={openPerformance}>Performa Latihan</button>
            <button type="button" className="is-active">Prestasi</button>
            <button type="button" onClick={openNotes}>Catatan Pelatih</button>
            <button type="button" onClick={openPayments}>Pembayaran</button>
          </nav>
          <div className="achievementNavRight">
            <LoncengNotifikasiOrangTua notifications={notifications} onClearNotifications={onClearNotifications} />
            <div className="achievementProfileWrap">
              <button
                type="button"
                className="achievementProfileBtn"
                onClick={() => setIsProfileOpen((prev) => !prev)}
              >
                <img src={profilePhoto} alt="Profil" />
                <span>{displayUserName}</span>
              </button>
              {isProfileOpen && (
                <div className="achievementProfileMenu">
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
                  <button type="button" onClick={logout}>Logout</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="achievementMain">
        <div className="achievementContainer">
          <section className="achievementCard">
            <div className="achievementHeader">
              <div className="achievementTitleWrap">
                <img src={TrophyIcon} alt="" className="achievementTrophyIcon" />
                <h1>Prestasi</h1>
              </div>
              <div className="achievementMonthPicker" ref={pickerRef}>
                <span className="achievementMonthPickerEndIcon" aria-hidden="true" />
                <div className="achievementMonthPickerFields">
                  <button
                    type="button"
                    className={`achievementPickerBtn ${openPicker === "month" ? "is-open" : ""}`}
                    onClick={() => setOpenPicker((prev) => (prev === "month" ? null : "month"))}
                    aria-label="Pilih bulan"
                  >
                    <span>{monthLabel}</span>
                  </button>
                  <span className="achievementPickerDivider" />
                  <button
                    type="button"
                    className={`achievementPickerBtn ${openPicker === "year" ? "is-open" : ""}`}
                    onClick={() => setOpenPicker((prev) => (prev === "year" ? null : "year"))}
                    aria-label="Pilih tahun"
                  >
                    <span>{effectiveSelectedYear}</span>
                  </button>
                </div>
                {openPicker === "month" && (
                  <div className="achievementPickerMenu achievementMonthMenu">
                    {MONTH_NAMES.map((month, index) => {
                      const value = String(index + 1).padStart(2, "0");
                      return (
                        <button
                          key={month}
                          type="button"
                          className={value === selectedMonthNum ? "is-active" : ""}
                          onClick={() => {
                            setSelectedMonthNum(value);
                            setOpenPicker(null);
                          }}
                        >
                          {month}
                        </button>
                      );
                    })}
                  </div>
                )}
                {openPicker === "year" && (
                  <div className="achievementPickerMenu achievementYearMenu">
                    {availableYears.map((year) => (
                      <button
                        key={year}
                        type="button"
                        className={year === effectiveSelectedYear ? "is-active" : ""}
                        onClick={() => {
                          setSelectedYear(year);
                          setOpenPicker(null);
                        }}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {isActive ? (
              filteredItems.length > 0 ? (
                <ol className="achievementList">
                  {filteredItems.map((item) => (
                    <li key={item.id} className="achievementRow">
                      <span className="achievementName">{item.title}</span>
                      <time>{item.dateLabel || formatAchievementDate(item.createdAt)}</time>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="achievementEmpty">Belum ada data prestasi pada bulan ini.</div>
              )
            ) : (
              <div className="achievementLocked">
                <p>Fitur prestasi terkunci. Status masih nonaktif.</p>
              </div>
            )}
          </section>
        </div>
      </main>

      <SiteFooter />
      {childPickerModal}
    </div>
  );
}