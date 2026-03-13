// ================================================================
// SEND GIFT CARD EMAIL
// Called directly after purchase OR as a cron for pending_send cards
// ================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const TIER_COLORS: Record<string, string> = {
  Silver: "#9CA3AF", Gold: "#B8975A", Platinum: "#6B7280", Diamond: "#6366F1",
};

function buildEmailHtml(card: any): string {
  const tierColor = TIER_COLORS[card.tier] || "#B8975A";
  const value = card.amount || 0;
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5EFE6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#0F1E35;padding:32px 40px;text-align:center;">
      <div style="color:#B8975A;font-size:28px;font-weight:300;letter-spacing:4px;margin-bottom:4px;">ZOLARA</div>
      <div style="color:#9CA3AF;font-size:11px;letter-spacing:3px;">BEAUTY STUDIO</div>
    </div>
    <div style="padding:32px 40px 0;">
      <div style="background:linear-gradient(135deg,${tierColor},${tierColor}99);border-radius:12px;padding:28px;margin-bottom:24px;">
        <div style="color:rgba(255,255,255,0.8);font-size:9px;letter-spacing:3px;margin-bottom:20px;">ZOLARA BEAUTY STUDIO</div>
        <div style="color:white;font-size:36px;font-weight:700;margin-bottom:4px;">GH₵ ${value.toLocaleString()}</div>
        <div style="color:rgba(255,255,255,0.7);font-size:10px;letter-spacing:4px;">${(card.tier || "").toUpperCase()} GIFT CARD</div>
      </div>
    </div>
    <div style="padding:0 40px 24px;">
      <p style="color:#1C1917;font-size:16px;margin:0 0 8px;">Hello ${card.recipient_name || "there"},</p>
      <p style="color:#78716C;font-size:14px;line-height:1.6;margin:0 0 20px;">
        You have received a Zolara Beauty Studio gift card worth <strong style="color:#1C1917;">GH₵ ${value.toLocaleString()}</strong>${card.buyer_name ? ` from <strong>${card.buyer_name}</strong>` : ""}.
        ${card.message ? `<br><br><em>"${card.message}"</em>` : ""}
      </p>
      <div style="background:#FAFAF8;border:2px dashed #B8975A;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px;">
        <div style="font-size:11px;color:#78716C;letter-spacing:2px;margin-bottom:8px;">YOUR GIFT CARD CODE</div>
        <div style="font-size:26px;font-weight:700;color:#0F1E35;letter-spacing:4px;font-family:monospace;">${card.code}</div>
        <div style="font-size:11px;color:#A8A29E;margin-top:8px;">Present this code at checkout</div>
      </div>
      <div style="font-size:12px;color:#A8A29E;line-height:1.6;margin-bottom:24px;">
        Valid for 12 months from date of issue. Redeemable for any service at Zolara Beauty Studio. One-time use only.
        ${card.tier === "Diamond" ? "If service total exceeds card value by up to GH₵50, the difference is on us." : "If service total exceeds card value by up to GH₵15, the difference is on us."}
        Cannot be split across multiple visits.
      </div>
      <div style="text-align:center;margin-bottom:32px;">
        <a href="https://zolarasalon.com" style="background:#B8975A;color:white;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block;">
          Book Your Appointment
        </a>
      </div>
    </div>
    <div style="background:#F5EFE6;padding:20px 40px;text-align:center;">
      <div style="color:#78716C;font-size:12px;">Sakasaka, Opposite CalBank, Tamale</div>
      <div style="color:#A8A29E;font-size:11px;margin-top:4px;">0594365314 / 020 884 8707 · zolarasalon.com · @zolarastudio</div>
    </div>
  </div>
</body>
</html>`;
}

async function sendEmail(card: any): Promise<boolean> {
  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY") || ""}`,
    },
    body: JSON.stringify({
      from: "Zolara Beauty Studio <hello@noreply.zolarasalon.com>",
      to: [card.recipient_email],
      subject: `Your Zolara ${card.tier} Gift Card — GH₵${card.amount}`,
      html: buildEmailHtml(card),
    }),
  });
  return emailRes.ok;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};

    // If called with a specific card_id, send that card immediately
    if (body.card_id) {
      const { data: card } = await supabase
        .from("gift_cards")
        .select("*")
        .eq("id", body.card_id)
        .single();

      if (!card) return new Response(JSON.stringify({ error: "Card not found" }), { status: 404, headers: cors });

      const ok = await sendEmail(card);
      if (ok) {
        await supabase.from("gift_cards").update({ status: "active", payment_status: "paid" }).eq("id", card.id);
        return new Response(JSON.stringify({ sent: 1 }), { headers: cors });
      }
      return new Response(JSON.stringify({ error: "Email send failed" }), { status: 500, headers: cors });
    }

    // Cron mode — find all pending_send digital cards and send them
    const { data: cards } = await supabase
      .from("gift_cards")
      .select("*")
      .eq("payment_status", "pending_send")
      .eq("card_type", "digital")
      .limit(20);

    if (!cards || cards.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: cors });
    }

    let sent = 0;
    for (const card of cards) {
      try {
        const ok = await sendEmail(card);
        if (ok) {
          await supabase.from("gift_cards").update({ status: "active", payment_status: "paid" }).eq("id", card.id);
          sent++;
        }
      } catch (e) {
        console.error(`Failed card ${card.id}:`, e);
      }
    }

    return new Response(JSON.stringify({ sent }), { headers: cors });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
});
