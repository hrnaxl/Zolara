// ================================================================
// ADMIN-ONLY GIFT CARD UTILITIES
// Uses supabaseAdmin (service role) — NEVER import this from public pages
// Only import from pages/Admin/* files
// ================================================================
import { supabaseAdmin } from "@/integrations/supabase/adminClient";
import { GIFT_CARD_TIERS, GiftCardTier, generateRedeemableCode, generateSerialNumber } from "@/lib/giftCardEcommerce";

export async function generatePhysicalBatch(opts: {
  tier: GiftCardTier;
  quantity: number;
  batchId: string;
  adminUserId: string;
  overridePrice?: number;
}): Promise<{ cards: any[]; error: string | null }> {
  try {
    // Get current max sequence for serial numbers
    const { data: existing } = await (supabaseAdmin as any)
      .from("gift_cards")
      .select("serial_number")
      .eq("card_type", "physical")
      .not("serial_number", "is", null)
      .order("serial_number", { ascending: false })
      .limit(1);

    let startSeq = 1;
    if (existing && existing.length > 0) {
      const lastSerial = existing[0].serial_number as string;
      const lastNum = parseInt(lastSerial.split("-")[2] || "0");
      startSeq = lastNum + 1;
    }

    const tierConfig = GIFT_CARD_TIERS[opts.tier];
    const cardValue = opts.overridePrice ?? tierConfig.value;
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const cards = Array.from({ length: opts.quantity }, (_, i) => ({
      code: generateRedeemableCode(opts.tier),
      serial_number: generateSerialNumber(opts.tier, startSeq + i),
      amount: cardValue,
      balance: cardValue,
      tier: opts.tier,
      card_type: "physical",
      delivery_type: "physical",
      status: "active",
      payment_status: "pending",
      batch_id: opts.batchId,
      is_admin_generated: true,
      expires_at: expiresAt.toISOString(),
    }));

    const { data, error } = await (supabaseAdmin as any)
      .from("gift_cards")
      .insert(cards)
      .select();

    if (error) throw error;
    return { cards: data, error: null };
  } catch (err: any) {
    return { cards: [], error: err.message };
  }
}
