import { useEffect, useState } from "react";
import { getWaitlist, updateWaitlistStatus, deleteWaitlistEntry } from "@/lib/waitlist";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  waiting: "z-badge z-badge-amber",
  notified: "z-badge z-badge-blue",
  booked: "z-badge z-badge-green",
  expired: "bg-gray-100 text-gray-600",
  cancelled: "z-badge z-badge-red",
};

export default function WaitlistManagement() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try { setEntries(await getWaitlist()); } catch { toast.error("Failed to load waitlist"); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleStatus = async (id: string, status: string) => {
    try { await updateWaitlistStatus(id, status); toast.success("Status updated"); load(); } catch { toast.error("Failed to update"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this entry?")) return;
    try { await deleteWaitlistEntry(id); toast.success("Removed"); load(); } catch { toast.error("Failed to remove"); }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading waitlist...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Waitlist</h2>
        <span className="text-sm text-muted-foreground">{entries.filter(e => e.status === "waiting").length} waiting</span>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No waitlist entries</div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Client","Phone","Service","Date","Time","Priority","Status","Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {entries.map(e => (
                <tr key={e.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{e.client_name || "—"}</td>
                  <td className="px-4 py-3">{e.client_phone || "—"}</td>
                  <td className="px-4 py-3">{e.services?.name || "—"}</td>
                  <td className="px-4 py-3">{e.preferred_date}</td>
                  <td className="px-4 py-3">{e.preferred_time}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${e.priority === 3 ? "z-badge z-badge-purple" : e.priority === 2 ? "bg-orange-100 text-orange-800" : "z-badge z-badge-gray"}`}>
                      {e.priority === 3 ? "VIP" : e.priority === 2 ? "High" : "Normal"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[e.status] || ""}`}>{e.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {e.status === "waiting" && (
                        <button onClick={() => handleStatus(e.id, "notified")} className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">Notify</button>
                      )}
                      {e.status === "notified" && (
                        <button onClick={() => handleStatus(e.id, "booked")} className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700">Booked</button>
                      )}
                      <button onClick={() => handleDelete(e.id)} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200">Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
