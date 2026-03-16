import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { formatTo12Hour } from "@/lib/time";
import { sendSMS, SMS } from "@/lib/sms";
import { useSettings } from "@/context/SettingsContext";
import { CancelBookingDialog } from "@/components/bookings/CancelBookingDialog";
import { Plus, Search, X, ChevronLeft, ChevronRight, Calendar, Clock, User, Scissors, Phone, StickyNote, CreditCard, CheckCircle2, XCircle, AlertCircle, RefreshCw, ArrowRight } from "lucide-react";

// ── Design tokens ────────────────────────────────────────────────────────────
const G = "#C8A97E", G_D = "#8B6914", NAVY = "#0F1E35";
const CREAM = "#FAFAF8", WHITE = "#FFFFFF", BORDER = "#EDEBE5";
const TXT = "#1C160E", TXT_MID = "#78716C", TXT_SOFT = "#A8A29E";
const SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 20px rgba(0,0,0,0.06)";

const STATUS: Record<string, { bg: string; color: string; dot: string; label: string }> = {
  pending:     { bg: "#FEF9C3", color: "#A16207", dot: "#EAB308", label: "Pending" },
  confirmed:   { bg: "#DCFCE7", color: "#15803D", dot: "#22C55E", label: "Confirmed" },
  in_progress: { bg: "#DBEAFE", color: "#1D4ED8", dot: "#3B82F6", label: "In Progress" },
  completed:   { bg: "#F0FDF4", color: "#166534", dot: "#4ADE80", label: "Completed" },
  cancelled:   { bg: "#FEE2E2", color: "#B91C1C", dot: "#EF4444", label: "Cancelled" },
  no_show:     { bg: "#F3F4F6", color: "#6B7280", dot: "#9CA3AF", label: "No Show" },
};

const FILTERS = ["all","pending","confirmed","in_progress","completed","cancelled","no_show"] as const;
type Filter = typeof FILTERS[number];

const PAGE_SIZE = 20;

export default function Bookings() {
  const navigate = useNavigate();

  // Data
  const [bookings, setBookings] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & pagination
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Selected booking (detail panel)
  const [selected, setSelected] = useState<any>(null);

  // Cancel dialog
  const { userRole, settings } = useSettings();
  const canManage = userRole === "owner" || userRole === "admin";
  const canConfirmAll = ["owner","admin","receptionist"].includes(userRole || "");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<any>(null);

  // Status counts for filter pills
  const [counts, setCounts] = useState<Record<string, number>>({});

  const fetchBookings = useCallback(async (p = 1, f = filter, s = search) => {
    setLoading(true);
    try {
      let q = supabase.from("bookings").select("*", { count: "exact" });
      if (f !== "all") q = q.eq("status", f);
      if (s.trim()) q = q.or(`client_name.ilike.%${s}%,booking_ref.ilike.%${s}%,service_name.ilike.%${s}%,client_phone.ilike.%${s}%`);
      q = q.order("preferred_date", { ascending: true }).order("preferred_time", { ascending: true });
      q = q.range((p - 1) * PAGE_SIZE, p * PAGE_SIZE - 1);
      const { data, count, error } = await q;
      if (error) throw error;
      setBookings(data || []);
      setTotal(count || 0);
    } catch (e: any) { toast.error("Failed to load bookings"); }
    finally { setLoading(false); }
  }, [filter, search]);

  const fetchCounts = async () => {
    const { data } = await supabase.from("bookings").select("status");
    if (!data) return;
    const c: Record<string, number> = { all: data.length };
    for (const b of data) { c[b.status] = (c[b.status] || 0) + 1; }
    setCounts(c);
  };

  const fetchStaff = async () => {
    const { data } = await supabase.from("staff").select("id, name, role").eq("is_active", true);
    setStaff((data || []).filter((s: any) => !["cleaner","receptionist"].includes(s.role || "")));
    // Fetch today's attendance
    const today = new Date().toISOString().slice(0, 10);
    const { data: att } = await supabase.from("attendance").select("staff_id, status, check_in").eq("date", today);
    const present = new Set<string>((att || []).filter((a: any) => a.check_in && a.status !== "absent").map((a: any) => a.staff_id));
    const absent = new Set<string>((att || []).filter((a: any) => a.status === "absent").map((a: any) => a.staff_id));
    setPresentStaffIds(present);
    setAbsentStaffIds2(absent);
  };

  useEffect(() => {
    fetchBookings(1, filter, search);
    fetchCounts();
    fetchStaff();
  }, []);

  useEffect(() => {
    setPage(1);
    fetchBookings(1, filter, search);
  }, [filter]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchBookings(1, filter, search); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const handleStatusUpdate = async (id: string, status: string) => {
    if (status === "cancelled") {
      const b = bookings.find(b => b.id === id) || selected;
      setBookingToCancel(b);
      setCancelDialogOpen(true);
      return;
    }
    const { error } = await supabase.from("bookings").update({ status } as any).eq("id", id);
    if (error) { toast.error("Failed to update"); return; }
    toast.success("Status updated");
    if (selected?.id === id) setSelected({ ...selected, status });
    fetchBookings(page, filter, search);
    fetchCounts();
  };

  const handleCancelWithReason = async (reason: string) => {
    if (!bookingToCancel) return;
    const { error } = await supabase.from("bookings").update({
      status: "cancelled",
      notes: bookingToCancel.notes ? `${bookingToCancel.notes}\n\nCancellation reason: ${reason}` : `Cancellation reason: ${reason}`,
    } as any).eq("id", bookingToCancel.id);
    if (error) { toast.error("Failed to cancel"); return; }
    toast.success("Booking cancelled");
    setCancelDialogOpen(false);

    // Notify waitlist
    try {
      const b = bookingToCancel;
      const { data: waiting } = await (supabase as any).from("waitlist").select("*").eq("status","active").eq("preferred_date", b.preferred_date);
      if (waiting?.length) {
        for (const entry of waiting.slice(0, 3)) {
          sendSMS(entry.client_phone, `Hi ${entry.client_name.split(" ")[0]}! A slot opened at Zolara 🌸\n${b.preferred_date} at ${b.preferred_time}\nBook now: zolarasalon.com/book`).catch(console.error);
          await (supabase as any).from("waitlist").update({ status: "notified", notified_at: new Date().toISOString(), claim_expires_at: new Date(Date.now() + 600000).toISOString() }).eq("id", entry.id);
        }
        if (waiting.length > 0) toast.info(`${waiting.length} waitlist client${waiting.length > 1 ? "s" : ""} notified`);
      }
    } catch {}

    if (selected?.id === bookingToCancel.id) setSelected({ ...selected, status: "cancelled" });
    setBookingToCancel(null);
    fetchBookings(page, filter, search);
    fetchCounts();
  };

  const handleAssignStaff = async (bookingId: string, staffId: string) => {
    const staffName = staff.find(s => s.id === staffId)?.name || "";
    const { error } = await supabase.from("bookings").update({ staff_id: staffId, staff_name: staffName } as any).eq("id", bookingId);
    if (error) { toast.error("Failed to assign"); return; }
    toast.success("Staff assigned");
    if (selected?.id === bookingId) setSelected({ ...selected, staff_id: staffId, staff_name: staffName });
    fetchBookings(page, filter, search);
  };

  // Date label helper
  const dateLabel = (d: string) => {
    try {
      const dt = parseISO(d);
      if (isToday(dt)) return { label: "Today", color: "#0369A1" };
      if (isTomorrow(dt)) return { label: "Tomorrow", color: "#D97706" };
      return { label: format(dt, "d MMM"), color: TXT_MID };
    } catch { return { label: d, color: TXT_MID }; }
  };


  // ── Specialty → service keyword mapping ─────────────────────────────────
  const SPECIALTY_MAP: Record<string, string[]> = {
    "Braider":                ["braid", "cornrow", "twist", "loc", "feed-in", "knotless", "box braid"],
    "Lash Tech":              ["lash", "extension", "cluster", "volume lash"],
    "Nail Tech":              ["nail", "acrylic", "gel polish", "nail art", "manicure", "french"],
    "Wig & Hair Stylist":     ["wig", "hair", "blow dry", "scalp", "wash"],
    "Makeup Artist":          ["makeup", "make up", "glam", "bridal", "brow", "contour"],
    "Pedicurist & Manicurist":["pedicure", "manicure", "feet", "foot"],
  };

  const getRequiredSpecialty = (serviceName: string): string | null => {
    const lower = (serviceName || "").toLowerCase();
    for (const [specialty, keywords] of Object.entries(SPECIALTY_MAP)) {
      if (keywords.some(kw => lower.includes(kw))) return specialty;
    }
    return null;
  };

  const [confirming, setConfirming] = useState(false);
  const [confirmResult, setConfirmResult] = useState<{done:number;skipped:number;noStaff:number} | null>(null);
  const [extraStaff, setExtraStaff] = useState<{id:string;name:string;service:string}[]>([]);
  const [presentStaffIds, setPresentStaffIds] = useState<Set<string>>(new Set());
  const [absentStaffIds2, setAbsentStaffIds2] = useState<Set<string>>(new Set());

  const handleConfirmAll = async () => {
    if (!confirm(`Auto-assign and confirm all pending bookings? Staff will be assigned based on specialty, attendance and availability.`)) return;
    setConfirming(true);
    setConfirmResult(null);
    try {
      const today = new Date().toISOString().slice(0, 10);

      // 1. Fetch all pending bookings
      const { data: pending } = await supabase.from("bookings")
        .select("id, service_name, preferred_date, preferred_time, client_name")
        .eq("status", "pending")
        .order("preferred_date", { ascending: true })
        .order("preferred_time", { ascending: true });

      if (!pending || pending.length === 0) { toast.info("No pending bookings to confirm"); setConfirming(false); return; }

      // 2. Fetch all active operational staff with specialties
      const { data: allStaff } = await supabase.from("staff")
        .select("id, name, specialties, role")
        .eq("is_active", true);
      const opStaff = (allStaff || []).filter((s: any) => !["cleaner","receptionist"].includes(s.role || ""));

      // 3. Fetch today's attendance — only staff who checked in are available for TODAY's bookings
      const { data: attendanceToday } = await supabase.from("attendance")
        .select("staff_id, status, check_in")
        .eq("date", today);

      // Staff who are present today (checked in and not marked absent)
      const presentTodayIds = new Set(
        (attendanceToday || [])
          .filter((a: any) => a.check_in && a.status !== "absent")
          .map((a: any) => a.staff_id)
      );
      // Staff marked explicitly absent today
      const absentTodayIds = new Set(
        (attendanceToday || [])
          .filter((a: any) => a.status === "absent")
          .map((a: any) => a.staff_id)
      );

      // 4. Fetch existing confirmed bookings to check time conflicts
      const { data: existingBookings } = await supabase.from("bookings")
        .select("staff_id, preferred_date, preferred_time")
        .in("status", ["confirmed","in_progress"])
        .not("staff_id", "is", null);

      const isStaffBusy = (staffId: string, date: string, time: string) =>
        (existingBookings || []).some((b: any) =>
          b.staff_id === staffId && b.preferred_date === date && b.preferred_time === time
        );

      let done = 0, skipped = 0, noStaff = 0, absentSkipped = 0;
      const sessionAssignments: Array<{staffId:string; date:string; time:string}> = [];

      for (const booking of pending) {
        const isToday = booking.preferred_date === today;
        const specialty = getRequiredSpecialty(booking.service_name);

        // Filter staff by specialty
        const eligible = opStaff.filter((s: any) => {
          if (!specialty) return true;
          return (s.specialties || []).includes(specialty);
        });

        // For today: only consider staff who have checked in
        // For future dates: any active staff with the right specialty (attendance unknown yet)
        const availablePool = eligible.filter((s: any) => {
          if (isToday) {
            // Must be present (checked in) — not absent and not unchecked
            if (absentTodayIds.has(s.id)) return false;
            if (!presentTodayIds.has(s.id)) return false; // not checked in yet
          } else {
            // Future booking — exclude only if explicitly known absent today
            // (future attendance unknown, don't restrict)
          }
          return true;
        });

        // Find one who isn't already booked at that time
        const available = availablePool.find((s: any) =>
          !isStaffBusy(s.id, booking.preferred_date, booking.preferred_time) &&
          !sessionAssignments.some(a =>
            a.staffId === s.id && a.date === booking.preferred_date && a.time === booking.preferred_time
          )
        );

        if (!available) {
          if (eligible.length === 0) {
            noStaff++;
          } else if (isToday && availablePool.length === 0) {
            absentSkipped++;
          } else {
            skipped++;
          }
          continue;
        }

        const { error } = await supabase.from("bookings").update({
          status: "confirmed",
          staff_id: available.id,
          staff_name: available.name,
        } as any).eq("id", booking.id);

        if (!error) {
          done++;
          sessionAssignments.push({
            staffId: available.id,
            date: booking.preferred_date,
            time: booking.preferred_time,
          });
        } else skipped++;
      }

      setConfirmResult({ done, skipped: skipped + absentSkipped, noStaff });
      toast.success(`${done} bookings confirmed and assigned`);
      if (absentSkipped > 0) toast.warning(`${absentSkipped} today's bookings skipped — no checked-in staff with the right specialty`);
      if (skipped > 0) toast.warning(`${skipped} skipped — all eligible staff booked at that time`);
      if (noStaff > 0) toast.error(`${noStaff} couldn't be assigned — no staff with the right specialty exists`);

      fetchBookings(1, filter, search);
      fetchCounts();
    } catch (e: any) {
      toast.error("Confirm all failed: " + e.message);
    } finally { setConfirming(false); }
  };

  return (
    <div style={{ background: CREAM, minHeight: "100vh", fontFamily: "Montserrat, sans-serif", color: TXT }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Montserrat:wght@400;500;600;700&display=swap');
        .bk-row { cursor:pointer; transition: background 0.12s; }
        .bk-row:hover { background: #F5EFE6 !important; }
        .bk-row.selected { background: #FBF6EE !important; border-left: 3px solid ${G_D} !important; }
        .filter-pill { border:1.5px solid ${BORDER}; background:${WHITE}; cursor:pointer; transition:all 0.15s; }
        .filter-pill:hover { border-color:${G}; }
        .filter-pill.active { background:#FBF6EE; border-color:${G_D}; color:${G_D}; }
        .status-btn { padding:5px 12px; border-radius:8px; border:none; cursor:pointer; font-size:11px; font-weight:600; transition:opacity 0.15s; }
        .status-btn:hover { opacity:0.8; }
        .page-btn { width:32px; height:32px; border-radius:8px; border:1.5px solid ${BORDER}; background:${WHITE}; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.15s; }
        .page-btn:hover:not(:disabled) { border-color:${G}; }
        .page-btn:disabled { opacity:0.35; cursor:not-allowed; }
        .panel-btn { padding:8px 18px; border-radius:10px; font-size:12px; font-weight:700; cursor:pointer; border:none; transition:all 0.15s; font-family:Montserrat,sans-serif; }
      `}</style>

      <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>

        {/* ── LEFT: Table ─────────────────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", borderRight: selected ? `1px solid ${BORDER}` : "none" }}>

          {/* Header */}
          <div style={{ padding: "20px 24px 0", background: WHITE, borderBottom: `1px solid ${BORDER}`, boxShadow: SHADOW }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", color: G, textTransform: "uppercase", margin: "0 0 2px" }}>Zolara</p>
                <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 700, color: TXT, margin: 0 }}>Bookings</h1>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { fetchBookings(page, filter, search); fetchCounts(); }} style={{ padding: "8px 10px", borderRadius: 10, border: `1.5px solid ${BORDER}`, background: WHITE, cursor: "pointer" }}>
                  <RefreshCw size={14} color={TXT_SOFT} />
                </button>
                {canConfirmAll && counts["pending"] > 0 && (
                  <button onClick={handleConfirmAll} disabled={confirming}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 10, background: confirming ? BORDER : "#0F1E35", color: WHITE, border: "none", fontSize: 12, fontWeight: 700, cursor: confirming ? "not-allowed" : "pointer" }}>
                    {confirming ? "Confirming…" : `✓ Confirm All (${counts["pending"] || 0})`}
                  </button>
                )}
                <button onClick={() => navigate("/book?source=walk_in")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 10, background: `linear-gradient(135deg,${G},${G_D})`, color: WHITE, border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  <Plus size={14} /> New Booking
                </button>
              </div>
            </div>

            {/* Search */}
            <div style={{ position: "relative", marginBottom: 12 }}>
              <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: TXT_SOFT }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone, service or ref…"
                style={{ width: "100%", padding: "9px 36px", border: `1.5px solid ${BORDER}`, borderRadius: 10, fontSize: 13, color: TXT, outline: "none", background: CREAM, fontFamily: "Montserrat,sans-serif", boxSizing: "border-box" }} />
              {search && <button onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer" }}><X size={13} color={TXT_SOFT} /></button>}
            </div>

            {/* Confirm result */}
            {confirmResult && (
              <div style={{ marginBottom: 10, padding: "8px 14px", borderRadius: 10, background: "#F0FDF4", border: "1px solid #BBF7D0", fontSize: 12, color: "#15803D", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>✓ {confirmResult.done} confirmed · {confirmResult.skipped} skipped (time conflict) · {confirmResult.noStaff} no matching staff</span>
                <button onClick={() => setConfirmResult(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#15803D", fontSize: 14, fontWeight: 700 }}>×</button>
              </div>
            )}
            {/* Filter pills */}
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 12 }}>
              {FILTERS.map(f => {
                const s = STATUS[f];
                const cnt = counts[f] || 0;
                return (
                  <button key={f} onClick={() => setFilter(f)} className={`filter-pill${filter === f ? " active" : ""}`}
                    style={{ padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
                    {f === "all" ? "All" : s?.label || f}
                    {cnt > 0 && <span style={{ marginLeft: 5, background: filter === f ? G_D : "#E5E7EB", color: filter === f ? WHITE : TXT_MID, borderRadius: 10, padding: "1px 6px", fontSize: 10 }}>{cnt}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: 60, color: TXT_SOFT, fontSize: 13 }}>Loading…</div>
            ) : bookings.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60 }}>
                <Calendar size={32} style={{ color: TXT_SOFT, margin: "0 auto 12px", display: "block" }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: TXT_MID, margin: 0 }}>No bookings found</p>
                <p style={{ fontSize: 12, color: TXT_SOFT, marginTop: 4 }}>Try adjusting your filters or search</p>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${BORDER}`, background: WHITE }}>
                    {["Client", "Service", "Date & Time", "Status", "Deposit"].map(h => (
                      <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: TXT_SOFT, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b, i) => {
                    const ss = STATUS[b.status] || STATUS.pending;
                    const dl = dateLabel(b.preferred_date);
                    const isSelected = selected?.id === b.id;
                    return (
                      <tr key={b.id} onClick={() => { setSelected(isSelected ? null : b); setExtraStaff([]); }}
                        className={`bk-row${isSelected ? " selected" : ""}`}
                        style={{ borderBottom: `1px solid ${BORDER}`, background: i % 2 === 0 ? WHITE : "#FAFAF8", borderLeft: isSelected ? `3px solid ${G_D}` : "3px solid transparent" }}>
                        <td style={{ padding: "12px 16px" }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: TXT, margin: 0 }}>{b.client_name || "—"}</p>
                          <p style={{ fontSize: 11, color: TXT_SOFT, margin: "2px 0 0" }}>{b.client_phone || ""}</p>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <p style={{ fontSize: 12, color: TXT, margin: 0, maxWidth: 200 }}>{b.service_name || "—"}</p>
                          {b.staff_name && <p style={{ fontSize: 11, color: TXT_SOFT, margin: "2px 0 0" }}>↳ {b.staff_name}</p>}
                        </td>
                        <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: dl.color, margin: 0 }}>{dl.label}</p>
                          <p style={{ fontSize: 11, color: TXT_SOFT, margin: "2px 0 0" }}>{b.preferred_time ? formatTo12Hour(b.preferred_time) : "—"}</p>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: ss.bg, color: ss.color, display: "inline-flex", alignItems: "center", gap: 5 }}>
                            <span style={{ width: 5, height: 5, borderRadius: "50%", background: ss.dot, display: "inline-block" }} />
                            {ss.label}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          {b.deposit_paid ? (
                            <span style={{ fontSize: 11, color: "#15803D", fontWeight: 600 }}>✓ GHS {b.deposit_amount || 50}</span>
                          ) : (
                            <span style={{ fontSize: 11, color: TXT_SOFT }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ padding: "12px 24px", borderTop: `1px solid ${BORDER}`, background: WHITE, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontSize: 11, color: TXT_SOFT, margin: 0 }}>{total} bookings · Page {page} of {totalPages}</p>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="page-btn" disabled={page === 1} onClick={() => { const np = page - 1; setPage(np); fetchBookings(np, filter, search); }}>
                  <ChevronLeft size={14} color={TXT_MID} />
                </button>
                <button className="page-btn" disabled={page === totalPages} onClick={() => { const np = page + 1; setPage(np); fetchBookings(np, filter, search); }}>
                  <ChevronRight size={14} color={TXT_MID} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Detail panel ──────────────────────────────────── */}
        {selected && (
          <div style={{ width: 360, background: WHITE, borderLeft: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", overflowY: "auto", flexShrink: 0 }}>
            {/* Panel header */}
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: G, textTransform: "uppercase", margin: "0 0 2px" }}>Booking</p>
                <p style={{ fontSize: 12, fontFamily: "monospace", color: TXT_MID, margin: 0 }}>{selected.booking_ref || selected.id?.slice(0,8)}</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <X size={16} color={TXT_SOFT} />
              </button>
            </div>

            <div style={{ padding: "16px 20px", flex: 1 }}>
              {/* Status badge */}
              {(() => { const ss = STATUS[selected.status] || STATUS.pending; return (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                  <span style={{ padding: "4px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: ss.bg, color: ss.color }}>
                    {ss.label}
                  </span>
                  {selected.deposit_paid && <span style={{ fontSize: 11, color: "#15803D", fontWeight: 600 }}>· Deposit paid ✓</span>}
                </div>
              );})()}

              {/* Info rows */}
              {[
                { icon: <User size={13} />, label: "Client", val: selected.client_name },
                { icon: <Phone size={13} />, label: "Phone", val: selected.client_phone },
                { icon: <Scissors size={13} />, label: "Service", val: selected.service_name },
                { icon: <Calendar size={13} />, label: "Date", val: selected.preferred_date ? format(parseISO(selected.preferred_date), "EEEE, d MMMM yyyy") : "—" },
                { icon: <Clock size={13} />, label: "Time", val: selected.preferred_time ? formatTo12Hour(selected.preferred_time) : "—" },
                { icon: <CreditCard size={13} />, label: "Price", val: selected.price ? `GHS ${Number(selected.price).toLocaleString()}` : "—" },
                { icon: <User size={13} />, label: "Staff", val: selected.staff_name || "Unassigned" },
              ].map(({ icon, label, val }) => (
                <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                  <span style={{ color: G_D, marginTop: 1, flexShrink: 0 }}>{icon}</span>
                  <div>
                    <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: TXT_SOFT, textTransform: "uppercase", margin: "0 0 1px" }}>{label}</p>
                    <p style={{ fontSize: 13, color: TXT, margin: 0, lineHeight: 1.4 }}>{val || "—"}</p>
                  </div>
                </div>
              ))}

              {selected.notes && (
                <div style={{ background: CREAM, borderRadius: 10, padding: "10px 12px", marginTop: 4, marginBottom: 16 }}>
                  <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: TXT_SOFT, textTransform: "uppercase", margin: "0 0 4px", display: "flex", alignItems: "center", gap: 4 }}><StickyNote size={10} /> Notes</p>
                  <p style={{ fontSize: 12, color: TXT_MID, margin: 0, lineHeight: 1.6 }}>{selected.notes}</p>
                </div>
              )}

              {/* Assign staff — primary + additional for joint bookings */}
              {staff.length > 0 && !["completed","cancelled"].includes(selected.status) && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: TXT_SOFT, textTransform: "uppercase", margin: "0 0 6px" }}>Assign Staff</p>
                  {(() => {
                    const isToday = selected.preferred_date === new Date().toISOString().slice(0,10);
                    const getLabel = (s: any) => {
                      let label = s.name;
                      if (isToday) {
                        if (absentStaffIds2.has(s.id)) label += " — Absent";
                        else if (presentStaffIds.has(s.id)) label += " ✓";
                        else label += " — Not in";
                      }
                      return label;
                    };
                    return (
                      <div>
                        {/* Primary staff */}
                        <p style={{ fontSize: 10, color: TXT_SOFT, margin: "0 0 4px" }}>Primary</p>
                        <select value={selected.staff_id || ""} onChange={e => handleAssignStaff(selected.id, e.target.value)}
                          style={{ width: "100%", padding: "8px 10px", border: `1.5px solid ${BORDER}`, borderRadius: 10, fontSize: 13, color: TXT, outline: "none", background: WHITE, fontFamily: "Montserrat,sans-serif", marginBottom: 8 }}>
                          <option value="">Unassigned</option>
                          {staff.map(s => <option key={s.id} value={s.id} disabled={isToday && absentStaffIds2.has(s.id)}>{getLabel(s)}</option>)}
                        </select>

                        {/* Additional staff for joint bookings */}
                        {extraStaff.map((es, idx) => (
                          <div key={idx} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                            <div style={{ flex: 1 }}>
                              <select value={es.id} onChange={e => {
                                const found = staff.find(s => s.id === e.target.value);
                                setExtraStaff(prev => prev.map((x, i) => i === idx ? { ...x, id: e.target.value, name: found?.name || "" } : x));
                              }} style={{ width: "100%", padding: "7px 8px", border: `1.5px solid ${BORDER}`, borderRadius: 8, fontSize: 12, color: TXT, outline: "none", background: WHITE, fontFamily: "Montserrat,sans-serif" }}>
                                <option value="">Select staff</option>
                                {staff.filter(s => s.id !== selected.staff_id).map(s => <option key={s.id} value={s.id}>{getLabel(s)}</option>)}
                              </select>
                            </div>
                            <input value={es.service} onChange={e => setExtraStaff(prev => prev.map((x, i) => i === idx ? { ...x, service: e.target.value } : x))}
                              placeholder="Their service" style={{ flex: 1, padding: "7px 8px", border: `1.5px solid ${BORDER}`, borderRadius: 8, fontSize: 12, color: TXT, outline: "none", fontFamily: "Montserrat,sans-serif" }} />
                            <button onClick={() => setExtraStaff(prev => prev.filter((_, i) => i !== idx))}
                              style={{ padding: "6px 8px", border: `1.5px solid #FECACA`, borderRadius: 8, background: WHITE, color: "#DC2626", cursor: "pointer", fontSize: 12 }}>✕</button>
                          </div>
                        ))}
                        {extraStaff.length < 3 && (
                          <button onClick={() => setExtraStaff(prev => [...prev, { id: "", name: "", service: "" }])}
                            style={{ fontSize: 11, color: G_D, background: "none", border: `1px dashed ${G}`, borderRadius: 8, padding: "5px 12px", cursor: "pointer", width: "100%", marginTop: 2 }}>
                            + Add another stylist (joint booking)
                          </button>
                        )}
                        {extraStaff.length > 0 && (
                          <p style={{ fontSize: 10, color: TXT_SOFT, margin: "6px 0 0" }}>Each stylist's revenue will be recorded separately at checkout</p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Status actions */}
              {!["completed","cancelled"].includes(selected.status) && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                  <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: TXT_SOFT, textTransform: "uppercase", margin: "0 0 4px" }}>Update Status</p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {selected.status === "pending" && (
                      <button className="status-btn" onClick={() => handleStatusUpdate(selected.id, "confirmed")}
                        style={{ background: "#DCFCE7", color: "#15803D" }}>✓ Confirm</button>
                    )}
                    {["pending","confirmed"].includes(selected.status) && (
                      <button className="status-btn" onClick={() => handleStatusUpdate(selected.id, "in_progress")}
                        style={{ background: "#DBEAFE", color: "#1D4ED8" }}>▶ In Progress</button>
                    )}
                    <button className="status-btn" onClick={() => handleStatusUpdate(selected.id, "no_show")}
                      style={{ background: "#F3F4F6", color: "#6B7280" }}>No Show</button>
                    <button className="status-btn" onClick={() => handleStatusUpdate(selected.id, "cancelled")}
                      style={{ background: "#FEE2E2", color: "#B91C1C" }}>✕ Cancel</button>
                  </div>
                </div>
              )}

              {/* Checkout button */}
              {["confirmed","in_progress"].includes(selected.status) && (
                <button onClick={() => {
                  const base = (userRole === "receptionist") ? "/app/receptionist/checkout" : "/app/admin/checkout";
                  // Save extra staff to sessionStorage for checkout to pick up
                  if (extraStaff.length > 0) sessionStorage.setItem("extraStaff_" + selected.id, JSON.stringify(extraStaff));
                  else sessionStorage.removeItem("extraStaff_" + selected.id);
                  navigate(`${base}?booking=${selected.id}`);
                }} className="panel-btn"
                  style={{ width: "100%", background: `linear-gradient(135deg,${G},${G_D})`, color: WHITE, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  Checkout <ArrowRight size={13} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <CancelBookingDialog open={cancelDialogOpen} onClose={() => { setCancelDialogOpen(false); setBookingToCancel(null); }} onConfirm={handleCancelWithReason} />
    </div>
  );
}
