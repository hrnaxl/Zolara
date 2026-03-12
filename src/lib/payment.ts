// Payment gateway — clean slate
// Using Paystack inline JS SDK (no API calls, no secret key, no edge functions)

export const PAYSTACK_PUBLIC_KEY = "pk_live_94ba104d1a317293c36d777871df51a0ccc617d9";

export type PaymentPayload = {
  amount: number;       // in GHS
  email: string;
  phone?: string;
  reference: string;
  metadata?: Record<string, any>;
  onSuccess: (reference: string) => void;
  onClose: () => void;
};

// Load Paystack inline script once
let scriptLoaded = false;
function loadPaystackScript(): Promise<void> {
  return new Promise((resolve) => {
    if (scriptLoaded || (window as any).PaystackPop) { resolve(); return; }
    const s = document.createElement("script");
    s.src = "https://js.paystack.co/v1/inline.js";
    s.onload = () => { scriptLoaded = true; resolve(); };
    document.head.appendChild(s);
  });
}

export async function openPaystackPopup(payload: PaymentPayload): Promise<void> {
  await loadPaystackScript();
  const handler = (window as any).PaystackPop.setup({
    key: PAYSTACK_PUBLIC_KEY,
    email: payload.email,
    amount: Math.round(payload.amount * 100), // pesewas
    currency: "GHS",
    ref: payload.reference,
    metadata: payload.metadata || {},
    onClose: payload.onClose,
    callback: (response: any) => {
      payload.onSuccess(response.reference || payload.reference);
    },
  });
  handler.openIframe();
}
