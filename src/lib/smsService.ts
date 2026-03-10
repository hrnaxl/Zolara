import { supabase } from "@/integrations/supabase/client";

const ARKESEL_API_KEY = import.meta.env.VITE_ARKESEL_API_KEY;
const SENDER_ID = "ZOLARA";

export const sendSMS = async (phone: string, message: string): Promise<boolean> => {
  if (!ARKESEL_API_KEY) { console.warn("Arkesel API key not set"); return false; }
  try {
    const res = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
      method: "POST",
      headers: { "api-key": ARKESEL_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ sender: SENDER_ID, message, recipients: [phone.replace(/\s/g, "")] }),
    });
    return res.ok;
  } catch { return false; }
};

export const getSMSCampaigns = async () => {
  const { data, error } = await supabase.from("sms_campaigns").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
};

export const createSMSCampaign = async (campaign: {
  name: string; message_template: string; trigger_type: string; send_hours_before?: number;
}) => {
  const { data, error } = await supabase.from("sms_campaigns").insert(campaign).select().single();
  if (error) throw error;
  return data;
};

export const updateSMSCampaign = async (id: string, updates: object) => {
  const { error } = await supabase.from("sms_campaigns").update(updates).eq("id", id);
  if (error) throw error;
};

export const deleteSMSCampaign = async (id: string) => {
  const { error } = await supabase.from("sms_campaigns").delete().eq("id", id);
  if (error) throw error;
};

export const getSMSQueue = async () => {
  const { data, error } = await supabase.from("sms_queue").select("*").order("scheduled_for", { ascending: false }).limit(100);
  if (error) throw error;
  return data;
};

export const interpolateTemplate = (template: string, vars: Record<string, string>) => {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || "");
};
