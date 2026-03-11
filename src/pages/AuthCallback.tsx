import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Confirming your account...");

  const redirectByRole = async (userId: string, metadata: any) => {
    const { data: roleData } = await supabase
      .from("user_roles").select("role").eq("user_id", userId).maybeSingle();
    const role = roleData?.role || metadata?.role || "client";
    if (role === "owner" || role === "admin")  navigate("/app/admin/dashboard", { replace: true });
    else if (role === "receptionist")          navigate("/app/receptionist/dashboard", { replace: true });
    else if (role === "staff")                 navigate("/app/staff/dashboard", { replace: true });
    else                                       navigate("/app/client/dashboard", { replace: true });
  };

  useEffect(() => {
    const run = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const token_hash = params.get("token_hash");
        const type = params.get("type");

        if (token_hash && type) {
          // Exchange the token hash for a session
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as any,
          });

          if (error) {
            setStatus("Confirmation failed: " + error.message);
            setTimeout(() => navigate("/app/auth", { replace: true }), 3000);
            return;
          }

          if (data.session) {
            setStatus("Confirmed! Redirecting...");
            await redirectByRole(data.session.user.id, data.session.user.user_metadata);
            return;
          }
        }

        // Fallback: check existing session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await redirectByRole(session.user.id, session.user.user_metadata);
          return;
        }

        setStatus("No session found. Please sign in.");
        setTimeout(() => navigate("/app/auth", { replace: true }), 2500);
      } catch (e: any) {
        setStatus("Something went wrong. Redirecting...");
        setTimeout(() => navigate("/app/auth", { replace: true }), 2500);
      }
    };

    run();
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
