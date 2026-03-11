import { useState } from "react";
import { generatePhysicalBatch, GIFT_CARD_TIERS, GiftCardTier } from "@/lib/giftCardEcommerce";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, Printer, Plus } from "lucide-react";

const G = "#B8975A";
const G_LIGHT = "#F5ECD6";
const CREAM = "#FAFAF8";
const NAVY = "#0F1E35";
const TXT = "#1C1917";
const TXT_MID = "#78716C";
const BORDER = "#EDEBE5";
const SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)";

const TIER_BG: Record<GiftCardTier, string> = {
  Silver:   "linear-gradient(135deg, #d4d4d4, #f5f5f5, #a8a8a8)",
  Gold:     "linear-gradient(135deg, #B8975A, #F5D98A, #8C6A30)",
  Platinum: "linear-gradient(135deg, #4B5563, #9CA3AF, #374151)",
  Diamond:  "linear-gradient(135deg, #312E81, #818CF8, #1E1B4B)",
};

export default function GiftCardBatchGenerator() {
  const [tier, setTier] = useState<GiftCardTier>("Gold");
  const [quantity, setQuantity] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [generatedCards, setGeneratedCards] = useState<any[]>([]);
  const [batchId, setBatchId] = useState("");

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const newBatchId = `BATCH-${tier.substring(0,3).toUpperCase()}-${Date.now()}`;
      setBatchId(newBatchId);

      const { cards, error } = await generatePhysicalBatch({
        tier,
        quantity,
        batchId: newBatchId,
        adminUserId: user.id,
      });

      if (error) throw new Error(error);
      setGeneratedCards(cards);
      toast.success(`${cards.length} ${tier} gift cards generated and ready to send to print`);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate cards");
    } finally {
      setGenerating(false);
    }
  };

  const handleExportCSV = () => {
    if (!generatedCards.length) return;
    const headers = ["Serial Number", "Tier", "Value (GHS)", "Redeemable Code", "Expires", "Batch ID"];
    const rows = generatedCards.map(c => [
      c.serial_number, c.tier, c.amount,
      c.code, // redeemable code — goes under scratch panel when printing
      new Date(c.expires_at).toLocaleDateString(),
      c.batch_id,
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zolara-gift-cards-${tier.toLowerCase()}-${Date.now()}.csv`;
    a.click();
    toast.success("CSV exported — send to printing press");
  };

  const handlePrintPreview = () => {
    if (!generatedCards.length) return;
    const win = window.open("", "_blank");
    if (!win) return;

    const cardsHtml = generatedCards.map(c => `
      <div style="width:85.6mm;height:54mm;background:${TIER_BG[c.tier as GiftCardTier].replace(/"/g, "'")};border-radius:8px;padding:16px;box-sizing:border-box;display:inline-flex;flex-direction:column;justify-content:space-between;margin:4mm;position:relative;overflow:hidden;page-break-inside:avoid;">
        <div style="position:absolute;top:-10px;right:-10px;width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.1)"></div>
        <div style="font-family:serif;color:rgba(255,255,255,0.9);font-size:7pt;letter-spacing:2px;">ZOLARA BEAUTY STUDIO</div>
        <div>
          <div style="color:white;font-family:serif;font-size:20pt;font-weight:700;">GH₵ ${c.amount.toLocaleString()}</div>
          <div style="color:rgba(255,255,255,0.8);font-size:6pt;letter-spacing:3px;margin-top:2px;">${c.tier.toUpperCase()}</div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:flex-end;">
          <div style="color:rgba(255,255,255,0.7);font-size:6pt;">${c.serial_number}</div>
          <div style="color:rgba(255,255,255,0.6);font-size:5pt;">Valid 12 months · zolarasalon.com</div>
        </div>
        <div style="margin-top:8px;border-top:1px dashed rgba(255,255,255,0.3);padding-top:6px;font-family:monospace;font-size:7pt;color:rgba(255,255,255,0.4);text-align:center;">
          [SCRATCH TO REVEAL] ████████████
        </div>
      </div>
    `).join("");

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Zolara Gift Cards — Print Batch</title>
        <style>
          body { margin: 0; padding: 10mm; background: white; font-family: sans-serif; }
          h2 { font-size: 12pt; color: #333; margin-bottom: 4mm; }
          p { font-size: 9pt; color: #666; margin-bottom: 6mm; }
          @media print { body { padding: 5mm; } }
        </style>
      </head>
      <body>
        <h2>Zolara ${tier} Gift Cards — Batch: ${batchId}</h2>
        <p>Quantity: ${generatedCards.length} cards · Value: GH₵ ${GIFT_CARD_TIERS[tier].value.toLocaleString()} each · Note: Cover the redeemable code with scratch panel before printing</p>
        <div style="display:flex;flex-wrap:wrap;">
          ${cardsHtml}
        </div>
        <script>window.onload = () => window.print();</script>
      </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div style={{ background: CREAM, minHeight: "100vh", padding: "32px 24px", fontFamily: "'Montserrat', sans-serif" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, color: NAVY, marginBottom: 4 }}>
          Physical Gift Card Generator
        </h1>
        <p style={{ color: TXT_MID, fontSize: 13, marginBottom: 32 }}>
          Generate batches of physical gift cards. Cards are pre-registered in the system before being sent to print.
        </p>

        {/* Generator card */}
        <div style={{ background: "white", borderRadius: 16, padding: 28, boxShadow: SHADOW, marginBottom: 28 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: TXT_MID, display: "block", marginBottom: 8, letterSpacing: "0.06em" }}>TIER</label>
              <select
                value={tier}
                onChange={e => setTier(e.target.value as GiftCardTier)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 14, background: "white", fontFamily: "inherit" }}
              >
                {(Object.keys(GIFT_CARD_TIERS) as GiftCardTier[]).map(t => (
                  <option key={t} value={t}>{GIFT_CARD_TIERS[t].label} — GH₵ {GIFT_CARD_TIERS[t].value.toLocaleString()}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: TXT_MID, display: "block", marginBottom: 8, letterSpacing: "0.06em" }}>QUANTITY</label>
              <input
                type="number"
                min={1} max={200}
                value={quantity}
                onChange={e => setQuantity(Math.min(200, Math.max(1, Number(e.target.value))))}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }}
              />
            </div>
          </div>

          {/* Preview card visual */}
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 24, padding: "16px 20px", background: G_LIGHT, borderRadius: 12 }}>
            <div style={{
              width: 120, height: 75, borderRadius: 8,
              background: TIER_BG[tier],
              display: "flex", flexDirection: "column", justifyContent: "space-between",
              padding: "10px 12px", flexShrink: 0,
            }}>
              <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 7, letterSpacing: 2 }}>ZOLARA</div>
              <div>
                <div style={{ color: "white", fontFamily: "serif", fontSize: 16, fontWeight: 700 }}>GH₵ {GIFT_CARD_TIERS[tier].value.toLocaleString()}</div>
                <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 7, letterSpacing: 2 }}>{tier.toUpperCase()}</div>
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 600, color: TXT, fontSize: 14, marginBottom: 4 }}>
                {quantity}x {GIFT_CARD_TIERS[tier].label} Cards
              </div>
              <div style={{ color: TXT_MID, fontSize: 12 }}>Total value: GH₵ {(GIFT_CARD_TIERS[tier].value * quantity).toLocaleString()}</div>
              <div style={{ color: TXT_MID, fontSize: 11, marginTop: 2 }}>Valid for 12 months. One-time use.</div>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: generating ? "#D1C4A8" : G, color: "white",
              border: "none", borderRadius: 10, padding: "12px 24px",
              fontSize: 14, fontWeight: 600, cursor: generating ? "not-allowed" : "pointer",
            }}
          >
            <Plus size={16} />
            {generating ? "Generating..." : `Generate ${quantity} Cards`}
          </button>
        </div>

        {/* Generated cards */}
        {generatedCards.length > 0 && (
          <div style={{ background: "white", borderRadius: 16, padding: 28, boxShadow: SHADOW }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: NAVY, marginBottom: 2 }}>
                  {generatedCards.length} Cards Generated
                </h2>
                <p style={{ color: TXT_MID, fontSize: 12 }}>Batch: {batchId}</p>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={handleExportCSV}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: "white", color: TXT, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer", fontWeight: 500 }}
                >
                  <Download size={14} /> Export CSV
                </button>
                <button
                  onClick={handlePrintPreview}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: G, color: "white", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer", fontWeight: 600 }}
                >
                  <Printer size={14} /> Print Preview
                </button>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                    {["Serial Number", "Tier", "Value", "Redeemable Code", "Expires"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: TXT_MID, fontWeight: 600, fontSize: 11, letterSpacing: "0.06em" }}>{h.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {generatedCards.map((card, i) => (
                    <tr key={card.id} style={{ borderBottom: `1px solid ${BORDER}`, background: i % 2 === 0 ? "white" : "#FAFAF8" }}>
                      <td style={{ padding: "10px 12px", fontWeight: 600, color: NAVY, fontFamily: "monospace" }}>{card.serial_number}</td>
                      <td style={{ padding: "10px 12px", color: TXT }}>{card.tier}</td>
                      <td style={{ padding: "10px 12px", color: G, fontWeight: 600 }}>GH₵ {card.amount.toLocaleString()}</td>
                      <td style={{ padding: "10px 12px", fontFamily: "monospace", color: "#DC2626", fontSize: 12 }}>{card.code}</td>
                      <td style={{ padding: "10px 12px", color: TXT_MID }}>{new Date(card.expires_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 16, padding: "12px 16px", background: "#FEF2F2", borderRadius: 8, fontSize: 12, color: "#991B1B" }}>
              ⚠️ The "Redeemable Code" column is confidential. Ensure this is covered by a scratch panel on the printed cards. The Serial Number is what's visible on the front.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
