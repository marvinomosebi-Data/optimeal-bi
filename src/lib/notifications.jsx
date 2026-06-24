import { createContext, useContext, useEffect, useState } from "react";
import { fetchAllFoodItems } from "./dataService.js";

const NotifCtx = createContext({
  notifications: [],
  unread: 0,
  markRead: () => {},
  markPricesUpdated: async () => {},
});

const DAYS_28 = 28 * 24 * 60 * 60 * 1000;
const KEY = "optimeal_prices_last_updated";

function getLastUpdate() {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored) return new Date(Number(stored));
  } catch (_) {}
  return null;
}

function formatPrices(items) {
  if (!items.length) return "Standard menu prices are loading from Supabase.";
  return items
    .map((item) => `${item.name}: ₦${Number(item.price).toLocaleString()}`)
    .join(" · ");
}

function buildNotifications(foodItems = []) {
  const notifs = [];
  const lastUpdate = getLastUpdate();
  const daysSince = lastUpdate
    ? Math.floor((Date.now() - lastUpdate.getTime()) / (24 * 60 * 60 * 1000))
    : null;
  const updatedAt = lastUpdate || new Date();
  const needsUpdate = !lastUpdate || Date.now() - lastUpdate.getTime() > DAYS_28;

  if (needsUpdate) {
    notifs.push({
      id: "price_update_needed",
      type: "warning",
      title: lastUpdate
        ? `Prices not updated in ${daysSince} days`
        : "Food prices never updated",
      message: lastUpdate
        ? `Last updated: ${lastUpdate.toLocaleDateString("en-NG")}. Please update food prices in the Admin Portal to keep meal suggestions accurate.`
        : "Food prices have not been set yet. Visit the Admin Portal to enter current cafeteria prices.",
      time: lastUpdate ? `Last updated ${daysSince} days ago` : "Never updated",
      read: false,
    });
  }

  notifs.push({
    id: "current_prices",
    type: "info",
    title: "Current Standard Menu Prices",
    message: formatPrices(foodItems),
    time: `Updated ${updatedAt.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}`,
    read: false,
  });

  return notifs;
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState(new Set());

  async function refreshNotifications() {
    const foodItems = await fetchAllFoodItems();
    setNotifications(buildNotifications(foodItems));
  }

  useEffect(() => {
    let alive = true;

    async function load() {
      const foodItems = await fetchAllFoodItems();
      if (alive) setNotifications(buildNotifications(foodItems));
    }

    load();
    const interval = setInterval(load, 60 * 60 * 1000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

  const unread = notifications.filter((n) => !readIds.has(n.id)).length;

  function markRead() {
    setReadIds(new Set(notifications.map((n) => n.id)));
  }

  async function markPricesUpdated() {
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch (_) {}
    setReadIds(new Set());
    await refreshNotifications();
  }

  return (
    <NotifCtx.Provider value={{ notifications, unread, markRead, markPricesUpdated }}>
      {children}
    </NotifCtx.Provider>
  );
}

export const useNotifications = () => useContext(NotifCtx);
