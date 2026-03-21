import { supabase } from "@/integrations/supabase/client";

export const getAddons = async () => {
  const { data, error } = await supabase.from("addons").select("*").order("display_order");
  if (error) throw error;
  return data;
};

export const createAddon = async (addon: {
  name: string; description?: string; price: number;
  price_min?: number | null; price_max?: number | null;
  duration_minutes?: number; category?: string; display_order?: number;
}) => {
  const { data, error } = await supabase.from("addons").insert(addon).select().single();
  if (error) throw error;
  return data;
};

export const updateAddon = async (id: string, updates: Partial<{ name: string; description: string; price: number; price_min: number | null; price_max: number | null; duration_minutes: number; category: string; is_active: boolean; display_order: number }>) => {
  const { error } = await supabase.from("addons").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
};

export const deleteAddon = async (id: string) => {
  const { error } = await supabase.from("addons").delete().eq("id", id);
  if (error) throw error;
};
