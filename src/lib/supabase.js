import { createClient } from "@supabase/supabase-js";
import { validateId, validateBowenEmail } from "./identity.js";

const url  = import.meta.env.VITE_SUPABASE_URL;
const key  = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && key);
export const supabase = isSupabaseConfigured ? createClient(url, key) : null;

/* ── Auth — the bowen.edu.ng email IS the real Supabase Auth identity now,
      so sign-up uses Supabase's native, standard email-confirmation flow
      (real inbox delivery, no extra steps). The person still only ever
      TYPES their Matric/Staff ID though — a small lookup table (id_lookup)
      resolves "ID -> bowen email" before signing in, since the client can't
      query auth.users directly to find it. ── */

export async function signIn(idNumber, password) {
  if (!supabase) throw new Error("Supabase not configured");
  const check = validateId(idNumber);
  if (!check.valid) throw new Error(check.error);

  const cleanId = idNumber.trim().toUpperCase();
  const { data: lookup, error: lookupErr } = await supabase
    .from("id_lookup")
    .select("bowen_email")
    .eq("id_number", cleanId)
    .maybeSingle();

  if (lookupErr || !lookup) {
    throw new Error("That ID isn't registered. Check your ID or create an account.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: lookup.bowen_email, password,
  });
  if (error) {
    if (error.message?.toLowerCase().includes("invalid login")) {
      throw new Error("That ID or password is incorrect.");
    }
    if (error.message?.toLowerCase().includes("email not confirmed")) {
      throw new Error("Please verify your Bowen email first — check your inbox for the confirmation link.");
    }
    throw error;
  }
  return data;
}

export async function signUp(idNumber, password, fullName, bowenEmail) {
  if (!supabase) throw new Error("Supabase not configured");
  const idCheck = validateId(idNumber);
  if (!idCheck.valid) throw new Error(idCheck.error);

  const emailCheck = validateBowenEmail(bowenEmail);
  if (!emailCheck.valid) throw new Error(emailCheck.error);

  const cleanId = idNumber.trim().toUpperCase();

  // The bowen email IS the Supabase Auth email — this triggers Supabase's
  // standard, reliable confirmation-link email, sent to the real inbox.
  const { data, error } = await supabase.auth.signUp({
    email: emailCheck.email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: "student", // public sign-up is always student
        id_number: cleanId,
        id_role_hint: idCheck.role, // "student" | "staff" — does NOT grant admin
      },
    },
  });
  if (error) {
    if (error.message?.toLowerCase().includes("already registered")) {
      throw new Error("This email is already registered. Try signing in instead.");
    }
    throw error;
  }

  // Record the ID -> email mapping so sign-in-by-ID can resolve it later.
  // Safe to do without a session — the insert policy allows it.
  const { error: lookupErr } = await supabase.from("id_lookup").insert({
    id_number: cleanId,
    bowen_email: emailCheck.email,
    user_id: data?.user?.id ?? null,
  });
  if (lookupErr) {
    if (lookupErr.message?.toLowerCase().includes("duplicate")) {
      throw new Error("This ID is already registered. Try signing in instead.");
    }
    // Non-fatal otherwise — the auth account exists either way.
  }

  return data;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

// Password recovery — sends a 6-digit OTP to the user's email
export async function resetPasswordByRecoveryEmail(bowenEmail) {
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase.auth.resetPasswordForEmail(bowenEmail, {
    redirectTo: window.location.origin + "/",
  });
  if (error) throw error;
}

// Verify the 6-digit OTP sent to the user's email during password reset
export async function verifyPasswordResetOtp(bowenEmail, token) {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.auth.verifyOtp({
    email: bowenEmail,
    token,
    type: "recovery",
  });
  if (error) throw error;
  return data;
}

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session ?? null;
}

export async function getRole() {
  if (!supabase) return "student";
  const { data } = await supabase.auth.getUser();
  return data?.user?.user_metadata?.role ?? "student";
}

/* ── Saved meal plans / Favorites ── */

export async function saveMealPlan({ planName, cafeId, cafeName, budget, appetite, items, totalCost, satietyScore }) {
  if (!supabase) throw new Error("Supabase not configured");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("You need to be signed in to save a plan.");

  const { data, error } = await supabase.from("saved_plans").insert({
    user_id: user.id,
    plan_name: planName || null,
    cafe_id: cafeId,
    cafe_name: cafeName,
    budget,
    appetite,
    items,
    total_cost: totalCost,
    satiety_score: satietyScore,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function fetchSavedPlans() {
  if (!supabase) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("saved_plans")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return [];
  return data || [];
}

export async function deleteSavedPlan(planId) {
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase.from("saved_plans").delete().eq("id", planId);
  if (error) throw error;
}