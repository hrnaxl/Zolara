import { useState, useEffect } from "react";
// Use browser crypto for client-side UUID — avoids needing SELECT after INSERT (RLS blocks anon select)
const genId = () => crypto.randomUUID();
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { sendSMS, SMS } from "@/lib/sms";
import { validatePromoCode, incrementPromoUsage } from "@/lib/promoCodes";
import { normalizeTimeTo24, isTimeWithinRange } from "@/lib/time";
import { openPaystackPopup } from "@/lib/payment";
import { useSlotLock } from "@/hooks/useSlotLock";
import { Loader2, Calendar, Clock, User, Phone, Mail, Tag, CheckCircle2, ArrowLeft, Sparkles, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { sanitizeName, sanitizePhone, sanitizeEmail, sanitizeNotes } from "@/lib/sanitize";
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

type Step = "form" | "redirecting" | "verifying" | "done" | "failed";

export default function PublicBooking() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { settings } = useSettings();

  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  useEffect(() => {
    const h = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  const mob = windowWidth < 900;
  const sm  = windowWidth < 480;

  // Waitlist / availability
  const [slotStatus, setSlotStatus] = useState<"idle"|"checking"|"available"|"full">("idle");
  const [waitlistJoined, setWaitlistJoined] = useState(false);
  const [joiningWaitlist, setJoiningWaitlist] = useState(false);

  const [step, setStep] = useState<Step>("form");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isFirstTimeBooker, setIsFirstTimeBooker] = useState(false);


  useEffect(() => {
    // Client portal uses its own token — NOT Supabase admin session
    // Only consider logged in if they have a valid client portal token
    const clientToken = typeof window !== "undefined" && localStorage.getItem("zolara_client_token");
    setIsLoggedIn(!!clientToken);
  }, []);

  const [bookingRef, setBookingRef] = useState("");
  const [bookedService, setBookedService] = useState("");
  const [bookedDate, setBookedDate] = useState("");
  const [bookedPromoSaving, setBookedPromoSaving] = useState(0);
  const [bookedTime, setBookedTime] = useState("");
  const [pendingMeta, setPendingMeta] = useState<any>(null); // stored in sessionStorage for fallback

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const serviceId = serviceIds[0] || ""; // primary service id (for slot check compat)
  // Per-service variant/addon data
  const [svcVariantsMap, setSvcVariantsMap] = useState<Record<string,any[]>>({});
  const [svcAddonsMap, setSvcAddonsMap]     = useState<Record<string,any[]>>({});
  const [svcVariantSel, setSvcVariantSel]   = useState<Record<string,string>>({});
  const [svcAddonsSel, setSvcAddonsSel]     = useState<Record<string,string[]>>({});
  const [svcLoading, setSvcLoading]         = useState<Record<string,boolean>>({});
  // Compat aliases for first service (slot check, validation)
  const variants       = svcVariantsMap[serviceId] || [];
  const addons         = svcAddonsMap[serviceId] || [];
  const selectedVariantId = svcVariantSel[serviceId] || "";
  const selectedAddons    = svcAddonsSel[serviceId] || [];
  const variantsLoading   = !!svcLoading[serviceId];
  const [preferredDate, setDate] = useState("");
  const [preferredTime, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentPref, setPaymentPref] = useState("mobile_money");
  const [errors, setErrors] = useState<Record<string,string>>({});

  const today = new Date().toISOString().split("T")[0];

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true); setPromoError("");
    const result = await validatePromoCode(promoCode.trim(), subtotal);
    setPromoLoading(false);
    if (!result.valid) { setPromoError(result.message); return; }
    const promo = result.promo;
    const disc = promo.discount_type === "percentage"
      ? (subtotal * promo.discount_value) / 100
      : Math.min(promo.discount_value, subtotal);
    setAppliedPromo(promo);
  };
  const depositAmount = Number((settings as any)?.deposit_amount ?? 50);

  // Check slot availability whenever date or time changes
  useEffect(() => {
    if (!preferredDate || !preferredTime) { setSlotStatus("idle"); setWaitlistJoined(false); return; }

    // Check operating hours first — no need to hit DB for invalid times
    const openTime  = (settings as any)?.open_time  || "08:30";
    const closeTime = (settings as any)?.close_time || "20:00";
    const normalized = normalizeTimeTo24(preferredTime);
    if (!isTimeWithinRange(normalized, openTime, closeTime)) {
      setSlotStatus("idle"); // clear any previous status, let form validation catch it
      setWaitlistJoined(false);
      return;
    }

    // Check if date is a closed day
    const closedDates: string[] = (settings as any)?.closed_dates || [];
    if (closedDates.some((d: string) => d.split("|")[0] === preferredDate)) {
      setSlotStatus("idle");
      setWaitlistJoined(false);
      return;
    }

    let cancelled = false;
    setSlotStatus("checking");
    setWaitlistJoined(false);
    ;(async () => {
      try {
        const { data, error } = await (supabase as any).rpc("get_available_staff", {
          p_service_id: serviceId || "00000000-0000-0000-0000-000000000000",
          p_date: preferredDate,
          p_time: normalized,
        });
        if (cancelled) return;
        if (error) { setSlotStatus("available"); return; }
        setSlotStatus(!data || data.length === 0 ? "full" : "available");
      } catch { if (!cancelled) setSlotStatus("available"); }
    })();
    return () => { cancelled = true; };
  }, [preferredDate, preferredTime, serviceId, settings]);

  // allVariantsMap: serviceId -> variants[] (for price range display in picker)
  const [allVariantsMap, setAllVariantsMap] = useState<Record<string, any[]>>({});
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [serviceSearch, setServiceSearch] = useState("");

  useEffect(() => {
    Promise.all([
      supabase.from("services").select("id, name, category, price, is_active, description").eq("is_active", true).order("category").order("name"),
      (supabase as any).from("service_variants").select("service_id, price_adjustment, name").eq("is_active", true),
    ]).then(([{ data: svcs }, { data: allVars }]) => {
      setServices(svcs || []);
      const vm: Record<string, any[]> = {};
      for (const v of (allVars || [])) {
        if (!vm[v.service_id]) vm[v.service_id] = [];
        vm[v.service_id].push(v);
      }
      setAllVariantsMap(vm);
      setLoading(false);
      // Prefill service if coming from rebook link
      const prefillName = searchParams.get("prefill_service");
      if (prefillName && svcs) {
        const match = svcs.find((s: any) => s.name === prefillName);
        if (match) { setServiceId(match.id); setActiveCategory(match.category); }
      }
    }).catch(() => setLoading(false));
  }, []);


  const selectedService = services.find(s => s.id === serviceId);
  const selectedServices = services.filter(s => serviceIds.includes(s.id));

  // Load variants + addons for a service the first time it is selected
  const loadServiceExtras = async (svcId: string) => {
    if (!svcId || svcVariantsMap[svcId] !== undefined) return; // already loaded
    setSvcLoading(prev => ({ ...prev, [svcId]: true }));
    const [vRes, aRes] = await Promise.all([
      (supabase as any).from("service_variants").select("*").eq("service_id", svcId).eq("is_active", true).order("sort_order"),
      (supabase as any).from("service_addons").select("*").eq("service_id", svcId).eq("is_active", true).order("sort_order"),
    ]);
    setSvcVariantsMap(prev => ({ ...prev, [svcId]: vRes.data || [] }));
    setSvcAddonsMap(prev =>   ({ ...prev, [svcId]: aRes.data || [] }));
    setSvcLoading(prev => ({ ...prev, [svcId]: false }));
  };

  const selectedVariant = variants.find((v: any) => v.id === selectedVariantId);
  const grouped = services.reduce((acc, s) => {
    const cat = s.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {} as Record<string, any[]>);

  // Helper: get display price range for a service
  const getPriceDisplay = (svc: any) => {
    const vars = allVariantsMap[svc.id] || [];
    if (vars.length === 0) {
      const p = Number(svc.price || 0);
      return p > 0 ? `GHS ${p.toLocaleString()}` : "See pricing";
    }
    const prices = vars.map(v => Number(v.price_adjustment));
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? `GHS ${min.toLocaleString()}` : `GHS ${min.toLocaleString()} - ${max.toLocaleString()}`;
  };

  const allCategories = ["all", ...Object.keys(grouped)];
  const isPackage = (cat: string) => cat.toLowerCase().includes("package") || cat.toLowerCase().includes("promo") || cat.toLowerCase().includes("student") || cat.toLowerCase().includes("kids") || cat.toLowerCase().includes("special") || cat.toLowerCase().includes("deal");
  const packageCats = Object.keys(grouped).filter(isPackage);
  const filteredServices = services.filter(s => {
    const matchCat = activeCategory === "all" || s.category === activeCategory;
    const matchSearch = !serviceSearch || s.name.toLowerCase().includes(serviceSearch.toLowerCase()) || (s.description || "").toLowerCase().includes(serviceSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  // While loading variants OR when variants exist: show 0 until one is selected
  const serviceHasVariants = variantsLoading || variants.length > 0;
  // Each service: use its selected variant price if chosen, else base price
  const basePrice = selectedServices.reduce((total, s) => {
    const selVariantId = svcVariantSel[s.id] || "";
    const svcVars = svcVariantsMap[s.id] || [];
    const selVariant = svcVars.find((v: any) => v.id === selVariantId);
    const hasVariants = svcVars.length > 0 || !!svcLoading[s.id];
    const p = selVariant
      ? Number(selVariant.price_adjustment)
      : hasVariants ? 0 : Number(s.price || 0);
    return total + p;
  }, 0);
  const variantAdj = 0;
  const addonTotal = selectedServices.reduce((total, s) => {
    const selAddons = svcAddonsSel[s.id] || [];
    const svcAddons = svcAddonsMap[s.id] || [];
    return total + svcAddons.filter((a: any) => selAddons.includes(a.id)).reduce((sum: number, a: any) => sum + Number(a.price_min || a.price || 0), 0);
  }, 0);
  const subtotal = basePrice + variantAdj + addonTotal;
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [promoError, setPromoError] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);

  // Derive promoDiscount from current subtotal every render — always up to date
  const promoDiscount = appliedPromo
    ? appliedPromo.discount_type === "percentage"
      ? (subtotal * appliedPromo.discount_value) / 100
      : Math.min(appliedPromo.discount_value, subtotal)
    : 0;
  const total = Math.max(0, subtotal - promoDiscount);

  const enabledPayments = (settings as any)?.payment_methods?.filter((m: any) => m.enabled)
    || [{ id: "mobile_money", name: "Mobile Money" }, { id: "cash", name: "Cash" }];

  const validate = () => {
    const e: Record<string,string> = {};
    if (!name.trim() || name.trim().length < 2) e.name = "Enter your full name";
    if (!phone.trim() || phone.replace(/\s/g,"").length < 10) e.phone = "Enter a valid phone number";
    if (serviceIds.length === 0) e.service = "Please select a service";
    for (const s of selectedServices) {
      const sVars = svcVariantsMap[s.id] || [];
      if (sVars.length > 0 && !svcVariantSel[s.id]) {
        e.variant = "Please select a size/length for " + s.name;
        break;
      }
    }
    if (!preferredDate) e.date = "Please select a date";
    if (!preferredTime) e.time = "Please select a time";
    // Block past times when booking for today
    if (preferredDate && preferredTime) {
      const todayStr = new Date().toISOString().slice(0, 10);
      if (preferredDate === todayStr) {
        const now = new Date();
        const [h, m] = preferredTime.split(":").map(Number);
        const selectedMinutes = h * 60 + m;
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        if (selectedMinutes <= nowMinutes) {
          e.time = "This time has already passed. Please choose a later time or book for tomorrow.";
        }
      }
    }
    setErrors(e);
    return !Object.keys(e).length;
  };


  const handlePayDeposit = async () => {
    if (!validate()) {
      document.getElementById("booking-form-top")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    try {
      const normalizedTime = normalizeTimeTo24(preferredTime);
      const day = new Date(`${preferredDate}T00:00:00`).getDay();
      if (day === 0) { toast.error("We are closed on Sundays."); return; }
      const closedDates: string[] = (settings as any)?.closed_dates || [];
      if (closedDates.some((d: string) => d.split("|")[0] === preferredDate)) {
        const entry = closedDates.find((d: string) => d.startsWith(preferredDate));
        const reason = entry?.includes("|") ? entry.split("|")[1] : "special closure";
        toast.error(`We are closed on this date (${reason}). Please choose another day.`);
        return;
      }
      const openTime = (settings as any)?.open_time || "08:30";
      const closeTime = (settings as any)?.close_time || "20:00";
      if (!isTimeWithinRange(normalizedTime, openTime, closeTime)) {
        toast.error(`Please pick a time between ${openTime} and ${closeTime}`);
        return;
      }

      const cleanPhone = phone.replace(/\s/g,"");
      const bRef = `ZB${Date.now().toString(36).toUpperCase()}`;
      const bookingId = genId();
      const depositAmount = Number((settings as any)?.deposit_amount ?? 50);
      const notesFull = [
        notes,
        `Balance payment preference: ${PAYMENT_LABELS[paymentPref] || paymentPref}`,
        appliedPromo ? `Promo code applied: ${appliedPromo.code} (${appliedPromo.discount_type === "percentage" ? appliedPromo.discount_value + "%" : "GHS " + appliedPromo.discount_value} off, saved GHS ${promoDiscount.toFixed(0)})` : null,
      ].filter(Boolean).join("\n");

      // Sanitize inputs before submission — use local vars, can't reassign state consts
      const safeName = sanitizeName(name);
      const safePhone = sanitizePhone(phone);
      const safeEmail = sanitizeEmail(email);
      const safeNotes = sanitizeNotes(notes);

    // 1. Insert booking as pending BEFORE opening payment popup
      const { error: bookingError } = await supabase
        .from("bookings")
        .insert({
          id: bookingId,
          client_name: safeName,
          client_email: safeEmail || null,
          client_phone: sanitizePhone(cleanPhone),
          service_id: serviceId || null,
          service_name: selectedServices.map(s => s.name).join(", ") || selectedService?.name || null,
          variant_id: selectedVariantId || null,
          variant_name: selectedVariant?.name || null,
          selected_addons: (() => {
            const all: any[] = [];
            for (const s of selectedServices) {
              const selAdd = svcAddonsSel[s.id] || [];
              const sAdd = svcAddonsMap[s.id] || [];
              sAdd.filter((a: any) => selAdd.includes(a.id)).forEach((a: any) => all.push({ id: a.id, name: a.name, price: a.price, service: s.name }));
            }
            return all;
          })(),
          preferred_date: preferredDate,
          preferred_time: normalizedTime,
          price: total,
          deposit_amount: depositAmount,
          deposit_paid: false,
          notes: notesFull,
          status: "pending",
          booking_ref: bRef,
          client_id: null,
          duration_minutes: 0,
          promo_code: appliedPromo?.code || null,
          promo_discount: promoDiscount > 0 ? promoDiscount : null,
        } as any);

      if (bookingError) throw bookingError;

      // Queue "deposit not recorded" SMS server-side — fires in 7 minutes if deposit not paid
      // Uses /api/queue-pending-sms so it survives browser tab close
      const depositNotRecordedMsg = SMS.bookingReceived(
        name || "Valued Client",
        selectedServices.map(s => s.name).join(", ") || selectedService?.name || "service",
        preferredDate,
        normalizedTime,
        bRef,
        false,
        depositAmount,
      );
      const delayedSMSRef = { cancelled: false };
      // Queue the "deposit not recorded" SMS after a 3-second delay
      // This gives Paystack's onSuccess handler time to fire and cancel it
      // before the queue insert happens if payment completes immediately
      if (cleanPhone) {
        setTimeout(() => {
          if (!delayedSMSRef.cancelled) {
            fetch("/api/queue-pending-sms", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ phone: cleanPhone, message: depositNotRecordedMsg, booking_id: bookingId, delay_minutes: 7 }),
            }).catch(console.error);
          }
        }, 3000);
      }

      // 2. Open Paystack popup — inline, no redirect, no edge function, no secret key
      // NOTE: client record is created at checkout, not here
      await openPaystackPopup({
        amount: depositAmount,
        email: email || `${cleanPhone}@zolara.com`,
        reference: bRef,
        metadata: { booking_id: bookingId, booking_ref: bRef, service: selectedService?.name || "", customer_name: name, phone: cleanPhone },
        onSuccess: async (ref) => {
          setStep("verifying");

          // Idempotency check — if payment already confirmed (network drop + retry), skip RPC
          const { data: existingBooking } = await (supabase as any)
            .from("bookings")
            .select("deposit_paid, status")
            .eq("id", bookingId)
            .maybeSingle();

          if (existingBooking?.deposit_paid === true && existingBooking?.status === "confirmed") {
            // Already processed — skip to success
            setBookedPromoSaving(promoDiscount || 0);
            setBookedService(selectedServices.map(s => s.name).join(", ") || selectedService?.name || "");
            setBookedDate(preferredDate);
            setBookedTime(normalizedTime);
            setBookingRef(bRef);
            setStep("done");
            return;
          }

          // Always use direct DB update — the RPC may not exist
          // This is idempotent: if webhook already confirmed, update is a no-op change
          const { error: confirmErr } = await (supabase as any)
            .from("bookings")
            .update({
              deposit_paid: true,
              status: "confirmed",
              payment_ref: ref,
            })
            .eq("id", bookingId)
            .eq("deposit_paid", false); // Only update if not already confirmed (idempotent guard)
          if (confirmErr) {
            console.error("Booking confirm update failed:", confirmErr);
            // Paystack webhook will confirm server-side as backup
          }

          // Cancel the pending "not recorded" SMS — mark it sent so it won't fire
          delayedSMSRef.cancelled = true;
          fetch("/api/queue-pending-sms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone: cleanPhone, booking_id: bookingId, cancel: true }),
          }).catch(console.error);
          // Fetch the booking to get the auto-assigned staff name
          if (cleanPhone) {
            const { data: confirmedBooking } = await (supabase as any)
              .from("bookings")
              .select("staff_name")
              .eq("id", bookingId)
              .maybeSingle();
            const assignedStaff = confirmedBooking?.staff_name || "our team";
            sendSMS(cleanPhone, SMS.bookingConfirmed(
              name || "Valued Client",
              selectedServices.map(s => s.name).join(", ") || selectedService?.name || "service",
              preferredDate,
              normalizedTime,
              assignedStaff,
              bRef,
              true,
              depositAmount,
            )).catch(console.error);
          }

          // Notify staff — send to business phone + all admin/receptionist/owner phones
          try {
            const alertMsg = SMS.newBookingAlert(
              name || "Valued Client",
              selectedServices.map(s => s.name).join(", ") || selectedService?.name || "service",
              preferredDate,
              normalizedTime,
              bRef,
              cleanPhone || "N/A",
            );
            // Notify business phone from settings
            const bizPhone = (settings as any)?.business_phone;
            if (bizPhone) sendSMS(bizPhone, alertMsg).catch(console.error);
            // Also notify all owner/admin/receptionist users via their staff phone
            const { data: staffRoles } = await (supabase as any)
              .from("user_roles")
              .select("staff:staff_id(phone, name)")
              .in("role", ["owner", "admin", "receptionist"]);
            if (staffRoles) {
              for (const row of staffRoles) {
                const phone = row.staff?.phone;
                if (phone && phone !== bizPhone) {
                  sendSMS(phone, alertMsg).catch(console.error);
                }
              }
            }
          } catch (notifyErr) { console.error("Staff notification failed:", notifyErr); }

          // Increment promo code usage
          if (appliedPromo?.id) { incrementPromoUsage(appliedPromo.id).catch(console.error); }

          // Check if this is their first booking (phone has only 1 booking = this one)
          // If so, show the Create Account CTA on the success screen
          if (!isLoggedIn && cleanPhone) {
            try {
              const { count } = await (supabase as any)
                .from("bookings")
                .select("id", { count: "exact", head: true })
                .or(`client_phone.eq.${cleanPhone},client_phone.eq.${phone.trim()}`);
              // count === 1 means only this booking exists for this phone = first time
              const isFirst = (count || 0) <= 1;
              setIsFirstTimeBooker(isFirst);
              // Send welcome SMS to first-time bookers
              if (isFirst && cleanPhone) {
                sendSMS(cleanPhone, SMS.welcomeNewClient(
                  name || "Valued Client",
                  selectedServices.map(s => s.name).join(", ") || selectedService?.name || "service",
                  preferredDate,
                  normalizedTime,
                  bRef,
                )).catch(console.error);
              }
            } catch { setIsFirstTimeBooker(true); }
          }

          setBookingRef(bRef);
          setBookedService(selectedServices.map(s => s.name).join(", ") || selectedService?.name || "");
          setBookedDate(preferredDate);
          setBookedTime(normalizedTime);
          setBookedPromoSaving(promoDiscount || 0);
          setStep("done");
        },
        onClose: () => {
          // User closed without paying — delete the orphaned booking
          if (bookingId) {
            (supabase as any).from("bookings").delete().eq("id", bookingId).then(() => {});
          }
          setStep("form");
          toast.error("Payment was not completed. Your slot has not been reserved.");
        },
      });

    } catch (err: any) {
      console.error("Deposit error:", err);
      // If booking was already inserted before the error, delete it to avoid orphan
      if (bookingId) {
        (supabase as any).from("bookings").delete().eq("id", bookingId).then(() => {});
      }
      toast.error(err.message || "Something went wrong. Please try again.");
      setStep("form");
    }
  };

  // ── STATES ────────────────────────────────────────────────────

  if (step === "verifying") return (
    <div style={{ background: CREAM, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "'Cormorant Garamond',serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Montserrat:wght@400;500;600&display=swap'); @keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ textAlign: "center" }}>
        <Loader2 size={48} style={{ color: GOLD, animation: "spin 1s linear infinite", marginBottom: "24px" }} />
        <h2 style={{ fontSize: "28px", fontWeight: 500, color: DARK, marginBottom: "8px" }}>Confirming your payment...</h2>
        <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "13px", color: TXT_MID }}>Please wait while we confirm your deposit.</p>
      </div>
    </div>
  );

  if (step === "redirecting") return (
    <div style={{ background: CREAM, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Cormorant Garamond',serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500&family=Montserrat:wght@400;500&display=swap'); @keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ textAlign: "center" }}>
        <Loader2 size={48} style={{ color: GOLD, animation: "spin 1s linear infinite", marginBottom: "24px" }} />
        <h2 style={{ fontSize: "28px", fontWeight: 500, color: DARK, marginBottom: "8px" }}>Preparing your payment...</h2>
        <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "13px", color: TXT_MID }}>You'll be redirected to Paystack's secure checkout page.</p>
      </div>
    </div>
  );

  if (step === "done") return (
    <div style={{ background: CREAM, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "'Cormorant Garamond',serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Montserrat:wght@400;500;600;700&display=swap');`}</style>
      <div style={{ maxWidth: "500px", width: "100%", textAlign: "center" }}>
        <div style={{ width: "90px", height: "90px", borderRadius: "50%", background: "rgba(200,169,126,0.12)", border: `2px solid ${GOLD}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px" }}>
          <CheckCircle2 style={{ width: "44px", height: "44px", color: GOLD }} />
        </div>
        <h2 style={{ fontSize: "38px", fontWeight: 600, color: DARK, marginBottom: "12px" }}>Booking Confirmed</h2>
        <p style={{ fontFamily: "'Montserrat',sans-serif", color: TXT_MID, fontSize: "14px", lineHeight: 1.8, marginBottom: "8px" }}>
          `Your GHS ${depositAmount} deposit has been received. We will confirm your appointment via SMS shortly. Please arrive 5 to 10 minutes early.`
        </p>
        <p style={{ fontFamily: "'Montserrat',sans-serif", color: TXT_SOFT, fontSize: "13px", marginBottom: "32px" }}>
          {bookedService}{bookedDate ? ` · ${bookedDate}` : ""}{bookedTime ? ` · ${bookedTime}` : ""}
        </p>
        <div style={{ background: "rgba(200,169,126,0.1)", border: "1px solid rgba(200,169,126,0.3)", borderRadius: "10px", padding: "20px 28px", marginBottom: "20px", display: "inline-block" }}>
          <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "10px", color: TXT_SOFT, letterSpacing: "0.18em", marginBottom: "8px" }}>BOOKING REFERENCE</p>
          <span style={{ fontFamily: "monospace", fontSize: "22px", fontWeight: 700, color: GOLD_DARK, letterSpacing: "0.12em" }}>{bookingRef}</span>
        </div>
        {bookedPromoSaving > 0 && (
          <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "10px", padding: "14px 20px", marginBottom: "16px", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 20 }}>🎉</span>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "13px", color: GREEN, fontWeight: 700, margin: 0 }}>
              You saved GHS {bookedPromoSaving.toFixed(0)} with your promo code!
            </p>
          </div>
        )}
        <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "10px", padding: "16px 20px", marginBottom: "32px" }}>
          <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "12.5px", color: GREEN, lineHeight: 1.75, fontWeight: 500 }}>
            Pay the remaining balance at the studio on the day of your appointment.
          </p>
        </div>
        {!isLoggedIn && (
          <div style={{ background: "rgba(200,169,126,0.08)", border: "1px solid rgba(200,169,126,0.25)", borderRadius: "14px", padding: "24px 28px", marginBottom: "24px", textAlign: "left" }}>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "13px", fontWeight: 700, color: DARK, marginBottom: "6px" }}>Save this booking to your account</p>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "12px", color: TXT_MID, lineHeight: 1.7, marginBottom: "16px" }}>
              Sign in with your phone number to track your bookings, view loyalty stamps, and manage appointments — all in one place. No password needed.
            </p>
            <Link to="/client-login?redirect=/app/client/dashboard" style={{ fontFamily: "'Montserrat',sans-serif", display: "inline-flex", alignItems: "center", gap: "6px", background: `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD})`, color: WHITE, fontSize: "12px", fontWeight: 700, textDecoration: "none", padding: "11px 22px", borderRadius: "8px", letterSpacing: "0.04em" }}>
              Sign In with Phone →
            </Link>
          </div>
        )}
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
          {bookingRef && (
            <Link to={`/receipt/${bookingRef}`} style={{ fontFamily: "'Montserrat',sans-serif", display: "inline-flex", alignItems: "center", gap: "6px", color: GOLD_DARK, fontSize: "13px", fontWeight: 700, textDecoration: "none", background: "rgba(200,169,126,0.1)", padding: "10px 24px", borderRadius: 24, border: "1px solid rgba(200,169,126,0.3)" }}>
              View Receipt →
            </Link>
          )}
          <Link to={typeof window !== "undefined" && localStorage.getItem("zolara_client_token") ? "/app/client/dashboard" : "/"} style={{ fontFamily: "'Montserrat',sans-serif", display: "inline-flex", alignItems: "center", gap: "6px", color: GOLD_DARK, fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>
            {typeof window !== "undefined" && localStorage.getItem("zolara_client_token") ? "← Back to Dashboard" : "Return to homepage"}
          </Link>
        </div>
      </div>
    </div>
  );

  if (step === "failed") return (
    <div style={{ background: CREAM, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "'Cormorant Garamond',serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Montserrat:wght@400;500;600&display=swap');`}</style>
      <div style={{ maxWidth: "440px", width: "100%", textAlign: "center" }}>
        <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "rgba(239,68,68,0.08)", border: "2px solid #EF4444", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: "30px" }}>✗</div>
        <h2 style={{ fontSize: "32px", fontWeight: 600, color: DARK, marginBottom: "12px" }}>Payment Not Confirmed</h2>
        <p style={{ fontFamily: "'Montserrat',sans-serif", color: TXT_MID, fontSize: "13px", lineHeight: 1.8, marginBottom: "28px" }}>
          We could not confirm your payment. If you were charged, please call us immediately on 059 436 5314.
        </p>
        <button onClick={() => { setStep("form"); navigate("/book"); }}
          style={{ fontFamily: "'Montserrat',sans-serif", padding: "14px 32px", background: `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD})`, border: "none", borderRadius: "8px", color: WHITE, fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>
          Try Again
        </button>
      </div>
    </div>
  );

  // ── MAIN FORM ─────────────────────────────────────────────────
  return (
    <div style={{ background: MID, minHeight: "100vh", fontFamily: "'Cormorant Garamond',serif", overflowX: "hidden", width: "100%" }}>
      <style>{`
        @media (max-width: 768px) {
          input, select, textarea { font-size: 16px !important; }
          .booking-service-tile { min-height: 52px !important; }
        }
      `}</style>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Montserrat:wght@300;400;500;600;700&display=swap');
        * { font-variant-numeric: lining-nums; }
        input:focus, textarea:focus, select:focus { border-color: ${GOLD} !important; box-shadow: 0 0 0 3px rgba(200,169,126,0.18); }
        .pay-btn:hover { border-color: ${GOLD} !important; background: rgba(200,169,126,0.08) !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes errIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
        .err { animation: errIn 0.25s ease; font-family: 'Montserrat',sans-serif; color: ${RED}; font-size: 11px; margin-top: 5px; }
        .svc-select { appearance: none; -webkit-appearance: none; cursor: pointer; }
        .svc-select:hover { border-color: ${GOLD} !important; }
      `}</style>

      {/* Topbar */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(245,239,230,0.97)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(200,169,126,0.2)", padding: mob ? "12px 16px" : "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", overflow: "hidden", boxShadow: "0 2px 20px rgba(28,22,14,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", cursor: "pointer", color: TXT_MID, fontSize: "13px", fontWeight: 500, fontFamily: "'Montserrat',sans-serif", transition: "color 0.15s", padding: 0 }}
            onMouseEnter={e => (e.currentTarget.style.color = GOLD_DARK)}
            onMouseLeave={e => (e.currentTarget.style.color = TXT_MID)}>
            <ArrowLeft size={16} /> Back to homepage
          </button>

        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>

          <Link to="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
            <img src={LOGO} style={{ width: "34px", height: "34px", borderRadius: "50%", objectFit: "cover", border: `2px solid ${GOLD}` }} alt="Zolara" />
            <div>
              <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "12px", fontWeight: 800, letterSpacing: "0.2em", color: DARK, lineHeight: 1.1 }}>ZOLARA</div>
              <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "9px", letterSpacing: "0.2em", color: GOLD, fontWeight: 600 }}>BEAUTY STUDIO</div>
            </div>
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: mob ? "16px 12px 120px" : "44px 24px 80px", display: "grid", gridTemplateColumns: mob ? "1fr" : "360px 1fr", gap: mob ? "20px" : "40px", alignItems: "start", width: "100%", boxSizing: "border-box" as any }}>

        {/* LEFT: Info panel */}
        <div style={{ position: mob ? "static" : "sticky", top: mob ? "auto" : "90px" }}>
          <div style={{ background: "linear-gradient(160deg, #241C0E 0%, #1A1208 55%, #201608 100%)", borderRadius: "14px", overflow: "hidden", boxShadow: "0 28px 72px rgba(28,22,14,0.28), 0 0 0 1px rgba(200,169,126,0.15)" }}>

            {/* Panel header */}
            <div style={{ padding: mob ? "20px 16px" : "32px 28px 26px", borderBottom: "1px solid rgba(200,169,126,0.12)", position: "relative" }}>
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 70% 0%, rgba(200,169,126,0.14) 0%, transparent 65%)", pointerEvents: "none" }} />
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                <div style={{ width: "46px", height: "46px", borderRadius: "50%", border: `2px solid ${GOLD}`, overflow: "hidden", flexShrink: 0, boxShadow: "0 0 0 4px rgba(200,169,126,0.12)" }}>
                  <img src={LOGO} alt="Zolara" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div>
                  <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "11px", fontWeight: 800, letterSpacing: "0.2em", color: "#F5EFE6", lineHeight: 1.1 }}>ZOLARA</div>
                  <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "8.5px", letterSpacing: "0.2em", color: GOLD, fontWeight: 600, marginTop: "2px" }}>BEAUTY STUDIO</div>
                </div>
              </div>
              <h3 style={{ fontSize: "22px", fontWeight: 500, color: "#F5EFE6", lineHeight: 1.25, marginBottom: "6px" }}>Book With <em>Confidence</em></h3>
              <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "12px", color: "rgba(245,239,230,0.55)", lineHeight: 1.7, fontWeight: 400 }}>Everything you need to know before you book.</p>
            </div>

            {/* Deposit highlight */}
            <div style={{ padding: mob ? "14px 16px" : "22px 28px", background: "rgba(200,169,126,0.1)", borderBottom: "1px solid rgba(200,169,126,0.12)" }}>
              <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: "linear-gradient(135deg, #8B6914, #C8A97E)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "16px" }}>💳</div>
                <div>
                  <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.1em", color: GOLD, marginBottom: "7px" }}>GHS 50 DEPOSIT: HOW IT WORKS</p>
                  <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "12.5px", color: "rgba(245,239,230,0.82)", lineHeight: 1.8, fontWeight: 400 }}>
                    `A GHS ${depositAmount} deposit is required to confirm your slot. It is fully counted toward your service total. You pay only the remaining balance at the studio after your service.`
                  </p>
                </div>
              </div>
            </div>

            {/* Info rows */}
            {[
              { icon: "◈", title: "Expert Stylists, Every Time", body: "All staff are trained specialists. You will never be assigned an untrained stylist at Zolara." },
              { icon: "✦", title: "The Luxury Difference", body: "Free WiFi, chilled water, Arctic AC, and a perfume spritz with chocolate on your way out." },
              { icon: "◇", title: "Cancellation Policy", body: (settings as any)?.cancellation_policy || "Cancel 24 or more hours out for a full reschedule at no cost. Less than 12 hours forfeits the deposit. Call to cancel. SMS cancellations are not accepted." },
              { icon: "◉", title: "Lateness Policy", body: `Arrive 5 to 10 minutes early. ${(settings as any)?.lateness_cutoff ?? 15} or more minutes late incurs a GHS ${(settings as any)?.lateness_fee ?? 50} lateness fee. 30 or more minutes may result in cancellation.` },
              { icon: "❋", title: "Loyalty Rewards", body: "1 stamp per GHS 100 spent. 20 stamps = GHS 50 discount. Double stamps in your birthday month." },
              { icon: "★", title: "Student Discount", body: `${(settings as any)?.student_discount ?? 10}% off all services Mon to Thu with a valid student ID. Present ID when booking.` },
            ].map(({ icon, title, body }) => (
              <div key={title} style={{ padding: mob ? "12px 16px" : "17px 28px", borderBottom: "1px solid rgba(200,169,126,0.08)", display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "rgba(200,169,126,0.14)", border: "1px solid rgba(200,169,126,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: GOLD, fontSize: "13px" }}>{icon}</span>
                </div>
                <div>
                  <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", color: "rgba(245,239,230,0.92)", marginBottom: "5px" }}>{title}</p>
                  <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "12px", color: "rgba(245,239,230,0.58)", lineHeight: 1.75, fontWeight: 400 }}>{body}</p>
                </div>
              </div>
            ))}

            {/* Contact */}
            <div style={{ padding: mob ? "14px 16px" : "22px 28px" }}>
              <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "9.5px", letterSpacing: "0.22em", color: GOLD, fontWeight: 700, marginBottom: "12px" }}>NEED HELP? CALL US</p>
              <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "14.5px", color: "rgba(245,239,230,0.85)", fontWeight: 600, marginBottom: "4px" }}>059 436 5314</p>
              <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "14.5px", color: "rgba(245,239,230,0.85)", fontWeight: 600 }}>020 884 8707</p>
              <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "11px", color: "rgba(245,239,230,0.32)", marginTop: "10px", fontWeight: 400 }}>Mon to Sat · 8:30 AM to 8:00 PM</p>
            </div>
          </div>
        </div>

        {/* RIGHT: Form */}
        <div id="booking-form-top" style={{ minWidth: 0 }}>
          <div style={{ marginBottom: mob ? "16px" : "32px" }}>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "10px", letterSpacing: "0.26em", color: GOLD_DARK, fontWeight: 700, marginBottom: "8px" }}>BOOK YOUR APPOINTMENT</p>
            <h1 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 500, color: DARK, lineHeight: 1.15, marginBottom: "8px" }}>Reserve Your <em>Zolara</em> Experience</h1>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "13.5px", color: TXT_MID, lineHeight: 1.75 }}>Fill in your details below. A GHS 50 deposit via Paystack is required to confirm your booking.</p>
          </div>

          {/* Personal Details */}
          <div style={{ background: WHITE, borderRadius: "12px", padding: mob ? "20px 16px" : "32px", marginBottom: "16px", boxShadow: "0 2px 16px rgba(28,22,14,0.05)", border: `1px solid ${BORDER}` }}>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: GOLD_DARK, marginBottom: mob ? "16px" : "24px" }}>YOUR DETAILS</p>
            <div style={{ display: "grid", gridTemplateColumns: sm ? "1fr" : "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label style={lbl}>Full Name *</label>
                <div style={{ position: "relative" }}>
                  <User size={14} style={{ position: "absolute", left: "12px", top: "14px", color: TXT_SOFT }} />
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" style={{ ...inp, paddingLeft: "38px" }} />
                </div>
                {errors.name && <p className="err">{errors.name}</p>}
              </div>
              <div>
                <label style={lbl}>Phone *</label>
                <div style={{ position: "relative" }}>
                  <Phone size={14} style={{ position: "absolute", left: "12px", top: "14px", color: TXT_SOFT }} />
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0XX XXX XXXX" style={{ ...inp, paddingLeft: "38px" }} />
                </div>
                {errors.phone && <p className="err">{errors.phone}</p>}
              </div>
            </div>
            <div>
              <label style={lbl}>Email <span style={{ fontSize: "9px", color: TXT_SOFT, fontWeight: 400, letterSpacing: "0.05em", textTransform: "none" }}>(Optional)</span></label>
              <div style={{ position: "relative" }}>
                <Mail size={14} style={{ position: "absolute", left: "12px", top: "14px", color: TXT_SOFT }} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" style={{ ...inp, paddingLeft: "38px" }} />
              </div>
            </div>
          </div>

          {/* Service */}
          <div style={{ background: WHITE, borderRadius: "12px", padding: mob ? "16px" : "24px 28px", marginBottom: "16px", boxShadow: "0 2px 16px rgba(28,22,14,0.05)", border: `1px solid ${BORDER}` }}>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: GOLD_DARK, marginBottom: "16px" }}>SELECT A SERVICE</p>
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "20px 0" }}>
                <Loader2 size={24} style={{ color: GOLD, animation: "spin 0.8s linear infinite" }} />
              </div>
            ) : (<>
              {/* Packages banner — only shown if package categories exist */}
              {packageCats.length > 0 && (
                <div style={{ background: "linear-gradient(135deg, #1C160E 0%, #2D2318 100%)", borderRadius: "10px", padding: "16px 18px", marginBottom: "16px", border: `1px solid ${GOLD}40` }}>
                  <p style={{ color: GOLD, fontFamily: "'Montserrat',sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", margin: "0 0 8px" }}>✦ PACKAGES & DEALS</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {packageCats.map(cat => (
                      (grouped[cat] || []).map((svc: any) => (
                        <button key={svc.id} onClick={() => { setServiceIds(prev => prev.includes(svc.id) ? prev.filter(id => id !== svc.id) : [...prev, svc.id]); setActiveCategory(cat); }}
                          style={{ background: serviceIds.includes(svc.id) ? GOLD : "rgba(200,169,126,0.12)", border: `1.5px solid ${serviceIds.includes(svc.id) ? GOLD : "rgba(200,169,126,0.3)"}`, borderRadius: "8px", padding: "8px 14px", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
                          <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "12px", fontWeight: 700, color: serviceIds.includes(svc.id) ? DARK : GOLD, margin: 0 }}>{svc.name}</p>
                          <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "11px", color: serviceIds.includes(svc.id) ? "rgba(28,22,14,0.7)" : "rgba(200,169,126,0.7)", margin: "2px 0 0" }}>{getPriceDisplay(svc)}</p>
                        </button>
                      ))
                    ))}
                  </div>
                </div>
              )}

              {/* Search */}
              <div style={{ position: "relative", marginBottom: "14px" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TXT_SOFT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: "12px", top: "13px", pointerEvents: "none" }}>
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input value={serviceSearch} onChange={e => setServiceSearch(e.target.value)} placeholder="Search services…" style={{ ...inp, paddingLeft: "36px", fontSize: "13px", padding: "11px 16px 11px 36px" }} />
              </div>

              {/* Category tabs */}
              {!serviceSearch && (
                <div style={{ position: "relative", marginBottom: "14px" }}>
                  <style>{`
                    .cat-scroll::-webkit-scrollbar { display: none; }
                    .cat-scroll { -ms-overflow-style: none; scrollbar-width: none; }
                  `}</style>
                  {/* Left fade */}
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 24, background: "linear-gradient(to right, white, transparent)", zIndex: 1, pointerEvents: "none", borderRadius: "20px 0 0 20px" }} />
                  {/* Right fade */}
                  <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 24, background: "linear-gradient(to left, white, transparent)", zIndex: 1, pointerEvents: "none", borderRadius: "0 20px 20px 0" }} />
                  <div className="cat-scroll" style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px", paddingLeft: "4px", paddingRight: "4px", WebkitOverflowScrolling: "touch" as any }}>
                    {allCategories.filter(c => !isPackage(c)).map(cat => (
                      <button key={cat} onClick={() => setActiveCategory(cat)}
                        style={{ background: activeCategory === cat ? GOLD_DARK : "white", color: activeCategory === cat ? "white" : TXT_MID, border: `1.5px solid ${activeCategory === cat ? GOLD_DARK : BORDER}`, borderRadius: "20px", padding: "6px 16px", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "'Montserrat',sans-serif", transition: "all 0.15s", whiteSpace: "nowrap", flexShrink: 0 }}>
                        {cat === "all" ? "All" : cat} {cat !== "all" && <span style={{ opacity: 0.6, fontSize: "10px" }}>({(grouped[cat] || []).length})</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Service cards — variants/addons render inline below clicked service */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {filteredServices.filter(s => !isPackage(s.category)).length === 0 && (
                  <p style={{ textAlign: "center", color: TXT_SOFT, fontSize: "13px", padding: "24px 0" }}>No services found.</p>
                )}
                {filteredServices.filter(s => !isPackage(s.category)).map((svc: any) => {
                  const active = serviceIds.includes(svc.id);
                  return (
                    <div key={svc.id}>
                      {/* Service row */}
                      <button type="button" onClick={() => {
                        setServiceIds(prev => {
                          const next = prev.includes(svc.id) ? prev.filter(id => id !== svc.id) : [...prev, svc.id];
                          if (!prev.includes(svc.id)) loadServiceExtras(svc.id); // load on first select
                          return next;
                        });
                      }}
                        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: active ? "#FBF6EE" : "white", border: `1.5px solid ${active ? GOLD : BORDER}`, borderRadius: active ? "10px 10px 0 0" : "10px", padding: "12px 16px", cursor: "pointer", textAlign: "left", transition: "all 0.15s", gap: "12px" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "13px", fontWeight: 700, color: DARK, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{svc.name}</p>
                          <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "11px", color: TXT_SOFT, margin: "2px 0 0" }}>{svc.description ? svc.description.slice(0, 60) + (svc.description.length > 60 ? "…" : "") : ""}</p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                          <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "13px", fontWeight: 700, color: active ? GOLD_DARK : TXT_MID, whiteSpace: "nowrap" }}>{getPriceDisplay(svc)}</span>
                          <span style={{ width: "18px", height: "18px", borderRadius: "50%", background: active ? GOLD : BORDER, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "11px", fontWeight: 700, flexShrink: 0, transition: "all 0.15s" }}>{active ? "✓" : ""}</span>
                        </div>
                      </button>

                      {/* Inline variants + addons — per-service, loads on first select */}
                      {active && (() => {
                        const svcVars  = svcVariantsMap[svc.id] || [];
                        const svcAdds  = svcAddonsMap[svc.id]   || [];
                        const isLoading = !!svcLoading[svc.id];
                        const selVarId = svcVariantSel[svc.id]  || "";
                        const selAdds  = svcAddonsSel[svc.id]   || [];
                        if (!isLoading && svcVars.length === 0 && svcAdds.length === 0 && svcVariantsMap[svc.id] !== undefined) return null;
                        return (
                        <div style={{ border: `1.5px solid ${GOLD}`, borderTop: "none", borderRadius: "0 0 10px 10px", padding: "14px 16px", background: "#FFFDF9", display: "flex", flexDirection: "column", gap: "14px" }}>
                          {isLoading && <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 12, color: TXT_SOFT }}>Loading options...</p>}

                          {/* Variants */}
                          {svcVars.length > 0 && (
                            <div>
                              <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", color: GOLD_DARK, marginBottom: "8px" }}>
                                SIZE / LENGTH <span style={{ color: "#C0392B", marginLeft: "2px" }}>*</span>
                              </p>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                {svcVars.map((v: any) => {
                                  const vActive = selVarId === v.id;
                                  return (
                                    <button type="button" key={v.id} onClick={() => setSvcVariantSel(prev => ({ ...prev, [svc.id]: v.id }))}
                                      style={{ background: vActive ? GOLD_DARK : "white", color: vActive ? "white" : DARK, border: `1.5px solid ${vActive ? GOLD_DARK : BORDER}`, borderRadius: "8px", padding: "8px 14px", cursor: "pointer", fontFamily: "'Montserrat',sans-serif", fontSize: "12px", fontWeight: 600, transition: "all 0.15s" }}>
                                      {v.name}
                                      <span style={{ display: "block", fontSize: "11px", fontWeight: 700, color: vActive ? "rgba(255,255,255,0.85)" : GOLD_DARK, marginTop: "2px" }}>
                                        GHS {Number(v.price_adjustment).toLocaleString()}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                              {errors.variant && errors.variant.includes(svc.name) && <p className="err" style={{ marginTop: "6px" }}>{errors.variant}</p>}
                            </div>
                          )}

                          {/* Add-ons */}
                          {svcAdds.length > 0 && (
                            <div>
                              <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", color: "#7C3AED", marginBottom: "8px" }}>
                                ADD-ONS <span style={{ fontWeight: 400, color: TXT_SOFT }}>(optional)</span>
                              </p>
                              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {svcAdds.map((a: any) => {
                                  const checked = selAdds.includes(a.id);
                                  return (
                                    <label key={a.id} onClick={() => setSvcAddonsSel(prev => ({ ...prev, [svc.id]: checked ? (prev[svc.id]||[]).filter((id:string) => id !== a.id) : [...(prev[svc.id]||[]), a.id] }))}
                                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: checked ? "#F5F3FF" : "white", border: `1.5px solid ${checked ? "#A78BFA" : BORDER}`, borderRadius: "8px", padding: "10px 14px", cursor: "pointer", transition: "all 0.15s" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        <div style={{ width: "16px", height: "16px", borderRadius: "4px", border: `2px solid ${checked ? "#7C3AED" : "#D1C5B8"}`, background: checked ? "#7C3AED" : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                          {checked && <span style={{ color: "white", fontSize: "10px", fontWeight: 700 }}>✓</span>}
                                        </div>
                                        <div>
                                          <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "13px", fontWeight: 600, color: DARK, margin: 0 }}>{a.name}</p>
                                          {a.description && <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "11px", color: TXT_SOFT, margin: 0 }}>{a.description}</p>}
                                        </div>
                                      </div>
                                      <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "13px", fontWeight: 700, color: "#7C3AED", whiteSpace: "nowrap", marginLeft: "12px" }}>
                                        +GHS {a.price_min && a.price_max ? `${Number(a.price_min).toLocaleString()} – ${Number(a.price_max).toLocaleString()}` : Number(a.price).toLocaleString()}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                        </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            </>)}
            {errors.service && <p className="err">{errors.service}</p>}
          </div>

          {/* Date & Time */}
          <div style={{ background: WHITE, borderRadius: "12px", padding: mob ? "20px 16px" : "32px", marginBottom: "16px", boxShadow: "0 2px 16px rgba(28,22,14,0.05)", border: `1px solid ${BORDER}` }}>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: GOLD_DARK, marginBottom: mob ? "16px" : "24px" }}>DATE AND TIME</p>
            <div style={{ display: "grid", gridTemplateColumns: sm ? "1fr" : "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={lbl}>Date *</label>
                <div style={{ position: "relative" }}>
                  <Calendar size={14} style={{ position: "absolute", left: "12px", top: "14px", color: TXT_SOFT }} />
                  <input type="date" value={preferredDate} onChange={e => setDate(e.target.value)} min={today} style={{ ...inp, paddingLeft: "38px" }} />
                </div>
                {errors.date && <p className="err">{errors.date}</p>}
              </div>
              <div>
                <label style={lbl}>Time *</label>
                <div style={{ position: "relative" }}>
                  <Clock size={14} style={{ position: "absolute", left: "12px", top: "14px", color: TXT_SOFT }} />
                  <input type="time" value={preferredTime} onChange={e => setTime(e.target.value)}
                    min={(() => {
                      const todayStr = new Date().toISOString().slice(0, 10);
                      if (preferredDate === todayStr) {
                        const now = new Date();
                        // Add 15 min buffer so they can't book the current minute
                        now.setMinutes(now.getMinutes() + 15);
                        return now.getHours().toString().padStart(2, "0") + ":" + now.getMinutes().toString().padStart(2, "0");
                      }
                      return "08:30";
                    })()}
                    max="20:00" style={{ ...inp, paddingLeft: "38px" }} />
                </div>
                {errors.time && <p className="err">{errors.time}</p>}
              </div>
            </div>

            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "11px", color: TXT_SOFT, marginTop: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
              <Sparkles size={11} style={{ color: GOLD }} /> Open Mon to Sat · 8:30 AM to 8:00 PM · Closed Sundays
            </p>

            {/* Slot availability feedback */}
            {slotStatus === "checking" && (
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: TXT_MID, fontFamily: "'Montserrat',sans-serif" }}>
                <span style={{ width: 12, height: 12, border: `2px solid ${GOLD}`, borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
                Checking availability…
              </div>
            )}

            {slotStatus === "available" && (
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, fontFamily: "'Montserrat',sans-serif" }}>
                <span style={{ fontSize: 14 }}>✅</span>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#15803D", margin: 0 }}>This time slot is available</p>
              </div>
            )}

            {slotStatus === "full" && !waitlistJoined && (
              <div style={{ marginTop: 12, background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12, padding: "16px", fontFamily: "'Montserrat',sans-serif" }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#92400E", margin: "0 0 6px" }}>😔 All stylists are booked at this time</p>
                <p style={{ fontSize: 12, color: "#B45309", margin: "0 0 14px", lineHeight: 1.6 }}>
                  You can still try to book — or join the waitlist and we'll SMS you the moment a slot opens up. You'll have 10 minutes to claim it.
                </p>
                <button
                  type="button"
                  disabled={joiningWaitlist}
                  onClick={async () => {
                    if (!name.trim() || !phone.trim()) {
                      toast.error("Please fill in your name and phone number first");
                      document.getElementById("booking-form-top")?.scrollIntoView({ behavior: "smooth" });
                      return;
                    }
                    setJoiningWaitlist(true);
                    try {
                      const { error } = await (supabase as any).from("waitlist").insert({
                        client_name: name.trim(),
                        client_phone: phone.trim(),
                        client_email: email.trim() || null,
                        service_id: serviceId || null,
                        service_name: selectedService?.name || null,
                        preferred_date: preferredDate,
                        preferred_time: preferredTime || null,
                        staff_id: null,
                        status: "active",
                      });
                      if (error) throw error;
                      setWaitlistJoined(true);
                      // SMS client confirming waitlist
                      if (phone.trim()) {
                        sendSMS(phone.trim(), [
                          `Hi ${name.split(" ")[0]}! You're on the Zolara waitlist. 🌸`,
                          ``,
                          `💆 Service: ${selectedService?.name || "Your requested service"}`,
                          `📅 Date: ${preferredDate}`,
                          `🕐 Time: ${preferredTime}`,
                          ``,
                          `We'll SMS you immediately when a slot opens up.`,
                          `You'll have 10 minutes to confirm your booking.`,
                          ``,
                          `Zolara Beauty Studio 💛`,
                          `0594365314 / 0208848707`,
                        ].join("\n")).catch(console.error);
                      }
                      toast.success("You're on the waitlist! We'll SMS you when a slot opens.");
                    } catch (e: any) {
                      toast.error("Failed to join waitlist. Please try again or call us directly.");
                      console.error(e);
                    } finally {
                      setJoiningWaitlist(false);
                    }
                  }}
                  style={{ padding: "10px 24px", borderRadius: 10, background: joiningWaitlist ? "#FDE68A" : "#D97706", color: "white", border: "none", fontSize: 12, fontWeight: 700, cursor: joiningWaitlist ? "not-allowed" : "pointer", fontFamily: "'Montserrat',sans-serif" }}>
                  {joiningWaitlist ? "Joining…" : "Join Waitlist"}
                </button>
                <p style={{ fontSize: 11, color: "#B45309", margin: "10px 0 0" }}>Or pick a different date or time above.</p>
              </div>
            )}

            {waitlistJoined && (
              <div style={{ marginTop: 12, background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: "14px 16px", fontFamily: "'Montserrat',sans-serif" }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#15803D", margin: "0 0 4px" }}>✅ You're on the waitlist!</p>
                <p style={{ fontSize: 12, color: "#16A34A", margin: 0 }}>We'll SMS you at {phone} the moment a slot opens up.</p>
              </div>
            )}
          </div>

          {/* Promo Code */}
          {selectedService && (
            <div style={{ background: WHITE, borderRadius: "12px", padding: mob ? "16px" : "24px 28px", marginBottom: "16px", boxShadow: "0 2px 16px rgba(28,22,14,0.05)", border: `1px solid ${BORDER}` }}>
              <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: GOLD_DARK, marginBottom: "12px" }}>PROMO CODE</p>
              {appliedPromo ? (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: "10px 14px" }}>
                  <div>
                    <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 13, fontWeight: 700, color: "#15803D", margin: 0 }}>✓ {appliedPromo.code}</p>
                    <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 11, color: "#16A34A", margin: "2px 0 0" }}>GHS {promoDiscount.toFixed(2)} off</p>
                  </div>
                  <button type="button" onClick={() => { setAppliedPromo(null); setPromoCode(""); setPromoError(""); }}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#DC2626", fontWeight: 600, fontFamily: "'Montserrat',sans-serif" }}>Remove</button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={promoCode} onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoError(""); }}
                    placeholder="Enter promo code" style={{ ...inp, flex: 1 }} />
                  <button type="button" onClick={handleApplyPromo} disabled={promoLoading || !promoCode.trim()}
                    style={{ padding: "10px 18px", borderRadius: 10, background: promoLoading || !promoCode.trim() ? "#E8E0D4" : `linear-gradient(135deg,${GOLD_DARK},${GOLD})`, color: promoLoading || !promoCode.trim() ? "#A8A29E" : "white", border: "none", fontSize: 12, fontWeight: 700, cursor: promoLoading ? "not-allowed" : "pointer", fontFamily: "'Montserrat',sans-serif", whiteSpace: "nowrap" }}>
                    {promoLoading ? "…" : "Apply"}
                  </button>
                </div>
              )}
              {promoError && <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 11, color: "#DC2626", marginTop: 6 }}>{promoError}</p>}
            </div>
          )}

          {/* Special Requests */}
          <div style={{ background: WHITE, borderRadius: "12px", padding: mob ? "20px 16px" : "32px", marginBottom: "16px", boxShadow: "0 2px 16px rgba(28,22,14,0.05)", border: `1px solid ${BORDER}` }}>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: GOLD_DARK, marginBottom: mob ? "16px" : "24px" }}>SPECIAL REQUESTS</p>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Style references, allergies, or anything we should know..." rows={3} style={{ ...inp, resize: "vertical" }} />
          </div>


                    {/* Balance payment method */}
          <div style={{ background: WHITE, borderRadius: "12px", padding: mob ? "20px 16px" : "32px", marginBottom: "16px", boxShadow: "0 2px 16px rgba(28,22,14,0.05)", border: `1px solid ${BORDER}` }}>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: GOLD_DARK, marginBottom: "6px" }}>BALANCE PAYMENT METHOD</p>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "12px", color: TXT_SOFT, marginBottom: "20px" }}>How will you pay the remaining balance when you arrive?</p>
            <div style={{ display: "grid", gridTemplateColumns: sm ? "repeat(2,1fr)" : "repeat(3,1fr)", gap: "10px" }}>
              {enabledPayments.map((m: any) => {
                const sel = paymentPref === m.id;
                return (
                  <button key={m.id} className="pay-btn" onClick={() => setPaymentPref(m.id)}
                    style={{ padding: "16px 10px", border: `2px solid ${sel ? GOLD : BORDER}`, borderRadius: "10px", background: sel ? "rgba(200,169,126,0.1)" : WHITE, cursor: "pointer", textAlign: "center", transition: "all 0.15s", fontFamily: "'Montserrat',sans-serif" }}>
                    <div style={{ fontSize: "22px", marginBottom: "8px" }}>{PAYMENT_ICONS[m.id] || "💰"}</div>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: sel ? GOLD_DARK : TXT_MID, letterSpacing: "0.05em" }}>{PAYMENT_LABELS[m.id] || m.name}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary + CTA */}
          <div style={{ background: "linear-gradient(155deg, #241C0E 0%, #1A1208 100%)", borderRadius: "12px", padding: mob ? "20px 16px" : "32px", boxShadow: "0 12px 40px rgba(28,22,14,0.22)" }}>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: "rgba(200,169,126,0.75)", marginBottom: "20px" }}>BOOKING SUMMARY</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
              {[
                { label: "Name", value: name || "..." },
                { label: "Phone", value: phone || "..." },
                { label: "Service", value: selectedServices.length > 0 ? selectedServices.map(s => s.name).join(", ") + (selectedVariant ? ` · ${selectedVariant.name}` : "") : "Not selected" },
                { label: "Date", value: preferredDate || "..." },
                { label: "Time", value: preferredTime || "..." },
              ].map(row => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "10px" }}>
                  <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>{row.label}</span>
                  <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "13px", fontWeight: 600, color: "#F5EFE6" }}>{row.value}</span>
                </div>
              ))}
              {selectedServices.flatMap(s => {
                const selAdd = svcAddonsSel[s.id] || [];
                return (svcAddonsMap[s.id] || []).filter((a: any) => selAdd.includes(a.id));
              }).map(a => (
                <div key={a.id} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "10px" }}>
                  <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em" }}>+ {a.name}</span>
                  <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "13px", fontWeight: 600, color: "#C4B5FD" }}>+GHS {a.price_min && a.price_max ? `${Number(a.price_min).toLocaleString()} – ${Number(a.price_max).toLocaleString()}` : Number(a.price).toLocaleString()}</span>
                </div>
              ))}
              {promoDiscount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "10px" }}>
                  <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Discount</span>
                  <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "13px", fontWeight: 600, color: GREEN }}>- GHS {promoDiscount.toFixed(0)} ({appliedPromo?.code})</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "6px" }}>
                <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "13px", fontWeight: 700, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Service Total</span>
                <span style={{ fontSize: "30px", fontWeight: 700, color: GOLD }}>{selectedService ? `GHS ${total.toLocaleString()}` : "..."}</span>
              </div>
            </div>

            <div style={{ background: "rgba(200,169,126,0.1)", border: "1px solid rgba(200,169,126,0.22)", borderRadius: "8px", padding: "16px 18px", marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "12px", color: "rgba(245,239,230,0.65)", fontWeight: 500 }}>Pay now (Paystack deposit)</span>
                <span style={{ fontSize: "22px", fontWeight: 700, color: GOLD }}>GHS 50</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "12px", color: "rgba(245,239,230,0.65)", fontWeight: 500 }}>Balance at studio</span>
                <span style={{ fontSize: "22px", fontWeight: 700, color: "rgba(245,239,230,0.65)" }}>{selectedService ? `GHS ${Math.max(0, total - 50).toLocaleString()}` : "..."}</span>
              </div>
            </div>

            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "11px", color: "rgba(245,239,230,0.3)", textAlign: "center", marginBottom: "20px", lineHeight: 1.75 }}>
              By booking, you agree to our cancellation and lateness policies.
            </p>

            <button onClick={handlePayDeposit}
              style={{ width: "100%", padding: "20px", borderRadius: "10px", background: `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD})`, border: "none", color: WHITE, fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", fontFamily: "'Montserrat',sans-serif", boxShadow: "0 10px 36px rgba(139,105,20,0.42)", transition: "all 0.3s ease" }}>
              {`PAY GHS ${depositAmount} DEPOSIT TO BOOK`}
            </button>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "11px", color: "rgba(245,239,230,0.28)", textAlign: "center", marginTop: "12px" }}>
              Secured by Paystack. Card, MoMo, and Bank Transfer accepted.
            </p>
          </div>
        </div>
      </div>
      <AmandaWidget />
    </div>
  );
}
