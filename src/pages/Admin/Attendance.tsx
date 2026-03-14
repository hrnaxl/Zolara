import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Loader2, Edit2, Clock, CheckCircle2, XCircle } from "lucide-react";
import {
  AttendanceRecord as AR,
  Staff as S,
  DEFAULT_SHIFT,
  calcTotalHours,
  calcOvertime,
  formatTimeShort,
  isLate,
  isEarlyCheckout,
  isHalfDay,
  isoForDateRange,
} from "@/lib/attendance";

type FilterStatus = "all" | "checked_in" | "checked_out" | "late" | "absent" | "half_day";

export default function Attendance() {
  const [attendanceRecords, setAttendanceRecords] = useState<AR[]>([]);
  const [staffList, setStaffList] = useState<S[]>([]);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<string>("");

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [staffFilter, setStaffFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");

  // Edit modal state
  const [editing, setEditing] = useState<AR | null>(null);
  const [editCheckIn, setEditCheckIn] = useState<string>("");
  const [editCheckOut, setEditCheckOut] = useState<string>("");
  const [editReason, setEditReason] = useState<string>("");

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    fetchUserRole();
  }, []);

  useEffect(() => {
    if (userRole === "owner" || userRole === "receptionist" || userRole === "admin") {
      fetchStaff();
      fetchAttendance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole]);

  useEffect(() => {
    // refetch when date changes
    fetchAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const fetchUserRole = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      const metaDataRole = (user.user_metadata as any)?.role;
      setUserRole(roleData?.role || metaDataRole || "");
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from("staff")
        .select("id, name, email");
      if (error) throw error;
      setStaffList(data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load staff list");
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("attendance")
        .select("*, staff:staff!staff_id(name, email)")
        .eq("date", selectedDate);
      if (error) throw error;
      setAttendanceRecords((data as AR[]) || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load attendance records");
    } finally {
      setLoading(false);
    }
  };

  // Helpers to derive display rows: include staff even if no attendance (to mark absent)
  const rows = useMemo(() => {
    return staffList.map((s) => {
      const record = attendanceRecords.find((r) => r.staff_id === s.id);
      const total = calcTotalHours(record?.check_in, record?.check_out);
      const overtime = calcOvertime(total);
      const lateFlag = isLate(record?.check_in, DEFAULT_SHIFT);
      const earlyFlag = record?.check_out ? isEarlyCheckout(record.check_out, DEFAULT_SHIFT) : false;
      const halfDay = isHalfDay(total);
  let status: string;
  // Prefer explicit DB status when present (e.g. 'absent'),
  // fall back to deriving from check_out presence.
  if (!record) status = "Absent";
  else if (record.status === 'absent') status = "Absent";
  else if (!record.check_out) status = "Checked In";
  else status = "Checked Out";
      if (status !== "Absent" && lateFlag) status = "Late";
      if (status !== "Absent" && halfDay) status = "Half-day";

      return {
        staff: s,
        record: record || null,
        total,
        overtime,
        status,
        lateFlag,
        earlyFlag,
        halfDay,
      };
    });
  }, [staffList, attendanceRecords]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (staffFilter !== "all" && r.staff?.id !== staffFilter) return false;
      if (statusFilter !== "all") {
        switch (statusFilter) {
          case "checked_in":
            if (r.record && !r.record.check_out) return true;
            return false;
          case "checked_out":
            if (r.record && r.record.check_out) return true;
            return false;
          case "late":
            return r.lateFlag;
          case "absent":
            // Consider explicit absent records OR no record at all
            return (r.record && r.record.status === 'absent') || !r.record;
          case "half_day":
            return r.halfDay;
          default:
            return true;
        }
      }
      return true;
    });
  }, [rows, staffFilter, statusFilter]);

  const summary = useMemo(() => {
    const present = rows.filter((r) => r.record && r.record.status !== 'absent').length;
    const absent = rows.filter((r) => (r.record && r.record.status === 'absent') || !r.record).length;
    const late = rows.filter((r) => r.lateFlag).length;
    const totalHours = rows.reduce((acc, r) => acc + r.total, 0);
    return { present, absent, late, totalHours };
  }, [rows]);

  const handleCheckIn = async (staffId: string) => {
    try {
      const { data: existing } = await supabase
        .from("attendance")
        .select("*")
        .eq("staff_id", staffId)
        .eq("date", selectedDate);

      const ongoing = existing?.find((r) => !r.check_out);
      if (ongoing) {
        toast.info("Staff already checked in for this day.");
        return;
      }

      const payload: any = {
        staff_id: staffId,
        date: selectedDate,
        check_in: new Date().toISOString(),
        status: "present",
      };

      const { error } = await supabase.from("attendance").insert([payload]);
      if (error) throw error;
      toast.success("Check-in recorded");
      fetchAttendance();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to check-in");
    }
  };

  const handleCheckOut = async (staffId: string) => {
    try {
      const record = attendanceRecords.find((r) => r.staff_id === staffId && !r.check_out);
      if (!record) {
        toast.info("No active check-in found.");
        return;
      }
      const { error } = await supabase
        .from("attendance")
        .update({ check_out: new Date().toISOString(), status: "present" })
        .eq("id", record.id);
      if (error) throw error;
      toast.success("Checked out");
      fetchAttendance();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to check-out");
    }
  };

  const handleMarkAbsent = async (staffId: string) => {
    try {
      // Insert an absent record for the day if none exists
      const { data: existing } = await supabase
        .from("attendance")
        .select("*")
        .eq("staff_id", staffId)
        .eq("date", selectedDate);

      if (existing && existing.length > 0) {
        toast.info("Attendance already recorded for this staff this day");
        return;
      }

      const payload = {
        staff_id: staffId,
        date: selectedDate,
        check_in: new Date(selectedDate + "T00:00:00").toISOString(),
        check_out: new Date(selectedDate + "T00:00:00").toISOString(),
        status: "absent",
      } as any;

      const { error } = await supabase.from("attendance").insert([payload]);
      if (error) throw error;
      toast.success("Marked absent");
      fetchAttendance();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to mark absent");
    }
  };

  const openEdit = (row: any) => {
    setEditing(row.record);
    setEditReason("");
    setEditCheckIn(row.record?.check_in ? (new Date(row.record.check_in)).toISOString().slice(0,16) : "");
    setEditCheckOut(row.record?.check_out ? (new Date(row.record.check_out)).toISOString().slice(0,16) : "");
  };

  const closeEdit = () => {
    setEditing(null);
    setEditReason("");
  };

  const submitEdit = async () => {
    if (!editing) return;
    try {
      const payload: any = {};
      if (editCheckIn) payload.check_in = new Date(editCheckIn).toISOString();
      else payload.check_in = null;
      if (editCheckOut) payload.check_out = new Date(editCheckOut).toISOString();
      else payload.check_out = null;

      // Try to include audit fields; if DB doesn't have them, we'll catch and retry without them
      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        (payload as any).last_edited_by = user.id;
        (payload as any).last_edit_reason = editReason || null;
      }

      const { error } = await supabase.from("attendance").update(payload).eq("id", editing.id);
      if (error) {
        // fallback: remove optional audit fields and retry
        const { message } = error as any;
        if (message && /column .* does not exist/i.test(message)) {
          delete payload.last_edited_by;
          delete payload.last_edit_reason;
          const r2 = await supabase.from("attendance").update(payload).eq("id", editing.id);
          if (r2.error) throw r2.error;
        } else {
          throw error;
        }
      }

      toast.success("Attendance updated");
      closeEdit();
      fetchAttendance();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to update attendance");
    }
  };

  const G = "#C8A97E", G_D = "#8B6914", CREAM = "#FAFAF8", WHITE = "#FFFFFF";
  const BORDER = "#EDEBE5", TXT = "#1C160E", TXT_MID = "#78716C", TXT_SOFT = "#A8A29E";
  const SHADOW = "0 1px 3px rgba(0,0,0,0.04),0 4px 16px rgba(0,0,0,0.06)";
  const inp: React.CSSProperties = { border: `1.5px solid ${BORDER}`, borderRadius: "10px", padding: "9px 12px", fontSize: "13px", color: TXT, outline: "none", background: WHITE, fontFamily: "Montserrat,sans-serif", width: "100%" };

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; color: string }> = {
      "Checked In":  { bg: "#F0FDF4", color: "#16A34A" },
      "Checked Out": { bg: "#EFF6FF", color: "#2563EB" },
      "Late":        { bg: "#FFFBEB", color: "#D97706" },
      "Absent":      { bg: "#FEF2F2", color: "#DC2626" },
      "Half Day":    { bg: "#F3F0FF", color: "#7C3AED" },
    };
    const s = map[status] || { bg: "#F5F5F5", color: TXT_MID };
    return <span style={{ padding: "2px 10px", borderRadius: "20px", fontSize: "10px", fontWeight: 700, background: s.bg, color: s.color }}>{status}</span>;
  };

  return (
    <div style={{ background: CREAM, minHeight: "100vh", padding: "clamp(16px,4vw,32px)", fontFamily: "Montserrat,sans-serif", color: TXT }}>
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.16em", color: G, textTransform: "uppercase", marginBottom: "4px" }}>Daily Operations</p>
        <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(28px,4vw,42px)", fontWeight: 700, color: TXT, margin: "0 0 4px", lineHeight: 1 }}>Attendance</h1>
        <p style={{ fontSize: "12px", color: TXT_SOFT, marginTop: "6px" }}>Track daily staff presence, hours, and performance</p>
      </div>

      {/* KPI Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px", marginBottom: "20px" }}>
        {[
          { l: "PRESENT", v: summary.present, color: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0" },
          { l: "ABSENT", v: summary.absent, color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
          { l: "LATE", v: summary.late, color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
          { l: "TOTAL HOURS", v: `${summary.totalHours.toFixed(1)}h`, color: G_D, bg: "#FBF6EE", border: "#F0E4CC" },
        ].map(k => (
          <div key={k.l} style={{ background: k.bg, border: `1px solid ${k.border}`, borderRadius: "14px", padding: "18px 20px" }}>
            <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: k.color, marginBottom: "8px" }}>{k.l}</p>
            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "32px", fontWeight: 700, color: TXT, margin: 0 }}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "16px", padding: "20px 24px", boxShadow: SHADOW, marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "16px", flexWrap: "wrap" }}>
          <div style={{ flex: "0 0 auto" }}>
            <label style={{ fontSize: "11px", fontWeight: 600, color: TXT_MID, display: "block", marginBottom: "6px" }}>Date</label>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ ...inp, width: "auto" }} />
          </div>
          <div style={{ flex: "1 1 160px", minWidth: "160px" }}>
            <label style={{ fontSize: "11px", fontWeight: 600, color: TXT_MID, display: "block", marginBottom: "6px" }}>Staff</label>
            <select value={staffFilter} onChange={e => setStaffFilter(e.target.value)} style={inp}>
              <option value="all">All Staff</option>
              {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div style={{ flex: "1 1 160px", minWidth: "160px" }}>
            <label style={{ fontSize: "11px", fontWeight: 600, color: TXT_MID, display: "block", marginBottom: "6px" }}>Status</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as FilterStatus)} style={inp}>
              <option value="all">All Statuses</option>
              <option value="checked_in">Checked In</option>
              <option value="checked_out">Checked Out</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
              <option value="half_day">Half Day</option>
            </select>
          </div>
          <button onClick={() => fetchAttendance()}
            style={{ padding: "9px 20px", borderRadius: "10px", background: CREAM, border: `1px solid ${BORDER}`, fontSize: "13px", fontWeight: 600, cursor: "pointer", color: TXT_MID, alignSelf: "flex-end" }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "16px", boxShadow: SHADOW, overflow: "hidden" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "60px" }}>
            <div style={{ width: "32px", height: "32px", border: `3px solid #F0E4CC`, borderTopColor: G, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1.5fr", gap: "0", padding: "12px 24px", borderBottom: `1.5px solid ${BORDER}` }}>
              {["Staff Member", "Check-in", "Check-out", "Total", "Status", "Actions"].map(h => (
                <span key={h} style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", color: TXT_SOFT, textTransform: "uppercase" }}>{h}</span>
              ))}
            </div>

            {filteredRows.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <p style={{ fontSize: "36px", marginBottom: "12px" }}>🕐</p>
                <p style={{ fontSize: "14px", fontWeight: 600, color: TXT, margin: "0 0 4px" }}>No attendance records</p>
                <p style={{ fontSize: "12px", color: TXT_SOFT }}>No staff found for the selected filters</p>
              </div>
            ) : filteredRows.map((r, i) => (
              <div key={r.staff?.id} className="att-row" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1.5fr", gap: "0", padding: "14px 24px", alignItems: "center", borderBottom: i < filteredRows.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: TXT, margin: 0 }}>{r.staff?.name}</p>
                  {r.overtime ? <p style={{ fontSize: "10px", color: "#D97706", margin: "2px 0 0" }}>+{r.overtime} OT</p> : null}
                </div>
                <span style={{ fontSize: "12px", color: TXT_MID }}>{r.record ? formatTimeShort(r.record.check_in) : "—"}</span>
                <span style={{ fontSize: "12px", color: TXT_MID }}>{r.record ? formatTimeShort(r.record.check_out || null) : "—"}</span>
                <span style={{ fontSize: "12px", fontWeight: 600, color: TXT }}>{r.total.toFixed(2)}h</span>
                <div>{statusBadge(r.status)}{r.earlyFlag && <span style={{ fontSize: "9px", color: TXT_SOFT, display: "block", marginTop: "2px" }}>early out</span>}</div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {!r.record ? (
                    <>
                      <button onClick={() => handleCheckIn(r.staff?.id)} style={{ padding: "5px 10px", borderRadius: "8px", background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>Check In</button>
                      <button onClick={() => handleMarkAbsent(r.staff?.id)} style={{ padding: "5px 10px", borderRadius: "8px", background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>Absent</button>
                    </>
                  ) : !r.record.check_out ? (
                    <>
                      <button onClick={() => handleCheckOut(r.staff?.id)} style={{ padding: "5px 10px", borderRadius: "8px", background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>Check Out</button>
                      <button onClick={() => openEdit(r)} style={{ padding: "5px 10px", borderRadius: "8px", background: CREAM, color: TXT_MID, border: `1px solid ${BORDER}`, fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>Edit</button>
                    </>
                  ) : (
                    <button onClick={() => openEdit(r)} style={{ padding: "5px 10px", borderRadius: "8px", background: CREAM, color: TXT_MID, border: `1px solid ${BORDER}`, fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>Edit</button>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Edit Modal */}
      {editing && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}>
          <div style={{ background: WHITE, borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "440px", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "22px", fontWeight: 700, color: TXT, margin: 0 }}>Edit Attendance</h3>
              <button onClick={closeEdit} style={{ width: "28px", height: "28px", borderRadius: "50%", border: `1px solid ${BORDER}`, background: CREAM, cursor: "pointer", fontSize: "14px", color: TXT_SOFT }}>✕</button>
            </div>
            <p style={{ fontSize: "12px", color: TXT_SOFT, marginBottom: "20px" }}>{editing.staff?.name}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div><label style={{ fontSize: "11px", fontWeight: 600, color: TXT_MID, display: "block", marginBottom: "6px" }}>Check-in</label>
                <input type="datetime-local" value={editCheckIn} onChange={e => setEditCheckIn(e.target.value)} style={inp} /></div>
              <div><label style={{ fontSize: "11px", fontWeight: 600, color: TXT_MID, display: "block", marginBottom: "6px" }}>Check-out</label>
                <input type="datetime-local" value={editCheckOut} onChange={e => setEditCheckOut(e.target.value)} style={inp} /></div>
              <div><label style={{ fontSize: "11px", fontWeight: 600, color: TXT_MID, display: "block", marginBottom: "6px" }}>Reason for edit</label>
                <textarea value={editReason} onChange={e => setEditReason(e.target.value)} rows={2} style={{ ...inp, resize: "vertical" }} /></div>
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button onClick={submitEdit} style={{ flex: 1, padding: "10px", borderRadius: "12px", background: G_D, color: WHITE, border: "none", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>Save Changes</button>
              <button onClick={closeEdit} style={{ padding: "10px 20px", borderRadius: "12px", background: CREAM, color: TXT_MID, border: `1px solid ${BORDER}`, fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
