// Called daily by Vercel cron — sends 24-hour appointment reminders
const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
const ARKESEL_KEY = process.env.ARKESEL_KEY;
const H = { "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY, "Content-Type": "application/json" };

function toIntl(p) {
  const d = (p || "").replace(/\D/g, "");
  if (d.startsWith("233")) return d;
  if (d.startsWith("0")) return "233" + d.slice(1);
  return d;
}

async function sendSMS(phone, message) {
  const intl = toIntl(phone);
  if (intl.length < 12) return;
  await fetch("https://sms.arkesel.com/api/v2/sms/send", {
    method: "POST",
    headers: { "api-key": ARKESEL_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ sender: "Zolara", message, recipients: [intl] }),
  }).catch(() => {});
}

function firstName(name) {
  return (name || "").split(" ")[0] || "there";
}

export default async function handler(req, res) {
  // Verify Vercel cron secret OR internal secret header
  const authHeader = req.headers['authorization'] || '';
  const cronSecret = process.env.CRON_SECRET || '';
  if (cronSecret && authHeader !== 'Bearer ' + cronSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    // Get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    // Fetch all confirmed/pending bookings for tomorrow
    const r = await fetch(
      `${SB_URL}/rest/v1/bookings?preferred_date=eq.${tomorrowStr}&status=in.(confirmed,pending)&select=id,client_name,client_phone,service_name,preferred_time,staff_name,booking_ref&reminder_sent=not.is.true`,
      { headers: H }
    );
    const bookings = await r.json();

    if (!Array.isArray(bookings) || bookings.length === 0) {
      return res.status(200).json({ ok: true, sent: 0, message: "No bookings tomorrow" });
    }

    let sent = 0;
    for (const b of bookings) {
      if (!b.client_phone) continue;
      const first = firstName(b.client_name);
      const time = (b.preferred_time || "").slice(0, 5);
      const stylist = b.staff_name ? `\nStylist: ${b.staff_name}` : "";
      const ref = b.booking_ref || b.id?.slice(0, 8).toUpperCase() || "";
      const message = [
        `Hi ${first}, this is a reminder for your Zolara appointment tomorrow.`,
        ``,
        `Service: ${b.service_name || "your appointment"}`,
        `Time: ${time}${stylist}`,
        `Ref: ${ref}`,
        ``,
        `Please arrive 5 minutes early. To cancel or reschedule, call us at least 24 hours before.`,
        ``,
        `Zolara Beauty Studio`,
        `0594365314 / 0208848707`,
      ].join("\n");

      await sendSMS(b.client_phone, message);
      sent++;

      // Mark reminder sent to avoid duplicates
      await fetch(`${SB_URL}/rest/v1/bookings?id=eq.${b.id}`, {
        method: "PATCH",
        headers: { ...H, "Prefer": "return=minimal" },
        body: JSON.stringify({ reminder_sent: true }),
      }).catch(() => {});
    }

    // Also send reminders for today's bookings made recently where appointment is 2+ hours away
    const todayStr = new Date().toISOString().slice(0, 10);
    const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    const sameDayRes = await fetch(
      `${SB_URL}/rest/v1/bookings?preferred_date=eq.${todayStr}&status=in.(confirmed,pending)&reminder_sent=not.is.true&select=id,client_name,client_phone,service_name,preferred_time,staff_name,booking_ref,created_at`,
      { headers: H }
    );
    const todayBookings = await sameDayRes.json().catch(() => []);

    for (const b of (Array.isArray(todayBookings) ? todayBookings : [])) {
      if (!b.client_phone || !b.preferred_time) continue;
      // Only send if booking was created less than 90 minutes ago (new same-day booking)
      const createdAt = new Date(b.created_at);
      const minsAgo = (Date.now() - createdAt.getTime()) / 60000;
      if (minsAgo > 90) continue; // old booking, already handled or not needed

      // Only if appointment is at least 2 hours away
      const [h, m] = (b.preferred_time || "00:00").split(":").map(Number);
      const apptTime = new Date();
      apptTime.setHours(h, m || 0, 0, 0);
      if (apptTime.getTime() < Date.now() + 2 * 60 * 60 * 1000) continue;

      const first = (b.client_name || "").split(" ")[0] || "there";
      const time = (b.preferred_time || "").slice(0, 5);
      const stylist = b.staff_name ? `\nStylist: ${b.staff_name}` : "";
      const ref = b.booking_ref || b.id?.slice(0, 8).toUpperCase() || "";
      const msg = [
        `Hi ${first}, your Zolara appointment is today.`,
        ``,
        `Service: ${b.service_name || "your appointment"}`,
        `Time: ${time}${stylist}`,
        `Ref: ${ref}`,
        ``,
        `We look forward to seeing you. Arrive 5 minutes early.`,
        `Zolara Beauty Studio`,
        `0594365314 / 0208848707`,
      ].join("\n");

      await sendSMS(b.client_phone, msg);
      sent++;
      await fetch(`${SB_URL}/rest/v1/bookings?id=eq.${b.id}`, {
        method: "PATCH",
        headers: { ...H, "Prefer": "return=minimal" },
        body: JSON.stringify({ reminder_sent: true }),
      }).catch(() => {});
    }

    return res.status(200).json({ ok: true, sent, date: tomorrowStr });
  } catch (e) {
    console.error("send-reminders:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
