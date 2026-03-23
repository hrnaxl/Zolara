import React from "react";


const ICONS: Record<string, { icon: string; desc: string; color: string; bg: string }> = {
  cash:          { icon: "💵", desc: "Physical notes accepted at counter", color: "#15803D", bg: "#F0FDF4" },
  mobile_money:  { icon: "📱", desc: "MTN MoMo, Vodafone Cash, AirtelTigo", color: "#7C3AED", bg: "#F5F3FF" },
  card:          { icon: "💳", desc: "Visa, Mastercard via POS terminal",   color: "#2563EB", bg: "#EFF6FF" },
  bank_transfer: { icon: "🏦", desc: "Direct bank transfer / GHIPSS",       color: "#D97706", bg: "#FFFBEB" },
  gift_card:     { icon: "🎁", desc: "Zolara gift cards (all tiers)",       color: "#DB2777", bg: "#FDF2F8" },
};

interface PaymentMethod { id: string; name: string; enabled: boolean; }
interface Props { paymentMethods: PaymentMethod[]; onPaymentMethodToggle: (id: string, enabled: boolean) => void; }

export function PaymentMethodsSection({ paymentMethods, onPaymentMethodToggle }: Props) {
  const G = "#C8A97E", G_D = "#8B6914", WHITE = "#FFFFFF", CREAM = "#FAFAF8"; const BORDER = "#EDEBE5", TXT = "#1C160E", TXT_MID = "#78716C", TXT_SOFT = "#A8A29E"; const GOLD = "#C8A97E", GOLD_DARK = "#8B6914", GOLD_LIGHT = "#FDF6E3";
  const enabled = paymentMethods.filter(m => m.enabled);
  const disabled = paymentMethods.filter(m => !m.enabled);

  const Card = ({ m }: { m: PaymentMethod }) => {
    const meta = ICONS[m.id] || { icon: "💰", desc: "Payment method", color: "#6B7280", bg: CREAM };
    return (
      <div
        onClick={() => onPaymentMethodToggle(m.id, !m.enabled)}
        style={{
          display: "flex", alignItems: "center", gap: 16,
          padding: "16px 20px", borderRadius: 14, cursor: "pointer",
          background: m.enabled ? meta.bg : WHITE,
          border: `1.5px solid ${m.enabled ? meta.color + "33" : BORDER}`,
          transition: "all 0.2s", position: "relative", overflow: "hidden",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = ""; }}
      >
        {/* Icon */}
        <div style={{
          width: 48, height: 48, borderRadius: 12, flexShrink: 0,
          background: m.enabled ? meta.color + "18" : "#F4F4F4",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, transition: "all 0.2s",
        }}>
          {meta.icon}
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: m.enabled ? TXT : TXT_SOFT, margin: "0 0 3px", fontFamily: "'Montserrat',sans-serif", transition: "color 0.2s" }}>
            {m.name}
          </p>
          <p style={{ fontSize: 11, color: TXT_SOFT, margin: 0, fontFamily: "'Montserrat',sans-serif", lineHeight: 1.4 }}>
            {meta.desc}
          </p>
        </div>

        {/* Toggle */}
        <div style={{
          width: 48, height: 26, borderRadius: 13, flexShrink: 0,
          background: m.enabled ? `linear-gradient(135deg,${GOLD_DARK},${GOLD})` : "#D1C5B8",
          position: "relative", transition: "background 0.25s", boxShadow: m.enabled ? `0 2px 8px ${GOLD}66` : "none",
        }}>
          <div style={{
            position: "absolute", top: 3, left: m.enabled ? 25 : 3,
            width: 20, height: 20, borderRadius: "50%",
            background: "white", transition: "left 0.25s",
            boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
          }} />
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, fontWeight: 600, color: TXT, margin: "0 0 6px" }}>Payment Methods</h2>
        <p style={{ fontSize: 13, color: TXT_SOFT, margin: 0, fontFamily: "'Montserrat',sans-serif" }}>
          Control which payment methods are available to clients on the booking page.
          Toggle to enable or disable.
        </p>
      </div>

      {/* Summary strip */}
      <div style={{ background: GOLD_LIGHT, border: `1px solid ${GOLD}55`, borderRadius: 12, padding: "12px 18px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 18 }}>✦</span>
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: GOLD_DARK, margin: "0 0 2px", fontFamily: "'Montserrat',sans-serif" }}>
            {enabled.length} of {paymentMethods.length} methods active
          </p>
          <p style={{ fontSize: 11, color: TXT_MID, margin: 0, fontFamily: "'Montserrat',sans-serif" }}>
            {enabled.length > 0 ? enabled.map(m => m.name).join(", ") : "No methods enabled — clients cannot book"}
          </p>
        </div>
      </div>

      {/* Active */}
      {enabled.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", color: "#15803D", marginBottom: 10, fontFamily: "'Montserrat',sans-serif" }}>ACTIVE</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {enabled.map(m => <Card key={m.id} m={m} />)}
          </div>
        </div>
      )}

      {/* Inactive */}
      {disabled.length > 0 && (
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", color: TXT_SOFT, marginBottom: 10, fontFamily: "'Montserrat',sans-serif" }}>INACTIVE</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {disabled.map(m => <Card key={m.id} m={m} />)}
          </div>
        </div>
      )}

      <p style={{ fontSize: 11, color: TXT_SOFT, marginTop: 16, fontFamily: "'Montserrat',sans-serif" }}>
        Click any card to toggle. Remember to save settings after making changes.
      </p>
    </div>
  );
}
