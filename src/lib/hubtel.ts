const HUBTEL_CLIENT_ID = import.meta.env.VITE_HUBTEL_CLIENT_ID || "noDLLP";
const HUBTEL_CLIENT_SECRET = import.meta.env.VITE_HUBTEL_CLIENT_SECRET || "51c9ad0e01864fd8b214a39a7ca92c44";
const HUBTEL_MERCHANT_ACCOUNT = import.meta.env.VITE_HUBTEL_MERCHANT_ACCOUNT || "233594922679";
const BASE_URL = "https://api-txnghana.hubtel.com";

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
    const auth = btoa(`${HUBTEL_CLIENT_ID}:${HUBTEL_CLIENT_SECRET}`);
    const url = `${BASE_URL}/v1/merchantaccount/merchants/${HUBTEL_MERCHANT_ACCOUNT}/receive/online`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${auth}`,
      },
      body: JSON.stringify({
        TotalAmount: payload.amount,
        Description: payload.description,
        CallbackUrl: payload.callbackUrl,
        ReturnUrl: payload.returnUrl,
        CancellationUrl: payload.cancellationUrl,
        ClientReference: payload.clientReference,
        Store: {
          Id: "zolara",
          Name: "Zolara Beauty Studio",
          TagLine: "Luxury salon experience in Tamale",
          LogoUrl: "https://zolarasalon.com/logo.png",
        },
        Customer: {
          Name: payload.customerName || "",
          Email: payload.customerEmail || "",
          PhoneNumber: payload.customerPhone || "",
        },
      }),
    });

    let data: any;
    try { data = await response.json(); } catch { throw new Error(`Hubtel status ${response.status} — no JSON response`); }

    if (!response.ok) throw new Error(data?.message || data?.Message || data?.error || `Hubtel error ${response.status}`);

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
    const response = await fetch(`${BASE_URL}/v1/merchantaccount/merchants/${HUBTEL_MERCHANT_ACCOUNT}/receive/mobilemoney`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Basic " + btoa(`${HUBTEL_CLIENT_ID}:${HUBTEL_CLIENT_SECRET}`),
      },
      body: JSON.stringify({
        Amount: payload.amount,
        CustomerMsisdn: payload.customerPhone,
        Channel: "mtn-gh",
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
