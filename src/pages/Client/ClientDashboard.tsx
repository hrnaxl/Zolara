import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Calendar, Star, Scissors, Clock, ArrowRight, Sparkles } from "lucide-react";

const G      = "#C8A97E";
const G_DARK = "#8B6914";
const NAVY   = "#0F1E35";
const CREAM  = "#FAFAF8";
const WHITE  = "#FFFFFF";
const BORDER = "#EDE8E0";
const TXT    = "#1C160E";
const TXT_M  = "#78716C";
const TXT_S  = "#A8A29E";
const SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)";

const TIERS = [
  { min: 0,    max: 199,  name: "Bronze",   color: "#CD7F32", next: 200,  bg: "rgba(205,127,50,0.1)" },
  { min: 200,  max: 499,  name: "Silver",   color: "#A0A0A0", next: 500,  bg: "rgba(160,160,160,0.1)" },
  { min: 500,  max: 999,  name: "Gold",     color: G,          next: 1000, bg: "rgba(200,169,126,0.1)" },
  { min: 1000, max: Infinity, name: "Platinum", color: "#6366F1", next: null, bg: "rgba(99,102,241,0.1)" },
];
const getTier = (pts: number) => TIERS.find(t => pts >= t.min && pts <= t.max) || TIERS[0];

const STATUS_COLOR: Record<string, string> = {
  confirmed: "#22C55E", pending: "#F59E0B", completed: "#6366F1", cancelled: "#EF4444",
};
const STATUS_BG: Record<string, string> = {
  confirmed: "#F0FDF4", pending: "#FFFBEB", completed: "#EEF2FF", cancelled: "#FEF2F2",
};

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

export default function ClientDashboard() {
  const { client } = useOutletContext<any>();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!client?.id) return;
    (supabase as any).from("bookings")
      .select("id, service_name, preferred_date, preferred_time, status, price, deposit_paid")
      .eq("client_id", client.id)
      .order("preferred_date", { ascending: false })
      .limit(20)
      .then(({ data }: any) => { setBookings(data || []); setLoading(false); });
  }, [client]);

  if (!client) return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>👋</div>
      <p style={{ color: TXT_M, fontSize: 14, marginBottom: 20 }}>No client profile linked yet.</p>
      <a href="/book" style={{ color: G_DARK, fontWeight: 700, fontSize: 13, textDecoration: "none", background: "rgba(200,169,126,0.1)", padding: "10px 20px", borderRadius: 20, border: `1px solid rgba(200,169,126,0.3)` }}>
        Book Your First Appointment →
      </a>
    </div>
  );

  const pts = client.loyalty_points || 0;
  const tier = getTier(pts);
  const ptsToNext = tier.next ? tier.next - pts : null;
  const pct = tier.next ? Math.min((pts - tier.min) / (tier.next - tier.min) * 100, 100) : 100;
  const upcoming = bookings.filter(b => ["pending", "confirmed"].includes(b.status) && b.preferred_date >= format(new Date(), "yyyy-MM-dd"));
  const completed = bookings.filter(b => b.status === "completed");
  const dayStr = format(new Date(), "EEEE, MMMM d");

  return (
    <div style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Montserrat:wght@400;500;600;700&display=swap');`}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", color: TXT_S, textTransform: "uppercase", marginBottom: 4 }}>{dayStr}</p>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(26px,4vw,38px)", fontWeight: 700, color: TXT, margin: 0 }}>
          {greeting()}, {client.name?.split(" ")[0]} 👋
        </h1>
        <p style={{ fontSize: 13, color: TXT_M, marginTop: 4 }}>Welcome to your Zolara client portal.</p>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { icon: Star,     label: "Loyalty Points", value: pts,                    sub: `${tier.name} tier`,    color: tier.color },
          { icon: Calendar, label: "Total Visits",    value: client.total_visits || 0, sub: "all time",          color: "#6366F1" },
          { icon: Scissors, label: "Completed",       value: completed.length,       sub: "services done",       color: "#22C55E" },
          { icon: Clock,    label: "Upcoming",        value: upcoming.length,        sub: "appointments",        color: "#F59E0B" },
        ].map(({ icon: Icon, label, value, sub, color }) => (
          <div key={label} style={{ background: WHITE, borderRadius: 16, border: `1px solid ${BORDER}`, padding: "20px 22px", boxShadow: SHADOW }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={14} style={{ color }} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: TXT_S, textTransform: "uppercase" }}>{label}</span>
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 700, color: TXT, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 11, color: TXT_S, marginTop: 4 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Loyalty card + Upcoming row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 16, marginBottom: 24 }} className="client-grid">
        <style>{`.client-grid{grid-template-columns:1fr 1.4fr!important}@media(max-width:700px){.client-grid{grid-template-columns:1fr!important}}`}</style>

        {/* Loyalty card */}
        <div style={{ background: `linear-gradient(135deg, ${NAVY}, #1a3050)`, borderRadius: 20, padding: "28px 24px", boxShadow: `0 8px 32px rgba(15,30,53,0.25)`, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 120, height: 120, borderRadius: "50%", background: "rgba(200,169,126,0.08)" }} />
          <div style={{ position: "absolute", bottom: -30, left: -20, width: 100, height: 100, borderRadius: "50%", background: "rgba(200,169,126,0.05)" }} />
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20 }}>
              <Sparkles size={14} style={{ color: G }} />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", color: `${G}99` }}>LOYALTY REWARDS</span>
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: tier.bg, border: `1px solid ${tier.color}44`, borderRadius: 20, padding: "5px 12px", marginBottom: 16 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: tier.color }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: tier.color, letterSpacing: "0.06em" }}>{tier.name} Member</span>
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 42, fontWeight: 700, color: WHITE, lineHeight: 1, marginBottom: 4 }}>{pts}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 20 }}>loyalty points</div>
            {/* Progress bar */}
            {ptsToNext && (
              <>
                <div style={{ height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 4, marginBottom: 8, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${G_DARK}, ${G})`, borderRadius: 4, transition: "width 0.8s ease" }} />
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                  {ptsToNext} pts to {TIERS[TIERS.indexOf(tier) + 1]?.name}
                </div>
              </>
            )}
            {!ptsToNext && <div style={{ fontSize: 11, color: G }}>✦ Maximum tier achieved</div>}
          </div>
        </div>

        {/* Upcoming appointments */}
        <div style={{ background: WHITE, borderRadius: 20, border: `1px solid ${BORDER}`, padding: "24px", boxShadow: SHADOW }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: TXT_S, marginBottom: 2 }}>UPCOMING</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 700, color: TXT }}>Appointments</div>
            </div>
            <a href="/app/client/bookings" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: G_DARK, textDecoration: "none", fontWeight: 600 }}>
              View all <ArrowRight size={12} />
            </a>
          </div>
          {loading ? (
            <div style={{ textAlign: "center", padding: "20px 0", color: TXT_S, fontSize: 13 }}>Loading…</div>
          ) : upcoming.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📅</div>
              <p style={{ fontSize: 13, color: TXT_S, margin: "0 0 14px" }}>No upcoming appointments</p>
              <a href="/book" style={{ fontSize: 12, fontWeight: 700, color: G_DARK, textDecoration: "none", background: "rgba(200,169,126,0.1)", padding: "8px 18px", borderRadius: 20, border: `1px solid rgba(200,169,126,0.3)` }}>
                Book Now →
              </a>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {upcoming.slice(0, 3).map(b => (
                <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", borderRadius: 12, background: CREAM, border: `1px solid ${BORDER}` }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: `${STATUS_BG[b.status]}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: STATUS_COLOR[b.status], lineHeight: 1 }}>{format(new Date(b.preferred_date + "T00:00"), "dd")}</span>
                    <span style={{ fontSize: 9, color: STATUS_COLOR[b.status], textTransform: "uppercase" }}>{format(new Date(b.preferred_date + "T00:00"), "MMM")}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: TXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.service_name}</div>
                    <div style={{ fontSize: 11, color: TXT_S }}>{b.preferred_time}</div>
                  </div>
                  <div style={{ display: "inline-flex", padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: STATUS_BG[b.status], color: STATUS_COLOR[b.status] }}>
                    {b.status}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent history */}
      <div style={{ background: WHITE, borderRadius: 20, border: `1px solid ${BORDER}`, padding: "24px", boxShadow: SHADOW }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: TXT_S, marginBottom: 2 }}>HISTORY</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 700, color: TXT }}>Recent Visits</div>
          </div>
          <a href="/app/client/bookings" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: G_DARK, textDecoration: "none", fontWeight: 600 }}>
            All bookings <ArrowRight size={12} />
          </a>
        </div>
        {loading ? (
          <div style={{ textAlign: "center", padding: "20px 0", color: TXT_S, fontSize: 13 }}>Loading…</div>
        ) : completed.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px 0", color: TXT_S, fontSize: 13 }}>No completed visits yet.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
            {completed.slice(0, 6).map(b => (
              <div key={b.id} style={{ padding: "14px 16px", borderRadius: 12, border: `1px solid ${BORDER}`, background: CREAM }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: TXT, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.service_name}</div>
                <div style={{ fontSize: 11, color: TXT_S }}>{b.preferred_date ? format(new Date(b.preferred_date + "T00:00"), "MMM d, yyyy") : ""}</div>
                {b.price && <div style={{ fontSize: 12, fontWeight: 700, color: G_DARK, marginTop: 6 }}>GH₵ {Number(b.price).toLocaleString()}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        {[
          { label: "Book Appointment",  href: "/book",                   icon: "✂️", color: G_DARK, bg: "rgba(200,169,126,0.1)", border: "rgba(200,169,126,0.3)" },
          { label: "View Services",     href: "/app/client/services",    icon: "💅", color: "#6366F1", bg: "rgba(99,102,241,0.08)", border: "rgba(99,102,241,0.2)" },
          { label: "My Loyalty Points", href: "/app/client/loyalty",     icon: "⭐", color: "#F59E0B", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)" },
        ].map(item => (
          <a key={item.href} href={item.href} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "14px 18px",
            borderRadius: 14, textDecoration: "none", background: item.bg,
            border: `1px solid ${item.border}`, transition: "all 0.15s",
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}>
            <span style={{ fontSize: 22 }}>{item.icon}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: item.color }}>{item.label}</span>
            <ArrowRight size={12} style={{ color: item.color, marginLeft: "auto" }} />
          </a>
        ))}
      </div>
    </div>
  );
}
