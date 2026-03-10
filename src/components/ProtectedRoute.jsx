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
      } catch {
        // If role fetch fails, fall back to metadata role
        const metaRole = session.user.user_metadata?.role || null;
        if (mounted) { setUserRole(metaRole); setLoading(false); }
      }
    };

    // Primary: getSession is synchronous from storage on refresh
    supabase.auth.getSession().then(({ data: { session } }) => {
      resolveRole(session);
    });

    // Secondary: catch any auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        resolved = false; // allow re-resolve on new login
        resolveRole(session);
      } else if (event === "SIGNED_OUT") {
        resolved = false;
        setUserRole(null);
        setLoading(false);
      }
    });

    // Hard timeout — never hang forever
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        resolved = true;
        setLoading(false);
      }
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
