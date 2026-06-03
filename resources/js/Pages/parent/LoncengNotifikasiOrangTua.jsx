import { useEffect, useRef, useState } from "react";
import NotifIcon from "../../../assets/notif.png";
import "./LoncengNotifikasiOrangTua.css";

export default function LoncengNotifikasiOrangTua({ notifications = [], onClearNotifications }) {
  const [isOpen, setIsOpen] = useState(false);
  const notifRef = useRef(null);
  const notifCount = notifications.filter((item) => !item.read).length;
  const hasNotifications = notifications.length > 0;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="parentNotifWrap" ref={notifRef}>
      <button
        type="button"
        className="parentNotifBtn"
        aria-label="Notif"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <img src={NotifIcon} alt="" />
        {notifCount > 0 && (
          <span className="parentNotifBadge">{notifCount > 99 ? "99+" : notifCount}</span>
        )}
      </button>
      {isOpen && (
        <div className="parentNotifMenu">
          {hasNotifications ? (
            <>
              <ul className="parentNotifList">
                {notifications.map((item) => (
                  <li
                    key={item.id}
                    className={`parentNotifItem ${!item.read ? "isUnread" : "isRead"}`}
                  >
                    <span className="parentNotifItemDot" aria-hidden="true" />
                    <span className="parentNotifItemText">{item.text}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="parentNotifClearBtn"
                disabled={notifCount === 0}
                onClick={() => {
                  if (onClearNotifications) onClearNotifications();
                  setIsOpen(false);
                }}
              >
                Tandai sudah dibaca
              </button>
            </>
          ) : (
            <p className="parentNotifEmpty">Tidak ada notifikasi</p>
          )}
        </div>
      )}
    </div>
  );
}

