import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  validateGiftCard,
  redeemGiftCard as rpcRedeem,
} from "@/lib/useGiftCards";
import { validatePromoCode } from "@/lib/promoCodes";
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
    duration_minutes: number;
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
        // Use booking.price (the actual total including variant) — services.price is 0 for variant-based services
        const price = Number((data as any).price || (data.services && data.services?.price) || 0);
        setOriginalPrice(price);
        // Subtract deposit already paid
        const depositAlreadyPaid = data.deposit_paid ? (Number((data as any).deposit_amount) || 50) : 0;
        setDepositPaid(!!data.deposit_paid);  // sync toggle with actual DB value
        setAmount(String(Math.max(0, price - depositAlreadyPaid).toFixed(2)));
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
        .select("id, name, specialties")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setStaff(data || []);

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
                redeemed_at: new Date().toISOString(),
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
        const { error: paymentError } = await supabase.from("sales").insert({
          booking_id: booking.id,
          amount: paymentAmount,
          payment_method: paymentMethod,
          status: "completed",
          client_name: booking.client_name || null,
          service_name: booking.service_name || null,
          client_id: booking.clients?.id || null,
          staff_id: selectedStaff || null,
          notes: notes || `${capitalizedPaymentMethod} payment recorded at checkout`,
          promo_code: appliedPromo?.code || null,
          promo_discount: promoDiscount > 0 ? promoDiscount : null,
        });

        if (paymentError) throw paymentError;

        // If deposit was collected earlier, record it as revenue now that service is complete
        if (depositPaid && depositAmount > 0) {
          await supabase.from("sales").insert({
            booking_id: booking.id,
            amount: depositAmount,
            payment_method: "deposit",
            status: "completed",
            client_name: booking.client_name || null,
            service_name: booking.service_name || null,
            client_id: booking.clients?.id || null,
            staff_id: selectedStaff || null,
            notes: "Deposit collected at booking — recognised as revenue on completion",
          } as any);
        }

        // Update local UI state
        setPaymentMethod(paymentMethod);
        setCompleted(true);
        toast.success("Checkout completed successfully!");
        // Award loyalty points + update total_spent + send SMS
        try {
          const clientId = booking.clients?.id || (booking as any).client_id;
          const clientPhone = (booking as any).client_phone || booking.clients?.phone;
          if (clientId) {
            const fullBookingPrice = Number((booking as any).price || originalPrice || 0);
            const currentStamps = (booking as any).clients?.loyalty_points || 0;
            const currentSpent = Number((booking as any).clients?.total_spent || 0);
            const currentVisits = Number((booking as any).clients?.total_visits || 0);
            // Birthday bonus: double stamps in birthday month
            const clientDob = (booking as any).clients?.date_of_birth;
            const isBirthdayMonth = clientDob
              ? new Date(clientDob).getMonth() === new Date().getMonth()
              : false;
            const stampPerGhs = Number((settings as any)?.loyalty_stamp_per_ghs ?? 100);
            const stampsEarned = Math.floor(fullBookingPrice / stampPerGhs) * (isBirthdayMonth ? 2 : 1);
            const newStamps = currentStamps + stampsEarned;
            await supabase.from("clients" as any).update({
              loyalty_points: newStamps,
              total_spent: currentSpent + fullBookingPrice,
              total_visits: currentVisits + 1,
            }).eq("id", clientId);
            if (clientPhone) {
              const stampsForReward = Number((settings as any)?.loyalty_stamps_for_reward ?? 20);
              const rewardGhs = Number((settings as any)?.loyalty_reward_discount ?? 50);
              await sendSMS(clientPhone, SMS.checkoutComplete(
                booking.client_name || "Valued Client",
                booking.service_name || "service",
                fullBookingPrice.toFixed(0),
                newStamps,
                stampsForReward,
                rewardGhs,
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
          amount: paymentAmount,
          payment_method: "bank_transfer",
          status: "pending",
          client_name: booking.client_name || null,
          service_name: booking.service_name || null,
          client_id: booking.clients?.id || null,
          notes: notes || "Manual bank transfer (pending)",
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

      // Non-cash or bank_transfer via Paystack → initialize via edge function
      const callbackUrl =
        userRole === "owner"
          ? `${window.location.origin}/app/admin/checkout?booking=${booking.id}`
          : `${window.location.origin}/app/receptionist/checkout?booking=${booking.id}`;

      const { data, error } = await supabase.functions.invoke(
        "initialize-payment",
        {
          body: {
            email: booking.clients?.email,
            amount: paymentAmount,
            booking_id: booking.id,
            callback_url: callbackUrl,
            payment_method: paymentMethod,
            metadata: {
              booking_id: booking.id,
              client_name: booking.client_name,
              service_name: booking.service_name,
            },
          },
        }
      );

      if (error)
        throw new Error(error.message || "Payment initialization failed");

      if (!data?.authorization_url)
        throw new Error("Payment authorization URL missing");

      toast.success("Redirecting to payment...");
      window.open(data.authorization_url, "_blank");

      // mark UI as pending until webhook/verify updates payment_status
      setPending(true);
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="z-subtitle">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (!bookingId || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8 space-y-4">
            <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
              <Receipt className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold">No Booking Selected</h2>
            <p className="z-subtitle">
              Please select a booking from the bookings page to proceed with
              checkout.
            </p>
            <Button onClick={() => navigate(-1)} className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
        <Card className="max-w-lg w-full overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-8 text-center text-white">
            <div className="w-20 h-20 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-bold">Checkout Complete!</h2>
            <p className="text-white/80 mt-2">
              Service has been marked as completed
            </p>
          </div>

          <CardContent className="p-6 space-y-6">
            {/* Receipt Summary */}
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b">
                <span className="z-subtitle">Service</span>
                <span className="font-medium">{booking.service_name}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b">
                <span className="z-subtitle">Client</span>
                <span className="font-medium">{booking.client_name}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b">
                <span className="z-subtitle">Staff</span>
                <span className="font-medium">
                  {staff.find((s) => s.id === selectedStaff)?.name ||
                    "Assigned"}
                </span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b">
                <span className="z-subtitle">Payment Method</span>
                <span className="font-medium capitalize flex items-center gap-2">
                  {getPaymentIcon(paymentMethod)}
                  {paymentMethod === "mobile_money"
                    ? "Mobile Money"
                    : paymentMethod === "bank_transfer"
                    ? "Bank Transfer"
                    : paymentMethod.charAt(0).toUpperCase() +
                      paymentMethod.slice(1)}
                </span>
              </div>
              <div className="flex justify-between items-center text-lg">
                <span className="font-semibold">Total Paid</span>
                <span className="font-bold text-primary">
                  GH₵ {(originalPrice || Number(booking.services?.price ?? 0)).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Bookings
              </Button>
              <Button
                className="flex-1 bg-primary"
                onClick={() => {
                  setCompleted(false);
                  navigate(
                    userRole === "owner"
                      ? "/app/admin/bookings"
                      : "/app/receptionist/bookings"
                  );
                }}
              >
                Done
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (pending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
        <Card className="max-w-lg w-full overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-8 text-center text-white">
            <div className="w-20 h-20 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-bold">Payment Pending</h2>
            <p className="text-white/80 mt-2">
              Waiting for payment confirmation. This screen will update
              automatically when payment completes.
            </p>
          </div>

          <CardContent className="p-6 space-y-6">
            {/* Receipt Summary (same layout as Completed) */}
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b">
                <span className="z-subtitle">Service</span>
                <span className="font-medium">{booking.service_name}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b">
                <span className="z-subtitle">Client</span>
                <span className="font-medium">{booking.client_name}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b">
                <span className="z-subtitle">Staff</span>
                <span className="font-medium">
                  {staff.find((s) => s.id === selectedStaff)?.name ||
                    "Assigned"}
                </span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b">
                <span className="z-subtitle">Payment Method</span>
                <span className="font-medium capitalize flex items-center gap-2">
                  {getPaymentIcon(paymentMethod)}
                  {paymentMethod === "mobile_money"
                    ? "Mobile Money"
                    : paymentMethod === "bank_transfer"
                    ? "Bank Transfer"
                    : paymentMethod.charAt(0).toUpperCase() +
                      paymentMethod.slice(1)}
                </span>
              </div>
              <div className="flex justify-between items-center text-lg">
                <span className="font-semibold">Total Due</span>
                <span className="font-bold text-primary">
                  GH₵ {(originalPrice || Number(booking.services?.price ?? 0)).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Bookings
              </Button>
              <Button
                className="flex-1 bg-primary"
                onClick={() => {
                  setPending(false);
                  navigate(
                    userRole === "owner"
                      ? "/app/admin/bookings"
                      : "/app/receptionist/bookings"
                  );
                }}
              >
                Done
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const checkoutDisabled = processing || !selectedStaff;

  return (
    <div style={{ background:"#FAFAF8", minHeight:"100vh", padding:"clamp(14px,3vw,32px) clamp(12px,3vw,24px)" }}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Checkout</h1>
            <p className="z-subtitle">
              Complete the service and record payment
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Booking Details Card */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 border-b">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Booking Details
              </CardTitle>
            </div>
            <CardContent className="p-6 space-y-6">
              {/* Service */}
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Service
                </Label>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="font-semibold text-lg">
                    {booking.service_name}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <Badge variant="secondary">
                      {booking.services?.category || ""}
                    </Badge>
                    <span>{booking.services?.duration_minutes || ""} mins</span>
                  </div>
                </div>
              </div>

              {/* Client */}
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Client
                </Label>
                <div className="p-4 bg-muted/50 rounded-lg flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{booking.client_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {booking.clients?.phone || booking.client_phone || ""}
                    </p>
                  </div>
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Date
                  </Label>
                  <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">
                      {format(new Date(booking.preferred_date), "PPP")}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Time
                  </Label>
                  <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">
                      {booking.preferred_time}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Status
                </Label>
                <Badge
                  variant="outline"
                  className={`
                    ${
                      booking.status === "pending" &&
                      "border-blue-500 text-blue-600 bg-blue-50"
                    }
                    ${
                      booking.status === "confirmed" &&
                      "border-green-500 text-green-600 bg-green-50"
                    }
                    ${
                      booking.status === "completed" &&
                      "border-gray-500 text-gray-600 bg-cream"
                    }
                  `}
                >
                  {booking.status.charAt(0).toUpperCase() +
                    booking.status.slice(1)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Checkout Form Card */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 p-4 border-b">
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-green-600" />
                Complete Checkout
              </CardTitle>
              <CardDescription className="mt-1">
                Confirm payment and mark service as completed
              </CardDescription>
            </div>
            <CardContent className="p-6 space-y-6">
              {/* Assign Staff */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-primary" />
                  Assign Staff Member *
                </Label>
                <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        <div className="flex flex-col">
                          <span>{member.name}{absentStaffIds.has(member.id) ? " ⚠️ Absent" : ""}</span>
                          {member.specialization && (
                            <span className="text-xs text-muted-foreground">
                              {member.specialization}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Method */}
              <div className="space-y-3">
                <Label>Payment Method</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: "cash", name: "Cash", icon: Banknote },
                    { id: "mobile_money", name: "Mobile Money", icon: Smartphone },
                    { id: "card", name: "Card", icon: CreditCard },
                    { id: "bank_transfer", name: "Bank Transfer", icon: Building },
                  ].map((m) => {
                      const icon = m.icon;
                      const label = m.name;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() =>
                            setPaymentMethod(m.id as PaymentMethod)
                          }
                          className={`
                          p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2
                          ${
                            paymentMethod === m.id
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-muted hover:border-muted-foreground/50"
                          }
                        `}
                        >
                          {icon
                            ? (() => {
                                const Icon = icon as any;
                                return <Icon className="w-6 h-6" />;
                              })()
                            : null}
                          <span className="text-sm font-medium">{label}</span>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Amount (editable) */}
              <div className="space-y-2">
                <Label>Amount (GH₵)</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              {/* Price breakdown when booking present */}
              {booking && (
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>
                    Original price: GH₵{" "}
                    {Number(
                      originalPrice || booking.services?.price || 0
                    ).toFixed(2)}
                  </p>
                  {appliedPromo ? (
                    <p className="text-green-600 text-sm">Promo ({appliedPromo.code}): -GH₵{promoDiscount.toFixed(2)}</p>
                  ) : null}
                  {redeemedCard ? (
                    <p className="text-green-600 text-sm">Gift card: -GH₵{redeemedCard.value.toFixed(2)}</p>
                  ) : null}
                  <p className="font-medium">
                    Balance Due: GH₵{" "}
                    {(() => {
                      const base = Number(originalPrice) || 0;
                      const giftValue = redeemedCard?.value ?? 0;
                      const dep = depositPaid ? depositAmount : 0;
                      return Math.max(0, base - promoDiscount - giftValue - dep).toFixed(2);
                    })()}
                  </p>
                </div>
              )}

              {/* Redeem Gift Card */}
              <div className="space-y-2">
                <Label>Redeem Gift Card</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter gift card code"
                    value={giftCode}
                    onChange={(e) => setGiftCode(e.target.value)}
                  />
                  <Button
                    onClick={handleRedeemGiftCard}
                    disabled={redeeming || !giftCode || !selectedStaff}
                  >
                    {redeeming ? "Redeeming..." : "Redeem"}
                  </Button>
                </div>
                {redeemedCard && (
                  <p className="text-sm text-green-600">
                    Applied GH₵ {redeemedCard.value.toFixed(2)} (Card:{" "}
                    <span className="font-mono">{redeemedCard.id}</span>)
                  </p>
                )}
              </div>

              {/* Promo Code */}
              <div className="space-y-2">
                <Label>Promo Code</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter promo code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    disabled={!!appliedPromo}
                  />
                  {appliedPromo ? (
                    <Button variant="outline" onClick={() => {
                      setAppliedPromo(null);
                      setPromoDiscount(0);
                      setPromoCode("");
                      setAmount(String(Math.max(0, originalPrice - (redeemedCard?.value ?? 0)).toFixed(2)));
                    }}>Remove</Button>
                  ) : (
                    <Button onClick={handleApplyPromo} disabled={validatingPromo || !promoCode}>
                      {validatingPromo ? "Checking..." : "Apply"}
                    </Button>
                  )}
                </div>
                {appliedPromo && (
                  <p className="text-sm text-green-600">
                    ✓ {appliedPromo.code}: GH₵{promoDiscount.toFixed(2)} off
                    {appliedPromo.discount_type === "percentage" ? ` (${appliedPromo.discount_value}%)` : ""}
                  </p>
                )}
              </div>

              {/* Bank transfer options */}
              {paymentMethod === "bank_transfer" && (
                <div className="space-y-2 bg-muted p-3 rounded">
                  <Label>Bank Transfer Options</Label>
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="transfer_mode"
                        checked={usePaystackForTransfer}
                        onChange={() => setUsePaystackForTransfer(true)}
                      />
                      <span>Use Paystack transfer</span>
                    </label>

                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="transfer_mode"
                        checked={!usePaystackForTransfer}
                        onChange={() => setUsePaystackForTransfer(false)}
                      />
                      <span>Manual bank transfer</span>
                    </label>
                  </div>

                  {!usePaystackForTransfer && (
                    <div className="bg-background border p-3 rounded-md text-sm space-y-2">
                      {paymentInfo.bank_name ? (
                        <>
                          <div className="flex justify-between items-start gap-4">
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 flex-1">
                              <div>
                                <p className="font-medium">Bank</p>
                                <p className="text-sm">
                                  {paymentInfo.bank_name}
                                </p>
                              </div>
                              <div>
                                <p className="font-medium">Account Name</p>
                                <p className="text-sm">
                                  {paymentInfo.account_name}
                                </p>
                              </div>
                              <div>
                                <p className="font-medium">Account No</p>
                                <p className="text-sm">
                                  {paymentInfo.account_number}
                                </p>
                              </div>
                            </div>
                            <div className="flex-shrink-0">
                              <Dialog
                                open={showBankEditModal}
                                onOpenChange={setShowBankEditModal}
                              >
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowBankEditModal(true);
                                    }}
                                  >
                                    Edit
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md grid gap-4 p-6">
                                  <DialogHeader>
                                    <DialogTitle>
                                      Update Bank Details
                                    </DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-3 mt-2">
                                    <div>
                                      <Label>Bank Name</Label>
                                      <Input
                                        value={paymentForm.bank_name}
                                        onChange={(e) =>
                                          setPaymentForm({
                                            ...paymentForm,
                                            bank_name: e.target.value,
                                          })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label>Account Name</Label>
                                      <Input
                                        value={paymentForm.account_name}
                                        onChange={(e) =>
                                          setPaymentForm({
                                            ...paymentForm,
                                            account_name: e.target.value,
                                          })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label>Account Number</Label>
                                      <Input
                                        value={paymentForm.account_number}
                                        onChange={(e) =>
                                          setPaymentForm({
                                            ...paymentForm,
                                            account_number: e.target.value,
                                          })
                                        }
                                      />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        variant="outline"
                                        onClick={() =>
                                          setShowBankEditModal(false)
                                        }
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        onClick={async () => {
                                          // save
                                          try {
                                            //@ts-ignore
                                            const { error } = await supabase.from("payment_settings").upsert({
                                                id: paymentInfo.id || 1,
                                                bank_name:
                                                  paymentForm.bank_name,
                                                account_name:
                                                  paymentForm.account_name,
                                                account_number:
                                                  paymentForm.account_number,
                                              });
                                            if (error) throw error;
                                            setPaymentInfo({
                                              ...paymentInfo,
                                              ...paymentForm,
                                            });
                                            toast.success(
                                              "Bank details updated"
                                            );
                                            setShowBankEditModal(false);
                                          } catch (err: any) {
                                            toast.error(
                                              err.message ||
                                                "Failed to save bank details"
                                            );
                                          }
                                        }}
                                      >
                                        Save
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            A pending payment record will be created; confirm
                            when transfer completes.
                          </p>
                        </>
                      ) : (
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-gray-500">
                            No bank details available. Ask admin to configure
                            bank settings.
                          </p>
                          <Dialog
                            open={showBankEditModal}
                            onOpenChange={setShowBankEditModal}
                          >
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowBankEditModal(true);
                                }}
                              >
                                Add
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md grid gap-4 p-6">
                              <DialogHeader>
                                <DialogTitle>Update Bank Details</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-3 mt-2">
                                <div>
                                  <Label>Bank Name</Label>
                                  <Input
                                    value={paymentForm.bank_name}
                                    onChange={(e) =>
                                      setPaymentForm({
                                        ...paymentForm,
                                        bank_name: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <Label>Account Name</Label>
                                  <Input
                                    value={paymentForm.account_name}
                                    onChange={(e) =>
                                      setPaymentForm({
                                        ...paymentForm,
                                        account_name: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <Label>Account Number</Label>
                                  <Input
                                    value={paymentForm.account_number}
                                    onChange={(e) =>
                                      setPaymentForm({
                                        ...paymentForm,
                                        account_number: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    onClick={() => setShowBankEditModal(false)}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    onClick={async () => {
                                      try {
                                        //@ts-ignore
                                        const { error } = await supabase.from("payment_settings").upsert({
                                            id: paymentInfo.id || 1,
                                            bank_name: paymentForm.bank_name,
                                            account_name:
                                              paymentForm.account_name,
                                            account_number:
                                              paymentForm.account_number,
                                          });
                                        if (error) throw error;
                                        setPaymentInfo({
                                          ...paymentInfo,
                                          ...paymentForm,
                                        });
                                        toast.success("Bank details added");
                                        setShowBankEditModal(false);
                                      } catch (err: any) {
                                        toast.error(
                                          err.message ||
                                            "Failed to save bank details"
                                        );
                                      }
                                    }}
                                  >
                                    Save
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label>Additional Notes (Optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any notes about this checkout..."
                  className="min-h-[80px]"
                />
              </div>

              {/* Deposit Tracking */}
              <div className="p-4 rounded-lg border space-y-3" style={{background: "rgba(184,150,110,0.06)", borderColor: "rgba(184,150,110,0.25)"}}>
                <p className="text-xs font-semibold tracking-wider uppercase" style={{color:"#B8966E"}}>Deposit Tracking</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${depositPaid ? "bg-green-500" : "bg-amber-500"}`} />
                    <span className="text-sm">GHS {depositAmount} deposit</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${depositPaid ? "z-badge z-badge-green" : "bg-amber-100 text-amber-700"}`}>
                      {depositPaid ? "PAID" : "UNPAID"}
                    </span>
                    <button
                      onClick={() => setDepositPaid(d => !d)}
                      className="text-xs underline"
                      style={{color:"#B8966E", background:"none", border:"none", cursor:"pointer"}}
                    >{depositPaid ? "Mark Unpaid" : "Mark Paid"}</button>
                  </div>
                </div>
                {!depositPaid && (
                  <p className="text-xs text-muted-foreground">Balance due at checkout includes full service amount as deposit was not collected.</p>
                )}
                {depositPaid && (
                  <p className="text-xs text-green-600">Deposit collected. Balance due: GH₵ {Math.max(0, (Number(booking?.services?.price) || 0) - depositAmount).toFixed(2)}</p>
                )}
              </div>

              {/* Price Summary */}
              <div className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="z-subtitle">Service Price</span>
                  <span>GH₵ {Number(originalPrice || booking?.services?.price || 0).toFixed(2)}</span>
                </div>
                {appliedPromo && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Promo ({appliedPromo.code}){appliedPromo.discount_type === "percentage" ? ` (${appliedPromo.discount_value}%)` : ""}</span>
                    <span>- GH₵ {promoDiscount.toFixed(2)}</span>
                  </div>
                )}
                {redeemedCard && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Gift Card</span>
                    <span>- GH₵ {redeemedCard.value.toFixed(2)}</span>
                  </div>
                )}
                {depositPaid && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Deposit Paid (50%)</span>
                    <span>- GH₵ {depositAmount.toFixed(2)}</span>
                  </div>
                )}
                {!depositPaid && (
                  <div className="flex justify-between text-sm text-amber-600">
                    <span>50% Deposit</span>
                    <span>GH₵ {depositAmount.toFixed(2)} unpaid</span>
                  </div>
                )}
                <div className="border-t pt-3 flex justify-between text-lg">
                  <span className="font-semibold">Balance Due</span>
                  <span className="font-bold text-primary">
                    GH₵ {(() => {
                      const base = Number(originalPrice || booking?.services?.price || 0);
                      const dep = depositPaid ? depositAmount : 0;
                      return Math.max(0, base - promoDiscount - (redeemedCard?.value ?? 0) - dep).toFixed(2);
                    })()}
                  </span>
                </div>
              </div>

              {/* Checkout Button */}
              <Button
                onClick={handleCheckout}
                disabled={checkoutDisabled}
                style={{
                  width: "100%",
                  paddingTop: "1.5rem",
                  paddingBottom: "1.5rem",
                  fontSize: "1.125rem",
                  fontWeight: 600,
                  background: checkoutDisabled
                    ? "linear-gradient(90deg,#86efac,#34d399)"
                    : "linear-gradient(90deg,#10b981,#059669)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "0.375rem",
                  cursor: checkoutDisabled ? "not-allowed" : "pointer",
                }}
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Complete Checkout - GH₵{" "}
                    {(() => {
                      const base = Number(originalPrice || booking?.services?.price || 0);
                      const dep = depositPaid ? depositAmount : 0;
                      return Math.max(0, base - promoDiscount - (redeemedCard?.value ?? 0) - dep).toFixed(2);
                    })()}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
