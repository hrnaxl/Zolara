const SB_URL = "https://vwvrhbyfytmqsywfdhvd.supabase.co";
const SB_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dnJoYnlmeXRtcXN5d2ZkaHZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1MDUxNCwiZXhwIjoyMDg4NzI2NTE0fQ.eR0ZA3z0V9OQXY5uokEtmnZq1c71EyjLD8mNsquvg54";
const ARKESEL_KEY = "S0JhVWFlcm1VV1pkSWJvWnpacEs";

function sbHeaders() {
  return {
    "Content-Type": "application/json",
    "apikey": SB_SERVICE_KEY,
    "Authorization": "Bearer " + SB_SERVICE_KEY,
    "Prefer": "return=representation",
  };
}

function normalizePhone(raw) {
  // Return intl format for SMS sending only
  let p = (raw || "").replace(/\s+/g, "").replace(/[^0-9+]/g, "");
  if (p.startsWith("+233")) p = "233" + p.slice(4);
  else if (p.startsWith("0")) p = "233" + p.slice(1);
  if (!p.startsWith("233")) p = "233" + p;
  return p;
}
function toLocalPhone(raw) {
  // Return 0XXXXXXXXX format for DB storage
  let p = (raw || "").replace(/\s+/g, "").replace(/[^0-9+]/g, "");
  if (p.startsWith("+233")) p = "0" + p.slice(4);
  else if (p.startsWith("233") && p.length >= 12) p = "0" + p.slice(3);
  else if (!p.startsWith("0")) p = "0" + p;
  return p;
}

function genOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function ensureOTPTable() {
  // Create table via Supabase REST if it doesn't exist
  const sql = `
    CREATE TABLE IF NOT EXISTS public.client_otp_codes (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      phone text NOT NULL,
      code text NOT NULL,
      expires_at timestamptz NOT NULL,
      used boolean DEFAULT false,
      created_at timestamptz DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS public.client_sessions (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      phone text NOT NULL,
      token text NOT NULL UNIQUE,
      expires_at timestamptz NOT NULL,
      created_at timestamptz DEFAULT now()
    );
  `;
  await fetch(`${SB_URL}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: sbHeaders(),
    body: JSON.stringify({ query: sql }),
  }).catch(() => {});
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { phone } = req.body || {};
    if (!phone) return res.status(400).json({ error: "Phone number required" });

    const normalized = normalizePhone(phone); // intl for SMS
    const normalizedLocal = toLocalPhone(phone); // local for DB
    if (normalized.length < 12) return res.status(400).json({ error: "Invalid phone number" });

    await ensureOTPTable();

    const code = genOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

    // Invalidate old codes for this phone
    await fetch(`${SB_URL}/rest/v1/client_otp_codes?phone=eq.${normalizedLocal}&used=eq.false`, {
      method: "PATCH",
      headers: sbHeaders(),
      body: JSON.stringify({ used: true }),
    });

    // Insert new OTP
    const insertRes = await fetch(`${SB_URL}/rest/v1/client_otp_codes`, {
      method: "POST",
      headers: sbHeaders(),
      body: JSON.stringify({ phone: normalizedLocal, code, expires_at: expiresAt, used: false }),
    });

    if (!insertRes.ok) {
      const err = await insertRes.text();
      // Table may not exist yet — try to create via a different method
      console.error("OTP insert failed:", err);
      return res.status(500).json({ error: "Could not create OTP. Please try again." });
    }

    // Send SMS via Arkesel
    const message = `Your Zolara Beauty Studio verification code is: ${code}\n\nValid for 10 minutes. Do not share this code.`;
    const smsRes = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
      method: "POST",
      headers: { "api-key": ARKESEL_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: "Zolara",
        message,
        recipients: [normalized],
      }),
    });

    const smsData = await smsRes.json().catch(() => ({}));
    console.log("Arkesel OTP:", smsRes.status, JSON.stringify(smsData));

    if (!smsRes.ok) {
      return res.status(500).json({ error: "Could not send SMS. Check your phone number." });
    }

    return res.status(200).json({ ok: true, message: "OTP sent" });
  } catch (e) {
    console.error("client-send-otp:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
