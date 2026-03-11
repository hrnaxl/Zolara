import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Confirming your account...");

  useEffect(() => {
    const handle = async () => {
      try {
        // Supabase puts tokens in the URL hash — getSession picks them up automatically
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
          setStatus("Confirmation failed. Please try signing in.");
          setTimeout(() => navigate("/app/client/auth"), 3000);
          return;
        }

        const userId = session.user.id;
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .maybeSingle();

        const role = roleData?.role || session.user.user_metadata?.role;

        if (role === "owner" || role === "admin") {
          navigate("/app/admin/dashboard", { replace: true });
        } else if (role === "receptionist") {
          navigate("/app/receptionist/dashboard", { replace: true });
        } else if (role === "staff") {
          navigate("/app/staff/dashboard", { replace: true });
        } else {
          // client or no role
          navigate("/app/client/dashboard", { replace: true });
        }
      } catch {
        setStatus("Something went wrong. Redirecting...");
        setTimeout(() => navigate("/app/client/auth"), 3000);
      }
    };

    handle();
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Montserrat', sans-serif", background: "#FDFCF9" }}>
      <div style={{ width: 44, height: 44, border: "3px solid #F5ECD6", borderTop: "3px solid #C9A84C", borderRadius: "50%", animation: "spin 0.8s linear infinite", marginBottom: 20 }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ fontSize: 14, color: "#78716C" }}>{status}</p>
    </div>
  );
}
