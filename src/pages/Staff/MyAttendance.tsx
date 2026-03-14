import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO, isValid, differenceInMinutes } from "date-fns";

const G = "#B8975A", G_LIGHT = "#F5ECD6", CREAM = "#FAFAF8", WHITE = "#FFFFFF";
const BORDER = "#EDEBE5", TXT = "#1C1917", TXT_MID = "#78716C", TXT_SOFT = "#A8A29E";
const SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)";
const SHADOW_MD = "0 2px 8px rgba(0,0,0,0.06), 0 12px 36px rgba(0,0,0,0.1)";

interface AttendanceRecord {
  id: string; staff_id: string; check_in: string;
  check_out: string | null; status: string; created_at: string;
  staff?: { name: string; email: string };
}

export default function MyAttendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [clockingIn, setClockingIn] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [staffName, setStaffName] = useState("");
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);

  useEffect(() => { init(); }, []);
  useEffect(() => { if (staffId) fetchAttendance(); }, [staffId]);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const { data: profile } = await supabase.from("staff").select("id, name").eq("user_id", user.id).maybeSingle();
    if (profile) { setStaffId(profile.id); setStaffName(profile.name); }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("attendance")
        .select("*, staff:staff!staff_id(name, email)")
        .eq("staff_id", staffId)
        .order("check_in", { ascending: false });
      if (error) throw error;
      const all = (data as AttendanceRecord[]) || [];
      setRecords(all);
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const todays = all.filter(r => r.check_in?.startsWith(todayStr));
      setTodayRecord(todays.find(r => !r.check_out) || null);
    } catch {
      toast.error("Failed to load attendance");
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    if (!staffId) return;
    setClockingIn(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const { error } = await supabase.from("attendance").insert([{
        staff_id: staffId, check_in: new Date().toISOString(), status: "present", date: today,
      }]);
      if (error) throw error;
      toast.success("Clocked in successfully");
      fetchAttendance();
    } catch (e: any) {
      toast.error(e.message || "Clock-in failed");
    } finally { setClockingIn(false); }
  };

  const handleClockOut = async () => {
    if (!todayRecord) return;
    setClockingOut(true);
    try {
      const { error } = await supabase.from("attendance")
        .update({ check_out: new Date().toISOString() })
        .eq("id", todayRecord.id);
      if (error) throw error;
      toast.success("Clocked out successfully");
      fetchAttendance();
    } catch (e: any) {
      toast.error(e.message || "Clock-out failed");
    } finally { setClockingOut(false); }
  };

  const duration = (checkIn: string, checkOut: string | null) => {
    if (!checkOut) return "In progress";
    const mins = differenceInMinutes(new Date(checkOut), new Date(checkIn));
    const h = Math.floor(mins / 60), m = mins % 60;
    return `${h}h ${m}m`;
  };

  const statusStyle = (r: AttendanceRecord) => {
    if (!r.check_out) return { bg: "rgba(74,144,217,0.1)", color: "#2471A3", label: "Active" };
    if (r.status === "auto_checked_out") return { bg: "rgba(201,168,76,0.12)", color: "#8B6914", label: "Auto checkout" };
    return { bg: "rgba(76,175,125,0.1)", color: "#2E8A5E", label: "Complete" };
  };

  const isClockedIn = !!todayRecord && !todayRecord.check_out;
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const hasClockedInToday = records.some(r => r.check_in?.startsWith(todayStr));

  return (
    <div style={{ background: CREAM, minHeight: "100vh", padding: "clamp(14px,4vw,32px) clamp(12px,4vw,36px)", fontFamily: "Montserrat,sans-serif", color: TXT }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Montserrat:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box}
        .sc{background:${WHITE};border:1px solid ${BORDER};border-radius:16px;padding:24px;box-shadow:${SHADOW};transition:box-shadow 0.2s,transform 0.2s}
        .sc:hover{box-shadow:${SHADOW_MD};transform:translateY(-1px)}
        .sc-flat{background:${WHITE};border:1px solid ${BORDER};border-radius:16px;padding:24px;box-shadow:${SHADOW}}
        .row-hover:hover{background:rgba(184,151,90,0.04)}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .au{animation:up 0.35s ease both}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
      `}</style>

      {/* Header */}
      <div className="au" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "28px" }}>
        <div>
          <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.16em", color: G, marginBottom: "6px", textTransform: "uppercase" }}>
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
          <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(28px,3.5vw,40px)", fontWeight: 700, color: TXT, margin: 0, lineHeight: 1 }}>
            My Attendance
          </h1>
          <p style={{ fontSize: "12px", color: TXT_SOFT, marginTop: "6px" }}>Track your working hours and attendance history.</p>
        </div>
      </div>

      {/* Clock in/out card */}
      <div className="au sc" style={{ marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between", animationDelay: "0.05s" }}>
        <div>
          <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", color: TXT_SOFT, textTransform: "uppercase", marginBottom: "6px" }}>Status Today</p>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: isClockedIn ? "#4CAF7D" : "#E05A5A", animation: isClockedIn ? "pulse 2s infinite" : "none" }} />
            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "26px", fontWeight: 700, color: TXT, margin: 0 }}>
              {isClockedIn ? "Clocked In" : hasClockedInToday ? "Shift Complete" : "Not Clocked In"}
            </p>
          </div>
          {isClockedIn && todayRecord && (
            <p style={{ fontSize: "12px", color: TXT_SOFT, marginTop: "4px" }}>
              Since {format(parseISO(todayRecord.check_in), "h:mm a")}
            </p>
          )}
        </div>
        <div>
          {!isClockedIn && !hasClockedInToday && (
            <button onClick={handleClockIn} disabled={clockingIn}
              style={{ background: G, color: "#fff", border: "none", borderRadius: "12px", padding: "14px 28px", fontSize: "13px", fontWeight: 700, letterSpacing: "0.06em", cursor: "pointer", fontFamily: "Montserrat,sans-serif", opacity: clockingIn ? 0.7 : 1 }}>
              {clockingIn ? "Clocking in..." : "Clock In"}
            </button>
          )}
          {isClockedIn && (
            <button onClick={handleClockOut} disabled={clockingOut}
              style={{ background: "#E05A5A", color: "#fff", border: "none", borderRadius: "12px", padding: "14px 28px", fontSize: "13px", fontWeight: 700, letterSpacing: "0.06em", cursor: "pointer", fontFamily: "Montserrat,sans-serif", opacity: clockingOut ? 0.7 : 1 }}>
              {clockingOut ? "Clocking out..." : "Clock Out"}
            </button>
          )}
          {hasClockedInToday && !isClockedIn && (
            <span style={{ fontSize: "12px", color: TXT_SOFT, fontStyle: "italic" }}>Shift ended for today</span>
          )}
        </div>
      </div>

      {/* History table */}
      <div className="au sc-flat" style={{ animationDelay: "0.1s" }}>
        <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "18px", fontWeight: 700, color: TXT, marginBottom: "16px" }}>Attendance History</p>

        {loading ? (
          <div style={{ textAlign: "center", padding: "50px 0" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", border: `2.5px solid ${G_LIGHT}`, borderTopColor: G, margin: "0 auto 12px", animation: "spin 0.9s linear infinite" }} />
          </div>
        ) : records.length === 0 ? (
          <div style={{ textAlign: "center", padding: "50px 0", color: TXT_SOFT }}>
            <div style={{ fontSize: "36px", marginBottom: "10px" }}>🕐</div>
            <p style={{ fontSize: "13px" }}>No attendance records yet</p>
          </div>
        ) : (
          <>
            <div className="staff-row-header" style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px 90px 90px", gap: "12px", padding: "0 12px 10px", borderBottom: `1px solid ${BORDER}`, marginBottom: "4px" }}>
              {["Date", "Clock In", "Clock Out", "Duration", "Status"].map(h => (
                <span key={h} style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", color: TXT_SOFT, textTransform: "uppercase" }}>{h}</span>
              ))}
            </div>
            {records.map((r, i) => {
              const s = statusStyle(r);
              const checkIn = isValid(parseISO(r.check_in)) ? parseISO(r.check_in) : null;
              const checkOut = r.check_out && isValid(parseISO(r.check_out)) ? parseISO(r.check_out) : null;
              return (
                <div key={r.id} className="row-hover staff-row-grid" style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px 90px 90px", gap: "12px", padding: "12px", borderRadius: "10px", alignItems: "center", borderBottom: i < records.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                  <span style={{ fontSize: "13px", fontWeight: 500, color: TXT }}>{checkIn ? format(checkIn, "EEE, MMM d yyyy") : "—"}</span>
                  <span style={{ fontSize: "12px", color: TXT_MID }}>{checkIn ? format(checkIn, "h:mm a") : "—"}</span>
                  <span style={{ fontSize: "12px", color: TXT_MID }}>{checkOut ? format(checkOut, "h:mm a") : "—"}</span>
                  <span style={{ fontSize: "12px", color: TXT_MID }}>{duration(r.check_in, r.check_out)}</span>
                  <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "10px", fontWeight: 700, background: s.bg, color: s.color, whiteSpace: "nowrap", display: "inline-block" }}>{s.label}</span>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
