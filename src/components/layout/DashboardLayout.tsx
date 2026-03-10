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
  CheckIcon,
  Gift,
  Star,
  ListOrdered,
  Sparkles,
  Tag,
  MessageSquare,
  BarChart2,
  ShoppingBag,
  RefreshCw,
  StickyNote,
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
      if (!session?.user && event !== "INITIAL_SESSION") navigate("/app/auth");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    // fetch role for the current user to ensure nav reflects latest permissions
    const syncRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
        const metaDataRole = (user as any).user_metadata?.role || "";
        const role = roleData?.role || metaDataRole || "";
        setCurrentRole(role);
        // store in localStorage for legacy parts that read it
        localStorage.setItem("user", JSON.stringify({ id: user.id, email: user.email, role }));
      } catch (err) {
        console.error("Failed to sync user role", err);
      }
    };

    syncRole();
    // re-sync role when window gains focus (helps reflect admin changes)
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
    { icon: CheckIcon,       label: "Checkout",            path: "checkout" },
    { icon: Star,            label: "Loyalty",             path: "loyalty" },
    { icon: ListOrdered,     label: "Waitlist",            path: "waitlist" },
    { icon: Sparkles,        label: "Add-ons",             path: "addons" },
    { icon: Tag,             label: "Promo Codes",         path: "promo-codes" },
    { icon: MessageSquare,   label: "SMS Campaigns",       path: "sms" },
    { icon: ShoppingBag,     label: "Products",            path: "products" },
    { icon: RefreshCw,       label: "Subscriptions",       path: "subscriptions" },
    { icon: StickyNote,      label: "Client Notes",        path: "client-notes" },
    { icon: BarChart2,       label: "Analytics",           path: "analytics" },
    { icon: FileText,        label: "Reports",             path: "reports" },
    { icon: Clock,           label: "Attendance",          path: "attendance" },
    { icon: FileText,        label: "Attendance Reports",  path: "attendance-reports" },
    { icon: Settings,        label: "Settings",            path: "settings" },
  ];

  // ==========================================================
  // ROLE-BASED NAV ITEMS
  // ==========================================================
  const getNavItemsForRole = (role: string) => {
    switch (role) {
      case "admin":
        return baseNavItems.map((item) => ({
          ...item,
          path: `/app/admin/${item.path}`,
        }))
      // ------------------------------------------------------
      // OWNER: FULL ACCESS
      // ------------------------------------------------------
      case "owner":
        return baseNavItems.map((item) => ({
          ...item,
          path: `/app/admin/${item.path}`,
        }));

      // ------------------------------------------------------
      // RECEPTIONIST: LIMITED ACCESS
      // Staff List → Allowed
      // Sales / Reports → Hidden
      // Attendance Reports → Admin only
      // ------------------------------------------------------
      case "receptionist":
        return baseNavItems
          .filter((item) => !["Sales", "Reports", "Attendance Reports"].includes(item.label))
          .map((item) => ({ ...item, path: `/app/admin/${item.path}` }));

      default:
        return baseNavItems.map((item) => ({ ...item, path: `/app/admin/${item.path}` }));
    }
  };

  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const navItems = getNavItemsForRole(currentRole || storedUser.role || "");

  const roleLabels: Record<string, string> = {
    owner: "Owner Access",
    admin: "Admin Access",
    receptionist: "Reception",
    staff: "Staff Access",
    client: "Client",
  };

  // ── palette ──────────────────────────────────────────
  const GOLD       = "#B8975A";
  const GOLD_LIGHT = "#F5ECD6";
  const CREAM      = "#FAFAF8";
  const WHITE      = "#FFFFFF";
  const BORDER     = "#EDE8E0";
  const TXT        = "#1C1917";
  const TXT_MID    = "#78716C";
  const TXT_SOFT   = "#A8A29E";

  return (
    <div style={{ minHeight: "100vh", background: CREAM, fontFamily: "'Montserrat', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap');
        .nav-link { display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:10px; text-decoration:none; transition:all 0.18s; font-family:'Montserrat',sans-serif; font-size:12px; font-weight:500; color:${TXT_MID}; }
        .nav-link:hover { background:${GOLD_LIGHT}; color:${GOLD}; }
        .nav-link.active { background:${GOLD_LIGHT}; color:${GOLD}; font-weight:600; }
        .nav-link.active svg { color:${GOLD} !important; }
        .nav-link:hover svg { color:${GOLD} !important; }
        .sidebar-overlay { position:fixed; inset:0; background:rgba(28,25,23,0.4); z-index:40; backdrop-filter:blur(2px); }
        @keyframes slideIn { from{transform:translateX(-100%)} to{transform:translateX(0)} }
      `}</style>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── SIDEBAR ─────────────────────────────────── */}
      <aside style={{
        position: "fixed", top: 0, left: 0, height: "100%", width: "240px",
        background: WHITE,
        borderRight: `1px solid ${BORDER}`,
        boxShadow: "2px 0 20px rgba(0,0,0,0.05)",
        zIndex: 50, display: "flex", flexDirection: "column",
        transform: sidebarOpen ? "translateX(0)" : undefined,
      }} className={`transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>

        {/* Logo / Brand */}
        <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "12px", overflow: "hidden", border: `2px solid ${GOLD_LIGHT}`, flexShrink: 0 }}>
              <img
                src={settings.logo_url !== null ? settings.logo_url : "/logo.png"}
                style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }}
                onClick={() => navigate("/")}
                alt="Zolara"
              />
            </div>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "18px", fontWeight: 700, color: TXT, lineHeight: 1 }}>Zolara</div>
              <div style={{ fontSize: "9px", fontWeight: 500, letterSpacing: "0.14em", color: TXT_SOFT, marginTop: "1px" }}>BEAUTY STUDIO</div>
              <div style={{ marginTop: "5px", display: "inline-flex", alignItems: "center", background: GOLD_LIGHT, borderRadius: "20px", padding: "2px 8px" }}>
                <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.08em", color: GOLD }}>
                  {roleLabels[storedUser.role] || "Access"}
                </span>
              </div>
            </div>
          </div>
          <button
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
            style={{ background: "none", border: "none", cursor: "pointer", color: TXT_SOFT, padding: "4px" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "12px 12px", scrollbarWidth: "none" }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`nav-link${isActive ? " active" : ""}`}
              >
                <Icon size={16} style={{ flexShrink: 0, color: isActive ? GOLD : TXT_SOFT }} />
                <span>{item.label}</span>
                {isActive && (
                  <div style={{ marginLeft: "auto", width: "5px", height: "5px", borderRadius: "50%", background: GOLD }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Footer */}
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${BORDER}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", borderRadius: "10px", background: CREAM, marginBottom: "6px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: GOLD_LIGHT, border: `1.5px solid ${GOLD}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: GOLD }}>{user?.email?.[0]?.toUpperCase()}</span>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: TXT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.email}</div>
            </div>
          </div>
          <button
            onClick={() => setOpen(true)}
            style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "9px 12px", borderRadius: "8px", background: "none", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 500, color: TXT_SOFT, fontFamily: "'Montserrat', sans-serif", transition: "all 0.18s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#FEF2F2"; (e.currentTarget as HTMLElement).style.color = "#DC2626"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "none"; (e.currentTarget as HTMLElement).style.color = TXT_SOFT; }}
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
        {/* Mobile top bar */}
        <header className="lg:hidden" style={{ position: "sticky", top: 0, zIndex: 30, background: WHITE, borderBottom: `1px solid ${BORDER}`, padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: "8px", padding: "7px", cursor: "pointer", display: "flex", alignItems: "center", color: TXT_MID }}
          >
            <Menu size={16} />
          </button>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "18px", fontWeight: 600, color: TXT }}>Zolara</span>
        </header>

        <main style={{ background: CREAM, minHeight: "100vh" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
