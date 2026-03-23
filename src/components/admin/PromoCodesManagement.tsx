import { useEffect, useState } from "react";
import { sanitizePromoCode } from "@/lib/sanitize";
import { getPromoCodes, createPromoCode, updatePromoCode, deletePromoCode } from "@/lib/promoCodes";
import { useSettings } from "@/context/SettingsContext";
import { toast } from "sonner";


export default function PromoCodesManagement() {
const G="#C8A97E",G_D="#8B6914",W="#FFFFFF",CREAM="#FAFAF8",BORDER="#EDEBE5",TXT="#1C160E",TXT_MID="#78716C",TXT_SOFT="#A8A29E";
const SHADOW="0 1px 3px rgba(0,0,0,0.04),0 4px 16px rgba(0,0,0,0.06)";
const card: React.CSSProperties={background:W,border:`1px solid ${BORDER}`,borderRadius:"16px",padding:"24px",boxShadow:SHADOW};
const inp: React.CSSProperties={width:"100%",border:`1.5px solid ${BORDER}`,borderRadius:"10px",padding:"9px 12px",fontSize:"13px",color:TXT,outline:"none",background:W,fontFamily:"Montserrat,sans-serif"};
  const { userRole, roleReady } = useSettings();
  const canEdit = roleReady && userRole !== null && !["receptionist","cleaner","staff"].includes(userRole||"");
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code:"", description:"", discount_type:"percentage" as "percentage"|"fixed_amount", discount_value:"", minimum_amount:"", max_uses:"", expires_date:"", expires_time:"23:59" });

  const load = async () => {
    try { setCodes(await getPromoCodes()); } catch { toast.error("Failed to load promo codes"); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    if (!canEdit) return;
    if (!form.code || !form.discount_value) { toast.error("Code and discount value required"); return; }
    try {
      const expiresAt = form.expires_date
        ? new Date(`${form.expires_date}T${form.expires_time || "23:59"}:00`).toISOString()
        : undefined;
      await createPromoCode({ code:form.code, description:form.description, discount_type:form.discount_type, discount_value:parseFloat(form.discount_value), minimum_amount:form.minimum_amount ? parseFloat(form.minimum_amount) : 0, max_uses:form.max_uses ? parseInt(form.max_uses) : undefined, expires_at:expiresAt, is_active:true });
      toast.success("Promo code created"); setShowForm(false);
      setForm({ code:"", description:"", discount_type:"percentage", discount_value:"", minimum_amount:"", max_uses:"", expires_date:"", expires_time:"23:59" });
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

  if (loading) return (
    <div style={{ display:"flex",justifyContent:"center",alignItems:"center",padding:"60px",fontFamily:"Montserrat,sans-serif" }}>
      <div style={{ width:"32px",height:"32px",border:`3px solid #F0E4CC`,borderTopColor:G,borderRadius:"50%",animation:"spin 0.8s linear infinite" }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const totalActive = codes.filter(c=>c.is_active).length;
  const totalUses = codes.reduce((s,c)=>s+(c.used_count||0),0);

  return (
    <div style={{ background:CREAM,minHeight:"100vh",padding:"clamp(16px,4vw,32px)",fontFamily:"Montserrat,sans-serif",color:TXT }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap');*{box-sizing:border-box}`}</style>

      {/* Header */}
      <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:"28px",flexWrap:"wrap",gap:"12px" }}>
        <div>
          <p style={{ fontSize:"11px",fontWeight:700,letterSpacing:"0.16em",color:G,textTransform:"uppercase",marginBottom:"4px" }}>Promotions</p>
          <h1 style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(28px,4vw,42px)",fontWeight:700,color:TXT,margin:0,lineHeight:1 }}>Promo Codes</h1>
          <p style={{ fontSize:"12px",color:TXT_SOFT,marginTop:"6px" }}>{canEdit ? "Create and manage discount codes" : "View only — contact the owner to make changes"}</p>
        </div>
        {canEdit && (
          <button onClick={() => setShowForm(!showForm)} style={{ padding:"10px 20px",borderRadius:"12px",background:G,color:W,border:"none",fontSize:"13px",fontWeight:600,cursor:"pointer" }}>
            {showForm ? "Cancel" : "+ New Code"}
          </button>
        )}
      </div>

      {/* KPI strip */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"14px",marginBottom:"24px" }}>
        {[
          { label:"TOTAL CODES", value:codes.length, color:G_D, bg:"#FBF6EE", border:"#F0E4CC" },
          { label:"ACTIVE", value:totalActive, color:"#16A34A", bg:"#F0FDF4", border:"#BBF7D0" },
          { label:"TOTAL USES", value:totalUses, color:"#6366F1", bg:"#EEF2FF", border:"#C7D2FE" },
        ].map(k=>(
          <div key={k.label} style={{ background:k.bg,border:`1px solid ${k.border}`,borderRadius:"14px",padding:"18px 20px" }}>
            <p style={{ fontSize:"10px",fontWeight:700,letterSpacing:"0.1em",color:k.color,marginBottom:"6px" }}>{k.label}</p>
            <p style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:"32px",fontWeight:700,color:TXT,margin:0 }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Create Form */}
      {showForm && canEdit && (
        <div style={{ ...card, marginBottom:"24px", borderLeft:`3px solid ${G}` }}>
          <p style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:"18px",fontWeight:700,color:TXT,marginBottom:"20px" }}>New Promo Code</p>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginBottom:"14px" }}>
            <div>
              <label style={{ fontSize:"11px",fontWeight:600,color:TXT_SOFT,textTransform:"uppercase",letterSpacing:"0.1em",display:"block",marginBottom:"6px" }}>Code *</label>
              <input value={form.code} onChange={e=>setForm(f=>({...f,code:sanitizePromoCode(e.target.value)}))} style={{ ...inp,fontFamily:"'Courier New',monospace",fontWeight:700,letterSpacing:"0.12em" }} placeholder="e.g. SAVE20" />
            </div>
            <div>
              <label style={{ fontSize:"11px",fontWeight:600,color:TXT_SOFT,textTransform:"uppercase",letterSpacing:"0.1em",display:"block",marginBottom:"6px" }}>Discount Type</label>
              <select value={form.discount_type} onChange={e=>setForm(f=>({...f,discount_type:e.target.value as any}))} style={{ ...inp }}>
                <option value="percentage">Percentage (%)</option>
                <option value="fixed_amount">Fixed Amount (GHS)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize:"11px",fontWeight:600,color:TXT_SOFT,textTransform:"uppercase",letterSpacing:"0.1em",display:"block",marginBottom:"6px" }}>Discount Value *</label>
              <input type="number" value={form.discount_value} onChange={e=>setForm(f=>({...f,discount_value:e.target.value}))} style={inp} />
            </div>
            <div>
              <label style={{ fontSize:"11px",fontWeight:600,color:TXT_SOFT,textTransform:"uppercase",letterSpacing:"0.1em",display:"block",marginBottom:"6px" }}>Minimum Purchase (GHS)</label>
              <input type="number" value={form.minimum_amount} onChange={e=>setForm(f=>({...f,minimum_amount:e.target.value}))} style={inp} />
            </div>
            <div>
              <label style={{ fontSize:"11px",fontWeight:600,color:TXT_SOFT,textTransform:"uppercase",letterSpacing:"0.1em",display:"block",marginBottom:"6px" }}>Max Uses</label>
              <input type="number" value={form.max_uses} onChange={e=>setForm(f=>({...f,max_uses:e.target.value}))} style={inp} placeholder="Unlimited" />
            </div>
            <div>
              <label style={{ fontSize:"11px",fontWeight:600,color:TXT_SOFT,textTransform:"uppercase",letterSpacing:"0.1em",display:"block",marginBottom:"6px" }}>Expiry Date & Time</label>
              <div style={{ display:"flex",gap:8 }}>
                <input type="date" value={form.expires_date} onChange={e=>setForm(f=>({...f,expires_date:e.target.value}))} style={{ ...inp, flex:1 }} />
                <input type="time" value={form.expires_time} onChange={e=>setForm(f=>({...f,expires_time:e.target.value}))} style={{ ...inp, width:110 }} />
              </div>
            </div>
            <div style={{ gridColumn:"span 2" }}>
              <label style={{ fontSize:"11px",fontWeight:600,color:TXT_SOFT,textTransform:"uppercase",letterSpacing:"0.1em",display:"block",marginBottom:"6px" }}>Description</label>
              <input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} style={inp} placeholder="Optional description" />
            </div>
          </div>
          <div style={{ display:"flex",gap:"10px" }}>
            <button onClick={handleSubmit} style={{ padding:"10px 24px",borderRadius:"10px",background:G,color:W,border:"none",fontSize:"13px",fontWeight:600,cursor:"pointer" }}>Save Code</button>
            <button onClick={()=>setShowForm(false)} style={{ padding:"10px 20px",borderRadius:"10px",background:W,color:TXT_MID,border:`1px solid ${BORDER}`,fontSize:"13px",fontWeight:600,cursor:"pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={card}>
        {codes.length === 0 ? (
          <div style={{ textAlign:"center",padding:"60px 0",color:TXT_SOFT }}>
            <div style={{ fontSize:"40px",marginBottom:"14px" }}>🏷️</div>
            <p style={{ fontSize:"15px",fontWeight:500,marginBottom:"6px" }}>No promo codes yet</p>
            {canEdit && <p style={{ fontSize:"12px" }}>Create your first promo code above</p>}
          </div>
        ) : (
          <>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 80px 110px 110px 90px 90px 80px"+(canEdit?" 110px":""),gap:"10px",padding:"8px 14px",borderBottom:`1px solid ${BORDER}`,marginBottom:"4px" }}>
              {["Code","Type","Value","Min Purchase","Uses","Expires","Status",...(canEdit?["Actions"]:[])].map(h=>(
                <span key={h} style={{ fontSize:"9px",fontWeight:700,letterSpacing:"0.1em",color:TXT_SOFT,textTransform:"uppercase" }}>{h}</span>
              ))}
            </div>
            {codes.map((c, i) => (
              <div key={c.id} style={{ display:"grid",gridTemplateColumns:"1fr 80px 110px 110px 90px 90px 80px"+(canEdit?" 110px":""),gap:"10px",padding:"14px",borderRadius:"10px",alignItems:"center",borderBottom:i<codes.length-1?`1px solid ${BORDER}`:"none" }}>
                <div>
                  <p style={{ fontFamily:"'Courier New',monospace",fontSize:"13px",fontWeight:700,color:TXT,letterSpacing:"0.1em",margin:0 }}>{c.code}</p>
                  {c.description && <p style={{ fontSize:"10px",color:TXT_SOFT,margin:"3px 0 0" }}>{c.description}</p>}
                </div>
                <span style={{ fontSize:"11px",color:TXT_MID }}>{c.discount_type==="percentage"?"%":"GHS"}</span>
                <span style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:"16px",fontWeight:700,color:G_D }}>{c.discount_type==="percentage"?`${c.discount_value}%`:`GHS ${c.discount_value}`}</span>
                <span style={{ fontSize:"12px",color:TXT_MID }}>{c.minimum_amount>0?`GHS ${c.minimum_amount}`:"—"}</span>
                <span style={{ fontSize:"12px",color:TXT_MID }}>{c.used_count||0}{c.max_uses?` / ${c.max_uses}`:" / ∞"}</span>
                <span style={{ fontSize:"11px",color:TXT_SOFT }}>{(() => {
                    if (!c.expires_at) return "Never";
                    const d = new Date(c.expires_at);
                    const expired = d < new Date();
                    const dateStr = d.toLocaleDateString("en-GH",{day:"numeric",month:"short",year:"2-digit"});
                    const timeStr = d.toLocaleTimeString("en-GH",{hour:"2-digit",minute:"2-digit",hour12:true});
                    return <span style={{ color: expired ? "#DC2626" : "inherit" }}>{dateStr} {timeStr}{expired ? " ⚠" : ""}</span>;
                  })()}</span>
                {(() => {
                    const expired = c.expires_at && new Date(c.expires_at) < new Date();
                    const label = !c.is_active ? "Disabled" : expired ? "Expired" : "Active";
                    const bg = !c.is_active ? "#F5F5F5" : expired ? "#FEF2F2" : "#F0FDF4";
                    const col = !c.is_active ? "#999" : expired ? "#DC2626" : "#16A34A";
                    return <span style={{ display:"inline-block",padding:"3px 10px",borderRadius:"20px",fontSize:"10px",fontWeight:700,background:bg,color:col }}>{label}</span>;
                  })()}
                {canEdit && (
                  <div style={{ display:"flex",gap:"6px" }}>
                    <button onClick={()=>handleToggle(c.id,c.is_active)} style={{ padding:"4px 10px",borderRadius:"8px",border:`1px solid ${BORDER}`,background:W,fontSize:"10px",fontWeight:600,cursor:"pointer",color:TXT_MID }}>
                      {c.is_active ? "Disable" : (c.expires_at && new Date(c.expires_at) < new Date() ? "Re-enable" : "Enable")}
                    </button>
                    <button onClick={()=>handleDelete(c.id)} style={{ padding:"4px 10px",borderRadius:"8px",border:"1px solid #FECACA",background:W,fontSize:"10px",fontWeight:600,cursor:"pointer",color:"#DC2626" }}>Del</button>
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
