import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sendSMS, SMS } from "@/lib/sms";
import { toast } from "sonner";
import { Clock, User, Phone, Scissors, Calendar, Send, X, CheckCircle2, RefreshCw } from "lucide-react";
import { format, parseISO } from "date-fns";



export default function WaitlistPage() {
const G = "#C8A97E", G_D = "#8B6914", CREAM = "#FAFAF8", WHITE = "#FFFFFF";
const BORDER = "#EDEBE5", TXT = "#1C160E", TXT_MID = "#78716C", TXT_SOFT = "#A8A29E";
const SHADOW = "0 1px 3px rgba(0,0,0,0.04),0 4px 20px rgba(0,0,0,0.06)";
const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  active:    { bg: "#F0FDF4", color: "#16A34A", label: "Waiting" },
  notified:  { bg: "#FEF9C3", color: "#CA8A04", label: "Notified" },
  booked:    { bg: "#EFF6FF", color: "#2563EB", label: "Booked" },
  expired:   { bg: "#F5F5F5", color: TXT_SOFT,  label: "Expired" },
  cancelled: { bg: "#FEF2F2", color: "#DC2626", label: "Cancelled" },
};
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"active" | "all">("active");

  const load = async () => {
    setLoading(true);
    let q = (supabase as any).from("waitlist").select("*, staff:staff_id(name), service:service_id(name,category)").order("created_at", { ascending: false });
    if (filter === "active") q = q.in("status", ["active", "notified"]);
    const { data } = await q;
    setEntries(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const markCancelled = async (id: string) => {
    await (supabase as any).from("waitlist").update({ status: "cancelled" }).eq("id", id);
    toast.success("Entry cancelled");
    load();
  };

  const sendSlotNotification = async (entry: any, slotDate: string, slotTime: string, staffName: string) => {
    const msg = [
      `Hi ${entry.client_name.split(" ")[0]}! 🌸 Good news from Zolara!`,
      ``,
      `A slot has opened up that matches your waitlist request:`,
      ``,
      `💆 Service: ${entry.service_name}`,
      `📅 Date: ${format(parseISO(slotDate), "EEEE, d MMMM")}`,
      `🕐 Time: ${slotTime}`,
      staffName ? `💅 Stylist: ${staffName}` : ``,
      ``,
      `⏰ This slot is held for 10 minutes. Book now to secure it:`,
      `🔗 zolarasalon.com/book`,
      ``,
      `Zolara Beauty Studio 💛`,
      `0594365314 / 0208848707`,
    ].filter(l => l !== undefined).join("\n");

    const ok = await sendSMS(entry.client_phone, msg);
    if (ok) {
      await (supabase as any).from("waitlist").update({
        status: "notified",
        notified_at: new Date().toISOString(),
        claim_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      }).eq("id", entry.id);
      toast.success(`SMS sent to ${entry.client_name}`);
      load();
    } else {
      toast.error("SMS failed");
    }
  };

  const activeCount = entries.filter(e => e.status === "active").length;
  const notifiedCount = entries.filter(e => e.status === "notified").length;

  return (
    <div style={{ background: CREAM, minHeight: "100vh", padding: "clamp(16px,4vw,32px)", fontFamily: "Montserrat,sans-serif", color: TXT }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Montserrat:wght@400;500;600;700&display=swap');`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", color: G, textTransform: "uppercase", margin: "0 0 4px" }}>Smart Waitlist</p>
          <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(28px,4vw,40px)", fontWeight: 700, color: TXT, margin: 0 }}>Waitlist</h1>
          <p style={{ fontSize: 12, color: TXT_SOFT, margin: "4px 0 0" }}>{activeCount} waiting · {notifiedCount} notified</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {(["active","all"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: "8px 16px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1.5px solid", borderColor: filter === f ? G_D : BORDER, background: filter === f ? "#FBF6EE" : WHITE, color: filter === f ? G_D : TXT_MID }}>
              {f === "active" ? "Active" : "All"}
            </button>
          ))}
          <button onClick={load} style={{ padding: "8px 10px", borderRadius: 20, border: `1.5px solid ${BORDER}`, background: WHITE, cursor: "pointer" }}>
            <RefreshCw size={14} color={TXT_SOFT} />
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: TXT_SOFT }}>Loading…</div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, background: WHITE, borderRadius: 16, border: `1px solid ${BORDER}` }}>
          <Clock size={32} style={{ color: TXT_SOFT, margin: "0 auto 12px", display: "block" }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: TXT_MID, margin: 0 }}>No waitlist entries</p>
          <p style={{ fontSize: 12, color: TXT_SOFT, marginTop: 4 }}>Clients who can't get a slot can join the waitlist from the booking page.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {entries.map(entry => {
            const sc = STATUS_COLORS[entry.status] || STATUS_COLORS.active;
            return (
              <div key={entry.id} style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "16px 20px", boxShadow: SHADOW }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flex: 1 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${G}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <User size={18} color={G_D} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: TXT, margin: 0 }}>{entry.client_name}</p>
                        <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: sc.bg, color: sc.color }}>{sc.label}</span>
                      </div>
                      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, color: TXT_MID, display: "flex", alignItems: "center", gap: 4 }}><Phone size={11} /> {entry.client_phone}</span>
                        <span style={{ fontSize: 12, color: TXT_MID, display: "flex", alignItems: "center", gap: 4 }}><Scissors size={11} /> {entry.service_name || entry.service?.name || "Any service"}</span>
                        <span style={{ fontSize: 12, color: TXT_MID, display: "flex", alignItems: "center", gap: 4 }}><Calendar size={11} /> {format(parseISO(entry.preferred_date), "EEE d MMM")}{entry.preferred_time ? ` · ${entry.preferred_time}` : " · Any time"}</span>
                        {entry.staff?.name && <span style={{ fontSize: 12, color: TXT_MID, display: "flex", alignItems: "center", gap: 4 }}><User size={11} /> {entry.staff.name}</span>}
                      </div>
                      {entry.notified_at && (
                        <p style={{ fontSize: 11, color: TXT_SOFT, marginTop: 4 }}>Notified {format(new Date(entry.notified_at), "d MMM h:mm a")}{entry.claim_expires_at && new Date(entry.claim_expires_at) > new Date() ? ` · Claim window open` : ` · Claim expired`}</p>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    {entry.status === "active" && (
                      <button onClick={() => {
                        const slotDate = prompt("Slot date (YYYY-MM-DD):", entry.preferred_date);
                        const slotTime = prompt("Slot time (HH:MM):", entry.preferred_time || "10:00");
                        const staffN = prompt("Stylist name:", entry.staff?.name || "");
                        if (slotDate && slotTime) sendSlotNotification(entry, slotDate, slotTime, staffN || "");
                      }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, background: `linear-gradient(135deg,${G},${G_D})`, color: WHITE, border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                        <Send size={13} /> Notify
                      </button>
                    )}
                    {["active","notified"].includes(entry.status) && (
                      <button onClick={() => markCancelled(entry.id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 10, background: WHITE, color: "#DC2626", border: "1px solid #FECACA", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        <X size={13} /> Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
