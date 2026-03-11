import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Loader2 } from "lucide-react";

const GOLD  = "#C9A84C";
const GOLD_D = "#A8892E";
const CREAM = "#FDFCF9";
const WHITE = "#FFFFFF";
const BORDER = "#EDE8E0";
const TXT   = "#1C1917";
const TXT_SOFT = "#A8A29E";
const RED   = "#EF4444";

const inp = {
  width: "100%", padding: "12px 14px", borderRadius: 10,
  border: `1.5px solid ${BORDER}`, fontSize: 14, outline: "none",
  background: WHITE, color: TXT, fontFamily: "'Montserrat',sans-serif",
  transition: "border-color 0.15s",
} as const;

const lbl = {
  display: "block", fontSize: 11, fontWeight: 700,
  letterSpacing: "0.12em", color: TXT_SOFT, marginBottom: 6,
  textTransform: "uppercase" as const,
} as const;

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName]     = useState("");
  const [email, setEmail]   = useState("");
  const [phone, setPhone]   = useState("");
  const [password, setPass] = useState("");
  const [confirm, setConf]  = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  const redirectByRole = (role: string) => {
    if (role === "owner" || role === "admin") navigate("/app/admin/dashboard", { replace: true });
    else if (role === "receptionist")         navigate("/app/receptionist/dashboard", { replace: true });
    else if (role === "staff")                navigate("/app/staff/dashboard", { replace: true });
    else                                      navigate("/app/client/dashboard", { replace: true });
  };

  const handleLogin = async () => {
    if (!email || !password) { setError("Enter your email and password."); return; }
    setLoading(true); setError("");
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) { setError("Invalid email or password."); return; }

      const userId = data.user.id;

      // Fetch role from DB — ONLY source of truth. Never trust user_metadata.
      const { data: roleData } = await supabase
        .from("user_roles").select("role").eq("user_id", userId).maybeSingle();

      if (!roleData?.role) {
        setError("Account has no role assigned. Contact the salon owner.");
        await supabase.auth.signOut();
        return;
      }

      let role = roleData.role;

      // If this user has a staff/receptionist role, verify they are still active
      // Owner can revoke access by setting is_active = false — this enforces it on every login
      if (role === "staff" || role === "receptionist") {
        const { data: staffRecord } = await supabase
          .from("staff").select("is_active").eq("user_id", userId).maybeSingle();

        if (staffRecord && !staffRecord.is_active) {
          // Staff has been revoked — downgrade to client immediately
          await supabase.from("user_roles").upsert({ user_id: userId, role: "client" });
          role = "client";
        }
      }

      redirectByRole(role);
    } catch { setError("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  };

  const handleSignup = async () => {
    if (!name.trim())                                  { setError("Enter your full name."); return; }
    if (!email.trim())                                 { setError("Enter your email."); return; }
    if (!password || password.length < 6)              { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm)                          { setError("Passwords don't match."); return; }
    setLoading(true); setError("");

    try {
      // Whitelist check: email must exist in staff table AND be active
      // Owner controls this registry — users cannot choose their role
      const { data: staffMatch } = await supabase
        .from("staff")
        .select("id, role, name, is_active")
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();

      // If email is in staff table but marked inactive, block signup entirely
      if (staffMatch && !staffMatch.is_active) {
        setError("This email is not authorized for access. Contact the salon owner.");
        return;
      }

      // Active staff member → assign their pre-set role. Otherwise → client.
      const assignedRole = staffMatch?.is_active ? (staffMatch.role || "staff") : "client";

      // Create auth account
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { name: staffMatch?.name || name, role: assignedRole } },
      });
      if (authErr) { setError(authErr.message); return; }

      const userId = authData.user?.id;
      if (!userId) { setError("Signup failed. Try again."); return; }

      // Assign role — this must succeed before we continue
      const { error: roleError } = await supabase
        .from("user_roles").upsert({ user_id: userId, role: assignedRole });
      if (roleError) { setError("Role assignment failed. Contact the salon owner."); return; }

      if (staffMatch) {
        // Link user_id to staff record — ties auth account to staff registry
        const { error: linkError } = await supabase
          .from("staff").update({ user_id: userId }).eq("id", staffMatch.id);
        if (linkError) { setError("Staff account linking failed. Contact the salon owner."); return; }
      } else {
        // Client — link or create client record
        const cleanPhone = phone.replace(/\s/g, "");
        const { data: existingClient } = await supabase
          .from("clients").select("id")
          .eq("phone", cleanPhone).maybeSingle();

        if (existingClient?.id) {
          await supabase.from("clients").update({ user_id: userId, email, name }).eq("id", existingClient.id);
        } else {
          await supabase.from("clients").insert({ name, email, phone: cleanPhone || null, user_id: userId });
        }
      }

      setError("");
      if (assignedRole === "client") {
        setError(""); 
        // Show success message and switch to login
        setMode("login");
        setPass(""); setConf("");
        alert(`Account created! Check your email (${email}) to confirm your account, then sign in.`);
      } else {
        alert(`Account created for ${staffMatch?.name}! Check your email to confirm, then sign in.`);
        setMode("login");
        setPass(""); setConf("");
      }
    } catch (e: any) {
      setError(e.message || "Signup failed.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: CREAM, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Montserrat',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Montserrat:wght@400;500;600;700&display=swap');
        input:focus { border-color: ${GOLD} !important; box-shadow: 0 0 0 3px ${GOLD}22; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <img src="/logo.png" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: `2px solid ${GOLD}`, marginBottom: 12 }} alt="Zolara" />
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 700, color: TXT, lineHeight: 1 }}>Zolara</div>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.22em", color: TXT_SOFT, marginTop: 4 }}>BEAUTY STUDIO</div>
      </div>

      <div style={{ width: "100%", maxWidth: 400, background: WHITE, borderRadius: 20, border: `1px solid ${BORDER}`, boxShadow: "0 4px 24px rgba(0,0,0,0.06)", padding: 32 }}>

        {/* Tabs */}
        <div style={{ display: "flex", background: "#F5F5F4", borderRadius: 10, padding: 4, marginBottom: 28 }}>
          {(["login", "signup"] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(""); }}
              style={{ flex: 1, padding: "9px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", background: mode === m ? WHITE : "transparent", color: mode === m ? TXT : TXT_SOFT, boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.08)" : "none", transition: "all 0.15s", fontFamily: "'Montserrat',sans-serif" }}>
              {m === "login" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: RED, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {mode === "signup" && (
            <div>
              <label style={lbl}>Full Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" style={inp} />
            </div>
          )}

          <div>
            <label style={lbl}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" style={inp}
              onKeyDown={e => mode === "login" && e.key === "Enter" && handleLogin()} />
          </div>

          {mode === "signup" && (
            <div>
              <label style={lbl}>Phone (optional)</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0XX XXX XXXX" style={inp} />
              <p style={{ fontSize: 10, color: TXT_SOFT, marginTop: 4 }}>Helps link your booking history</p>
            </div>
          )}

          <div>
            <label style={lbl}>Password</label>
            <div style={{ position: "relative" }}>
              <input type={showPw ? "text" : "password"} value={password} onChange={e => setPass(e.target.value)}
                placeholder={mode === "login" ? "Your password" : "Min 6 characters"} style={{ ...inp, paddingRight: 44 }}
                onKeyDown={e => mode === "login" && e.key === "Enter" && handleLogin()} />
              <button onClick={() => setShowPw(p => !p)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: TXT_SOFT, display: "flex", alignItems: "center" }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {mode === "signup" && (
            <div>
              <label style={lbl}>Confirm Password</label>
              <input type={showPw ? "text" : "password"} value={confirm} onChange={e => setConf(e.target.value)} placeholder="Repeat password" style={inp} />
            </div>
          )}

          <button onClick={mode === "login" ? handleLogin : handleSignup} disabled={loading}
            style={{ padding: "14px", borderRadius: 12, background: loading ? "#D4C5A9" : `linear-gradient(135deg, ${GOLD}, ${GOLD_D})`, border: "none", color: WHITE, fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "'Montserrat',sans-serif", marginTop: 4 }}>
            {loading
              ? <><Loader2 size={15} style={{ animation: "spin 0.8s linear infinite" }} /> LOADING…</>
              : mode === "login" ? "SIGN IN" : "CREATE ACCOUNT"}
          </button>
        </div>

        <p style={{ textAlign: "center", fontSize: 11, color: TXT_SOFT, marginTop: 20 }}>
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
            style={{ background: "none", border: "none", color: GOLD, fontWeight: 700, cursor: "pointer", fontSize: 11, fontFamily: "'Montserrat',sans-serif" }}>
            {mode === "login" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>

      <a href="/" style={{ marginTop: 24, fontSize: 12, color: TXT_SOFT, textDecoration: "none" }}>← Back to homepage</a>
    </div>
  );
}
