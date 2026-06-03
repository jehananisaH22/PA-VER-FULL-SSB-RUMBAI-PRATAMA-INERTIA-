import { useMemo, useState } from "react";
import "./DasborOrangTua.css";
import { parentRoutes, visitOrCall } from "./parentNavigation";
import SiteFooter from "../SiteFooter";

import LogoSBB from "../../../assets/LogoSBB.png";
import ProfileIcon from "../../../assets/Profile.png";
import CoachNoteIcon from "../../../assets/CatatanP_.png";
import PilihTahun from "./PilihTahun";
import LoncengNotifikasiOrangTua from "./LoncengNotifikasiOrangTua";
import useParentChildSwitcher from "./useParentChildSwitcher";

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 10.2v5.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="7.2" r="1.1" fill="currentColor" />
    </svg>
  );
}

export default function DasborOrangTua({
  onLogout,
  onSelectChild,
  onOpenHome,
  onOpenAttendance,
  onOpenPerformance,
  onOpenAchievements,
  onOpenCatatanPelatih,
  onOpenPayments,
  onOpenReupload,
  userName,
  studentProfile = {},
  childCategoryLabel = "-",
  paymentStatus,
  paymentInfo = null,
  trainingSchedules = [],
  achievements = [],
  attendanceRecaps = [],
  performanceHistory = [],
  coachNotes = [],
  notifications = [],
  onClearNotifications,
  reuploadRequest,
  canSwitchChild = false,
  childrenOptions = [],
  openChildPickerOnLoad = false,
  selectedChildId = null,
  hasSelectedChild = false,
}) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeDonutItem, setActiveDonutItem] = useState(null);
  const { activeChildName, openChildPicker, childPickerModal } = useParentChildSwitcher(
    userName,
    childrenOptions,
    openChildPickerOnLoad,
    selectedChildId,
    openChildPickerOnLoad || canSwitchChild || childrenOptions.length > 0
  );
  const childHasBeenPicked = Boolean(selectedChildId) && hasSelectedChild && !openChildPickerOnLoad;
  const displayUserName = childHasBeenPicked ? (activeChildName || userName) : "";
  const profilePhoto = studentProfile?.photo || ProfileIcon;
  const showChildPickerAction = canSwitchChild || childrenOptions.length > 0;
  const openSelectChild = () => {
    if (onSelectChild) {
      onSelectChild();
      return;
    }

    openChildPicker();
  };
  const unpaid = paymentStatus === "unpaid";
  const isActive = paymentStatus === "paid";
  const latestAttendance = attendanceRecaps[0] || null;
  const openHome = visitOrCall(onOpenHome, parentRoutes.home);
  const logout = visitOrCall(onLogout, parentRoutes.logout);
  const openProfile = visitOrCall(undefined, parentRoutes.profile);
  const openAttendance = visitOrCall(onOpenAttendance, parentRoutes.attendance);
  const openPerformance = visitOrCall(onOpenPerformance, parentRoutes.performance);
  const openAchievements = visitOrCall(onOpenAchievements, parentRoutes.achievements);
  const openNotes = visitOrCall(onOpenCatatanPelatih, parentRoutes.notes);
  const openPayments = visitOrCall(onOpenPayments, parentRoutes.payments);
  const openReupload = visitOrCall(onOpenReupload, parentRoutes.reupload);

  const donutData = useMemo(
    () => [
      { label: "Hadir", value: latestAttendance?.hadir ?? 0, color: "#5daf2f" },
      { label: "Sakit", value: latestAttendance?.sakit ?? 0, color: "#2f5b23" },
      { label: "Izin", value: latestAttendance?.izin ?? 0, color: "#468f28" },
    ],
    [latestAttendance]
  );
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

  const scheduleItems = useMemo(
    () =>
      trainingSchedules.map((item) => ({
        id: item.id,
        day: item.day,
        time: item.time,
        place: item.place,
        categoryLabel: item.categoryLabel || item.targetLabel || "Semua Siswa",
        targetLabel: item.targetLabel || "Semua Siswa",
      })),
    [trainingSchedules]
  );

  const performanceYears = useMemo(() => {
    const years = Array.from(new Set(performanceHistory.map((item) => Number(item.year)))).sort(
      (leftItem, rightItem) => rightItem - leftItem
    );
    return years.length > 0 ? years : [new Date().getFullYear()];
  }, [performanceHistory]);
  const latestPerformanceYear = String(performanceYears[0]);

  const perfMonths = useMemo(() => {
    const monthShortLabels = [
      { key: "januari", label: "Jan" },
      { key: "februari", label: "Feb" },
      { key: "maret", label: "Mar" },
      { key: "april", label: "Apr" },
      { key: "mei", label: "Mei" },
      { key: "juni", label: "Jun" },
      { key: "juli", label: "Jul" },
      { key: "agustus", label: "Agu" },
      { key: "september", label: "Sep" },
      { key: "oktober", label: "Okt" },
      { key: "november", label: "Nov" },
      { key: "desember", label: "Des" },
    ];

    const performanceMap = new Map();
    performanceHistory.forEach((item) => {
      const key = `${item.year}-${item.month}`;
      if (!performanceMap.has(key)) {
        performanceMap.set(
          key,
          Math.round(
            (Number(item.dribbling) + Number(item.passing) + Number(item.shooting)) / 3
          )
        );
      }
    });

    return monthShortLabels.map((month) => ({
      label: month.label,
      value: performanceMap.get(`${latestPerformanceYear}-${month.key}`) || 0,
    }));
  }, [latestPerformanceYear, performanceHistory]);

  return (
    <div className="parentPage">
      <header className="parentTopbar">
        <div className="parentTopInner">
          <button
            type="button"
            className="parentLogoBtn"
            onClick={openHome}
          >
            <img src={LogoSBB} alt="Logo SSB" />
          </button>
          <nav className="parentNavLinks">
            <button type="button" className="is-active">
              Dashboard
            </button>
            <button type="button" onClick={openAttendance}>
              Kehadiran
            </button>
            <button type="button" onClick={openPerformance}>
              Performa Latihan
            </button>
            <button type="button" onClick={openAchievements}>
              Prestasi
            </button>
            <button type="button" onClick={openNotes}>
              Catatan Pelatih
            </button>
            <button type="button" onClick={openPayments}>
              Pembayaran
            </button>
          </nav>
          <div className="parentNavRight">
            <LoncengNotifikasiOrangTua
              notifications={notifications}
              onClearNotifications={onClearNotifications}
            />
            <div className="parentProfileWrap">
              <button
                type="button"
                className="parentProfileBtn"
                onClick={() => setIsProfileOpen((prev) => !prev)}
              >
                <img src={ProfileIcon} alt="" />
                <span>{displayUserName}</span>
              </button>
              {isProfileOpen && (
                <div className="parentProfileMenu">
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
                  <button type="button" onClick={logout}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="parentMain">
        <div className="parentContainer">
          <section className="parentCard parentIdentity">
            <div className={`parentChildPhoto ${studentProfile?.photo ? "hasCustomPhoto" : ""}`}>
              <img src={profilePhoto} alt="Anak" />
            </div>
            <div className="parentIdentityContent">
              <div className="parentIdentityDetails">
                <h1>{displayUserName}</h1>
                {childHasBeenPicked && isActive && <p className="parentIdentityAge">{childCategoryLabel}</p>}
                {childHasBeenPicked && (
                  <strong className={`parentIdentityStatus ${unpaid ? "is-unpaid" : "is-paid"}`}>
                    {unpaid ? "Nonaktif" : "Aktif"}
                  </strong>
                )}
              </div>
            </div>
          </section>

          {paymentInfo?.message && (
            <section className="parentCard parentIdentityNoticeCard">
              <div className="parentIdentityNotice">
                <div className="parentIdentityNoticeIcon">
                  <InfoIcon />
                </div>
                <div className="parentIdentityNoticeBody">
                  <span className="parentIdentityNoticeLabel">
                    {paymentInfo.title || "Info Pembayaran"}
                    {paymentInfo.categoryLabel ? ` - ${paymentInfo.categoryLabel}` : ""}
                  </span>
                  <p className="parentIdentityNoticeText">{paymentInfo.message}</p>
                </div>
              </div>
            </section>
          )}

          {reuploadRequest && (
            <section className="parentCard parentReuploadAlert">
              <div className="parentReuploadAlertContent">
                <h2>Berkas Tidak Valid</h2>
                <p>{reuploadRequest.message}</p>
              </div>
              <button type="button" className="parentReuploadAlertButton" onClick={openReupload}>
                Upload Ulang Berkas
              </button>
            </section>
          )}

          {unpaid && (
            <section className="parentCard parentInfo">
              <h2>Info</h2>
              <h3>Silahkan melakukan pembayaran uang pendaftaran sebesar Rp280.000</h3>
              <p>
                Pembayaran dilakukan secara langsung di Lapangan Mesjid Da'wah Rumbai Pesisir
                saat jadwal latihan berlangsung.
              </p>
              <div className="parentPaymentSchedule" aria-label="Jadwal pembayaran langsung">
                <span>Jadwal latihan</span>
                <ul>
                  <li>
                    <b>Minggu</b>
                    <small>07.15-09.30 WIB</small>
                  </li>
                  <li>
                    <b>Rabu</b>
                    <small>16.25-17.55 WIB</small>
                  </li>
                </ul>
              </div>
            </section>
          )}

          <section className="parentGridTwo">
            <div className="parentCard parentPanel parentAttendancePanel">
              <h3>Kehadiran</h3>
              {isActive ? (
                attendanceRecaps.length > 0 ? (
                  <div className="parentDonutWrap">
                    <div className="parentDonutChart">
                      <svg
                        viewBox="0 0 100 100"
                        className="parentDonutSvg"
                        aria-label="Grafik Kehadiran"
                      >
                        {donutSegments.map((item) => (
                          <circle
                            key={item.label}
                            className="parentDonutSegment"
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
                        ))}
                      </svg>
                      <div className={`parentDonutCenterValue ${activeDonutItem ? "show" : ""}`}>
                        {activeDonutItem && (
                          <>
                            <span className="parentDonutCenterNumber">
                              {activeDonutItem.value}%
                            </span>
                            <span className="parentDonutCenterLabel">{activeDonutItem.label}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <ul className="parentLegend">
                      {donutData.map((item) => (
                        <li
                          key={item.label}
                          onMouseEnter={() => setActiveDonutItem(item)}
                          onMouseLeave={() => setActiveDonutItem(null)}
                        >
                          <span className={`dot ${item.label.toLowerCase()}`} />
                          {item.label} <b>{item.value}%</b>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="parentEmptyState">
                    Belum ada rekap kehadiran dari pelatih untuk siswa ini.
                  </div>
                )
              ) : (
                <div className="parentEmptyState">Fitur terkunci. Status masih nonaktif.</div>
              )}
            </div>
            <div className="parentCard parentPanel">
              <h3>Jadwal Latihan</h3>
              {isActive ? (
                scheduleItems.length > 0 ? (
                  <div className="parentSchedule parentScheduleScrollable">
                    {scheduleItems.map((item) => (
                      <article
                        className="parentScheduleRow"
                        key={item.id || `${item.day}-${item.time}`}
                      >
                        <span className="parentSchedulePin" />
                        <div className="parentScheduleContent">
                          <p>
                            <strong>{item.day}</strong> ({item.time})
                          </p>
                          <span>{item.place}</span>
                          <small>
                            {item.categoryLabel}
                            {item.targetLabel !== item.categoryLabel &&
                            item.targetLabel !== "Semua Siswa"
                              ? ` • ${item.targetLabel}`
                              : ""}
                          </small>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="parentEmptyState">
                    Belum ada jadwal latihan untuk kategori ini.
                  </div>
                )
              ) : (
                <div className="parentEmptyState">Fitur terkunci. Status masih nonaktif.</div>
              )}
            </div>
          </section>

          <section className="parentCard parentPanel parentTall parentPerformanceSection">
            <div className="parentPanelHead">
              <h3>Performa Latihan</h3>
              <PilihTahun options={performanceYears} />
            </div>
            {isActive ? (
              performanceHistory.length > 0 ? (
                <div className="parentBars">
                  {perfMonths.map((month, idx) => (
                    <div className="barWrap" key={month.label}>
                      <span
                        className={`bar ${idx % 2 === 0 ? "barPrimary" : "barAccent"}`}
                        style={{ height: `${month.value}%` }}
                      />
                      <small>{month.label}</small>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="parentEmptyState">
                  Belum ada data performa dari pelatih untuk siswa ini.
                </div>
              )
            ) : (
              <div className="parentEmptyState">Fitur terkunci. Status masih nonaktif.</div>
            )}
          </section>

          <section className="parentGridTwo">
            <div className="parentCard parentPanel parentTall">
              <h3>Prestasi</h3>
              {isActive ? (
                achievements.length > 0 ? (
                  <ul className="parentAchievements">
                    {achievements.map((item) => (
                      <li key={item.id}>{item.title}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="parentEmptyState">
                    Belum ada data prestasi untuk anak ini.
                  </div>
                )
              ) : (
                <div className="parentEmptyState">Fitur terkunci. Status masih nonaktif.</div>
              )}
            </div>
            <div className="parentCard parentPanel parentTall">
              <h3>Catatan Pelatih</h3>
              {isActive ? (
                coachNotes.length > 0 ? (
                  <div className="parentCoachNoteList">
                    {coachNotes.map((note, idx) => (
                      <article className="parentCoachNote" key={`${note.id || note.date}-${idx}`}>
                        <img src={CoachNoteIcon} alt="" className="parentCoachNoteIcon" />
                        <h4>{note.note || note.title}</h4>
                        <p>Posted by {note.coach || note.by}</p>
                        <time>{note.date}</time>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="parentEmptyState">
                    Belum ada catatan pelatih untuk siswa ini.
                  </div>
                )
              ) : (
                <div className="parentEmptyState">Fitur terkunci. Status masih nonaktif.</div>
              )}
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
      {childPickerModal}
    </div>
  );
}


