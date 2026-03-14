import { useOutletContext } from "react-router-dom";
import { Star, Gift, ArrowRight } from "lucide-react";

const G      = "#C8A97E";
const G_DARK = "#8B6914";
const NAVY   = "#0F1E35";
const WHITE  = "#FFFFFF";
const CREAM  = "#FAFAF8";
const BORDER = "#EDE8E0";
const TXT    = "#1C160E";
const TXT_M  = "#78716C";
const TXT_S  = "#A8A29E";
const SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)";

const TIERS = [
  { min: 0,    max: 199,  name: "Bronze",   color: "#CD7F32", bg: "rgba(205,127,50,0.1)",   next: 200,  perks: ["Birthday month double points", "Member discounts"] },
  { min: 500,  max: 499,  name: "Silver",   color: "#A8A8A8", bg: "rgba(168,168,168,0.1)",  next: 500,  perks: ["All Bronze perks", "Priority booking", "Complimentary hand massage"] },
  { min: 500,  max: 999,  name: "Gold",     color: G,          bg: "rgba(200,169,126,0.1)",  next: 1000, perks: ["All Silver perks", "Free nail art on visits", "Exclusive Gold offers"] },
  { min: 1000, max: Infinity, name: "Diamond", color: "#6366F1", bg: "rgba(99,102,241,0.1)", next: null, perks: ["All Gold perks", "VIP priority always", "Free monthly treatment", "Personal beauty consultant"] },
];
const getTier = (pts: number) => TIERS.find(t => pts >= t.min && pts <= t.max) || TIERS[0];

export default function ClientLoyalty() {
  const { client } = useOutletContext<any>();

  if (!client) return (
    <div style={{ textAlign: "center", padding: "60px 20px", color: TXT_S, fontSize: 14 }}>
      Loading your loyalty details…
    </div>
  );

  const pts     = client.loyalty_points || 0;
  const tier    = getTier(pts);
  const tierIdx = TIERS.indexOf(tier);
  const pct     = tier.next ? Math.min((pts - tier.min) / (tier.next - tier.min) * 100, 100) : 100;
  const ptsToNext = tier.next ? tier.next - pts : null;

  return (
    <div style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Montserrat:wght@400;500;600;700&display=swap');`}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: TXT_S, textTransform: "uppercase", marginBottom: 4 }}>CLIENT PORTAL</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(26px,4vw,36px)", fontWeight: 700, color: TXT, margin: "0 0 4px" }}>Loyalty Rewards</h1>
        <p style={{ fontSize: 13, color: TXT_M }}>Every GHS 100 spent earns you 1 point. Double points on your birthday month.</p>
      </div>

      {/* Main loyalty card */}
      <div style={{ background: `linear-gradient(135deg, ${NAVY}, #1a3050)`, borderRadius: 24, padding: "clamp(24px,4vw,36px)", marginBottom: 24, boxShadow: "0 12px 40px rgba(15,30,53,0.3)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: "rgba(200,169,126,0.06)" }} />
        <div style={{ position: "absolute", bottom: -40, left: -30, width: 160, height: 160, borderRadius: "50%", background: "rgba(200,169,126,0.04)" }} />
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", color: `${G}80`, marginBottom: 8 }}>YOUR BALANCE</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(52px,8vw,72px)", fontWeight: 700, color: WHITE, lineHeight: 1 }}>{pts}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>loyalty points</div>
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: `${tier.bg}`, border: `1px solid ${tier.color}44`, borderRadius: 50, padding: "10px 18px" }}>
              <Star size={14} style={{ color: tier.color }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: tier.color, letterSpacing: "0.05em" }}>{tier.name} Member</span>
            </div>
          </div>

          {/* Progress */}
          {ptsToNext ? (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>{tier.name}</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>{TIERS[tierIdx + 1]?.name} ({tier.next} pts)</span>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
                <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${G_DARK}, ${G})`, borderRadius: 4, transition: "width 1s ease" }} />
              </div>
              <div style={{ fontSize: 12, color: G }}>{ptsToNext} more points to reach {TIERS[tierIdx + 1]?.name}</div>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: G, fontWeight: 600 }}>✦ You've reached the highest tier. Congratulations!</div>
          )}
        </div>
      </div>

      {/* Tier breakdown */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: TXT_S, marginBottom: 14 }}>ALL TIERS</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          {TIERS.map((t, i) => {
            const isActive = t.name === tier.name;
            const isPast   = pts >= t.min;
            return (
              <div key={t.name} style={{
                background: isActive ? `linear-gradient(135deg, ${NAVY}, #1a3050)` : WHITE,
                border: `2px solid ${isActive ? t.color : isPast ? `${t.color}44` : BORDER}`,
                borderRadius: 16, padding: "20px",
                boxShadow: isActive ? `0 8px 24px ${t.color}22` : SHADOW,
                transition: "all 0.2s",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: t.color, boxShadow: isPast ? `0 0 8px ${t.color}66` : "none" }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: isActive ? WHITE : TXT }}>{t.name}</span>
                  {isActive && <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 700, color: t.color, letterSpacing: "0.12em", background: `${t.color}22`, padding: "2px 8px", borderRadius: 10 }}>CURRENT</span>}
                  {isPast && !isActive && <span style={{ marginLeft: "auto", fontSize: 9, color: "#22C55E", fontWeight: 700 }}>✓</span>}
                </div>
                <div style={{ fontSize: 10, color: isActive ? "rgba(255,255,255,0.4)" : TXT_S, marginBottom: 10 }}>
                  {t.next ? `${t.min}–${t.max} points` : `${t.min}+ points`}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {t.perks.map(p => (
                    <div key={p} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: isActive ? "rgba(255,255,255,0.7)" : TXT_M }}>
                      <span style={{ color: isActive ? t.color : "#22C55E", fontSize: 10 }}>✓</span> {p}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* How it works */}
      <div style={{ background: WHITE, borderRadius: 20, border: `1px solid ${BORDER}`, padding: "24px", boxShadow: SHADOW, marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: TXT_S, marginBottom: 16 }}>HOW IT WORKS</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
          {[
            { icon: "💳", title: "Spend GHS 100", desc: "Every GHS 100 spent earns 1 loyalty point" },
            { icon: "🎂", title: "Birthday Bonus", desc: "Double points on every visit in your birthday month" },
            { icon: "⭐", title: "Climb the Tiers", desc: "Unlock perks as you reach Bronze, Silver, Gold and Platinum" },
            { icon: "🎁", title: "Redeem Rewards", desc: "Points convert to discounts and free services" },
          ].map(item => (
            <div key={item.title} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: TXT, marginBottom: 3 }}>{item.title}</div>
                <div style={{ fontSize: 11, color: TXT_M, lineHeight: 1.5 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ textAlign: "center" }}>
        <a href="/book" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, color: G_DARK, textDecoration: "none", background: "rgba(200,169,126,0.1)", padding: "13px 28px", borderRadius: 24, border: `1px solid rgba(200,169,126,0.3)` }}>
          <Gift size={14} /> Earn More Points — Book Now <ArrowRight size={12} />
        </a>
      </div>
    </div>
  );
}
