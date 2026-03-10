import { useEffect, useState } from "react";
import { useOutletContext, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, isAfter } from "date-fns";
import { Calendar, Star, Clock, Scissors, ArrowRight } from "lucide-react";

const GOLD = "#C9A84C";
const G_LIGHT = "#FDF6E3";
const NAVY = "#0F1E35";
const CREAM = "#FAFAF8";
const WHITE = "#FFFFFF";
const BORDER = "#EDE8E0";
const TXT = "#1C1917";
const TXT_MID = "#57534E";
const TXT_SOFT = "#A8A29E";

const TIERS = [
  { min: 0,   max: 199,  name: "Bronze",   color: "#CD7F32", next: 200 },
  { min: 200, max: 499,  name: "Silver",   color: "#A0A0A0", next: 500 },
  { min: 500, max: 999,  name: "Gold",     color: GOLD,      next: 1000 },
  { min: 1000,max: Infinity, name: "Platinum", color: "#B9F2FF", next: null },
];

const getTier = (pts: number) => TIERS.find(t => pts >= t.min && pts <= t.max) || TIERS[0];

export default function ClientDashboard() {
  const { client } = useOutletContext<any>();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!client?.id) return;
    supabase.from("bookings")
      .select("id, service_name, preferred_date, preferred_time, status, price")
      .eq("client_id", client.id)
      .order("preferred_date", { ascending: false })
      .limit(20)
      .then(({ data }) => { setBookings(data || []); setLoading(false); });
  }, [client]);

  if (!client) return (
    <div style={{ padding:40, textAlign:"center" }}>
      <p style={{ color:TXT_SOFT, fontSize:14, marginBottom:16 }}>No client profile linked to your account.</p>
      <a href="/book" style={{ color:GOLD, fontWeight:600, fontSize:13 }}>Book your first appointment →</a>
    </div>
  );

  const pts = client.loyalty_points || 0;
  const tier = getTier(pts);
  const upcoming = bookings.filter(b => ["pending","confirmed"].includes(b.status) && b.preferred_date >= format(new Date(), "yyyy-MM-dd"));
  const completed = bookings.filter(b => b.status === "completed");
  const totalSpent = client.total_spent || 0;
  const ptsToNext = tier.next ? tier.next - pts : null;
  const pctProgress = tier.next ? Math.min((pts - tier.min) / (tier.next - tier.min) * 100, 100) : 100;

  return (
    <div style={{ padding:"28px 28px 60px", maxWidth:900, margin:"0 auto", fontFamily:"'Montserrat',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Montserrat:wght@400;500;600;700&display=swap');`}</style>

      {/* Welcome */}
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.18em", color:TXT_SOFT, marginBottom:4 }}>WELCOME BACK</div>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:30, fontWeight:700, color:TXT }}>{client.name}</div>
      </div>

      {/* Stats row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:14, marginBottom:24 }}>
        {[
          { icon: Star,     label:"Loyalty Points",  value:pts,             sub:`${tier.name} tier` },
          { icon: Calendar, label:"Total Visits",     value:client.total_visits||0, sub:"all time" },
          { icon: Scissors, label:"Services Done",    value:completed.length, sub:"completed" },
          { icon: Clock,    label:"Upcoming",         value:upcoming.length,  sub:"appointments" },
        ].map(({ icon: Icon, label, value, sub }) => (
          <div key={label} style={{ background:WHITE, border:`1px solid ${BORDER}`, borderRadius:14, padding:"18px 20px", boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
              <div style={{ width:30, height:30, borderRadius:8, background:G_LIGHT, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Icon size={14} style={{ color:GOLD }} />
              </div>
              <span style={{ fontSize:10, fontWeight:700, letterSpacing:"0.12em", color:TXT_SOFT, textTransform:"uppercase" }}>{label}</span>
            </div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:28, fontWeight:700, color:TXT, lineHeight:1 }}>{value}</div>
            <div style={{ fontSize:11, color:TXT_SOFT, marginTop:4 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Loyalty card */}
      <div style={{ background:NAVY, borderRadius:16, padding:"24px 28px", marginBottom:24, color:WHITE }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <div>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.18em", color:"rgba(255,255,255,0.5)", marginBottom:4 }}>LOYALTY STATUS</div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:24, fontWeight:700, color:tier.color }}>{tier.name} Member</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:34, fontWeight:700, color:GOLD }}>{pts}</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.5)" }}>points</div>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ height:6, background:"rgba(255,255,255,0.1)", borderRadius:3, marginBottom:8 }}>
          <div style={{ height:"100%", borderRadius:3, background:GOLD, width:`${pctProgress}%`, transition:"width 0.5s" }} />
        </div>
        {ptsToNext ? (
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)" }}>{ptsToNext} more points to {TIERS[TIERS.findIndex(t=>t.name===tier.name)+1]?.name}</div>
        ) : (
          <div style={{ fontSize:11, color:GOLD }}>🏆 You've reached the highest tier!</div>
        )}
      </div>

      {/* Upcoming appointments */}
      <div style={{ background:WHITE, border:`1px solid ${BORDER}`, borderRadius:16, padding:"24px", marginBottom:20, boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, fontWeight:700, color:TXT }}>Upcoming Appointments</div>
          <Link to="/app/client/bookings" style={{ fontSize:12, fontWeight:600, color:GOLD, textDecoration:"none", display:"flex", alignItems:"center", gap:4 }}>View all <ArrowRight size={13}/></Link>
        </div>
        {upcoming.length === 0 ? (
          <div style={{ textAlign:"center", padding:"24px 0" }}>
            <p style={{ color:TXT_SOFT, fontSize:13, marginBottom:12 }}>No upcoming appointments</p>
            <a href="/book" style={{ display:"inline-block", padding:"10px 20px", background:`linear-gradient(135deg,${GOLD},#A8892E)`, borderRadius:10, color:WHITE, fontSize:12, fontWeight:700, textDecoration:"none" }}>Book Now</a>
          </div>
        ) : upcoming.map((b, i) => (
          <div key={b.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 0", borderBottom: i < upcoming.length-1 ? `1px solid ${BORDER}` : "none" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:38, height:38, borderRadius:10, background:G_LIGHT, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Scissors size={16} style={{ color:GOLD }} />
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:TXT }}>{b.service_name || "Appointment"}</div>
                <div style={{ fontSize:11, color:TXT_SOFT, marginTop:2 }}>{b.preferred_date} · {b.preferred_time}</div>
              </div>
            </div>
            <span style={{ fontSize:10, fontWeight:700, padding:"4px 10px", borderRadius:20, background: b.status==="confirmed"?"#D1FAE5":G_LIGHT, color: b.status==="confirmed"?"#065F46":GOLD, textTransform:"uppercase", letterSpacing:"0.06em" }}>{b.status}</span>
          </div>
        ))}
      </div>

      {/* Recent history */}
      {completed.length > 0 && (
        <div style={{ background:WHITE, border:`1px solid ${BORDER}`, borderRadius:16, padding:"24px", boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, fontWeight:700, color:TXT, marginBottom:16 }}>Recent Visits</div>
          {completed.slice(0,5).map((b,i) => (
            <div key={b.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0", borderBottom: i < Math.min(completed.length,5)-1 ? `1px solid ${BORDER}` : "none" }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:TXT }}>{b.service_name || "Service"}</div>
                <div style={{ fontSize:11, color:TXT_SOFT }}>{b.preferred_date}</div>
              </div>
              {b.price && <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, fontWeight:700, color:TXT }}>GHS {Number(b.price).toLocaleString()}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
