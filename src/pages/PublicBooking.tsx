import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Calendar, Clock, User, Sparkles, Phone, CreditCard, ChevronLeft, Check, MessageCircle, AlertCircle } from "lucide-react";
import { normalizeTimeTo24, isTimeWithinRange } from "@/lib/time";
import { sendSMS, SMS } from "@/lib/sms";
import { useSettings } from "@/context/SettingsContext";
import { format } from "date-fns";

const C = {
  bg: "#0F0D0B",
  card: "rgba(255,255,255,0.04)",
  cardBorder: "rgba(255,255,255,0.09)",
  gold: "#B8966E",
  goldLight: "#D4AF7A",
  goldDark: "#8B6A3E",
  cream: "#FAF7F2",
  white: "#FFFFFF",
  muted: "rgba(255,255,255,0.55)",
  input: "rgba(255,255,255,0.06)",
  inputBorder: "rgba(255,255,255,0.12)",
  success: "#10B981",
};

export default function PublicBooking() {
  const { settings } = useSettings();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [bookingRef, setBookingRef] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => { fetchServices(); }, []);

  const fetchServices = async () => {
    const { data } = await supabase.from("services").select("*").eq("is_active", true).order("category").order("name");
    setServices(data || []);
    setLoading(false);
  };

  const selectedService = services.find(s => s.id === serviceId);
  const today = new Date().toISOString().split("T")[0];

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) e.name = "Please enter your full name";
    if (!phone.trim() || phone.replace(/\D/g,"").length < 9) e.phone = "Please enter a valid phone number";
    if (!serviceId) e.service = "Please select a service";
    if (!date) e.date = "Please select a date";
    if (!time) e.time = "Please select a time";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Please enter a valid email";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);

    try {
      const normalizedTime = normalizeTimeTo24(time);
      const selectedDate = new Date(`${date}T00:00:00`);
      if (selectedDate.getDay() === 0) {
        toast.error("We are closed on Sundays. Please choose another date.");
        setSubmitting(false);
        return;
      }

      // Find or create client by phone
      const cleanPhone = phone.replace(/\s/g, "");
      const { data: existing } = await supabase
        .from("clients")
        .select("id, name, phone")
        .eq("phone", cleanPhone)
        .maybeSingle();

      let clientId: string;

      if (existing) {
        clientId = (existing as any).id;
        // Update name if it changed
        await supabase.from("clients").update({ name: name.trim() }).eq("id", clientId);
      } else {
        const { data: newClient, error: clientErr } = await supabase
          .from("clients")
          .insert({ name: name.trim(), phone: cleanPhone, email: email || null })
          .select("id")
          .single();
        if (clientErr) throw clientErr;
        clientId = (newClient as any).id;
      }

      // Create booking in bookings table with correct column names
      const ref = "ZBS-" + Date.now().toString(36).toUpperCase();
      const { error: bookingErr } = await supabase
        .from("bookings")
        .insert({
          client_id: clientId,
          service_id: serviceId,
          client_name: name.trim(),
          client_phone: phone,
          client_email: email || null,
          service_name: selectedService?.name || "",
          preferred_date: date,
          preferred_time: normalizedTime,
          price: selectedService?.price || null,
          duration_minutes: selectedService?.duration_minutes || null,
          notes: notes || null,
          status: "scheduled",
          deposit_amount: 50,
          deposit_paid: false,
          booking_ref: ref,
        } as any);

      if (bookingErr) throw bookingErr;

      setBookingRef(ref);

      // Send SMS confirmation
      const formattedDate = format(new Date(`${date}T00:00:00`), "EEEE, MMMM d yyyy");
      const smsSent = await sendSMS(phone, SMS.bookingConfirmation(name.trim(), selectedService?.name || "Beauty Service", formattedDate, normalizedTime));
      if (!smsSent) console.warn("SMS failed to send but booking was created");

      setSubmitted(true);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Group services by category
  const grouped = services.reduce((acc: Record<string, any[]>, s) => {
    const cat = s.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  const inputStyle = {
    width: "100%",
    padding: "13px 16px",
    background: C.input,
    border: `1px solid ${C.inputBorder}`,
    borderRadius: 10,
    color: C.white,
    fontSize: 14,
    outline: "none",
    fontFamily: "Jost, sans-serif",
    boxSizing: "border-box" as const,
  };

  const labelStyle = {
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.1em",
    color: C.muted,
    marginBottom: 6,
    fontFamily: "Jost, sans-serif",
    textTransform: "uppercase" as const,
  };

  if (submitted) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=Jost:wght@300;400;500;600&display=swap');`}</style>
        <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <Check size={36} color={C.bg} strokeWidth={2.5} />
          </div>
          <h2 style={{ fontSize: 32, fontWeight: 400, color: C.white, marginBottom: 12, fontFamily: "Cormorant Garamond, serif" }}>Booking Received!</h2>
          <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, marginBottom: 8, fontFamily: "Jost, sans-serif" }}>
            Reference: <span style={{ color: C.gold, fontWeight: 600 }}>{bookingRef}</span>
          </p>
          <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, marginBottom: 32, fontFamily: "Jost, sans-serif" }}>
            A confirmation SMS has been sent to <span style={{ color: C.white }}>{phone}</span>. Your slot is secured once the GHS 50 deposit is received.
          </p>

          <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: 24, marginBottom: 32, textAlign: "left" }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.15em", color: C.gold, marginBottom: 16, fontFamily: "Jost, sans-serif" }}>NEXT STEPS</p>
            {[
              { num: "1", label: "Send GHS 50 deposit", sub: "MTN MoMo: 0594 365 314 (Zolara Beauty Studio)" },
              { num: "2", label: "Wait for confirmation", sub: "We will confirm your slot via SMS or call" },
              { num: "3", label: "Show up and be pampered", sub: `${selectedService?.name || "Your service"} on ${date ? format(new Date(date + "T00:00:00"), "MMM d") : date} at ${time}` },
            ].map(({ num, label, sub }) => (
              <div key={num} style={{ display: "flex", gap: 14, marginBottom: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 12, fontWeight: 700, color: C.bg }}>{num}</div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500, color: C.white, fontFamily: "Jost, sans-serif" }}>{label}</p>
                  <p style={{ fontSize: 12, color: C.muted, fontFamily: "Jost, sans-serif" }}>{sub}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <a href="https://wa.me/233594365314" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
              <button style={{ width: "100%", padding: "14px", background: "#25D366", border: "none", borderRadius: 10, color: C.white, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "Jost, sans-serif" }}>
                <MessageCircle size={16} /> Chat on WhatsApp
              </button>
            </a>
            <Link to="/" style={{ textDecoration: "none" }}>
              <button style={{ width: "100%", padding: "14px", background: "transparent", border: `1px solid ${C.inputBorder}`, borderRadius: 10, color: C.muted, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Jost, sans-serif" }}>
                Return to Home
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.white }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=Jost:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        input[type=date]::-webkit-calendar-picker-indicator,
        input[type=time]::-webkit-calendar-picker-indicator { filter: invert(1) opacity(0.5); }
        input::placeholder { color: rgba(255,255,255,0.25); }
        select option { background: #1A1A1A; color: white; }
        .booking-input:focus { border-color: #B8966E !important; box-shadow: 0 0 0 3px rgba(184,150,110,0.12); }
        @media(max-width:640px) { .two-col { grid-template-columns: 1fr !important; } }
      `}</style>

      {/* Navbar */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(15,13,11,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/logo.png" alt="Zolara" style={{ width: 36, height: 36, objectFit: "contain" }} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, color: C.white, letterSpacing: "0.12em" }}>ZOLARA</p>
            <p style={{ fontSize: 9, color: C.gold, letterSpacing: "0.2em", fontFamily: "Jost, sans-serif" }}>BEAUTY STUDIO</p>
          </div>
        </Link>
        <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.muted, fontFamily: "Jost, sans-serif" }}>
          <ChevronLeft size={14} /> Back to Home
        </Link>
      </nav>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 20px 80px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <img src="/logo.png" alt="Zolara" style={{ width: 64, height: 64, objectFit: "contain", margin: "0 auto 16px" }} />
          <h1 style={{ fontSize: "clamp(32px, 6vw, 48px)", fontWeight: 400, color: C.white, marginBottom: 8, fontFamily: "Cormorant Garamond, serif" }}>Book an Appointment</h1>
          <p style={{ fontSize: 14, color: C.muted, fontFamily: "Jost, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Sparkles size={14} color={C.gold} /> Where Luxury Meets Beauty in Tamale
          </p>
        </div>

        {/* Deposit Notice */}
        <div style={{ background: `linear-gradient(135deg, rgba(184,150,110,0.12), rgba(184,150,110,0.06))`, border: `1px solid rgba(184,150,110,0.3)`, borderRadius: 14, padding: "18px 20px", marginBottom: 28, display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <CreditCard size={18} color={C.bg} />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: C.gold, marginBottom: 4, fontFamily: "Jost, sans-serif" }}>GHS 50 Non-Refundable Deposit Required</p>
            <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, fontFamily: "Jost, sans-serif" }}>After booking, you will receive an SMS with payment details. Your appointment is only secured once the deposit is confirmed. Send to MTN MoMo: <span style={{ color: C.white }}>0594 365 314</span></p>
          </div>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
            <Loader2 size={28} style={{ color: C.gold, animation: "spin 1s linear infinite" }} />
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>

            {/* Section 1: Your Info */}
            <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: 28, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${C.gold}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <User size={15} color={C.gold} />
                </div>
                <p style={{ fontSize: 15, fontWeight: 500, color: C.white, fontFamily: "Cormorant Garamond, serif" }}>Your Information</p>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Full Name <span style={{ color: C.gold }}>*</span></label>
                <input className="booking-input" value={name} onChange={e => setName(e.target.value)} placeholder="Enter your full name" style={{ ...inputStyle, borderColor: errors.name ? "#EF4444" : C.inputBorder }} />
                {errors.name && <p style={{ fontSize: 11, color: "#EF4444", marginTop: 4, fontFamily: "Jost, sans-serif" }}>{errors.name}</p>}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="two-col">
                <div>
                  <label style={labelStyle}>Phone Number <span style={{ color: C.gold }}>*</span></label>
                  <input className="booking-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 0594 365 314" type="tel" style={{ ...inputStyle, borderColor: errors.phone ? "#EF4444" : C.inputBorder }} />
                  {errors.phone && <p style={{ fontSize: 11, color: "#EF4444", marginTop: 4, fontFamily: "Jost, sans-serif" }}>{errors.phone}</p>}
                </div>
                <div>
                  <label style={labelStyle}>Email <span style={{ color: C.muted, fontWeight: 400 }}>(optional)</span></label>
                  <input className="booking-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" type="email" style={{ ...inputStyle, borderColor: errors.email ? "#EF4444" : C.inputBorder }} />
                  {errors.email && <p style={{ fontSize: 11, color: "#EF4444", marginTop: 4, fontFamily: "Jost, sans-serif" }}>{errors.email}</p>}
                </div>
              </div>
            </div>

            {/* Section 2: Service */}
            <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: 28, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${C.gold}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Sparkles size={15} color={C.gold} />
                </div>
                <p style={{ fontSize: 15, fontWeight: 500, color: C.white, fontFamily: "Cormorant Garamond, serif" }}>Select a Service</p>
              </div>

              <select className="booking-input" value={serviceId} onChange={e => setServiceId(e.target.value)} style={{ ...inputStyle, borderColor: errors.service ? "#EF4444" : C.inputBorder, cursor: "pointer" }}>
                <option value="">Choose a service...</option>
                {Object.entries(grouped).map(([cat, svcs]) => (
                  <optgroup key={cat} label={cat}>
                    {(svcs as any[]).map(s => (
                      <option key={s.id} value={s.id}>{s.name} {s.price ? `- GHS ${s.price}` : ""}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {errors.service && <p style={{ fontSize: 11, color: "#EF4444", marginTop: 4, fontFamily: "Jost, sans-serif" }}>{errors.service}</p>}

              {selectedService && (
                <div style={{ marginTop: 14, padding: "14px 16px", background: `${C.gold}0A`, border: `1px solid ${C.gold}30`, borderRadius: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: C.white, fontFamily: "Jost, sans-serif" }}>{selectedService.name}</p>
                      {selectedService.description && <p style={{ fontSize: 12, color: C.muted, fontFamily: "Jost, sans-serif", marginTop: 2 }}>{selectedService.description}</p>}
                    </div>
                    {selectedService.price && <p style={{ fontSize: 16, fontWeight: 600, color: C.gold, fontFamily: "Cormorant Garamond, serif" }}>GHS {selectedService.price}</p>}
                  </div>
                  {selectedService.duration_minutes && <p style={{ fontSize: 11, color: C.muted, marginTop: 6, fontFamily: "Jost, sans-serif" }}>Estimated duration: {selectedService.duration_minutes} minutes</p>}
                </div>
              )}
            </div>

            {/* Section 3: Date & Time */}
            <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: 28, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${C.gold}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Calendar size={15} color={C.gold} />
                </div>
                <p style={{ fontSize: 15, fontWeight: 500, color: C.white, fontFamily: "Cormorant Garamond, serif" }}>Date and Time</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="two-col">
                <div>
                  <label style={labelStyle}>Preferred Date <span style={{ color: C.gold }}>*</span></label>
                  <input className="booking-input" type="date" value={date} onChange={e => setDate(e.target.value)} min={today} style={{ ...inputStyle, borderColor: errors.date ? "#EF4444" : C.inputBorder }} />
                  {errors.date && <p style={{ fontSize: 11, color: "#EF4444", marginTop: 4, fontFamily: "Jost, sans-serif" }}>{errors.date}</p>}
                </div>
                <div>
                  <label style={labelStyle}>Preferred Time <span style={{ color: C.gold }}>*</span></label>
                  <input className="booking-input" type="time" value={time} onChange={e => setTime(e.target.value)} min="08:30" max="21:00" style={{ ...inputStyle, borderColor: errors.time ? "#EF4444" : C.inputBorder }} />
                  {errors.time && <p style={{ fontSize: 11, color: "#EF4444", marginTop: 4, fontFamily: "Jost, sans-serif" }}>{errors.time}</p>}
                </div>
              </div>
              <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
                <AlertCircle size={12} color={C.muted} />
                <p style={{ fontSize: 11, color: C.muted, fontFamily: "Jost, sans-serif" }}>Open Monday to Saturday, 8:30 AM to 9:00 PM. Closed Sundays.</p>
              </div>
            </div>

            {/* Section 4: Notes */}
            <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: 28, marginBottom: 24 }}>
              <label style={labelStyle}>Special Requests <span style={{ color: C.muted, fontWeight: 400 }}>(optional)</span></label>
              <textarea className="booking-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any special requests, style references, or notes for your appointment..." rows={3} style={{ ...inputStyle, resize: "vertical", minHeight: 90 }} />
            </div>

            {/* Submit */}
            <button onClick={handleSubmit} disabled={submitting} style={{ width: "100%", padding: "18px", background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, border: "none", borderRadius: 12, color: C.bg, fontSize: 13, fontWeight: 700, letterSpacing: "0.14em", cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1, fontFamily: "Jost, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {submitting ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Processing...</> : "REQUEST APPOINTMENT"}
            </button>

            <p style={{ textAlign: "center", fontSize: 12, color: C.muted, marginTop: 12, fontFamily: "Jost, sans-serif" }}>
              By booking, you agree to our GHS 50 deposit policy and 24-hour cancellation notice requirement.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
