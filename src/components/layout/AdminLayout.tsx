import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Calendar, Users, UserCheck, DollarSign,
  TrendingUp, Clock, ClipboardList, Gift, Settings, LogOut,
  Menu, X, Bell, ChevronRight
} from "lucide-react";

const Z = {
  bg: "#F5EFE6", dark: "#1C1008", gold: "#C9A87C",
  mid: "#EDE3D5", border: "#D4B896", muted: "#6B5744",
  darkBg: "#1C1008", font: "Playfair Display, Georgia, serif"
};

const navItems = [
  { href: "/app/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/app/admin/bookings", icon: Calendar, label: "Bookings" },
  { href: "/app/admin/checkout", icon: DollarSign, label: "Checkout" },
  { href: "/app/admin/clients", icon: Users, label: "Clients" },
  { href: "/app/admin/staff", icon: UserCheck, label: "Staff" },
  { href: "/app/admin/sales", icon: TrendingUp, label: "Sales" },
  { href: "/app/admin/attendance", icon: Clock, label: "Attendance" },
  { href: "/app/admin/reports", icon: ClipboardList, label: "Reports" },
  { href: "/app/admin/gift-cards", icon: Gift, label: "Gift Cards" },
  { href: "/app/admin/services", icon: ClipboardList, label: "Services" },
  { href: "/app/admin/settings", icon: Settings, label: "Settings" },
];

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({ todayBookings: 0, todayRevenue: 0, pendingBookings: 0 });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];

    const [bookingsRes, salesRes, pendingRes] = await Promise.all([
      supabase.from("bookings").select("*").eq("preferred_date", today),
      supabase.from("sales").select("*").gte("created_at", today + "T00:00:00"),
      supabase.from("bookings").select("*").eq("status", "pending"),
    ]);

    const todayRevenue = (salesRes.data || []).reduce((sum: number, s: any) => sum + (s.amount || 0), 0);
    setStats({
      todayBookings: bookingsRes.data?.length || 0,
      todayRevenue,
      pendingBookings: pendingRes.data?.length || 0,
    });

    const { data: rb } = await supabase.from("bookings").select("*").order("created_at", { ascending: false }).limit(5);
    const { data: rs } = await supabase.from("sales").select("*").order("created_at", { ascending: false }).limit(5);
    setRecentBookings(rb || []);
    setRecentSales(rs || []);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/app/auth");
  };

  const Sidebar = () => (
    <div className="flex flex-col h-full" style={{ backgroundColor: Z.darkBg }}>
      <div className="px-6 py-6 border-b" style={{ borderColor: "#2C1F14" }}>
        <p className="text-xs font-bold tracking-widest uppercase" style={{ color: Z.gold }}>ZOLARA</p>
        <p className="text-[10px] tracking-widest uppercase mt-0.5" style={{ color: "#6B5744" }}>Management System</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = location.pathname === href;
          return (
            <Link key={href} to={href} onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all"
              style={{
                backgroundColor: active ? Z.gold : "transparent",
                color: active ? Z.dark : "#8B7355",
              }}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs font-semibold tracking-wide">{label}</span>
              {active && <ChevronRight className="w-3 h-3 ml-auto" />}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 py-4 border-t" style={{ borderColor: "#2C1F14" }}>
        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full transition-all hover:opacity-80" style={{ color: "#8B7355" }}>
          <LogOut className="w-4 h-4" />
          <span className="text-xs font-semibold tracking-wide">Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen" style={{ backgroundColor: Z.bg }}>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-56 flex-shrink-0 flex-col" style={{ backgroundColor: Z.darkBg }}>
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-56" style={{ backgroundColor: Z.darkBg }}>
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ backgroundColor: Z.bg, borderColor: Z.border }}>
          <div className="flex items-center gap-3">
            <button className="md:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" style={{ color: Z.muted }} />
            </button>
            <div>
              <p className="text-sm font-semibold" style={{ color: Z.dark }}>
                {navItems.find(n => n.href === location.pathname)?.label || "Dashboard"}
              </p>
              <p className="text-xs" style={{ color: Z.muted }}>
                {new Date().toLocaleDateString("en-GH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: Z.mid }}>
              <Bell className="w-4 h-4" style={{ color: Z.muted }} />
            </button>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: Z.gold, color: Z.dark }}>Z</div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {location.pathname === "/app/admin/dashboard" && (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: "Today's Bookings", value: stats.todayBookings, icon: Calendar, suffix: "appointments" },
                  { label: "Today's Revenue", value: `GHS ${stats.todayRevenue.toFixed(2)}`, icon: DollarSign, suffix: "collected" },
                  { label: "Pending Bookings", value: stats.pendingBookings, icon: Clock, suffix: "awaiting confirmation" },
                ].map(({ label, value, icon: Icon, suffix }) => (
                  <div key={label} className="p-6 rounded-xl" style={{ backgroundColor: Z.mid, border: `1px solid ${Z.border}` }}>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs font-semibold tracking-wider uppercase" style={{ color: Z.muted }}>{label}</p>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${Z.gold}20` }}>
                        <Icon className="w-4 h-4" style={{ color: Z.gold }} />
                      </div>
                    </div>
                    <p className="text-2xl font-bold mb-1" style={{ color: Z.dark }}>{loading ? "..." : value}</p>
                    <p className="text-xs" style={{ color: Z.muted }}>{suffix}</p>
                  </div>
                ))}
              </div>

              {/* Quick Actions */}
              <div>
                <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: Z.muted }}>QUICK ACTIONS</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "New Booking", href: "/app/admin/bookings", icon: Calendar },
                    { label: "Checkout", href: "/app/admin/checkout", icon: DollarSign },
                    { label: "Add Client", href: "/app/admin/clients", icon: Users },
                    { label: "View Reports", href: "/app/admin/reports", icon: TrendingUp },
                  ].map(({ label, href, icon: Icon }) => (
                    <Link key={href} to={href}>
                      <div className="p-4 rounded-xl flex flex-col items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer" style={{ backgroundColor: Z.mid, border: `1px solid ${Z.border}` }}>
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: Z.dark }}>
                          <Icon className="w-5 h-5" style={{ color: Z.gold }} />
                        </div>
                        <p className="text-xs font-semibold text-center" style={{ color: Z.dark }}>{label}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Recent Bookings */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${Z.border}` }}>
                  <div className="flex items-center justify-between px-5 py-4" style={{ backgroundColor: Z.mid }}>
                    <p className="text-sm font-semibold" style={{ color: Z.dark }}>Recent Bookings</p>
                    <Link to="/app/admin/bookings" className="text-xs font-semibold" style={{ color: Z.gold }}>View all</Link>
                  </div>
                  <div style={{ backgroundColor: Z.bg }}>
                    {loading ? (
                      <p className="text-xs text-center py-8" style={{ color: Z.muted }}>Loading...</p>
                    ) : recentBookings.length === 0 ? (
                      <p className="text-xs text-center py-8" style={{ color: Z.muted }}>No bookings yet</p>
                    ) : recentBookings.map((b: any) => (
                      <div key={b.id} className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: Z.border }}>
                        <div>
                          <p className="text-xs font-semibold" style={{ color: Z.dark }}>{b.client_name || "Client"}</p>
                          <p className="text-[11px]" style={{ color: Z.muted }}>{b.service_name} — {b.preferred_date}</p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{
                          backgroundColor: b.status === "confirmed" ? "#D1FAE5" : b.status === "pending" ? "#FEF3C7" : "#FEE2E2",
                          color: b.status === "confirmed" ? "#065F46" : b.status === "pending" ? "#92400E" : "#991B1B"
                        }}>{b.status}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${Z.border}` }}>
                  <div className="flex items-center justify-between px-5 py-4" style={{ backgroundColor: Z.mid }}>
                    <p className="text-sm font-semibold" style={{ color: Z.dark }}>Recent Sales</p>
                    <Link to="/app/admin/sales" className="text-xs font-semibold" style={{ color: Z.gold }}>View all</Link>
                  </div>
                  <div style={{ backgroundColor: Z.bg }}>
                    {loading ? (
                      <p className="text-xs text-center py-8" style={{ color: Z.muted }}>Loading...</p>
                    ) : recentSales.length === 0 ? (
                      <p className="text-xs text-center py-8" style={{ color: Z.muted }}>No sales yet</p>
                    ) : recentSales.map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: Z.border }}>
                        <div>
                          <p className="text-xs font-semibold" style={{ color: Z.dark }}>{s.client_name || "Client"}</p>
                          <p className="text-[11px]" style={{ color: Z.muted }}>{s.service_name} — {s.payment_method}</p>
                        </div>
                        <p className="text-xs font-bold" style={{ color: Z.gold }}>GHS {Number(s.amount).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
