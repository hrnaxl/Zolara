interface PaymentMethodChartProps {
  data: { method: string; amount: number; count: number; percentage: number }[];
  title: string;
}

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash", momo: "Mobile Money", card: "Card / Hubtel",
  bank_transfer: "Bank Transfer", gift_card: "Gift Card",
  mtn: "MTN MoMo", vodafone: "Vodafone Cash", airteltigo: "AirtelTigo",
};

const METHOD_COLORS: Record<string, string> = {
  cash: "#C8A97E", momo: "#7EB8E8", card: "#7EE8A2",
  bank_transfer: "#C87EE8", gift_card: "#E8C87A",
  mtn: "#E8A87E", vodafone: "#7EE8D4", airteltigo: "#E87EB8",
};

export const PaymentMethodChart = ({ data, title }: PaymentMethodChartProps) => {
  const total = data.reduce((s, d) => s + d.amount, 0);

  return (
    <div style={{ background: "linear-gradient(135deg, #1C160E, #2C2416)", border: "1px solid rgba(200,169,126,0.2)", borderRadius: "12px", padding: "24px" }}>
      <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "20px", fontWeight: 600, color: "#F5EFE6", margin: "0 0 20px" }}>{title}</h3>

      {data.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 0", fontFamily: "'Montserrat', sans-serif", fontSize: "12px", color: "rgba(245,239,230,0.25)" }}>No payment data</div>
      ) : (
        <>
          {/* Stacked bar */}
          <div style={{ height: "8px", borderRadius: "4px", overflow: "hidden", display: "flex", marginBottom: "20px", gap: "2px" }}>
            {data.map((d, i) => (
              <div key={i} style={{ height: "100%", width: `${(d.amount / (total || 1)) * 100}%`, background: METHOD_COLORS[d.method] || "#C8A97E", borderRadius: "2px", minWidth: d.amount > 0 ? "4px" : "0" }} />
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {data.map((d, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: METHOD_COLORS[d.method] || "#C8A97E", flexShrink: 0 }} />
                  <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "12px", color: "rgba(245,239,230,0.7)" }}>{METHOD_LABELS[d.method] || d.method}</span>
                  <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "10px", color: "rgba(245,239,230,0.3)" }}>{d.count}x</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "15px", fontWeight: 600, color: "#F5EFE6" }}>GH₵{d.amount.toLocaleString()}</span>
                  <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "10px", color: "rgba(245,239,230,0.3)", marginLeft: "8px" }}>{d.percentage.toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default PaymentMethodChart;
