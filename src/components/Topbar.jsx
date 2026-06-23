import { LogOut, BarChart3, LayoutGrid, TrendingUp, Heart } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";

export function Topbar({ title }) {
  const { session, role } = useAuth();
  const initials = session?.user?.user_metadata?.full_name
    ?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "G";

  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-slate-200 bg-slatebg/80 px-4 py-4 backdrop-blur lg:px-8 overflow-hidden min-w-0">
      <h1 className="font-display text-xl font-bold text-ink lg:text-2xl truncate min-w-0">{title}</h1>
      <div className="ml-auto flex items-center gap-3">
        {role === "admin" && (
          <span className="hidden rounded-full bg-gold px-3 py-1 text-xs font-bold text-navy-900 sm:inline">
            Admin
          </span>
        )}
        <div className="grid h-10 w-10 place-items-center rounded-full bg-navy text-sm font-bold text-white">
          {initials}
        </div>
      </div>
    </header>
  );
}

export function MobileNav({ onLogout }) {
  const { role, session } = useAuth();
  const links = [
    { to: "/app/optimizer", label: "Optimizer", icon: LayoutGrid },
    ...(session ? [{ to: "/app/favorites", label: "Saved", icon: Heart }] : []),
    { to: "/app/trends",    label: "Trends",    icon: TrendingUp },
    ...(role === "admin" ? [{ to: "/app/admin", label: "Admin", icon: BarChart3 }] : []),
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white lg:hidden">
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center py-3 text-xs font-semibold gap-1 ${isActive ? "text-navy" : "text-slate-400"}`
          }
        >
          <l.icon className="h-5 w-5" />
          {l.label}
        </NavLink>
      ))}
      <button
        onClick={onLogout}
        className="flex flex-1 flex-col items-center py-3 text-xs font-semibold gap-1 text-red-400"
      >
        <LogOut className="h-5 w-5" />
        Sign out
      </button>
    </nav>
  );
}