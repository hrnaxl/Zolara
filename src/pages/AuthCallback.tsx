import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Confirming your account...");

  const redirectByRole = (role: string) => {
    if (role === "owner" || role === "admin")  navigate("/app/admin/dashboard", { replace: true });
    else if (role === "receptionist")          navigate("/app/receptionist/dashboard", { replace: true });
    else if (role === "staff")                 navigate("/app/staff/dashboard", { replace: true });
    else                                       navigate("/app/client/dashboard", { replace: true });
  };

  useEffect(() => {
    // Listen for auth state — Supabase fires SIGNED_IN after processing the token in the URL hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        const { data: roleData } = await supabase
          .from("user_roles").select("role").eq("user_id", session.user.id).maybeSingle();
        const role = roleData?.role || session.user.user_metadata?.role || "client";
        redirectByRole(role);
      }
    });

    // Also try getSession in case the token has already been processed
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase.from("user_roles").select("role").eq("user_id", session.user.id).maybeSingle()
          .then(({ data: roleData }) => {
            const role = roleData?.role || session.user.user_metadata?.role || "client";
            redirectByRole(role);
          });
      }
    });

    // Timeout fallback
    const timeout = setTimeout(() => {
      setStatus("Taking too long. Please sign in manually.");
      setTimeout(() => navigate("/app/auth", { replace: true }), 2500);
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Montserrat', sans-serif", background: "#FDFCF9" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <img src="/logo.png" style={{ width: 50, height: 50, borderRadius: "50%", objectFit: "cover", border: "2px solid #C9A84C", marginBottom: 20 }} alt="Zolara" />
      <div style={{ width: 36, height: 36, border: "3px solid #F5ECD6", borderTop: "3px solid #C9A84C", borderRadius: "50%", animation: "spin 0.8s linear infinite", marginBottom: 20 }} />
      <p style={{ fontSize: 14, color: "#78716C" }}>{status}</p>
    </div>
  );
}
