import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { autoAssignBooking } from "@/lib/autoAssign";
import { sendSMS, SMS } from "@/lib/sms";
import { validatePromoCode } from "@/lib/promoCodes";
import { findOrCreateClient } from "@/lib/clientDedup";
import { normalizeTimeTo24, isTimeWithinRange } from "@/lib/time";
import { Loader2, Calendar, Clock, User, Phone, Mail, Tag, CheckCircle2, ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useSettings } from "@/context/SettingsContext";
import ServicePicker from "@/components/ServicePicker";

const GOLD        = "#C9A84C";
const GOLD_DARK   = "#A8892E";
const GOLD_LIGHT  = "#FDF6E3";
const GOLD_BORDER = "#E8D27A44";
const CREAM       = "#FDFCF9";
const WHITE       = "#FFFFFF";
const NAVY        = "#0F1E35";
const BORDER      = "#EDE8E0";
const TXT         = "#1C1917";
const TXT_MID     = "#57534E";
const TXT_SOFT    = "#A8A29E";
const GREEN       = "#10B981";
const RED         = "#EF4444";

const inp = {
  width: "100%", background: WHITE, border: `1.5px solid ${BORDER}`,
  borderRadius: 10, padding: "12px 16px", color: TXT, fontSize: 14,
  outline: "none", fontFamily: "'Montserrat',sans-serif",
  transition: "border-color 0.15s",
} as const;

const label = {
  display: "block", fontSize: 11, fontWeight: 700,
  letterSpacing: "0.12em", color: TXT_SOFT, textTransform: "uppercase" as const,
  marginBottom: 6,
} as const;

const card = {
  background: WHITE, border: `1px solid ${BORDER}`,
  borderRadius: 16, padding: "28px 28px",
  marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
} as const;

const sectionTitle = {
  fontSize: 10, fontWeight: 700, letterSpacing: "0.2em",
  color: GOLD, marginBottom: 20, display: "block",
} as const;

export default function EnhancedBookingForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  const { settings, userRole } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const isWalkIn = new URLSearchParams(location.search).get("source") === "walk_in";
  const [services, setServices]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [bookingRef, setBookingRef] = useState("");
  const [step, setStep]           = useState<1|2|3>(1);

  // Step 1 — personal
  const [name, setName]   = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // Step 2 — service + datetime
  const [serviceIds, setServiceIds]   = useState<string[]>([]);
  const [preferredDate, setDate]      = useState("");
  const [preferredTime, setTime]      = useState("");
  const [notes, setNotes]             = useState("");

  // Step 3 — promo + payment
  const [promoCode, setPromoCode]     = useState("");
  const [promoApplied, setPromoApplied] = useState<any>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError]   = useState("");
  const [paymentPref, setPaymentPref] = useState("cash");

  const [errors, setErrors] = useState<Record<string,string>>({});
  const today = new Date().toISOString().split("T")[0];

  const [allVariantsMap, setAllVariantsMap] = useState<Record<string,any[]>>({});
  useEffect(() => {
    Promise.all([
      supabase.from("services").select("id, name, category, price, is_active").eq("is_active", true).order("category").order("name"),
      (supabase as any).from("service_variants").select("service_id, price_adjustment, name").eq("is_active", true),
    ]).then(([{ data: svcs }, { data: vars }]) => {
      setServices(svcs || []);
      const vm: Record<string,any[]> = {};
      for (const v of (vars || [])) {
        if (!vm[v.service_id]) vm[v.service_id] = [];
        vm[v.service_id].push(v);
      }
      setAllVariantsMap(vm);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Per-service variants/addons (loaded on first click)
  const [svcVariantsMap, setSvcVariantsMap] = useState<Record<string,any[]>>({});
  const [svcAddonsMap, setSvcAddonsMap]     = useState<Record<string,any[]>>({});
  const [svcVariantSel, setSvcVariantSel]   = useState<Record<string,string>>({});
  const [svcAddonsSel, setSvcAddonsSel]     = useState<Record<string,string[]>>({});
  const [svcLoading, setSvcLoading]         = useState<Record<string,boolean>>({});
  const [expandedSvc, setExpandedSvc]       = useState<string | null>(null);

  const loadServiceExtras = async (svcId: string) => {
    if (!svcId || svcVariantsMap[svcId] !== undefined) return;
    setSvcLoading(prev => ({ ...prev, [svcId]: true }));
    const [vRes, aRes] = await Promise.all([
      (supabase as any).from("service_variants").select("*").eq("service_id", svcId).eq("is_active", true).order("sort_order"),
      (supabase as any).from("service_addons").select("*").eq("service_id", svcId).eq("is_active", true).order("sort_order"),
    ]);
    setSvcVariantsMap(prev => ({ ...prev, [svcId]: vRes.data || [] }));
    setSvcAddonsMap(prev =>   ({ ...prev, [svcId]: aRes.data || [] }));
    setSvcLoading(prev => ({ ...prev, [svcId]: false }));
  };

  const serviceId = serviceIds[0] || "";
  const selectedService = services.find(s => s.id === serviceId);
  const selectedServices = services.filter(s => serviceIds.includes(s.id));
  const grouped = services.reduce((acc, s) => {
    const cat = s.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {} as Record<string, any[]>);

  const basePrice = selectedServices.reduce((total, s) => {
    const selVarId = svcVariantSel[s.id] || "";
    const svcVars = svcVariantsMap[s.id] || [];
    const selVariant = svcVars.find((v: any) => v.id === selVarId);
    const hasVars = svcVars.length > 0 || !!svcLoading[s.id];
    const p = selVariant ? Number(selVariant.price_adjustment) : hasVars ? 0 : Number(s.price || 0);
    return total + p;
  }, 0);
  const addonTotal = selectedServices.reduce((total, s) => {
    const selAddons = svcAddonsSel[s.id] || [];
    return total + (svcAddonsMap[s.id] || []).filter((a: any) => selAddons.includes(a.id)).reduce((sum: number, a: any) => sum + Number(a.price), 0);
  }, 0);
  const discount = promoApplied
    ? promoApplied.discount_type === "percentage"
      ? ((basePrice + addonTotal) * promoApplied.discount_value) / 100
      : promoApplied.discount_value
    : 0;
  const total = Math.max(0, basePrice + addonTotal - discount);

  const enabledPayments = (settings as any)?.payment_methods?.filter((m: any) => m.enabled)
    || [{ id: "cash", name: "Cash" }, { id: "mobile_money", name: "Mobile Money" }];

  const PAYMENT_LABELS: Record<string,string> = {
    cash: "Cash", mobile_money: "Mobile Money", card: "Card / Paystack",
    bank_transfer: "Bank Transfer", gift_card: "Gift Card",
  };
  const PAYMENT_ICONS: Record<string,string> = {
    cash: "💵", mobile_money: "📱", card: "💳", bank_transfer: "🏦", gift_card: "🎁",
  };

  const validateStep1 = () => {
    const e: Record<string,string> = {};
    if (!name.trim() || name.trim().length < 2) e.name = "Enter your full name";
    if (!phone.trim() || phone.replace(/\s/g,"").length < 10) e.phone = "Enter a valid phone number";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const validateStep2 = () => {
    const e: Record<string,string> = {};
    if (serviceIds.length === 0) e.service = "Please select at least one service";
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
    setSubmitting(true);
    try {
      const normalizedTime = normalizeTimeTo24(preferredTime);
      const day = new Date(`${preferredDate}T00:00:00`).getDay();
      if (day === 0) { toast.error("We are closed on Sundays."); return; }
      const openTime  = (settings as any)?.open_time  || "08:30";
      const closeTime = (settings as any)?.close_time || "21:00";
      if (!isTimeWithinRange(normalizedTime, openTime, closeTime)) {
        toast.error(`Please pick a time between ${openTime} and ${closeTime}`); return;
      }
      const cleanPhone = phone.replace(/\s/g,"");
      const clientId = await findOrCreateClient({ name, phone: cleanPhone, email: email || null });
      const ref = `ZB${Date.now().toString(36).toUpperCase()}`;
      const notesFull = [
        notes,
        `Payment preference: ${PAYMENT_LABELS[paymentPref] || paymentPref}`,
        promoApplied ? `Promo: ${promoApplied.code}` : "",
      ].filter(Boolean).join("\n");

      const { data: newBooking, error } = await supabase.from("bookings").insert({
        client_name: name, client_email: email || null, client_phone: cleanPhone,
        service_id: serviceId || null,
        service_name: selectedServices.map(s => s.name).join(", ") || null,
        preferred_date: preferredDate, preferred_time: normalizedTime,
        price: total, notes: notesFull, status: "pending", client_id: clientId || null,
        booking_source: isWalkIn ? "walk_in" : "online",
      } as any).select("id").single();
      if (error) throw error;
      // Auto-assign staff for online bookings only — walk-ins assigned manually by receptionist
      if (newBooking?.id && !isWalkIn) {
        autoAssignBooking(
          newBooking.id,
          selectedServices.map(s => s.name).join(", ") || "",
          preferredDate,
          normalizedTime
        ).catch(console.error); // fire and forget — don't block confirmation
      }
      // Send booking received SMS
      const depositAmt = Number((settings as any)?.deposit_amount ?? 50);
      sendSMS(cleanPhone, SMS.bookingReceived(
        name,
        selectedServices.map(s => s.name).join(", ") || "Service",
        preferredDate,
        normalizedTime,
        ref,
        false, // deposit not yet paid at this stage
        depositAmt,
      )).catch(console.error);

      setBookingRef(ref);
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── SUCCESS ──────────────────────────────────────────────────
  if (submitted) return (
    <div style={{ background: CREAM, minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 440, width: "100%", textAlign: "center" }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: GOLD_LIGHT, border: `2px solid ${GOLD}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
          <CheckCircle2 style={{ width: 40, height: 40, color: GOLD }} />
        </div>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", color: TXT, fontSize: 30, fontWeight: 700, marginBottom: 8 }}>Request Received</h2>
        <p style={{ color: TXT_MID, fontSize: 14, marginBottom: 8 }}>We'll confirm your appointment via SMS shortly.</p>
        <p style={{ color: TXT_SOFT, fontSize: 12, marginBottom: 28 }}>
          {selectedServices.map(s => s.name).join(", ")} · {preferredDate} · {preferredTime}
        </p>
        <div style={{ background: GOLD_LIGHT, border: `1px solid ${GOLD_BORDER}`, borderRadius: 12, padding: "14px 24px", marginBottom: 28, display: "inline-block" }}>
          <span style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 700, color: GOLD, letterSpacing: "0.12em" }}>{bookingRef}</span>
        </div>
        <div>
          <button onClick={() => {
            if (onSuccess) { onSuccess(); return; }
            const base = userRole === "receptionist" ? "/app/receptionist" : "/app/admin";
            navigate(base + "/bookings");
          }} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: GOLD, fontSize: 13, fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontFamily: "'Montserrat',sans-serif" }}>
            ← Back to Bookings
          </button>
        </div>
      </div>
    </div>
  );

  // ── STEP INDICATOR ───────────────────────────────────────────
  const steps = ["Your Details", "Service & Time", "Review & Book"];

  return (
    <div style={{ background: CREAM, minHeight: "100vh", padding: "32px 16px 60px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Montserrat:wght@400;500;600;700&display=swap');
        input:focus, textarea:focus, select:focus { border-color: ${GOLD} !important; box-shadow: 0 0 0 3px ${GOLD}22; }
        .svc-card:hover { border-color: ${GOLD} !important; background: ${GOLD_LIGHT} !important; }
        .pay-btn:hover { border-color: ${GOLD} !important; }
      `}</style>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>

        {/* Steps */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 36 }}>
          {steps.map((s, i) => {
            const n = i + 1;
            const done    = step > n;
            const active  = step === n;
            return (
              <div key={n} style={{ display: "flex", alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: "50%",
                    background: done ? GOLD : active ? NAVY : WHITE,
                    border: `2px solid ${done || active ? (done ? GOLD : NAVY) : BORDER}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700,
                    color: done || active ? WHITE : TXT_SOFT,
                    transition: "all 0.2s",
                  }}>
                    {done ? "✓" : n}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, color: active ? NAVY : TXT_SOFT, whiteSpace: "nowrap" }}>{s}</span>
                </div>
                {i < steps.length - 1 && (
                  <div style={{ width: 60, height: 2, background: step > n ? GOLD : BORDER, margin: "0 6px", marginBottom: 22, transition: "background 0.3s" }} />
                )}
              </div>
            );
          })}
        </div>

        {/* ── STEP 1: PERSONAL ── */}
        {step === 1 && (
          <div style={card}>
            <span style={sectionTitle}>YOUR DETAILS</span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={label}>Full Name *</label>
                <div style={{ position: "relative" }}>
                  <User size={15} style={{ position: "absolute", left: 12, top: 13, color: TXT_SOFT }} />
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" style={{ ...inp, paddingLeft: 38 }} />
                </div>
                {errors.name && <p style={{ color: RED, fontSize: 11, marginTop: 4 }}>{errors.name}</p>}
              </div>
              <div>
                <label style={label}>Phone *</label>
                <div style={{ position: "relative" }}>
                  <Phone size={15} style={{ position: "absolute", left: 12, top: 13, color: TXT_SOFT }} />
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0XX XXX XXXX" style={{ ...inp, paddingLeft: 38 }} />
                </div>
                {errors.phone && <p style={{ color: RED, fontSize: 11, marginTop: 4 }}>{errors.phone}</p>}
              </div>
            </div>
            <div>
              <label style={label}>Email (Optional)</label>
              <div style={{ position: "relative" }}>
                <Mail size={15} style={{ position: "absolute", left: 12, top: 13, color: TXT_SOFT }} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" style={{ ...inp, paddingLeft: 38 }} />
              </div>
            </div>
            <button
              onClick={() => { if (validateStep1()) setStep(2); }}
              style={{ marginTop: 24, width: "100%", padding: "14px", borderRadius: 12, background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DARK})`, border: "none", color: WHITE, fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "'Montserrat',sans-serif" }}
            >
              CONTINUE <ArrowRight size={15} />
            </button>
          </div>
        )}

        {/* ── STEP 2: SERVICE + DATETIME ── */}
        {step === 2 && (
          <>
            {/* Service list */}
            <div style={card}>
              <span style={sectionTitle}>SELECT SERVICE(S)</span>
              <style>{`.svc-row:hover{background:#FBF6EE!important}`}</style>

              {loading ? (
                <div style={{ display:"flex", justifyContent:"center", padding:"28px 0" }}>
                  <Loader2 size={24} style={{ color:GOLD, animation:"spin 0.8s linear infinite" }} />
                  <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                </div>
              ) : (
                <ServicePicker
                  services={services}
                  allVariantsMap={allVariantsMap}
                  svcVariantsMap={svcVariantsMap}
                  svcAddonsMap={svcAddonsMap}
                  svcVariantSel={svcVariantSel}
                  svcAddonsSel={svcAddonsSel}
                  svcLoading={svcLoading}
                  expandedSvc={expandedSvc}
                  serviceIds={serviceIds}
                  onToggle={(svcId) => {
                    const willSelect = !serviceIds.includes(svcId);
                    if (willSelect) {
                      loadServiceExtras(svcId);
                      setExpandedSvc(svcId);
                    } else {
                      setExpandedSvc(null);
                    }
                    setServiceIds(prev => prev.includes(svcId) ? prev.filter(id => id !== svcId) : [...prev, svcId]);
                  }}
                  onExpandToggle={(svcId) => {
                    setExpandedSvc(prev => prev === svcId ? null : svcId);
                    if (!svcVariantsMap[svcId]) loadServiceExtras(svcId);
                  }}
                  onVariantSel={(svcId, varId) => setSvcVariantSel(prev => ({ ...prev, [svcId]: varId }))}
                  onAddonToggle={(svcId, addId, checked) => setSvcAddonsSel(prev => ({
                    ...prev,
                    [svcId]: checked ? (prev[svcId]||[]).filter((id:string)=>id!==addId) : [...(prev[svcId]||[]), addId]
                  }))}

                />
              )}
              {errors.service && <p style={{ color: RED, fontSize: 11, marginTop: 4 }}>{errors.service}</p>}
            </div>

            {/* Date & Time */}
            <div style={card}>
              <span style={sectionTitle}>DATE AND TIME</span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={label}>Date *</label>
                  <div style={{ position: "relative" }}>
                    <Calendar size={15} style={{ position: "absolute", left: 12, top: 13, color: TXT_SOFT }} />
                    <input type="date" value={preferredDate} onChange={e => setDate(e.target.value)} min={today} style={{ ...inp, paddingLeft: 38 }} />
                  </div>
                  {errors.date && <p style={{ color: RED, fontSize: 11, marginTop: 4 }}>{errors.date}</p>}
                </div>
                <div>
                  <label style={label}>Time *</label>
                  <div style={{ position: "relative" }}>
                    <Clock size={15} style={{ position: "absolute", left: 12, top: 13, color: TXT_SOFT }} />
                    <input type="time" value={preferredTime} onChange={e => setTime(e.target.value)} min="08:30" max="21:00" style={{ ...inp, paddingLeft: 38 }} />
                  </div>
                  {errors.time && <p style={{ color: RED, fontSize: 11, marginTop: 4 }}>{errors.time}</p>}
                </div>
              </div>
              <p style={{ fontSize: 11, color: TXT_SOFT, marginTop: 12, display: "flex", alignItems: "center", gap: 5 }}>
                <Sparkles size={11} style={{ color: GOLD }} /> Open Mon – Sat · 8:30 AM – 9:00 PM · Closed Sundays
              </p>
            </div>

            {/* Notes */}
            <div style={card}>
              <span style={sectionTitle}>SPECIAL REQUESTS</span>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Style references, allergies, or anything we should know..." rows={3}
                style={{ ...inp, resize: "vertical" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <button onClick={() => setStep(1)} style={{ padding: 14, borderRadius: 12, background: WHITE, border: `1.5px solid ${BORDER}`, color: TXT_MID, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Montserrat',sans-serif" }}>
                ← Back
              </button>
              <button onClick={() => { if (validateStep2()) setStep(3); }}
                style={{ padding: 14, borderRadius: 12, background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DARK})`, border: "none", color: WHITE, fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "'Montserrat',sans-serif" }}>
                CONTINUE <ArrowRight size={15} />
              </button>
            </div>
          </>
        )}

        {/* ── STEP 3: REVIEW + BOOK ── */}
        {step === 3 && (
          <>
            {/* Summary */}
            <div style={{ ...card, background: NAVY, border: "none" }}>
              <span style={{ ...sectionTitle, color: "rgba(201,168,76,0.9)" }}>BOOKING SUMMARY</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { label: "Name",    value: name },
                  { label: "Phone",   value: phone },
                  { label: "Service", value: selectedServices.map(s => s.name).join(", ") || "—" },
                  { label: "Date",    value: preferredDate },
                  { label: "Time",    value: preferredTime },
                ].map(row => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.07)", paddingBottom: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>{row.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: WHITE }}>{row.value}</span>
                  </div>
                ))}
                {discount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.07)", paddingBottom: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Discount</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: GREEN }}>− GHS {discount.toFixed(0)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Total</span>
                  <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, fontWeight: 700, color: GOLD }}>GHS {total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Promo */}
            <div style={card}>
              <span style={sectionTitle}>PROMO CODE</span>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <Tag size={15} style={{ position: "absolute", left: 12, top: 13, color: TXT_SOFT }} />
                  <input value={promoCode} onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoApplied(null); setPromoError(""); }}
                    placeholder="ENTER CODE" style={{ ...inp, paddingLeft: 38, fontFamily: "monospace", letterSpacing: "0.1em" }} />
                </div>
                <button onClick={handleApplyPromo} disabled={!promoCode || promoLoading}
                  style={{ padding: "12px 20px", background: promoApplied ? GREEN : GOLD, border: "none", borderRadius: 10, color: WHITE, fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", opacity: !promoCode ? 0.5 : 1, fontFamily: "'Montserrat',sans-serif" }}>
                  {promoLoading ? "..." : promoApplied ? "✓ Applied" : "Apply"}
                </button>
              </div>
              {promoError   && <p style={{ color: RED,   fontSize: 11, marginTop: 6 }}>{promoError}</p>}
              {promoApplied && <p style={{ color: GREEN, fontSize: 11, marginTop: 6 }}>{promoApplied.discount_type === "percentage" ? `${promoApplied.discount_value}% off` : `GHS ${promoApplied.discount_value} off`} applied.</p>}
            </div>

            {/* Payment */}
            <div style={card}>
              <span style={sectionTitle}>PAYMENT METHOD</span>
              <p style={{ fontSize: 12, color: TXT_SOFT, marginBottom: 16 }}>How will you pay when you arrive?</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {enabledPayments.map((m: any) => {
                  const sel = paymentPref === m.id;
                  return (
                    <button key={m.id} className="pay-btn" onClick={() => setPaymentPref(m.id)}
                      style={{ padding: "14px 10px", border: `2px solid ${sel ? GOLD : BORDER}`, borderRadius: 12, background: sel ? GOLD_LIGHT : WHITE, cursor: "pointer", textAlign: "center", transition: "all 0.15s", fontFamily: "'Montserrat',sans-serif" }}>
                      <div style={{ fontSize: 22, marginBottom: 6 }}>{PAYMENT_ICONS[m.id] || "💰"}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: sel ? GOLD_DARK : TXT_MID, letterSpacing: "0.05em" }}>{PAYMENT_LABELS[m.id] || m.name || m.id}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <p style={{ fontSize: 11, color: TXT_SOFT, textAlign: "center", marginBottom: 16 }}>
              By booking, you agree to our GHS 50 deposit policy and 24-hour cancellation notice requirement.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <button onClick={() => setStep(2)} style={{ padding: 14, borderRadius: 12, background: WHITE, border: `1.5px solid ${BORDER}`, color: TXT_MID, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Montserrat',sans-serif" }}>
                ← Back
              </button>
              <button onClick={handleSubmit} disabled={submitting}
                style={{ padding: 14, borderRadius: 12, background: submitting ? "#ccc" : `linear-gradient(135deg, ${GOLD}, ${GOLD_DARK})`, border: "none", color: WHITE, fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", cursor: submitting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "'Montserrat',sans-serif" }}>
                {submitting ? <><Loader2 size={15} style={{ animation: "spin 0.8s linear infinite" }} /> PROCESSING…</> : "CONFIRM BOOKING"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
