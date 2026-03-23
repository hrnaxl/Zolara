import React, { useRef } from "react";
import { toast } from "sonner";
import { Download, Upload, AlertTriangle } from "lucide-react";

const btn = (gold = false): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", gap: "8px", padding: "9px 18px", borderRadius: "10px",
  background: gold ? G_D : WHITE, color: gold ? WHITE : G_D, border: gold ? "none" : `1.5px solid ${G}`,
  fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "Montserrat,sans-serif",
});

interface Props { settings: any; onRestore: (s: any) => void; }

export function BackupRestoreSection({ settings, onRestore }: Props) {
  const G = "#C8A97E", G_D = "#8B6914", WHITE = "#FFFFFF", CREAM = "#FAFAF8"; const BORDER = "#EDEBE5", TXT = "#1C160E", TXT_MID = "#78716C", TXT_SOFT = "#A8A29E"; const GOLD = "#C8A97E", GOLD_DARK = "#8B6914", GOLD_LIGHT = "#FDF6E3";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const exportSettings = () => {
    try {
      const blob = new Blob([JSON.stringify({ version: "1.0", exportedAt: new Date().toISOString(), settings }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `settings_backup_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      toast.success("Settings backup downloaded!");
    } catch { toast.error("Failed to create backup"); }
  };

  const importSettings = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const backup = JSON.parse(ev.target?.result as string);
        if (!backup.settings || !backup.version) throw new Error("Invalid backup");
        onRestore(backup.settings);
        toast.success("Settings restored! Click Save to apply.");
      } catch { toast.error("Invalid backup file"); }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "16px", overflow: "hidden", boxShadow: SHADOW }}>
      <div style={{ background: "linear-gradient(135deg,rgba(200,169,126,0.1),rgba(200,169,126,0.04))", padding: "14px 20px", borderBottom: `1px solid ${BORDER}` }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "20px", fontWeight: 700, color: TXT, margin: 0 }}>Backup & Restore</h2>
      </div>
      <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
        <p style={{ fontSize: "12px", color: TXT_SOFT, margin: 0 }}>Save your configuration to a JSON file or restore from a previous backup.</p>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px", borderRadius: "10px", background: "#FFFBEB", border: "1px solid #FDE68A" }}>
          <AlertTriangle style={{ width: "16px", height: "16px", color: "#D97706", flexShrink: 0 }} />
          <p style={{ fontSize: "12px", color: "#92400E", margin: 0 }}>Restoring will overwrite your current configuration. Save a backup first.</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={exportSettings} style={btn(false)}><Download style={{ width: "14px", height: "14px" }} />Download Backup</button>
          <button onClick={() => fileInputRef.current?.click()} style={btn(true)}><Upload style={{ width: "14px", height: "14px" }} />Restore from Backup</button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={importSettings} style={{ display: "none" }} />
        </div>
      </div>
    </div>
  );
}
