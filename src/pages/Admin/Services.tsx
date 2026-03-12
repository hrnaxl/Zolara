import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Plus, Trash, Move, Layers, Sparkles, Pencil, X, Check } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { z } from "zod";
import { useCatalog } from "@/context/CatalogContext";
import { useSettings } from "@/context/SettingsContext";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

const serviceSchema = z.object({
  name: z.string().trim().min(1).max(100),
  category: z.string().trim().min(1).max(50),
  price: z.number().min(0).max(1000000),
  duration_minutes: z.number().int().positive().max(1440),
  description: z.string().max(500).optional().or(z.literal("")),
  order: z.number().int().optional(),
});

const GOLD = "#C8A97E";
const GOLD_DARK = "#8B6914";

const Services = () => {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // variantsMap: serviceId -> variant[]
  const [variantsMap, setVariantsMap] = useState<Record<string, any[]>>({});
  // addonsMap: serviceId -> addon[]
  const [addonsMap, setAddonsMap] = useState<Record<string, any[]>>({});

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [deleteServiceId, setDeleteServiceId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reorderOpen, setReorderOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "", category: "", price: "", duration_minutes: "", description: "", specialization: "",
  });
  const [reorderServices, setReorderServices] = useState<any[]>([]);

  // Category manager
  const [catManagerOpen, setCatManagerOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editingCatValue, setEditingCatValue] = useState("");
  const [savingCats, setSavingCats] = useState(false);

  // Inline pill editing (on card, not dialog)
  const [editingPillVariantId, setEditingPillVariantId] = useState<string | null>(null);
  const [pillVariantForm, setPillVariantForm] = useState({ name: "", price_adjustment: "", duration_adjustment: "" });
  const [editingPillAddonId, setEditingPillAddonId] = useState<string | null>(null);
  const [pillAddonForm, setPillAddonForm] = useState({ name: "", price: "", duration_adjustment: "" });

  // Variant inline editing
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [activeServiceForVariants, setActiveServiceForVariants] = useState<any>(null);
  const [variantForm, setVariantForm] = useState({ name: "", price_adjustment: "", duration_adjustment: "" });
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [savingVariant, setSavingVariant] = useState(false);

  // Addon inline editing
  const [addonDialogOpen, setAddonDialogOpen] = useState(false);
  const [activeServiceForAddons, setActiveServiceForAddons] = useState<any>(null);
  const [addonForm, setAddonForm] = useState({ name: "", description: "", price: "", duration_adjustment: "" });
  const [editingAddonId, setEditingAddonId] = useState<string | null>(null);
  const [savingAddon, setSavingAddon] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const catalog = useCatalog();
  const { settings, setSettings } = useSettings();

  // ── Fetch everything at once ──────────────────────────────────
  const fetchAll = async () => {
    try {
      const [{ data: svcs }, { data: variants }, { data: addons }] = await Promise.all([
        supabase.from("services").select("*").order("category").order("order", { ascending: true }),
        (supabase as any).from("service_variants").select("*").order("sort_order"),
        (supabase as any).from("service_addons").select("*").order("sort_order"),
      ]);
      setServices(svcs || []);

      const vMap: Record<string, any[]> = {};
      for (const v of (variants || [])) {
        if (!vMap[v.service_id]) vMap[v.service_id] = [];
        vMap[v.service_id].push(v);
      }
      setVariantsMap(vMap);

      const aMap: Record<string, any[]> = {};
      for (const a of (addons || [])) {
        if (!aMap[a.service_id]) aMap[a.service_id] = [];
        aMap[a.service_id].push(a);
      }
      setAddonsMap(aMap);
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to fetch services");
    } finally {
      setLoading(false);
    }
  };

  const getCategories = (): string[] => (settings as any)?.service_categories || [];

  const saveCategories = async (cats: string[]) => {
    setSavingCats(true);
    try {
      const { error } = await supabase.from("settings").update({ service_categories: cats }).eq("id", (settings as any).id);
      if (error) throw error;
      setSettings({ ...settings, service_categories: cats } as any);
      toast.success("Categories updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to save categories");
    } finally { setSavingCats(false); }
  };

  const handleAddCategory = async () => {
    const name = newCatName.trim();
    if (!name) return;
    const cats = getCategories();
    if (cats.includes(name)) { toast.error("Category already exists"); return; }
    await saveCategories([...cats, name]);
    setNewCatName("");
  };

  const handleRenameCategory = async (oldName: string, newName: string) => {
    const name = newName.trim();
    if (!name || name === oldName) { setEditingCat(null); return; }
    const cats = getCategories().map(c => c === oldName ? name : c);
    await supabase.from("services").update({ category: name }).eq("category", oldName);
    await saveCategories(cats);
    setEditingCat(null);
    fetchAll();
  };

  const handleDeleteCategory = async (name: string) => {
    await saveCategories(getCategories().filter(c => c !== name));
  };

  // ── Variants ──────────────────────────────────────────────────
  const openVariants = async (svc: any) => {
    setActiveServiceForVariants(svc);
    setVariantForm({ name: "", price_adjustment: "", duration_adjustment: "" });
    setEditingVariantId(null);
    setVariantDialogOpen(true);
  };

  const saveVariant = async () => {
    if (!variantForm.name.trim() || !activeServiceForVariants) return;
    setSavingVariant(true);
    try {
      const payload = {
        service_id: activeServiceForVariants.id,
        name: variantForm.name.trim(),
        price_adjustment: parseFloat(variantForm.price_adjustment || "0"),
        duration_adjustment: parseInt(variantForm.duration_adjustment || "0"),
        sort_order: editingVariantId ? undefined : (variantsMap[activeServiceForVariants.id] || []).length,
        is_active: true,
      };
      if (editingVariantId) {
        const { error } = await (supabase as any).from("service_variants").update(payload).eq("id", editingVariantId);
        if (error) throw error;
        toast.success("Variant updated");
      } else {
        const { error } = await (supabase as any).from("service_variants").insert([payload]);
        if (error) throw error;
        toast.success("Variant added");
      }
      setVariantForm({ name: "", price_adjustment: "", duration_adjustment: "" });
      setEditingVariantId(null);
      await refreshVariants(activeServiceForVariants.id);
    } catch (err: any) { toast.error(err.message || "Failed to save variant"); }
    finally { setSavingVariant(false); }
  };

  const deleteVariant = async (serviceId: string, id: string) => {
    const { error } = await (supabase as any).from("service_variants").delete().eq("id", id);
    if (error) { toast.error("Failed to delete variant"); return; }
    setVariantsMap(prev => ({ ...prev, [serviceId]: (prev[serviceId] || []).filter(v => v.id !== id) }));
    toast.success("Variant removed");
  };

  const savePillVariant = async (serviceId: string, variantId: string) => {
    if (!pillVariantForm.name.trim()) return;
    await (supabase as any).from("service_variants").update({
      name: pillVariantForm.name.trim(),
      price_adjustment: parseFloat(pillVariantForm.price_adjustment || "0"),
      duration_adjustment: parseInt(pillVariantForm.duration_adjustment || "0"),
    }).eq("id", variantId);
    setEditingPillVariantId(null);
    await refreshVariants(serviceId);
    toast.success("Variant updated");
  };

  const savePillAddon = async (serviceId: string, addonId: string) => {
    if (!pillAddonForm.name.trim()) return;
    await (supabase as any).from("service_addons").update({
      name: pillAddonForm.name.trim(),
      price: parseFloat(pillAddonForm.price || "0"),
      duration_adjustment: parseInt(pillAddonForm.duration_adjustment || "0"),
    }).eq("id", addonId);
    setEditingPillAddonId(null);
    await refreshAddons(serviceId);
    toast.success("Add-on updated");
  };

  const refreshVariants = async (serviceId: string) => {
    const { data } = await (supabase as any).from("service_variants").select("*").eq("service_id", serviceId).order("sort_order");
    setVariantsMap(prev => ({ ...prev, [serviceId]: data || [] }));
  };

  // ── Add-ons ───────────────────────────────────────────────────
  const openAddons = async (svc: any) => {
    setActiveServiceForAddons(svc);
    setAddonForm({ name: "", description: "", price: "", duration_adjustment: "" });
    setEditingAddonId(null);
    setAddonDialogOpen(true);
  };

  const saveAddon = async () => {
    if (!addonForm.name.trim() || !activeServiceForAddons) return;
    setSavingAddon(true);
    try {
      const payload = {
        service_id: activeServiceForAddons.id,
        name: addonForm.name.trim(),
        description: addonForm.description.trim() || null,
        price: parseFloat(addonForm.price || "0"),
        duration_adjustment: parseInt(addonForm.duration_adjustment || "0"),
        sort_order: editingAddonId ? undefined : (addonsMap[activeServiceForAddons.id] || []).length,
        is_active: true,
      };
      if (editingAddonId) {
        const { error } = await (supabase as any).from("service_addons").update(payload).eq("id", editingAddonId);
        if (error) throw error;
        toast.success("Add-on updated");
      } else {
        const { error } = await (supabase as any).from("service_addons").insert([payload]);
        if (error) throw error;
        toast.success("Add-on added");
      }
      setAddonForm({ name: "", description: "", price: "", duration_adjustment: "" });
      setEditingAddonId(null);
      await refreshAddons(activeServiceForAddons.id);
    } catch (err: any) { toast.error(err.message || "Failed to save add-on"); }
    finally { setSavingAddon(false); }
  };

  const deleteAddon = async (serviceId: string, id: string) => {
    const { error } = await (supabase as any).from("service_addons").delete().eq("id", id);
    if (error) { toast.error("Failed to delete add-on"); return; }
    setAddonsMap(prev => ({ ...prev, [serviceId]: (prev[serviceId] || []).filter(a => a.id !== id) }));
    toast.success("Add-on removed");
  };

  const refreshAddons = async (serviceId: string) => {
    const { data } = await (supabase as any).from("service_addons").select("*").eq("service_id", serviceId).order("sort_order");
    setAddonsMap(prev => ({ ...prev, [serviceId]: data || [] }));
  };

  // ── Service CRUD ──────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validated = serviceSchema.parse({
        name: formData.name, category: formData.category,
        price: formData.price ? parseFloat(formData.price) : 0,
        duration_minutes: parseInt(formData.duration_minutes),
        description: formData.description,
      });
      const { specialization: _u, order: _o, ...serviceData } = validated as any;
      if (editingServiceId) {
        const { error } = await supabase.from("services").update(serviceData).eq("id", editingServiceId);
        if (error) throw error;
        toast.success("Service updated");
      } else {
        const { error } = await supabase.from("services").insert([serviceData]);
        if (error) throw error;
        toast.success("Service added");
      }
      setDialogOpen(false);
      setEditingServiceId(null);
      setFormData({ name: "", category: "", price: "", duration_minutes: "", description: "", specialization: "" });
      fetchAll();
      try { catalog.refreshCatalog(); } catch {}
    } catch (error: any) {
      if (error instanceof z.ZodError) toast.error(error.errors[0].message);
      else toast.error(error.message || "Failed to save service");
    }
  };

  const handleDeleteService = async () => {
    if (!deleteServiceId) return;
    try {
      const { error } = await supabase.from("services").delete().eq("id", deleteServiceId);
      if (error) throw error;
      toast.success("Service deleted");
      fetchAll();
      try { catalog.refreshCatalog(); } catch {}
    } catch (error: any) {
      toast.error(error.message || "Failed to delete service");
    } finally {
      setDeleteDialogOpen(false);
      setDeleteServiceId(null);
    }
  };

  const groupedServices = services.reduce((acc: any, service) => {
    const cat = service.category || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(service);
    return acc;
  }, {});

  const openReorder = () => {
    setReorderServices([...services].sort((a, b) => (a.order || 0) - (b.order || 0)));
    setReorderOpen(true);
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    const items = Array.from(reorderServices);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setReorderServices(items);
  };

  const saveReorder = async () => {
    try {
      for (const [index, item] of reorderServices.entries()) {
        await supabase.from("services").update({ order: index } as any).eq("id", item.id);
      }
      toast.success("Services reordered");
      setReorderOpen(false);
      fetchAll();
      try { catalog.refreshCatalog(); } catch {}
    } catch (error: any) {
      toast.error(error.message || "Failed to reorder");
    }
  };

  if (loading) return (
    <div className="flex justify-center p-8">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // ── Service card (now shows variants + addons inline) ─────────
  const renderServiceCard = (service: any) => {
    const variants = variantsMap[service.id] || [];
    const addons = addonsMap[service.id] || [];
    const basePrice = Number(service.price || 0);

    return (
      <div key={service.id} style={{ border: "1px solid #E5DDD3", borderRadius: "12px", background: "white", overflow: "hidden", marginBottom: "10px" }}>
        {/* Top row: name, price, actions */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "16px 16px 12px", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "180px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
              <p style={{ fontSize: "14px", fontWeight: 700, color: "#1C160E", margin: 0 }}>{service.name}</p>
              <Switch
                checked={service.is_active}
                onCheckedChange={async (checked) => {
                  try {
                    await supabase.from("services").update({ is_active: checked }).eq("id", service.id);
                    setServices(prev => prev.map(s => s.id === service.id ? { ...s, is_active: checked } : s));
                    try { catalog.refreshCatalog(); } catch {}
                  } catch { toast.error("Failed to update status"); }
                }}
              />
            </div>
            {service.description && <p style={{ fontSize: "12px", color: "#78716C", margin: 0, lineHeight: 1.5 }}>{service.description}</p>}
            <p style={{ fontSize: "11px", color: "#A8A29E", margin: "4px 0 0" }}>{service.duration_minutes} min base</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
            {variants.length === 0 && basePrice > 0 && (
              <span style={{ fontSize: "14px", fontWeight: 700, color: GOLD_DARK }}>
                GH&#8373;{basePrice.toLocaleString()}
              </span>
            )}
            {variants.length === 0 && basePrice === 0 && (
              <span style={{ fontSize: "11px", fontStyle: "italic", color: "#A8A29E" }}>Add variants</span>
            )}
            {variants.length > 0 && (() => {
              const prices = variants.map(v => Number(v.price_adjustment));
              const mn = Math.min(...prices); const mx = Math.max(...prices);
              return <span style={{ fontSize: "13px", fontWeight: 700, color: GOLD_DARK }}>
                {mn === mx ? `GH₳${mn.toLocaleString()}` : `GH₳${mn.toLocaleString()} – ${mx.toLocaleString()}`}
              </span>;
            })()}
            <Button size="sm" variant="outline" className="px-2 h-7 text-xs"
              onClick={() => { setFormData({ name: service.name, category: service.category, price: service.price.toString(), duration_minutes: service.duration_minutes.toString(), description: service.description || "", specialization: "" }); setEditingServiceId(service.id); setDialogOpen(true); }}>
              <Pencil className="w-3 h-3" />
            </Button>
            <Button size="sm" variant="destructive" className="px-2 h-7"
              onClick={() => { setDeleteServiceId(service.id); setDeleteDialogOpen(true); }}>
              <Trash className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Variants section */}
        <div style={{ borderTop: "1px solid #F0EAE2", padding: "10px 16px 10px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: variants.length > 0 ? "8px" : "0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <Layers style={{ width: "12px", height: "12px", color: GOLD_DARK }} />
              <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", color: GOLD_DARK, textTransform: "uppercase" }}>
                Variants {variants.length > 0 ? `(${variants.length})` : ""}
              </span>
            </div>
            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => openVariants(service)}>
              <Plus className="w-3 h-3 mr-1" /> Add
            </Button>
          </div>

          {variants.length === 0 && (
            <p style={{ fontSize: "11px", color: "#A8A29E", margin: 0, fontStyle: "italic" }}>
              No variants. Clients will book at the base price. Add variants if price depends on length or size.
            </p>
          )}

          {variants.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {variants.map((v: any) => (
                editingPillVariantId === v.id ? (
                  <div key={v.id} style={{ display: "flex", alignItems: "center", gap: "4px", background: "#FFF8EE", border: "1.5px solid " + GOLD_DARK, borderRadius: "10px", padding: "4px 8px", flexWrap: "wrap" }}>
                    <input autoFocus value={pillVariantForm.name} onChange={e => setPillVariantForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="Name" style={{ border: "1px solid #E5DDD3", borderRadius: "6px", padding: "2px 6px", fontSize: "11px", width: "90px", outline: "none" }} />
                    <input value={pillVariantForm.price_adjustment} onChange={e => setPillVariantForm(p => ({ ...p, price_adjustment: e.target.value }))}
                      type="number" placeholder="GHS" style={{ border: "1px solid #E5DDD3", borderRadius: "6px", padding: "2px 6px", fontSize: "11px", width: "64px", outline: "none" }} />
                    <input value={pillVariantForm.duration_adjustment} onChange={e => setPillVariantForm(p => ({ ...p, duration_adjustment: e.target.value }))}
                      type="number" placeholder="+min" style={{ border: "1px solid #E5DDD3", borderRadius: "6px", padding: "2px 6px", fontSize: "11px", width: "52px", outline: "none" }} />
                    <button onClick={() => savePillVariant(service.id, v.id)}
                      style={{ background: GOLD_DARK, border: "none", borderRadius: "5px", padding: "2px 7px", cursor: "pointer", color: "white", fontSize: "11px", fontWeight: 700 }}>✓</button>
                    <button onClick={() => setEditingPillVariantId(null)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#A8A29E", fontSize: "13px", lineHeight: 1 }}>✕</button>
                  </div>
                ) : (
                  <div key={v.id} style={{ display: "flex", alignItems: "center", gap: "4px", background: "#FBF7F3", border: "1px solid #E5DDD3", borderRadius: "20px", padding: "3px 10px", fontSize: "12px" }}>
                    <span style={{ fontWeight: 600, color: "#1C160E" }}>{v.name}</span>
                    <span style={{ color: GOLD_DARK, fontWeight: 700 }}>&nbsp;GH&#8373;{Number(v.price_adjustment).toLocaleString()}</span>
                    {v.duration_adjustment !== 0 && <span style={{ color: "#A8A29E", fontSize: "10px" }}>&nbsp;+{v.duration_adjustment}min</span>}
                    <button onClick={() => { setEditingPillVariantId(v.id); setPillVariantForm({ name: v.name, price_adjustment: String(v.price_adjustment), duration_adjustment: String(v.duration_adjustment) }); }}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "0 0 0 3px", color: "#C8A97E", display: "flex" }}>
                      <Pencil style={{ width: "10px", height: "10px" }} />
                    </button>
                    <button onClick={() => deleteVariant(service.id, v.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "0", display: "flex", alignItems: "center", color: "#A8A29E" }}>
                      <X style={{ width: "11px", height: "11px" }} />
                    </button>
                  </div>
                )
              ))}
            </div>
          )}
        </div>

        {/* Add-ons section */}
        <div style={{ borderTop: "1px solid #F0EAE2", padding: "10px 16px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: addons.length > 0 ? "8px" : "0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <Sparkles style={{ width: "12px", height: "12px", color: "#7C3AED" }} />
              <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", color: "#7C3AED", textTransform: "uppercase" }}>
                Add-ons {addons.length > 0 ? `(${addons.length})` : ""}
              </span>
            </div>
            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => openAddons(service)}>
              <Plus className="w-3 h-3 mr-1" /> Add
            </Button>
          </div>

          {addons.length === 0 && (
            <p style={{ fontSize: "11px", color: "#A8A29E", margin: 0, fontStyle: "italic" }}>
              No add-ons. Add optional extras clients can choose (e.g. Beads, Gel Polish, Lash Tint).
            </p>
          )}

          {addons.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {addons.map((a: any) => (
                editingPillAddonId === a.id ? (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: "4px", background: "#F5F3FF", border: "1.5px solid #7C3AED", borderRadius: "10px", padding: "4px 8px", flexWrap: "wrap" }}>
                    <input autoFocus value={pillAddonForm.name} onChange={e => setPillAddonForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="Name" style={{ border: "1px solid #DDD6FE", borderRadius: "6px", padding: "2px 6px", fontSize: "11px", width: "90px", outline: "none" }} />
                    <input value={pillAddonForm.price} onChange={e => setPillAddonForm(p => ({ ...p, price: e.target.value }))}
                      type="number" placeholder="GHS" style={{ border: "1px solid #DDD6FE", borderRadius: "6px", padding: "2px 6px", fontSize: "11px", width: "64px", outline: "none" }} />
                    <button onClick={() => savePillAddon(service.id, a.id)}
                      style={{ background: "#7C3AED", border: "none", borderRadius: "5px", padding: "2px 7px", cursor: "pointer", color: "white", fontSize: "11px", fontWeight: 700 }}>✓</button>
                    <button onClick={() => setEditingPillAddonId(null)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#A8A29E", fontSize: "13px", lineHeight: 1 }}>✕</button>
                  </div>
                ) : (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: "4px", background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: "20px", padding: "3px 10px", fontSize: "12px" }}>
                    <span style={{ fontWeight: 600, color: "#1C160E" }}>{a.name}</span>
                    <span style={{ color: "#7C3AED", fontWeight: 700 }}>+GH&#8373;{Number(a.price).toLocaleString()}</span>
                    <button onClick={() => { setEditingPillAddonId(a.id); setPillAddonForm({ name: a.name, price: String(a.price), duration_adjustment: String(a.duration_adjustment || 0) }); }}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "0 0 0 3px", color: "#A78BFA", display: "flex" }}>
                      <Pencil style={{ width: "10px", height: "10px" }} />
                    </button>
                    <button onClick={() => deleteAddon(service.id, a.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "0", display: "flex", alignItems: "center", color: "#A8A29E" }}>
                      <X style={{ width: "11px", height: "11px" }} />
                    </button>
                  </div>
                )
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const listedCats = (settings && (settings as any).service_categories?.length > 0)
    ? (settings as any).service_categories
    : Object.keys(groupedServices);
  const listedSet = new Set(listedCats);
  const otherCats = Object.keys(groupedServices).filter(c => !listedSet.has(c));

  return (
    <div className="z-page">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="z-title" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Services</h1>
          <p className="z-subtitle">Manage services, size variants and optional add-ons</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="outline" onClick={openReorder}>
            <Move className="w-4 h-4 mr-2" /> Reorder
          </Button>
          <Dialog open={catManagerOpen} onOpenChange={setCatManagerOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Manage Categories</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md grid gap-4 p-6">
              <DialogHeader><DialogTitle>Manage Categories</DialogTitle></DialogHeader>
              <div className="space-y-3">
                {getCategories().map(cat => (
                  <div key={cat} className="flex items-center gap-2">
                    {editingCat === cat ? (
                      <>
                        <input className="border rounded px-3 py-1.5 text-sm flex-1 outline-none focus:ring-1 focus:ring-amber-400" value={editingCatValue} onChange={e => setEditingCatValue(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleRenameCategory(cat, editingCatValue); if (e.key === "Escape") setEditingCat(null); }} autoFocus />
                        <Button size="sm" disabled={savingCats} onClick={() => handleRenameCategory(cat, editingCatValue)}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingCat(null)}>Cancel</Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm font-medium">{cat}</span>
                        <Button size="sm" variant="outline" onClick={() => { setEditingCat(cat); setEditingCatValue(cat); }}>Rename</Button>
                        <Button size="sm" variant="destructive" disabled={savingCats} onClick={() => handleDeleteCategory(cat)}>Delete</Button>
                      </>
                    )}
                  </div>
                ))}
                <div className="border-t pt-3 flex items-center gap-2">
                  <input className="border rounded px-3 py-1.5 text-sm flex-1 outline-none focus:ring-1 focus:ring-amber-400" placeholder="New category name..." value={newCatName} onChange={e => setNewCatName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleAddCategory(); }} />
                  <Button size="sm" disabled={savingCats || !newCatName.trim()} onClick={handleAddCategory}>Add</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setFormData({ name: "", category: "", price: "", duration_minutes: "", description: "", specialization: "" }); setEditingServiceId(null); }}>
                <Plus className="w-4 h-4 mr-2" /> Add Service
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md grid gap-4 p-6">
              <DialogHeader><DialogTitle>{!editingServiceId ? "Add New Service" : "Update Service"}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Service Name *</Label>
                  <Input placeholder="e.g. Knotless Braids" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Category *</Label>
                  {settings && (settings as any).service_categories?.length > 0 ? (
                    <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {(settings as any).service_categories.map((c: string) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input placeholder="Hair, Nails, Makeup, etc." value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} required />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Duration (min) *</Label>
                  <Input type="number" placeholder="e.g. 180" value={formData.duration_minutes} onChange={e => setFormData({ ...formData, duration_minutes: e.target.value })} required />
                  <p className="text-xs text-muted-foreground">Base duration. Each variant can add extra minutes.</p>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea placeholder="Short description shown to clients" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                </div>
                <Button type="submit" className="w-full">{!editingServiceId ? "Add Service" : "Update Service"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "20px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#78716C" }}>
          <Layers style={{ width: "13px", height: "13px", color: GOLD_DARK }} />
          <span><strong style={{ color: GOLD_DARK }}>Variants</strong> = size/length options. Client must pick one. Price changes per variant.</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#78716C" }}>
          <Sparkles style={{ width: "13px", height: "13px", color: "#7C3AED" }} />
          <span><strong style={{ color: "#7C3AED" }}>Add-ons</strong> = optional extras stacked on top. Client picks zero, one, or many.</span>
        </div>
      </div>

      {/* Services by category */}
      {listedCats.map((category: string) => {
        const categoryServices = groupedServices[category] || [];
        return (
          <Card key={category} className="mb-6 rounded-xl border border-gray-200">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center w-full">
                <h2 className="text-xl font-semibold">{category}</h2>
                <Button size="sm" variant="outline" onClick={() => {
                  setFormData({ name: "", category, price: "", duration_minutes: "", description: "", specialization: "" });
                  setEditingServiceId(null);
                  setDialogOpen(true);
                }}>Add Item</Button>
              </div>
            </CardHeader>
            <CardContent>
              {categoryServices.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No services in this category yet.</p>
              )}
              {categoryServices.map(renderServiceCard)}
            </CardContent>
          </Card>
        );
      })}

      {otherCats.map((category: string) => (
        <Card key={category} className="mb-6 rounded-xl border border-gray-200">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center w-full">
              <h2 className="text-xl font-semibold">{category}</h2>
              <Button size="sm" variant="outline" onClick={() => {
                setFormData({ name: "", category, price: "", duration_minutes: "", description: "", specialization: "" });
                setEditingServiceId(null);
                setDialogOpen(true);
              }}>Add Item</Button>
            </div>
          </CardHeader>
          <CardContent>
            {(groupedServices[category] || []).map(renderServiceCard)}
          </CardContent>
        </Card>
      ))}

      {services.length === 0 && (
        <Card><CardContent className="text-center py-12"><p className="z-subtitle">No services yet. Add your first service!</p></CardContent></Card>
      )}

      {/* Delete dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md grid gap-4 p-6">
          <DialogHeader><DialogTitle>Delete Service</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">This will permanently delete the service and all its variants and add-ons.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteService}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reorder */}
      <Dialog open={reorderOpen} onOpenChange={setReorderOpen}>
        <DialogContent className="max-w-md grid gap-4 p-6">
          <DialogHeader><DialogTitle>Reorder Services</DialogTitle></DialogHeader>
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="services">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2 max-h-96 overflow-y-auto">
                  {reorderServices.map((service, index) => (
                    <Draggable key={service.id} draggableId={service.id} index={index}>
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="p-2 border rounded bg-white flex justify-between items-center">
                          <span>{service.name} ({service.category})</span>
                          <span className="text-sm text-muted-foreground">GH&#8373;{service.price?.toLocaleString()}</span>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setReorderOpen(false)}>Cancel</Button>
            <Button onClick={saveReorder}>Save Order</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* VARIANTS DIALOG */}
      <Dialog open={variantDialogOpen} onOpenChange={setVariantDialogOpen}>
        <DialogContent className="max-w-lg grid gap-4 p-6">
          <DialogHeader>
            <DialogTitle>Add Variant &mdash; {activeServiceForVariants?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground mb-1">
            Each variant sets a specific size/length with its own total price. The base price on the service is the floor — set variants relative to it.
          </p>
          <div className="space-y-3 pt-2">
            <Input value={variantForm.name} onChange={e => setVariantForm({ ...variantForm, name: e.target.value })} placeholder="e.g. Short, Medium, Waist Length, Long, Extra Long" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Price Adjustment (GHS)</Label>
                <Input type="number" value={variantForm.price_adjustment} onChange={e => setVariantForm({ ...variantForm, price_adjustment: e.target.value })} placeholder="e.g. 0, 100, 200" />
                {variantForm.price_adjustment && activeServiceForVariants && (
                  <p className="text-xs text-amber-700 mt-1 font-semibold">
                    Total: GH&#8373;{(Number(activeServiceForVariants.price) + Number(variantForm.price_adjustment || 0)).toLocaleString()}
                  </p>
                )}
              </div>
              <div>
                <Label className="text-xs">Duration Add (min)</Label>
                <Input type="number" value={variantForm.duration_adjustment} onChange={e => setVariantForm({ ...variantForm, duration_adjustment: e.target.value })} placeholder="e.g. 0, 30, 60" />
              </div>
            </div>
            <Button disabled={savingVariant || !variantForm.name.trim()} onClick={saveVariant} className="w-full">
              <Plus className="w-4 h-4 mr-2" /> Add Variant
            </Button>
          </div>
          {/* Existing variants for quick reference */}
          {activeServiceForVariants && (variantsMap[activeServiceForVariants.id] || []).length > 0 && (
            <div className="border-t pt-3 mt-2">
              <p className="text-xs font-semibold text-muted-foreground mb-2">EXISTING VARIANTS</p>
              <div className="flex flex-col gap-1">
                {(variantsMap[activeServiceForVariants.id] || []).map((v: any) => (
                  <div key={v.id} className="flex items-center justify-between text-sm border rounded px-3 py-1.5">
                    <span className="font-medium">{v.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-amber-700 font-semibold">GH&#8373;{(Number(activeServiceForVariants.price) + Number(v.price_adjustment)).toLocaleString()}</span>
                      <button onClick={() => deleteVariant(activeServiceForVariants.id, v.id)} className="text-red-400 hover:text-red-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ADD-ONS DIALOG */}
      <Dialog open={addonDialogOpen} onOpenChange={setAddonDialogOpen}>
        <DialogContent className="max-w-lg grid gap-4 p-6">
          <DialogHeader>
            <DialogTitle>Add Add-on &mdash; {activeServiceForAddons?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground mb-1">
            Add-ons are optional extras. Clients can pick any combination. The price stacks on top of their chosen variant.
          </p>
          <div className="space-y-3 pt-2">
            <Input value={addonForm.name} onChange={e => setAddonForm({ ...addonForm, name: e.target.value })} placeholder="e.g. Beads, Curly Ends, Gel Polish, Lash Tint" />
            <Input value={addonForm.description} onChange={e => setAddonForm({ ...addonForm, description: e.target.value })} placeholder="Short description (optional)" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Price (GHS) *</Label>
                <Input type="number" value={addonForm.price} onChange={e => setAddonForm({ ...addonForm, price: e.target.value })} placeholder="e.g. 30, 65" />
              </div>
              <div>
                <Label className="text-xs">Duration Add (min)</Label>
                <Input type="number" value={addonForm.duration_adjustment} onChange={e => setAddonForm({ ...addonForm, duration_adjustment: e.target.value })} placeholder="e.g. 15, 30" />
              </div>
            </div>
            <Button disabled={savingAddon || !addonForm.name.trim()} onClick={saveAddon} className="w-full">
              <Plus className="w-4 h-4 mr-2" /> Add Add-on
            </Button>
          </div>
          {activeServiceForAddons && (addonsMap[activeServiceForAddons.id] || []).length > 0 && (
            <div className="border-t pt-3 mt-2">
              <p className="text-xs font-semibold text-muted-foreground mb-2">EXISTING ADD-ONS</p>
              <div className="flex flex-col gap-1">
                {(addonsMap[activeServiceForAddons.id] || []).map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between text-sm border rounded px-3 py-1.5">
                    <span className="font-medium">{a.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-purple-700 font-semibold">+GH&#8373;{Number(a.price).toLocaleString()}</span>
                      <button onClick={() => deleteAddon(activeServiceForAddons.id, a.id)} className="text-red-400 hover:text-red-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Services;
