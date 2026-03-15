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
  const { settings } = useSettings();
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
  const { userRole } = useSettings();
  const canManage = userRole === "owner" || userRole === "admin";
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
    const { data } = await supabase.from("staff").select("id, name").eq("is_active", true);
    setStaff(data || []);
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
                <button onClick={() => navigate("/app/admin/bookings/new")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 10, background: `linear-gradient(135deg,${G},${G_D})`, color: WHITE, border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
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
                      <tr key={b.id} onClick={() => setSelected(isSelected ? null : b)}
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

              {/* Assign staff */}
              {staff.length > 0 && !["completed","cancelled"].includes(selected.status) && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: TXT_SOFT, textTransform: "uppercase", margin: "0 0 6px" }}>Assign Staff</p>
                  <select value={selected.staff_id || ""} onChange={e => handleAssignStaff(selected.id, e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", border: `1.5px solid ${BORDER}`, borderRadius: 10, fontSize: 13, color: TXT, outline: "none", background: WHITE, fontFamily: "Montserrat,sans-serif" }}>
                    <option value="">Unassigned</option>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
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
                <button onClick={() => navigate(`/app/admin/checkout?bookingId=${selected.id}`)} className="panel-btn"
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
