import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { supabaseAdmin } from "@/integrations/supabase/adminClient";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, X, Check, Download, RefreshCw } from "lucide-react";
import * as XLSX from "xlsx";





interface PromoType {
  id: string; name: string; description: string; amount: number;
  grace: number; theme: string; emoji: string; is_active: boolean;
  max_uses: number | null; uses_count: number; created_at: string; expires_at: string | null;
}


export default function PromoGiftCards() {
const GOLD = "#C8A97E", G_D = "#8B6914", G_L = "#FDF6E3";
const WHITE = "#FFFFFF", CREAM = "#FAFAF8", BORDER = "#EDEBE5";
const TXT = "#1C160E", TXT_S = "#A8A29E", TXT_M = "#57534E";
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const r4 = () => Array.from({length:4}, () => CHARS[Math.floor(Math.random()*CHARS.length)]).join("");
const genCode = (prefix: string) => `${prefix.substring(0,3).toUpperCase()}-${r4()}-${r4()}`;
const THEMES = [
  { id:"valentines", label:"Valentine's", emoji:"❤️", gradient:"linear-gradient(135deg,#9F1239,#E11D48,#FB7185)" },
  { id:"christmas",  label:"Christmas",   emoji:"🎄", gradient:"linear-gradient(135deg,#14532D,#16A34A,#DC2626)" },
  { id:"eid",        label:"Eid",         emoji:"🌙", gradient:"linear-gradient(135deg,#1E3A5F,#2563EB,#60A5FA)" },
  { id:"birthday",   label:"Birthday",    emoji:"🎂", gradient:"linear-gradient(135deg,#7C2D8A,#A855F7,#F0ABFC)" },
  { id:"mothers",    label:"Mother's Day",emoji:"🌸", gradient:"linear-gradient(135deg,#9D174D,#EC4899,#FBCFE8)" },
  { id:"graduation", label:"Graduation",  emoji:"🎓", gradient:"linear-gradient(135deg,#1E3A5F,#B8975A,#D4AF6A)" },
  { id:"gold",       label:"Luxury Gold", emoji:"✦",  gradient:"linear-gradient(135deg,#6B4E0A,#C8A97E,#D4AF6A)" },
  { id:"custom",     label:"Custom",      emoji:"🎨", gradient:"linear-gradient(135deg,#1C160E,#3A2D1A,#C8A97E)" },
];
const THEME_GRAD: Record<string,string> = Object.fromEntries(THEMES.map(t=>[t.id,t.gradient]));
const EMPTY = { name:"", description:"", amount:"", grace:"15", theme:"valentines", emoji:"", max_uses:"", expires_at:"" };
  const [types, setTypes] = useState<PromoType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string|null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  // Batch generation state
  const [genOpen, setGenOpen] = useState<string|null>(null); // promoTypeId
  const [genQty, setGenQty] = useState(10);
  const [genBatch, setGenBatch] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [newBatch, setNewBatch] = useState<any[]>([]);

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
        name: form.name.trim(), description: form.description.trim(),
        amount: Number(form.amount), grace: Number(form.grace) || 0,
        theme: form.theme, emoji: form.emoji.trim() || selectedTheme.emoji,
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        expires_at: form.expires_at || null, is_active: true,
      };
      if (editing) {
        await (supabase as any).from("promo_gift_card_types").update(payload).eq("id", editing);
        toast.success("Updated");
      } else {
        await (supabase as any).from("promo_gift_card_types").insert({ ...payload, uses_count: 0 });
        toast.success("Promo gift card type created");
      }
      setShowForm(false); setEditing(null); setForm(EMPTY); load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleEdit = (t: PromoType) => {
    setForm({ name:t.name, description:t.description, amount:String(t.amount), grace:String(t.grace), theme:t.theme, emoji:t.emoji, max_uses:t.max_uses?String(t.max_uses):"", expires_at:t.expires_at||"" });
    setEditing(t.id); setShowForm(true); window.scrollTo({top:0,behavior:"smooth"});
  };

  const handleToggle = async (id: string, active: boolean) => {
    await (supabase as any).from("promo_gift_card_types").update({ is_active: !active }).eq("id", id);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this promo gift card type? Existing generated cards are not affected.")) return;
    await (supabase as any).from("promo_gift_card_types").delete().eq("id", id);
    toast.success("Deleted"); load();
  };

  // Generate physical batch for a promo type
  const handleGenerate = async (pt: PromoType) => {
    if (!genBatch.trim()) { toast.error("Enter a batch ID e.g. XMAS-2025"); return; }
    if (genQty < 1 || genQty > 200) { toast.error("Quantity must be 1–200"); return; }
    // Enforce max_uses cap
    if (pt.max_uses !== null && pt.max_uses !== undefined) {
      const alreadyGenerated = pt.uses_count || 0;
      const remaining = pt.max_uses - alreadyGenerated;
      if (remaining <= 0) {
        toast.error(`Cap reached. This promo has already generated ${alreadyGenerated}/${pt.max_uses} cards.`);
        return;
      }
      if (genQty > remaining) {
        toast.error(`Only ${remaining} card${remaining !== 1 ? "s" : ""} remaining under the ${pt.max_uses} cap.`);
        return;
      }
    }
    setGenLoading(true);
    try {
      // Get next sequence
      const { count } = await (supabaseAdmin as any).from("gift_cards").select("*", { count:"exact", head:true }).eq("card_type","physical");
      const startSeq = (count || 0) + 1;
      const prefix = pt.name.substring(0,3).toUpperCase();
      const expiresAt = new Date(); expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      const cards = Array.from({ length: genQty }, (_, i) => ({
        code: genCode(prefix),
        serial_number: `ZLR-${prefix}-${String(startSeq+i).padStart(4,"0")}`,
        amount: pt.amount, balance: pt.amount,
        tier: "Gold", // fallback tier for redemption logic
        card_type: "physical", delivery_type: "physical",
        status: "active", payment_status: "pending",
        batch_id: genBatch.trim().toUpperCase(),
        is_admin_generated: true,
        promo_type_id: pt.id,
        expires_at: expiresAt.toISOString(),
        // Store promo name for display
        buyer_name: pt.name, // repurposed for display
      }));

      const { data, error } = await (supabaseAdmin as any).from("gift_cards").insert(cards).select();
      if (error) throw new Error(error.message);
      setNewBatch(data || []);
      // Increment uses_count
      await (supabase as any).from("promo_gift_card_types").update({ uses_count: (pt.uses_count||0) + genQty }).eq("id", pt.id);
      toast.success(`${genQty} ${pt.name} cards generated`);
      setGenBatch(""); load();
    } catch (e: any) { toast.error(e.message); }
    finally { setGenLoading(false); }
  };

  const exportBatch = (pt: PromoType) => {
    const rows = newBatch.map(c => ({
      "Serial Number": c.serial_number, "Code": c.code,
      "Card Name": pt.name, "Value (GHS)": c.amount,
      "Batch": c.batch_id, "Status": c.status,
      "Expires": new Date(c.expires_at).toLocaleDateString(),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Promo Cards");
    XLSX.writeFile(wb, `zolara_promo_${pt.name.replace(/\s+/g,"_")}_${genBatch||"batch"}.xlsx`);
  };

  const inp: React.CSSProperties = { width:"100%", padding:"11px 14px", border:`1.5px solid ${BORDER}`, borderRadius:10, fontSize:13, color:TXT, fontFamily:"'Montserrat',sans-serif", outline:"none", background:WHITE };
  const lbl: React.CSSProperties = { display:"block", fontSize:10, fontWeight:700, letterSpacing:"0.12em", color:TXT_S, marginBottom:6, fontFamily:"'Montserrat',sans-serif", textTransform:"uppercase" };

  return (
    <div style={{ padding:"32px 24px", maxWidth:960, margin:"0 auto" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Montserrat:wght@400;500;600;700&display=swap');`}</style>

      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:32, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:32, fontWeight:600, color:TXT, margin:"0 0 6px" }}>Promotional Gift Cards</h1>
          <p style={{ fontFamily:"'Montserrat',sans-serif", fontSize:13, color:TXT_S, margin:0 }}>
            Create themed gift cards for occasions. Generate physical cards for in-store sale and redemption. Cards work exactly like standard gift cards.
          </p>
        </div>
        <button onClick={() => { setShowForm(true); setEditing(null); setForm(EMPTY); window.scrollTo({top:0,behavior:"smooth"}); }}
          style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 20px", background:`linear-gradient(135deg,${G_D},${GOLD})`, color:WHITE, border:"none", borderRadius:10, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'Montserrat',sans-serif", letterSpacing:"0.06em", flexShrink:0 }}>
          <Plus size={15} /> NEW PROMO TYPE
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background:WHITE, border:`1.5px solid ${GOLD}55`, borderRadius:16, padding:28, marginBottom:28, boxShadow:`0 8px 32px rgba(200,169,126,0.15)` }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
            <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontWeight:600, color:TXT, margin:0 }}>{editing ? "Edit Promo Type" : "New Promo Gift Card Type"}</h2>
            <button onClick={() => { setShowForm(false); setEditing(null); }} style={{ background:"none", border:"none", cursor:"pointer" }}><X size={18} color={TXT_S} /></button>
          </div>

          <div style={{ marginBottom:20 }}>
            <label style={lbl}>Theme</label>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {THEMES.map(t => (
                <div key={t.id} onClick={() => setForm(f => ({ ...f, theme:t.id, emoji:t.emoji }))}
                  style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", borderRadius:20, border:`2px solid ${form.theme===t.id?GOLD:BORDER}`, cursor:"pointer", background:form.theme===t.id?G_L:WHITE, transition:"all 0.15s" }}>
                  <span style={{ fontSize:13 }}>{t.emoji}</span>
                  <span style={{ fontFamily:"'Montserrat',sans-serif", fontSize:11, fontWeight:600, color:form.theme===t.id?G_D:TXT_M }}>{t.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div style={{ background:THEME_GRAD[form.theme]||THEME_GRAD.gold, borderRadius:14, padding:"22px 24px", marginBottom:20, position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:-20, right:-20, width:80, height:80, borderRadius:"50%", background:"rgba(255,255,255,0.08)" }} />
            <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:8, fontWeight:700, letterSpacing:"0.22em", color:"rgba(255,255,255,0.55)", marginBottom:8 }}>ZOLARA BEAUTY STUDIO · PROMOTIONAL</div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:32, fontWeight:300, color:"white", marginBottom:6 }}>GHS {form.amount||"—"}</div>
            <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:13, fontWeight:700, color:"rgba(255,255,255,0.9)" }}>{form.emoji||selectedTheme.emoji} {form.name||selectedTheme.label+" Gift Card"}</div>
            {form.description && <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:11, color:"rgba(255,255,255,0.65)", marginTop:6 }}>{form.description}</div>}
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
            <div><label style={lbl}>Card Name *</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Valentine's Special" style={inp} /></div>
            <div><label style={lbl}>Amount (GHS) *</label><input type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} placeholder="300" style={inp} /></div>
            <div>
              <label style={lbl}>Grace Buffer (GHS)</label>
              <input type="number" value={form.grace} onChange={e=>setForm(f=>({...f,grace:e.target.value}))} placeholder="15" style={inp} />
              <p style={{ fontFamily:"'Montserrat',sans-serif", fontSize:10, color:TXT_S, marginTop:4 }}>Extra GHS buffer on face value for service overrun</p>
            </div>
            <div><label style={lbl}>Custom Emoji</label><input value={form.emoji} onChange={e=>setForm(f=>({...f,emoji:e.target.value}))} placeholder={selectedTheme.emoji} style={inp} /></div>
            <div><label style={lbl}>Max Cards to Generate</label><input type="number" value={form.max_uses} onChange={e=>setForm(f=>({...f,max_uses:e.target.value}))} placeholder="Unlimited" style={inp} /></div>
            <div><label style={lbl}>Stop Generating After</label><input type="datetime-local" value={form.expires_at} onChange={e=>setForm(f=>({...f,expires_at:e.target.value}))} style={inp} /></div>
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={lbl}>Description</label>
            <input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="e.g. The perfect gift for someone special this Valentine's Day." style={inp} />
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={handleSave} disabled={saving}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"11px 24px", background:`linear-gradient(135deg,${G_D},${GOLD})`, color:WHITE, border:"none", borderRadius:10, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'Montserrat',sans-serif", opacity:saving?0.7:1 }}>
              <Check size={14} /> {saving?"Saving...":editing?"Save Changes":"Create Type"}
            </button>
            <button onClick={()=>{setShowForm(false);setEditing(null);}} style={{ padding:"11px 20px", background:WHITE, color:TXT_M, border:`1px solid ${BORDER}`, borderRadius:10, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"'Montserrat',sans-serif" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Types list */}
      {loading ? (
        <div style={{ textAlign:"center", padding:60, color:TXT_S, fontFamily:"'Montserrat',sans-serif" }}>Loading...</div>
      ) : types.length === 0 ? (
        <div style={{ textAlign:"center", padding:60, background:WHITE, borderRadius:16, border:`1px solid ${BORDER}` }}>
          <p style={{ fontSize:36, marginBottom:12 }}>🎁</p>
          <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, color:TXT, marginBottom:8 }}>No promo types yet</p>
          <p style={{ fontFamily:"'Montserrat',sans-serif", fontSize:13, color:TXT_S }}>Create your first promotional gift card type above.</p>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          {types.map(t => {
            const grad = THEME_GRAD[t.theme] || THEME_GRAD.gold;
            const expired = t.expires_at && new Date(t.expires_at) < new Date();
            const isGenOpen = genOpen === t.id;
            return (
              <div key={t.id} style={{ background:WHITE, border:`1px solid ${BORDER}`, borderRadius:16, overflow:"hidden" }}>
                <div style={{ display:"flex", gap:0, flexWrap:"wrap" }}>
                  {/* Card visual */}
                  <div style={{ background:grad, padding:"24px 24px", minWidth:220, position:"relative", overflow:"hidden", opacity:t.is_active&&!expired?1:0.55 }}>
                    <div style={{ position:"absolute", top:-16, right:-16, width:60, height:60, borderRadius:"50%", background:"rgba(255,255,255,0.1)" }} />
                    <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:8, fontWeight:700, letterSpacing:"0.2em", color:"rgba(255,255,255,0.5)", marginBottom:10 }}>ZOLARA · PROMO</div>
                    <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:30, fontWeight:300, color:"white" }}>GHS {t.amount.toLocaleString()}</div>
                    <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.9)", marginTop:6 }}>{t.emoji} {t.name}</div>
                    {t.description && <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:10, color:"rgba(255,255,255,0.6)", marginTop:4, lineHeight:1.4 }}>{t.description}</div>}
                  </div>

                  {/* Info + actions */}
                  <div style={{ flex:1, padding:"20px 24px", display:"flex", flexDirection:"column", justifyContent:"space-between", minWidth:240 }}>
                    <div>
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 }}>
                        {t.grace > 0 && <span style={{ fontSize:10, fontWeight:600, color:G_D, background:G_L, padding:"3px 9px", borderRadius:10 }}>+GHS {t.grace} grace</span>}
                        {t.max_uses && <span style={{ fontSize:10, fontWeight:600, color:TXT_M, background:CREAM, padding:"3px 9px", borderRadius:10 }}>{t.uses_count||0}/{t.max_uses} generated</span>}
                        {expired && <span style={{ fontSize:10, fontWeight:600, color:"#DC2626", background:"#FEF2F2", padding:"3px 9px", borderRadius:10 }}>Expired</span>}
                        <span style={{ fontSize:10, fontWeight:700, background:t.is_active&&!expired?"#F0FDF4":"#F5F5F5", color:t.is_active&&!expired?"#16A34A":"#999", padding:"3px 9px", borderRadius:10 }}>
                          {t.is_active&&!expired?"Active":"Inactive"}
                        </span>
                      </div>
                      {t.expires_at && <p style={{ fontFamily:"'Montserrat',sans-serif", fontSize:11, color:TXT_S, margin:"0 0 12px" }}>Expires: {new Date(t.expires_at).toLocaleString("en-GH",{day:"numeric",month:"short",year:"2-digit",hour:"2-digit",minute:"2-digit"})}</p>}
                    </div>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      <button onClick={() => { setGenOpen(isGenOpen?null:t.id); setNewBatch([]); setGenBatch(""); setGenQty(10); }}
                        style={{ display:"flex", alignItems:"center", gap:5, padding:"8px 14px", background:`linear-gradient(135deg,${G_D},${GOLD})`, color:WHITE, border:"none", borderRadius:8, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"'Montserrat',sans-serif" }}>
                        <Plus size={11} /> Generate Cards
                      </button>
                      <button onClick={() => handleEdit(t)} style={{ display:"flex", alignItems:"center", gap:5, padding:"8px 12px", border:`1px solid ${BORDER}`, background:WHITE, borderRadius:8, fontSize:11, fontWeight:600, cursor:"pointer", color:TXT_M, fontFamily:"'Montserrat',sans-serif" }}>
                        <Edit2 size={11} /> Edit
                      </button>
                      <button onClick={() => handleToggle(t.id, t.is_active)} style={{ padding:"8px 12px", border:`1px solid ${BORDER}`, background:WHITE, borderRadius:8, fontSize:11, fontWeight:600, cursor:"pointer", color:TXT_M, fontFamily:"'Montserrat',sans-serif" }}>
                        {t.is_active?"Disable":"Enable"}
                      </button>
                      <button onClick={() => handleDelete(t.id)} style={{ display:"flex", alignItems:"center", padding:"8px 10px", border:"1px solid #FECACA", background:WHITE, borderRadius:8, fontSize:11, cursor:"pointer", color:"#DC2626" }}>
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Batch generator panel */}
                {isGenOpen && (
                  <div style={{ borderTop:`1px solid ${BORDER}`, background:CREAM, padding:"20px 24px" }}>
                    <h3 style={{ fontFamily:"'Montserrat',sans-serif", fontSize:12, fontWeight:700, letterSpacing:"0.1em", color:G_D, margin:"0 0 14px" }}>GENERATE PHYSICAL CARDS — {t.name.toUpperCase()}</h3>
                    <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:14 }}>
                      <div style={{ flex:1, minWidth:160 }}>
                        <label style={lbl}>Batch ID</label>
                        <input value={genBatch} onChange={e=>setGenBatch(e.target.value.toUpperCase())} placeholder="e.g. XMAS-2025-A" style={inp} />
                      </div>
                      <div style={{ width:120 }}>
                        <label style={lbl}>Quantity</label>
                        <input type="number" min={1} max={200} value={genQty} onChange={e=>setGenQty(Number(e.target.value))} style={inp} />
                      </div>
                      <div style={{ display:"flex", alignItems:"flex-end" }}>
                        <button onClick={() => handleGenerate(t)} disabled={genLoading}
                          style={{ display:"flex", alignItems:"center", gap:6, padding:"11px 20px", background:`linear-gradient(135deg,${G_D},${GOLD})`, color:WHITE, border:"none", borderRadius:10, fontSize:12, fontWeight:700, cursor:genLoading?"wait":"pointer", fontFamily:"'Montserrat',sans-serif", opacity:genLoading?0.7:1 }}>
                          {genLoading ? <><RefreshCw size={13} style={{ animation:"spin 0.8s linear infinite" }} /> Generating...</> : <><Plus size={13} /> Generate</>}
                        </button>
                      </div>
                    </div>
                    <p style={{ fontFamily:"'Montserrat',sans-serif", fontSize:11, color:TXT_S, margin:0 }}>
                      Each card gets a unique redeemable code and serial number. Cards are ready for in-store sale and can be redeemed at checkout immediately.
                    </p>

                    {newBatch.length > 0 && (
                      <div style={{ marginTop:16 }}>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                          <p style={{ fontFamily:"'Montserrat',sans-serif", fontSize:12, fontWeight:700, color:"#16A34A", margin:0 }}>✓ {newBatch.length} cards generated</p>
                          <button onClick={() => exportBatch(t)}
                            style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", background:WHITE, border:`1px solid ${BORDER}`, borderRadius:8, fontSize:11, fontWeight:600, cursor:"pointer", color:TXT_M, fontFamily:"'Montserrat',sans-serif" }}>
                            <Download size={12} /> Export to Excel
                          </button>
                        </div>
                        <div style={{ background:WHITE, border:`1px solid ${BORDER}`, borderRadius:10, overflow:"hidden" }}>
                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1.5fr 1fr", gap:12, padding:"10px 14px", background:CREAM, borderBottom:`1px solid ${BORDER}` }}>
                            {["Serial","Code","Value"].map(h=><span key={h} style={{ fontFamily:"'Montserrat',sans-serif", fontSize:9, fontWeight:700, letterSpacing:"0.12em", color:TXT_S }}>{h}</span>)}
                          </div>
                          {newBatch.slice(0,8).map((c,i)=>(
                            <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 1.5fr 1fr", gap:12, padding:"10px 14px", borderBottom:i<Math.min(newBatch.length,8)-1?`1px solid ${BORDER}`:"none" }}>
                              <span style={{ fontFamily:"monospace", fontSize:11, color:TXT_M }}>{c.serial_number}</span>
                              <span style={{ fontFamily:"monospace", fontSize:12, fontWeight:700, color:G_D, letterSpacing:"0.08em" }}>{c.code}</span>
                              <span style={{ fontFamily:"'Montserrat',sans-serif", fontSize:12, fontWeight:600, color:TXT }}>GHS {c.amount}</span>
                            </div>
                          ))}
                          {newBatch.length > 8 && <div style={{ padding:"10px 14px", fontFamily:"'Montserrat',sans-serif", fontSize:11, color:TXT_S }}>+ {newBatch.length-8} more — export to see all</div>}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
