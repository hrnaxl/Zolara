// ================================================================
// HUBTEL CHECKOUT PROXY — bypasses CORS for browser-initiated payments
// ================================================================
const HUBTEL_CLIENT_ID = Deno.env.get("HUBTEL_CLIENT_ID") || "noDLLP";
const HUBTEL_CLIENT_SECRET = Deno.env.get("HUBTEL_CLIENT_SECRET") || "51c9ad0e01864fd8b214a39a7ca92c44";
const HUBTEL_MERCHANT = Deno.env.get("HUBTEL_MERCHANT_ACCOUNT") || "233594922679";
const BASE_URL = "https://api-txnghana.hubtel.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { amount, description, clientReference, callbackUrl, returnUrl, cancellationUrl, customerName, customerEmail, customerPhone } = body;

    const response = await fetch(
      `${BASE_URL}/v1/merchantaccount/merchants/${HUBTEL_MERCHANT}/receive/online`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Basic " + btoa(`${HUBTEL_CLIENT_ID}:${HUBTEL_CLIENT_SECRET}`),
        },
        body: JSON.stringify({
          totalAmount: amount,
          description,
          callbackUrl,
          returnUrl,
          cancellationUrl,
          merchantAccountNumber: HUBTEL_MERCHANT,
          clientReference,
          customerInfo: {
            customerName,
            customerEmail: customerEmail || "",
            customerMsisdn: customerPhone || "",
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: data?.message || data?.ResponseMessage || JSON.stringify(data) }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
