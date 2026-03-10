// Arkesel SMS utility
const ARKESEL_API_KEY = "S0JhVWFlcm1VV1pkSWJvWnpacEs";
const SENDER = "Zolara";

function formatGhanaPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 10) {
    return "233" + digits.slice(1);
  }
  if (digits.startsWith("233")) return digits;
  return digits;
}

export async function sendSMS(phone: string, message: string): Promise<boolean> {
  try {
    const formatted = formatGhanaPhone(phone);
    const res = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
      method: "POST",
      headers: {
        "api-key": ARKESEL_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: SENDER,
        message,
        recipients: [formatted],
      }),
    });
    const data = await res.json();
    return data.status === "success" || res.ok;
  } catch (err) {
    console.error("SMS error:", err);
    return false;
  }
}

export const SMS = {
  bookingConfirmation: (name: string, service: string, date: string, time: string) =>
    `Hi ${name}, your booking at Zolara Beauty Studio is confirmed!\n\nService: ${service}\nDate: ${date}\nTime: ${time}\n\nPlease send GHS 50 deposit to:\nMTN MoMo: 0594 365 314 (Zolara)\n\nYour slot is secured once deposit is received. Questions? Call 0594 365 314.`,

  checkoutThankYou: (name: string, service: string, stamps: number) =>
    `Thank you ${name}! Your ${service} service at Zolara Beauty Studio is complete. We hope you feel beautiful! You now have ${stamps} loyalty stamp${stamps !== 1 ? "s" : ""}. 10 stamps = free service up to GHS 300. See you soon!`,

  appointmentReminder: (name: string, service: string, date: string, time: string) =>
    `Hi ${name}, this is a reminder for your appointment at Zolara Beauty Studio tomorrow.\n\nService: ${service}\nDate: ${date}\nTime: ${time}\n\nIf you need to reschedule, call us on 0594 365 314 at least 24 hours before.`,
};
