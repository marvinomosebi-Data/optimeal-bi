import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import { MobileNav } from "./Topbar.jsx";
import { useAuth } from "../lib/auth.jsx";

export default function AppLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/", { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-slatebg overflow-x-hidden">
      <Sidebar onUpdatePrices={() => navigate("/app/trends")} onLogout={handleLogout} />
      <main className="flex-1 min-w-0 pb-16 lg:pb-0 overflow-x-hidden">
        <Outlet />
      </main>
      <MobileNav onLogout={handleLogout} />
    </div>
  );
}