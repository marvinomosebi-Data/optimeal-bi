/* Auth context — provides session + role to all pages */
import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, getRole, signOut as sbSignOut } from "./supabase.js";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession]   = useState(undefined); // undefined = loading
  const [role, setRole]         = useState("student");
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    // initial session
    supabase?.auth.getSession().then(async ({ data }) => {
      setSession(data?.session ?? null);
      if (data?.session) setRole(await getRole());
      setLoading(false);
    });

    // live updates
    const { data: { subscription } } = supabase?.auth.onAuthStateChange(async (_e, s) => {
      setSession(s);
      if (s) setRole(await getRole()); else setRole("student");
    }) ?? { data: { subscription: { unsubscribe: () => {} } } };

    return () => subscription.unsubscribe();
  }, []);

  async function logout() {
    await sbSignOut();
    setSession(null);
    setRole("student");
  }

  return (
    <AuthCtx.Provider value={{ session, role, loading, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);

/* Route guard — redirects unauthenticated users to login.
   guestOk = true allows guests through (optimizer/result/trends all work
   without an account); only admin and account-bound pages require a real
   session. */
export function RequireAuth({ adminOnly = false, children }) {
  const { session, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!session) { navigate("/", { replace: true }); return; }
    if (adminOnly && role !== "admin") { navigate("/app/plan", { replace: true }); }
  }, [session, role, loading]);

  if (loading) return null;
  if (!session) return null;
  if (adminOnly && role !== "admin") return null;
  return children;
}