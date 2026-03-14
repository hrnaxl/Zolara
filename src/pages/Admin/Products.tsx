import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const G = "#C8A97E", G_D = "#8B6914", W = "#FFFFFF", CREAM = "#FAFAF8";
const BORDER = "#EDEBE5", TXT = "#1C160E", TXT_MID = "#78716C", TXT_SOFT = "#A8A29E";
const SHADOW = "0 1px 3px rgba(0,0,0,0.04),0 4px 16px rgba(0,0,0,0.06)";

type Product = { id:string; name:string; description:string|null; price:number; cost_price:number; stock_quantity:number; low_stock_threshold:number; category:string|null; is_active:boolean; created_at:string };
const empty = { name:"", description:"", price:"", cost_price:"", stock_quantity:"", low_stock_threshold:"5", category:"", is_active:true };
const inp: React.CSSProperties = { width:"100%", border:`1.5px solid ${BORDER}`, borderRadius:"10px", padding:"9px 12px", fontSize:"13px", color:TXT, outline:"none", background:W, fontFamily:"Montserrat,sans-serif" };
const lbl: React.CSSProperties = { fontSize:"11px", fontWeight:600, color:TXT_SOFT, textTransform:"uppercase", letterSpacing:"0.1em", display:"block", marginBottom:"6px" };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string|null>(null);
  const [form, setForm] = useState(empty);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).from("products").select("*").order("created_at",{ascending:false});
    if (error) toast.error("Could not load products. Make sure to run the SQL migration.");
    else setProducts(data || []);
    setLoading(false);
  };
  useEffect(()=>{ load(); },[]);

  const reset = () => { setForm(empty); setEditId(null); setShowForm(false); };

  const save = async () => {
    if (!form.name.trim()) { toast.error("Name required"); return; }
    if (!form.price) { toast.error("Price required"); return; }
    setSaving(true);
    try {
      const payload = { name:form.name.trim(), description:form.description.trim()||null, price:parseFloat(form.price)||0, cost_price:parseFloat(form.cost_price)||0, stock_quantity:parseInt(form.stock_quantity)||0, low_stock_threshold:parseInt(form.low_stock_threshold)||5, category:form.category.trim()||null, is_active:form.is_active };
      const { error } = editId ? await (supabase as any).from("products").update(payload).eq("id",editId) : await (supabase as any).from("products").insert([payload]);
      if (error) throw error;
      toast.success(editId ? "Updated" : "Product created");
      reset(); load();
    } catch(e:any) { toast.error(e.message||"Failed"); } finally { setSaving(false); }
  };

  const del = async (id:string) => {
    if (!confirm("Delete this product?")) return;
    await (supabase as any).from("products").delete().eq("id",id);
    toast.success("Deleted"); load();
  };

  const toggle = async (p:Product) => { await (supabase as any).from("products").update({is_active:!p.is_active}).eq("id",p.id); load(); };
  const adj = async (p:Product,d:number) => { await (supabase as any).from("products").update({stock_quantity:Math.max(0,p.stock_quantity+d)}).eq("id",p.id); load(); };

  const [userRole, setUserRole] = useState("");
  const [actualProductRevenue, setActualProductRevenue] = useState(0);
  const [actualProductCost, setActualProductCost] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        (supabase as any).from("user_roles").select("role").eq("user_id", user.id).single()
          .then(({ data }: any) => { if (data?.role) setUserRole(data.role); });
      }
    });
    // Fetch actual product revenue from checkout_items
    (supabase as any).from("checkout_items")
      .select("item_id, price_at_time, subtotal, quantity")
      .eq("item_type", "product")
      .then(({ data }: any) => {
        const rev = (data || []).reduce((s: number, i: any) => s + Number(i.subtotal || i.price_at_time || 0), 0);
        setActualProductRevenue(rev);
      });
  }, []);

  // Recalculate actual cost when products load
  useEffect(() => {
    if (actualProductRevenue === 0) return;
    // Fetch checkout_items with product cost lookup
    (supabase as any).from("checkout_items")
      .select("item_id, quantity")
      .eq("item_type", "product")
      .then(async ({ data }: any) => {
        const items = data || [];
        let totalCostSold = 0;
        for (const item of items) {
          const { data: prod } = await (supabase as any).from("products").select("cost_price").eq("id", item.item_id).single();
          if (prod?.cost_price) totalCostSold += Number(prod.cost_price) * Number(item.quantity || 1);
        }
        setActualProductCost(totalCostSold);
      });
  }, [actualProductRevenue]);

  const isFinancial = userRole === "owner" || userRole === "admin";

  const filtered = products.filter(p => { const s=search.toLowerCase(); return !s||p.name.toLowerCase().includes(s)||(p.category||"").toLowerCase().includes(s); });
  const lowStock = products.filter(p=>p.stock_quantity<=p.low_stock_threshold);
  const totalValue = products.reduce((s,p)=>s+p.price*p.stock_quantity,0);
  const totalCost = products.reduce((s,p)=>s+p.cost_price*p.stock_quantity,0);
  const potentialProfit = totalValue - totalCost;
  const profitMargin = totalValue > 0 ? ((potentialProfit/totalValue)*100).toFixed(1) : "0.0";

  return (
    <div style={{ background:CREAM, minHeight:"100vh", padding:"clamp(16px,4vw,32px)", fontFamily:"Montserrat,sans-serif", color:TXT }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Montserrat:wght@400;500;600;700&display=swap');*{box-sizing:border-box}@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"28px", flexWrap:"wrap", gap:"12px" }}>
        <div>
          <p style={{ fontSize:"11px", fontWeight:700, letterSpacing:"0.16em", color:G, textTransform:"uppercase", marginBottom:"4px" }}>Inventory</p>
          <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(28px,4vw,42px)", fontWeight:700, color:TXT, margin:0, lineHeight:1 }}>Products</h1>
          <p style={{ fontSize:"12px", color:TXT_SOFT, marginTop:"6px" }}>Manage retail products and inventory</p>
        </div>
        <button onClick={()=>{ reset(); setShowForm(v=>!v); }} style={{ padding:"10px 20px", borderRadius:"12px", background:showForm&&!editId?W:G, color:showForm&&!editId?TXT_MID:W, border:`1px solid ${showForm&&!editId?BORDER:G}`, fontSize:"13px", fontWeight:600, cursor:"pointer" }}>
          {showForm && !editId ? "Cancel" : "+ New Product"}
        </button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:"12px", marginBottom:"20px" }}>
        {[
          { l:"PRODUCTS", v:products.length, c:G_D, bg:"#FBF6EE", b:"#F0E4CC" },
          { l:"ACTIVE", v:products.filter(p=>p.is_active).length, c:"#16A34A", bg:"#F0FDF4", b:"#BBF7D0" },
          { l:"LOW STOCK", v:lowStock.length, c:"#DC2626", bg:"#FEF2F2", b:"#FECACA" },
          { l:"STOCK VALUE", v:`GHS ${totalValue.toLocaleString()}`, c:"#6366F1", bg:"#EEF2FF", b:"#C7D2FE" },
        ].map(k=>(
          <div key={k.l} style={{ background:k.bg, border:`1px solid ${k.b}`, borderRadius:"14px", padding:"16px 18px" }}>
            <p style={{ fontSize:"9px", fontWeight:700, letterSpacing:"0.12em", color:k.c, marginBottom:"6px" }}>{k.l}</p>
            <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:typeof k.v==="number"?"30px":"18px", fontWeight:700, color:TXT, margin:0 }}>{k.v}</p>
          </div>
        ))}
        {/* Actual Profit / Loss from sales — owner/admin only */}
        {isFinancial && (() => {
          const profit = actualProductRevenue - actualProductCost;
          const isP = profit >= 0;
          const mg = actualProductRevenue > 0 ? ((profit/actualProductRevenue)*100).toFixed(1) : "0.0";
          return (
            <div style={{ background: actualProductRevenue===0?"#FAFAF8":isP?"#F0FDF4":"#FEF2F2", border:"1px solid "+(actualProductRevenue===0?"#EDEBE5":isP?"#BBF7D0":"#FECACA"), borderRadius:"14px", padding:"16px 18px" }}>
              <p style={{ fontSize:"9px", fontWeight:700, letterSpacing:"0.12em", color:actualProductRevenue===0?"#A8A29E":isP?"#16A34A":"#DC2626", marginBottom:"6px" }}>
                {actualProductRevenue===0?"PRODUCT P&L":isP?"PRODUCT PROFIT":"PRODUCT LOSS"}
              </p>
              {actualProductRevenue===0
                ? <p style={{ fontSize:"12px", color:"#A8A29E", margin:0 }}>No product sales yet</p>
                : <>
                    <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"22px", fontWeight:700, color:TXT, margin:0 }}>GHS {Math.abs(profit).toLocaleString()}</p>
                    <p style={{ fontSize:"10px", color:isP?"#16A34A":"#DC2626", marginTop:"4px" }}>{mg}% margin</p>
                    <p style={{ fontSize:"10px", color:"#A8A29E", marginTop:"2px" }}>Revenue GHS {actualProductRevenue.toLocaleString()} · Cost GHS {actualProductCost.toLocaleString()}</p>
                  </>
              }
            </div>
          );
        })()}
      </div>

      {lowStock.length > 0 && (
        <div style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:"12px", padding:"12px 18px", marginBottom:"20px", display:"flex", alignItems:"center", gap:"10px" }}>
          <span style={{ fontSize:"18px" }}>⚠</span>
          <div>
            <p style={{ fontSize:"12px", fontWeight:700, color:"#DC2626", margin:"0 0 2px" }}>LOW STOCK ALERT</p>
            <p style={{ fontSize:"12px", color:"#991B1B", margin:0 }}>{lowStock.map(p=>`${p.name} (${p.stock_quantity} left)`).join(" · ")}</p>
          </div>
        </div>
      )}

      {showForm && (
        <div style={{ background:W, border:`1px solid ${BORDER}`, borderLeft:`3px solid ${G}`, borderRadius:"16px", padding:"24px", boxShadow:SHADOW, marginBottom:"24px" }}>
          <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"20px", fontWeight:700, color:TXT, marginBottom:"20px" }}>{editId?"Edit Product":"New Product"}</p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px", marginBottom:"14px" }}>
            <div><label style={lbl}>Name *</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} style={inp} placeholder="e.g. Hair Growth Oil" /></div>
            <div><label style={lbl}>Category</label><input value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} style={inp} placeholder="e.g. Hair Care" /></div>
            <div><label style={lbl}>Selling Price (GHS) *</label><input type="number" min="0" step="0.01" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} style={inp} placeholder="0.00" /></div>
            <div><label style={lbl}>Cost Price (GHS)</label><input type="number" min="0" step="0.01" value={form.cost_price} onChange={e=>setForm(f=>({...f,cost_price:e.target.value}))} style={inp} placeholder="0.00" /></div>
            <div><label style={lbl}>Stock Quantity</label><input type="number" min="0" value={form.stock_quantity} onChange={e=>setForm(f=>({...f,stock_quantity:e.target.value}))} style={inp} placeholder="0" /></div>
            <div><label style={lbl}>Low Stock Alert When</label><input type="number" min="0" value={form.low_stock_threshold} onChange={e=>setForm(f=>({...f,low_stock_threshold:e.target.value}))} style={inp} placeholder="5" /></div>
            <div style={{ gridColumn:"span 2" }}><label style={lbl}>Description</label><textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} rows={2} style={{ ...inp, resize:"vertical" }} placeholder="Optional" /></div>
            <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
              <input type="checkbox" id="act" checked={form.is_active} onChange={e=>setForm(f=>({...f,is_active:e.target.checked}))} />
              <label htmlFor="act" style={{ fontSize:"13px", fontWeight:500, cursor:"pointer" }}>Active (visible at checkout)</label>
            </div>
          </div>
          <div style={{ display:"flex", gap:"10px" }}>
            <button onClick={save} disabled={saving} style={{ padding:"10px 24px", borderRadius:"10px", background:G, color:W, border:"none", fontSize:"13px", fontWeight:600, cursor:saving?"not-allowed":"pointer", opacity:saving?0.7:1 }}>{saving?"Saving...":(editId?"Update":"Save") + " Product"}</button>
            <button onClick={reset} style={{ padding:"10px 20px", borderRadius:"10px", background:W, color:TXT_MID, border:`1px solid ${BORDER}`, fontSize:"13px", fontWeight:600, cursor:"pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ marginBottom:"16px" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search products..." style={{ ...inp, maxWidth:"320px" }} />
      </div>

      {loading ? (
        <div style={{ display:"flex", justifyContent:"center", padding:"60px" }}>
          <div style={{ width:"32px", height:"32px", border:`3px solid #F0E4CC`, borderTopColor:G, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background:W, border:`1px solid ${BORDER}`, borderRadius:"16px", padding:"60px", textAlign:"center", boxShadow:SHADOW }}>
          <div style={{ fontSize:"40px", marginBottom:"14px" }}>📦</div>
          <p style={{ fontSize:"15px", fontWeight:500, color:TXT, marginBottom:"6px" }}>{products.length===0?"No products yet":"No match"}</p>
          <p style={{ fontSize:"12px", color:TXT_SOFT }}>{products.length===0?"Add retail products above to start tracking inventory.":"Try a different search."}</p>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
          {filtered.map(p => {
            const isLow = p.stock_quantity <= p.low_stock_threshold;
            const margin = p.cost_price > 0 ? ((p.price - p.cost_price) / p.price * 100).toFixed(0) : null;
            return (
              <div key={p.id} style={{ background:W, border:`1px solid ${isLow&&p.is_active?"#FECACA":BORDER}`, borderRadius:"14px", padding:"16px 20px", boxShadow:SHADOW, opacity:p.is_active?1:0.6 }}>
                <div style={{ display:"flex", alignItems:"center", gap:"16px", flexWrap:"wrap" }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"4px", flexWrap:"wrap" }}>
                      <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"17px", fontWeight:700, color:TXT, margin:0 }}>{p.name}</p>
                      {p.category && <span style={{ fontSize:"9px", padding:"2px 8px", borderRadius:"10px", background:"#FBF6EE", color:G_D, fontWeight:700, border:`1px solid #F0E4CC` }}>{p.category.toUpperCase()}</span>}
                      <span style={{ fontSize:"9px", padding:"2px 8px", borderRadius:"10px", fontWeight:700, background:p.is_active?"#F0FDF4":"#F5F5F5", color:p.is_active?"#16A34A":"#999" }}>{p.is_active?"ACTIVE":"OFF"}</span>
                      {isLow && p.is_active && <span style={{ fontSize:"9px", padding:"2px 8px", borderRadius:"10px", fontWeight:700, background:"#FEF2F2", color:"#DC2626" }}>LOW STOCK</span>}
                    </div>
                    {p.description && <p style={{ fontSize:"12px", color:TXT_MID, margin:0 }}>{p.description}</p>}
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:"20px", flexShrink:0, flexWrap:"wrap" }}>
                    <div style={{ textAlign:"right" }}>
                      <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"20px", fontWeight:700, color:G_D, margin:0 }}>GHS {p.price.toFixed(2)}</p>
                      {margin && <p style={{ fontSize:"10px", color:"#16A34A", margin:0 }}>{margin}% margin</p>}
                    </div>
                    <div style={{ textAlign:"center" }}>
                      <p style={{ fontSize:"9px", fontWeight:700, color:TXT_SOFT, margin:"0 0 4px", textTransform:"uppercase" }}>Stock</p>
                      <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                        <button onClick={()=>adj(p,-1)} style={{ width:"24px", height:"24px", borderRadius:"6px", border:`1px solid ${BORDER}`, background:W, cursor:"pointer", fontSize:"16px", fontWeight:700, color:TXT_MID }}>-</button>
                        <span style={{ fontSize:"15px", fontWeight:700, color:isLow?"#DC2626":TXT, minWidth:"28px", textAlign:"center" }}>{p.stock_quantity}</span>
                        <button onClick={()=>adj(p,1)} style={{ width:"24px", height:"24px", borderRadius:"6px", border:`1px solid ${BORDER}`, background:W, cursor:"pointer", fontSize:"16px", fontWeight:700, color:TXT_MID }}>+</button>
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:"6px" }}>
                      <button onClick={()=>{ setForm({ name:p.name, description:p.description||"", price:p.price.toString(), cost_price:p.cost_price.toString(), stock_quantity:p.stock_quantity.toString(), low_stock_threshold:p.low_stock_threshold.toString(), category:p.category||"", is_active:p.is_active }); setEditId(p.id); setShowForm(true); window.scrollTo({top:0,behavior:"smooth"}); }} style={{ padding:"6px 14px", borderRadius:"8px", border:`1px solid ${BORDER}`, background:W, fontSize:"11px", fontWeight:600, cursor:"pointer", color:TXT_MID }}>Edit</button>
                      <button onClick={()=>toggle(p)} style={{ padding:"6px 14px", borderRadius:"8px", border:`1px solid ${BORDER}`, background:W, fontSize:"11px", fontWeight:600, cursor:"pointer", color:TXT_MID }}>{p.is_active?"Disable":"Enable"}</button>
                      <button onClick={()=>del(p.id)} style={{ padding:"6px 12px", borderRadius:"8px", border:"1px solid #FECACA", background:W, fontSize:"11px", fontWeight:600, cursor:"pointer", color:"#DC2626" }}>Del</button>
                    </div>
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
