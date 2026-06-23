import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, IdCard, Lock, Mail, Eye, EyeOff, UserPlus, LogIn, RefreshCw, ShieldCheck, KeyRound, ArrowLeft } from "lucide-react";
import { signIn, signUp, resetPasswordByRecoveryEmail, verifyPasswordResetOtp, getSession, getRole, supabase } from "../lib/supabase.js";
import { ID_EXAMPLES, formatIdInput } from "../lib/identity.js";

const Field = ({ icon: Icon, type, placeholder, value, onChange, right, mono, maxLength }) => (
  <div className="relative">
    <Icon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
    <input
      type={type || "text"}
      className={`field pl-11 pr-11 ${mono ? "font-mono tracking-wide" : ""}`}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoComplete="off"
      autoCapitalize="characters"
      maxLength={maxLength}
    />
    {right}
  </div>
);

// tabs: "in" | "up" | "verify" | "reset" | "otp" | "newpw"
export default function Login() {
  const navigate = useNavigate();
  const [tab, setTab]               = useState("in");
  const [idNumber, setIdNumber]     = useState("");
  const [name, setName]             = useState("");
  const [bowenEmail, setBowenEmail] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [otpCode, setOtpCode]       = useState("");
  const [pw, setPw]                 = useState("");
  const [confirmPw, setConfirmPw]   = useState("");
  const [showPw, setShowPw]         = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [err, setErr]               = useState("");
  const [msg, setMsg]               = useState("");

  useEffect(() => {
    getSession().then(async (s) => {
      if (s) {
        const role = await getRole();
        navigate(role === "admin" ? "/app/admin" : "/app/plan", { replace: true });
      }
    });
    // If someone clicks the reset link and lands back here with a session,
    // detect the PASSWORD_RECOVERY event and skip straight to newpw.
    if (supabase) {
      supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") setTab("newpw");
      });
    }
  }, []);

  const go = (role) => navigate(role === "admin" ? "/app/admin" : "/app/plan", { replace: true });

  async function handleSignIn(e) {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      await signIn(idNumber, pw);
      const role = await getRole();
      go(role);
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

  // Step 1: send OTP email
  async function handleReset(e) {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      await resetPasswordByRecoveryEmail(resetEmail);
      setMsg("");
      setOtpCode("");
      setTab("otp");
    } catch (ex) {
      setErr(ex.message || "Could not send reset email.");
    } finally { setLoading(false); }
  }

  // Step 2: verify the 6-digit OTP
  async function handleVerifyOtp(e) {
    e.preventDefault();
    setErr(""); setLoading(true);
    const clean = otpCode.replace(/\s/g, "");
    if (clean.length !== 6 || !/^\d{6}$/.test(clean)) {
      setErr("Please enter the 6-digit code from your email.");
      setLoading(false);
      return;
    }
    try {
      await verifyPasswordResetOtp(resetEmail, clean);
      setPw("");
      setConfirmPw("");
      setTab("newpw");
    } catch (ex) {
      setErr(ex.message || "Invalid or expired code. Please try again.");
    } finally { setLoading(false); }
  }

  // Step 3: set the new password
  async function handleUpdatePw(e) {
    e.preventDefault();
    setErr(""); setLoading(true);
    if (pw.length < 6) {
      setErr("Password must be at least 6 characters.");
      setLoading(false); return;
    }
    if (pw !== confirmPw) {
      setErr("Passwords do not match.");
      setLoading(false); return;
    }
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      setMsg("Password updated successfully. Please sign in with your new password.");
      setTab("in");
    } catch (ex) {
      setErr(ex.message || "Could not update password.");
    } finally { setLoading(false); }
  }

  const eyeBtn = (
    <button type="button" onClick={() => setShowPw((s) => !s)}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-navy">
      {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
    </button>
  );

  const confirmEyeBtn = (
    <button type="button" onClick={() => setShowConfirmPw((s) => !s)}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-navy">
      {showConfirmPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
    </button>
  );

  function backToSignIn() { setTab("in"); setErr(""); setMsg(""); setOtpCode(""); }

  return (
    <div className="bg-dotted relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-navy shadow-cardhover">
            <BarChart3 className="h-8 w-8 text-gold" />
          </div>
          <h1 className="mt-5 font-display text-3xl font-extrabold text-ink">OptiMeal BI</h1>
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
                <div className="mt-2">
                  <Field icon={IdCard} placeholder={`${ID_EXAMPLES.student} or ${ID_EXAMPLES.staff}`}
                    value={idNumber} onChange={(v) => setIdNumber(formatIdInput(v))} mono />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-ink">Password</label>
                  <button type="button" onClick={() => { setTab("reset"); setErr(""); setMsg(""); }}
                    className="text-sm font-semibold text-gold-dark hover:underline">Forgot password?</button>
                </div>
                <div className="mt-2">
                  <Field icon={Lock} type={showPw ? "text" : "password"} placeholder="••••••••" value={pw} onChange={setPw} right={eyeBtn} />
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
                <div className="mt-2"><Field icon={UserPlus} placeholder="Omosebi Marvellous" value={name} onChange={setName} /></div>
              </div>
              <div>
                <label className="text-sm font-semibold text-ink">Matric / Staff ID</label>
                <div className="mt-2">
                  <Field icon={IdCard} placeholder={`${ID_EXAMPLES.student} or ${ID_EXAMPLES.staff}`}
                    value={idNumber} onChange={(v) => setIdNumber(formatIdInput(v))} mono />
                </div>
                <p className="mt-1.5 text-xs text-slate-400">
                  Student: {ID_EXAMPLES.student} &nbsp;·&nbsp; Staff: {ID_EXAMPLES.staff}
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold text-ink">Bowen University email</label>
                <div className="mt-2"><Field icon={Mail} type="email" placeholder="yourname@bowen.edu.ng" value={bowenEmail} onChange={setBowenEmail} /></div>
                <p className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-400">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Required to verify your identity and prevent fake IDs. We'll send a confirmation link here.
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold text-ink">Password</label>
                <div className="mt-2">
                  <Field icon={Lock} type={showPw ? "text" : "password"} placeholder="At least 6 characters" value={pw} onChange={setPw} right={eyeBtn} />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 disabled:opacity-60">
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <><UserPlus className="h-4 w-4" /> Create Account</>}
              </button>
            </form>
          )}

          {/* VERIFY — shown right after sign-up */}
          {tab === "verify" && (
            <div className="mt-6 space-y-5 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50">
                <Mail className="h-7 w-7 text-emerald-600" />
              </div>
              <div>
                <p className="font-display text-lg font-bold text-ink">Check your Bowen email</p>
                <p className="mt-2 text-sm text-slate-500">
                  We've sent a confirmation link to <span className="font-semibold text-ink">{bowenEmail}</span>.
                  Click it to verify your identity, then come back and sign in with your ID.
                </p>
              </div>
              <button type="button" onClick={() => { setTab("in"); setErr(""); setMsg(""); }}
                className="btn-primary w-full py-3.5">
                Go to Sign In
              </button>
            </div>
          )}

          {/* STEP 1: FORGOT PASSWORD — enter email */}
          {tab === "reset" && (
            <form onSubmit={handleReset} className="mt-6 space-y-5">
              <div className="text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-navy/10">
                  <Mail className="h-6 w-6 text-navy" />
                </div>
                <p className="mt-3 font-display text-lg font-bold text-ink">Reset your password</p>
                <p className="mt-1 text-sm text-slate-500">
                  Enter your Bowen email. We'll send a 6-digit verification code.
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold text-ink">Bowen University email</label>
                <div className="mt-2"><Field icon={Mail} type="email" placeholder="yourname@bowen.edu.ng" value={resetEmail} onChange={setResetEmail} /></div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 disabled:opacity-60">
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Send Verification Code"}
              </button>
              <button type="button" onClick={backToSignIn}
                className="flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-navy">
                <ArrowLeft className="h-4 w-4" /> Back to Sign In
              </button>
              <p className="text-center text-xs text-slate-400">
                Lost access to your Bowen email too? Ask an administrator to reset your password.
              </p>
            </form>
          )}

          {/* STEP 2: OTP — enter the 6-digit code */}
          {tab === "otp" && (
            <form onSubmit={handleVerifyOtp} className="mt-6 space-y-5">
              <div className="text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gold/20">
                  <KeyRound className="h-6 w-6 text-gold-dark" />
                </div>
                <p className="mt-3 font-display text-lg font-bold text-ink">Enter verification code</p>
                <p className="mt-1 text-sm text-slate-500">
                  We sent a 6-digit code to{" "}
                  <span className="font-semibold text-ink break-all">{resetEmail}</span>.
                  Enter it below to continue.
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold text-ink">6-digit code</label>
                <div className="mt-2">
                  <Field
                    icon={KeyRound}
                    type="text"
                    placeholder="123456"
                    value={otpCode}
                    onChange={(v) => setOtpCode(v.replace(/\D/g, "").slice(0, 6))}
                    mono
                    maxLength={6}
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-400">Check your spam folder if you don't see it. The code expires in 1 hour.</p>
              </div>
              <button type="submit" disabled={loading || otpCode.length !== 6} className="btn-primary w-full py-3.5 disabled:opacity-60">
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Verify Code"}
              </button>
              <div className="flex items-center justify-between text-sm">
                <button type="button" onClick={backToSignIn}
                  className="flex items-center gap-1.5 font-semibold text-slate-500 hover:text-navy">
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button type="button" onClick={() => { setTab("reset"); setErr(""); setOtpCode(""); }}
                  className="font-semibold text-gold-dark hover:underline">
                  Resend code
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: SET NEW PASSWORD */}
          {tab === "newpw" && (
            <form onSubmit={handleUpdatePw} className="mt-6 space-y-5">
              <div className="text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50">
                  <Lock className="h-6 w-6 text-emerald-600" />
                </div>
                <p className="mt-3 font-display text-lg font-bold text-ink">Set new password</p>
                <p className="mt-1 text-sm text-slate-500">Choose a strong password for your account.</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-ink">New password</label>
                <div className="mt-2">
                  <Field icon={Lock} type={showPw ? "text" : "password"} placeholder="At least 6 characters" value={pw} onChange={setPw} right={eyeBtn} />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-ink">Confirm new password</label>
                <div className="mt-2">
                  <Field icon={Lock} type={showConfirmPw ? "text" : "password"} placeholder="Re-enter your password" value={confirmPw} onChange={setConfirmPw} right={confirmEyeBtn} />
                </div>
                {confirmPw && pw !== confirmPw && (
                  <p className="mt-1.5 text-xs font-medium text-red-500">Passwords do not match</p>
                )}
                {confirmPw && pw === confirmPw && pw.length >= 6 && (
                  <p className="mt-1.5 text-xs font-medium text-emerald-600">✓ Passwords match</p>
                )}
              </div>
              <button type="submit" disabled={loading || pw.length < 6 || pw !== confirmPw} className="btn-primary w-full py-3.5 disabled:opacity-60">
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Update Password"}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Accounts are for Bowen University students and staff only.
        </p>
      </div>
    </div>
  );
}
