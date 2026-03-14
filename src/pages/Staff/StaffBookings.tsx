import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { findOrCreateClient } from "@/lib/clientDedup";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";

const G = "#B8975A", G_LIGHT = "#F5ECD6", CREAM = "#FAFAF8", WHITE = "#FFFFFF";
const BORDER = "#EDEBE5", TXT = "#1C1917", TXT_MID = "#78716C", TXT_SOFT = "#A8A29E";
const SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)";
const SHADOW_MD = "0 2px 8px rgba(0,0,0,0.06), 0 12px 36px rgba(0,0,0,0.1)";

const statusStyle = (s: string) => {
  if (s === "completed") return { bg: "rgba(76,175,125,0.1)", color: "#2E8A5E", label: "Completed" };
  if (s === "cancelled") return { bg: "rgba(224,90,90,0.1)", color: "#C0392B", label: "Cancelled" };
  if (s === "confirmed") return { bg: "rgba(74,144,217,0.1)", color: "#2471A3", label: "Confirmed" };
  return { bg: "rgba(201,168,76,0.12)", color: "#8B6914", label: "Pending" };
};

const StaffBookings = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rescheduleDialog, setRescheduleDialog] = useState(false);
  const [requestDialog, setRequestDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [notes, setNotes] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [staffName, setStaffName] = useState("");
  const [staffProfileId, setStaffProfileId] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from("staff").select("id, name").eq("user_id", user.id).maybeSingle();
      if (profile) { setStaffName(profile.name); setStaffProfileId(profile.id); }

      // Build query filtered to this staff member at DB level
      let bookingsQuery = supabase.from("bookings").select("*").order("preferred_date", { ascending: false });
      if (profile?.id) {
        bookingsQuery = bookingsQuery.eq("staff_id", profile.id);
      } else if (profile?.name) {
        bookingsQuery = bookingsQuery.ilike("staff_name", profile.name);
      }

      const [bookingsRes, servicesRes] = await Promise.all([
        bookingsQuery,
        supabase.from("services").select("*").eq("is_active", true).order("name"),
      ]);

      setBookings(bookingsRes.data || []);
      if (servicesRes.data) setServices(servicesRes.data);
    } catch {
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm("Cancel this booking?")) return;
    const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
    if (error) toast.error("Failed to cancel");
    else { toast.success("Booking cancelled"); fetchData(); }
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;
    const { error } = await supabase.from("bookings")
      .update({ preferred_date: newDate, preferred_time: newTime, status: "pending" })
      .eq("id", selectedBooking.id);
    if (error) toast.error("Failed to reschedule");
    else { toast.success("Rescheduled successfully"); setRescheduleDialog(false); fetchData(); }
  };

  const handleRequestBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequesting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Please sign in first"); return; }
      if (!selectedService || !preferredDate || !preferredTime) { toast.error("Please fill in all fields"); return; }

      const picked = new Date(preferredDate);
      if (picked.getUTCDay() === 0) { toast.error("No bookings on Sundays"); return; }

      const clientId = await findOrCreateClient({
        name: user.user_metadata?.full_name || user.user_metadata?.name || user.email || "Staff",
        email: user.email, phone: user.user_metadata?.phone || null, userId: user.id,
      });

      const { error } = await supabase.from("bookings").insert([{
        client_id: clientId, service_id: selectedService,
        preferred_date: preferredDate, preferred_time: preferredTime, notes, status: "pending",
      }]);

      if (error) toast.error(error.message || "Failed to submit");
      else {
        toast.success("Booking request submitted");
        setRequestDialog(false); setSelectedService(""); setPreferredDate(""); setPreferredTime(""); setNotes("");
        fetchData();
      }
    } finally {
      setRequesting(false);
    }
  };

  const filtered = filterStatus === "all" ? bookings : bookings.filter(b => b.status === filterStatus);

  return (
    <div style={{ background: CREAM, minHeight: "100vh", padding: "clamp(14px,4vw,32px) clamp(12px,4vw,36px)", fontFamily: "Montserrat,sans-serif", color: TXT }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Montserrat:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box}
        .sc{background:${WHITE};border:1px solid ${BORDER};border-radius:16px;padding:24px;box-shadow:${SHADOW};transition:box-shadow 0.2s,transform 0.2s}
        .sc:hover{box-shadow:${SHADOW_MD};transform:translateY(-1px)}
        .sc-flat{background:${WHITE};border:1px solid ${BORDER};border-radius:16px;padding:24px;box-shadow:${SHADOW}}
        .row-hover:hover{background:rgba(184,151,90,0.04);cursor:default}
        .pill-btn{border:1px solid ${BORDER};background:${WHITE};border-radius:20px;padding:5px 14px;font-size:11px;font-weight:600;font-family:Montserrat,sans-serif;cursor:pointer;transition:all 0.18s;color:${TXT_MID}}
        .pill-btn:hover{border-color:${G};color:${G}}
        .pill-btn.active{background:${G};color:#fff;border-color:${G}}
        .zolara-input{width:100%;border:1px solid ${BORDER};border-radius:10px;padding:9px 12px;font-family:Montserrat,sans-serif;font-size:13px;color:${TXT};outline:none;background:${WHITE}}
        .zolara-input:focus{border-color:${G};box-shadow:0 0 0 3px rgba(184,151,90,0.12)}
        .zolara-btn{background:${G};color:#fff;border:none;border-radius:10px;padding:11px 20px;font-family:Montserrat,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.05em;cursor:pointer;width:100%;transition:opacity 0.18s}
        .zolara-btn:hover{opacity:0.88}
        .zolara-btn-outline{background:transparent;color:${TXT_MID};border:1px solid ${BORDER};border-radius:10px;padding:7px 14px;font-family:Montserrat,sans-serif;font-size:11px;font-weight:600;cursor:pointer;transition:all 0.18s}
        .zolara-btn-outline:hover{border-color:${G};color:${G}}
        .zolara-btn-danger{background:rgba(224,90,90,0.08);color:#C0392B;border:1px solid rgba(224,90,90,0.2);border-radius:10px;padding:7px 14px;font-family:Montserrat,sans-serif;font-size:11px;font-weight:600;cursor:pointer;transition:all 0.18s}
        .zolara-btn-danger:hover{background:rgba(224,90,90,0.15)}
        @keyframes up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .au{animation:up 0.35s ease both}
      `}</style>

      {/* Header */}
      <div className="au" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "28px" }}>
        <div>
          <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.16em", color: G, marginBottom: "6px", textTransform: "uppercase" }}>
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
          <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(28px,3.5vw,40px)", fontWeight: 700, color: TXT, margin: 0, lineHeight: 1 }}>
            My Bookings
          </h1>
          <p style={{ fontSize: "12px", color: TXT_SOFT, marginTop: "6px" }}>Manage and track your appointments.</p>
        </div>
        <button onClick={() => setRequestDialog(true)}
          style={{ background: G, color: "#fff", border: "none", borderRadius: "10px", padding: "10px 20px", fontSize: "12px", fontWeight: 700, letterSpacing: "0.05em", cursor: "pointer", fontFamily: "Montserrat,sans-serif", flexShrink: 0 }}>
          + Request Booking
        </button>
      </div>

      {/* Filter pills */}
      <div className="au" style={{ display: "flex", gap: "8px", marginBottom: "20px", animationDelay: "0.05s" }}>
        {["all", "pending", "confirmed", "completed", "cancelled"].map(f => (
          <button key={f} className={`pill-btn${filterStatus === f ? " active" : ""}`} onClick={() => setFilterStatus(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === "all" ? ` (${bookings.length})` : ` (${bookings.filter(b => b.status === f).length})`}
          </button>
        ))}
      </div>

      {/* Bookings table */}
      <div className="au sc-flat" style={{ animationDelay: "0.1s" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", border: `2.5px solid ${G_LIGHT}`, borderTopColor: G, margin: "0 auto 12px", animation: "spin 0.9s linear infinite" }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: TXT_SOFT }}>
            <div style={{ fontSize: "36px", marginBottom: "12px" }}>📋</div>
            <p style={{ fontSize: "14px", fontWeight: 500 }}>No {filterStatus !== "all" ? filterStatus : ""} bookings found</p>
          </div>
        ) : (
          <>
            <div className="staff-row-header" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 90px 90px 100px", gap: "12px", padding: "0 12px 10px", borderBottom: `1px solid ${BORDER}`, marginBottom: "4px" }}>
              {["Service", "Client", "Date", "Time", "Status"].map(h => (
                <span key={h} style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", color: TXT_SOFT, textTransform: "uppercase" }}>{h}</span>
              ))}
            </div>
            {filtered.map((b, i) => {
              const s = statusStyle(b.status);
              const canAct = b.status === "pending" || b.status === "confirmed";
              return (
                <div key={b.id} className="row-hover staff-row-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 90px 90px 100px", gap: "12px", padding: "13px 12px", borderRadius: "10px", alignItems: "center", borderBottom: i < filtered.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: TXT }}>{b.service_name || "Service"}</span>
                  <span style={{ fontSize: "12px", color: TXT_MID }}>{b.client_name || "—"}</span>
                  <span style={{ fontSize: "12px", color: TXT_MID }}>{b.preferred_date ? format(new Date(b.preferred_date + "T00:00:00"), "MMM d") : "—"}</span>
                  <span style={{ fontSize: "12px", color: TXT_MID }}>{b.preferred_time?.slice(0, 5) || "—"}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "10px", fontWeight: 700, background: s.bg, color: s.color, whiteSpace: "nowrap" }}>{s.label}</span>
                    {canAct && (
                      <div style={{ display: "flex", gap: "4px" }}>
                        <button className="zolara-btn-outline" style={{ padding: "4px 8px", fontSize: "10px" }}
                          onClick={() => { setSelectedBooking(b); setNewDate(b.preferred_date); setNewTime(b.preferred_time); setRescheduleDialog(true); }}>
                          ↻
                        </button>
                        <button className="zolara-btn-danger" style={{ padding: "4px 8px", fontSize: "10px" }} onClick={() => handleCancel(b.id)}>✕</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Request Booking Dialog */}
      <Dialog open={requestDialog} onOpenChange={setRequestDialog}>
        <DialogContent style={{ fontFamily: "Montserrat,sans-serif", maxWidth: "440px" }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "22px", fontWeight: 700 }}>Request Booking</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRequestBooking} style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "8px" }}>
            <div>
              <label style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: TXT_SOFT, textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Service</label>
              <select className="zolara-input" value={selectedService} onChange={e => setSelectedService(e.target.value)} required>
                <option value="">Select a service</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: TXT_SOFT, textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Date</label>
                <input type="date" className="zolara-input" value={preferredDate} onChange={e => setPreferredDate(e.target.value)} required />
              </div>
              <div>
                <label style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: TXT_SOFT, textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Time</label>
                <input type="time" className="zolara-input" value={preferredTime} onChange={e => setPreferredTime(e.target.value)} required />
              </div>
            </div>
            <div>
              <label style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: TXT_SOFT, textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Notes (optional)</label>
              <input type="text" className="zolara-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any special requests..." />
            </div>
            <button type="submit" className="zolara-btn" disabled={requesting}>{requesting ? "Submitting..." : "Submit Request"}</button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleDialog} onOpenChange={setRescheduleDialog}>
        <DialogContent style={{ fontFamily: "Montserrat,sans-serif", maxWidth: "380px" }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "22px", fontWeight: 700 }}>Reschedule Booking</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleReschedule} style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "8px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: TXT_SOFT, textTransform: "uppercase", display: "block", marginBottom: "6px" }}>New Date</label>
                <input type="date" className="zolara-input" value={newDate} onChange={e => setNewDate(e.target.value)} required />
              </div>
              <div>
                <label style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: TXT_SOFT, textTransform: "uppercase", display: "block", marginBottom: "6px" }}>New Time</label>
                <input type="time" className="zolara-input" value={newTime} onChange={e => setNewTime(e.target.value)} required />
              </div>
            </div>
            <button type="submit" className="zolara-btn">Confirm Reschedule</button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffBookings;
