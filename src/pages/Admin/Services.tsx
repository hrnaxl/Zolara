import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Clock, Trash, Move, Layers, Sparkles } from "lucide-react";
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
  price: z.number().positive().max(1000000),
  duration_minutes: z.number().int().positive().max(1440),
  description: z.string().max(500).optional().or(z.literal("")),
  order: z.number().int().optional(),
});

const Services = () => {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Variants
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [activeServiceForVariants, setActiveServiceForVariants] = useState<any>(null);
  const [serviceVariants, setServiceVariants] = useState<any[]>([]);
  const [variantForm, setVariantForm] = useState({ name: "", price_adjustment: "", duration_adjustment: "" });
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [savingVariant, setSavingVariant] = useState(false);

  // Add-ons
  const [addonDialogOpen, setAddonDialogOpen] = useState(false);
  const [activeServiceForAddons, setActiveServiceForAddons] = useState<any>(null);
  const [serviceAddons, setServiceAddons] = useState<any[]>([]);
  const [addonForm, setAddonForm] = useState({ name: "", description: "", price: "", duration_adjustment: "" });
  const [editingAddonId, setEditingAddonId] = useState<string | null>(null);
  const [savingAddon, setSavingAddon] = useState(false);

  useEffect(() => { fetchServices(); }, []);

  const catalog = useCatalog();
  const { settings, setSettings } = useSettings();

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase.from("services").select("*").order("category").order("order", { ascending: true });
      if (error) throw error;
      setServices(data || []);
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
    fetchServices();
  };

  const handleDeleteCategory = async (name: string) => {
    const cats = getCategories().filter(c => c !== name);
    await saveCategories(cats);
  };

  // ── Variants ──────────────────────────────────────────────────
  const openVariants = async (svc: any) => {
    setActiveServiceForVariants(svc);
    setVariantForm({ name: "", price_adjustment: "", duration_adjustment: "" });
    setEditingVariantId(null);
    const { data } = await (supabase as any).from("service_variants").select("*").eq("service_id", svc.id).order("sort_order");
    setServiceVariants(data || []);
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
        sort_order: editingVariantId ? undefined : serviceVariants.length,
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
      const { data } = await (supabase as any).from("service_variants").select("*").eq("service_id", activeServiceForVariants.id).order("sort_order");
      setServiceVariants(data || []);
      setVariantForm({ name: "", price_adjustment: "", duration_adjustment: "" });
      setEditingVariantId(null);
    } catch (err: any) { toast.error(err.message || "Failed to save variant"); }
    finally { setSavingVariant(false); }
  };

  const deleteVariant = async (id: string) => {
    const { error } = await (supabase as any).from("service_variants").delete().eq("id", id);
    if (error) { toast.error("Failed to delete variant"); return; }
    setServiceVariants(prev => prev.filter(v => v.id !== id));
    toast.success("Variant removed");
  };

  // ── Add-ons ───────────────────────────────────────────────────
  const openAddons = async (svc: any) => {
    setActiveServiceForAddons(svc);
    setAddonForm({ name: "", description: "", price: "", duration_adjustment: "" });
    setEditingAddonId(null);
    const { data } = await (supabase as any).from("service_addons").select("*").eq("service_id", svc.id).order("sort_order");
    setServiceAddons(data || []);
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
        sort_order: editingAddonId ? undefined : serviceAddons.length,
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
      const { data } = await (supabase as any).from("service_addons").select("*").eq("service_id", activeServiceForAddons.id).order("sort_order");
      setServiceAddons(data || []);
      setAddonForm({ name: "", description: "", price: "", duration_adjustment: "" });
      setEditingAddonId(null);
    } catch (err: any) { toast.error(err.message || "Failed to save add-on"); }
    finally { setSavingAddon(false); }
  };

  const deleteAddon = async (id: string) => {
    const { error } = await (supabase as any).from("service_addons").delete().eq("id", id);
    if (error) { toast.error("Failed to delete add-on"); return; }
    setServiceAddons(prev => prev.filter(a => a.id !== id));
    toast.success("Add-on removed");
  };

  // ── Service CRUD ──────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validated = serviceSchema.parse({
        name: formData.name, category: formData.category,
        price: parseFloat(formData.price), duration_minutes: parseInt(formData.duration_minutes),
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
      fetchServices();
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
      fetchServices();
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
        const { error } = await supabase.from("services").update({ order: index } as any).eq("id", item.id);
        if (error) throw error;
      }
      toast.success("Services reordered");
      setReorderOpen(false);
      fetchServices();
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

  const renderServiceRow = (service: any) => (
    <div key={service.id} className="rounded-lg border bg-white/60 dark:bg-gray-900/40 p-3 sm:p-4 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
      <div className="space-y-1 sm:space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
          <p className="text-sm font-semibold">{service.name}</p>
        </div>
        {service.description && <p className="text-xs sm:text-sm text-muted-foreground">{service.description}</p>}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
        <div className="flex justify-between sm:block text-sm">
          <span className="sm:hidden text-muted-foreground">Price</span>
          <div className="text-right">
            <p className="font-semibold">GH&#8373;{Number(service.price || 0).toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">{service.duration_minutes} min</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-1 sm:justify-start flex-wrap">
          <Switch
            checked={service.is_active}
            onCheckedChange={async (checked) => {
              try {
                const { error } = await supabase.from("services").update({ is_active: checked }).eq("id", service.id);
                if (error) throw error;
                setServices(prev => prev.map(s => s.id === service.id ? { ...s, is_active: checked } : s));
                try { catalog.refreshCatalog(); } catch {}
              } catch { toast.error("Failed to update status"); }
            }}
          />
          <Button size="sm" variant="outline" className="px-2" title="Manage size/length variants" onClick={() => openVariants(service)}>
            <Layers className="w-3 h-3 mr-1" /><span className="text-xs">Variants</span>
          </Button>
          <Button size="sm" variant="outline" className="px-2" title="Manage add-ons" onClick={() => openAddons(service)}>
            <Sparkles className="w-3 h-3 mr-1" /><span className="text-xs">Add-ons</span>
          </Button>
          <Button size="sm" variant="outline" className="px-2 sm:px-3"
            onClick={() => {
              setFormData({ name: service.name, category: service.category, price: service.price.toString(), duration_minutes: service.duration_minutes.toString(), description: service.description || "", specialization: service.specialization || "" });
              setEditingServiceId(service.id);
              setDialogOpen(true);
            }}>
            <span className="hidden sm:inline">Edit</span><span className="sm:hidden">&#9998;</span>
          </Button>
          <Button size="sm" variant="destructive" className="px-2 sm:px-3"
            onClick={() => { setDeleteServiceId(service.id); setDeleteDialogOpen(true); }}>
            <Trash className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  const listedCats = (settings && (settings as any).service_categories && (settings as any).service_categories.length > 0)
    ? (settings as any).service_categories
    : Object.keys(groupedServices);
  const listedSet = new Set(listedCats);
  const otherCats = Object.keys(groupedServices).filter(c => !listedSet.has(c));

  return (
    <div className="z-page">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="z-title" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Services</h1>
          <p className="z-subtitle">Manage your salon services, variants, and add-ons</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 justify-end w-full mb-4">
          <Button className="flex-1 sm:flex-none" onClick={openReorder}>
            <Move className="w-4 h-4 mr-2" /> Reorder
          </Button>
          <Dialog open={catManagerOpen} onOpenChange={setCatManagerOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Manage Categories</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
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
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>{!editingServiceId ? "Add New Service" : "Update Service"}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Service Name *</Label>
                  <Input placeholder="e.g. Boho Knotless Braids" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Base Price (GH&#8373;) *</Label>
                    <Input type="number" placeholder="e.g. 380" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Duration (min) *</Label>
                    <Input type="number" placeholder="e.g. 180" value={formData.duration_minutes} onChange={e => setFormData({ ...formData, duration_minutes: e.target.value })} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea placeholder="Short description shown to clients during booking" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                </div>
                <p className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded p-2">
                  After saving, use the <strong>Variants</strong> button to add length/size options and <strong>Add-ons</strong> to add optional extras.
                </p>
                <Button type="submit" className="w-full">{!editingServiceId ? "Add Service" : "Update Service"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Services by category */}
      {listedCats.map((category: string) => {
        const categoryServices = groupedServices[category] || [];
        return (
          <Card key={category} className="mb-6 rounded-xl border border-gray-200">
            <CardHeader>
              <div className="flex justify-between items-center w-full">
                <h2 className="text-xl font-semibold">{category}</h2>
                <Button size="sm" variant="outline" onClick={() => {
                  setFormData({ name: "", category, price: "", duration_minutes: "", description: "", specialization: "" });
                  setEditingServiceId(null);
                  setDialogOpen(true);
                }}>Add Item</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {categoryServices.map(renderServiceRow)}
              {categoryServices.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No services in this category yet.</p>
              )}
            </CardContent>
          </Card>
        );
      })}

      {otherCats.map((category: string) => (
        <Card key={category} className="mb-6 rounded-xl border border-gray-200">
          <CardHeader>
            <div className="flex justify-between items-center w-full">
              <h2 className="text-xl font-semibold">{category}</h2>
              <Button size="sm" variant="outline" onClick={() => {
                setFormData({ name: "", category, price: "", duration_minutes: "", description: "", specialization: "" });
                setEditingServiceId(null);
                setDialogOpen(true);
              }}>Add Item</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {(groupedServices[category] || []).map(renderServiceRow)}
          </CardContent>
        </Card>
      ))}

      {services.length === 0 && (
        <Card><CardContent className="text-center py-12"><p className="z-subtitle">No services yet. Add your first service!</p></CardContent></Card>
      )}

      {/* Delete dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Delete Service</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">This will permanently delete the service and all its variants and add-ons.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteService}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reorder modal */}
      <Dialog open={reorderOpen} onOpenChange={setReorderOpen}>
        <DialogContent className="max-w-md">
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Variants &mdash; {activeServiceForVariants?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground mb-3">
            Variants let clients choose length or size (e.g. Short, Medium, Waist Length). Each variant adjusts base price and duration. The booking page will require clients to pick one before booking.
          </p>
          <div className="space-y-2 mb-4 max-h-52 overflow-y-auto">
            {serviceVariants.map(v => (
              <div key={v.id} className="flex items-center justify-between border rounded px-3 py-2 text-sm gap-2">
                {editingVariantId === v.id ? (
                  <div className="flex gap-2 flex-1">
                    <Input value={variantForm.name} onChange={e => setVariantForm({ ...variantForm, name: e.target.value })} placeholder="Name" className="h-7 text-xs" />
                    <Input type="number" value={variantForm.price_adjustment} onChange={e => setVariantForm({ ...variantForm, price_adjustment: e.target.value })} placeholder="+/-GHS" className="h-7 text-xs w-20" />
                    <Input type="number" value={variantForm.duration_adjustment} onChange={e => setVariantForm({ ...variantForm, duration_adjustment: e.target.value })} placeholder="+min" className="h-7 text-xs w-16" />
                  </div>
                ) : (
                  <div className="flex-1">
                    <span className="font-medium">{v.name}</span>
                    <span className="text-muted-foreground ml-2 text-xs">
                      {v.price_adjustment >= 0 ? "+" : ""}GHS {v.price_adjustment}
                      {v.duration_adjustment !== 0 ? ` / ${v.duration_adjustment > 0 ? "+" : ""}${v.duration_adjustment}min` : ""}
                    </span>
                  </div>
                )}
                <div className="flex gap-1 shrink-0">
                  {editingVariantId === v.id ? (
                    <>
                      <Button size="sm" disabled={savingVariant} onClick={saveVariant} className="h-6 text-xs px-2">Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingVariantId(null)} className="h-6 text-xs px-2">Cancel</Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => { setEditingVariantId(v.id); setVariantForm({ name: v.name, price_adjustment: String(v.price_adjustment), duration_adjustment: String(v.duration_adjustment) }); }} className="h-6 text-xs px-2">Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteVariant(v.id)} className="h-6 text-xs px-2 text-red-500">Del</Button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {serviceVariants.length === 0 && <p className="text-xs text-muted-foreground py-3 text-center">No variants yet.</p>}
          </div>
          {!editingVariantId && (
            <div className="border-t pt-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add Variant</p>
              <Input value={variantForm.name} onChange={e => setVariantForm({ ...variantForm, name: e.target.value })} placeholder="e.g. Short, Medium, Waist Length, Long, Extra Long" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Price Adjustment (GHS)</Label>
                  <Input type="number" value={variantForm.price_adjustment} onChange={e => setVariantForm({ ...variantForm, price_adjustment: e.target.value })} placeholder="0" />
                  <p className="text-xs text-muted-foreground mt-1">Use 0 for base price, 50 to add GHS 50</p>
                </div>
                <div>
                  <Label className="text-xs">Duration Adjustment (min)</Label>
                  <Input type="number" value={variantForm.duration_adjustment} onChange={e => setVariantForm({ ...variantForm, duration_adjustment: e.target.value })} placeholder="0" />
                </div>
              </div>
              <Button disabled={savingVariant || !variantForm.name.trim()} onClick={saveVariant} className="w-full">
                <Plus className="w-4 h-4 mr-2" /> Add Variant
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ADD-ONS DIALOG */}
      <Dialog open={addonDialogOpen} onOpenChange={setAddonDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add-ons &mdash; {activeServiceForAddons?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground mb-3">
            Add-ons are optional extras clients select during booking. The total price updates automatically. Example: Extra Curls +GHS 65.
          </p>
          <div className="space-y-2 mb-4 max-h-52 overflow-y-auto">
            {serviceAddons.map(a => (
              <div key={a.id} className="flex items-center justify-between border rounded px-3 py-2 text-sm gap-2">
                {editingAddonId === a.id ? (
                  <div className="flex gap-2 flex-1 flex-wrap">
                    <Input value={addonForm.name} onChange={e => setAddonForm({ ...addonForm, name: e.target.value })} placeholder="Name" className="h-7 text-xs flex-1" />
                    <Input type="number" value={addonForm.price} onChange={e => setAddonForm({ ...addonForm, price: e.target.value })} placeholder="GHS" className="h-7 text-xs w-20" />
                  </div>
                ) : (
                  <div className="flex-1">
                    <span className="font-medium">{a.name}</span>
                    {a.description && <span className="text-muted-foreground ml-1 text-xs">— {a.description}</span>}
                    <span className="text-amber-700 font-semibold ml-2 text-xs">+GHS {a.price}</span>
                  </div>
                )}
                <div className="flex gap-1 shrink-0">
                  {editingAddonId === a.id ? (
                    <>
                      <Button size="sm" disabled={savingAddon} onClick={saveAddon} className="h-6 text-xs px-2">Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingAddonId(null)} className="h-6 text-xs px-2">Cancel</Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => { setEditingAddonId(a.id); setAddonForm({ name: a.name, description: a.description || "", price: String(a.price), duration_adjustment: String(a.duration_adjustment || 0) }); }} className="h-6 text-xs px-2">Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteAddon(a.id)} className="h-6 text-xs px-2 text-red-500">Del</Button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {serviceAddons.length === 0 && <p className="text-xs text-muted-foreground py-3 text-center">No add-ons yet.</p>}
          </div>
          {!editingAddonId && (
            <div className="border-t pt-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add an Add-on</p>
              <Input value={addonForm.name} onChange={e => setAddonForm({ ...addonForm, name: e.target.value })} placeholder="e.g. Extra Curls, Beads, Gel Polish, Nail Art" />
              <Input value={addonForm.description} onChange={e => setAddonForm({ ...addonForm, description: e.target.value })} placeholder="Short description shown to clients (optional)" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Price (GHS) *</Label>
                  <Input type="number" value={addonForm.price} onChange={e => setAddonForm({ ...addonForm, price: e.target.value })} placeholder="e.g. 65" />
                </div>
                <div>
                  <Label className="text-xs">Duration Add (min)</Label>
                  <Input type="number" value={addonForm.duration_adjustment} onChange={e => setAddonForm({ ...addonForm, duration_adjustment: e.target.value })} placeholder="e.g. 15" />
                </div>
              </div>
              <Button disabled={savingAddon || !addonForm.name.trim()} onClick={saveAddon} className="w-full">
                <Plus className="w-4 h-4 mr-2" /> Add Add-on
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Services;
