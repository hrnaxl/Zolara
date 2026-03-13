import { useState, useEffect } from "react";
import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { User } from "@supabase/supabase-js";
import {
  LayoutDashboard,
  Calendar,
  Users,
  UserCog,
  Scissors,
  CreditCard,
  FileText,
  LogOut,
  Menu,
  X,
  Clock,
  Settings,
  MessageSquare,
  CheckIcon,
  Gift,
  Star,
  Tag,
  BarChart2,
  ShoppingBag,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useSettings } from "@/context/SettingsContext";

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useSettings();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<string>("");
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session?.user) navigate("/app/auth");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      // Clear stale role immediately on sign-out so it never bleeds into next login
      if (!session?.user) {
        setCurrentRole("");
        setRoleLoading(true);
        if (event !== "INITIAL_SESSION") navigate("/app/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    // Sync role from DB — user_roles is the ONLY source of truth.
    // Never use user_metadata as fallback — it can be stale and cause wrong nav paths.
    const syncRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: roleData } = await supabase
          .from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
        if (!roleData?.role) { setRoleLoading(false); return; }
        const role = roleData.role;
        setCurrentRole(role);
        localStorage.setItem("user", JSON.stringify({ id: user.id, email: user.email, role }));
      } catch (err) {
        console.error("Failed to sync user role", err);
      } finally {
        setRoleLoading(false);
      }
    };

    syncRole();
    window.addEventListener("focus", syncRole);
    return () => window.removeEventListener("focus", syncRole);
  }, []);

  const handleLogout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      navigate("/app/auth");
    } catch (error) {
      toast.error("Try again");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // ==========================================================
  // BASE NAV ITEMS (DO NOT CHANGE)
  // ==========================================================
  const baseNavItems = [
    { icon: LayoutDashboard, label: "Dashboard",           path: "dashboard" },
    { icon: Calendar,        label: "Bookings",            path: "bookings" },
    { icon: Users,           label: "Clients",             path: "clients" },
    { icon: UserCog,         label: "Staff",               path: "staff" },
    { icon: Scissors,        label: "Services",            path: "services" },
    { icon: CreditCard,      label: "Sales",               path: "sales" },
    { icon: Gift,            label: "Gift Cards",          path: "gift-cards" },
    { icon: Gift,            label: "Print Gift Cards",     path: "gift-card-batches" },
    { icon: CheckIcon,       label: "Checkout",            path: "checkout" },
    { icon: Star,            label: "Loyalty",             path: "loyalty" },
    { icon: Tag,             label: "Promo Codes",         path: "promo-codes" },
    { icon: ShoppingBag,     label: "Products",            path: "products" },
    { icon: RefreshCw,       label: "Subscriptions",       path: "subscriptions" },
    { icon: BarChart2,       label: "Analytics",           path: "analytics" },
    { icon: FileText,        label: "Reports",             path: "reports" },
    { icon: Clock,           label: "Attendance",          path: "attendance" },
    { icon: FileText,        label: "Attendance Reports",  path: "attendance-reports" },
    { icon: MessageSquare,   label: "SMS Test",            path: "sms-test" },
    { icon: Settings,        label: "Settings",            path: "settings" },
  ];

  // ==========================================================
  // ROLE-BASED NAV ITEMS
  // ==========================================================
  const getNavItemsForRole = (role: string) => {
    switch (role) {
      // ── OWNER / ADMIN: full access, all items ──────────────────
      case "owner":
      case "admin":
        return baseNavItems.map((item) => ({
          ...item,
          path: `/app/admin/${item.path}`,
        }));

      // ── RECEPTIONIST: front-desk operations ────────────────────
      // No: Sales, Analytics, Reports, Attendance Reports, Settings,
      //     Add-ons, SMS Campaigns, Subscriptions, Products
      case "receptionist": {
        const allowed = [
          "Dashboard", "Bookings", "Clients", "Staff",
          "Services", "Gift Cards", "Checkout", "Loyalty",
          "Promo Codes", "Attendance",
        ];
        return baseNavItems
          .filter((item) => allowed.includes(item.label))
          .map((item) => ({ ...item, path: `/app/receptionist/${item.path}` }));
      }

      // ── STAFF: personal work only ───────────────────────────────
      case "staff": {
        const allowed = ["Dashboard", "Bookings", "Services", "Attendance", "Promo Codes"];
        return baseNavItems
          .filter((item) => allowed.includes(item.label))
          .map((item) => ({ ...item, path: `/app/staff/${item.path}` }));
      }

      // ── CLEANER: view only + attendance ────────────────────────
      case "cleaner": {
        const allowed = ["Dashboard", "Promo Codes", "Services", "Attendance"];
        return baseNavItems
          .filter((item) => allowed.includes(item.label))
          .map((item) => ({ ...item, path: `/app/cleaner/${item.path}` }));
      }

      // ── CLIENT: personal portal ─────────────────────────────────
      case "client": {
        const allowed = ["Dashboard", "Bookings", "Services"];
        return baseNavItems
          .filter((item) => allowed.includes(item.label))
          .map((item) => ({ ...item, path: `/app/client/${item.path}` }));
      }

      default:
        return [];
    }
  };

  const activeRole = currentRole;
  const navItems = getNavItemsForRole(activeRole);

  const roleLabels: Record<string, string> = {
    owner: "Owner Access",
    admin: "Admin Access",
    receptionist: "Reception",
    staff: "Staff Access",
    cleaner: "Cleaner Access",
    client: "Client",
  };

  // Deep navy palette
  const NAVY      = "#0F1E35";
  const NAVY_MID  = "#162844";
  const NAVY_HOVER= "#1E3558";
  const GOLD      = "#C9A84C";
  const GOLD_LIGHT= "rgba(201,168,76,0.15)";
  const WHITE     = "#FFFFFF";
  const WHITE_DIM = "rgba(255,255,255,0.55)";
  const WHITE_MID = "rgba(255,255,255,0.80)";
  const CREAM     = "#FAFAF8";
  const BORDER    = "#EDE8E0";

  return (
    <div style={{ minHeight: "100vh", background: CREAM, fontFamily: "'Montserrat', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap');
        .nav-link { display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:10px; text-decoration:none; transition:all 0.18s; font-family:'Montserrat',sans-serif; font-size:12px; font-weight:500; color:${WHITE_MID}; }
        .nav-link:hover { background:${NAVY_HOVER}; color:${WHITE}; }
        .nav-link.active { background:${GOLD_LIGHT}; color:${GOLD}; font-weight:600; border:1px solid rgba(201,168,76,0.25); }
        .nav-link.active svg { color:${GOLD} !important; }
        .nav-link:hover svg { color:${WHITE} !important; }
        .sidebar-scroll { scrollbar-width:thin; scrollbar-color:rgba(201,168,76,0.35) rgba(255,255,255,0.05); }
        .sidebar-scroll::-webkit-scrollbar { width:5px; }
        .sidebar-scroll::-webkit-scrollbar-track { background:rgba(255,255,255,0.05); border-radius:4px; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background:rgba(201,168,76,0.35); border-radius:4px; }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover { background:rgba(201,168,76,0.6); }
        .sidebar-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:40; backdrop-filter:blur(2px); }
        .z-page { padding: clamp(12px, 3vw, 28px) clamp(12px, 3vw, 28px); }
        @media(max-width:640px){ .z-title{font-size:22px!important} table{font-size:12px} }
        @media(max-width:1023px){ .mobile-topbar{ display:block !important; } }
      `}</style>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── SIDEBAR ─────────────────────────────────── */}
      <aside style={{
        position: "fixed", top: 0, left: 0, height: "100dvh", width: "240px",
        background: NAVY,
        zIndex: 50, display: "flex", flexDirection: "column",
        overflowY: "auto", WebkitOverflowScrolling: "touch",
      }} className={`transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>

        {/* Logo / Brand */}
        <div style={{ padding: "0 0 0", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
          <div style={{ padding: "20px 18px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "50%", overflow: "hidden", border: `2px solid ${GOLD}`, flexShrink: 0, boxShadow: "0 0 0 3px rgba(201,168,76,0.12)" }}>
                <img
                  src={settings.logo_url !== null ? settings.logo_url : "/logo.png"}
                  style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }}
                  onClick={() => navigate("/")}
                  alt="Zolara"
                />
              </div>
              <div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "21px", fontWeight: 700, color: WHITE, lineHeight: 1.1 }}>Zolara</div>
                <div style={{ fontSize: "7.5px", fontWeight: 700, letterSpacing: "0.24em", color: WHITE_DIM, marginTop: "2px" }}>BEAUTY STUDIO</div>
              </div>
            </div>
            <button
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
              style={{ background: "none", border: "none", cursor: "pointer", color: WHITE_DIM, padding: "4px" }}
            >
              <X size={18} />
            </button>
          </div>
          {/* Role badge — full-width strip below the logo row */}
          <div style={{ padding: "0 18px 14px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(201,168,76,0.12)", borderRadius: "6px", padding: "5px 10px", border: "1px solid rgba(201,168,76,0.2)" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: GOLD, flexShrink: 0 }} />
              <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", color: GOLD }}>
                {roleLabels[activeRole] || "Access"}
              </span>
            </div>
          </div>
        </div>

        {/* Nav — scrollable */}
        <nav className="sidebar-scroll" style={{ flex: 1, overflowY: "auto", padding: "10px 10px 20px", WebkitOverflowScrolling: "touch", minHeight: 0 }}>
          {roleLoading ? (
            <div style={{ padding: "20px 14px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{ height: "36px", borderRadius: "10px", background: "rgba(255,255,255,0.05)" }} />
              ))}
            </div>
          ) : navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`nav-link${isActive ? " active" : ""}`}
              >
                <Icon size={15} style={{ flexShrink: 0, color: isActive ? GOLD : WHITE_DIM }} />
                <span>{item.label}</span>
                {isActive && (
                  <div style={{ marginLeft: "auto", width: "5px", height: "5px", borderRadius: "50%", background: GOLD }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Footer */}
        <div style={{ padding: "12px 14px 16px", borderTop: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", borderRadius: "10px", background: NAVY_MID, marginBottom: "8px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: GOLD_LIGHT, border: `1.5px solid ${GOLD}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: GOLD }}>{user?.email?.[0]?.toUpperCase()}</span>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "11px", fontWeight: 500, color: WHITE_MID, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.email}</div>
            </div>
          </div>
          <button
            onClick={() => setOpen(true)}
            style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "10px 12px", borderRadius: "8px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", cursor: "pointer", fontSize: "12px", fontWeight: 600, color: "#FCA5A5", fontFamily: "'Montserrat', sans-serif", transition: "all 0.18s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.2)"; (e.currentTarget as HTMLElement).style.color = "#FEE2E2"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.1)"; (e.currentTarget as HTMLElement).style.color = "#FCA5A5"; }}
          >
            <LogOut size={14} />
            Sign Out
          </button>

          <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogContent style={{ fontFamily: "'Montserrat', sans-serif", borderColor: "#E8E3DC" }}>
              <AlertDialogHeader>
                <AlertDialogTitle style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "22px" }}>Sign out?</AlertDialogTitle>
                <AlertDialogDescription style={{ fontSize: "12px" }}>You will be signed out of your Zolara account.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "12px" }}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  style={{ background: "linear-gradient(135deg,#C9A84C,#B8975A)", fontFamily: "'Montserrat', sans-serif", fontSize: "12px" }}
                  onClick={() => { setOpen(false); handleLogout(); }}
                >
                  Sign Out
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </aside>

      {/* ── MAIN CONTENT ─────────────────────────────── */}
      <div className="lg:ml-[240px]" style={{ minHeight: "100vh" }}>
        {/* Mobile top bar — only visible on phones, hidden on lg+ */}
        <div style={{display:"none"}} className="mobile-topbar">
        <div style={{
          position: "sticky", top: 0, zIndex: 30,
          background: NAVY, height: 56, display: "flex", alignItems: "center",
          justifyContent: "space-between", padding: "0 16px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
        }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", color: WHITE, padding: 4 }}>
            <Menu size={22} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", overflow: "hidden", border: `1.5px solid ${GOLD}` }}>
              <img src={settings.logo_url || "/logo.png"} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="Zolara" />
            </div>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 700, color: WHITE }}>Zolara</span>
          </div>
          <div style={{ width: 30 }} />
        </div>
        </div>
        <main style={{ background: CREAM, minHeight: "100vh", overflowX: "hidden" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;