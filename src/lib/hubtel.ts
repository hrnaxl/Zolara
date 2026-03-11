// ================================================================
// HUBTEL PAYMENT - JS SDK approach (modal-based, no server API call)
// SDK docs: https://www.npmjs.com/package/@hubteljs/checkout
// ================================================================

const HUBTEL_CLIENT_ID = import.meta.env.VITE_HUBTEL_CLIENT_ID || "D0jDmnq";
const HUBTEL_CLIENT_SECRET = import.meta.env.VITE_HUBTEL_CLIENT_SECRET || "b55d6377fd6b459fbb07fb1492d36ccf";
const HUBTEL_MERCHANT_ACCOUNT = Number(import.meta.env.VITE_HUBTEL_MERCHANT_ACCOUNT || "3746502");

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

function loadHubtelSDK(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).HubtelCheckout) {
      resolve((window as any).HubtelCheckout);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@hubteljs/checkout@1.1.4/dist/index.js";
    script.onload = () => {
      if ((window as any).HubtelCheckout) {
        resolve((window as any).HubtelCheckout);
      } else {
        reject(new Error("Hubtel SDK loaded but HubtelCheckout not found on window"));
      }
    };
    script.onerror = () => reject(new Error("Failed to load Hubtel SDK from CDN"));
    document.head.appendChild(script);
  });
}

export async function initiateCheckout(payload: HubtelCheckoutPayload): Promise<HubtelCheckoutResult> {
  return new Promise(async (resolve) => {
    try {
      const HubtelCheckoutSDK = await loadHubtelSDK();
      const checkout = new HubtelCheckoutSDK();
      const basicAuth = btoa(`${HUBTEL_CLIENT_ID}:${HUBTEL_CLIENT_SECRET}`);

      checkout.openModal({
        purchaseInfo: {
          amount: payload.amount,
          purchaseDescription: payload.description,
          customerPhoneNumber: payload.customerPhone || "",
          clientReference: payload.clientReference,
        },
        config: {
          branding: "enabled",
          callbackUrl: payload.callbackUrl,
          merchantAccount: HUBTEL_MERCHANT_ACCOUNT,
          basicAuth: basicAuth,
          allowedChannels: ["mobileMoney", "bankCard"],
        },
        callBacks: {
          onInit: () => console.log("[Hubtel] Modal initialized"),
          onPaymentSuccess: (data: any) => {
            console.log("[Hubtel] Payment success:", data);
            checkout.closePopUp?.();
            // Redirect to return URL on success
            window.location.href = payload.returnUrl;
            resolve({ checkoutUrl: null, paymentRef: payload.clientReference, error: null });
          },
          onPaymentFailure: (data: any) => {
            console.log("[Hubtel] Payment failure:", data);
            checkout.closePopUp?.();
            resolve({ checkoutUrl: null, paymentRef: null, error: "Payment failed or cancelled" });
          },
          onLoad: () => console.log("[Hubtel] Modal loaded"),
          onClose: () => {
            console.log("[Hubtel] Modal closed");
            resolve({ checkoutUrl: null, paymentRef: null, error: "Payment cancelled" });
          },
        },
      });

      // Resolve with a special flag so the caller knows modal is open (not a redirect)
      resolve({ checkoutUrl: "modal://open", paymentRef: payload.clientReference, error: null });
    } catch (err: any) {
      console.error("[Hubtel] SDK error:", err);
      resolve({ checkoutUrl: null, paymentRef: null, error: err.message });
    }
  });
}

export async function initiateMoMoCollect(payload: {
  amount: number;
  customerPhone: string;
  description: string;
  clientReference: string;
}): Promise<{ success: boolean; error: string | null }> {
  return { success: false, error: "MoMo direct collect not supported in SDK mode" };
}

export function isHubtelConfigured(): boolean {
  return true;
}
