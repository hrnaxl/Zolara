import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileDown, TrendingUp } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { format, startOfMonth, endOfMonth, subDays } from "date-fns";
import jsPDF from "jspdf";

const Reports = () => {
  const [startDate, setStartDate] = useState(
    format(startOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(
    format(endOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [filterType, setFilterType] = useState("all");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("all");
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>("all");
  const [reportData, setReportData] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [salesPage, setSalesPage] = useState(0);
  const SALES_PAGE_SIZE = 50;
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { settings } = useSettings();

  const formatDateTime = (date: string, time: string) => {
    if (!date || !time) return "";

    let day, month, year;

    // Normalize separators
    const normalized = date.replace(/\//g, "-");
    const parts = normalized.split("-");

    // Detect format: DD-MM-YYYY or YYYY-MM-DD
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    } else {
      // DD-MM-YYYY
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      year = parseInt(parts[2], 10);
    }

    // Time handling
    const [h, m = "0", s = "0"] = time.split(":");
    const hour = parseInt(h, 10);
    const minute = parseInt(m, 10);
    const second = parseInt(s, 10);

    const dt = new Date(year, month, day, hour, minute, second);

    if (isNaN(dt.getTime())) {
      console.log("Invalid parsed date:", {
        date,
        time,
        parts,
        year,
        month,
        day,
      });
      return "";
    }

    return dt.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
    });
  };

  /* ===============================
   GENERATE REPORT (CLEAN VERSION)
================================= */
  const generateReport = async () => {
    setLoading(true);
    try {
      // include transaction_reference and service price when available
      // Fetch checkout line items for revenue split
      const { data: checkoutItemsData } = await (supabase as any)
        .from("checkout_items")
        .select("item_type, price_at_time")
        .gte("created_at", startDate)
        .lte("created_at", endDate + "T23:59:59");
      // Revenue split from checkout_items (covers all new checkouts)
      const ciItems = checkoutItemsData || [];
      const ciServiceRev = ciItems.filter((i: any) => i.item_type === "service").reduce((s: number, i: any) => s + Number(i.subtotal || i.price_at_time || 0), 0);
      const ciProductRev = ciItems.filter((i: any) => i.item_type === "product").reduce((s: number, i: any) => s + Number(i.subtotal || i.price_at_time || 0), 0);
      const subscriptionRevenue = ciItems.filter((i: any) => i.item_type === "subscription").reduce((s: number, i: any) => s + Number(i.subtotal || i.price_at_time || 0), 0);
      // Fallback: if checkout_items is empty, classify from sales table directly
      // gift_card payment method = gift card revenue (counted in service revenue as it pays for services)
      const serviceRevenue = ciServiceRev;
      const productRevenue = ciProductRev;

      // Fetch ALL sales for accurate totals/aggregations
      let query = supabase
        .from("sales")
        .select(
          `id, amount, payment_method, status, payment_date, transaction_reference,
          bookings:booking_id (
            id, preferred_date, preferred_time, status, rating,
            services:service_id (id, name, category, price),
            staff:staff_id (id, name),
            clients:client_id (id, name)
          )`
        )
        .gte("payment_date", startDate)
        .lte("payment_date", endDate + "T23:59:59")
        .order("payment_date", { ascending: false });

      // apply payment method/status filters only when the corresponding filter type is selected
      if (filterType === "payment_method" && selectedPaymentMethod && selectedPaymentMethod !== "all") {
        // include gift_card as a valid payment method option
        query = query.eq(
          "payment_method",
          selectedPaymentMethod as "cash" | "mobile_money" | "card" | "bank_transfer" | "gift_card"
        );
      }
      if (filterType === "status" && selectedPaymentStatus && selectedPaymentStatus !== "all") {
        query = query.eq("status", selectedPaymentStatus as "pending" | "completed" | "refunded");
      }

      const { data, error } = await query;

      if (error) throw error;

      // helper: normalize booking and nested relations which may be arrays or single objects
      const getBooking = (p: any) => (Array.isArray(p.bookings) ? p.bookings[0] : p.bookings);
      const normalizeRel = (r: any) => (Array.isArray(r) ? r[0] : r);

      // If filtering by client, apply client filter client-side (bookings relation present)
      let rows = data || [];
      if (filterType === "client" && selectedClientId) {
        rows = (rows || []).filter((p: any) => {
          const booking = getBooking(p);
          const clientRel = normalizeRel(booking?.clients);
          const cid = clientRel?.id ?? clientRel?.name ?? "";
          // Coerce to string because client ids may be numbers/uuids
          return String(cid) === String(selectedClientId);
        });
      }

      /* ===============================
       BASIC METRICS
    ============================== */
      const totalRevenue = rows.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
      const totalBookings = rows.length || 0;

      /* ===============================
       PAYMENT METHOD TOTALS
    ============================== */
      const methodTotals: any = {};
      rows.forEach((r: any) => {
        const m = r.payment_method || "unknown";
        methodTotals[m] = (methodTotals[m] || 0) + Number(r.amount || 0);
      });

      /* ===============================
       SERVICE BREAKDOWN + STATS
    ============================== */
      const serviceBreakdown = rows.reduce((acc: any, row: any) => {
        const booking = getBooking(row);
        const serviceRel = normalizeRel(booking?.services);
        const name = serviceRel?.name || "Unknown";
        if (!acc[name]) acc[name] = { count: 0, revenue: 0, avgPrice: 0, avgDuration: 0 };

        acc[name].count += 1;
        acc[name].revenue += Number(row.amount);        // collect price if available
        if (serviceRel?.price) acc[name].avgPrice = (acc[name].avgPrice + Number(serviceRel.price)) || Number(serviceRel.price);        return acc;
      }, {});

      // finalize avg price/duration for services
      const serviceStats = Object.entries(serviceBreakdown).map(([name, s]: any) => {
        const avgPrice = s.count ? s.avgPrice / s.count : 0;
        const avgDuration = s.count ? s.avgDuration / s.count : 0;
        const revenuePerHour = avgDuration > 0 ? (s.revenue / (avgDuration / 60)) : 0;
        return { name, count: s.count, revenue: s.revenue, avgPrice, avgDuration, revenuePerHour };
      }).sort((a: any, b: any) => b.revenue - a.revenue);

      /* ===============================
       MOST ACTIVE CLIENTS / TOP SPENDERS
    ============================== */
      const mostActiveClients = rows.reduce((acc: any, row: any) => {
        const booking = getBooking(row);
        const clientRel = normalizeRel(booking?.clients);
        const clientId = clientRel?.id ?? clientRel?.name ?? "unknown";
        const clientName = clientRel?.name || "Unknown";

        const key = String(clientId);
        if (!acc[key]) acc[key] = { id: clientId, name: clientName, count: 0, revenue: 0 };
        acc[key].count += 1;
        acc[key].revenue += Number(row.amount);
        return acc;
      }, {});

      const mostActiveList = Object.values(mostActiveClients || {}).sort(
        (a: any, b: any) => b.revenue - a.revenue
      );

      /* ===============================
       SERVICE HISTORY (for selected client)
    ============================== */
      let serviceHistory: any = {};
      if (filterType === "service_history" && selectedClientId) {
        const rowsForClient = (data || []).filter((p: any) => {
          const booking = getBooking(p);
          const clientRel = normalizeRel(booking?.clients);
          const cid = clientRel?.id ?? clientRel?.name ?? "";
          return String(cid) === String(selectedClientId);
        }) || [];

        serviceHistory = rowsForClient.reduce((acc: any, row: any) => {
          const booking = getBooking(row);
          const serviceRel = normalizeRel(booking?.services);
          const name = serviceRel?.name || "Unknown";
          if (!acc[name]) acc[name] = { count: 0, revenue: 0 };
          acc[name].count += 1;
          acc[name].revenue += Number(row.amount);
          return acc;
        }, {});
      }

      /* ===============================
       STAFF BREAKDOWN
    ============================== */
      const staffBreakdown = rows.reduce((acc: any, row: any) => {
        const staffObj = Array.isArray(row.bookings) ? row.bookings[0]?.staff : row.bookings?.staff;
        const name = staffObj?.name || "Unassigned";
        const staffId = staffObj?.id || name || "unknown";
        if (!acc[staffId]) acc[staffId] = { name, count: 0, revenue: 0, ratingSum: 0, ratingCount: 0 };

        acc[staffId].count += 1;
        acc[staffId].revenue += Number(row.amount);

        const booking = Array.isArray(row.bookings) ? row.bookings[0] : row.bookings;
        const rating = booking?.rating ?? booking?.rating_value ?? booking?.client_rating ?? null;
        if (rating !== null && !isNaN(Number(rating))) {
          acc[staffId].ratingSum += Number(rating);
          acc[staffId].ratingCount += 1;
        }

        return acc;
      }, {});

      const staffBreakdownByName: any = {};
      Object.entries(staffBreakdown || {}).forEach(([staffId, v]: any) => {
        const item = v as any;
        staffBreakdownByName[item.name] = {
          count: item.count,
          revenue: item.revenue,
          avgRating: item.ratingCount ? item.ratingSum / item.ratingCount : null,
          avgRevenuePerBooking: item.count ? item.revenue / item.count : 0,
        };
      });

      /* ===============================
       DAILY TIMELINE & PEAK HOURS
    ============================== */
      const dailyTimeline: any = {};
      const hourTimeline: any = {};
      rows.forEach((r: any) => {
        const booking = getBooking(r);
        const dateKey = (r.payment_date || booking?.preferred_date || "").toString().slice(0, 10);
        dailyTimeline[dateKey] = (dailyTimeline[dateKey] || 0) + Number(r.amount || 0);

        const time = booking?.preferred_time || r.payment_date?.toString()?.split("T")?.[1] || "";
        const hour = time ? String(time).split(":")[0] : "unknown";
        hourTimeline[hour] = (hourTimeline[hour] || 0) + Number(r.amount || 0);
      });

      /* ===============================
       BOOKING COUNTS (performance)
    ============================== */
      const bookingCounts = rows.reduce((acc: any, r: any) => {
        const booking = getBooking(r);
        const status = (booking?.status || "unknown").toLowerCase();
        if (status.includes("complete")) acc.completed += 1;
        else if (status.includes("cancel")) acc.cancelled += 1;
        else if (status.includes("no")) acc.no_show += 1;
        return acc;
      }, { completed: 0, cancelled: 0, no_show: 0 });

      /* ===============================
       PREVIOUS PERIOD COMPARISON
    ============================== */
      // compute previous period range by shifting the current range back by its length
      const msPerDay = 24 * 60 * 60 * 1000;
      const s = new Date(startDate);
      const e = new Date(endDate);
      const lenDays = Math.round((e.getTime() - s.getTime()) / msPerDay) + 1;
      const prevEnd = subDays(s, 1);
      const prevStart = subDays(prevEnd, lenDays - 1);

      // fetch previous period revenue
      const { data: prevData } = await supabase
        .from("sales")
        .select("amount")
        .gte("payment_date", format(prevStart, "yyyy-MM-dd"))
        .lte("payment_date", format(prevEnd, "yyyy-MM-dd"));

      const prevRevenue = (prevData || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0) || 0;

      /* ===============================
       COMBINED EXPORT FORMAT
    ============================== */
      const exportRows = rows.map((p) => {
        const booking = getBooking(p);
        const clientRel = normalizeRel(booking?.clients);
        const staffRel = normalizeRel(booking?.staff);
        const serviceRel = normalizeRel(booking?.services);

        const appointmentDate = booking?.preferred_date ?? "";
        const appointmentTime = booking?.preferred_time ?? "";

        return {
          AppointmentDateTime: formatDateTime(appointmentDate, appointmentTime),
          Client: clientRel?.name ?? "",
          Staff: staffRel?.name ?? "",
          Service: serviceRel?.name ?? "",
          ServiceCategory: serviceRel?.category ?? "",            // @ts-ignore
          Amount: p?.amount ?? 0,               // @ts-ignore
          PaymentMethod: p?.payment_method ?? "",             // @ts-ignore
          PaymentDate: p?.payment_date ? format(new Date(p?.payment_date), "yyyy-MM-dd HH:mm") : "",
          BookingStatus: booking?.status ?? "",
          BookingID: booking?.id ?? "",           // @ts-ignore
          PaymentID: p?.id ?? "",             // @ts-ignore
          TransactionRef: p?.transaction_reference ?? "",
        };
      });

      /* ===============================
       AUDIT: generatedAt / generatedBy
    ============================== */
      let generatedBy = "Unknown";
      try {
        const authRes: any = await (supabase.auth as any).getUser?.();
        const user = authRes?.data?.user || authRes?.user || null;
        if (user?.id) {
          const { data: profile } = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
          // @ts-ignore
          generatedBy = profile?.role ? `${profile.role}` : profile?.name || "User";
        }
      } catch (e) {
        // ignore
      }

      setReportData({ serviceRevenue, productRevenue, subscriptionRevenue,
        totalRevenue,
        totalBookings,
        serviceBreakdown,
        serviceStats,
        staffBreakdown: staffBreakdownByName,
        methodTotals,
        exportRows,
        rawData: data,
        mostActiveList,
        serviceHistory,
        bookingCounts,
        dailyTimeline,
        hourTimeline,
        prevRevenue,
        generatedAt: new Date().toISOString(),
        generatedBy,
      });
    } catch (err) {
      console.error("Report Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch clients for service history filter
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const { data } = await supabase
          .from("clients")
          .select("id, name")
          .order("name");
        if (data) setClients(data);
      } catch (err) {
        console.error("Failed to fetch clients", err);
      }
    };

    fetchClients();
  }, []);

  /* Font injection */
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);

  /* Run on page mount */
  useEffect(() => {
    generateReport();
  }, []);

  /* ===============================
   EXPORT CSV
================================= */
  const exportToCSV = () => {
    if (!reportData?.exportRows || reportData.exportRows.length === 0) return;
    const rows = reportData.exportRows;
    const headers = Object.keys(rows[0]);

    // metadata lines
    const metaLines = [
      `Generated At:,"${reportData.generatedAt || new Date().toISOString()}"`,
      `Generated By:,"${reportData.generatedBy || "Unknown"}"`,
      "",
    ];

    const csvBody = [
      headers.join(","),
      ...rows.map((r: any) => headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const csv = metaLines.join("\n") + csvBody;

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `salon-report-${startDate}-to-${endDate}.csv`;
    a.click();

    window.URL.revokeObjectURL(url);
  };

  const G = "#C8A97E", G_D = "#8B6914", CREAM = "#FAFAF8", WHITE = "#FFFFFF";
  const BORDER = "#EDEBE5", TXT = "#1C160E", TXT_MID = "#78716C", TXT_SOFT = "#A8A29E";
  const SHADOW = "0 1px 3px rgba(0,0,0,0.04),0 4px 16px rgba(0,0,0,0.06)";
  const card = { background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "16px", padding: "24px", boxShadow: SHADOW } as React.CSSProperties;
  const inpStyle = { border: `1.5px solid ${BORDER}`, borderRadius: "10px", padding: "9px 12px", fontSize: "13px", color: TXT, outline: "none", background: WHITE, fontFamily: "Montserrat,sans-serif", width: "100%" } as React.CSSProperties;
  const selStyle = { ...inpStyle };
  const row = (label: string, value: any, bold = false) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${BORDER}` }}>
      <span style={{ fontSize: "12px", color: bold ? TXT : TXT_MID, fontWeight: bold ? 700 : 400 }}>{label}</span>
      <span style={{ fontSize: "13px", fontWeight: bold ? 700 : 600, color: bold ? G_D : TXT }}>{value}</span>
    </div>
  );

  return (
    <div style={{ background: CREAM, minHeight: "100vh", padding: "clamp(16px,4vw,32px)", fontFamily: "Montserrat,sans-serif", color: TXT }}>
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.16em", color: G, textTransform: "uppercase", marginBottom: "4px" }}>Analytics</p>
        <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(28px,4vw,42px)", fontWeight: 700, color: TXT, margin: "0 0 4px", lineHeight: 1 }}>Reports</h1>
        <p style={{ fontSize: "12px", color: TXT_SOFT, marginTop: "6px" }}>Generate, analyze, and export business intelligence</p>
      </div>

      {/* Filter Card */}
      <div style={{ ...card, marginBottom: "20px" }}>
        <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", color: TXT_SOFT, textTransform: "uppercase", marginBottom: "18px" }}>Report Filters</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px", marginBottom: "16px" }}>
          <div><label style={{ fontSize: "11px", fontWeight: 600, color: TXT_MID, display: "block", marginBottom: "6px" }}>Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inpStyle} /></div>
          <div><label style={{ fontSize: "11px", fontWeight: 600, color: TXT_MID, display: "block", marginBottom: "6px" }}>End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inpStyle} /></div>
          <div><label style={{ fontSize: "11px", fontWeight: 600, color: TXT_MID, display: "block", marginBottom: "6px" }}>Filter Type</label>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} style={selStyle}>
              <option value="all">All</option>
              <option value="payment_method">By Payment Method</option>
              <option value="status">By Payment Status</option>
              <option value="client">By Client</option>
              <option value="service">By Service</option>
              <option value="staff">By Staff</option>
              <option value="most_active">Most Active Clients</option>
              <option value="service_history">Service History (Per Client)</option>
            </select></div>
          {filterType === "payment_method" && (
            <div><label style={{ fontSize: "11px", fontWeight: 600, color: TXT_MID, display: "block", marginBottom: "6px" }}>Payment Method</label>
              <select value={selectedPaymentMethod} onChange={e => setSelectedPaymentMethod(e.target.value)} style={selStyle}>
                <option value="all">All Methods</option>
                {settings?.payment_methods?.filter(m => m.enabled).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select></div>
          )}
          {filterType === "status" && (
            <div><label style={{ fontSize: "11px", fontWeight: 600, color: TXT_MID, display: "block", marginBottom: "6px" }}>Payment Status</label>
              <select value={selectedPaymentStatus} onChange={e => setSelectedPaymentStatus(e.target.value)} style={selStyle}>
                <option value="all">All</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="refunded">Refunded</option>
              </select></div>
          )}
          {(filterType === "service_history" || filterType === "client") && (
            <div style={{ gridColumn: "1/-1" }}><label style={{ fontSize: "11px", fontWeight: 600, color: TXT_MID, display: "block", marginBottom: "6px" }}>Choose Client</label>
              <select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)} style={selStyle}>
                <option value="all">All clients</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select></div>
          )}
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button onClick={generateReport} disabled={loading}
            style={{ padding: "10px 24px", borderRadius: "12px", background: G_D, color: WHITE, border: "none", fontSize: "13px", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Generating…" : "Generate Report"}
          </button>
          <button onClick={exportToCSV} disabled={!reportData}
            style={{ padding: "10px 20px", borderRadius: "12px", background: WHITE, color: G_D, border: `1.5px solid ${G}`, fontSize: "13px", fontWeight: 600, cursor: !reportData ? "not-allowed" : "pointer", opacity: !reportData ? 0.5 : 1 }}>
            Export CSV
          </button>
          <button disabled={!reportData} onClick={async () => {
            if (!reportData) await generateReport();
            try {
              const rows = (reportData?.exportRows || []).slice();
              const title = `Revenue Report ${startDate} - ${endDate}`;
              const headers = Object.keys(rows[0] || {});
              const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>@page{size:A4 landscape;margin:15mm}body{font-family:Georgia,serif;color:#111;padding:10mm}h2{font-size:18px;color:#8B6914;margin-bottom:12px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #ddd;padding:6px}th{background:#C8A97E;color:#fff}</style></head><body><h2>${title}</h2><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r:any)=>`<tr>${headers.map(h=>`<td>${(r[h]??"")}`)}</tr>`).join("")}</tbody></table><script>setTimeout(()=>window.print(),300)</script></body></html>`;
              const w = window.open("","_blank"); w?.document.write(html); w?.document.close();
            } catch { alert("PDF export failed"); }
          }}
            style={{ padding: "10px 20px", borderRadius: "12px", background: WHITE, color: TXT_MID, border: `1px solid ${BORDER}`, fontSize: "13px", fontWeight: 600, cursor: !reportData ? "not-allowed" : "pointer", opacity: !reportData ? 0.5 : 1 }}>
            Print / PDF
          </button>
        </div>
      </div>

      {!reportData && !loading && (
        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "48px", textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>📊</div>
          <p style={{ fontSize: 15, fontWeight: 600, color: TXT, marginBottom: 6 }}>No sales data for this period</p>
          <p style={{ fontSize: 13, color: TXT_SOFT }}>Try a different date range, or complete a checkout to start seeing reports.</p>
        </div>
      )}

      {reportData && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* KPI Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "14px" }}>
            {[
              { l: "TOTAL INCOME", v: `GH₵${reportData.totalRevenue.toLocaleString()}`, color: G_D, bg: "#FBF6EE", border: "#F0E4CC" },
              { l: "TOTAL BOOKINGS", v: reportData.totalBookings, color: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0" },
              { l: "AVG BOOKING VALUE", v: `GH₵${(reportData.totalRevenue / Math.max(1, reportData.totalBookings)).toFixed(2)}`, color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
              { l: "COMPLETION RATE", v: `${((reportData.bookingCounts?.completed || 0) / Math.max(1, (reportData.bookingCounts?.completed || 0) + (reportData.bookingCounts?.cancelled || 0) + (reportData.bookingCounts?.no_show || 0)) * 100).toFixed(1)}%`, color: "#9333EA", bg: "#FDF4FF", border: "#E9D5FF" },
            ].map(k => (
              <div key={k.l} style={{ background: k.bg, border: `1px solid ${k.border}`, borderRadius: "14px", padding: "18px 20px" }}>
                <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: k.color, marginBottom: "8px" }}>{k.l}</p>
                <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "28px", fontWeight: 700, color: TXT, margin: 0 }}>{k.v}</p>
              </div>
            ))}
          </div>

          {/* Revenue split by type */}
          {reportData.totalRevenue > 0 && (() => {
            // If no checkout_items data yet, all revenue is service revenue
            const sRev = (reportData.serviceRevenue > 0 || reportData.productRevenue > 0 || reportData.subscriptionRevenue > 0)
              ? reportData.serviceRevenue : reportData.totalRevenue;
            const pRev = reportData.productRevenue || 0;
            const subRev = reportData.subscriptionRevenue || 0;
            return (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px" }}>
              {[
                { l: "SERVICE REVENUE",       v: sRev,   c: G_D,      bg: "#FBF6EE", bd: "#F0E4CC" },
                { l: "PRODUCT REVENUE",        v: pRev,   c: "#2563EB", bg: "#EFF6FF", bd: "#BFDBFE" },
                { l: "SUBSCRIPTION REVENUE",   v: subRev, c: "#7C3AED", bg: "#F5F3FF", bd: "#DDD6FE" },
              ].map(k => (
                <div key={k.l} style={{ background: k.bg, border: `1px solid ${k.bd}`, borderRadius: "14px", padding: "16px 20px" }}>
                  <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", color: k.c, margin: "0 0 6px" }}>{k.l}</p>
                  <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "24px", fontWeight: 700, color: TXT, margin: 0 }}>GHS {Number(k.v || 0).toLocaleString()}</p>
                  {reportData.totalRevenue > 0 && <p style={{ fontSize: "10px", color: k.c, margin: "4px 0 0" }}>{((k.v / reportData.totalRevenue) * 100).toFixed(1)}% of total</p>}
                </div>
              ))}
            </div>
            );
          })()}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {/* Revenue by Service */}
            <div style={card}>
              <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: TXT_SOFT, textTransform: "uppercase", marginBottom: "16px" }}>Revenue by Service</p>
              {Object.entries(reportData.serviceBreakdown || {}).map(([service, data]: [string, any]) => {
                const pct = reportData.totalRevenue > 0 ? (data.revenue / reportData.totalRevenue) * 100 : 0;
                return <div key={service} style={{ marginBottom: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: TXT }}>{service}</span>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: G_D }}>GH₵{data.revenue.toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: "10px", color: TXT_SOFT, marginBottom: "5px" }}>{data.count} bookings</div>
                  <div style={{ height: "4px", background: "#F0EDE8", borderRadius: "99px" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: G, borderRadius: "99px" }} />
                  </div>
                </div>;
              })}
            </div>

            {/* Revenue by Staff */}
            <div style={card}>
              <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: TXT_SOFT, textTransform: "uppercase", marginBottom: "16px" }}>Revenue by Staff</p>
              {Object.entries(reportData.staffBreakdown || {}).map(([staff, data]: [string, any]) => {
                const pct = reportData.totalRevenue > 0 ? (data.revenue / reportData.totalRevenue) * 100 : 0;
                return <div key={staff} style={{ marginBottom: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: TXT }}>{staff}</span>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: G_D }}>GH₵{data.revenue.toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: "10px", color: TXT_SOFT, marginBottom: "5px" }}>{data.count} bookings{data.avgRating ? ` · ★ ${Number(data.avgRating).toFixed(1)}` : ""}</div>
                  <div style={{ height: "4px", background: "#F0EDE8", borderRadius: "99px" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: "#B0876A", borderRadius: "99px" }} />
                  </div>
                </div>;
              })}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {/* Payment Breakdown */}
            <div style={card}>
              <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: TXT_SOFT, textTransform: "uppercase", marginBottom: "16px" }}>Payment Breakdown</p>
              {reportData?.methodTotals && Object.entries(reportData.methodTotals).map(([m, amt]: any) => row(m.replace(/_/g, " ").replace(/\b./g, (x: string) => x.toUpperCase()), `GH₵${Number(amt).toLocaleString()} (${((Number(amt) / (reportData.totalRevenue || 1)) * 100).toFixed(1)}%)`))}
            </div>

            {/* Booking Performance */}
            <div style={card}>
              <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: TXT_SOFT, textTransform: "uppercase", marginBottom: "16px" }}>Booking Performance</p>
              {row("Completed", reportData.bookingCounts?.completed ?? 0)}
              {row("Cancelled", reportData.bookingCounts?.cancelled ?? 0)}
              {row("No-shows", reportData.bookingCounts?.no_show ?? 0)}
              {row("Completion Rate", `${((reportData.bookingCounts?.completed || 0) / Math.max(1, (reportData.bookingCounts?.completed || 0) + (reportData.bookingCounts?.cancelled || 0) + (reportData.bookingCounts?.no_show || 0)) * 100).toFixed(1)}%`, true)}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {/* Period Comparison */}
            <div style={card}>
              <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: TXT_SOFT, textTransform: "uppercase", marginBottom: "16px" }}>Period Comparison</p>
              {row("This Period", `GH₵${reportData.totalRevenue.toLocaleString()}`)}
              {row("Previous Period", `GH₵${(reportData.prevRevenue || 0).toLocaleString()}`)}
              {row("Change", reportData.prevRevenue ? `${(((reportData.totalRevenue - reportData.prevRevenue) / Math.abs(reportData.prevRevenue || 1)) * 100).toFixed(1)}%` : "N/A", true)}
            </div>

            {/* Profit Summary */}
            <div style={card}>
              <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: TXT_SOFT, textTransform: "uppercase", marginBottom: "16px" }}>Profit Summary (Estimate)</p>
              {row("Gross Revenue", `GH₵${reportData.totalRevenue.toLocaleString()}`)}
              {row("Est. Net Profit (75%)", `GH₵${(reportData.totalRevenue * 0.75).toLocaleString()}`)}
              {row("Staff Payouts (est.)", "GH₵0.00")}
              {row("Owner Net Balance", `GH₵${(reportData.totalRevenue * 0.75).toLocaleString()}`, true)}
            </div>
          </div>

          {/* Service Profitability */}
          <div style={card}>
            <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: TXT_SOFT, textTransform: "uppercase", marginBottom: "16px" }}>Service Profitability</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: "12px" }}>
              {(reportData.serviceStats || []).slice(0, 8).map((s: any) => (
                <div key={s.name} style={{ background: CREAM, borderRadius: "12px", padding: "14px 16px", border: `1px solid ${BORDER}` }}>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: TXT, margin: "0 0 4px" }}>{s.name}</p>
                  <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "22px", fontWeight: 700, color: G_D, margin: "0 0 6px" }}>GH₵{Number(s.revenue || 0).toLocaleString()}</p>
                  <p style={{ fontSize: "10px", color: TXT_SOFT, margin: 0 }}>Avg GH₵{Number(s.avgPrice || 0).toFixed(0)} · {Number(s.avgDuration || 0).toFixed(0)}min · GH₵{Number(s.revenuePerHour || 0).toFixed(0)}/hr</p>
                </div>
              ))}
            </div>
          </div>

          {/* Daily Revenue Timeline */}
          <div style={card}>
            <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: TXT_SOFT, textTransform: "uppercase", marginBottom: "16px" }}>Daily Revenue Timeline</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
              {Object.entries(reportData.dailyTimeline || {}).slice(0, 14).map(([d, amt]: any) => {
                const max = Math.max(...Object.values(reportData.dailyTimeline || { x: 1 }) as number[], 1);
                const pct = (Number(amt) / max) * 100;
                return <div key={d} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "7px 0", borderBottom: `1px solid ${BORDER}` }}>
                  <span style={{ fontSize: "11px", color: TXT_MID, minWidth: "80px" }}>{d}</span>
                  <div style={{ flex: 1, height: "6px", background: "#F0EDE8", borderRadius: "99px" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: G, borderRadius: "99px" }} />
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: TXT, minWidth: "80px", textAlign: "right" }}>GH₵{Number(amt).toLocaleString()}</span>
                </div>;
              })}
            </div>
          </div>

          {/* Top Spenders */}
          <div style={card}>
            <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: TXT_SOFT, textTransform: "uppercase", marginBottom: "16px" }}>Top Client Spenders</p>
            {(reportData.mostActiveList || []).slice(0, 10).map((c: any, i: number) => (
              <div key={c.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${BORDER}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: i < 3 ? "#FBF6EE" : CREAM, border: `1px solid ${i < 3 ? G : BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, color: i < 3 ? G_D : TXT_SOFT }}>{i + 1}</div>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: TXT }}>{c.name}</span>
                </div>
                <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "18px", fontWeight: 700, color: G_D }}>GH₵{Number(c.revenue).toLocaleString()}</span>
              </div>
            ))}
          </div>

          {filterType === "most_active" && (
            <div style={card}>
              <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: TXT_SOFT, textTransform: "uppercase", marginBottom: "16px" }}>Most Active Clients</p>
              {(reportData.mostActiveList || []).map((c: any) => (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${BORDER}` }}>
                  <div><p style={{ fontSize: "13px", fontWeight: 600, color: TXT, margin: 0 }}>{c.name}</p><p style={{ fontSize: "11px", color: TXT_SOFT, margin: "2px 0 0" }}>{c.count} bookings</p></div>
                  <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "18px", fontWeight: 700, color: G_D }}>GH₵{Number(c.revenue).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          {filterType === "service_history" && selectedClientId && (
            <div style={card}>
              <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: TXT_SOFT, textTransform: "uppercase", marginBottom: "16px" }}>
                Service History — {clients.find(cl => cl.id === selectedClientId)?.name || "Client"}
              </p>
              {Object.entries(reportData.serviceHistory || {}).map(([service, data]: [string, any]) => (
                <div key={service} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${BORDER}` }}>
                  <div><p style={{ fontSize: "13px", fontWeight: 600, color: TXT, margin: 0 }}>{service}</p><p style={{ fontSize: "11px", color: TXT_SOFT, margin: "2px 0 0" }}>{data.count} times</p></div>
                  <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "18px", fontWeight: 700, color: G_D }}>GH₵{data.revenue.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}


          {/* Paginated Transaction Log */}
          {(reportData.exportRows || []).length > 0 && (() => {
            const allRows = reportData.exportRows || [];
            const totalTx = allRows.length;
            const totalPages = Math.ceil(totalTx / SALES_PAGE_SIZE);
            const pageRows = allRows.slice(salesPage * SALES_PAGE_SIZE, (salesPage + 1) * SALES_PAGE_SIZE);
            return (
              <div style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: TXT_SOFT, textTransform: "uppercase", margin: 0 }}>
                    Transaction Log ({totalTx} records)
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "11px", color: TXT_SOFT }}>Page {salesPage + 1} of {totalPages}</span>
                    <button onClick={() => setSalesPage(p => Math.max(0, p - 1))} disabled={salesPage === 0}
                      style={{ padding: "4px 10px", borderRadius: "8px", border: "1px solid " + BORDER, background: WHITE, cursor: salesPage === 0 ? "not-allowed" : "pointer", fontSize: "12px", opacity: salesPage === 0 ? 0.4 : 1 }}>Prev</button>
                    <button onClick={() => setSalesPage(p => Math.min(totalPages - 1, p + 1))} disabled={salesPage >= totalPages - 1}
                      style={{ padding: "4px 10px", borderRadius: "8px", border: "1px solid " + BORDER, background: WHITE, cursor: salesPage >= totalPages - 1 ? "not-allowed" : "pointer", fontSize: "12px", opacity: salesPage >= totalPages - 1 ? 0.4 : 1 }}>Next</button>
                  </div>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                    <thead>
                      <tr style={{ background: CREAM }}>
                        {["Date", "Client", "Service", "Staff", "Method", "Amount", "Status"].map(h => (
                          <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: "10px", fontWeight: 700, color: TXT_SOFT, letterSpacing: "0.08em", borderBottom: "1px solid " + BORDER, whiteSpace: "nowrap" }}>{h.toUpperCase()}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((r: any, i: number) => (
                        <tr key={r.PaymentID || i} style={{ borderBottom: "1px solid " + BORDER, background: i % 2 === 0 ? WHITE : CREAM }}>
                          <td style={{ padding: "8px 10px", color: TXT_MID, whiteSpace: "nowrap" }}>{(r.PaymentDate || "").split(" ")[0]}</td>
                          <td style={{ padding: "8px 10px", color: TXT, fontWeight: 600 }}>{r.Client || "Walk-in"}</td>
                          <td style={{ padding: "8px 10px", color: TXT_MID }}>{r.Service || ""}</td>
                          <td style={{ padding: "8px 10px", color: TXT_MID }}>{r.Staff || ""}</td>
                          <td style={{ padding: "8px 10px" }}>
                            <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px",
                              background: r.PaymentMethod === "cash" ? "#F0FDF4" : r.PaymentMethod === "mobile_money" ? "#EFF6FF" : r.PaymentMethod === "gift_card" ? "#FDF4FF" : "#FFFBEB",
                              color: r.PaymentMethod === "cash" ? "#16A34A" : r.PaymentMethod === "mobile_money" ? "#2563EB" : r.PaymentMethod === "gift_card" ? "#9333EA" : "#D97706" }}>
                              {(r.PaymentMethod || "").replace(/_/g, " ").toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: "8px 10px", fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, color: G_D, whiteSpace: "nowrap" }}>GHS {Number(r.Amount || 0).toLocaleString()}</td>
                          <td style={{ padding: "8px 10px" }}>
                            <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px",
                              background: r.BookingStatus === "completed" ? "#F0FDF4" : r.BookingStatus === "cancelled" ? "#FEF2F2" : "#FFFBEB",
                              color: r.BookingStatus === "completed" ? "#16A34A" : r.BookingStatus === "cancelled" ? "#DC2626" : "#D97706" }}>
                              {(r.BookingStatus || "pending").toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "16px", flexWrap: "wrap" }}>
                    {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => (
                      <button key={i} onClick={() => setSalesPage(i)}
                        style={{ width: "32px", height: "32px", borderRadius: "8px", border: "1px solid " + (salesPage === i ? G : BORDER),
                          background: salesPage === i ? G : WHITE, color: salesPage === i ? WHITE : TXT_MID,
                          fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>{i + 1}</button>
                    ))}
                    {totalPages > 10 && <span style={{ fontSize: "12px", color: TXT_SOFT, alignSelf: "center" }}>... {totalPages} total pages</span>}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default Reports;
