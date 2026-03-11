// ================================================================
// HUBTEL PAYMENT GATEWAY
// Placeholder — swap in real credentials when account is approved
// ================================================================

const HUBTEL_CLIENT_ID = import.meta.env.VITE_HUBTEL_CLIENT_ID || "noDLLP";
const HUBTEL_CLIENT_SECRET = import.meta.env.VITE_HUBTEL_CLIENT_SECRET || "51c9ad0e01864fd8b214a39a7ca92c44";
const HUBTEL_MERCHANT_ACCOUNT = import.meta.env.VITE_HUBTEL_MERCHANT_ACCOUNT || "233594922679";
const BASE_URL = "https://api-txnghana.hubtel.com";

export type HubtelCheckoutPayload = {
  amount: number;
  description: string;
  clientReference: string;   // our internal ref (booking_ref, purchase id)
  callbackUrl: string;       // webhook URL (Supabase edge function)
  returnUrl: string;         // redirect after payment
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

/**
 * Initiate a Hubtel hosted checkout.
 * Returns the URL to redirect the customer to.
 * PLACEHOLDER: returns mock data until credentials are live.
 */
export async function initiateCheckout(payload: HubtelCheckoutPayload): Promise<HubtelCheckoutResult> {
  // PLACEHOLDER — real implementation once Hubtel account is active
  if (HUBTEL_CLIENT_ID === "PENDING") {
    console.warn("[Hubtel] Credentials not configured — running in placeholder mode");
    // Simulate a checkout URL for testing
    return {
      checkoutUrl: null,
      paymentRef: `MOCK-${payload.clientReference}`,
      error: "Hubtel not configured yet. Payment will be marked as pending.",
    };
  }

  try {
    // Route through Supabase edge function to avoid CORS
    const SUPABASE_URL = "https://wbcuyabgzfqjarrpuocr.supabase.co";
    const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "ANON_KEY_PLACEHOLDER";
    const response = await fetch(`${SUPABASE_URL}/functions/v1/hubtel-checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON,
        "Authorization": `Bearer ${SUPABASE_ANON}`,
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

    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || JSON.stringify(data));

    return {
      checkoutUrl: data.data?.checkoutDirectUrl || data.Data?.CheckoutDirectUrl || null,
      paymentRef: data.data?.clientReference || payload.clientReference,
      error: null,
    };
  } catch (err: any) {
    return { checkoutUrl: null, paymentRef: null, error: err.message };
  }
}

/**
 * Initiate a MoMo collect (push payment) via Hubtel.
 * Used for in-store MoMo payments.
 */
export async function initiateMoMoCollect(payload: {
  amount: number;
  customerPhone: string;
  description: string;
  clientReference: string;
}): Promise<{ success: boolean; error: string | null }> {
  if (HUBTEL_CLIENT_ID === "PENDING") {
    console.warn("[Hubtel] Credentials not configured — MoMo collect placeholder");
    return { success: false, error: "Hubtel not configured yet." };
  }

  try {
    const response = await fetch(`${BASE_URL}/v1/merchantaccount/merchants/${HUBTEL_MERCHANT_ACCOUNT}/receive/mobilemoney`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Basic " + btoa(`${HUBTEL_CLIENT_ID}:${HUBTEL_CLIENT_SECRET}`),
      },
      body: JSON.stringify({
        Amount: payload.amount,
        CustomerMsisdn: payload.customerPhone,
        Channel: "mtn-gh", // auto-detect later
        PrimaryCallbackUrl: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hubtel-webhook`,
        ClientReference: payload.clientReference,
        Description: payload.description,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "MoMo collect failed");
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function isHubtelConfigured(): boolean {
  return true;
}
