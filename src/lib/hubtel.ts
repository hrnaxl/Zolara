const HUBTEL_CLIENT_ID = import.meta.env.VITE_HUBTEL_CLIENT_ID || "noDLLP";
const HUBTEL_CLIENT_SECRET = import.meta.env.VITE_HUBTEL_CLIENT_SECRET || "51c9ad0e01864fd8b214a39a7ca92c44";
const HUBTEL_MERCHANT_ACCOUNT = import.meta.env.VITE_HUBTEL_MERCHANT_ACCOUNT || "233594922679";
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
      body: JSON.stringify({
        amount: payload.amount,
        description: payload.description,
        callbackUrl: payload.callbackUrl,
        returnUrl: payload.returnUrl,
        cancellationUrl: payload.cancellationUrl,
        clientReference: payload.clientReference,
        customerName: payload.customerName,
        customerEmail: payload.customerEmail || "",
        customerPhone: payload.customerPhone || "",
      }),
    });

    let data: any;
    try { data = await response.json(); } catch { throw new Error(`Edge function status ${response.status} — no JSON`); }

    if (!response.ok) throw new Error(data?.error || data?.message || data?.Message || `Error ${response.status}`);

    const checkoutUrl =
      data?.data?.checkoutDirectUrl ||
      data?.Data?.CheckoutDirectUrl ||
      data?.checkoutDirectUrl ||
      null;

    return { checkoutUrl, paymentRef: data?.data?.clientReference || payload.clientReference, error: null };
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
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/smart-processor`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_ANON}`,
        "apikey": SUPABASE_ANON,
      },
      body: JSON.stringify({
        amount: payload.amount,
        description: payload.description,
        clientReference: payload.clientReference,
        customerPhone: payload.customerPhone,
        momo: true,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || data?.message || "MoMo collect failed");
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function isHubtelConfigured(): boolean {
  return true;
}
