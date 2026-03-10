import { AlertTriangle, Info, CheckCircle } from "lucide-react";

export interface Alert {
  id: string;
  type: "warning" | "info" | "success";
  message: string;
}

export const generateAlerts = ({ todayBookings, pendingRequests, absentStaff, lowBookingThreshold = 3 }: {
  todayBookings: number; pendingRequests: number; absentStaff: string[]; lowBookingThreshold?: number;
}): Alert[] => {
  const alerts: Alert[] = [];
  if (pendingRequests > 0) alerts.push({ id: "pending", type: "warning", message: `${pendingRequests} booking request${pendingRequests > 1 ? "s" : ""} awaiting approval` });
  if (absentStaff.length > 0) alerts.push({ id: "absent", type: "warning", message: `${absentStaff.length} staff not checked in: ${absentStaff.slice(0, 2).join(", ")}${absentStaff.length > 2 ? ` +${absentStaff.length - 2} more` : ""}` });
  if (todayBookings < lowBookingThreshold && todayBookings >= 0) alerts.push({ id: "low", type: "info", message: `Only ${todayBookings} booking${todayBookings !== 1 ? "s" : ""} today. Consider a promo push.` });
  if (alerts.length === 0) alerts.push({ id: "all-good", type: "success", message: "Everything looks great! No issues to flag today." });
  return alerts;
};

const icons = {
  warning: <AlertTriangle size={14} style={{ color: "#E8C87A" }} />,
  info: <Info size={14} style={{ color: "#7EB8E8" }} />,
  success: <CheckCircle size={14} style={{ color: "#7EE8A2" }} />,
};

const colors = {
  warning: { bg: "rgba(232,200,122,0.08)", border: "rgba(232,200,122,0.2)", text: "#E8C87A" },
  info: { bg: "rgba(126,184,232,0.08)", border: "rgba(126,184,232,0.2)", text: "#7EB8E8" },
  success: { bg: "rgba(126,232,162,0.08)", border: "rgba(126,232,162,0.2)", text: "#7EE8A2" },
};

export const AlertsPanel = ({ alerts }: { alerts: Alert[] }) => (
  <div style={{ background: "linear-gradient(135deg, #1C160E, #2C2416)", border: "1px solid rgba(200,169,126,0.2)", borderRadius: "12px", padding: "24px" }}>
    <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "20px", fontWeight: 600, color: "#F5EFE6", margin: "0 0 16px" }}>Alerts</h3>
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {alerts.map(a => {
        const c = colors[a.type];
        return (
          <div key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "12px 14px", borderRadius: "8px", background: c.bg, border: `1px solid ${c.border}` }}>
            <div style={{ flexShrink: 0, marginTop: "1px" }}>{icons[a.type]}</div>
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "12px", color: "#F5EFE6", lineHeight: 1.5, fontWeight: 400 }}>{a.message}</span>
          </div>
        );
      })}
    </div>
  </div>
);

export default AlertsPanel;
