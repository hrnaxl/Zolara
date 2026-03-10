import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Sparkles, Calendar, Clock, Loader2, Check, Phone, Mail, User, ChevronLeft, AlertCircle } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { normalizeTimeTo24, isTimeWithinRange } from "@/lib/time";
import { format } from "date-fns";

const PublicBooking = () => {
  const { settings } = useSettings();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [bookingRef, setBookingRef] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    supabase.from("services").select("*").eq("is_active", true).order("category").order("name")
      .then(({ data }) => { setServices(data || []); setLoading(false); });
  }, []);

  const selectedService = services.find((s) => s.id === serviceId);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) e.name = "Please enter your full name";
    if (!phone.trim() || phone.replace(/\s/g, "").length < 10) e.phone = "Please enter a valid phone number";
    if (!serviceId) e.service = "Please select a service";
    if (!preferredDate) e.date = "Please select a date";
    if (!preferredTime) e.time = "Please select a time";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);

    try {
      const normalizedTime = normalizeTimeTo24(preferredTime);

      // Check not Sunday
      const selectedDate = new Date(`${preferredDate}T00:00:00`);
      if (selectedDate.getDay() === 0) {
        toast.error("We are closed on Sundays. Please choose another date.");
        setSubmitting(false);
        return;
      }

      // Check operating hours
      const openTime = (settings as any)?.open_time || "08:30";
      const closeTime = (settings as any)?.close_time || "21:00";
      if (!isTimeWithinRange(normalizedTime, openTime, closeTime)) {
        toast.error(`Please choose a time within our hours: ${openTime} – ${closeTime}`);
        setSubmitting(false);
        return;
      }

      // Find or create client by phone
      const cleanPhone = phone.replace(/\s/g, "");
      const { data: existingClient } = await supabase
        .from("clients")
        .select("id")
        .eq("phone", cleanPhone)
        .maybeSingle();

      let clientId: string | null = null;

      if (existingClient) {
        clientId = existingClient.id;
        // Update their name if they re-book
        await supabase.from("clients").update({ name: name.trim(), email: email || null }).eq("id", clientId);
      } else {
        const { data: newClient, error: clientErr } = await supabase
          .from("clients")
          .insert({ name: name.trim(), phone: cleanPhone, email: email || null })
          .select("id")
          .single();
        if (clientErr) throw clientErr;
        clientId = newClient.id;
      }

      // Generate booking ref
      const ref = "ZBS-" + Date.now().toString(36).toUpperCase().slice(-6);

      // Insert booking with real column names and valid status
      const { error: bookingErr } = await supabase.from("bookings").insert({
        client_id: clientId,
        service_id: serviceId,
        client_name: name.trim(),
        client_phone: cleanPhone,
        client_email: email || null,
        service_name: selectedService?.name || null,
        preferred_date: preferredDate,
        preferred_time: normalizedTime,
        status: "pending",
        notes: notes || null,
        price: selectedService?.price || null,
        duration_minutes: selectedService?.duration_minutes || null,
        deposit_amount: 50,
        deposit_paid: false,
        booking_ref: ref,
      } as any);

      if (bookingErr) throw bookingErr;

      setBookingRef(ref);
      setSubmitted(true);
    } catch (err: any) {
      console.error("Booking error:", err);
      toast.error(err?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── SUCCESS SCREEN ───────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#0F0D0B" }}>
        <div className="w-full max-w-md text-center space-y-6 p-8 rounded-2xl border" style={{ borderColor: "#B8935A33", background: "#1A1612" }}>
          <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center" style={{ background: "#B8935A22" }}>
            <Check className="w-10 h-10" style={{ color: "#B8935A" }} />
          </div>
          <h2 className="text-2xl font-bold text-white">Booking Received</h2>
          <div className="p-4 rounded-xl" style={{ background: "#B8935A15", border: "1px solid #B8935A33" }}>
            <p className="text-sm" style={{ color: "#B8935A" }}>Booking Reference</p>
            <p className="text-xl font-bold text-white mt-1">{bookingRef}</p>
          </div>
          <p style={{ color: "#9A8878" }} className="text-sm">
            We will contact you on <span className="text-white font-medium">{phone}</span> to confirm your appointment.
            Please send your GHS 50 deposit to <span className="text-white font-medium">0594365314 (Zolara)</span> via MoMo to secure your slot.
          </p>
          <div className="flex flex-col gap-3 pt-2">
            <Link to="/">
              <button className="w-full py-3 rounded-xl font-semibold text-sm" style={{ background: "#B8935A", color: "#fff" }}>
                Return to Home
              </button>
            </Link>
            <button className="w-full py-3 rounded-xl font-semibold text-sm border" style={{ borderColor: "#B8935A44", color: "#B8935A" }}
              onClick={() => { setSubmitted(false); setName(""); setEmail(""); setPhone(""); setServiceId(""); setPreferredDate(""); setPreferredTime(""); setNotes(""); setBookingRef(""); }}>
              Book Another Appointment
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── BOOKING FORM ─────────────────────────────────────────────────
  const groupedServices = services.reduce((acc: Record<string, any[]>, s) => {
    const cat = s.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  const inputStyle = {
    background: "#1A1612",
    border: "1px solid #3A3028",
    color: "#FAF7F2",
    borderRadius: "10px",
    padding: "12px 16px",
    width: "100%",
    fontSize: "14px",
    outline: "none",
  };
  const labelStyle = { color: "#9A8878", fontSize: "11px", fontWeight: "600", letterSpacing: "0.08em", textTransform: "uppercase" as const, display: "block", marginBottom: "8px" };
  const sectionStyle = { background: "#1A1612", border: "1px solid #2A2420", borderRadius: "16px", padding: "24px" };
  const gold = "#B8935A";

  return (
    <div className="min-h-screen" style={{ background: "#0F0D0B" }}>
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4" style={{ background: "#0F0D0Bee", backdropFilter: "blur(12px)", borderBottom: "1px solid #2A2420" }}>
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo.png" alt="Zolara" className="h-8 w-auto" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <div>
            <div className="text-white font-bold text-sm tracking-widest" style={{ fontFamily: "Cormorant Garamond, serif" }}>ZOLARA</div>
            <div style={{ color: gold, fontSize: "9px", letterSpacing: "0.2em" }}>BEAUTY STUDIO</div>
          </div>
        </Link>
        <Link to="/" className="flex items-center gap-2 text-sm" style={{ color: "#9A8878" }}>
          <ChevronLeft className="w-4 h-4" /> Back to Home
        </Link>
      </nav>

      <div className="pt-24 pb-16 px-4 max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center pb-4">
          <p className="text-xs tracking-widest mb-3" style={{ color: gold }}>ZOLARA BEAUTY STUDIO</p>
          <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: "Cormorant Garamond, serif" }}>Book an Appointment</h1>
          <p className="text-sm" style={{ color: "#9A8878" }}>Fill in the form below and we will confirm your booking</p>
        </div>

        {/* GHS 50 Deposit Notice */}
        <div className="rounded-xl p-4 flex gap-3" style={{ background: "#B8935A15", border: "1px solid #B8935A33" }}>
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: gold }} />
          <div>
            <p className="text-sm font-semibold text-white">GHS 50 Deposit Required</p>
            <p className="text-xs mt-1" style={{ color: "#9A8878" }}>After booking, send GHS 50 via MoMo to <strong style={{ color: "#FAF7F2" }}>0594365314 (Zolara)</strong> to secure your slot. We will confirm via WhatsApp.</p>
          </div>
        </div>

        {/* Personal Info */}
        <div style={sectionStyle}>
          <p className="text-xs tracking-widest mb-5" style={{ color: gold }}>YOUR INFORMATION</p>
          <div className="space-y-4">
            <div>
              <label style={labelStyle}>Full Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 w-4 h-4" style={{ color: "#6B5E54" }} />
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your full name" style={{ ...inputStyle, paddingLeft: "40px" }} />
              </div>
              {errors.name && <p className="text-xs mt-1" style={{ color: "#E57373" }}>{errors.name}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label style={labelStyle}>Phone Number *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3.5 w-4 h-4" style={{ color: "#6B5E54" }} />
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0XX XXX XXXX" style={{ ...inputStyle, paddingLeft: "40px" }} />
                </div>
                {errors.phone && <p className="text-xs mt-1" style={{ color: "#E57373" }}>{errors.phone}</p>}
              </div>
              <div>
                <label style={labelStyle}>Email (Optional)</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 w-4 h-4" style={{ color: "#6B5E54" }} />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" style={{ ...inputStyle, paddingLeft: "40px" }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Service Selection */}
        <div style={sectionStyle}>
          <p className="text-xs tracking-widest mb-5" style={{ color: gold }}>SELECT A SERVICE</p>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" style={{ color: gold }} /></div>
          ) : (
            <>
              <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} style={{ ...inputStyle, appearance: "none" }}>
                <option value="" style={{ background: "#1A1612" }}>Choose a service</option>
                {Object.entries(groupedServices).map(([cat, svcs]) => (
                  <optgroup key={cat} label={cat} style={{ background: "#1A1612", color: gold }}>
                    {svcs.map((s) => (
                      <option key={s.id} value={s.id} style={{ background: "#1A1612", color: "#FAF7F2" }}>
                        {s.name} – GHS {s.price}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {errors.service && <p className="text-xs mt-1" style={{ color: "#E57373" }}>{errors.service}</p>}
              {selectedService && (
                <div className="mt-3 p-3 rounded-xl flex justify-between items-center" style={{ background: "#B8935A10", border: "1px solid #B8935A22" }}>
                  <div>
                    <p className="font-semibold text-white text-sm">{selectedService.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#9A8878" }}>Est. duration: {selectedService.duration_minutes} minutes</p>
                  </div>
                  <p className="font-bold" style={{ color: gold }}>GHS {selectedService.price}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Date & Time */}
        <div style={sectionStyle}>
          <p className="text-xs tracking-widest mb-5" style={{ color: gold }}>DATE AND TIME</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Preferred Date *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3.5 w-4 h-4" style={{ color: "#6B5E54" }} />
                <input type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} min={today} style={{ ...inputStyle, paddingLeft: "40px" }} />
              </div>
              {errors.date && <p className="text-xs mt-1" style={{ color: "#E57373" }}>{errors.date}</p>}
            </div>
            <div>
              <label style={labelStyle}>Preferred Time *</label>
              <div className="relative">
                <Clock className="absolute left-3 top-3.5 w-4 h-4" style={{ color: "#6B5E54" }} />
                <input type="time" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} min="08:30" max="21:00" style={{ ...inputStyle, paddingLeft: "40px" }} />
              </div>
              {errors.time && <p className="text-xs mt-1" style={{ color: "#E57373" }}>{errors.time}</p>}
            </div>
          </div>
          <p className="text-xs mt-3" style={{ color: "#6B5E54" }}>
            <Sparkles className="inline w-3 h-3 mr-1" />
            Open Monday to Saturday, 8:30 AM to 9:00 PM. Closed Sundays.
          </p>
        </div>

        {/* Special Requests */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Special Requests (Optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Any special requests, style references, or notes for your appointment..."
            rows={4}
            style={{ ...inputStyle, resize: "vertical" as const }}
          />
        </div>

        {/* Submit */}
        <button onClick={handleSubmit} disabled={submitting}
          className="w-full py-4 rounded-xl font-semibold text-sm tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: gold, color: "#fff" }}>
          {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> PROCESSING...</> : "REQUEST APPOINTMENT"}
        </button>

        <p className="text-center text-xs" style={{ color: "#6B5E54" }}>
          By booking, you agree to our GHS 50 deposit policy and 24-hour cancellation notice requirement.
        </p>
      </div>
    </div>
  );
};

export default PublicBooking;
