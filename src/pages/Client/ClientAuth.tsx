import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { findOrCreateClient } from "@/lib/clientDedup";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";

const GOLD = "#C9A84C";
const GOLD_D = "#A8892E";
const CREAM = "#FDFCF9";
const BORDER = "#EDE8E0";
const TXT = "#1C1917";
const TXT_MID = "#57534E";
const TXT_SOFT = "#A8A29E";
const WHITE = "#FFFFFF";
const RED = "#EF4444";

const inp = { width:"100%", padding:"12px 14px", borderRadius:10, border:`1.5px solid ${BORDER}`, fontSize:14, outline:"none", background:WHITE, color:TXT, fontFamily:"'Montserrat',sans-serif", transition:"border-color 0.15s" } as const;
const lbl = { display:"block", fontSize:11, fontWeight:700, letterSpacing:"0.12em", color:TXT_SOFT, marginBottom:6, textTransform:"uppercase" as const } as const;

export default function ClientAuth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login"|"signup">("login");
  const [name, setName]     = useState("");
  const [email, setEmail]   = useState("");
  const [phone, setPhone]   = useState("");
  const [password, setPass] = useState("");
  const [confirm, setConf]  = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email || !password) { setError("Enter your email and password."); return; }
    setLoading(true); setError("");
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) { setError("Invalid email or password."); return; }
      // Check if client role
      const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id).maybeSingle();
      const role = roleData?.role || data.user.user_metadata?.role;
      if (role && role !== "client") {
        // Staff trying to login here — redirect to staff login
        await supabase.auth.signOut();
        setError("This portal is for clients only. Staff please use the staff login.");
        return;
      }
      navigate("/app/client/dashboard", { replace: true });
    } catch { setError("Something went wrong."); }
    finally { setLoading(false); }
  };

  const handleSignup = async () => {
    if (!name.trim()) { setError("Enter your name."); return; }
    if (!email.trim()) { setError("Enter your email."); return; }
    if (!phone.replace(/\s/g,"") || phone.replace(/\s/g,"").length < 10) { setError("Enter a valid phone number."); return; }
    if (!password || password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setLoading(true); setError("");
    try {
      const cleanPhone = phone.replace(/\s/g,"");
      // Create auth user
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email, password,
        options: { data: { name, role: "client" } }
      });
      if (authErr) { setError(authErr.message); return; }
      const userId = authData.user?.id;
      if (!userId) { setError("Signup failed. Try again."); return; }

      // Assign client role
      await supabase.from("user_roles").upsert({ user_id: userId, role: "client" });

      // Link to existing client record or create new one (dedup by phone + email)
      await findOrCreateClient({ name, phone: cleanPhone, email, userId });

      toast.success("Account created! Please check your email to confirm.");
      navigate("/app/client/dashboard", { replace: true });
    } catch (e: any) {
      setError(e.message || "Signup failed.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:"100dvh", background:CREAM, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"'Montserrat',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Montserrat:wght@400;500;600;700&display=swap'); input:focus{border-color:${GOLD}!important;box-shadow:0 0 0 3px ${GOLD}22;}`}</style>

      {/* Logo */}
      <div style={{ textAlign:"center", marginBottom:36 }}>
        <img src="/logo.png" style={{ width:56, height:56, borderRadius:"50%", objectFit:"cover", border:`2px solid ${GOLD}`, marginBottom:12 }} alt="Zolara" />
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:28, fontWeight:700, color:TXT, lineHeight:1 }}>Zolara</div>
        <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.22em", color:TXT_SOFT, marginTop:4 }}>BEAUTY STUDIO</div>
      </div>

      <div style={{ width:"100%", maxWidth:400, background:WHITE, borderRadius:20, border:`1px solid ${BORDER}`, boxShadow:"0 4px 24px rgba(0,0,0,0.06)", padding:32 }}>
        {/* Tabs */}
        <div style={{ display:"flex", background:"#F5F5F4", borderRadius:10, padding:4, marginBottom:28 }}>
          {(["login","signup"] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(""); }}
              style={{ flex:1, padding:"9px", borderRadius:7, border:"none", cursor:"pointer", fontSize:12, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", background: mode === m ? WHITE : "transparent", color: mode === m ? TXT : TXT_SOFT, boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.08)" : "none", transition:"all 0.15s", fontFamily:"'Montserrat',sans-serif" }}>
              {m === "login" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </div>

        {error && <div style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:8, padding:"10px 14px", fontSize:12, color:RED, marginBottom:16 }}>{error}</div>}

        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {mode === "signup" && (
            <div>
              <label style={lbl}>Full Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" style={inp} />
            </div>
          )}

          <div>
            <label style={lbl}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" style={inp} onKeyDown={e => mode === "login" && e.key === "Enter" && handleLogin()} />
          </div>

          {mode === "signup" && (
            <div>
              <label style={lbl}>Phone Number</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0XX XXX XXXX" style={inp} />
              <p style={{ fontSize:10, color:TXT_SOFT, marginTop:4 }}>Used to link your booking history</p>
            </div>
          )}

          <div>
            <label style={lbl}>Password</label>
            <div style={{ position:"relative" }}>
              <input type={showPw ? "text" : "password"} value={password} onChange={e => setPass(e.target.value)} placeholder={mode === "login" ? "Your password" : "Min 6 characters"} style={{ ...inp, paddingRight:44 }} onKeyDown={e => mode === "login" && e.key === "Enter" && handleLogin()} />
              <button onClick={() => setShowPw(p => !p)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:TXT_SOFT, display:"flex", alignItems:"center" }}>
                {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
          </div>

          {mode === "signup" && (
            <div>
              <label style={lbl}>Confirm Password</label>
              <input type={showPw ? "text" : "password"} value={confirm} onChange={e => setConf(e.target.value)} placeholder="Repeat password" style={inp} />
            </div>
          )}

          <button
            onClick={mode === "login" ? handleLogin : handleSignup}
            disabled={loading}
            style={{ padding:"14px", borderRadius:12, background: loading ? "#ccc" : `linear-gradient(135deg,${GOLD},${GOLD_D})`, border:"none", color:WHITE, fontSize:13, fontWeight:700, letterSpacing:"0.08em", cursor: loading ? "not-allowed" : "pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontFamily:"'Montserrat',sans-serif", marginTop:4 }}
          >
            {loading ? <><Loader2 size={15} style={{ animation:"spin 0.8s linear infinite" }} /> LOADING…</> : mode === "login" ? "SIGN IN" : "CREATE ACCOUNT"}
          </button>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>

        {mode === "login" && (
          <p style={{ textAlign:"center", fontSize:11, color:TXT_SOFT, marginTop:20 }}>
            Don't have an account?{" "}
            <button onClick={() => { setMode("signup"); setError(""); }} style={{ background:"none", border:"none", color:GOLD, fontWeight:700, cursor:"pointer", fontSize:11, fontFamily:"'Montserrat',sans-serif" }}>Sign up</button>
          </p>
        )}
      </div>

      <a href="/" style={{ marginTop:24, fontSize:12, color:TXT_SOFT, textDecoration:"none" }}>← Back to homepage</a>
    </div>
  );
}
