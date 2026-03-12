import { useEffect, useState } from "react";
import { getProducts, getProductCategories, createProduct, updateProduct, deleteProduct } from "@/lib/ecommerce";
import { toast } from "sonner";

const G="#C8A97E",G2="#8B6914",CREAM="#FAFAF8",WHITE="#FFFFFF",BORDER="#EDEBE5",TXT="#1C1917",TXT_MID="#78716C",TXT_SOFT="#A8A29E",SHADOW="0 1px 3px rgba(0,0,0,0.04),0 4px 16px rgba(0,0,0,0.06)";

export default function ProductManagement() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string|null>(null);
  const [form, setForm] = useState({name:"",description:"",category_id:"",price:"",stock_quantity:"",sku:"",is_active:true,is_featured:false});
  const [search, setSearch] = useState("");

  const load = async () => {
    try { const [p,c] = await Promise.all([getProducts(),getProductCategories()]); setProducts(p||[]); setCategories(c||[]); }
    catch { toast.error("Failed to load products"); } finally { setLoading(false); }
  };
  useEffect(()=>{load();},[]);

  const resetForm = () => { setForm({name:"",description:"",category_id:"",price:"",stock_quantity:"",sku:"",is_active:true,is_featured:false}); setEditId(null); setShowForm(false); };

  const handleSubmit = async () => {
    if(!form.name||!form.price){toast.error("Name and price required");return;}
    const payload = {name:form.name,description:form.description,category_id:form.category_id||null,price:parseFloat(form.price),stock_quantity:form.stock_quantity?parseInt(form.stock_quantity):0,sku:form.sku||null,is_active:form.is_active,is_featured:form.is_featured};
    try {
      if(editId) { await updateProduct(editId,payload); toast.success("Product updated"); }
      else { await createProduct(payload); toast.success("Product added"); }
      resetForm(); load();
    } catch(e:any){ toast.error(e.message||"Failed"); }
  };
  const handleDelete = async (id:string) => { if(!confirm("Delete this product?"))return; try{await deleteProduct(id);toast.success("Deleted");load();}catch{toast.error("Failed");} };
  const handleEdit = (p:any) => { setEditId(p.id); setForm({name:p.name,description:p.description||"",category_id:p.category_id||"",price:String(p.price),stock_quantity:String(p.stock_quantity||0),sku:p.sku||"",is_active:p.is_active,is_featured:p.is_featured}); setShowForm(true); };

  const filtered = products.filter(p=>!search||p.name.toLowerCase().includes(search.toLowerCase()));
  const inp = {border:`1.5px solid ${BORDER}`,borderRadius:"10px",padding:"10px 14px",fontSize:"13px",outline:"none",width:"100%",background:WHITE,color:TXT} as React.CSSProperties;

  if(loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"60px"}}><div style={{width:"32px",height:"32px",borderRadius:"50%",border:`3px solid #F5ECD6`,borderTopColor:G,animation:"spin 0.8s linear infinite"}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;

  return (
    <div style={{fontFamily:"Montserrat,sans-serif",color:TXT}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}} .pr-card:hover{box-shadow:0 4px 20px rgba(0,0,0,0.1);transform:translateY(-2px);} .pr-card{transition:all 0.2s}`}</style>

      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:"24px"}}>
        <div>
          <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(26px,3.5vw,38px)",fontWeight:700,color:TXT,margin:0}}>Products</h1>
          <p style={{fontSize:"13px",color:TXT_SOFT,marginTop:"4px"}}>Retail items available for sale</p>
        </div>
        <button onClick={()=>{resetForm();setShowForm(!showForm);}} style={{background:showForm?"#F5ECD6":G2,color:showForm?G2:WHITE,border:"none",borderRadius:"12px",padding:"11px 20px",fontSize:"13px",fontWeight:600,cursor:"pointer"}}>
          {showForm?"✕ Cancel":"+ Add Product"}
        </button>
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px",marginBottom:"24px"}}>
        {[{l:"TOTAL PRODUCTS",v:products.length,i:"📦"},{l:"IN STOCK",v:products.filter(p=>p.stock_quantity>0).length,i:"✅"},{l:"FEATURED",v:products.filter(p=>p.is_featured).length,i:"⭐"}].map(s=>(
          <div key={s.l} style={{background:WHITE,border:`1px solid ${BORDER}`,borderRadius:"14px",padding:"16px 20px",boxShadow:SHADOW}}>
            <p style={{fontSize:"10px",fontWeight:700,letterSpacing:"0.12em",color:G,margin:"0 0 8px"}}>{s.i} {s.l}</p>
            <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"32px",fontWeight:700,color:TXT,margin:0}}>{s.v}</p>
          </div>
        ))}
      </div>

      {showForm && (
        <div style={{background:WHITE,border:`1.5px solid ${G}`,borderRadius:"16px",padding:"24px",marginBottom:"24px",boxShadow:SHADOW,animation:"up 0.25s ease"}}>
          <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"20px",fontWeight:700,margin:"0 0 20px"}}>{editId?"Edit Product":"New Product"}</h3>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"16px"}}>
            {[{l:"Product Name *",k:"name",ph:"e.g. Hair Serum"},{l:"SKU",k:"sku",ph:"Optional"},{l:"Price (GHS) *",k:"price",ph:"0.00",type:"number"},{l:"Stock Quantity",k:"stock_quantity",ph:"0",type:"number"}].map(f=>(
              <div key={f.k}><label style={{fontSize:"12px",fontWeight:600,color:TXT_MID,display:"block",marginBottom:"6px"}}>{f.l}</label><input type={f.type||"text"} value={(form as any)[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} placeholder={f.ph} style={inp}/></div>
            ))}
            <div><label style={{fontSize:"12px",fontWeight:600,color:TXT_MID,display:"block",marginBottom:"6px"}}>Category</label>
              <select value={form.category_id} onChange={e=>setForm(p=>({...p,category_id:e.target.value}))} style={inp}>
                <option value="">No category</option>
                {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{display:"flex",gap:"20px",alignItems:"center"}}>
              {[{l:"Active",k:"is_active"},{l:"Featured",k:"is_featured"}].map(f=>(
                <label key={f.k} style={{display:"flex",alignItems:"center",gap:"8px",cursor:"pointer",fontSize:"13px",fontWeight:500}}>
                  <input type="checkbox" checked={(form as any)[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.checked}))} style={{accentColor:G2,width:"16px",height:"16px"}}/>
                  {f.l}
                </label>
              ))}
            </div>
            <div className="col-span-2" style={{gridColumn:"1/-1"}}><label style={{fontSize:"12px",fontWeight:600,color:TXT_MID,display:"block",marginBottom:"6px"}}>Description</label><textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} rows={2} style={{...inp,resize:"vertical"}}/></div>
          </div>
          <div style={{display:"flex",gap:"12px",marginTop:"20px"}}>
            <button onClick={handleSubmit} style={{background:G2,color:WHITE,border:"none",borderRadius:"10px",padding:"11px 24px",fontSize:"13px",fontWeight:600,cursor:"pointer"}}>{editId?"Update":"Save"}</button>
            <button onClick={resetForm} style={{background:CREAM,color:TXT_MID,border:`1px solid ${BORDER}`,borderRadius:"10px",padding:"11px 24px",fontSize:"13px",fontWeight:600,cursor:"pointer"}}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{background:WHITE,border:`1px solid ${BORDER}`,borderRadius:"12px",padding:"12px 16px",marginBottom:"16px",display:"flex",alignItems:"center",gap:"10px"}}>
        <span style={{color:TXT_SOFT}}>🔍</span>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search products..." style={{border:"none",outline:"none",fontSize:"13px",flex:1,background:"transparent",color:TXT}}/>
      </div>

      {filtered.length===0 ? (
        <div style={{background:WHITE,border:`1px solid ${BORDER}`,borderRadius:"16px",padding:"60px 20px",textAlign:"center",boxShadow:SHADOW}}>
          <p style={{fontSize:"40px",margin:"0 0 12px"}}>📦</p>
          <p style={{fontSize:"16px",fontWeight:600,color:TXT,margin:"0 0 4px"}}>No products yet</p>
          <p style={{fontSize:"13px",color:TXT_SOFT}}>Add retail items to sell at the salon</p>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:"16px"}}>
          {filtered.map(p=>(
            <div key={p.id} className="pr-card" style={{background:WHITE,border:`1px solid ${BORDER}`,borderRadius:"16px",padding:"20px",boxShadow:SHADOW}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"10px"}}>
                <div style={{flex:1}}>
                  <p style={{fontWeight:700,fontSize:"15px",color:TXT,margin:0}}>{p.name}</p>
                  {p.sku&&<p style={{fontSize:"10px",fontFamily:"monospace",color:TXT_SOFT,margin:"2px 0 0",letterSpacing:"0.1em"}}>{p.sku}</p>}
                </div>
                <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"18px",fontWeight:700,color:G2,flexShrink:0,marginLeft:"8px"}}>GHS {Number(p.price).toLocaleString()}</span>
              </div>
              {p.description&&<p style={{fontSize:"12px",color:TXT_MID,margin:"0 0 12px",lineHeight:1.5}}>{p.description}</p>}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
                <span style={{fontSize:"12px",color:TXT_MID}}>Stock: <strong style={{color:p.stock_quantity>0?G2:"#DC2626"}}>{p.stock_quantity}</strong></span>
                <div style={{display:"flex",gap:"6px"}}>
                  {p.is_featured&&<span style={{fontSize:"10px",background:"#FFFBEB",color:"#D97706",border:"1px solid #FDE68A",borderRadius:"20px",padding:"2px 8px",fontWeight:600}}>⭐ Featured</span>}
                  <span style={{fontSize:"10px",background:p.is_active?"#F0FDF4":"#F9F9F9",color:p.is_active?"#16A34A":"#9CA3AF",border:`1px solid ${p.is_active?"#BBF7D0":"#E5E7EB"}`,borderRadius:"20px",padding:"2px 8px",fontWeight:600}}>{p.is_active?"Active":"Inactive"}</span>
                </div>
              </div>
              <div style={{display:"flex",gap:"8px"}}>
                <button onClick={()=>handleEdit(p)} style={{flex:1,background:CREAM,color:TXT_MID,border:`1px solid ${BORDER}`,borderRadius:"8px",padding:"8px",fontSize:"12px",fontWeight:600,cursor:"pointer"}}>Edit</button>
                <button onClick={()=>handleDelete(p.id)} style={{flex:1,background:"#FEF2F2",color:"#DC2626",border:"1px solid #FCA5A5",borderRadius:"8px",padding:"8px",fontSize:"12px",fontWeight:600,cursor:"pointer"}}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
