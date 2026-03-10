import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const S = {
    bg: "#F5EFE6", dark: "#1C1008", gold: "#C9A87C",
    mid: "#EDE3D5", border: "#D4B896", muted: "#6B5744"
  };

  const handleLogin = async () => {
    if (!email || !password) { setError("Enter your email and password."); return; }
    setLoading(true);
    setError("");

    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError("Invalid email or password."); setLoading(false); return; }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .single();

    const role = roleData?.role || "client";
    if (role === "owner" || role === "admin") navigate("/app/admin");
    else if (role === "receptionist") navigate("/app/receptionist");
    else if (role === "staff") navigate("/app/staff");
    else navigate("/app/client");

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: S.bg }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: S.gold }}>ZOLARA</p>
          <p className="text-[10px] tracking-widest uppercase" style={{ color: S.muted }}>BEAUTY STUDIO</p>
          <div className="w-8 h-0.5 mx-auto mt-3" style={{ backgroundColor: S.gold }} />
        </div>

        <div className="rounded-2xl p-8" style={{ backgroundColor: S.mid, border: `1px solid ${S.border}` }}>
          <h1 className="text-xl font-semibold mb-1 text-center" style={{ fontFamily: "Playfair Display, Georgia, serif", color: S.dark }}>
            Staff Login
          </h1>
          <p className="text-xs text-center mb-8" style={{ color: S.muted }}>For staff and admin access only</p>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-lg text-xs text-center" style={{ backgroundColor: "#FEE2E2", color: "#991B1B" }}>
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-2 tracking-wider uppercase" style={{ color: S.muted }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                placeholder="your@email.com"
                className="w-full px-4 py-3 text-sm rounded-lg outline-none"
                style={{ backgroundColor: S.bg, border: `1px solid ${S.border}`, color: S.dark }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2 tracking-wider uppercase" style={{ color: S.muted }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                placeholder="••••••••"
                className="w-full px-4 py-3 text-sm rounded-lg outline-none"
                style={{ backgroundColor: S.bg, border: `1px solid ${S.border}`, color: S.dark }}
              />
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full py-3.5 text-xs font-bold tracking-widest uppercase mt-2 disabled:opacity-50"
              style={{ backgroundColor: S.gold, color: S.dark }}
            >
              {loading ? "SIGNING IN..." : "SIGN IN"}
            </button>
          </div>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: S.muted }}>
          Not staff? <a href="/" className="font-semibold hover:opacity-70" style={{ color: S.gold }}>Return to website</a>
        </p>
      </div>
    </div>
  );
};

export default Auth;
