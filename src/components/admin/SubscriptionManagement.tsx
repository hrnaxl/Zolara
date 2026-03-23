import { useEffect, useState } from "react";
import { getSubscriptionPlans, createSubscriptionPlan, updateSubscriptionPlan, getAllSubscriptions } from "@/lib/subscriptions";
import { toast } from "sonner";


export default function SubscriptionManagement() {
const G="#C8A97E",G2="#8B6914",CREAM="#FAFAF8",WHITE="#FFFFFF",BORDER="#EDEBE5",TXT="#1C1917",TXT_MID="#78716C",TXT_SOFT="#A8A29E",SHADOW="0 1px 3px rgba(0,0,0,0.04),0 4px 16px rgba(0,0,0,0.06)";
const BILLING_CYCLES=["monthly","quarterly","yearly"];
  const [plans,setPlans]=useState<any[]>([]);
  const [subscriptions,setSubscriptions]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [showForm,setShowForm]=useState(false);
  const [editId,setEditId]=useState<string|null>(null);
  const [tab,setTab]=useState<"plans"|"subscribers">("plans");
  const [form,setForm]=useState({name:"",description:"",billing_cycle:"monthly",price:"",max_services_per_cycle:"",discount_percentage:"",features:""});

  const load=async()=>{ try{const[p,s]=await Promise.all([getSubscriptionPlans(),getAllSubscriptions()]);setPlans(p||[]);setSubscriptions(s||[]);}catch{toast.error("Failed to load");}finally{setLoading(false);} };
  useEffect(()=>{load();},[]);

  const resetForm=()=>{setForm({name:"",description:"",billing_cycle:"monthly",price:"",max_services_per_cycle:"",discount_percentage:"",features:""});setEditId(null);setShowForm(false);};

  const handleSubmit=async()=>{
    if(!form.name||!form.price){toast.error("Name and price required");return;}
    const payload={name:form.name,description:form.description,billing_cycle:form.billing_cycle,price:parseFloat(form.price),max_services_per_cycle:form.max_services_per_cycle?parseInt(form.max_services_per_cycle):null,discount_percentage:form.discount_percentage?parseFloat(form.discount_percentage):0,features:form.features?form.features.split("\n").filter(Boolean):[]};
    try {
      if(editId){await updateSubscriptionPlan(editId,payload);toast.success("Plan updated");}
      else{await createSubscriptionPlan(payload);toast.success("Plan created");}
      resetForm();load();
    }catch(e:any){toast.error(e.message||"Failed");}
  };
  const handleEdit=(p:any)=>{setEditId(p.id);setForm({name:p.name,description:p.description||"",billing_cycle:p.billing_cycle||"monthly",price:String(p.price),max_services_per_cycle:p.max_services_per_cycle?String(p.max_services_per_cycle):"",discount_percentage:p.discount_percentage?String(p.discount_percentage):"",features:Array.isArray(p.features)?p.features.join("\n"):""});setShowForm(true);};

  const inp={border:`1.5px solid ${BORDER}`,borderRadius:"10px",padding:"10px 14px",fontSize:"13px",outline:"none",width:"100%",background:WHITE,color:TXT} as React.CSSProperties;
  const cycleColor=(c:string)=>c==="yearly"?{bg:"#EEF2FF",color:"#4F46E5"}:c==="quarterly"?{bg:"#FEF3C7",color:"#D97706"}:{bg:"#F0FDF4",color:"#16A34A"};
  const statusColor=(s:string)=>s==="active"?{bg:"#F0FDF4",color:"#16A34A"}:s==="cancelled"?{bg:"#FEF2F2",color:"#DC2626"}:{bg:"#FFFBEB",color:"#D97706"};

  if(loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"60px"}}><div style={{width:"32px",height:"32px",borderRadius:"50%",border:`3px solid #F5ECD6`,borderTopColor:G,animation:"spin 0.8s linear infinite"}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;

  return (
    <div style={{fontFamily:"Montserrat,sans-serif",color:TXT}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>

      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:"24px"}}>
        <div>
          <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(26px,3.5vw,38px)",fontWeight:700,color:TXT,margin:0}}>Subscriptions</h1>
          <p style={{fontSize:"13px",color:TXT_SOFT,marginTop:"4px"}}>Membership plans and active subscribers</p>
        </div>
        {tab==="plans"&&<button onClick={()=>{resetForm();setShowForm(!showForm);}} style={{background:showForm?"#F5ECD6":G2,color:showForm?G2:WHITE,border:"none",borderRadius:"12px",padding:"11px 20px",fontSize:"13px",fontWeight:600,cursor:"pointer"}}>{showForm?"✕ Cancel":"+ New Plan"}</button>}
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:"4px",background:"#F3EDE3",borderRadius:"12px",padding:"4px",marginBottom:"24px",width:"fit-content"}}>
        {(["plans","subscribers"] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{padding:"8px 20px",borderRadius:"9px",border:"none",fontFamily:"Montserrat,sans-serif",fontSize:"13px",fontWeight:600,cursor:"pointer",transition:"all 0.2s",background:tab===t?WHITE:"transparent",color:tab===t?G2:TXT_MID,boxShadow:tab===t?SHADOW:"none"}}>
            {t==="plans"?`Plans (${plans.length})`:`Subscribers (${subscriptions.length})`}
          </button>
        ))}
      </div>

      {tab==="plans" && (
        <>
          {showForm&&(
            <div style={{background:WHITE,border:`1.5px solid ${G}`,borderRadius:"16px",padding:"24px",marginBottom:"24px",boxShadow:SHADOW,animation:"up 0.25s ease"}}>
              <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"20px",fontWeight:700,margin:"0 0 20px"}}>{editId?"Edit Plan":"New Subscription Plan"}</h3>
              <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"16px"}}>
                {[{l:"Plan Name *",k:"name",ph:"e.g. Beauty Plus"},{l:"Price (GHS/cycle) *",k:"price",ph:"0.00",type:"number"},{l:"Max Services/Cycle",k:"max_services_per_cycle",ph:"Leave blank for unlimited",type:"number"},{l:"Discount %",k:"discount_percentage",ph:"e.g. 10",type:"number"}].map(f=>(
                  <div key={f.k}><label style={{fontSize:"12px",fontWeight:600,color:TXT_MID,display:"block",marginBottom:"6px"}}>{f.l}</label><input type={f.type||"text"} value={(form as any)[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} placeholder={f.ph} style={inp}/></div>
                ))}
                <div><label style={{fontSize:"12px",fontWeight:600,color:TXT_MID,display:"block",marginBottom:"6px"}}>Billing Cycle</label>
                  <select value={form.billing_cycle} onChange={e=>setForm(p=>({...p,billing_cycle:e.target.value}))} style={inp}>
                    {BILLING_CYCLES.map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                  </select>
                </div>
                <div style={{gridColumn:"1/-1"}}><label style={{fontSize:"12px",fontWeight:600,color:TXT_MID,display:"block",marginBottom:"6px"}}>Features (one per line)</label><textarea value={form.features} onChange={e=>setForm(p=>({...p,features:e.target.value}))} rows={3} placeholder="Free wash monthly&#10;10% off all services" style={{...inp,resize:"vertical"}}/></div>
                <div style={{gridColumn:"1/-1"}}><label style={{fontSize:"12px",fontWeight:600,color:TXT_MID,display:"block",marginBottom:"6px"}}>Description</label><textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} rows={2} style={{...inp,resize:"vertical"}}/></div>
              </div>
              <div style={{display:"flex",gap:"12px",marginTop:"20px"}}>
                <button onClick={handleSubmit} style={{background:G2,color:WHITE,border:"none",borderRadius:"10px",padding:"11px 24px",fontSize:"13px",fontWeight:600,cursor:"pointer"}}>{editId?"Update":"Create Plan"}</button>
                <button onClick={resetForm} style={{background:CREAM,color:TXT_MID,border:`1px solid ${BORDER}`,borderRadius:"10px",padding:"11px 24px",fontSize:"13px",fontWeight:600,cursor:"pointer"}}>Cancel</button>
              </div>
            </div>
          )}
          {plans.length===0?(
            <div style={{background:WHITE,border:`1px solid ${BORDER}`,borderRadius:"16px",padding:"60px 20px",textAlign:"center",boxShadow:SHADOW}}>
              <p style={{fontSize:"40px",margin:"0 0 12px"}}>💎</p>
              <p style={{fontSize:"16px",fontWeight:600,color:TXT,margin:"0 0 4px"}}>No subscription plans yet</p>
              <p style={{fontSize:"13px",color:TXT_SOFT}}>Create membership plans for loyal clients</p>
            </div>
          ):(
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:"16px"}}>
              {plans.map(plan=>{
                const cc=cycleColor(plan.billing_cycle);
                return (
                  <div key={plan.id} style={{background:WHITE,border:`1px solid ${BORDER}`,borderRadius:"18px",padding:"24px",boxShadow:SHADOW}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"14px"}}>
                      <div>
                        <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"22px",fontWeight:700,color:TXT,margin:0}}>{plan.name}</p>
                        <span style={{display:"inline-block",fontSize:"10px",fontWeight:700,letterSpacing:"0.08em",background:cc.bg,color:cc.color,borderRadius:"20px",padding:"3px 10px",marginTop:"6px"}}>{plan.billing_cycle.toUpperCase()}</span>
                      </div>
                      <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"28px",fontWeight:700,color:G2,margin:0}}>GHS {Number(plan.price).toLocaleString()}</p>
                    </div>
                    {plan.description&&<p style={{fontSize:"12px",color:TXT_MID,marginBottom:"12px",lineHeight:1.5}}>{plan.description}</p>}
                    {Array.isArray(plan.features)&&plan.features.length>0&&(
                      <ul style={{listStyle:"none",padding:0,margin:"0 0 16px",display:"flex",flexDirection:"column",gap:"6px"}}>
                        {plan.features.map((f:string,i:number)=><li key={i} style={{fontSize:"12px",color:TXT_MID,display:"flex",gap:"8px",alignItems:"flex-start"}}><span style={{color:G,flexShrink:0}}>✓</span>{f}</li>)}
                      </ul>
                    )}
                    <div style={{display:"flex",gap:"8px"}}>
                      <button onClick={()=>handleEdit(plan)} style={{flex:1,background:CREAM,color:TXT_MID,border:`1px solid ${BORDER}`,borderRadius:"8px",padding:"8px",fontSize:"12px",fontWeight:600,cursor:"pointer"}}>Edit</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab==="subscribers"&&(
        subscriptions.length===0?(
          <div style={{background:WHITE,border:`1px solid ${BORDER}`,borderRadius:"16px",padding:"60px 20px",textAlign:"center",boxShadow:SHADOW}}>
            <p style={{fontSize:"40px",margin:"0 0 12px"}}>👥</p>
            <p style={{fontSize:"16px",fontWeight:600,color:TXT,margin:"0 0 4px"}}>No subscribers yet</p>
            <p style={{fontSize:"13px",color:TXT_SOFT}}>Clients who subscribe to your plans will appear here</p>
          </div>
        ):(
          <div style={{background:WHITE,border:`1px solid ${BORDER}`,borderRadius:"16px",overflow:"hidden",boxShadow:SHADOW}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr style={{background:"#F9F6F1",borderBottom:`1px solid ${BORDER}`}}>
                {["CLIENT","PLAN","CYCLE","STARTED","STATUS"].map(h=><th key={h} style={{padding:"12px 16px",textAlign:"left",fontSize:"10px",fontWeight:700,letterSpacing:"0.1em",color:TXT_SOFT}}>{h}</th>)}
              </tr></thead>
              <tbody>{subscriptions.map(s=>{
                const sc=statusColor(s.status||"active");
                return <tr key={s.id} style={{borderBottom:`1px solid ${BORDER}`}}>
                  <td style={{padding:"14px 16px",fontWeight:600,fontSize:"13px"}}>{s.clients?.name||s.client_name||"Unknown"}</td>
                  <td style={{padding:"14px 16px",fontSize:"13px",color:G2,fontWeight:600}}>{s.subscription_plans?.name||"—"}</td>
                  <td style={{padding:"14px 16px"}}><span style={{fontSize:"10px",fontWeight:700,background:cycleColor(s.billing_cycle||"monthly").bg,color:cycleColor(s.billing_cycle||"monthly").color,borderRadius:"20px",padding:"3px 10px"}}>{(s.billing_cycle||"monthly").toUpperCase()}</span></td>
                  <td style={{padding:"14px 16px",fontSize:"12px",color:TXT_MID}}>{s.started_at?new Date(s.started_at).toLocaleDateString("en-GH",{day:"numeric",month:"short",year:"numeric"}):"—"}</td>
                  <td style={{padding:"14px 16px"}}><span style={{fontSize:"11px",fontWeight:600,background:sc.bg,color:sc.color,borderRadius:"20px",padding:"4px 12px"}}>{s.status||"active"}</span></td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
