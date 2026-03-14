import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

const G = "#C8A97E", G_D = "#8B6914", W = "#FFFFFF", CREAM = "#FAFAF8";
const BORDER = "#EDEBE5", TXT = "#1C160E", TXT_MID = "#78716C", TXT_SOFT = "#A8A29E";
const SHADOW = "0 1px 3px rgba(0,0,0,0.04),0 4px 16px rgba(0,0,0,0.06)";
const inp: React.CSSProperties = { width:"100%", border:`1.5px solid ${BORDER}`, borderRadius:"10px", padding:"9px 12px", fontSize:"13px", color:TXT, outline:"none", background:W, fontFamily:"Montserrat,sans-serif" };
const lbl: React.CSSProperties = { fontSize:"11px", fontWeight:600, color:TXT_SOFT, textTransform:"uppercase", letterSpacing:"0.1em", display:"block", marginBottom:"6px" };

const emptyPlan = { name:"", description:"", price:"", billing_cycle:"monthly", included_services:"", max_usage_per_cycle:"2", is_active:true };

export default function SubscriptionsPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"plans"|"subscribers"|"assign">("plans");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string|null>(null);
  const [form, setForm] = useState(emptyPlan);
  const [saving, setSaving] = useState(false);
  const [assignForm, setAssignForm] = useState({ client_id:"", subscription_id:"" });

  const load = async () => {
    setLoading(true);
    try {
      const [plansRes, clientsRes] = await Promise.all([
        (supabase as any).from("subscription_plans").select("*").order("price"),
        (supabase as any).from("clients").select("id,name,phone").order("name"),
      ]);
      if (plansRes.error) throw plansRes.error;
      setPlans(plansRes.data || []);
      setClients(clientsRes.data || []);
      // Load subscribers separately — join may fail if FK not registered
      const subsRes = await (supabase as any)
        .from("client_subscriptions")
        .select("*, clients:client_id(name,phone)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (!subsRes.error) {
        // Manually attach plan name from plans array
        const subsWithPlan = (subsRes.data || []).map((s: any) => ({
          ...s,
          subscription_plans: plansRes.data?.find((p: any) => p.id === s.subscription_id) || null,
        }));
        setSubs(subsWithPlan);
      }
    } catch(e:any) {
      console.error("Subscriptions load error:", e);
      toast.error(e.message || "Could not load. Run the SQL migration first.");
    }
    finally { setLoading(false); }
  };
  useEffect(()=>{ load(); },[]);

  const reset = () => { setForm(emptyPlan); setEditId(null); setShowForm(false); };

  const savePlan = async () => {
    if (!form.name.trim()) { toast.error("Name required"); return; }
    if (!form.price) { toast.error("Price required"); return; }
    setSaving(true);
    try {
      const services = form.included_services.split("\n").map((s:string)=>s.trim()).filter(Boolean);
      const payload: any = { name:form.name.trim(), description:form.description.trim()||null, price:parseFloat(form.price)||0, billing_cycle:form.billing_cycle, max_usage_per_cycle:parseInt(form.max_usage_per_cycle)||2, is_active:form.is_active };
      // Only include included_services if column exists (added via SQL migration)
      try { payload.included_services = services; } catch(e) {}
      const { error } = editId ? await (supabase as any).from("subscription_plans").update(payload).eq("id",editId) : await (supabase as any).from("subscription_plans").insert([payload]);
      if (error) throw error;
      toast.success(editId?"Updated":"Plan created");
      reset(); load();
    } catch(e:any) { toast.error(e.message||"Failed"); } finally { setSaving(false); }
  };

  const deletePlan = async (id:string) => {
    if (!confirm("Delete this plan?")) return;
    await (supabase as any).from("subscription_plans").delete().eq("id",id);
    toast.success("Deleted"); load();
  };

  const assignSub = async () => {
    if (!assignForm.client_id || !assignForm.subscription_id) { toast.error("Select both client and plan"); return; }
    setSaving(true);
    try {
      const plan = plans.find(p=>p.id===assignForm.subscription_id);
      const nextBilling = new Date(); nextBilling.setMonth(nextBilling.getMonth()+1);
      const { error } = await (supabase as any).from("client_subscriptions").insert([{
        client_id: assignForm.client_id,
        subscription_id: assignForm.subscription_id,
        next_billing_date: nextBilling.toISOString(),
        status: "active",
      }]);
      if (error) throw error;
      toast.success("Subscription assigned");
      setAssignForm({ client_id:"", subscription_id:"" });
      load();
    } catch(e:any) { toast.error(e.message||"Failed"); } finally { setSaving(false); }
  };

  const updateSubStatus = async (id:string, status:string) => {
    await (supabase as any).from("client_subscriptions").update({ status }).eq("id",id);
    toast.success(`Subscription ${status}`); load();
  };

  const activeSubs = subs.filter(s=>s.status==="active");
  const mrr = activeSubs.reduce((t,s)=>t+Number(s.subscription_plans?.price||0),0);

  const STATUS_COLOR: Record<string,{bg:string;color:string}> = {
    active:{bg:"#F0FDF4",color:"#16A34A"},
    paused:{bg:"#FFFBEB",color:"#D97706"},
    cancelled:{bg:"#FEF2F2",color:"#DC2626"},
  };

  return (
    <div style={{ background:CREAM, minHeight:"100vh", padding:"clamp(16px,4vw,32px)", fontFamily:"Montserrat,sans-serif", color:TXT }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Montserrat:wght@400;500;600;700&display=swap');*{box-sizing:border-box}@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"28px", flexWrap:"wrap", gap:"12px" }}>
        <div>
          <p style={{ fontSize:"11px", fontWeight:700, letterSpacing:"0.16em", color:G, textTransform:"uppercase", marginBottom:"4px" }}>Recurring Revenue</p>
          <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(28px,4vw,42px)", fontWeight:700, color:TXT, margin:0, lineHeight:1 }}>Subscriptions</h1>
          <p style={{ fontSize:"12px", color:TXT_SOFT, marginTop:"6px" }}>Manage membership plans and subscribers</p>
        </div>
        {tab==="plans" && <button onClick={()=>{ reset(); setShowForm(v=>!v); }} style={{ padding:"10px 20px", borderRadius:"12px", background:showForm&&!editId?W:G, color:showForm&&!editId?TXT_MID:W, border:`1px solid ${showForm&&!editId?BORDER:G}`, fontSize:"13px", fontWeight:600, cursor:"pointer" }}>{showForm&&!editId?"Cancel":"+ New Plan"}</button>}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:"12px", marginBottom:"24px" }}>
        {[
          { l:"PLANS", v:plans.length, c:G_D, bg:"#FBF6EE", b:"#F0E4CC" },
          { l:"ACTIVE SUBS", v:activeSubs.length, c:"#16A34A", bg:"#F0FDF4", b:"#BBF7D0" },
          { l:"TOTAL SUBS", v:subs.length, c:"#6366F1", bg:"#EEF2FF", b:"#C7D2FE" },
          { l:"MONTHLY REVENUE", v:`GHS ${mrr.toFixed(0)}`, c:"#D97706", bg:"#FFFBEB", b:"#FDE68A" },
        ].map(k=>(
          <div key={k.l} style={{ background:k.bg, border:`1px solid ${k.b}`, borderRadius:"14px", padding:"16px 18px" }}>
            <p style={{ fontSize:"9px", fontWeight:700, letterSpacing:"0.12em", color:k.c, marginBottom:"6px" }}>{k.l}</p>
            <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:typeof k.v==="number"?"30px":"18px", fontWeight:700, color:TXT, margin:0 }}>{k.v}</p>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", gap:"6px", marginBottom:"20px" }}>
        {(["plans","subscribers","assign"] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{ padding:"8px 20px", borderRadius:"20px", border:`1.5px solid ${tab===t?G:BORDER}`, background:tab===t?G:W, color:tab===t?W:TXT_MID, fontSize:"12px", fontWeight:600, cursor:"pointer", textTransform:"capitalize" }}>{t}</button>
        ))}
      </div>

      {/* PLANS TAB */}
      {tab==="plans" && (
        <>
          {showForm && (
            <div style={{ background:W, border:`1px solid ${BORDER}`, borderLeft:`3px solid ${G}`, borderRadius:"16px", padding:"24px", boxShadow:SHADOW, marginBottom:"24px" }}>
              <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"20px", fontWeight:700, color:TXT, marginBottom:"20px" }}>{editId?"Edit Plan":"New Plan"}</p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px", marginBottom:"14px" }}>
                <div><label style={lbl}>Plan Name *</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} style={inp} placeholder="e.g. VIP Monthly" /></div>
                <div><label style={lbl}>Monthly Price (GHS) *</label><input type="number" min="0" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} style={inp} placeholder="0" /></div>
                <div><label style={lbl}>Billing Cycle</label>
                  <select value={form.billing_cycle} onChange={e=>setForm(f=>({...f,billing_cycle:e.target.value}))} style={inp}>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div><label style={lbl}>Max Uses Per Cycle</label><input type="number" min="1" value={form.max_usage_per_cycle} onChange={e=>setForm(f=>({...f,max_usage_per_cycle:e.target.value}))} style={inp} placeholder="2" /></div>
                <div style={{ gridColumn:"span 2" }}>
                  <label style={lbl}>Included Services (one per line)</label>
                  <textarea value={form.included_services} onChange={e=>setForm(f=>({...f,included_services:e.target.value}))} rows={3} style={{ ...inp,resize:"vertical" }} placeholder={"Wash & Go\nBlow Dry\nDeep Condition"} />
                </div>
                <div style={{ gridColumn:"span 2" }}>
                  <label style={lbl}>Description</label>
                  <input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} style={inp} placeholder="Optional" />
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                  <input type="checkbox" id="pa" checked={form.is_active} onChange={e=>setForm(f=>({...f,is_active:e.target.checked}))} />
                  <label htmlFor="pa" style={{ fontSize:"13px", fontWeight:500, cursor:"pointer" }}>Active</label>
                </div>
              </div>
              <div style={{ display:"flex", gap:"10px" }}>
                <button onClick={savePlan} disabled={saving} style={{ padding:"10px 24px", borderRadius:"10px", background:G, color:W, border:"none", fontSize:"13px", fontWeight:600, cursor:saving?"not-allowed":"pointer", opacity:saving?0.7:1 }}>{saving?"Saving...":(editId?"Update":"Save") + " Plan"}</button>
                <button onClick={reset} style={{ padding:"10px 20px", borderRadius:"10px", background:W, color:TXT_MID, border:`1px solid ${BORDER}`, fontSize:"13px", fontWeight:600, cursor:"pointer" }}>Cancel</button>
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ display:"flex", justifyContent:"center", padding:"60px" }}>
              <div style={{ width:"32px", height:"32px", border:`3px solid #F0E4CC`, borderTopColor:G, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
            </div>
          ) : plans.length === 0 ? (
            <div style={{ background:W, border:`1px solid ${BORDER}`, borderRadius:"16px", padding:"60px", textAlign:"center", boxShadow:SHADOW }}>
              <div style={{ fontSize:"40px", marginBottom:"14px" }}>♻</div>
              <p style={{ fontSize:"15px", fontWeight:500, color:TXT, marginBottom:"6px" }}>No subscription plans yet</p>
              <p style={{ fontSize:"12px", color:TXT_SOFT }}>Create membership plans to offer recurring services to your clients.</p>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:"16px" }}>
              {plans.map(p=>(
                <div key={p.id} style={{ background:W, border:`1px solid ${BORDER}`, borderRadius:"16px", padding:"24px", boxShadow:SHADOW, opacity:p.is_active?1:0.7 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"12px" }}>
                    <div>
                      <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"20px", fontWeight:700, color:TXT, margin:"0 0 4px" }}>{p.name}</p>
                      <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"28px", fontWeight:700, color:G_D, margin:0 }}>GHS {Number(p.price).toFixed(0)}<span style={{ fontSize:"12px", fontWeight:500, color:TXT_SOFT }}>/{p.billing_cycle==="monthly"?"mo":p.billing_cycle==="quarterly"?"qtr":"yr"}</span></p>
                    </div>
                    <span style={{ fontSize:"9px", padding:"3px 10px", borderRadius:"20px", fontWeight:700, background:p.is_active?"#F0FDF4":"#F5F5F5", color:p.is_active?"#16A34A":"#999" }}>{p.is_active?"ACTIVE":"OFF"}</span>
                  </div>
                  {p.description && <p style={{ fontSize:"12px", color:TXT_MID, marginBottom:"10px" }}>{p.description}</p>}
                  <p style={{ fontSize:"10px", fontWeight:700, color:TXT_SOFT, marginBottom:"4px", textTransform:"uppercase" }}>Includes (up to {p.max_usage_per_cycle} uses/cycle)</p>
                  {Array.isArray(p.included_services) && p.included_services.map((s:string,i:number)=>(
                    <p key={i} style={{ fontSize:"12px", color:TXT_MID, margin:"2px 0" }}>• {s}</p>
                  ))}
                  <div style={{ display:"flex", gap:"8px", marginTop:"16px" }}>
                    <button onClick={()=>{ setForm({ name:p.name, description:p.description||"", price:p.price.toString(), billing_cycle:p.billing_cycle, included_services:Array.isArray(p.included_services)?p.included_services.join("\n"):"", max_usage_per_cycle:p.max_usage_per_cycle.toString(), is_active:p.is_active }); setEditId(p.id); setShowForm(true); window.scrollTo({top:0,behavior:"smooth"}); }} style={{ flex:1, padding:"7px", borderRadius:"8px", border:`1px solid ${BORDER}`, background:W, fontSize:"11px", fontWeight:600, cursor:"pointer", color:TXT_MID }}>Edit</button>
                    <button onClick={()=>deletePlan(p.id)} style={{ padding:"7px 12px", borderRadius:"8px", border:"1px solid #FECACA", background:W, fontSize:"11px", fontWeight:600, cursor:"pointer", color:"#DC2626" }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* SUBSCRIBERS TAB */}
      {tab==="subscribers" && (
        <div style={{ background:W, border:`1px solid ${BORDER}`, borderRadius:"16px", boxShadow:SHADOW }}>
          {subs.length === 0 ? (
            <div style={{ padding:"60px", textAlign:"center" }}>
              <div style={{ fontSize:"40px", marginBottom:"14px" }}>👥</div>
              <p style={{ fontSize:"15px", fontWeight:500, color:TXT, marginBottom:"6px" }}>No subscribers yet</p>
              <p style={{ fontSize:"12px", color:TXT_SOFT }}>Assign plans to clients in the Assign tab.</p>
            </div>
          ) : (
            <>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 140px 130px 110px 120px", gap:"12px", padding:"12px 20px", borderBottom:`1px solid ${BORDER}` }}>
                {["Client","Plan","Started","Next Billing","Status"].map(h=>(
                  <span key={h} style={{ fontSize:"9px", fontWeight:700, letterSpacing:"0.1em", color:TXT_SOFT, textTransform:"uppercase" }}>{h}</span>
                ))}
              </div>
              {subs.map((s,i)=>{
                const sc = STATUS_COLOR[s.status]||{bg:"#F5F5F5",color:"#999"};
                return (
                  <div key={s.id} style={{ display:"grid", gridTemplateColumns:"1fr 140px 130px 110px 120px", gap:"12px", padding:"12px 20px", borderBottom:i<subs.length-1?`1px solid ${BORDER}`:"none", alignItems:"center" }}>
                    <div>
                      <p style={{ fontSize:"13px", fontWeight:600, color:TXT, margin:0 }}>{s.clients?.name||"Unknown"}</p>
                      <p style={{ fontSize:"10px", color:TXT_SOFT, margin:"2px 0 0" }}>{s.clients?.phone||""}</p>
                    </div>
                    <p style={{ fontSize:"12px", color:TXT_MID, margin:0 }}>{s.subscription_plans?.name||"—"}</p>
                    <p style={{ fontSize:"11px", color:TXT_SOFT, margin:0 }}>{s.start_date?format(new Date(s.start_date),"MMM d, yyyy"):"—"}</p>
                    <p style={{ fontSize:"11px", color:TXT_SOFT, margin:0 }}>{s.next_billing_date?format(new Date(s.next_billing_date),"MMM d, yyyy"):"—"}</p>
                    <div style={{ display:"flex", gap:"4px", alignItems:"center" }}>
                      <span style={{ display:"inline-block", padding:"3px 10px", borderRadius:"20px", fontSize:"10px", fontWeight:700, background:sc.bg, color:sc.color }}>{s.status}</span>
                      {s.status==="active" && <button onClick={()=>updateSubStatus(s.id,"cancelled")} style={{ fontSize:"9px", padding:"2px 6px", borderRadius:"6px", border:"1px solid #FECACA", background:W, color:"#DC2626", cursor:"pointer" }}>Cancel</button>}
                      {s.status==="cancelled" && <button onClick={()=>updateSubStatus(s.id,"active")} style={{ fontSize:"9px", padding:"2px 6px", borderRadius:"6px", border:"1px solid #BBF7D0", background:W, color:"#16A34A", cursor:"pointer" }}>Reactivate</button>}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* ASSIGN TAB */}
      {tab==="assign" && (
        <div style={{ background:W, border:`1px solid ${BORDER}`, borderRadius:"16px", padding:"28px", boxShadow:SHADOW, maxWidth:"480px" }}>
          <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"20px", fontWeight:700, color:TXT, marginBottom:"20px" }}>Assign Plan to Client</p>
          <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
            <div>
              <label style={lbl}>Client</label>
              <select value={assignForm.client_id} onChange={e=>setAssignForm(f=>({...f,client_id:e.target.value}))} style={inp}>
                <option value="">Select client...</option>
                {clients.map(c=><option key={c.id} value={c.id}>{c.name}{c.phone?` — ${c.phone}`:""}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Subscription Plan</label>
              <select value={assignForm.subscription_id} onChange={e=>setAssignForm(f=>({...f,subscription_id:e.target.value}))} style={inp}>
                <option value="">Select plan...</option>
                {plans.filter(p=>p.is_active).map(p=><option key={p.id} value={p.id}>{p.name} — GHS {Number(p.price).toFixed(0)}/mo</option>)}
              </select>
            </div>
            <button onClick={assignSub} disabled={saving||!assignForm.client_id||!assignForm.subscription_id}
              style={{ padding:"12px 24px", borderRadius:"10px", background:G, color:W, border:"none", fontSize:"13px", fontWeight:600, cursor:"pointer", opacity:saving||!assignForm.client_id||!assignForm.subscription_id?0.6:1 }}>
              {saving?"Assigning...":"Assign Subscription"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
