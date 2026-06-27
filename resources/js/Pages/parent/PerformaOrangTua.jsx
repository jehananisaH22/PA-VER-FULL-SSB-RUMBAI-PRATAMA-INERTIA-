import { useMemo, useState } from "react"; 
import "./PerformaOrangTua.css"; 
import { parentRoutes, visitOrCall } from "./parentNavigation"; 
import GreenSelect from "../../components/GreenSelect"; 
import SiteFooter from "../SiteFooter"; 
import { router } from '@inertiajs/react'; 


import LogoSBB from "../../../assets/LogoSBB.png"; 
import ProfileIcon from "../../../assets/Profile.png"; 
import CoachNoteIcon from "../../../assets/CatatanP_.png"; 
import LoncengNotifikasiOrangTua from "./LoncengNotifikasiOrangTua"; 
import useParentChildSwitcher from "./useParentChildSwitcher"; 

const perfMonthOptions = [
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
{ value: "12", label: "Desember" }]; 


const coachMonthMap = { 
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
  desember: "12"
}; 

export default function PerformaOrangTua({ 
  onLogout, 
  onSelectChild, 
  onOpenHome, 
  onOpenDashboard, 
  onOpenAttendance, 
  onOpenAchievements, 
  onOpenCatatanPelatih, 
  onOpenPayments, 
  userName, 
  childCategoryLabel = "-", 
  paymentStatus, 
  performanceHistory = [], 
  coachNotes = [], 
  notifications = [], 
  onClearNotifications, 
  canSwitchChild = false, 
  childrenOptions = [], 
  selectedChildId = null, 
  studentProfile
}) {
  const [isProfileOpen, setIsProfileOpen] = useState(false); 
  const [selectedMonth, setSelectedMonth] = useState(null); 
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear())); 
  const [motionKey, setMotionKey] = useState(0); 
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
  const openAchievements = visitOrCall(onOpenAchievements, parentRoutes.achievements); 
  const openNotes = visitOrCall(onOpenCatatanPelatih, parentRoutes.notes); 
  const openPayments = visitOrCall(onOpenPayments, parentRoutes.payments); 

  const visiblePerformanceHistory = useMemo(
    () => performanceHistory,
    [performanceHistory]
  ); 

  const availableYears = useMemo(() => {
    const years = Array.from(new Set(visiblePerformanceHistory.map((item) => String(item.year)))).sort(
      (leftItem, rightItem) => Number(rightItem) - Number(leftItem)
    ); 
    return years.length > 0 ? years : [String(new Date().getFullYear())];
  }, [visiblePerformanceHistory]);
  const effectiveSelectedYear = availableYears.includes(selectedYear) ?
  selectedYear :
  availableYears[0]; 

  const performanceMap = useMemo(() => {
    const nextMap = new Map(); 
    visiblePerformanceHistory.forEach((item) => {
      const normalizedMonth = coachMonthMap[item.month] || item.month || "01"; 
      const key = `${item.year}-${normalizedMonth}`; 
      const bucket = nextMap.get(key) || { 
        dribbling: 0, 
        passing: 0, 
        shooting: 0, 
        count: 0
      }; 

      bucket.dribbling += Number(item.dribbling || 0); 
      bucket.passing += Number(item.passing || 0); 
      bucket.shooting += Number(item.shooting || 0); 
      bucket.count += 1; 
      nextMap.set(key, bucket);
    }); 
    return nextMap;
  }, [visiblePerformanceHistory]);

  const chartData = useMemo(
    () =>
    perfMonthOptions.map((month) => {
      const matchedRow = performanceMap.get(`${effectiveSelectedYear}-${month.value}`); 
      if (!matchedRow) return 0; 
      return Math.round(
        (matchedRow.dribbling + matchedRow.passing + matchedRow.shooting) / (
        matchedRow.count * 3)
      );
    }),
    [effectiveSelectedYear, performanceMap]
  ); 

  const scoreRows = useMemo(
    () => {
      if (visiblePerformanceHistory.length === 0) {
        return [];
      } 

      return perfMonthOptions.map((month) => {
        const matchedRow = performanceMap.get(`${effectiveSelectedYear}-${month.value}`); 
        const dribbling = matchedRow ? Math.round(matchedRow.dribbling / matchedRow.count) : null; 
        const passing = matchedRow ? Math.round(matchedRow.passing / matchedRow.count) : null; 
        const shooting = matchedRow ? Math.round(matchedRow.shooting / matchedRow.count) : null; 
        const average =
        matchedRow && dribbling !== null && passing !== null && shooting !== null ?
        Math.round((dribbling + passing + shooting) / 3) :
        null; 
        const grade =
        average === null ? "-" : average >= 85 ? "A" : average >= 75 ? "B" : "C"; 

        return { 
          period: `${month.label} ${effectiveSelectedYear}`, 
          dribbling, 
          passing, 
          shooting, 
          average, 
          grade
        };
      });
    },
    [effectiveSelectedYear, visiblePerformanceHistory.length, performanceMap]
  ); 

  const daftarAnak = () => {
    router.visit('/orang-tua/daftar-anak');
  }; 

  return (
    <div className="performancePage">
       <header className="performanceTopbar">
         <div className="performanceTopInner">
           <button
            type="button"
            className="performanceLogoBtn"
            onClick={openHome}>
            
             <img src={LogoSBB} alt="Logo SSB" />
          </button>
           <nav className="performanceNavLinks">
             <button type="button" onClick={openDashboard}>Dashboard</button>
             <button type="button" onClick={openAttendance}>Kehadiran</button>
             <button type="button" className="is-active">Performa Latihan</button>
             <button type="button" onClick={openAchievements}>Prestasi</button>
             <button type="button" onClick={openNotes}>Catatan Pelatih</button>
             <button type="button" onClick={openPayments}>Pembayaran</button>
          </nav>
           <div className="performanceNavRight">
             <LoncengNotifikasiOrangTua notifications={notifications} onClearNotifications={onClearNotifications} />
             <div className="performanceProfileWrap">
               <button
                type="button"
                className="performanceProfileBtn"
                onClick={() => setIsProfileOpen((prev) => !prev)}>
                
                 <img src={profilePhoto} alt="Profil" />
                 <span>{displayUserName}</span>
              </button>
              {isProfileOpen && (
              <div className="performanceProfileMenu">
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
                  }}>
                  
                      Pilih Anak
                    </button>)
                }
                   <button type="button" onClick={logout}>Logout</button>
                </div>)
              }
            </div>
          </div>
        </div>
      </header>

       <main className="performanceMain">
         <div className="performanceContainer">
           <section className="performanceCard performanceIdentity">
             <div className="performanceChildPhoto">
            <img src={profilePhoto} alt="Anak" />
            </div>
             <div>
               <h1>{displayUserName}</h1>
               <p>{childCategoryLabel}</p>
            </div>
          </section>

           <section className="performanceGridTwo">
             <article
              className="performanceCard performancePanel"
              onClick={() => setSelectedMonth(null)}>
              
               <div className="performanceHeader">
                 <h2>Grafik Performa Latihan</h2>
                 <div className="performanceFilters" onClick={(event) => event.stopPropagation()}>
                   <label className="performanceYearWrap">
                     <span>Tahun</span>
                     <GreenSelect
                      value={effectiveSelectedYear}
                      onChange={(nextYear) => {
                        setSelectedYear(nextYear); 
                        setSelectedMonth(null); 
                        setMotionKey((prev) => prev + 1);
                      }}
                      ariaLabel="Pilih tahun performa"
                      className="performanceYearGreenSelect"
                      options={availableYears} />
                    
                  </label>
                </div>
              </div>
              {isActive ? (
              <div
                className="performanceBars"
                key={`${effectiveSelectedYear}-${selectedMonth}-${motionKey}`}
                onClick={() => setSelectedMonth(null)}>
                
                  {chartData.map((value, index) => {
                  const month = perfMonthOptions[index]; 
                  const isSelected = month.value === selectedMonth; 
                  const hasSelection = selectedMonth !== null; 
                  return (
                    <div
                      className={`performanceBarItem ${hasSelection ? isSelected ? "is-focus" : "is-dim" : "is-all"}`}
                      key={`${month.label}-${effectiveSelectedYear}`}
                      onClick={(event) => {
                        event.stopPropagation(); 
                        setSelectedMonth((prev) => prev === month.value ? null : month.value);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault(); 
                          setSelectedMonth((prev) => prev === month.value ? null : month.value);
                        }
                      }}>
                      
                         <span className={`performanceBarValue ${!hasSelection || isSelected ? "is-selected" : ""}`}>
                          {value > 0 ? value : "-"}
                        </span>
                         <span
                        className={`performanceBar ${index % 2 === 0 ? "primary" : "accent"}`}
                        style={{ height: `${value}%`, animationDelay: `${0.05 + index * 0.04}s` }} />
                      
                         <small>{month.label}</small>
                      </div>);

                })}
                </div>) : (

              <div className="performanceLocked">
                   <p>Fitur performa latihan terkunci. Status masih nonaktif.</p>
                </div>)
              }
            </article>

             <article className="performanceCard performancePanel">
               <h2>Catatan Pelatih</h2>
              {isActive ?
              coachNotes.length > 0 ? (
              <div className="performanceCoachNoteList">
                    {coachNotes.map((note, idx) => (
                <article className="performanceCoachNote" key={`${note.id || note.date}-${idx}`}>
                         <img src={CoachNoteIcon} alt="" className="performanceCoachIcon" />
                         <div>
                           <h3>{note.note || note.text}</h3>
                           <time>{note.date}</time>
                           <p>Posted by {note.coach || note.by}</p>
                        </div>
                      </article>)
                )}
                  </div>) : (

              <div className="performanceLocked">
                     <p>Belum ada catatan pelatih untuk siswa ini.</p>
                  </div>) : (


              <div className="performanceLocked">
                   <p>Fitur catatan pelatih terkunci. Status masih nonaktif.</p>
                </div>)
              }
            </article>
          </section>

           <section className="performanceCard performanceTableCard">
             <div className="performanceTableHeader">
               <h3>Performa Per Bulan</h3>
               <label className="performanceYearWrap">
                 <span>Tahun</span>
                 <GreenSelect
                  value={effectiveSelectedYear}
                  onChange={(nextYear) => {
                    setSelectedYear(nextYear); 
                    setSelectedMonth(null); 
                    setMotionKey((prev) => prev + 1);
                  }}
                  ariaLabel="Pilih tahun performa"
                  className="performanceYearGreenSelect"
                  options={availableYears} />
                
              </label>
            </div>
             <div className="performanceTableScroll">
               <table className="performanceTable">
                 <thead>
                   <tr>
                     <th>Waktu</th>
                     <th>Dribbling</th>
                     <th>Passing</th>
                     <th>Shooting</th>
                     <th>Rata-Rata</th>
                     <th>Keterangan</th>
                  </tr>
                </thead>
                 <tbody>
                  {isActive ?
                  scoreRows.map((row) => (
                  <tr key={row.period}>
                         <td>{row.period}</td>
                         <td>{row.dribbling ?? "-"}</td>
                         <td>{row.passing ?? "-"}</td>
                         <td>{row.shooting ?? "-"}</td>
                         <td>{row.average ?? "-"}</td>
                         <td className={row.grade === "A" ? "is-good" : ""}>{row.grade}</td>
                      </tr>)
                  ) : (

                  <tr>
                       <td colSpan={6} className="performanceTableEmpty">
                        Data nilai terkunci. Aktifkan akun untuk melihat detail.
                      </td>
                    </tr>)
                  }
                </tbody>
              </table>
            </div>
            {!isActive && (
            <div className="performanceTableUnlock">
              </div>)
            }
          </section>
        </div>
        
      </main>
    

       <SiteFooter />
      {childPickerModal}
    </div>);

}
