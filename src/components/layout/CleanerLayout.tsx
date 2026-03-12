import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/context/SettingsContext";

const GOLD = "#C8A97E";
const DARK = "#1C160E";
const CREAM = "#F5EFE6";
const MID = "#EDE3D5";
const TXT_MID = "#78716C";

export default function CleanerLayout() {
  const { settings } = useSettings();
  const [staffName, setStaffName] = useState("Team Member");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata?.name) setStaffName(user.user_metadata.name);
    });
  }, []);

  const day = new Date().toLocaleDateString("en-GH", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div style={{ background: CREAM, minHeight: "100vh", padding: "32px 24px", fontFamily: "'Montserrat', sans-serif" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 12, color: TXT_MID, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>{day}</p>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, color: DARK, marginBottom: 4 }}>
            Welcome, {staffName}
          </h1>
          <p style={{ fontSize: 13, color: TXT_MID }}>Zolara Beauty Studio — Team Portal</p>
        </div>

        {/* Info cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 20, border: `1px solid ${MID}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: TXT_MID, marginBottom: 8 }}>HOURS TODAY</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: DARK, fontFamily: "'Cormorant Garamond', serif" }}>
              {settings?.open_time || "8:30 AM"} – {settings?.close_time || "9:00 PM"}
            </div>
          </div>
          <div style={{ background: "#fff", borderRadius: 16, padding: 20, border: `1px solid ${MID}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: TXT_MID, marginBottom: 8 }}>CONTACT</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: DARK }}>0594 365 314</div>
            <div style={{ fontSize: 12, color: TXT_MID }}>020 884 8707</div>
          </div>
        </div>

        {/* Navigation tiles */}
        <div style={{ background: "#fff", borderRadius: 16, padding: 24, border: `1px solid ${MID}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: TXT_MID, marginBottom: 16 }}>AVAILABLE TO YOU</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: "Promo Codes", desc: "View active promotions", href: "/app/cleaner/promo-codes", icon: "🏷️" },
              { label: "Services Menu", desc: "Browse all services and pricing", href: "/app/cleaner/services", icon: "✂️" },
            ].map(item => (
              <a key={item.href} href={item.href} style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 16px", borderRadius: 12, border: `1px solid ${MID}`,
                textDecoration: "none", color: DARK,
                transition: "all 0.15s",
              }}
                onMouseEnter={e => (e.currentTarget.style.background = `rgba(200,169,126,0.08)`)}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ fontSize: 22 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: TXT_MID }}>{item.desc}</div>
                </div>
                <span style={{ marginLeft: "auto", color: GOLD, fontSize: 18 }}>›</span>
              </a>
            ))}
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: 11, color: TXT_MID, marginTop: 32 }}>
          Zolara Beauty Studio · Sakasaka, Opp. CalBank, Tamale
        </p>
      </div>
    </div>
  );
}
