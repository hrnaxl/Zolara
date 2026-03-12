// Arkesel SMS utility — Zolara Beauty Studio
const ARKESEL_API_KEY = "S0JhVWFlcm1VV1pkSWJvWnpacEs";
const SENDER = "Zolara";

function formatGhanaPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 10) return "233" + digits.slice(1);
  if (digits.startsWith("233")) return digits;
  return digits;
}

export async function sendSMS(phone: string, message: string): Promise<boolean> {
  try {
    const formatted = formatGhanaPhone(phone);
    const res = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
      method: "POST",
      headers: { "api-key": ARKESEL_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ sender: SENDER, message, recipients: [formatted] }),
    });
    const data = await res.json();
    return data.status === "success" || res.ok;
  } catch (err) {
    console.error("SMS error:", err);
    return false;
  }
}

// ─────────────────────────────────────────────
//  MESSAGE TEMPLATES  (max ~160 chars per SMS)
// ─────────────────────────────────────────────

export const SMS = {

  // Sent when client submits public booking form
  bookingReceived: (
    name: string,
    service: string,
    date: string,
    time: string,
    ref: string,
  ) =>
`Hi ${name}! ✨

Your Zolara booking request has been received.

Service: ${service}
Date: ${date} at ${time}
Ref: ${ref}

We'll confirm your slot shortly. 
Deposit: GHS 50 to 0594 365 314 (MoMo - Zolara).

Questions? Call 0594 365 314.
— Zolara Beauty Studio`,

  // Sent by admin when booking is confirmed
  bookingConfirmed: (
    name: string,
    service: string,
    date: string,
    time: string,
    staffName: string,
    ref: string,
  ) =>
`Hi ${name}! Your booking is CONFIRMED ✅

Service: ${service}
Date: ${date}
Time: ${time}
Stylist: ${staffName}
Ref: ${ref}

We look forward to seeing you!
Please arrive 5 mins early.

📍 Sakasaka, Opp. CalBank, Tamale
📞 0594 365 314
— Zolara Beauty Studio`,

  // Sent on checkout completion
  checkoutComplete: (
    name: string,
    service: string,
    totalPaid: string,
    stamps: number,
    stampsForReward: number,
    rewardGhs: number,
  ) => {
    const stampsLeft = Math.max(0, stampsForReward - stamps);
    const loyaltyLine = stamps >= stampsForReward
      ? `You've earned a FREE GHS ${rewardGhs} reward! Redeem on your next visit.`
      : `${stamps} stamp${stamps !== 1 ? "s" : ""} collected. ${stampsLeft} more for a GHS ${rewardGhs} reward!`;

    return `Thank you, ${name}! 💛

Your ${service} service at Zolara is complete.

Total paid: GHS ${totalPaid}
${loyaltyLine}

We'd love to see you again soon!
Book: zolarasalon.com
— Zolara Beauty Studio`;
  },

  // Appointment reminder (day before)
  appointmentReminder: (
    name: string,
    service: string,
    date: string,
    time: string,
    staffName: string,
  ) =>
`Hi ${name}, reminder for tomorrow! ⏰

Service: ${service}
Date: ${date} at ${time}
Stylist: ${staffName}

Need to reschedule? Call 0594 365 314 at least 24 hrs before.

📍 Sakasaka, Opp. CalBank, Tamale
— Zolara Beauty Studio`,

  // Legacy alias
  bookingConfirmation: (name: string, service: string, date: string, time: string) =>
    SMS.bookingReceived(name, service, date, time, ""),
};
