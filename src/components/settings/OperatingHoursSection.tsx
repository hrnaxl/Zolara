import React from "react";
import { Switch } from "@/components/ui/switch";


interface OperatingHoursProps {
  openTime: string; closeTime: string; currency: string; use24HourFormat: boolean;
  onOpenTimeChange: (v: string) => void; onCloseTimeChange: (v: string) => void;
  onCurrencyChange: (v: string) => void; onFormatChange: (v: boolean) => void;
}

function to12(t: string) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hr = parseInt(h, 10);
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
}

export function OperatingHoursSection({ openTime, closeTime, currency, use24HourFormat, onOpenTimeChange, onCloseTimeChange, onCurrencyChange, onFormatChange }: OperatingHoursProps) {
  const G = "#C8A97E", G_D = "#8B6914", WHITE = "#FFFFFF", CREAM = "#FAFAF8"; const BORDER = "#EDEBE5", TXT = "#1C160E", TXT_MID = "#78716C", TXT_SOFT = "#A8A29E"; const GOLD = "#C8A97E", GOLD_DARK = "#8B6914", GOLD_LIGHT = "#FDF6E3";
  return (
    <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "16px", overflow: "hidden", boxShadow: SHADOW }}>
      <div style={{ background: "linear-gradient(135deg,rgba(200,169,126,0.1),rgba(200,169,126,0.04))", padding: "14px 20px", borderBottom: `1px solid ${BORDER}` }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "20px", fontWeight: 700, color: TXT, margin: 0 }}>Operating Hours & Currency</h2>
      </div>
      <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#FAFAF8", borderRadius: "12px", border: `1px solid ${BORDER}` }}>
          <div>
            <p style={{ fontSize: "13px", fontWeight: 600, color: TXT, margin: "0 0 2px" }}>Time Format</p>
            <p style={{ fontSize: "11px", color: TXT_SOFT, margin: 0 }}>
              {use24HourFormat ? `24-hour (${openTime} — ${closeTime})` : `12-hour (${to12(openTime)} — ${to12(closeTime)})`}
            </p>
          </div>
          <Switch checked={use24HourFormat} onCheckedChange={onFormatChange} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
          <div>
            <label style={lbl}>Opening Time</label>
            <input type="time" value={openTime} onChange={e => onOpenTimeChange(e.target.value)} style={inp} />
            {!use24HourFormat && openTime && <p style={{ fontSize: "10px", color: TXT_SOFT, marginTop: "4px" }}>{to12(openTime)}</p>}
          </div>
          <div>
            <label style={lbl}>Closing Time</label>
            <input type="time" value={closeTime} onChange={e => onCloseTimeChange(e.target.value)} style={inp} />
            {!use24HourFormat && closeTime && <p style={{ fontSize: "10px", color: TXT_SOFT, marginTop: "4px" }}>{to12(closeTime)}</p>}
          </div>
          <div>
            <label style={lbl}>Default Currency</label>
            <input value={currency} onChange={e => onCurrencyChange(e.target.value)} placeholder="GH₵" style={inp} />
          </div>
        </div>
      </div>
    </div>
  );
}
