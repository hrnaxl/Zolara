import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { normalizePhoneGhana } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar, Clock, Filter, Search } from "lucide-react";

const G      = "#C8A97E";
const G_DARK = "#8B6914";
const NAVY   = "#0F1E35";
const CREAM  = "#FAFAF8";
const WHITE  = "#FFFFFF";
const BORDER = "#EDE8E0";
const TXT    = "#1C160E";
const TXT_M  = "#78716C";
const TXT_S  = "#A8A29E";
const SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)";

const STATUS_COLOR: Record<string, string> = {
  confirmed: "#22C55E", pending: "#F59E0B", completed: "#6366F1", cancelled: "#EF4444",
};
const STATUS_BG: Record<string, string> = {
  confirmed: "#F0FDF4", pending: "#FFFBEB", completed: "#EEF2FF", cancelled: "#FEF2F2",
};
const STATUS_LABEL: Record<string, string> = {
  confirmed: "Confirmed", pending: "Pending", completed: "Completed", cancelled: "Cancelled",
};

const FILTERS = ["all", "upcoming", "completed", "cancelled"] as const;

export default function ClientBookings() {
  const { client } = useOutletContext<any>();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<typeof FILTERS[number]>("all");
  const [search, setSearch]     = useState("");

  useEffect(() => {
    if (!client?.id) return;
    (supabase as any).from("bookings")
      .select("*")
      .eq("client_id", client.id)
      .order("preferred_date", { ascending: false })
      .then(({ data }: any) => { setBookings(data || []); setLoading(false); });
  }, [client]);

  const today = format(new Date(), "yyyy-MM-dd");
  const filtered = bookings.filter(b => {
    const matchSearch = !search || b.service_name?.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filter === "upcoming") return ["pending", "confirmed"].includes(b.status) && b.preferred_date >= today;
    if (filter === "completed") return b.status === "completed";
    if (filter === "cancelled") return b.status === "cancelled";
    return true;
  });

  return (
    <div style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&family=Montserrat:wght@400;500;600;700&display=swap');`}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: TXT_S, textTransform: "uppercase", marginBottom: 4 }}>CLIENT PORTAL</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(26px,4vw,36px)", fontWeight: 700, color: TXT, margin: "0 0 4px" }}>My Bookings</h1>
        <p style={{ fontSize: 13, color: TXT_M }}>View and track all your appointments at Zolara.</p>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 24 }}>
        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "9px 14px", flex: "1 1 200px" }}>
          <Search size={13} style={{ color: TXT_S, flexShrink: 0 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search service..."
            style={{ border: "none", outline: "none", fontSize: 12, color: TXT, background: "transparent", fontFamily: "'Montserrat', sans-serif", width: "100%" }} />
        </div>
        {/* Filter tabs */}
        <div style={{ display: "flex", background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 3, gap: 2, flexWrap: "wrap" }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer",
              fontSize: 11, fontWeight: 700, fontFamily: "'Montserrat', sans-serif",
              letterSpacing: "0.05em", textTransform: "capitalize",
              background: filter === f ? NAVY : "transparent",
              color: filter === f ? WHITE : TXT_S,
              transition: "all 0.15s",
            }}>{f}</button>
          ))}
        </div>
      </div>

      {/* Count */}
      <div style={{ fontSize: 12, color: TXT_S, marginBottom: 16, fontWeight: 600 }}>
        {filtered.length} booking{filtered.length !== 1 ? "s" : ""}
      </div>

      {/* Bookings list */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: TXT_S, fontSize: 13 }}>Loading your bookings…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", background: WHITE, borderRadius: 20, border: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
          <p style={{ fontSize: 14, color: TXT_M, marginBottom: 16 }}>No bookings found.</p>
          <a href="/book" style={{ fontSize: 12, fontWeight: 700, color: G_DARK, textDecoration: "none", background: "rgba(200,169,126,0.1)", padding: "10px 22px", borderRadius: 20, border: `1px solid rgba(200,169,126,0.3)` }}>
            Book an Appointment →
          </a>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map(b => (
            <div key={b.id} style={{ background: WHITE, borderRadius: 16, border: `1px solid ${BORDER}`, padding: "20px 22px", boxShadow: SHADOW, display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
              {/* Date block */}
              <div style={{ width: 52, height: 52, borderRadius: 12, background: STATUS_BG[b.status] || CREAM, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: STATUS_COLOR[b.status] || TXT_M, lineHeight: 1, fontFamily: "'Cormorant Garamond', serif" }}>
                  {b.preferred_date ? format(new Date(b.preferred_date + "T00:00"), "dd") : "--"}
                </span>
                <span style={{ fontSize: 9, fontWeight: 700, color: STATUS_COLOR[b.status] || TXT_S, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {b.preferred_date ? format(new Date(b.preferred_date + "T00:00"), "MMM") : ""}
                </span>
              </div>

              {/* Details */}
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: TXT, marginBottom: 4 }}>{b.service_name || "Service"}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: TXT_S }}>
                    <Calendar size={11} /> {b.preferred_date ? format(new Date(b.preferred_date + "T00:00"), "EEEE, MMMM d yyyy") : ""}
                  </div>
                  {b.preferred_time && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: TXT_S }}>
                      <Clock size={11} /> {b.preferred_time}
                    </div>
                  )}
                </div>
              </div>

              {/* Price + status */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                {b.status === "completed" && b.price ? (
                  <div>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 700, color: TXT }}>
                      GH₵ {Number(b.price).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 9, color: TXT_S, textAlign: "right", marginTop: 1 }}>TOTAL PAID</div>
                  </div>
                ) : b.deposit_paid && b.deposit_amount ? (
                  <div>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 700, color: "#C8A97E" }}>
                      GH₵ {Number(b.deposit_amount).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 9, color: "#C8A97E", textAlign: "right", marginTop: 1 }}>DEPOSIT PAID</div>
                  </div>
                ) : b.price ? (
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 600, color: TXT_S }}>
                    GH₵ {Number(b.price).toLocaleString()}
                  </div>
                ) : null}
                <div style={{ display: "inline-flex", padding: "4px 12px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: STATUS_BG[b.status] || CREAM, color: STATUS_COLOR[b.status] || TXT_S, letterSpacing: "0.06em" }}>
                  {STATUS_LABEL[b.status] || b.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Book more CTA */}
      <div style={{ marginTop: 28, textAlign: "center" }}>
        <a href="/book" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, color: G_DARK, textDecoration: "none", background: "rgba(200,169,126,0.1)", padding: "12px 28px", borderRadius: 24, border: `1px solid rgba(200,169,126,0.3)` }}>
          + Book New Appointment
        </a>
      </div>
    </div>
  );
}
