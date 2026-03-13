import { useState } from "react";
import { sendSMS } from "@/lib/sms";

const CONTACT = "0594365314 / 0208848707";
const G = "#C8A97E";
const G_DARK = "#8B6914";

function fmtDate() {
  return new Date().toLocaleDateString("en-GH", { weekday: "long", day: "numeric", month: "long" });
}
function fmtTime() {
  return new Date().toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" });
}

export default function SMSTest() {
  const [phone, setPhone] = useState("0594922679");
  const [sending, setSending] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});

  async function fire(key: string, msg: string) {
    setSending(key);
    const ok = await sendSMS(phone, msg);
    setResults(r => ({ ...r, [key]: ok ? "✓ Sent" : "✗ Failed" }));
    setSending(null);
  }

  const TESTS = [
    {
      key: "1",
      label: "1. Booking Received — Deposit Paid",
      msg: [
        `Hi Harun, your booking request at Zolara has been received.`,
        ``,
        `Service: Box Braids`,
        `Date: ${fmtDate()}`,
        `Time: ${fmtTime()}`,
        `Ref: ZLR-TEST01`,
        ``,
        `Deposit: GHS 50 received.`,
        ``,
        `Your appointment is being reviewed by our team. You will receive a confirmation message shortly.`,
        ``,
        `Zolara Beauty Studio`,
        CONTACT,
      ].join("\n"),
    },
    {
      key: "2",
      label: "2. Booking Received — No Deposit",
      msg: [
        `Hi Harun, your booking request at Zolara has been received.`,
        ``,
        `Service: Box Braids`,
        `Date: ${fmtDate()}`,
        `Time: ${fmtTime()}`,
        `Ref: ZLR-TEST01`,
        ``,
        `Deposit: Not recorded.`,
        ``,
        `Your appointment request is awaiting confirmation. You will receive an update shortly.`,
        ``,
        `Zolara Beauty Studio`,
        CONTACT,
      ].join("\n"),
    },
    {
      key: "3",
      label: "3. Booking Confirmed",
      msg: [
        `Hi Harun, your Zolara appointment is confirmed.`,
        ``,
        `Service: Box Braids`,
        `Date: ${fmtDate()}`,
        `Time: ${fmtTime()}`,
        `Stylist: Amanda`,
        `Ref: ZLR-TEST01`,
        ``,
        `We look forward to serving you. Please arrive about 5 minutes early.`,
        ``,
        `Zolara Beauty Studio`,
        CONTACT,
      ].join("\n"),
    },
    {
      key: "4",
      label: "4. Appointment Reminder (2hrs before)",
      msg: [
        `Hi Harun, this is a reminder of your Zolara appointment today.`,
        ``,
        `Service: Box Braids`,
        `Time: ${fmtTime()}`,
        `Stylist: Amanda`,
        `Ref: ZLR-TEST01`,
        ``,
        `We look forward to serving you.`,
        ``,
        `Zolara Beauty Studio`,
        CONTACT,
      ].join("\n"),
    },
    {
      key: "5",
      label: "5. Checkout Complete",
      msg: [
        `Thank you for visiting Zolara, Harun.`,
        ``,
        `Service: Box Braids`,
        `Total Paid: GHS 655`,
        `Ref: ZLR-TEST01`,
        ``,
        `You earned 6 stamps from this visit.`,
        `Your total stamps: 24`,
        ``,
        `Collect 20 stamps and enjoy a GHS 50 reward.`,
        ``,
        `Book your next visit:`,
        `zolarasalon.com`,
        ``,
        `Zolara Beauty Studio`,
        CONTACT,
      ].join("\n"),
    },
    {
      key: "6",
      label: "6. Rebooking Reminder",
      msg: [
        `Hi Harun, it may be time for your next Zolara visit.`,
        ``,
        `Your last service: Box Braids`,
        ``,
        `Book your next appointment anytime:`,
        `zolarasalon.com`,
        ``,
        `We would love to welcome you back.`,
        ``,
        `Zolara Beauty Studio`,
        CONTACT,
      ].join("\n"),
    },
    {
      key: "7",
      label: "7. Loyalty Reward Unlocked",
      msg: [
        `Hi Harun, great news from Zolara.`,
        ``,
        `You have collected 20 stamps and unlocked your reward.`,
        ``,
        `Your GHS 50 loyalty credit is ready to use on your next visit.`,
        ``,
        `Book your appointment:`,
        `zolarasalon.com`,
        ``,
        `Zolara Beauty Studio`,
        CONTACT,
      ].join("\n"),
    },
    {
      key: "8",
      label: "8. Missed-You Recovery",
      msg: [
        `Hi Harun, we have missed seeing you at Zolara.`,
        ``,
        `It has been a while since your last visit and we would love to welcome you back.`,
        ``,
        `Book your next appointment anytime:`,
        `zolarasalon.com`,
        ``,
        `We look forward to taking care of you again.`,
        ``,
        `Zolara Beauty Studio`,
        CONTACT,
      ].join("\n"),
    },
  ];

  return (
    <div style={{ padding: "clamp(20px,3vw,36px)", maxWidth: 700, margin: "0 auto", fontFamily: "Montserrat, sans-serif" }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: "#A8A29E", marginBottom: 4 }}>ADMIN</div>
        <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 32, fontWeight: 700, color: "#1C160E", margin: "0 0 6px" }}>SMS Test Panel</h1>
        <p style={{ fontSize: 13, color: "#78716C" }}>Send a sample of each message to verify delivery and formatting.</p>
      </div>

      <div style={{ background: "#fff", border: "1px solid #EDE8E0", borderRadius: 16, padding: "20px 24px", marginBottom: 24, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#1C160E", whiteSpace: "nowrap" }}>Test phone</div>
        <input
          value={phone}
          onChange={e => setPhone(e.target.value)}
          style={{ border: "1.5px solid #EDE8E0", borderRadius: 10, padding: "9px 14px", fontSize: 14, fontFamily: "Montserrat, sans-serif", width: 180, outline: "none", fontWeight: 600 }}
        />
        <span style={{ fontSize: 12, color: "#A8A29E" }}>All test messages go to this number</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {TESTS.map(t => (
          <div key={t.key} style={{ background: "#fff", border: "1px solid #EDE8E0", borderRadius: 14, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#1C160E" }}>{t.label}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
              {results[t.key] && (
                <span style={{ fontSize: 12, fontWeight: 700, color: results[t.key].startsWith("✓") ? "#16A34A" : "#DC2626" }}>
                  {results[t.key]}
                </span>
              )}
              <button
                onClick={() => fire(t.key, t.msg)}
                disabled={sending === t.key}
                style={{ background: sending === t.key ? "#EDE8E0" : `linear-gradient(135deg, ${G}, ${G_DARK})`, color: sending === t.key ? "#A8A29E" : "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 12, fontWeight: 700, cursor: sending === t.key ? "not-allowed" : "pointer", letterSpacing: "0.04em" }}
              >
                {sending === t.key ? "Sending…" : "Send Test"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
