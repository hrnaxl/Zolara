import React from "react";

interface PaymentMethod {
  id: string;
  name: string;
  enabled: boolean;
}

interface Props {
  paymentMethods: PaymentMethod[];
  onPaymentMethodToggle: (id: string, enabled: boolean) => void;
}

const METHOD_INFO: Record<string, { icon: string; desc: string }> = {
  cash:          { icon: "💵", desc: "Physical cash at the studio" },
  mobile_money:  { icon: "📱", desc: "MTN MoMo, Telecel Cash, AirtelTigo" },
  card:          { icon: "💳", desc: "Visa / Mastercard via Paystack" },
  bank_transfer: { icon: "🏦", desc: "Direct bank transfer" },
  gift_card:     { icon: "🎁", desc: "Zolara gift card redemption" },
};

export function PaymentMethodsSection({ paymentMethods, onPaymentMethodToggle }: Props) {
  const ALL_IDS = ["cash", "mobile_money", "card", "bank_transfer", "gift_card"];
  const ALL_NAMES: Record<string,string> = { cash:"Cash", mobile_money:"Mobile Money", card:"Card", bank_transfer:"Bank Transfer", gift_card:"Gift Card" };

  // Ensure we always show all 5 methods
  const methods = ALL_IDS.map(id => {
    const found = paymentMethods.find(m => m.id === id);
    return found || { id, name: ALL_NAMES[id], enabled: false };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <p style={{ fontFamily: "Montserrat,sans-serif", fontSize: 12, color: "#A8A29E", margin: "0 0 8px" }}>
        Toggle the payment methods you accept. Click Save Settings to persist.
      </p>
      {methods.map(m => {
        const info = METHOD_INFO[m.id] || { icon: "💰", desc: "" };
        return (
          <div key={m.id} onClick={() => onPaymentMethodToggle(m.id, !m.enabled)}
            style={{
              display: "flex", alignItems: "center", gap: 14, padding: "14px 18px",
              borderRadius: 12, cursor: "pointer", userSelect: "none",
              background: m.enabled ? "#FAFAF8" : "#fff",
              border: m.enabled ? "1.5px solid #C8A97E" : "1.5px solid #EDEBE5",
              transition: "all 0.15s",
            }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>{info.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "Montserrat,sans-serif", fontSize: 13, fontWeight: 700, color: "#1C160E" }}>{m.name}</div>
              <div style={{ fontFamily: "Montserrat,sans-serif", fontSize: 11, color: "#A8A29E" }}>{info.desc}</div>
            </div>
            <div style={{
              width: 40, height: 22, borderRadius: 11, flexShrink: 0, position: "relative",
              background: m.enabled ? "linear-gradient(135deg,#C8A97E,#8B6914)" : "#EDEBE5",
              transition: "background 0.15s",
            }}>
              <div style={{
                position: "absolute", top: 2, width: 18, height: 18, borderRadius: "50%",
                background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                left: m.enabled ? 20 : 2, transition: "left 0.15s",
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default PaymentMethodsSection;
