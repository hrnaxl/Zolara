import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { GIFT_CARD_TIERS, GiftCardTier, createDigitalPurchase } from "@/lib/giftCardEcommerce";
import { supabase } from "@/integrations/supabase/client";
import { sendGiftCardEmail, sendPickupReceiptEmail, sendPurchaseReceiptEmail } from "@/lib/email";
import { openPaystackPopup } from "@/lib/payment";
import { toast } from "sonner";
import { track } from "@/lib/posthog";
import { sanitizeName, sanitizePhone, sanitizeEmail, sanitizeNotes } from "@/lib/sanitize";

const G = "#C8A97E";
const G_DARK = "#8B6914";
const OBSIDIAN = "#0A0905";
const CHARCOAL = "#111008";
const CREAM = "#FAFAF8";
const NAVY = "#0F1E35";
const TXT = "#1C160E";
const TXT_MID = "#78716C";
const BORDER = "#EDEBE5";

const TIER_STYLES: Record<GiftCardTier, {
  gradient: string; glow: string; chip: string; desc: string; anim: string;
}> = {
  Silver:   { gradient: "linear-gradient(145deg,#6B6B6B,#B8B8B8,#555)", glow: "rgba(180,180,180,0.15)", chip: "#9CA3AF", desc: "A perfect treat. Covers a wash, nail set or lashes.", anim: "gcFloat 5s ease-in-out infinite" },
  Gold:     { gradient: "linear-gradient(145deg,#6B4E0A,#C8A97E,#8B6914)", glow: "rgba(200,169,126,0.2)", chip: "#C8A97E", desc: "A full pampering session. Braids, manicure and more.", anim: "gcFloat2 5.5s ease-in-out infinite 0.4s" },
  Platinum: { gradient: "linear-gradient(145deg,#2D3A45,#6B8090,#1E2830)", glow: "rgba(107,128,144,0.15)", chip: "#94A3B8", desc: "Premium luxury. A full day of indulgence.", anim: "gcFloat 6s ease-in-out infinite 0.2s" },
  Diamond:  { gradient: "linear-gradient(145deg,#1a1660,#5B54C8,#12104A)", glow: "rgba(99,102,241,0.25)", chip: "#818CF8", desc: "The ultimate gift. Use across 3 visits. Balance carries forward.", anim: "gcFloat3 4.5s ease-in-out infinite 0.6s" },
};

const PROMO_GRADS: Record<string, string> = {
  valentines: "linear-gradient(135deg,#9F1239,#E11D48,#FB7185)",
  christmas: "linear-gradient(135deg,#14532D,#16A34A,#DC2626)",
  eid: "linear-gradient(135deg,#1E3A5F,#2563EB,#60A5FA)",
  birthday: "linear-gradient(135deg,#7C2D8A,#A855F7,#F0ABFC)",
  mothers: "linear-gradient(135deg,#9D174D,#EC4899,#FBCFE8)",
  graduation: "linear-gradient(135deg,#1E3A5F,#B8975A,#D4AF6A)",
  gold: "linear-gradient(135deg,#6B4E0A,#C8A97E,#D4AF6A)",
  custom: "linear-gradient(135deg,#1C160E,#3A2D1A,#C8A97E)",
};

const LOGO_URL = "https://ekvjnydomfresnkealpb.supabase.co/storage/v1/object/public/avatars/logo_1764609621458.jpg";

function GiftCard({
  gradient, glow, chip, desc, label, amount, selected, promo = false, promoDesc,
}: {
  gradient: string; glow: string; chip: string; desc: string;
  label: string; amount: number; selected: boolean; promo?: boolean; promoDesc?: string;
}) {
  return (
    <div style={{
      position: "relative", overflow: "hidden", borderRadius: 14,
      padding: "28px 24px",
      background: gradient,
      boxShadow: selected
        ? `0 28px 60px ${glow.replace('0.', '0.4').replace('rgba', 'rgba')}, 0 0 0 2.5px rgba(255,255,255,0.25)`
        : `0 20px 48px ${glow}, 0 2px 8px rgba(0,0,0,0.4)`,
      transform: selected ? "translateY(-8px) scale(1.02)" : "none",
      transition: "transform 0.3s ease, box-shadow 0.3s ease",
      cursor: "pointer",
    }}>
      {/* Gloss overlay — same as landing page ::after */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,rgba(255,255,255,0.06) 0%,transparent 60%)", pointerEvents: "none" }} />
      {/* Decorative circles */}
      <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.06)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -12, left: -12, width: 50, height: 50, borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />

      {/* Top row: tier chip + logo */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, position: "relative" }}>
        <div>
          <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 8, letterSpacing: "0.22em", color: "rgba(255,255,255,0.5)", marginBottom: 8, fontWeight: 600 }}>
            {promo ? "SPECIAL EDITION" : "ZOLARA"}
          </div>
          <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", padding: "4px 10px", borderRadius: 20, display: "inline-block", background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.85)", border: `1px solid ${chip}44` }}>
            {label.toUpperCase()}
          </div>
        </div>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.3)", overflow: "hidden", background: "#fff", flexShrink: 0 }}>
          <img src={LOGO_URL} alt="Zolara" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      </div>

      {/* Amount */}
      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(28px,3vw,38px)", fontWeight: 300, color: "white", lineHeight: 1, marginBottom: 14, letterSpacing: "-0.01em" }}>
        GH₵ {amount.toLocaleString()}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.12)", marginBottom: 14 }} />

      {/* Description */}
      <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 12, color: "rgba(255,255,255,0.62)", lineHeight: 1.65, fontWeight: 400, margin: 0 }}>
        {promoDesc || desc}
      </p>
    </div>
  );
}


type Step = "select" | "details" | "confirm" | "done";

export default function BuyGiftCard() {
  const [step, setStep] = useState<Step>("select");
  const [selectedTier, setSelectedTier] = useState<GiftCardTier | null>(null);
  const [deliveryType, setDeliveryType] = useState<"email" | "physical">("email");
  const [tierPrices, setTierPrices] = useState<Record<string,number>>({});
  const [pricesLoaded, setPricesLoaded] = useState(false);
  const [promoTypes, setPromoTypes] = useState<any[]>([]);
  const [selectedPromo, setSelectedPromo] = useState<any | null>(null);
  const [form, setForm] = useState({
    buyerName: "", buyerEmail: "", buyerPhone: "",
    recipientName: "", recipientEmail: "", message: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (supabase as any).from("settings").select("gift_card_prices").limit(1).maybeSingle()
      .then(({ data, error }: any) => {
        if (!error && data?.gift_card_prices) {
          const prices: Record<string,number> = {};
          for (const [k, v] of Object.entries(data.gift_card_prices as Record<string,any>)) {
            prices[k] = Number(v);
          }
          setTierPrices(prices);
        }
        setPricesLoaded(true);
      })
      .catch(() => setPricesLoaded(true));
    (supabase as any).from("promo_gift_card_types").select("*").eq("is_active", true)
      .then(({ data }: any) => {
        const now = new Date();
        setPromoTypes((data || []).filter((p: any) => {
          if (p.expires_at && new Date(p.expires_at) < now) return false;
          if (p.max_uses && p.uses_count >= p.max_uses) return false;
          return true;
        }));
      });
  }, []);

  const getTierValue = (tier: string) => {
    if (pricesLoaded && tierPrices[tier] !== undefined) return tierPrices[tier];
    return GIFT_CARD_TIERS[tier as keyof typeof GIFT_CARD_TIERS]?.value ?? 0;
  };
  const getPromoValue = (pt: any) => pt.amount;
  const tierConfig = selectedTier ? GIFT_CARD_TIERS[selectedTier] : null;

  const handleProceed = () => {
    setForm(f => ({
      ...f,
      buyerName: sanitizeName(f.buyerName),
      buyerPhone: sanitizePhone(f.buyerPhone),
      buyerEmail: sanitizeEmail(f.buyerEmail),
      recipientName: sanitizeName(f.recipientName),
      recipientEmail: sanitizeEmail(f.recipientEmail),
      message: sanitizeNotes(f.message),
    }));
    if (!form.buyerName || !form.buyerPhone) { toast.error("Enter your name and phone number"); return; }
    if (!form.buyerEmail) { toast.error("Enter your email address — we'll send you a purchase receipt"); return; }
    if (deliveryType === "email" && (!form.recipientName || !form.recipientEmail)) {
      toast.error("Enter the recipient's name and email"); return;
    }
    setStep("confirm");
  };

  const handlePay = async () => {
    if (!selectedTier && !selectedPromo) return;
    setLoading(true);
    try {
      const isEmail = deliveryType === "email";
      const ref = `GC-${Date.now().toString(36).toUpperCase()}`;
      await openPaystackPopup({
        amount: selectedPromo ? getPromoValue(selectedPromo) : getTierValue(selectedTier!),
        email: form.buyerEmail || `${form.buyerPhone}@zolara.com`,
        reference: ref,
        metadata: {
          create_gift_card: true,
          tier: selectedPromo ? "Gold" : selectedTier,
          promo_type_id: selectedPromo?.id || null,
          card_type: selectedPromo ? "physical" : (isEmail ? "digital" : "physical"),
          buyer_name: form.buyerName,
          buyer_email: form.buyerEmail,
          buyer_phone: form.buyerPhone,
          recipient_name: isEmail ? form.recipientName : form.buyerName,
          recipient_email: isEmail ? form.recipientEmail : form.buyerEmail || "",
          message: form.message || (isEmail ? "" : "Physical card pickup"),
        },
        onSuccess: async (paymentRef: string) => {
          try {
            const tierValue = selectedPromo ? getPromoValue(selectedPromo) : getTierValue(selectedTier!);
            if (isEmail && !selectedPromo) {
              const r = await fetch("/api/create-gift-card", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tier: selectedTier, buyerName: form.buyerName, buyerEmail: form.buyerEmail, buyerPhone: form.buyerPhone, recipientName: form.recipientName || form.buyerName, recipientEmail: form.recipientEmail || form.buyerEmail, message: form.message || null }),
              });
              const d = await r.json().catch(() => ({}));
              if (r.ok && d.card) {
                const emailTo = form.recipientEmail || form.buyerEmail;
                if (emailTo) sendGiftCardEmail({ id: d.card.id, tier: selectedTier!, amount: tierValue, code: d.card.code, recipient_name: form.recipientName || form.buyerName, recipient_email: emailTo, buyer_name: form.buyerName, message: form.message || undefined }).catch(console.error);
                if (form.buyerEmail) sendPurchaseReceiptEmail({ buyerName: form.buyerName, buyerEmail: form.buyerEmail, tier: selectedTier!, amount: tierValue, cardCode: d.card.code, paymentRef: paymentRef || "", isDigital: true, recipientName: form.recipientName || form.buyerName, recipientEmail: form.recipientEmail || form.buyerEmail }).catch(console.error);
              }
            } else {
              const r = await fetch("/api/claim-gift-card", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  tier: selectedPromo ? "promo" : selectedTier,
                  promoTypeId: selectedPromo?.id || null,
                  buyerName: form.buyerName,
                  buyerEmail: form.buyerEmail,
                  buyerPhone: form.buyerPhone,
                  paymentRef,
                }),
              });
              const d = await r.json().catch(() => ({}));
              if (form.buyerEmail && d.card) sendPickupReceiptEmail({ buyerName: form.buyerName, buyerEmail: form.buyerEmail, tier: selectedTier!, amount: tierValue, cardCode: d.card.code || "", serialNumber: d.card.serial_number || undefined, paymentRef: paymentRef || "" }).catch(console.error);
            }
          } catch (e: any) { console.error("GC onSuccess:", e.message); }
          track("gift_card_purchased", { tier: selectedTier || "promo", delivery: deliveryType });
          setStep("done"); setLoading(false);
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
    <div style={{ minHeight: "100vh", background: "#0F1923", fontFamily: "'Montserrat', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes gcFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes gcFloat2 { 0%,100%{transform:translateY(0) rotate(1.5deg)} 50%{transform:translateY(-6px) rotate(1.5deg)} }
        @keyframes gcFloat3 { 0%,100%{transform:translateY(0) rotate(-0.5deg)} 50%{transform:translateY(-10px) rotate(-0.5deg)} }
        @keyframes shimmer { 0%,100% { opacity:0.5; } 50% { opacity:1; } }
        .gc-card-wrap { animation: fadeUp 0.4s ease both; }
        .gc-card-wrap:nth-child(1) { animation-delay: 0.05s; }
        .gc-card-wrap:nth-child(2) { animation-delay: 0.1s; }
        .gc-card-wrap:nth-child(3) { animation-delay: 0.15s; }
        .gc-card-wrap:nth-child(4) { animation-delay: 0.2s; }
        .gc-btn { transition: all 0.2s; }
        .gc-btn:hover { opacity: 0.88; transform: translateY(-1px); }
        .gc-btn:active { transform: translateY(0); }
        .gc-input { background: rgba(255,255,255,0.06); border: 1.5px solid rgba(255,255,255,0.12); border-radius: 10px; padding: 12px 14px; font-size: 14px; color: #F5EFE6; outline: none; width: 100%; box-sizing: border-box; font-family: Montserrat,sans-serif; transition: border-color 0.15s; }
        .gc-input::placeholder { color: rgba(255,255,255,0.3); }
        .gc-input:focus { border-color: #C8A97E; }
        .gc-label { font-size: 10px; font-weight: 700; letter-spacing: 0.14em; color: rgba(255,255,255,0.45); display: block; margin-bottom: 7px; }
      `}</style>

      {/* Header */}
      <div style={{ padding: "20px 24px", display: "flex", alignItems: "center", gap: 14, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <Link to={typeof window !== "undefined" && localStorage.getItem("zolara_client_token") ? "/app/client/dashboard" : "/"} style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, textDecoration: "none", display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
          ← Home
        </Link>
        <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)" }} />
        <div style={{ fontFamily: "'Cormorant Garamond', serif", color: "#C8A97E", fontSize: 20, fontWeight: 600 }}>Zolara Beauty Studio</div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.18em", marginLeft: 4 }}>GIFT CARDS</div>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "clamp(24px,4vw,48px) clamp(16px,4vw,24px)" }}>

        {/* STEP: SELECT */}
        {step === "select" && (
          <div style={{ animation: "fadeUp 0.35s ease" }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", color: "#C8A97E", marginBottom: 12 }}>✦ GIFT OF LUXURY ✦</div>
              <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(30px,6vw,48px)", fontWeight: 300, color: "#F5EFE6", margin: "0 0 12px", lineHeight: 1.1 }}>
                Give the Gift of<br /><em style={{ fontStyle: "italic", color: "#C8A97E" }}>Beauty</em>
              </h1>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, lineHeight: 1.7, maxWidth: 380, margin: "0 auto" }}>
                Valid for 12 months. Redeemable for any service at Zolara Beauty Studio, Tamale.
              </p>
            </div>

            {/* Promo cards */}
            {promoTypes.length > 0 && (
              <div style={{ marginBottom: 36 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                  <div style={{ flex: 1, height: 1, background: "rgba(200,169,126,0.2)" }} />
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.22em", color: "#C8A97E" }}>SPECIAL EDITIONS</span>
                  <div style={{ flex: 1, height: 1, background: "rgba(200,169,126,0.2)" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14 }}>
                  {promoTypes.map((pt: any) => {
                    const sel = selectedPromo?.id === pt.id;
                    const grad = PROMO_GRADS[pt.theme] || PROMO_GRADS.gold;
                    return (
                      <div key={pt.id} className="gc-card-wrap"
                        onClick={() => { setSelectedPromo(sel ? null : pt); setSelectedTier(null); setDeliveryType("physical"); }}>
                        <GiftCard
                          gradient={grad} glow="rgba(0,0,0,0.2)" chip="rgba(255,255,255,0.7)"
                          desc={pt.description || "A special gift for a special occasion."}
                          label={pt.name} amount={pt.amount} selected={sel} promo promoDesc={pt.description}
                        />
                        <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 2px" }}>
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>{pt.name}</span>
                          <span style={{ fontSize: 9, fontWeight: 700, color: "#C8A97E", background: "rgba(200,169,126,0.12)", padding: "3px 8px", borderRadius: 8, letterSpacing: "0.06em" }}>🏪 PICKUP</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Standard tiers */}
            {promoTypes.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.22em", color: "rgba(255,255,255,0.3)" }}>STANDARD GIFT CARDS</span>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
              </div>
            )}

            <div key={`tiers-${JSON.stringify(tierPrices)}`} style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16, marginBottom: 36 }}>
              {(Object.keys(GIFT_CARD_TIERS) as GiftCardTier[]).map(tier => {
                const s = TIER_STYLES[tier];
                const val = getTierValue(tier);
                const selected = selectedTier === tier;
                return (
                  <div key={tier} className="gc-card-wrap"
                    onClick={() => { setSelectedTier(tier); setSelectedPromo(null); setDeliveryType("email"); }}>
                    <GiftCard
                      gradient={s.gradient} glow={s.glow} chip={s.chip} desc={s.desc}
                      label={GIFT_CARD_TIERS[tier].label} amount={val} selected={selected}
                    />
                    <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 2px" }}>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>{GIFT_CARD_TIERS[tier].label}</span>
                      <span style={{ fontSize: 12, color: "#C8A97E", fontWeight: 700 }}>GH₵ {val.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {(selectedTier || selectedPromo) && (
              <div style={{ animation: "fadeUp 0.25s ease" }}>
                {selectedPromo ? (
                  <div style={{ background: "rgba(200,169,126,0.08)", borderRadius: 12, padding: "14px 18px", border: "1px solid rgba(200,169,126,0.2)", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 22 }}>🏪</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#F5EFE6" }}>Pick Up In Store Only</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>Promotional gift cards are physical cards. Collect at Zolara Beauty Studio, Sakasaka.</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 18, border: "1px solid rgba(255,255,255,0.08)", marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>DELIVERY METHOD</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      {(["email", "physical"] as const).map(type => (
                        <div key={type} onClick={() => setDeliveryType(type)}
                          style={{ padding: "14px 16px", borderRadius: 10, border: `1.5px solid ${deliveryType === type ? "#C8A97E" : "rgba(255,255,255,0.1)"}`, cursor: "pointer", background: deliveryType === type ? "rgba(200,169,126,0.08)" : "transparent", transition: "all 0.15s" }}>
                          <div style={{ fontSize: 18, marginBottom: 6 }}>{type === "email" ? "✉️" : "🏪"}</div>
                          <div style={{ fontWeight: 600, fontSize: 12, color: deliveryType === type ? "#C8A97E" : "#F5EFE6" }}>{type === "email" ? "Send by Email" : "Pick Up In Store"}</div>
                          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>{type === "email" ? "Instant digital delivery" : "Physical card at Zolara"}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <button className="gc-btn"
                  onClick={() => setStep("details")}
                  style={{ width: "100%", background: "linear-gradient(135deg,#8B6914,#C8A97E)", color: "white", border: "none", borderRadius: 12, padding: "16px", fontSize: 14, fontWeight: 700, cursor: "pointer", letterSpacing: "0.08em" }}>
                  CONTINUE →
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP: DETAILS */}
        {step === "details" && (selectedTier || selectedPromo) && (
          <div style={{ animation: "fadeUp 0.3s ease" }}>
            <button onClick={() => setStep("select")} style={{ background: "none", border: "none", color: "#C8A97E", cursor: "pointer", fontSize: 13, marginBottom: 28, padding: 0, display: "flex", alignItems: "center", gap: 6 }}>
              ← Back
            </button>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, color: "#F5EFE6", marginBottom: 28, fontWeight: 400 }}>Your Details</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <DarkField label="Your Name" value={form.buyerName} onChange={v => setForm(p => ({ ...p, buyerName: v }))} placeholder="Full name" />
              <DarkField label="Your Phone Number" value={form.buyerPhone} onChange={v => setForm(p => ({ ...p, buyerPhone: v }))} placeholder="0XX XXX XXXX" type="tel" />
              <DarkField label="Your Email" value={form.buyerEmail} onChange={v => setForm(p => ({ ...p, buyerEmail: v }))} placeholder="your@email.com — receipt will be sent here" type="email" />

              {deliveryType === "email" && !selectedPromo && (
                <>
                  <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "4px 0" }} />
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(255,255,255,0.4)" }}>RECIPIENT DETAILS</div>
                  <DarkField label="Recipient Name" value={form.recipientName} onChange={v => setForm(p => ({ ...p, recipientName: v }))} placeholder="Who is this for?" />
                  <DarkField label="Recipient Email" value={form.recipientEmail} onChange={v => setForm(p => ({ ...p, recipientEmail: v }))} placeholder="recipient@email.com" type="email" />
                  <div>
                    <label className="gc-label">PERSONAL MESSAGE (OPTIONAL)</label>
                    <textarea
                      value={form.message}
                      onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                      placeholder="Add a personal message..."
                      rows={3}
                      className="gc-input"
                      style={{ resize: "vertical" }}
                    />
                  </div>
                </>
              )}
            </div>

            <button className="gc-btn"
              onClick={handleProceed}
              style={{ width: "100%", background: "linear-gradient(135deg,#8B6914,#C8A97E)", color: "white", border: "none", borderRadius: 12, padding: "16px", fontSize: 14, fontWeight: 700, cursor: "pointer", letterSpacing: "0.08em", marginTop: 28 }}>
              REVIEW ORDER →
            </button>
          </div>
        )}

        {/* STEP: CONFIRM */}
        {step === "confirm" && (selectedTier || selectedPromo) && (() => {
          const confirmLabel = selectedPromo ? selectedPromo.name : (tierConfig?.label || "");
          const confirmAmount = selectedPromo ? selectedPromo.amount : getTierValue(selectedTier!);
          return (
            <div style={{ animation: "fadeUp 0.3s ease" }}>
              <button onClick={() => setStep("details")} style={{ background: "none", border: "none", color: "#C8A97E", cursor: "pointer", fontSize: 13, marginBottom: 28, padding: 0 }}>
                ← Back
              </button>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, color: "#F5EFE6", marginBottom: 28, fontWeight: 400 }}>Review Order</h2>

              {/* Full-size card preview */}
              <div style={{ marginBottom: 28 }}>
                <GiftCard
                  gradient={selectedPromo ? (PROMO_GRADS[selectedPromo.theme] || PROMO_GRADS.gold) : TIER_STYLES[selectedTier!].gradient}
                  glow={selectedPromo ? "rgba(0,0,0,0.2)" : TIER_STYLES[selectedTier!].glow}
                  chip={selectedPromo ? "rgba(255,255,255,0.7)" : TIER_STYLES[selectedTier!].chip}
                  desc={selectedPromo ? (selectedPromo.description || "") : TIER_STYLES[selectedTier!].desc}
                  label={confirmLabel} amount={confirmAmount} selected promo={!!selectedPromo}
                />
              </div>

              {/* Order summary */}
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden", marginBottom: 20 }}>
                {[
                  { label: "Card Value", value: `GH₵ ${confirmAmount.toLocaleString()}` },
                  { label: "Delivery", value: deliveryType === "email" ? `Email to ${form.recipientEmail}` : "Pick up at Zolara, Sakasaka" },
                  ...(deliveryType === "email" ? [{ label: "Recipient", value: form.recipientName }] : []),
                  { label: "From", value: form.buyerName },
                  { label: "Phone", value: form.buyerPhone },
                ].map(({ label, value }, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "13px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>{label}</span>
                    <span style={{ color: "#F5EFE6", fontSize: 12, fontWeight: 500, maxWidth: "55%", textAlign: "right" }}>{value}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 18px" }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: "#F5EFE6" }}>Total</span>
                  <span style={{ fontWeight: 700, fontSize: 18, color: "#C8A97E" }}>GH₵ {confirmAmount.toLocaleString()}</span>
                </div>
              </div>

              <div style={{ background: "rgba(200,169,126,0.07)", borderRadius: 10, padding: "12px 16px", fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 20, border: "1px solid rgba(200,169,126,0.15)", lineHeight: 1.6 }}>
                {deliveryType === "email"
                  ? `Your gift card will be sent to ${form.recipientEmail} within 10–15 minutes of payment confirmation.`
                  : "Please visit Zolara Beauty Studio in Sakasaka, Opposite CalBank, to pick up your physical gift card. Show your name and phone number."}
              </div>

              <button className="gc-btn"
                onClick={handlePay}
                disabled={loading}
                style={{ width: "100%", background: loading ? "rgba(200,169,126,0.3)" : "linear-gradient(135deg,#8B6914,#C8A97E)", color: loading ? "rgba(255,255,255,0.4)" : "white", border: "none", borderRadius: 12, padding: "16px", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", letterSpacing: "0.08em" }}>
                {loading ? "PROCESSING..." : `PAY GH₵ ${confirmAmount.toLocaleString()} VIA PAYSTACK`}
              </button>
              <p style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 12 }}>
                Secured by Paystack · Card, Mobile Money, Bank Transfer accepted
              </p>
            </div>
          );
        })()}

        {/* STEP: DONE */}
        {step === "done" && (selectedTier || selectedPromo) && (
          <div style={{ textAlign: "center", padding: "60px 20px", animation: "fadeUp 0.4s ease" }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg,#8B6914,#C8A97E)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: 36 }}>✦</div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 36, color: "#F5EFE6", marginBottom: 16, fontWeight: 400 }}>Order Received</h2>
            {deliveryType === "email" ? (
              <>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.8, marginBottom: 8 }}>
                  Your <strong style={{ color: "#C8A97E" }}>{selectedPromo ? selectedPromo.name : tierConfig?.label} Gift Card</strong> has been placed.
                </p>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.8, marginBottom: 28 }}>
                  Once payment is confirmed, it will be emailed to <strong style={{ color: "#F5EFE6" }}>{form.recipientEmail}</strong> within 10–15 minutes.
                </p>
                <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>Questions? Call <strong style={{ color: "#F5EFE6" }}>0594365314</strong> or <strong style={{ color: "#F5EFE6" }}>020 884 8707</strong></p>
              </>
            ) : (
              <>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.8, marginBottom: 8 }}>
                  Your <strong style={{ color: "#C8A97E" }}>{selectedPromo ? selectedPromo.name : tierConfig?.label} Gift Card</strong> is ready for pickup.
                </p>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.8, marginBottom: 28 }}>
                  Visit us at <strong style={{ color: "#F5EFE6" }}>Sakasaka, Opposite CalBank, Tamale</strong>.<br />
                  Show your name (<strong style={{ color: "#F5EFE6" }}>{form.buyerName}</strong>) and phone at the front desk.
                </p>
              </>
            )}
            <a href={typeof window !== "undefined" && localStorage.getItem("zolara_client_token") ? "/app/client/dashboard" : "/"} style={{ color: "#C8A97E", fontSize: 13, textDecoration: "none" }}>{typeof window !== "undefined" && localStorage.getItem("zolara_client_token") ? "← Back to Dashboard" : "← Back to Zolara"}</a>
          </div>
        )}
      </div>
    </div>
  );
}

function DarkField({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,0.45)", display: "block", marginBottom: 7 }}>{label.toUpperCase()}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="gc-inp" />
    </div>
  );
}
