import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, User, Clock, Calendar, AlertCircle, Check, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";

interface AttendanceRecord {
  id: string;
  staff_id: string;
  check_in: string;
  check_out: string | null;
  status: string;
  created_at: string;
  // optional DB columns
  total_hours?: number | null;
  overtime_hours?: number | null;
  late_flag?: boolean | null;
  early_flag?: boolean | null;
  edit_reason?: string | null;
  // joined staff
  staff?: { id?: string; name?: string; email?: string };
}

interface Staff {
  id: string;
  name: string;
  email: string;
}

export default function Attendance() {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<string>("");

  // filters
  const [filterStart, setFilterStart] = useState<string>(new Date(new Date().setHours(0,0,0,0)).toISOString().slice(0,10));
  const [filterEnd, setFilterEnd] = useState<string>(new Date().toISOString().slice(0,10));
  const [filterStaff, setFilterStaff] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all"); // all | present | absent | late | early

  // profile dialog
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileStaff, setProfileStaff] = useState<Staff | null>(null);
  const [profileAttendance, setProfileAttendance] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap";
    document.head.appendChild(link);
    const style = document.createElement("style");
    style.textContent = "@keyframes spin{to{transform:rotate(360deg)}}";
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    if (userRole === "owner" || userRole === "receptionist") {
      fetchStaff();
      fetchAttendance();
    }
  }, [userRole]);

  useEffect(() => {
    // refetch when filters change
    if (userRole === "owner" || userRole === "receptionist") fetchAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStart, filterEnd, filterStaff, filterStatus]);

  const fetchUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setUserRole("");
      const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
      const metaDataRole = (user as any).user_metadata?.role;
      setUserRole(roleData?.role || metaDataRole || "");
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase.from("staff").select("id, name, email").order("name");
      if (error) throw error;
      setStaffList(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load staff list");
    }
  };

  // helpers
  const computeHours = (inIso: string, outIso: string) => {
    try {
      const a = new Date(inIso).getTime();
      const b = new Date(outIso).getTime();
      const hrs = Math.max(0, (b - a) / (1000 * 60 * 60));
      return Math.round(hrs * 100) / 100;
    } catch (e) { return 0; }
  };
  const isLate = (inIso: string) => {
    try { const d = new Date(inIso); return d.getHours() > 9 || (d.getHours() === 9 && d.getMinutes() > 0); } catch { return false; }
  };
  const isEarly = (outIso: string) => {
    try { const d = new Date(outIso); return d.getHours() < 17; } catch { return false; }
  };

  const computeDerived = (r: any): AttendanceRecord => {
    const rec: AttendanceRecord = { ...(r as any) };
    rec.staff = rec.staff || (r.staff || null);
    rec.total_hours = rec.total_hours ?? (rec.check_in && rec.check_out ? computeHours(rec.check_in, rec.check_out) : 0);
    rec.overtime_hours = rec.overtime_hours ?? Math.max(0, (rec.total_hours || 0) - 8);
    rec.late_flag = rec.late_flag ?? (rec.check_in ? isLate(rec.check_in) : false);
    rec.early_flag = rec.early_flag ?? (rec.check_out ? isEarly(rec.check_out) : false);
    return rec;
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const startIso = new Date(`${filterStart}T00:00:00`).toISOString();
      const endIso = new Date(`${filterEnd}T23:59:59`).toISOString();
      // Always fetch by date range (and staff if specified). Status filtering for 'late'/'early' is applied client-side.
      let q: any = supabase.from("attendance").select("*, staff:staff!staff_id(id,name,email)").gte("check_in", startIso).lte("check_in", endIso).order("check_in", { ascending: true });
      if (filterStaff && filterStaff !== "all") q = q.eq("staff_id", filterStaff);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data || []).map((r: any) => computeDerived(r));
      setAttendanceRecords(rows as AttendanceRecord[]);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load attendance");
    } finally { setLoading(false); }
  };

  // actions
  const handleCheckIn = async (staffId: string) => {
    try {
      const start = new Date(); start.setHours(0,0,0,0);
      const end = new Date(); end.setHours(23,59,59,999);
      const { data: existing } = await supabase.from("attendance").select("*").eq("staff_id", staffId).gte("check_in", start.toISOString()).lte("check_in", end.toISOString());
      const ongoing = (existing || []).find((r:any) => !r.check_out && r.status !== 'absent');
      if (ongoing) { toast.info("This staff is already checked in"); return; }
      const { error } = await supabase.from("attendance").insert([ { staff_id: staffId, check_in: new Date().toISOString(), status: 'checked_in' } ]);
      if (error) throw error; toast.success("Checked in"); fetchAttendance();
    } catch (err:any) { console.error(err); toast.error("Failed to check in"); }
  };

  const handleCheckOut = async (rec: AttendanceRecord) => {
    try {
      if (!rec || !rec.check_in) { toast.error('No check-in found'); return; }
      const outIso = new Date().toISOString();
      const total = computeHours(rec.check_in, outIso);
      const overtime = Math.max(0, total - 8);
      const late = isLate(rec.check_in);
      const early = isEarly(outIso);
      const { error } = await supabase.from('attendance').update({ check_out: outIso, total_hours: total, overtime_hours: overtime, late_flag: late, early_flag: early, status: 'checked_out' }).eq('id', rec.id);
      if (error) { // fallback minimal
        const { error: fe } = await supabase.from('attendance').update({ check_out: outIso, status: 'checked_out' }).eq('id', rec.id);
        if (fe) throw fe;
      }
      toast.success('Checked out'); fetchAttendance();
    } catch (err:any) { console.error(err); toast.error('Failed to check out'); }
  };

  const handleMarkAbsent = async (staffId: string) => {
    try {
      const today = new Date(); today.setHours(0,0,0,0);
      const { error } = await supabase.from('attendance').insert([{ staff_id: staffId, check_in: today.toISOString(), check_out: null, status: 'absent' }]);
      if (error) throw error; toast.success('Marked absent'); fetchAttendance();
    } catch (err:any) { console.error(err); toast.error('Failed to mark absent'); }
  };

  const handleEditTimes = async (rec: AttendanceRecord) => {
    if (!confirm('Open edit dialog?')) return;
    try {
      const newIn = prompt('New check-in (YYYY-MM-DDTHH:MM) or empty to keep', rec.check_in ? rec.check_in.slice(0,16) : '');
      const newOut = prompt('New check-out (YYYY-MM-DDTHH:MM) or empty to keep', rec.check_out ? rec.check_out.slice(0,16) : '');
      const reason = prompt('Reason for edit (required)', ''); if (!reason) { toast.error('Reason required'); return; }
      const payload: any = { edit_reason: reason };
      if (newIn) payload.check_in = new Date(newIn).toISOString();
      if (newOut) payload.check_out = new Date(newOut).toISOString();
      if (payload.check_in && payload.check_out) {
        const th = computeHours(payload.check_in, payload.check_out);
        payload.total_hours = th; payload.overtime_hours = Math.max(0, th-8);
        payload.late_flag = isLate(payload.check_in); payload.early_flag = isEarly(payload.check_out);
        payload.status = 'checked_out';
      }
      const { error } = await supabase.from('attendance').update(payload).eq('id', rec.id);
      if (error) throw error; toast.success('Updated'); fetchAttendance();
    } catch (err:any) { console.error(err); toast.error('Failed to update'); }
  };

  const openStaffProfile = async (staff: Staff) => {
    try {
      setProfileStaff(staff); setProfileOpen(true);
      const end = new Date(); const start = new Date(); start.setDate(end.getDate()-30);
      const { data, error } = await supabase.from('attendance').select('*, staff:staff!staff_id(id,name,email)').eq('staff_id', staff.id).gte('check_in', start.toISOString()).lte('check_in', end.toISOString()).order('check_in', { ascending: false });
      if (error) throw error; setProfileAttendance((data||[]).map((r:any)=>computeDerived(r)));
    } catch (err:any) { console.error(err); toast.error('Failed to load profile'); }
  };

  const exportCSV = () => {
    const headers = ['Staff','Date','Check-in','Check-out','Total Hours','Overtime','Late','Early','Status'];
    const rows = attendanceRecords.map(r => [
      r.staff?.name||r.staff_id,
      r.check_in? r.check_in.split('T')[0] : '',
      r.check_in||'',
      r.check_out||'',
      String((r.total_hours||0).toFixed(2)),
      String((r.overtime_hours||0).toFixed(2)),
      r.late_flag? '1' : '0',
      r.early_flag? '1' : '0',
      r.status||''
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `attendance_${filterStart}_${filterEnd}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    try {
      const data = attendanceRecords.map(r => ({
        Staff: r.staff?.name || r.staff_id,
        Date: r.check_in ? r.check_in.split('T')[0] : '',
        CheckIn: r.check_in ? format(new Date(r.check_in), 'HH:mm') : '',
        CheckOut: r.check_out ? format(new Date(r.check_out), 'HH:mm') : '',
        TotalHours: (r.total_hours||0).toFixed(2),
        Overtime: (r.overtime_hours||0).toFixed(2),
        Late: r.late_flag ? 'Yes' : 'No',
        Early: r.early_flag ? 'Yes' : 'No',
        Status: r.status || '',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
      XLSX.writeFile(wb, `attendance_${filterStart}_${filterEnd}.xlsx`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to export Excel');
    }
  };

  // Aggregations
  const filteredRecords = useMemo(() => {
    return attendanceRecords.filter(r => {
      if (filterStaff && filterStaff !== 'all' && r.staff_id !== filterStaff) return false;
      if (filterStatus && filterStatus !== 'all') {
        switch (filterStatus) {
          case 'present':
            return r.status === 'checked_in' || r.status === 'checked_out' || r.status === 'present';
          case 'absent':
            return r.status === 'absent';
          case 'late':
            return !!r.late_flag;
          case 'early':
            return !!r.early_flag;
          default:
            return true;
        }
      }
      return true;
    });
  }, [attendanceRecords, filterStaff, filterStatus]);

  const overallSummary = useMemo(() => {
    const present = filteredRecords.filter(r => r.status === 'checked_in' || r.status === 'checked_out' || r.status === 'present').length;
    const absent = filteredRecords.filter(r => r.status === 'absent').length;
    const late = filteredRecords.filter(r => r.late_flag).length;
    const early = filteredRecords.filter(r => r.early_flag).length;
    const totalHours = filteredRecords.reduce((s, r) => s + (r.total_hours || 0), 0);
    const totalOvertime = filteredRecords.reduce((s, r) => s + (r.overtime_hours || 0), 0);
    const disciplinary = filteredRecords.filter(r => r.late_flag || r.early_flag).length;
    return { present, absent, late, early, totalHours, totalOvertime, disciplinary };
  }, [filteredRecords]);

  const perStaff = useMemo(() => {
    const map: Record<string, any> = {};
    filteredRecords.forEach(r => {
      const id = r.staff_id;
      const name = r.staff?.name || id;
      if (!map[id]) map[id] = { staff_id: id, staff: name, days_present: 0, absences: 0, late: 0, early: 0, total_hours: 0, overtime: 0, disciplinary: 0 };
      const entry = map[id];
      if (r.status === 'absent') entry.absences += 1; else entry.days_present += 1;
      if (r.late_flag) entry.late += 1;
      if (r.early_flag) entry.early += 1;
      entry.total_hours += (r.total_hours || 0);
      entry.overtime += (r.overtime_hours || 0);
      if (r.late_flag || r.early_flag) entry.disciplinary += 1;
    });
    return Object.values(map);
  }, [filteredRecords]);

  // summary cards
  const summary = () => {
    const today = new Date(); const s = new Date(); s.setHours(0,0,0,0); const e = new Date(); e.setHours(23,59,59,999);
    const todays = attendanceRecords.filter(r => { const d = new Date(r.check_in); return d>=s && d<=e; });
    const present = todays.filter(r => r.status === 'checked_in' || r.status === 'checked_out').length;
    const absent = todays.filter(r => r.status === 'absent').length;
    const late = todays.filter(r => r.late_flag).length;
    const totalHours = todays.reduce((s, r) => s + (r.total_hours||0), 0);
    return { present, absent, late, totalHours };
  };

  const G = "#C8A97E", G_D = "#8B6914", CREAM = "#FAFAF8", WHITE = "#FFFFFF";
  const BORDER = "#EDEBE5", TXT = "#1C160E", TXT_MID = "#78716C", TXT_SOFT = "#A8A29E";
  const SHADOW = "0 1px 3px rgba(0,0,0,0.04),0 4px 16px rgba(0,0,0,0.06)";
  const inp: React.CSSProperties = { border: `1.5px solid ${BORDER}`, borderRadius: "10px", padding: "9px 12px", fontSize: "13px", color: TXT, outline: "none", background: WHITE, fontFamily: "Montserrat,sans-serif", width: "100%" };

  const statusBadge = (status: string, late?: boolean, early?: boolean) => {
    if (status === "absent") return <span style={{ padding: "2px 10px", borderRadius: "20px", fontSize: "10px", fontWeight: 700, background: "#FEF2F2", color: "#DC2626" }}>Absent</span>;
    if (late) return <span style={{ padding: "2px 10px", borderRadius: "20px", fontSize: "10px", fontWeight: 700, background: "#FFFBEB", color: "#D97706" }}>Late</span>;
    if (early) return <span style={{ padding: "2px 10px", borderRadius: "20px", fontSize: "10px", fontWeight: 700, background: "#FFF7ED", color: "#EA580C" }}>Early Out</span>;
    if (status === "checked_out" || status === "present") return <span style={{ padding: "2px 10px", borderRadius: "20px", fontSize: "10px", fontWeight: 700, background: "#EFF6FF", color: "#2563EB" }}>Checked Out</span>;
    if (status === "checked_in") return <span style={{ padding: "2px 10px", borderRadius: "20px", fontSize: "10px", fontWeight: 700, background: "#F0FDF4", color: "#16A34A" }}>Checked In</span>;
    return <span style={{ padding: "2px 10px", borderRadius: "20px", fontSize: "10px", fontWeight: 700, background: "#F5F5F5", color: TXT_SOFT }}>{status.replace("_", " ")}</span>;
  };

  const s = summary();

  return (
    <div style={{ background: CREAM, minHeight: "100vh", padding: "clamp(16px,4vw,32px)", fontFamily: "Montserrat,sans-serif", color: TXT }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "28px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.16em", color: G, textTransform: "uppercase", marginBottom: "4px" }}>Workforce</p>
          <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(28px,4vw,42px)", fontWeight: 700, color: TXT, margin: "0 0 4px", lineHeight: 1 }}>Attendance Reports</h1>
          <p style={{ fontSize: "12px", color: TXT_SOFT, marginTop: "6px" }}>Staff attendance history, analytics, and export</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={exportCSV} style={{ padding: "9px 18px", borderRadius: "10px", background: WHITE, color: G_D, border: `1.5px solid ${G}`, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>Export CSV</button>
          <button onClick={exportExcel} style={{ padding: "9px 18px", borderRadius: "10px", background: G_D, color: WHITE, border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>Export Excel</button>
        </div>
      </div>

      {/* Today KPI Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px", marginBottom: "20px" }}>
        {[
          { l: "PRESENT TODAY", v: s.present, color: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0" },
          { l: "ABSENT TODAY", v: s.absent, color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
          { l: "LATE TODAY", v: s.late, color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
          { l: "HOURS TODAY", v: `${s.totalHours.toFixed(1)}h`, color: G_D, bg: "#FBF6EE", border: "#F0E4CC" },
        ].map(k => (
          <div key={k.l} style={{ background: k.bg, border: `1px solid ${k.border}`, borderRadius: "14px", padding: "18px 20px" }}>
            <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: k.color, marginBottom: "8px" }}>{k.l}</p>
            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "32px", fontWeight: 700, color: TXT, margin: 0 }}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "16px", padding: "20px 24px", boxShadow: SHADOW, marginBottom: "20px" }}>
        <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", color: TXT_SOFT, textTransform: "uppercase", marginBottom: "16px" }}>Filters</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "16px", alignItems: "flex-end" }}>
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: TXT_MID, display: "block", marginBottom: "6px" }}>Start Date</label>
            <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} style={inp} />
          </div>
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: TXT_MID, display: "block", marginBottom: "6px" }}>End Date</label>
            <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} style={inp} />
          </div>
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: TXT_MID, display: "block", marginBottom: "6px" }}>Staff</label>
            <select value={filterStaff} onChange={e => setFilterStaff(e.target.value)} style={inp}>
              <option value="all">All Staff</option>
              {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: TXT_MID, display: "block", marginBottom: "6px" }}>Status</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={inp}>
              <option value="all">All</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="early">Early Checkout</option>
            </select>
          </div>
          <button onClick={() => fetchAttendance()} style={{ padding: "9px 20px", borderRadius: "10px", background: G_D, color: WHITE, border: "none", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
            Apply
          </button>
        </div>
      </div>

      {/* Summary + Per-Staff Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "16px", marginBottom: "20px" }}>
        {/* Period Summary */}
        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "16px", padding: "24px", boxShadow: SHADOW }}>
          <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: TXT_SOFT, textTransform: "uppercase", marginBottom: "16px" }}>Period Summary</p>
          {[
            { l: "Days Present", v: overallSummary.present },
            { l: "Absences", v: overallSummary.absent },
            { l: "Late Check-ins", v: overallSummary.late },
            { l: "Early Check-outs", v: overallSummary.early },
            { l: "Total Hours", v: `${overallSummary.totalHours.toFixed(2)}h` },
            { l: "Total Overtime", v: `${overallSummary.totalOvertime.toFixed(2)}h` },
            { l: "Disciplinary Flags", v: overallSummary.disciplinary, bold: true },
          ].map(row => (
            <div key={row.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ fontSize: "12px", color: row.bold ? TXT : TXT_MID, fontWeight: row.bold ? 700 : 400 }}>{row.l}</span>
              <span style={{ fontSize: "13px", fontWeight: row.bold ? 700 : 600, color: row.bold ? "#DC2626" : TXT }}>{row.v}</span>
            </div>
          ))}
        </div>

        {/* Per-Staff Summary */}
        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "16px", padding: "24px", boxShadow: SHADOW, overflow: "hidden" }}>
          <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: TXT_SOFT, textTransform: "uppercase", marginBottom: "16px" }}>Per-Staff Summary</p>
          <div style={{ overflowX: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr", gap: "0", padding: "8px 0", borderBottom: `1.5px solid ${BORDER}`, minWidth: "600px" }}>
              {["Staff", "Days", "Absent", "Late", "Early", "Hours", "OT", "Flags"].map(h => (
                <span key={h} style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", color: TXT_SOFT, textTransform: "uppercase" }}>{h}</span>
              ))}
            </div>
            {perStaff.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0", color: TXT_SOFT, fontSize: "13px" }}>No staff in this range</div>
            ) : perStaff.map((p: any) => (
              <div key={p.staff_id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr", gap: "0", padding: "11px 0", borderBottom: `1px solid ${BORDER}`, minWidth: "600px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: TXT }}>{p.staff}</span>
                <span style={{ fontSize: "12px", color: TXT_MID }}>{p.days_present}</span>
                <span style={{ fontSize: "12px", color: p.absences > 0 ? "#DC2626" : TXT_MID }}>{p.absences}</span>
                <span style={{ fontSize: "12px", color: p.late > 0 ? "#D97706" : TXT_MID }}>{p.late}</span>
                <span style={{ fontSize: "12px", color: p.early > 0 ? "#EA580C" : TXT_MID }}>{p.early}</span>
                <span style={{ fontSize: "12px", fontWeight: 600, color: TXT }}>{p.total_hours.toFixed(1)}h</span>
                <span style={{ fontSize: "12px", color: p.overtime > 0 ? G_D : TXT_MID }}>{p.overtime.toFixed(1)}h</span>
                <span style={{ fontSize: "12px", color: p.disciplinary > 0 ? "#DC2626" : TXT_MID, fontWeight: p.disciplinary > 0 ? 700 : 400 }}>{p.disciplinary}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "16px", boxShadow: SHADOW, overflow: "hidden" }}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: TXT_SOFT, textTransform: "uppercase", margin: 0 }}>Attendance Records</p>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "60px" }}>
            <div style={{ width: "32px", height: "32px", border: `3px solid #F0E4CC`, borderTopColor: G, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 0.8fr 0.8fr 0.8fr 0.7fr 0.7fr 1fr 1fr 1fr", gap: "0", padding: "10px 24px", borderBottom: `1px solid ${BORDER}` }}>
              {["Staff", "Email", "Date", "In", "Out", "Hrs", "OT", "Flags", "Status", ""].map(h => (
                <span key={h} style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", color: TXT_SOFT, textTransform: "uppercase" }}>{h}</span>
              ))}
            </div>

            {filteredRecords.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <p style={{ fontSize: "36px", marginBottom: "12px" }}>📋</p>
                <p style={{ fontSize: "14px", fontWeight: 600, color: TXT, margin: "0 0 4px" }}>No records found</p>
                <p style={{ fontSize: "12px", color: TXT_SOFT }}>Adjust your filters to see attendance data</p>
              </div>
            ) : filteredRecords.map((r, i) => (
              <div key={r.id} style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 0.8fr 0.8fr 0.8fr 0.7fr 0.7fr 1fr 1fr 1fr", gap: "0", padding: "12px 24px", alignItems: "center", borderBottom: i < filteredRecords.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                <button style={{ fontSize: "13px", fontWeight: 600, color: TXT, background: "none", border: "none", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "4px" }}
                  onClick={() => openStaffProfile({ id: r.staff?.id || r.staff_id, name: r.staff?.name || "Staff", email: r.staff?.email || "" })}>
                  {r.staff?.name || r.staff_id}
                  <ChevronRight style={{ width: "12px", height: "12px", color: TXT_SOFT }} />
                </button>
                <span style={{ fontSize: "11px", color: TXT_SOFT }}>{r.staff?.email || "—"}</span>
                <span style={{ fontSize: "12px", color: TXT_MID }}>{r.check_in ? format(new Date(r.check_in), "MM/dd") : "—"}</span>
                <span style={{ fontSize: "12px", color: TXT_MID }}>{r.check_in ? format(new Date(r.check_in), "HH:mm") : "—"}</span>
                <span style={{ fontSize: "12px", color: TXT_MID }}>{r.check_out ? format(new Date(r.check_out), "HH:mm") : "—"}</span>
                <span style={{ fontSize: "12px", fontWeight: 600, color: TXT }}>{(r.total_hours || 0).toFixed(1)}</span>
                <span style={{ fontSize: "12px", color: (r.overtime_hours || 0) > 0 ? G_D : TXT_MID }}>{(r.overtime_hours || 0).toFixed(1)}</span>
                <div>
                  {r.late_flag && <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "10px", background: "#FFFBEB", color: "#D97706", fontWeight: 700 }}>Late</span>}
                  {r.early_flag && <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "10px", background: "#FFF7ED", color: "#EA580C", fontWeight: 700, marginLeft: "4px" }}>Early</span>}
                  {!r.late_flag && !r.early_flag && <span style={{ color: TXT_SOFT }}>—</span>}
                </div>
                <div>{statusBadge(r.status, r.late_flag || false, r.early_flag || false)}</div>
                <button style={{ padding: "4px 12px", borderRadius: "8px", background: CREAM, color: TXT_MID, border: `1px solid ${BORDER}`, fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                  onClick={() => openStaffProfile({ id: r.staff?.id || r.staff_id, name: r.staff?.name || "Staff", email: r.staff?.email || "" })}>
                  View
                </button>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Profile Dialog */}
      {profileOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
          onClick={() => setProfileOpen(false)}>
          <div style={{ background: WHITE, borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "580px", boxShadow: "0 20px 60px rgba(0,0,0,0.15)", maxHeight: "85vh", overflowY: "auto" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", color: G, textTransform: "uppercase", margin: "0 0 4px" }}>Staff Profile</p>
                <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "24px", fontWeight: 700, color: TXT, margin: 0 }}>{profileStaff?.name}</h3>
              </div>
              <button onClick={() => setProfileOpen(false)} style={{ width: "32px", height: "32px", borderRadius: "50%", border: `1px solid ${BORDER}`, background: CREAM, cursor: "pointer", fontSize: "14px", color: TXT_SOFT }}>✕</button>
            </div>

            {/* Profile KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px", marginBottom: "20px" }}>
              {[
                { l: "Total Hours (30d)", v: `${profileAttendance.reduce((s, a) => s + (a.total_hours || 0), 0).toFixed(1)}h`, color: G_D, bg: "#FBF6EE" },
                { l: "Late Count (30d)", v: profileAttendance.filter(a => a.late_flag).length, color: "#D97706", bg: "#FFFBEB" },
                { l: "Absences (30d)", v: profileAttendance.filter(a => a.status === "absent").length, color: "#DC2626", bg: "#FEF2F2" },
              ].map(k => (
                <div key={k.l} style={{ background: k.bg, borderRadius: "12px", padding: "14px 16px", border: `1px solid ${BORDER}` }}>
                  <p style={{ fontSize: "10px", fontWeight: 600, color: k.color, marginBottom: "6px" }}>{k.l}</p>
                  <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "24px", fontWeight: 700, color: TXT, margin: 0 }}>{k.v}</p>
                </div>
              ))}
            </div>

            {/* Profile History */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {profileAttendance.map(a => (
                <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderRadius: "12px", border: `1px solid ${BORDER}`, background: CREAM }}>
                  <div>
                    <p style={{ fontSize: "13px", fontWeight: 600, color: TXT, margin: "0 0 2px" }}>{format(new Date(a.check_in), "PPP")}</p>
                    <p style={{ fontSize: "11px", color: TXT_SOFT, margin: 0 }}>
                      {a.check_in ? format(new Date(a.check_in), "HH:mm") : "—"} → {a.check_out ? format(new Date(a.check_out), "HH:mm") : "—"}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: "14px", fontWeight: 700, color: G_D, margin: "0 0 4px" }}>{(a.total_hours || 0).toFixed(2)}h</p>
                    {statusBadge(a.status, a.late_flag || false, a.early_flag || false)}
                  </div>
                </div>
              ))}
              {profileAttendance.length === 0 && (
                <p style={{ textAlign: "center", color: TXT_SOFT, fontSize: "13px", padding: "24px 0" }}>No records in the last 30 days</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
