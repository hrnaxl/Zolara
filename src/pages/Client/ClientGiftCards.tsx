import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { normalizePhoneGhana } from "@/lib/utils";
import { format } from "date-fns";
import { Link } from "react-router-dom";

const G      = "#C8A97E";
const G_DARK = "#8B6914";
const NAVY   = "#0F1E35";
const CREAM  = "#FAFAF8";
const WHITE  = "#FFFFFF";
const BORDER = "#EDE8E0";
const TXT    = "#1C160E";
const TXT_M  = "#78716C";

const TIER_STYLES: Record<string, { bg: string; shine: string; text: string }> = {
  Silver:   { bg: "linear-gradient(135deg,#C8D8E2,#A8BEC8,#88A4B2)", shine: "#E8F4F8", text: "#1A2E3A" },
  Gold:     { bg: "linear-gradient(135deg,#F0D070,#C8A030,#785008)", shine: "#FFF0A0", text: "#1A0A00" },
  Platinum: { bg: "linear-gradient(135deg,#2D2D2D,#1A1A1A,#0F0F0F)",  shine: "#C8A97E", text: "#F5EFE6" },
  Diamond:  { bg: "linear-gradient(135deg,#141240,#221E6A,#4338CA)", shine: "#A5B4FC", text: "#E8EEFF" },
};

export default function ClientGiftCards() {
  const { client } = useOutletContext<any>();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!client?.id && !client?.phone) return;
    const load = async () => {
      const { intl, local } = normalizePhoneGhana(client.phone || "");
      // Fetch gift cards by client_id, recipient email, or phone
      const queries = [
        (supabase as any).from("gift_cards").select("*").eq("client_id", client.id).neq("status", "expired"),
        (supabase as any).from("gift_cards").select("*").or(`recipient_email.eq.${client.email || "noemail@zolara.com"},buyer_phone.eq.${local},buyer_phone.eq.${intl}`).neq("status", "expired"),
      ];
      const results = await Promise.all(queries);
      const all = [...(results[0].data || []), ...(results[1].data || [])];
      // Deduplicate by id
      const seen = new Set();
      const unique = all.filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });
      setCards(unique.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setLoading(false);
    };
    load();
  }, [client]);

  const statusColor = (s: string) => {
    if (s === "active") return { color: "#16A34A", bg: "#F0FDF4" };
    if (s === "redeemed") return { color: "#6B7280", bg: "#F9FAFB" };
    return { color: "#EF4444", bg: "#FEF2F2" };
  };

  return (
    <div style={{ padding: "clamp(16px,4vw,32px)", fontFamily: "Montserrat,sans-serif" }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", color: G_DARK, textTransform: "uppercase", marginBottom: 6 }}>Your Gift Cards</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 32, fontWeight: 300, color: NAVY, lineHeight: 1.1 }}>
          Gift Cards
        </h1>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: TXT_M, fontSize: 13 }}>Loading your gift cards…</div>
      ) : cards.length === 0 ? (
        <div style={{ textAlign: "center", padding: "56px 20px", background: WHITE, borderRadius: 16, border: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>🎁</div>
          <p style={{ fontSize: 14, fontWeight: 600, color: TXT, marginBottom: 8 }}>No gift cards yet</p>
          <p style={{ fontSize: 12, color: TXT_M, lineHeight: 1.7, marginBottom: 20 }}>Gift cards you purchase or receive will appear here.</p>
          <Link to="/buy-gift-card" style={{ display: "inline-flex", padding: "11px 24px", background: `linear-gradient(135deg,${G_DARK},${G})`, color: WHITE, fontSize: 11, fontWeight: 700, textDecoration: "none", borderRadius: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Buy a Gift Card →
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {cards.map(card => {
            const tier = card.tier || "Gold";
            const s = TIER_STYLES[tier] || TIER_STYLES.Gold;
            const sc = statusColor(card.status);
            const balance = Number(card.balance ?? card.amount ?? 0);
            const original = Number(card.amount ?? 0);
            const pct = original > 0 ? Math.round((balance / original) * 100) : 0;

            return (
              <div key={card.id} style={{ background: WHITE, borderRadius: 16, border: `1px solid ${BORDER}`, overflow: "hidden" }}>
                {/* Card visual */}
                <div style={{ background: s.bg, padding: "24px 28px", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.06)", pointerEvents: "none" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                    <div>
                      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 15, color: s.text, fontWeight: 600, letterSpacing: "0.06em" }}>Zolara Beauty Studio</div>
                      <div style={{ fontSize: 9, letterSpacing: "0.22em", color: s.shine, opacity: 0.8, marginTop: 2 }}>{tier.toUpperCase()} GIFT CARD</div>
                    </div>
                    <div style={{ fontSize: 9, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: sc.bg, color: sc.color, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                      {card.status}
                    </div>
                  </div>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 36, fontWeight: 700, color: s.shine, lineHeight: 1 }}>
                    GH₵ {balance.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 10, color: s.text, opacity: 0.6, marginTop: 4, letterSpacing: "0.1em" }}>
                    remaining of GH₵ {original.toLocaleString()}
                  </div>
                </div>

                {/* Balance bar */}
                <div style={{ height: 3, background: BORDER }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg,${G_DARK},${G})`, transition: "width 1s ease" }} />
                </div>

                {/* Details */}
                <div style={{ padding: "16px 24px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: TXT_M, textTransform: "uppercase", marginBottom: 3 }}>Code</div>
                      <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: TXT, letterSpacing: "0.1em" }}>{card.code}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: TXT_M, textTransform: "uppercase", marginBottom: 3 }}>Valid Until</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: TXT }}>
                        {card.expires_at ? format(new Date(card.expires_at), "MMM d, yyyy") : "12 months from purchase"}
                      </div>
                    </div>
                    {card.recipient_name && (
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: TXT_M, textTransform: "uppercase", marginBottom: 3 }}>For</div>
                        <div style={{ fontSize: 13, color: TXT }}>{card.recipient_name}</div>
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: TXT_M, textTransform: "uppercase", marginBottom: 3 }}>Purchased</div>
                      <div style={{ fontSize: 13, color: TXT }}>{card.created_at ? format(new Date(card.created_at), "MMM d, yyyy") : "—"}</div>
                    </div>
                  </div>
                  {card.message && (
                    <div style={{ marginTop: 14, padding: "10px 14px", background: CREAM, borderRadius: 8, borderLeft: `3px solid ${G}` }}>
                      <div style={{ fontSize: 11, fontStyle: "italic", color: TXT_M, lineHeight: 1.7 }}>"{card.message}"</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <div style={{ textAlign: "center", paddingTop: 8 }}>
            <Link to="/buy-gift-card" style={{ display: "inline-flex", padding: "12px 28px", border: `1.5px solid ${G}`, color: G_DARK, fontSize: 11, fontWeight: 700, textDecoration: "none", borderRadius: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              + Buy Another Gift Card
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
