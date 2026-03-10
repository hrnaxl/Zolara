import { supabase } from "@/integrations/supabase/client";

export const getProducts = async () => {
  const { data, error } = await supabase.from("products")
    .select("*, product_categories(name)").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
};

export const getProductCategories = async () => {
  const { data, error } = await supabase.from("product_categories").select("*").order("display_order");
  if (error) throw error;
  return data;
};

export const createProduct = async (product: {
  name: string; description?: string; category_id?: string; price: number;
  stock_quantity?: number; sku?: string; is_active?: boolean; is_featured?: boolean;
}) => {
  const { data, error } = await supabase.from("products").insert(product).select().single();
  if (error) throw error;
  return data;
};

export const updateProduct = async (id: string, updates: object) => {
  const { error } = await supabase.from("products").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
};

export const deleteProduct = async (id: string) => {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
};

export const getOrders = async () => {
  const { data, error } = await supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
};
