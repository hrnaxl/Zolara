import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { validateGiftCard, redeemGiftCard as rpcRedeem } from "@/lib/useGiftCards";
import { validatePromoCode } from "@/lib/promoCodes";
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
import { Loader2, Calendar, Clock, User, Sparkles, CreditCard, Banknote, Smartphone, Building, CheckCircle2, ArrowLeft, Receipt, UserCheck } from "lucide-react";
import { format } from "date-fns";
import { sendSMS, SMS } from "@/lib/sms";
import LineItemsPanel from "@/components/checkout/LineItemsPanel";
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
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get("booking");
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
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
  const [promoCode, setPromoCode] = useState<string>("");
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
    if (bookingId) { fetchBookingDetails(); fetchStaff(); fetchProducts(); }
    else { setLoading(false); }
  }, [bookingId]);

  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
      setUserRole(roleData?.role || user.user_metadata.role);
      setLoading(false);
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
    const { data } = await (supabase as any).from("client_subscriptions").select("*, subscription_plans(name,monthly_price,included_services,max_usage_per_cycle)").eq("client_id", clientId).eq("status", "active").maybeSingle();
    setClientSubscription(data || null);
  };

  const fetchBookingDetails = async () => {
    try {
      const { data, error } = await supabase.from("bookings").select(`*, clients:client_id(*), services:service_id(*), staff:staff_id(*)`).eq("id", bookingId!).single();
      if (error) throw error;
      const bk = data as unknown as BookingData;
      setBooking(bk);
      // Use booking.price if set (has variant/addon adjustments), else service base price
      const bookingPrice = Number((data as any).price ?? 0);
      const servicePrice = Number(bk.services?.price ?? 0);
      const price = bookingPrice > 0 ? bookingPrice : servicePrice;
      setOriginalPrice(price);
      setDepositPaid((data as any).deposit_paid || false);
      setAmount(price.toString());
      if (bk.staff?.id) setSelectedStaff(bk.staff.id);
      if (bk.clients?.id) fetchClientSubscription(bk.clients.id);
    } catch { toast.error("Failed to load booking"); }
  };

  const fetchStaff = async () => {
    try {
      const { data: staffData, error: staffErr } = await supabase
        .from("staff").select("id,name,specialties").eq("is_active", true).order("name");
      if (staffErr) { console.error("Staff fetch error:", staffErr); }
      setStaff(staffData || []);
      const { data: attData } = await supabase
        .from("attendance").select("staff_id,status").eq("date", new Date().toISOString().split("T")[0]);
      setAbsentStaffIds(new Set((attData || []).filter((a: any) => a.status === "absent").map((a: any) => a.staff_id)));
    } catch (e) { console.error("fetchStaff error:", e); }
  };

  useEffect(() => {
    if (!booking) return;
    const svcPrice = Number(booking.services?.price ?? (booking as any).price ?? 0);
    setLineItems([{ type: "service", id: booking.service_id || booking.id, name: booking.service_name || "Service", quantity: 1, unitPrice: svcPrice, coveredBySubscription: false }]);
  }, [booking]);

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
  const toggleSub = (idx: number) => setLineItems(prev => prev.map((item, i) => i === idx ? { ...item, coveredBySubscription: !item.coveredBySubscription } : item));

  const handleRedeemGiftCard = async () => {
    if (!giftCode.trim() || !selectedStaff) return;
    setRedeeming(true);
    try {
      const result = await validateGiftCard(giftCode.trim());
      if (!result.valid) { toast.error(result.message); return; }
      setRedeemedCard({ id: result.card!.id, value: result.card!.balance });
      toast.success(`Gift card applied: GHS ${result.card!.balance.toFixed(2)} off`);
    } catch (e: any) { toast.error(e.message || "Invalid gift card"); } finally { setRedeeming(false); }
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setValidatingPromo(true);
    try {
      const result = await validatePromoCode(promoCode.trim());
      if (!result.valid) { toast.error(result.message); return; }
      const promo = result.promo;
      const base = originalPrice || parseFloat(amount) || 0;
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
    if (!amount || isNaN(parseFloat(amount))) { toast.error("Please enter a valid amount"); return; }

    const giftValue = redeemedCard?.value ?? 0;
    const dep = depositPaid ? depositAmount : 0;
    const effectivePrice = lineItemsTotal > 0 ? lineItemsTotal : (Number(originalPrice) || (parseFloat(amount) + dep) || 0);
    const paymentAmount = Math.max(0, effectivePrice - promoDiscount - giftValue - dep);
    setProcessing(true);

    try {
      const enabled = ["cash", "mobile_money", "card", "bank_transfer", "gift_card"];
      if (paymentAmount > 0 && (!paymentMethod || !enabled.includes(paymentMethod))) {
        toast.error("Please select a payment method"); setProcessing(false); return;
      }

      await supabase.from("bookings").update({ staff_id: selectedStaff, notes: notes || booking.notes, ...(depositPaid ? { deposit_paid: true, deposit_amount: depositAmount } : {}) } as any).eq("id", booking.id);

      if (redeemedCard && Number(redeemedCard.value) > 0) {
        const orig = Number(originalPrice || (booking.services?.price ?? 0));
        const appliedGift = Math.min(Number(redeemedCard.value), orig);
        if (appliedGift > 0) {
          const { error: giftErr } = await supabase.from("sales").insert([{ booking_id: booking.id, amount: appliedGift, payment_method: "gift_card", status: "completed", client_name: booking.client_name || null, service_name: booking.service_name || null, client_id: booking.clients?.id || null, notes: notes || null }]);
          if (giftErr) { toast.error("Failed to record gift card payment"); setProcessing(false); return; }
          await (supabase as any).from("gift_cards").update({ status: "redeemed", balance: 0, redeemed_by_client: booking.client_name || null }).eq("id", redeemedCard.id);
        }
      }

      if (paymentMethod !== "bank_transfer") {
        await supabase.from("bookings").update({ status: "completed", staff_id: selectedStaff, notes: notes || booking.notes, price: effectivePrice, ...(depositPaid ? { deposit_paid: true, deposit_amount: depositAmount } : {}) } as any).eq("id", booking.id);
        const totalRev = effectivePrice - promoDiscount - giftValue;
        const { error: saleErr } = await supabase.from("sales").insert({ booking_id: booking.id, amount: totalRev, payment_method: paymentMethod, status: "completed", client_name: booking.client_name || null, service_name: booking.service_name || null, client_id: booking.clients?.id || null, staff_id: selectedStaff || null, notes: [notes || "Payment at checkout", dep > 0 ? `Includes GHS ${dep} deposit` : null].filter(Boolean).join(" | "), promo_code: appliedPromo?.code || null, promo_discount: promoDiscount > 0 ? promoDiscount : null });
        if (saleErr) throw saleErr;

        // Write checkout session + line items
        try {
          const { data: sess } = await (supabase as any).from("checkout_sessions").insert([{ client_id: booking.clients?.id || null, staff_id: selectedStaff, booking_id: booking.id, total_amount: effectivePrice, payment_method: paymentMethod, status: "completed" }]).select("id").single();
          if (sess?.id && lineItems.length > 0) {
            await (supabase as any).from("checkout_items").insert(lineItems.map(item => ({ checkout_session_id: sess.id, booking_id: booking.id, item_type: item.type, item_id: item.id, name: item.name, quantity: item.quantity, price_at_time: item.unitPrice, subtotal: item.coveredBySubscription ? 0 : item.unitPrice * item.quantity })));
          }
          // Deduct product stock
          for (const pi of lineItems.filter(i => i.type === "product")) {
            const prod = products.find(p => p.id === pi.id);
            if (prod) await (supabase as any).from("products").update({ stock_quantity: Math.max(0, (prod.stock_quantity || 0) - pi.quantity) }).eq("id", pi.id);
          }
          // Log subscription usage
          if (clientSubscription) {
            for (const ci of lineItems.filter(i => i.coveredBySubscription)) {
              await (supabase as any).from("subscription_usage").insert({ client_subscription_id: clientSubscription.id, client_id: booking.clients?.id || null, service_id: ci.type === "service" ? ci.id : null, booking_id: booking.id });
            }
          }
        } catch (itemErr) { console.error("Line items error:", itemErr); }

        setCompleted(true);
        toast.success("Checkout completed!");

        // Loyalty + SMS
        try {
          const clientPhone = (booking as any).client_phone || booking.clients?.phone;
          const clientName = (booking as any).client_name || booking.clients?.name || "Guest";
          const clientEmail = (booking as any).client_email || booking.clients?.email || null;
          let clientId = booking.clients?.id || (booking as any).client_id || null;
          const resolvedId = await findOrCreateClient({ name: clientName, phone: clientPhone, email: clientEmail });
          if (resolvedId) { clientId = resolvedId; await supabase.from("bookings").update({ client_id: clientId } as any).eq("id", booking.id); }
          if (clientId) {
            const spendable = lineItems.reduce((s, i) => s + (i.coveredBySubscription ? 0 : i.unitPrice * i.quantity), 0) || Number(originalPrice) || 0;
            const { data: before } = await (supabase as any).from("clients").select("loyalty_points").eq("id", clientId).single();
            const prevPts = Number(before?.loyalty_points || 0);
            await (supabase as any).rpc("update_client_after_checkout", { p_client_id: clientId, p_amount_spent: spendable });
            const { data: after } = await (supabase as any).from("clients").select("loyalty_points").eq("id", clientId).single();
            const finalPts = Number(after?.loyalty_points || 0);
            if (clientPhone) {
              const earned = Math.max(0, finalPts - prevPts);
              await sendSMS(clientPhone, SMS.checkoutComplete(booking.client_name || "Valued Client", booking.service_name || "service", spendable.toFixed(0), earned, finalPts, booking.booking_ref || booking.id.slice(0, 8).toUpperCase()));
              const stampsForReward = Number((settings as any)?.loyalty_stamps_for_reward ?? 20);
              if (Math.floor(finalPts / stampsForReward) > Math.floor(prevPts / stampsForReward) && finalPts >= stampsForReward) {
                setTimeout(() => sendSMS(clientPhone, SMS.loyaltyReward(booking.client_name || "Valued Client", finalPts)).catch(console.error), 3000);
              }
            }
          }
        } catch (loyErr) { console.error("Loyalty error:", loyErr); }
        return;
      }

      // Bank transfer
      await supabase.from("sales").insert({ booking_id: booking.id, amount: paymentAmount + dep, payment_method: "bank_transfer", status: usePaystackForTransfer ? "pending" : "pending", client_name: booking.client_name || null, service_name: booking.service_name || null, client_id: booking.clients?.id || null, notes: [notes || "Bank transfer - awaiting confirmation", dep > 0 ? `Includes GHS ${dep} deposit` : null].filter(Boolean).join(" | ") });
      await supabase.from("bookings").update({ status: "confirmed" } as any).eq("id", booking.id);
      setPaymentMethod("bank_transfer"); setPending(true);
      toast.success("Bank transfer recorded. Awaiting confirmation.");
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error(error.message || "Failed to complete checkout");
    } finally { setProcessing(false); }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAFAF8", fontFamily: "Montserrat,sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: "48px", height: "48px", border: "3px solid #F0E4CC", borderTopColor: "#C8A97E", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ fontSize: "12px", color: "#78716C", letterSpacing: "0.08em", fontWeight: 500 }}>Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (!bookingId || !booking) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAFAF8", fontFamily: "Montserrat,sans-serif", padding: "24px" }}>
        <div style={{ background: "#FFFFFF", border: "1px solid #EDEBE5", borderRadius: "20px", padding: "48px 40px", maxWidth: "400px", width: "100%", textAlign: "center" }}>
          <Receipt style={{ width: "32px", height: "32px", color: "#C8A97E", margin: "0 auto 16px" }} />
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "24px", fontWeight: 700, color: "#1C160E", margin: "0 0 8px" }}>No Booking Selected</h2>
          <p style={{ fontSize: "13px", color: "#78716C", margin: "0 0 24px" }}>Select a booking from the bookings page to proceed.</p>
          <button onClick={() => navigate(-1)} style={{ padding: "10px 24px", borderRadius: "12px", background: "#C8A97E", color: "#FFFFFF", border: "none", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>Go Back</button>
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
                <span style={{ fontSize: "12px", fontWeight: 600, color: item.coveredBySubscription ? "#16A34A" : "#1C160E" }}>{item.coveredBySubscription ? "Included" : `GHS ${(item.unitPrice * item.quantity).toFixed(2)}`}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0" }}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#1C160E" }}>Total Paid</span>
              <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "24px", fontWeight: 700, color: "#8B6914" }}>GHS {lineItemsTotal.toFixed(2)}</span>
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
  const balanceDue = Math.max(0, lineItemsTotal - promoDiscount - (redeemedCard?.value ?? 0) - (depositPaid ? depositAmount : 0));

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
    <div style={{ background: CREAM, minHeight: "100vh", padding: "clamp(16px,4vw,32px)", fontFamily: "Montserrat,sans-serif", color: TXT }}>
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
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid " + BORDER }}>
                  <span style={{ fontSize: "12px", color: TXT_MID }}>Service Price</span>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: TXT }}>GHS {Number(originalPrice || booking.services?.price || 0).toFixed(2)}</span>
                </div>
                {appliedPromo && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid " + BORDER }}>
                    <span style={{ fontSize: "12px", color: TXT_MID }}>Promo ({appliedPromo.code})</span>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#16A34A" }}>- GHS {promoDiscount.toFixed(2)}</span>
                  </div>
                )}
                {redeemedCard && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid " + BORDER }}>
                    <span style={{ fontSize: "12px", color: TXT_MID }}>Gift Card</span>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#16A34A" }}>- GHS {redeemedCard.value.toFixed(2)}</span>
                  </div>
                )}
                {depositPaid && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid " + BORDER }}>
                    <span style={{ fontSize: "12px", color: TXT_MID }}>Deposit Paid</span>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#16A34A" }}>- GHS {depositAmount.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "10px", marginTop: "6px" }}>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: TXT }}>Balance Due</span>
                  <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "26px", fontWeight: 700, color: G_D }}>GHS {balanceDue.toFixed(2)}</span>
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

              <div>
                <label style={lbl}>Amount (GHS)</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} style={inp} />
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
          lineItemsTotal={lineItemsTotal}
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
