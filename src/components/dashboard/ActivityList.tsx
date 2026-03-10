import { format } from "date-fns";

interface ActivityItem {
  id: string;
  title: string;
  subtitle?: string;
  date: string;
  status?: string;
  amount?: number;
}

interface ActivityListProps {
  title: string;
  subtitle?: string;
  items: ActivityItem[];
  showAmount?: boolean;
  icon?: React.ReactNode;
  emptyMessage?: string;
}

const statusColors: Record<string, string> = {
  scheduled: "#7EB8E8",
  confirmed: "#7EE8A2",
  completed: "#C8A97E",
  cancelled: "#E87E7E",
  pending: "#E8C87A",
  no_show: "#E8A87E",
};

export const ActivityList = ({ title, subtitle, items, showAmount, icon, emptyMessage }: ActivityListProps) => (
  <div style={{ background: "linear-gradient(135deg, #1C160E, #2C2416)", border: "1px solid rgba(200,169,126,0.2)", borderRadius: "12px", padding: "24px" }}>
    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
      {icon && <div style={{ color: "#C8A97E" }}>{icon}</div>}
      <div>
        <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "20px", fontWeight: 600, color: "#F5EFE6", margin: 0 }}>{title}</h3>
        {subtitle && <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "11px", color: "rgba(245,239,230,0.4)", marginTop: "2px" }}>{subtitle}</p>}
      </div>
    </div>

    {items.length === 0 ? (
      <div style={{ textAlign: "center", padding: "32px 0", fontFamily: "'Montserrat', sans-serif", fontSize: "12px", color: "rgba(245,239,230,0.25)" }}>{emptyMessage || "Nothing yet"}</div>
    ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {items.slice(0, 6).map((item, i) => (
          <div key={item.id} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 14px", borderRadius: "8px",
            background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
            transition: "background 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(200,169,126,0.06)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent"}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg, #3D2F14, #2C2416)", border: "1px solid rgba(200,169,126,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "14px", color: "#C8A97E", fontWeight: 600 }}>{item.title?.[0] || "?"}</span>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "12px", fontWeight: 600, color: "#F5EFE6", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</div>
                {item.subtitle && <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "10px", color: "rgba(245,239,230,0.4)", marginTop: "1px" }}>{item.subtitle}</div>}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
              {item.status && (
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: statusColors[item.status] || "#C8A97E" }} />
              )}
              {showAmount && item.amount !== undefined ? (
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "15px", fontWeight: 600, color: "#7EE8A2" }}>GH₵{item.amount.toLocaleString()}</span>
              ) : (
                <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "10px", color: "rgba(245,239,230,0.3)" }}>{item.date ? format(new Date(item.date), "MMM d") : ""}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default ActivityList;
