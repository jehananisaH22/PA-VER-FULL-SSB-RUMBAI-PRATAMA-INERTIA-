import { useEffect, useRef, useState } from "react";
import { usePage,Head, router } from "@inertiajs/react";
import "../../css/Galeri.css";

import LogoSBB from "../../assets/LogoSBB.png";
import NotifIcon from "../../assets/notif.png";
import ProfileIcon from "../../assets/Profile.png";
import BackIcon from "../../assets/Back.png";
import NextIcon from "../../assets/Next.png";

import Galeri1 from "../../assets/Galeri1.png";
import Galeri2 from "../../assets/Galeri2.png";
import Galeri3 from "../../assets/Galeri3.png";
import Galeri4 from "../../assets/Galeri4.png";
import Galeri5 from "../../assets/Galeri5.png";
import Galeri6 from "../../assets/Galeri6.png";
import Berita1 from "../../assets/Berita1.png";
import Berita2 from "../../assets/Berita2.png";

import SiteFooter from "./SiteFooter";

export default function Galeri({
  galleryItems = [],
  onOpenHome,
  onOpenBerita,
  onOpenLogin,
  onOpenProfile,
  notifications = [],
  onClearNotifications,
  onLogout,
}) {
  const fallbackImages = [Galeri1, Galeri2, Galeri3, Galeri4, Galeri5, Galeri6, Berita1, Berita2];
  const images =
    Array.isArray(galleryItems) && galleryItems.length > 0
      ? galleryItems.map((item, index) => ({
          src: item.image || fallbackImages[index % fallbackImages.length],
          title: item.title || `Galeri ${index + 1}`,
          fallback: fallbackImages[index % fallbackImages.length],
        }))
      : fallbackImages.map((src, index) => ({
          src,
          title: `Galeri ${index + 1}`,
          fallback: src,
        }));
  const [activeIndex, setActiveIndex] = useState(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotifMenuOpen, setIsNotifMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const notifMenuRef = useRef(null);
  const openHome = () => (onOpenHome ? onOpenHome() : router.visit("/"));
  const openBerita = () => (onOpenBerita ? onOpenBerita() : router.visit("/berita"));
  const openLogin = () => (onOpenLogin ? onOpenLogin() : router.visit("/login"));
  const openProfile = () => {
    if (onOpenProfile) {
      onOpenProfile();
      return;
    }

    router.visit("/login");
  };
  const { auth } = usePage().props;
 const user = auth?.user;
 const isLoggedIn = !!user;
 const userRole = user?.role;
 
 console.log(auth);
 console.log(auth?.user);
 
 const openDaftar = (event) => {
   event.preventDefault();
 
   if (user) {
     router.visit("/orang-tua/daftar-anak");
   } else {
     router.visit("/register");
   }
 };

  useEffect(() => {
    const onKeyDown = (event) => {
      if (activeIndex === null) return;
      if (event.key === "Escape") setActiveIndex(null);
      if (event.key === "ArrowRight") {
        setActiveIndex((prev) => ((prev ?? 0) + 1) % images.length);
      }
      if (event.key === "ArrowLeft") {
        setActiveIndex((prev) => ((prev ?? 0) - 1 + images.length) % images.length);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, images.length]);

  useEffect(() => {
    document.body.style.overflow = activeIndex !== null ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [activeIndex]);

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

  const openPrev = () => {
    setActiveIndex((prev) => ((prev ?? 0) - 1 + images.length) % images.length);
  };

  const openNext = () => {
    setActiveIndex((prev) => ((prev ?? 0) + 1) % images.length);
  };

  return (
    <>
    <Head title="Galeri" />
    <div className="galeriPage">
      <header className="galeriNavWrap">
        <div className="galeriContainer galeriNav">
          <img className="galeriNavLogo" src={LogoSBB} alt="Logo" />

          <div className="galeriNavLinks">
            <button type="button" onClick={openHome}>
              Beranda
            </button>
            <button type="button" onClick={openDaftar}>
              Daftar
            </button>
            <button type="button" onClick={openBerita}>
              Berita
            </button>
            <button type="button" className="active">
              Galeri
            </button>
          </div>

          <div className="galeriNavRight">
            <div className="galeriNotifWrap" ref={notifMenuRef}>
              <button
                className="galeriNavIconBtn"
                type="button"
                aria-label="Notif"
                onClick={() => setIsNotifMenuOpen((prev) => !prev)}
              >
                <img src={NotifIcon} alt="Notif" />
                {isLoggedIn && notifications.length > 0 && <span className="galeriNotifBadge" />}
              </button>
              {isNotifMenuOpen && (
                <div className="galeriNotifMenu">
                  {isLoggedIn && notifications.length > 0 ? (
                    <>
                      <ul className="galeriNotifList">
                        {notifications.map((item) => (
                          <li key={item.id} className="galeriNotifItem">
                            {item.text}
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        className="galeriNotifClearBtn"
                        onClick={() => {
                          if (onClearNotifications) onClearNotifications();
                          setIsNotifMenuOpen(false);
                        }}
                      >
                        Tandai sudah dibaca
                      </button>
                    </>
                  ) : (
                    <p className="galeriNotifEmpty">No notifications</p>
                  )}
                </div>
              )}
            </div>
            <div className="galeriProfileWrap" ref={profileMenuRef}>
              <button
                className="galeriNavIconBtn"
                type="button"
                aria-label="Profile"
                onClick={() => {
                  setIsNotifMenuOpen(false);
                  setIsProfileMenuOpen((prev) => !prev);
                }}
              >
                <img src={ProfileIcon} alt="Profile" />
              </button>
              {isProfileMenuOpen && (
                <div className="galeriProfileMenu">
                  {isLoggedIn ? (
                    <>
                      <div className="galeriRoleInfo">Login sebagai: {userRole}</div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          openProfile();
                        }}
                      >
                        Profil
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleLogout();
                        }}
                      >
                        Logout
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        openLogin();
                      }}
                    >
                      Login
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="galeriMain">
        <div className="galeriContainer">
          <h1 className="galeriTitle">Galeri</h1>

          <section className="galeriGrid">
            {images.map((src, index) => (
              <button
                key={`${src.src}-${index}`}
                className="galeriCard"
                type="button"
                onClick={() => setActiveIndex(index)}
              >
                <img
                  src={src.src}
                  alt={src.title}
                  onError={(event) => {
                    if (event.currentTarget.src !== src.fallback) {
                      event.currentTarget.src = src.fallback;
                    }
                  }}
                />
              </button>
            ))}
          </section>
        </div>
      </main>

      {activeIndex !== null && (
        <div className="galeriOverlay" onClick={() => setActiveIndex(null)}>
          <button
            className="galeriArrow left"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openPrev();
            }}
            aria-label="Sebelumnya"
          >
            <img src={BackIcon} alt="" />
          </button>
          <div className="galeriPreview" onClick={(event) => event.stopPropagation()}>
            <img
              src={images[activeIndex].src}
              alt={images[activeIndex].title}
              onError={(event) => {
                if (event.currentTarget.src !== images[activeIndex].fallback) {
                  event.currentTarget.src = images[activeIndex].fallback;
                }
              }}
            />
          </div>
          <button
            className="galeriArrow right"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openNext();
            }}
            aria-label="Berikutnya"
          >
            <img src={NextIcon} alt="" />
          </button>
        </div>
      )}

      <SiteFooter />
    </div>
    </>
  );
}


