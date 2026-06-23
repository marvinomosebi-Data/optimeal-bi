import { Routes, Route, Navigate } from "react-router-dom";
import { RequireAuth } from "./lib/auth.jsx";
import AppLayout from "./components/AppLayout.jsx";
import Login from "./pages/Login.jsx";
import Plan from "./pages/Plan.jsx";
import Budget from "./pages/Budget.jsx";
import Optimizer from "./pages/Optimizer.jsx";
import Result from "./pages/Result.jsx";
import Trends from "./pages/Trends.jsx";
import Spending from "./pages/Spending.jsx";
import Admin from "./pages/Admin.jsx";
import Favorites from "./pages/Favorites.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route
        path="/app"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="plan" replace />} />
        <Route path="plan"      element={<Plan />} />
        <Route path="budget"    element={<Budget />} />
        <Route path="optimizer" element={<Optimizer />} />
        <Route path="result"    element={<Result />} />
        <Route path="trends"    element={<Trends />} />
        <Route path="spending"  element={<Spending />} />
        <Route path="favorites" element={<Favorites />} />
        <Route
          path="admin"
          element={
            <RequireAuth adminOnly>
              <Admin />
            </RequireAuth>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
