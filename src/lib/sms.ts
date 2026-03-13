// Arkesel SMS utility — Zolara Beauty Studio
const ARKESEL_API_KEY = "S0JhVWFlcm1VV1pkSWJvWnpacEs";
const SENDER = "Zolara";
const CONTACT = "0594365314 / 0208848707";

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

// ─────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────
function firstName(name: string): string {
  return (name || "").split(" ")[0] || name;
}

function dayDateLabel(date: string): string {
  return new Date(date + "T12:00:00").toLocaleDateString("en-GH", {
    weekday: "long", day: "numeric", month: "long",
  });
}

// ─────────────────────────────────────────────────────────────
//  MESSAGE TEMPLATES
// ─────────────────────────────────────────────────────────────
export const SMS = {

  // 1. Booking Initiated — deposit paid
  bookingReceived: (
    name: string,
    service: string,
    date: string,
    time: string,
    ref: string,
    depositPaid = true,
  ) => {
    const first = firstName(name);
    const dayDate = date.includes("-") ? dayDateLabel(date) : date;
    const cleanTime = time.slice(0, 5);
    const depositLine = depositPaid
      ? "💳 Deposit: GHS 50 received."
      : "💳 Deposit: Not recorded.";
    const statusLine = depositPaid
      ? "Your appointment is being reviewed by our team. You will receive a confirmation message shortly. 🌸"
      : "Your appointment request is awaiting confirmation. You will receive an update shortly. 🌸";
    return `Hi ${first}! ✨ Your booking request at Zolara has been received.

💆 Service: ${service}
📅 Date: ${dayDate}
🕐 Time: ${cleanTime}
🔖 Ref: ${ref}

${depositLine}

${statusLine}

Zolara Beauty Studio 💛
${CONTACT}`;
  },

  // 3. Booking Confirmed (stylist name included)
  bookingConfirmed: (
    name: string,
    service: string,
    date: string,
    time: string,
    staffName: string,
    ref: string,
  ) => {
    const first = firstName(name);
    const dayDate = date.includes("-") ? dayDateLabel(date) : date;
    const cleanTime = time.slice(0, 5);
    return `Hi ${first}, your Zolara appointment is confirmed! ✅

💆 Service: ${service}
📅 Date: ${dayDate}
🕐 Time: ${cleanTime}
💅 Stylist: ${staffName}
🔖 Ref: ${ref}

We can't wait to pamper you! 🌸 Please arrive about 5 minutes early.

📍 Sakasaka, Opp. CalBank – Tamale

Zolara Beauty Studio 💛
${CONTACT}`;
  },

  // 4. Appointment Reminder (2hrs before — only if booked >2hrs ahead)
  appointmentReminder: (
    name: string,
    service: string,
    time: string,
    staffName: string,
    ref: string,
  ) => {
    const first = firstName(name);
    return `Hi ${first}, this is a reminder of your Zolara appointment today.

Service: ${service}
Time: ${time}
Stylist: ${staffName}
Ref: ${ref}

We look forward to serving you.

Zolara Beauty Studio
${CONTACT}`;
  },

  // 5. Checkout / Visit Completion
  checkoutComplete: (
    name: string,
    service: string,
    totalPaid: string,
    pointsEarned: number,
    totalPoints: number,
    ref: string,
  ) => {
    const first = firstName(name);
    return `Thank you for visiting Zolara, ${first}.

Service: ${service}
Total Paid: GHS ${totalPaid}
Ref: ${ref}

You earned ${pointsEarned} stamp${pointsEarned !== 1 ? "s" : ""} from this visit.
Your total stamps: ${totalPoints}

Collect 20 stamps and enjoy a GHS 50 reward.

Book your next visit:
zolarasalon.com

Zolara Beauty Studio
${CONTACT}`;
  },

  // 6. Rebooking Reminder
  rebookingReminder: (
    name: string,
    service: string,
  ) => {
    const first = firstName(name);
    return `Hi ${first}, it may be time for your next Zolara visit.

Your last service: ${service}

Book your next appointment anytime:
zolarasalon.com

We would love to welcome you back.

Zolara Beauty Studio
${CONTACT}`;
  },

  // 7. Loyalty Reward Unlocked
  loyaltyReward: (
    name: string,
    totalPoints: number,
  ) => {
    const first = firstName(name);
    return `Hi ${first}, great news from Zolara.

You have collected ${totalPoints} stamps and unlocked your reward.

Your GHS 50 loyalty credit is ready to use on your next visit.

Book your appointment:
zolarasalon.com

Zolara Beauty Studio
${CONTACT}`;
  },

  // 8. Missed-You Recovery
  missedYou: (name: string) => {
    const first = firstName(name);
    return `Hi ${first}, we have missed seeing you at Zolara.

It has been a while since your last visit and we would love to welcome you back.

Book your next appointment anytime:
zolarasalon.com

We look forward to taking care of you again.

Zolara Beauty Studio
${CONTACT}`;
  },

  // Legacy alias
  bookingConfirmation: (name: string, service: string, date: string, time: string) =>
    SMS.bookingReceived(name, service, date, time, "", false),
};
