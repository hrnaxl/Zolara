import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface RevenueChartProps {
  data: { name: string; revenue: number; bookings?: number }[];
  title: string;
  subtitle?: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#1C160E", border: "1px solid rgba(200,169,126,0.3)", borderRadius: "8px", padding: "12px 16px", fontFamily: "'Montserrat', sans-serif" }}>
      <p style={{ fontSize: "11px", color: "rgba(245,239,230,0.5)", marginBottom: "6px", letterSpacing: "0.1em" }}>{label}</p>
      <p style={{ fontSize: "16px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, color: "#C8A97E" }}>GH₵{payload[0].value.toLocaleString()}</p>
    </div>
  );
};

export const RevenueChart = ({ data, title, subtitle }: RevenueChartProps) => (
  <div style={{ background: "linear-gradient(135deg, #1C160E, #2C2416)", border: "1px solid rgba(200,169,126,0.2)", borderRadius: "12px", padding: "24px" }}>
    <div style={{ marginBottom: "24px" }}>
      <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "20px", fontWeight: 600, color: "#F5EFE6", margin: 0 }}>{title}</h3>
      {subtitle && <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "11px", color: "rgba(245,239,230,0.4)", marginTop: "4px" }}>{subtitle}</p>}
    </div>
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#C8A97E" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#C8A97E" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(200,169,126,0.08)" />
        <XAxis dataKey="name" tick={{ fill: "rgba(245,239,230,0.3)", fontSize: 10, fontFamily: "Montserrat" }} axisLine={false} tickLine={false} interval={4} />
        <YAxis tick={{ fill: "rgba(245,239,230,0.3)", fontSize: 10, fontFamily: "Montserrat" }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="revenue" stroke="#C8A97E" strokeWidth={2} fill="url(#goldGrad)" dot={false} activeDot={{ r: 5, fill: "#C8A97E", strokeWidth: 0 }} />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

export default RevenueChart;
