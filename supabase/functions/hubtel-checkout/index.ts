// DEPRECATED: Replaced by Paystack. Do not deploy.
const CLIENT_ID = Deno.env.get("HUBTEL_CLIENT_ID") || "D0jDmnq";
const CLIENT_SECRET = Deno.env.get("HUBTEL_CLIENT_SECRET") || "b55d6377fd6b459fbb07fb1492d36ccf";
const MERCHANT_ACCOUNT = Deno.env.get("HUBTEL_MERCHANT_ACCOUNT") || "3746502";

// LIVE endpoint (not sandbox payproxyapi, not unified-pay)
const HUBTEL_URL = "https://payproxy.hubtel.com/items/initiate";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  try {
    const body = await req.json();
    const auth = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);

    const hubtelPayload = {
      totalAmount: body.amount,
      description: body.description,
      callbackUrl: body.callbackUrl,
      returnUrl: body.returnUrl,
      cancellationUrl: body.cancellationUrl,
      merchantAccountNumber: MERCHANT_ACCOUNT,
      clientReference: body.clientReference,
    };

    console.log("Calling:", HUBTEL_URL);
    console.log("Payload:", JSON.stringify(hubtelPayload));

    const res = await fetch(HUBTEL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${auth}`,
      },
      body: JSON.stringify(hubtelPayload),
    });

    const text = await res.text();
    console.log("Hubtel status:", res.status, "Response:", text);

    let data: any;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: data?.message || data?.Message || text }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.log("Exception:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
