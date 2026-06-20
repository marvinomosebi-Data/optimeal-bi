// ID-based identity for OptiMeal.
// Students and staff log in with their University ID, not an email address.
// Supabase Auth requires an email under the hood, so we deterministically
// translate a valid ID into a private, never-shown "<id>@optimeal.local"
// address. The person only ever sees their own ID.

const STUDENT_RE = /^BU\d{2}[A-Z]{3}\d{4}$/i;           // e.g. BU22CSC1080
const STAFF_RE   = /^BUI\/ACAD\/SS\/\d{4}$/i;            // e.g. BUI/ACAD/SS/0427

export const ID_EXAMPLES = {
  student: "BU22CSC1080",
  staff:   "BUI/ACAD/SS/0427",
};

export function detectIdRole(id) {
  const clean = (id || "").trim().toUpperCase();
  if (STUDENT_RE.test(clean)) return "student";
  if (STAFF_RE.test(clean)) return "staff";
  return null;
}

export function validateId(id) {
  const role = detectIdRole(id);
  if (!role) {
    return {
      valid: false,
      error: `Enter a valid Matric Number (e.g. ${ID_EXAMPLES.student}) or Staff ID (e.g. ${ID_EXAMPLES.staff}).`,
    };
  }
  return { valid: true, role };
}

// Deterministic, private — never shown to the person.
export function idToInternalEmail(id) {
  const clean = (id || "").trim().toUpperCase().replace(/\//g, "-");
  return `${clean.toLowerCase()}@optimeal.local`;
}

export function formatIdInput(id) {
  return (id || "").trim().toUpperCase();
}

// Anti-forgery gate: a real Bowen University email is required at sign-up.
// Only Bowen controls who can receive mail at this domain, so a confirmed
// link to one is a much stronger identity signal than a self-typed ID alone.
const BOWEN_EMAIL_RE = /^[a-zA-Z0-9._%+-]+@bowen\.edu\.ng$/;

export function validateBowenEmail(email) {
  const clean = (email || "").trim().toLowerCase();
  if (!BOWEN_EMAIL_RE.test(clean)) {
    return { valid: false, error: "Enter a valid Bowen University email (e.g. yourname@bowen.edu.ng)." };
  }
  return { valid: true, email: clean };
}