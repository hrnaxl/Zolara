import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  validateGiftCard,
  redeemGiftCard as rpcRedeem,
} from "@/lib/useGiftCards";
import { validatePromoCode } from "@/lib/promoCodes";
import { findOrCreateClient } from "@/lib/clientDedup";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSettings } from "@/context/SettingsContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2,
  Calendar,
  Clock,
  User,
  Sparkles,
  CreditCard,
  Banknote,
  Smartphone,
  Building,
  CheckCircle2,
  ArrowLeft,
  Receipt,
  UserCheck,
} from "lucide-react";
import { format } from "date-fns";
import { sendSMS, SMS } from "@/lib/sms";

type PaymentMethod = "cash" | "mobile_money" | "card" | "bank_transfer" | "gift_card";

interface BookingData {
  id: string;
  preferred_date: string;
  preferred_time: string;
  status: string;
  notes: string | null;
  client_name: string | null;
  service_name: string | null;
  client_phone: string | null;
  service_id: string | null;
  clients: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    loyalty_points: number;
  };
  services: {
    id: string;
    name: string;
    price: number;
    category: string;
  };
  staff: {
    id: string;
    name: string;
    specialization: string | null;
  } | null;
}

interface StaffMember {
  id: string;
  name: string;
  specialization: string | null;
}

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
  const [redeemedCard, setRedeemedCard] = useState<{
    id: string;
    value: number;
  } | null>(null);
  const [promoCode, setPromoCode] = useState<string>("");
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<any | null>(null);
  const [promoDiscount, setPromoDiscount] = useState<number>(0);
  const [usePaystackForTransfer, setUsePaystackForTransfer] = useState(true);
  const [paymentInfo, setPaymentInfo] = useState({
    id: null,
    bank_name: "",
    account_name: "",
    account_number: "",
  });
  const [showBankEditModal, setShowBankEditModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    bank_name: "",
    account_name: "",
    account_number: "",
  });
  const [userRole, setUserRole] = useState(null);

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
    if (bookingId) {
      fetchBookingDetails();
      fetchStaff();
    } else {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    const fetchUserRole = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      const metaDataRole = user.user_metadata.role;

      setUserRole(roleData?.role || metaDataRole);
      setLoading(false);
    };

    fetchUserRole();
  }, []);

  // Poll payments when UI is pending to detect completion (webhook may update payments table)
  useEffect(() => {
    if (!pending || !booking?.id) return;

    let cancelled = false;
    const iv = setInterval(async () => {
      try {
        const { data: payments } = await supabase
          .from("sales")
          .select("*")
          .eq("booking_id", booking.id)
          .eq("status", "completed")
          .limit(1);

        if (payments && payments.length > 0 && !cancelled) {
          // Payment completed — update UI
          setPending(false);
          setCompleted(true);
          setPaymentMethod(
            (payments[0].payment_method as PaymentMethod) || paymentMethod
          );
        }
      } catch (err) {
        console.error("Payment poll error:", err);
      }
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [pending, booking?.id]);

  const fetchBookingDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          `
          *,
          clients(*),
          services(*),
          staff(*)
        `
        )
        .eq("id", bookingId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setBooking(data as BookingData);
        if (data.staff?.id) {
          setSelectedStaff(data.staff?.id);
        }
        const price = Number((data as any).price || (data.services && data.services?.price) || 0);
        setOriginalPrice(price);

        // Auto-verify deposit with Paystack if not yet marked paid
        // (handles case where webhook didn't fire)
        let depositAlreadyPaid = (data as any).deposit_paid;
        if (!depositAlreadyPaid && (data as any).booking_ref) {
          try {
            const res = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-deposit`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json", "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY },
                body: JSON.stringify({ booking_id: bookingId }),
              }
            );
            const vd = await res.json();
            if (vd.status === "verified" || vd.status === "already_paid") {
              depositAlreadyPaid = true;
            }
          } catch { /* ignore — fallback to manual toggle */ }
        }

        const depositAmt = depositAlreadyPaid ? (Number((data as any).deposit_amount) || 50) : 0;
        setDepositPaid(!!depositAlreadyPaid);
        setAmount(String(Math.max(0, price - depositAmt).toFixed(2)));
      }
    } catch (error) {
      console.error("Error fetching booking:", error);
      toast.error("Failed to load booking details");
    } finally {
      setLoading(false);
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
      // Only show operational staff (not cleaners or receptionists)
      const operational = (data || []).filter((s: any) => !["cleaner","receptionist"].includes(s.role || ""));
      setStaff(operational);

      // Load today's attendance to flag absent staff
      const today = new Date().toISOString().slice(0, 10);
      const { data: attData } = await supabase
        .from("attendance")
        .select("staff_id, status")
        .eq("date", today);
      const absentIds = new Set<string>(
        (attData || [])
          .filter((a: any) => a.status === "absent")
          .map((a: any) => a.staff_id)
      );
      setAbsentStaffIds(absentIds);
    } catch (error) {
      console.error("Error fetching staff:", error);
    }
  };

  const handleRedeemGiftCard = async () => {
    if (!booking) return;
    if (!giftCode || giftCode.trim() === "") {
      toast.error("Enter a gift card code");
      return;
    }
    if (!selectedStaff) {
      toast.error("Assign a staff member before redeeming");
      return;
    }

    setRedeeming(true);
    try {
      // Look up the card directly
      const code = giftCode.trim().toUpperCase();
      const { data: cards, error: fetchErr } = await (supabase as any)
        .from("gift_cards")
        .select("*")
        .eq("code", code)
        .limit(1);

      if (fetchErr) throw fetchErr;
      const card = cards?.[0];

      if (!card) {
        toast.error("Gift card not found. Check the code and try again.");
        setRedeeming(false);
        return;
      }
      if (card.status === "redeemed") {
        toast.error("This gift card has already been used.");
        setRedeeming(false);
        return;
      }
      if (card.status === "expired" || (card.expires_at && new Date(card.expires_at) < new Date())) {
        toast.error("This gift card has expired.");
        setRedeeming(false);
        return;
      }
      if (card.payment_status === "voided" || card.payment_status === "expired") {
        toast.error(`Gift card has been voided or expired.`);
        return;
      }
      if (!["active","available","pending_send"].includes(card.status)) {
        toast.error(`Gift card is not available (status: ${card.status}).`);
        setRedeeming(false);
        return;
      }

      const value = Number(card.balance || card.amount || 0);
      const orig = Number(originalPrice || booking.price || booking.services?.price || 0);
      const remaining = Math.max(0, orig - value);

      // Store card info — actual redemption happens on checkout completion
      setRedeemedCard({ id: card.id, value });
      setAmount(String(remaining.toFixed(2)));
      toast.success(`Gift card applied: GH₵ ${value.toFixed(2)} off`);
    } catch (err: any) {
      console.error("Redeem error:", err);
      toast.error(err.message || "Redeem failed");
    } finally {
      setRedeeming(false);
    }
  };

  const { settings } = useSettings();
  const depositAmount = Number((settings as any)?.deposit_amount ?? 50);

  // fetch bank/payment settings for manual transfer option
  useEffect(() => {
    const fetchPaymentInfo = async () => {
      const { data, error } = await supabase // @ts-ignore
        .from("payment_settings")
        .select("*")
        .single();

      if (!error && data) {
        const d: any = data;
        setPaymentInfo({
          id: d.id,
          bank_name: d.bank_name,
          account_name: d.account_name,
          account_number: d.account_number,
        });
        setPaymentForm({
          bank_name: d.bank_name || "",
          account_name: d.account_name || "",
          account_number: d.account_number || "",
        });
      }
    };

    fetchPaymentInfo();
  }, []);

  // set default payment method
  useEffect(() => {
    if (!paymentMethod) {
      setPaymentMethod("cash");
    }
  }, []);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setValidatingPromo(true);
    try {
      const result = await validatePromoCode(promoCode.trim());
      if (!result.valid) { toast.error(result.message); return; }
      const promo = result.promo;
      const base = originalPrice || parseFloat(amount) || 0;
      if (promo.minimum_amount && base < promo.minimum_amount) {
        toast.error(`Minimum purchase of GH₵${promo.minimum_amount} required`);
        return;
      }
      let discount = 0;
      if (promo.discount_type === "percentage") {
        discount = (base * promo.discount_value) / 100;
      } else {
        discount = Math.min(promo.discount_value, base);
      }
      setAppliedPromo(promo);
      setPromoDiscount(discount);
      // Update amount field to reflect discount
      const dep = depositPaid ? Math.round(base * 0.5) : 0;
      const newAmount = Math.max(0, base - discount - (redeemedCard?.value ?? 0) - dep);
      setAmount(newAmount.toFixed(2));
      toast.success(`Promo applied: GH₵${discount.toFixed(2)} off`);
    } catch (e: any) {
      toast.error(e.message || "Failed to validate promo code");
    } finally {
      setValidatingPromo(false);
    }
  };

  const handleCheckout = async () => {
    if (!booking) return;

    if (!selectedStaff) {
      toast.error("Please assign a staff member to this service");
      return;
    }

    if (absentStaffIds.has(selectedStaff)) {
      const staffName = staff.find(s => s.id === selectedStaff)?.name || "This staff member";
      const proceed = window.confirm(`⚠️ ${staffName} is marked absent today. Proceed anyway?`);
      if (!proceed) return;
    }

    if (!amount || isNaN(parseFloat(amount))) {
      toast.error("Please enter a valid amount");
      return;
    }

    // Compute payment amount deterministically:
    // - If a gift card was redeemed, prefer originalPrice - giftValue (clamped at 0)
    // - Otherwise use the amount entered (clamped at 0)
    const giftValue = redeemedCard?.value ?? 0;
    const base = Number(originalPrice) || 0;
    const dep = depositPaid ? depositAmount : 0;
    const paymentAmount = Math.max(0, base - promoDiscount - giftValue - dep);
    setProcessing(true);

    try {
      const enabled = ["cash", "mobile_money", "card", "bank_transfer", "gift_card"];
      if (paymentAmount > 0) {
        if (!paymentMethod || !enabled.includes(paymentMethod)) {
          toast.error("Please select a payment method");
          setProcessing(false);
          return;
        }
      }
      // Update booking (always happens first)
      const { error: bookingError } = await supabase
        .from("bookings")
        .update({
          staff_id: selectedStaff,
          notes: notes || booking.notes,
          ...(depositPaid ? { deposit_paid: true, deposit_amount: depositAmount } : {}),
        } as any)
        .eq("id", booking.id);

      if (bookingError) throw bookingError;

      // If a gift card was redeemed earlier, record the gift portion as a completed payment (clamped to original price)
      if (redeemedCard && Number(redeemedCard.value) > 0) {
        try {
          const orig = Number(originalPrice || (booking.services?.price ?? 0));
          const appliedGiftAmount = Math.min(Number(redeemedCard.value), orig);

          if (appliedGiftAmount > 0) {
            const { data: giftPaymentData, error: giftPaymentError } =
              await supabase.from("sales").insert([
                {
                  booking_id: booking.id,
                  amount: appliedGiftAmount,
                  payment_method: "gift_card",
                  status: "completed",
                  client_name: booking.client_name || null,
                  service_name: booking.service_name || null,
                  client_id: booking.clients?.id || null,
                  notes: [notes, appliedPromo ? `Promo: ${appliedPromo.code}` : null, redeemedCard ? `Gift card: ${redeemedCard.id}` : null].filter(Boolean).join(" | ") || null,
                },
              ]);

            console.debug("gift card payment insert result:", {
              giftPaymentData,
              giftPaymentError,
            });

            if (giftPaymentError) {
              console.error(
                "Failed to insert gift_card payment:",
                giftPaymentError
              );
              toast.error(
                giftPaymentError.message ||
                  "Failed to record gift card payment. Check server logs and DB migrations."
              );
              setProcessing(false);
              return;
            }

            // NOW mark the card as redeemed — only after sale is recorded
            await (supabase as any)
              .from("gift_cards")
              .update({
                status: "redeemed",
                balance: 0,
                redeemed_by_client: booking.client_name || null,
              })
              .eq("id", redeemedCard.id);
          }
        } catch (err: any) {
          console.error("Unexpected error recording gift card payment:", err);
          toast.error(err?.message || "Failed to record gift card payment");
          setProcessing(false);
          return;
        }
      }

      const capitalizedPaymentMethod =
        paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1);
      // CASH → mark completed immediately (admin page)
      if (paymentMethod !== "bank_transfer") {
        const capitalizedPaymentMethod =
          paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1);

        // 1️⃣ Update the booking status and payment_method
        const { error: bookingError } = await supabase
          .from("bookings")
          .update({
            status: "completed",
            staff_id: selectedStaff,
            notes: notes || booking.notes,
            ...(depositPaid ? { deposit_paid: true, deposit_amount: depositAmount } : {}),
          } as any)
          .eq("id", booking.id);

        if (bookingError) throw bookingError;

        // @ts-ignore
        // amount = balance collected now + deposit already held = full service revenue
        const totalRevenue = paymentAmount + dep;
        const { error: paymentError } = await supabase.from("sales").insert({
          booking_id: booking.id,
          amount: totalRevenue,
          payment_method: paymentMethod,
          status: "completed",
          client_name: booking.client_name || null,
          service_name: booking.service_name || null,
          client_id: booking.clients?.id || null,
          staff_id: selectedStaff || null,
          notes: [notes || `${capitalizedPaymentMethod} payment recorded at checkout`, dep > 0 ? `Includes GHS ${dep} deposit` : null].filter(Boolean).join(" | "),
          promo_code: appliedPromo?.code || null,
          promo_discount: promoDiscount > 0 ? promoDiscount : null,
        });

        if (paymentError) throw paymentError;

        // Update local UI state
        setPaymentMethod(paymentMethod);
        setCompleted(true);
        toast.success("Checkout completed successfully!");
        // Create client record at checkout if not already exists, then award loyalty points
        try {
          const clientPhone = (booking as any).client_phone || booking.clients?.phone;
          const clientName = (booking as any).client_name || booking.clients?.name || "Guest";
          const clientEmail = (booking as any).client_email || booking.clients?.email || null;

          // Always find or create — client only officially exists after first checkout
          let clientId = booking.clients?.id || (booking as any).client_id || null;
          const resolvedId = await findOrCreateClient({ name: clientName, phone: clientPhone, email: clientEmail });
          if (resolvedId) {
            clientId = resolvedId;
            // Link to booking if not already linked
            await supabase.from("bookings").update({ client_id: clientId } as any).eq("id", booking.id);
          }

          if (clientId) {
            // ── LOYALTY: only awarded on completed checkout ──────────────────
            // Full service price = originalPrice (entered by receptionist) OR
            // amount paid now + deposit already collected, never just the balance
            const amountPaid = parseFloat(amount) || 0;
            const fullBookingPrice = Number(
              originalPrice ||
              (amountPaid + (depositPaid ? depositAmount : 0)) ||
              (booking as any).price ||
              0
            );

            // Fetch fresh client data to avoid stale cache
            const { data: freshClient } = await (supabase as any)
              .from("clients")
              .select("loyalty_points, total_spent, total_visits, date_of_birth")
              .eq("id", clientId)
              .single();

            const prevTotalSpent  = Number(freshClient?.total_spent  || 0);
            const prevTotalVisits = Number(freshClient?.total_visits  || 0);

            // Accumulate lifetime completed spend
            const newTotalSpent  = prevTotalSpent + fullBookingPrice;
            const newTotalVisits = prevTotalVisits + 1;

            // Points = floor(lifetime_completed_spend / 100)
            // Birthday month: double the points earned this visit only
            const clientDob = freshClient?.date_of_birth;
            const isBirthdayMonth = clientDob
              ? new Date(clientDob).getMonth() === new Date().getMonth()
              : false;
            const stampPerGhs = Number((settings as any)?.loyalty_stamp_per_ghs ?? 100);
            const basePoints     = Math.floor(newTotalSpent / stampPerGhs);
            const birthdayBonus  = isBirthdayMonth
              ? Math.floor(fullBookingPrice / stampPerGhs) // extra once for birthday visit
              : 0;
            const finalPoints = basePoints + birthdayBonus;

            await supabase.from("clients" as any).update({
              loyalty_points: finalPoints,
              total_spent:    newTotalSpent,
              total_visits:   newTotalVisits,
            }).eq("id", clientId);
            if (clientPhone) {
              const stampsForReward = Number((settings as any)?.loyalty_stamps_for_reward ?? 20);
              const rewardGhs = Number((settings as any)?.loyalty_reward_discount ?? 50);
              const staffName = staff.find(s => s.id === selectedStaff)?.name;
              await sendSMS(clientPhone, SMS.checkoutComplete(
                booking.client_name || "Valued Client",
                booking.service_name || "service",
                fullBookingPrice.toFixed(0),
                finalPoints,
                stampsForReward,
                rewardGhs,
                staffName,
                depositPaid ? depositAmount : undefined,
                appliedPromo?.code || undefined,
                promoDiscount > 0 ? promoDiscount : undefined,
              ));
            }
          }
        } catch(loyaltyErr) { console.error("Loyalty update error:", loyaltyErr); }
        return;
      }

      // BANK TRANSFER chosen and user opts for manual transfer
      if (paymentMethod === "bank_transfer" && !usePaystackForTransfer) {
        const { error: paymentError } = await supabase.from("sales").insert({
          booking_id: booking.id,
          amount: paymentAmount + dep,
          payment_method: "bank_transfer",
          status: "pending",
          client_name: booking.client_name || null,
          service_name: booking.service_name || null,
          client_id: booking.clients?.id || null,
          notes: [notes || "Manual bank transfer (pending)", dep > 0 ? `Includes GHS ${dep} deposit` : null].filter(Boolean).join(" | "),
          promo_code: appliedPromo?.code || null,
          promo_discount: promoDiscount > 0 ? promoDiscount : null,
        });

        if (paymentError) throw paymentError;
        // Update booking to record chosen payment method
        const { error: bmErr3 } = await supabase
          .from("bookings")
          .update({ status: "confirmed" } as any)
          .eq("id", booking.id);

        // ensure local state reflects chosen method for UI
        setPaymentMethod("bank_transfer");
        setPending(true);
        toast.success(
          "Pending payment recorded. Awaiting manual transfer confirmation."
        );
        return;
      }

      // bank_transfer via Paystack (usePaystackForTransfer=true) → just record as pending
      const { error: btErr } = await supabase.from("sales").insert({
        booking_id: booking.id,
        amount: paymentAmount + dep,
        payment_method: "bank_transfer",
        status: "pending",
        client_name: booking.client_name || null,
        service_name: booking.service_name || null,
        client_id: booking.clients?.id || null,
        notes: [notes || "Bank transfer — awaiting confirmation", dep > 0 ? `Includes GHS ${dep} deposit` : null].filter(Boolean).join(" | "),
        promo_code: appliedPromo?.code || null,
        promo_discount: promoDiscount > 0 ? promoDiscount : null,
      });
      if (btErr) throw btErr;
      await supabase.from("bookings").update({ status: "confirmed" } as any).eq("id", booking.id);
      setPaymentMethod("bank_transfer");
      setPending(true);
      toast.success("Bank transfer recorded. Awaiting confirmation.");
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error(error.message || "Failed to complete checkout");
    } finally {
      setProcessing(false);
    }
  };

  const getPaymentIcon = (method?: PaymentMethod | string) => {
    switch (method) {
      case "cash":
        return <Banknote className="w-5 h-5" />;
      case "card":
        return <CreditCard className="w-5 h-5" />;
      case "mobile_money":
        return <Smartphone className="w-5 h-5" />;
      case "bank_transfer":
        return <Building className="w-5 h-5" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAFAF8", fontFamily: "Montserrat,sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: "48px", height: "48px", border: "3px solid #F0E4CC", borderTopColor: "#C8A97E", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ fontSize: "12px", color: "#78716C", letterSpacing: "0.08em", fontWeight: 500 }}>Loading checkout…</p>
        </div>
      </div>
    );
  }

  if (!bookingId || !booking) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAFAF8", fontFamily: "Montserrat,sans-serif", padding: "24px" }}>
        <div style={{ background: "#FFFFFF", border: "1px solid #EDEBE5", borderRadius: "20px", padding: "48px 40px", maxWidth: "400px", width: "100%", textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#FBF6EE", border: "1px solid #F0E4CC", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <Receipt style={{ width: "28px", height: "28px", color: "#C8A97E" }} />
          </div>
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "24px", fontWeight: 700, color: "#1C160E", margin: "0 0 8px" }}>No Booking Selected</h2>
          <p style={{ fontSize: "13px", color: "#78716C", margin: "0 0 24px", lineHeight: 1.6 }}>Select a booking from the bookings page to proceed with checkout.</p>
          <button onClick={() => navigate(-1)} style={{ padding: "10px 24px", borderRadius: "12px", background: "#C8A97E", color: "#FFFFFF", border: "none", fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <ArrowLeft style={{ width: "16px", height: "16px" }} /> Go Back
          </button>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAFAF8", fontFamily: "Montserrat,sans-serif", padding: "24px" }}>
        <div style={{ background: "#FFFFFF", border: "1px solid #EDEBE5", borderRadius: "20px", overflow: "hidden", maxWidth: "520px", width: "100%", boxShadow: "0 8px 40px rgba(0,0,0,0.08)" }}>
          {/* Gold success banner */}
          <div style={{ background: "linear-gradient(135deg,#C8A97E 0%,#8B6914 100%)", padding: "40px 32px", textAlign: "center", color: "#FFFFFF" }}>
            <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", backdropFilter: "blur(4px)" }}>
              <CheckCircle2 style={{ width: "40px", height: "40px" }} />
            </div>
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "32px", fontWeight: 700, margin: "0 0 8px" }}>Checkout Complete</h2>
            <p style={{ fontSize: "13px", opacity: 0.85, margin: 0 }}>Service has been marked as completed</p>
          </div>

          <div style={{ padding: "28px 32px" }}>
            {[
              { l: "Service", v: booking.service_name },
              { l: "Client", v: booking.client_name },
              { l: "Staff", v: staff.find(s => s.id === selectedStaff)?.name || "Assigned" },
              { l: "Payment", v: paymentMethod === "mobile_money" ? "Mobile Money" : paymentMethod === "bank_transfer" ? "Bank Transfer" : (paymentMethod || "").charAt(0).toUpperCase() + (paymentMethod || "").slice(1) },
            ].map(row => (
              <div key={row.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #EDEBE5" }}>
                <span style={{ fontSize: "12px", color: "#78716C" }}>{row.l}</span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#1C160E" }}>{row.v}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", marginTop: "4px" }}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#1C160E" }}>Total Paid</span>
              <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "24px", fontWeight: 700, color: "#8B6914" }}>
                GH₵ {(originalPrice || Number(booking.services?.price ?? 0)).toFixed(2)}
              </span>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
              <button onClick={() => navigate(-1)} style={{ flex: 1, padding: "11px", borderRadius: "12px", background: "#FAFAF8", color: "#78716C", border: "1px solid #EDEBE5", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                ← Back
              </button>
              <button onClick={() => { setCompleted(false); navigate(userRole === "owner" ? "/app/admin/bookings" : "/app/receptionist/bookings"); }}
                style={{ flex: 1, padding: "11px", borderRadius: "12px", background: "linear-gradient(135deg,#C8A97E,#8B6914)", color: "#FFFFFF", border: "none", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (pending) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAFAF8", fontFamily: "Montserrat,sans-serif", padding: "24px" }}>
        <div style={{ background: "#FFFFFF", border: "1px solid #EDEBE5", borderRadius: "20px", overflow: "hidden", maxWidth: "520px", width: "100%", boxShadow: "0 8px 40px rgba(0,0,0,0.08)" }}>
          <div style={{ background: "linear-gradient(135deg,#D97706 0%,#92400E 100%)", padding: "40px 32px", textAlign: "center", color: "#FFFFFF" }}>
            <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <CheckCircle2 style={{ width: "40px", height: "40px" }} />
            </div>
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "32px", fontWeight: 700, margin: "0 0 8px" }}>Payment Pending</h2>
            <p style={{ fontSize: "13px", opacity: 0.85, margin: 0 }}>Waiting for confirmation. This screen updates automatically.</p>
          </div>

          <div style={{ padding: "28px 32px" }}>
            {[
              { l: "Service", v: booking.service_name },
              { l: "Client", v: booking.client_name },
              { l: "Staff", v: staff.find(s => s.id === selectedStaff)?.name || "Assigned" },
              { l: "Payment", v: paymentMethod === "mobile_money" ? "Mobile Money" : paymentMethod === "bank_transfer" ? "Bank Transfer" : (paymentMethod || "").charAt(0).toUpperCase() + (paymentMethod || "").slice(1) },
            ].map(row => (
              <div key={row.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #EDEBE5" }}>
                <span style={{ fontSize: "12px", color: "#78716C" }}>{row.l}</span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#1C160E" }}>{row.v}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", marginTop: "4px" }}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#1C160E" }}>Total Due</span>
              <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "24px", fontWeight: 700, color: "#92400E" }}>
                GH₵ {(originalPrice || Number(booking.services?.price ?? 0)).toFixed(2)}
              </span>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
              <button onClick={() => navigate(-1)} style={{ flex: 1, padding: "11px", borderRadius: "12px", background: "#FAFAF8", color: "#78716C", border: "1px solid #EDEBE5", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                ← Back
              </button>
              <button onClick={() => { setPending(false); navigate(userRole === "owner" ? "/app/admin/bookings" : "/app/receptionist/bookings"); }}
                style={{ flex: 1, padding: "11px", borderRadius: "12px", background: "linear-gradient(135deg,#D97706,#92400E)", color: "#FFFFFF", border: "none", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const checkoutDisabled = processing || !selectedStaff;


  const G = "#C8A97E", G_D = "#8B6914", CREAM = "#FAFAF8", WHITE = "#FFFFFF";
  const BORDER = "#EDEBE5", TXT = "#1C160E", TXT_MID = "#78716C", TXT_SOFT = "#A8A29E";
  const SHADOW = "0 1px 3px rgba(0,0,0,0.04),0 4px 16px rgba(0,0,0,0.06)";
  const inp: React.CSSProperties = { border: `1.5px solid ${BORDER}`, borderRadius: "10px", padding: "9px 12px", fontSize: "13px", color: TXT, outline: "none", background: WHITE, fontFamily: "Montserrat,sans-serif", width: "100%" };
  const lbl: React.CSSProperties = { fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: TXT_SOFT, textTransform: "uppercase", display: "block", marginBottom: "6px" };
  const card: React.CSSProperties = { background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "16px", overflow: "hidden", boxShadow: SHADOW };
  const cardHdr: React.CSSProperties = { background: `linear-gradient(135deg,rgba(200,169,126,0.1),rgba(200,169,126,0.04))`, padding: "16px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: "10px" };
  const row = (label: string, value: any, bold = false) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${BORDER}` }}>
      <span style={{ fontSize: "12px", color: bold ? TXT : TXT_MID, fontWeight: bold ? 700 : 400 }}>{label}</span>
      <span style={{ fontSize: "13px", fontWeight: bold ? 700 : 600, color: bold ? G_D : TXT }}>{value}</span>
    </div>
  );

  const statusColor = (s: string) => {
    if (s === "confirmed") return { bg: "#F0FDF4", color: "#16A34A", border: "#BBF7D0" };
    if (s === "pending") return { bg: "#EFF6FF", color: "#2563EB", border: "#BFDBFE" };
    if (s === "completed") return { bg: "#FAFAF8", color: TXT_MID, border: BORDER };
    return { bg: "#FFFBEB", color: "#D97706", border: "#FDE68A" };
  };
  const sc = statusColor(booking.status);

  return (
    <div style={{ background: CREAM, minHeight: "100vh", padding: "clamp(16px,4vw,32px)", fontFamily: "Montserrat,sans-serif", color: TXT }}>
      <div style={{ maxWidth: "960px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px" }}>
          <button onClick={() => navigate(-1)} style={{ width: "36px", height: "36px", borderRadius: "10px", border: `1px solid ${BORDER}`, background: WHITE, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <ArrowLeft style={{ width: "16px", height: "16px", color: TXT_MID }} />
          </button>
          <div>
            <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.16em", color: G, textTransform: "uppercase", margin: "0 0 2px" }}>Payment</p>
            <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(26px,4vw,38px)", fontWeight: 700, color: TXT, margin: 0, lineHeight: 1 }}>Checkout</h1>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>

          {/* LEFT — Booking Details */}
          <div style={card}>
            <div style={cardHdr}>
              <Sparkles style={{ width: "16px", height: "16px", color: G }} />
              <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "19px", fontWeight: 700, color: TXT }}>Booking Details</span>
            </div>
            <div style={{ padding: "20px" }}>

              {/* Service */}
              <div style={{ background: CREAM, borderRadius: "12px", padding: "14px 16px", marginBottom: "14px", border: `1px solid ${BORDER}` }}>
                <p style={{ fontSize: "15px", fontWeight: 700, color: TXT, margin: "0 0 6px" }}>{booking.service_name}</p>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {booking.services?.category && <span style={{ fontSize: "10px", padding: "2px 9px", borderRadius: "12px", background: "#FBF6EE", color: G_D, fontWeight: 600, border: `1px solid #F0E4CC` }}>{booking.services.category}</span>}
                </div>
              </div>

              {/* Client */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderRadius: "12px", background: CREAM, marginBottom: "14px", border: `1px solid ${BORDER}` }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#FBF6EE", border: `1px solid ${G}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <User style={{ width: "18px", height: "18px", color: G_D }} />
                </div>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: TXT, margin: "0 0 2px" }}>{booking.client_name}</p>
                  <p style={{ fontSize: "11px", color: TXT_SOFT, margin: 0 }}>{booking.clients?.phone || booking.client_phone || ""}</p>
                </div>
              </div>

              {/* Date & Time */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
                <div style={{ padding: "10px 14px", borderRadius: "10px", background: CREAM, border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: "8px" }}>
                  <Calendar style={{ width: "14px", height: "14px", color: G }} />
                  <span style={{ fontSize: "12px", fontWeight: 600, color: TXT }}>{format(new Date(booking.preferred_date), "PP")}</span>
                </div>
                <div style={{ padding: "10px 14px", borderRadius: "10px", background: CREAM, border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: "8px" }}>
                  <Clock style={{ width: "14px", height: "14px", color: G }} />
                  <span style={{ fontSize: "12px", fontWeight: 600, color: TXT }}>{booking.preferred_time}</span>
                </div>
              </div>

              {/* Status */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={lbl as any}>Booking Status</span>
                <span style={{ padding: "3px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                </span>
              </div>

              {/* Pricing Summary */}
              <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: `1px solid ${BORDER}` }}>
                {row("Service Price", `GH₵ ${Number(originalPrice || booking?.services?.price || 0).toFixed(2)}`)}
                {appliedPromo && row(`Promo (${appliedPromo.code})`, `- GH₵ ${promoDiscount.toFixed(2)}`)}
                {redeemedCard && row("Gift Card", `- GH₵ ${redeemedCard.value.toFixed(2)}`)}
                {depositPaid && row(`Deposit Paid`, `- GH₵ ${depositAmount.toFixed(2)}`)}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "10px", marginTop: "6px" }}>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: TXT }}>Balance Due</span>
                  <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "26px", fontWeight: 700, color: G_D }}>
                    GH₵ {(() => {
                      const base = Number(originalPrice || booking?.services?.price || 0);
                      const dep = depositPaid ? depositAmount : 0;
                      return Math.max(0, base - promoDiscount - (redeemedCard?.value ?? 0) - dep).toFixed(2);
                    })()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — Checkout Form */}
          <div style={card}>
            <div style={cardHdr}>
              <Receipt style={{ width: "16px", height: "16px", color: G }} />
              <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "19px", fontWeight: 700, color: TXT }}>Complete Checkout</span>
            </div>
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "18px" }}>

              {/* Assign Staff */}
              <div>
                <label style={lbl}>Assign Staff Member *</label>
                <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                  <SelectTrigger style={{ border: `1.5px solid ${BORDER}`, borderRadius: "10px", fontSize: "13px" }}>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}{absentStaffIds.has(member.id) ? " ⚠️ Absent" : ""}
                        {member.specialization ? ` — ${member.specialization}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Method */}
              <div>
                <label style={lbl}>Payment Method</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {[
                    { id: "cash", name: "Cash", icon: Banknote },
                    { id: "mobile_money", name: "Mobile Money", icon: Smartphone },
                    { id: "card", name: "Card", icon: CreditCard },
                    { id: "bank_transfer", name: "Bank Transfer", icon: Building },
                  ].map((m) => {
                    const Icon = m.icon as any;
                    const active = paymentMethod === m.id;
                    return (
                      <button key={m.id} type="button" onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                        style={{ padding: "12px 8px", borderRadius: "10px", border: `2px solid ${active ? G : BORDER}`, background: active ? "#FBF6EE" : WHITE, color: active ? G_D : TXT_MID, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "5px", transition: "all 0.15s", fontFamily: "Montserrat,sans-serif" }}>
                        <Icon style={{ width: "20px", height: "20px" }} />
                        <span style={{ fontSize: "11px", fontWeight: 600 }}>{m.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label style={lbl}>Amount (GH₵)</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} style={inp} />
              </div>

              {/* Deposit Tracking */}
              <div style={{ background: depositPaid ? "#F0FDF4" : "#FFFBEB", border: `1px solid ${depositPaid ? "#BBF7D0" : "#FDE68A"}`, borderRadius: "12px", padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ fontSize: "11px", fontWeight: 700, color: depositPaid ? "#16A34A" : "#D97706", margin: "0 0 2px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Deposit — GH₵ {depositAmount}</p>
                    <p style={{ fontSize: "12px", color: TXT_MID, margin: 0 }}>{depositPaid ? "Collected. Balance reduced." : "Not collected. Full price due."}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ padding: "2px 10px", borderRadius: "20px", fontSize: "10px", fontWeight: 700, background: depositPaid ? "#DCFCE7" : "#FEF9C3", color: depositPaid ? "#16A34A" : "#CA8A04" }}>
                      {depositPaid ? "PAID" : "UNPAID"}
                    </span>
                    <button onClick={() => setDepositPaid(d => !d)} style={{ fontSize: "11px", fontWeight: 600, color: G_D, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                      {depositPaid ? "Mark Unpaid" : "Mark Paid"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Gift Card */}
              <div>
                <label style={lbl}>Redeem Gift Card</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input placeholder="Gift card code" value={giftCode} onChange={e => setGiftCode(e.target.value)} style={{ ...inp, flex: 1 }} />
                  <button onClick={handleRedeemGiftCard} disabled={redeeming || !giftCode || !selectedStaff}
                    style={{ padding: "9px 16px", borderRadius: "10px", background: redeeming ? "#F0E4CC" : G_D, color: WHITE, border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                    {redeeming ? "..." : "Redeem"}
                  </button>
                </div>
                {redeemedCard && <p style={{ fontSize: "11px", color: "#16A34A", marginTop: "4px" }}>✓ GH₵ {redeemedCard.value.toFixed(2)} off</p>}
              </div>

              {/* Promo Code */}
              <div>
                <label style={lbl}>Promo Code</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input placeholder="Enter promo code" value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase())} disabled={!!appliedPromo} style={{ ...inp, flex: 1 }} />
                  {appliedPromo ? (
                    <button onClick={() => { setAppliedPromo(null); setPromoDiscount(0); setPromoCode(""); setAmount(String(Math.max(0, originalPrice - (redeemedCard?.value ?? 0)).toFixed(2))); }}
                      style={{ padding: "9px 14px", borderRadius: "10px", background: WHITE, color: "#DC2626", border: "1px solid #FECACA", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                      Remove
                    </button>
                  ) : (
                    <button onClick={handleApplyPromo} disabled={validatingPromo || !promoCode}
                      style={{ padding: "9px 16px", borderRadius: "10px", background: G_D, color: WHITE, border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                      {validatingPromo ? "..." : "Apply"}
                    </button>
                  )}
                </div>
                {appliedPromo && <p style={{ fontSize: "11px", color: "#16A34A", marginTop: "4px" }}>✓ {appliedPromo.code}: GH₵{promoDiscount.toFixed(2)} off{appliedPromo.discount_type === "percentage" ? ` (${appliedPromo.discount_value}%)` : ""}</p>}
              </div>

              {/* Bank Transfer Options */}
              {paymentMethod === "bank_transfer" && (
                <div style={{ background: CREAM, borderRadius: "12px", padding: "14px 16px", border: `1px solid ${BORDER}` }}>
                  <label style={lbl}>Transfer Mode</label>
                  <div style={{ display: "flex", gap: "16px", marginBottom: "12px" }}>
                    {[{ v: true, l: "Paystack Transfer" }, { v: false, l: "Manual Transfer" }].map(opt => (
                      <label key={String(opt.v)} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", cursor: "pointer" }}>
                        <input type="radio" name="transfer_mode" checked={usePaystackForTransfer === opt.v} onChange={() => setUsePaystackForTransfer(opt.v)} />
                        {opt.l}
                      </label>
                    ))}
                  </div>
                  {!usePaystackForTransfer && paymentInfo.bank_name && (
                    <div style={{ fontSize: "12px", color: TXT_MID }}>
                      <p style={{ margin: "0 0 2px" }}><strong>Bank:</strong> {paymentInfo.bank_name}</p>
                      <p style={{ margin: "0 0 2px" }}><strong>Account:</strong> {paymentInfo.account_name}</p>
                      <p style={{ margin: 0 }}><strong>Number:</strong> {paymentInfo.account_number}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <label style={lbl}>Notes (Optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes about this checkout..." rows={2}
                  style={{ ...inp, resize: "vertical" as any }} />
              </div>

              {/* Checkout Button */}
              <button onClick={handleCheckout} disabled={checkoutDisabled}
                style={{ width: "100%", padding: "14px", borderRadius: "12px", background: checkoutDisabled ? "#E5E0D8" : `linear-gradient(135deg,${G},${G_D})`, color: checkoutDisabled ? TXT_SOFT : WHITE, border: "none", fontSize: "14px", fontWeight: 700, cursor: checkoutDisabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontFamily: "Montserrat,sans-serif", letterSpacing: "0.02em" }}>
                {processing ? (
                  <>
                    <div style={{ width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: WHITE, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    Processing…
                  </>
                ) : (
                  <>
                    <CheckCircle2 style={{ width: "18px", height: "18px" }} />
                    Complete Checkout — GH₵ {(() => {
                      const base = Number(originalPrice || booking?.services?.price || 0);
                      const dep = depositPaid ? depositAmount : 0;
                      return Math.max(0, base - promoDiscount - (redeemedCard?.value ?? 0) - dep).toFixed(2);
                    })()}
                  </>
                )}
              </button>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
