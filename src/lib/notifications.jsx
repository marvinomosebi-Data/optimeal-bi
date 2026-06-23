import { createContext, useContext, useState, useEffect } from "react";

const NotifCtx = createContext({ notifications: [], unread: 0, markRead: () => {}, markPricesUpdated: () => {} });

const DAYS_28 = 28 * 24 * 60 * 60 * 1000;
const KEY = "optimeal_prices_last_updated";

// Standard menu prices for display in notifications
const STANDARD_PRICES = [
  { name: "Eba",           price: 200 },
  { name: "Amala",         price: 300 },
  { name: "Pounded Yam",   price: 300 },
  { name: "White Rice",    price: 300 },
  { name: "Jollof Rice",   price: 350 },
  { name: "Beans",         price: 300 },
  { name: "Beef",          price: 200 },
  { name: "Big Fish",      price: 400 },
  { name: "Egg",           price: 250 },
  { name: "Fried Plantain",price: 100 },
];

function buildNotifications() {
  const notifs = [];
  let lastUpdate = null;
  let daysSince = null;

  try {
    const stored = localStorage.getItem(KEY);
    if (stored) {
      lastUpdate = new Date(Number(stored));
      daysSince = Math.floor((Date.now() - Number(stored)) / (24 * 60 * 60 * 1000));
    }
  } catch (_) {}

  const needsUpdate = !lastUpdate || (Date.now() - lastUpdate.getTime()) > DAYS_28;

  if (needsUpdate) {
    notifs.push({
      id: "price_update_needed",
      type: "warning",
      title: lastUpdate
        ? `⚠️ Prices not updated in ${daysSince} days`
        : "⚠️ Food prices never updated",
      message: lastUpdate
        ? `Last updated: ${lastUpdate.toLocaleDateString("en-NG")}. Please update food prices in the Admin Portal to keep meal suggestions accurate.`
        : "Food prices have not been set yet. Visit the Admin Portal to enter current cafeteria prices.",
      time: lastUpdate ? `Last updated ${daysSince} days ago` : "Never updated",
      read: false,
    });
  }

  // Always show current standard menu prices as an info notification
  notifs.push({
    id: "current_prices",
    type: "info",
    title: "📋 Current Standard Menu Prices",
    message: STANDARD_PRICES.map(p => `${p.name}: ₦${p.price}`).join(" · "),
    time: lastUpdate
      ? `Updated ${lastUpdate.toLocaleDateString("en-NG")}`
      : "Default prices",
    read: false,
  });

  return notifs;
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState(new Set());

  useEffect(() => {
    setNotifications(buildNotifications());
    const interval = setInterval(() => setNotifications(buildNotifications()), 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const unread = notifications.filter(n => !readIds.has(n.id)).length;

  function markRead() {
    setReadIds(new Set(notifications.map(n => n.id)));
  }

  function markPricesUpdated() {
    try { localStorage.setItem(KEY, String(Date.now())); } catch (_) {}
    setReadIds(new Set());
    setNotifications(buildNotifications());
  }

  return (
    <NotifCtx.Provider value={{ notifications, unread, markRead, markPricesUpdated }}>
      {children}
    </NotifCtx.Provider>
  );
}

export const useNotifications = () => useContext(NotifCtx);
