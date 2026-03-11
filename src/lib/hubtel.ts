// ================================================================
// HUBTEL PAYMENT GATEWAY
// Placeholder — swap in real credentials when account is approved
// ================================================================

// TODO: Replace with real Hubtel credentials when account is ready
const HUBTEL_CLIENT_ID = import.meta.env.VITE_HUBTEL_CLIENT_ID || "PENDING";
const HUBTEL_CLIENT_SECRET = import.meta.env.VITE_HUBTEL_CLIENT_SECRET || "PENDING";
const HUBTEL_MERCHANT_ACCOUNT = import.meta.env.VITE_HUBTEL_MERCHANT_ACCOUNT || "PENDING";
const BASE_URL = "https://api.hubtel.com/v1";

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
    const response = await fetch(`${BASE_URL}/merchantaccount/merchants/${HUBTEL_MERCHANT_ACCOUNT}/receive/online`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Basic " + btoa(`${HUBTEL_CLIENT_ID}:${HUBTEL_CLIENT_SECRET}`),
      },
      body: JSON.stringify({
        totalAmount: payload.amount,
        description: payload.description,
        callbackUrl: payload.callbackUrl,
        returnUrl: payload.returnUrl,
        cancellationUrl: payload.cancellationUrl,
        merchantAccountNumber: HUBTEL_MERCHANT_ACCOUNT,
        clientReference: payload.clientReference,
        customerInfo: {
          customerName: payload.customerName,
          customerEmail: payload.customerEmail || "",
          customerMsisdn: payload.customerPhone || "",
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Hubtel checkout failed");

    return {
      checkoutUrl: data.data?.checkoutDirectUrl || null,
      paymentRef: data.data?.clientReference || null,
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
    const response = await fetch(`${BASE_URL}/merchantaccount/merchants/${HUBTEL_MERCHANT_ACCOUNT}/receive/mobilemoney`, {
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
  return HUBTEL_CLIENT_ID !== "PENDING";
}
