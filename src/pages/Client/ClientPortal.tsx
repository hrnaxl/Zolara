import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Outlet } from "react-router-dom";
import { LayoutDashboard, Calendar, Star, LogOut, Menu, X } from "lucide-react";

const GOLD = "#C9A84C";
const NAVY = "#0F1E35";
const CREAM = "#FAFAF8";
const BORDER = "#EDE8E0";
const WHITE = "#FFFFFF";
const TXT_SOFT = "rgba(255,255,255,0.55)";
const TXT_MID = "rgba(255,255,255,0.80)";
const NAVY_HOVER = "#1E3558";

export default function ClientPortal() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { navigate("/app/client/auth"); return; }
      setUser(session.user);
      const { data } = await supabase.from("clients").select("*").eq("user_id", session.user.id).maybeSingle();
      setClient(data);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/app/client/auth");
  };

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard",  path: "/app/client/dashboard" },
    { icon: Calendar,        label: "My Bookings", path: "/app/client/bookings" },
    { icon: Star,            label: "Loyalty",     path: "/app/client/loyalty" },
  ];

  const Sidebar = () => (
    <aside style={{ position:"fixed", top:0, left:0, height:"100%", width:220, background:NAVY, zIndex:50, display:"flex", flexDirection:"column" }}
      className={`transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&family=Montserrat:wght@400;500;600;700&display=swap'); .cnav:hover{background:${NAVY_HOVER}!important;color:${WHITE}!important;} .cnav.active{background:rgba(201,168,76,0.15)!important;color:${GOLD}!important;border:1px solid rgba(201,168,76,0.25)!important;}`}</style>
      {/* Brand */}
      <div style={{ padding:"22px 20px 18px", borderBottom:"1px solid rgba(255,255,255,0.08)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <img src="/logo.png" style={{ width:40, height:40, borderRadius:"50%", border:`2px solid ${GOLD}`, objectFit:"cover" }} alt="Zolara" />
          <div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, fontWeight:700, color:WHITE, lineHeight:1 }}>Zolara</div>
            <div style={{ fontSize:8, fontWeight:600, letterSpacing:"0.2em", color:TXT_SOFT, marginTop:2 }}>CLIENT PORTAL</div>
          </div>
        </div>
        <button className="lg:hidden" onClick={() => setSidebarOpen(false)} style={{ background:"none", border:"none", cursor:"pointer", color:TXT_SOFT, padding:4 }}><X size={16}/></button>
      </div>

      {/* Client info */}
      {client && (
        <div style={{ padding:"14px 16px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:"50%", background:"rgba(201,168,76,0.2)", border:`1.5px solid ${GOLD}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, color:GOLD, flexShrink:0 }}>
              {client.name?.[0]?.toUpperCase() || "C"}
            </div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600, color:WHITE, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{client.name}</div>
              <div style={{ fontSize:10, color:TXT_SOFT }}>⭐ {client.loyalty_points || 0} points</div>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex:1, overflowY:"auto", padding:"10px 10px" }}>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}
              className={`cnav${isActive ? " active" : ""}`}
              style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderRadius:10, textDecoration:"none", fontSize:12, fontWeight:500, color: isActive ? GOLD : TXT_MID, marginBottom:2, fontFamily:"'Montserrat',sans-serif", border:"1px solid transparent", transition:"all 0.15s" }}>
              <Icon size={15} style={{ flexShrink:0, color: isActive ? GOLD : TXT_SOFT }} />
              {item.label}
              {isActive && <div style={{ marginLeft:"auto", width:5, height:5, borderRadius:"50%", background:GOLD }} />}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div style={{ padding:"12px 14px 16px", borderTop:"1px solid rgba(255,255,255,0.08)" }}>
        <button onClick={handleLogout}
          style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"10px 12px", borderRadius:8, background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", cursor:"pointer", fontSize:12, fontWeight:600, color:"#FCA5A5", fontFamily:"'Montserrat',sans-serif" }}>
          <LogOut size={14}/> Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <div style={{ minHeight:"100vh", background:CREAM }}>
      {sidebarOpen && <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:40 }} className="lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <Sidebar />
      <div className="lg:ml-[220px]" style={{ minHeight:"100vh" }}>
        {/* Mobile header */}
        <header className="lg:hidden" style={{ position:"sticky", top:0, zIndex:30, background:WHITE, borderBottom:`1px solid ${BORDER}`, padding:"14px 16px", display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background:"none", border:`1px solid ${BORDER}`, borderRadius:8, padding:7, cursor:"pointer", display:"flex", alignItems:"center", color:"#57534E" }}>
            <Menu size={16}/>
          </button>
          <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, fontWeight:700, color:"#1C1917" }}>Zolara</span>
        </header>
        <main style={{ minHeight:"100vh" }}>
          <Outlet context={{ client, user }} />
        </main>
      </div>
    </div>
  );
}
