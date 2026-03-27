import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { useNavigate, Link, useLocation, Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";
import { LayoutDashboard, Calendar, Star, Scissors, User, LogOut, Menu, X, ChevronRight } from "lucide-react";

const G      = "#C8A97E";
const G_DARK = "#8B6914";
const NAVY   = "#0F1E35";
const NAVY2  = "#162640";
const CREAM  = "#FAFAF8";
const WHITE  = "#FFFFFF";
const BORDER = "#EDE8E0";

const TIERS = [
  { min: 0,   name: "Bronze",  color: "#CD7F32", bg: "rgba(205,127,50,0.15)" },
  { min: 50,  name: "Silver",  color: "#A0A0A0", bg: "rgba(160,160,160,0.15)" },
  { min: 150, name: "Gold",    color: G,          bg: "rgba(200,169,126,0.15)" },
  { min: 300, name: "Diamond", color: "#60A5FA",  bg: "rgba(96,165,250,0.15)" },
];
const getTier = (pts: number) => [...TIERS].reverse().find(t => pts >= t.min) || TIERS[0];

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard",   path: "/app/client/dashboard" },
  { icon: Calendar,        label: "My Bookings", path: "/app/client/bookings" },
  { icon: Star,            label: "Loyalty",     path: "/app/client/loyalty" },
  { icon: Scissors,        label: "Services",    path: "/app/client/services" },
  { icon: User,            label: "My Profile",  path: "/app/client/profile" },
  { icon: Star,            label: "Gift Cards",  path: "/app/client/gift-cards" },

];

export default function ClientPortal() {
  const navigate   = useNavigate();
  const location   = useLocation();
  useInactivityLogout(5 * 60 * 1000); // 5-minute inactivity logout for clients
  const [client, setClient]         = useState<any>(null);
  const [clientBookings, setClientBookings] = useState<any[]>([]);
  const [clientGiftCards, setClientGiftCards] = useState<any[]>([]);
  const [clientLoading, setClientLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Phone token auth — use backend API (bypasses RLS)
    const clientToken = localStorage.getItem("zolara_client_token");
    const clientPhone = localStorage.getItem("zolara_client_phone");
    if (clientToken && clientPhone) {
      (async () => {
        try {
          const res = await fetch("/api/client-me", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: clientToken, phone: clientPhone }),
          });
          if (res.status === 401) {
            // Session expired — clear and redirect to login
            localStorage.removeItem("zolara_client_token");
            localStorage.removeItem("zolara_client_phone");
            navigate("/client-login");
            return;
          }
          const d = await res.json();
          if (d.client) setClient(d.client);
          if (d.bookings) setClientBookings(d.bookings);
          if (d.giftCards) setClientGiftCards(d.giftCards);
        } catch { /* fail silently */ }
        setClientLoading(false);
      })();
      return;
    }

        supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { navigate("/client-login"); return; }
      setClientLoading(true);
      const userId = session.user.id;
      const userEmail = session.user.email?.toLowerCase();

      // 1. Try matching by user_id first
      let { data } = await (supabase as any).from("clients").select("*").eq("user_id", userId).maybeSingle();

      // 2. Try matching by phone first (most reliable — clients book with phone)
      if (!data) {
        const phone = session.user.user_metadata?.phone;
        if (phone) {
          const { data: byPhone } = await (supabase as any)
            .from("clients").select("*").eq("phone", phone).maybeSingle();
          if (byPhone) {
            await (supabase as any).from("clients").update({ user_id: userId }).eq("id", byPhone.id);
            data = { ...byPhone, user_id: userId };
          }
        }
      }

      // 3. Fall back to email match
      if (!data && userEmail) {
        const { data: byEmail } = await (supabase as any)
          .from("clients").select("*").ilike("email", userEmail).maybeSingle();
        if (byEmail) {
          await (supabase as any).from("clients").update({ user_id: userId }).eq("id", byEmail.id);
          data = { ...byEmail, user_id: userId };
        }
      }

      setClient(data);
      setClientLoading(false);
    });
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem("zolara_client_token");
    localStorage.removeItem("zolara_client_phone");
    localStorage.removeItem("zolara_client_id");
    await supabase.auth.signOut().catch(() => {});
    navigate("/client-login");
  };

  const tier = getTier(client?.loyalty_points || 0);

  const Sidebar = () => (
    <aside style={{
      position: "fixed", top: 0, left: 0, height: "100%", width: 240,
      background: NAVY, zIndex: 50, display: "flex", flexDirection: "column",
      transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
      transition: "transform 0.25s ease",
    }} className="lg-sidebar">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Montserrat:wght@400;500;600;700&display=swap');
        @media(min-width:1024px){.lg-sidebar{transform:translateX(0)!important}.lg-main{margin-left:240px!important}.lg-mheader{display:none!important}}
        .cnav:hover{background:rgba(200,169,126,0.08)!important}
      `}</style>

      {/* Brand */}
      <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src="https://ekvjnydomfresnkealpb.supabase.co/storage/v1/object/public/avatars/logo_1764609621458.jpg" alt="Zolara" style={{ width: 40, height: 40, borderRadius: "50%", border: `2px solid ${G}`, objectFit: "cover" }} />
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 700, color: WHITE, lineHeight: 1 }}>Zolara</div>
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.22em", color: `${G}99`, marginTop: 2 }}>CLIENT PORTAL</div>
          </div>
        </div>
        <button onClick={() => setSidebarOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", padding: 4, display: "flex" }} className="lg-hide">
          <X size={16} />
        </button>
      </div>

      {/* Client card */}
      {client && (
        <div style={{ padding: "16px 16px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: tier.bg, border: `2px solid ${tier.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: tier.color, flexShrink: 0 }}>
              {client.name?.[0]?.toUpperCase() || "C"}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: WHITE, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{client.name}</div>
              <div style={{ fontSize: 10, color: tier.color, fontWeight: 600, marginTop: 1 }}>✦ {tier.name} · {client.loyalty_points || 0} pts</div>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "12px 10px" }}>
        {NAV.map(({ icon: Icon, label, path }) => {
          const active = location.pathname === path || (path === "/app/client/dashboard" && location.pathname === "/app/client");
          return (
            <Link key={path} to={path} onClick={() => setSidebarOpen(false)} className="cnav"
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "11px 14px",
                borderRadius: 10, textDecoration: "none", marginBottom: 2,
                fontSize: 12, fontWeight: active ? 700 : 500, fontFamily: "'Montserrat', sans-serif",
                color: active ? G : "rgba(255,255,255,0.65)",
                background: active ? "rgba(200,169,126,0.12)" : "transparent",
                border: `1px solid ${active ? "rgba(200,169,126,0.25)" : "transparent"}`,
                transition: "all 0.15s",
              }}>
              <Icon size={15} style={{ color: active ? G : "rgba(255,255,255,0.4)", flexShrink: 0 }} />
              {label}
              {active && <ChevronRight size={12} style={{ marginLeft: "auto", color: G }} />}
            </Link>
          );
        })}
      </nav>

      {/* Book button */}
      <div style={{ padding: "0 10px 10px" }}>
        <Link to="/book" style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          padding: "12px", borderRadius: 10, textDecoration: "none",
          background: `linear-gradient(135deg, ${G_DARK}, ${G})`,
          color: WHITE, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
          boxShadow: `0 4px 16px ${G}44`,
        }}>
          + Book Appointment
        </Link>
      </div>

      {/* Sign out */}
      <div style={{ padding: "0 10px 16px", borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 10 }}>
        <button onClick={handleLogout} style={{
          display: "flex", alignItems: "center", gap: 8, width: "100%",
          padding: "10px 14px", borderRadius: 10,
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)",
          cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#FCA5A5",
          fontFamily: "'Montserrat', sans-serif",
        }}>
          <LogOut size={13} /> Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <div style={{ minHeight: "100vh", background: CREAM }}>
      {sidebarOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40 }}
          onClick={() => setSidebarOpen(false)} />
      )}
      <Sidebar />

      {/* Main */}
      <div className="lg-main" style={{ minHeight: "100vh", transition: "margin 0.25s" }}>
        {/* Mobile header */}
        <header className="lg-mheader" style={{
          position: "sticky", top: 0, zIndex: 30,
          background: WHITE, borderBottom: `1px solid ${BORDER}`,
          padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
          boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
        }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "6px 8px", cursor: "pointer", display: "flex", alignItems: "center", color: "#57534E" }}>
            <Menu size={16} />
          </button>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 700, color: "#1C1917" }}>Zolara</div>
          <Link to="/book" style={{ fontSize: 11, fontWeight: 700, color: G_DARK, textDecoration: "none", background: "rgba(200,169,126,0.1)", padding: "6px 12px", borderRadius: 16, border: `1px solid rgba(200,169,126,0.25)` }}>
            Book
          </Link>
        </header>

        <main style={{ padding: "clamp(20px,3vw,36px) clamp(16px,3vw,32px)", maxWidth: 1100, margin: "0 auto" }}>
          {clientLoading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 20 }}>
              <style>{`@keyframes zspin{to{transform:rotate(360deg)}}`}</style>
              <div style={{ width: 44, height: 44, borderRadius: "50%", border: "3px solid #EDE8E0", borderTop: "3px solid #C8A97E", animation: "zspin 0.8s linear infinite" }} />
              <p style={{ fontSize: 13, color: "#A8A29E", fontFamily: "'Montserrat',sans-serif" }}>Loading your account…</p>
            </div>
          ) : (
            <Outlet context={{ client, setClient, clientBookings, clientGiftCards }} />
          )}
        </main>
      </div>
    </div>
  );
}
