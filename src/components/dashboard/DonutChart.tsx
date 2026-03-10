import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface DonutChartProps {
  data: { name: string; value: number; color: string }[];
  title: string;
  subtitle?: string;
  centerValue?: number;
  centerLabel?: string;
}

export const DonutChart = ({ data, title, subtitle, centerValue, centerLabel }: DonutChartProps) => (
  <div style={{ background: "linear-gradient(135deg, #1C160E, #2C2416)", border: "1px solid rgba(200,169,126,0.2)", borderRadius: "12px", padding: "24px", height: "100%" }}>
    <div style={{ marginBottom: "20px" }}>
      <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "20px", fontWeight: 600, color: "#F5EFE6", margin: 0 }}>{title}</h3>
      {subtitle && <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "11px", color: "rgba(245,239,230,0.4)", marginTop: "4px" }}>{subtitle}</p>}
    </div>
    <div style={{ position: "relative" }}>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
            {data.map((entry, i) => <Cell key={i} fill={entry.color} strokeWidth={0} />)}
          </Pie>
          <Tooltip formatter={(val: number) => [val, ""]} contentStyle={{ background: "#1C160E", border: "1px solid rgba(200,169,126,0.3)", borderRadius: "8px", fontFamily: "Montserrat", fontSize: "12px", color: "#F5EFE6" }} />
        </PieChart>
      </ResponsiveContainer>
      {centerValue !== undefined && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", pointerEvents: "none" }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "26px", fontWeight: 600, color: "#C8A97E", lineHeight: 1 }}>{centerValue}</div>
          <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "9px", color: "rgba(245,239,230,0.4)", letterSpacing: "0.1em", marginTop: "2px" }}>{centerLabel?.toUpperCase()}</div>
        </div>
      )}
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "16px" }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: d.color, flexShrink: 0 }} />
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "11px", color: "rgba(245,239,230,0.6)" }}>{d.name}</span>
          </div>
          <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "11px", fontWeight: 600, color: "#F5EFE6" }}>{d.value}</span>
        </div>
      ))}
    </div>
  </div>
);

export default DonutChart;
