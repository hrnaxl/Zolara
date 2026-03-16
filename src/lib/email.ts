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
    const res = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: card.recipient_email,
        subject: "Your Zolara " + card.tier + " Gift Card — GH₵" + card.amount,
        html: buildGiftCardHtml(card),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("Email API error:", res.status, data);
      return false;
    }
    console.log("Gift card email sent:", data.id);
    return true;
  } catch (err: any) {
    console.error("Gift card email error:", err.message);
    return false;
  }
}

export async function sendPickupReceiptEmail(params: {
  buyerName: string;
  buyerEmail: string;
  tier: string;
  amount: number;
  cardCode: string;
  serialNumber?: string;
  paymentRef: string;
}): Promise<boolean> {
  const color = { Bronze: "#CD7F32", Silver: "#9CA3AF", Gold: "#B8975A", Platinum: "#6B7280", Diamond: "#6366F1" }[params.tier] || "#B8975A";
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5EFE6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#0F1E35;padding:32px 40px;text-align:center;">
      <div style="color:#B8975A;font-size:28px;font-weight:300;letter-spacing:4px;margin-bottom:4px;">ZOLARA</div>
      <div style="color:#9CA3AF;font-size:11px;letter-spacing:3px;">BEAUTY STUDIO</div>
    </div>
    <div style="padding:32px 40px;">
      <h2 style="color:#1C1917;font-size:20px;margin:0 0 8px;">Purchase Confirmed!</h2>
      <p style="color:#78716C;font-size:14px;line-height:1.6;margin:0 0 24px;">
        Hi ${params.buyerName}, your <strong>${params.tier} Gift Card (GH₵${params.amount})</strong> purchase was successful.
      </p>
      <div style="background:#F5EFE6;border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="font-size:11px;color:#78716C;letter-spacing:2px;margin:0 0 12px;">PICKUP DETAILS</p>
        <table style="width:100%;font-size:14px;border-collapse:collapse;">
          <tr><td style="color:#78716C;padding:4px 0;">Card Tier</td><td style="color:#1C1917;font-weight:600;text-align:right;">${params.tier}</td></tr>
          <tr><td style="color:#78716C;padding:4px 0;">Value</td><td style="color:#1C1917;font-weight:600;text-align:right;">GH₵${params.amount}</td></tr>
          ${params.serialNumber ? `<tr><td style="color:#78716C;padding:4px 0;">Card Reference</td><td style="color:#1C1917;font-weight:600;text-align:right;font-family:monospace;">${params.serialNumber}</td></tr>` : ''}
          <tr><td style="color:#78716C;padding:4px 0;">Payment Ref</td><td style="color:#1C1917;font-weight:600;text-align:right;font-family:monospace;">${params.paymentRef}</td></tr>
        </table>
      </div>
      <div style="background:#FEF9C3;border:1px solid #FDE68A;border-radius:10px;padding:16px;margin-bottom:24px;">
        <p style="color:#92400E;font-size:13px;font-weight:600;margin:0 0 6px;">How to pick up your card</p>
        <p style="color:#B45309;font-size:13px;margin:0;line-height:1.6;">
          Visit us at <strong>Zolara Beauty Studio, Sakasaka (Opposite CalBank, Tamale)</strong> and show this email or quote your Payment Reference. Your card will be ready for collection.
        </p>
      </div>
      <div style="text-align:center;">
        <a href="https://zolarasalon.com" style="background:#B8975A;color:white;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block;">Visit Our Website</a>
      </div>
    </div>
    <div style="background:#F5EFE6;padding:20px 40px;text-align:center;">
      <div style="color:#78716C;font-size:12px;">Sakasaka, Opposite CalBank, Tamale</div>
      <div style="color:#A8A29E;font-size:11px;margin-top:4px;">0594365314 / 020 884 8707 · zolarasalon.com</div>
    </div>
  </div>
</body>
</html>`;

  try {
    const res = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: params.buyerEmail,
        subject: `Your Zolara ${params.tier} Gift Card — Pickup Confirmation`,
        html,
      }),
    });
    return res.ok;
  } catch { return false; }
}

export async function sendPurchaseReceiptEmail(params: {
  buyerName: string;
  buyerEmail: string;
  tier: string;
  amount: number;
  cardCode: string;
  paymentRef: string;
  isDigital: boolean;
  recipientName?: string;
  recipientEmail?: string;
}): Promise<boolean> {
  const color = { Bronze: "#CD7F32", Silver: "#9CA3AF", Gold: "#B8975A", Platinum: "#6B7280", Diamond: "#6366F1" }[params.tier] || "#B8975A";
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5EFE6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#0F1E35;padding:32px 40px;text-align:center;">
      <div style="color:#B8975A;font-size:28px;font-weight:300;letter-spacing:4px;margin-bottom:4px;">ZOLARA</div>
      <div style="color:#9CA3AF;font-size:11px;letter-spacing:3px;">BEAUTY STUDIO</div>
    </div>
    <div style="padding:32px 40px;">
      <h2 style="color:#1C1917;font-size:20px;margin:0 0 8px;">Order Receipt</h2>
      <p style="color:#78716C;font-size:14px;line-height:1.6;margin:0 0 24px;">Hi ${params.buyerName}, thank you for your purchase!</p>
      <div style="background:#F5EFE6;border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="font-size:11px;color:#78716C;letter-spacing:2px;margin:0 0 12px;">ORDER SUMMARY</p>
        <table style="width:100%;font-size:14px;border-collapse:collapse;">
          <tr><td style="color:#78716C;padding:4px 0;">Product</td><td style="color:#1C1917;font-weight:600;text-align:right;">${params.tier} Gift Card</td></tr>
          <tr><td style="color:#78716C;padding:4px 0;">Value</td><td style="color:#1C1917;font-weight:600;text-align:right;">GH₵${params.amount}</td></tr>
          <tr><td style="color:#78716C;padding:4px 0;">Delivery</td><td style="color:#1C1917;font-weight:600;text-align:right;">${params.isDigital ? "Email Delivery" : "Store Pickup"}</td></tr>
          ${params.recipientName ? `<tr><td style="color:#78716C;padding:4px 0;">For</td><td style="color:#1C1917;font-weight:600;text-align:right;">${params.recipientName}</td></tr>` : ''}
          <tr><td style="color:#78716C;padding:4px 0;">Payment Ref</td><td style="color:#1C1917;font-weight:600;text-align:right;font-family:monospace;">${params.paymentRef}</td></tr>
        </table>
      </div>
      <p style="color:#78716C;font-size:13px;line-height:1.6;">${params.isDigital ? `The gift card has been sent to <strong>${params.recipientEmail || params.buyerEmail}</strong>.` : "Your physical card is ready for pickup at our Sakasaka location."}</p>
    </div>
    <div style="background:#F5EFE6;padding:20px 40px;text-align:center;">
      <div style="color:#78716C;font-size:12px;">Sakasaka, Opposite CalBank, Tamale</div>
      <div style="color:#A8A29E;font-size:11px;margin-top:4px;">0594365314 / 020 884 8707 · zolarasalon.com</div>
    </div>
  </div>
</body>
</html>`;

  try {
    const res = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: params.buyerEmail,
        subject: `Zolara Gift Card — Order Receipt`,
        html,
      }),
    });
    return res.ok;
  } catch { return false; }
}
