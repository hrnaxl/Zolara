import { useEffect, useState } from "react";
import { getSMSCampaigns, createSMSCampaign, updateSMSCampaign, deleteSMSCampaign, getSMSQueue } from "@/lib/smsService";
import { toast } from "sonner";

const TRIGGER_TYPES = ["booking_reminder","birthday","anniversary","follow_up","promotional","waitlist"];

export default function SMSCampaignsManagement() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<"campaigns"|"queue">("campaigns");
  const [form, setForm] = useState({ name: "", message_template: "", trigger_type: "booking_reminder", send_hours_before: "" });

  const load = async () => {
    try {
      const [c, q] = await Promise.all([getSMSCampaigns(), getSMSQueue()]);
      setCampaigns(c || []);
      setQueue(q || []);
    } catch { toast.error("Failed to load"); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    if (!form.name || !form.message_template) { toast.error("Name and message required"); return; }
    try {
      await createSMSCampaign({ ...form, send_hours_before: form.send_hours_before ? parseInt(form.send_hours_before) : undefined });
      toast.success("Campaign created");
      setShowForm(false);
      setForm({ name: "", message_template: "", trigger_type: "booking_reminder", send_hours_before: "" });
      load();
    } catch { toast.error("Failed to create"); }
  };

  const handleToggle = async (id: string, is_active: boolean) => {
    try { await updateSMSCampaign(id, { is_active: !is_active }); load(); } catch { toast.error("Failed"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete campaign?")) return;
    try { await deleteSMSCampaign(id); toast.success("Deleted"); load(); } catch { toast.error("Failed"); }
  };

  const statusColors: Record<string,string> = { pending:"z-badge z-badge-amber", sent:"z-badge z-badge-green", failed:"z-badge z-badge-red", cancelled:"bg-gray-100 text-gray-600" };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">SMS Campaigns</h2>
        <button onClick={() => setShowForm(!showForm)} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">+ New Campaign</button>
      </div>

      <div className="flex gap-1 border-b">
        {(["campaigns","queue"] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${tab===t?"border-primary text-primary":"border-transparent text-muted-foreground hover:text-foreground"}`}>{t} {t==="queue"?`(${queue.filter(q=>q.status==="pending").length} pending)`:""}</button>
        ))}
      </div>

      {showForm && tab === "campaigns" && (
        <div className="border rounded-xl p-6 bg-muted/30 space-y-4">
          <h3 className="font-semibold">New Campaign</h3>
          <p className="text-xs text-muted-foreground">Use placeholders: {`{{client_name}}, {{service}}, {{date}}, {{time}}`}</p>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium">Campaign Name *</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium">Trigger</label>
              <select value={form.trigger_type} onChange={e=>setForm(f=>({...f,trigger_type:e.target.value}))} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm">
                {TRIGGER_TYPES.map(t=><option key={t} value={t}>{t.replace("_"," ").replace(/\b\w/g,l=>l.toUpperCase())}</option>)}
              </select>
            </div>
            {form.trigger_type==="booking_reminder"&&<div><label className="text-sm font-medium">Send X Hours Before</label><input type="number" value={form.send_hours_before} onChange={e=>setForm(f=>({...f,send_hours_before:e.target.value}))} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" /></div>}
            <div className="col-span-2"><label className="text-sm font-medium">Message Template *</label><textarea value={form.message_template} onChange={e=>setForm(f=>({...f,message_template:e.target.value}))} rows={3} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" /></div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSubmit} className="bg-primary text-white px-4 py-2 rounded-lg text-sm">Save Campaign</button>
            <button onClick={() => setShowForm(false)} className="border px-4 py-2 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      {tab === "campaigns" && (
        <div className="space-y-3">
          {campaigns.map(c=>(
            <div key={c.id} className="border rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{c.name}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${c.is_active?"z-badge z-badge-green":"bg-gray-100 text-gray-600"}`}>{c.is_active?"Active":"Inactive"}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs z-badge z-badge-blue">{c.trigger_type.replace("_"," ")}</span>
                  </div>
                  <p className="text-sm text-muted-foreground italic">"{c.message_template}"</p>
                  {c.send_hours_before && <p className="text-xs text-muted-foreground">Sends {c.send_hours_before}h before appointment</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={()=>handleToggle(c.id,c.is_active)} className="text-xs border px-2 py-1 rounded hover:bg-muted">{c.is_active?"Disable":"Enable"}</button>
                  <button onClick={()=>handleDelete(c.id)} className="text-xs border border-red-200 text-red-600 px-2 py-1 rounded hover:bg-red-50">Delete</button>
                </div>
              </div>
            </div>
          ))}
          {campaigns.length === 0 && <div className="text-center py-12 text-muted-foreground">No campaigns yet</div>}
        </div>
      )}

      {tab === "queue" && (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>{["Phone","Message","Scheduled","Status"].map(h=><th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>)}</tr></thead>
            <tbody className="divide-y">
              {queue.map(q=>(
                <tr key={q.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">{q.phone_number}</td>
                  <td className="px-4 py-3 max-w-xs truncate">{q.message}</td>
                  <td className="px-4 py-3">{new Date(q.scheduled_for).toLocaleString()}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[q.status]||""}`}>{q.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {queue.length === 0 && <div className="text-center py-12 text-muted-foreground">No messages in queue</div>}
        </div>
      )}
    </div>
  );
}
