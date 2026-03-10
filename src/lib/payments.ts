import { supabase } from "@/integrations/supabase/client";

export const getPaymentMethods = async () => {
  const { data, error } = await supabase.from("payment_methods").select("*").eq("is_active", true);
  if (error) throw error;
  return data;
};

export const getTransactions = async () => {
  const { data, error } = await supabase.from("payment_transactions")
    .select("*").order("created_at", { ascending: false }).limit(100);
  if (error) throw error;
  return data;
};

export const createTransaction = async (tx: {
  client_id?: string; payment_method_id: string; transaction_type: string;
  related_id?: string; amount: number; currency?: string;
}) => {
  const { data, error } = await supabase.from("payment_transactions")
    .insert({ ...tx, currency: tx.currency || "GHS", net_amount: tx.amount }).select().single();
  if (error) throw error;
  return data;
};
