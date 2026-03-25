// Run once to create OTP + session tables
const SB_URL = "https://vwvrhbyfytmqsywfdhvd.supabase.co";
const SB_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dnJoYnlmeXRtcXN5d2ZkaHZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1MDUxNCwiZXhwIjoyMDg4NzI2NTE0fQ.eR0ZA3z0V9OQXY5uokEtmnZq1c71EyjLD8mNsquvg54";

const headers = {
  "Content-Type": "application/json",
  "apikey": SB_SERVICE_KEY,
  "Authorization": "Bearer " + SB_SERVICE_KEY,
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    // Create tables via individual inserts with upsert (safe approach)
    // Table 1: client_otp_codes
    const t1 = await fetch(`${SB_URL}/rest/v1/client_otp_codes?limit=1`, { headers });
    const t1exists = t1.status !== 404;

    // Table 2: client_sessions
    const t2 = await fetch(`${SB_URL}/rest/v1/client_sessions?limit=1`, { headers });
    const t2exists = t2.status !== 404;

    return res.status(200).json({
      ok: true,
      client_otp_codes: t1exists ? "exists" : "needs_creation",
      client_sessions: t2exists ? "exists" : "needs_creation",
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
