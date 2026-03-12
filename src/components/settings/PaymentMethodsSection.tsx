import React from "react";
import { Switch } from "@/components/ui/switch";

const WHITE = "#FFFFFF", BORDER = "#EDEBE5", TXT = "#1C160E", TXT_SOFT = "#A8A29E", CREAM = "#FAFAF8";
const SHADOW = "0 1px 3px rgba(0,0,0,0.04),0 4px 16px rgba(0,0,0,0.06)";

interface PaymentMethod { id: string; name: string; enabled: boolean; }
interface Props { paymentMethods: PaymentMethod[]; onPaymentMethodToggle: (id: string, enabled: boolean) => void; }

export function PaymentMethodsSection({ paymentMethods, onPaymentMethodToggle }: Props) {
  return (
    <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "16px", overflow: "hidden", boxShadow: SHADOW }}>
      <div style={{ background: "linear-gradient(135deg,rgba(200,169,126,0.1),rgba(200,169,126,0.04))", padding: "14px 20px", borderBottom: `1px solid ${BORDER}` }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "20px", fontWeight: 700, color: TXT, margin: 0 }}>Payment Methods</h2>
      </div>
      <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {paymentMethods.map(m => (
          <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: "12px", background: m.enabled ? "#FBF6EE" : CREAM, border: `1px solid ${m.enabled ? "#F0E4CC" : BORDER}`, transition: "all 0.15s" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: TXT }}>{m.name}</span>
            <Switch checked={m.enabled} onCheckedChange={checked => onPaymentMethodToggle(m.id, checked)} />
          </div>
        ))}
      </div>
    </div>
  );
}
