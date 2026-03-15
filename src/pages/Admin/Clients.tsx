import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { normalizePhone } from "@/lib/clientDedup";
import { Search, X, Plus, Phone, Mail, Star, Calendar, TrendingUp, ChevronLeft, ChevronRight, RefreshCw, User, Trash2, Pencil, Gift } from "lucide-react";

const G = "#C8A97E", G_D = "#8B6914";
const CREAM = "#FAFAF8", WHITE = "#FFFFFF", BORDER = "#EDEBE5";
const TXT = "#1C160E", TXT_MID = "#78716C", TXT_SOFT = "#A8A29E";
const SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 20px rgba(0,0,0,0.06)";

const PAGE_SIZE = 25;

const TIER_COLORS: Record<string, string> = {
  Bronze: "#CD7F32", Silver: "#9CA3AF", Gold: "#B8975A",
  Diamond: "#6366F1", default: G,
};

function getTier(pts: number) {
  if (pts >= 3000) return "Diamond";
  if (pts >= 1500) return "Gold";
  if (pts >= 500) return "Silver";
  return "Bronze";
}

export default function Clients() {
  const [clients, setClients] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [selectedBookings, setSelectedBookings] = useState<any[]>([]);

  // Add/edit form
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", birthday: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const fetchClients = useCallback(async (p = 1, s = search) => {
    setLoading(true);
    try {
      let q = supabase.from("clients").select("*", { count: "exact" });
      if (s.trim()) q = q.or(`name.ilike.%${s}%,phone.ilike.%${s}%,email.ilike.%${s}%`);
      q = q.order("created_at", { ascending: false }).range((p - 1) * PAGE_SIZE, p * PAGE_SIZE - 1);
      const { data, count, error } = await q;
      if (error) throw error;
      setClients(data || []);
      setTotal(count || 0);
    } catch { toast.error("Failed to load clients"); }
    finally { setLoading(false); }
  }, [search]);

  const fetchClientBookings = async (clientId: string) => {
    const { data } = await supabase.from("bookings").select("id,service_name,preferred_date,preferred_time,status,price")
      .eq("client_id", clientId).order("preferred_date", { ascending: false }).limit(10);
    setSelectedBookings(data || []);
  };

  useEffect(() => { fetchClients(1, ""); }, []);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchClients(1, search); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const openEdit = (c: any) => {
    setEditId(c.id);
    setForm({ name: c.name || "", phone: c.phone || "", email: c.email || "", birthday: c.birthday || "", notes: c.notes || "" });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim()) { toast.error("Name and phone required"); return; }
    setSaving(true);
    try {
      const payload: any = { name: form.name.trim(), phone: normalizePhone(form.phone.trim()), email: form.email.trim() || null, birthday: form.birthday || null, notes: form.notes.trim() || null };
      if (editId) {
        const { error } = await supabase.from("clients").update(payload).eq("id", editId);
        if (error) throw error;
        toast.success("Client updated");
        if (selected?.id === editId) setSelected({ ...selected, ...payload });
      } else {
        const { error } = await supabase.from("clients").insert([payload]);
        if (error) throw error;
        toast.success("Client added");
      }
      setShowForm(false); setEditId(null); setForm({ name: "", phone: "", email: "", birthday: "", notes: "" });
      fetchClients(page, search);
    } catch (e: any) { toast.error(e.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this client? This cannot be undone.")) return;
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Client deleted");
    if (selected?.id === id) setSelected(null);
    fetchClients(page, search);
  };

  const inp: React.CSSProperties = { width: "100%", border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: "9px 12px", fontSize: 13, color: TXT, outline: "none", background: WHITE, fontFamily: "Montserrat,sans-serif", boxSizing: "border-box" };

  return (
    <div style={{ background: CREAM, minHeight: "100vh", fontFamily: "Montserrat, sans-serif", color: TXT }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Montserrat:wght@400;500;600;700&display=swap');
        .cl-row { cursor:pointer; transition:background 0.12s; }
        .cl-row:hover { background:#F5EFE6 !important; }
        .cl-row.sel { background:#FBF6EE !important; border-left:3px solid ${G_D} !important; }
        .page-btn { width:32px; height:32px; border-radius:8px; border:1.5px solid ${BORDER}; background:${WHITE}; cursor:pointer; display:flex; align-items:center; justify-content:center; }
        .page-btn:hover:not(:disabled) { border-color:${G}; }
        .page-btn:disabled { opacity:0.35; cursor:not-allowed; }
      `}</style>

      <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>

        {/* ── LEFT: Table ───────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", borderRight: selected ? `1px solid ${BORDER}` : "none" }}>

          {/* Header */}
          <div style={{ padding: "20px 24px 16px", background: WHITE, borderBottom: `1px solid ${BORDER}`, boxShadow: SHADOW }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", color: G, textTransform: "uppercase", margin: "0 0 2px" }}>Zolara</p>
                <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 700, color: TXT, margin: 0 }}>Clients</h1>
                <p style={{ fontSize: 11, color: TXT_SOFT, margin: "2px 0 0" }}>{total.toLocaleString()} total</p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => fetchClients(page, search)} style={{ padding: "8px 10px", borderRadius: 10, border: `1.5px solid ${BORDER}`, background: WHITE, cursor: "pointer" }}>
                  <RefreshCw size={14} color={TXT_SOFT} />
                </button>
                <button onClick={() => { setEditId(null); setForm({ name: "", phone: "", email: "", birthday: "", notes: "" }); setShowForm(true); }}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 10, background: `linear-gradient(135deg,${G},${G_D})`, color: WHITE, border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  <Plus size={14} /> Add Client
                </button>
              </div>
            </div>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: TXT_SOFT }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone or email…"
                style={{ ...inp, paddingLeft: 36, background: CREAM }} />
              {search && <button onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer" }}><X size={13} color={TXT_SOFT} /></button>}
            </div>
          </div>

          {/* Add/edit form */}
          {showForm && (
            <div style={{ background: "#FFFDF9", borderBottom: `1px solid ${BORDER}`, padding: "16px 24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: TXT_SOFT, textTransform: "uppercase", display: "block", marginBottom: 4 }}>Name *</label>
                  <input style={inp} placeholder="Full name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: TXT_SOFT, textTransform: "uppercase", display: "block", marginBottom: 4 }}>Phone *</label>
                  <input style={inp} placeholder="024 XXX XXXX" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: TXT_SOFT, textTransform: "uppercase", display: "block", marginBottom: 4 }}>Email</label>
                  <input style={inp} type="email" placeholder="optional" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: TXT_SOFT, textTransform: "uppercase", display: "block", marginBottom: 4 }}>Birthday</label>
                  <input style={inp} type="date" value={form.birthday} onChange={e => setForm(f => ({ ...f, birthday: e.target.value }))} />
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: TXT_SOFT, textTransform: "uppercase", display: "block", marginBottom: 4 }}>Notes</label>
                <textarea style={{ ...inp, resize: "none", height: 56 } as any} placeholder="Any notes…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={handleSave} disabled={saving}
                  style={{ padding: "9px 24px", borderRadius: 10, background: saving ? BORDER : `linear-gradient(135deg,${G},${G_D})`, color: WHITE, border: "none", fontSize: 12, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
                  {saving ? "Saving…" : editId ? "Update" : "Add Client"}
                </button>
                <button onClick={() => { setShowForm(false); setEditId(null); }}
                  style={{ padding: "9px 16px", borderRadius: 10, background: WHITE, border: `1.5px solid ${BORDER}`, fontSize: 12, fontWeight: 600, cursor: "pointer", color: TXT_MID }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: 60, color: TXT_SOFT, fontSize: 13 }}>Loading…</div>
            ) : clients.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60 }}>
                <User size={32} style={{ color: TXT_SOFT, margin: "0 auto 12px", display: "block" }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: TXT_MID }}>No clients found</p>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${BORDER}`, background: WHITE }}>
                    {["Client", "Contact", "Loyalty", "Visits", "Joined"].map(h => (
                      <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: TXT_SOFT, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c, i) => {
                    const pts = c.loyalty_points || 0;
                    const tier = getTier(pts);
                    const tc = TIER_COLORS[tier] || G;
                    const isSel = selected?.id === c.id;
                    return (
                      <tr key={c.id} onClick={() => {
                        if (isSel) { setSelected(null); return; }
                        setSelected(c);
                        fetchClientBookings(c.id);
                      }} className={`cl-row${isSel ? " sel" : ""}`}
                        style={{ borderBottom: `1px solid ${BORDER}`, background: i % 2 === 0 ? WHITE : "#FAFAF8", borderLeft: isSel ? `3px solid ${G_D}` : "3px solid transparent" }}>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg,${G},${G_D})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: WHITE }}>{(c.name || "?")[0].toUpperCase()}</span>
                            </div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: TXT, margin: 0 }}>{c.name}</p>
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <p style={{ fontSize: 12, color: TXT, margin: 0 }}>{c.phone}</p>
                          {c.email && <p style={{ fontSize: 11, color: TXT_SOFT, margin: "2px 0 0" }}>{c.email}</p>}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: `${tc}22`, color: tc }}>{tier}</span>
                          <p style={{ fontSize: 10, color: TXT_SOFT, margin: "3px 0 0" }}>{pts} pts</p>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: TXT, margin: 0 }}>{c.total_visits || 0}</p>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <p style={{ fontSize: 12, color: TXT_SOFT, margin: 0 }}>{c.created_at ? format(parseISO(c.created_at), "d MMM yyyy") : "—"}</p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ padding: "12px 24px", borderTop: `1px solid ${BORDER}`, background: WHITE, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontSize: 11, color: TXT_SOFT, margin: 0 }}>{total} clients · Page {page} of {totalPages}</p>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="page-btn" disabled={page === 1} onClick={() => { const np = page - 1; setPage(np); fetchClients(np, search); }}>
                  <ChevronLeft size={14} color={TXT_MID} />
                </button>
                <button className="page-btn" disabled={page === totalPages} onClick={() => { const np = page + 1; setPage(np); fetchClients(np, search); }}>
                  <ChevronRight size={14} color={TXT_MID} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Client detail panel ────────────────── */}
        {selected && (
          <div style={{ width: 360, background: WHITE, borderLeft: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", overflowY: "auto", flexShrink: 0 }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: `linear-gradient(135deg,${G},${G_D})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: WHITE }}>{(selected.name || "?")[0].toUpperCase()}</span>
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: TXT, margin: 0 }}>{selected.name}</p>
                  <p style={{ fontSize: 11, color: TXT_SOFT, margin: 0 }}>{selected.phone}</p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => openEdit(selected)} style={{ background: "none", border: `1.5px solid ${BORDER}`, borderRadius: 8, padding: "5px 8px", cursor: "pointer" }}>
                  <Pencil size={13} color={TXT_MID} />
                </button>
                <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                  <X size={16} color={TXT_SOFT} />
                </button>
              </div>
            </div>

            <div style={{ padding: "16px 20px" }}>
              {/* Loyalty tier */}
              {(() => {
                const pts = selected.loyalty_points || 0;
                const tier = getTier(pts);
                const tc = TIER_COLORS[tier] || G;
                const next = tier === "Diamond" ? 3000 : tier === "Gold" ? 3000 : tier === "Silver" ? 1500 : 500;
                const pct = Math.min(100, (pts / next) * 100);
                return (
                  <div style={{ background: `${tc}11`, border: `1px solid ${tc}44`, borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: tc }}>{tier} Member</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: tc }}>{pts} pts</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: `${tc}33`, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: tc, borderRadius: 3 }} />
                    </div>
                    {tier !== "Diamond" && <p style={{ fontSize: 10, color: TXT_SOFT, margin: "5px 0 0" }}>{next - pts} pts to next tier</p>}
                  </div>
                );
              })()}

              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                {[
                  { label: "Total Visits", val: selected.total_visits || 0, icon: <Calendar size={14} /> },
                  { label: "Total Spent", val: `GHS ${Number(selected.total_spent || 0).toLocaleString()}`, icon: <TrendingUp size={14} /> },
                ].map(({ label, val, icon }) => (
                  <div key={label} style={{ background: CREAM, borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ color: G_D, marginBottom: 4 }}>{icon}</div>
                    <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: TXT_SOFT, textTransform: "uppercase", margin: "0 0 2px" }}>{label}</p>
                    <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700, color: TXT, margin: 0 }}>{val}</p>
                  </div>
                ))}
              </div>

              {/* Details */}
              {selected.email && (
                <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                  <Mail size={13} color={TXT_SOFT} />
                  <p style={{ fontSize: 12, color: TXT_MID, margin: 0 }}>{selected.email}</p>
                </div>
              )}
              {selected.birthday && (
                <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                  <Gift size={13} color={TXT_SOFT} />
                  <p style={{ fontSize: 12, color: TXT_MID, margin: 0 }}>Birthday: {format(parseISO(selected.birthday), "d MMMM")}</p>
                </div>
              )}
              {selected.notes && (
                <div style={{ background: CREAM, borderRadius: 10, padding: "10px 12px", marginBottom: 16 }}>
                  <p style={{ fontSize: 12, color: TXT_MID, margin: 0, lineHeight: 1.6 }}>{selected.notes}</p>
                </div>
              )}

              {/* Recent bookings */}
              {selectedBookings.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: TXT_SOFT, textTransform: "uppercase", margin: "0 0 10px" }}>Recent Bookings</p>
                  {selectedBookings.slice(0, 5).map(b => {
                    const ss = { pending: "#EAB308", confirmed: "#22C55E", completed: "#4ADE80", cancelled: "#EF4444", no_show: "#9CA3AF", in_progress: "#3B82F6" } as any;
                    return (
                      <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${BORDER}` }}>
                        <div>
                          <p style={{ fontSize: 12, color: TXT, margin: 0 }}>{b.service_name || "Service"}</p>
                          <p style={{ fontSize: 10, color: TXT_SOFT, margin: "1px 0 0" }}>{b.preferred_date ? format(parseISO(b.preferred_date), "d MMM yyyy") : "—"}</p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color: ss[b.status] || TXT_SOFT }}>{b.status?.toUpperCase()}</span>
                          {b.price && <p style={{ fontSize: 11, fontWeight: 600, color: TXT_MID, margin: "1px 0 0" }}>GHS {b.price}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Delete */}
              <button onClick={() => handleDelete(selected.id)}
                style={{ marginTop: 20, width: "100%", padding: "9px", borderRadius: 10, background: WHITE, border: `1.5px solid #FECACA`, color: "#DC2626", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Trash2 size={13} /> Delete Client
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
