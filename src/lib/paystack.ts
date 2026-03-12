// Paystack payment utility — replaces Hubtel
// Secret key lives only in edge functions. Public key used for frontend only.

export const PAYSTACK_PUBLIC_KEY = "pk_live_94ba104d1a317293c36d777871df51a0ccc617d9";
const SUPABASE_URL = "https://vwvrhbyfytmqsywfdhvd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dnJoYnlmeXRtcXN5d2ZkaHZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTA1MTQsImV4cCI6MjA4ODcyNjUxNH0.UFzTXEiS-dPXDoeSJSVfQGkRUuFA1aNQxHWu6jk62L4";

export type PaystackInitPayload = {
  amount: number;             // in GHS (we convert to pesewas in edge fn)
  email: string;
  reference: string;          // unique, stored as clientReference in DB
  metadata?: Record<string, any>;
  callbackUrl: string;
};

export type PaystackInitResult = {
  authorizationUrl: string | null;
  reference: string | null;
  error: string | null;
};

/** Initialise a Paystack transaction via edge function (keeps secret key server-side) */
export async function initiatePaystackPayment(payload: PaystackInitPayload): Promise<PaystackInitResult> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/paystack-init`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || data.error) return { authorizationUrl: null, reference: null, error: data.error || "Payment init failed" };
    return { authorizationUrl: data.authorizationUrl, reference: payload.reference, error: null };
  } catch (err: any) {
    return { authorizationUrl: null, reference: null, error: err.message };
  }
}

export function isPaystackConfigured(): boolean { return true; }
