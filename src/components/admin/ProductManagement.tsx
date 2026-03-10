import { useEffect, useState } from "react";
import { getProducts, getProductCategories, createProduct, updateProduct, deleteProduct } from "@/lib/ecommerce";
import { toast } from "sonner";

export default function ProductManagement() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string|null>(null);
  const [form, setForm] = useState({ name: "", description: "", category_id: "", price: "", stock_quantity: "", sku: "", is_active: true, is_featured: false });

  const load = async () => {
    try {
      const [p, c] = await Promise.all([getProducts(), getProductCategories()]);
      setProducts(p || []);
      setCategories(c || []);
    } catch { toast.error("Failed to load products"); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => { setForm({ name:"",description:"",category_id:"",price:"",stock_quantity:"",sku:"",is_active:true,is_featured:false }); setEditId(null); setShowForm(false); };

  const handleSubmit = async () => {
    if (!form.name || !form.price) { toast.error("Name and price required"); return; }
    try {
      const data = { ...form, price: parseFloat(form.price), stock_quantity: form.stock_quantity ? parseInt(form.stock_quantity) : 0 };
      if (editId) { await updateProduct(editId, data); toast.success("Product updated"); }
      else { await createProduct(data); toast.success("Product created"); }
      resetForm(); load();
    } catch (e: any) { toast.error(e.message || "Failed to save"); }
  };

  const handleEdit = (p: any) => {
    setForm({ name: p.name, description: p.description||"", category_id: p.category_id||"", price: p.price.toString(), stock_quantity: p.stock_quantity?.toString()||"0", sku: p.sku||"", is_active: p.is_active, is_featured: p.is_featured });
    setEditId(p.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    try { await deleteProduct(id); toast.success("Deleted"); load(); } catch { toast.error("Failed"); }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading products...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Products</h2>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">+ New Product</button>
      </div>

      {showForm && (
        <div className="border rounded-xl p-6 bg-muted/30 space-y-4">
          <h3 className="font-semibold">{editId ? "Edit Product" : "New Product"}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium">Name *</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium">Price (GHS) *</label><input type="number" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium">Category</label>
              <select value={form.category_id} onChange={e=>setForm(f=>({...f,category_id:e.target.value}))} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm">
                <option value="">No category</option>
                {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><label className="text-sm font-medium">Stock Quantity</label><input type="number" value={form.stock_quantity} onChange={e=>setForm(f=>({...f,stock_quantity:e.target.value}))} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium">SKU</label><input value={form.sku} onChange={e=>setForm(f=>({...f,sku:e.target.value}))} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" /></div>
            <div className="flex gap-4 items-end pb-2">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={e=>setForm(f=>({...f,is_active:e.target.checked}))} /> Active</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_featured} onChange={e=>setForm(f=>({...f,is_featured:e.target.checked}))} /> Featured</label>
            </div>
            <div className="col-span-2"><label className="text-sm font-medium">Description</label><textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} rows={2} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" /></div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSubmit} className="bg-primary text-white px-4 py-2 rounded-lg text-sm">{editId?"Update":"Save"} Product</button>
            <button onClick={resetForm} className="border px-4 py-2 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>{["Product","Category","Price","Stock","Status","Actions"].map(h=><th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>)}</tr></thead>
          <tbody className="divide-y">
            {products.map(p=>(
              <tr key={p.id} className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <p className="font-medium">{p.name}</p>
                  {p.sku && <p className="text-xs text-muted-foreground">SKU: {p.sku}</p>}
                </td>
                <td className="px-4 py-3">{p.product_categories?.name || "—"}</td>
                <td className="px-4 py-3 font-semibold">GHS {p.price}</td>
                <td className="px-4 py-3">
                  <span className={`font-medium ${p.stock_quantity <= (p.low_stock_threshold || 5) ? "text-red-600" : "text-green-600"}`}>{p.stock_quantity}</span>
                  {p.stock_quantity <= (p.low_stock_threshold || 5) && <span className="ml-1 text-xs text-red-500">Low</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${p.is_active?"bg-green-100 text-green-800":"bg-gray-100 text-gray-600"}`}>{p.is_active?"Active":"Inactive"}</span>
                    {p.is_featured && <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-800">Featured</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={()=>handleEdit(p)} className="text-xs border px-2 py-1 rounded hover:bg-muted">Edit</button>
                    <button onClick={()=>handleDelete(p.id)} className="text-xs border border-red-200 text-red-600 px-2 py-1 rounded hover:bg-red-50">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && <div className="text-center py-12 text-muted-foreground">No products yet</div>}
      </div>
    </div>
  );
}
