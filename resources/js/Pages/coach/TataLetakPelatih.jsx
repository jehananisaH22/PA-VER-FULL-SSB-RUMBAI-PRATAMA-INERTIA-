import { useState } from "react"; 
import "./TataLetakPelatih.css"; 
import { coachRoutes, visitOrCall } from "./coachNavigation"; 
import SiteFooter from "../SiteFooter"; 

import LogoSBB from "../../../assets/LogoSBB.png"; 
import ProfileIcon from "../../../assets/Profile.png"; 
import LoncengNotifikasiOrangTua from "../parent/LoncengNotifikasiOrangTua"; 

const navItems = [
{ key: "dashboard", label: "Dashboard", prop: "onOpenDashboard" },
{ key: "attendance", label: "Kehadiran", prop: "onOpenAttendance" },
{ key: "performance", label: "Performa Latihan", prop: "onOpenPerformance" },
{ key: "notes", label: "Catatan Pelatih", prop: "onOpenCatatanPelatih" },
{ key: "payments", label: "Pembayaran", prop: "onOpenPayments" }]; 


export default function TataLetakPelatih({ 
  activeTab, 
  title, 
  showTitle = true, 
  onOpenHome, 
  onLogout, 
  onClearNotifications, 
  notifications = [], 
  userName = "Pelatih", 
  children,
  ...navHandlers
}) {
  const [isProfileOpen, setIsProfileOpen] = useState(false); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); 
  const openHome = visitOrCall(onOpenHome, coachRoutes.home); 
  const openProfile = visitOrCall(undefined, coachRoutes.profile); 
  const logout = visitOrCall(onLogout, coachRoutes.logout); 
  const resolvedNavHandlers = { 
    onOpenDashboard: visitOrCall(navHandlers.onOpenDashboard, coachRoutes.dashboard), 
    onOpenAttendance: visitOrCall(navHandlers.onOpenAttendance, coachRoutes.attendance), 
    onOpenPerformance: visitOrCall(navHandlers.onOpenPerformance, coachRoutes.performance), 
    onOpenCatatanPelatih: visitOrCall(navHandlers.onOpenCatatanPelatih, coachRoutes.notes), 
    onOpenPayments: visitOrCall(navHandlers.onOpenPayments, coachRoutes.payments)
  }; 
  const handleNavClick = (handler) => {
    setIsMobileMenuOpen(false); 
    handler();
  }; 

  return (
    <div className="coachPage">
       <header className="coachTopbar">
         <div className="coachTopInner">
           <button type="button" className="coachLogoBtn" onClick={openHome}>
             <img src={LogoSBB} alt="Logo SSB" />
          </button>
           <nav className="coachNavLinks">
            {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={activeTab === item.key ? "is-active" : ""}
              onClick={resolvedNavHandlers[item.prop]}>
              
                {item.label}
              </button>)
            )}
          </nav>
           <button
            type="button"
            className={`coachMobileMenuBtn ${isMobileMenuOpen ? "is-open" : ""}`}
            aria-label="Buka menu"
            aria-expanded={isMobileMenuOpen}
            aria-controls="coach-mobile-menu"
            onClick={() => {
              setIsProfileOpen(false); 
              setIsMobileMenuOpen((prev) => !prev);
            }}>
            
             <span />
             <span />
             <span />
          </button>
           <div className="coachNavRight">
             <LoncengNotifikasiOrangTua notifications={notifications} onClearNotifications={onClearNotifications} />
             <div className="coachProfileWrap">
               <button
                type="button"
                className="coachProfileBtn"
                onClick={() => setIsProfileOpen((prev) => !prev)}>
                
                 <img src={ProfileIcon} alt="" />
                 <span>{userName}</span>
              </button>
              {isProfileOpen && (
              <div className="coachProfileMenu">
                   <button type="button" onClick={openProfile}>Profil</button>
                   <button type="button" onClick={logout}>Logout</button>
                </div>)
              }
            </div>
          </div>
        </div>
        {isMobileMenuOpen && (
        <nav className="coachMobileMenu" id="coach-mobile-menu">
            {navItems.map((item) => (
          <button
            key={item.key}
            type="button"
            className={activeTab === item.key ? "is-active" : ""}
            onClick={() => handleNavClick(resolvedNavHandlers[item.prop])}>
            
              {item.label}
            </button>)
          )}
          </nav>)
        }
      </header>

       <main className="coachMain">
         <div className="coachContainer">
          {showTitle && (
          <section className="coachCard coachHeading">
               <h1>{title}</h1>
            </section>)
          }
           <div className="coachContentFlow">{children}</div>
        </div>
      </main>

       <div className="coachFooterWrap">
         <SiteFooter />
      </div>
    </div>);

}
