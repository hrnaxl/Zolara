import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Confirming your account...");

  const redirectByRole = async (userId: string, metadata: any) => {
    const { data: roleData } = await supabase
      .from("user_roles").select("role").eq("user_id", userId).maybeSingle();
    let role = roleData?.role;

    // If no role row exists yet (RLS blocked the signup upsert), derive from staff table or metadata
    if (!role) {
      const { data: staffRecord } = await supabase
        .from("staff").select("role, is_active").eq("user_id", userId).maybeSingle();
      if (staffRecord?.is_active) {
        role = staffRecord.role || "staff";
      } else if (staffRecord && !staffRecord.is_active) {
        role = "client";
      } else {
        // Check staff table by email from metadata
        const email = metadata?.email;
        if (email) {
          const { data: staffByEmail } = await supabase
            .from("staff").select("role, is_active, user_id").eq("email", email.toLowerCase()).maybeSingle();
          if (staffByEmail?.is_active) {
            role = staffByEmail.role || "staff";
            // Link user_id if missing
            if (!staffByEmail.user_id) {
              await supabase.from("staff").update({ user_id: userId }).eq("email", email.toLowerCase());
            }
          }
        }
        if (!role) role = metadata?.role || "client";
      }
      // Write the role so future logins work
      await supabase.from("user_roles").upsert({ user_id: userId, role }, { onConflict: "user_id" });
    }

    // Validate active status for staff/receptionist — revoked staff land as client
    if (role === "staff" || role === "receptionist") {
      const { data: staffRecord } = await supabase
        .from("staff").select("is_active").eq("user_id", userId).maybeSingle();

      if (staffRecord && !staffRecord.is_active) {
        await supabase.from("user_roles").upsert({ user_id: userId, role: "client" });
        role = "client";
      }
    }

    if (role === "owner" || role === "admin")  navigate("/app/admin/dashboard", { replace: true });
    else if (role === "receptionist")          navigate("/app/receptionist/dashboard", { replace: true });
    else if (role === "staff")                 navigate("/app/staff/dashboard", { replace: true });
    else if (role === "cleaner")                navigate("/app/cleaner/dashboard", { replace: true });
    else                                       navigate("/app/client/dashboard", { replace: true });
  };

  useEffect(() => {
    const run = async () => {
      try {
        // Handle hash-based tokens (#access_token=... from implicit flow)
        const hash = window.location.hash;
        if (hash && hash.includes("access_token")) {
          const hashParams = new URLSearchParams(hash.substring(1));
          const access_token = hashParams.get("access_token");
          const refresh_token = hashParams.get("refresh_token");
          const type = hashParams.get("type");

          if (access_token && refresh_token) {
            const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) {
              setStatus("Confirmation failed: " + error.message);
              setTimeout(() => navigate("/app/auth", { replace: true }), 3000);
              return;
            }
            if (data.session) {
              if (type === "signup" || type === "email_change") {
                setStatus("✓ Email confirmed! Taking you to your dashboard…");
              } else {
                setStatus("Taking you to your dashboard…");
              }
              await new Promise(r => setTimeout(r, 1500));
              await redirectByRole(data.session.user.id, data.session.user.user_metadata);
              return;
            }
          }
        }

        // Handle query param tokens (?token_hash=... from PKCE flow)
        const params = new URLSearchParams(window.location.search);
        const token_hash = params.get("token_hash");
        const type = params.get("type");

        if (token_hash && type) {
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
            setStatus("✓ Email confirmed! Taking you to your dashboard…");
            await new Promise(r => setTimeout(r, 1500));
            await redirectByRole(data.session.user.id, data.session.user.user_metadata);
            return;
          }
        }

        // Fallback: check existing session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setStatus("Taking you to your dashboard…");
          await new Promise(r => setTimeout(r, 800));
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

  const isConfirmed = status.includes("✓");

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Montserrat', sans-serif", background: "#FDFCF9", padding: 24 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pop { 0%{transform:scale(0.5);opacity:0} 70%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }`}</style>
      <img src="/logo.png" style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", border: "2px solid #C8A97E", marginBottom: 24 }} alt="Zolara"
        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
      {isConfirmed ? (
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#F0FDF4", border: "2px solid #22C55E", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, animation: "pop 0.4s ease" }}>
          <span style={{ fontSize: 22 }}>✓</span>
        </div>
      ) : (
        <div style={{ width: 36, height: 36, border: "3px solid #F5ECD6", borderTop: "3px solid #C9A84C", borderRadius: "50%", animation: "spin 0.8s linear infinite", marginBottom: 20 }} />
      )}
      <p style={{ fontSize: 15, fontWeight: isConfirmed ? 700 : 400, color: isConfirmed ? "#15803D" : "#78716C", textAlign: "center", maxWidth: 280, lineHeight: 1.6 }}>{status}</p>
      <p style={{ fontSize: 11, color: "#A8A29E", marginTop: 8 }}>Zolara Beauty Studio</p>
    </div>
  );
}
