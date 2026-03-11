// ================================================================
// GIFT CARD E-COMMERCE UTILITIES
// ================================================================
import { supabase } from "@/integrations/supabase/client";

export const GIFT_CARD_TIERS = {
  Silver:   { value: 220,  grace: 15,  label: "Silver",          color: "#A8A29E" },
  Gold:     { value: 450,  grace: 15,  label: "Gold",            color: "#B8975A" },
  Platinum: { value: 650,  grace: 15,  label: "Platinum",        color: "#6B7280" },
  Diamond:  { value: 1000, grace: 50,  label: "Diamond Luxury Pass", color: "#4F46E5" },
} as const;

export type GiftCardTier = keyof typeof GIFT_CARD_TIERS;

// Generate a random redeemable code e.g. GOLD-X7K2-9QMT
export function generateRedeemableCode(tier: GiftCardTier): string {
  const prefix = tier.substring(0, 3).toUpperCase();
  const part1 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const part2 = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${part1}-${part2}`;
}

// Generate serial number for physical card e.g. ZLR-GLD-0047
export function generateSerialNumber(tier: GiftCardTier, sequence: number): string {
  const prefix = tier.substring(0, 3).toUpperCase();
  const seq = String(sequence).padStart(4, "0");
  return `ZLR-${prefix}-${seq}`;
}

// Get next sequence number for physical cards
export async function getNextPhysicalSequence(): Promise<number> {
  const { count } = await (supabase as any)
    .from("gift_cards")
    .select("*", { count: "exact", head: true })
    .eq("card_type", "physical");
  return (count || 0) + 1;
}

// Create a digital gift card purchase (pending payment)
export async function createDigitalPurchase(opts: {
  tier: GiftCardTier;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  recipientName: string;
  recipientEmail: string;
  message?: string;
}): Promise<{ id: string | null; code: string | null; error: string | null }> {
  try {
    const tier = GIFT_CARD_TIERS[opts.tier];
    const code = generateRedeemableCode(opts.tier);
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const { data, error } = await (supabase as any)
      .from("gift_cards")
      .insert({
        code,
        amount: tier.value,
        balance: tier.value,
        tier: opts.tier,
        card_type: "digital",
        delivery_type: "email",
        buyer_name: opts.buyerName,
        buyer_email: opts.buyerEmail,
        buyer_phone: opts.buyerPhone,
        recipient_name: opts.recipientName,
        recipient_email: opts.recipientEmail,
        purchaser_email: opts.buyerEmail,
        message: opts.message || null,
        status: "pending_payment",
        payment_status: "pending",
        is_admin_generated: false,
        expires_at: expiresAt.toISOString(),
      })
      .select("id, code")
      .single();

    if (error) throw error;
    return { id: data.id, code: data.code, error: null };
  } catch (err: any) {
    return { id: null, code: null, error: err.message };
  }
}

// Mark gift card as paid and queue the email (called by Hubtel webhook or manual confirm)
export async function markGiftCardPaid(giftCardId: string, paymentRef: string): Promise<{ error: string | null }> {
  try {
    const { error } = await (supabase as any)
      .from("gift_cards")
      .update({
        payment_ref: paymentRef,
        payment_status: "paid",
        status: "pending_send", // triggers email edge function
      })
      .eq("id", giftCardId);

    if (error) throw error;
    return { error: null };
  } catch (err: any) {
    return { error: err.message };
  }
}

// Admin: generate a batch of physical cards
export async function generatePhysicalBatch(opts: {
  tier: GiftCardTier;
  quantity: number;
  batchId: string;
  adminUserId: string;
}): Promise<{ cards: any[]; error: string | null }> {
  try {
    // Get current max sequence for serial numbers
    const { data: existing } = await (supabase as any)
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
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const cards = Array.from({ length: opts.quantity }, (_, i) => ({
      code: generateRedeemableCode(opts.tier),
      serial_number: generateSerialNumber(opts.tier, startSeq + i),
      amount: tierConfig.value,
      balance: tierConfig.value,
      tier: opts.tier,
      card_type: "physical",
      delivery_type: "physical",
      status: "available",
      payment_status: "pending",
      batch_id: opts.batchId,
      is_admin_generated: true,
      expires_at: expiresAt.toISOString(),
    }));

    const { data, error } = await (supabase as any)
      .from("gift_cards")
      .insert(cards)
      .select();

    if (error) throw error;
    return { cards: data, error: null };
  } catch (err: any) {
    return { cards: [], error: err.message };
  }
}

// Redeem a gift card at checkout
export async function redeemGiftCardAtCheckout(opts: {
  code: string;
  serviceAmount: number;
  clientName: string;
  staffId?: string;
}): Promise<{
  valid: boolean;
  card: any | null;
  amountApplied: number;
  remainder: number;
  error: string | null;
}> {
  try {
    const { data: card, error } = await (supabase as any)
      .from("gift_cards")
      .select("*")
      .eq("code", opts.code.trim().toUpperCase())
      .eq("status", "active")
      .eq("payment_status", "paid")
      .maybeSingle();

    if (error) throw error;
    if (!card) return { valid: false, card: null, amountApplied: 0, remainder: 0, error: "Invalid or already used gift card." };

    // Check expiry
    if (card.expires_at && new Date(card.expires_at) < new Date()) {
      return { valid: false, card: null, amountApplied: 0, remainder: 0, error: "This gift card has expired." };
    }

    const tierConfig = GIFT_CARD_TIERS[card.tier as GiftCardTier];
    const grace = tierConfig?.grace || 0;
    const effectiveBalance = card.balance + grace;
    const amountApplied = Math.min(card.balance, opts.serviceAmount);
    const remainder = Math.max(0, opts.serviceAmount - effectiveBalance);

    // Mark as redeemed
    await (supabase as any)
      .from("gift_cards")
      .update({
        status: "redeemed",
        balance: 0,
        redeemed_at: new Date().toISOString(),
        redeemed_by_client: opts.clientName,
      })
      .eq("id", card.id);

    return { valid: true, card, amountApplied, remainder, error: null };
  } catch (err: any) {
    return { valid: false, card: null, amountApplied: 0, remainder: 0, error: err.message };
  }
}

// Fetch pending deposit bookings (for receptionist/admin dashboard)
export async function fetchPendingDepositBookings(): Promise<{ data: any[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("deposit_paid", false)
      .not("status", "eq", "cancelled")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err: any) {
    return { data: [], error: err.message };
  }
}
