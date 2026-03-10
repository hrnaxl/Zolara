import { useState } from "react";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

export type DateFilterType = "today" | "week" | "month" | "custom";

interface DateFilterProps {
  currentFilter: DateFilterType;
  onFilterChange: (filter: DateFilterType, range: { start: Date; end: Date }) => void;
}

const OPTIONS: { key: DateFilterType; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
];

export const DateFilter = ({ currentFilter, onFilterChange }: DateFilterProps) => {
  const select = (key: DateFilterType) => {
    const now = new Date();
    const ranges: Record<DateFilterType, { start: Date; end: Date }> = {
      today: { start: startOfDay(now), end: endOfDay(now) },
      week: { start: startOfWeek(now), end: endOfWeek(now) },
      month: { start: startOfMonth(now), end: endOfMonth(now) },
      custom: { start: startOfDay(now), end: endOfDay(now) },
    };
    onFilterChange(key, ranges[key]);
  };

  return (
    <div style={{ display: "flex", gap: "4px", background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "4px", border: "1px solid rgba(200,169,126,0.15)" }}>
      {OPTIONS.map(o => (
        <button key={o.key} onClick={() => select(o.key)} style={{
          fontFamily: "'Montserrat', sans-serif",
          fontSize: "11px", fontWeight: 600,
          letterSpacing: "0.08em",
          padding: "7px 14px",
          borderRadius: "6px",
          border: "none",
          cursor: "pointer",
          transition: "all 0.2s",
          background: currentFilter === o.key ? "linear-gradient(135deg, #8B6914, #C8A97E)" : "transparent",
          color: currentFilter === o.key ? "#fff" : "rgba(245,239,230,0.45)",
        }}>
          {o.label}
        </button>
      ))}
    </div>
  );
};

export default DateFilter;
