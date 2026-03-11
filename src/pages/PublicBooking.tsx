import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { validatePromoCode } from "@/lib/promoCodes";
import { findOrCreateClient } from "@/lib/clientDedup";
import { normalizeTimeTo24, isTimeWithinRange } from "@/lib/time";
import { initiateCheckout } from "@/lib/hubtel";
import {
  Loader2, Calendar, Clock, User, Phone, Mail, Tag,
  CheckCircle2, ArrowLeft, Sparkles, Search, ChevronRight, Check,
} from "lucide-react";
import { toast } from "sonner";
import { useSettings } from "@/context/SettingsContext";
import AmandaWidget from "@/components/AmandaWidget";

const LOGO = "https://ekvjnydomfresnkealpb.supabase.co/storage/v1/object/public/avatars/logo_1764609621458.jpg";
const GOLD = "#C8A97E";
const GOLD_DARK = "#8B6914";
const CREAM = "#F5EFE6";
const MID = "#EDE3D5";
const DARK = "#1C160E";
const WHITE = "#FFFFFF";
const BORDER = "#E5DDD3";
const TXT = "#1C1917";
const TXT_MID = "#57534E";
const TXT_SOFT = "#A8A29E";
const GREEN = "#10B981";
const RED = "#EF4444";
const PANEL_BG = "linear-gradient(160deg,#241C0E 0%,#1A1208 55%,#201608 100%)";

const inp = {
  width: "100%", background: WHITE, border: `1.5px solid ${BORDER}`,
  borderRadius: "8px", padding: "12px 16px", color: TXT, fontSize: "14px",
  outline: "none", fontFamily: "'Montserrat',sans-serif", transition: "border-color 0.15s",
} as const;

const lbl = {
  display: "block", fontSize: "10px", fontWeight: 700,
  letterSpacing: "0.14em", color: TXT_SOFT, textTransform: "uppercase" as const, marginBottom: "6px",
} as const;

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash", mobile_money: "Mobile Money", card: "Card", bank_transfer: "Bank Transfer", gift_card: "Gift Card",
};
const PAYMENT_ICONS: Record<string, string> = {
  cash: "💵", mobile_money: "📱", card: "💳", bank_transfer: "🏦", gift_card: "🎁",
};

const CATEGORY_META: Record<string, { icon: string; desc: string }> = {
  "Braids with Extensions":  { icon: "✦", desc: "Knotless, Rasta, Fulani, Cornrows and more" },
  "Wig & Hair Styling":      { icon: "♛", desc: "Installs, sew-ins, silk press and more" },
  "Natural Styling":         { icon: "◈", desc: "Cornrows, twists, ponytails and natural looks" },
  "Hair Care & Treatments":  { icon: "◇", desc: "Wash, condition and nourish your hair" },
  "Hair Coloring":           { icon: "✺", desc: "Color, highlights, balayage and correction" },
  "Retouching":              { icon: "◉", desc: "Relaxer retouching services" },
  "Kids Services":           { icon: "⭐", desc: "Gentle styles for ages 3 to 12" },
  "Lash Extensions":         { icon: "◆", desc: "Classic, hybrid, volume and mega volume" },
  "Nail Services":           { icon: "❋", desc: "Mani, pedi, acrylic and gel nails" },
  "Makeup":                  { icon: "✿", desc: "Everyday, glam, bridal and special occasions" },
  "Consultations":           { icon: "◎", desc: "Expert hair and wig consultations" },
};

const CATEGORY_ORDER = [
  "Braids with Extensions", "Wig & Hair Styling", "Natural Styling",
  "Hair Coloring", "Hair Care & Treatments", "Retouching", "Kids Services",
  "Lash Extensions", "Nail Services", "Makeup", "Consultations",
];

type BookingStep = "category" | "service" | "details" | "redirecting" | "verifying" | "done" | "failed";

interface Service {
  id: string; name: string; description: string | null;
  category: string | null; price: number; duration_minutes: number; is_active: boolean;
}
interface Variant {
  id: string; service_id: string; name: string;
  price_adjustment: number; duration_adjustment: number; sort_order: number;
}
interface Addon {
  id: string; service_id: string; name: string;
  description: string | null; price: number; duration_adjustment: number;
}

function Topbar({ onBack, showBack }: { onBack: () => void; showBack: boolean }) {
  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 50,
      background: "rgba(245,239,230,0.97)", backdropFilter: "blur(16px)",
      borderBottom: "1px solid rgba(200,169,126,0.2)",
      padding: "14px 28px", display: "flex", alignItems: "center",
      justifyContent: "space-between", boxShadow: "0 2px 20px rgba(28,22,14,0.06)",
    }}>
      {showBack ? (
        <button onClick={onBack} style={{
          display: "flex", alignItems: "center", gap: "8px",
          background: "none", border: "none", cursor: "pointer",
          color: TXT_MID, fontSize: "13px", fontWeight: 500,
          fontFamily: "'Montserrat',sans-serif", padding: 0,
        }}>
          <ArrowLeft size={16} /> Back
        </button>
      ) : <div />}
      <a href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
        <img src={LOGO} style={{ width: "34px", height: "34px", borderRadius: "50%", objectFit: "cover", border: `2px solid ${GOLD}` }} alt="Zolara" />
        <div>
          <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "12px", fontWeight: 800, letterSpacing: "0.2em", color: DARK, lineHeight: 1.1 }}>ZOLARA</div>
          <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "9px", letterSpacing: "0.2em", color: GOLD, fontWeight: 600 }}>BEAUTY STUDIO</div>
        </div>
      </a>
    </div>
  );
}

export default function PublicBooking() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { settings } = useSettings();

  const [step, setStep] = useState<BookingStep>("category");
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [variantsMap, setVariantsMap] = useState<Record<string, Variant[]>>({});
  const [addonsMap, setAddonsMap] = useState<Record<string, Addon[]>>({});
  const [loadingService, setLoadingService] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<Addon[]>([]);
  const [serviceSearch, setServiceSearch] = useState("");

  const [bookingRef, setBookingRef] = useState("");
  const [bookedService, setBookedService] = useState("");
  const [bookedDate, setBookedDate] = useState("");
  const [bookedTime, setBookedTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [preferredDate, setDate] = useState("");
  const [preferredTime, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState<any>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [paymentPref, setPaymentPref] = useState("mobile_money");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    supabase
      .from("services")
      .select("id, name, category, price, duration_minutes, is_active, description")
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => { setServices(data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const bid = searchParams.get("booking_id");
    if (bid) { setStep("verifying"); pollDepositStatus(bid, 0); }
  }, []);

  const pollDepositStatus = async (bookingId: string, attempt: number) => {
    try {
      const { data: bk } = await supabase
        .from("bookings")
        .select("id, booking_ref, service_name, preferred_date, preferred_time, deposit_paid, status")
        .eq("id", bookingId).single();
      if (bk?.deposit_paid || bk?.status === "confirmed") {
        setBookingRef(bk.booking_ref || bookingId.slice(0, 10).toUpperCase());
        setBookedService(bk.service_name || ""); setBookedDate(bk.preferred_date || ""); setBookedTime(bk.preferred_time || "");
        setStep("done"); return;
      }
      if (attempt < 12) setTimeout(() => pollDepositStatus(bookingId, attempt + 1), 2000);
      else {
        setBookingRef(bk?.booking_ref || bookingId.slice(0, 10).toUpperCase());
        setBookedService(bk?.service_name || ""); setBookedDate(bk?.preferred_date || ""); setBookedTime(bk?.preferred_time || "");
        setStep("done");
      }
    } catch {
      if (attempt < 12) setTimeout(() => pollDepositStatus(bookingId, attempt + 1), 2000);
      else setStep("failed");
    }
  };

  const fetchServiceData = async (serviceId: string) => {
    if (variantsMap[serviceId] !== undefined) return;
    setLoadingService(serviceId);
    try {
      const [vRes, aRes] = await Promise.all([
        supabase.from("service_variants" as any).select("*").eq("service_id", serviceId).eq("is_active", true).order("sort_order"),
        supabase.from("service_addons" as any).select("*").eq("service_id", serviceId).eq("is_active", true).order("sort_order"),
      ]);
      setVariantsMap(prev => ({ ...prev, [serviceId]: (vRes.data || []) as Variant[] }));
      setAddonsMap(prev => ({ ...prev, [serviceId]: (aRes.data || []) as Addon[] }));
    } catch {
      setVariantsMap(prev => ({ ...prev, [serviceId]: [] }));
      setAddonsMap(prev => ({ ...prev, [serviceId]: [] }));
    } finally {
      setLoadingService(null);
    }
  };

  const handleExpandService = (svc: Service) => {
    if (expandedId === svc.id) { setExpandedId(null); return; }
    setExpandedId(svc.id);
    setSelectedVariant(null);
    setSelectedAddons([]);
    fetchServiceData(svc.id);
  };

  const handleSelectService = (svc: Service) => {
    const variants = variantsMap[svc.id] || [];
    if (variants.length > 0 && !selectedVariant) {
      toast.error("Please choose a size or length first");
      return;
    }
    setSelectedService(svc);
    setStep("details");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleAddon = (addon: Addon) => {
    setSelectedAddons(prev =>
      prev.find(a => a.id === addon.id) ? prev.filter(a => a.id !== addon.id) : [...prev, addon]
    );
  };

  const allCategories = Array.from(new Set(services.map(s => s.category).filter(Boolean))) as string[];
  const sortedCategories = [
    ...CATEGORY_ORDER.filter(c => allCategories.includes(c)),
    ...allCategories.filter(c => !CATEGORY_ORDER.includes(c)),
  ];

  const categoryServices = services.filter(s => s.category === selectedCategory);
  const filteredServices = serviceSearch.trim()
    ? categoryServices.filter(s =>
        s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
        (s.description || "").toLowerCase().includes(serviceSearch.toLowerCase())
      )
    : categoryServices;

  const basePrice = Number(selectedService?.price || 0);
  const variantAdj = Number(selectedVariant?.price_adjustment || 0);
  const addonTotal = selectedAddons.reduce((s, a) => s + Number(a.price), 0);
  const subtotal = basePrice + variantAdj + addonTotal;
  const discount = promoApplied
    ? promoApplied.discount_type === "percentage"
      ? (subtotal * promoApplied.discount_value) / 100
      : promoApplied.discount_value
    : 0;
  const total = Math.max(0, subtotal - discount);
  const totalDuration = (selectedService?.duration_minutes || 0) +
    (selectedVariant?.duration_adjustment || 0) +
    selectedAddons.reduce((s, a) => s + (a.duration_adjustment || 0), 0);

  const enabledPayments = (settings as any)?.payment_methods?.filter((m: any) => m.enabled)
    || [{ id: "mobile_money", name: "Mobile Money" }, { id: "cash", name: "Cash" }];

  const serviceDisplayName = selectedService
    ? `${selectedService.name}${selectedVariant ? ` (${selectedVariant.name})` : ""}`
    : "";

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) e.name = "Enter your full name";
    if (!phone.trim() || phone.replace(/\s/g, "").length < 10) e.phone = "Enter a valid phone number";
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

  const handlePayDeposit = async () => {
    if (!validate()) {
      document.getElementById("booking-form-top")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setStep("redirecting");
    try {
      const normalizedTime = normalizeTimeTo24(preferredTime);
      const day = new Date(`${preferredDate}T00:00:00`).getDay();
      if (day === 0) { toast.error("We are closed on Sundays."); setStep("details"); return; }
      const openTime = (settings as any)?.open_time || "08:30";
      const closeTime = (settings as any)?.close_time || "21:00";
      if (!isTimeWithinRange(normalizedTime, openTime, closeTime)) {
        toast.error(`Please pick a time between ${openTime} and ${closeTime}`);
        setStep("details"); return;
      }
      const cleanPhone = phone.replace(/\s/g, "");
      const clientId = await findOrCreateClient({ name, phone: cleanPhone, email: email || null });
      const bRef = `ZB${Date.now().toString(36).toUpperCase()}`;
      const addonLines = selectedAddons.length > 0
        ? selectedAddons.map(a => `  + ${a.name}: GHS ${a.price}`).join("\n")
        : "";
      const notesFull = [
        notes,
        selectedVariant ? `Variant: ${selectedVariant.name}` : "",
        addonLines ? `Add-ons:\n${addonLines}` : "",
        `Balance payment preference: ${PAYMENT_LABELS[paymentPref] || paymentPref}`,
        promoApplied ? `Promo: ${promoApplied.code}` : "",
      ].filter(Boolean).join("\n");
      const selectedAddonsJson = selectedAddons.map(a => ({ id: a.id, name: a.name, price: a.price }));
      const { data: newBooking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          client_name: name, client_email: email || null, client_phone: cleanPhone,
          service_id: selectedService!.id, service_name: serviceDisplayName,
          preferred_date: preferredDate, preferred_time: normalizedTime,
          price: total, deposit_amount: 50, deposit_paid: false,
          duration_minutes: totalDuration,
          notes: notesFull, status: "awaiting_deposit",
          booking_ref: bRef, client_id: clientId || null, payment_ref: bRef,
          variant_id: selectedVariant?.id || null,
          variant_name: selectedVariant?.name || null,
          selected_addons: selectedAddonsJson.length > 0 ? selectedAddonsJson : null,
        } as any)
        .select("id").single();
      if (bookingError) throw bookingError;
      const returnUrl = `${window.location.origin}/book?booking_id=${newBooking.id}`;
      const callbackUrl = `https://vwvrhbyfytmqsywfdhvd.supabase.co/functions/v1/hubtel-webhook`;
      const { checkoutUrl, error: hubtelError } = await initiateCheckout({
        amount: 50,
        description: `Zolara Booking Deposit - ${serviceDisplayName || "Beauty Service"}`,
        clientReference: bRef, callbackUrl, returnUrl,
        cancellationUrl: `${window.location.origin}/book`,
        customerName: name, customerPhone: cleanPhone, customerEmail: email || undefined,
      });
      if (hubtelError) throw new Error(hubtelError);
      if (!checkoutUrl) throw new Error("Could not generate payment link.");
      window.location.href = checkoutUrl;
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Something went wrong. Please try again.");
      setStep("details");
    }
  };

  const GS = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Montserrat:wght@300;400;500;600;700;800&display=swap');
    * { box-sizing: border-box; }
    input:focus, textarea:focus { border-color: #C8A97E !important; box-shadow: 0 0 0 3px rgba(200,169,126,0.18); }
    .pay-btn:hover { border-color: #C8A97E !important; background: rgba(200,169,126,0.08) !important; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes errIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
    @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
    .err { animation: errIn 0.25s ease; font-family: 'Montserrat',sans-serif; color: #EF4444; font-size: 11px; margin-top: 5px; }
    .fade-up { animation: fadeUp 0.4s ease both; }
    .cat-card { transition: all 0.2s ease; cursor: pointer; }
    .cat-card:hover { transform: translateY(-4px); box-shadow: 0 20px 60px rgba(28,22,14,0.22), 0 0 0 1px rgba(200,169,126,0.3) !important; }
    .svc-card { transition: all 0.2s ease; cursor: pointer; }
    .svc-card:hover { box-shadow: 0 8px 32px rgba(28,22,14,0.12) !important; }
    .variant-opt:hover { border-color: #C8A97E !important; background: rgba(200,169,126,0.06) !important; }
    .addon-opt:hover { border-color: #C8A97E !important; }
    @media (max-width:900px) { .bk-grid { grid-template-columns: 1fr !important; } .bk-sidebar { position: static !important; } }
    @media (max-width:640px) { .cat-grid { grid-template-columns: repeat(2,1fr) !important; } .svc-grid { grid-template-columns: 1fr !important; } }
  `;

  if (loading && step === "category") return (
    <div style={{ background: "#F5EFE6", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{GS}</style>
      <Loader2 size={40} style={{ color: GOLD, animation: "spin 0.8s linear infinite" }} />
    </div>
  );

  if (step === "verifying") return (
    <div style={{ background: CREAM, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "'Cormorant Garamond',serif" }}>
      <style>{GS}</style>
      <div style={{ textAlign: "center" }}>
        <Loader2 size={48} style={{ color: GOLD, animation: "spin 1s linear infinite", marginBottom: "24px" }} />
        <h2 style={{ fontSize: "28px", fontWeight: 500, color: DARK, marginBottom: "8px" }}>Confirming your payment...</h2>
        <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "13px", color: TXT_MID }}>Please wait while we verify your deposit.</p>
      </div>
    </div>
  );

  if (step === "redirecting") return (
    <div style={{ background: CREAM, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Cormorant Garamond',serif" }}>
      <style>{GS}</style>
      <div style={{ textAlign: "center" }}>
        <Loader2 size={48} style={{ color: GOLD, animation: "spin 1s linear infinite", marginBottom: "24px" }} />
        <h2 style={{ fontSize: "28px", fontWeight: 500, color: DARK, marginBottom: "8px" }}>Preparing your payment...</h2>
        <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "13px", color: TXT_MID }}>Redirecting to Hubtel secure checkout.</p>
      </div>
    </div>
  );

  if (step === "done") return (
    <div style={{ background: CREAM, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "'Cormorant Garamond',serif" }}>
      <style>{GS}</style>
      <div style={{ maxWidth: "500px", width: "100%", textAlign: "center" }} className="fade-up">
        <div style={{ width: "90px", height: "90px", borderRadius: "50%", background: "rgba(200,169,126,0.12)", border: `2px solid ${GOLD}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px" }}>
          <CheckCircle2 style={{ width: "44px", height: "44px", color: GOLD }} />
        </div>
        <h2 style={{ fontSize: "38px", fontWeight: 600, color: DARK, marginBottom: "12px" }}>Booking Confirmed</h2>
        <p style={{ fontFamily: "'Montserrat',sans-serif", color: TXT_MID, fontSize: "14px", lineHeight: 1.8, marginBottom: "8px" }}>
          Your GHS 50 deposit has been received. We will confirm your appointment via SMS shortly.
        </p>
        <p style={{ fontFamily: "'Montserrat',sans-serif", color: TXT_SOFT, fontSize: "13px", marginBottom: "32px" }}>
          {bookedService}{bookedDate ? ` - ${bookedDate}` : ""}{bookedTime ? ` at ${bookedTime}` : ""}
        </p>
        <div style={{ background: "rgba(200,169,126,0.1)", border: "1px solid rgba(200,169,126,0.3)", borderRadius: "10px", padding: "20px 28px", marginBottom: "20px", display: "inline-block" }}>
          <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "10px", color: TXT_SOFT, letterSpacing: "0.18em", marginBottom: "8px" }}>BOOKING REFERENCE</p>
          <span style={{ fontFamily: "monospace", fontSize: "22px", fontWeight: 700, color: GOLD_DARK, letterSpacing: "0.12em" }}>{bookingRef}</span>
        </div>
        <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "10px", padding: "16px 20px", marginBottom: "32px" }}>
          <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "12.5px", color: GREEN, lineHeight: 1.75, fontWeight: 500 }}>
            Please arrive 5 to 10 minutes early. Pay the remaining balance at the studio after your service.
          </p>
        </div>
        <Link to="/" style={{ fontFamily: "'Montserrat',sans-serif", display: "inline-flex", alignItems: "center", gap: "6px", color: GOLD_DARK, fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>
          <ArrowLeft size={14} /> Return to homepage
        </Link>
      </div>
    </div>
  );

  if (step === "failed") return (
    <div style={{ background: CREAM, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "'Cormorant Garamond',serif" }}>
      <style>{GS}</style>
      <div style={{ maxWidth: "440px", width: "100%", textAlign: "center" }}>
        <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "rgba(239,68,68,0.08)", border: "2px solid #EF4444", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: "30px" }}>x</div>
        <h2 style={{ fontSize: "32px", fontWeight: 600, color: DARK, marginBottom: "12px" }}>Payment Not Confirmed</h2>
        <p style={{ fontFamily: "'Montserrat',sans-serif", color: TXT_MID, fontSize: "13px", lineHeight: 1.8, marginBottom: "28px" }}>
          We could not confirm your payment. If you were charged, please call us immediately on 059 436 5314.
        </p>
        <button onClick={() => { setStep("category"); navigate("/book"); }}
          style={{ fontFamily: "'Montserrat',sans-serif", padding: "14px 32px", background: `linear-gradient(135deg,${GOLD_DARK},${GOLD})`, border: "none", borderRadius: "8px", color: WHITE, fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>
          Try Again
        </button>
      </div>
    </div>
  );

  // STEP 1: CATEGORY
  if (step === "category") return (
    <div style={{ background: MID, minHeight: "100vh", fontFamily: "'Cormorant Garamond',serif" }}>
      <style>{GS}</style>
      <Topbar onBack={() => navigate("/")} showBack={false} />
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "56px 24px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: "52px" }} className="fade-up">
          <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "10px", letterSpacing: "0.3em", color: GOLD_DARK, fontWeight: 700, marginBottom: "12px" }}>BOOK YOUR APPOINTMENT</p>
          <h1 style={{ fontSize: "clamp(32px,5vw,56px)", fontWeight: 500, color: DARK, lineHeight: 1.1, marginBottom: "16px" }}>What are you coming in for?</h1>
          <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "14px", color: TXT_MID, lineHeight: 1.8 }}>Choose a category to see services and pricing.</p>
        </div>
        <div className="cat-grid fade-up" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "20px" }}>
          {sortedCategories.map((cat, i) => {
            const meta = CATEGORY_META[cat] || { icon: "◇", desc: "" };
            const count = services.filter(s => s.category === cat).length;
            return (
              <div key={cat} className="cat-card" onClick={() => { setSelectedCategory(cat); setServiceSearch(""); setStep("service"); }}
                style={{ background: "linear-gradient(155deg,#241C0E 0%,#1A1208 100%)", borderRadius: "14px", padding: "28px 24px", border: "1px solid rgba(200,169,126,0.18)", boxShadow: "0 8px 32px rgba(28,22,14,0.16)", animationDelay: `${i * 0.04}s`, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, right: 0, width: "100px", height: "100px", background: "radial-gradient(circle at 80% 20%,rgba(200,169,126,0.12) 0%,transparent 60%)", pointerEvents: "none" }} />
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
                  <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "rgba(200,169,126,0.12)", border: "1px solid rgba(200,169,126,0.28)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: "18px", color: GOLD }}>{meta.icon}</span>
                  </div>
                  <ChevronRight size={16} style={{ color: "rgba(200,169,126,0.4)", marginTop: "4px" }} />
                </div>
                <h3 style={{ fontSize: "17px", fontWeight: 600, color: "#F5EFE6", marginBottom: "7px", lineHeight: 1.3 }}>{cat}</h3>
                <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "11.5px", color: "rgba(245,239,230,0.48)", lineHeight: 1.6, marginBottom: "14px" }}>{meta.desc}</p>
                <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "10px", color: "rgba(200,169,126,0.7)", fontWeight: 700, letterSpacing: "0.1em" }}>{count} service{count !== 1 ? "s" : ""}</p>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: "52px", display: "flex", flexWrap: "wrap", gap: "24px", justifyContent: "center" }}>
          {[{ icon: "💳", text: "GHS 50 deposit to confirm" }, { icon: "✦", text: "Free WiFi and refreshments" }, { icon: "◎", text: "Mon to Sat, 8:30 AM to 9 PM" }, { icon: "☎", text: "059 436 5314" }].map(({ icon, text }) => (
            <div key={text} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "14px" }}>{icon}</span>
              <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "12px", color: TXT_MID }}>{text}</span>
            </div>
          ))}
        </div>
      </div>
      <AmandaWidget />
    </div>
  );

  // STEP 2: SERVICE SELECTION
  if (step === "service") return (
    <div style={{ background: MID, minHeight: "100vh", fontFamily: "'Cormorant Garamond',serif" }}>
      <style>{GS}</style>
      <Topbar onBack={() => { setStep("category"); setExpandedId(null); }} showBack={true} />
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "48px 24px 80px" }}>
        <div style={{ marginBottom: "36px" }} className="fade-up">
          <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "10px", letterSpacing: "0.3em", color: GOLD_DARK, fontWeight: 700, marginBottom: "8px" }}>
            {(CATEGORY_META[selectedCategory] || {icon:"◇"}).icon} {selectedCategory.toUpperCase()}
          </p>
          <h1 style={{ fontSize: "clamp(26px,4vw,44px)", fontWeight: 500, color: DARK, lineHeight: 1.15, marginBottom: "16px" }}>Choose your service</h1>
          <div style={{ position: "relative", maxWidth: "420px" }}>
            <Search size={15} style={{ position: "absolute", left: "14px", top: "13px", color: TXT_SOFT }} />
            <input value={serviceSearch} onChange={e => setServiceSearch(e.target.value)} placeholder="Search services..." style={{ ...inp, paddingLeft: "42px", background: WHITE, borderRadius: "10px" }} />
          </div>
        </div>

        {filteredServices.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 24px" }}>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "14px", color: TXT_SOFT }}>No services found.</p>
          </div>
        ) : (
          <div className="svc-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "16px" }}>
            {filteredServices.map((svc, i) => {
              const isExpanded = expandedId === svc.id;
              const variants = variantsMap[svc.id] || [];
              const addons = addonsMap[svc.id] || [];
              const isLoadingThis = loadingService === svc.id;
              const allVariantPrices = variants.map(v => svc.price + v.price_adjustment);
              const minPrice = variants.length > 0 ? Math.min(...allVariantPrices) : svc.price;
              const maxPrice = variants.length > 0 ? Math.max(...allVariantPrices) : svc.price;
              const priceLabel = minPrice === maxPrice ? `GHS ${minPrice.toLocaleString()}` : `GHS ${minPrice.toLocaleString()} to ${maxPrice.toLocaleString()}`;

              return (
                <div key={svc.id} className="svc-card fade-up"
                  style={{ background: WHITE, borderRadius: "12px", border: `1.5px solid ${isExpanded ? GOLD : BORDER}`, boxShadow: isExpanded ? "0 8px 32px rgba(200,169,126,0.18)" : "0 2px 12px rgba(28,22,14,0.06)", animationDelay: `${i * 0.05}s`, overflow: "hidden" }}>
                  <div onClick={() => handleExpandService(svc)} style={{ padding: "22px 22px 18px", cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: "16px", fontWeight: 600, color: DARK, marginBottom: "5px", lineHeight: 1.3 }}>{svc.name}</h3>
                        {svc.description && <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "11.5px", color: TXT_MID, lineHeight: 1.6, marginBottom: "10px" }}>{svc.description}</p>}
                        <div style={{ display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "10px", color: TXT_SOFT, display: "flex", alignItems: "center", gap: "4px" }}>
                            <Clock size={11} /> {svc.duration_minutes} min{variants.length > 0 ? "+" : ""}
                          </span>
                          <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "13px", fontWeight: 700, color: GOLD_DARK }}>
                            {variants.length > 0 ? `From ${priceLabel}` : priceLabel}
                          </span>
                        </div>
                      </div>
                      <div style={{ width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0, background: isExpanded ? `linear-gradient(135deg,${GOLD_DARK},${GOLD})` : MID, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                        {isExpanded ? <Check size={14} color={WHITE} /> : <span style={{ fontSize: "16px", color: TXT_SOFT, lineHeight: 1 }}>+</span>}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ borderTop: `1px solid ${BORDER}`, padding: "20px 22px 22px" }}>
                      {isLoadingThis ? (
                        <div style={{ display: "flex", justifyContent: "center", padding: "16px" }}>
                          <Loader2 size={22} style={{ color: GOLD, animation: "spin 0.8s linear infinite" }} />
                        </div>
                      ) : (
                        <>
                          {variants.length > 0 && (
                            <div style={{ marginBottom: addons.length > 0 ? "20px" : "16px" }}>
                              <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", color: GOLD_DARK, marginBottom: "12px" }}>SIZE / LENGTH *</p>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: "8px" }}>
                                {variants.map(v => {
                                  const isSel = selectedVariant?.id === v.id;
                                  const finalPrice = svc.price + v.price_adjustment;
                                  return (
                                    <div key={v.id} className="variant-opt" onClick={() => setSelectedVariant(isSel ? null : v)}
                                      style={{ padding: "10px 12px", borderRadius: "8px", cursor: "pointer", border: `1.5px solid ${isSel ? GOLD : BORDER}`, background: isSel ? "rgba(200,169,126,0.1)" : WHITE, transition: "all 0.15s" }}>
                                      <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "12px", fontWeight: 600, color: isSel ? GOLD_DARK : DARK, marginBottom: "3px" }}>{v.name}</p>
                                      <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "11px", color: isSel ? GOLD : TXT_SOFT }}>GHS {finalPrice.toLocaleString()}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {addons.length > 0 && (
                            <div style={{ marginBottom: "18px" }}>
                              <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", color: GOLD_DARK, marginBottom: "12px" }}>ENHANCEMENTS / ADD-ONS</p>
                              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {addons.map(a => {
                                  const isSel = selectedAddons.some(x => x.id === a.id);
                                  return (
                                    <div key={a.id} className="addon-opt" onClick={() => toggleAddon(a)}
                                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: "8px", cursor: "pointer", border: `1.5px solid ${isSel ? GOLD : BORDER}`, background: isSel ? "rgba(200,169,126,0.08)" : WHITE, transition: "all 0.15s" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        <div style={{ width: "18px", height: "18px", borderRadius: "4px", border: `2px solid ${isSel ? GOLD : BORDER}`, background: isSel ? GOLD : WHITE, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
                                          {isSel && <Check size={10} color={WHITE} strokeWidth={3} />}
                                        </div>
                                        <div>
                                          <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "12px", fontWeight: 600, color: DARK }}>{a.name}</p>
                                          {a.description && <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "11px", color: TXT_SOFT, marginTop: "2px" }}>{a.description}</p>}
                                        </div>
                                      </div>
                                      <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "12px", fontWeight: 700, color: GOLD_DARK, flexShrink: 0, marginLeft: "10px" }}>+GHS {Number(a.price).toLocaleString()}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <button onClick={() => handleSelectService(svc)}
                            style={{ width: "100%", padding: "14px", borderRadius: "8px", background: `linear-gradient(135deg,${GOLD_DARK},${GOLD})`, border: "none", color: WHITE, fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", cursor: "pointer", fontFamily: "'Montserrat',sans-serif", boxShadow: "0 6px 24px rgba(139,105,20,0.35)" }}>
                            BOOK THIS SERVICE
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <AmandaWidget />
    </div>
  );

  // STEP 3: DETAILS FORM
  return (
    <div style={{ background: MID, minHeight: "100vh", fontFamily: "'Cormorant Garamond',serif" }}>
      <style>{GS}</style>
      <Topbar showBack={true} onBack={() => { setStep("service"); setSelectedService(null); window.scrollTo({ top: 0, behavior: "smooth" }); }} />

      <div className="bk-grid" style={{ maxWidth: "1200px", margin: "0 auto", padding: "44px 24px 80px", display: "grid", gridTemplateColumns: "360px 1fr", gap: "40px", alignItems: "start" }}>

        {/* LEFT PANEL */}
        <div className="bk-sidebar" style={{ position: "sticky", top: "90px" }}>
          <div style={{ background: PANEL_BG, borderRadius: "14px", overflow: "hidden", boxShadow: "0 28px 72px rgba(28,22,14,0.28), 0 0 0 1px rgba(200,169,126,0.15)" }}>
            <div style={{ padding: "28px 28px 22px", borderBottom: "1px solid rgba(200,169,126,0.12)", position: "relative" }}>
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 70% 0%,rgba(200,169,126,0.14) 0%,transparent 65%)", pointerEvents: "none" }} />
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
                <img src={LOGO} alt="Zolara" style={{ width: "38px", height: "38px", borderRadius: "50%", objectFit: "cover", border: `2px solid ${GOLD}` }} />
                <div>
                  <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "10px", fontWeight: 800, letterSpacing: "0.2em", color: "#F5EFE6" }}>ZOLARA</div>
                  <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "8px", letterSpacing: "0.2em", color: GOLD, fontWeight: 600 }}>BEAUTY STUDIO</div>
                </div>
              </div>
              <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "9px", letterSpacing: "0.2em", color: "rgba(200,169,126,0.6)", fontWeight: 700, marginBottom: "6px" }}>YOUR SELECTION</p>
              <h3 style={{ fontSize: "20px", fontWeight: 600, color: "#F5EFE6", lineHeight: 1.25, marginBottom: "4px" }}>{selectedService?.name}</h3>
              {selectedVariant && <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "12px", color: GOLD, fontWeight: 600, marginBottom: "2px" }}>{selectedVariant.name}</p>}
              {selectedAddons.length > 0 && (
                <div style={{ marginTop: "8px" }}>
                  {selectedAddons.map(a => (
                    <p key={a.id} style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "11px", color: "rgba(245,239,230,0.55)", marginBottom: "2px" }}>+ {a.name}</p>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: "18px 28px", borderBottom: "1px solid rgba(200,169,126,0.12)", background: "rgba(200,169,126,0.07)" }}>
              {basePrice > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "12px", color: "rgba(245,239,230,0.55)" }}>{selectedService?.name}{selectedVariant ? ` (${selectedVariant.name})` : ""}</span>
                  <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "12px", color: "rgba(245,239,230,0.75)", fontWeight: 600 }}>GHS {(basePrice + variantAdj).toLocaleString()}</span>
                </div>
              )}
              {selectedAddons.map(a => (
                <div key={a.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "12px", color: "rgba(245,239,230,0.55)" }}>+ {a.name}</span>
                  <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "12px", color: "rgba(245,239,230,0.75)", fontWeight: 600 }}>GHS {Number(a.price).toLocaleString()}</span>
                </div>
              ))}
              {discount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "12px", color: GREEN }}>Promo discount</span>
                  <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "12px", color: GREEN, fontWeight: 600 }}>-GHS {discount.toFixed(0)}</span>
                </div>
              )}
              <div style={{ borderTop: "1px solid rgba(200,169,126,0.2)", paddingTop: "10px", marginTop: "4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "11px", fontWeight: 700, color: "rgba(245,239,230,0.6)", letterSpacing: "0.1em" }}>TOTAL</span>
                <span style={{ fontSize: "22px", fontWeight: 700, color: GOLD }}>GHS {total.toLocaleString()}</span>
              </div>
              <div style={{ marginTop: "8px", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "11px", color: "rgba(245,239,230,0.4)" }}>Estimated duration</span>
                <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "11px", color: "rgba(245,239,230,0.55)", fontWeight: 600 }}>{totalDuration} min</span>
              </div>
            </div>

            <div style={{ padding: "16px 28px", borderBottom: "1px solid rgba(200,169,126,0.12)" }}>
              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: `linear-gradient(135deg,${GOLD_DARK},${GOLD})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "14px" }}>💳</div>
                <div>
                  <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: GOLD, marginBottom: "5px" }}>DEPOSIT: HOW IT WORKS</p>
                  <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "11px", color: "rgba(245,239,230,0.65)", lineHeight: 1.7 }}>Pay GHS 50 now to secure your slot. It counts toward your total. Pay the rest at the studio.</p>
                </div>
              </div>
            </div>

            {[
              { icon: "◇", title: "Cancellation Policy", body: "Cancel 24+ hours out for full reschedule. Under 12 hours forfeits deposit. Call to cancel." },
              { icon: "◉", title: "Lateness Policy", body: "15+ minutes late adds GHS 50 fee. 30+ minutes may result in cancellation." },
              { icon: "❋", title: "Loyalty Rewards", body: "1 stamp per GHS 100 spent. 20 stamps earns GHS 50 discount. Double stamps in birthday month." },
            ].map(({ icon, title, body }) => (
              <div key={title} style={{ padding: "14px 28px", borderBottom: "1px solid rgba(200,169,126,0.06)", display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "rgba(200,169,126,0.12)", border: "1px solid rgba(200,169,126,0.22)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: GOLD, fontSize: "11px" }}>{icon}</span>
                </div>
                <div>
                  <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.05em", color: "rgba(245,239,230,0.85)", marginBottom: "3px" }}>{title}</p>
                  <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "10.5px", color: "rgba(245,239,230,0.48)", lineHeight: 1.65 }}>{body}</p>
                </div>
              </div>
            ))}

            <div style={{ padding: "16px 28px" }}>
              <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "9px", letterSpacing: "0.22em", color: GOLD, fontWeight: 700, marginBottom: "8px" }}>NEED HELP?</p>
              <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "13px", color: "rgba(245,239,230,0.85)", fontWeight: 600, marginBottom: "2px" }}>059 436 5314</p>
              <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "13px", color: "rgba(245,239,230,0.85)", fontWeight: 600 }}>020 884 8707</p>
              <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "10px", color: "rgba(245,239,230,0.3)", marginTop: "6px" }}>Mon to Sat, 8:30 AM to 9:00 PM</p>
            </div>
          </div>
        </div>

        {/* RIGHT: FORM */}
        <div id="booking-form-top" className="fade-up">
          <div style={{ marginBottom: "28px" }}>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "10px", letterSpacing: "0.26em", color: GOLD_DARK, fontWeight: 700, marginBottom: "8px" }}>COMPLETE YOUR BOOKING</p>
            <h1 style={{ fontSize: "clamp(26px,4vw,40px)", fontWeight: 500, color: DARK, lineHeight: 1.15, marginBottom: "8px" }}>Your Details</h1>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "13px", color: TXT_MID, lineHeight: 1.75 }}>A GHS 50 deposit via Hubtel confirms your booking. Remainder paid at the studio.</p>
          </div>

          <div style={{ background: WHITE, borderRadius: "12px", padding: "28px", marginBottom: "18px", boxShadow: "0 2px 16px rgba(28,22,14,0.05)", border: `1px solid ${BORDER}` }}>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: GOLD_DARK, marginBottom: "20px" }}>YOUR DETAILS</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
              <div>
                <label style={lbl}>Full Name *</label>
                <div style={{ position: "relative" }}>
                  <User size={13} style={{ position: "absolute", left: "12px", top: "14px", color: TXT_SOFT }} />
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" style={{ ...inp, paddingLeft: "36px" }} />
                </div>
                {errors.name && <p className="err">{errors.name}</p>}
              </div>
              <div>
                <label style={lbl}>Phone *</label>
                <div style={{ position: "relative" }}>
                  <Phone size={13} style={{ position: "absolute", left: "12px", top: "14px", color: TXT_SOFT }} />
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0XX XXX XXXX" style={{ ...inp, paddingLeft: "36px" }} />
                </div>
                {errors.phone && <p className="err">{errors.phone}</p>}
              </div>
            </div>
            <div>
              <label style={lbl}>Email <span style={{ fontSize: "9px", fontWeight: 400, textTransform: "none" }}>(Optional)</span></label>
              <div style={{ position: "relative" }}>
                <Mail size={13} style={{ position: "absolute", left: "12px", top: "14px", color: TXT_SOFT }} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" style={{ ...inp, paddingLeft: "36px" }} />
              </div>
            </div>
          </div>

          <div style={{ background: WHITE, borderRadius: "12px", padding: "28px", marginBottom: "18px", boxShadow: "0 2px 16px rgba(28,22,14,0.05)", border: `1px solid ${BORDER}` }}>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: GOLD_DARK, marginBottom: "20px" }}>DATE AND TIME</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div>
                <label style={lbl}>Date *</label>
                <div style={{ position: "relative" }}>
                  <Calendar size={13} style={{ position: "absolute", left: "12px", top: "14px", color: TXT_SOFT }} />
                  <input type="date" value={preferredDate} onChange={e => setDate(e.target.value)} min={today} style={{ ...inp, paddingLeft: "36px" }} />
                </div>
                {errors.date && <p className="err">{errors.date}</p>}
              </div>
              <div>
                <label style={lbl}>Time *</label>
                <div style={{ position: "relative" }}>
                  <Clock size={13} style={{ position: "absolute", left: "12px", top: "14px", color: TXT_SOFT }} />
                  <input type="time" value={preferredTime} onChange={e => setTime(e.target.value)} min="08:30" max="21:00" style={{ ...inp, paddingLeft: "36px" }} />
                </div>
                {errors.time && <p className="err">{errors.time}</p>}
              </div>
            </div>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "11px", color: TXT_SOFT, marginTop: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
              <Sparkles size={11} style={{ color: GOLD }} /> Mon to Sat, 8:30 AM to 9:00 PM. Closed Sundays.
            </p>
          </div>

          <div style={{ background: WHITE, borderRadius: "12px", padding: "28px", marginBottom: "18px", boxShadow: "0 2px 16px rgba(28,22,14,0.05)", border: `1px solid ${BORDER}` }}>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: GOLD_DARK, marginBottom: "20px" }}>SPECIAL REQUESTS</p>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Style references, allergies, or anything we should know..." rows={3} style={{ ...inp, resize: "vertical" }} />
          </div>

          <div style={{ background: WHITE, borderRadius: "12px", padding: "28px", marginBottom: "18px", boxShadow: "0 2px 16px rgba(28,22,14,0.05)", border: `1px solid ${BORDER}` }}>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: GOLD_DARK, marginBottom: "20px" }}>PROMO CODE</p>
            <div style={{ display: "flex", gap: "10px" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <Tag size={13} style={{ position: "absolute", left: "12px", top: "14px", color: TXT_SOFT }} />
                <input value={promoCode} onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoApplied(null); setPromoError(""); }} placeholder="ENTER CODE" style={{ ...inp, paddingLeft: "36px", fontFamily: "monospace", letterSpacing: "0.1em" }} />
              </div>
              <button onClick={handleApplyPromo} disabled={!promoCode || promoLoading}
                style={{ padding: "12px 20px", background: promoApplied ? GREEN : `linear-gradient(135deg,${GOLD_DARK},${GOLD})`, border: "none", borderRadius: "8px", color: WHITE, fontWeight: 700, fontSize: "12px", cursor: "pointer", whiteSpace: "nowrap", opacity: !promoCode ? 0.5 : 1, fontFamily: "'Montserrat',sans-serif" }}>
                {promoLoading ? "..." : promoApplied ? "Applied" : "Apply"}
              </button>
            </div>
            {promoError && <p className="err">{promoError}</p>}
            {promoApplied && <p style={{ fontFamily: "'Montserrat',sans-serif", color: GREEN, fontSize: "11px", marginTop: "6px" }}>{promoApplied.discount_type === "percentage" ? `${promoApplied.discount_value}% off` : `GHS ${promoApplied.discount_value} off`} applied.</p>}
          </div>

          <div style={{ background: WHITE, borderRadius: "12px", padding: "28px", marginBottom: "18px", boxShadow: "0 2px 16px rgba(28,22,14,0.05)", border: `1px solid ${BORDER}` }}>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: GOLD_DARK, marginBottom: "6px" }}>BALANCE PAYMENT METHOD</p>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "12px", color: TXT_SOFT, marginBottom: "18px" }}>How will you pay the remaining balance when you arrive?</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px" }}>
              {enabledPayments.map((m: any) => {
                const sel = paymentPref === m.id;
                return (
                  <button key={m.id} className="pay-btn" onClick={() => setPaymentPref(m.id)}
                    style={{ padding: "16px 8px", border: `2px solid ${sel ? GOLD : BORDER}`, borderRadius: "10px", background: sel ? "rgba(200,169,126,0.1)" : WHITE, cursor: "pointer", textAlign: "center", transition: "all 0.15s", fontFamily: "'Montserrat',sans-serif" }}>
                    <div style={{ fontSize: "20px", marginBottom: "6px" }}>{PAYMENT_ICONS[m.id] || "💰"}</div>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: sel ? GOLD_DARK : TXT_MID, letterSpacing: "0.05em" }}>{PAYMENT_LABELS[m.id] || m.name}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ background: "linear-gradient(155deg,#241C0E 0%,#1A1208 100%)", borderRadius: "12px", padding: "30px", boxShadow: "0 12px 40px rgba(28,22,14,0.22)" }}>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: "rgba(200,169,126,0.75)", marginBottom: "18px" }}>BOOKING SUMMARY</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "22px" }}>
              {[
                { label: "Name", value: name || "..." },
                { label: "Phone", value: phone || "..." },
                { label: "Service", value: serviceDisplayName || "..." },
                { label: "Date", value: preferredDate || "..." },
                { label: "Time", value: preferredTime || "..." },
              ].map(row => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "9px" }}>
                  <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>{row.label}</span>
                  <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "12px", fontWeight: 600, color: "#F5EFE6", maxWidth: "200px", textAlign: "right" }}>{row.value}</span>
                </div>
              ))}
              {selectedAddons.length > 0 && (
                <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "9px" }}>
                  <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>Add-ons</span>
                  {selectedAddons.map(a => (
                    <p key={a.id} style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "11px", color: GOLD, textAlign: "right", marginTop: "3px" }}>+ {a.name} (GHS {Number(a.price).toLocaleString()})</p>
                  ))}
                </div>
              )}
              {discount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "9px" }}>
                  <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "10px", fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Discount</span>
                  <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "12px", fontWeight: 600, color: GREEN }}>-GHS {discount.toFixed(0)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "4px" }}>
                <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "12px", fontWeight: 700, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Service Total</span>
                <span style={{ fontSize: "28px", fontWeight: 700, color: GOLD }}>GHS {total.toLocaleString()}</span>
              </div>
            </div>
            <div style={{ background: "rgba(200,169,126,0.1)", border: "1px solid rgba(200,169,126,0.22)", borderRadius: "8px", padding: "14px 18px", marginBottom: "22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "12px", color: "rgba(245,239,230,0.65)" }}>Pay now (Hubtel deposit)</span>
                <span style={{ fontSize: "20px", fontWeight: 700, color: GOLD }}>GHS 50</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "12px", color: "rgba(245,239,230,0.65)" }}>Balance at studio</span>
                <span style={{ fontSize: "20px", fontWeight: 700, color: "rgba(245,239,230,0.65)" }}>GHS {Math.max(0, total - 50).toLocaleString()}</span>
              </div>
            </div>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "11px", color: "rgba(245,239,230,0.3)", textAlign: "center", marginBottom: "18px", lineHeight: 1.75 }}>By booking, you agree to our cancellation and lateness policies.</p>
            <button onClick={handlePayDeposit}
              style={{ width: "100%", padding: "18px", borderRadius: "10px", background: `linear-gradient(135deg,${GOLD_DARK},${GOLD})`, border: "none", color: WHITE, fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", fontFamily: "'Montserrat',sans-serif", boxShadow: "0 10px 36px rgba(139,105,20,0.42)" }}>
              PAY GHS 50 DEPOSIT TO BOOK
            </button>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "11px", color: "rgba(245,239,230,0.28)", textAlign: "center", marginTop: "12px" }}>Secured by Hubtel. Your card details are never stored by us.</p>
          </div>
        </div>
      </div>
      <AmandaWidget />
    </div>
  );
}
