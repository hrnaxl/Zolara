const CLIENT_ID = Deno.env.get("HUBTEL_CLIENT_ID") || "noDLLP";
const CLIENT_SECRET = Deno.env.get("HUBTEL_CLIENT_SECRET") || "51c9ad0e01864fd8b214a39a7ca92c44";
const MERCHANT_ACCOUNT = Deno.env.get("HUBTEL_MERCHANT_ACCOUNT") || "233594922679";
const BASE_URL = "https://api-txnghana.hubtel.com";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  try {
    const body = await req.json();
    const {
      amount, description, callbackUrl, returnUrl,
      cancellationUrl, clientReference, customerName,
      customerEmail, customerPhone,
    } = body;

    const auth = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);

    const hubtelRes = await fetch(
      `${BASE_URL}/v1/merchantaccount/merchants/${MERCHANT_ACCOUNT}/receive/online`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${auth}`,
        },
        body: JSON.stringify({
          TotalAmount: amount,
          Description: description,
          CallbackUrl: callbackUrl,
          ReturnUrl: returnUrl,
          CancellationUrl: cancellationUrl,
          ClientReference: clientReference,
          Store: {
            Id: "zolara",
            Name: "Zolara Beauty Studio",
            TagLine: "Luxury salon experience in Tamale",
            LogoUrl: "https://zolarasalon.com/logo.png",
          },
          Customer: {
            Name: customerName || "",
            Email: customerEmail || "",
            PhoneNumber: customerPhone || "",
          },
        }),
      }
    );

    const text = await hubtelRes.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!hubtelRes.ok) {
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
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
