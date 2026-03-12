// Admin Gift Card Action — service-role edge function
// Handles: sold (mark as active), resend (re-queue email)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { id, action } = await req.json();
    if (!id || !action) return new Response(JSON.stringify({ error: "id and action required" }), { status: 400, headers: cors });

    // Verify card exists
    const { data: card, error: fetchErr } = await supabase
      .from("gift_cards").select("id, status, card_type, recipient_email").eq("id", id).maybeSingle();
    if (fetchErr || !card) return new Response(JSON.stringify({ error: "Card not found" }), { status: 404, headers: cors });

    if (action === "sold") {
      const { error } = await supabase.from("gift_cards")
        .update({ status: "active", payment_status: "paid" }).eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, action: "sold" }), { headers: cors });
    }

    if (action === "resend") {
      if (!card.recipient_email) return new Response(JSON.stringify({ error: "No recipient email on this card" }), { status: 400, headers: cors });
      const { error } = await supabase.from("gift_cards")
        .update({ status: "pending_send" }).eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, action: "resend" }), { headers: cors });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: cors });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
});
