import { useEffect, useState } from "react";
import { getAddons, createAddon, updateAddon, deleteAddon } from "@/lib/addons";
import { toast } from "sonner";

const CATEGORIES = ["general","hair","nails","beauty"];

export default function AddonsManagement() {
  const [addons, setAddons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", price: "", duration_minutes: "15", category: "general" });

  const load = async () => {
    try { setAddons(await getAddons()); } catch { toast.error("Failed to load add-ons"); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    if (!form.name || !form.price) { toast.error("Name and price required"); return; }
    try {
      await createAddon({ ...form, price: parseFloat(form.price), duration_minutes: parseInt(form.duration_minutes) });
      toast.success("Add-on created");
      setForm({ name: "", description: "", price: "", duration_minutes: "15", category: "general" });
      setShowForm(false);
      load();
    } catch { toast.error("Failed to create"); }
  };

  const handleToggle = async (id: string, is_active: boolean) => {
    try { await updateAddon(id, { is_active: !is_active }); load(); } catch { toast.error("Failed to update"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this add-on?")) return;
    try { await deleteAddon(id); toast.success("Deleted"); load(); } catch { toast.error("Failed to delete"); }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading add-ons...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Service Add-ons</h2>
        <button onClick={() => setShowForm(!showForm)} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
          + New Add-on
        </button>
      </div>

      {showForm && (
        <div className="border rounded-xl p-6 bg-muted/30 space-y-4">
          <h3 className="font-semibold">New Add-on</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium">Name *</label><input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium">Price (GHS) *</label><input type="number" value={form.price} onChange={e => setForm(f => ({...f, price: e.target.value}))} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium">Duration (mins)</label><input type="number" value={form.duration_minutes} onChange={e => setForm(f => ({...f, duration_minutes: e.target.value}))} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm">
                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div className="col-span-2"><label className="text-sm font-medium">Description</label><input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" /></div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSubmit} className="bg-primary text-white px-4 py-2 rounded-lg text-sm">Save Add-on</button>
            <button onClick={() => setShowForm(false)} className="border px-4 py-2 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {addons.map(a => (
          <div key={a.id} className={`border rounded-xl p-4 space-y-2 ${!a.is_active ? "opacity-50" : ""}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold">{a.name}</p>
                <p className="text-xs text-muted-foreground">{a.category} · {a.duration_minutes} min</p>
              </div>
              <p className="font-bold text-primary">GHS {a.price}</p>
            </div>
            {a.description && <p className="text-sm text-muted-foreground">{a.description}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={() => handleToggle(a.id, a.is_active)} className={`text-xs px-3 py-1 rounded-full border ${a.is_active ? "border-green-500 text-green-700" : "border-gray-300 text-gray-500"}`}>
                {a.is_active ? "Active" : "Inactive"}
              </button>
              <button onClick={() => handleDelete(a.id)} className="text-xs px-3 py-1 rounded-full border border-red-200 text-red-600">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
