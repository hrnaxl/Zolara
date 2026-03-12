// Paystack payment utility
// Uses Paystack's frontend SDK approach — public key only, no edge function needed for init

export const PAYSTACK_PUBLIC_KEY = "pk_live_94ba104d1a317293c36d777871df51a0ccc617d9";

export type PaystackInitPayload = {
  amount: number;         // in GHS
  email: string;
  reference: string;
  metadata?: Record<string, any>;
  callbackUrl: string;
};

export type PaystackInitResult = {
  authorizationUrl: string | null;
  reference: string | null;
  error: string | null;
};

/** Initialise a Paystack transaction directly via Paystack API using public key */
export async function initiatePaystackPayment(payload: PaystackInitPayload): Promise<PaystackInitResult> {
  try {
    const pesewas = Math.round(Number(payload.amount) * 100);

    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PAYSTACK_PUBLIC_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: payload.email,
        amount: pesewas,
        reference: payload.reference,
        currency: "GHS",
        callback_url: payload.callbackUrl,
        metadata: payload.metadata || {},
      }),
    });

    const data = await res.json();
    if (!data.status) {
      return { authorizationUrl: null, reference: null, error: data.message || "Payment init failed" };
    }

    return {
      authorizationUrl: data.data.authorization_url,
      reference: data.data.reference,
      error: null,
    };
  } catch (err: any) {
    return { authorizationUrl: null, reference: null, error: err.message };
  }
}

export function isPaystackConfigured(): boolean { return true; }
