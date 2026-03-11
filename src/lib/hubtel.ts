// Hubtel checkout via direct URL redirect to unified-pay.hubtel.com
// This is exactly what the @hubteljs/checkout SDK does internally

// Hardcoded — Vercel env vars have stale/malformed values
const HUBTEL_CLIENT_ID = "D0jDmnq";
const HUBTEL_CLIENT_SECRET = "b55d6377fd6b459fbb07fb1492d36ccf";
const HUBTEL_MERCHANT_ACCOUNT = "233594922679";

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
    const basicAuth = btoa(`${HUBTEL_CLIENT_ID}:${HUBTEL_CLIENT_SECRET}`);

    // Ensure unique clientReference every time
    const uniqueRef = `${payload.clientReference}-${Date.now()}`;

    const params: Record<string, string> = {
      amount: String(payload.amount),
      purchaseDescription: payload.description,
      clientReference: uniqueRef,
      callbackUrl: payload.callbackUrl,
      returnUrl: payload.returnUrl,
      cancellationUrl: payload.cancellationUrl,
      merchantAccount: HUBTEL_MERCHANT_ACCOUNT,
      basicAuth: basicAuth,
      branding: "enabled",
    };

    if (payload.customerPhone) params.customerPhoneNumber = payload.customerPhone;

    const queryString = Object.entries(params)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&");

    const encoded = btoa(unescape(encodeURIComponent(queryString)));
    const checkoutUrl = `https://unified-pay.hubtel.com/pay?p=${encodeURIComponent(encoded)}`;

    console.log("[Hubtel] Redirecting to unified-pay, ref:", uniqueRef);
    return { checkoutUrl, paymentRef: uniqueRef, error: null };
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
