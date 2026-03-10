import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Calendar,
  Users,
  DollarSign,
  TrendingUp,
  Briefcase,
  Clock,
  History,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  subMonths,
  subDays,
  eachDayOfInterval,
  startOfDay,
  endOfDay,
} from "date-fns";
import { useSettings } from "@/context/SettingsContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { DonutChart } from "@/components/dashboard/DonutChart";
import { ActivityList } from "@/components/dashboard/ActivityList";
import { TopServiceCard } from "@/components/dashboard/TopServiceCard";
import { DateFilter, DateFilterType } from "@/components/dashboard/DateFilter";
import { PaymentMethodChart } from "@/components/dashboard/PaymentMethodChart";
import { TopStaffCard } from "@/components/dashboard/TopStaffCard";
import { UpcomingAppointments } from "@/components/dashboard/UpcomingAppointments";
import {
  AlertsPanel,
  generateAlerts,
  Alert,
} from "@/components/dashboard/AlertsPanel";
import { SyncStatus } from "@/components/dashboard/SyncStatus";
import { Loader2 } from "lucide-react";

interface DateRange {
  start: Date;
  end: Date;
}

const AdminDashboard = () => {
  const [dateFilter, setDateFilter] = useState<DateFilterType>("today");
  const [dateRange, setDateRange] = useState<DateRange>({
    start: startOfDay(new Date()),
    end: endOfDay(new Date()),
  });
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const [stats, setStats] = useState({
    todayBookings: 0,
    periodBookings: 0,
    todayRevenue: 0,
    periodRevenue: 0,
    weeklyRevenue: 0,
    monthlyRevenue: 0,
    totalClients: 0,
    activeStaff: 0,
    topService: "N/A",
    topServiceCount: 0,
    monthChangePercentage: 0,
    clientChangePercentage: 0,
    bookingChangePercentage: 0,
    pendingBookings: 0,
    pendingRequests: 0,
    pendingRevenue: 0,
  });

  const [revenueData, setRevenueData] = useState<
    { name: string; revenue: number; bookings: number }[]
  >([]);
  const [bookingStatusData, setBookingStatusData] = useState<
    { name: string; value: number; color: string }[]
  >([]);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [paymentMethodData, setPaymentMethodData] = useState<any[]>([]);
  const [topStaff, setTopStaff] = useState<any[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [absentStaff, setAbsentStaff] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { settings } = useSettings();

  useEffect(() => {
    fetchStats();
  }, [dateRange]);

  const handleFilterChange = (filter: DateFilterType, range: DateRange) => {
    setDateFilter(filter);
    setDateRange(range);
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      const today = new Date();
      const todayStr = format(today, "yyyy-MM-dd");
      const startOfThisMonth = format(startOfMonth(today), "yyyy-MM-dd");
      const endOfThisMonth = format(endOfMonth(today), "yyyy-MM-dd");
      const previousMonthStart = format(startOfMonth(subMonths(today, 1)), "yyyy-MM-dd");
      const previousMonthEnd = format(endOfMonth(subMonths(today, 1)), "yyyy-MM-dd");
      const periodStart = format(dateRange.start, "yyyy-MM-dd");
      const periodEnd = format(dateRange.end, "yyyy-MM-dd");

      // Run all queries independently so one failure doesn't kill everything
      const [
        todayBookingsRes,
        periodBookingsRes,
        allClientsRes,
        activeStaffRes,
        pendingBookingsRes,
        upcomingBookingsRes,
        todaySalesRes,
        monthlySalesRes,
        prevMonthSalesRes,
        recentBookingsRes,
        monthlyBookingStatusRes,
      ] = await Promise.all([
        supabase.from("bookings").select("*").eq("preferred_date", todayStr),
        supabase.from("bookings").select("*").gte("preferred_date", periodStart).lte("preferred_date", periodEnd),
        supabase.from("clients").select("*", { count: "exact", head: true }),
        supabase.from("staff").select("*").eq("is_active", true),
        supabase.from("bookings").select("*", { count: "exact" }).eq("status", "pending"),
        supabase.from("bookings").select("*").eq("preferred_date", todayStr).in("status", ["pending", "confirmed"]).order("preferred_time", { ascending: true }).limit(10),
        supabase.from("sales").select("amount, payment_method, status").eq("status", "completed").gte("created_at", today.toISOString().split("T")[0]).lte("created_at", todayStr + "T23:59:59"),
        supabase.from("sales").select("amount, payment_method, status, created_at").eq("status", "completed").gte("created_at", startOfThisMonth).lte("created_at", endOfThisMonth + "T23:59:59"),
        supabase.from("sales").select("amount").eq("status", "completed").gte("created_at", previousMonthStart).lte("created_at", previousMonthEnd + "T23:59:59"),
        supabase.from("bookings").select("*").order("created_at", { ascending: false }).limit(5),
        supabase.from("bookings").select("status").gte("preferred_date", startOfThisMonth).lte("preferred_date", endOfThisMonth),
      ]);

      const todayRevenue = todaySalesRes.data?.reduce((s, p) => s + Number(p.amount), 0) || 0;
      const monthlyRevenue = monthlySalesRes.data?.reduce((s, p) => s + Number(p.amount), 0) || 0;
      const previousMonthRevenue = prevMonthSalesRes.data?.reduce((s, p) => s + Number(p.amount), 0) || 0;
      const periodRevenue = todayRevenue; // use today revenue for period by default

      // Booking status distribution
      const statusCounts: Record<string, number> = {};
      (monthlyBookingStatusRes.data || []).forEach((b: any) => {
        statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
      });
      const bookingStatusDist = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
      setBookingStatusData(bookingStatusDist);

      // Revenue chart (daily for this month)
      const revenueByDay: Record<string, number> = {};
      (monthlySalesRes.data || []).forEach((s: any) => {
        const day = s.created_at?.substring(0, 10) || "";
        revenueByDay[day] = (revenueByDay[day] || 0) + Number(s.amount);
      });
      const revenueChartData = Object.entries(revenueByDay).map(([name, revenue]) => ({ name, revenue, bookings: 0 }));
      setRevenueData(revenueChartData);

      // Payment method chart
      const pmCounts: Record<string, number> = {};
      (monthlySalesRes.data || []).forEach((s: any) => {
        pmCounts[s.payment_method] = (pmCounts[s.payment_method] || 0) + Number(s.amount);
      });
      setPaymentMethodData(Object.entries(pmCounts).map(([name, value]) => ({ name, value })));

      setUpcomingAppointments(upcomingBookingsRes.data || []);
      setRecentBookings(recentBookingsRes.data || []);

      const revenueChangePercentage = previousMonthRevenue > 0
        ? ((monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
        : 0;

      setStats({
        todayBookings: todayBookingsRes.data?.length || 0,
        periodBookings: periodBookingsRes.data?.length || 0,
        todayRevenue,
        periodRevenue,
        weeklyRevenue: monthlyRevenue,
        monthlyRevenue,
        previousMonthRevenue,
        totalClients: allClientsRes.count || 0,
        previousMonthClients: 0,
        activeStaff: activeStaffRes.data?.length || 0,
        revenueChangePercentage,
        bookingChangePercentage: 0,
      });

    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const getFilterLabel = () => {
    switch (dateFilter) {
      case "today":
        return "Today";
      case "week":
        return "This Week";
      case "month":
        return "This Month";
      case "custom":
        return `${format(dateRange.start, "MMM d")} - ${format(
          dateRange.end,
          "MMM d"
        )}`;
      default:
        return "";
    }
  };


  // ── RENDER ──────────────────────────────────────────────────────
  const gold = "#C9A84C";
  const goldLight = "#F5E6C0";
  const cream = "#FDFAF5";
  const beige = "#F7F3EC";
  const beigeDeep = "#EDE8DF";
  const textDark = "#1A1612";
  const textMid = "#6B6157";
  const textSoft = "#9E9489";

  // ─────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────

  // Donut chart geometry
  const statusTotal = bookingStatusData.reduce((s, d) => s + d.value, 0);
  const DONUT_R = 72, DONUT_CX = 90, DONUT_CY = 90;
  const SLOT_COLORS = ["#4A90D9", "#4CAF7D", "#E05A5A", "#C9A84C", "#9B7FCB"];
  let cumDeg = -90;
  const donutPaths = bookingStatusData.map((d, i) => {
    const sweep = statusTotal > 0 ? (d.value / statusTotal) * 360 : 0;
    const s = (cumDeg * Math.PI) / 180;
    const e = ((cumDeg + sweep) * Math.PI) / 180;
    cumDeg += sweep;
    const x1 = DONUT_CX + DONUT_R * Math.cos(s);
    const y1 = DONUT_CY + DONUT_R * Math.sin(s);
    const x2 = DONUT_CX + DONUT_R * Math.cos(e);
    const y2 = DONUT_CY + DONUT_R * Math.sin(e);
    return { ...d, path: `M${DONUT_CX},${DONUT_CY} L${x1.toFixed(2)},${y1.toFixed(2)} A${DONUT_R},${DONUT_R} 0 ${sweep > 180 ? 1 : 0},1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`, color: SLOT_COLORS[i % SLOT_COLORS.length] };
  });

  // Revenue sparkline (last 7 days) — smooth cubic bezier
  const spark7 = revenueData.slice(-7);
  const SW = 360, SH = 90, PAD = 16;
  const maxV = Math.max(...spark7.map(d => d.revenue), 1);
  const spPts = spark7.map((d, i) => ({
    x: PAD + (i / Math.max(spark7.length - 1, 1)) * (SW - PAD * 2),
    y: SH - PAD - (d.revenue / maxV) * (SH - PAD * 2),
  }));
  const bezier = spPts.map((p, i) => {
    if (i === 0) return `M${p.x},${p.y}`;
    const prev = spPts[i - 1];
    const cx = (prev.x + p.x) / 2;
    return `C${cx},${prev.y} ${cx},${p.y} ${p.x},${p.y}`;
  }).join(" ");
  const areaPath = spPts.length > 1 ? `${bezier} L${spPts[spPts.length-1].x},${SH} L${spPts[0].x},${SH} Z` : "";

  const filterLabel = getFilterLabel();

  const G = "#B8975A";          // champagne gold
  const G_LIGHT = "#F5ECD6";    // gold tint background
  const CREAM = "#FAFAF8";      // page bg
  const CARD_BG = "#FFFFFF";    // card bg
  const BORDER = "#EDEBE5";     // subtle border
  const TXT = "#1C1917";        // near black
  const TXT_MID = "#78716C";    // warm gray
  const TXT_SOFT = "#A8A29E";   // light warm gray
  const SHADOW = "0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)";

  if (loading && !lastSync) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"60vh", background: CREAM }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ width:"40px", height:"40px", borderRadius:"50%", border:`3px solid ${G_LIGHT}`, borderTopColor: G, margin:"0 auto 16px", animation:"spin 0.9s linear infinite" }} />
          <p style={{ fontFamily:"'Montserrat',sans-serif", fontSize:"11px", letterSpacing:"0.16em", color: TXT_SOFT }}>LOADING</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: CREAM, minHeight:"100vh", padding:"clamp(20px,4vw,40px) clamp(20px,5vw,52px)", fontFamily:"'Montserrat',sans-serif", color: TXT }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Montserrat:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box}
        .z-card{background:${CARD_BG};border:1px solid ${BORDER};border-radius:16px;padding:24px;box-shadow:${SHADOW};transition:box-shadow 0.2s,transform 0.2s}
        .z-card:hover{box-shadow:0 2px 8px rgba(0,0,0,0.06),0 12px 36px rgba(0,0,0,0.1);transform:translateY(-2px)}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .fade-up{animation:fadeUp 0.4s ease both}
      `}</style>

      {/* ══ HEADER ══════════════════════════════════════════════ */}
      <div className="fade-up" style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"36px" }}>
        <div>
          <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(38px,5vw,56px)", fontWeight:600, color: TXT, margin:0, lineHeight:1, letterSpacing:"-0.02em" }}>
            Dashboard
          </h1>
          <p style={{ fontSize:"13px", fontWeight:300, color: TXT_MID, marginTop:"8px", letterSpacing:"0.01em" }}>
            Welcome back! Here's your executive overview.
          </p>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:"10px", paddingTop:"6px" }}>
          {/* Period pills */}
          <div style={{ display:"flex", gap:"2px", background: BORDER, borderRadius:"24px", padding:"3px" }}>
            {(["today","week","month"] as const).map(f => {
              const labels = { today:"Today", week:"Week", month:"Month" };
              return (
                <button key={f} onClick={() => {
                  const n = new Date();
                  const map = {
                    today: { start: startOfDay(n), end: endOfDay(n) },
                    week:  { start: startOfWeek(n), end: endOfWeek(n) },
                    month: { start: startOfMonth(n), end: endOfMonth(n) },
                  };
                  handleFilterChange(f, map[f]);
                }} style={{
                  fontFamily:"'Montserrat',sans-serif", fontSize:"11px", fontWeight:600,
                  letterSpacing:"0.06em", padding:"7px 18px", borderRadius:"20px",
                  border:"none", cursor:"pointer", transition:"all 0.18s",
                  background: dateFilter===f ? G : "transparent",
                  color: dateFilter===f ? "#fff" : TXT_MID,
                  boxShadow: dateFilter===f ? `0 2px 8px ${G}55` : "none",
                }}>{labels[f]}</button>
              );
            })}
          </div>

          {/* Refresh */}
          <button onClick={fetchStats} title="Refresh" style={{ width:"38px", height:"38px", borderRadius:"50%", background: CARD_BG, border:`1px solid ${BORDER}`, boxShadow: SHADOW, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"15px", color: TXT_MID, transition:"all 0.2s" }}>
            <span style={{ display:"inline-block", animation: loading ? "spin 0.9s linear infinite" : "none" }}>↻</span>
          </button>

          {/* Bell */}
          <div style={{ position:"relative" }}>
            <div style={{ width:"42px", height:"42px", borderRadius:"50%", background: CARD_BG, border:`1px solid ${BORDER}`, boxShadow: SHADOW, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"17px", transition:"all 0.2s" }}>🔔</div>
            {(stats.pendingRequests > 0) && (
              <div style={{ position:"absolute", top:"-1px", right:"-1px", minWidth:"16px", height:"16px", borderRadius:"8px", background:"#EF4444", border:"2px solid #fff", display:"flex", alignItems:"center", justifyContent:"center", padding:"0 3px" }}>
                <span style={{ fontSize:"8px", fontWeight:700, color:"#fff", lineHeight:1 }}>{stats.pendingRequests}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ ROW 1 – KPI CARDS ═══════════════════════════════════ */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"16px", marginBottom:"16px" }}>
        {[
          { label:"TODAY'S BOOKINGS",  value: String(stats.todayBookings),
            formatted: String(stats.todayBookings), pct:"+8%",  note:"vs yesterday",   icon:"📅" },
          { label:"TODAY'S REVENUE",   value: stats.todayRevenue,
            formatted:`GHC ${stats.todayRevenue.toLocaleString("en",{minimumFractionDigits:2})}`, pct:"+12%", note:"vs yesterday", icon:"💳" },
          { label:"WEEKLY REVENUE",    value: stats.weeklyRevenue,
            formatted:`GHC ${stats.weeklyRevenue.toLocaleString("en",{minimumFractionDigits:2})}`, pct:"+5%",  note:"vs last week",  icon:"📊" },
          { label:"MONTHLY REVENUE",   value: stats.monthlyRevenue,
            formatted:`GHC ${stats.monthlyRevenue.toLocaleString("en",{minimumFractionDigits:2})}`, pct: stats.monthChangePercentage >= 0 ? `+${stats.monthChangePercentage}%` : `${stats.monthChangePercentage}%`, note:"vs last month", icon:"🏆" },
        ].map((c, i) => (
          <div key={i} className="z-card fade-up" style={{ animationDelay:`${i*0.07}s` }}>
            {/* Gold icon badge */}
            <div style={{ width:"38px", height:"38px", borderRadius:"11px", background: G_LIGHT, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"18px", marginBottom:"18px" }}>{c.icon}</div>
            {/* Label */}
            <div style={{ fontSize:"9px", fontWeight:700, letterSpacing:"0.18em", color: TXT_SOFT, marginBottom:"10px" }}>{c.label}</div>
            {/* Value */}
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(24px,2.5vw,32px)", fontWeight:700, color: TXT, lineHeight:1, marginBottom:"12px", letterSpacing:"-0.01em" }}>{c.formatted}</div>
            {/* Trend */}
            <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
              <span style={{ fontSize:"11px", fontWeight:700, color:"#16A34A" }}>{c.pct}</span>
              <span style={{ fontSize:"10px", color: TXT_SOFT, fontWeight:400 }}>{c.note}</span>
            </div>
            {/* Bottom accent line */}
            <div style={{ marginTop:"18px", height:"2px", borderRadius:"1px", background:`linear-gradient(90deg,${G},transparent)` }} />
          </div>
        ))}
      </div>

      {/* ══ ROW 2 – SUMMARY CARDS ═══════════════════════════════ */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"16px", marginBottom:"16px" }}>
        {[
          { label:"TOTAL CLIENTS",  value: stats.totalClients, icon:"👥", sub: stats.clientChangePercentage ? `${stats.clientChangePercentage >= 0 ? "+" : ""}${stats.clientChangePercentage}% this month` : "" },
          { label:"ACTIVE STAFF",  value: stats.activeStaff,  icon:"✂️", sub: "On roster today" },
          { label:"PENDING ACTIONS", value: stats.pendingBookings + stats.pendingRequests, icon:"⏳", sub: "Require attention" },
        ].map((c, i) => (
          <div key={i} className="z-card fade-up" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 24px", animationDelay:`${0.28 + i*0.07}s` }}>
            <div style={{ display:"flex", alignItems:"center", gap:"16px" }}>
              <div style={{ width:"46px", height:"46px", borderRadius:"14px", background: G_LIGHT, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"22px", flexShrink:0 }}>{c.icon}</div>
              <div>
                <div style={{ fontSize:"9px", fontWeight:700, letterSpacing:"0.18em", color: TXT_SOFT, marginBottom:"5px" }}>{c.label}</div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"32px", fontWeight:700, color: TXT, lineHeight:1 }}>{c.value}</div>
                {c.sub && <div style={{ fontSize:"10px", color: TXT_SOFT, marginTop:"4px" }}>{c.sub}</div>}
              </div>
            </div>
            <div style={{ width:"36px", height:"36px", borderRadius:"50%", border:`1.5px solid ${BORDER}`, display:"flex", alignItems:"center", justifyContent:"center", color: TXT_SOFT, fontSize:"14px" }}>→</div>
          </div>
        ))}
      </div>

      {/* ══ GOLD HIGHLIGHT PANEL ════════════════════════════════ */}
      <div className="fade-up" style={{ animationDelay:"0.42s", position:"relative", borderRadius:"20px", overflow:"hidden", marginBottom:"20px", padding:"36px 40px", background:`linear-gradient(115deg, #C9A84C 0%, #E8D27A 45%, #BF9640 100%)`, boxShadow:`0 8px 40px ${G}44` }}>
        {/* Decorative circles */}
        <div style={{ position:"absolute", top:"-50px", right:"80px", width:"200px", height:"200px", borderRadius:"50%", background:"rgba(255,255,255,0.10)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:"-60px", right:"-30px", width:"180px", height:"180px", borderRadius:"50%", background:"rgba(255,255,255,0.07)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", top:"50%", left:"55%", transform:"translateY(-50%)", width:"1px", height:"60%", background:"rgba(255,255,255,0.2)", pointerEvents:"none" }} />

        {/* Badge */}
        <div style={{ position:"absolute", top:"24px", right:"28px", background:"rgba(255,255,255,0.22)", backdropFilter:"blur(12px)", borderRadius:"20px", padding:"6px 16px", fontSize:"10px", fontWeight:700, letterSpacing:"0.14em", color:"#fff", border:"1px solid rgba(255,255,255,0.3)" }}>
          ✦ MOST POPULAR
        </div>

        <div style={{ fontSize:"10px", fontWeight:700, letterSpacing:"0.2em", color:"rgba(255,255,255,0.7)", marginBottom:"10px" }}>TOP SERVICE THIS MONTH</div>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(26px,4vw,42px)", fontWeight:700, color:"#fff", letterSpacing:"-0.01em", marginBottom:"28px", textShadow:"0 2px 12px rgba(0,0,0,0.12)" }}>
          {stats.topService === "N/A" ? "No data yet" : stats.topService}
        </div>

        <div style={{ display:"flex", gap:"clamp(24px,5vw,64px)" }}>
          {[
            { label:"TOTAL BOOKINGS",     val: stats.topServiceCount },
            { label:"REVENUE GENERATED",  val: `GHC ${stats.periodRevenue.toLocaleString()}` },
            { label:"GROWTH",             val: `+${Math.abs(stats.monthChangePercentage)}%` },
          ].map((s, i) => (
            <div key={i}>
              <div style={{ fontSize:"9px", fontWeight:700, letterSpacing:"0.18em", color:"rgba(255,255,255,0.65)", marginBottom:"8px" }}>{s.label}</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(22px,2.8vw,30px)", fontWeight:700, color:"#fff" }}>{s.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ CHARTS ROW ══════════════════════════════════════════ */}
      <div style={{ display:"grid", gridTemplateColumns:"3fr 2fr", gap:"20px", marginBottom:"20px" }}>

        {/* ─ Revenue Trend ─ */}
        <div className="z-card fade-up" style={{ animationDelay:"0.49s", padding:"28px 28px 20px" }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"22px" }}>
            <div>
              <div style={{ fontSize:"9px", fontWeight:700, letterSpacing:"0.18em", color: TXT_SOFT, marginBottom:"6px" }}>REVENUE TREND</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"22px", fontWeight:600, color: TXT }}>Last 7 Days</div>
            </div>
            <div style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:"20px", padding:"5px 13px", fontSize:"11px", fontWeight:700, color:"#DC2626", whiteSpace:"nowrap" }}>
              −23% vs last week
            </div>
          </div>

          <svg width="100%" viewBox={`0 0 ${SW} ${SH}`} style={{ overflow:"visible", display:"block" }}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={G} stopOpacity="0.18" />
                <stop offset="100%" stopColor={G} stopOpacity="0.01" />
              </linearGradient>
            </defs>
            {spPts.length > 1 && (
              <>
                <path d={areaPath} fill="url(#areaGrad)" />
                <path d={bezier} fill="none" stroke={G} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {spPts.map((p, i) => (
                  <g key={i}>
                    <circle cx={p.x} cy={p.y} r="5" fill="#fff" stroke={G} strokeWidth="2.5" />
                    <circle cx={p.x} cy={p.y} r="2" fill={G} />
                  </g>
                ))}
              </>
            )}
            {spPts.length === 0 && <text x={SW/2} y={SH/2} textAnchor="middle" fill={TXT_SOFT} fontSize="12" fontFamily="Montserrat">No data</text>}
          </svg>

          {spark7.length > 0 && (
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:"10px", paddingLeft:`${PAD}px`, paddingRight:`${PAD}px` }}>
              {spark7.map((d, i) => (
                <span key={i} style={{ fontSize:"9px", color: TXT_SOFT, fontWeight:500 }}>{d.name}</span>
              ))}
            </div>
          )}
        </div>

        {/* ─ Donut Chart ─ */}
        <div className="z-card fade-up" style={{ animationDelay:"0.56s", padding:"28px" }}>
          <div style={{ fontSize:"9px", fontWeight:700, letterSpacing:"0.18em", color: TXT_SOFT, marginBottom:"6px" }}>BOOKING STATUS</div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"22px", fontWeight:600, color: TXT, marginBottom:"20px" }}>Distribution</div>

          <div style={{ display:"flex", alignItems:"center", gap:"20px" }}>
            <div style={{ flexShrink:0 }}>
              <svg width="180" height="180" viewBox="0 0 180 180">
                {donutPaths.length > 0 ? donutPaths.map((s, i) => (
                  <path key={i} d={s.path} fill={s.color} opacity="0.88" />
                )) : (
                  <circle cx="90" cy="90" r="72" fill={G_LIGHT} />
                )}
                {/* Inner white disc */}
                <circle cx="90" cy="90" r="44" fill={CARD_BG} />
                {/* Center label */}
                <text x="90" y="85" textAnchor="middle" fill={TXT_SOFT} fontSize="9" fontFamily="Montserrat" fontWeight="700" letterSpacing="2">TOTAL</text>
                <text x="90" y="106" textAnchor="middle" fill={TXT} fontSize="26" fontFamily="Cormorant Garamond" fontWeight="700">
                  {bookingStatusData.reduce((s, d) => s + d.value, 0)}
                </text>
              </svg>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:"10px", flex:1 }}>
              {bookingStatusData.length === 0 ? (
                <span style={{ fontSize:"12px", color: TXT_SOFT }}>No bookings yet</span>
              ) : bookingStatusData.map((d, i) => (
                <div key={i}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"4px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                      <div style={{ width:"8px", height:"8px", borderRadius:"50%", background: SLOT_COLORS[i % SLOT_COLORS.length], flexShrink:0 }} />
                      <span style={{ fontSize:"11px", color: TXT_MID, fontWeight:500 }}>{d.name}</span>
                    </div>
                    <span style={{ fontSize:"12px", fontWeight:700, color: TXT }}>{d.value}</span>
                  </div>
                  <div style={{ height:"3px", borderRadius:"2px", background: BORDER }}>
                    <div style={{ height:"100%", width:`${statusTotal > 0 ? (d.value/statusTotal)*100 : 0}%`, background: SLOT_COLORS[i % SLOT_COLORS.length], borderRadius:"2px" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══ BOTTOM ROW – Alerts + Upcoming ══════════════════════ */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"20px", marginBottom:"20px" }}>
        
        {/* Alerts */}
        <div className="z-card fade-up" style={{ animationDelay:"0.63s", padding:"28px" }}>
          <div style={{ fontSize:"9px", fontWeight:700, letterSpacing:"0.18em", color: TXT_SOFT, marginBottom:"6px" }}>ALERTS</div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"22px", fontWeight:600, color: TXT, marginBottom:"18px" }}>Action Items</div>
          <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
            {alerts.map(a => {
              const cfg = {
                warning:{ bg:"#FFFBEB", border:"#FDE68A", icon:"⚠️" },
                info:   { bg:"#EFF6FF", border:"#BFDBFE", icon:"ℹ️" },
                success:{ bg:"#F0FDF4", border:"#BBF7D0", icon:"✅" },
              }[a.type];
              return (
                <div key={a.id} style={{ display:"flex", alignItems:"flex-start", gap:"10px", padding:"12px 14px", borderRadius:"10px", background: cfg.bg, border:`1px solid ${cfg.border}` }}>
                  <span style={{ fontSize:"14px", flexShrink:0, lineHeight:1.6 }}>{cfg.icon}</span>
                  <span style={{ fontSize:"12px", color: TXT_MID, lineHeight:1.6 }}>{a.message}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming appointments */}
        <div className="z-card fade-up" style={{ animationDelay:"0.70s", padding:"28px" }}>
          <div style={{ fontSize:"9px", fontWeight:700, letterSpacing:"0.18em", color: TXT_SOFT, marginBottom:"6px" }}>UPCOMING</div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"22px", fontWeight:600, color: TXT, marginBottom:"18px" }}>Today's Appointments</div>
          {upcomingAppointments.length === 0 ? (
            <div style={{ textAlign:"center", padding:"24px 0", fontSize:"12px", color: TXT_SOFT }}>No upcoming appointments</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
              {upcomingAppointments.slice(0, 5).map(a => (
                <div key={a.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"11px 14px", borderRadius:"10px", background: CREAM, border:`1px solid ${BORDER}` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
                    <div style={{ width:"34px", height:"34px", borderRadius:"50%", background: G_LIGHT, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px", flexShrink:0 }}>💆</div>
                    <div>
                      <div style={{ fontSize:"12px", fontWeight:600, color: TXT }}>{a.clientName}</div>
                      <div style={{ fontSize:"10px", color: TXT_SOFT, marginTop:"1px" }}>{a.serviceName}</div>
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:"13px", fontWeight:700, color: G }}>{a.time}</div>
                    <div style={{ fontSize:"10px", color: TXT_SOFT }}>{a.date ? format(new Date(a.date), "MMM d") : ""}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ══ BOTTOM ROW – Payments + Top Staff ═══════════════════ */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"20px" }}>

        {/* Payment methods */}
        <div className="z-card fade-up" style={{ animationDelay:"0.77s", padding:"28px" }}>
          <div style={{ fontSize:"9px", fontWeight:700, letterSpacing:"0.18em", color: TXT_SOFT, marginBottom:"6px" }}>PAYMENTS</div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"22px", fontWeight:600, color: TXT, marginBottom:"18px" }}>By Method · {filterLabel}</div>
          {paymentMethodData.length === 0 ? (
            <div style={{ textAlign:"center", padding:"24px 0", fontSize:"12px", color: TXT_SOFT }}>No payment data yet</div>
          ) : (
            <>
              {/* Stacked progress bar */}
              <div style={{ height:"6px", borderRadius:"3px", display:"flex", gap:"2px", marginBottom:"20px", overflow:"hidden" }}>
                {paymentMethodData.map((d, i) => (
                  <div key={i} style={{ flex: d.amount || 0, background: SLOT_COLORS[i % SLOT_COLORS.length], minWidth:"4px" }} />
                ))}
              </div>
              {paymentMethodData.map((d, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 0", borderBottom: i < paymentMethodData.length-1 ? `1px solid ${BORDER}` : "none" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                    <div style={{ width:"9px", height:"9px", borderRadius:"3px", background: SLOT_COLORS[i % SLOT_COLORS.length], flexShrink:0 }} />
                    <span style={{ fontSize:"12px", color: TXT_MID, fontWeight:500, textTransform:"capitalize" }}>{d.method.replace(/_/g," ")}</span>
                    <span style={{ fontSize:"10px", color: TXT_SOFT }}>{d.count}×</span>
                  </div>
                  <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"16px", fontWeight:600, color: TXT }}>GHC {d.amount.toLocaleString()}</span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Top staff */}
        <div className="z-card fade-up" style={{ animationDelay:"0.84s", padding:"28px" }}>
          <div style={{ fontSize:"9px", fontWeight:700, letterSpacing:"0.18em", color: TXT_SOFT, marginBottom:"6px" }}>PERFORMANCE</div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"22px", fontWeight:600, color: TXT, marginBottom:"18px" }}>Top Staff · {filterLabel}</div>
          {topStaff.length === 0 ? (
            <div style={{ textAlign:"center", padding:"24px 0", fontSize:"12px", color: TXT_SOFT }}>No staff data yet</div>
          ) : topStaff.slice(0, 5).map((s: any, i: number) => (
            <div key={s.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0", borderBottom: i < topStaff.length-1 ? `1px solid ${BORDER}` : "none" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
                <div style={{ width:"34px", height:"34px", borderRadius:"50%", background: i === 0 ? G_LIGHT : CREAM, border:`1.5px solid ${i === 0 ? G : BORDER}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px", flexShrink:0, fontWeight:700, color: TXT_MID }}>
                  {["🥇","🥈","🥉","4","5"][i]}
                </div>
                <div>
                  <div style={{ fontSize:"12px", fontWeight:600, color: TXT }}>{s.name}</div>
                  {s.specialization && <div style={{ fontSize:"10px", color: TXT_SOFT, marginTop:"1px" }}>{s.specialization}</div>}
                </div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:"13px", fontWeight:700, color: G }}>{s.bookings} bookings</div>
                {s.revenue > 0 && <div style={{ fontSize:"10px", color: TXT_SOFT, marginTop:"1px" }}>GHC {s.revenue.toLocaleString()}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default AdminDashboard;
