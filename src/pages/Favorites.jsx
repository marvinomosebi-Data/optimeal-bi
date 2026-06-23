import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Topbar } from "../components/Topbar.jsx";
import { Footer } from "./Optimizer.jsx";
import { fetchSavedPlans, deleteSavedPlan, isSupabaseConfigured } from "../lib/supabase.js";
import { useAuth } from "../lib/auth.jsx";
import { Heart, Trash2, RefreshCw, Zap, Star, ChevronRight } from "lucide-react";

export default function Favorites() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (!session) { setLoading(false); return; }
    fetchSavedPlans().then((d) => { setPlans(d); setLoading(false); });
  }, [session]);

  async function handleDelete(id) {
    setDeletingId(id);
    try {
      await deleteSavedPlan(id);
      setPlans((p) => p.filter((x) => x.id !== id));
    } catch (e) {
      // silent fail is acceptable here; list simply won't update
    } finally { setDeletingId(null); }
  }

  function reopen(plan) {
    const params = new URLSearchParams({
      budget: String(plan.budget), appetite: plan.appetite, cafe: String(plan.cafe_id),
      crave: "", avoid: "",
    });
    navigate(`/app/result?${params}`);
  }

  return (
    <>
      <Topbar title="Saved Meals" />
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8 overflow-x-hidden w-full">
        <div className="mb-6">
          <h2 className="font-display text-3xl font-extrabold text-ink lg:text-4xl">Your Favorites</h2>
          <p className="mt-1 text-slate-500">Meal plans you've saved for quick access later.</p>
        </div>

        {!isSupabaseConfigured ? (
          <div className="card p-10 text-center text-slate-500">Supabase isn't configured — favorites need a database connection.</div>
        ) : !session ? (
          <div className="card p-10 text-center">
            <Heart className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-semibold text-ink">Sign in to save meal plans</p>
            <p className="mt-1 text-sm text-slate-500">Guests can't save favorites — create a free account to keep track of meals you like.</p>
            <button onClick={() => navigate("/")} className="btn-primary mx-auto mt-4 px-6">Sign In</button>
          </div>
        ) : loading ? (
          <div className="card flex items-center justify-center gap-2 p-10 text-slate-400">
            <RefreshCw className="h-5 w-5 animate-spin" /> Loading your saved meals…
          </div>
        ) : plans.length === 0 ? (
          <div className="card p-10 text-center">
            <Heart className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-semibold text-ink">No saved meals yet</p>
            <p className="mt-1 text-sm text-slate-500">Build a plan in the optimizer, then tap "Save to Favorites" to keep it here.</p>
            <button onClick={() => navigate("/app/optimizer")} className="btn-primary mx-auto mt-4 px-6">Plan a Meal</button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <div key={plan.id} className="card flex flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg font-bold text-ink">{plan.plan_name || plan.cafe_name}</p>
                    <p className="text-xs text-slate-400">{plan.cafe_name} · {plan.appetite} appetite</p>
                  </div>
                  <button
                    onClick={() => handleDelete(plan.id)}
                    disabled={deletingId === plan.id}
                    className="shrink-0 grid h-8 w-8 place-items-center rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                    title="Remove from favorites"
                  >
                    {deletingId === plan.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>

                <div className="mt-3 flex items-center gap-4 text-sm">
                  <span className="font-display font-bold text-ink">₦{plan.total_cost?.toLocaleString()}</span>
                  <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                    <Zap className="h-3.5 w-3.5" /> {plan.satiety_score}/100
                  </span>
                </div>

                <ul className="mt-3 flex-1 space-y-1 text-xs text-slate-500">
                  {(plan.items || []).slice(0, 4).map((it, i) => (
                    <li key={i} className="truncate">
                      {it.name}{it.portions > 1 ? ` ×${it.portions}` : ""}
                    </li>
                  ))}
                  {(plan.items || []).length > 4 && (
                    <li className="text-slate-400">+{plan.items.length - 4} more</li>
                  )}
                </ul>

                <button onClick={() => reopen(plan)}
                  className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-navy hover:bg-slate-50">
                  Re-build this plan <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <Footer />
      </div>
    </>
  );
}