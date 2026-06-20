import { NavLink } from "react-router-dom";
import { LayoutGrid, TrendingUp, ShieldCheck, LogOut, BarChart3, Heart } from "lucide-react";
import { useAuth } from "../lib/auth.jsx";

export default function Sidebar({ onUpdatePrices, onLogout }) {
  const { role, session } = useAuth();

  const links = [
    { to: "/app/optimizer", label: "Meal Optimizer", icon: LayoutGrid },
    ...(session ? [{ to: "/app/favorites", label: "Saved Meals", icon: Heart }] : []),
    { to: "/app/trends",    label: "Price Analytics", icon: TrendingUp },
    ...(role === "admin" ? [{ to: "/app/admin", label: "Admin Portal", icon: ShieldCheck }] : []),
  ];

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-6">
      <div className="flex items-center gap-3 px-2">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-navy">
          <BarChart3 className="h-6 w-6 text-gold" />
        </div>
        <div>
          <p className="font-display text-lg font-extrabold leading-none text-ink">OptiMeal BI</p>
          <p className="text-xs text-slate-500">Bowen University</p>
        </div>
      </div>

      <nav className="mt-8 flex flex-col gap-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-1 border-t border-slate-100 pt-4">
        <button onClick={onLogout} className="nav-link w-full text-left text-red-500 hover:bg-red-50 hover:text-red-600">
          <LogOut className="h-5 w-5" /> Sign out
        </button>
      </div>
    </aside>
  );
}