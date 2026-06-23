import { useState, useRef, useEffect } from "react";
import { Bell, Sun, Moon, AlertTriangle, CheckCircle2, X, Menu, Clock } from "lucide-react";
import { useAuth } from "../lib/auth.jsx";
import { useTheme } from "../lib/theme.jsx";
import { useNotifications } from "../lib/notifications.jsx";

export function Topbar({ title, onMenuOpen }) {
  const { session, role } = useAuth();
  const { dark, toggleDark } = useTheme();
  const { notifications, unread, markRead } = useNotifications();
  const [showNotifs, setShowNotifs]   = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const notifRef   = useRef(null);
  const profileRef = useRef(null);

  const fullName = session?.user?.user_metadata?.full_name || "User";
  const email    = session?.user?.email || session?.user?.user_metadata?.email || "";
  const idNumber = session?.user?.user_metadata?.id_number || "";
  const initials = fullName.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase() || "U";

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
    markRead();
  }

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 overflow-visible min-w-0">
      {/* Hamburger */}
      <button
        onClick={onMenuOpen}
        className="lg:hidden grid h-9 w-9 place-items-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Page title */}
      <h1 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 lg:text-xl truncate min-w-0 flex-1">
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
          {dark
            ? <Sun className="h-5 w-5 text-amber-400" />
            : <Moon className="h-5 w-5 text-slate-500" />}
        </button>

        {/* Notification bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={openNotifs}
            className="relative grid h-9 w-9 place-items-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900" />
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">Notifications</p>
                <button onClick={() => setShowNotifs(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {notifications.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">All up to date!</p>
                  <p className="text-xs text-slate-400 mt-1">Food prices were updated recently. No action needed.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-80 overflow-y-auto">
                  {notifications.map(n => (
                    <div key={n.id} className="flex gap-3 px-4 py-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{n.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{n.message}</p>
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                          <Clock className="h-3 w-3" />{n.time}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Profile avatar */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => { setShowProfile(v => !v); setShowNotifs(false); }}
            className="grid h-9 w-9 place-items-center rounded-full bg-navy text-sm font-bold text-white hover:opacity-90 transition"
          >
            {initials}
          </button>

          {showProfile && (
            <div className="absolute right-0 top-full mt-2 w-60 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl z-50 overflow-hidden">
              {/* Avatar + name */}
              <div className="px-4 py-4 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-navy text-white font-bold text-base">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{fullName}</p>
                    <p className="text-xs text-slate-400 truncate">{email}</p>
                    {idNumber && (
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{idNumber}</p>
                    )}
                  </div>
                </div>
                {role === "admin" && (
                  <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-gold/20 px-2.5 py-0.5">
                    <span className="text-[10px] font-bold text-gold-dark">Administrator</span>
                  </div>
                )}
              </div>
              <div className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500 space-y-0.5">
                <p>🏫 Bowen University, Iwo</p>
                <p>📊 Final Year Project · 2025</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export function MobileNav() { return null; }
