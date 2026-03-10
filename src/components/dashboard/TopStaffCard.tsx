interface TopStaffCardProps {
  data: { id: string; name: string; specialization?: string; bookings: number; revenue: number }[];
  title: string;
  subtitle?: string;
}

const MEDALS = ["🥇", "🥈", "🥉"];

export const TopStaffCard = ({ data, title, subtitle }: TopStaffCardProps) => {
  const max = data[0]?.bookings || 1;

  return (
    <div style={{ background: "linear-gradient(135deg, #1C160E, #2C2416)", border: "1px solid rgba(200,169,126,0.2)", borderRadius: "12px", padding: "24px" }}>
      <div style={{ marginBottom: "20px" }}>
        <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "20px", fontWeight: 600, color: "#F5EFE6", margin: 0 }}>{title}</h3>
        {subtitle && <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "11px", color: "rgba(245,239,230,0.4)", marginTop: "4px" }}>{subtitle}</p>}
      </div>

      {data.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 0", fontFamily: "'Montserrat', sans-serif", fontSize: "12px", color: "rgba(245,239,230,0.25)" }}>No staff data</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {data.slice(0, 5).map((s, i) => (
            <div key={s.id}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "16px" }}>{MEDALS[i] || "✦"}</span>
                  <div>
                    <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "12px", fontWeight: 600, color: "#F5EFE6" }}>{s.name}</div>
                    {s.specialization && <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "10px", color: "rgba(245,239,230,0.35)" }}>{s.specialization}</div>}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "15px", fontWeight: 600, color: "#C8A97E" }}>{s.bookings} bookings</div>
                  {s.revenue > 0 && <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "10px", color: "rgba(245,239,230,0.35)" }}>GH₵{s.revenue.toLocaleString()}</div>}
                </div>
              </div>
              <div style={{ height: "3px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(s.bookings / max) * 100}%`, background: i === 0 ? "linear-gradient(90deg, #E8C87A, #C8A97E)" : "rgba(200,169,126,0.4)", borderRadius: "2px", transition: "width 0.6s ease" }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TopStaffCard;
