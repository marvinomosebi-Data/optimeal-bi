import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  IdCard, Lock, Mail, Eye, EyeOff,
  UserPlus, LogIn, RefreshCw, ShieldCheck,
  ArrowLeft, CheckCircle2
} from "lucide-react";
import {
  signIn, signUp, resetPasswordByRecoveryEmail,
  getSession, getRole, supabase
} from "../lib/supabase.js";
import { ID_EXAMPLES, formatIdInput } from "../lib/identity.js";

/* ── Logo SVG ── */
function Logo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="#0B1F3A"/>
      {/* Bowl */}
      <ellipse cx="20" cy="26" rx="10" ry="4" fill="none" stroke="#F5C84B" strokeWidth="2"/>
      <path d="M10 26 Q10 34 20 34 Q30 34 30 26" fill="#F5C84B" fillOpacity="0.3" stroke="#F5C84B" strokeWidth="1.5"/>
      {/* L shape */}
      <path d="M11 10 L11 24 L18 24" stroke="#F5C84B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Analytics bars */}
      <rect x="22" y="14" width="3" height="8" rx="1" fill="#F5C84B" opacity="0.9"/>
      <rect x="26.5" y="11" width="3" height="11" rx="1" fill="#F5C84B"/>
      <rect x="31" y="16" width="3" height="6" rx="1" fill="#F5C84B" opacity="0.7"/>
    </svg>
  );
}

function ResetCard({ children, onBack, err }) {
  return (
    <div className="bg-dotted relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <button onClick={onBack}
          className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-navy">
          <ArrowLeft className="h-4 w-4" /> Back to Sign In
        </button>
        <div className="card p-8">
          <div className="mb-6 flex items-center gap-3">
            <Logo size={44} />
            <div>
              <p className="font-display text-base font-extrabold leading-none text-ink">OptiMeal BI</p>
              <p className="text-xs font-medium text-emerald-600">Password Recovery</p>
            </div>
          </div>
          {err && (
            <p className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600">{err}</p>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const [tab, setTab]                     = useState("in");
  const [idNumber, setIdNumber]           = useState("");
  const [name, setName]                   = useState("");
  const [bowenEmail, setBowenEmail]       = useState("");
  const [resetEmail, setResetEmail]       = useState("");
  const [pw, setPw]                       = useState("");
  const [confirmPw, setConfirmPw]         = useState("");
  const [showPw, setShowPw]               = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading]             = useState(false);
  const [err, setErr]                     = useState("");
  const [msg, setMsg]                     = useState("");
  const [isRecovery, setIsRecovery]       = useState(false);

  useEffect(() => {
    if (!supabase) return;

    // Listen FIRST before checking session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        // User clicked the reset link — show new password form
        setIsRecovery(true);
        setTab("newpw");
        setErr("");
        return;
      }
      if (event === "SIGNED_IN" && !isRecovery) {
        getRole().then(role => {
          navigate(role === "admin" ? "/app/admin" : "/app/plan", { replace: true });
        });
      }
    });

    // Check existing session (but not during recovery)
    getSession().then(async (s) => {
      if (s && !isRecovery) {
        // Check if this session was from a recovery link
        const hash = window.location.hash;
        if (hash.includes("type=recovery")) {
          setIsRecovery(true);
          setTab("newpw");
          return;
        }
        const role = await getRole();
        navigate(role === "admin" ? "/app/admin" : "/app/plan", { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSignIn(e) {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      await signIn(idNumber, pw);
      const role = await getRole();
      navigate(role === "admin" ? "/app/admin" : "/app/plan", { replace: true });
    } catch (ex) {
      setErr(ex.message || "Sign-in failed.");
    } finally { setLoading(false); }
  }

  async function handleSignUp(e) {
    e.preventDefault();
    setErr(""); setLoading(true);
    if (pw.length < 6) { setErr("Password must be at least 6 characters."); setLoading(false); return; }
    try {
      await signUp(idNumber, pw, name, bowenEmail);
      setTab("verify");
    } catch (ex) {
      setErr(ex.message || "Sign-up failed.");
    } finally { setLoading(false); }
  }

  async function handleReset(e) {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      await resetPasswordByRecoveryEmail(resetEmail);
      setTab("check");
    } catch (ex) {
      setErr(ex.message || "Could not send reset email.");
    } finally { setLoading(false); }
  }

  async function handleUpdatePw(e) {
    e.preventDefault();
    setErr(""); setLoading(true);
    if (pw.length < 6) { setErr("Password must be at least 6 characters."); setLoading(false); return; }
    if (pw !== confirmPw) { setErr("Passwords do not match."); setLoading(false); return; }
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      setIsRecovery(false);
      setTab("done");
    } catch (ex) {
      setErr(ex.message || "Could not update password.");
    } finally { setLoading(false); }
  }

  const eyeBtn = (
    <button type="button" onClick={() => setShowPw(s => !s)}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-navy">
      {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
    </button>
  );
  const confirmEyeBtn = (
    <button type="button" onClick={() => setShowConfirmPw(s => !s)}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-navy">
      {showConfirmPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
    </button>
  );

  function backToSignIn() { setTab("in"); setErr(""); setMsg(""); setIsRecovery(false); }

  /* ══ RESET STEP 1 — Enter email ══ */
  if (tab === "reset") return (
    <ResetCard onBack={backToSignIn} err={err}>
      <h2 className="font-display text-2xl font-bold text-ink">Forgot your password?</h2>
      <p className="mt-1 mb-6 text-sm text-slate-500">Enter your Bowen email and we'll send you a reset link.</p>
      <form onSubmit={handleReset} className="space-y-4">
        <div>
          <label htmlFor="reset-email" className="mb-1.5 block text-sm font-semibold text-ink">Email Address</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input id="reset-email" name="reset-email" type="email" className="field pl-11"
              placeholder="yourname@bowen.edu.ng" value={resetEmail}
              onChange={e => setResetEmail(e.target.value)}
              autoComplete="email" autoCorrect="off" autoCapitalize="none" spellCheck="false" />
          </div>
        </div>
        <button type="submit" disabled={loading || !resetEmail} className="btn-primary w-full py-3.5 disabled:opacity-60">
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Send Reset Link →"}
        </button>
      </form>
    </ResetCard>
  );

  /* ══ RESET STEP 2 — Check email ══ */
  if (tab === "check") return (
    <ResetCard onBack={backToSignIn} err={err}>
      <div className="text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-navy/10">
          <Mail className="h-8 w-8 text-navy" />
        </div>
        <h2 className="font-display text-2xl font-bold text-ink">Check your email</h2>
        <p className="mt-2 text-sm text-slate-500">
          We sent a reset link to <span className="font-semibold text-ink">{resetEmail}</span>
        </p>
        <div className="mt-5 rounded-xl bg-slate-50 border border-slate-200 p-4 text-left text-sm text-slate-600">
          <p className="font-semibold text-ink mb-2">Next steps:</p>
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Open your Bowen email inbox</li>
            <li>Find the email from <strong>OptiMeal BI</strong></li>
            <li>Click the <strong>Reset Password</strong> button in the email</li>
            <li>You'll be brought back here automatically to set your new password</li>
          </ol>
        </div>
        <p className="mt-3 text-xs text-slate-400">Check spam if you don't see it. Link expires in 1 hour.</p>
        <button type="button" onClick={() => { setTab("reset"); setErr(""); }}
          className="mt-4 text-sm font-semibold text-gold-dark hover:underline">
          ← Try a different email
        </button>
      </div>
    </ResetCard>
  );

  /* ══ RESET STEP 3 — Set new password ══ */
  if (tab === "newpw") return (
    <ResetCard onBack={() => { setIsRecovery(false); backToSignIn(); }} err={err}>
      <h2 className="font-display text-2xl font-bold text-ink">Set new password</h2>
      <p className="mt-1 mb-6 text-sm text-slate-500">Choose a strong password for your account.</p>
      <form onSubmit={handleUpdatePw} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-ink">New Password</label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input type={showPw ? "text" : "password"} className="field pl-11 pr-11"
              placeholder="At least 6 characters" value={pw} onChange={e => setPw(e.target.value)} />
            {eyeBtn}
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-ink">Confirm New Password</label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input type={showConfirmPw ? "text" : "password"} className="field pl-11 pr-11"
              placeholder="Repeat password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} />
            {confirmEyeBtn}
          </div>
          {confirmPw && pw !== confirmPw && <p className="mt-1.5 text-xs font-medium text-red-500">Passwords do not match</p>}
          {confirmPw && pw === confirmPw && pw.length >= 6 && <p className="mt-1.5 text-xs font-medium text-emerald-600">✓ Passwords match</p>}
        </div>
        <button type="submit" disabled={loading || pw.length < 6 || pw !== confirmPw}
          className="btn-primary w-full py-3.5 disabled:opacity-60">
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Update Password →"}
        </button>
      </form>
    </ResetCard>
  );

  /* ══ RESET STEP 4 — Success ══ */
  if (tab === "done") return (
    <div className="bg-dotted relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="card p-8 text-center">
          <div className="mb-6 flex items-center justify-center gap-3">
            <Logo size={44} />
            <div className="text-left">
              <p className="font-display text-base font-extrabold leading-none text-ink">OptiMeal BI</p>
              <p className="text-xs font-medium text-emerald-600">Password Recovery</p>
            </div>
          </div>
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <h2 className="font-display text-2xl font-bold text-ink">Password updated! 🎉</h2>
          <p className="mt-2 mb-6 text-sm text-slate-500">Your password has been updated. You can now sign in.</p>
          <button onClick={backToSignIn} className="btn-primary w-full py-3.5">Sign In →</button>
        </div>
      </div>
    </div>
  );

  /* ══ MAIN LOGIN / SIGNUP ══ */
  return (
    <div className="bg-dotted relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <Logo size={64} />
          <h1 className="mt-4 font-display text-3xl font-extrabold text-ink">OptiMeal BI</h1>
          <p className="mt-1 text-slate-500">Bowen University Business Intelligence Portal</p>
        </div>

        <div className="card mt-8 p-7">
          {(tab === "in" || tab === "up") && (
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
              {[["in","Sign In"],["up","Create Account"]].map(([t, label]) => (
                <button key={t} type="button"
                  onClick={() => { setTab(t); setErr(""); setMsg(""); }}
                  className={`rounded-lg py-2.5 text-sm font-semibold transition ${tab===t ? "bg-white text-ink shadow-sm" : "text-slate-500"}`}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {err && <p className="mt-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600">{err}</p>}
          {msg && <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">{msg}</p>}

          {/* SIGN IN */}
          {tab === "in" && (
            <form onSubmit={handleSignIn} className="mt-6 space-y-5">
              <div>
                <label className="text-sm font-semibold text-ink">Matric / Staff ID</label>
                <div className="mt-2 relative">
                  <IdCard className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input type="text" className="field pl-11 font-mono tracking-wide"
                    placeholder={`${ID_EXAMPLES.student} or ${ID_EXAMPLES.staff}`}
                    value={idNumber} onChange={e => setIdNumber(formatIdInput(e.target.value))} autoComplete="off" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-ink">Password</label>
                  <button type="button" onClick={() => { setTab("reset"); setErr(""); setMsg(""); }}
                    className="text-sm font-semibold text-gold-dark hover:underline">Forgot password?</button>
                </div>
                <div className="mt-2 relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input type={showPw ? "text" : "password"} className="field pl-11 pr-11"
                    placeholder="••••••••" value={pw} onChange={e => setPw(e.target.value)} />
                  {eyeBtn}
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 disabled:opacity-60">
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <><LogIn className="h-4 w-4" /> Sign In</>}
              </button>
            </form>
          )}

          {/* SIGN UP */}
          {tab === "up" && (
            <form onSubmit={handleSignUp} className="mt-6 space-y-5">
              <div>
                <label className="text-sm font-semibold text-ink">Full name</label>
                <div className="mt-2 relative">
                  <UserPlus className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input type="text" className="field pl-11" placeholder="Omosebi Marvellous"
                    value={name} onChange={e => setName(e.target.value)} autoComplete="off" />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-ink">Matric / Staff ID</label>
                <div className="mt-2 relative">
                  <IdCard className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input type="text" className="field pl-11 font-mono tracking-wide"
                    placeholder={`${ID_EXAMPLES.student} or ${ID_EXAMPLES.staff}`}
                    value={idNumber} onChange={e => setIdNumber(formatIdInput(e.target.value))} autoComplete="off" />
                </div>
                <p className="mt-1.5 text-xs text-slate-400">Student: {ID_EXAMPLES.student} · Staff: {ID_EXAMPLES.staff}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-ink">Bowen University email</label>
                <div className="mt-2 relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input type="email" className="field pl-11" placeholder="yourname@bowen.edu.ng"
                    value={bowenEmail} onChange={e => setBowenEmail(e.target.value)} autoComplete="email" />
                </div>
                <p className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-400">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Required to verify your identity.
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold text-ink">Password</label>
                <div className="mt-2 relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input type={showPw ? "text" : "password"} className="field pl-11 pr-11"
                    placeholder="At least 6 characters" value={pw} onChange={e => setPw(e.target.value)} />
                  {eyeBtn}
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 disabled:opacity-60">
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <><UserPlus className="h-4 w-4" /> Create Account</>}
              </button>
            </form>
          )}

          {/* VERIFY EMAIL */}
          {tab === "verify" && (
            <div className="mt-6 space-y-5 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50">
                <Mail className="h-7 w-7 text-emerald-600" />
              </div>
              <div>
                <p className="font-display text-lg font-bold text-ink">Check your Bowen email</p>
                <p className="mt-2 text-sm text-slate-500">
                  We sent a confirmation link to <span className="font-semibold text-ink">{bowenEmail}</span>.
                  Click it to verify, then sign in.
                </p>
              </div>
              <button type="button" onClick={() => { setTab("in"); setErr(""); setMsg(""); }}
                className="btn-primary w-full py-3.5">Go to Sign In</button>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Accounts are for Bowen University students and staff only.
        </p>
      </div>
    </div>
  );
}
