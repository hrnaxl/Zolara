import { supabase } from "@/integrations/supabase/client";

export const getWhatsAppContacts = async () => {
  const { data, error } = await supabase.from("whatsapp_contacts").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
};

export const getWhatsAppMessages = async (contactId: string) => {
  const { data, error } = await supabase.from("whatsapp_messages")
    .select("*").eq("contact_id", contactId).order("sent_at");
  if (error) throw error;
  return data;
};

export const sendWhatsAppMessage = async (phone: string, message: string): Promise<boolean> => {
  const token = import.meta.env.VITE_WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = import.meta.env.VITE_WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) { console.warn("WhatsApp not configured"); return false; }
  try {
    const res = await fetch(`https://graph.facebook.com/v17.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: phone, type: "text", text: { body: message } }),
    });
    return res.ok;
  } catch { return false; }
};
