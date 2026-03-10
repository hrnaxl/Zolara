import { format } from "date-fns";
import { useEffect, useState } from "react";

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  userName?: string;
}

export const DashboardHeader = ({ title, subtitle, userName }: DashboardHeaderProps) => {
  const [time, setTime] = useState(format(new Date(), "h:mm a"));

  useEffect(() => {
    const iv = setInterval(() => setTime(format(new Date(), "h:mm a")), 30000);
    return () => clearInterval(iv);
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const gold = "#C8A97E";

  return (
    <div style={{ marginBottom: "32px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em", color: gold, marginBottom: "8px", textTransform: "uppercase" }}>
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 600, color: "#F5EFE6", lineHeight: 1.1, margin: 0 }}>
            {userName ? `${greeting()}, ${userName}` : title}
          </h1>
          <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "13px", color: "rgba(245,239,230,0.45)", marginTop: "6px", fontWeight: 300 }}>
            {subtitle || "Here's what's happening at Zolara today"}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "28px", fontWeight: 500, color: gold, lineHeight: 1 }}>{time}</div>
            <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "9px", letterSpacing: "0.15em", color: "rgba(245,239,230,0.3)", marginTop: "2px" }}>CURRENT TIME</div>
          </div>
          <div style={{ width: "1px", height: "40px", background: "rgba(200,169,126,0.2)" }} />
          <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "linear-gradient(135deg, #8B6914, #C8A97E)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "18px", color: "#fff", fontWeight: 600 }}>Z</span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: "24px", height: "1px", background: "linear-gradient(90deg, rgba(200,169,126,0.4), rgba(200,169,126,0.1), transparent)" }} />
    </div>
  );
};

export default DashboardHeader;
