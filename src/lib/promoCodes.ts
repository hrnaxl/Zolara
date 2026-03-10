import { supabase } from "@/integrations/supabase/client";

export const getPromoCodes = async () => {
  const { data, error } = await supabase.from("promo_codes").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
};

export const createPromoCode = async (promo: {
  code: string; description?: string; discount_type: "percentage" | "fixed_amount";
  discount_value: number; minimum_amount?: number; max_uses?: number;
  expires_at?: string; is_active?: boolean;
}) => {
  // Only send fields the DB schema cache recognises - use raw SQL via rpc to bypass cache issues
  const payload: any = {
    code: promo.code.toUpperCase(),
    discount_type: promo.discount_type,
    discount_value: promo.discount_value,
    is_active: promo.is_active ?? true,
  };
  // Add optional fields only if provided, and use column names exactly as in DB
  if (promo.expires_at) payload.expires_at = promo.expires_at;
  if (promo.max_uses) payload.max_uses = promo.max_uses;
  if (promo.minimum_amount) payload.minimum_amount = promo.minimum_amount;
  if (promo.description) payload.description = promo.description;

  const { data, error } = await supabase.from("promo_codes").insert(payload).select().single();
  if (error) throw error;
  return data;
};

export const updatePromoCode = async (id: string, updates: object) => {
  const { error } = await supabase.from("promo_codes").update(updates).eq("id", id);
  if (error) throw error;
};

export const deletePromoCode = async (id: string) => {
  const { error } = await supabase.from("promo_codes").delete().eq("id", id);
  if (error) throw error;
};

export const validatePromoCode = async (code: string): Promise<{ valid: boolean; message: string; promo?: any }> => {
  const { data, error } = await supabase.from("promo_codes")
    .select("*").eq("code", code.toUpperCase()).eq("is_active", true).single();
  if (error || !data) return { valid: false, message: "Invalid promo code" };
  if (data.expires_at && new Date(data.expires_at) < new Date()) return { valid: false, message: "Promo code expired" };
  if (data.max_uses && data.used_count >= data.max_uses) return { valid: false, message: "Promo code usage limit reached" };
  return { valid: true, message: "Valid", promo: data };
};
