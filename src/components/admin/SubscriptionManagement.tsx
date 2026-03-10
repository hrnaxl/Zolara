import { useEffect, useState } from "react";
import { getSubscriptionPlans, createSubscriptionPlan, updateSubscriptionPlan, getAllSubscriptions } from "@/lib/subscriptions";
import { toast } from "sonner";

const BILLING_CYCLES = ["monthly", "quarterly", "yearly"];
const TIER_COLORS: Record<string, string> = {
  "Beauty Basic": "border-gray-300 bg-gray-50",
  "Beauty Plus": "border-blue-300 bg-blue-50",
  "Beauty Premium": "border-yellow-400 bg-yellow-50",
};

export default function SubscriptionManagement() {
  const [plans, setPlans] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [tab, setTab] = useState<"plans" | "subscribers">("plans");
  const [form, setForm] = useState({
    name: "", description: "", billing_cycle: "monthly",
    price: "", max_services_per_cycle: "", discount_percentage: "",
    features: "",
  });

  const load = async () => {
    try {
      const [p, s] = await Promise.all([getSubscriptionPlans(), getAllSubscriptions()]);
      setPlans(p || []);
      setSubscriptions(s || []);
    } catch { toast.error("Failed to load subscriptions"); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({ name:"",description:"",billing_cycle:"monthly",price:"",max_services_per_cycle:"",discount_percentage:"",features:"" });
    setEditId(null); setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.price) { toast.error("Name and price required"); return; }
    try {
      const data = {
        name: form.name, description: form.description,
        billing_cycle: form.billing_cycle, price: parseFloat(form.price),
        max_services_per_cycle: form.max_services_per_cycle ? parseInt(form.max_services_per_cycle) : null,
        discount_percentage: form.discount_percentage ? parseFloat(form.discount_percentage) : 0,
        features: form.features ? form.features.split("\n").filter(Boolean) : [],
      };
      if (editId) { await updateSubscriptionPlan(editId, data); toast.success("Plan updated"); }
      else { await createSubscriptionPlan(data as any); toast.success("Plan created"); }
      resetForm(); load();
    } catch (e: any) { toast.error(e.message || "Failed to save"); }
  };

  const handleEdit = (p: any) => {
    setForm({
      name: p.name, description: p.description || "",
      billing_cycle: p.billing_cycle, price: p.price.toString(),
      max_services_per_cycle: p.max_services_per_cycle?.toString() || "",
      discount_percentage: p.discount_percentage?.toString() || "",
      features: Array.isArray(p.features) ? p.features.join("\n") : "",
    });
    setEditId(p.id); setShowForm(true);
  };

  const handleToggle = async (id: string, is_active: boolean) => {
    try { await updateSubscriptionPlan(id, { is_active: !is_active }); load(); } catch { toast.error("Failed"); }
  };

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-800", cancelled: "bg-red-100 text-red-800",
    paused: "bg-yellow-100 text-yellow-800", expired: "bg-gray-100 text-gray-600",
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading subscriptions...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Subscriptions</h2>
        {tab === "plans" && <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">+ New Plan</button>}
      </div>

      <div className="flex gap-1 border-b">
        {(["plans", "subscribers"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t} {t === "subscribers" ? `(${subscriptions.filter(s => s.status === "active").length} active)` : `(${plans.length})`}
          </button>
        ))}
      </div>

      {tab === "plans" && (
        <>
          {showForm && (
            <div className="border rounded-xl p-6 bg-muted/30 space-y-4">
              <h3 className="font-semibold">{editId ? "Edit Plan" : "New Subscription Plan"}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium">Plan Name *</label><input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" placeholder="e.g. Beauty Premium" /></div>
                <div><label className="text-sm font-medium">Price (GHS) *</label><input type="number" value={form.price} onChange={e => setForm(f => ({...f, price: e.target.value}))} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-sm font-medium">Billing Cycle</label>
                  <select value={form.billing_cycle} onChange={e => setForm(f => ({...f, billing_cycle: e.target.value}))} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm">
                    {BILLING_CYCLES.map(c => <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
                <div><label className="text-sm font-medium">Max Services / Cycle</label><input type="number" value={form.max_services_per_cycle} onChange={e => setForm(f => ({...f, max_services_per_cycle: e.target.value}))} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" placeholder="Leave blank for unlimited" /></div>
                <div><label className="text-sm font-medium">Discount (%)</label><input type="number" value={form.discount_percentage} onChange={e => setForm(f => ({...f, discount_percentage: e.target.value}))} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" /></div>
                <div className="col-span-2"><label className="text-sm font-medium">Description</label><input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" /></div>
                <div className="col-span-2"><label className="text-sm font-medium">Features (one per line)</label><textarea value={form.features} onChange={e => setForm(f => ({...f, features: e.target.value}))} rows={4} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm font-mono text-xs" placeholder={"Free wash & blow dry\nMonthly deep conditioning\n10% off all services"} /></div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleSubmit} className="bg-primary text-white px-4 py-2 rounded-lg text-sm">{editId ? "Update" : "Save"} Plan</button>
                <button onClick={resetForm} className="border px-4 py-2 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            {plans.map(p => (
              <div key={p.id} className={`border-2 rounded-xl p-5 space-y-3 ${TIER_COLORS[p.name] || "border-border bg-card"}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-lg">{p.name}</h3>
                    <p className="text-sm text-muted-foreground">{p.billing_cycle}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">GHS {p.price}</p>
                    {p.discount_percentage > 0 && <p className="text-xs text-green-600">{p.discount_percentage}% discount</p>}
                  </div>
                </div>
                {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                {p.max_services_per_cycle && <p className="text-sm"><span className="font-medium">{p.max_services_per_cycle}</span> services/cycle</p>}
                {Array.isArray(p.features) && p.features.length > 0 && (
                  <ul className="space-y-1">
                    {p.features.map((f: string, i: number) => <li key={i} className="text-sm flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>{f}</li>)}
                  </ul>
                )}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => handleEdit(p)} className="text-xs border px-3 py-1 rounded-full hover:bg-background">Edit</button>
                  <button onClick={() => handleToggle(p.id, p.is_active)} className={`text-xs px-3 py-1 rounded-full border ${p.is_active ? "border-green-500 text-green-700" : "border-gray-300 text-gray-500"}`}>{p.is_active ? "Active" : "Inactive"}</button>
                </div>
              </div>
            ))}
            {plans.length === 0 && <div className="col-span-3 text-center py-12 text-muted-foreground">No subscription plans yet</div>}
          </div>
        </>
      )}

      {tab === "subscribers" && (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>{["Client","Plan","Status","Started","Ends","Services Used","Actions"].map(h => <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>)}</tr></thead>
            <tbody className="divide-y">
              {subscriptions.map(s => (
                <tr key={s.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{s.client_id || "—"}</td>
                  <td className="px-4 py-3">{s.subscription_plans?.name || "—"}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[s.status] || ""}`}>{s.status}</span></td>
                  <td className="px-4 py-3">{s.start_date ? new Date(s.start_date).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3">{s.end_date ? new Date(s.end_date).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3">{s.services_used_this_cycle ?? 0}</td>
                  <td className="px-4 py-3"><span className="text-xs text-muted-foreground">—</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {subscriptions.length === 0 && <div className="text-center py-12 text-muted-foreground">No active subscribers yet</div>}
        </div>
      )}
    </div>
  );
}
