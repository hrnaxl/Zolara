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

function firstName(name: string): string {
  return (name || "").split(" ")[0] || name;
}

function dayDateLabel(date: string): string {
  return new Date(date + "T12:00:00").toLocaleDateString("en-GH", {
    weekday: "long", day: "numeric", month: "long",
  });
}

export const SMS = {

  // 1 & 2. Booking Received
  bookingReceived: (
    name: string,
    service: string,
    date: string,
    time: string,
    ref: string,
    depositPaid = true,
    depositAmount = 50,
  ) => {
    const first = firstName(name);
    const dayDate = date.includes("-") ? dayDateLabel(date) : date;
    const cleanTime = time.slice(0, 5);
    const depositLine = depositPaid
      ? `💳 Deposit: GHS ${depositAmount} received.`
      : "💳 Deposit: Not recorded.";
    const statusLine = depositPaid
      ? "Your appointment is being reviewed by our team. We'll send a confirmation shortly. 🌸"
      : "Your request is awaiting confirmation. We'll send an update shortly. 🌸";
    return [
      `Hi ${first}! ✨ Your booking at Zolara has been received.`,
      ``,
      `💆 Service: ${service}`,
      `📅 Date: ${dayDate}`,
      `🕐 Time: ${cleanTime}`,
      `🔖 Ref: ${ref}`,
      ``,
      depositLine,
      ``,
      statusLine,
      ``,
      `Zolara Beauty Studio 💛`,
      CONTACT,
    ].join("\n");
  },

  // 3. Booking Confirmed
  bookingConfirmed: (
    name: string,
    service: string,
    date: string,
    time: string,
    staffName: string,
    ref: string,
    depositPaid = false,
    depositAmount = 50,
  ) => {
    const first = firstName(name);
    const dayDate = date.includes("-") ? dayDateLabel(date) : date;
    const cleanTime = time.slice(0, 5);
    const stylistLine = staffName && staffName !== "our team" ? `💅 Stylist: ${staffName}` : null;
    const depositLine = depositPaid ? `💳 Deposit: GHS ${depositAmount} received.` : null;
    return [
      `Hi ${first}, your Zolara appointment is confirmed! ✅`,
      ``,
      `💆 Service: ${service}`,
      `📅 Date: ${dayDate}`,
      `🕐 Time: ${cleanTime}`,
      ...(stylistLine ? [stylistLine] : []),
      `🔖 Ref: ${ref}`,
      ...(depositLine ? [``, depositLine] : []),
      ``,
      `We look forward to seeing you. Please arrive 5 minutes early.`,
      ``,
      `📍 Sakasaka, Opp. CalBank, Tamale`,
      `Zolara Beauty Studio`,
      CONTACT,
    ].join("\n");
  },

  // 4. Appointment Reminder
  appointmentReminder: (
    name: string,
    service: string,
    time: string,
    staffName: string,
    ref: string,
  ) => {
    const first = firstName(name);
    const cleanTime = time.slice(0, 5);
    return [
      `Hi ${first}, reminder for your Zolara appointment today! ⏰`,
      ``,
      `💆 Service: ${service}`,
      `🕐 Time: ${cleanTime}`,
      `💅 Stylist: ${staffName}`,
      `🔖 Ref: ${ref}`,
      ``,
      `We look forward to seeing you! 🌸`,
      ``,
      `Zolara Beauty Studio 💛`,
      CONTACT,
    ].join("\n");
  },

  // 5. Checkout Complete
  checkoutComplete: (
    name: string,
    service: string,
    totalPaid: string,
    pointsEarned: number,
    totalPoints: number,
    ref: string,
  ) => {
    const first = firstName(name);
    const rewardLine = totalPoints >= 20
      ? `🎁 You've unlocked a GHS 50 reward! Redeem on your next visit.`
      : `⭐ ${totalPoints} stamp${totalPoints !== 1 ? "s" : ""} total. ${20 - totalPoints} more for a GHS 50 reward!`;
    return [
      `Thank you for visiting Zolara, ${first}! 💛`,
      ``,
      `💆 Service: ${service}`,
      `💰 Total Paid: GHS ${totalPaid}`,
      `🔖 Ref: ${ref}`,
      ``,
      `✨ You earned ${pointsEarned} stamp${pointsEarned !== 1 ? "s" : ""} from this visit.`,
      rewardLine,
      ``,
      `Book your next visit:`,
      `🔗 zolarasalon.com`,
      ``,
      `Zolara Beauty Studio 💛`,
      CONTACT,
    ].join("\n");
  },

  // 6. Rebooking Reminder
  rebookingReminder: (
    name: string,
    service: string,
  ) => {
    const first = firstName(name);
    return [
      `Hi ${first}, it may be time for your next Zolara visit! 💅`,
      ``,
      `💆 Your last service: ${service}`,
      ``,
      `We'd love to have you back! Book anytime:`,
      `🔗 zolarasalon.com`,
      ``,
      `Zolara Beauty Studio 💛`,
      CONTACT,
    ].join("\n");
  },

  // 7. Loyalty Reward Unlocked
  loyaltyReward: (
    name: string,
    totalPoints: number,
  ) => {
    const first = firstName(name);
    return [
      `Hi ${first}, great news from Zolara! 🎉`,
      ``,
      `⭐ You've collected ${totalPoints} stamps and unlocked your reward!`,
      ``,
      `🎁 Your GHS 50 loyalty credit is ready to use on your next visit.`,
      ``,
      `Book your appointment:`,
      `🔗 zolarasalon.com`,
      ``,
      `Zolara Beauty Studio 💛`,
      CONTACT,
    ].join("\n");
  },

  // 8. Missed-You Recovery
  missedYou: (name: string) => {
    const first = firstName(name);
    return [
      `Hi ${first}, we've missed you at Zolara! 🌸`,
      ``,
      `It's been a while since your last visit and we'd love to welcome you back.`,
      ``,
      `Book your next appointment anytime:`,
      `🔗 zolarasalon.com`,
      ``,
      `We look forward to taking care of you again. 💛`,
      ``,
      `Zolara Beauty Studio`,
      CONTACT,
    ].join("\n");
  },

  // 9. Post-Visit Feedback Request
  feedbackRequest: (name: string, service: string) => {
    const first = firstName(name);
    return [
      `Hi ${first}. We hope you are enjoying your ${service} from earlier today.`,
      ``,
      `Your experience at Zolara matters to us. If you have a moment, we would love to hear your thoughts:`,
      ``,
      `zolarasalon.com/feedback`,
      ``,
      `Thank you for choosing Zolara.`,
      `Zolara Beauty Studio`,
      CONTACT,
    ].join("\n");
  },

  // 10. Welcome — first-time client
  welcomeNewClient: (name: string, service: string, date: string, time: string, ref: string) => {
    const first = firstName(name);
    const dayDate = date.includes("-") ? dayDateLabel(date) : date;
    const cleanTime = time.slice(0, 5);
    return [
      `Welcome to Zolara, ${first}! We are so glad you chose us.`,
      ``,
      `Your first appointment is booked:`,
      `Service: ${service}`,
      `Date: ${dayDate}`,
      `Time: ${cleanTime}`,
      `Ref: ${ref}`,
      ``,
      `We are located at Sakasaka, Opposite CalBank, Tamale. Please arrive 5 minutes early.`,
      ``,
      `If you have any questions before your visit, call us on 0594365314.`,
      ``,
      `See you soon.`,
      `Zolara Beauty Studio`,
      CONTACT,
    ].join("\n");
  },

  // 11. Birthday Greeting
  birthdayGreeting: (name: string) => {
    const first = firstName(name);
    return [
      `Happy Birthday, ${first}! 🎂`,
      ``,
      `The entire Zolara team is wishing you a wonderful day filled with joy and beauty. 💛`,
      ``,
      `🎁 As a birthday gift, enjoy DOUBLE loyalty points on any visit this month!`,
      ``,
      `Book your birthday treat:`,
      `🔗 zolarasalon.com`,
      ``,
      `With love, Zolara Beauty Studio 🌸`,
      CONTACT,
    ].join("\n");
  },

  // 11. New Booking Alert (for staff/admin)
  newBookingAlert: (
    clientName: string,
    service: string,
    date: string,
    time: string,
    ref: string,
    clientPhone: string,
  ) => {
    const dayDate = date.includes("-") ? dayDateLabel(date) : date;
    const cleanTime = time.slice(0, 5);
    return [
      `🔔 New booking received at Zolara!`,
      ``,
      `👤 Client: ${clientName}`,
      `💆 Service: ${service}`,
      `📅 Date: ${dayDate}`,
      `🕐 Time: ${cleanTime}`,
      `📞 Phone: ${clientPhone}`,
      `🔖 Ref: ${ref}`,
      ``,
      `💳 GHS ${depositAmount || 50} deposit paid via Paystack.`,
      ``,
      `Login to confirm or manage:`,
      `🔗 zolarasalon.com/app`,
    ].join("\n");
  },

  // Legacy alias
  bookingConfirmation: (name: string, service: string, date: string, time: string) =>
    SMS.bookingReceived(name, service, date, time, "", false),
};


// ── SMS Campaign DB utilities (previously in smsService.ts) ─────────
import { supabase } from "@/integrations/supabase/client";

export const getSMSCampaigns = async () => {
  const { data, error } = await supabase.from("sms_campaigns").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
};
export const createSMSCampaign = async (campaign: { name: string; message_template: string; trigger_type: string; send_hours_before?: number }) => {
  const { data, error } = await supabase.from("sms_campaigns").insert(campaign).select().single();
  if (error) throw error;
  return data;
};
export const updateSMSCampaign = async (id: string, updates: object) => {
  const { error } = await supabase.from("sms_campaigns").update(updates).eq("id", id);
  if (error) throw error;
};
export const deleteSMSCampaign = async (id: string) => {
  const { error } = await supabase.from("sms_campaigns").delete().eq("id", id);
  if (error) throw error;
};
export const getSMSQueue = async () => {
  const { data, error } = await (supabase as any).from("sms_queue").select("*").order("scheduled_for", { ascending: false }).limit(100);
  if (error) throw error;
  return data;
};
