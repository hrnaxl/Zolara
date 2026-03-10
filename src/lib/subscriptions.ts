import { supabase } from "@/integrations/supabase/client";

export const getSubscriptionPlans = async () => {
  const { data, error } = await supabase.from("subscription_plans").select("*").eq("is_active", true).order("price");
  if (error) throw error;
  return data;
};

export const getAllSubscriptions = async () => {
  const { data, error } = await supabase.from("subscriptions")
    .select("*, subscription_plans(name, price, billing_cycle)").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
};

export const createSubscriptionPlan = async (plan: {
  name: string; description?: string; billing_cycle: string; price: number;
  max_services_per_cycle?: number; discount_percentage?: number; features?: string[];
}) => {
  const { data, error } = await supabase.from("subscription_plans").insert(plan).select().single();
  if (error) throw error;
  return data;
};

export const updateSubscriptionPlan = async (id: string, updates: object) => {
  const { error } = await supabase.from("subscription_plans").update(updates).eq("id", id);
  if (error) throw error;
};
