import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const G="#C8A97E",G_D="#8B6914",W="#FFFFFF",CREAM="#FAFAF8",BORDER="#EDEBE5",TXT="#1C160E",TXT_MID="#78716C",TXT_SOFT="#A8A29E";
const SHADOW="0 1px 3px rgba(0,0,0,0.04),0 4px 16px rgba(0,0,0,0.06)";
const card: React.CSSProperties={background:W,border:`1px solid ${BORDER}`,borderRadius:"16px",padding:"24px",boxShadow:SHADOW};
const inp: React.CSSProperties={width:"100%",border:`1.5px solid ${BORDER}`,borderRadius:"10px",padding:"9px 12px",fontSize:"13px",color:TXT,outline:"none",background:W,fontFamily:"Montserrat,sans-serif"};

type Product = { id:string;name:string;description:string;price:number;stock_quantity:number;sku:string;is_active:boolean;is_featured:boolean;category_id?:string;low_stock_threshold?:number;image_url?:string;product_categories?:{name:string} };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string|null>(null);
  const emptyForm = { name:"",description:"",category_id:"",price:"",stock_quantity:"",sku:"",is_active:true,is_featured:false };
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");

  const load = async () => {
    try {
      const [{ data:p }, { data:c }] = await Promise.all([
        supabase.from("products" as any).select("*, product_categories(name)").order("created_at",{ascending:false}),
        supabase.from("product_categories" as any).select("id,name").order("name"),
      ]);
      setProducts((p as any[])||[]);
      setCategories((c as any[])||[]);
    } catch { /* table may not exist yet — show empty state */ }
    finally { setLoading(false); }
  };
  useEffect(()=>{ load(); },[]);

  const resetForm = () => { setForm(emptyForm); setEditId(null); setShowForm(false); };

  const handleSubmit = async () => {
    if (!form.name || !form.price) { toast.error("Name and price required"); return; }
    try {
      const data: any = { ...form, price:parseFloat(form.price||"0"), stock_quantity:parseInt(form.stock_quantity||"0") };
      if (!data.category_id) delete data.category_id;
      if (editId) {
        await supabase.from("products" as any).update(data).eq("id",editId);
        toast.success("Product updated");
      } else {
        await supabase.from("products" as any).insert([data]);
        toast.success("Product created");
      }
      resetForm(); load();
    } catch (e:any) { toast.error(e.message||"Failed to save"); }
  };

  const handleEdit = (p: Product) => {
    setForm({ name:p.name,description:p.description||"",category_id:(p as any).category_id||"",price:p.price.toString(),stock_quantity:(p.stock_quantity||0).toString(),sku:p.sku||"",is_active:p.is_active,is_featured:p.is_featured });
    setEditId(p.id); setShowForm(true);
  };

  const handleDelete = async (id:string) => {
    if (!confirm("Delete this product?")) return;
    try { await supabase.from("products" as any).delete().eq("id",id); toast.success("Deleted"); load(); } catch { toast.error("Failed"); }
  };

  const toggleActive = async (id:string,v:boolean) => {
    await supabase.from("products" as any).update({is_active:!v}).eq("id",id); load();
  };

  const filtered = products.filter(p => {
    const s = search.toLowerCase();
    return (catFilter==="all" || (p as any).category_id===catFilter) &&
      (!s || p.name.toLowerCase().includes(s) || (p.sku||"").toLowerCase().includes(s));
  });

  const lowStock = products.filter(p=>p.stock_quantity<=(p.low_stock_threshold||5));
  const totalValue = products.reduce((s,p)=>s+p.price*p.stock_quantity,0);

  return (
    <div style={{ background:CREAM,minHeight:"100vh",padding:"clamp(16px,4vw,32px)",fontFamily:"Montserrat,sans-serif",color:TXT }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap');*{box-sizing:border-box}`}</style>

      <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:"28px",flexWrap:"wrap",gap:"12px" }}>
        <div>
          <p style={{ fontSize:"11px",fontWeight:700,letterSpacing:"0.16em",color:G,textTransform:"uppercase",marginBottom:"4px" }}>Inventory</p>
          <h1 style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(28px,4vw,42px)",fontWeight:700,color:TXT,margin:0,lineHeight:1 }}>Products</h1>
          <p style={{ fontSize:"12px",color:TXT_SOFT,marginTop:"6px" }}>Manage retail products and inventory</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} style={{ padding:"10px 20px",borderRadius:"12px",background:G,color:W,border:"none",fontSize:"13px",fontWeight:600,cursor:"pointer" }}>
          {showForm?"Cancel":"+ New Product"}
        </button>
      </div>

      {/* KPI */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:"14px",marginBottom:"24px" }}>
        {[
          { label:"TOTAL PRODUCTS", value:products.length, color:G_D, bg:"#FBF6EE", border:"#F0E4CC" },
          { label:"ACTIVE", value:products.filter(p=>p.is_active).length, color:"#16A34A", bg:"#F0FDF4", border:"#BBF7D0" },
          { label:"LOW STOCK", value:lowStock.length, color:"#DC2626", bg:"#FEF2F2", border:"#FECACA" },
          { label:"INVENTORY VALUE", value:`GH₵${totalValue.toLocaleString()}`, color:"#6366F1", bg:"#EEF2FF", border:"#C7D2FE" },
        ].map(k=>(
          <div key={k.label} style={{ background:k.bg,border:`1px solid ${k.border}`,borderRadius:"14px",padding:"18px 20px" }}>
            <p style={{ fontSize:"10px",fontWeight:700,letterSpacing:"0.1em",color:k.color,marginBottom:"6px" }}>{k.label}</p>
            <p style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:typeof k.value==="number"?"32px":"22px",fontWeight:700,color:TXT,margin:0 }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "14px", padding: "14px 20px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "18px" }}>⚠️</span>
          <div>
            <p style={{ fontSize: "12px", fontWeight: 700, color: "#DC2626", margin: "0 0 2px" }}>LOW STOCK ALERT</p>
            <p style={{ fontSize: "12px", color: "#991B1B", margin: 0 }}>
              {lowStock.map(p => `${p.name} (${p.stock_quantity} left)`).join(" · ")}
            </p>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div style={{ ...card,marginBottom:"24px",borderLeft:`3px solid ${G}` }}>
          <p style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:"18px",fontWeight:700,color:TXT,marginBottom:"20px" }}>{editId?"Edit Product":"New Product"}</p>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginBottom:"14px" }}>
            <div><label style={{ fontSize:"11px",fontWeight:600,color:TXT_SOFT,textTransform:"uppercase",letterSpacing:"0.1em",display:"block",marginBottom:"6px" }}>Name *</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} style={inp} /></div>
            <div><label style={{ fontSize:"11px",fontWeight:600,color:TXT_SOFT,textTransform:"uppercase",letterSpacing:"0.1em",display:"block",marginBottom:"6px" }}>Price (GHS) *</label><input type="number" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} style={inp} /></div>
            <div>
              <label style={{ fontSize:"11px",fontWeight:600,color:TXT_SOFT,textTransform:"uppercase",letterSpacing:"0.1em",display:"block",marginBottom:"6px" }}>Category</label>
              <select value={form.category_id} onChange={e=>setForm(f=>({...f,category_id:e.target.value}))} style={inp}>
                <option value="">No category</option>
                {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><label style={{ fontSize:"11px",fontWeight:600,color:TXT_SOFT,textTransform:"uppercase",letterSpacing:"0.1em",display:"block",marginBottom:"6px" }}>Stock Quantity</label><input type="number" value={form.stock_quantity} onChange={e=>setForm(f=>({...f,stock_quantity:e.target.value}))} style={inp} /></div>
            <div><label style={{ fontSize:"11px",fontWeight:600,color:TXT_SOFT,textTransform:"uppercase",letterSpacing:"0.1em",display:"block",marginBottom:"6px" }}>SKU</label><input value={form.sku} onChange={e=>setForm(f=>({...f,sku:e.target.value}))} style={inp} /></div>
            <div style={{ display:"flex",gap:"20px",alignItems:"center",paddingTop:"24px" }}>
              <label style={{ display:"flex",alignItems:"center",gap:"8px",fontSize:"13px",fontWeight:500,cursor:"pointer" }}><input type="checkbox" checked={form.is_active} onChange={e=>setForm(f=>({...f,is_active:e.target.checked}))} />Active</label>
              <label style={{ display:"flex",alignItems:"center",gap:"8px",fontSize:"13px",fontWeight:500,cursor:"pointer" }}><input type="checkbox" checked={form.is_featured} onChange={e=>setForm(f=>({...f,is_featured:e.target.checked}))} />Featured</label>
            </div>
            <div style={{ gridColumn:"span 2" }}><label style={{ fontSize:"11px",fontWeight:600,color:TXT_SOFT,textTransform:"uppercase",letterSpacing:"0.1em",display:"block",marginBottom:"6px" }}>Description</label><textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} rows={2} style={{ ...inp,resize:"vertical" }} /></div>
          </div>
          <div style={{ display:"flex",gap:"10px" }}>
            <button onClick={handleSubmit} style={{ padding:"10px 24px",borderRadius:"10px",background:G,color:W,border:"none",fontSize:"13px",fontWeight:600,cursor:"pointer" }}>{editId?"Update":"Save"} Product</button>
            <button onClick={resetForm} style={{ padding:"10px 20px",borderRadius:"10px",background:W,color:TXT_MID,border:`1px solid ${BORDER}`,fontSize:"13px",fontWeight:600,cursor:"pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Search + Category Filter */}
      <div style={{ display:"flex",gap:"12px",marginBottom:"16px",flexWrap:"wrap" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search products…" style={{ ...inp,maxWidth:"280px",width:"auto" }} />
        <div style={{ display:"flex",gap:"7px",flexWrap:"wrap" }}>
          <button onClick={()=>setCatFilter("all")} style={{ padding:"7px 14px",borderRadius:"20px",border:`1.5px solid ${catFilter==="all"?G:BORDER}`,background:catFilter==="all"?G:W,color:catFilter==="all"?W:TXT_MID,fontSize:"11px",fontWeight:600,cursor:"pointer" }}>All</button>
          {categories.map(c=>(
            <button key={c.id} onClick={()=>setCatFilter(c.id)} style={{ padding:"7px 14px",borderRadius:"20px",border:`1.5px solid ${catFilter===c.id?G:BORDER}`,background:catFilter===c.id?G:W,color:catFilter===c.id?W:TXT_MID,fontSize:"11px",fontWeight:600,cursor:"pointer" }}>{c.name}</button>
          ))}
        </div>
      </div>

      {/* Products grid */}
      {loading ? (
        <div style={{ display:"flex",justifyContent:"center",padding:"60px" }}><div style={{ width:"32px",height:"32px",border:`3px solid #F0E4CC`,borderTopColor:G,borderRadius:"50%",animation:"spin 0.8s linear infinite" }}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
      ) : filtered.length === 0 ? (
        <div style={{ ...card,textAlign:"center",padding:"60px" }}>
          <div style={{ fontSize:"40px",marginBottom:"14px" }}>📦</div>
          <p style={{ fontSize:"15px",fontWeight:500,color:TXT,marginBottom:"6px" }}>{products.length===0?"No products yet":"No products match your search"}</p>
          <p style={{ fontSize:"12px",color:TXT_SOFT }}>Add retail products to track inventory and sell at the salon</p>
        </div>
      ) : (
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:"16px" }}>
          {filtered.map(p => {
            const isLow = p.stock_quantity <= (p.low_stock_threshold||5);
            return (
              <div key={p.id} style={{ background:W,border:`1px solid ${BORDER}`,borderRadius:"16px",padding:"20px",boxShadow:SHADOW,opacity:p.is_active?1:0.6 }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"12px" }}>
                  <div style={{ flex:1,minWidth:0 }}>
                    <p style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:"17px",fontWeight:700,color:TXT,margin:0,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{p.name}</p>
                    <p style={{ fontSize:"10px",color:TXT_SOFT,margin:"3px 0 0" }}>{(p as any).product_categories?.name || "Uncategorized"}{p.sku?" · SKU: "+p.sku:""}</p>
                  </div>
                  <div style={{ display:"flex",gap:"5px",marginLeft:"8px",flexShrink:0 }}>
                    {p.is_featured && <span style={{ padding:"2px 8px",borderRadius:"20px",fontSize:"9px",fontWeight:700,background:"#FFFBEB",color:"#D97706" }}>Featured</span>}
                    <span style={{ padding:"2px 8px",borderRadius:"20px",fontSize:"9px",fontWeight:700,background:p.is_active?"#F0FDF4":"#F5F5F5",color:p.is_active?"#16A34A":"#999" }}>{p.is_active?"Active":"Off"}</span>
                  </div>
                </div>
                {p.description && <p style={{ fontSize:"12px",color:TXT_MID,marginBottom:"14px",lineHeight:1.5 }}>{p.description}</p>}
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px" }}>
                  <p style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:"22px",fontWeight:700,color:G_D,margin:0 }}>GH₵{p.price.toLocaleString()}</p>
                  <div style={{ textAlign:"right" }}>
                    <p style={{ fontSize:"13px",fontWeight:600,color:isLow?"#DC2626":TXT,margin:0 }}>{p.stock_quantity} in stock</p>
                    {isLow && <p style={{ fontSize:"10px",color:"#DC2626",margin:0 }}>Low stock</p>}
                  </div>
                </div>
                <div style={{ display:"flex",gap:"8px" }}>
                  <button onClick={()=>handleEdit(p)} style={{ flex:1,padding:"7px",borderRadius:"9px",border:`1px solid ${BORDER}`,background:W,fontSize:"11px",fontWeight:600,cursor:"pointer",color:TXT_MID }}>Edit</button>
                  <button onClick={()=>toggleActive(p.id,p.is_active)} style={{ flex:1,padding:"7px",borderRadius:"9px",border:`1px solid ${BORDER}`,background:W,fontSize:"11px",fontWeight:600,cursor:"pointer",color:TXT_MID }}>{p.is_active?"Disable":"Enable"}</button>
                  <button onClick={()=>handleDelete(p.id)} style={{ padding:"7px 12px",borderRadius:"9px",border:"1px solid #FECACA",background:W,fontSize:"11px",fontWeight:600,cursor:"pointer",color:"#DC2626" }}>Del</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
