import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getTopServices, getTopClients, getRevenueByDay, getRevenueByWeek, getPaymentMethodBreakdown } from "@/lib/analytics";
import { toast } from "sonner";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, LineChart, Line, CartesianGrid
} from "recharts";

const NAVY    = "#0F1E35";
const GOLD    = "#C9A84C";
const G_LIGHT = "#F5ECD6";
const CREAM   = "#FAFAF8";
const BORDER  = "#EDE8E0";
const TXT     = "#1C1917";
const TXT_MID = "#57534E";
const TXT_SOFT= "#A8A29E";
const WHITE   = "#FFFFFF";
const COLORS  = [GOLD, "#3B82F6", "#10B981", "#8B5CF6", "#EF4444", "#F59E0B", "#06B6D4", "#EC4899"];

type Range = "7d" | "30d" | "3m" | "thisMonth" | "lastMonth";

const RANGE_OPTIONS: { label: string; value: Range }[] = [
  { label: "7 Days",      value: "7d" },
  { label: "30 Days",     value: "30d" },
  { label: "3 Months",    value: "3m" },
  { label: "This Month",  value: "thisMonth" },
  { label: "Last Month",  value: "lastMonth" },
];

const getRangeDates = (range: Range) => {
  const now = new Date();
  switch (range) {
    case "7d":        return { start: format(subDays(now, 6), "yyyy-MM-dd"),             end: format(now, "yyyy-MM-dd") };
    case "30d":       return { start: format(subDays(now, 29), "yyyy-MM-dd"),            end: format(now, "yyyy-MM-dd") };
    case "3m":        return { start: format(subDays(now, 89), "yyyy-MM-dd"),            end: format(now, "yyyy-MM-dd") };
    case "thisMonth": return { start: format(startOfMonth(now), "yyyy-MM-dd"),           end: format(endOfMonth(now), "yyyy-MM-dd") };
    case "lastMonth": return { start: format(startOfMonth(subMonths(now,1)), "yyyy-MM-dd"), end: format(endOfMonth(subMonths(now,1)), "yyyy-MM-dd") };
  }
};

const fmt = (n: number) => `GHS ${n.toLocaleString("en-GH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const KPICard = ({ label, value, sub, color = GOLD }: any) => (
  <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "22px 24px", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", color: TXT_SOFT, marginBottom: 8 }}>{label.toUpperCase()}</div>
    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 30, fontWeight: 700, color: TXT, lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: TXT_SOFT, marginTop: 6 }}>{sub}</div>}
  </div>
);

const SectionTitle = ({ children }: any) => (
  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 600, color: TXT, marginBottom: 16 }}>{children}</div>
);

const Card = ({ children, style = {} }: any) => (
  <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "24px", boxShadow: "0 1px 6px rgba(0,0,0,0.04)", ...style }}>
    {children}
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: NAVY, color: WHITE, borderRadius: 10, padding: "10px 14px", fontSize: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color || GOLD }}>{p.name}: {typeof p.value === "number" && p.name?.toLowerCase().includes("revenue") ? fmt(p.value) : p.value}</div>
      ))}
    </div>
  );
};

export default function AnalyticsDashboard() {
  const [range, setRange] = useState<Range>("30d");
  const [sales, setSales] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [topServices, setTopServices] = useState<any[]>([]);
  const [topClients, setTopClients] = useState<any[]>([]);
  const [revenueSplit, setRevenueSplit] = useState({ service: 0, product: 0, subscription: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [range]);

  const load = async () => {
    setLoading(true);
    try {
      const { start, end } = getRangeDates(range);
      const [salesRes, bookingsRes, itemsRes, svc, clients] = await Promise.all([
        supabase.from("sales").select("amount, created_at, payment_method, service_name, client_name").eq("status", "completed").gte("created_at", start).lte("created_at", end + "T23:59:59"),
        supabase.from("bookings").select("status, preferred_date, service_name, client_name, staff_name, price").gte("preferred_date", start).lte("preferred_date", end),
        (supabase as any).from("checkout_items").select("item_type, price_at_time, subtotal, quantity").gte("created_at", start).lte("created_at", end + "T23:59:59"),
        getTopServices(),
        getTopClients(),
      ]);
      setSales(salesRes.data || []);
      setBookings(bookingsRes.data || []);
      setTopServices(svc);
      setTopClients(clients);
      // Revenue split by type from line items
      const items = itemsRes.data || [];
      const ciSvcRev  = items.filter((i: any) => i.item_type === "service").reduce((s: number, i: any) => s + Number(i.subtotal || (i.price_at_time * (i.quantity || 1)) || 0), 0);
      const ciProdRev = items.filter((i: any) => i.item_type === "product").reduce((s: number, i: any) => s + Number(i.subtotal || (i.price_at_time * (i.quantity || 1)) || 0), 0);
      const ciSubRev  = items.filter((i: any) => i.item_type === "subscription").reduce((s: number, i: any) => s + Number(i.subtotal || (i.price_at_time * (i.quantity || 1)) || 0), 0);
      const hasCI = ciSvcRev > 0 || ciProdRev > 0;
      // Fallback when no checkout_items: detect product sales from sales.notes
      const allSales = salesRes.data || [];
      const allCompleted = allSales.filter((s: any) => s.status === "completed");
      const fallbackProd = allCompleted.filter((s: any) =>
        s.notes && s.notes.toLowerCase().includes("product sale")
      ).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
      const fallbackSvc = allCompleted.reduce((s: number, p: any) => s + Number(p.amount || 0), 0) - fallbackProd;
      setRevenueSplit({
        service: hasCI ? ciSvcRev : fallbackSvc,
        product: hasCI ? ciProdRev : fallbackProd,
        subscription: ciSubRev,
      });
    } catch { toast.error("Failed to load analytics"); }
    finally { setLoading(false); }
  };

  // Derived metrics
  const totalRevenue   = sales.reduce((s, p) => s + Number(p.amount || 0), 0);
  const avgTicket      = sales.length ? totalRevenue / sales.length : 0;
  const completed      = bookings.filter(b => b.status === "completed").length;
  const cancelled      = bookings.filter(b => b.status === "cancelled").length;
  const compRate       = bookings.length ? Math.round((completed / bookings.length) * 100) : 0;
  const noShows        = bookings.filter(b => b.status === "no_show").length;

  // Revenue chart
  const { start } = getRangeDates(range);
  const daysSpan = Math.ceil((new Date().getTime() - new Date(start).getTime()) / 86400000) + 1;
  const revenueChart = daysSpan <= 30 ? getRevenueByDay(sales, daysSpan) : getRevenueByWeek(sales);

  // Payment methods
  const paymentBreakdown = getPaymentMethodBreakdown(sales);

  // Booking status pie
  const statusData = [
    { name: "Completed", value: completed,                              color: "#10B981" },
    { name: "Cancelled", value: cancelled,                              color: "#EF4444" },
    { name: "No Show",   value: noShows,                               color: "#F59E0B" },
    { name: "Pending",   value: bookings.filter(b => b.status === "pending").length, color: "#3B82F6" },
    { name: "Confirmed", value: bookings.filter(b => b.status === "confirmed").length, color: GOLD },
  ].filter(d => d.value > 0);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
      <div style={{ width: 36, height: 36, border: `3px solid ${G_LIGHT}`, borderTop: `3px solid ${GOLD}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1300, margin: "0 auto", fontFamily: "'Montserrat',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Montserrat:wght@400;500;600;700&display=swap');`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", color: TXT_SOFT, marginBottom: 4 }}>ZOLARA BEAUTY STUDIO</div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 32, fontWeight: 700, color: TXT, lineHeight: 1 }}>Analytics</div>
        </div>
        {/* Range filter */}
        <div style={{ display: "flex", gap: 6, background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 5 }}>
          {RANGE_OPTIONS.map(o => (
            <button key={o.value} onClick={() => setRange(o.value)} style={{ padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "'Montserrat',sans-serif", background: range === o.value ? NAVY : "transparent", color: range === o.value ? WHITE : TXT_MID, transition: "all 0.15s" }}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 28 }}>
        <KPICard label="Revenue"        value={fmt(totalRevenue)}       sub={`${sales.length} transactions`} />
        <KPICard label="Avg Ticket"     value={fmt(avgTicket)}          sub="per transaction" />
        <KPICard label="Total Bookings" value={bookings.length}         sub={`${completed} completed`} />
        <KPICard label="Completion Rate" value={`${compRate}%`}         sub={`${cancelled} cancelled`} />
        <KPICard label="No Shows"       value={noShows}                 sub="missed appointments" />
        <KPICard label="Top Clients"    value={topClients.length}       sub="all-time" />
      </div>

      {/* Revenue by Type */}
      {totalRevenue > 0 && (() => {
        const sRev = (revenueSplit.service > 0 || revenueSplit.product > 0) ? revenueSplit.service : totalRevenue;
        const pRev = revenueSplit.product || 0;
        const subRev = revenueSplit.subscription || 0;
        return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
          {[
            { label: "SERVICE REVENUE",      value: sRev,   color: "#8B6914", bg: "#FBF6EE", border: "#F0E4CC" },
            { label: "PRODUCT REVENUE",       value: pRev,   color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
            { label: "SUBSCRIPTION REVENUE",  value: subRev, color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
          ].map(k => (
            <div key={k.label} style={{ background: k.bg, border: `1px solid ${k.border}`, borderRadius: 14, padding: "16px 20px" }}>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: k.color, margin: "0 0 6px" }}>{k.label}</p>
              <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, fontWeight: 700, color: "#1C160E", margin: 0 }}>{fmt(k.value)}</p>
              {totalRevenue > 0 && <p style={{ fontSize: 10, color: k.color, margin: "4px 0 0" }}>{((k.value / totalRevenue) * 100).toFixed(1)}% of total</p>}
            </div>
          ))}
        </div>
        );
      })()}

      {/* Revenue Chart */}
      <Card style={{ marginBottom: 24 }}>
        <SectionTitle>Revenue Over Time</SectionTitle>
        {revenueChart.every(d => d.revenue === 0) ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: TXT_SOFT, fontSize: 13 }}>No revenue data for this period</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={revenueChart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: TXT_SOFT }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: TXT_SOFT }} axisLine={false} tickLine={false} tickFormatter={v => `GHS ${v >= 1000 ? (v/1000).toFixed(0)+"K" : v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" name="Revenue" fill={GOLD} radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Row 2: Top Services + Payment Methods */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>

        {/* Top Services */}
        <Card>
          <SectionTitle>Top Services</SectionTitle>
          {topServices.length === 0 ? (
            <div style={{ color: TXT_SOFT, fontSize: 13, textAlign: "center", padding: "24px 0" }}>No data yet</div>
          ) : topServices.map((s, i) => (
            <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < topServices.length - 1 ? `1px solid ${BORDER}` : "none" }}>
              <div style={{ width: 26, height: 26, borderRadius: 8, background: i === 0 ? G_LIGHT : CREAM, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: i === 0 ? GOLD : TXT_SOFT, flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: TXT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</div>
                <div style={{ marginTop: 4, height: 4, borderRadius: 2, background: BORDER, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 2, background: GOLD, width: `${topServices[0]?.count ? (s.count / topServices[0].count) * 100 : 0}%` }} />
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: TXT }}>{s.count}×</div>
                <div style={{ fontSize: 10, color: TXT_SOFT }}>{fmt(s.revenue)}</div>
              </div>
            </div>
          ))}
        </Card>

        {/* Payment Methods */}
        <Card>
          <SectionTitle>Revenue by Payment</SectionTitle>
          {paymentBreakdown.length === 0 ? (
            <div style={{ color: TXT_SOFT, fontSize: 13, textAlign: "center", padding: "24px 0" }}>No payment data yet</div>
          ) : (
            <>
              <div style={{ height: 6, borderRadius: 3, display: "flex", gap: 2, marginBottom: 20, overflow: "hidden" }}>
                {paymentBreakdown.map((d, i) => (
                  <div key={d.method} style={{ flex: d.amount, background: COLORS[i % COLORS.length], minWidth: 4 }} />
                ))}
              </div>
              {paymentBreakdown.map((d, i) => (
                <div key={d.method} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < paymentBreakdown.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 9, height: 9, borderRadius: 3, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 500, color: TXT_MID, textTransform: "capitalize" }}>{d.method.replace(/_/g, " ")}</span>
                    <span style={{ fontSize: 10, color: TXT_SOFT }}>{d.count}×</span>
                  </div>
                  <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 16, fontWeight: 600, color: TXT }}>{fmt(d.amount)}</span>
                </div>
              ))}
            </>
          )}
        </Card>
      </div>

      {/* Row 3: Booking Status Pie + Top Clients */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>

        {/* Booking Status */}
        <Card>
          <SectionTitle>Booking Status Breakdown</SectionTitle>
          {statusData.length === 0 ? (
            <div style={{ color: TXT_SOFT, fontSize: 13, textAlign: "center", padding: "24px 0" }}>No bookings in this period</div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => [v, ""]} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1 }}>
                {statusData.map((d, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: i < statusData.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.color }} />
                      <span style={{ fontSize: 12, color: TXT_MID }}>{d.name}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: TXT }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Top Clients */}
        <Card>
          <SectionTitle>Top Clients by Spend</SectionTitle>
          {topClients.length === 0 ? (
            <div style={{ color: TXT_SOFT, fontSize: 13, textAlign: "center", padding: "24px 0" }}>No client data yet</div>
          ) : topClients.map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < topClients.length - 1 ? `1px solid ${BORDER}` : "none" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: i === 0 ? G_LIGHT : CREAM, border: `1.5px solid ${i === 0 ? GOLD : BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: i === 0 ? GOLD : TXT_SOFT, flexShrink: 0 }}>
                {i < 3 ? ["🥇","🥈","🥉"][i] : i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: TXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                <div style={{ fontSize: 10, color: TXT_SOFT }}>{c.total_visits || 0} visit{(c.total_visits || 0) !== 1 ? "s" : ""} · {c.loyalty_points || 0} stamp{(c.loyalty_points || 0) !== 1 ? "s" : ""}</div>
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 15, fontWeight: 700, color: TXT, flexShrink: 0 }}>{fmt(c.total_spent || 0)}</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
