import { supabase } from "@/integrations/supabase/client";

export const getWaitlist = async () => {
  const { data, error } = await supabase
    .from("waitlist")
    .select("*, services(name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
};

export const addToWaitlist = async (entry: {
  client_id?: string; service_id: string; preferred_date: string;
  preferred_time: string; client_name: string; client_phone: string;
  client_email?: string; priority?: number; notes?: string;
}) => {
  const { data, error } = await supabase.from("waitlist").insert(entry).select().single();
  if (error) throw error;
  return data;
};

export const updateWaitlistStatus = async (id: string, status: string) => {
  const { error } = await supabase.from("waitlist").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
};

export const deleteWaitlistEntry = async (id: string) => {
  const { error } = await supabase.from("waitlist").delete().eq("id", id);
  if (error) throw error;
};
