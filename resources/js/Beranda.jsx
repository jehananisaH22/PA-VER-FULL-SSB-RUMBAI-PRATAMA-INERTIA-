import React, { useEffect, useRef, useState } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import "../css/Beranda.css";

import FotoBeranda from "../assets/FotoLanding.png";
import LogoSBB from "../assets/LogoSBB.png";

import SekapurSirih from "../assets/SekapurSirih.png";
import BgSekapur from "../assets/Bg_sekapur_.png";

import Galeri1 from "../assets/Galeri1.png";
import Galeri2 from "../assets/Galeri2.png";
import Galeri3 from "../assets/Galeri3.png";
import Galeri4 from "../assets/Galeri4.png";
import Galeri5 from "../assets/Galeri5.png";
import Galeri6 from "../assets/Galeri6.png";

import FacebookIcon from "../assets/Facebook.png";
import InstagramIcon from "../assets/Instagram.png";
import GoogleMapsIcon from "../assets/Mapsgoogle.png";

import NotifIcon from "../assets/notif.png";
import ProfileIcon from "../assets/Profile.png";
import NextIcon from "../assets/Next.png";
import NextPageIcon from "../assets/NextPage.png";
import SiteFooter from "./Pages/SiteFooter";
import { resolveArticles } from "./data/defaultArticles";

export default function Beranda({
  articles = [],
  galleryItems = [],
  onOpenLogin,
  onOpenProfile,
  onOpenBeritaList,
  onOpenBeritaDetail,
  onOpenGaleri,
  notifications = [],
  onClearNotifications,
  onLogout,
}) {
  const fallbackGalleryImages = [Galeri1, Galeri2, Galeri3, Galeri4, Galeri5, Galeri6];
  const galeriImages =
    Array.isArray(galleryItems) && galleryItems.length > 0
      ? galleryItems.map((item, index) => ({
          src: item.image || fallbackGalleryImages[index % fallbackGalleryImages.length],
          title: item.title || `Galeri ${index + 1}`,
          fallback: fallbackGalleryImages[index % fallbackGalleryImages.length],
        }))
      : fallbackGalleryImages.map((src, index) => ({
          src,
          title: `Galeri ${index + 1}`,
          fallback: src,
        }));
  const featuredArticles = resolveArticles(articles).slice(0, 2);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotifMenuOpen, setIsNotifMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const notifMenuRef = useRef(null);


const page = usePage();

const user = page.props?.auth?.user ?? null;
const isLoggedIn = !!user;
const userRole = user?.role;

console.log("AUTH:", page.props.auth);
console.log("USER:", page.props.auth?.user);

const openDaftar = () => {
  const user = page.props?.auth?.user;

  console.log("CLICK USER:", user);

  router.visit(
    user ? "/orang-tua/daftar-anak" : "/register",
    {
      replace: true,
      preserveState: false,
    }
  );
};


  const openLogin = (event) => {
    event.preventDefault();
    setIsProfileMenuOpen(false);
    setIsNotifMenuOpen(false);
    if (onOpenLogin) {
      onOpenLogin();
      return;
    }
    router.visit("/login");
  };


const handleLogout = () => {
  router.post("/logout");
};

   
  const openBeritaList = (event) => {
    event.preventDefault();
    if (onOpenBeritaList) {
      onOpenBeritaList();
      return;
    }
    router.visit("/berita");
  };
  const openBeritaDetail = (event, id) => {
    event.preventDefault();
    if (onOpenBeritaDetail) {
      onOpenBeritaDetail(id);
      return;
    }
    router.visit("/berita");
  };
  const openGaleriPage = (event) => {
    event.preventDefault();
    if (onOpenGaleri) {
      onOpenGaleri();
      return;
    }
    router.visit("/galeri");
  };
  const smoothScrollTo = (selector, duration = 900) => {
    const target = document.querySelector(selector);
    if (!target) return;

    const startY = window.scrollY;
    const targetY = target.getBoundingClientRect().top + window.scrollY;
    const distance = targetY - startY;
    let startTime = null;

    const easeInOutCubic = (t) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const step = (time) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / duration, 1);
      const eased = easeInOutCubic(progress);
      window.scrollTo(0, startY + distance * eased);
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };
  const handleSectionScroll = (event, selector) => {
    event.preventDefault();
    smoothScrollTo(selector, 950);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target)) {
        setIsNotifMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="page">
      {/* NAV */}
      <div className="navWrap">
        <div className="container nav">
          <img className="navLogo" src={LogoSBB} alt="Logo" />

          <div className="navLinks">
            <a href="/" onClick={(event) => handleSectionScroll(event, "#beranda")}>
              Beranda
            </a>
           <a
  href="#"
  onClick={(e) => {
    e.preventDefault();
    openDaftar();
  }}
>
  Daftar
</a>
            <a href="/berita" onClick={openBeritaList}>
              Berita
            </a>
            <a href="/galeri" onClick={openGaleriPage}>
              Galeri
            </a>
          </div>

          <div className="navRight">
            <div className="navNotifWrap" ref={notifMenuRef}>
              <button
                className="navIconBtn"
                type="button"
                aria-label="Notif"
                onClick={() => setIsNotifMenuOpen((prev) => !prev)}
              >
                <img src={NotifIcon} alt="Notif" />
                {isLoggedIn && notifications.length > 0 && <span className="navNotifBadge" />}
              </button>
              {isNotifMenuOpen && (
                <div className="navNotifMenu">
                  {isLoggedIn && notifications.length > 0 ? (
                    <>
                      <ul className="navNotifList">
                        {notifications.map((item) => (
                          <li key={item.id} className="navNotifItem">
                            {item.text}
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        className="navNotifClearBtn"
                        onClick={() => {
                          if (onClearNotifications) onClearNotifications();
                          setIsNotifMenuOpen(false);
                        }}
                      >
                        Tandai sudah dibaca
                      </button>
                    </>
                  ) : (
                    <p className="navNotifEmpty">No notifications</p>
                  )}
                </div>
              )}
            </div>
          <div className="navProfileWrap" ref={profileMenuRef}>
<div className="profileWrapper">
  <button
    className="navIconBtn"
    type="button"
    aria-label="Profile"
    onClick={() => {
      setIsNotifMenuOpen(false);
      setIsProfileMenuOpen((prev) => !prev);
    }}
  >
    <img src={ProfileIcon} alt="Profile" />

    {user && (
      <span className="userName">
        {user.name}
      </span>
    )}
  </button>
</div>


  {isProfileMenuOpen && (
    <div className="navProfileMenu">
      {user ? (
        <>
          <div className="navRoleInfo">
            Login sebagai: {user.role}
          </div>

          <button
            type="button"
            onClick={() => {
              setIsProfileMenuOpen(false);
              onOpenProfile?.();
            }}
          >
            Profil
          </button>

          <button
            type="button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </>
      ) : (
        <button type="button" onClick={openLogin}>
          Login
        </button>
      )}
    </div>
  )}
</div>

          </div>
        </div>
      </div>

      {/* HERO */}
      <section id="beranda" className="hero">
        <div className="heroBg" style={{ backgroundImage: `url(${FotoBeranda})` }} />
        <div className="heroOverlay" />

        <div className="container heroContent">
          <div className="heroText">
            <h1>
              Sekolah Sepak Bola Rumbai
              <br />
              Pratama
            </h1>

            <p className="heroWelcome">Selamat Datang di Website SSB Rumbai Pratama</p>

            <p className="heroDesc">
              Kami adalah wadah pembinaan generasi muda melalui pelatihan sepak bola yang
              profesional, disiplin, dan penuh semangat. Bergabunglah bersama kami untuk
              membentuk karakter, keterampilan, dan sportivitas yang unggul di lapangan hijau.
            </p>
          </div>

          <button type="button" className="btnHero" onClick={openDaftar}>
  <span className="btnHeroText">Daftar Sekarang</span>
  <img className="btnHeroIcon" src={NextPageIcon} alt="" />
</button>
        </div>
      </section>

      {/* JADWAL */}
      <section className="scheduleSection">
        <div className="container scheduleWrap">
          <div className="scheduleCard">
            <div className="scheduleLeft">
              <h2>Jadwal Latihan</h2>
            </div>

            <div className="scheduleSlash" />

            <div className="scheduleRight">
              <ul>
                <li>
                  <span className="dot" />
                  <span className="scheduleLine">
                    <b>Minggu</b> (07.15-09.30 WIB) | Lapangan Mesjid Da'wah Rumbai Pesisir
                  </span>
                </li>
                <li>
                  <span className="dot" />
                  <span className="scheduleLine">
                    <b>Rabu</b> (16.25-17.55 WIB) | Lapangan Mesjid Da'wah Rumbai Pesisir
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* HUBUNGI */}
      <section className="section contactSection" id="daftar">
        <div className="container">
          <h3 className="sectionTitle">Hubungi Kami</h3>

          <div className="contactGrid">
            <div className="contactCard">
              <div className="iconBox">
                <img className="contactIcon facebook" src={FacebookIcon} alt="Facebook" />
              </div>
              <h4>Facebook</h4>
              <p className="muted">
                Dapatkan informasi kegiatan dan pengumuman terbaru dari SSB Rumbai Pratama.
              </p>
              <a
                className="btnSmall"
                href="https://www.facebook.com/people/Ssb-Rumbai-Pratama/61561943810405/#"
                target="_blank"
                rel="noopener noreferrer"
              >
                Kunjungi Facebook
              </a>
            </div>

            <div className="contactCard">
              <div className="iconBox">
                <img className="contactIcon instagram" src={InstagramIcon} alt="Instagram" />
              </div>
              <h4>Instagram</h4>
              <p className="muted">Foto-foto latihan, momen bertanding, dan kegiatan seru lainnya.</p>
              <a
                className="btnSmall"
                href="https://www.instagram.com/ssbrumbaipratama/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Kunjungi Instagram
              </a>
            </div>

            <div className="contactCard">
              <div className="iconBox">
                <img className="contactIcon maps" src={GoogleMapsIcon} alt="Google Maps" />
              </div>
              <h4>Google Maps</h4>
              <p className="muted">Lihat lokasi lapangan SSB Rumbai Pratama secara langsung di Maps.</p>
              <a
                className="btnSmall"
                href="https://share.google/PLgF6iGHwSpxlFOV3"
                target="_blank"
                rel="noopener noreferrer"
              >
                Buka Maps
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* SEKAPUR SIRIH */}
      <section className="section aboutSection">
        <div className="container about">
          <div className="aboutMedia">
            <img className="aboutBg" src={BgSekapur} alt="Bg Sekapur" />
            <img className="aboutFg" src={SekapurSirih} alt="Sekapur Sirih" />
          </div>

          <div className="aboutText">
            <h3>Sekapur Sirih</h3>
            <p className="muted">
              Sekolah Sepak Bola (SSB) Rumbai Pratama merupakan sebuah organisasi olahraga
              yang didirikan di wilayah Kecamatan Rumbai Pesisir, Pekanbaru. SSB ini dibentuk
              sebagai wadah pembinaan sepak bola bagi anak-anak dan remaja dengan tujuan
              mengembangkan bakat, meningkatkan prestasi, serta menanamkan nilai-nilai
              kebersamaan, persaudaraan, dan sportivitas.
            </p>
            <p className="muted">
              Sejak berdiri, SSB Rumbai Pratama berfokus pada pembinaan pemain secara
              profesional dan terarah, serta berperan dalam meningkatkan minat dan kualitas
              olahraga sepak bola di lingkungan masyarakat, khususnya di daerah Rumbai.
            </p>
          </div>
        </div>
      </section>

      {/* BERITA */}
      <section id="berita" className="section newsSection">
        <div className="container">
          <h3 className="sectionTitle">Berita</h3>

          <div className="newsGrid">
            {featuredArticles.length > 0 ? (
              featuredArticles.map((article) => (
                <div key={article.id} className="newsCard">
                  <div className="newsImg">
                    <img
                      src={article.image}
                      alt={article.title}
                      onError={(event) => {
                        if (event.currentTarget.src !== article.fallbackImage) {
                          event.currentTarget.src = article.fallbackImage;
                        }
                      }}
                    />
                    <button
                      className="newsNextBtn"
                      type="button"
                      aria-label="Baca berita"
                      onClick={(event) => openBeritaDetail(event, article.id)}
                    >
                      <img src={NextIcon} alt="" />
                    </button>
                  </div>
                  <div className="newsBody">
                    <small className="newsDate">{article.dateLabel}</small>
                    <h4>{article.title}</h4>
                    <p className="muted">{article.excerpt}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="newsEmptyCard">Belum ada berita yang dipublikasikan.</div>
            )}
          </div>

          <div className="center mt40">
            <a className="btnPill" href="/berita" onClick={openBeritaList}>
              Lihat Berita
            </a>
          </div>
        </div>
      </section>

      {/* GALERI */}
      <section id="galeri" className="section gallerySection">
        <div className="container">
          <h3 className="sectionTitle">Galeri</h3>

          <div className="galleryGrid">
            {galeriImages.slice(0, 6).map((item, idx) => (
              <div
                key={idx}
                className="galleryItem hoverItem"
                style={{ "--hover-img": `url(${item.src})` }}
              >
                <img
                  src={item.src}
                  alt={item.title}
                  onError={(event) => {
                    if (event.currentTarget.src !== item.fallback) {
                      event.currentTarget.src = item.fallback;
                    }
                  }}
                />
              </div>
            ))}
          </div>

          <div className="center mt40">
            <a className="btnPill" href="/galeri" onClick={openGaleriPage}>
              Lihat Lebih Banyak
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}



