import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Footer } from "./Optimizer.jsx";
import { fetchMenu, fetchCafeterias } from "../lib/dataService.js";
import { saveMealPlan, isSupabaseConfigured } from "../lib/supabase.js";
import { useAuth } from "../lib/auth.jsx";
import {
  optimizeMeal, manualMaxPortions, allowedProteinsFor,
} from "../lib/optimizer.js";
import { CATEGORIES } from "../data/dataset.js";
import {
  Sparkles, Zap, CheckCircle2, Star, BrainCircuit, RefreshCw, TrendingUp,
  Plus, Minus, RotateCcw, Repeat, Heart, X,
} from "lucide-react";

const CATEGORY_LABEL = {
  [CATEGORIES.SWALLOW]: "Swallow",
  [CATEGORIES.GRAINS]:  "Rice & Grains",
  [CATEGORIES.PROTEIN]: "Protein",
  [CATEGORIES.SIDE]:    "Side",
  [CATEGORIES.SOUP]:    "Free Soup",
};

export default function Result() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [menu, setMenu] = useState([]);
  const [cafe, setCafe] = useState(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [planName, setPlanName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const budget = Number(params.get("budget")) || 2000;
  const appetite = params.get("appetite") || "Normal";
  const cafeId = Number(params.get("cafe")) || 1;
  const crave = useMemo(() => new Set((params.get("crave") || "").split(",").filter(Boolean)), [params]);
  const avoid = useMemo(() => new Set((params.get("avoid") || "").split(",").filter(Boolean)), [params]);

  useEffect(() => { fetchMenu(cafeId).then(setMenu); }, [cafeId]);
  useEffect(() => { fetchCafeterias().then((cs) => setCafe(cs.find((c) => c.id === cafeId))); }, [cafeId]);

  // Optimizer-linked overrides (fed back into optimizeMeal)
  const [baseOverride, setBaseOverride] = useState(null);
  const [proteinOverride, setProteinOverride] = useState(null);

  // Display-level overrides (applied post-optimizer, never re-fed into engine)
  const [baseRemoved, setBaseRemoved] = useState(false);
  const [soupOverride, setSoupOverride] = useState(null); // null | "none" | soupId
  const [sidePortions, setSidePortions] = useState(null); // null | number (0 = removed)

  // Picker open states
  const [showSwallowPicker, setShowSwallowPicker] = useState(false);
  const [showSoupPicker, setShowSoupPicker] = useState(false);
  const [showSidePicker, setShowSidePicker] = useState(false);

  useEffect(() => {
    setBaseOverride(null); setProteinOverride(null);
    setBaseRemoved(false); setSoupOverride(null); setSidePortions(null);
    setShowSwallowPicker(false); setShowSoupPicker(false); setShowSidePicker(false);
  }, [menu, budget, appetite, cafeId, crave, avoid]);

  const autoResult = useMemo(() => {
    if (!menu.length) return null;
    return optimizeMeal({ menu, budget, appetite, crave, avoid });
  }, [menu, budget, appetite, crave, avoid]);

  const result = useMemo(() => {
    if (!menu.length) return null;
    if (!baseOverride && !proteinOverride) return autoResult;
    return optimizeMeal({
      menu, budget, appetite, crave, avoid,
      lockedBase: baseOverride,
      lockedProteins: proteinOverride,
    });
  }, [menu, budget, appetite, crave, avoid, baseOverride, proteinOverride, autoResult]);

  // Post-optimizer display items: apply soup/side/base-removal overrides on top of engine output
  const displayItems = useMemo(() => {
    if (!result?.items) return [];
    let items = [...result.items];

    // Remove base + its auto-soup when user explicitly removed the base
    if (baseRemoved) {
      items = items.filter(
        (i) => i.category !== CATEGORIES.SWALLOW &&
               i.category !== CATEGORIES.GRAINS &&
               i.category !== CATEGORIES.SOUP,
      );
    }

    // Soup override (only meaningful when base is present)
    if (!baseRemoved) {
      if (soupOverride === "none") {
        items = items.filter((i) => i.category !== CATEGORIES.SOUP);
      } else if (soupOverride) {
        const m = menu.find((x) => x.id === soupOverride);
        if (m) {
          const entry = { ...m, portions: 1, lineCost: 0, lineSatiety: m.satiety };
          items = items.map((i) => i.category === CATEGORIES.SOUP ? entry : i);
        }
      }
    }

    // Side override
    if (sidePortions !== null) {
      if (sidePortions === 0) {
        items = items.filter((i) => i.category !== CATEGORIES.SIDE);
      } else {
        const hasSideInResult = items.some((i) => i.category === CATEGORIES.SIDE);
        if (hasSideInResult) {
          items = items.map((i) => {
            if (i.category !== CATEGORIES.SIDE) return i;
            return { ...i, portions: sidePortions, lineCost: i.price * sidePortions, lineSatiety: i.satiety * sidePortions };
          });
        } else {
          // Side wasn't in optimizer's result — add it from menu
          const sm = menu.find((x) => x.category === CATEGORIES.SIDE);
          if (sm) {
            items = [
              ...items,
              { ...sm, portions: sidePortions, lineCost: sm.price * sidePortions, lineSatiety: sm.satiety * sidePortions },
            ];
          }
        }
      }
    }

    return items;
  }, [result, baseRemoved, soupOverride, sidePortions, menu]);

  // Derived display totals
  const displayCost = useMemo(() => displayItems.reduce((s, i) => s + i.lineCost, 0), [displayItems]);
  const displayRawSatiety = useMemo(() => displayItems.reduce((s, i) => s + i.lineSatiety, 0), [displayItems]);
  const displaySatietyScore = Math.min(100, Math.round((displayRawSatiety / 44) * 100));
  const displaySlack = budget - displayCost;
  const displayEfficiency = Math.round((displayCost / budget) * 100);

  if (!result) return <div className="p-10 text-slate-500">Calculating…</div>;

  // Item groups derived from displayItems
  const displayBase    = displayItems.find((i) => i.category === CATEGORIES.SWALLOW || i.category === CATEGORIES.GRAINS);
  const displaySoup    = displayItems.find((i) => i.category === CATEGORIES.SOUP);
  const displayProteins = displayItems.filter((i) => i.category === CATEGORIES.PROTEIN);
  const displaySide    = displayItems.find((i) => i.category === CATEGORIES.SIDE);

  const isManuallyAdjusted = Boolean(
    baseOverride || proteinOverride || baseRemoved ||
    soupOverride || sidePortions !== null,
  );

  // ---------- Base / swallow controls ----------
  const baseItem = result.items[0]; // optimizer always places base first
  const baseMenuItem = menu.find((m) => m.id === baseItem?.id);
  const isAdjustableBase = baseMenuItem &&
    (baseMenuItem.category === CATEGORIES.SWALLOW || baseMenuItem.category === CATEGORIES.GRAINS);

  const budgetForBase = budget - (result.cost - (baseItem?.lineCost || 0));
  const maxBasePortions = isAdjustableBase ? manualMaxPortions(baseMenuItem, budgetForBase) : 1;

  function adjustBasePortions(delta) {
    if (!isAdjustableBase) return;
    const current = baseItem.portions;
    const next = Math.max(1, Math.min(maxBasePortions, current + delta));
    if (next === current) return;
    setBaseOverride({ id: baseMenuItem.id, portions: next });
  }

  function resetBase() { setBaseOverride(null); }

  // ---------- Protein controls ----------
  const proteinItems = result.items.filter((i) => i.category === CATEGORIES.PROTEIN);
  const allowedProteins = allowedProteinsFor(baseMenuItem, menu);
  const proteinTotalCost = proteinItems.reduce((s, i) => s + i.lineCost, 0);
  const budgetForProteins = budget - (result.cost - proteinTotalCost);

  function currentProteinSelections() {
    return proteinItems.map((i) => ({ id: i.id, portions: i.portions }));
  }

  function commitProteins(next) {
    setProteinOverride(next.filter((p) => p.portions > 0));
  }

  function adjustProteinQty(proteinId, delta) {
    const sel = currentProteinSelections();
    const idx = sel.findIndex((p) => p.id === proteinId);
    const pm = menu.find((m) => m.id === proteinId);
    if (idx === -1 && delta <= 0) return;

    if (idx === -1) {
      if (!pm || pm.price > budgetForProteins) return;
      sel.push({ id: proteinId, portions: 1 });
    } else {
      const spentOnOthers = proteinItems
        .filter((i) => i.id !== proteinId)
        .reduce((s, i) => s + i.lineCost, 0);
      const roomForThis = budget - (result.cost - proteinTotalCost) - spentOnOthers;
      const maxForThis = manualMaxPortions(pm, roomForThis);
      const next = Math.max(0, Math.min(maxForThis, sel[idx].portions + delta));
      sel[idx].portions = next;
    }
    commitProteins(sel);
  }

  function swapProtein(oldId, newId) {
    if (oldId === newId) return;
    const sel = currentProteinSelections();
    const idx = sel.findIndex((p) => p.id === oldId);
    if (idx === -1) return;
    sel[idx] = { id: newId, portions: sel[idx].portions };
    commitProteins(sel);
  }

  function resetProteins() { setProteinOverride(null); }

  // ---------- Side controls ----------
  const sideMenuItem = menu.find((m) => m.category === CATEGORIES.SIDE);

  function adjustSide(delta) {
    if (!sideMenuItem) return;
    const current = displaySide?.portions ?? 0;
    const costWithoutSide = displayCost - (displaySide?.lineCost ?? 0);
    const roomForSide = budget - costWithoutSide;
    const maxSide = manualMaxPortions(sideMenuItem, roomForSide);
    const next = Math.max(0, Math.min(maxSide, current + delta));
    setSidePortions(next);
  }

  // ---------- Available items for pickers ----------
  const availableSwallows = menu.filter((m) => m.category === CATEGORIES.SWALLOW);
  const availableSoups    = menu.filter((m) => m.category === CATEGORIES.SOUP);
  const availableSides    = menu.filter((m) => m.category === CATEGORIES.SIDE);

  // ---------- Satiety score & stars ----------
  const stars = Math.round((displaySatietyScore / 100) * 5);
  const satisfactionTier = (() => {
    const s = displaySatietyScore;
    if (s >= 80) return { label: "High Satisfaction",    cls: "text-emerald-600" };
    if (s >= 60) return { label: "Good Satisfaction",     cls: "text-emerald-600" };
    if (s >= 40) return { label: "Moderate Satisfaction", cls: "text-amber-600"   };
    if (s >= 20) return { label: "Light Satisfaction",    cls: "text-amber-600"   };
    return           { label: "Minimal Satisfaction",   cls: "text-red-500"     };
  })();

  // ---------- Save to Favorites ----------
  async function handleSavePlan() {
    if (!session) { navigate("/"); return; }
    setSaving(true); setSaveMsg("");
    try {
      await saveMealPlan({
        planName: planName.trim() || `${cafe?.name || "Meal"} · ₦${budget.toLocaleString()}`,
        cafeId, cafeName: cafe?.name || "",
        budget, appetite,
        items: displayItems,
        totalCost: displayCost,
        satietyScore: displaySatietyScore,
      });
      setSaveMsg("Saved to your favorites!");
      setTimeout(() => { setSaveOpen(false); setSaveMsg(""); setPlanName(""); }, 1400);
    } catch (ex) {
      setSaveMsg(ex.message || "Could not save. Try again.");
    } finally { setSaving(false); }
  }

  const rowCls = "flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 p-4";

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8 overflow-x-hidden w-full">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-3xl font-extrabold text-ink lg:text-4xl">Your Optimal Meal</h2>
            <p className="mt-1 text-slate-500">Calculation results based on your constraints.</p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-xl bg-slate-100 px-5 py-3 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Applied Budget</p>
              <p className="font-display text-lg font-bold text-ink">₦{budget.toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-slate-100 px-5 py-3 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Cafeteria</p>
              <p className="font-display text-lg font-bold text-ink">{cafe?.name || "—"}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            {/* Plan card */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
              <div className="flex items-center justify-between bg-navy px-6 py-5">
                <div className="flex items-center gap-2 font-display text-xl font-bold text-white">
                  <Sparkles className="h-5 w-5 text-gold" /> Optimized Meal Plan
                </div>
                <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                  isManuallyAdjusted ? "bg-gold text-navy-900" : "bg-white/10 text-slate-200"
                }`}>
                  {isManuallyAdjusted ? "Manually Adjusted" : "Bounded Knapsack"}
                </span>
              </div>

              <div className="space-y-3 p-6">
                {!result.feasible && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                    That combination doesn't fit your ₦{budget.toLocaleString()} budget, or that protein isn't
                    compatible with this base. Try a smaller adjustment, or reset to the optimized plan.
                  </div>
                )}

                {/* ── Base (Swallow / Grains) ── */}
                {displayBase && (
                  <div className={rowCls}>
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-navy to-navy-800 text-gold">
                      <Zap className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-lg font-bold text-ink">{displayBase.name}</p>
                      <p className="mt-2 text-sm text-slate-500">
                        {CATEGORY_LABEL[displayBase.category] || displayBase.category}
                        {" · "}
                        {displayBase.portions} {displayBase.portions > 1 ? "portions" : "portion"}
                        {displayBase.note && !displayBase.note.toLowerCase().includes("auto") ? ` · ${displayBase.note}` : ""}
                      </p>
                    </div>
                    {isAdjustableBase && (
                      <div className="flex shrink-0 items-center gap-1.5">
                        {baseOverride && (
                          <button onClick={resetBase} title="Reset to optimized portion"
                            className="mr-1 grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-navy">
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (displayBase.portions <= 1 && displayBase.category === CATEGORIES.SWALLOW) {
                              setBaseRemoved(true);
                              setBaseOverride(null);
                              setSoupOverride(null);
                              setShowSoupPicker(false);
                            } else {
                              adjustBasePortions(-1);
                            }
                          }}
                          disabled={displayBase.portions <= 1 && displayBase.category !== CATEGORIES.SWALLOW}
                          className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-ink hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-6 text-center font-display text-sm font-bold text-ink">{displayBase.portions}</span>
                        <button
                          onClick={() => adjustBasePortions(1)}
                          disabled={displayBase.portions >= maxBasePortions}
                          className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-ink hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                    <div className="text-right">
                      <p className="font-display text-lg font-bold text-ink">
                        ₦{displayBase.lineCost.toLocaleString()}
                      </p>
                      <p className="flex items-center justify-end gap-1 text-sm font-semibold text-emerald-600">
                        <Zap className="h-3.5 w-3.5" /> Satiety: {displayBase.satiety}
                      </p>
                    </div>
                  </div>
                )}

                {/* Add a swallow — shown when swallow was removed */}
                {baseRemoved && (
                  <div className="space-y-2">
                    {showSwallowPicker && availableSwallows.length > 0 && (
                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        {availableSwallows.map((sw) => (
                          <button
                            key={sw.id}
                            onClick={() => {
                              setBaseRemoved(false);
                              setBaseOverride({ id: sw.id, portions: 1 });
                              setSoupOverride(null);
                              setShowSwallowPicker(false);
                            }}
                            className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-2.5 text-sm text-ink hover:bg-slate-50 last:border-0"
                          >
                            <span className="font-medium">{sw.name}</span>
                            <span className="text-slate-500">₦{sw.price.toLocaleString()}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => setShowSwallowPicker((v) => !v)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-sm font-semibold text-slate-500 hover:border-navy hover:text-navy"
                    >
                      <Plus className="h-4 w-4" /> Add a swallow
                    </button>
                  </div>
                )}

                {/* ── Free Soup (swallow meals only) ── */}
                {displayBase?.category === CATEGORIES.SWALLOW && displaySoup && (
                  <div className={rowCls}>
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-navy to-navy-800 text-gold">
                      <Zap className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-lg font-bold text-ink">{displaySoup.name}</p>
                      <p className="mt-2 text-sm text-slate-500">Free Soup · 1 portion</p>
                    </div>
                    <button
                      onClick={() => { setSoupOverride("none"); setShowSoupPicker(false); }}
                      title="Remove soup"
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="text-right">
                      <p className="font-display text-lg font-bold text-ink">Free</p>
                      <p className="flex items-center justify-end gap-1 text-sm font-semibold text-emerald-600">
                        <Zap className="h-3.5 w-3.5" /> Satiety: {displaySoup.satiety}
                      </p>
                    </div>
                  </div>
                )}

                {/* Add a soup — shown when swallow base has no soup */}
                {displayBase?.category === CATEGORIES.SWALLOW && !displaySoup && availableSoups.length > 0 && (
                  <div className="space-y-2">
                    {showSoupPicker && (
                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        {availableSoups.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => { setSoupOverride(s.id); setShowSoupPicker(false); }}
                            className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-2.5 text-sm text-ink hover:bg-slate-50 last:border-0"
                          >
                            <span className="font-medium">{s.name}</span>
                            <span className="text-slate-500">Free</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => setShowSoupPicker((v) => !v)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-sm font-semibold text-slate-500 hover:border-navy hover:text-navy"
                    >
                      <Plus className="h-4 w-4" /> Add a soup
                    </button>
                  </div>
                )}

                {/* ── Proteins ── */}
                {displayProteins.map((item) => {
                  const swapOptions = allowedProteins.filter(
                    (p) => p.id === item.id || !displayProteins.some((pi) => pi.id === p.id),
                  );
                  return (
                    <div key={item.id} className={rowCls}>
                      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-navy to-navy-800 text-gold">
                        <Zap className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        {swapOptions.length > 1 ? (
                          <div className="flex items-center gap-1.5">
                            <select
                              value={item.id}
                              onChange={(e) => swapProtein(item.id, e.target.value)}
                              className="rounded-lg border border-slate-200 bg-white py-1 pl-2 pr-7 font-display text-base font-bold text-ink outline-none focus:border-navy"
                            >
                              {swapOptions.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                            <Repeat className="h-3.5 w-3.5 text-slate-300" />
                          </div>
                        ) : (
                          <p className="font-display text-lg font-bold text-ink">{item.name}</p>
                        )}
                        <p className="mt-2 text-sm text-slate-500">
                          {CATEGORY_LABEL[item.category] || item.category}
                          {" · "}
                          {item.portions} {item.portions > 1 ? "portions" : "portion"}
                          {item.note && !item.note.toLowerCase().includes("auto") ? ` · ${item.note}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          onClick={() => adjustProteinQty(item.id, -1)}
                          className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-ink hover:bg-slate-50"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-6 text-center font-display text-sm font-bold text-ink">{item.portions}</span>
                        <button
                          onClick={() => adjustProteinQty(item.id, 1)}
                          className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-ink hover:bg-slate-50"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-lg font-bold text-ink">₦{item.lineCost.toLocaleString()}</p>
                        <p className="flex items-center justify-end gap-1 text-sm font-semibold text-emerald-600">
                          <Zap className="h-3.5 w-3.5" /> Satiety: {item.satiety}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {/* Add another protein */}
                {allowedProteins.length > displayProteins.length && (
                  <button
                    onClick={() => {
                      const candidate = allowedProteins.find((p) => !displayProteins.some((pi) => pi.id === p.id));
                      if (candidate) adjustProteinQty(candidate.id, 1);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-sm font-semibold text-slate-500 hover:border-navy hover:text-navy"
                  >
                    <Plus className="h-4 w-4" /> Add another protein
                  </button>
                )}
                {proteinOverride && (
                  <button
                    onClick={resetProteins}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-navy"
                  >
                    <RotateCcw className="h-3 w-3" /> Reset protein to optimized pick
                  </button>
                )}

                {/* ── Side (Fried Plantain etc.) ── */}
                {displaySide && (
                  <div className={rowCls}>
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-navy to-navy-800 text-gold">
                      <Zap className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-lg font-bold text-ink">{displaySide.name}</p>
                      <p className="mt-2 text-sm text-slate-500">
                        {CATEGORY_LABEL[displaySide.category] || displaySide.category}
                        {" · "}
                        {displaySide.portions} {displaySide.portions > 1 ? "portions" : "portion"}
                        {displaySide.note ? ` · ${displaySide.note}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        onClick={() => adjustSide(-1)}
                        className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-ink hover:bg-slate-50"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-6 text-center font-display text-sm font-bold text-ink">{displaySide.portions}</span>
                      <button
                        onClick={() => adjustSide(1)}
                        disabled={displaySlack < (sideMenuItem?.price ?? Infinity)}
                        className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-ink hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-lg font-bold text-ink">₦{displaySide.lineCost.toLocaleString()}</p>
                      <p className="flex items-center justify-end gap-1 text-sm font-semibold text-emerald-600">
                        <Zap className="h-3.5 w-3.5" /> Satiety: {displaySide.satiety}
                      </p>
                    </div>
                  </div>
                )}

                {/* Add a side — shown for non-swallow meals when no side is present */}
                {!displaySide && displayBase?.category !== CATEGORIES.SWALLOW && availableSides.length > 0 && (
                  <div className="space-y-2">
                    {showSidePicker && (
                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        {availableSides.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => { setSidePortions(1); setShowSidePicker(false); }}
                            className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-2.5 text-sm text-ink hover:bg-slate-50 last:border-0"
                          >
                            <span className="font-medium">{s.name}</span>
                            <span className="text-slate-500">₦{s.price.toLocaleString()} per piece</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => setShowSidePicker((v) => !v)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-sm font-semibold text-slate-500 hover:border-navy hover:text-navy"
                    >
                      <Plus className="h-4 w-4" /> Add a side
                    </button>
                  </div>
                )}

                <div className="flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="max-w-sm text-sm italic text-slate-500">
                    Based on current prices, this combination provides the highest possible fullness within your ₦
                    {budget.toLocaleString()} limit.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => navigate("/app/optimizer")}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-slate-50"
                    >
                      <RefreshCw className="h-4 w-4" /> Re-optimise
                    </button>
                    {isSupabaseConfigured && (
                      <button
                        onClick={() => setSaveOpen(true)}
                        className="inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
                      >
                        <Heart className="h-4 w-4" /> Save to Favorites
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Why this meal */}
            <section className="card p-6">
              <div className="flex items-center gap-2">
                <BrainCircuit className="h-6 w-6 text-navy" />
                <h3 className="font-display text-xl font-bold text-ink">Why this meal?</h3>
              </div>
              <div className="mt-4 grid gap-6 md:grid-cols-2">
                <div>
                  <p className="font-semibold text-ink">Knapsack Logic Applied</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {isManuallyAdjusted
                      ? `You're in full manual control — swallow/base and protein portions move independently, with no fixed ratio between them. The only limits are your ₦${budget.toLocaleString()} budget and which proteins are culturally compatible with your chosen base.`
                      : `The engine selected this combination because it yields the highest total satiety (${displayRawSatiety} satiety points) while strictly staying within your ₦${budget.toLocaleString()} budget and obeying every cafeteria pairing rule. You get the most fullness for every Naira spent.`}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-ink">Budget Utilization</span>
                    <span className="font-bold text-emerald-600">{displayEfficiency}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${displayEfficiency}%` }} />
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {displayEfficiency}% of your budget was spent — ₦{displaySlack.toLocaleString()} unspent (budget slack).
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Right rail */}
          <div className="space-y-5">
            <div className="card p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Cost</p>
              <p className="mt-1 font-display text-4xl font-extrabold text-ink">
                ₦{displayCost.toLocaleString()}
                <span className="text-base font-medium text-slate-400"> / {budget.toLocaleString()}</span>
              </p>
              <p className="mt-2 inline-flex items-center gap-2 font-semibold text-emerald-600">
                <CheckCircle2 className="h-5 w-5" /> {displayCost <= budget ? "Within Budget" : "Over Budget"}
              </p>
            </div>

            <div className="card p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Satiety Score</p>
              <p className="mt-1 font-display text-4xl font-extrabold text-ink">
                {displaySatietyScore}<span className="text-base font-medium text-slate-400"> / 100</span>
              </p>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < stars ? "fill-gold text-gold" : "text-slate-300"}`} />
                  ))}
                </div>
                <span className={`text-sm font-semibold ${satisfactionTier.cls}`}>{satisfactionTier.label}</span>
              </div>
            </div>

            <div className="card border-l-4 border-l-gold p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Budget Slack</p>
              <p className="mt-1 font-display text-3xl font-extrabold text-gold-dark">₦{displaySlack.toLocaleString()}</p>
              <p className="mt-2 text-sm text-slate-500">
                {(() => {
                  const slack = displaySlack;
                  const hasPlantain = displayItems.some((i) => i.id === "plantain" || i.name?.toLowerCase().includes("plantain"));
                  if (slack === 0) return "Perfectly optimized — every Naira is spent.";
                  if (slack < 50) return "Tightly optimized — almost no waste.";
                  if (slack < 100) return `₦${slack.toLocaleString()} left over — enough for a sachet of water.`;
                  if (hasPlantain) return `₦${slack.toLocaleString()} left over. Your plantain is already included in this plan.`;
                  if (slack < 250) return `₦${slack.toLocaleString()} left over — enough for a sachet of water, just short of a bottle.`;
                  if (slack < 500) return `₦${slack.toLocaleString()} left over — enough for a bottle of water.`;
                  if (slack < 1000) return `₦${slack.toLocaleString()} left over — enough for a bottle of water or a soft drink.`;
                  return `₦${slack.toLocaleString()} left over — enough for a soft drink, with room to spare.`;
                })()}
              </p>
            </div>

            <button onClick={() => navigate("/app/trends")} className="btn-gold w-full">
              <TrendingUp className="h-4 w-4" /> View Price Trends
            </button>
          </div>
        </div>

        <Footer />
      </div>

      {saveOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setSaveOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-cardhover"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gold/15">
              <Heart className="h-6 w-6 text-gold-dark" />
            </div>
            <p className="mt-3 text-center font-display text-lg font-bold text-ink">Save this plan</p>
            <p className="mt-1 text-center text-sm text-slate-500">Give it a name so you can find it again later.</p>
            <input
              className="field mt-4"
              placeholder={`${cafe?.name || "Meal"} · ₦${budget.toLocaleString()}`}
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              maxLength={60}
            />
            {saveMsg && (
              <p className={`mt-3 text-center text-sm font-medium ${saveMsg.includes("Saved") ? "text-emerald-600" : "text-red-500"}`}>
                {saveMsg}
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setSaveOpen(false)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePlan}
                disabled={saving}
                className="btn-primary flex-1 disabled:opacity-60"
              >
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
