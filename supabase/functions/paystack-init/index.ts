// Paystack transaction initializer — keeps secret key server-side
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY")!;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const { amount, email, reference, metadata, callbackUrl } = await req.json();
    if (!amount || !email || !reference) {
      return new Response(JSON.stringify({ error: "amount, email and reference are required" }), { status: 400, headers: cors });
    }

    // Paystack uses pesewas (1 GHS = 100 pesewas)
    const pesewas = Math.round(Number(amount) * 100);

    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: pesewas,
        reference,
        currency: "GHS",
        callback_url: callbackUrl,
        metadata: metadata || {},
      }),
    });

    const data = await res.json();
    if (!data.status) {
      return new Response(JSON.stringify({ error: data.message || "Paystack init failed" }), { status: 400, headers: cors });
    }

    return new Response(JSON.stringify({
      authorizationUrl: data.data.authorization_url,
      reference: data.data.reference,
    }), { headers: { ...cors, "Content-Type": "application/json" } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
});
