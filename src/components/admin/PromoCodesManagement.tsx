import { useEffect, useState } from "react";
import { getPromoCodes, createPromoCode, updatePromoCode, deletePromoCode } from "@/lib/promoCodes";
import { useSettings } from "@/context/SettingsContext";
import { toast } from "sonner";

export default function PromoCodesManagement() {
  const { userRole, roleReady } = useSettings();
  // Block editing until role is confirmed from DB — prevents flash of edit buttons
  // Only allow editing when role is confirmed AND is explicitly an edit-capable role
  const canEdit = roleReady && userRole !== null && userRole !== "receptionist" && userRole !== "cleaner" && userRole !== "staff";

  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: "", description: "", discount_type: "percentage" as "percentage"|"fixed_amount",
    discount_value: "", minimum_amount: "", max_uses: "", expires_at: "",
  });

  const load = async () => {
    try { setCodes(await getPromoCodes()); } catch { toast.error("Failed to load promo codes"); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    if (!canEdit) return;
    if (!form.code || !form.discount_value) { toast.error("Code and discount value required"); return; }
    try {
      await createPromoCode({
        code: form.code, description: form.description,
        discount_type: form.discount_type, discount_value: parseFloat(form.discount_value),
        minimum_amount: form.minimum_amount ? parseFloat(form.minimum_amount) : 0,
        max_uses: form.max_uses ? parseInt(form.max_uses) : undefined,
        expires_at: form.expires_at || undefined, is_active: true,
      });
      toast.success("Promo code created");
      setShowForm(false);
      setForm({ code: "", description: "", discount_type: "percentage", discount_value: "", minimum_amount: "", max_uses: "", expires_at: "" });
      load();
    } catch (e: any) { toast.error(e.message || "Failed to create"); }
  };

  const handleToggle = async (id: string, is_active: boolean) => {
    if (!canEdit) return;
    try { await updatePromoCode(id, { is_active: !is_active }); load(); } catch { toast.error("Failed to update"); }
  };

  const handleDelete = async (id: string) => {
    if (!canEdit) return;
    if (!confirm("Delete this promo code?")) return;
    try { await deletePromoCode(id); toast.success("Deleted"); load(); } catch { toast.error("Failed to delete"); }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading promo codes...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Promo Codes</h2>
          {!canEdit && (
            <p className="text-sm text-muted-foreground mt-1">View only — contact the owner to make changes.</p>
          )}
        </div>
        {canEdit && (
          <button onClick={() => setShowForm(!showForm)} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
            + New Code
          </button>
        )}
      </div>

      {showForm && canEdit && (
        <div className="border rounded-xl p-6 bg-muted/30 space-y-4">
          <h3 className="font-semibold">New Promo Code</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium">Code *</label><input value={form.code} onChange={e => setForm(f=>({...f,code:e.target.value.toUpperCase()}))} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm font-mono" placeholder="e.g. SAVE20" /></div>
            <div><label className="text-sm font-medium">Discount Type</label>
              <select value={form.discount_type} onChange={e => setForm(f=>({...f,discount_type:e.target.value as any}))} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm">
                <option value="percentage">Percentage (%)</option>
                <option value="fixed_amount">Fixed Amount (GHS)</option>
              </select>
            </div>
            <div><label className="text-sm font-medium">Discount Value *</label><input type="number" value={form.discount_value} onChange={e=>setForm(f=>({...f,discount_value:e.target.value}))} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium">Minimum Purchase (GHS)</label><input type="number" value={form.minimum_amount} onChange={e=>setForm(f=>({...f,minimum_amount:e.target.value}))} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium">Max Uses</label><input type="number" value={form.max_uses} onChange={e=>setForm(f=>({...f,max_uses:e.target.value}))} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" placeholder="Leave blank for unlimited" /></div>
            <div><label className="text-sm font-medium">Expires At</label><input type="date" value={form.expires_at} onChange={e=>setForm(f=>({...f,expires_at:e.target.value}))} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" /></div>
            <div className="col-span-2"><label className="text-sm font-medium">Description</label><input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" /></div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSubmit} className="bg-primary text-white px-4 py-2 rounded-lg text-sm">Save Code</button>
            <button onClick={() => setShowForm(false)} className="border px-4 py-2 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {["Code","Type","Value","Min. Purchase","Uses","Expires","Status", ...(canEdit ? ["Actions"] : [])].map(h=>(
                <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {codes.map(c=>(
              <tr key={c.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-mono font-bold">{c.code}</td>
                <td className="px-4 py-3">{c.discount_type === "percentage" ? "%" : "GHS"}</td>
                <td className="px-4 py-3 font-semibold text-primary">{c.discount_type === "percentage" ? `${c.discount_value}%` : `GHS ${c.discount_value}`}</td>
                <td className="px-4 py-3">{c.minimum_amount > 0 ? `GHS ${c.minimum_amount}` : "—"}</td>
                <td className="px-4 py-3">{c.used_count} {c.max_uses ? `/ ${c.max_uses}` : "/ ∞"}</td>
                <td className="px-4 py-3">{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "Never"}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.is_active ? "z-badge z-badge-green" : "bg-gray-100 text-gray-600"}`}>
                    {c.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                {canEdit && (
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={()=>handleToggle(c.id,c.is_active)} className="text-xs border px-2 py-1 rounded hover:bg-muted">
                        {c.is_active ? "Disable" : "Enable"}
                      </button>
                      <button onClick={()=>handleDelete(c.id)} className="text-xs border border-red-200 text-red-600 px-2 py-1 rounded hover:bg-red-50">
                        Delete
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {codes.length === 0 && <div className="text-center py-12 text-muted-foreground">No promo codes yet</div>}
      </div>
    </div>
  );
}
