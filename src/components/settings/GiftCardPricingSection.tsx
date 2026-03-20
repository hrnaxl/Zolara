import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GIFT_CARD_TIERS, GiftCardTier } from "@/lib/giftCardEcommerce";
import { useSettings } from "@/context/SettingsContext";

const G = "#C8A97E", G_D = "#8B6914", WHITE = "#FFFFFF", BORDER = "#EDEBE5";
const TXT = "#1C160E", TXT_SOFT = "#A8A29E";
const inp: React.CSSProperties = { border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: "9px 12px", fontSize: 13, color: TXT, outline: "none", background: WHITE, fontFamily: "Montserrat,sans-serif", width: "100%", boxSizing: "border-box" };

const TIER_COLORS: Record<string, string> = { Silver: "#9CA3AF", Gold: "#B8975A", Platinum: "#6B7280", Diamond: "#6366F1" };

export function GiftCardPricingSection() {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const { setSettings } = useSettings();

  useEffect(() => {
    // Load saved prices from settings or use defaults
    (supabase as any).from("settings").select("gift_card_prices").limit(1).maybeSingle()
      .then(({ data }: any) => {
        if (data?.gift_card_prices) {
          setPrices(data.gift_card_prices);
        } else {
          // Default to hardcoded values
          const defaults: Record<string, number> = {};
          Object.entries(GIFT_CARD_TIERS).forEach(([tier, cfg]) => { defaults[tier] = cfg.value; });
          setPrices(defaults);
        }
      });
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const { data: existing } = await (supabase as any).from("settings").select("id").limit(1).maybeSingle();
      if (existing?.id) {
        await (supabase as any).from("settings").update({ gift_card_prices: prices }).eq("id", existing.id);
      }
      toast.success("Gift card prices saved");
      // Update context so all components get the new prices immediately
      setSettings((prev: any) => ({ ...prev, gift_card_prices: prices }));
    } catch { toast.error("Failed to save"); } finally { setSaving(false); }
  };

  return (
    <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04),0 4px 20px rgba(0,0,0,0.06)", marginBottom: 20 }}>
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}`, background: "linear-gradient(135deg,rgba(200,169,126,0.08),rgba(200,169,126,0.02))", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 700, color: TXT, margin: "0 0 2px" }}>Gift Card Pricing</h2>
          <p style={{ fontSize: 11, color: TXT_SOFT, margin: 0 }}>Set the face value for each tier. Applies to new purchases.</p>
        </div>
        <button onClick={save} disabled={saving} style={{ padding: "8px 20px", borderRadius: 10, background: saving ? BORDER : `linear-gradient(135deg,${G},${G_D})`, color: WHITE, border: "none", fontSize: 12, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
          {saving ? "Saving…" : "Save Prices"}
        </button>
      </div>
      <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
        {(Object.keys(GIFT_CARD_TIERS) as GiftCardTier[]).map(tier => {
          const color = TIER_COLORS[tier] || G;
          return (
            <div key={tier} style={{ background: "#FAFAF8", border: `1.5px solid ${BORDER}`, borderRadius: 12, padding: "14px 16px", borderTop: `3px solid ${color}` }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color, textTransform: "uppercase", margin: "0 0 8px" }}>{tier}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 13, color: TXT_SOFT, fontFamily: "Montserrat,sans-serif" }}>GHS</span>
                <input
                  type="number" min="1" step="1"
                  value={prices[tier] ?? GIFT_CARD_TIERS[tier].value}
                  onChange={e => setPrices(p => ({ ...p, [tier]: Number(e.target.value) }))}
                  style={{ ...inp, width: "100%", fontWeight: 700, fontSize: 15 }}
                />
              </div>
              <p style={{ fontSize: 10, color: TXT_SOFT, margin: "6px 0 0" }}>Default: GHS {GIFT_CARD_TIERS[tier].value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
