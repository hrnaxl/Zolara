import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number | null;
  trendLabel?: string;
  variant?: "default" | "gold" | "blue" | "green" | "purple";
  delay?: number;
  subtitle?: string;
}

const variants = {
  default: { bg: "linear-gradient(135deg, #1C160E, #2C2416)", accent: "#C8A97E", border: "rgba(200,169,126,0.2)" },
  gold:    { bg: "linear-gradient(135deg, #2C2010, #3D2F14)", accent: "#E8C87A", border: "rgba(232,200,122,0.3)" },
  blue:    { bg: "linear-gradient(135deg, #0D1A2E, #152540)", accent: "#7EB8E8", border: "rgba(126,184,232,0.25)" },
  green:   { bg: "linear-gradient(135deg, #0D2318, #152E20)", accent: "#7EE8A2", border: "rgba(126,232,162,0.25)" },
  purple:  { bg: "linear-gradient(135deg, #1A0D2E, #251540)", accent: "#C87EE8", border: "rgba(200,126,232,0.25)" },
};

export const StatCard = ({ title, value, icon, trend, trendLabel = "vs last month", variant = "default", subtitle }: StatCardProps) => {
  const v = variants[variant];
  const hasTrend = trend !== null && trend !== undefined;
  const isPos = hasTrend && trend! > 0;
  const isNeg = hasTrend && trend! < 0;

  return (
    <div style={{
      background: v.bg,
      border: `1px solid ${v.border}`,
      borderRadius: "12px",
      padding: "24px",
      position: "relative",
      overflow: "hidden",
      transition: "transform 0.2s ease, box-shadow 0.2s ease",
      cursor: "default",
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 16px 48px rgba(0,0,0,0.4), 0 0 0 1px ${v.border}`; }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = ""; }}
    >
      {/* Glow */}
      <div style={{ position: "absolute", top: "-30px", right: "-30px", width: "100px", height: "100px", borderRadius: "50%", background: `radial-gradient(circle, ${v.accent}22 0%, transparent 70%)`, pointerEvents: "none" }} />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
        <div style={{ fontSize: "11px", fontFamily: "'Montserrat', sans-serif", fontWeight: 600, letterSpacing: "0.12em", color: "rgba(245,239,230,0.5)", textTransform: "uppercase" }}>{title}</div>
        <div style={{ color: v.accent, opacity: 0.8 }}>{icon}</div>
      </div>

      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "36px", fontWeight: 600, color: "#F5EFE6", letterSpacing: "-0.01em", lineHeight: 1, marginBottom: "12px" }}>
        {value}
      </div>

      {subtitle && <div style={{ fontSize: "11px", color: "rgba(245,239,230,0.4)", fontFamily: "'Montserrat', sans-serif" }}>{subtitle}</div>}

      {hasTrend && (
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "4px",
            fontSize: "11px", fontFamily: "'Montserrat', sans-serif", fontWeight: 700,
            padding: "3px 8px", borderRadius: "20px",
            background: isPos ? "rgba(126,232,162,0.15)" : isNeg ? "rgba(232,126,126,0.15)" : "rgba(200,169,126,0.15)",
            color: isPos ? "#7EE8A2" : isNeg ? "#E87E7E" : v.accent,
          }}>
            {isPos && <TrendingUp size={11} />}
            {isNeg && <TrendingDown size={11} />}
            {!isPos && !isNeg && <Minus size={11} />}
            {isPos && "+"}{trend}%
          </div>
          <span style={{ fontSize: "10px", color: "rgba(245,239,230,0.35)", fontFamily: "'Montserrat', sans-serif" }}>{trendLabel}</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;
