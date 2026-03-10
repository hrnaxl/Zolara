import { format } from "date-fns";
import { RefreshCw } from "lucide-react";

interface SyncStatusProps {
  lastSync: Date | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export const SyncStatus = ({ lastSync, isLoading, onRefresh }: SyncStatusProps) => (
  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
    {lastSync && (
      <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "10px", color: "rgba(245,239,230,0.3)" }}>
        Synced {format(lastSync, "h:mm a")}
      </span>
    )}
    <button onClick={onRefresh} disabled={isLoading} style={{
      background: "rgba(200,169,126,0.1)", border: "1px solid rgba(200,169,126,0.2)",
      borderRadius: "6px", padding: "6px", cursor: "pointer", display: "flex",
      alignItems: "center", justifyContent: "center", transition: "all 0.2s",
    }}>
      <RefreshCw size={12} style={{ color: "#C8A97E", animation: isLoading ? "spin 1s linear infinite" : "none" }} />
    </button>
  </div>
);

export default SyncStatus;
