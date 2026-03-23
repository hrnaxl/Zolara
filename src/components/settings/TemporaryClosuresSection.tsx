import React, { useState } from "react";


interface Props { closedDates: string[]; onClosedDatesChange: (dates: string[]) => void; }

export function TemporaryClosuresSection({ closedDates, onClosedDatesChange }: Props) {
  const G = "#C8A97E", G_D = "#8B6914", WHITE = "#FFFFFF", CREAM = "#FAFAF8"; const BORDER = "#EDEBE5", TXT = "#1C160E", TXT_MID = "#78716C", TXT_SOFT = "#A8A29E"; const GOLD = "#C8A97E", GOLD_DARK = "#8B6914", GOLD_LIGHT = "#FDF6E3";
  const [newDate, setNewDate] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const parsed = closedDates.map(d => { const [date, ...rest] = d.split("|"); return { date, label: rest.join("|") || "" }; });
  const today = new Date().toISOString().slice(0, 10);

  const addDate = () => {
    if (!newDate) return;
    const entry = newLabel.trim() ? `${newDate}|${newLabel.trim()}` : newDate;
    if (!closedDates.some(d => d.startsWith(newDate))) onClosedDatesChange([...closedDates, entry].sort());
    setNewDate(""); setNewLabel("");
  };

  return (
    <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "16px", overflow: "hidden", boxShadow: SHADOW }}>
      <div style={{ background: "linear-gradient(135deg,rgba(200,169,126,0.1),rgba(200,169,126,0.04))", padding: "14px 20px", borderBottom: `1px solid ${BORDER}` }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "20px", fontWeight: 700, color: TXT, margin: "0 0 2px" }}>Temporary Closures</h2>
        <p style={{ fontSize: "11px", color: TXT_SOFT, margin: 0 }}>Mark specific dates as closed. Booking page will show CLOSED on these days.</p>
      </div>
      <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <p style={{ fontSize: "10px", fontWeight: 700, color: TXT_SOFT, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>Date</p>
            <input type="date" value={newDate} min={today} onChange={e => setNewDate(e.target.value)} style={{ ...inp, width: "160px" }} />
          </div>
          <div style={{ flex: 1, minWidth: "180px" }}>
            <p style={{ fontSize: "10px", fontWeight: 700, color: TXT_SOFT, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>Reason (optional)</p>
            <input placeholder="e.g. Public holiday, Staff training" value={newLabel} onChange={e => setNewLabel(e.target.value)} onKeyDown={e => e.key === "Enter" && addDate()} style={{ ...inp, width: "100%" }} />
          </div>
          <button onClick={addDate} disabled={!newDate} style={{ padding: "9px 18px", borderRadius: "10px", background: newDate ? G_D : "#E5E0D8", color: WHITE, border: "none", fontSize: "12px", fontWeight: 600, cursor: newDate ? "pointer" : "not-allowed", fontFamily: "Montserrat,sans-serif", whiteSpace: "nowrap" }}>
            + Add Closure
          </button>
        </div>

        {parsed.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {parsed.map(({ date, label }) => {
              const isPast = date < today;
              return (
                <div key={date} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderRadius: "12px", border: `1px solid ${isPast ? BORDER : "#F0E4CC"}`, background: isPast ? CREAM : "#FBF6EE", opacity: isPast ? 0.65 : 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: TXT }}>
                      {new Date(date + "T12:00:00").toLocaleDateString("en-GH", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}
                    </span>
                    {label && <span style={{ fontSize: "12px", color: TXT_MID }}>— {label}</span>}
                    {isPast && <span style={{ fontSize: "10px", color: TXT_SOFT, fontWeight: 700, letterSpacing: "0.1em" }}>PAST</span>}
                  </div>
                  <button onClick={() => onClosedDatesChange(closedDates.filter(d => !d.startsWith(date)))}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontSize: "16px", lineHeight: 1 }}>✕</button>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ fontSize: "12px", color: TXT_SOFT, fontStyle: "italic", margin: 0 }}>No temporary closures scheduled.</p>
        )}
      </div>
    </div>
  );
}
