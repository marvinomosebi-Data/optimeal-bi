import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import { Topbar } from "./Topbar.jsx";
import { useAuth } from "../lib/auth.jsx";
import { useLocation } from "react-router-dom";

const PAGE_TITLES = {
  "/app/plan":      "Plan Your Meal",
  "/app/budget":    "Weekly / Monthly Budget",
  "/app/optimizer": "Meal Optimizer",
  "/app/result":    "Your Meal Plan",
  "/app/trends":    "Price Analytics",
  "/app/spending":  "Spending Habits",
  "/app/favorites": "Saved Meals",
  "/app/admin":     "Admin Portal",
};

export default function AppLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate("/", { replace: true });
  }

  const title = PAGE_TITLES[location.pathname] || "OptiMeal BI";

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 overflow-x-hidden">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
      />
      <div className="flex flex-1 min-w-0 flex-col overflow-x-hidden">
        <Topbar
          title={title}
          onMenuOpen={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
