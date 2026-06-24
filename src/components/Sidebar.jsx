import { NavLink } from "react-router-dom";
import {
  UtensilsCrossed, Heart, TrendingUp, ShieldCheck,
  LogOut, X, CalendarDays, BarChart2
} from "lucide-react";
import { useAuth } from "../lib/auth.jsx";
import logo from "../assets/icon.png";

function Logo() {
  return <img src={logo} alt="OptiMeal BI" className="h-10 w-10 rounded-xl" />;
}

export default function Sidebar({ open, onClose, onLogout }) {
  const { role, session } = useAuth();

  const links = [
    { to: "/app/plan",      label: "Plan Your Meals",    icon: UtensilsCrossed, desc: "Daily meal planner" },
    { to: "/app/budget",    label: "Weekly / Monthly",   icon: CalendarDays,    desc: "Budget planner" },
    { to: "/app/favorites", label: "Saved Meals",        icon: Heart,           desc: "Your saved plans" },
    { to: "/app/spending",  label: "Spending Habits",    icon: BarChart2,       desc: "This week vs last week" },
    { to: "/app/trends",    label: "Price Analytics",    icon: TrendingUp,      desc: "NBS price data" },
    ...(role === "admin" ? [{ to: "/app/admin", label: "Admin Portal", icon: ShieldCheck, desc: "Manage system" }] : []),
  ];

  function handleLink() { onClose(); }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Drawer — slides in on mobile, always visible on lg */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 flex flex-col bg-white dark:bg-gray-900
        border-r border-slate-200 dark:border-gray-700
        transform transition-transform duration-300 ease-in-out
        ${open ? "translate-x-0" : "-translate-x-full"}
        lg:relative lg:translate-x-0 lg:z-auto lg:w-64 lg:shrink-0
      `}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-slate-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Logo />
            <div>
              <p className="font-display text-base font-extrabold leading-none text-ink dark:text-gray-100">OptiMeal BI</p>
              <p className="text-xs text-slate-400">Bowen University</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {links.map(({ to, label, icon: Icon, desc }) => (
            <NavLink
              key={to}
              to={to}
              onClick={handleLink}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-3 transition group ${
                  isActive
                    ? "bg-gold text-navy-900"
                    : "text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                    isActive ? "bg-navy/10" : "bg-slate-100 dark:bg-gray-800 group-hover:bg-slate-200 dark:group-hover:bg-slate-700"
                  }`}>
                    <Icon className={`h-4 w-4 ${isActive ? "text-navy" : "text-slate-500 dark:text-slate-400"}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{label}</p>
                    <p className={`text-xs truncate ${isActive ? "text-navy/60" : "text-slate-400"}`}>{desc}</p>
                  </div>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Sign out */}
        <div className="px-3 py-4 border-t border-slate-100 dark:border-gray-700">
          <button
            onClick={() => { onClose(); onLogout(); }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
          >
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-red-50 dark:bg-red-950/40">
              <LogOut className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
