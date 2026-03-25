// Shared phone normalization — always returns 0XXXXXXXXX (Ghana local format)
export function toLocal(raw) {
  const d = (raw || "").replace(/\D/g, "");
  if (d.startsWith("233") && d.length >= 12) return "0" + d.slice(3);
  if (d.startsWith("0") && d.length === 10) return d;
  if (d.length === 9) return "0" + d; // missing leading 0
  return d;
}

// For Arkesel SMS only — needs intl format
export function toIntl(raw) {
  const l = toLocal(raw);
  return l.startsWith("0") ? "233" + l.slice(1) : l;
}
