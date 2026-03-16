const COLORS: Record<string,string> = { Bronze:"#CD7F32", Silver:"#9CA3AF", Gold:"#B8975A", Platinum:"#6B7280", Diamond:"#6366F1" };
const GRACE: Record<string,number>  = { Bronze:0, Silver:15, Gold:15, Platinum:15, Diamond:50 };

function gcHtml(p: { tier:string; amount:number; code:string; recipient_name?:string; buyer_name?:string; message?:string }) {
  const col = COLORS[p.tier] || "#B8975A";
  const grace = GRACE[p.tier] || 0;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#F5EFE6;font-family:Helvetica,Arial,sans-serif;">
<div style="max-width:560px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
<div style="background:#0F1E35;padding:32px 40px;text-align:center;"><div style="color:#B8975A;font-size:28px;font-weight:300;letter-spacing:4px;">ZOLARA</div><div style="color:#9CA3AF;font-size:11px;letter-spacing:3px;margin-top:4px;">BEAUTY STUDIO</div></div>
<div style="padding:32px 40px;">
<div style="background:${col};border-radius:12px;padding:28px;margin-bottom:24px;text-align:center;">
<div style="color:rgba(255,255,255,.8);font-size:10px;letter-spacing:3px;margin-bottom:12px;">ZOLARA BEAUTY STUDIO</div>
<div style="color:white;font-size:40px;font-weight:700;">GH&#8373; ${p.amount.toLocaleString()}</div>
<div style="color:rgba(255,255,255,.8);font-size:11px;letter-spacing:4px;margin-top:8px;">${p.tier.toUpperCase()} GIFT CARD</div></div>
<p style="color:#1C1917;font-size:16px;margin:0 0 12px;">Hello ${p.recipient_name || "there"},</p>
<p style="color:#78716C;font-size:14px;line-height:1.7;margin:0 0 24px;">You have received a Zolara Beauty Studio gift card worth <strong>GH&#8373; ${p.amount.toLocaleString()}</strong>${p.buyer_name ? " from <strong>"+p.buyer_name+"</strong>" : ""}.${p.message ? "<br><br><em>&ldquo;"+p.message+"&rdquo;</em>" : ""}</p>
<div style="background:#FAFAF8;border:2px dashed #B8975A;border-radius:12px;padding:24px;text-align:center;margin-bottom:20px;">
<div style="font-size:11px;color:#78716C;letter-spacing:2px;margin-bottom:10px;">YOUR GIFT CARD CODE</div>
<div style="font-size:30px;font-weight:700;color:#0F1E35;letter-spacing:5px;font-family:monospace;">${p.code}</div>
<div style="font-size:11px;color:#A8A29E;margin-top:10px;">Present this code at checkout</div></div>
<div style="font-size:12px;color:#A8A29E;line-height:1.7;margin-bottom:24px;">Valid for 12 months. Redeemable for any service at Zolara Beauty Studio.${grace>0?" If your service total exceeds the card value by up to GH&#8373;"+grace+", the difference is covered.":""}</div>
<div style="text-align:center;margin-bottom:32px;"><a href="https://zolarasalon.com/book" style="background:#B8975A;color:white;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block;">Book Your Appointment</a></div></div>
<div style="background:#F5EFE6;padding:20px 40px;text-align:center;"><div style="color:#78716C;font-size:12px;">Sakasaka, Opposite CalBank, Tamale</div><div style="color:#A8A29E;font-size:11px;margin-top:4px;">0594365314 &middot; zolarasalon.com &middot; @zolarastudio</div></div></div></body></html>`;
}

async function sendEmail(to: string, subject: string, html: string): Promise<{ok: boolean; error?: string}> {
  try {
    const r = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, html }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: (d as any).error || "HTTP " + r.status };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export async function sendGiftCardEmail(p: {
  id: string; tier: string; amount: number; code: string;
  recipient_name?: string; recipient_email: string; buyer_name?: string; message?: string;
}): Promise<boolean> {
  const { ok, error } = await sendEmail(
    p.recipient_email,
    "Your Zolara " + p.tier + " Gift Card \u2014 GH\u20B5" + p.amount,
    gcHtml(p)
  );
  if (!ok) console.error("sendGiftCardEmail failed:", error);
  return ok;
}

export async function sendPickupReceiptEmail(p: {
  buyerName: string; buyerEmail: string; tier: string; amount: number;
  cardCode: string; serialNumber?: string; paymentRef: string;
}): Promise<boolean> {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#F5EFE6;font-family:Helvetica,Arial,sans-serif;">
<div style="max-width:560px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
<div style="background:#0F1E35;padding:32px 40px;text-align:center;"><div style="color:#B8975A;font-size:28px;font-weight:300;letter-spacing:4px;">ZOLARA</div><div style="color:#9CA3AF;font-size:11px;letter-spacing:3px;">BEAUTY STUDIO</div></div>
<div style="padding:32px 40px;">
<h2 style="color:#1C1917;font-size:22px;margin:0 0 8px;">Pickup Confirmed &#10003;</h2>
<p style="color:#78716C;font-size:14px;line-height:1.7;margin:0 0 24px;">Hi ${p.buyerName}, your <strong>${p.tier} Gift Card (GH&#8373;${p.amount})</strong> is ready for pickup.</p>
<div style="background:#F5EFE6;border-radius:12px;padding:20px;margin-bottom:20px;">
<table style="width:100%;font-size:14px;border-collapse:collapse;">
<tr><td style="color:#78716C;padding:5px 0;">Card Tier</td><td style="color:#1C1917;font-weight:600;text-align:right;">${p.tier}</td></tr>
<tr><td style="color:#78716C;padding:5px 0;">Value</td><td style="color:#1C1917;font-weight:600;text-align:right;">GH&#8373;${p.amount}</td></tr>
${p.serialNumber ? `<tr><td style="color:#78716C;padding:5px 0;">Card Ref</td><td style="color:#1C1917;font-weight:600;text-align:right;font-family:monospace;">${p.serialNumber}</td></tr>` : ""}
<tr><td style="color:#78716C;padding:5px 0;">Payment Ref</td><td style="color:#1C1917;font-weight:600;text-align:right;font-family:monospace;">${p.paymentRef}</td></tr>
</table></div>
<div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;padding:16px;"><p style="color:#92400E;font-size:13px;font-weight:600;margin:0 0 4px;">How to collect</p><p style="color:#B45309;font-size:13px;margin:0;line-height:1.6;">Visit <strong>Zolara Beauty Studio, Sakasaka (Opposite CalBank, Tamale)</strong>. Show this email or your payment reference.</p></div>
</div><div style="background:#F5EFE6;padding:20px 40px;text-align:center;"><div style="color:#78716C;font-size:12px;">0594365314 &middot; zolarasalon.com</div></div></div></body></html>`;
  const { ok } = await sendEmail(p.buyerEmail, "Your Zolara " + p.tier + " Gift Card \u2014 Pickup Confirmed", html);
  return ok;
}

export async function sendPurchaseReceiptEmail(p: {
  buyerName: string; buyerEmail: string; tier: string; amount: number;
  cardCode: string; paymentRef: string; isDigital: boolean; recipientName?: string; recipientEmail?: string;
}): Promise<boolean> {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#F5EFE6;font-family:Helvetica,Arial,sans-serif;">
<div style="max-width:560px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
<div style="background:#0F1E35;padding:32px 40px;text-align:center;"><div style="color:#B8975A;font-size:28px;font-weight:300;letter-spacing:4px;">ZOLARA</div><div style="color:#9CA3AF;font-size:11px;letter-spacing:3px;">BEAUTY STUDIO</div></div>
<div style="padding:32px 40px;">
<h2 style="color:#1C1917;font-size:22px;margin:0 0 8px;">Order Receipt</h2>
<p style="color:#78716C;font-size:14px;margin:0 0 24px;">Hi ${p.buyerName}, thank you for your purchase!</p>
<div style="background:#F5EFE6;border-radius:12px;padding:20px;margin-bottom:20px;">
<table style="width:100%;font-size:14px;border-collapse:collapse;">
<tr><td style="color:#78716C;padding:5px 0;">Product</td><td style="color:#1C1917;font-weight:600;text-align:right;">${p.tier} Gift Card</td></tr>
<tr><td style="color:#78716C;padding:5px 0;">Value</td><td style="color:#1C1917;font-weight:600;text-align:right;">GH&#8373;${p.amount}</td></tr>
<tr><td style="color:#78716C;padding:5px 0;">Delivery</td><td style="color:#1C1917;font-weight:600;text-align:right;">${p.isDigital ? "Email Delivery" : "Store Pickup"}</td></tr>
${p.recipientName ? `<tr><td style="color:#78716C;padding:5px 0;">For</td><td style="color:#1C1917;font-weight:600;text-align:right;">${p.recipientName}</td></tr>` : ""}
<tr><td style="color:#78716C;padding:5px 0;">Payment Ref</td><td style="color:#1C1917;font-weight:600;text-align:right;font-family:monospace;">${p.paymentRef}</td></tr>
</table></div>
<p style="color:#78716C;font-size:13px;line-height:1.7;">${p.isDigital ? "The gift card has been sent to <strong>"+(p.recipientEmail||p.buyerEmail)+"</strong>." : "Your physical card is ready for pickup at our Sakasaka location."}</p>
</div><div style="background:#F5EFE6;padding:20px 40px;text-align:center;"><div style="color:#78716C;font-size:12px;">0594365314 &middot; zolarasalon.com</div></div></div></body></html>`;
  const { ok } = await sendEmail(p.buyerEmail, "Zolara Gift Card \u2014 Order Receipt", html);
  return ok;
}
