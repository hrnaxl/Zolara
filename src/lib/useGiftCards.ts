import { useState, useEffect, useCallback } from "react";
import { sendGiftCardEmail } from "./email";
import { supabase } from "@/integrations/supabase/client";
import { supabaseAdmin } from "@/integrations/supabase/adminClient";

export type GiftCard = {
  id: string;
  final_code: string;
  tier?: string | null;
  year?: number | null;
  batch?: string | null;
  card_value?: number | null;
  status?: string | null;
  date_generated?: string | null;
  expire_at?: string | null;
  allowed_service_ids?: string[] | null;
  allowed_service_categories?: string[] | null;
  created_by?: string | null;
  created_at?: string | null;
  redeemed_at?: string | null;
  redeemed_by?: string | null;
};

export type GiftCardFetchOptions = {
  status?: string;
  tier?: string;
  year?: number;
  limit?: number;
  offset?: number;
  orderBy?: { column: string; ascending?: boolean };
};

/**
 * Fetch gift cards with optional filters. Returns { data, error } where data is GiftCard[]
 * Note: we cast supabase to any for the new tables/RPCs until the typed client is regenerated.
 */
export async function fetchGiftCards(opts: GiftCardFetchOptions = {}) {
  const { status, tier, year, limit = 100, offset = 0, orderBy } = opts;
  try {
    let q: any = (supabaseAdmin as any).from("gift_cards").select("*");
    if (status && status !== "all") q = q.eq("status", status);
    if (tier) q = q.eq("tier", tier);
    if (year) q = q.eq("year", year);
    if (orderBy)
      q = q.order(orderBy.column, { ascending: !!orderBy.ascending });
    q = q.range(offset, offset + Math.max(0, limit - 1));
    const { data, error } = await q;
    if (error) throw error;
    return { data: (data as GiftCard[]) || [], error: null };
  } catch (error: any) {
    return { data: [] as GiftCard[], error };
  }
}

/**
 * Import gift cards via the RPC. Accepts an array of objects matching the RPC expectations.
 * Returns { data, error } where data is the RPC result (array of rows with status per row).
 */
export async function importGiftCards(rows: Record<string, any>[]) {
  try {
    const { data, error } = await (supabaseAdmin as any).from("gift_cards").insert(rows);

    if (error) throw error;

    return { data: data || [], error: null };
  } catch (error: any) {
    return { data: [], error };
  }
}

/**
 * Redeem a gift card via RPC. Returns { data, error }. data is the rpc_redeem_gift_card return table.
 */
export async function redeemGiftCard({
  code,
  bookingId,
  clientId,
  staffId,
  serviceIds,
}: {
  code: string;
  bookingId?: string | null;
  clientId?: string | null;
  staffId?: string | null;
  serviceIds?: string[] | null;
}) {
  try {
    const { data, error } = await (supabase as any).rpc(
      "rpc_redeem_gift_card",
      {
        p_code: code,
        p_booking_id: bookingId ?? null,
        p_client_id: clientId ?? null,
        p_staff_id: staffId ?? null,
        p_service_ids: serviceIds ?? null,
      }
    );

    if (error) throw error;
    return { data: data?.[0] ?? null, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Validate a gift card code using the defensive RPC. Returns { data, error } where data is the rpc_validate_gift_card return table
 */
export async function validateGiftCard(code: string, serviceId?: string | null) {
  try {
    const { data, error } = await (supabase as any).rpc(
      "rpc_validate_gift_card",
      {
        p_code: code,
        p_service_id: serviceId ?? null,
      }
    );

    if (error) throw error;
    return { data: data?.[0] ?? null, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Check which of the provided codes already exist in DB. Returns array of existing final_code strings.
 */
export async function checkExistingGiftCards(codes: string[]) {
  try {
    if (!codes || codes.length === 0)
      return { data: [] as string[], error: null };
    const { data, error } = await (supabase as any)
      .from("gift_cards")
      .select("final_code")
      .in("final_code", codes);
    if (error) throw error;
    return {
      data: (data || []).map((r: any) => r.final_code as string),
      error: null,
    };
  } catch (error: any) {
    return { data: [] as string[], error };
  }
}

export async function voidGiftCard(id: string) {
  try {
    const { error } = await (supabaseAdmin as any)
      .from("gift_cards")
      .update({ payment_status: "voided", note: "Voided by admin" })
      .eq("id", id);
    if (error) throw error;
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error };
  }
}

export async function expireGiftCard(id: string) {
  try {
    const { error } = await (supabaseAdmin as any)
      .from("gift_cards")
      .update({ payment_status: "expired", expires_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error };
  }
}

export async function deleteGiftCard(id: string) {
  try {
    const { error } = await (supabaseAdmin as any)
      .from("gift_cards")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error };
  }
}

/**
 * Lookup a gift card by its code (case-insensitive). Returns single GiftCard or null.
 */
export async function getGiftCardByCode(code: string) {
  if (!code)
    return { data: null as GiftCard | null, error: new Error("code required") };
  try {
    // normalize code matching by upper-case final_code
    const { data, error } = await (supabase as any)
      .from("gift_cards")
      .select("*")
      .ilike("final_code", code)
      .limit(1)
      .single();
    if (error) {
      // If not found, Supabase returns 406 or 404 depending on settings; handle gracefully
      if ((error.status === 406 || error.status === 404) && !data)
        return { data: null, error: null };
      throw error;
    }
    return { data: data as GiftCard, error: null };
  } catch (err: any) {
    return { data: null as GiftCard | null, error: err };
  }
}

/**
 * React hook wrapping fetchGiftCards for simple admin lists. Supports basic filters and refresh.
 */
export function useGiftCards(initialOpts: GiftCardFetchOptions = {}) {
  const [opts, setOpts] = useState<GiftCardFetchOptions>(initialOpts);
  const [items, setItems] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const load = useCallback(
    async (override?: GiftCardFetchOptions) => {
      setLoading(true);
      setError(null);
      const merged = { ...opts, ...(override || {}) };
      try {
        const res = await fetchGiftCards(merged);
        if (res.error) throw res.error;
        setItems(res.data || []);
      } catch (err: any) {
        setError(err);
      } finally {
        setLoading(false);
      }
    },
    [opts]
  );

  useEffect(() => {
    void load();
  }, [opts, load]);

  return {
    items,
    loading,
    error,
    refresh: () => load(),
    setFilters: (next: GiftCardFetchOptions) =>
      setOpts((s) => ({ ...s, ...next })),
  } as const;
}

export default useGiftCards;

export async function markGiftCardSold(id: string) {
  try {
    const { error } = await (supabaseAdmin as any)
      .from("gift_cards")
      .update({ payment_status: "paid", status: "active" })
      .eq("id", id);
    if (error) throw error;
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error };
  }
}

export async function resendGiftCardEmail(id: string) {
  try {
    // Fetch the card
    const { data: card, error: fetchErr } = await (supabaseAdmin as any)
      .from("gift_cards")
      .select("*")
      .eq("id", id)
      .single();
    if (fetchErr) throw new Error("DB error: " + fetchErr.message);
    if (!card) throw new Error("Card not found");

    // Get email address — try recipient first, then buyer
    const emailTo = card.recipient_email || card.buyer_email;
    if (!emailTo) throw new Error("No email address on this card. Update the card with an email first.");

    // Send directly via API route — no wrapper that can silently fail
    const res = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: emailTo,
        subject: "Your Zolara " + (card.tier || "") + " Gift Card",
        html: buildGiftCardEmailHtml(card),
      }),
    });
    const resData = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(resData.error || "Resend API returned " + res.status);

    // Mark card as active/paid after successful send
    await (supabaseAdmin as any)
      .from("gift_cards")
      .update({ status: "active", payment_status: "paid" })
      .eq("id", id);

    return { success: true, error: null };
  } catch (error: any) {
    console.error("resendGiftCardEmail:", error.message);
    return { success: false, error };
  }
}

function buildGiftCardEmailHtml(card: any): string {
  const amount = Number(card.amount || 0);
  const code = card.code || "";
  const tier = card.tier || "Gold";
  const recipient = card.recipient_name || card.buyer_name || "there";
  const buyer = card.buyer_name || "";
  const message = card.message || "";
  const colors: Record<string,string> = {
    Bronze:"#CD7F32", Silver:"#9CA3AF", Gold:"#B8975A", Platinum:"#6B7280", Diamond:"#6366F1"
  };
  const color = colors[tier] || "#B8975A";
  return [
    '<!DOCTYPE html><html><head><meta charset="utf-8"></head>',
    '<body style="margin:0;padding:0;background:#F5EFE6;font-family:Helvetica,Arial,sans-serif;">',
    '<div style="max-width:560px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">',
    '<div style="background:#0F1E35;padding:32px 40px;text-align:center;">',
    '<div style="color:#B8975A;font-size:28px;font-weight:300;letter-spacing:4px;">ZOLARA</div>',
    '<div style="color:#9CA3AF;font-size:11px;letter-spacing:3px;margin-top:4px;">BEAUTY STUDIO</div>',
    '</div>',
    '<div style="padding:32px 40px;">',
    '<div style="background:' + color + ';border-radius:12px;padding:28px;margin-bottom:24px;text-align:center;">',
    '<div style="color:rgba(255,255,255,0.8);font-size:10px;letter-spacing:3px;margin-bottom:12px;">ZOLARA BEAUTY STUDIO</div>',
    '<div style="color:white;font-size:38px;font-weight:700;">GH₵ ' + amount.toLocaleString() + '</div>',
    '<div style="color:rgba(255,255,255,0.8);font-size:11px;letter-spacing:4px;margin-top:8px;">' + tier.toUpperCase() + ' GIFT CARD</div>',
    '</div>',
    '<p style="color:#1C1917;font-size:16px;margin:0 0 12px;">Hello ' + recipient + ',</p>',
    '<p style="color:#78716C;font-size:14px;line-height:1.7;margin:0 0 24px;">',
    'You have received a Zolara Beauty Studio gift card worth <strong>GH₵ ' + amount.toLocaleString() + '</strong>' +
    (buyer ? ' from <strong>' + buyer + '</strong>' : '') + '.' +
    (message ? '<br><br><em>&ldquo;' + message + '&rdquo;</em>' : ''),
    '</p>',
    '<div style="background:#FAFAF8;border:2px dashed #B8975A;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">',
    '<div style="font-size:11px;color:#78716C;letter-spacing:2px;margin-bottom:10px;">YOUR GIFT CARD CODE</div>',
    '<div style="font-size:28px;font-weight:700;color:#0F1E35;letter-spacing:5px;font-family:monospace;">' + code + '</div>',
    '<div style="font-size:11px;color:#A8A29E;margin-top:10px;">Present this code at checkout</div>',
    '</div>',
    '<div style="text-align:center;margin-bottom:32px;">',
    '<a href="https://zolarasalon.com/book" style="background:#B8975A;color:white;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block;">Book Your Appointment</a>',
    '</div>',
    '</div>',
    '<div style="background:#F5EFE6;padding:20px 40px;text-align:center;">',
    '<div style="color:#78716C;font-size:12px;">Sakasaka, Opposite CalBank, Tamale</div>',
    '<div style="color:#A8A29E;font-size:11px;margin-top:4px;">0594365314 &middot; zolarasalon.com &middot; @zolarastudio</div>',
    '</div>',
    '</div></body></html>',
  ].join("");
}
