import { useState, useRef, useEffect } from "react";
import { Bell, Sun, Moon, AlertTriangle, CheckCircle, X, Menu } from "lucide-react";
import { useAuth } from "../lib/auth.jsx";
import { useTheme } from "../lib/theme.jsx";
import { useNotifications } from "../lib/notifications.jsx";

export function Topbar({ title, onMenuOpen }) {
  const { session, role } = useAuth();
  const { dark, toggleDark } = useTheme();
  const { notifications, unread, markRead } = useNotifications();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  const initials = session?.user?.user_metadata?.full_name
    ?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "U";
  const fullName = session?.user?.user_metadata?.full_name || "User";
  const email = session?.user?.email || "";

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function openNotifs() {
    setShowNotifs(v => !v);
    setShowProfile(false);
    if (!showNotifs) markRead();
  }
  function openProfile() {
    setShowProfile(v => !v);
    setShowNotifs(false);
  }

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 px-4 py-3 backdrop-blur overflow-hidden min-w-0">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuOpen}
        className="lg:hidden grid h-9 w-9 place-items-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Title */}
      <h1 className="font-display text-lg font-bold text-ink dark:text-slate-100 lg:text-xl truncate min-w-0 flex-1">
        {title}
      </h1>

      {/* Right icons */}
      <div className="flex items-center gap-1 shrink-0">

        {/* Dark mode toggle */}
        <button
          onClick={toggleDark}
          className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          title={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {dark ? <Sun className="h-5 w-5 text-gold" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Notification bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={openNotifs}
            className="relative grid h-9 w-9 place-items-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            title="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900" />
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-full mt-2 w-80 card p-0 overflow-hidden shadow-cardhover z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                <p className="font-semibold text-sm text-ink dark:text-slate-100">Notifications</p>
                <button onClick={() => setShowNotifs(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {notifications.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <CheckCircle className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">All caught up! No new notifications.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-72 overflow-y-auto">
                  {notifications.map(n => (
                    <div key={n.id} className="flex gap-3 px-4 py-3">
                      <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-ink dark:text-slate-100">{n.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{n.message}</p>
                        <p className="text-xs text-slate-400 mt-1">{n.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={openProfile}
            className="grid h-9 w-9 place-items-center rounded-full bg-navy text-sm font-bold text-white hover:opacity-90 transition"
            title="Profile"
          >
            {initials}
          </button>

          {showProfile && (
            <div className="absolute right-0 top-full mt-2 w-56 card p-0 overflow-hidden shadow-cardhover z-50">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                <p className="font-semibold text-sm text-ink dark:text-slate-100 truncate">{fullName}</p>
                <p className="text-xs text-slate-400 truncate">{email}</p>
                {role === "admin" && (
                  <span className="mt-1 inline-block rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-navy-900">
                    Admin
                  </span>
                )}
              </div>
              <div className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500">
                <p>Bowen University</p>
                <p className="mt-0.5">Student / Staff Portal</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export function MobileNav() {
  return null; // Navigation is now in the sidebar drawer
}
