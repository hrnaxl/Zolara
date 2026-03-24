import { useEffect, useState } from "react";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";
import { useSessionGuard } from "@/hooks/useSessionGuard";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, endOfDay, subDays, eachDayOfInterval } from "date-fns";

const StaffDashboard = () => {
  useInactivityLogout(10 * 60 * 1000); // 10-min inactivity logout
  useSessionGuard();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [staffId, setStaffId] = useState<string | null>(null);
  const [earnings, setEarnings] = useState({ thisMonth: 0, lastMonth: 0, allTime: 0, thisWeek: 0 });
  const [topServices, setTopServices] = useState<{name:string;count:number}[]>([]);
  const [stats, setStats] = useState({
    todayTotal: 0, upcoming: 0, completed: 0, cancelled: 0, completionRate: 0,
  });
  const [bookingStatusData, setBookingStatusData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [todaySchedule, setTodaySchedule] = useState<any[]>([]);
  const [sparkData, setSparkData] = useState<number[]>([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get staff record
      const { data: profile } = await supabase
        .from("staff").select("id, name").eq("user_id", user.id).maybeSingle();
      if (profile) {
        setUserName(profile.name);
        setStaffId(profile.id);
      }

      const staffName = profile?.name || null;
      const todayStr    = format(new Date(), "yyyy-MM-dd");
      const tomorrowStr = format(new Date(Date.now() + 86400000), "yyyy-MM-dd");

      // Fetch all this staff member's bookings (by staff_name or staff_id)
      const { data: allBookings = [] } = await supabase
        .from("bookings").select("*")
        .or(staffName ? `staff_name.ilike.${staffName},staff_id.eq.${profile?.id ?? "00000000-0000-0000-0000-000000000000"}` : `staff_id.eq.${profile?.id ?? "00000000-0000-0000-0000-000000000000"}`)
        .order("preferred_date", { ascending: false });

      // Today's schedule for this staff
      const { data: todayBookings = [] } = await supabase
        .from("bookings").select("*")
        .gte("preferred_date", todayStr).lt("preferred_date", tomorrowStr)
        .or(staffName ? `staff_name.ilike.${staffName},staff_id.eq.${profile?.id ?? "00000000-0000-0000-0000-000000000000"}` : `staff_id.eq.${profile?.id ?? "00000000-0000-0000-0000-000000000000"}`)
        .order("preferred_time", { ascending: true });

      // Upcoming (today + future, pending or confirmed)
      const upcoming = (allBookings as any[]).filter((b: any) =>
        b.preferred_date >= todayStr && (b.status === "pending" || b.status === "confirmed")
      ).length;
      const completed  = (allBookings as any[]).filter((b: any) => b.status === "completed").length;
      const cancelled  = (allBookings as any[]).filter((b: any) => b.status === "cancelled").length;
      const total      = allBookings.length;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      setStats({ todayTotal: todayBookings.length, upcoming, completed, cancelled, completionRate });

      setBookingStatusData([
        { name: "Upcoming",  value: upcoming,   color: "#C9A84C" },
        { name: "Completed", value: completed,  color: "#4CAF7D" },
        { name: "Cancelled", value: cancelled,  color: "#E05A5A" },
      ].filter(d => d.value > 0));

      setTodaySchedule((todayBookings as any[]).map((b: any) => ({
        id: b.id, clientName: b.client_name || "Client",
        serviceName: b.service_name || "Service",
        time: b.preferred_time, status: b.status,
        price: b.price,
      })));

      // Last 7 days booking count for sparkline
      const last7 = eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() });
      const sparkCounts = last7.map(day => {
        const d = format(day, "yyyy-MM-dd");
        return (allBookings as any[]).filter((b: any) => b.preferred_date === d).length;
      });
      setSparkData(sparkCounts);

      // Fetch earnings from sales table for this staff
      if (profile?.id) {
        const now = new Date();
        const monthStart = format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd");
        const lastMonthStart = format(new Date(now.getFullYear(), now.getMonth() - 1, 1), "yyyy-MM-dd");
        const lastMonthEnd = format(new Date(now.getFullYear(), now.getMonth(), 0), "yyyy-MM-dd");
        const weekStart = format(subDays(now, now.getDay() === 0 ? 6 : now.getDay() - 1), "yyyy-MM-dd");

        const [thisMonthSales, lastMonthSales, allTimeSales, weekSales] = await Promise.all([
          (supabase as any).from("sales").select("amount, service_name").eq("staff_id", profile.id).eq("status", "completed").gte("created_at", monthStart),
          (supabase as any).from("sales").select("amount").eq("staff_id", profile.id).eq("status", "completed").gte("created_at", lastMonthStart).lte("created_at", lastMonthEnd),
          (supabase as any).from("sales").select("amount, service_name").eq("staff_id", profile.id).eq("status", "completed"),
          (supabase as any).from("sales").select("amount").eq("staff_id", profile.id).eq("status", "completed").gte("created_at", weekStart),
        ]);

        const sum = (rows: any[]) => (rows || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
        setEarnings({
          thisMonth: sum(thisMonthSales.data),
          lastMonth: sum(lastMonthSales.data),
          allTime: sum(allTimeSales.data),
          thisWeek: sum(weekSales.data),
        });

        // Top services for this staff
        const svcCount: Record<string, number> = {};
        for (const r of (thisMonthSales.data || [])) {
          const s = r.service_name || "Unknown";
          svcCount[s] = (svcCount[s] || 0) + 1;
        }
        setTopServices(Object.entries(svcCount).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 4));
      }

    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  };

  // ── DESIGN TOKENS (identical to admin + receptionist) ──────────
  const G        = "#B8975A";
  const G_LIGHT  = "#F5ECD6";
  const CREAM    = "#FAFAF8";
  const WHITE    = "#FFFFFF";
  const BORDER   = "#EDEBE5";
  const NAVY     = "#0F1E35";
  const TXT      = "#1C1917";
  const TXT_MID  = "#78716C";
  const TXT_SOFT = "#A8A29E";
  const SHADOW   = "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)";
  const SHADOW_MD= "0 2px 8px rgba(0,0,0,0.06), 0 12px 36px rgba(0,0,0,0.1)";

  // Donut geometry
  const statusTotal = bookingStatusData.reduce((s, d) => s + d.value, 0);
  const DONUT_R = 60, DONUT_CX = 74, DONUT_CY = 74;
  let cumDeg = -90;
  const donutPaths = bookingStatusData.map((d) => {
    const sweep = statusTotal > 0 ? (d.value / statusTotal) * 360 : 0;
    const s = (cumDeg * Math.PI) / 180;
    const e = ((cumDeg + sweep) * Math.PI) / 180;
    cumDeg += sweep;
    const x1 = DONUT_CX + DONUT_R * Math.cos(s);
    const y1 = DONUT_CY + DONUT_R * Math.sin(s);
    const x2 = DONUT_CX + DONUT_R * Math.cos(e);
    const y2 = DONUT_CY + DONUT_R * Math.sin(e);
    return { ...d, path: `M${DONUT_CX},${DONUT_CY} L${x1.toFixed(2)},${y1.toFixed(2)} A${DONUT_R},${DONUT_R} 0 ${sweep > 180 ? 1 : 0},1 ${x2.toFixed(2)},${y2.toFixed(2)} Z` };
  });

  // Sparkline path
  const sparkMax = Math.max(...sparkData, 1);
  const SPARK_W = 120, SPARK_H = 36;
  const sparkPoints = sparkData.map((v, i) => {
    const x = (i / (sparkData.length - 1)) * SPARK_W;
    const y = SPARK_H - (v / sparkMax) * SPARK_H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const statusStyle = (s: string): { bg: string; color: string; label: string } => {
    if (s === "completed") return { bg: "rgba(76,175,125,0.1)", color: "#2E8A5E", label: "Completed" };
    if (s === "cancelled") return { bg: "rgba(224,90,90,0.1)", color: "#C0392B", label: "Cancelled" };
    if (s === "confirmed") return { bg: "rgba(74,144,217,0.1)", color: "#2471A3", label: "Confirmed" };
    return { bg: "rgba(201,168,76,0.12)", color: "#8B6914", label: "Pending" };
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", background: CREAM }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", border: `2.5px solid ${G_LIGHT}`, borderTopColor: G, margin: "0 auto 14px", animation: "spin 0.9s linear infinite" }} />
          <p style={{ fontFamily: "Montserrat,sans-serif", fontSize: "10px", letterSpacing: "0.18em", color: TXT_SOFT, textTransform: "uppercase" }}>Loading</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: CREAM, minHeight: "100vh", padding: "clamp(14px,4vw,32px) clamp(12px,4vw,36px)", fontFamily: "Montserrat,sans-serif", color: TXT }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box}
        .sc{background:${WHITE};border:1px solid ${BORDER};border-radius:16px;padding:24px;box-shadow:${SHADOW};transition:box-shadow 0.2s,transform 0.2s}
        .sc:hover{box-shadow:${SHADOW_MD};transform:translateY(-1px)}
        .sc-flat{background:${WHITE};border:1px solid ${BORDER};border-radius:16px;padding:24px;box-shadow:${SHADOW}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .au{animation:up 0.35s ease both}
        .row-hover:hover{background:rgba(184,151,90,0.04)}
      `}</style>

      {/* ── HEADER ─────────────────────────────────────── */}
      <div className="au" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "28px" }}>
        <div>
          <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.16em", color: G, marginBottom: "6px", textTransform: "uppercase" }}>
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
          <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(30px,4vw,44px)", fontWeight: 700, color: TXT, margin: 0, lineHeight: 1, letterSpacing: "-0.02em" }}>
            {userName ? `${greeting()}, ${userName.split(" ")[0]}` : "My Dashboard"}
          </h1>
          <p style={{ fontSize: "12px", color: TXT_SOFT, marginTop: "6px", fontWeight: 400 }}>
            Your appointments, schedule, and performance at a glance.
          </p>
        </div>
        <button onClick={fetchData}
          style={{ width: "38px", height: "38px", borderRadius: "50%", background: WHITE, border: `1px solid ${BORDER}`, boxShadow: SHADOW, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: TXT_MID, fontSize: "16px", flexShrink: 0 }}>
          ↻
        </button>
      </div>

      {/* ── KPI ROW (4 cards) ─────────────────────────── */}
      <div className="au admin-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px", marginBottom: "20px" }}>
        {[
          { label: "Today's Appointments", value: stats.todayTotal, icon: "📅", accent: NAVY },
          { label: "Upcoming",             value: stats.upcoming,   icon: "⏰", accent: "#C9A84C" },
          { label: "Completed",            value: stats.completed,  icon: "✅", accent: "#4CAF7D" },
          { label: "Cancelled",            value: stats.cancelled,  icon: "✕",  accent: "#E05A5A" },
        ].map((k, i) => (
          <div key={i} className="sc" style={{ animationDelay: `${i * 0.06}s` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", color: TXT_SOFT, textTransform: "uppercase", margin: 0 }}>{k.label}</p>
              <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: `${k.accent}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>{k.icon}</div>
            </div>
            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "38px", fontWeight: 700, color: TXT, margin: 0, lineHeight: 1 }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* ── EARNINGS ROW ─────────────────────────────── */}
      <div className="au admin-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px", marginBottom: "20px", animationDelay: "0.08s" }}>
        {[
          { label: "This Week",   value: earnings.thisWeek,  accent: "#4A90D9" },
          { label: "This Month",  value: earnings.thisMonth, accent: "#4CAF7D" },
          { label: "Last Month",  value: earnings.lastMonth, accent: "#C9A84C" },
          { label: "All Time",    value: earnings.allTime,   accent: NAVY },
        ].map((e, i) => (
          <div key={i} className="sc" style={{ animationDelay: `${i * 0.06}s` }}>
            <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", color: TXT_SOFT, textTransform: "uppercase", margin: "0 0 10px" }}>{e.label} Earnings</p>
            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "28px", fontWeight: 700, color: TXT, margin: 0, lineHeight: 1 }}>
              GHS <span style={{ color: e.accent }}>{e.value.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </p>
          </div>
        ))}
      </div>

      {/* ── TOP SERVICES THIS MONTH ── */}
      {topServices.length > 0 && (
        <div className="au sc-flat" style={{ marginBottom: "20px", padding: "20px 24px", animationDelay: "0.14s" }}>
          <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", color: TXT_SOFT, textTransform: "uppercase", marginBottom: "14px" }}>Your Top Services This Month</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "10px" }}>
            {topServices.map((s, i) => (
              <div key={i} style={{ padding: "10px 14px", borderRadius: "10px", background: `${G}10`, border: `1px solid ${G}30` }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: TXT, marginBottom: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                <div style={{ fontSize: "11px", color: G }}>{s.count} booking{s.count !== 1 ? "s" : ""}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MIDDLE ROW: Sparkline + Completion Rate + Donut ── */}
      <div className="au admin-grid-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "20px", animationDelay: "0.1s" }}>

        {/* 7-day activity sparkline */}
        <div className="sc-flat" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", color: TXT_SOFT, textTransform: "uppercase", marginBottom: "4px" }}>7-Day Activity</p>
            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "34px", fontWeight: 700, color: TXT, margin: 0, lineHeight: 1 }}>
              {sparkData.reduce((a, b) => a + b, 0)}
            </p>
            <p style={{ fontSize: "11px", color: TXT_SOFT, marginTop: "4px" }}>Bookings this week</p>
          </div>
          <div style={{ marginTop: "16px", overflow: "hidden" }}>
            <svg width="100%" height={SPARK_H} viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} preserveAspectRatio="none">
              <polyline points={sparkPoints} fill="none" stroke={G} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              {sparkData.map((v, i) => {
                const x = (i / (sparkData.length - 1)) * SPARK_W;
                const y = SPARK_H - (v / sparkMax) * SPARK_H;
                return <circle key={i} cx={x} cy={y} r="2.5" fill={G} />;
              })}
            </svg>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
              {eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() }).map((d, i) => (
                <span key={i} style={{ fontSize: "9px", color: TXT_SOFT, fontWeight: 500 }}>{format(d, "EEE")[0]}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Completion rate */}
        <div className="sc-flat" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", color: TXT_SOFT, textTransform: "uppercase", marginBottom: "4px" }}>Completion Rate</p>
            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "38px", fontWeight: 700, color: TXT, margin: 0, lineHeight: 1 }}>{stats.completionRate}%</p>
            <p style={{ fontSize: "11px", color: TXT_SOFT, marginTop: "4px" }}>
              {stats.completionRate >= 80 ? "Excellent performance" : stats.completionRate >= 50 ? "Keep it up" : "Room to improve"}
            </p>
          </div>
          <div style={{ marginTop: "16px" }}>
            <div style={{ height: "6px", background: "#F0EDE8", borderRadius: "99px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${stats.completionRate}%`, background: stats.completionRate >= 80 ? "#4CAF7D" : stats.completionRate >= 50 ? G : "#E05A5A", borderRadius: "99px", transition: "width 1s ease" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
              <span style={{ fontSize: "9px", color: TXT_SOFT }}>0%</span>
              <span style={{ fontSize: "9px", color: TXT_SOFT }}>100%</span>
            </div>
          </div>
        </div>

        {/* Booking status donut */}
        <div className="sc-flat">
          <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", color: TXT_SOFT, textTransform: "uppercase", marginBottom: "14px" }}>Booking Status</p>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <svg width={DONUT_CX * 2} height={DONUT_CY * 2} style={{ flexShrink: 0 }}>
              {donutPaths.length > 0
                ? donutPaths.map((s, i) => <path key={i} d={s.path} fill={s.color} opacity="0.9" />)
                : <circle cx={DONUT_CX} cy={DONUT_CY} r={DONUT_R} fill="#F0EDE8" />}
              <circle cx={DONUT_CX} cy={DONUT_CY} r={DONUT_R * 0.58} fill={WHITE} />
              <text x={DONUT_CX} y={DONUT_CY - 3} textAnchor="middle" style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "18px", fontWeight: 700, fill: TXT }}>{statusTotal}</text>
              <text x={DONUT_CX} y={DONUT_CY + 13} textAnchor="middle" style={{ fontFamily: "Montserrat,sans-serif", fontSize: "8px", fill: TXT_SOFT }}>Total</text>
            </svg>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
              {bookingStatusData.map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                  <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: d.color, flexShrink: 0 }} />
                  <span style={{ fontSize: "10px", color: TXT_MID, flex: 1 }}>{d.name}</span>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: TXT }}>{d.value}</span>
                </div>
              ))}
              {bookingStatusData.length === 0 && <span style={{ fontSize: "11px", color: TXT_SOFT }}>No data yet</span>}
            </div>
          </div>
        </div>
      </div>

      {/* ── TODAY'S SCHEDULE ─────────────────────────── */}
      <div className="au sc-flat" style={{ animationDelay: "0.15s" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
          <div>
            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "18px", fontWeight: 700, color: TXT, margin: 0 }}>Today's Schedule</p>
            <p style={{ fontSize: "11px", color: TXT_SOFT, marginTop: "2px" }}>{format(new Date(), "EEEE, MMMM d")}</p>
          </div>
          <div style={{ background: G_LIGHT, borderRadius: "20px", padding: "4px 12px", border: `1px solid rgba(184,151,90,0.25)` }}>
            <span style={{ fontSize: "10px", fontWeight: 700, color: G }}>{stats.todayTotal} appointment{stats.todayTotal !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {todaySchedule.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: TXT_SOFT }}>
            <div style={{ fontSize: "32px", marginBottom: "10px" }}>🗓</div>
            <p style={{ fontSize: "13px", fontWeight: 500 }}>No appointments today</p>
            <p style={{ fontSize: "11px", marginTop: "4px" }}>Enjoy your day off!</p>
          </div>
        ) : (
          <div>
            {/* Column headers */}
            <div className="staff-row-header" style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr 90px", gap: "12px", padding: "0 12px 10px", borderBottom: `1px solid ${BORDER}`, marginBottom: "4px" }}>
              {["Time", "Client", "Service", "Status"].map(h => (
                <span key={h} style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", color: TXT_SOFT, textTransform: "uppercase" }}>{h}</span>
              ))}
            </div>
            {todaySchedule.map((appt, i) => {
              const s = statusStyle(appt.status);
              return (
                <div key={appt.id} className="staff-row-grid" style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr 90px", gap: "12px", padding: "12px", borderRadius: "10px", alignItems: "center", borderBottom: i < todaySchedule.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                  <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "16px", fontWeight: 600, color: TXT }}>{appt.time?.slice(0, 5) || "—"}</span>
                  <span style={{ fontSize: "12px", fontWeight: 500, color: TXT }}>{appt.clientName}</span>
                  <span style={{ fontSize: "12px", color: TXT_MID }}>{appt.serviceName}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "3px 10px", borderRadius: "20px", fontSize: "10px", fontWeight: 700, background: s.bg, color: s.color, whiteSpace: "nowrap" }}>{s.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffDashboard;
