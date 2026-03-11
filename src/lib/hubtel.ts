// ================================================================
// HUBTEL PAYMENT - Direct URL redirect approach
// SDK source: @hubteljs/checkout@1.1.4
// Checkout goes to: https://unified-pay.hubtel.com/pay?p=<base64>
// ================================================================

const HUBTEL_CLIENT_ID = import.meta.env.VITE_HUBTEL_CLIENT_ID || "D0jDmnq";
const HUBTEL_CLIENT_SECRET = import.meta.env.VITE_HUBTEL_CLIENT_SECRET || "b55d6377fd6b459fbb07fb1492d36ccf";
const HUBTEL_MERCHANT_ACCOUNT = import.meta.env.VITE_HUBTEL_MERCHANT_ACCOUNT || "233594922679";
const HUBTEL_BASE_URL = "https://unified-pay.hubtel.com";

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

function buildHubtelUrl(payload: HubtelCheckoutPayload): string {
  const basicAuth = btoa(`${HUBTEL_CLIENT_ID}:${HUBTEL_CLIENT_SECRET}`);

  const data: Record<string, any> = {
    amount: payload.amount,
    purchaseDescription: payload.description,
    customerPhoneNumber: payload.customerPhone || "",
    clientReference: payload.clientReference,
    callbackUrl: payload.callbackUrl,
    merchantAccount: HUBTEL_MERCHANT_ACCOUNT,
    basicAuth: basicAuth,
    branding: "enabled",
    returnUrl: payload.returnUrl,
    cancellationUrl: payload.cancellationUrl,
  };

  const queryString = Object.keys(data)
    .filter((k) => data[k] !== null && data[k] !== undefined)
    .map((k) => `${k}=${encodeURIComponent(data[k])}`)
    .join("&");

  const encoded = btoa(unescape(encodeURIComponent(queryString)));
  return `${HUBTEL_BASE_URL}/pay?p=${encodeURIComponent(encoded)}`;
}

export async function initiateCheckout(payload: HubtelCheckoutPayload): Promise<HubtelCheckoutResult> {
  try {
    const checkoutUrl = buildHubtelUrl(payload);
    console.log("[Hubtel] Redirecting to:", checkoutUrl);
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
