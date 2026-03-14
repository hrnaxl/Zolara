import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const ProtectedRoute = ({ allowedRoles }) => {
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let resolved = false;

    const resolveRole = async (session) => {
      if (resolved) return;
      resolved = true;

      if (!session?.user) {
        if (mounted) { setUserRole(null); setLoading(false); }
        return;
      }

      try {
        // user_roles is the ONLY source of truth. Never fall back to user_metadata.
        // user_metadata can be stale or spoofed. The DB row is what the Owner controls.
        const { data: roleData, error: roleErr } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (!roleData?.role) {
          if (mounted) { setUserRole(null); setLoading(false); }
          return;
        }

        // Check account_status separately (column may not exist yet if migration pending)
        try {
          const { data: statusData } = await supabase
            .from("user_roles")
            .select("account_status")
            .eq("user_id", session.user.id)
            .maybeSingle();
          if (statusData?.account_status === "inactive") {
            await supabase.auth.signOut();
            if (mounted) { setUserRole(null); setLoading(false); }
            return;
          }
        } catch { /* column may not exist yet — allow login */ }

        let role = roleData.role;

        // For staff/receptionist: also validate staff registry is_active
        if (role === "staff" || role === "receptionist") {
          const { data: staffRecord } = await supabase
            .from("staff")
            .select("is_active")
            .eq("user_id", session.user.id)
            .maybeSingle();

          if (staffRecord && !staffRecord.is_active) {
            await supabase.from("user_roles").upsert({ user_id: session.user.id, role: "client" });
            role = "client";
          }
        }

        if (mounted) { setUserRole(role); setLoading(false); }
      } catch {
        // On error, deny access — never grant by default
        if (mounted) { setUserRole(null); setLoading(false); }
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      resolveRole(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        resolved = false;
        resolveRole(session);
      } else if (event === "SIGNED_OUT") {
        resolved = false;
        setUserRole(null);
        setLoading(false);
      }
    });

    const timeout = setTimeout(() => {
      if (mounted && loading) { resolved = true; setLoading(false); }
    }, 5000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#F5EFE6" }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#C9A87C" }} />
      </div>
    );
  }

  if (!userRole || !allowedRoles.includes(userRole)) {
    return <Navigate to="/app/auth" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
