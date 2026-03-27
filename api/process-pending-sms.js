// Processes pending "deposit not recorded" SMS notifications
// Called by Vercel cron every 15 minutes
// Also handles any other delayed notifications stored in pending_sms table

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
const ARKESEL_KEY = process.env.ARKESEL_KEY;

const H = {
  "Content-Type": "application/json",
  "apikey": SB_KEY,
  "Authorization": "Bearer " + SB_KEY,
  "Prefer": "return=representation",
};

function toIntl(p) {
  const d = (p || "").replace(/\D/g, "");
  if (d.startsWith("233")) return d;
  if (d.startsWith("0")) return "233" + d.slice(1);
  return d;
}

async function sendSMS(phone, message) {
  const intl = toIntl(phone);
  if (intl.length < 12) return false;
  const r = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
    method: "POST",
    headers: { "api-key": ARKESEL_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ sender: "Zolara", message, recipients: [intl] }),
  }).catch(() => null);
  return r?.ok || false;
}

export default async function handler(req, res) {
  // Auth check
  const authHeader = req.headers['authorization'] || '';
  const cronSecret = process.env.CRON_SECRET || '';
  if (cronSecret && authHeader !== 'Bearer ' + cronSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now = new Date().toISOString();

    // Fetch all pending SMS where send_after has passed and not yet sent
    const r = await fetch(
      `${SB_URL}/rest/v1/pending_sms?sent=eq.false&send_after=lte.${encodeURIComponent(now)}&limit=50`,
      { headers: H }
    );
    const pending = await r.json().catch(() => []);

    if (!Array.isArray(pending) || pending.length === 0) {
      return res.status(200).json({ ok: true, sent: 0 });
    }

    let sent = 0;
    for (const row of pending) {
      const ok = await sendSMS(row.phone, row.message);
      // Mark as sent regardless — don't retry indefinitely
      await fetch(`${SB_URL}/rest/v1/pending_sms?id=eq.${row.id}`, {
        method: "PATCH",
        headers: { ...H, "Prefer": "return=minimal" },
        body: JSON.stringify({ sent: true, sent_at: new Date().toISOString(), delivered: ok }),
      }).catch(() => {});
      if (ok) sent++;
    }

    return res.status(200).json({ ok: true, sent, total: pending.length });
  } catch (e) {
    console.error("process-pending-sms:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
