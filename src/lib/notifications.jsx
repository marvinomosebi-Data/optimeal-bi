import { createContext, useContext, useState, useEffect } from "react";

const NotifCtx = createContext({ notifications: [], unread: 0, markRead: () => {} });

// Check if prices were last updated more than 28 days ago
function getPriceNotifications() {
  const notifs = [];
  try {
    const lastUpdate = localStorage.getItem("optimeal_prices_last_updated");
    const now = Date.now();
    const days28 = 28 * 24 * 60 * 60 * 1000;
    if (!lastUpdate || (now - Number(lastUpdate)) > days28) {
      notifs.push({
        id: "price_update",
        type: "warning",
        title: "Price Update Required",
        message: lastUpdate
          ? `Food prices haven't been updated in over 28 days. Please update them in the Admin Portal.`
          : `Food prices have never been updated. Please update them in the Admin Portal.`,
        time: new Date().toLocaleDateString(),
        read: false,
      });
    }
  } catch (_) {}
  return notifs;
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    setNotifications(getPriceNotifications());
    // re-check every hour
    const interval = setInterval(() => {
      setNotifications(getPriceNotifications());
    }, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const unread = notifications.filter(n => !n.read).length;

  function markRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }

  function markPricesUpdated() {
    try { localStorage.setItem("optimeal_prices_last_updated", String(Date.now())); } catch (_) {}
    setNotifications([]);
  }

  return (
    <NotifCtx.Provider value={{ notifications, unread, markRead, markPricesUpdated }}>
      {children}
    </NotifCtx.Provider>
  );
}

export const useNotifications = () => useContext(NotifCtx);
