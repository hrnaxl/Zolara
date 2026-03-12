import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

const G="#C8A97E",G_D="#8B6914",W="#FFFFFF",CREAM="#FAFAF8",BORDER="#EDEBE5",TXT="#1C160E",TXT_MID="#78716C",TXT_SOFT="#A8A29E";
const SHADOW="0 1px 3px rgba(0,0,0,0.04),0 4px 16px rgba(0,0,0,0.06)";
const card: React.CSSProperties={background:W,border:`1px solid ${BORDER}`,borderRadius:"16px",padding:"24px",boxShadow:SHADOW};
const inp: React.CSSProperties={width:"100%",border:`1.5px solid ${BORDER}`,borderRadius:"10px",padding:"9px 12px",fontSize:"13px",color:TXT,outline:"none",background:W,fontFamily:"Montserrat,sans-serif"};

const CYCLE_LABEL: Record<string,string> = { monthly:"Monthly", quarterly:"Quarterly", yearly:"Yearly" };
const STATUS_COLORS: Record<string,{bg:string;color:string}> = {
  active:{bg:"#F0FDF4",color:"#16A34A"},
  inactive:{bg:"#F5F5F5",color:"#999"},
  cancelled:{bg:"#FEF2F2",color:"#DC2626"},
  expired:{bg:"#FFF7ED",color:"#EA580C"},
};

export default function SubscriptionsPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"plans"|"subscribers">("plans");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string|null>(null);
  const emptyForm = { name:"", description:"", price:"", billing_cycle:"monthly", features:"", is_active:true };
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    try {
      const [{ data:p }, { data:s }] = await Promise.all([
        supabase.from("subscription_plans" as any).select("*").order("price"),
        supabase.from("subscriptions" as any).select("*, subscription_plans(name,price)").order("created_at",{ascending:false}).limit(100),
      ]);
      setPlans((p as any[])||[]); setSubs((s as any[])||[]);
    } catch { /* tables may not exist */ }
    finally { setLoading(false); }
  };
  useEffect(()=>{ load(); },[]);

  const resetForm = () => { setForm(emptyForm); setEditId(null); setShowForm(false); };

  const handleSubmit = async () => {
    if (!form.name || !form.price) { toast.error("Name and price required"); return; }
    try {
      const data: any = { name:form.name, description:form.description, price:parseFloat(form.price), billing_cycle:form.billing_cycle, is_active:form.is_active,
        features: form.features ? form.features.split("\n").filter(Boolean) : [] };
      if (editId) { await supabase.from("subscription_plans" as any).update(data).eq("id",editId); toast.success("Plan updated"); }
      else { await supabase.from("subscription_plans" as any).insert([data]); toast.success("Plan created"); }
      resetForm(); load();
    } catch (e:any) { toast.error(e.message||"Failed to save"); }
  };

  const handleEdit = (p: any) => {
    setForm({ name:p.name, description:p.description||"", price:p.price.toString(), billing_cycle:p.billing_cycle||"monthly", features:Array.isArray(p.features)?p.features.join("\n"):p.features||"", is_active:p.is_active });
    setEditId(p.id); setShowForm(true);
  };

  const handleDelete = async (id:string) => {
    if (!confirm("Delete this plan?")) return;
    try { await supabase.from("subscription_plans" as any).delete().eq("id",id); toast.success("Deleted"); load(); } catch { toast.error("Failed"); }
  };

  const activeSubs = subs.filter(s=>s.status==="active");
  const mrr = activeSubs.reduce((total,s)=>{
    const p = s.subscription_plans;
    if (!p) return total;
    const m = s.billing_cycle==="monthly"?p.price:s.billing_cycle==="quarterly"?p.price/3:p.price/12;
    return total+m;
  },0);

  return (
    <div style={{ background:CREAM,minHeight:"100vh",padding:"clamp(16px,4vw,32px)",fontFamily:"Montserrat,sans-serif",color:TXT }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap');*{box-sizing:border-box}`}</style>

      <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:"28px",flexWrap:"wrap",gap:"12px" }}>
        <div>
          <p style={{ fontSize:"11px",fontWeight:700,letterSpacing:"0.16em",color:G,textTransform:"uppercase",marginBottom:"4px" }}>Recurring Revenue</p>
          <h1 style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(28px,4vw,42px)",fontWeight:700,color:TXT,margin:0,lineHeight:1 }}>Subscriptions</h1>
          <p style={{ fontSize:"12px",color:TXT_SOFT,marginTop:"6px" }}>Manage membership plans and subscribers</p>
        </div>
        {tab==="plans" && (
          <button onClick={()=>{ resetForm(); setShowForm(!showForm); }} style={{ padding:"10px 20px",borderRadius:"12px",background:G,color:W,border:"none",fontSize:"13px",fontWeight:600,cursor:"pointer" }}>
            {showForm?"Cancel":"+ New Plan"}
          </button>
        )}
      </div>

      {/* KPI */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:"14px",marginBottom:"24px" }}>
        {[
          { label:"PLANS", value:plans.length, color:G_D, bg:"#FBF6EE", border:"#F0E4CC" },
          { label:"ACTIVE SUBS", value:activeSubs.length, color:"#16A34A", bg:"#F0FDF4", border:"#BBF7D0" },
          { label:"TOTAL SUBS", value:subs.length, color:"#6366F1", bg:"#EEF2FF", border:"#C7D2FE" },
          { label:"EST. MRR", value:`GH₵${mrr.toFixed(0)}`, color:"#D97706", bg:"#FFFBEB", border:"#FDE68A" },
        ].map(k=>(
          <div key={k.label} style={{ background:k.bg,border:`1px solid ${k.border}`,borderRadius:"14px",padding:"18px 20px" }}>
            <p style={{ fontSize:"10px",fontWeight:700,letterSpacing:"0.1em",color:k.color,marginBottom:"6px" }}>{k.label}</p>
            <p style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:"30px",fontWeight:700,color:TXT,margin:0 }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:"flex",gap:"6px",marginBottom:"20px" }}>
        {(["plans","subscribers"] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{ padding:"8px 20px",borderRadius:"20px",border:`1.5px solid ${tab===t?G:BORDER}`,background:tab===t?G:W,color:tab===t?W:TXT_MID,fontSize:"12px",fontWeight:600,cursor:"pointer",textTransform:"capitalize" }}>{t}</button>
        ))}
      </div>

      {tab==="plans" ? (
        <>
          {showForm && (
            <div style={{ ...card,marginBottom:"24px",borderLeft:`3px solid ${G}` }}>
              <p style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:"18px",fontWeight:700,color:TXT,marginBottom:"20px" }}>{editId?"Edit Plan":"New Subscription Plan"}</p>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginBottom:"14px" }}>
                <div><label style={{ fontSize:"11px",fontWeight:600,color:TXT_SOFT,textTransform:"uppercase",letterSpacing:"0.1em",display:"block",marginBottom:"6px" }}>Plan Name *</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} style={inp} /></div>
                <div><label style={{ fontSize:"11px",fontWeight:600,color:TXT_SOFT,textTransform:"uppercase",letterSpacing:"0.1em",display:"block",marginBottom:"6px" }}>Price (GHS) *</label><input type="number" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} style={inp} /></div>
                <div><label style={{ fontSize:"11px",fontWeight:600,color:TXT_SOFT,textTransform:"uppercase",letterSpacing:"0.1em",display:"block",marginBottom:"6px" }}>Billing Cycle</label>
                  <select value={form.billing_cycle} onChange={e=>setForm(f=>({...f,billing_cycle:e.target.value}))} style={inp}>
                    <option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option>
                  </select>
                </div>
                <div style={{ display:"flex",alignItems:"center",paddingTop:"24px" }}>
                  <label style={{ display:"flex",alignItems:"center",gap:"8px",fontSize:"13px",fontWeight:500,cursor:"pointer" }}><input type="checkbox" checked={form.is_active} onChange={e=>setForm(f=>({...f,is_active:e.target.checked}))} />Active</label>
                </div>
                <div style={{ gridColumn:"span 2" }}><label style={{ fontSize:"11px",fontWeight:600,color:TXT_SOFT,textTransform:"uppercase",letterSpacing:"0.1em",display:"block",marginBottom:"6px" }}>Features (one per line)</label><textarea value={form.features} onChange={e=>setForm(f=>({...f,features:e.target.value}))} rows={4} style={{ ...inp,resize:"vertical" }} placeholder="Free blowout&#10;10% discount on services&#10;Priority booking" /></div>
                <div style={{ gridColumn:"span 2" }}><label style={{ fontSize:"11px",fontWeight:600,color:TXT_SOFT,textTransform:"uppercase",letterSpacing:"0.1em",display:"block",marginBottom:"6px" }}>Description</label><input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} style={inp} /></div>
              </div>
              <div style={{ display:"flex",gap:"10px" }}>
                <button onClick={handleSubmit} style={{ padding:"10px 24px",borderRadius:"10px",background:G,color:W,border:"none",fontSize:"13px",fontWeight:600,cursor:"pointer" }}>{editId?"Update":"Save"} Plan</button>
                <button onClick={resetForm} style={{ padding:"10px 20px",borderRadius:"10px",background:W,color:TXT_MID,border:`1px solid ${BORDER}`,fontSize:"13px",fontWeight:600,cursor:"pointer" }}>Cancel</button>
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ display:"flex",justifyContent:"center",padding:"60px" }}><div style={{ width:"32px",height:"32px",border:`3px solid #F0E4CC`,borderTopColor:G,borderRadius:"50%",animation:"spin 0.8s linear infinite" }}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
          ) : plans.length===0 ? (
            <div style={{ ...card,textAlign:"center",padding:"60px" }}>
              <div style={{ fontSize:"40px",marginBottom:"14px" }}>♻️</div>
              <p style={{ fontSize:"15px",fontWeight:500,color:TXT,marginBottom:"6px" }}>No subscription plans yet</p>
              <p style={{ fontSize:"12px",color:TXT_SOFT }}>Create membership plans for regular clients</p>
            </div>
          ) : (
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:"16px" }}>
              {plans.map(p=>(
                <div key={p.id} style={{ background:W,border:`1px solid ${BORDER}`,borderRadius:"16px",padding:"24px",boxShadow:SHADOW,opacity:p.is_active?1:0.7,position:"relative" }}>
                  {p.is_featured && <div style={{ position:"absolute",top:"12px",right:"12px",padding:"3px 10px",borderRadius:"20px",fontSize:"9px",fontWeight:700,background:"#FFFBEB",color:"#D97706" }}>Popular</div>}
                  <p style={{ fontSize:"10px",fontWeight:700,letterSpacing:"0.12em",color:TXT_SOFT,textTransform:"uppercase",marginBottom:"8px" }}>{CYCLE_LABEL[p.billing_cycle]||p.billing_cycle}</p>
                  <p style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:"20px",fontWeight:700,color:TXT,margin:"0 0 4px" }}>{p.name}</p>
                  <p style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:"32px",fontWeight:700,color:G_D,margin:"0 0 12px" }}>GH₵{Number(p.price).toLocaleString()}<span style={{ fontSize:"14px",fontWeight:500,color:TXT_SOFT }}>/{p.billing_cycle==="monthly"?"mo":p.billing_cycle==="quarterly"?"qtr":"yr"}</span></p>
                  {p.description && <p style={{ fontSize:"12px",color:TXT_MID,marginBottom:"12px" }}>{p.description}</p>}
                  {Array.isArray(p.features) && p.features.length>0 && (
                    <ul style={{ margin:"0 0 16px",padding:"0 0 0 16px" }}>
                      {p.features.map((f:string,i:number)=><li key={i} style={{ fontSize:"12px",color:TXT_MID,marginBottom:"4px" }}>{f}</li>)}
                    </ul>
                  )}
                  <div style={{ display:"flex",gap:"8px" }}>
                    <button onClick={()=>handleEdit(p)} style={{ flex:1,padding:"7px",borderRadius:"9px",border:`1px solid ${BORDER}`,background:W,fontSize:"11px",fontWeight:600,cursor:"pointer",color:TXT_MID }}>Edit</button>
                    <button onClick={()=>handleDelete(p.id)} style={{ padding:"7px 12px",borderRadius:"9px",border:"1px solid #FECACA",background:W,fontSize:"11px",fontWeight:600,cursor:"pointer",color:"#DC2626" }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div style={card}>
          {subs.length===0 ? (
            <div style={{ textAlign:"center",padding:"60px 0",color:TXT_SOFT }}>
              <div style={{ fontSize:"40px",marginBottom:"14px" }}>👥</div>
              <p style={{ fontSize:"15px",fontWeight:500 }}>No subscribers yet</p>
            </div>
          ) : (
            <>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 130px 120px 120px 100px",gap:"12px",padding:"8px 14px",borderBottom:`1px solid ${BORDER}`,marginBottom:"4px" }}>
                {["Subscriber","Plan","Started","Renews","Status"].map(h=><span key={h} style={{ fontSize:"9px",fontWeight:700,letterSpacing:"0.1em",color:TXT_SOFT,textTransform:"uppercase" }}>{h}</span>)}
              </div>
              {subs.map((s,i)=>{
                const sc=STATUS_COLORS[s.status]||{bg:"#F5F5F5",color:"#999"};
                return (
                  <div key={s.id} style={{ display:"grid",gridTemplateColumns:"1fr 130px 120px 120px 100px",gap:"12px",padding:"12px 14px",borderRadius:"10px",alignItems:"center",borderBottom:i<subs.length-1?`1px solid ${BORDER}`:"none" }}>
                    <div>
                      <p style={{ fontSize:"12px",fontWeight:600,color:TXT,margin:0 }}>{s.client_name||s.client_email||"—"}</p>
                      <p style={{ fontSize:"10px",color:TXT_SOFT,margin:"2px 0 0" }}>{s.client_phone||""}</p>
                    </div>
                    <p style={{ fontSize:"12px",color:TXT_MID,margin:0 }}>{s.subscription_plans?.name||"—"}</p>
                    <p style={{ fontSize:"11px",color:TXT_SOFT,margin:0 }}>{s.start_date?format(new Date(s.start_date),"MMM d, yyyy"):"—"}</p>
                    <p style={{ fontSize:"11px",color:TXT_SOFT,margin:0 }}>{s.renewal_date?format(new Date(s.renewal_date),"MMM d, yyyy"):"—"}</p>
                    <span style={{ display:"inline-block",padding:"3px 10px",borderRadius:"20px",fontSize:"10px",fontWeight:700,background:sc.bg,color:sc.color }}>{s.status}</span>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
