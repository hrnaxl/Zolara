import { useState } from "react";
import { Link } from "react-router-dom";
import { GIFT_CARD_TIERS, GiftCardTier, createDigitalPurchase } from "@/lib/giftCardEcommerce";
import { openPaystackPopup } from "@/lib/payment";
import { toast } from "sonner";

const G = "#B8975A";
const CREAM = "#FAFAF8";
const NAVY = "#0F1E35";
const TXT = "#1C1917";
const TXT_MID = "#78716C";
const BORDER = "#EDEBE5";

const TIER_STYLES: Record<GiftCardTier, { bg: string; accent: string; shine: string }> = {
  Silver:   { bg: "linear-gradient(135deg, #d4d4d4, #f5f5f5, #a8a8a8)", accent: "#9CA3AF", shine: "#e5e5e5" },
  Gold:     { bg: "linear-gradient(135deg, #B8975A, #F5D98A, #8C6A30)", accent: "#B8975A", shine: "#F5D98A" },
  Platinum: { bg: "linear-gradient(135deg, #4B5563, #9CA3AF, #374151)", accent: "#6B7280", shine: "#D1D5DB" },
  Diamond:  { bg: "linear-gradient(135deg, #312E81, #818CF8, #1E1B4B)", accent: "#6366F1", shine: "#C7D2FE" },
};

type Step = "select" | "details" | "confirm" | "done";

export default function BuyGiftCard() {
  const [step, setStep] = useState<Step>("select");
  const [selectedTier, setSelectedTier] = useState<GiftCardTier | null>(null);
  const [deliveryType, setDeliveryType] = useState<"email" | "physical">("email");
  const [form, setForm] = useState({
    buyerName: "", buyerEmail: "", buyerPhone: "",
    recipientName: "", recipientEmail: "", message: "",
  });
  const [loading, setLoading] = useState(false);

  const tierConfig = selectedTier ? GIFT_CARD_TIERS[selectedTier] : null;

  const handleProceed = () => {
    if (!form.buyerName || !form.buyerPhone) { toast.error("Enter your name and phone number"); return; }
    if (deliveryType === "email" && (!form.recipientName || !form.recipientEmail)) {
      toast.error("Enter the recipient's name and email"); return;
    }
    if (deliveryType === "email" && !form.buyerEmail) { toast.error("Enter your email address"); return; }
    setStep("confirm");
  };

  const handlePay = async () => {
    if (!selectedTier) return;
    setLoading(true);

    try {
      const isEmail = deliveryType === "email";
      const ref = `GC-${Date.now().toString(36).toUpperCase()}`;
      await openPaystackPopup({
        amount: GIFT_CARD_TIERS[selectedTier].value,
        email: form.buyerEmail || `${form.buyerPhone}@zolara.com`,
        reference: ref,
        metadata: {
          create_gift_card: true,
          tier: selectedTier,
          card_type: isEmail ? "digital" : "physical",
          buyer_name: form.buyerName,
          buyer_email: form.buyerEmail,
          buyer_phone: form.buyerPhone,
          recipient_name: isEmail ? form.recipientName : form.buyerName,
          recipient_email: isEmail ? form.recipientEmail : form.buyerEmail || "",
          message: form.message || (isEmail ? "" : "Physical card pickup"),
        },
        onSuccess: async () => {
          try {
            // Generate gift card code
            const code = `ZGC-${Math.random().toString(36).substring(2,8).toUpperCase()}`;
            const tierValue = GIFT_CARD_TIERS[selectedTier!].value;

            // Create gift card record in DB
            const { data: card, error } = await (await import("@/integrations/supabase/client")).supabase
              .from("gift_cards" as any)
              .insert({
                code,
                tier: selectedTier,
                amount: tierValue,
                balance: tierValue,
                status: isEmail ? "pending_send" : "active",
                payment_status: isEmail ? "pending_send" : "paid",
                card_type: isEmail ? "digital" : "physical",
                buyer_name: form.buyerName,
                buyer_email: form.buyerEmail || null,
                buyer_phone: form.buyerPhone,
                recipient_name: isEmail ? form.recipientName : form.buyerName,
                recipient_email: isEmail ? form.recipientEmail : null,
                message: form.message || null,
              })
              .select("id")
              .single();

            // If digital, trigger email immediately
            if (!error && card?.id && isEmail) {
              await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-gift-card-email`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
                    "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                  },
                  body: JSON.stringify({ card_id: card.id }),
                }
              ).catch(() => null);
            }
          } catch (e) {
            console.error("Gift card creation error:", e);
          }
          setStep("done");
          setLoading(false);
        },
        onClose: () => {
          setLoading(false);
          toast.error("Payment was cancelled.");
        },
      });
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: CREAM, fontFamily: "'Montserrat', sans-serif" }}>
      {/* Back to homepage */}
      <div style={{ position: "fixed", top: 16, left: 16, zIndex: 100 }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(15,30,53,0.85)", color: "white", textDecoration: "none", padding: "8px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, backdropFilter: "blur(8px)" }}>
          ← Back to Zolara
        </a>
      </div>
      {/* Header */}
      <div style={{ background: NAVY, padding: "20px 24px", display: "flex", alignItems: "center", gap: 12 }}>
        <Link to="/" style={{ color: "#9CA3AF", fontSize: 12, textDecoration: "none", display: "flex", alignItems: "center", gap: 6, marginRight: 16, whiteSpace: "nowrap" }}>
          ← Home
        </Link>
        <img src="/logo.png" alt="Zolara" style={{ height: 36 }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
        <div>
          <div style={{ color: G, fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600 }}>Zolara Beauty Studio</div>
          <div style={{ color: "#9CA3AF", fontSize: 11, letterSpacing: "0.1em" }}>GIFT CARDS</div>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "clamp(16px,4vw,40px) clamp(12px,4vw,20px)" }}>
        {/* Step: SELECT TIER */}
        {step === "select" && (
          <div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, color: NAVY, textAlign: "center", marginBottom: 8 }}>
              Give the Gift of Beauty
            </h1>
            <p style={{ textAlign: "center", color: TXT_MID, fontSize: 14, marginBottom: 36 }}>
              Valid for 12 months. Redeemable for any service at Zolara Beauty Studio.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 32 }} className="admin-grid-2">
              {(Object.keys(GIFT_CARD_TIERS) as GiftCardTier[]).map(tier => {
                const t = GIFT_CARD_TIERS[tier];
                const s = TIER_STYLES[tier];
                const selected = selectedTier === tier;
                return (
                  <div
                    key={tier}
                    onClick={() => setSelectedTier(tier)}
                    style={{
                      cursor: "pointer",
                      borderRadius: 16,
                      overflow: "hidden",
                      border: `2px solid ${selected ? s.accent : "transparent"}`,
                      boxShadow: selected ? `0 0 0 3px ${s.accent}33` : "0 2px 12px rgba(0,0,0,0.08)",
                      transition: "all 0.2s",
                    }}
                  >
                    {/* Card visual */}
                    <div style={{
                      background: s.bg,
                      padding: "24px 20px",
                      aspectRatio: "1.6/1",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      position: "relative",
                      overflow: "hidden",
                    }}>
                      <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
                      <div style={{ position: "absolute", bottom: -30, left: -10, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
                      <div style={{ fontFamily: "'Cormorant Garamond', serif", color: "white", fontSize: 13, letterSpacing: "0.15em", opacity: 0.9 }}>ZOLARA BEAUTY STUDIO</div>
                      <div>
                        <div style={{ color: s.shine, fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 700 }}>
                          GH₵ {t.value.toLocaleString()}
                        </div>
                        <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 11, letterSpacing: "0.2em", marginTop: 2 }}>{t.label.toUpperCase()}</div>
                      </div>
                    </div>
                    <div style={{ background: "white", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: TXT, fontWeight: 600, fontSize: 13 }}>{t.label}</span>
                      <span style={{ color: TXT_MID, fontSize: 12 }}>GH₵ {t.value.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedTier && (
              <div>
                {/* Delivery type */}
                <div style={{ background: "white", borderRadius: 12, padding: 20, border: `1px solid ${BORDER}`, marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: TXT, marginBottom: 12 }}>Delivery Method</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }} className="admin-grid-2">
                    {(["email", "physical"] as const).map(type => (
                      <div
                        key={type}
                        onClick={() => setDeliveryType(type)}
                        style={{
                          padding: "14px 16px",
                          borderRadius: 10,
                          border: `2px solid ${deliveryType === type ? G : BORDER}`,
                          cursor: "pointer",
                          background: deliveryType === type ? "#FDF8EE" : "white",
                          transition: "all 0.15s",
                        }}
                      >
                        <div style={{ fontSize: 18, marginBottom: 4 }}>{type === "email" ? "✉️" : "🏪"}</div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: TXT }}>
                          {type === "email" ? "Send by Email" : "Pick Up In Store"}
                        </div>
                        <div style={{ fontSize: 11, color: TXT_MID, marginTop: 2 }}>
                          {type === "email" ? "Instant digital delivery" : "Physical card at Zolara"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setStep("details")}
                  style={{ width: "100%", background: G, color: "white", border: "none", borderRadius: 12, padding: "16px", fontSize: 15, fontWeight: 600, cursor: "pointer", letterSpacing: "0.05em" }}
                >
                  Continue →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step: DETAILS */}
        {step === "details" && selectedTier && (
          <div>
            <button onClick={() => setStep("select")} style={{ background: "none", border: "none", color: G, cursor: "pointer", fontSize: 13, marginBottom: 20 }}>
              ← Back
            </button>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, color: NAVY, marginBottom: 24 }}>Your Details</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="Your Name" value={form.buyerName} onChange={v => setForm(p => ({ ...p, buyerName: v }))} placeholder="Full name" />
              <Field label="Your Phone Number" value={form.buyerPhone} onChange={v => setForm(p => ({ ...p, buyerPhone: v }))} placeholder="0XX XXX XXXX" type="tel" />
              {deliveryType === "email" && (
                <Field label="Your Email" value={form.buyerEmail} onChange={v => setForm(p => ({ ...p, buyerEmail: v }))} placeholder="your@email.com" type="email" />
              )}

              {deliveryType === "email" && (
                <>
                  <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 14, marginTop: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: TXT, marginBottom: 12 }}>Recipient Details</div>
                  </div>
                  <Field label="Recipient Name" value={form.recipientName} onChange={v => setForm(p => ({ ...p, recipientName: v }))} placeholder="Who is this for?" />
                  <Field label="Recipient Email" value={form.recipientEmail} onChange={v => setForm(p => ({ ...p, recipientEmail: v }))} placeholder="recipient@email.com" type="email" />
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: TXT_MID, display: "block", marginBottom: 6, letterSpacing: "0.06em" }}>
                      PERSONAL MESSAGE (OPTIONAL)
                    </label>
                    <textarea
                      value={form.message}
                      onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                      placeholder="Add a personal message..."
                      rows={3}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                </>
              )}
            </div>

            <button
              onClick={handleProceed}
              style={{ width: "100%", background: G, color: "white", border: "none", borderRadius: 12, padding: "16px", fontSize: 15, fontWeight: 600, cursor: "pointer", marginTop: 24 }}
            >
              Review Order →
            </button>
          </div>
        )}

        {/* Step: CONFIRM */}
        {step === "confirm" && selectedTier && tierConfig && (
          <div>
            <button onClick={() => setStep("details")} style={{ background: "none", border: "none", color: G, cursor: "pointer", fontSize: 13, marginBottom: 20 }}>
              ← Back
            </button>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, color: NAVY, marginBottom: 24 }}>Review Your Order</h2>

            <div style={{ background: "white", borderRadius: 16, border: `1px solid ${BORDER}`, overflow: "hidden", marginBottom: 20 }}>
              {/* Card preview */}
              <div style={{ background: TIER_STYLES[selectedTier].bg, padding: "28px 24px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
                <div style={{ fontFamily: "'Cormorant Garamond', serif", color: "white", fontSize: 12, letterSpacing: "0.15em", marginBottom: 16, opacity: 0.9 }}>ZOLARA BEAUTY STUDIO</div>
                <div style={{ color: TIER_STYLES[selectedTier].shine, fontFamily: "'Cormorant Garamond', serif", fontSize: 34, fontWeight: 700 }}>
                  GH₵ {tierConfig.value.toLocaleString()}
                </div>
                <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, letterSpacing: "0.2em", marginTop: 4 }}>{tierConfig.label.toUpperCase()} GIFT CARD</div>
              </div>

              <div style={{ padding: "20px 24px" }}>
                <Row label="Card Value" value={`GH₵ ${tierConfig.value.toLocaleString()}`} />
                <Row label="Delivery" value={deliveryType === "email" ? `Email to ${form.recipientEmail}` : "Pick up at Zolara, Sakasaka"} />
                {deliveryType === "email" && <Row label="Recipient" value={form.recipientName} />}
                <Row label="From" value={form.buyerName} />
                <Row label="Phone" value={form.buyerPhone} />
                <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: 16, paddingTop: 16, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700, fontSize: 16, color: TXT }}>Total</span>
                  <span style={{ fontWeight: 700, fontSize: 18, color: G }}>GH₵ {tierConfig.value.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div style={{ background: "#FDF8EE", borderRadius: 10, padding: "12px 16px", fontSize: 12, color: TXT_MID, marginBottom: 20, border: `1px solid #F5ECD6` }}>
              {deliveryType === "email"
                ? `Your gift card will be sent to ${form.recipientEmail} within 10 minutes of payment confirmation.`
                : "Please visit Zolara Beauty Studio in Sakasaka, Opposite CalBank, to pick up your physical gift card. Show your name and phone number."}
            </div>

            <button
              onClick={handlePay}
              disabled={loading}
              style={{
                width: "100%", background: loading ? "#D1C4A8" : G, color: "white",
                border: "none", borderRadius: 12, padding: "16px", fontSize: 15,
                fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Processing..." : `Pay GH₵ ${tierConfig.value.toLocaleString()} via Paystack`}
            </button>
            <p style={{ textAlign: "center", fontSize: 11, color: TXT_MID, marginTop: 10 }}>
              Secured by Paystack. Card, Mobile Money, and Bank Transfer accepted.
            </p>
          </div>
        )}

        {/* Step: DONE */}
        {step === "done" && selectedTier && tierConfig && (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎁</div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, color: NAVY, marginBottom: 12 }}>Order Received</h2>
            {deliveryType === "email" ? (
              <>
                <p style={{ color: TXT_MID, fontSize: 14, lineHeight: 1.7, marginBottom: 8 }}>
                  Your <strong>{tierConfig.label} Gift Card</strong> order has been placed.
                </p>
                <p style={{ color: TXT_MID, fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
                  Once payment is confirmed, the gift card will be emailed to <strong>{form.recipientEmail}</strong> within 10 minutes.
                </p>
                <p style={{ color: TXT_MID, fontSize: 13 }}>
                  Questions? Call us on <strong>0594365314</strong> or <strong>020 884 8707</strong>
                </p>
              </>
            ) : (
              <>
                <p style={{ color: TXT_MID, fontSize: 14, lineHeight: 1.7, marginBottom: 8 }}>
                  Your <strong>{tierConfig.label} Gift Card</strong> is ready for pickup.
                </p>
                <p style={{ color: TXT_MID, fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
                  Visit us at <strong>Sakasaka, Opposite CalBank, Tamale</strong>.<br />
                  Show your name (<strong>{form.buyerName}</strong>) and phone number at the front desk.
                </p>
              </>
            )}
            <a href="/" style={{ color: G, fontSize: 13, textDecoration: "none" }}>← Back to Zolara</a>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: TXT_MID, display: "block", marginBottom: 6, letterSpacing: "0.06em" }}>
        {label.toUpperCase()}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${BORDER}` }}>
      <span style={{ color: TXT_MID, fontSize: 13 }}>{label}</span>
      <span style={{ color: TXT, fontSize: 13, fontWeight: 500, maxWidth: "60%", textAlign: "right" }}>{value}</span>
    </div>
  );
}
