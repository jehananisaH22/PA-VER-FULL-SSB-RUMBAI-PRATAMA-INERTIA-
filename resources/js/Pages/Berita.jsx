import React, { useEffect, useRef, useState } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import "../../css/Berita.css";

import LogoSBB from "../../assets/LogoSBB.png";
import NotifIcon from "../../assets/notif.png";
import ProfileIcon from "../../assets/Profile.png";
import SiteFooter from "./SiteFooter";
import { resolveArticles } from "../data/defaultArticles";

export default function Berita({
  mode = "list",
  articles = [],
  selectedArticle,
  onOpenHome,
  onOpenLogin,
  onOpenProfile,
  onOpenGaleri,
  onOpenList,
  onOpenDetail,
  notifications = [],
  onClearNotifications,
  onLogout,
}) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotifMenuOpen, setIsNotifMenuOpen] = useState(false);
  const [activeArticleId, setActiveArticleId] = useState(null);
  const profileMenuRef = useRef(null);
  const notifMenuRef = useRef(null);
  const listItems = resolveArticles(articles);
  const resolvedSelectedArticle = selectedArticle ? resolveArticles([selectedArticle])[0] : null;
  const currentMode = activeArticleId ? "detail" : mode;
  const currentArticle =
    resolvedSelectedArticle || listItems.find((item) => Number(item.id) === Number(activeArticleId));
  const openHome = () => (onOpenHome ? onOpenHome() : router.visit("/"));
  const openLogin = () => (onOpenLogin ? onOpenLogin() : router.visit("/login"));
  const openGaleri = () => (onOpenGaleri ? onOpenGaleri() : router.visit("/galeri"));
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
  const openList = () => {
    setActiveArticleId(null);
    if (onOpenList) onOpenList();
  };
  const openDetail = (articleId) => {
    if (onOpenDetail) {
      onOpenDetail(articleId);
      return;
    }

    setActiveArticleId(articleId);
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

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [currentMode, currentArticle?.id]);

  const renderList = () => (
    <main className="beritaMain">
      <div className="beritaContainer">
        <h1 className="beritaTitle">Berita</h1>

        {listItems.length > 0 ? (
          <section className="beritaGrid">
            {listItems.map((item) => (
              <article key={item.id} className="beritaCard">
                <div className="beritaCardImg">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.title}
                      onError={(event) => {
                        if (event.currentTarget.src !== item.fallbackImage) {
                          event.currentTarget.src = item.fallbackImage;
                        }
                      }}
                    />
                  ) : null}
                  <button
                    className="beritaNextBtn"
                    type="button"
                    aria-label="Baca berita"
                    onClick={() => openDetail(item.id)}
                  />
                </div>

                <div className="beritaCardBody">
                  <div className="beritaCardDate">{item.dateLabel}</div>
                  <h3>{item.title}</h3>
                  <p>{item.excerpt}</p>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <div className="beritaEmptyState">Belum ada berita yang dipublikasikan.</div>
        )}
      </div>
    </main>
  );

  const renderDetail = () => {
    const article = currentArticle || listItems[0];
    const paragraphs = String(article?.body || "")
      .split(/\n+/)
      .map((item) => item.trim())
      .filter(Boolean);
    const players = article?.players || [];

    if (!article) {
      return (
        <main className="beritaMain">
          <div className="beritaContainer">
            <h1 className="beritaTitle">Berita</h1>
            <div className="beritaEmptyState">Detail berita belum tersedia.</div>
          </div>
        </main>
      );
    }

    return (
      <main className="beritaMain">
        <div className="beritaContainer">
          <h1 className="beritaTitle">Berita</h1>

          <article className="beritaDetailCard">
            {article.image ? (
              <img
                className="beritaDetailHero"
                src={article.image}
                alt={article.title}
                onError={(event) => {
                  if (event.currentTarget.src !== article.fallbackImage) {
                    event.currentTarget.src = article.fallbackImage;
                  }
                }}
              />
            ) : null}

            <div className="beritaDetailBody">
              <div className="beritaDate">{article.dateLabel}</div>
              <h2>{article.title}</h2>
              <div className="beritaRichText">
                {(paragraphs.length > 0 ? paragraphs : [article.excerpt]).map((paragraph, index) => (
                  <p key={`${article.id}-paragraph-${index}`}>{paragraph}</p>
                ))}
              </div>
            </div>
          </article>

          {players.length > 0 && (
            <section className="pemainSection">
              <h3>Pemain</h3>
              <div className="pemainGrid">
                {players.map((player) => (
                  <div className="pemainCard" key={player.id}>
                    <div className="pemainAvatarWrap">
                      <img src={ProfileIcon} alt={player.name} className="pemainAvatar" />
                    </div>
                    <div className="pemainName">{player.name}</div>
                    <small>{player.category}</small>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    );
  };

  return (
    <>
    <Head title={currentMode === "detail" ? currentArticle?.title || "Berita" : "Berita"} />
    <div className="beritaPage">
      <header className="beritaNavWrap">
        <div className="beritaContainer beritaNav">
          <img className="beritaNavLogo" src={LogoSBB} alt="Logo" />

          <div className="beritaNavLinks">
            <button type="button" onClick={openHome}>
              Beranda
            </button>
            <button type="button" onClick={openDaftar}>
              Daftar
            </button>
            <button type="button" onClick={openList}>
              Berita
            </button>
            <button type="button" onClick={openGaleri}>
              Galeri
            </button>
          </div>

          <div className="beritaNavRight">
            <div className="beritaNotifWrap" ref={notifMenuRef}>
              <button
                className="beritaNavIconBtn"
                type="button"
                aria-label="Notif"
                onClick={() => setIsNotifMenuOpen((prev) => !prev)}
              >
                <img src={NotifIcon} alt="Notif" />
                {isLoggedIn && notifications.length > 0 && <span className="beritaNotifBadge" />}
              </button>
              {isNotifMenuOpen && (
                <div className="beritaNotifMenu">
                  {isLoggedIn && notifications.length > 0 ? (
                    <>
                      <ul className="beritaNotifList">
                        {notifications.map((item) => (
                          <li key={item.id} className="beritaNotifItem">
                            {item.text}
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        className="beritaNotifClearBtn"
                        onClick={() => {
                          if (onClearNotifications) onClearNotifications();
                          setIsNotifMenuOpen(false);
                        }}
                      >
                        Tandai sudah dibaca
                      </button>
                    </>
                  ) : (
                    <p className="beritaNotifEmpty">No notifications</p>
                  )}
                </div>
              )}
            </div>
            <div className="beritaProfileWrap" ref={profileMenuRef}>
              <button
                className="beritaNavIconBtn"
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
                <div className="beritaProfileMenu">
                  {isLoggedIn ? (
                    <>
                      <div className="beritaRoleInfo">Login sebagai: {userRole}</div>
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

      {currentMode === "detail" ? renderDetail() : renderList()}

      <SiteFooter />
    </div>
    </>
  );
}