import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const NOTE_TYPES = ["general","medical","preference","behavior","allergy"];
const TYPE_COLORS: Record<string,string> = { general:"z-badge z-badge-blue", medical:"z-badge z-badge-red", preference:"z-badge z-badge-purple", behavior:"z-badge z-badge-amber", allergy:"bg-orange-100 text-orange-800" };

export default function ClientNotesAndHistory() {
  const [notes, setNotes] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState({ client_id: "", note_type: "general", content: "", is_important: false, is_private: false });

  const load = async () => {
    try {
      const [{ data: n }, { data: c }] = await Promise.all([
        supabase.from("client_notes").select("*, profiles(full_name)").order("created_at", { ascending: false }),
        supabase.from("clients").select("id, full_name").order("full_name"),
      ]);
      setNotes(n || []);
      setClients(c || []);
    } catch { toast.error("Failed to load"); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    if (!form.client_id || !form.content) { toast.error("Client and note content required"); return; }
    try {
      await supabase.from("client_notes").insert(form);
      toast.success("Note saved");
      setShowForm(false);
      setForm({ client_id: "", note_type: "general", content: "", is_important: false, is_private: false });
      load();
    } catch { toast.error("Failed to save note"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this note?")) return;
    try { await supabase.from("client_notes").delete().eq("id", id); toast.success("Deleted"); load(); } catch { toast.error("Failed"); }
  };

  const filtered = filter ? notes.filter(n => n.note_type === filter) : notes;

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading notes...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Client Notes</h2>
        <button onClick={() => setShowForm(!showForm)} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">+ Add Note</button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilter("")} className={`px-3 py-1 rounded-full text-sm border ${!filter ? "bg-primary text-white border-primary" : "border-border"}`}>All</button>
        {NOTE_TYPES.map(t => <button key={t} onClick={() => setFilter(t)} className={`px-3 py-1 rounded-full text-sm border capitalize ${filter === t ? "bg-primary text-white border-primary" : "border-border"}`}>{t}</button>)}
      </div>

      {showForm && (
        <div className="border rounded-xl p-6 bg-muted/30 space-y-4">
          <h3 className="font-semibold">New Note</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium">Client *</label>
              <select value={form.client_id} onChange={e=>setForm(f=>({...f,client_id:e.target.value}))} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm">
                <option value="">Select client</option>
                {clients.map(c=><option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </div>
            <div><label className="text-sm font-medium">Note Type</label>
              <select value={form.note_type} onChange={e=>setForm(f=>({...f,note_type:e.target.value}))} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm">
                {NOTE_TYPES.map(t=><option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
              </select>
            </div>
            <div className="col-span-2"><label className="text-sm font-medium">Note *</label><textarea value={form.content} onChange={e=>setForm(f=>({...f,content:e.target.value}))} rows={3} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" /></div>
            <div className="flex gap-4 col-span-2">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_important} onChange={e=>setForm(f=>({...f,is_important:e.target.checked}))} /> Mark as important</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_private} onChange={e=>setForm(f=>({...f,is_private:e.target.checked}))} /> Private (only you)</label>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSubmit} className="bg-primary text-white px-4 py-2 rounded-lg text-sm">Save Note</button>
            <button onClick={() => setShowForm(false)} className="border px-4 py-2 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(n => (
          <div key={n.id} className={`border rounded-xl p-4 ${n.is_important ? "border-yellow-400 bg-yellow-50/30" : ""}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{n.profiles?.full_name || "Unknown client"}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${TYPE_COLORS[n.note_type] || "bg-gray-100"}`}>{n.note_type}</span>
                  {n.is_important && <span className="px-2 py-0.5 rounded-full text-xs font-medium z-badge z-badge-amber">⭐ Important</span>}
                  {n.is_private && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">🔒 Private</span>}
                </div>
                <p className="text-sm">{n.content}</p>
                <p className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
              </div>
              <button onClick={() => handleDelete(n.id)} className="text-xs border border-red-200 text-red-600 px-2 py-1 rounded hover:bg-red-50 shrink-0">Delete</button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground">No notes found</div>}
      </div>
    </div>
  );
}
