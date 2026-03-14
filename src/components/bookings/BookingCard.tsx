import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Pencil, Trash2, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface BookingCardProps {
  booking: any;
  staff: { id: string; name: string }[];
  isSelected: boolean;
  onSelect: (id: string) => void;
  onEdit: (booking: any) => void;
  onDelete: (id: string) => void;
  onStatusUpdate: (id: string, status: string) => void;
  onQuickAssign: (bookingId: string, staffId: string) => void;
  paymentStatus?: "pending" | "completed" | "refunded";
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  pending:     { bg: "#EFF6FF", color: "#2563EB" },
  confirmed:   { bg: "#FFFBEB", color: "#D97706" },
  completed:   { bg: "#F0FDF4", color: "#16A34A" },
  cancelled:   { bg: "#FEF2F2", color: "#DC2626" },
  in_progress: { bg: "#F5F3FF", color: "#7C3AED" },
  no_show:     { bg: "#F3F4F6", color: "#6B7280" },
};

export const BookingCard = ({
  booking, staff, isSelected, onSelect, onEdit, onDelete, onStatusUpdate, onQuickAssign,
}: BookingCardProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);
  const isCompleted = booking.status === "completed" || booking.status === "cancelled" || booking.status === "no_show";
  const isUnassigned = !booking.staff_id;
  const ss = STATUS_STYLES[booking.status] || STATUS_STYLES.pending;
  const G = "#C8A97E", G_D = "#8B6914";

  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${isSelected ? G : isUnassigned && !isCompleted ? "#F59E0B55" : "#EDEBE5"}`,
        borderLeft: isUnassigned && !isCompleted ? "3px solid #F59E0B" : isSelected ? `3px solid ${G}` : "1px solid #EDEBE5",
        borderRadius: 14,
        overflow: "hidden",
        transition: "box-shadow 0.15s, border-color 0.15s",
        boxShadow: isSelected ? `0 0 0 2px ${G}33` : "0 1px 3px rgba(0,0,0,0.04)",
        fontFamily: "Montserrat, sans-serif",
      }}
    >
      {/* ── Compact row (always visible) ── */}
      <div
        style={{ display: "flex", alignItems: "center", gap: 10, padding: isCompleted ? "10px 14px" : "14px 16px", cursor: isCompleted ? "pointer" : "default" }}
        onClick={() => isCompleted && setExpanded(v => !v)}
      >
        <div onClick={e => { e.stopPropagation(); onSelect(booking.id); }}>
          <Checkbox checked={isSelected} onCheckedChange={() => onSelect(booking.id)} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: isCompleted ? 13 : 14, fontWeight: 600, color: "#1C160E" }}>
              {booking.client_name || "Unknown Client"}
            </span>
            <span style={{ fontSize: 11, color: "#78716C" }}>·</span>
            <span style={{ fontSize: isCompleted ? 11 : 12, color: "#78716C", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>
              {booking.service_name || "No service"}
            </span>
            {(booking as any).variant_name && (
              <span style={{ fontSize: 10, color: G_D, background: "#FBF6EE", padding: "1px 6px", borderRadius: 10 }}>
                {(booking as any).variant_name}
              </span>
            )}
          </div>
          {!isCompleted && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 3, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: "#78716C" }}>
                {format(new Date(booking.preferred_date), "MMM d")} · {(booking.preferred_time || "").slice(0, 5)}
              </span>
              {booking.staff_name && (
                <span style={{ fontSize: 11, color: "#78716C", display: "flex", alignItems: "center", gap: 3 }}>
                  <User size={11} /> {booking.staff_name}
                </span>
              )}
              {booking.price != null && (
                <span style={{ fontSize: 11, fontWeight: 700, color: G_D }}>GHS {Number(booking.price).toLocaleString()}</span>
              )}
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 10px", borderRadius: 20, background: ss.bg, color: ss.color }}>
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1).replace("_", " ")}
          </span>
          {isCompleted
            ? <ChevronDown size={14} style={{ color: "#A8A29E", transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            : (
              <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                {["pending", "confirmed"].includes(booking.status) && (
                  <button
                    onClick={() => navigate((location.pathname.includes("/receptionist/") ? "/app/receptionist/checkout" : "/app/admin/checkout") + `?booking=${booking.id}`)}
                    style={{ padding: "5px 12px", borderRadius: 8, background: `linear-gradient(135deg,${G},${G_D})`, color: "#fff", border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                    <CheckCircle2 size={12} /> Out
                  </button>
                )}
                <button onClick={() => onEdit(booking)} style={{ padding: "5px 8px", borderRadius: 8, border: "1px solid #EDEBE5", background: "#fff", cursor: "pointer" }}>
                  <Pencil size={13} color="#78716C" />
                </button>
                <button onClick={() => onDelete(booking.id)} style={{ padding: "5px 8px", borderRadius: 8, border: "1px solid #FECACA", background: "#FEF2F2", cursor: "pointer" }}>
                  <Trash2 size={13} color="#DC2626" />
                </button>
              </div>
            )
          }
        </div>
      </div>

      {/* ── Expanded details (completed/cancelled only) ── */}
      {isCompleted && expanded && (
        <div style={{ borderTop: "1px solid #F5F0EA", padding: "12px 16px", background: "#FAFAF8" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 10, color: "#A8A29E", fontWeight: 600, letterSpacing: "0.08em", marginBottom: 3 }}>DATE & TIME</p>
              <p style={{ fontSize: 12, color: "#1C160E", fontWeight: 600 }}>
                {format(new Date(booking.preferred_date), "MMM d, yyyy")} · {(booking.preferred_time || "").slice(0, 5)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 10, color: "#A8A29E", fontWeight: 600, letterSpacing: "0.08em", marginBottom: 3 }}>STAFF</p>
              <p style={{ fontSize: 12, color: "#1C160E", fontWeight: 600 }}>{booking.staff_name || "—"}</p>
            </div>
            {booking.price != null && (
              <div>
                <p style={{ fontSize: 10, color: "#A8A29E", fontWeight: 600, letterSpacing: "0.08em", marginBottom: 3 }}>AMOUNT</p>
                <p style={{ fontSize: 13, color: G_D, fontFamily: "'Cormorant Garamond',serif", fontWeight: 700 }}>GHS {Number(booking.price).toLocaleString()}</p>
              </div>
            )}
            {(booking as any).addon_names?.length > 0 && (
              <div>
                <p style={{ fontSize: 10, color: "#A8A29E", fontWeight: 600, letterSpacing: "0.08em", marginBottom: 3 }}>ADD-ONS</p>
                <p style={{ fontSize: 11, color: "#78716C" }}>{((booking as any).addon_names as any[]).map((a: any) => typeof a === "string" ? a : a.name).join(", ")}</p>
              </div>
            )}
          </div>
          {booking.notes && (
            <div style={{ fontSize: 11, color: "#78716C", fontStyle: "italic", borderLeft: `3px solid ${G}`, paddingLeft: 10, paddingTop: 4, paddingBottom: 4 }}>
              {booking.notes}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }} onClick={e => e.stopPropagation()}>
            <button onClick={() => onEdit(booking)} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid #EDEBE5", background: "#fff", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              <Pencil size={12} /> Edit
            </button>
            <button onClick={() => onDelete(booking.id)} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid #FECACA", background: "#FEF2F2", fontSize: 11, color: "#DC2626", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </div>
      )}

      {/* ── Active booking full controls ── */}
      {!isCompleted && (
        <div style={{ borderTop: "1px solid #F5F0EA", padding: "10px 16px", background: "#FAFAF8", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {isUnassigned ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle size={13} color="#F59E0B" />
              <Select onValueChange={(value) => onQuickAssign(booking.id, value)}>
                <SelectTrigger style={{ height: 30, fontSize: 11, width: 160 }}><SelectValue placeholder="Assign staff" /></SelectTrigger>
                <SelectContent>{staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          ) : null}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: "#A8A29E" }}>Status</span>
            <Select value={booking.status} onValueChange={(value) => onStatusUpdate(booking.id, value)}>
              <SelectTrigger style={{ height: 30, fontSize: 11, width: 130 }}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Scheduled</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="no_show">No Show</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
};
