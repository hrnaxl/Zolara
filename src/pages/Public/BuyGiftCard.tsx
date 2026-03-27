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
  bg: string; shimmer: string; glow: string; chipBg: string; chipColor: string;
  accent: string; textColor: string; subColor: string; desc: string; anim: string;
}> = {
  Silver: {
    bg: `radial-gradient(ellipse at 20% 80%, #3a4a52 0%, transparent 60%),
         radial-gradient(ellipse at 80% 20%, #c8dae2 0%, transparent 55%),
         linear-gradient(140deg, #5a6e78 0%, #8ba4b0 25%, #c5d8e0 50%, #9ab5be 75%, #4e6470 100%)`,
    shimmer: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.45) 50%, transparent 65%)",
    glow: "0 32px 64px rgba(140,180,200,0.25), 0 8px 24px rgba(0,0,0,0.4)",
    chipBg: "rgba(255,255,255,0.18)", chipColor: "#ffffff",
    accent: "#ddeef4", textColor: "#ffffff", subColor: "rgba(255,255,255,0.6)",
    desc: "A perfect treat. Covers a wash, nail set or lashes.",
    anim: "gcFloat 5s ease-in-out infinite",
  },
  Gold: {
    bg: `radial-gradient(ellipse at 15% 85%, #1a0e00 0%, transparent 55%),
         radial-gradient(ellipse at 82% 18%, rgba(212,185,120,0.5) 0%, transparent 48%),
         linear-gradient(140deg, #2c1c04 0%, #5a3a0a 20%, #8b6318 40%, #a07828 60%, #6b4a10 80%, #1e1204 100%)`,
    shimmer: "linear-gradient(105deg, transparent 32%, rgba(212,185,120,0.38) 50%, transparent 68%)",
    glow: "0 32px 64px rgba(160,120,30,0.22), 0 8px 24px rgba(0,0,0,0.55)",
    chipBg: "rgba(212,185,120,0.15)", chipColor: "#D4B978",
    accent: "#D4B978", textColor: "#FDF6E3", subColor: "rgba(212,185,120,0.6)",
    desc: "A full pampering session. Braids, manicure and more.",
    anim: "gcFloat2 5.5s ease-in-out infinite 0.4s",
  },
  Platinum: {
    bg: `radial-gradient(ellipse at 25% 75%, #0a0a0a 0%, transparent 60%),
         radial-gradient(ellipse at 75% 25%, rgba(200,169,126,0.35) 0%, transparent 55%),
         linear-gradient(140deg, #111111 0%, #1e1e1e 30%, #2a2a2a 55%, #181818 80%, #0d0d0d 100%)`,
    shimmer: "linear-gradient(105deg, transparent 30%, rgba(200,169,126,0.4) 50%, transparent 70%)",
    glow: "0 32px 64px rgba(200,169,126,0.2), 0 8px 24px rgba(0,0,0,0.7)",
    chipBg: "rgba(200,169,126,0.15)", chipColor: "#C8A97E",
    accent: "#C8A97E", textColor: "#F5EFE6", subColor: "rgba(200,169,126,0.6)",
    desc: "Premium luxury. A full day of indulgence at Zolara.",
    anim: "gcFloat 6s ease-in-out infinite 0.2s",
  },
  Diamond: {
    bg: `radial-gradient(ellipse at 20% 80%, #060420 0%, transparent 55%),
         radial-gradient(ellipse at 80% 20%, #7c6fff 0%, transparent 50%),
         radial-gradient(ellipse at 50% 50%, #1a1560 0%, transparent 70%),
         linear-gradient(140deg, #0d0b2e 0%, #1a1660 25%, #2d27a0 50%, #1e1880 75%, #0a0820 100%)`,
    shimmer: "linear-gradient(105deg, transparent 30%, rgba(165,148,255,0.5) 50%, transparent 70%)",
    glow: "0 32px 64px rgba(120,100,255,0.35), 0 8px 24px rgba(0,0,0,0.6)",
    chipBg: "rgba(165,148,255,0.15)", chipColor: "#a594ff",
    accent: "#c4b8ff", textColor: "#ededff", subColor: "rgba(165,148,255,0.65)",
    desc: "The ultimate gift. Use across 3 visits. Balance carries forward.",
    anim: "gcFloat3 4.5s ease-in-out infinite 0.6s",
  },
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
  s, label, amount, selected, promo = false, promoDesc, promoGrad,
}: {
  s?: { bg:string; shimmer:string; glow:string; chipBg:string; chipColor:string; accent:string; textColor:string; subColor:string; desc:string; anim:string };
  promoGrad?: string; label: string; amount: number; selected: boolean; promo?: boolean; promoDesc?: string;
}) {
  const bg = promo ? promoGrad! : s!.bg;
  const shimmer = promo ? "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%)" : s!.shimmer;
  const glow = promo ? "0 28px 56px rgba(0,0,0,0.4)" : s!.glow;
  const chipBg = promo ? "rgba(255,255,255,0.15)" : s!.chipBg;
  const chipColor = promo ? "#fff" : s!.chipColor;
  const accent = promo ? "rgba(255,255,255,0.9)" : s!.accent;
  const textColor = promo ? "#fff" : s!.textColor;
  const subColor = promo ? "rgba(255,255,255,0.55)" : s!.subColor;
  const desc = promoDesc || (s?.desc ?? "");

  return (
    <div style={{
      position: "relative", overflow: "hidden", borderRadius: 20,
      padding: "28px 26px 24px",
      background: bg,
      boxShadow: selected
        ? glow.replace(/0.(2|3|4|25|35)/, "0.6") + ", 0 0 0 2px " + accent
        : glow,
      transform: selected ? "translateY(-10px) scale(1.03)" : "none",
      transition: "transform 0.35s cubic-bezier(0.16,1,0.3,1), box-shadow 0.35s ease",
      cursor: "pointer", minHeight: 200,
    }}>
      {/* Shimmer sweep */}
      <div style={{ position:"absolute", inset:0, background:shimmer, opacity: selected ? 1 : 0.6, transition:"opacity 0.3s", pointerEvents:"none", zIndex:1 }} />
      {/* Top-left soft glow blob */}
      <div style={{ position:"absolute", top:-40, left:-40, width:160, height:160, borderRadius:"50%", background:"rgba(255,255,255,0.06)", pointerEvents:"none", zIndex:1 }} />
      {/* Bottom-right circle */}
      <div style={{ position:"absolute", bottom:-20, right:-20, width:100, height:100, borderRadius:"50%", background:"rgba(255,255,255,0.04)", pointerEvents:"none", zIndex:1 }} />
      {/* Bottom edge glow */}
      <div style={{ position:"absolute", bottom:0, left:0, right:0, height:60, background:"linear-gradient(180deg, transparent, rgba(0,0,0,0.25))", pointerEvents:"none", zIndex:1 }} />

      {/* Content */}
      <div style={{ position:"relative", zIndex:2, height:"100%", display:"flex", flexDirection:"column", gap:0 }}>

        {/* Row 1: overline + logo */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18 }}>
          <div>
            <div style={{ fontSize:7, letterSpacing:"0.32em", color:subColor, fontWeight:700, textTransform:"uppercase", marginBottom:8, fontFamily:"Montserrat,sans-serif" }}>
              {promo ? "Special Edition" : "Zolara Beauty Studio"}
            </div>
            <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 12px", borderRadius:20, background:chipBg, border:`1px solid ${chipColor}55`, backdropFilter:"blur(8px)" }}>
              <span style={{ fontSize:9, fontWeight:700, letterSpacing:"0.16em", color:chipColor, fontFamily:"Montserrat,sans-serif" }}>{label.toUpperCase()}</span>
            </div>
          </div>
          <div style={{ width:38, height:38, borderRadius:"50%", border:`2px solid ${accent}44`, overflow:"hidden", background:"#fff", boxShadow:`0 0 0 4px ${accent}18`, flexShrink:0 }}>
            <img src={LOGO_URL} alt="Zolara" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
          </div>
        </div>

        {/* Row 2: amount */}
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(32px,4vw,44px)", fontWeight:300, color:textColor, lineHeight:1, letterSpacing:"-0.02em", marginBottom:16 }}>
          GH₵ {amount.toLocaleString()}
        </div>

        {/* Row 3: divider + desc */}
        <div style={{ height:1, background:`linear-gradient(90deg, ${accent}44, ${accent}15, transparent)`, marginBottom:14 }} />
        <p style={{ fontFamily:"Montserrat,sans-serif", fontSize:11.5, color:subColor, lineHeight:1.7, fontWeight:400, margin:0, flex:1 }}>
          {desc}
        </p>

        {/* Row 4: validity badge */}
        <div style={{ marginTop:16, display:"flex", alignItems:"center", gap:6 }}>
          <div style={{ width:5, height:5, borderRadius:"50%", background:accent, opacity:0.7 }} />
          <span style={{ fontSize:8.5, letterSpacing:"0.14em", color:subColor, fontFamily:"Montserrat,sans-serif", fontWeight:600 }}>VALID 12 MONTHS · ZOLARA.COM</span>
        </div>
      </div>
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
    senderName: "", recipientName: "", recipientPhone: "", recipientEmail: "",
    buyerEmail: "", message: "",
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
    // Try service-role API first, fallback to direct Supabase if it fails
    fetch("/api/public-promo-cards")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        const promos = Array.isArray(data) ? data : [];
        if (promos.length === 0) {
          // Fallback: try direct query (works if RLS allows public read)
          return (supabase as any)
            .from("promo_gift_card_types")
            .select("*")
            .then(({ data: d }: any) => {
              const now = new Date();
              setPromoTypes((d || []).filter((p: any) => {
                if (p.is_active === false) return false;
                if (p.expires_at && new Date(p.expires_at) < now) return false;
                if (p.max_uses && p.uses_count >= p.max_uses) return false;
                return true;
              }));
            });
        }
        setPromoTypes(promos);
      })
      .catch(() => {
        // Final fallback: direct Supabase
        (supabase as any).from("promo_gift_card_types").select("*")
          .then(({ data: d }: any) => {
            const now = new Date();
            setPromoTypes((d || []).filter((p: any) => {
              if (p.is_active === false) return false;
              if (p.expires_at && new Date(p.expires_at) < now) return false;
              if (p.max_uses && p.uses_count >= p.max_uses) return false;
              return true;
            }));
          }).catch(() => {});
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
      senderName: sanitizeName(f.senderName),
      recipientName: sanitizeName(f.recipientName),
      recipientPhone: sanitizePhone(f.recipientPhone),
      recipientEmail: sanitizeEmail(f.recipientEmail),
      buyerEmail: sanitizeEmail(f.buyerEmail),
      message: sanitizeNotes(f.message),
    }));
    if (!form.senderName.trim()) { toast.error("Enter your name"); return; }
    if (!form.recipientName.trim()) { toast.error("Enter the recipient's name"); return; }
    if (!form.recipientPhone.trim()) { toast.error("Enter the recipient's phone number"); return; }
    if (deliveryType === "email" && !form.recipientEmail.trim()) { toast.error("Enter the recipient's email address"); return; }
    if (!form.buyerEmail.trim()) { toast.error("Enter your email address for the purchase receipt"); return; }
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
          buyer_name: form.senderName,
          buyer_email: form.buyerEmail,
          buyer_phone: form.recipientPhone,
          recipient_name: form.recipientName,
          recipient_email: form.recipientEmail || form.buyerEmail,
          message: form.message || (isEmail ? "" : "Physical card pickup"),
        },
        onSuccess: async (paymentRef: string) => {
          try {
            const tierValue = selectedPromo ? getPromoValue(selectedPromo) : getTierValue(selectedTier!);
            if (isEmail && !selectedPromo) {
              const r = await fetch("/api/create-gift-card", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tier: selectedTier, amount: tierValue, buyerName: form.senderName, buyerEmail: form.buyerEmail, buyerPhone: form.recipientPhone, recipientName: form.recipientName, recipientEmail: form.recipientEmail || form.buyerEmail, message: form.message || null }),
              });
              const d = await r.json().catch(() => ({}));
              if (r.ok && d.card) {
                // Mark as sold so it shows correctly in admin
                fetch("/api/mark-gift-card-sold", {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: d.card.id }),
                }).catch(() => {});
                const emailTo = form.recipientEmail || form.buyerEmail;
                if (emailTo) sendGiftCardEmail({ id: d.card.id, tier: selectedTier!, amount: tierValue, code: d.card.code, recipient_name: form.recipientName, recipient_email: emailTo, buyer_name: form.senderName, message: form.message || undefined }).catch(console.error);
                if (form.buyerEmail) sendPurchaseReceiptEmail({ buyerName: form.senderName, buyerEmail: form.buyerEmail, tier: selectedTier!, amount: tierValue, cardCode: d.card.code, paymentRef: paymentRef || "", isDigital: true, recipientName: form.recipientName, recipientEmail: form.recipientEmail || form.buyerEmail }).catch(console.error);
              }
            } else {
              const r = await fetch("/api/claim-gift-card", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  tier: selectedPromo ? "promo" : selectedTier,
                  promoTypeId: selectedPromo?.id || null,
                  amount: tierValue,
                  buyerName: form.senderName,
                  buyerEmail: form.buyerEmail,
                  buyerPhone: form.recipientPhone,
                  paymentRef,
                }),
              });
              const d = await r.json().catch(() => ({}));
              // Always send pickup email — card may be pre-printed or a placeholder
              if (form.buyerEmail) {
                sendPickupReceiptEmail({
                  buyerName: form.senderName,
                  buyerEmail: form.buyerEmail,
                  tier: selectedPromo ? (selectedPromo.name || "Special Edition") : selectedTier!,
                  amount: tierValue,
                  cardCode: d.card?.code || "PENDING",
                  serialNumber: d.card?.serial_number || undefined,
                  paymentRef: paymentRef || "",
                }).catch(console.error);
              }
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
    <div style={{ minHeight: "100vh", background: "#0D1520", fontFamily: "'Montserrat', sans-serif" }}>
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
        
        .gc-input:focus { border-color: #C8A97E; }
        .gc-label { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; color: #8B7355; display: block; margin-bottom: 8px; }
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
                          promoGrad={grad}
                          label={pt.name} amount={pt.amount} selected={sel} promo promoDesc={pt.description || "A special gift for a special occasion."}
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
                      s={TIER_STYLES[tier]}
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
                  style={{ width: "100%", background: "linear-gradient(135deg,#8B6914,#C8A97E)", color: "white", border: "none", borderRadius: 12, padding: "16px", fontSize: 13, fontWeight: 700, cursor: "pointer", letterSpacing: "0.1em", fontFamily: "Montserrat,sans-serif" }}>
                  CONTINUE →
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP: DETAILS */}
        {step === "details" && (selectedTier || selectedPromo) && (
          <div style={{ animation: "fadeUp 0.35s ease" }}>

            {/* Back + heading */}
            <button onClick={() => setStep("select")} style={{ background: "none", border: "none", color: "#C8A97E", cursor: "pointer", fontSize: 12, marginBottom: 32, padding: 0, display: "flex", alignItems: "center", gap: 6, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              ← Back
            </button>

            <div style={{ marginBottom: 36 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", color: "#C8A97E", marginBottom: 8 }}>STEP 2 OF 3</div>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(28px,5vw,38px)", color: "#F5EFE6", marginBottom: 8, fontWeight: 300, lineHeight: 1.1 }}>Card Details</h2>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, lineHeight: 1.6 }}>Fill in who this card is for.</p>
            </div>

            {/* Form card — light bg */}
            <div style={{ background: "#FFFFFF", borderRadius: 20, overflow: "hidden", boxShadow: "0 0 0 1px rgba(200,169,126,0.3), 0 20px 60px rgba(0,0,0,0.4)" }}>
              <div style={{ height: 3, background: "linear-gradient(90deg,#8B6914,#C8A97E,#8B6914)" }} />

              {/* Section: From */}
              <div style={{ padding: "28px 28px 24px", background: "#FFFEF C" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#8B6914,#C8A97E)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff", fontWeight: 700, flexShrink: 0 }}>1</div>
                  <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", color: "#1A1208" }}>From You</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <DarkField label="Your Name" value={form.senderName} onChange={v => setForm(p => ({ ...p, senderName: v }))} placeholder="Your full name" icon="✦" />
                  <DarkField label="Your Email" value={form.buyerEmail} onChange={v => setForm(p => ({ ...p, buyerEmail: v }))} placeholder="receipt@email.com" type="email" icon="✉" />
                  <p style={{ fontSize: 11, color: "#6B5D52", margin: 0, lineHeight: 1.5 }}>Your purchase receipt will be sent here.</p>
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: "linear-gradient(90deg, transparent, #E8E0D4, transparent)", margin: "0 28px" }} />

              {/* Section: To */}
              <div style={{ padding: "24px 28px 28px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#8B6914,#C8A97E)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff", fontWeight: 700, flexShrink: 0 }}>2</div>
                  <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", color: "#1A1208" }}>For Them</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <DarkField label="Recipient Name" value={form.recipientName} onChange={v => setForm(p => ({ ...p, recipientName: v }))} placeholder="Who is this for?" />
                  <DarkField label="Recipient Phone" value={form.recipientPhone} onChange={v => setForm(p => ({ ...p, recipientPhone: v }))} placeholder="0XX XXX XXXX" type="tel" icon="📱" />
                  <p style={{ fontSize: 11, color: "#6B5D52", margin: 0, lineHeight: 1.5 }}>Their phone links this card to their Zolara account.</p>
                  {deliveryType === "email" && !selectedPromo && (
                    <DarkField label="Recipient Email" value={form.recipientEmail} onChange={v => setForm(p => ({ ...p, recipientEmail: v }))} placeholder="The card will be sent here" type="email" icon="✉" />
                  )}
                </div>
              </div>

              {/* Section: Message (email only) */}
              {deliveryType === "email" && !selectedPromo && (
                <>
                  <div style={{ height: 1, background: "linear-gradient(90deg, transparent, #E8E0D4, transparent)", margin: "0 28px" }} />
                  <div style={{ padding: "24px 28px 28px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#8B6914,#C8A97E)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff", fontWeight: 700, flexShrink: 0 }}>3</div>
                      <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", color: "#1A1208" }}>Personal Message <span style={{ fontWeight: 400, color: "#888078" }}>(optional)</span></span>
                    </div>
                    <textarea
                      value={form.message}
                      onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                      placeholder="Write something heartfelt..."
                      rows={3}
                      className="gc-inp"
                      style={{ resize: "none", lineHeight: 1.6 }}
                    />
                  </div>
                </>
              )}
            </div>

            {/* CTA */}
            <button className="gc-btn"
              onClick={handleProceed}
              style={{
                width: "100%", marginTop: 20,
                background: "linear-gradient(135deg, #5A3A00, #8B6914, #C8A97E)",
                color: "#FFF8EE", border: "none", borderRadius: 14,
                padding: "18px", fontSize: 12, fontWeight: 700,
                cursor: "pointer", letterSpacing: "0.18em", textTransform: "uppercase",
                fontFamily: "'Montserrat',sans-serif",
                boxShadow: "0 8px 32px rgba(139,105,20,0.35)",
              }}>
              Review Order →
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
                  s={selectedPromo ? undefined : TIER_STYLES[selectedTier!]}
                  promoGrad={selectedPromo ? (PROMO_GRADS[selectedPromo.theme] || PROMO_GRADS.gold) : undefined}
                  label={confirmLabel} amount={confirmAmount} selected promo={!!selectedPromo}
                  promoDesc={selectedPromo?.description}
                />
              </div>

              {/* Order summary */}
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden", marginBottom: 20 }}>
                {[
                  { label: "Card Value", value: `GH₵ ${confirmAmount.toLocaleString()}` },
                  { label: "Delivery", value: deliveryType === "email" ? `Email to ${form.recipientEmail}` : "Pick up at Zolara, Sakasaka" },
                  ...(deliveryType === "email" ? [{ label: "Recipient", value: form.recipientName }] : []),
                  { label: "From", value: form.senderName },
                  ...(form.recipientPhone ? [{ label: "Recipient Phone", value: form.recipientPhone }] : []),
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
            <Link to={typeof window !== "undefined" && localStorage.getItem("zolara_client_token") ? "/app/client/dashboard" : "/"} style={{ color: "#C8A97E", fontSize: 13, textDecoration: "none" }}>{typeof window !== "undefined" && localStorage.getItem("zolara_client_token") ? "← Back to Dashboard" : "← Back to Zolara"}</Link>
          </div>
        )}
      </div>
    </div>
  );
}

function DarkField({ label, value, onChange, placeholder, type = "text", icon }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; icon?: string;
}) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", color: "#1A1208", display: "block", marginBottom: 8 }}>{label}</label>
      <div style={{ position: "relative" }}>
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="gc-inp"
          style={icon ? { paddingRight: 40 } : {}} />
        {icon && <span className="gc-field-icon">{icon}</span>}
      </div>
    </div>
  );
}
