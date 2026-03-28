// Daily cleanup of expired OTP codes and sessions
// Cron: 0 2 * * * (2am UTC daily)
const SB_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
const SB_KEY = (process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY) || process.env.VITE_SUPABASE_SERVICE_KEY;

const H = {
  "Content-Type": "application/json",
  "apikey": SB_KEY,
  "Authorization": "Bearer " + SB_KEY,
};

export default async function handler(req, res) {
  const authHeader = req.headers['authorization'] || '';
  const cronSecret = process.env.CRON_SECRET || '';
  if (cronSecret && authHeader !== 'Bearer ' + cronSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now = new Date().toISOString();
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Delete expired OTP codes
    const r1 = await fetch(`${SB_URL}/rest/v1/client_otp_codes?or=(used.eq.true,expires_at.lt.${encodeURIComponent(now)})&select=id`, {
      method: "DELETE", headers: H,
    });

    // Delete expired sessions
    const r2 = await fetch(`${SB_URL}/rest/v1/client_sessions?expires_at=lt.${encodeURIComponent(now)}`, {
      method: "DELETE", headers: H,
    });

    // Delete old sent pending_sms (older than 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    await fetch(`${SB_URL}/rest/v1/pending_sms?sent=eq.true&created_at=lt.${encodeURIComponent(weekAgo)}`, {
      method: "DELETE", headers: H,
    });

    // Delete stale pending bookings older than 30 minutes with no payment
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    await fetch(`${SB_URL}/rest/v1/bookings?status=eq.pending&deposit_paid=eq.false&created_at=lt.${encodeURIComponent(thirtyMinsAgo)}&select=id`, {
      method: "DELETE", headers: H,
    }).catch(() => {});

    return res.status(200).json({ ok: true, cleaned: true });
  } catch (e) {
    console.error("cleanup-expired:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
