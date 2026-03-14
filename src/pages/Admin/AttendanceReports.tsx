import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, eachDayOfInterval, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subMonths } from "date-fns";
import * as XLSX from "xlsx";
import { Users, Clock, TrendingUp, AlertTriangle, Download, Search, ChevronDown, ChevronUp, Calendar } from "lucide-react";

const G = "#C8A97E", G_D = "#8B6914", CREAM = "#FAFAF8", WHITE = "#FFFFFF";
const BORDER = "#EDEBE5", TXT = "#1C160E", TXT_MID = "#78716C", TXT_SOFT = "#A8A29E";
const SHADOW = "0 1px 3px rgba(0,0,0,0.04),0 4px 20px rgba(0,0,0,0.06)";

// Shift definition — matches DEFAULT_SHIFT in attendance lib
const SHIFT_START_H = 9, SHIFT_START_M = 0;
const SHIFT_END_H = 17, SHIFT_END_M = 0;
const LATE_GRACE_MIN = 15;

function calcHours(checkIn: string | null, checkOut: string | null): number {
  if (!checkIn || !checkOut) return 0;
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(0, Math.round((ms / 3600000) * 100) / 100);
}
function isLate(checkIn: string | null): boolean {
  if (!checkIn) return false;
  const d = new Date(checkIn);
  const limitMin = SHIFT_START_H * 60 + SHIFT_START_M + LATE_GRACE_MIN;
  return d.getHours() * 60 + d.getMinutes() > limitMin;
}
function isEarlyOut(checkOut: string | null): boolean {
  if (!checkOut) return false;
  const d = new Date(checkOut);
  const endMin = SHIFT_END_H * 60 + SHIFT_END_M;
  return d.getHours() * 60 + d.getMinutes() < endMin;
}
function fmt(iso: string | null): string {
  if (!iso) return "—";
  return format(new Date(iso), "h:mm a");
}

type QuickRange = "today" | "yesterday" | "this_week" | "last_week" | "this_month" | "last_month" | "custom";

export default function AttendanceReports() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [records, setRecords]     = useState<any[]>([]);
  const [staff, setStaff]         = useState<any[]>([]);
  const [loading, setLoading]     = useState(false);
  const [filterStart, setFilterStart] = useState(today);
  const [filterEnd, setFilterEnd]     = useState(today);
  const [filterStaff, setFilterStaff] = useState("all");
  const [quickRange, setQuickRange]   = useState<QuickRange>("today");
  const [search, setSearch]           = useState("");
  const [expandedStaff, setExpandedStaff] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("staff" as any).select("id, name, email").order("name")
      .then(({ data }) => setStaff(data || []));
    load();
  }, []);

  useEffect(() => { load(); }, [filterStart, filterEnd, filterStaff]);

  const setRange = (r: QuickRange) => {
    setQuickRange(r);
    const now = new Date();
    let s = today, e = today;
    switch (r) {
      case "today":       s = e = today; break;
      case "yesterday":   s = e = format(subDays(now, 1), "yyyy-MM-dd"); break;
      case "this_week":   s = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"); e = format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"); break;
      case "last_week":   const lw = subDays(startOfWeek(now, { weekStartsOn: 1 }), 1); s = format(startOfWeek(lw, { weekStartsOn: 1 }), "yyyy-MM-dd"); e = format(endOfWeek(lw, { weekStartsOn: 1 }), "yyyy-MM-dd"); break;
      case "this_month":  s = format(startOfMonth(now), "yyyy-MM-dd"); e = format(endOfMonth(now), "yyyy-MM-dd"); break;
      case "last_month":  const lm = subMonths(now, 1); s = format(startOfMonth(lm), "yyyy-MM-dd"); e = format(endOfMonth(lm), "yyyy-MM-dd"); break;
    }
    setFilterStart(s); setFilterEnd(e);
  };

  const load = async () => {
    setLoading(true);
    try {
      // Query by `date` column (not check_in timestamp) — matches how records are inserted
      let q = (supabase as any)
        .from("attendance")
        .select("*, staff:staff_id(id, name, email)")
        .gte("date", filterStart)
        .lte("date", filterEnd)
        .order("date", { ascending: false })
        .order("check_in", { ascending: true });
      if (filterStaff !== "all") q = q.eq("staff_id", filterStaff);
      const { data, error } = await q;
      if (error) throw error;
      setRecords(data || []);
    } catch (e: any) {
      console.error(e); toast.error("Failed to load attendance");
    } finally { setLoading(false); }
  };

  // ── Computed stats ────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search.trim()) return records;
    const q = search.toLowerCase();
    return records.filter(r => (r.staff?.name || "").toLowerCase().includes(q));
  }, [records, search]);

  const stats = useMemo(() => {
    const present  = filtered.filter(r => r.status !== "absent" && r.check_in).length;
    const absent   = filtered.filter(r => r.status === "absent").length;
    const late     = filtered.filter(r => r.status !== "absent" && isLate(r.check_in)).length;
    const earlyOut = filtered.filter(r => r.check_out && isEarlyOut(r.check_out)).length;
    const totalHrs = filtered.reduce((s, r) => s + calcHours(r.check_in, r.check_out), 0);
    const overtime = filtered.reduce((s, r) => s + Math.max(0, calcHours(r.check_in, r.check_out) - 8), 0);
    return { present, absent, late, earlyOut, totalHrs, overtime, total: filtered.length };
  }, [filtered]);

  // ── Per-staff summary ─────────────────────────────────────────
  const perStaff = useMemo(() => {
    const map: Record<string, any> = {};
    filtered.forEach(r => {
      const id = r.staff_id;
      const name = r.staff?.name || "Unknown";
      if (!map[id]) map[id] = { id, name, days: 0, absent: 0, late: 0, earlyOut: 0, hrs: 0, overtime: 0, records: [] };
      map[id].records.push(r);
      if (r.status === "absent") { map[id].absent++; }
      else { map[id].days++; if (isLate(r.check_in)) map[id].late++; if (r.check_out && isEarlyOut(r.check_out)) map[id].earlyOut++; }
      const h = calcHours(r.check_in, r.check_out);
      map[id].hrs += h;
      map[id].overtime += Math.max(0, h - 8);
    });
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered]);

  // ── Daily trend ───────────────────────────────────────────────
  const dailyTrend = useMemo(() => {
    if (filterStart === filterEnd) return [];
    const days = eachDayOfInterval({ start: parseISO(filterStart), end: parseISO(filterEnd) });
    return days.map(d => {
      const dateStr = format(d, "yyyy-MM-dd");
      const dayRecs = filtered.filter(r => r.date === dateStr);
      return {
        date: format(d, "MMM d"),
        present: dayRecs.filter(r => r.status !== "absent" && r.check_in).length,
        absent: dayRecs.filter(r => r.status === "absent").length,
        late: dayRecs.filter(r => r.status !== "absent" && isLate(r.check_in)).length,
      };
    });
  }, [filtered, filterStart, filterEnd]);

  // ── Export ────────────────────────────────────────────────────
  const exportExcel = () => {
    const rows = filtered.map(r => ({
      Staff: r.staff?.name || r.staff_id,
      Date: r.date,
      "Check In": fmt(r.check_in),
      "Check Out": fmt(r.check_out),
      Hours: calcHours(r.check_in, r.check_out).toFixed(2),
      Overtime: Math.max(0, calcHours(r.check_in, r.check_out) - 8).toFixed(2),
      Late: isLate(r.check_in) && r.status !== "absent" ? "Yes" : "No",
      "Early Out": r.check_out && isEarlyOut(r.check_out) ? "Yes" : "No",
      Status: r.status || "present",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, `attendance_${filterStart}_to_${filterEnd}.xlsx`);
  };

  // ── Status badge ──────────────────────────────────────────────
  const badge = (r: any) => {
    if (r.status === "absent") return { label: "Absent", bg: "#FEF2F2", color: "#DC2626" };
    if (!r.check_out) return { label: "Checked In", bg: "#F0FDF4", color: "#16A34A" };
    if (isLate(r.check_in)) return { label: "Late", bg: "#FFFBEB", color: "#D97706" };
    if (isEarlyOut(r.check_out)) return { label: "Early Out", bg: "#FFF7ED", color: "#EA580C" };
    return { label: "Present", bg: "#EFF6FF", color: "#2563EB" };
  };

  const RANGES: { id: QuickRange; label: string }[] = [
    { id: "today", label: "Today" }, { id: "yesterday", label: "Yesterday" },
    { id: "this_week", label: "This Week" }, { id: "last_week", label: "Last Week" },
    { id: "this_month", label: "This Month" }, { id: "last_month", label: "Last Month" },
    { id: "custom", label: "Custom" },
  ];

  return (
    <div style={{ background: CREAM, minHeight: "100vh", padding: "clamp(16px,4vw,32px)", fontFamily: "Montserrat,sans-serif", color: TXT }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Montserrat:wght@400;500;600;700&display=swap');`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", color: G, textTransform: "uppercase", margin: "0 0 4px" }}>Workforce</p>
          <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(28px,4vw,40px)", fontWeight: 700, color: TXT, margin: 0 }}>Attendance Reports</h1>
          <p style={{ fontSize: 12, color: TXT_SOFT, margin: "4px 0 0" }}>
            {filterStart === filterEnd ? format(parseISO(filterStart), "EEEE, MMMM d yyyy") : `${format(parseISO(filterStart), "MMM d")} – ${format(parseISO(filterEnd), "MMM d, yyyy")}`}
          </p>
        </div>
        <button onClick={exportExcel} style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 20px", borderRadius: 12, background: G_D, color: WHITE, border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          <Download size={15} /> Export Excel
        </button>
      </div>

      {/* Quick Range Picker */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {RANGES.map(r => (
          <button key={r.id} onClick={() => setRange(r.id)}
            style={{ padding: "7px 16px", borderRadius: 20, border: "1.5px solid", borderColor: quickRange === r.id ? G_D : BORDER, background: quickRange === r.id ? "#FBF6EE" : WHITE, color: quickRange === r.id ? G_D : TXT_MID, fontSize: 12, fontWeight: quickRange === r.id ? 700 : 500, cursor: "pointer" }}>
            {r.label}
          </button>
        ))}
      </div>

      {/* Custom date range + staff filter */}
      {(quickRange === "custom" || true) && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24, alignItems: "center" }}>
          {quickRange === "custom" && <>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: TXT_SOFT, letterSpacing: "0.1em", display: "block", marginBottom: 4 }}>FROM</label>
              <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} max={filterEnd}
                style={{ border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: "8px 12px", fontSize: 13, color: TXT, outline: "none", background: WHITE, fontFamily: "Montserrat,sans-serif" }} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: TXT_SOFT, letterSpacing: "0.1em", display: "block", marginBottom: 4 }}>TO</label>
              <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} min={filterStart}
                style={{ border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: "8px 12px", fontSize: 13, color: TXT, outline: "none", background: WHITE, fontFamily: "Montserrat,sans-serif" }} />
            </div>
          </>}
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: TXT_SOFT, letterSpacing: "0.1em", display: "block", marginBottom: 4 }}>STAFF</label>
            <select value={filterStaff} onChange={e => setFilterStaff(e.target.value)}
              style={{ border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: "8px 12px", fontSize: 13, color: TXT, outline: "none", background: WHITE, fontFamily: "Montserrat,sans-serif", minWidth: 160 }}>
              <option value="all">All Staff</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: TXT_SOFT, letterSpacing: "0.1em", display: "block", marginBottom: 4 }}>SEARCH</label>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: TXT_SOFT }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search staff…"
                style={{ border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: "8px 12px 8px 32px", fontSize: 13, color: TXT, outline: "none", background: WHITE, fontFamily: "Montserrat,sans-serif" }} />
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "PRESENT", value: stats.present, color: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0", icon: "✓" },
          { label: "ABSENT", value: stats.absent, color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", icon: "✗" },
          { label: "LATE", value: stats.late, color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", icon: "⏰" },
          { label: "EARLY OUT", value: stats.earlyOut, color: "#EA580C", bg: "#FFF7ED", border: "#FED7AA", icon: "↙" },
          { label: "TOTAL HOURS", value: stats.totalHrs.toFixed(1) + "h", color: G_D, bg: "#FBF6EE", border: "#F0E4CC", icon: "⏱" },
          { label: "OVERTIME", value: stats.overtime.toFixed(1) + "h", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE", icon: "+" },
        ].map(k => (
          <div key={k.label} style={{ background: k.bg, border: `1px solid ${k.border}`, borderRadius: 14, padding: "16px 18px" }}>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: k.color, margin: "0 0 8px" }}>{k.label}</p>
            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 700, color: TXT, margin: 0, lineHeight: 1 }}>{k.value}</p>
          </div>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: 40, color: TXT_SOFT }}>Loading attendance…</div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: 60, background: WHITE, borderRadius: 16, border: `1px solid ${BORDER}` }}>
          <Calendar size={32} style={{ color: TXT_SOFT, margin: "0 auto 12px" }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: TXT_MID, margin: 0 }}>No attendance records for this period</p>
          <p style={{ fontSize: 12, color: TXT_SOFT, marginTop: 4 }}>Records appear here once staff check in via the Attendance page.</p>
        </div>
      )}

      {/* Per-staff breakdown */}
      {!loading && perStaff.length > 0 && (
        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", boxShadow: SHADOW, marginBottom: 24 }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}`, background: "linear-gradient(135deg,rgba(200,169,126,0.08),rgba(200,169,126,0.02))", display: "flex", alignItems: "center", gap: 10 }}>
            <Users size={18} style={{ color: G }} />
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 700, color: TXT, margin: 0 }}>Staff Summary</h2>
          </div>
          <div>
            {perStaff.map((s, i) => {
              const expanded = expandedStaff === s.id;
              const attendanceRate = s.days + s.absent > 0 ? Math.round((s.days / (s.days + s.absent)) * 100) : 0;
              return (
                <div key={s.id} style={{ borderBottom: i < perStaff.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                  {/* Summary row */}
                  <div onClick={() => setExpandedStaff(expanded ? null : s.id)}
                    style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", cursor: "pointer", background: expanded ? "#FAFAF8" : WHITE, transition: "background 0.15s" }}>
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: `linear-gradient(135deg,${G}22,${G}44)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: G_D, flexShrink: 0 }}>
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: TXT, margin: "0 0 2px" }}>{s.name}</p>
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, color: "#16A34A" }}>✓ {s.days} days</span>
                        {s.absent > 0 && <span style={{ fontSize: 11, color: "#DC2626" }}>✗ {s.absent} absent</span>}
                        {s.late > 0 && <span style={{ fontSize: 11, color: "#D97706" }}>⏰ {s.late} late</span>}
                        <span style={{ fontSize: 11, color: TXT_SOFT }}>{s.hrs.toFixed(1)}h total</span>
                        {s.overtime > 0 && <span style={{ fontSize: 11, color: "#7C3AED" }}>+{s.overtime.toFixed(1)}h OT</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontSize: 16, fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, color: attendanceRate >= 80 ? "#16A34A" : attendanceRate >= 60 ? "#D97706" : "#DC2626", margin: 0 }}>{attendanceRate}%</p>
                        <p style={{ fontSize: 9, color: TXT_SOFT, margin: 0, letterSpacing: "0.08em" }}>ATTENDANCE</p>
                      </div>
                      {expanded ? <ChevronUp size={16} color={TXT_SOFT} /> : <ChevronDown size={16} color={TXT_SOFT} />}
                    </div>
                  </div>

                  {/* Expanded daily records */}
                  {expanded && (
                    <div style={{ padding: "0 20px 16px", background: "#FAFAF8" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                            {["Date", "Check In", "Check Out", "Hours", "OT", "Status"].map(h => (
                              <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 9, fontWeight: 700, color: TXT_SOFT, letterSpacing: "0.1em" }}>{h.toUpperCase()}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {s.records.sort((a: any, b: any) => a.date.localeCompare(b.date)).map((r: any) => {
                            const b = badge(r);
                            const hrs = calcHours(r.check_in, r.check_out);
                            return (
                              <tr key={r.id} style={{ borderBottom: `1px solid ${BORDER}44` }}>
                                <td style={{ padding: "8px 10px", fontWeight: 600, color: TXT }}>{format(parseISO(r.date), "EEE, MMM d")}</td>
                                <td style={{ padding: "8px 10px", color: TXT_MID }}>{fmt(r.check_in)}</td>
                                <td style={{ padding: "8px 10px", color: TXT_MID }}>{fmt(r.check_out)}</td>
                                <td style={{ padding: "8px 10px", fontWeight: 600, color: TXT }}>{hrs > 0 ? hrs.toFixed(1) + "h" : "—"}</td>
                                <td style={{ padding: "8px 10px", color: "#7C3AED" }}>{Math.max(0, hrs - 8) > 0 ? "+" + Math.max(0, hrs - 8).toFixed(1) + "h" : "—"}</td>
                                <td style={{ padding: "8px 10px" }}>
                                  <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: b.bg, color: b.color }}>{b.label}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Daily trend chart (text-based for multi-day ranges) */}
      {!loading && dailyTrend.length > 1 && (
        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", boxShadow: SHADOW }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 10 }}>
            <TrendingUp size={18} style={{ color: G }} />
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 700, color: TXT, margin: 0 }}>Daily Trend</h2>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: CREAM }}>
                  {["Date", "Present", "Absent", "Late"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: TXT_SOFT, letterSpacing: "0.1em", borderBottom: `1px solid ${BORDER}` }}>{h.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dailyTrend.map((d, i) => (
                  <tr key={d.date} style={{ borderBottom: `1px solid ${BORDER}44`, background: i % 2 === 0 ? WHITE : CREAM }}>
                    <td style={{ padding: "10px 16px", fontWeight: 600, color: TXT }}>{d.date}</td>
                    <td style={{ padding: "10px 16px", color: "#16A34A", fontWeight: 700 }}>{d.present}</td>
                    <td style={{ padding: "10px 16px", color: d.absent > 0 ? "#DC2626" : TXT_SOFT }}>{d.absent}</td>
                    <td style={{ padding: "10px 16px", color: d.late > 0 ? "#D97706" : TXT_SOFT }}>{d.late}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
