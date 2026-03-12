import React from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";

const WHITE = "#FFFFFF", BORDER = "#EDEBE5", TXT = "#1C160E", TXT_SOFT = "#A8A29E", G_D = "#8B6914", G = "#C8A97E", CREAM = "#FAFAF8";
const SHADOW = "0 1px 3px rgba(0,0,0,0.04),0 4px 16px rgba(0,0,0,0.06)";

const exportOptions = [
  { id: "bookings", label: "All Bookings", table: "bookings" },
  { id: "attendance", label: "All Attendance", table: "attendance" },
  { id: "payments", label: "All Sales/Payments", table: "payments" },
  { id: "clients", label: "All Clients", table: "clients" },
  { id: "staff", label: "All Staff", table: "staff" },
];

export function DataManagementSection() {
  const exportToExcel = async (tableName: string, fileName: string) => {
    try {
      const { data, error } = await supabase.from(tableName as any).select("*");
      if (error) throw error;
      if (!data || data.length === 0) { toast.info(`No data in ${fileName}`); return; }
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, fileName);
      XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success(`${fileName} exported!`);
    } catch { toast.error(`Failed to export ${fileName}`); }
  };

  return (
    <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "16px", overflow: "hidden", boxShadow: SHADOW }}>
      <div style={{ background: "linear-gradient(135deg,rgba(200,169,126,0.1),rgba(200,169,126,0.04))", padding: "14px 20px", borderBottom: `1px solid ${BORDER}` }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "20px", fontWeight: 700, color: TXT, margin: "0 0 2px" }}>Data Management</h2>
        <p style={{ fontSize: "11px", color: TXT_SOFT, margin: 0 }}>Export your data to Excel for backup or analysis</p>
      </div>
      <div style={{ padding: "20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: "10px" }}>
          {exportOptions.map(opt => (
            <button key={opt.id} onClick={() => exportToExcel(opt.table, opt.label)}
              style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", borderRadius: "10px", background: CREAM, color: TXT, border: `1px solid ${BORDER}`, fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "Montserrat,sans-serif", textAlign: "left" }}>
              <FileSpreadsheet style={{ width: "14px", height: "14px", color: G_D, flexShrink: 0 }} />
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
