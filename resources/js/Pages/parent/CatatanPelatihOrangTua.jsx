import { useEffect, useMemo, useRef, useState } from "react";
import "./CatatanPelatihOrangTua.css";
import { parentRoutes, visitOrCall } from "./parentNavigation";
import SiteFooter from "../SiteFooter";

import LogoSBB from "../../../assets/LogoSBB.png";
import ProfileIcon from "../../../assets/Profile.png";
import CatatanPelatihIcon from "../../../assets/CatatanPe.png";
import LoncengNotifikasiOrangTua from "./LoncengNotifikasiOrangTua";
import useParentChildSwitcher from "./useParentChildSwitcher";

const today = new Date();
const DEFAULT_COACH_NOTE_YEAR = String(today.getFullYear());
const DEFAULT_COACH_NOTE_MONTH = String(today.getMonth() + 1).padStart(2, "0");

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

function formatDate(dateText) {
  const [day, month, year] = String(dateText || "").split("/");
  const monthName = MONTH_NAMES[Number(month) - 1] || "";
  return day && month && year ? `${Number(day)} ${monthName} ${year}` : dateText;
}

export default function CatatanPelatihOrangTua({
  onLogout,
  onSelectChild,
  onOpenHome,
  onOpenDashboard,
  onOpenAttendance,
  onOpenPerformance,
  onOpenAchievements,
  onOpenPayments,
  userName,
  paymentStatus,
  notes = [],
  notifications = [],
  onClearNotifications,
  canSwitchChild = false,
  childrenOptions = [],
  selectedChildId = null,
}) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(DEFAULT_COACH_NOTE_YEAR);
  const [selectedMonthNum, setSelectedMonthNum] = useState(DEFAULT_COACH_NOTE_MONTH);
  const [openPicker, setOpenPicker] = useState(null);
  const pickerRef = useRef(null);
  const { activeChildName, openChildPicker, childPickerModal } = useParentChildSwitcher(
    userName,
    childrenOptions,
    false,
    selectedChildId
  );
  const displayUserName = activeChildName || userName;
  const showChildPickerAction = canSwitchChild || childrenOptions.length > 0;
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
  const openAchievements = visitOrCall(onOpenAchievements, parentRoutes.achievements);
  const openPayments = visitOrCall(onOpenPayments, parentRoutes.payments);
  const availableYears = useMemo(() => {
    const years = Array.from(
      new Set(
        notes
          .map((item) => resolveCreatedAt(item.createdAt))
          .filter((value) => value > 0)
          .map((value) => String(new Date(value).getFullYear()))
      )
    ).sort((leftItem, rightItem) => Number(rightItem) - Number(leftItem));

    return years.length > 0 ? years : [DEFAULT_COACH_NOTE_YEAR];
  }, [notes]);
  const effectiveSelectedYear = availableYears.includes(selectedYear)
    ? selectedYear
    : availableYears[0];
  const selectedMonth = `${effectiveSelectedYear}-${selectedMonthNum}`;
  const latestNoteDate = useMemo(() => {
    const latestTimestamp = notes
      .map((item) => resolveCreatedAt(item.createdAt))
      .filter((value) => value > 0)
      .sort((leftItem, rightItem) => rightItem - leftItem)[0];

    return latestTimestamp ? new Date(latestTimestamp) : null;
  }, [notes]);

  const filteredItems = useMemo(
    () =>
      notes.filter((item) => {
        const date = new Date(resolveCreatedAt(item.createdAt));
        const year = String(date.getFullYear());
        const month = String(date.getMonth() + 1).padStart(2, "0");
        return `${year}-${month}` === selectedMonth;
      }),
    [notes, selectedMonth]
  );
  const monthLabel = MONTH_NAMES[Number(selectedMonthNum) - 1] || "Bulan";

  useEffect(() => {
    if (!latestNoteDate || filteredItems.length > 0) return;

    setSelectedYear(String(latestNoteDate.getFullYear()));
    setSelectedMonthNum(String(latestNoteDate.getMonth() + 1).padStart(2, "0"));
  }, [filteredItems.length, latestNoteDate]);

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

  return (
    <div className="coachNotesPage">
      <header className="coachNotesTopbar">
        <div className="coachNotesTopInner">
          <button type="button" className="coachNotesLogoBtn" onClick={openHome}>
            <img src={LogoSBB} alt="Logo SSB" />
          </button>
          <nav className="coachNotesNavLinks">
            <button type="button" onClick={openDashboard}>Dashboard</button>
            <button type="button" onClick={openAttendance}>Kehadiran</button>
            <button type="button" onClick={openPerformance}>Performa Latihan</button>
            <button type="button" onClick={openAchievements}>Prestasi</button>
            <button type="button" className="is-active">Catatan Pelatih</button>
            <button type="button" onClick={openPayments}>Pembayaran</button>
          </nav>
          <div className="coachNotesNavRight">
            <LoncengNotifikasiOrangTua notifications={notifications} onClearNotifications={onClearNotifications} />
            <div className="coachNotesProfileWrap">
              <button
                type="button"
                className="coachNotesProfileBtn"
                onClick={() => setIsProfileOpen((prev) => !prev)}
              >
                <img src={ProfileIcon} alt="" />
                <span>{displayUserName}</span>
              </button>
              {isProfileOpen && (
                <div className="coachNotesProfileMenu">
                  <button type="button" onClick={openProfile}>
                    Profil
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

      <main className="coachNotesMain">
        <div className="coachNotesContainer">
          <section className="coachNotesCard">
            <div className="coachNotesHeader">
              <div className="coachNotesTitleWrap">
                <img src={CatatanPelatihIcon} alt="" className="coachNotesTitleIcon" />
                <h1>Catatan Pelatih</h1>
              </div>
              <div className="coachNotesMonthPicker" ref={pickerRef}>
                <span className="coachNotesMonthPickerEndIcon" aria-hidden="true" />
                <div className="coachNotesMonthPickerFields">
                  <button
                    type="button"
                    className={`coachNotesPickerBtn ${openPicker === "month" ? "is-open" : ""}`}
                    onClick={() => setOpenPicker((prev) => (prev === "month" ? null : "month"))}
                    aria-label="Pilih bulan"
                  >
                    <span>{monthLabel}</span>
                  </button>
                  <span className="coachNotesPickerDivider" />
                  <button
                    type="button"
                    className={`coachNotesPickerBtn ${openPicker === "year" ? "is-open" : ""}`}
                    onClick={() => setOpenPicker((prev) => (prev === "year" ? null : "year"))}
                    aria-label="Pilih tahun"
                  >
                    <span>{effectiveSelectedYear}</span>
                  </button>
                </div>
                {openPicker === "month" && (
                  <div className="coachNotesPickerMenu coachNotesMonthMenu">
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
                  <div className="coachNotesPickerMenu coachNotesYearMenu">
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
                <ol className="coachNotesList">
                  {filteredItems.map((item) => (
                    <li key={item.id} className="coachNotesRow">
                      <span className="coachNotesText">{item.note || item.title}</span>
                      <span className="coachNotesCoach">
                        <span className="coachNotesCoachIcon" aria-hidden="true" />
                        {item.coach}
                      </span>
                      <time>{formatDate(item.date)}</time>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="coachNotesEmpty">Belum ada catatan pelatih pada bulan ini.</div>
              )
            ) : (
              <div className="coachNotesLocked">
                <p>Fitur catatan pelatih terkunci. Status masih nonaktif.</p>
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



