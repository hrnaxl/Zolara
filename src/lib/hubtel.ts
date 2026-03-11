const SUPABASE_URL = "https://vwvrhbyfytmqsywfdhvd.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dnJoYnlmeXRtcXN5d2ZkaHZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTA1MTQsImV4cCI6MjA4ODcyNjUxNH0.UFzTXEiS-dPXDoeSJSVfQGkRUuFA1aNQxHWu6jk62L4";

export type HubtelCheckoutPayload = {
  amount: number;
  description: string;
  clientReference: string;
  callbackUrl: string;
  returnUrl: string;
  cancellationUrl: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
};

export type HubtelCheckoutResult = {
  checkoutUrl: string | null;
  paymentRef: string | null;
  error: string | null;
};

export async function initiateCheckout(payload: HubtelCheckoutPayload): Promise<HubtelCheckoutResult> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/smart-processor`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_ANON}`,
        "apikey": SUPABASE_ANON,
      },
      body: JSON.stringify(payload),
    });

    let data: any;
    try { data = await response.json(); } catch { throw new Error(`Edge function status ${response.status}`); }
    if (!response.ok) throw new Error(data?.error || data?.message || `Error ${response.status}`);

    const checkoutUrl =
      data?.data?.checkoutDirectUrl ||
      data?.Data?.CheckoutDirectUrl ||
      data?.checkoutDirectUrl ||
      data?.checkoutUrl ||
      null;

    return { checkoutUrl, paymentRef: payload.clientReference, error: null };
  } catch (err: any) {
    return { checkoutUrl: null, paymentRef: null, error: err.message };
  }
}

export async function initiateMoMoCollect(payload: {
  amount: number;
  customerPhone: string;
  description: string;
  clientReference: string;
}): Promise<{ success: boolean; error: string | null }> {
  return { success: false, error: "Use online checkout instead" };
}

export function isHubtelConfigured(): boolean {
  return true;
}
