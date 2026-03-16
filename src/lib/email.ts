/**
 * Zolara email utilities — all emails go through /api/send-email (server-side Resend)
 */

const TIER_COLORS: Record<string, string> = {
  Bronze: "#CD7F32",
  Silver: "#9CA3AF",
  Gold: "#B8975A",
  Platinum: "#6B7280",
  Diamond: "#6366F1",
};

// ── Gift Card Email ───────────────────────────────────────────────────────────

export async function sendGiftCardEmail(params: {
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
    const color = TIER_COLORS[params.tier] || "#B8975A";
    const grace = params.tier === "Diamond" ? 50 : params.tier === "Bronze" ? 0 : 15;
    const recipient = params.recipient_name || "there";
    const buyer = params.buyer_name || "";
    const msg = params.message || "";

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5EFE6;font-family:Helvetica,Arial,sans-serif;">
<div style="max-width:560px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:#0F1E35;padding:32px 40px;text-align:center;">
    <div style="color:#B8975A;font-size:28px;font-weight:300;letter-spacing:4px;">ZOLARA</div>
    <div style="color:#9CA3AF;font-size:11px;letter-spacing:3px;margin-top:4px;">BEAUTY STUDIO</div>
  </div>
  <div style="padding:32px 40px;">
    <div style="background:${color};border-radius:12px;padding:28px;margin-bottom:24px;text-align:center;position:relative;overflow:hidden;">
      <div style="position:absolute;top:-20px;right:-20px;width:80px;height:80px;border-radius:50%;background:rgba(255,255,255,0.08);"></div>
      <div style="color:rgba(255,255,255,0.8);font-size:10px;letter-spacing:3px;margin-bottom:12px;">ZOLARA BEAUTY STUDIO</div>
      <div style="color:white;font-size:40px;font-weight:700;">GH&#8373; ${params.amount.toLocaleString()}</div>
      <div style="color:rgba(255,255,255,0.8);font-size:11px;letter-spacing:4px;margin-top:8px;">${params.tier.toUpperCase()} GIFT CARD</div>
    </div>
    <p style="color:#1C1917;font-size:16px;margin:0 0 12px;">Hello ${recipient},</p>
    <p style="color:#78716C;font-size:14px;line-height:1.7;margin:0 0 24px;">
      You have received a Zolara Beauty Studio gift card worth <strong>GH&#8373; ${params.amount.toLocaleString()}</strong>${buyer ? " from <strong>" + buyer + "</strong>" : ""}. ${msg ? "<br><br><em>&ldquo;" + msg + "&rdquo;</em>" : ""}
    </p>
    <div style="background:#FAFAF8;border:2px dashed #B8975A;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
      <div style="font-size:11px;color:#78716C;letter-spacing:2px;margin-bottom:10px;">YOUR GIFT CARD CODE</div>
      <div style="font-size:30px;font-weight:700;color:#0F1E35;letter-spacing:5px;font-family:monospace;">${params.code}</div>
      <div style="font-size:11px;color:#A8A29E;margin-top:10px;">Present this code at checkout</div>
    </div>
    <div style="font-size:12px;color:#A8A29E;line-height:1.7;margin-bottom:24px;">
      Valid for 12 months. Redeemable for any service at Zolara Beauty Studio.
      ${grace > 0 ? "If your service total exceeds the card value by up to GH&#8373;" + grace + ", the difference is covered by the card." : ""}
    </div>
    <div style="text-align:center;margin-bottom:32px;">
      <a href="https://zolarasalon.com/book" style="background:#B8975A;color:white;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block;">Book Your Appointment</a>
    </div>
  </div>
  <div style="background:#F5EFE6;padding:20px 40px;text-align:center;">
    <div style="color:#78716C;font-size:12px;">Sakasaka, Opposite CalBank, Tamale</div>
    <div style="color:#A8A29E;font-size:11px;margin-top:4px;">0594365314 &middot; zolarasalon.com &middot; @zolarastudio</div>
  </div>
</div>
</body></html>`;

    const res = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: params.recipient_email,
        subject: "Your Zolara " + params.tier + " Gift Card \u2014 GH\u20B5" + params.amount,
        html,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { console.error("sendGiftCardEmail failed:", data); return false; }
    console.log("Gift card email sent:", (data as any).id);
    return true;
  } catch (err: any) {
    console.error("sendGiftCardEmail error:", err.message);
    return false;
  }
}

// ── Pickup Receipt Email ──────────────────────────────────────────────────────

export async function sendPickupReceiptEmail(params: {
  buyerName: string;
  buyerEmail: string;
  tier: string;
  amount: number;
  cardCode: string;
  serialNumber?: string;
  paymentRef: string;
}): Promise<boolean> {
  try {
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F5EFE6;font-family:Helvetica,Arial,sans-serif;">
<div style="max-width:560px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:#0F1E35;padding:32px 40px;text-align:center;">
    <div style="color:#B8975A;font-size:28px;font-weight:300;letter-spacing:4px;">ZOLARA</div>
    <div style="color:#9CA3AF;font-size:11px;letter-spacing:3px;margin-top:4px;">BEAUTY STUDIO</div>
  </div>
  <div style="padding:32px 40px;">
    <h2 style="color:#1C1917;font-size:22px;margin:0 0 8px;">Purchase Confirmed &#10003;</h2>
    <p style="color:#78716C;font-size:14px;line-height:1.7;margin:0 0 24px;">
      Hi ${params.buyerName}, your <strong>${params.tier} Gift Card (GH&#8373;${params.amount})</strong> purchase was successful.
    </p>
    <div style="background:#F5EFE6;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="font-size:10px;color:#78716C;letter-spacing:2px;margin:0 0 12px;font-weight:700;">PICKUP DETAILS</p>
      <table style="width:100%;font-size:14px;border-collapse:collapse;">
        <tr><td style="color:#78716C;padding:5px 0;">Card Tier</td><td style="color:#1C1917;font-weight:600;text-align:right;">${params.tier}</td></tr>
        <tr><td style="color:#78716C;padding:5px 0;">Value</td><td style="color:#1C1917;font-weight:600;text-align:right;">GH&#8373;${params.amount}</td></tr>
        ${params.serialNumber ? `<tr><td style="color:#78716C;padding:5px 0;">Card Reference</td><td style="color:#1C1917;font-weight:600;text-align:right;font-family:monospace;">${params.serialNumber}</td></tr>` : ""}
        <tr><td style="color:#78716C;padding:5px 0;">Payment Ref</td><td style="color:#1C1917;font-weight:600;text-align:right;font-family:monospace;">${params.paymentRef}</td></tr>
      </table>
    </div>
    <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;padding:16px;margin-bottom:24px;">
      <p style="color:#92400E;font-size:13px;font-weight:600;margin:0 0 6px;">How to collect your card</p>
      <p style="color:#B45309;font-size:13px;margin:0;line-height:1.6;">
        Visit <strong>Zolara Beauty Studio, Sakasaka (Opposite CalBank, Tamale)</strong>. Show your name and this email or your payment reference at the front desk.
      </p>
    </div>
  </div>
  <div style="background:#F5EFE6;padding:20px 40px;text-align:center;">
    <div style="color:#78716C;font-size:12px;">0594365314 &middot; zolarasalon.com &middot; @zolarastudio</div>
  </div>
</div>
</body></html>`;

    const res = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: params.buyerEmail,
        subject: "Your Zolara " + params.tier + " Gift Card \u2014 Pickup Confirmed",
        html,
      }),
    });
    return res.ok;
  } catch (err: any) {
    console.error("sendPickupReceiptEmail error:", err.message);
    return false;
  }
}

// ── Purchase Receipt Email ────────────────────────────────────────────────────

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
  try {
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F5EFE6;font-family:Helvetica,Arial,sans-serif;">
<div style="max-width:560px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:#0F1E35;padding:32px 40px;text-align:center;">
    <div style="color:#B8975A;font-size:28px;font-weight:300;letter-spacing:4px;">ZOLARA</div>
    <div style="color:#9CA3AF;font-size:11px;letter-spacing:3px;margin-top:4px;">BEAUTY STUDIO</div>
  </div>
  <div style="padding:32px 40px;">
    <h2 style="color:#1C1917;font-size:22px;margin:0 0 8px;">Order Receipt</h2>
    <p style="color:#78716C;font-size:14px;margin:0 0 24px;">Hi ${params.buyerName}, thank you for your purchase!</p>
    <div style="background:#F5EFE6;border-radius:12px;padding:20px;margin-bottom:24px;">
      <table style="width:100%;font-size:14px;border-collapse:collapse;">
        <tr><td style="color:#78716C;padding:5px 0;">Product</td><td style="color:#1C1917;font-weight:600;text-align:right;">${params.tier} Gift Card</td></tr>
        <tr><td style="color:#78716C;padding:5px 0;">Value</td><td style="color:#1C1917;font-weight:600;text-align:right;">GH&#8373;${params.amount}</td></tr>
        <tr><td style="color:#78716C;padding:5px 0;">Delivery</td><td style="color:#1C1917;font-weight:600;text-align:right;">${params.isDigital ? "Email Delivery" : "Store Pickup"}</td></tr>
        ${params.recipientName ? `<tr><td style="color:#78716C;padding:5px 0;">For</td><td style="color:#1C1917;font-weight:600;text-align:right;">${params.recipientName}</td></tr>` : ""}
        <tr><td style="color:#78716C;padding:5px 0;">Payment Ref</td><td style="color:#1C1917;font-weight:600;text-align:right;font-family:monospace;">${params.paymentRef}</td></tr>
      </table>
    </div>
    <p style="color:#78716C;font-size:13px;line-height:1.7;">
      ${params.isDigital ? "The gift card has been sent to <strong>" + (params.recipientEmail || params.buyerEmail) + "</strong>." : "Your physical card is ready for pickup at our Sakasaka location."}
    </p>
  </div>
  <div style="background:#F5EFE6;padding:20px 40px;text-align:center;">
    <div style="color:#78716C;font-size:12px;">0594365314 &middot; zolarasalon.com &middot; @zolarastudio</div>
  </div>
</div>
</body></html>`;

    const res = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: params.buyerEmail,
        subject: "Zolara Gift Card \u2014 Order Receipt",
        html,
      }),
    });
    return res.ok;
  } catch (err: any) {
    console.error("sendPurchaseReceiptEmail error:", err.message);
    return false;
  }
}
