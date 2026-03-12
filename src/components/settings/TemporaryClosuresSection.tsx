import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  closedDates: string[];
  onClosedDatesChange: (dates: string[]) => void;
}

export function TemporaryClosuresSection({ closedDates, onClosedDatesChange }: Props) {
  const [newDate, setNewDate] = useState("");
  const [newLabel, setNewLabel] = useState("");

  // closedDates stores "YYYY-MM-DD" or "YYYY-MM-DD|Label"
  const parsed = closedDates.map(d => {
    const [date, ...rest] = d.split("|");
    return { date, label: rest.join("|") || "" };
  });

  const addDate = () => {
    if (!newDate) return;
    const entry = newLabel.trim() ? `${newDate}|${newLabel.trim()}` : newDate;
    if (!closedDates.some(d => d.startsWith(newDate))) {
      onClosedDatesChange([...closedDates, entry].sort());
    }
    setNewDate("");
    setNewLabel("");
  };

  const removeDate = (dateStr: string) => {
    onClosedDatesChange(closedDates.filter(d => !d.startsWith(dateStr)));
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Card className="p-6 space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Temporary Closures</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Mark specific dates as closed — public booking page and landing page will show "CLOSED" on these days.
        </p>
      </div>

      <div className="flex gap-3 flex-wrap items-end">
        <div className="space-y-1">
          <Label>Date</Label>
          <Input type="date" value={newDate} min={today}
            onChange={e => setNewDate(e.target.value)} className="w-44" />
        </div>
        <div className="space-y-1 flex-1 min-w-[160px]">
          <Label>Reason (optional)</Label>
          <Input placeholder="e.g. Public holiday, Staff training"
            value={newLabel} onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addDate()} />
        </div>
        <Button onClick={addDate} disabled={!newDate} variant="outline">
          + Add Closure
        </Button>
      </div>

      {parsed.length > 0 ? (
        <div className="space-y-2">
          {parsed.map(({ date, label }) => {
            const isPast = date < today;
            return (
              <div key={date} className="flex items-center justify-between rounded-lg border px-4 py-2.5"
                style={{ opacity: isPast ? 0.5 : 1, background: isPast ? "#F9F9F9" : "#FFF8F0" }}>
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    {new Date(date + "T12:00:00").toLocaleDateString("en-GH", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}
                  </span>
                  {label && <span style={{ fontSize: 12, color: "#78716C" }}>— {label}</span>}
                  {isPast && <span style={{ fontSize: 10, color: "#A8A29E", fontWeight: 600, letterSpacing: "0.1em" }}>PAST</span>}
                </div>
                <button onClick={() => removeDate(date)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontSize: 16, lineHeight: 1 }}>
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">No temporary closures scheduled.</p>
      )}
    </Card>
  );
}
