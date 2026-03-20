import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, X, Check } from "lucide-react";

const GOLD = "#C8A97E", G_D = "#8B6914", G_L = "#FDF6E3";
const WHITE = "#FFFFFF", CREAM = "#FAFAF8", BORDER = "#EDEBE5";
const TXT = "#1C160E", TXT_S = "#A8A29E", TXT_M = "#57534E";

const THEMES = [
  { id: "valentines", label: "Valentine's", emoji: "❤️", gradient: "linear-gradient(135deg,#9F1239,#E11D48,#FB7185)", accent: "#E11D48" },
  { id: "christmas",  label: "Christmas",   emoji: "🎄", gradient: "linear-gradient(135deg,#14532D,#16A34A,#DC2626)", accent: "#16A34A" },
  { id: "eid",        label: "Eid",         emoji: "🌙", gradient: "linear-gradient(135deg,#1E3A5F,#2563EB,#60A5FA)", accent: "#2563EB" },
  { id: "birthday",   label: "Birthday",    emoji: "🎂", gradient: "linear-gradient(135deg,#7C2D8A,#A855F7,#F0ABFC)", accent: "#A855F7" },
  { id: "mothers",    label: "Mother's Day", emoji: "🌸", gradient: "linear-gradient(135deg,#9D174D,#EC4899,#FBCFE8)", accent: "#EC4899" },
  { id: "graduation", label: "Graduation",  emoji: "🎓", gradient: "linear-gradient(135deg,#1E3A5F,#B8975A,#D4AF6A)", accent: "#B8975A" },
  { id: "gold",       label: "Luxury Gold", emoji: "✦",  gradient: "linear-gradient(135deg,#6B4E0A,#C8A97E,#D4AF6A)", accent: "#C8A97E" },
  { id: "custom",     label: "Custom",      emoji: "🎨", gradient: "linear-gradient(135deg,#1C160E,#3A2D1A,#C8A97E)", accent: "#C8A97E" },
];

interface PromoType {
  id: string; name: string; description: string; amount: number;
  grace: number; theme: string; emoji: string; is_active: boolean;
  max_uses: number | null; uses_count: number; created_at: string;
  expires_at: string | null;
}

const EMPTY = { name:"", description:"", amount:"", grace:"15", theme:"valentines", emoji:"", max_uses:"", expires_at:"" };

export default function PromoGiftCards() {
  const [types, setTypes] = useState<PromoType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("promo_gift_card_types").select("*").order("created_at", { ascending: false });
    setTypes(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const selectedTheme = THEMES.find(t => t.id === form.theme) || THEMES[0];

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) { toast.error("Valid amount required"); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        amount: Number(form.amount),
        grace: Number(form.grace) || 0,
        theme: form.theme,
        emoji: form.emoji.trim() || selectedTheme.emoji,
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        expires_at: form.expires_at || null,
        is_active: true,
      };
      if (editing) {
        await (supabase as any).from("promo_gift_card_types").update(payload).eq("id", editing);
        toast.success("Updated");
      } else {
        await (supabase as any).from("promo_gift_card_types").insert({ ...payload, uses_count: 0 });
        toast.success("Promo gift card created");
      }
      setShowForm(false); setEditing(null); setForm(EMPTY); load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleEdit = (t: PromoType) => {
    setForm({ name: t.name, description: t.description, amount: String(t.amount), grace: String(t.grace), theme: t.theme, emoji: t.emoji, max_uses: t.max_uses ? String(t.max_uses) : "", expires_at: t.expires_at || "" });
    setEditing(t.id); setShowForm(true);
  };

  const handleToggle = async (id: string, active: boolean) => {
    await (supabase as any).from("promo_gift_card_types").update({ is_active: !active }).eq("id", id);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this promo gift card type? This cannot be undone.")) return;
    await (supabase as any).from("promo_gift_card_types").delete().eq("id", id);
    toast.success("Deleted"); load();
  };

  const inp: React.CSSProperties = { width:"100%", padding:"11px 14px", border:`1.5px solid ${BORDER}`, borderRadius:10, fontSize:13, color:TXT, fontFamily:"'Montserrat',sans-serif", outline:"none", background:WHITE };
  const lbl: React.CSSProperties = { display:"block", fontSize:10, fontWeight:700, letterSpacing:"0.12em", color:TXT_S, marginBottom:6, fontFamily:"'Montserrat',sans-serif", textTransform:"uppercase" };

  return (
    <div style={{ padding:"32px 24px", maxWidth:900, margin:"0 auto" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Montserrat:wght@400;500;600;700&display=swap');`}</style>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:32, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:32, fontWeight:600, color:TXT, margin:"0 0 6px" }}>Promotional Gift Cards</h1>
          <p style={{ fontFamily:"'Montserrat',sans-serif", fontSize:13, color:TXT_S, margin:0 }}>
            Create themed gift cards for occasions — Valentine's, Eid, Christmas and more. They work exactly like standard gift cards and appear on the website.
          </p>
        </div>
        <button onClick={() => { setShowForm(true); setEditing(null); setForm(EMPTY); }}
          style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 20px", background:`linear-gradient(135deg,${G_D},${GOLD})`, color:WHITE, border:"none", borderRadius:10, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'Montserrat',sans-serif", letterSpacing:"0.06em", flexShrink:0 }}>
          <Plus size={15} /> NEW PROMO CARD
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background:WHITE, border:`1.5px solid ${GOLD}55`, borderRadius:16, padding:28, marginBottom:28, boxShadow:`0 8px 32px rgba(200,169,126,0.15)` }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
            <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontWeight:600, color:TXT, margin:0 }}>{editing ? "Edit Promo Card" : "Create Promo Gift Card"}</h2>
            <button onClick={() => { setShowForm(false); setEditing(null); }} style={{ background:"none", border:"none", cursor:"pointer" }}><X size={18} color={TXT_S} /></button>
          </div>

          {/* Theme picker */}
          <div style={{ marginBottom:20 }}>
            <label style={lbl}>Theme</label>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {THEMES.map(t => (
                <div key={t.id} onClick={() => setForm(f => ({ ...f, theme: t.id, emoji: t.emoji }))}
                  style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", borderRadius:20, border:`2px solid ${form.theme === t.id ? GOLD : BORDER}`, cursor:"pointer", background: form.theme === t.id ? G_L : WHITE, transition:"all 0.15s" }}>
                  <span style={{ fontSize:14 }}>{t.emoji}</span>
                  <span style={{ fontFamily:"'Montserrat',sans-serif", fontSize:11, fontWeight:600, color: form.theme === t.id ? G_D : TXT_M }}>{t.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Preview card */}
          <div style={{ background: selectedTheme.gradient, borderRadius:14, padding:"22px 24px", marginBottom:20, position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:-20, right:-20, width:80, height:80, borderRadius:"50%", background:"rgba(255,255,255,0.08)" }} />
            <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:9, fontWeight:700, letterSpacing:"0.22em", color:"rgba(255,255,255,0.6)", marginBottom:10 }}>ZOLARA BEAUTY STUDIO</div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:32, fontWeight:300, color:"white", marginBottom:6 }}>GHS {form.amount || "—"}</div>
            <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:13, fontWeight:700, color:"rgba(255,255,255,0.9)" }}>{form.emoji || selectedTheme.emoji} {form.name || selectedTheme.label + " Gift Card"}</div>
            {form.description && <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:11, color:"rgba(255,255,255,0.65)", marginTop:6 }}>{form.description}</div>}
          </div>

          {/* Fields */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
            <div>
              <label style={lbl}>Card Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Valentine's Special" style={inp} />
            </div>
            <div>
              <label style={lbl}>Amount (GHS) *</label>
              <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="e.g. 300" style={inp} />
            </div>
            <div>
              <label style={lbl}>Grace Buffer (GHS)</label>
              <input type="number" value={form.grace} onChange={e => setForm(f => ({ ...f, grace: e.target.value }))} placeholder="15" style={inp} />
              <p style={{ fontFamily:"'Montserrat',sans-serif", fontSize:10, color:TXT_S, marginTop:4 }}>Extra GHS buffer on top of face value</p>
            </div>
            <div>
              <label style={lbl}>Custom Emoji (optional)</label>
              <input value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} placeholder={selectedTheme.emoji} style={inp} />
            </div>
            <div>
              <label style={lbl}>Max Cards to Sell (optional)</label>
              <input type="number" value={form.max_uses} onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))} placeholder="Unlimited" style={inp} />
            </div>
            <div>
              <label style={lbl}>Stop Selling After (optional)</label>
              <input type="datetime-local" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} style={inp} />
            </div>
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={lbl}>Description (shown on website)</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. The perfect gift for someone special this Valentine's Day." style={inp} />
          </div>

          <div style={{ display:"flex", gap:10 }}>
            <button onClick={handleSave} disabled={saving}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"11px 24px", background:`linear-gradient(135deg,${G_D},${GOLD})`, color:WHITE, border:"none", borderRadius:10, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'Montserrat',sans-serif", opacity: saving ? 0.7 : 1 }}>
              <Check size={14} /> {saving ? "Saving..." : editing ? "Save Changes" : "Create Card"}
            </button>
            <button onClick={() => { setShowForm(false); setEditing(null); }}
              style={{ padding:"11px 20px", background:WHITE, color:TXT_M, border:`1px solid ${BORDER}`, borderRadius:10, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"'Montserrat',sans-serif" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{ textAlign:"center", padding:60, color:TXT_S, fontFamily:"'Montserrat',sans-serif", fontSize:13 }}>Loading...</div>
      ) : types.length === 0 ? (
        <div style={{ textAlign:"center", padding:60, background:WHITE, borderRadius:16, border:`1px solid ${BORDER}` }}>
          <p style={{ fontSize:32, marginBottom:12 }}>🎁</p>
          <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, color:TXT, marginBottom:8 }}>No promo cards yet</p>
          <p style={{ fontFamily:"'Montserrat',sans-serif", fontSize:13, color:TXT_S }}>Create your first promotional gift card above.</p>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:16 }}>
          {types.map(t => {
            const theme = THEMES.find(th => th.id === t.theme) || THEMES[0];
            const expired = t.expires_at && new Date(t.expires_at) < new Date();
            return (
              <div key={t.id} style={{ background:WHITE, border:`1px solid ${BORDER}`, borderRadius:16, overflow:"hidden", opacity: t.is_active && !expired ? 1 : 0.6 }}>
                {/* Mini card visual */}
                <div style={{ background: theme.gradient, padding:"20px 20px 16px", position:"relative", overflow:"hidden" }}>
                  <div style={{ position:"absolute", top:-16, right:-16, width:64, height:64, borderRadius:"50%", background:"rgba(255,255,255,0.08)" }} />
                  <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:8, fontWeight:700, letterSpacing:"0.22em", color:"rgba(255,255,255,0.55)", marginBottom:8 }}>ZOLARA · PROMOTIONAL</div>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:26, fontWeight:300, color:"white" }}>GHS {t.amount.toLocaleString()}</div>
                  <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.9)", marginTop:4 }}>{t.emoji || theme.emoji} {t.name}</div>
                </div>
                {/* Info */}
                <div style={{ padding:"14px 16px" }}>
                  {t.description && <p style={{ fontFamily:"'Montserrat',sans-serif", fontSize:11, color:TXT_M, margin:"0 0 10px", lineHeight:1.5 }}>{t.description}</p>}
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 }}>
                    {t.grace > 0 && <span style={{ fontSize:10, fontWeight:600, color:G_D, background:G_L, padding:"2px 8px", borderRadius:10 }}>+GHS {t.grace} grace</span>}
                    {t.max_uses && <span style={{ fontSize:10, fontWeight:600, color:TXT_M, background:CREAM, padding:"2px 8px", borderRadius:10 }}>{t.uses_count||0}/{t.max_uses} sold</span>}
                    {expired && <span style={{ fontSize:10, fontWeight:600, color:"#DC2626", background:"#FEF2F2", padding:"2px 8px", borderRadius:10 }}>Expired</span>}
                    <span style={{ fontSize:10, fontWeight:700, background: t.is_active && !expired ? "#F0FDF4" : "#F5F5F5", color: t.is_active && !expired ? "#16A34A" : "#999", padding:"2px 8px", borderRadius:10 }}>
                      {t.is_active && !expired ? "Live" : "Off"}
                    </span>
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={() => handleEdit(t)} style={{ flex:1, padding:"7px", borderRadius:8, border:`1px solid ${BORDER}`, background:WHITE, fontSize:11, fontWeight:600, cursor:"pointer", color:TXT_M, display:"flex", alignItems:"center", justifyContent:"center", gap:4, fontFamily:"'Montserrat',sans-serif" }}>
                      <Edit2 size={11} /> Edit
                    </button>
                    <button onClick={() => handleToggle(t.id, t.is_active)} style={{ flex:1, padding:"7px", borderRadius:8, border:`1px solid ${BORDER}`, background:WHITE, fontSize:11, fontWeight:600, cursor:"pointer", color:TXT_M, fontFamily:"'Montserrat',sans-serif" }}>
                      {t.is_active ? "Disable" : "Enable"}
                    </button>
                    <button onClick={() => handleDelete(t.id)} style={{ padding:"7px 10px", borderRadius:8, border:"1px solid #FECACA", background:WHITE, fontSize:11, cursor:"pointer", color:"#DC2626", display:"flex", alignItems:"center", fontFamily:"'Montserrat',sans-serif" }}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
