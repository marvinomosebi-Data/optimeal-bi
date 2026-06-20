// OptiMeal optimizer engine.
// Solves: maximize total satiety subject to budget, given the cafeteria menu,
// the diner's appetite, and the compatibility rules from the dataset spec.
//
// Rules encoded (Campus_Food_Dataset.docx) for the AUTO-OPTIMIZER:
//  - Exactly one base type per meal (Swallow | Rice/Grains | Beans | Spaghetti).
//  - Swallow  -> free soup auto-added; no plantain; no Sausage/Moimoi protein.
//  - Rice/Grains -> plantain allowed; no soup; all proteins allowed.
//  - Spaghetti -> plantain allowed; no soup; no Ponmo/Moimoi.
//  - Beans -> plantain allowed; no soup; only Egg/Beef/Chicken-variants protein;
//             dual-role halves the required protein.
//  - Total protein portions <= base portions.
//  - Max 2 protein types, max 3 total protein pieces.
//  - Crave items get a satiety bonus; Avoid items are excluded.
//
// MANUAL MODE (student explicitly adjusting via lockedBase / lockedProteins):
//  - The base<=protein ratio rule, the max-2-types rule, and the max-3-pieces
//    rule are all RELAXED — the student is deliberately choosing, so either
//    side can be larger than the other. Only two things still always hold:
//      1. Budget — the meal can never cost more than the student's budget.
//      2. Compatibility — a protein still has to be one that's actually
//         allowed with the chosen base (e.g. no Sausage with a swallow);
//         this is a cultural/menu rule, not a portion-quantity rule.
//
// NOTE on scoring: CRAVE_BONUS is a large internal number used ONLY to rank
// candidates during selection (auto mode), so a craved item always wins over
// alternatives. It must never leak into the satiety figures we display to the
// user — those are tracked separately as "rawSatiety" using true satiety values.

import { CATEGORIES, APPETITE } from "../data/dataset.js";

const CRAVE_BONUS = 1000; // selection-only — never shown to the user
const MAX_PROTEIN_TYPES  = 2;   // auto-optimizer only
const MAX_PROTEIN_PIECES = 3;   // auto-optimizer only
// Manual mode has no realistic "this many portions" ceiling from the dataset —
// the only real limit is the student's budget. This is just a sane upper bound
// so the UI never offers an absurd number of taps; budget binds well before this.
const MANUAL_PORTION_CEILING = 20;

function isSwallow(i) { return i.category === CATEGORIES.SWALLOW; }
function isGrains(i) { return i.category === CATEGORIES.GRAINS; }
function isProtein(i) { return i.category === CATEGORIES.PROTEIN; }
function isBeans(i) { return i.id === "beans" || i.id === "rice_beans"; }
function isSpaghetti(i) { return i.id === "spaghetti" || i.id === "jollof_spaghetti"; }
function isChickenVariant(i) {
  return ["chicken", "chicken_large", "big_chicken"].includes(i.id);
}

// Which proteins are allowed for a given base item. This is a COMPATIBILITY
// rule (what's culturally/menu-correct to pair), not a quantity rule — it
// still applies in manual mode.
function proteinAllowed(base, protein) {
  if (isBeans(base)) {
    return protein.id === "egg" || protein.id === "beef" || isChickenVariant(protein);
  }
  if (isSpaghetti(base)) {
    return protein.id !== "ponmo" && protein.id !== "moimoi";
  }
  if (isSwallow(base)) {
    return protein.id !== "sausage" && protein.id !== "moimoi";
  }
  // plain rice / jollof: all proteins
  return true;
}

// Exported so the UI can build a "swap protein" dropdown limited to what's
// actually valid (compatible) for the current base item.
export function allowedProteinsFor(base, menu) {
  if (!base) return [];
  return menu.filter((i) => i.category === CATEGORIES.PROTEIN && proteinAllowed(base, i));
}

// AUTO-OPTIMIZER ONLY: given the base's portion count (and beans' dual-role
// halving), what's the ceiling on total protein pieces? Manual mode does not
// use this — protein is independent of base portions there.
export function proteinCapFor(base, basePortions) {
  if (!base) return 0;
  const byBase = isBeans(base) ? Math.max(0, Math.ceil(basePortions / 2)) : basePortions;
  return Math.min(byBase, MAX_PROTEIN_PIECES);
}

// Selection-ranking score (internal only) — true satiety plus a large bonus
// for craved items, so the optimizer always prefers what the student craves.
function rankScore(item, craveSet) {
  return item.satiety + (craveSet.has(item.id) ? CRAVE_BONUS : 0);
}

// Helper for the AUTO-OPTIMIZER's UI: caps by both the item's realistic
// maxPortions ceiling AND the budget. Used when nothing is manually locked.
export function maxAffordablePortions(baseItem, budget) {
  if (!baseItem || baseItem.price <= 0) return baseItem?.maxPortions ?? 1;
  const byBudget = Math.floor(budget / baseItem.price);
  return Math.max(1, Math.min(baseItem.maxPortions, byBudget));
}

// Helper for MANUAL mode (both base AND protein steppers): caps by budget
// only (plus a generous sanity ceiling), ignoring the dataset's
// realistic-suggestion maxPortions and ignoring any base<->protein ratio.
export function manualMaxPortions(item, budget) {
  if (!item || item.price <= 0) return MANUAL_PORTION_CEILING;
  const byBudget = Math.floor(budget / item.price);
  return Math.max(1, Math.min(MANUAL_PORTION_CEILING, byBudget));
}

/**
 * @param {Object} opts
 * @param {Array}  opts.menu       effective cafeteria menu
 * @param {number} opts.budget     naira budget
 * @param {string} opts.appetite   "Light" | "Normal" | "Large"
 * @param {Set}    opts.crave      set of item ids to favor
 * @param {Set}    opts.avoid      set of item ids to exclude
 * @param {Object} [opts.lockedBase] manual override: { id, portions }.
 *   Fixes the base item at an exact portion count, with NO ceiling besides
 *   budget and the sanity cap — manual mode, not auto-suggestion mode.
 * @param {Array}  [opts.lockedProteins] manual override:
 *   [{ id, portions }, ...] — fixes the EXACT proteins (type + quantity).
 *   In manual mode this is free of the base<=protein ratio, the max-2-types
 *   rule, and the max-3-pieces rule. Only compatibility and budget apply.
 */
export function optimizeMeal({
  menu, budget, appetite = "Normal", crave = new Set(), avoid = new Set(),
  lockedBase = null, lockedProteins = null,
}) {
  const targetStaple = APPETITE[appetite]?.staplePortions ?? 2;
  const available = menu.filter((i) => !avoid.has(i.id));
  const manualMode = Boolean(lockedBase || lockedProteins);

  let bases = available.filter((i) => isSwallow(i) || isGrains(i));
  const proteins = available.filter(isProtein);
  const plantain = available.find((i) => i.id === "plantain");
  const soups = available.filter((i) => i.category === CATEGORIES.SOUP);

  // Manual override: restrict the search to exactly the chosen base item.
  if (lockedBase) {
    bases = bases.filter((b) => b.id === lockedBase.id);
  }

  let best = null;

  for (const base of bases) {
    // Manual override fixes the exact portion count. Unlike the auto-optimizer,
    // manual mode is NOT capped by the dataset's realistic maxPortions — the
    // student is deliberately choosing, so only budget (checked below) and the
    // generous sanity ceiling apply.
    const fixedPortions = lockedBase ? Math.min(lockedBase.portions, MANUAL_PORTION_CEILING) : null;
    const maxBaseP = fixedPortions ?? Math.min(base.maxPortions, targetStaple);
    const minBaseP = fixedPortions ?? 1;
    for (let bp = minBaseP; bp <= maxBaseP; bp++) {
      const baseCost = base.price * bp;
      if (baseCost > budget) break;

      const items = [{ ...base, portions: bp, lineCost: base.price * bp, lineSatiety: base.satiety * bp }];
      let cost = baseCost;
      let rankTotal = rankScore(base, crave) * bp;   // internal ranking only
      let rawSatiety = base.satiety * bp;             // true, displayable satiety

      // Swallow auto-adds one free soup (best available, crave-aware).
      if (isSwallow(base) && soups.length) {
        const soup = soups.reduce((a, b) => (rankScore(b, crave) > rankScore(a, crave) ? b : a));
        items.push({ ...soup, portions: 1, lineCost: 0, lineSatiety: soup.satiety });
        rankTotal += rankScore(soup, crave);
        rawSatiety += soup.satiety;
      }

      let candidate;
      if (lockedProteins) {
        // MANUAL MODE: no base<=protein ratio, no type/piece ceiling.
        // Only compatibility (still cultural/menu rules) and budget apply.
        candidate = applyLockedProteins({
          base, proteins, lockedProteins, budgetLeft: budget - cost,
        });
        if (!candidate) continue; // manual protein selection invalid for this base — skip
      } else {
        // AUTO-OPTIMIZER: full rule set, including base<=protein ratio.
        const proteinCap = proteinCapFor(base, bp);
        candidate = greedyProteins({
          base, proteins, crave, budgetLeft: budget - cost,
          proteinCap, maxTypes: MAX_PROTEIN_TYPES, maxPieces: MAX_PROTEIN_PIECES,
        });
      }
      cost += candidate.cost;
      rankTotal += candidate.rankTotal;
      rawSatiety += candidate.rawSatiety;
      items.push(...candidate.items);

      // Plantain side allowed for non-swallow bases; fill leftover budget.
      if (!isSwallow(base) && plantain) {
        let pieces = 0;
        while (pieces < plantain.maxPortions && cost + plantain.price <= budget) {
          cost += plantain.price; pieces++;
        }
        if (pieces > 0) {
          rankTotal += rankScore(plantain, crave) * pieces;
          rawSatiety += plantain.satiety * pieces;
          items.push({ ...plantain, portions: pieces, lineCost: plantain.price * pieces, lineSatiety: plantain.satiety * pieces });
        }
      }

      // Compare candidates using rankTotal (so craving still wins ties/selection),
      // but store rawSatiety as the figure we'll actually display.
      if (cost <= budget && (!best || rankTotal > best.rankTotal || (rankTotal === best.rankTotal && cost < best.cost))) {
        best = { items, cost, rankTotal, rawSatiety, base: base.name };
      }
    }
  }

  if (!best) {
    return { feasible: false, items: [], cost: 0, satiety: 0, satietyScore: 0, slack: budget, efficiency: 0 };
  }

  // Normalized 0-100 satiety score, based on the CLEAN satiety value
  // (no crave bonus). Scaled against a very filling reference meal
  // (~44 raw satiety) so everyday budgets land in a believable band.
  const reference = 44;
  const satietyScore = Math.min(100, Math.round((best.rawSatiety / reference) * 100));
  const slack = budget - best.cost;
  // Budget utilization: how much of the allotted budget was actually spent.
  const efficiency = Math.round((best.cost / budget) * 100);

  return {
    feasible: true,
    items: best.items,
    cost: best.cost,
    satiety: best.rawSatiety,   // clean, human-meaningful satiety total
    satietyScore,
    slack,
    efficiency,                 // budget utilization %, NOT a quality score
    base: best.base,
    manualMode,
  };
}

// AUTO-OPTIMIZER protein selection: maximize satiety within the protein
// budget and limits. Craved proteins are prioritized first, then remaining
// picks rank by absolute satiety (so a generous budget upgrades to richer
// proteins rather than buying many cheap low-satiety pieces).
function greedyProteins({ base, proteins, crave, budgetLeft, proteinCap, maxTypes, maxPieces }) {
  const allowed = proteins.filter((p) => proteinAllowed(base, p));

  // Craved first; then by satiety desc, then by satiety-per-naira as tiebreak.
  const ranked = [...allowed].sort((a, b) => {
    const ca = crave.has(a.id) ? 1 : 0;
    const cb = crave.has(b.id) ? 1 : 0;
    if (ca !== cb) return cb - ca;
    if (b.satiety !== a.satiety) return b.satiety - a.satiety;
    return rankScore(b, crave) / b.price - rankScore(a, crave) / a.price;
  });

  const items = [];
  let cost = 0, rankTotal = 0, rawSatiety = 0, types = 0, pieces = 0;

  for (const p of ranked) {
    if (types >= maxTypes || pieces >= maxPieces || pieces >= proteinCap) break;

    let portions = 0;
    const room = Math.min(p.maxPortions, maxPieces - pieces, proteinCap - pieces);
    while (portions < room && cost + p.price <= budgetLeft) {
      cost += p.price; portions++;
    }
    if (portions > 0) {
      items.push({ ...p, portions, lineCost: p.price * portions, lineSatiety: p.satiety * portions });
      rankTotal += rankScore(p, crave) * portions;
      rawSatiety += p.satiety * portions;
      pieces += portions; types++;
    }
  }
  return { items, cost, rankTotal, rawSatiety };
}

// MANUAL MODE: validates and prices an explicit, student-chosen protein
// selection. Only two things can invalidate it — an incompatible protein for
// this base, or going over budget. The base<=protein ratio, the max-2-types
// rule, and the max-3-pieces rule do NOT apply here, by design: the student
// has full freedom to have more protein than swallow, or vice versa.
function applyLockedProteins({ base, proteins, lockedProteins, budgetLeft }) {
  const items = [];
  let cost = 0, rankTotal = 0, rawSatiety = 0;

  for (const sel of lockedProteins) {
    const p = proteins.find((x) => x.id === sel.id);
    if (!p) return null;                          // not on this cafeteria's menu
    if (!proteinAllowed(base, p)) return null;     // not compatible with this base
    const portions = Math.max(0, Math.min(sel.portions, MANUAL_PORTION_CEILING));
    if (portions === 0) continue;

    items.push({ ...p, portions, lineCost: p.price * portions, lineSatiety: p.satiety * portions });
    cost += p.price * portions;
    rankTotal += p.satiety * portions;             // no crave bonus needed; selection is explicit
    rawSatiety += p.satiety * portions;
  }

  if (cost > budgetLeft) return null;              // the only hard quantity-side limit: budget

  return { items, cost, rankTotal, rawSatiety };
}