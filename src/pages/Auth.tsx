import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { findOrCreateClient } from "@/lib/clientDedup";
import { Eye, EyeOff } from "lucide-react";

const G     = "#B8975A";
const G_D   = "#9A7A3E";
const G_L   = "#F5ECD6";
const NAVY  = "#0F1E35";
const CREAM = "#FAFAF8";
const WHITE = "#FFFFFF";
const BORDER= "#E8E4DC";
const TXT   = "#1C1917";
const TXT_M = "#78716C";
const TXT_S = "#A8A29E";
const RED   = "#DC2626";

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode]   = useState<"login"|"signup">("login");
  const [name, setName]   = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pass, setPass]   = useState("");
  const [conf, setConf]   = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const redirectByRole = (role: string) => {
    if (role === "owner" || role === "admin") navigate("/app/admin/dashboard", { replace: true });
    else if (role === "receptionist")         navigate("/app/receptionist/dashboard", { replace: true });
    else if (role === "staff")                navigate("/app/staff/dashboard", { replace: true });
    else if (role === "cleaner")               navigate("/app/cleaner/dashboard", { replace: true });
    else                                      navigate("/app/client/dashboard", { replace: true });
  };

  // If already logged in, redirect immediately
  useState(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id).maybeSingle();
      if (roleData?.role) redirectByRole(roleData.role);
    });
  });

  const handleLogin = async () => {
    if (!email.trim() || !pass) { setError("Enter your email and password."); return; }
    setLoading(true); setError("");

    // Timeout guard — prevent infinite loading if Supabase hangs
    const timeout = setTimeout(() => {
      setLoading(false);
      setError("Login timed out. Check your connection and try again.");
    }, 25000);

    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: pass,
      });

      if (authErr) {
        clearTimeout(timeout);
        if (authErr.message.includes("Email not confirmed")) {
          setError("Please confirm your email first. Check your inbox.");
        } else {
          setError("Invalid email or password.");
        }
        return;
      }

      const userId = data.user?.id;
      if (!userId) {
        clearTimeout(timeout);
        setError("Login failed. Please try again.");
        return;
      }

      // Fetch role — with explicit error handling, not silent failure
      const { data: roleData, error: roleErr } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (roleErr) {
        clearTimeout(timeout);
        setError("Could not verify your account role. Please try again.");
        await supabase.auth.signOut();
        return;
      }

      if (!roleData?.role) {
        clearTimeout(timeout);
        setError("No role assigned to this account. Contact the salon owner.");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      let role = roleData.role;

      // Enforce active-status for staff/receptionist on every login
      if (role === "staff" || role === "receptionist") {
        const { data: staffRecord } = await supabase
          .from("staff").select("is_active").eq("user_id", userId).maybeSingle();
        if (staffRecord && !staffRecord.is_active) {
          await supabase.from("user_roles").upsert({ user_id: userId, role: "client" });
          role = "client";
        }
      }

      clearTimeout(timeout);

      redirectByRole(role);
    } catch (e: any) {
      clearTimeout(timeout);
      setError(e?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!name.trim())               { setError("Enter your full name."); return; }
    if (!email.trim())              { setError("Enter your email."); return; }
    if (!pass || pass.length < 6)   { setError("Password must be at least 6 characters."); return; }
    if (pass !== conf)              { setError("Passwords don't match."); return; }
    setLoading(true); setError("");

    const timeout = setTimeout(() => {
      setLoading(false);
      setError("Request timed out. Please try again.");
    }, 15000);

    try {
      const { data: staffMatch } = await supabase
        .from("staff").select("id, role, name, is_active")
        .eq("email", email.trim().toLowerCase()).maybeSingle();

      if (staffMatch && !staffMatch.is_active) {
        clearTimeout(timeout);
        setError("This email is not authorized. Contact the salon owner.");
        return;
      }

      const assignedRole = staffMatch?.is_active ? (staffMatch.role || "staff") : "client";

      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: email.trim(),
        password: pass,
        options: { data: { name: staffMatch?.name || name, role: assignedRole } },
      });

      if (authErr) { clearTimeout(timeout); setError(authErr.message); return; }

      const userId = authData.user?.id;
      if (!userId) { clearTimeout(timeout); setError("Signup failed. Try again."); return; }

      // Role assignment and staff linking is handled automatically by the database trigger
      // on_auth_user_created fires immediately and assigns the correct role

      // For clients, link existing record by email or create new one
      if (!staffMatch) {
        const cleanPhone = phone.replace(/\s/g, "");
        // Try to find existing client by email first (booked without account)
        const { data: existingByEmail } = await supabase
          .from("clients" as any).select("id, user_id").ilike("email", email.trim()).maybeSingle();
        if (existingByEmail && !existingByEmail.user_id) {
          // Link user_id to the existing client record
          await supabase.from("clients" as any).update({ user_id: userId }).eq("id", existingByEmail.id);
        } else if (!existingByEmail) {
          // No existing client — create one
          await findOrCreateClient({ name, phone: cleanPhone, email: email.trim(), userId });
        }
      }

      clearTimeout(timeout);
      setMode("login");
      setPass(""); setConf("");
      setError("");
      alert(`Account created! Check your email (${email.trim()}) to confirm your account, then sign in.`);
    } catch (e: any) {
      clearTimeout(timeout);
      setError(e.message || "Signup failed.");
    } finally {
      setLoading(false);
    }
  };

  const field = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    opts: { type?: string; placeholder?: string; hint?: string } = {}
  ) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: TXT_M, textTransform: "uppercase" as const }}>
        {label}
      </label>
      <input
        type={opts.type || "text"}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={opts.placeholder}
        onKeyDown={e => mode === "login" && e.key === "Enter" && handleLogin()}
        style={{
          padding: "13px 16px", borderRadius: 10, border: `1.5px solid ${BORDER}`,
          fontSize: 14, background: WHITE, color: TXT, outline: "none",
          fontFamily: "Montserrat,sans-serif", transition: "border-color 0.15s",
        }}
        onFocus={e => (e.target.style.borderColor = G)}
        onBlur={e => (e.target.style.borderColor = BORDER)}
      />
      {opts.hint && <p style={{ fontSize: 10, color: TXT_S, margin: 0 }}>{opts.hint}</p>}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexWrap: "wrap", fontFamily: "Montserrat,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Montserrat:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* ── LEFT PANEL ─────────────────────────────────── */}
      <div style={{
        width: "42%", minWidth: "min(42%, 100%)", minHeight: "auto", background: NAVY,
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        padding: "clamp(24px,5vw,48px) clamp(20px,5vw,52px)", position: "relative", overflow: "hidden",
        flexShrink: 0,
      }}>
        {/* Decorative circles */}
        <div style={{ position: "absolute", top: "-80px", right: "-80px", width: 320, height: 320, borderRadius: "50%", border: `1px solid rgba(184,151,90,0.12)`, pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "-30px", right: "-30px", width: 200, height: 200, borderRadius: "50%", border: `1px solid rgba(184,151,90,0.08)`, pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-100px", left: "-60px", width: 360, height: 360, borderRadius: "50%", border: `1px solid rgba(184,151,90,0.07)`, pointerEvents: "none" }} />

        {/* Logo */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <img src="/logo.png" alt="Zolara"
              style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: `2px solid ${G}44` }} />
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 600, color: WHITE, letterSpacing: "-0.01em", lineHeight: 1 }}>Zolara</div>
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.24em", color: `${G}99`, marginTop: 3 }}>BEAUTY STUDIO</div>
            </div>
          </div>
        </div>

        {/* Center copy */}
        <div>
          <div style={{ width: 36, height: 2, background: G, marginBottom: 28, borderRadius: 1 }} />
          <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(28px,3vw,40px)", fontWeight: 500, color: WHITE, lineHeight: 1.25, margin: 0, letterSpacing: "-0.01em" }}>
            Every detail.<br />
            <em style={{ color: G }}>Perfected.</em>
          </p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 20, lineHeight: 1.7, fontWeight: 300, maxWidth: 280 }}>
            Tamale's premier luxury beauty destination. Sign in to manage your bookings and studio operations.
          </p>
        </div>

        {/* Bottom */}
        <div>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "0.06em" }}>
            © {new Date().getFullYear()} Zolara Beauty Studio
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────── */}
      <div style={{
        flex: 1, background: CREAM, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: "clamp(24px,5vw,48px) clamp(16px,5vw,40px)",
        overflowY: "auto",
      }}>
        <div style={{ width: "100%", maxWidth: 420, animation: "fadeUp 0.4s ease both" }}>

          {/* Heading */}
          <div style={{ marginBottom: 36 }}>
            <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(28px,3vw,38px)", fontWeight: 700, color: TXT, margin: 0, lineHeight: 1, letterSpacing: "-0.02em" }}>
              {mode === "login" ? "Welcome back" : "Create account"}
            </h1>
            <p style={{ fontSize: 12, color: TXT_S, marginTop: 8, fontWeight: 400 }}>
              {mode === "login"
                ? "Sign in to access your dashboard."
                : "Staff accounts are approved by the salon owner."}
            </p>
          </div>

          {/* Tab switcher */}
          <div style={{ display: "flex", background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 4, marginBottom: 28, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            {(["login", "signup"] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                style={{
                  flex: 1, padding: "10px", borderRadius: 9, border: "none", cursor: "pointer",
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                  fontFamily: "Montserrat,sans-serif", transition: "all 0.15s",
                  background: mode === m ? NAVY : "transparent",
                  color: mode === m ? WHITE : TXT_S,
                  boxShadow: mode === m ? "0 2px 8px rgba(15,30,53,0.2)" : "none",
                }}>
                {m === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "11px 14px", fontSize: 12, color: RED, marginBottom: 20, display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span style={{ flexShrink: 0 }}>⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {mode === "signup" && field("Full Name", name, setName, { placeholder: "Your full name" })}
            {field("Email", email, setEmail, { type: "email", placeholder: "your@email.com" })}
            {mode === "signup" && field("Phone", phone, setPhone, { type: "tel", placeholder: "0XX XXX XXXX", hint: "Optional — helps link your booking history" })}

            {/* Password with show/hide */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: TXT_M, textTransform: "uppercase" }}>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPw ? "text" : "password"}
                  value={pass} onChange={e => setPass(e.target.value)}
                  placeholder={mode === "login" ? "Your password" : "Min 6 characters"}
                  onKeyDown={e => mode === "login" && e.key === "Enter" && handleLogin()}
                  style={{ width: "100%", padding: "13px 44px 13px 16px", borderRadius: 10, border: `1.5px solid ${BORDER}`, fontSize: 14, background: WHITE, color: TXT, outline: "none", fontFamily: "Montserrat,sans-serif", transition: "border-color 0.15s" }}
                  onFocus={e => (e.target.style.borderColor = G)}
                  onBlur={e => (e.target.style.borderColor = BORDER)}
                />
                <button onClick={() => setShowPw(p => !p)} type="button"
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: TXT_S, display: "flex", padding: 4 }}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {mode === "signup" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: TXT_M, textTransform: "uppercase" }}>Confirm Password</label>
                <input
                  type={showPw ? "text" : "password"}
                  value={conf} onChange={e => setConf(e.target.value)}
                  placeholder="Repeat password"
                  style={{ padding: "13px 16px", borderRadius: 10, border: `1.5px solid ${BORDER}`, fontSize: 14, background: WHITE, color: TXT, outline: "none", fontFamily: "Montserrat,sans-serif" }}
                  onFocus={e => (e.target.style.borderColor = G)}
                  onBlur={e => (e.target.style.borderColor = BORDER)}
                />
              </div>
            )}

            {mode === "login" && (
              <div style={{ textAlign: "right", marginTop: -8 }}>
                <a href="https://zolarasalon.com/app/auth" style={{ fontSize: 11, color: G, textDecoration: "none", fontWeight: 600 }}>
                  Forgot password?
                </a>
              </div>
            )}

            {/* Submit */}
            <button
              onClick={mode === "login" ? handleLogin : handleSignup}
              disabled={loading}
              style={{
                padding: "15px", borderRadius: 12, border: "none", cursor: loading ? "not-allowed" : "pointer",
                background: loading ? "#D4C5A9" : `linear-gradient(135deg, ${G} 0%, ${G_D} 100%)`,
                color: WHITE, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em",
                fontFamily: "Montserrat,sans-serif", display: "flex", alignItems: "center",
                justifyContent: "center", gap: 10, marginTop: 4,
                boxShadow: loading ? "none" : `0 4px 20px ${G}44`,
                transition: "all 0.2s",
              }}>
              {loading
                ? <><span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: WHITE, display: "inline-block", animation: "spin 0.8s linear infinite" }} /> PLEASE WAIT…</>
                : mode === "login" ? "SIGN IN" : "CREATE ACCOUNT"
              }
            </button>
          </div>

          {/* Switch mode */}
          <p style={{ textAlign: "center", fontSize: 12, color: TXT_S, marginTop: 24 }}>
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
              style={{ background: "none", border: "none", color: G, fontWeight: 700, cursor: "pointer", fontSize: 12, fontFamily: "Montserrat,sans-serif" }}>
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>

          <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${BORDER}`, textAlign: "center" }}>
            <a href="/" style={{ fontSize: 11, color: TXT_S, textDecoration: "none" }}>← Back to homepage</a>
          </div>
        </div>
      </div>
    </div>
  );
}
