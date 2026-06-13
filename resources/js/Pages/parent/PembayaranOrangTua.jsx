import { useState } from "react";
import "./PembayaranOrangTua.css";
import { parentRoutes, visitOrCall } from "./parentNavigation";
import SiteFooter from "../SiteFooter";

import LogoSBB from "../../../assets/LogoSBB.png";
import ProfileIcon from "../../../assets/Profile.png";
import PaymentIcon from "../../../assets/payment.png";
import LoncengNotifikasiOrangTua from "./LoncengNotifikasiOrangTua";
import useParentChildSwitcher from "./useParentChildSwitcher";

export default function PembayaranOrangTua({
  onLogout,
  onSelectChild,
  onOpenHome,
  onOpenDashboard,
  onOpenAttendance,
  onOpenPerformance,
  onOpenAchievements,
  onOpenCatatanPelatih,
  userName,
  paymentStatus,
  isAccountReady = true,
  notifications = [],
  onClearNotifications,
  canSwitchChild = false,
  childrenOptions = [],
  selectedChildId = null,
  paymentHistory = [],
     studentProfile, // 👈 TAMBAH INI
}) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
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
  const currentMonthLabel = new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const openHome = visitOrCall(onOpenHome, parentRoutes.home);
  const logout = visitOrCall(onLogout, parentRoutes.logout);
  const openProfile = visitOrCall(undefined, parentRoutes.profile);
  const openDashboard = visitOrCall(onOpenDashboard, parentRoutes.dashboard);
  const openAttendance = visitOrCall(onOpenAttendance, parentRoutes.attendance);
  const openPerformance = visitOrCall(onOpenPerformance, parentRoutes.performance);
  const openAchievements = visitOrCall(onOpenAchievements, parentRoutes.achievements);
  const openNotes = visitOrCall(onOpenCatatanPelatih, parentRoutes.notes);

  return (
    <div className="paymentPage">
      <header className="paymentTopbar">
        <div className="paymentTopInner">
          <button type="button" className="paymentLogoBtn" onClick={openHome}>
            <img src={LogoSBB} alt="Logo SSB" />
          </button>
          <nav className="paymentNavLinks">
            <button type="button" onClick={openDashboard}>Dashboard</button>
            <button type="button" onClick={openAttendance}>Kehadiran</button>
            <button type="button" onClick={openPerformance}>Performa Latihan</button>
            <button type="button" onClick={openAchievements}>Prestasi</button>
            <button type="button" onClick={openNotes}>Catatan Pelatih</button>
            <button type="button" className="is-active">Pembayaran</button>
          </nav>
          <div className="paymentNavRight">
            <LoncengNotifikasiOrangTua notifications={notifications} onClearNotifications={onClearNotifications} />
            <div className="paymentProfileWrap">
              <button
                type="button"
                className="paymentProfileBtn"
                onClick={() => setIsProfileOpen((prev) => !prev)}
              >
               <img src={profilePhoto} alt="Profil" />
                <span>{displayUserName}</span>
              </button>
              {isProfileOpen && (
                <div className="paymentProfileMenu">
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

      <main className="paymentMain">
        <div className="paymentContainer">
          <section className="paymentCard">
            <div className="paymentTitleWrap">
              <img src={PaymentIcon} alt="" className="paymentTitleIcon" />
              <h1>Pembayaran</h1>
            </div>

            <article className="paymentInfoBox">
              <h2><span className="paymentInfoDot">i</span> Info</h2>
              <p>
                Iuran bulanan sebesar <strong>Rp100.000</strong> dibayarkan sebelum tanggal 10
                setiap bulannya.
              </p>
              <p>
                Metode pembayaran dilakukan langsung di lapangan saat jadwal latihan.
              </p>
            </article>

            <article className="paymentBillCard">
              <h3>Tagihan</h3>
              <p>
                Tagihan bulan <strong>{currentMonthLabel}</strong> sebesar <strong>Rp100.000</strong>.
                Pembayaran paling lambat tanggal <strong>10</strong> setiap bulannya.
              </p>
            </article>

            <section className="paymentHistoryCard">
              <h3>History Pembayaran</h3>
              {!isAccountReady ? (
                <div className="paymentLocked">
                  <p>Akun belum dibuat admin. Pembayaran akan aktif setelah akun dibuat.</p>
                </div>
              ) : isActive ? (
                <div className="paymentTableWrap">
                  <table className="paymentTable">
                    <thead>
                      <tr>
                        <th>Jenis Pembayaran</th>
                        <th className="paymentStatusHead">Status</th>
                        <th>Waktu Pembayaran</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentHistory.length > 0 ? paymentHistory.map((item) => (
                        <tr key={item.id}>
                          <td>{item.type}</td>
                          <td className="paymentStatusCell">
                            <span className={`paymentStatusBadge ${item.status === "Lunas" ? "is-paid" : "is-unpaid"}`}>
                              {item.status}
                            </span>
                          </td>
                          <td>{item.date}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={3}>Belum ada riwayat pembayaran.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="paymentLocked">
                  <p>Status pembayaran masih nonaktif. Silakan bayar langsung di lapangan saat latihan.</p>
                </div>
              )}
            </section>
          </section>
        </div>
      </main>

      <SiteFooter />
      {childPickerModal}
    </div>
  );
}



