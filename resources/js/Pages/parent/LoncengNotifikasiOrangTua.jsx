import { useEffect, useRef, useState } from "react";
import NotifIcon from "../../../assets/notif.png";
import "./LoncengNotifikasiOrangTua.css";

export default function LoncengNotifikasiOrangTua({ notifications = [], onClearNotifications }) {
  const [isOpen, setIsOpen] = useState(false);
  const [localNotifications, setLocalNotifications] = useState(notifications);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const notifRef = useRef(null);
  const notifCount = localNotifications.filter((item) => !item.read).length;
  const hasNotifications = localNotifications.length > 0;

  useEffect(() => {
    setLocalNotifications(notifications);
  }, [notifications]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAllAsRead = async () => {
    if (isMarkingRead || notifCount === 0) return;

    const unreadIds = localNotifications
      .filter((item) => !item.read && item.id)
      .map((item) => item.id);

    setIsMarkingRead(true);
    setLocalNotifications((prev) => prev.map((item) => ({ ...item, read: true })));

    try {
      if (window.axios && unreadIds.length > 0) {
        await Promise.allSettled(
          unreadIds.map((id) => window.axios.post(`/api/notifikasi/baca/${id}`))
        );
      }

      if (onClearNotifications) {
        onClearNotifications();
      }
    } finally {
      setIsMarkingRead(false);
    }
  };

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
                {localNotifications.map((item) => (
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
                disabled={notifCount === 0 || isMarkingRead}
                onClick={markAllAsRead}
              >
                {isMarkingRead ? "Menandai..." : "Tandai sudah dibaca"}
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

