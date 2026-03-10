import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const ProtectedRoute = ({ allowedRoles }) => {
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // First try to get session (faster than getUser)
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        if (mounted) setLoading(false);
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle();

      const metaRole = session.user.user_metadata?.role || null;
      if (mounted) {
        setUserRole(roleData?.role || metaRole || null);
        setLoading(false);
      }
    };

    // Also listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === "SIGNED_IN" && session?.user) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle();
        const metaRole = session.user.user_metadata?.role || null;
        setUserRole(roleData?.role || metaRole || null);
        setLoading(false);
      } else if (event === "SIGNED_OUT") {
        setUserRole(null);
        setLoading(false);
      }
    });

    init();

    return () => {
      mounted = false;
      subscription.unsubscribe();
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
