import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { validatePromoCode } from "@/lib/promoCodes";
import { getAddons } from "@/lib/addons";
import { addToWaitlist } from "@/lib/waitlist";
import { sendSMS, SMS } from "@/lib/sms";
import { useSettings } from "@/context/SettingsContext";
import { normalizeTimeTo24, isTimeWithinRange } from "@/lib/time";
import { Loader2, Calendar, Clock, User, Phone, Mail, Sparkles, Tag, Plus, Minus, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const gold = "#B8935A";
const sectionStyle = { background: "#1E1916", border: "1px solid #2D2420", borderRadius: "16px", padding: "24px", marginBottom: "16px" };
const inputStyle = { width: "100%", background: "#141210", border: "1px solid #2D2420", borderRadius: "10px", padding: "12px 16px", color: "#FAF7F2", fontSize: "14px", outline: "none" };
const labelStyle = { display: "block", fontSize: "11px", letterSpacing: "0.1em", color: "#6B5E54", textTransform: "uppercase" as const, marginBottom: "6px", fontWeight: 600 };

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash", mobile_money: "Mobile Money", card: "Card / Hubtel",
  bank_transfer: "Bank Transfer", gift_card: "Gift Card",
};
const PAYMENT_ICONS: Record<string, string> = {
  cash: "💵", mobile_money: "📱", card: "💳", bank_transfer: "🏦", gift_card: "🎁",
};

interface Props {
  onSubmitted?: (ref: string) => void;
}

export default function EnhancedBookingForm({ onSubmitted }: Props) {
  const { settings } = useSettings();
  const [services, setServices] = useState<any[]>([]);
  const [addons, setAddons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [bookingRef, setBookingRef] = useState("");

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Add-ons
  const [selectedAddons, setSelectedAddons] = useState<Record<string, number>>({});

  // Promo code
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState<any>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState("");

  // Payment preference
  const [paymentPreference, setPaymentPreference] = useState("cash");

  // Waitlist
  const [joinWaitlist, setJoinWaitlist] = useState(false);
  const [slotsAvailable, setSlotsAvailable] = useState(true);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    Promise.all([
      supabase.from("services").select("*").eq("is_active", true).order("category").order("name"),
      getAddons(),
    ]).then(([{ data: svcData }, addonData]) => {
      setServices(svcData || []);
      setAddons(addonData || []);
      setLoading(false);
    });
  }, []);

  // Check slot availability when date/time/service changes
  useEffect(() => {
    const checkSlots = async () => {
      if (!serviceId || !preferredDate || !preferredTime) { setSlotsAvailable(true); return; }
      const { data } = await supabase.from("bookings")
        .select("id").eq("service_id", serviceId)
        .eq("preferred_date", preferredDate).eq("preferred_time", preferredTime)
        .in("status", ["pending", "confirmed"]);
      setSlotsAvailable(!data || data.length < 3);
    };
    checkSlots();
  }, [serviceId, preferredDate, preferredTime]);

  const selectedService = services.find(s => s.id === serviceId);

  const groupedServices = services.reduce((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {} as Record<string, any[]>);

  const serviceAddons = addons.filter(a => a.is_active);

  const addonTotal = Object.entries(selectedAddons).reduce((sum, [id, qty]) => {
    const addon = addons.find(a => a.id === id);
    return sum + (addon ? addon.price * qty : 0);
  }, 0);

  const basePrice = selectedService?.price || 0;
  const subtotal = basePrice + addonTotal;
  const discount = promoApplied
    ? promoApplied.discount_type === "percentage"
      ? (subtotal * promoApplied.discount_value) / 100
      : promoApplied.discount_value
    : 0;
  const total = Math.max(0, subtotal - discount);

  const handleAddonChange = (id: string, delta: number) => {
    setSelectedAddons(prev => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) { const { [id]: _, ...rest } = prev; return rest; }
      return { ...prev, [id]: next };
    });
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true); setPromoError("");
    const result = await validatePromoCode(promoCode);
    setPromoLoading(false);
    if (result.valid) { setPromoApplied(result.promo); toast.success("Promo code applied!"); }
    else { setPromoError(result.message); setPromoApplied(null); }
  };

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
      const selectedDate = new Date(`${preferredDate}T00:00:00`);
      if (selectedDate.getDay() === 0) { toast.error("We are closed on Sundays. Please choose another date."); return; }
      const openTime = (settings as any)?.open_time || "08:30";
      const closeTime = (settings as any)?.close_time || "21:00";
      if (!isTimeWithinRange(normalizedTime, openTime, closeTime)) {
        toast.error(`Please choose a time within our hours: ${openTime} – ${closeTime}`); return;
      }

      const cleanPhone = phone.replace(/\s/g, "");

      // Handle waitlist join
      if (!slotsAvailable && joinWaitlist) {
        await addToWaitlist({
          service_id: serviceId, preferred_date: preferredDate,
          preferred_time: normalizedTime, client_name: name,
          client_phone: cleanPhone, client_email: email || undefined, notes: notes || undefined,
        });
        toast.success("You've been added to the waitlist. We'll notify you when a slot opens.");
        setSubmitted(true);
        setBookingRef("WAITLIST");
        return;
      }

      // Find or create client
      const { data: existingClient } = await supabase.from("clients").select("id").eq("phone", cleanPhone).maybeSingle();
      let clientId = existingClient?.id;
      if (!clientId) {
        const { data: newClient } = await supabase.from("clients").insert({ name: name, phone: cleanPhone, email: email || null }).select("id").single();
        clientId = newClient?.id;
      }

      // Build addon ids list
      const addonIds = Object.entries(selectedAddons).filter(([, qty]) => qty > 0).map(([id]) => id);

      // Create booking request
      const ref = `ZB${Date.now().toString(36).toUpperCase()}`;
      const { data: req, error: reqError } = await supabase.from("bookings").insert({
        client_name: name, client_email: email || null, client_phone: cleanPhone,
        service_id: serviceId, service_name: selectedService?.name || null,
        preferred_date: preferredDate, preferred_time: normalizedTime,
        price: total,
        notes: notes ? `${notes}\n\nPayment preference: ${paymentPreference}${promoApplied ? `\nPromo: ${promoApplied.code}` : ""}` : `Payment preference: ${paymentPreference}`,
        status: "pending", client_id: clientId || null,
      } as any).select("id").single();

      if (reqError) throw reqError;

      setBookingRef(ref);
      setSubmitted(true);

      // Send confirmation SMS
      try {
        if (cleanPhone) {
          await sendSMS(cleanPhone, `Hi ${name}! Your Zolara appointment request for ${selectedService?.name} on ${preferredDate} at ${preferredTime} has been received. Reference: ${ref}. We'll confirm shortly. – Zolara Beauty Studio`);
        }
      } catch (smsErr) { console.error("SMS error:", smsErr); }

      onSubmitted?.(ref);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── SUCCESS STATE ───────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div style={{ background: "#0F0D0B", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ maxWidth: "440px", width: "100%", textAlign: "center" }}>
          <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "#1E1916", border: `2px solid ${gold}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <CheckCircle2 style={{ width: 40, height: 40, color: gold }} />
          </div>
          <h2 style={{ color: "#FAF7F2", fontSize: "24px", fontWeight: 700, marginBottom: "8px" }}>
            {bookingRef === "WAITLIST" ? "Added to Waitlist" : "Request Received"}
          </h2>
          <p style={{ color: "#9A8878", marginBottom: "8px" }}>
            {bookingRef === "WAITLIST"
              ? "We'll notify you via SMS as soon as a slot opens up."
              : "We'll send a confirmation to your phone shortly."}
          </p>
          {bookingRef !== "WAITLIST" && (
            <p style={{ color: gold, fontFamily: "monospace", fontSize: "18px", fontWeight: 700, letterSpacing: "0.1em", marginBottom: "24px" }}>{bookingRef}</p>
          )}
          <Link to="/" style={{ color: gold, fontSize: "13px", textDecoration: "underline" }}>← Return to homepage</Link>
        </div>
      </div>
    );
  }

  const enabledPayments = (settings as any)?.payment_methods?.filter((m: any) => m.enabled) || [{ id: "cash" }, { id: "mobile_money" }];

  return (
    <div style={{ background: "#0F0D0B", minHeight: "100vh", padding: "40px 16px" }}>
      <div style={{ maxWidth: "680px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <p style={{ color: gold, fontSize: "11px", letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: "8px" }}>Book an Appointment</p>
          <h1 style={{ color: "#FAF7F2", fontSize: "28px", fontWeight: 700, marginBottom: "8px" }}>Reserve Your Experience</h1>
          <p style={{ color: "#6B5E54", fontSize: "14px" }}>Mon – Sat · 8:30 AM – 9:00 PM · Sakasaka, Tamale</p>
        </div>

        {/* Slot unavailability notice */}
        {!slotsAvailable && preferredDate && preferredTime && (
          <div style={{ ...sectionStyle, borderColor: "#E5734355", background: "#1A0D0B" }}>
            <div className="flex items-start gap-3">
              <AlertCircle style={{ color: "#E57343", width: 18, height: 18, flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ color: "#FAF7F2", fontSize: "14px", fontWeight: 600, marginBottom: 4 }}>This slot is fully booked</p>
                <p style={{ color: "#9A8878", fontSize: "13px", marginBottom: 12 }}>Would you like to join the waitlist? We'll notify you via SMS if a slot opens up.</p>
                <label className="flex items-center gap-2" style={{ cursor: "pointer" }}>
                  <input type="checkbox" checked={joinWaitlist} onChange={e => setJoinWaitlist(e.target.checked)} style={{ accentColor: gold }} />
                  <span style={{ color: gold, fontSize: "13px", fontWeight: 600 }}>Yes, add me to the waitlist</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Personal Details */}
        <div style={sectionStyle}>
          <p className="text-xs tracking-widest mb-5" style={{ color: gold }}>YOUR DETAILS</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Full Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 w-4 h-4" style={{ color: "#6B5E54" }} />
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" style={{ ...inputStyle, paddingLeft: "40px" }} />
              </div>
              {errors.name && <p className="text-xs mt-1" style={{ color: "#E57373" }}>{errors.name}</p>}
            </div>
            <div>
              <label style={labelStyle}>Phone Number *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3.5 w-4 h-4" style={{ color: "#6B5E54" }} />
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0XX XXX XXXX" style={{ ...inputStyle, paddingLeft: "40px" }} />
              </div>
              {errors.phone && <p className="text-xs mt-1" style={{ color: "#E57373" }}>{errors.phone}</p>}
            </div>
            <div className="sm:col-span-2">
              <label style={labelStyle}>Email (Optional)</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 w-4 h-4" style={{ color: "#6B5E54" }} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" style={{ ...inputStyle, paddingLeft: "40px" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Service Selection */}
        <div style={sectionStyle}>
          <p className="text-xs tracking-widest mb-5" style={{ color: gold }}>SELECT A SERVICE</p>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" style={{ color: gold }} /></div>
          ) : services.length === 0 ? (
            <p style={{ color: "#6B5E54", fontSize: 13, textAlign: "center", padding: "16px 0" }}>No services available at the moment.</p>
          ) : (
            <>
              {Object.entries(groupedServices).map(([cat, svcs]) => (
                <div key={cat} style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", color: "#6B5E54", marginBottom: 10, textTransform: "uppercase" as const }}>{cat}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {(svcs as any[]).map((s: any) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setServiceId(s.id)}
                        style={{
                          textAlign: "left" as const, padding: "14px 16px", borderRadius: 12,
                          background: serviceId === s.id ? "#B8935A14" : "#141210",
                          border: `2px solid ${serviceId === s.id ? gold : "#2D2420"}`,
                          cursor: "pointer", transition: "all 0.15s",
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 600, color: serviceId === s.id ? gold : "#FAF7F2", marginBottom: 4, lineHeight: 1.3 }}>{s.name}</div>
                        <div style={{ fontSize: 10, color: "#6B5E54" }}>{s.duration_minutes} min</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: gold, marginTop: 6 }}>GHS {Number(s.price).toLocaleString()}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {errors.service && <p className="text-xs mt-1" style={{ color: "#E57373" }}>{errors.service}</p>}
            </>
          )}
        </div>

        {/* Add-ons */}
        {serviceAddons.length > 0 && selectedService && (
          <div style={sectionStyle}>
            <p className="text-xs tracking-widest mb-5" style={{ color: gold }}>ENHANCE YOUR VISIT</p>
            <p style={{ color: "#6B5E54", fontSize: "13px", marginBottom: "16px" }}>Optional add-ons to elevate your experience</p>
            <div className="space-y-3">
              {serviceAddons.map(a => (
                <div key={a.id} className="flex items-center justify-between" style={{ padding: "12px 16px", background: "#141210", borderRadius: "10px", border: "1px solid #2D2420" }}>
                  <div>
                    <p style={{ color: "#FAF7F2", fontSize: "13px", fontWeight: 600 }}>{a.name}</p>
                    <p style={{ color: "#6B5E54", fontSize: "11px" }}>{a.duration_minutes} min · GHS {a.price}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {selectedAddons[a.id] ? (
                      <>
                        <button onClick={() => handleAddonChange(a.id, -1)} style={{ width: 28, height: 28, borderRadius: "50%", background: "#2D2420", border: "none", color: "#FAF7F2", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Minus style={{ width: 14, height: 14 }} />
                        </button>
                        <span style={{ color: gold, fontWeight: 700, minWidth: "16px", textAlign: "center" }}>{selectedAddons[a.id]}</span>
                        <button onClick={() => handleAddonChange(a.id, 1)} style={{ width: 28, height: 28, borderRadius: "50%", background: gold, border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Plus style={{ width: 14, height: 14 }} />
                        </button>
                      </>
                    ) : (
                      <button onClick={() => handleAddonChange(a.id, 1)} style={{ padding: "6px 14px", background: "transparent", border: `1px solid ${gold}`, borderRadius: "20px", color: gold, fontSize: "12px", cursor: "pointer", fontWeight: 600 }}>Add</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Date & Time */}
        <div style={sectionStyle}>
          <p className="text-xs tracking-widest mb-5" style={{ color: gold }}>DATE AND TIME</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Preferred Date *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3.5 w-4 h-4" style={{ color: "#6B5E54" }} />
                <input type="date" value={preferredDate} onChange={e => setPreferredDate(e.target.value)} min={today} style={{ ...inputStyle, paddingLeft: "40px" }} />
              </div>
              {errors.date && <p className="text-xs mt-1" style={{ color: "#E57373" }}>{errors.date}</p>}
            </div>
            <div>
              <label style={labelStyle}>Preferred Time *</label>
              <div className="relative">
                <Clock className="absolute left-3 top-3.5 w-4 h-4" style={{ color: "#6B5E54" }} />
                <input type="time" value={preferredTime} onChange={e => setPreferredTime(e.target.value)} min="08:30" max="21:00" style={{ ...inputStyle, paddingLeft: "40px" }} />
              </div>
              {errors.time && <p className="text-xs mt-1" style={{ color: "#E57373" }}>{errors.time}</p>}
            </div>
          </div>
          <p className="text-xs mt-3" style={{ color: "#6B5E54" }}>
            <Sparkles className="inline w-3 h-3 mr-1" />Open Mon – Sat, 8:30 AM to 9:00 PM. Closed Sundays.
          </p>
        </div>

        {/* Promo Code */}
        <div style={sectionStyle}>
          <p className="text-xs tracking-widest mb-5" style={{ color: gold }}>PROMO CODE</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="absolute left-3 top-3.5 w-4 h-4" style={{ color: "#6B5E54" }} />
              <input
                value={promoCode} onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoApplied(null); setPromoError(""); }}
                placeholder="ENTER CODE"
                style={{ ...inputStyle, paddingLeft: "40px", fontFamily: "monospace", letterSpacing: "0.1em" }}
              />
            </div>
            <button onClick={handleApplyPromo} disabled={!promoCode || promoLoading}
              style={{ padding: "12px 20px", background: promoApplied ? "#10B981" : gold, border: "none", borderRadius: "10px", color: "#fff", fontWeight: 600, fontSize: "13px", cursor: "pointer", whiteSpace: "nowrap", opacity: !promoCode ? 0.5 : 1 }}>
              {promoLoading ? "..." : promoApplied ? "✓ Applied" : "Apply"}
            </button>
          </div>
          {promoError && <p className="text-xs mt-2" style={{ color: "#E57373" }}>{promoError}</p>}
          {promoApplied && (
            <p className="text-xs mt-2" style={{ color: "#10B981" }}>
              {promoApplied.discount_type === "percentage" ? `${promoApplied.discount_value}% off` : `GHS ${promoApplied.discount_value} off`} — {promoApplied.description || "Discount applied"}
            </p>
          )}
        </div>

        {/* Payment Preference */}
        <div style={sectionStyle}>
          <p className="text-xs tracking-widest mb-5" style={{ color: gold }}>PAYMENT METHOD</p>
          <p style={{ color: "#6B5E54", fontSize: "13px", marginBottom: "16px" }}>How would you like to pay when you arrive?</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {enabledPayments.map((m: any) => (
              <button key={m.id} onClick={() => setPaymentPreference(m.id)}
                style={{
                  padding: "12px", border: `2px solid ${paymentPreference === m.id ? gold : "#2D2420"}`,
                  borderRadius: "10px", background: paymentPreference === m.id ? "#B8935A18" : "#141210",
                  cursor: "pointer", textAlign: "center" as const, transition: "all 0.15s",
                }}>
                <div style={{ fontSize: "20px", marginBottom: "4px" }}>{PAYMENT_ICONS[m.id] || "💰"}</div>
                <div style={{ color: paymentPreference === m.id ? gold : "#6B5E54", fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em" }}>{PAYMENT_LABELS[m.id] || m.name || m.id}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Special Requests */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Special Requests (Optional)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Style references, allergies, special notes..."
            rows={3}
            style={{ ...inputStyle, resize: "vertical" as const }}
          />
        </div>

        {/* Price Summary */}
        {selectedService && (
          <div style={{ ...sectionStyle, borderColor: "#B8935A33" }}>
            <p className="text-xs tracking-widest mb-4" style={{ color: gold }}>PRICE SUMMARY</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm" style={{ color: "#9A8878" }}>
                <span>{selectedService.name}</span>
                <span>GHS {selectedService.price}</span>
              </div>
              {Object.entries(selectedAddons).map(([id, qty]) => {
                const a = addons.find(x => x.id === id);
                return a ? (
                  <div key={id} className="flex justify-between text-sm" style={{ color: "#9A8878" }}>
                    <span>{a.name} {qty > 1 ? `×${qty}` : ""}</span>
                    <span>GHS {(a.price * qty).toFixed(2)}</span>
                  </div>
                ) : null;
              })}
              {discount > 0 && (
                <div className="flex justify-between text-sm" style={{ color: "#10B981" }}>
                  <span>Promo discount</span>
                  <span>– GHS {discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between pt-3 mt-2" style={{ borderTop: "1px solid #2D2420" }}>
                <span style={{ color: "#FAF7F2", fontWeight: 700 }}>Estimated Total</span>
                <span style={{ color: gold, fontWeight: 700, fontSize: "18px" }}>GHS {total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Submit */}
        <button onClick={handleSubmit} disabled={submitting || (!slotsAvailable && !joinWaitlist)}
          className="w-full py-4 rounded-xl font-semibold text-sm tracking-widest flex items-center justify-center gap-2"
          style={{ background: submitting || (!slotsAvailable && !joinWaitlist) ? "#4A3828" : gold, color: "#fff", border: "none", cursor: submitting ? "not-allowed" : "pointer", marginBottom: "12px" }}>
          {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> PROCESSING...</> : !slotsAvailable && !joinWaitlist ? "SELECT ANOTHER TIME OR JOIN WAITLIST" : "REQUEST APPOINTMENT"}
        </button>

        <p className="text-center text-xs mb-8" style={{ color: "#6B5E54" }}>
          By booking, you agree to our GHS 50 deposit policy and 24-hour cancellation notice requirement.
        </p>
      </div>
    </div>
  );
}
