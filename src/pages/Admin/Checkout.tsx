import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { supabaseAdmin } from "@/integrations/supabase/adminClient";
import { validatePromoCode, incrementPromoUsage } from "@/lib/promoCodes";
import { GIFT_CARD_TIERS } from "@/lib/giftCardEcommerce";
import { findOrCreateClient } from "@/lib/clientDedup";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useSettings } from "@/context/SettingsContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Calendar, Clock, User, Sparkles, CreditCard, Banknote, Smartphone, Building, CheckCircle2, ArrowLeft, Receipt, UserCheck, Search } from "lucide-react";
import { format } from "date-fns";
import { sendSMS, SMS } from "@/lib/sms";
import LineItemsPanel from "@/components/checkout/LineItemsPanel";

type PaymentMethod = "cash" | "mobile_money" | "card" | "bank_transfer" | "gift_card";

interface BookingData {
  id: string; preferred_date: string; preferred_time: string; status: string;
  notes: string | null; client_name: string | null; service_name: string | null;
  client_phone: string | null; service_id: string | null;
  clients: { id: string; name: string; email: string | null; phone: string | null; loyalty_points: number };
  services: { id: string; name: string; price: number; category: string };
  staff: { id: string; name: string; specialization: string | null } | null;
}

interface StaffMember { id: string; name: string; specialties: string[] | null }
interface LineItem { type: "service" | "product" | "subscription"; id: string; name: string; quantity: number; unitPrice: number; coveredBySubscription: boolean }

const Checkout = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const bookingId = searchParams.get("booking");
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [absentStaffIds, setAbsentStaffIds] = useState<Set<string>>(new Set());
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [notes, setNotes] = useState("");
  const [completed, setCompleted] = useState(false);
  const [pending, setPending] = useState(false);
  const [depositPaid, setDepositPaid] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [originalPrice, setOriginalPrice] = useState<number>(0);
  const [giftCode, setGiftCode] = useState<string>("");
  const [redeeming, setRedeeming] = useState<boolean>(false);
  const [redeemedCard, setRedeemedCard] = useState<{ id: string; value: number } | null>(null);
  const [finalAmountCharged, setFinalAmountCharged] = useState<number>(0);
  const [promoCode, setPromoCode] = useState<string>("");
  const [bookingUsedPromo, setBookingUsedPromo] = useState<string | null>(null); // promo used at booking time
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<any | null>(null);
  const [promoDiscount, setPromoDiscount] = useState<number>(0);
  const [usePaystackForTransfer, setUsePaystackForTransfer] = useState(true);
  const [paymentInfo, setPaymentInfo] = useState({ id: null, bank_name: "", account_name: "", account_number: "" });
  const [userRole, setUserRole] = useState(null);

  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [clientSubscription, setClientSubscription] = useState<any>(null);
  const [productSearch, setProductSearch] = useState("");

  const G = "#C8A97E", G_D = "#8B6914", CREAM = "#FAFAF8", WHITE = "#FFFFFF";
  const BORDER = "#EDEBE5", TXT = "#1C160E", TXT_MID = "#78716C", TXT_SOFT = "#A8A29E";
  const SHADOW = "0 1px 3px rgba(0,0,0,0.04),0 4px 16px rgba(0,0,0,0.06)";
  const inp: React.CSSProperties = { border: `1.5px solid ${BORDER}`, borderRadius: "10px", padding: "9px 12px", fontSize: "13px", color: TXT, outline: "none", background: WHITE, fontFamily: "Montserrat,sans-serif", width: "100%" };
  const lbl: React.CSSProperties = { fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: TXT_SOFT, textTransform: "uppercase", display: "block", marginBottom: "6px" };
  const card: React.CSSProperties = { background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "16px", overflow: "hidden", boxShadow: SHADOW };
  const cardHdr: React.CSSProperties = { background: `linear-gradient(135deg,rgba(200,169,126,0.1),rgba(200,169,126,0.04))`, padding: "16px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: "10px" };

  const sc = (s: string) => { if (s === "confirmed") return { bg: "#F0FDF4", color: "#16A34A", border: "#BBF7D0" }; if (s === "pending") return { bg: "#EFF6FF", color: "#2563EB", border: "#BFDBFE" }; return { bg: "#FFFBEB", color: "#D97706", border: "#FDE68A" }; };

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap";
    document.head.appendChild(link);
    const style = document.createElement("style");
    style.textContent = "@keyframes spin{to{transform:rotate(360deg)}}";
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    if (bookingId) { setBookingLoading(true); setBooking(null); fetchBookingDetails(); fetchStaff(); fetchProducts(); }
  }, [bookingId]);

  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
      setUserRole(roleData?.role || user.user_metadata.role);
      // Do NOT set loading(false) here — loading is controlled by bookingId effect only
    };
    fetchUserRole();
  }, []);

  useEffect(() => {
    if (!pending || !booking?.id) return;
    let cancelled = false;
    const iv = setInterval(async () => {
      try {
        const { data: payments } = await supabase.from("sales").select("*").eq("booking_id", booking.id).eq("status", "completed").limit(1);
        if (payments && payments.length > 0 && !cancelled) {
          setPending(false); setCompleted(true);
          setPaymentMethod((payments[0].payment_method as PaymentMethod) || paymentMethod);
          clearInterval(iv);
        }
      } catch {}
    }, 5000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [pending, booking]);

  const fetchProducts = async () => {
    const { data } = await (supabase as any).from("products").select("id,name,price,stock_quantity").eq("is_active", true).gt("stock_quantity", 0).order("name");
    setProducts(data || []);
  };

  const fetchClientSubscription = async (clientId: string) => {
    const { data } = await (supabase as any).from("client_subscriptions").select("*, subscription_plans(name,price,included_services,max_usage_per_cycle)").eq("client_id", clientId).eq("status", "active").maybeSingle();
    setClientSubscription(data || null);
  };

  const fetchBookingDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, clients:client_id(*), services:service_id(*), staff:staff_id(*)")
        .eq("id", bookingId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) { toast.error("Booking not found"); return; }
      setBooking(data as any);
      if ((data as any).staff?.id) setSelectedStaff((data as any).staff.id);
      if ((data as any).clients?.id) fetchClientSubscription((data as any).clients.id);
      // Detect if a promo code was already used at booking time
      const bookingNotes: string = (data as any).notes || "";
      const promoMatch = bookingNotes.match(/Promo code applied:\s*([A-Z0-9]+)/i);
      if (promoMatch) setBookingUsedPromo(promoMatch[1].toUpperCase());

      // booking.price is set at booking time with the correct total (variant price or service base + addons)
      // Always trust booking.price — it is the source of truth
      const bookingStoredPrice = Number((data as any).price ?? 0);
      // Fallback: if booking.price is 0 (old bookings), fetch from services table
      let price = bookingStoredPrice;
      if (price === 0) {
        const serviceId = (data as any).service_id;
        if (serviceId) {
          const { data: svcData } = await supabase.from("services").select("price").eq("id", serviceId).single();
          price = Number((svcData as any)?.price ?? 0);
        }
      }
      setOriginalPrice(price);
      // Set service line item immediately with the correct price
      setLineItems([{
        type: "service",
        id: (data as any).service_id || (data as any).id,
        name: (data as any).service_name || "Service",
        quantity: 1,
        unitPrice: price,
        coveredBySubscription: false,
      }]);

      // Check if deposit was already paid and auto-verify via edge function
      let depositAlreadyPaid = !!(data as any).deposit_paid;
      if (!depositAlreadyPaid && (data as any).booking_ref) {
        try {
          const res = await fetch(
            import.meta.env.VITE_SUPABASE_URL + "/functions/v1/verify-deposit",
            { method: "POST", headers: { "Content-Type": "application/json", "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY },
              body: JSON.stringify({ booking_id: bookingId }) }
          );
          const vd = await res.json();
          if (vd.status === "verified" || vd.status === "already_paid") depositAlreadyPaid = true;
        } catch { /* ignore */ }
      }

      const depositAmt = depositAlreadyPaid ? (Number((data as any).deposit_amount) || 50) : 0;
      setDepositPaid(!!depositAlreadyPaid);
      setAmount(String(Math.max(0, price - depositAmt).toFixed(2)));
    } catch (err) {
      console.error("Booking load error:", err);
      toast.error("Failed to load booking details");
    } finally {
      setBookingLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from("staff")
        .select("id, name, specialties, role")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      // Only operational staff — exclude cleaners and receptionists
      const operational = (data || []).filter((s: any) => !["cleaner","receptionist"].includes(s.role || ""));
      setStaff(operational);
      const today = new Date().toISOString().slice(0, 10);
      const { data: attData } = await supabase
        .from("attendance").select("staff_id,status").eq("date", today);
      setAbsentStaffIds(new Set(
        (attData || []).filter((a: any) => a.status === "absent").map((a: any) => a.staff_id)
      ));
    } catch (e) { console.error("fetchStaff error:", e); }
  };

  // lineItems is set directly in fetchBookingDetails after price is computed
  // so no useEffect needed here

  useEffect(() => { if (!paymentMethod) setPaymentMethod("cash"); }, []);

  useEffect(() => {
    const fetchPaymentInfo = async () => {
      const { data } = await (supabase as any).from("payment_settings").select("*").single();
      if (data) setPaymentInfo({ id: data.id, bank_name: data.bank_name, account_name: data.account_name, account_number: data.account_number });
    };
    fetchPaymentInfo();
  }, []);

  const { settings } = useSettings();
  const depositAmount = Number((settings as any)?.deposit_amount ?? 50);

  const lineItemsTotal = lineItems.reduce((sum, item) => sum + (item.coveredBySubscription ? 0 : item.unitPrice * item.quantity), 0);

  const addProduct = (product: any) => {
    setLineItems(prev => {
      const ex = prev.find(i => i.type === "product" && i.id === product.id);
      if (ex) return prev.map(i => i.id === product.id && i.type === "product" ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { type: "product", id: product.id, name: product.name, quantity: 1, unitPrice: Number(product.price), coveredBySubscription: false }];
    });
    setProductSearch("");
  };

  const removeLineItem = (idx: number) => setLineItems(prev => prev.filter((_, i) => i !== idx));
  const updateQty = (idx: number, qty: number) => { if (qty < 1) { removeLineItem(idx); return; } setLineItems(prev => prev.map((item, i) => i === idx ? { ...item, quantity: qty } : item)); };
  const canToggleSub = userRole === "owner" || userRole === "admin";

  // ── Booking picker state (always at top level — never inside conditionals) ──
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerBookings, setPickerBookings] = useState<any[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  useEffect(() => {
    if (bookingId) return;
    const load = async () => {
      setPickerLoading(true);
      let q = (supabase as any).from("bookings")
        .select("id,client_name,client_phone,service_name,preferred_date,preferred_time,status,deposit_paid,booking_ref,price")
        .in("status", ["confirmed","pending","in_progress"])
        .order("preferred_date", { ascending: true }).limit(30);
      if (pickerSearch.trim()) q = q.or(`client_name.ilike.%${pickerSearch}%,booking_ref.ilike.%${pickerSearch}%,service_name.ilike.%${pickerSearch}%`);
      const { data } = await q;
      setPickerBookings(data || []);
      setPickerLoading(false);
    };
    const t = setTimeout(load, pickerSearch ? 300 : 0);
    return () => clearTimeout(t);
  }, [bookingId, pickerSearch]);
  const toggleSub = (idx: number) => {
    if (!canToggleSub) { toast.error("Only the owner or admin can mark items as included."); return; }
    setLineItems(prev => prev.map((item, i) => i === idx ? { ...item, coveredBySubscription: !item.coveredBySubscription } : item));
  };

  const handleRedeemGiftCard = async () => {
    if (!booking) return;
    if (!giftCode || !giftCode.trim()) { toast.error("Enter a gift card code"); return; }
    if (!selectedStaff) { toast.error("Assign a staff member before redeeming"); return; }
    setRedeeming(true);
    try {
      const code = giftCode.trim().toUpperCase();
      // Use service-role API to bypass RLS on gift_cards table
      const lookupRes = await fetch(`https://vwvrhbyfytmqsywfdhvd.supabase.co/rest/v1/gift_cards?code=eq.${encodeURIComponent(code)}&limit=1&select=*`, {
        headers: {
          "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dnJoYnlmeXRtcXN5d2ZkaHZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1MDUxNCwiZXhwIjoyMDg4NzI2NTE0fQ.eR0ZA3z0V9OQXY5uokEtmnZq1c71EyjLD8mNsquvg54",
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dnJoYnlmeXRtcXN5d2ZkaHZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1MDUxNCwiZXhwIjoyMDg4NzI2NTE0fQ.eR0ZA3z0V9OQXY5uokEtmnZq1c71EyjLD8mNsquvg54",
        }
      });
      const cards = await lookupRes.json();
      const card = Array.isArray(cards) ? cards[0] : null;
      if (!card) { toast.error("Gift card not found. Check the code and try again."); return; }

      // Non-diamond cards can only be used once
      if (card.status === "redeemed") {
        if (card.tier !== "Diamond") {
          toast.error("This gift card has already been redeemed."); return;
        }
        // Diamond: check it still has balance and uses remaining
        if (Number(card.balance || 0) <= 0 || (card.redemption_count || 0) >= 3) {
          toast.error("This Diamond card has no remaining balance or uses."); return;
        }
      }
      if (card.status === "void") { toast.error("This gift card has been voided."); return; }
      if (card.status === "expired" || (card.expires_at && new Date(card.expires_at) < new Date())) { toast.error("This gift card has expired."); return; }
      if (!["active","available","redeemed"].includes(card.status || "")) {
        toast.error("Gift card is not active (status: " + card.status + ")."); return;
      }
      // Block voided or expired cards
      if (card.payment_status === "voided") { toast.error("This gift card has been voided."); return; }
      if (card.payment_status === "expired") { toast.error("This gift card has expired."); return; }
      // Block cards that are pure unsold stock (pending + active with no buyer info = just printed, not sold)
      if (card.payment_status === "pending" && !card.buyer_name && !card.buyer_phone) {
        toast.error("This card has not been sold yet. Mark it as sold at the POS first."); return;
      }
      const value = Number(card.balance || card.amount || 0);
      if (value <= 0) { toast.error("This gift card has no remaining balance."); return; }

      // Apply grace buffer — Silver/Gold/Platinum/Diamond cards can slightly over-cover
      const tierConfig = GIFT_CARD_TIERS[card.tier as keyof typeof GIFT_CARD_TIERS];
      const grace = tierConfig?.grace ?? 0;
      const dep2 = depositPaid ? depositAmount : 0;
      const baseAfterDeposit = Math.max(0, originalPrice - dep2);
      // Card covers up to its balance + grace; but we only deduct actual balance from card
      const coversUpTo = value + grace;
      const applied = coversUpTo >= baseAfterDeposit ? baseAfterDeposit : value;
      setRedeemedCard({ id: card.id, value: applied, tier: card.tier, fullBalance: value, grace } as any);
      toast.success(`Gift card applied — GHS ${applied.toFixed(2)} off`);
    } catch (err: any) {
      console.error("Redeem error:", err);
      toast.error(err.message || "Redeem failed");
    } finally { setRedeeming(false); }
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    // Block if this code was already used at booking time
    if (bookingUsedPromo && promoCode.trim().toUpperCase() === bookingUsedPromo) {
      toast.error(`Promo code ${bookingUsedPromo} was already applied when this booking was made. It cannot be used again.`);
      return;
    }
    setValidatingPromo(true);
    try {
      const dep3 = depositPaid ? depositAmount : 0;
      const base = Math.max(0, originalPrice - dep3 - (redeemedCard?.value ?? 0));
      const result = await validatePromoCode(promoCode.trim(), base);
      if (!result.valid) { toast.error(result.message); return; }
      const promo = result.promo;
      const discount = promo.discount_type === "percentage" ? (base * promo.discount_value) / 100 : Math.min(promo.discount_value, base);
      setAppliedPromo(promo); setPromoDiscount(discount);
      toast.success(`Promo applied: GHS ${discount.toFixed(2)} off`);
    } catch (e: any) { toast.error(e.message || "Failed to validate"); } finally { setValidatingPromo(false); }
  };

  const handleCheckout = async () => {
    if (!booking) return;
    if (!selectedStaff) { toast.error("Please assign a staff member"); return; }
    if (absentStaffIds.has(selectedStaff)) {
      const name = staff.find(s => s.id === selectedStaff)?.name || "This staff member";
      if (!window.confirm(`${name} is marked absent today. Proceed anyway?`)) return;
    }

    const giftValue = redeemedCard?.value ?? 0;
    const dep = depositPaid ? depositAmount : 0;
    const prodTotal = lineItems.filter(i => i.type === "product").reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const effectivePrice = originalPrice + prodTotal;
    const afterDep = Math.max(0, originalPrice - dep) + prodTotal;
    const afterPromo = Math.max(0, afterDep - promoDiscount);
    const amountToCharge = Math.max(0, afterPromo - giftValue);

    const enabled = ["cash", "mobile_money", "card", "bank_transfer", "gift_card"];
    if (amountToCharge > 0 && (!paymentMethod || !enabled.includes(paymentMethod))) {
      toast.error("Please select a payment method"); return;
    }

    setProcessing(true);
    try {
      // Sanitize UUIDs — Supabase rejects empty strings in UUID columns
      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const safeStaff = uuidRe.test(selectedStaff) ? selectedStaff : null;
      const safeClient = uuidRe.test(booking.clients?.id || "") ? booking.clients?.id
        : uuidRe.test((booking as any).client_id || "") ? (booking as any).client_id : null;

      // ── STEP 1: Mark booking completed ─────────────────────────────────────
      const { error: bkErr } = await supabase.from("bookings").update({
        status: "completed",
        staff_id: safeStaff,
        notes: notes || booking.notes,
        price: effectivePrice,
        ...(depositPaid ? { deposit_paid: true, deposit_amount: depositAmount } : {}),
      } as any).eq("id", booking.id);
      if (bkErr) throw new Error("Failed to complete booking: " + bkErr.message);

      // ── STEP 2: Record main service sale ───────────────────────────────────
      const saleNotes = [
        notes || "Payment at checkout",
        dep > 0 ? `Deposit GHS ${dep} included` : null,
        promoDiscount > 0 ? `Promo ${appliedPromo?.code || ""} saved GHS ${promoDiscount}` : null,
        giftValue > 0 ? `Gift card GHS ${giftValue} applied` : null,
      ].filter(Boolean).join(" | ");

      const method = paymentMethod || "cash";
      const { error: saleErr } = await (supabase as any).from("sales").insert({
        booking_id: booking.id,
        amount: amountToCharge,
        payment_method: method,
        status: "completed",
        client_name: booking.client_name || null,
        service_name: booking.service_name || null,
        client_id: safeClient,
        staff_id: safeStaff,
        notes: saleNotes,
        promo_code: appliedPromo?.code || null,
        promo_discount: promoDiscount > 0 ? promoDiscount : null,
        payment_date: new Date().toISOString(),
      });
      if (saleErr) throw new Error("Sale record failed: " + saleErr.message);

      // ── STEP 3: Record deposit as confirmed revenue (only now — checkout complete) ──
      if (dep > 0) {
        const { error: depErr } = await (supabase as any).from("sales").insert({
          booking_id: booking.id,
          amount: dep,
          payment_method: "mobile_money",
          status: "completed",
          client_name: booking.client_name || null,
          service_name: booking.service_name || null,
          client_id: safeClient,
          staff_id: safeStaff,
          notes: "Deposit — confirmed at checkout",
          payment_date: new Date().toISOString(),
        });
        if (depErr) console.error("Deposit sale record failed:", depErr.message);
      }

      // ── STEP 4: Record gift card redemption ────────────────────────────────
      if (redeemedCard && giftValue > 0) {
        const appliedGift = Math.min(giftValue, originalPrice);
        const isDiamond = (redeemedCard as any).tier === "Diamond";
        const currentBalance = Number((redeemedCard as any).fullBalance ?? appliedGift);
        const newBalance = Math.max(0, currentBalance - appliedGift);
        const fullyUsed = !isDiamond || newBalance <= 0;

        // Re-validate card is still redeemable using supabaseAdmin (bypasses RLS)
        const { data: freshCard } = await (supabaseAdmin as any)
          .from("gift_cards").select("*").eq("id", redeemedCard.id).single();

        let cardMarked = false;
        if (!freshCard) {
          console.error("Gift card not found in DB:", redeemedCard.id);
        } else if (!isDiamond && freshCard.status === "redeemed") {
          toast.error("Gift card was already redeemed.");
        } else {
          // Update card directly via supabaseAdmin — no API route needed
          const updatePayload: any = {
            status: fullyUsed ? "redeemed" : "active",
            balance: newBalance,
          };
          // Only set extended columns if they exist in the card row
          if ("redeemed_by_client" in freshCard) updatePayload.redeemed_by_client = booking.client_name || null;
          if ("redeemed_at" in freshCard && fullyUsed) updatePayload.redeemed_at = new Date().toISOString();
          if ("redemption_count" in freshCard) updatePayload.redemption_count = (freshCard.redemption_count || 0) + 1;

          const { error: gcUpdateErr, data: gcUpdated } = await (supabaseAdmin as any)
            .from("gift_cards").update(updatePayload).eq("id", redeemedCard.id).select();

          if (gcUpdateErr) {
            console.error("Gift card update failed:", gcUpdateErr);
            toast.error("Gift card could not be marked redeemed: " + gcUpdateErr.message);
          } else {
            cardMarked = true;
            console.log("✓ Gift card marked:", fullyUsed ? "redeemed" : "active", "balance:", newBalance, gcUpdated);
          }
        }

        // Record gift card sale only if card was successfully updated
        if (cardMarked) {
          const { error: gcErr } = await (supabase as any).from("sales").insert({
            booking_id: booking.id,
            amount: appliedGift,
            payment_method: "gift_card",
            status: "completed",
            client_name: booking.client_name || null,
            service_name: booking.service_name || null,
            client_id: safeClient,
            staff_id: safeStaff,
            notes: "Gift card redemption",
            payment_date: new Date().toISOString(),
          });
          if (gcErr) console.error("Gift card sale record failed:", gcErr.message);
        }
      }

      // ── STEP 5: Record product sales + deduct stock ─────────────────────────
      for (const pi of lineItems.filter(i => i.type === "product")) {
        const prod = products.find(p => p.id === pi.id);
        if (prod) {
          await (supabase as any).from("products").update({
            stock_quantity: Math.max(0, (prod.stock_quantity || 0) - pi.quantity),
          }).eq("id", pi.id);
          await (supabase as any).from("sales").insert({
            booking_id: booking.id,
            amount: pi.unitPrice * pi.quantity,
            payment_method: method,
            status: "completed",
            client_name: booking.client_name || null,
            service_name: pi.name + (pi.quantity > 1 ? " x" + pi.quantity : ""),
            client_id: safeClient,
            staff_id: safeStaff,
            notes: "Product sale at checkout",
            payment_date: new Date().toISOString(),
          });
        }
      }

      // ── STEP 6: Checkout session + line items ───────────────────────────────
      try {
        const { data: sess } = await (supabase as any).from("checkout_sessions")
          .insert([{ client_id: safeClient, staff_id: safeStaff, booking_id: booking.id, total_amount: effectivePrice, payment_method: method, status: "completed" }])
          .select("id").single();
        if (sess?.id && lineItems.length > 0) {
          await (supabase as any).from("checkout_items").insert(lineItems.map(item => ({
            checkout_session_id: sess.id,
            booking_id: booking.id,
            item_type: item.type,
            item_id: uuidRe.test(item.id) ? item.id : null,
            name: item.name,
            quantity: item.quantity,
            price_at_time: item.unitPrice,
            subtotal: item.coveredBySubscription ? 0 : item.unitPrice * item.quantity,
          })));
        }
      } catch (sessErr) { console.error("Checkout session error:", sessErr); }

      // ── STEP 7: Find/create client + loyalty points ─────────────────────────
      try {
        const clientPhone = (booking as any).client_phone || booking.clients?.phone;
        const clientName = (booking as any).client_name || booking.clients?.name || "Guest";
        const clientEmail = (booking as any).client_email || booking.clients?.email || null;
        let clientId = safeClient;
        const resolvedId = await findOrCreateClient({ name: clientName, phone: clientPhone, email: clientEmail });
        if (resolvedId) {
          clientId = resolvedId;
          await supabase.from("bookings").update({ client_id: clientId } as any).eq("id", booking.id);
        }
        if (clientId) {
          const spendable = amountToCharge + dep;
          const spendableActual = spendable > 0 ? spendable : effectivePrice;
          const { data: before } = await (supabase as any).from("clients").select("loyalty_points").eq("id", clientId).single();
          const prevPts = Number(before?.loyalty_points || 0);
          try {
            await (supabase as any).rpc("update_client_after_checkout", { p_client_id: clientId, p_amount_spent: spendableActual });
          } catch {
            const earnRate = Number((settings as any)?.loyalty_stamp_per_ghs ?? 100);
            const pts = Math.floor(spendableActual / earnRate);
            if (pts > 0) await (supabase as any).from("clients").update({ loyalty_points: prevPts + pts }).eq("id", clientId);
          }
          const { data: after } = await (supabase as any).from("clients").select("loyalty_points").eq("id", clientId).single();
          const finalPts = Number(after?.loyalty_points || 0);
          if (clientPhone) {
            const earned = Math.max(0, finalPts - prevPts);
            await sendSMS(clientPhone, SMS.checkoutComplete(clientName, booking.service_name || "service", amountToCharge.toFixed(0), earned, finalPts, booking.booking_ref || booking.id.slice(0, 8).toUpperCase())).catch(console.error);
            const stampsForReward = Number((settings as any)?.loyalty_stamps_for_reward ?? 20);
            if (Math.floor(finalPts / stampsForReward) > Math.floor(prevPts / stampsForReward) && finalPts >= stampsForReward) {
              setTimeout(() => sendSMS(clientPhone, SMS.loyaltyReward(clientName, finalPts)).catch(console.error), 3000);
            }
            setTimeout(() => sendSMS(clientPhone, SMS.feedbackRequest(clientName, booking.service_name || "service")).catch(console.error), 8000);
          }
        }
      } catch (loyErr) { console.error("Loyalty error:", loyErr); }

      // ── STEP 8: Promo usage ─────────────────────────────────────────────────
      if (appliedPromo?.id) incrementPromoUsage(appliedPromo.id).catch(console.error);

      // ── STEP 9: Subscription usage ──────────────────────────────────────────
      if (clientSubscription) {
        for (const ci of lineItems.filter(i => i.coveredBySubscription)) {
          await (supabase as any).from("subscription_usage").insert({
            client_subscription_id: clientSubscription.id,
            client_id: safeClient,
            service_id: uuidRe.test(ci.id) ? ci.id : null,
            booking_id: booking.id,
          }).catch(console.error);
        }
      }

      setFinalAmountCharged(amountToCharge);
      setCompleted(true);
      toast.success("Checkout completed!");
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error(error.message || "Failed to complete checkout");
    } finally { setProcessing(false); }
  };

  // No booking selected → show picker
  if (!bookingId) {
    const G = "#C8A97E", G_D = "#8B6914", CREAM = "#FAFAF8", WHITE = "#FFFFFF", BORDER = "#EDEBE5", TXT = "#1C160E", TXT_MID = "#78716C", TXT_SOFT = "#A8A29E";
    const STATUS_COLORS: Record<string, {bg:string;color:string}> = {
      pending:    { bg:"#FEF9C3", color:"#A16207" },
      confirmed:  { bg:"#DCFCE7", color:"#15803D" },
      in_progress:{ bg:"#DBEAFE", color:"#1D4ED8" },
    };
    return (
      <div style={{ background:CREAM, fontFamily:"Montserrat,sans-serif", color:TXT, padding:"clamp(16px,3vw,32px)" }}>
        <style>{`.pk-row{cursor:pointer;transition:background 0.12s;border-bottom:1px solid ${BORDER};}.pk-row:hover{background:#F5EFE6;}`}</style>

        {/* Header */}
        <div style={{ marginBottom:24 }}>
          <div>
            <p style={{ fontSize:10, fontWeight:700, letterSpacing:"0.18em", color:G, textTransform:"uppercase", margin:"0 0 2px" }}>Zolara</p>
            <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:28, fontWeight:700, color:TXT, margin:0 }}>Checkout</h1>
            <p style={{ fontSize:12, color:TXT_SOFT, margin:"2px 0 0" }}>Select a booking to begin</p>
          </div>
        </div>

        <div style={{ maxWidth:720, margin:"32px auto", padding:"0 24px" }}>
          {/* Search */}
          <div style={{ position:"relative", marginBottom:20 }}>
            <Search style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", width:14, height:14, color:TXT_SOFT }} />
            <input value={pickerSearch} onChange={e => setPickerSearch(e.target.value)}
              placeholder="Search by client name, booking ref or service…"
              style={{ width:"100%", padding:"12px 14px 12px 38px", border:`1.5px solid ${BORDER}`, borderRadius:12, fontSize:14, color:TXT, outline:"none", background:WHITE, fontFamily:"Montserrat,sans-serif", boxSizing:"border-box" as any, boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }} />
          </div>

          {/* Bookings list */}
          <div style={{ background:WHITE, border:`1px solid ${BORDER}`, borderRadius:16, overflow:"hidden", boxShadow:"0 1px 3px rgba(0,0,0,0.04),0 4px 20px rgba(0,0,0,0.06)" }}>
            <div style={{ padding:"12px 20px", borderBottom:`1px solid ${BORDER}`, background:"linear-gradient(135deg,rgba(200,169,126,0.08),rgba(200,169,126,0.02))" }}>
              <p style={{ fontSize:10, fontWeight:700, letterSpacing:"0.14em", color:G_D, textTransform:"uppercase", margin:0 }}>Upcoming & Active Bookings</p>
            </div>
            {pickerLoading ? (
              <div style={{ padding:40, textAlign:"center", color:TXT_SOFT, fontSize:13 }}>Loading…</div>
            ) : pickerBookings.length === 0 ? (
              <div style={{ padding:48, textAlign:"center" }}>
                <Receipt style={{ width:32, height:32, color:TXT_SOFT, margin:"0 auto 12px", display:"block" }} />
                <p style={{ fontSize:14, fontWeight:600, color:TXT_MID, margin:0 }}>No bookings found</p>
                <p style={{ fontSize:12, color:TXT_SOFT, margin:"4px 0 0" }}>Confirmed and pending bookings will appear here</p>
              </div>
            ) : pickerBookings.map(b => {
              const ss = STATUS_COLORS[b.status] || STATUS_COLORS.pending;
              let dateLabel = b.preferred_date;
              try {
                const d = new Date(b.preferred_date + "T00:00:00");
                const today = new Date(); today.setHours(0,0,0,0);
                const tom = new Date(today); tom.setDate(tom.getDate()+1);
                if (d.getTime() === today.getTime()) dateLabel = "Today";
                else if (d.getTime() === tom.getTime()) dateLabel = "Tomorrow";
                else dateLabel = d.toLocaleDateString("en-GB",{day:"numeric",month:"short"});
              } catch {}
              return (
                <div key={b.id} className="pk-row"
                  onClick={() => setSearchParams({ booking: b.id })}
                  style={{ padding:"16px 20px", display:"flex", alignItems:"center", gap:16 }}>
                  {/* Date badge */}
                  <div style={{ width:52, height:52, borderRadius:12, background:`${G}18`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <p style={{ fontSize:11, fontWeight:700, color:G_D, margin:0, lineHeight:1 }}>{dateLabel}</p>
                    <p style={{ fontSize:10, color:TXT_SOFT, margin:"2px 0 0" }}>{b.preferred_time?.slice(0,5) || "—"}</p>
                  </div>
                  {/* Info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                      <p style={{ fontSize:14, fontWeight:700, color:TXT, margin:0 }}>{b.client_name || "Client"}</p>
                      <span style={{ padding:"2px 10px", borderRadius:20, fontSize:9, fontWeight:700, background:ss.bg, color:ss.color }}>{b.status?.toUpperCase()}</span>
                      {b.deposit_paid && <span style={{ fontSize:9, fontWeight:700, color:"#15803D" }}>✓ DEPOSIT</span>}
                    </div>
                    <p style={{ fontSize:12, color:TXT_MID, margin:"3px 0 0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{b.service_name || "Service"}</p>
                    <p style={{ fontSize:10, color:TXT_SOFT, margin:"1px 0 0" }}>Ref: {b.booking_ref || b.id?.slice(0,8)}</p>
                  </div>
                  {/* Price */}
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, fontWeight:700, color:G_D, margin:0 }}>GHS {Number(b.price || 0).toLocaleString()}</p>
                    <p style={{ fontSize:10, color:TXT_SOFT, margin:"2px 0 0" }}>→ Select</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // bookingId set but booking not loaded yet → spinner
  if (bookingId && !booking) {
    return (
      <div style={{ padding: "80px 24px", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Montserrat,sans-serif" }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: "40px", height: "40px", border: "3px solid #F0E4CC", borderTopColor: "#C8A97E", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
          <p style={{ fontSize: "13px", color: "#78716C", fontWeight: 500 }}>Loading booking...</p>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAFAF8", fontFamily: "Montserrat,sans-serif", padding: "24px" }}>
        <div style={{ background: "#FFFFFF", border: "1px solid #EDEBE5", borderRadius: "20px", overflow: "hidden", maxWidth: "520px", width: "100%" }}>
          <div style={{ background: "linear-gradient(135deg,#C8A97E,#8B6914)", padding: "40px 32px", textAlign: "center", color: "#FFFFFF" }}>
            <CheckCircle2 style={{ width: "48px", height: "48px", margin: "0 auto 16px" }} />
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "32px", fontWeight: 700, margin: "0 0 8px" }}>Checkout Complete</h2>
            <p style={{ fontSize: "13px", opacity: 0.85, margin: 0 }}>Service marked as completed</p>
          </div>
          <div style={{ padding: "28px 32px" }}>
            {[
              { l: "Client", v: booking.client_name },
              { l: "Staff", v: staff.find(s => s.id === selectedStaff)?.name || "Assigned" },
              { l: "Payment", v: paymentMethod === "mobile_money" ? "Mobile Money" : paymentMethod === "bank_transfer" ? "Bank Transfer" : (paymentMethod || "").charAt(0).toUpperCase() + (paymentMethod || "").slice(1) },
            ].map(row => (
              <div key={row.l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #EDEBE5" }}>
                <span style={{ fontSize: "12px", color: "#78716C" }}>{row.l}</span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#1C160E" }}>{row.v}</span>
              </div>
            ))}
            {lineItems.map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #EDEBE5" }}>
                <span style={{ fontSize: "12px", color: "#78716C" }}>{item.type === "service" ? "Service" : item.type === "product" ? "Product" : "Plan"}: {item.name}{item.quantity > 1 ? (" x" + item.quantity) : ""}</span>
                <span style={{ fontSize: "12px", fontWeight: 600, color: item.coveredBySubscription ? "#16A34A" : "#1C160E" }}>{item.coveredBySubscription ? "Included" : ("GHS " + (item.unitPrice * item.quantity).toFixed(2))}</span>
              </div>
            ))}
            {depositPaid && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #EDEBE5" }}>
                <span style={{ fontSize: "12px", color: "#16A34A" }}>Deposit Paid</span>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#16A34A" }}>- GHS {depositAmount.toFixed(2)}</span>
              </div>
            )}
            {promoDiscount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #EDEBE5" }}>
                <span style={{ fontSize: "12px", color: "#16A34A" }}>Promo Savings {appliedPromo ? ("(" + appliedPromo.code + ")") : ""}</span>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#16A34A" }}>- GHS {promoDiscount.toFixed(2)}</span>
              </div>
            )}
            {redeemedCard && redeemedCard.value > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #EDEBE5" }}>
                <span style={{ fontSize: "12px", color: "#16A34A" }}>Gift Card Applied</span>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#16A34A" }}>- GHS {redeemedCard.value.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0" }}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#1C160E" }}>Total Paid</span>
              <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "24px", fontWeight: 700, color: "#8B6914" }}>GHS {finalAmountCharged.toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => navigate(-1)} style={{ flex: 1, padding: "11px", borderRadius: "12px", background: "#FAFAF8", color: "#78716C", border: "1px solid #EDEBE5", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>Back</button>
              <button onClick={() => { setCompleted(false); navigate(userRole === "owner" || userRole === "admin" ? "/app/admin/bookings" : "/app/receptionist/bookings"); }} style={{ flex: 1, padding: "11px", borderRadius: "12px", background: "linear-gradient(135deg,#C8A97E,#8B6914)", color: "#FFFFFF", border: "none", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>Done</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (pending) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAFAF8", fontFamily: "Montserrat,sans-serif", padding: "24px" }}>
        <div style={{ background: "#FFFFFF", border: "1px solid #EDEBE5", borderRadius: "20px", overflow: "hidden", maxWidth: "480px", width: "100%" }}>
          <div style={{ background: "linear-gradient(135deg,#D97706,#92400E)", padding: "40px 32px", textAlign: "center", color: "#FFFFFF" }}>
            <CheckCircle2 style={{ width: "48px", height: "48px", margin: "0 auto 16px" }} />
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "28px", fontWeight: 700, margin: "0 0 8px" }}>Payment Pending</h2>
            <p style={{ fontSize: "13px", opacity: 0.85, margin: 0 }}>Waiting for bank transfer confirmation...</p>
          </div>
          <div style={{ padding: "28px 32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0" }}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#1C160E" }}>Amount Due</span>
              <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "22px", fontWeight: 700, color: "#92400E" }}>GHS {lineItemsTotal.toFixed(2)}</span>
            </div>
            <button onClick={() => { setPending(false); navigate(userRole === "owner" || userRole === "admin" ? "/app/admin/bookings" : "/app/receptionist/bookings"); }} style={{ width: "100%", padding: "11px", borderRadius: "12px", background: "linear-gradient(135deg,#D97706,#92400E)", color: "#FFFFFF", border: "none", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>Done</button>
          </div>
        </div>
      </div>
    );
  }

  const checkoutDisabled = processing || !selectedStaff;
  const statusColors = sc(booking.status);
  const dep = depositPaid ? depositAmount : 0;
  // productTotal = sum of all non-service line items (products added at checkout)
  const productTotal = lineItems.filter(i => i.type === "product").reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const afterDeposit = Math.max(0, originalPrice - dep) + productTotal;
  const afterPromo = Math.max(0, afterDeposit - promoDiscount);
  const balanceDue = Math.max(0, afterPromo - (redeemedCard?.value ?? 0));

  // Pre-computed style vars to avoid esbuild TSX parse issues
  const itemRowBg = (covered: boolean) => covered ? "#F0FDF4" : "#FAFAF8";
  const itemRowBorder = (covered: boolean) => "1px solid " + (covered ? "#BBF7D0" : "#EDEBE5");
  const itemAmtColor = (covered: boolean) => covered ? "#16A34A" : G_D;
  const subBtnBorder = (covered: boolean) => "1px solid " + (covered ? "#16A34A" : "#EDEBE5");
  const subBtnBg = (covered: boolean) => covered ? "#DCFCE7" : "#FFFFFF";
  const subBtnColor = (covered: boolean) => covered ? "#16A34A" : TXT_SOFT;
  const depositBg = depositPaid ? "#F0FDF4" : "#FFFBEB";
  const depositBorder = "1px solid " + (depositPaid ? "#BBF7D0" : "#FDE68A");
  const depositLabelColor = depositPaid ? "#16A34A" : "#D97706";
  const depositBadgeBg = depositPaid ? "#DCFCE7" : "#FEF9C3";
  const depositBadgeColor = depositPaid ? "#16A34A" : "#CA8A04";
  const btnBg = checkoutDisabled ? "#E8E0D4" : "linear-gradient(135deg," + G + "," + G_D + ")";
  const btnColor = checkoutDisabled ? TXT_SOFT : WHITE;
  const btnCursor = checkoutDisabled ? "not-allowed" : "pointer";

  return (
    <div style={{ background: CREAM, padding: "clamp(16px,4vw,28px)", fontFamily: "Montserrat,sans-serif", color: TXT }}>
      <div style={{ maxWidth: "960px", margin: "0 auto" }}>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px" }}>
          <button onClick={() => navigate(-1)} style={{ width: "36px", height: "36px", borderRadius: "10px", border: "1px solid " + BORDER, background: WHITE, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <ArrowLeft style={{ width: "16px", height: "16px", color: TXT_MID }} />
          </button>
          <div>
            <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.16em", color: G, textTransform: "uppercase", margin: "0 0 2px" }}>Payment</p>
            <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(26px,4vw,38px)", fontWeight: 700, color: TXT, margin: 0, lineHeight: 1 }}>Checkout</h1>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>

          <div style={card}>
            <div style={cardHdr}>
              <Sparkles style={{ width: "16px", height: "16px", color: G }} />
              <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "19px", fontWeight: 700, color: TXT }}>Booking Details</span>
            </div>
            <div style={{ padding: "20px" }}>
              <div style={{ background: CREAM, borderRadius: "12px", padding: "14px 16px", marginBottom: "14px", border: "1px solid " + BORDER }}>
                <p style={{ fontSize: "15px", fontWeight: 700, color: TXT, margin: "0 0 4px" }}>{booking.service_name}</p>
                {booking.services?.category && <span style={{ fontSize: "10px", padding: "2px 9px", borderRadius: "12px", background: "#FBF6EE", color: G_D, fontWeight: 600, border: "1px solid #F0E4CC" }}>{booking.services.category}</span>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderRadius: "12px", background: CREAM, marginBottom: "14px", border: "1px solid " + BORDER }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#FBF6EE", border: "1px solid " + G, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <User style={{ width: "18px", height: "18px", color: G_D }} />
                </div>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: TXT, margin: "0 0 2px" }}>{booking.client_name}</p>
                  <p style={{ fontSize: "11px", color: TXT_SOFT, margin: 0 }}>{booking.clients?.phone || (booking as any).client_phone || ""}</p>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
                <div style={{ padding: "10px 14px", borderRadius: "10px", background: CREAM, border: "1px solid " + BORDER, display: "flex", alignItems: "center", gap: "8px" }}>
                  <Calendar style={{ width: "14px", height: "14px", color: G }} />
                  <span style={{ fontSize: "12px", fontWeight: 600, color: TXT }}>{format(new Date(booking.preferred_date), "PP")}</span>
                </div>
                <div style={{ padding: "10px 14px", borderRadius: "10px", background: CREAM, border: "1px solid " + BORDER, display: "flex", alignItems: "center", gap: "8px" }}>
                  <Clock style={{ width: "14px", height: "14px", color: G }} />
                  <span style={{ fontSize: "12px", fontWeight: 600, color: TXT }}>{(booking.preferred_time || "").slice(0, 5)}</span>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <span style={lbl as any}>Status</span>
                <span style={{ padding: "3px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, background: statusColors.bg, color: statusColors.color, border: "1px solid " + statusColors.border }}>{booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}</span>
              </div>
              <div style={{ paddingTop: "14px", borderTop: "1px solid " + BORDER }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid " + BORDER }}>
                  <span style={{ fontSize: "12px", color: TXT_MID }}>Service Price</span>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: TXT }}>GHS {originalPrice.toFixed(2)}</span>
                </div>
                {depositPaid && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid " + BORDER }}>
                    <span style={{ fontSize: "12px", color: "#16A34A" }}>Deposit Paid</span>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#16A34A" }}>- GHS {depositAmount.toFixed(2)}</span>
                  </div>
                )}
                {productTotal > 0 && lineItems.filter(i => i.type === "product").map((item, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid " + BORDER }}>
                    <span style={{ fontSize: "12px", color: TXT_MID }}>+ {item.name}{item.quantity > 1 ? " x" + item.quantity : ""}</span>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: TXT }}>GHS {(item.unitPrice * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid " + BORDER }}>
                  <span style={{ fontSize: "12px", color: TXT_MID }}>Subtotal before discounts</span>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: TXT }}>GHS {afterDeposit.toFixed(2)}</span>
                </div>
                {appliedPromo && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid " + BORDER }}>
                    <span style={{ fontSize: "12px", color: "#16A34A" }}>Promo ({appliedPromo.code})</span>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#16A34A" }}>- GHS {promoDiscount.toFixed(2)}</span>
                  </div>
                )}
                {redeemedCard && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid " + BORDER }}>
                    <span style={{ fontSize: "12px", color: "#16A34A" }}>Gift Card</span>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#16A34A" }}>- GHS {redeemedCard.value.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "12px", marginTop: "4px" }}>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: TXT }}>Balance Due</span>
                  <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "28px", fontWeight: 700, color: G_D }}>GHS {balanceDue.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div style={card}>
            <div style={cardHdr}>
              <Receipt style={{ width: "16px", height: "16px", color: G }} />
              <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "19px", fontWeight: 700, color: TXT }}>Complete Checkout</span>
            </div>
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "18px" }}>
              <div>
                <label style={lbl}>Assign Staff Member *</label>
                <select
                  value={selectedStaff}
                  onChange={e => setSelectedStaff(e.target.value)}
                  style={{ width: "100%", border: "1.5px solid " + BORDER, borderRadius: "10px", padding: "9px 12px", fontSize: "13px", color: selectedStaff ? TXT : TXT_SOFT, outline: "none", background: WHITE, fontFamily: "Montserrat,sans-serif", cursor: "pointer" }}
                >
                  <option value="">Select staff member...</option>
                  {staff.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name}{absentStaffIds.has(m.id) ? " (Absent)" : ""}{m.specialties && m.specialties[0] ? " - " + m.specialties[0] : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={lbl}>Payment Method</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {[{ id: "cash", name: "Cash", icon: Banknote }, { id: "mobile_money", name: "Mobile Money", icon: Smartphone }, { id: "card", name: "Card", icon: CreditCard }, { id: "bank_transfer", name: "Bank Transfer", icon: Building }].map(m => {
                    const Icon = m.icon as any;
                    const active = paymentMethod === m.id;
                    return (
                      <button key={m.id} type="button" onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                        style={{ padding: "12px 8px", borderRadius: "10px", border: "2px solid " + (active ? G : BORDER), background: active ? "#FBF6EE" : WHITE, color: active ? G_D : TXT_MID, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "5px", fontFamily: "Montserrat,sans-serif" }}>
                        <Icon style={{ width: "20px", height: "20px" }} />
                        <span style={{ fontSize: "11px", fontWeight: 600 }}>{m.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ background: depositBg, border: depositBorder, borderRadius: "12px", padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ fontSize: "11px", fontWeight: 700, color: depositLabelColor, margin: "0 0 2px", textTransform: "uppercase" }}>Deposit - GHS {depositAmount}</p>
                    <p style={{ fontSize: "12px", color: TXT_MID, margin: 0 }}>{depositPaid ? "Collected. Balance reduced." : "Not collected. Full price due."}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ padding: "2px 10px", borderRadius: "20px", fontSize: "10px", fontWeight: 700, background: depositBadgeBg, color: depositBadgeColor }}>{depositPaid ? "PAID" : "UNPAID"}</span>
                    <button onClick={() => setDepositPaid(d => !d)} style={{ fontSize: "11px", fontWeight: 600, color: G_D, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>{depositPaid ? "Mark Unpaid" : "Mark Paid"}</button>
                  </div>
                </div>
              </div>

              <div>
                <label style={lbl}>Redeem Gift Card</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input placeholder="Gift card code" value={giftCode} onChange={e => setGiftCode(e.target.value)} style={{ ...inp, flex: 1 }} />
                  <button onClick={handleRedeemGiftCard} disabled={redeeming || !giftCode || !selectedStaff}
                    style={{ padding: "9px 16px", borderRadius: "10px", background: redeeming ? "#F0E4CC" : G_D, color: WHITE, border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                    {redeeming ? "..." : "Redeem"}
                  </button>
                </div>
                {redeemedCard && <p style={{ fontSize: "11px", color: "#16A34A", marginTop: "4px" }}>GHS {redeemedCard.value.toFixed(2)} off</p>}
              </div>

              <div>
                <label style={lbl}>Promo Code</label>
                {bookingUsedPromo && (
                  <div style={{ background:"#FEF3C7", border:"1px solid #FDE68A", borderRadius:8, padding:"8px 12px", marginBottom:8, display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:14 }}>⚠️</span>
                    <p style={{ fontSize:11, fontWeight:600, color:"#92400E", margin:0, fontFamily:"Montserrat,sans-serif" }}>
                      Promo <strong>{bookingUsedPromo}</strong> was already used at booking. Applying it again would be a double discount.
                    </p>
                  </div>
                )}
                <div style={{ display: "flex", gap: "8px" }}>
                  <input placeholder="Enter promo code" value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase())} disabled={!!appliedPromo} style={{ ...inp, flex: 1 }} />
                  {appliedPromo ? (
                    <button onClick={() => { setAppliedPromo(null); setPromoDiscount(0); setPromoCode(""); }} style={{ padding: "9px 14px", borderRadius: "10px", background: WHITE, color: "#DC2626", border: "1px solid #FECACA", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>Remove</button>
                  ) : (
                    <button onClick={handleApplyPromo} disabled={validatingPromo || !promoCode} style={{ padding: "9px 16px", borderRadius: "10px", background: G_D, color: WHITE, border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>{validatingPromo ? "..." : "Apply"}</button>
                  )}
                </div>
                {appliedPromo && <p style={{ fontSize: "11px", color: "#16A34A", marginTop: "4px" }}>{appliedPromo.code}: GHS {promoDiscount.toFixed(2)} off</p>}
              </div>

              {paymentMethod === "bank_transfer" && (
                <div style={{ background: CREAM, borderRadius: "12px", padding: "14px 16px", border: "1px solid " + BORDER }}>
                  <label style={lbl}>Transfer Mode</label>
                  <div style={{ display: "flex", gap: "16px" }}>
                    {[{ v: true, l: "Paystack Transfer" }, { v: false, l: "Manual Transfer" }].map(opt => (
                      <label key={String(opt.v)} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", cursor: "pointer" }}>
                        <input type="radio" name="tm" checked={usePaystackForTransfer === opt.v} onChange={() => setUsePaystackForTransfer(opt.v)} />
                        {opt.l}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label style={lbl}>Notes (Optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes..." rows={2} style={{ ...inp, resize: "vertical" as any }} />
              </div>

              <button onClick={handleCheckout} disabled={checkoutDisabled}
                style={{ padding: "14px 20px", borderRadius: "12px", background: btnBg, color: btnColor, border: "none", fontSize: "13px", fontWeight: 700, cursor: btnCursor, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%" }}>
                {processing ? (<Loader2 style={{ width: "18px", height: "18px", animation: "spin 1s linear infinite" }} />) : (<span style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle2 style={{ width: "18px", height: "18px" }} />Complete Checkout - GHS {balanceDue.toFixed(2)}</span>)}
              </button>
            </div>
          </div>
        </div>
        <LineItemsPanel
          lineItems={lineItems}
          lineItemsTotal={balanceDue}
          products={products}
          productSearch={productSearch}
          clientSubscription={clientSubscription}
          cardHdr={cardHdr}
          lbl={lbl}
          inp={inp}
          onProductSearch={setProductSearch}
          onAddProduct={addProduct}
          onUpdateQty={updateQty}
          onRemove={removeLineItem}
          onToggleSub={toggleSub}
        />

      </div>
    </div>
  );
};

export default Checkout;
