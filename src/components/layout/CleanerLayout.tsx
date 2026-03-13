import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/context/SettingsContext";
import { format } from "date-fns";

const G = "#C8A97E";
const G_DARK = "#8B6914";
const DARK = "#1C160E";
const CREAM = "#FAFAF8";
const WHITE = "#FFFFFF";
const BORDER = "#EDE8E0";
const TXT_MID = "#78716C";
const TXT_SOFT = "#A8A29E";
const SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)";

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

export default function CleanerLayout() {
  const { settings } = useSettings();
  const [staffName, setStaffName] = useState("");
  const [clockedIn, setClockedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get name from staff record
    const { data: profile } = await (supabase as any)
      .from("staff").select("id, name").eq("user_id", user.id).maybeSingle();
    if (profile) setStaffName(profile.name);

    // Check today's attendance
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const { data: att } = await (supabase as any)
      .from("attendance").select("check_in, check_out")
      .eq("staff_id", profile?.id)
      .eq("date", todayStr)
      .maybeSingle();
    if (att) {
      setClockedIn(!att.check_out);
      setCheckInTime(att.check_in);
    }
  };

  const dayLabel = format(new Date(), "EEEE, MMMM d, yyyy");
  const openTime = (settings as any)?.open_time || "8:30 AM";
  const closeTime = (settings as any)?.close_time || "9:00 PM";

  return (
    <div style={{ background: CREAM, minHeight: "100vh", padding: "clamp(20px,4vw,40px) clamp(16px,4vw,32px)", fontFamily: "'Montserrat', sans-serif" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", color: TXT_SOFT, textTransform: "uppercase", marginBottom: 6 }}>{dayLabel}</p>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(28px,4vw,40px)", fontWeight: 700, color: DARK, margin: 0, lineHeight: 1.1 }}>
            {staffName ? `${greeting()}, ${staffName.split(" ")[0]}` : greeting()}
          </h1>
          <p style={{ fontSize: 13, color: TXT_MID, marginTop: 6 }}>Zolara Beauty Studio · Team Portal</p>
        </div>

        {/* Status + Hours row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }} className="admin-grid-2">

          {/* Attendance status */}
          <div style={{ background: WHITE, borderRadius: 16, border: `1px solid ${BORDER}`, boxShadow: SHADOW, padding: "22px 24px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: TXT_SOFT, marginBottom: 10 }}>ATTENDANCE TODAY</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: clockedIn ? "#22C55E" : "#EF4444", flexShrink: 0 }} />
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: DARK }}>
                {clockedIn ? "Clocked In" : "Not Clocked In"}
              </span>
            </div>
            {checkInTime && (
              <p style={{ fontSize: 12, color: TXT_MID, margin: 0 }}>
                Since {format(new Date(checkInTime), "h:mm a")}
              </p>
            )}
            <a
              href="/app/cleaner/attendance"
              style={{
                display: "inline-block", marginTop: 14, fontSize: 11, fontWeight: 700,
                letterSpacing: "0.08em", color: G_DARK, textDecoration: "none",
                background: "rgba(200,169,126,0.1)", padding: "6px 14px",
                borderRadius: 20, border: `1px solid rgba(200,169,126,0.3)`,
              }}
            >
              {clockedIn ? "Clock Out →" : "Clock In →"}
            </a>
          </div>

          {/* Hours */}
          <div style={{ background: WHITE, borderRadius: 16, border: `1px solid ${BORDER}`, boxShadow: SHADOW, padding: "22px 24px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: TXT_SOFT, marginBottom: 10 }}>TODAY'S HOURS</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: DARK, marginBottom: 6 }}>
              {openTime} – {closeTime}
            </div>
            <p style={{ fontSize: 12, color: TXT_MID, margin: 0 }}>Mon – Sat · Closed Sundays</p>
            <div style={{ marginTop: 14, display: "flex", gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: TXT_MID }}>📞</span>
              <span style={{ fontSize: 12, color: TXT_MID }}>0594 365 314 · 020 884 8707</span>
            </div>
          </div>
        </div>

        {/* Quick links — use sidebar to navigate, these are just shortcuts */}
        <div style={{ background: WHITE, borderRadius: 16, border: `1px solid ${BORDER}`, boxShadow: SHADOW, padding: "24px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: TXT_SOFT, marginBottom: 18 }}>QUICK ACCESS</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="admin-grid-2">
            {[
              { label: "Promo Codes", desc: "View active promotions", href: "/app/cleaner/promo-codes", icon: "🏷️", color: "#FDF8EE" },
              { label: "Services Menu", desc: "Browse all services", href: "/app/cleaner/services", icon: "✂️", color: "#F0FDF4" },
              { label: "My Attendance", desc: "Clock in and out", href: "/app/cleaner/attendance", icon: "🕐", color: "#EFF6FF" },
            ].map(item => (
              <a key={item.href} href={item.href} style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "16px 18px", borderRadius: 12, border: `1px solid ${BORDER}`,
                textDecoration: "none", color: DARK, background: item.color,
                transition: "all 0.18s",
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
              >
                <span style={{ fontSize: 24, flexShrink: 0 }}>{item.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: DARK, marginBottom: 2 }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: TXT_MID }}>{item.desc}</div>
                </div>
                <span style={{ color: G, fontSize: 16, flexShrink: 0 }}>›</span>
              </a>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p style={{ textAlign: "center", fontSize: 11, color: TXT_SOFT, marginTop: 32 }}>
          Zolara Beauty Studio · Sakasaka, Opposite CalBank, Tamale
        </p>
      </div>
    </div>
  );
}
