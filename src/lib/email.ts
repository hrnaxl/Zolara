// Direct Resend email utility — no edge function needed
const TIER_COLORS: Record<string, string> = {
  Bronze:   "#CD7F32",
  Silver:   "#9CA3AF",
  Gold:     "#B8975A",
  Platinum: "#6B7280",
  Diamond:  "#6366F1",
};

function buildGiftCardHtml(card: {
  tier: string; amount: number; code: string;
  recipient_name?: string; buyer_name?: string; message?: string;
}): string {
  const color = TIER_COLORS[card.tier] || "#B8975A";
  const grace = card.tier === "Diamond" ? 50 : card.tier === "Bronze" ? 0 : 15;
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
      <div style="background:linear-gradient(135deg,${color},${color}99);border-radius:12px;padding:28px;margin-bottom:24px;">
        <div style="color:rgba(255,255,255,0.8);font-size:9px;letter-spacing:3px;margin-bottom:20px;">ZOLARA BEAUTY STUDIO</div>
        <div style="color:white;font-size:36px;font-weight:700;margin-bottom:4px;">GH₵ ${card.amount.toLocaleString()}</div>
        <div style="color:rgba(255,255,255,0.7);font-size:10px;letter-spacing:4px;">${card.tier.toUpperCase()} GIFT CARD</div>
      </div>
    </div>
    <div style="padding:0 40px 24px;">
      <p style="color:#1C1917;font-size:16px;margin:0 0 8px;">Hello ${card.recipient_name || "there"},</p>
      <p style="color:#78716C;font-size:14px;line-height:1.6;margin:0 0 20px;">
        You have received a Zolara Beauty Studio gift card worth <strong style="color:#1C1917;">GH₵ ${card.amount.toLocaleString()}</strong>${card.buyer_name ? ` from <strong>${card.buyer_name}</strong>` : ""}.
        ${card.message ? `<br><br><em>"${card.message}"</em>` : ""}
      </p>
      <div style="background:#FAFAF8;border:2px dashed #B8975A;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px;">
        <div style="font-size:11px;color:#78716C;letter-spacing:2px;margin-bottom:8px;">YOUR GIFT CARD CODE</div>
        <div style="font-size:26px;font-weight:700;color:#0F1E35;letter-spacing:4px;font-family:monospace;">${card.code}</div>
        <div style="font-size:11px;color:#A8A29E;margin-top:8px;">Present this code at checkout</div>
      </div>
      <div style="font-size:12px;color:#A8A29E;line-height:1.6;margin-bottom:24px;">
        Valid for 12 months. Redeemable for any service at Zolara Beauty Studio.
        ${grace > 0 ? `If service total exceeds card value by up to GH₵${grace}, the difference is on us.` : ""}
      </div>
      <div style="text-align:center;margin-bottom:32px;">
        <a href="https://zolarasalon.com/book" style="background:#B8975A;color:white;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block;">
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

export async function sendGiftCardEmail(card: {
  id: string;
  tier: string;
  amount: number;
  code: string;
  recipient_name?: string;
  recipient_email: string;
  buyer_name?: string;
  message?: string;
}): Promise<boolean> {
  try {
    // Call our Vercel API route — runs server-side, no CORS issues
    const res = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: card.recipient_email,
        subject: `Your Zolara ${card.tier} Gift Card — GH₵${card.amount}`,
        html: buildGiftCardHtml(card),
      }),
    });
    const data = await res.json();
    if (!res.ok) { console.error("Email API error:", data); return false; }
    return true;
  } catch (err) {
    console.error("Gift card email error:", err);
    return false;
  }
}
