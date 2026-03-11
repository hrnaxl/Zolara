import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { validatePromoCode } from "@/lib/promoCodes";
import { findOrCreateClient } from "@/lib/clientDedup";
import { normalizeTimeTo24, isTimeWithinRange } from "@/lib/time";
import { Loader2, Calendar, Clock, User, Phone, Mail, Tag, CheckCircle2, ArrowLeft, Sparkles, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useSettings } from "@/context/SettingsContext";
import AmandaWidget from "@/components/AmandaWidget";

const LOGO = "https://ekvjnydomfresnkealpb.supabase.co/storage/v1/object/public/avatars/logo_1764609621458.jpg";
const GOLD = "#C8A97E";
const GOLD_DARK = "#8B6914";
const MID = "#EDE3D5";
const WHITE = "#FFFFFF";
const BORDER = "#E5DDD3";
const TXT = "#1C1917";
const TXT_MID = "#57534E";
const TXT_SOFT = "#A8A29E";
const GREEN = "#10B981";
const RED = "#EF4444";
const DARK = "#1C160E";
const CREAM = "#F5EFE6";

const inp = {
  width: "100%", background: WHITE, border: `1.5px solid ${BORDER}`,
  borderRadius: "8px", padding: "12px 16px", color: TXT, fontSize: "14px",
  outline: "none", fontFamily: "'Montserrat',sans-serif", transition: "border-color 0.15s",
} as const;

const lbl = {
  display: "block", fontSize: "10px", fontWeight: 700,
  letterSpacing: "0.14em", color: TXT_SOFT, textTransform: "uppercase" as const, marginBottom: "6px",
} as const;

const PAYMENT_LABELS: Record<string,string> = {
  cash: "Cash", mobile_money: "Mobile Money", card: "Card", bank_transfer: "Bank Transfer", gift_card: "Gift Card",
};
const PAYMENT_ICONS: Record<string,string> = {
  cash: "💵", mobile_money: "📱", card: "💳", bank_transfer: "🏦", gift_card: "🎁",
};

export default function PublicBooking() {
  const navigate = useNavigate();
  const { settings } = useSettings();

  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [bookingRef, setBookingRef] = useState("");
  const [bookedService, setBookedService] = useState("");
  const [bookedDate, setBookedDate] = useState("");
  const [bookedTime, setBookedTime] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [preferredDate, setDate] = useState("");
  const [preferredTime, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState<any>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [paymentPref, setPaymentPref] = useState("cash");
  const [errors, setErrors] = useState<Record<string,string>>({});

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    supabase
      .from("services")
      .select("id, name, category, price, duration_minutes, is_active")
      .eq("is_active", true)
      .order("category").order("name")
      .then(({ data }) => { setServices(data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const selectedService = services.find(s => s.id === serviceId);
  const grouped = services.reduce((acc, s) => {
    const cat = s.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {} as Record<string, any[]>);

  const basePrice = Number(selectedService?.price || 0);
  const discount = promoApplied
    ? promoApplied.discount_type === "percentage"
      ? (basePrice * promoApplied.discount_value) / 100
      : promoApplied.discount_value
    : 0;
  const total = Math.max(0, basePrice - discount);

  const enabledPayments = (settings as any)?.payment_methods?.filter((m: any) => m.enabled)
    || [{ id: "cash", name: "Cash" }, { id: "mobile_money", name: "Mobile Money" }];

  const validate = () => {
    const e: Record<string,string> = {};
    if (!name.trim() || name.trim().length < 2) e.name = "Enter your full name";
    if (!phone.trim() || phone.replace(/\s/g,"").length < 10) e.phone = "Enter a valid phone number";
    if (!serviceId) e.service = "Please select a service";
    if (!preferredDate) e.date = "Please select a date";
    if (!preferredTime) e.time = "Please select a time";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true); setPromoError("");
    const result = await validatePromoCode(promoCode);
    setPromoLoading(false);
    if (result.valid) { setPromoApplied(result.promo); toast.success("Promo applied!"); }
    else { setPromoError(result.message); setPromoApplied(null); }
  };

  const handleSubmit = async () => {
    if (!validate()) {
      document.getElementById("booking-form-top")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setSubmitting(true);
    try {
      const normalizedTime = normalizeTimeTo24(preferredTime);
      const day = new Date(`${preferredDate}T00:00:00`).getDay();
      if (day === 0) { toast.error("We are closed on Sundays."); setSubmitting(false); return; }
      const openTime = (settings as any)?.open_time || "08:30";
      const closeTime = (settings as any)?.close_time || "21:00";
      if (!isTimeWithinRange(normalizedTime, openTime, closeTime)) {
        toast.error(`Please pick a time between ${openTime} and ${closeTime}`);
        setSubmitting(false); return;
      }
      const cleanPhone = phone.replace(/\s/g,"");
      const clientId = await findOrCreateClient({ name, phone: cleanPhone, email: email || null });
      const ref = `ZB${Date.now().toString(36).toUpperCase()}`;
      const notesFull = [
        notes,
        `Balance payment preference: ${PAYMENT_LABELS[paymentPref] || paymentPref}`,
        promoApplied ? `Promo: ${promoApplied.code}` : "",
        "GHS 50 deposit to be collected on arrival.",
      ].filter(Boolean).join("\n");

      const { error } = await supabase.from("bookings").insert({
        client_name: name,
        client_email: email || null,
        client_phone: cleanPhone,
        service_id: serviceId,
        service_name: selectedService?.name || null,
        preferred_date: preferredDate,
        preferred_time: normalizedTime,
        price: total,
        deposit_amount: 50,
        deposit_paid: false,
        notes: notesFull,
        status: "pending",
        booking_ref: ref,
        client_id: clientId || null,
      } as any);

      if (error) throw error;
      setBookingRef(ref);
      setBookedService(selectedService?.name || "");
      setBookedDate(preferredDate);
      setBookedTime(preferredTime);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      toast.error(err.message || "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // SUCCESS
  if (submitted) return (
    <div style={{ background: CREAM, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "'Cormorant Garamond',serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Montserrat:wght@400;500;600;700&display=swap');`}</style>
      <div style={{ maxWidth: "500px", width: "100%", textAlign: "center" }}>
        <div style={{ width: "88px", height: "88px", borderRadius: "50%", background: "rgba(200,169,126,0.12)", border: `2px solid ${GOLD}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px" }}>
          <CheckCircle2 style={{ width: "44px", height: "44px", color: GOLD }} />
        </div>
        <h2 style={{ fontSize: "38px", fontWeight: 600, color: DARK, marginBottom: "12px" }}>Booking Request Sent</h2>
        <p style={{ fontFamily: "'Montserrat',sans-serif", color: TXT_MID, fontSize: "14px", lineHeight: 1.85, marginBottom: "8px" }}>
          We will confirm your appointment via SMS shortly. Please arrive 5 to 10 minutes early.
        </p>
        <p style={{ fontFamily: "'Montserrat',sans-serif", color: TXT_SOFT, fontSize: "13px", marginBottom: "32px" }}>
          {bookedService} {bookedDate ? `· ${bookedDate}` : ""} {bookedTime ? `· ${bookedTime}` : ""}
        </p>
        <div style={{ background: "rgba(200,169,126,0.1)", border: `1px solid rgba(200,169,126,0.3)`, borderRadius: "10px", padding: "20px 28px", marginBottom: "20px", display: "inline-block" }}>
          <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "10px", color: TXT_SOFT, letterSpacing: "0.18em", marginBottom: "8px" }}>BOOKING REFERENCE</p>
          <span style={{ fontFamily: "monospace", fontSize: "22px", fontWeight: 700, color: GOLD_DARK, letterSpacing: "0.12em" }}>{bookingRef}</span>
        </div>
        <div style={{ background: "rgba(200,169,126,0.08)", border: "1px solid rgba(200,169,126,0.2)", borderRadius: "10px", padding: "16px 20px", marginBottom: "32px" }}>
          <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "12.5px", color: GOLD_DARK, lineHeight: 1.8, fontWeight: 600 }}>
            A GHS 50 deposit is required on arrival to secure your appointment.
          </p>
        </div>
        <Link to="/" style={{ fontFamily: "'Montserrat',sans-serif", display: "inline-flex", alignItems: "center", gap: "6px", color: GOLD_DARK, fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>
          Return to homepage
        </Link>
      </div>
    </div>
  );

  return (
    <div style={{ background: MID, minHeight: "100vh", fontFamily: "'Cormorant Garamond',serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Montserrat:wght@300;400;500;600;700&display=swap');
        input:focus, textarea:focus, select:focus { border-color: ${GOLD} !important; box-shadow: 0 0 0 3px rgba(200,169,126,0.18); }
        .pay-btn:hover { border-color: ${GOLD} !important; }
        .svc-select { appearance: none; -webkit-appearance: none; cursor: pointer; }
        .svc-select:hover { border-color: ${GOLD} !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        .error-field { animation: slideDown 0.3s ease; }
        @media (max-width: 900px) { .booking-grid { grid-template-columns: 1fr !important; } .booking-sidebar { position: static !important; } }
      `}</style>

      {/* Top bar */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(245,239,230,0.97)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(200,169,126,0.2)", padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 2px 20px rgba(28,22,14,0.06)" }}>
        <button onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", cursor: "pointer", color: TXT_MID, fontSize: "13px", fontWeight: 500, fontFamily: "'Montserrat',sans-serif", transition: "color 0.15s", padding: 0 }}
          onMouseEnter={e => (e.currentTarget.style.color = GOLD_DARK)}
          onMouseLeave={e => (e.currentTarget.style.color = TXT_MID)}>
          <ArrowLeft size={16} /> Back to homepage
        </button>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
          <img src={LOGO} style={{ width: "34px", height: "34px", borderRadius: "50%", objectFit: "cover", border: `2px solid ${GOLD}` }} alt="Zolara" />
          <div>
            <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "12px", fontWeight: 800, letterSpacing: "0.2em", color: DARK, lineHeight: 1.1 }}>ZOLARA</div>
            <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "9px", letterSpacing: "0.2em", color: GOLD, fontWeight: 600 }}>BEAUTY STUDIO</div>
          </div>
        </a>
      </div>

      <div className="booking-grid" style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 24px 80px", display: "grid", gridTemplateColumns: "360px 1fr", gap: "40px", alignItems: "start" }}>

        {/* LEFT: KPI sidebar */}
        <div className="booking-sidebar" style={{ position: "sticky", top: "90px" }}>
          <div style={{ background: "linear-gradient(150deg, #2C2416 0%, #1A1008 60%, #251D0E 100%)", borderRadius: "12px", overflow: "hidden", boxShadow: "0 24px 64px rgba(28,22,14,0.25)" }}>
            <div style={{ padding: "36px 32px 28px", borderBottom: "1px solid rgba(200,169,126,0.15)", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 0%, rgba(200,169,126,0.15) 0%, transparent 60%)", pointerEvents: "none" }} />
              <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "9px", letterSpacing: "0.26em", color: GOLD, fontWeight: 700, marginBottom: "12px" }}>BOOK WITH CONFIDENCE</p>
              <h2 style={{ fontSize: "26px", fontWeight: 500, color: "#F5EFE6", lineHeight: 1.2, marginBottom: "8px" }}>Your Appointment, <em>Our Promise</em></h2>
              <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "12px", color: "rgba(245,239,230,0.5)", lineHeight: 1.75, fontWeight: 400 }}>Everything you need to know before you book.</p>
            </div>

            {/* Deposit highlight */}
            <div style={{ padding: "24px 32px", borderBottom: "1px solid rgba(200,169,126,0.12)", background: "rgba(200,169,126,0.08)" }}>
              <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "linear-gradient(135deg, #8B6914, #C8A97E)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: "16px" }}>💳</span>
                </div>
                <div>
                  <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: GOLD, marginBottom: "6px" }}>GHS 50 DEPOSIT: HOW IT WORKS</p>
                  <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "12px", color: "rgba(245,239,230,0.75)", lineHeight: 1.8, fontWeight: 400 }}>
                    A GHS 50 deposit is required on arrival to confirm your slot. It is fully applied toward your service total. You pay the remaining balance after your service is done.
                  </p>
                </div>
              </div>
            </div>

            {[
              { icon: "◈", title: "Expert Stylists, Every Time", body: "All staff are certified specialists. You will never be assigned an untrained stylist at Zolara." },
              { icon: "✦", title: "The Luxury Difference", body: "Free WiFi, chilled water, Arctic AC, and a perfume spritz with chocolate on your way out." },
              { icon: "◇", title: "Cancellation Policy", body: "Cancel 24 or more hours out for a full reschedule at no cost. Less than 12 hours notice forfeits the deposit. Please call to cancel. SMS cancellations are not accepted." },
              { icon: "◉", title: "Lateness Policy", body: "Arrive 5 to 10 minutes early. 15 or more minutes late incurs a GHS 50 lateness fee. 30 or more minutes may result in cancellation." },
              { icon: "❋", title: "Loyalty Rewards", body: "Earn 1 stamp per GHS 100 spent. 10 stamps earns 1 free service worth up to GHS 300. Double stamps in your birthday month." },
              { icon: "★", title: "Student Discount", body: "10% off all services Mon to Thu with a valid student ID. Present your ID at booking to qualify." },
            ].map(({ icon, title, body }) => (
              <div key={title} style={{ padding: "18px 32px", borderBottom: "1px solid rgba(200,169,126,0.08)", display: "flex", gap: "14px", alignItems: "flex-start" }}>
                <span style={{ color: GOLD, fontSize: "15px", flexShrink: 0, marginTop: "2px" }}>{icon}</span>
                <div>
                  <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.06em", color: "rgba(245,239,230,0.88)", marginBottom: "5px" }}>{title}</p>
                  <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "11.5px", color: "rgba(245,239,230,0.5)", lineHeight: 1.75, fontWeight: 400 }}>{body}</p>
                </div>
              </div>
            ))}

            <div style={{ padding: "22px 32px" }}>
              <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "10px", letterSpacing: "0.2em", color: GOLD, fontWeight: 700, marginBottom: "10px" }}>NEED HELP? CALL US</p>
              <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "14px", color: "rgba(245,239,230,0.8)", fontWeight: 500, marginBottom: "3px" }}>059 436 5314</p>
              <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "14px", color: "rgba(245,239,230,0.8)", fontWeight: 500 }}>020 884 8707</p>
              <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "11px", color: "rgba(245,239,230,0.3)", marginTop: "8px", fontWeight: 400 }}>Mon to Sat · 8:30 AM to 9:00 PM</p>
            </div>
          </div>
        </div>

        {/* RIGHT: Form */}
        <div id="booking-form-top">
          <div style={{ marginBottom: "32px" }}>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "10px", letterSpacing: "0.26em", color: GOLD_DARK, fontWeight: 700, marginBottom: "8px" }}>BOOK YOUR APPOINTMENT</p>
            <h1 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 500, color: DARK, lineHeight: 1.15, marginBottom: "8px" }}>Reserve Your <em>Zolara</em> Experience</h1>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "13.5px", color: TXT_MID, lineHeight: 1.75 }}>Fill in your details. A GHS 50 deposit is collected on arrival to secure your slot.</p>
          </div>

          {/* Personal Details */}
          <div style={{ background: WHITE, borderRadius: "12px", padding: "32px", marginBottom: "20px", boxShadow: "0 2px 16px rgba(28,22,14,0.06)", border: `1px solid ${BORDER}` }}>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: GOLD_DARK, marginBottom: "24px" }}>YOUR DETAILS</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label style={lbl}>Full Name *</label>
                <div style={{ position: "relative" }}>
                  <User size={14} style={{ position: "absolute", left: "12px", top: "14px", color: TXT_SOFT }} />
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" style={{ ...inp, paddingLeft: "38px" }} />
                </div>
                {errors.name && <p className="error-field" style={{ fontFamily: "'Montserrat',sans-serif", color: RED, fontSize: "11px", marginTop: "4px" }}>{errors.name}</p>}
              </div>
              <div>
                <label style={lbl}>Phone *</label>
                <div style={{ position: "relative" }}>
                  <Phone size={14} style={{ position: "absolute", left: "12px", top: "14px", color: TXT_SOFT }} />
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0XX XXX XXXX" style={{ ...inp, paddingLeft: "38px" }} />
                </div>
                {errors.phone && <p className="error-field" style={{ fontFamily: "'Montserrat',sans-serif", color: RED, fontSize: "11px", marginTop: "4px" }}>{errors.phone}</p>}
              </div>
            </div>
            <div>
              <label style={lbl}>Email (Optional)</label>
              <div style={{ position: "relative" }}>
                <Mail size={14} style={{ position: "absolute", left: "12px", top: "14px", color: TXT_SOFT }} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" style={{ ...inp, paddingLeft: "38px" }} />
              </div>
            </div>
          </div>

          {/* Service Select - dropdown */}
          <div style={{ background: WHITE, borderRadius: "12px", padding: "32px", marginBottom: "20px", boxShadow: "0 2px 16px rgba(28,22,14,0.06)", border: `1px solid ${BORDER}` }}>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: GOLD_DARK, marginBottom: "24px" }}>SELECT A SERVICE</p>
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}>
                <Loader2 size={24} style={{ color: GOLD, animation: "spin 0.8s linear infinite" }} />
              </div>
            ) : (
              <div style={{ position: "relative" }}>
                <select className="svc-select" value={serviceId} onChange={e => setServiceId(e.target.value)} style={{ ...inp, paddingRight: "44px" }}>
                  <option value="">Choose a service...</option>
                  {Object.entries(grouped).map(([cat, svcs]) => (
                    <optgroup key={cat} label={cat}>
                      {(svcs as any[]).map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.name} · GHS {Number(s.price).toLocaleString()} ({s.duration_minutes} min)
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <ChevronDown size={16} style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", color: TXT_SOFT, pointerEvents: "none" }} />
              </div>
            )}
            {selectedService && (
              <div style={{ marginTop: "16px", background: "rgba(200,169,126,0.08)", border: "1px solid rgba(200,169,126,0.22)", borderRadius: "8px", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "13px", fontWeight: 600, color: DARK, marginBottom: "2px" }}>{selectedService.name}</p>
                  <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "11px", color: TXT_SOFT }}>{selectedService.duration_minutes} minutes</p>
                </div>
                <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "24px", fontWeight: 700, color: GOLD_DARK }}>GHS {Number(selectedService.price).toLocaleString()}</p>
              </div>
            )}
            {errors.service && <p className="error-field" style={{ fontFamily: "'Montserrat',sans-serif", color: RED, fontSize: "11px", marginTop: "8px" }}>{errors.service}</p>}
          </div>

          {/* Date and Time */}
          <div style={{ background: WHITE, borderRadius: "12px", padding: "32px", marginBottom: "20px", boxShadow: "0 2px 16px rgba(28,22,14,0.06)", border: `1px solid ${BORDER}` }}>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: GOLD_DARK, marginBottom: "24px" }}>DATE AND TIME</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={lbl}>Date *</label>
                <div style={{ position: "relative" }}>
                  <Calendar size={14} style={{ position: "absolute", left: "12px", top: "14px", color: TXT_SOFT }} />
                  <input type="date" value={preferredDate} onChange={e => setDate(e.target.value)} min={today} style={{ ...inp, paddingLeft: "38px" }} />
                </div>
                {errors.date && <p className="error-field" style={{ fontFamily: "'Montserrat',sans-serif", color: RED, fontSize: "11px", marginTop: "4px" }}>{errors.date}</p>}
              </div>
              <div>
                <label style={lbl}>Time *</label>
                <div style={{ position: "relative" }}>
                  <Clock size={14} style={{ position: "absolute", left: "12px", top: "14px", color: TXT_SOFT }} />
                  <input type="time" value={preferredTime} onChange={e => setTime(e.target.value)} min="08:30" max="21:00" style={{ ...inp, paddingLeft: "38px" }} />
                </div>
                {errors.time && <p className="error-field" style={{ fontFamily: "'Montserrat',sans-serif", color: RED, fontSize: "11px", marginTop: "4px" }}>{errors.time}</p>}
              </div>
            </div>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "11px", color: TXT_SOFT, marginTop: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
              <Sparkles size={11} style={{ color: GOLD }} /> Open Mon to Sat · 8:30 AM to 9:00 PM · Closed Sundays
            </p>
          </div>

          {/* Special Requests */}
          <div style={{ background: WHITE, borderRadius: "12px", padding: "32px", marginBottom: "20px", boxShadow: "0 2px 16px rgba(28,22,14,0.06)", border: `1px solid ${BORDER}` }}>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: GOLD_DARK, marginBottom: "24px" }}>SPECIAL REQUESTS</p>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Style references, allergies, or anything we should know..." rows={3} style={{ ...inp, resize: "vertical" }} />
          </div>

          {/* Promo Code */}
          <div style={{ background: WHITE, borderRadius: "12px", padding: "32px", marginBottom: "20px", boxShadow: "0 2px 16px rgba(28,22,14,0.06)", border: `1px solid ${BORDER}` }}>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: GOLD_DARK, marginBottom: "24px" }}>PROMO CODE</p>
            <div style={{ display: "flex", gap: "10px" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <Tag size={14} style={{ position: "absolute", left: "12px", top: "14px", color: TXT_SOFT }} />
                <input value={promoCode} onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoApplied(null); setPromoError(""); }} placeholder="ENTER CODE" style={{ ...inp, paddingLeft: "38px", fontFamily: "monospace", letterSpacing: "0.1em" }} />
              </div>
              <button onClick={handleApplyPromo} disabled={!promoCode || promoLoading}
                style={{ padding: "12px 20px", background: promoApplied ? GREEN : `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD})`, border: "none", borderRadius: "8px", color: WHITE, fontWeight: 700, fontSize: "12px", cursor: "pointer", whiteSpace: "nowrap", opacity: !promoCode ? 0.5 : 1, fontFamily: "'Montserrat',sans-serif" }}>
                {promoLoading ? "..." : promoApplied ? "Applied" : "Apply"}
              </button>
            </div>
            {promoError && <p style={{ fontFamily: "'Montserrat',sans-serif", color: RED, fontSize: "11px", marginTop: "6px" }}>{promoError}</p>}
            {promoApplied && <p style={{ fontFamily: "'Montserrat',sans-serif", color: GREEN, fontSize: "11px", marginTop: "6px" }}>{promoApplied.discount_type === "percentage" ? `${promoApplied.discount_value}% off` : `GHS ${promoApplied.discount_value} off`} applied.</p>}
          </div>

          {/* Balance payment method */}
          <div style={{ background: WHITE, borderRadius: "12px", padding: "32px", marginBottom: "20px", boxShadow: "0 2px 16px rgba(28,22,14,0.06)", border: `1px solid ${BORDER}` }}>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: GOLD_DARK, marginBottom: "8px" }}>BALANCE PAYMENT METHOD</p>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "12px", color: TXT_SOFT, marginBottom: "20px" }}>How will you pay the remaining balance when you arrive?</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
              {enabledPayments.map((m: any) => {
                const sel = paymentPref === m.id;
                return (
                  <button key={m.id} className="pay-btn" onClick={() => setPaymentPref(m.id)}
                    style={{ padding: "16px 10px", border: `2px solid ${sel ? GOLD : BORDER}`, borderRadius: "10px", background: sel ? "rgba(200,169,126,0.1)" : WHITE, cursor: "pointer", textAlign: "center", transition: "all 0.15s", fontFamily: "'Montserrat',sans-serif" }}>
                    <div style={{ fontSize: "22px", marginBottom: "8px" }}>{PAYMENT_ICONS[m.id] || "💰"}</div>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: sel ? GOLD_DARK : TXT_MID, letterSpacing: "0.05em" }}>{PAYMENT_LABELS[m.id] || m.name || m.id}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary and submit */}
          <div style={{ background: "linear-gradient(150deg, #2C2416 0%, #1A1008 100%)", borderRadius: "12px", padding: "32px", boxShadow: "0 8px 32px rgba(28,22,14,0.2)" }}>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: "rgba(200,169,126,0.8)", marginBottom: "20px" }}>BOOKING SUMMARY</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
              {[
                { label: "Name", value: name || "..." },
                { label: "Phone", value: phone || "..." },
                { label: "Service", value: selectedService?.name || "Not selected" },
                { label: "Date", value: preferredDate || "..." },
                { label: "Time", value: preferredTime || "..." },
              ].map(row => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.07)", paddingBottom: "10px" }}>
                  <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>{row.label}</span>
                  <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "13px", fontWeight: 600, color: "#F5EFE6" }}>{row.value}</span>
                </div>
              ))}
              {discount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.07)", paddingBottom: "10px" }}>
                  <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Discount</span>
                  <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "13px", fontWeight: 600, color: GREEN }}>GHS {discount.toFixed(0)} off</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px" }}>
                <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "13px", fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Service Total</span>
                <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "28px", fontWeight: 700, color: GOLD }}>{selectedService ? `GHS ${total.toLocaleString()}` : "..."}</span>
              </div>
            </div>

            {/* Deposit breakdown */}
            <div style={{ background: "rgba(200,169,126,0.1)", border: "1px solid rgba(200,169,126,0.25)", borderRadius: "8px", padding: "16px 18px", marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "12px", color: "rgba(245,239,230,0.6)", fontWeight: 500 }}>Deposit on arrival</span>
                <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "20px", fontWeight: 700, color: GOLD }}>GHS 50</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "12px", color: "rgba(245,239,230,0.6)", fontWeight: 500 }}>Balance after service</span>
                <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "20px", fontWeight: 700, color: "rgba(245,239,230,0.7)" }}>{selectedService ? `GHS ${Math.max(0, total - 50).toLocaleString()}` : "..."}</span>
              </div>
            </div>

            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "11px", color: "rgba(245,239,230,0.35)", textAlign: "center", marginBottom: "20px", lineHeight: 1.75 }}>
              By booking, you agree to our cancellation and lateness policies. Your deposit secures your slot.
            </p>

            <button onClick={handleSubmit} disabled={submitting}
              style={{ width: "100%", padding: "20px", borderRadius: "8px", background: submitting ? "#555" : `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD})`, border: "none", color: WHITE, fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", cursor: submitting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", fontFamily: "'Montserrat',sans-serif", boxShadow: "0 8px 32px rgba(139,105,20,0.4)", transition: "all 0.3s ease" }}>
              {submitting ? <><Loader2 size={16} style={{ animation: "spin 0.8s linear infinite" }} /> SUBMITTING…</> : "REQUEST BOOKING"}
            </button>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "11px", color: "rgba(245,239,230,0.3)", textAlign: "center", marginTop: "12px" }}>
              We will confirm your appointment via SMS within a few hours.
            </p>
          </div>
        </div>
      </div>
      <AmandaWidget />
    </div>
  );
}
