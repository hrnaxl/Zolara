import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Calendar,
  Users,
  DollarSign,
  TrendingUp,
  Briefcase,
  Clock,
  History,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  subMonths,
  subDays,
  eachDayOfInterval,
  startOfDay,
  endOfDay,
} from "date-fns";
import { useSettings } from "@/context/SettingsContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { DonutChart } from "@/components/dashboard/DonutChart";
import { ActivityList } from "@/components/dashboard/ActivityList";
import { TopServiceCard } from "@/components/dashboard/TopServiceCard";
import { DateFilter, DateFilterType } from "@/components/dashboard/DateFilter";
import { PaymentMethodChart } from "@/components/dashboard/PaymentMethodChart";
import { TopStaffCard } from "@/components/dashboard/TopStaffCard";
import { UpcomingAppointments } from "@/components/dashboard/UpcomingAppointments";
import {
  AlertsPanel,
  generateAlerts,
  Alert,
} from "@/components/dashboard/AlertsPanel";
import { SyncStatus } from "@/components/dashboard/SyncStatus";
import { Loader2 } from "lucide-react";

interface DateRange {
  start: Date;
  end: Date;
}

const AdminDashboard = () => {
  const [dateFilter, setDateFilter] = useState<DateFilterType>("today");
  const [dateRange, setDateRange] = useState<DateRange>({
    start: startOfDay(new Date()),
    end: endOfDay(new Date()),
  });
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const [stats, setStats] = useState({
    todayBookings: 0,
    periodBookings: 0,
    todayRevenue: 0,
    periodRevenue: 0,
    weeklyRevenue: 0,
    monthlyRevenue: 0,
    totalClients: 0,
    activeStaff: 0,
    topService: "N/A",
    topServiceCount: 0,
    monthChangePercentage: 0,
    clientChangePercentage: 0,
    bookingChangePercentage: 0,
    pendingBookings: 0,
    pendingRequests: 0,
    pendingRevenue: 0,
    yesterdayBookings: 0,
    todayRevenueChange: 0,
    weeklyRevenueChange: 0,
    topServiceRevenue: 0,
    topServiceGrowth: 0,
    periodDeposits: 0,
    depositCount: 0,
    periodPromoSavings: 0,
    promoBreakdown: [] as { code: string; savings: number; count: number }[],
  });

  const [revenueData, setRevenueData] = useState<
    { name: string; revenue: number; bookings: number }[]
  >([]);
  const [bookingStatusData, setBookingStatusData] = useState<
    { name: string; value: number; color: string }[]
  >([]);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [paymentMethodData, setPaymentMethodData] = useState<any[]>([]);
  const [topStaff, setTopStaff] = useState<any[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [absentStaff, setAbsentStaff] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [bellOpen, setBellOpen] = useState(false);
  const { settings } = useSettings();

  useEffect(() => {
    fetchStats();
  }, [dateRange]);

  const handleFilterChange = (filter: DateFilterType, range: DateRange) => {
    setDateFilter(filter);
    setDateRange(range);
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      const today = new Date();
      const todayStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        0,
        0,
        0,
        0
      ).toISOString();

      const todayEnd = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        23,
        59,
        59,
        999
      ).toISOString();

      const periodStart = format(dateRange.start, "yyyy-MM-dd");
      const periodEnd = format(dateRange.end, "yyyy-MM-dd");
      const startOfThisWeek = format(
        startOfWeek(today, { weekStartsOn: 1 }),
        "yyyy-MM-dd"
      );
      const endOfThisWeek = format(
        endOfWeek(today, { weekStartsOn: 1 }),
        "yyyy-MM-dd"
      );
      const startOfThisMonth = format(startOfMonth(today), "yyyy-MM-dd");
      const endOfThisMonth = format(endOfMonth(today), "yyyy-MM-dd");
      const previousMonthStart = format(
        startOfMonth(subMonths(today, 1)),
        "yyyy-MM-dd"
      );
      const previousMonthEnd = format(
        endOfMonth(subMonths(today, 1)),
        "yyyy-MM-dd"
      );
      const yesterday = subDays(today, 1);
      const yesterdayStr = format(yesterday, "yyyy-MM-dd");
      const lastWeekStart = format(startOfWeek(subDays(today, 7), { weekStartsOn: 1 }), "yyyy-MM-dd");
      const lastWeekEnd = format(endOfWeek(subDays(today, 7), { weekStartsOn: 1 }), "yyyy-MM-dd");
      const yesterdayStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0, 0).toISOString();
      const yesterdayEnd = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999).toISOString();

      // Timestamp versions of period for sales table (uses created_at not preferred_date)
      const periodStartTs = new Date(dateRange.start.getFullYear(), dateRange.start.getMonth(), dateRange.start.getDate(), 0, 0, 0).toISOString();
      const periodEndTs = new Date(dateRange.end.getFullYear(), dateRange.end.getMonth(), dateRange.end.getDate(), 23, 59, 59, 999).toISOString();

      // Fetch all data in parallel
      const [
        todayBookingsRes,
        periodBookingsRes,
        todayPaymentsRes,
        periodPaymentsRes,
        weeklyPaymentsRes,
        monthlyPaymentsRes,
        previousMonthPaymentsRes,
        clientsRes,
        previousMonthClientsRes,
        staffRes,
        thisMonthServicesRes,
        allBookingsRes,
        recentBookingsRes,
        recentPaymentsRes,
        last30DaysPaymentsRes,
        pendingRequestsRes,
        upcomingBookingsRes,
        staffBookingsRes,
        completedBookingsPaymentsRes,
        todayAttendanceRes,
        yesterdayBookingsRes,
        yesterdayRevenueRes,
        lastWeekRevenueRes,
        thisMonthSalesByServiceRes,
        previousMonthServiceBookingsRes,
        depositsRes,
        promoSavingsRes,
      ] = await Promise.all([
        supabase
          .from("bookings")
          .select("id, status, preferred_date")
          .gte("preferred_date", format(today, "yyyy-MM-dd"))
          .lt("preferred_date", format(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1), "yyyy-MM-dd")),
        supabase
          .from("bookings")
          .select("*")
          .gte("preferred_date", periodStart)
          .lte("preferred_date", periodEnd),
        // Only consider completed payments when calculating revenue numbers
        // Only consider payments that are completed and are for bookings marked completed
        supabase
          .from("sales")
          .select("amount, payment_method, status, booking_id, client_name")
          .eq("status", "completed")
          .gte("created_at", todayStart)
          .lte("created_at", todayEnd),

        supabase
          .from("sales")
          .select("amount, payment_method, status, booking_id, client_name")
          .eq("status", "completed")
          .gte("created_at", periodStart)
          .lte("created_at", periodEnd),
        supabase
          .from("sales")
          .select("amount")
          .eq("status", "completed")
          .gte("created_at", startOfThisWeek)
          .lte("created_at", endOfThisWeek),
        supabase
          .from("sales")
          .select("amount")
          .eq("status", "completed")
          .gte("created_at", startOfThisMonth)
          .lte("created_at", endOfThisMonth),
        supabase
          .from("sales")
          .select("amount")
          .eq("status", "completed")
          .gte("created_at", previousMonthStart)
          .lte("created_at", previousMonthEnd),
        // @ts-ignore
        supabase
          .from("clients")
          .select("*", { count: "exact", head: true })
          ,
        supabase
          .from("clients")
          .select("*", { count: "exact" })
          .lte("created_at", previousMonthEnd), // @ts-ignore
        supabase.from("staff").select("*").eq("is_active", true),
        supabase
          .from("bookings")
          .select("service_name")
          .gte("preferred_date", startOfThisMonth)
          .lte("preferred_date", endOfThisMonth),
        // booking status distribution should reflect appointment dates in the month
        supabase
          .from("bookings")
          .select("status")
          .gte("preferred_date", startOfThisMonth)
          .lte("preferred_date", endOfThisMonth),
        supabase
          .from("bookings")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("sales")
          .select("id, amount, created_at, payment_method, client_name")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("sales")
          .select("amount, created_at")
          .gte("created_at", format(subDays(today, 30), "yyyy-MM-dd"))
          .eq("status", "completed"),
        supabase
          .from("bookings")
          .select("*", { count: "exact" })
          .eq("status", "pending"),
        supabase
          .from("bookings")
          .select("*")
          .eq("preferred_date", format(today, "yyyy-MM-dd"))
          .in("status", ["pending", "confirmed"])
          .order("preferred_date", { ascending: true })
          .order("preferred_time", { ascending: true })
          .limit(5),
        supabase
          .from("bookings")
          .select(
            "staff_id, staff(name, specialties), services(price)"
          )
          .gte("preferred_date", periodStart)
          .lte("preferred_date", periodEnd)
          .eq("status", "completed"),
        // Fetch completed bookings with nested payments to compute pending revenue (completed but unpaid)
        supabase
          .from("bookings")
          .select(
            "id, staff_id, price, status, client_name, service_name"
          )
          .gte("preferred_date", periodStart)
          .lte("preferred_date", periodEnd)
          .eq("status", "completed"),
        // fetch attendance for today by check_in timestamp range (not created_at equality)
        supabase
          .from("attendance")
          .select("staff_id")
          .gte("check_in", todayStart)
          .lte("check_in", todayEnd),
        // yesterday bookings count
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("preferred_date", yesterdayStr),
        // yesterday revenue
        supabase.from("sales").select("amount").eq("status", "completed").gte("created_at", yesterdayStart).lte("created_at", yesterdayEnd),
        // last week revenue
        supabase.from("sales").select("amount").eq("status", "completed").gte("created_at", lastWeekStart).lte("created_at", lastWeekEnd),
        // this month sales by service_name for top service revenue
        supabase.from("sales").select("amount, service_name").eq("status", "completed").gte("created_at", startOfThisMonth).lte("created_at", endOfThisMonth),
        // previous month top service bookings for growth
        supabase.from("bookings").select("service_name").gte("preferred_date", previousMonthStart).lte("preferred_date", previousMonthEnd),
        // deposits in hand: confirmed bookings with deposit paid, not yet checked out
        // These are collected but not yet revenue — shown as "pending revenue" on dashboard
        supabase.from("bookings" as any).select("deposit_amount").eq("deposit_paid", true).in("status", ["confirmed", "pending"]),
        // promo savings this period
        (supabase as any).from("sales").select("promo_code, promo_discount").gte("created_at", periodStartTs).lte("created_at", periodEndTs).not("promo_discount", "is", null),
      ]);

      // Calculate stats
      const todayRevenue =
        todayPaymentsRes.data?.reduce((sum, p) => sum + Number(p.amount), 0) ||
        0;
      const periodRevenue =
        periodPaymentsRes.data?.reduce((sum, p) => sum + Number(p.amount), 0) ||
        0;
      const weeklyRevenue =
        weeklyPaymentsRes.data?.reduce((sum, p) => sum + Number(p.amount), 0) ||
        0;
      const monthlyRevenue =
        monthlyPaymentsRes.data?.reduce(
          (sum, p) => sum + Number(p.amount),
          0
        ) || 0;
      const previousMonthRevenue =
        previousMonthPaymentsRes.data?.reduce(
          (sum, p) => sum + Number(p.amount),
          0
        ) || 0;

      // Pending revenue: bookings that are marked completed but have no completed payment recorded
      const completedBookings = completedBookingsPaymentsRes.data || [];
      const pendingRevenue = completedBookings.reduce((sum: number, b: any) => {
        const payments: any[] = b.payments || [];
        const hasCompletedPayment = payments.some(
          (p) => p && p.status === "completed"
        );
        if (!hasCompletedPayment) {
          // treat full service price as pending (partial-pay scenarios can be refined later)
          return sum + Number(b.services?.price || 0);
        }
        return sum;
      }, 0);

      // Client growth calculation
      const totalClients = clientsRes.count || 0;
      const previousMonthClients = previousMonthClientsRes.count || 0;
      const clientChangePercentage =
        previousMonthClients > 0
          ? ((totalClients - previousMonthClients) / previousMonthClients) * 100
          : 0;

      // Revenue change percentage
      const monthChangePercentage =
        previousMonthRevenue > 0
          ? ((monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) *
            100
          : 0;

      // Yesterday comparisons
      const yesterdayBookingsCount = yesterdayBookingsRes.count || 0;
      const yesterdayRevenue = yesterdayRevenueRes.data?.reduce((s, p) => s + Number(p.amount), 0) || 0;
      const lastWeekRevenue = lastWeekRevenueRes.data?.reduce((s, p) => s + Number(p.amount), 0) || 0;
      const todayRevenueChange = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0;
      const weeklyRevenueChange = lastWeekRevenue > 0 ? ((weeklyRevenue - lastWeekRevenue) / lastWeekRevenue) * 100 : 0;
      const bookingChangePercentage = yesterdayBookingsCount > 0
        ? (((todayBookingsRes.data?.length || 0) - yesterdayBookingsCount) / yesterdayBookingsCount) * 100
        : 0;

      // Top service
      const serviceCounts = thisMonthServicesRes.data?.reduce(
        (acc: any, booking: any) => {
          const serviceName = (booking as any).service_name || "Unknown";
          acc[serviceName] = (acc[serviceName] || 0) + 1;
          return acc;
        },
        {}
      );
      const topServiceEntry = serviceCounts
        ? Object.entries(serviceCounts).sort((a: any, b: any) => b[1] - a[1])[0]
        : null;
      const topServiceName = (topServiceEntry?.[0] as string) || null;
      // Revenue generated by top service this month
      const topServiceRevenue = topServiceName
        ? (thisMonthSalesByServiceRes.data || [])
            .filter((p: any) => p.service_name === topServiceName)
            .reduce((s: number, p: any) => s + Number(p.amount), 0)
        : 0;
      // Growth: compare bookings this month vs last month for same service
      const prevMonthServiceCounts = previousMonthServiceBookingsRes.data?.reduce((acc: any, b: any) => {
        const n = b.service_name || "Unknown"; acc[n] = (acc[n] || 0) + 1; return acc;
      }, {}) || {};
      const prevTopCount = topServiceName ? (prevMonthServiceCounts[topServiceName] || 0) : 0;
      const topServiceGrowth = prevTopCount > 0
        ? (((topServiceEntry?.[1] as number || 0) - prevTopCount) / prevTopCount) * 100
        : 0;

      // Booking status distribution
      const statusCounts = allBookingsRes.data?.reduce((acc: any, b: any) => {
        acc[b.status] = (acc[b.status] || 0) + 1;
        return acc;
      }, {});

      const statusColors: Record<string, string> = {
        scheduled: "hsl(210, 80%, 52%)",
        confirmed: "hsl(152, 60%, 42%)",
        completed: "hsl(220, 10%, 50%)",
        cancelled: "hsl(0, 72%, 55%)",
        no_show: "hsl(38, 92%, 50%)",
      };

      const bookingStatusData = statusCounts
        ? Object.entries(statusCounts).map(([name, value]) => ({
            name:
              name.charAt(0).toUpperCase() + name.slice(1).replace("_", " "),
            value: value as number,
            color: statusColors[name] || "hsl(220, 10%, 50%)",
          }))
        : [];

      // Last 30 days revenue chart
      const last30Days = eachDayOfInterval({
        start: subDays(today, 30),
        end: today,
      });

      const revenueByDay = last30DaysPaymentsRes.data?.reduce(
        (acc: any, p: any) => {
          const day = format(new Date(p.created_at), "yyyy-MM-dd");
          acc[day] = (acc[day] || 0) + Number(p.amount);
          return acc;
        },
        {}
      );

      const revenueChartData = last30Days.map((day) => ({
        name: format(day, "MMM d"),
        revenue: revenueByDay?.[format(day, "yyyy-MM-dd")] || 0,
        bookings: 0,
      }));

      // Payment method breakdown — use todayPaymentsRes when filter is "today" since
      // periodPaymentsRes uses date-string comparison which cuts off intraday timestamps
      const breakdownSource = dateFilter === "today" ? todayPaymentsRes.data : periodPaymentsRes.data;
      const paymentMethods = breakdownSource?.reduce(
        (acc: any, p: any) => {
          const method = p.payment_method || "cash";
          if (!acc[method]) {
            acc[method] = { amount: 0, count: 0 };
          }
          acc[method].amount += Number(p.amount);
          acc[method].count += 1;
          return acc;
        },
        {}
      );

      const totalPaymentAmount =
        dateFilter === "today" ? todayRevenue : periodRevenue || 1;

      const paymentMethodBreakdown = paymentMethods
        ? Object.entries(paymentMethods)
            .map(([method, data]: [string, any]) => ({
              method,
              amount: data.amount,
              count: data.count,
              percentage: (data.amount / totalPaymentAmount) * 100,
            }))
            .sort((a: any, b: any) => b.amount - a.amount)
        : [];

      console.log("Payment method breakdown", paymentMethodBreakdown);

      // Top performing staff — attribute revenue only from completed payments tied to bookings
      const staffPerformance = staffBookingsRes.data?.reduce(
        (acc: any, booking: any) => {
          if (!booking.staff_id || !booking.staff) return acc;
          const staffId = booking.staff_id;
          if (!acc[staffId]) {
            acc[staffId] = {
              id: staffId,
              name: booking.staff?.name,
              specialization: booking.staff?.specialization,
              bookings: 0,
              revenue: 0,
            };
          }
          acc[staffId].bookings += 1;
          // Sum only completed payments with a payment_method to ensure accurate sales attribution
          const payments: any[] = booking.payments || [];
          const paidAmount = payments.reduce((s, p) => {
            if (p && p.status === "completed" && p.payment_method) {
              return s + Number(p.amount || 0);
            }
            return s;
          }, 0);
          acc[staffId].revenue += paidAmount;
          return acc;
        },
        {}
      );

      const topStaffList = staffPerformance
        ? Object.values(staffPerformance)
            .sort((a: any, b: any) => b.bookings - a.bookings)
            .slice(0, 5)
        : [];

      // Upcoming appointments
      const upcomingList =
        upcomingBookingsRes.data?.map((b: any) => ({
          id: b.id,
          clientName: b.client_name || "Unknown",
          serviceName: b.service_name || "Service",
          date: b.preferred_date,
          time: b.preferred_time,
          status: b.status,
        })) || [];

      // Check for absent staff
      const checkedInStaffIds =
        todayAttendanceRes.data?.map((a: any) => a.staff_id) || [];
      const allActiveStaff = staffRes.data || [];
      const absentStaffNames = allActiveStaff
        .filter((s: any) => !checkedInStaffIds.includes(s.id))
        .map((s: any) => s.name);

      // Pending bookings count
      const pendingBookings =
        todayBookingsRes.data?.filter(
          (b) => b.status === "pending" || b.status === "confirmed"
        ).length || 0;

      // Generate alerts
      const generatedAlerts = generateAlerts({
        todayBookings: todayBookingsRes.data?.length || 0,
        pendingRequests: pendingRequestsRes.count || 0,
        absentStaff: absentStaffNames,
        lowBookingThreshold: 3,
      });

      // Deposits in hand: confirmed bookings with deposit paid, not yet checked out
      // This is money collected but not yet earned revenue — useful operational view
      const periodDeposits = depositsRes.data?.reduce((s: number, b: any) => s + Number(b.deposit_amount || 0), 0) || 0;
      const depositCount = depositsRes.data?.length || 0;

      // Promo savings breakdown
      const promoMap: Record<string, { savings: number; count: number }> = {};
      (promoSavingsRes.data || []).forEach((s: any) => {
        if (!s.promo_code || !s.promo_discount) return;
        if (!promoMap[s.promo_code]) promoMap[s.promo_code] = { savings: 0, count: 0 };
        promoMap[s.promo_code].savings += Number(s.promo_discount);
        promoMap[s.promo_code].count += 1;
      });
      const promoBreakdown = Object.entries(promoMap).map(([code, v]) => ({ code, ...v })).sort((a, b) => b.savings - a.savings);
      const periodPromoSavings = promoBreakdown.reduce((s, p) => s + p.savings, 0);

      setStats({
        todayBookings: todayBookingsRes.data?.length || 0,
        periodBookings: periodBookingsRes.data?.length || 0,
        todayRevenue,
        periodRevenue,
        weeklyRevenue,
        monthlyRevenue,
        totalClients,
        activeStaff: allActiveStaff.length,
        topService: (topServiceEntry?.[0] as string) || "N/A",
        topServiceCount: (topServiceEntry?.[1] as number) || 0,
        monthChangePercentage: Number(monthChangePercentage.toFixed(1)),
        clientChangePercentage: Number(clientChangePercentage.toFixed(1)),
        bookingChangePercentage: Number(bookingChangePercentage.toFixed(1)),
        pendingBookings,
        pendingRequests: pendingRequestsRes.count || 0,
        pendingRevenue,
        yesterdayBookings: yesterdayBookingsCount,
        todayRevenueChange: Number(todayRevenueChange.toFixed(1)),
        weeklyRevenueChange: Number(weeklyRevenueChange.toFixed(1)),
        topServiceRevenue,
        topServiceGrowth: Number(topServiceGrowth.toFixed(1)),
        periodDeposits,
        depositCount,
        periodPromoSavings,
        promoBreakdown,
      });

      setRevenueData(revenueChartData);
      setBookingStatusData(bookingStatusData);
      setPaymentMethodData(paymentMethodBreakdown);
      setTopStaff(topStaffList as any[]);
      setUpcomingAppointments(upcomingList);
      setAlerts(generatedAlerts);
      setAbsentStaff(absentStaffNames);

      // Format recent bookings
      setRecentBookings(
        recentBookingsRes.data?.map((b) => ({
          id: b.id,
          title: b.service_name || "Service",
          subtitle: b.client_name || "Client",
          date: b.created_at,
          status: b.status,
        })) || []
      );

      // Format recent payments
      setRecentPayments(
        recentPaymentsRes.data?.map((p) => ({
          id: p.id,
          title: (p.bookings as any)?.services?.name || "Payment",
          date: p.created_at,
          amount: Number(p.amount),
        })) || []
      );

      setLastSync(new Date());
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const getFilterLabel = () => {
    switch (dateFilter) {
      case "today":
        return "Today";
      case "week":
        return "This Week";
      case "month":
        return "This Month";
      case "custom":
        return `${format(dateRange.start, "MMM d")} - ${format(
          dateRange.end,
          "MMM d"
        )}`;
      default:
        return "";
    }
  };


  // ── RENDER ──────────────────────────────────────────────────────
  const G       = "#B8975A";
  const G_LIGHT = "#F5ECD6";
  const CREAM   = "#FAFAF8";
  const WHITE   = "#FFFFFF";
  const BORDER  = "#EDEBE5";
  const NAVY    = "#0F1E35";
  const TXT     = "#1C1917";
  const TXT_MID = "#78716C";
  const TXT_SOFT= "#A8A29E";
  const SHADOW  = "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)";
  const SHADOW_MD = "0 2px 8px rgba(0,0,0,0.06), 0 12px 36px rgba(0,0,0,0.1)";

  const statusTotal = bookingStatusData.reduce((s, d) => s + d.value, 0);
  const SLOT_COLORS = ["#4A90D9","#4CAF7D","#E05A5A","#C9A84C","#9B7FCB"];

  // Donut
  const DONUT_R = 70, DONUT_CX = 88, DONUT_CY = 88;
  let cumDeg = -90;
  const donutPaths = bookingStatusData.map((d, i) => {
    const sweep = statusTotal > 0 ? (d.value / statusTotal) * 360 : 0;
    const s = (cumDeg * Math.PI) / 180;
    const e = ((cumDeg + sweep) * Math.PI) / 180;
    cumDeg += sweep;
    const x1 = DONUT_CX + DONUT_R * Math.cos(s);
    const y1 = DONUT_CY + DONUT_R * Math.sin(s);
    const x2 = DONUT_CX + DONUT_R * Math.cos(e);
    const y2 = DONUT_CY + DONUT_R * Math.sin(e);
    return { ...d, path: `M${DONUT_CX},${DONUT_CY} L${x1.toFixed(2)},${y1.toFixed(2)} A${DONUT_R},${DONUT_R} 0 ${sweep > 180 ? 1 : 0},1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`, color: SLOT_COLORS[i % SLOT_COLORS.length] };
  });

  // Sparkline
  const spark7 = revenueData.slice(-7);
  const SW = 340, SH = 80, PAD = 12;
  const maxV = Math.max(...spark7.map(d => d.revenue), 1);
  const spPts = spark7.map((d, i) => ({
    x: PAD + (i / Math.max(spark7.length - 1, 1)) * (SW - PAD * 2),
    y: SH - PAD - (d.revenue / maxV) * (SH - PAD * 2),
  }));
  const bezier = spPts.map((p, i) => {
    if (i === 0) return `M${p.x},${p.y}`;
    const prev = spPts[i - 1];
    const cx = (prev.x + p.x) / 2;
    return `C${cx},${prev.y} ${cx},${p.y} ${p.x},${p.y}`;
  }).join(" ");
  const areaPath = spPts.length > 1
    ? `${bezier} L${spPts[spPts.length-1].x},${SH} L${spPts[0].x},${SH} Z`
    : "";

  const filterLabel = getFilterLabel();

  if (loading && !lastSync) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"60vh", background: CREAM }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ width:"36px", height:"36px", borderRadius:"50%", border:`2.5px solid ${G_LIGHT}`, borderTopColor: G, margin:"0 auto 14px", animation:"spin 0.9s linear infinite" }} />
          <p style={{ fontFamily:"Montserrat,sans-serif", fontSize:"10px", letterSpacing:"0.18em", color: TXT_SOFT, textTransform:"uppercase" }}>Loading</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: CREAM, minHeight:"100vh", padding:"32px 36px", fontFamily:"Montserrat,sans-serif", color: TXT }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box}
        .zc{background:${WHITE};border:1px solid ${BORDER};border-radius:16px;padding:24px;box-shadow:${SHADOW};transition:box-shadow 0.2s,transform 0.2s}
        .zc:hover{box-shadow:${SHADOW_MD};transform:translateY(-1px)}
        .zc-flat{background:${WHITE};border:1px solid ${BORDER};border-radius:16px;padding:24px;box-shadow:${SHADOW}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .au{animation:up 0.35s ease both}
      `}</style>

      {/* ── HEADER ─────────────────────────────────────── */}
      <div className="au" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"28px" }}>
        <div>
          <p style={{ fontSize:"11px", fontWeight:600, letterSpacing:"0.16em", color: G, marginBottom:"6px", textTransform:"uppercase" }}>
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
          <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(32px,4vw,48px)", fontWeight:700, color: TXT, margin:0, lineHeight:1, letterSpacing:"-0.02em" }}>
            Dashboard
          </h1>
          <p style={{ fontSize:"12px", color: TXT_SOFT, marginTop:"6px", fontWeight:400 }}>
            Welcome back. Here's your overview for today.
          </p>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          {/* Period pills */}
          <div style={{ display:"flex", background: WHITE, border:`1px solid ${BORDER}`, borderRadius:"24px", padding:"3px", boxShadow: SHADOW }}>
            {(["today","week","month"] as const).map(f => {
              const labels = { today:"Today", week:"Week", month:"Month" };
              return (
                <button key={f} onClick={() => {
                  const n = new Date();
                  const map = {
                    today: { start: startOfDay(n), end: endOfDay(n) },
                    week:  { start: startOfWeek(n), end: endOfWeek(n) },
                    month: { start: startOfMonth(n), end: endOfMonth(n) },
                  };
                  handleFilterChange(f, map[f]);
                }} style={{
                  fontFamily:"Montserrat,sans-serif", fontSize:"11px", fontWeight:600,
                  letterSpacing:"0.05em", padding:"7px 16px", borderRadius:"20px",
                  border:"none", cursor:"pointer", transition:"all 0.15s",
                  background: dateFilter===f ? NAVY : "transparent",
                  color: dateFilter===f ? "#fff" : TXT_MID,
                }}>{labels[f]}</button>
              );
            })}
          </div>

          <button onClick={fetchStats} title="Refresh"
            style={{ width:"38px", height:"38px", borderRadius:"50%", background: WHITE, border:`1px solid ${BORDER}`, boxShadow: SHADOW, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color: TXT_MID, fontSize:"16px", transition:"all 0.2s" }}>
            <span style={{ display:"inline-block", animation: loading ? "spin 0.9s linear infinite" : "none" }}>↻</span>
          </button>

          <div style={{ position:"relative" }}>
            <button onClick={() => setBellOpen(o => !o)}
              style={{ width:"38px", height:"38px", borderRadius:"50%", background: WHITE, border:`1px solid ${BORDER}`, boxShadow: SHADOW, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"15px", transition:"all 0.2s" }}>🔔</button>
            {(stats.pendingRequests > 0 || alerts.length > 0) && (
              <div style={{ position:"absolute", top:"-2px", right:"-2px", minWidth:"16px", height:"16px", borderRadius:"8px", background:"#EF4444", border:"2px solid #fff", display:"flex", alignItems:"center", justifyContent:"center", padding:"0 3px" }}>
                <span style={{ fontSize:"8px", fontWeight:700, color:"#fff" }}>{stats.pendingRequests + alerts.length}</span>
              </div>
            )}
            {bellOpen && createPortal(
              <div style={{ position:"fixed", top:"70px", right:"36px", width:"300px", background: WHITE, borderRadius:"16px", boxShadow:"0 8px 40px rgba(0,0,0,0.14)", border:`1px solid ${BORDER}`, zIndex:999999, overflow:"hidden" }}>
                <div style={{ padding:"14px 18px", borderBottom:`1px solid ${BORDER}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontWeight:700, fontSize:"13px" }}>Notifications</span>
                  <span onClick={() => setBellOpen(false)} style={{ cursor:"pointer", color: TXT_SOFT }}>✕</span>
                </div>
                <div style={{ maxHeight:"340px", overflowY:"auto" }}>
                  {alerts.filter(a => a.type !== "success").map((a, i) => (
                    <div key={i} style={{ padding:"13px 18px", borderBottom:`1px solid ${BORDER}`, display:"flex", gap:"10px" }}>
                      <span style={{ fontSize:"16px" }}>{a.type === "warning" ? "⚠️" : "ℹ️"}</span>
                      <span style={{ fontSize:"12px", color: TXT_MID, lineHeight:1.5 }}>{a.message}</span>
                    </div>
                  ))}
                  {alerts.every(a => a.type === "success") && stats.pendingRequests === 0 && (
                    <div style={{ padding:"28px 18px", textAlign:"center", color: TXT_SOFT, fontSize:"12px" }}>All clear. No notifications.</div>
                  )}
                </div>
              </div>
            , document.body)}
          </div>
        </div>
      </div>

      {/* ── KPI ROW ──────────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"14px", marginBottom:"14px" }} className="admin-grid-4">
        {[
          { label:"TODAY'S BOOKINGS", val: String(stats.todayBookings),
            pct: stats.bookingChangePercentage, note:"vs yesterday", color:"#4A90D9", bg:"#EFF6FF" },
          { label:"TODAY'S REVENUE",  val:`GHS ${stats.todayRevenue.toLocaleString("en",{minimumFractionDigits:2})}`,
            pct: stats.todayRevenueChange, note:"vs yesterday", color:"#16A34A", bg:"#F0FDF4" },
          { label:"WEEKLY REVENUE",   val:`GHS ${stats.weeklyRevenue.toLocaleString("en",{minimumFractionDigits:2})}`,
            pct: stats.weeklyRevenueChange, note:"vs last week", color: G, bg: G_LIGHT },
          { label:"MONTHLY REVENUE",  val:`GHS ${stats.monthlyRevenue.toLocaleString("en",{minimumFractionDigits:2})}`,
            pct: stats.monthChangePercentage, note:"vs last month", color:"#7C3AED", bg:"#F5F3FF" },
        ].map((c, i) => (
          <div key={i} className="zc au" style={{ animationDelay:`${i*0.06}s` }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"16px" }}>
              <span style={{ fontSize:"9px", fontWeight:700, letterSpacing:"0.18em", color: TXT_SOFT }}>{c.label}</span>
              <div style={{ width:"8px", height:"8px", borderRadius:"50%", background: c.color }} />
            </div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(20px,2vw,28px)", fontWeight:700, color: TXT, lineHeight:1.1, marginBottom:"14px" }}>{c.val}</div>
            <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
              <span style={{ display:"inline-flex", alignItems:"center", gap:"3px", fontSize:"11px", fontWeight:700, padding:"2px 8px", borderRadius:"12px", background: c.bg, color: c.color }}>
                {c.pct === 0 ? "—" : c.pct > 0 ? `↑ +${c.pct}%` : `↓ ${c.pct}%`}
              </span>
              <span style={{ fontSize:"10px", color: TXT_SOFT }}>{c.note}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── SECONDARY KPI ─────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"14px", marginBottom:"14px" }} className="admin-grid-3">
        {[
          { label:"TOTAL CLIENTS",   val: stats.totalClients.toLocaleString(), sub:`${stats.clientChangePercentage >= 0 ? "+" : ""}${stats.clientChangePercentage}% this month` },
          { label:"ACTIVE STAFF",    val: stats.activeStaff, sub:"On roster" },
          { label:"PENDING",         val: stats.pendingBookings + stats.pendingRequests, sub:"Need attention" },
        ].map((c, i) => (
          <div key={i} className="zc-flat au" style={{ animationDelay:`${0.24 + i*0.06}s`, display:"flex", alignItems:"center", gap:"18px" }}>
            <div style={{ width:"48px", height:"48px", borderRadius:"14px", background: G_LIGHT, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"22px", fontWeight:700, color: G }}>{c.val}</span>
            </div>
            <div>
              <div style={{ fontSize:"9px", fontWeight:700, letterSpacing:"0.16em", color: TXT_SOFT, marginBottom:"4px" }}>{c.label}</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"26px", fontWeight:700, color: TXT, lineHeight:1 }}>{c.val}</div>
              {c.sub && <div style={{ fontSize:"10px", color: TXT_SOFT, marginTop:"3px" }}>{c.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* ── DEPOSITS + PROMO SAVINGS ──────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px", marginBottom:"14px" }} className="admin-grid-2">

        {/* DEPOSITS CARD */}
        <div className="zc-flat au" style={{ animationDelay:"0.36s", padding:"24px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"16px" }}>
            <span style={{ fontSize:"9px", fontWeight:700, letterSpacing:"0.18em", color: TXT_SOFT }}>DEPOSITS IN HAND</span>
            <span style={{ fontSize:"16px" }}>🔒</span>
          </div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(22px,2vw,30px)", fontWeight:700, color: TXT, marginBottom:"6px" }}>
            GHS {stats.periodDeposits.toLocaleString("en", { minimumFractionDigits:2 })}
          </div>
          <div style={{ fontSize:"11px", color: TXT_SOFT }}>
            {stats.depositCount} confirmed booking{stats.depositCount !== 1 ? "s" : ""} awaiting checkout
          </div>
          <div style={{ marginTop:"12px", fontSize:"10px", color:"rgba(200,169,126,0.6)", fontStyle:"italic" }}>
            Not counted as revenue yet. Added to revenue at checkout.
          </div>
        </div>

        {/* PROMO SAVINGS CARD */}
        <div className="zc-flat au" style={{ animationDelay:"0.39s", padding:"24px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"16px" }}>
            <span style={{ fontSize:"9px", fontWeight:700, letterSpacing:"0.18em", color: TXT_SOFT }}>PROMO SAVINGS GIVEN · {filterLabel}</span>
            <span style={{ fontSize:"16px" }}>🎟️</span>
          </div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(22px,2vw,30px)", fontWeight:700, color: TXT, marginBottom:"6px" }}>
            GHS {stats.periodPromoSavings.toLocaleString("en", { minimumFractionDigits:2 })}
          </div>
          {stats.promoBreakdown.length === 0 ? (
            <div style={{ fontSize:"11px", color: TXT_SOFT }}>No promo codes used this period.</div>
          ) : (
            <div style={{ marginTop:"8px", display:"flex", flexDirection:"column", gap:"6px" }}>
              {stats.promoBreakdown.map((p) => (
                <div key={p.code} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"6px 10px", borderRadius:"8px", background: G_LIGHT }}>
                  <div>
                    <span style={{ fontSize:"11px", fontWeight:700, color: G, fontFamily:"monospace" }}>{p.code}</span>
                    <span style={{ fontSize:"10px", color: TXT_SOFT, marginLeft:"8px" }}>{p.count} use{p.count !== 1 ? "s" : ""}</span>
                  </div>
                  <span style={{ fontSize:"12px", fontWeight:700, color: TXT }}>− GHS {p.savings.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── TOP SERVICE BANNER ────────────────────────────── */}
      <div className="au" style={{ animationDelay:"0.42s", position:"relative", borderRadius:"16px", overflow:"hidden", marginBottom:"14px", padding:"24px 32px", background:`linear-gradient(120deg, ${NAVY} 0%, #1E3558 100%)` }}>
        <div style={{ position:"absolute", top:"-40px", right:"120px", width:"160px", height:"160px", borderRadius:"50%", background:"rgba(201,168,76,0.08)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:"-50px", right:"-20px", width:"140px", height:"140px", borderRadius:"50%", background:"rgba(255,255,255,0.04)", pointerEvents:"none" }} />
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"16px" }}>
          <div>
            <div style={{ fontSize:"9px", fontWeight:700, letterSpacing:"0.2em", color:"rgba(201,168,76,0.7)", marginBottom:"8px" }}>TOP SERVICE THIS PERIOD</div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(18px,2.5vw,24px)", fontWeight:700, color:"#fff", marginBottom:"4px" }}>
              {stats.topService === "N/A" ? "No data yet" : stats.topService}
            </div>
          </div>
          <div style={{ display:"flex", gap:"40px" }}>
            {[
              { l:"BOOKINGS",  v: stats.topServiceCount },
              { l:"REVENUE",   v:`GHS ${stats.topServiceRevenue.toLocaleString("en",{minimumFractionDigits:0})}` },
              { l:"GROWTH",    v: stats.topServiceGrowth === 0 ? "—" : stats.topServiceGrowth >= 0 ? `+${stats.topServiceGrowth}%` : `${stats.topServiceGrowth}%` },
            ].map((s, i) => (
              <div key={i}>
                <div style={{ fontSize:"8px", fontWeight:700, letterSpacing:"0.18em", color:"rgba(255,255,255,0.4)", marginBottom:"6px" }}>{s.l}</div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"20px", fontWeight:700, color: G }}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CHARTS ROW ───────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"3fr 2fr", gap:"14px", marginBottom:"14px" }} className="admin-grid-3fr-2fr">

        {/* Revenue trend */}
        <div className="zc au" style={{ animationDelay:"0.48s", padding:"28px" }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"20px" }}>
            <div>
              <div style={{ fontSize:"9px", fontWeight:700, letterSpacing:"0.18em", color: TXT_SOFT, marginBottom:"5px" }}>REVENUE TREND</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"20px", fontWeight:600, color: TXT }}>Last 7 Days</div>
            </div>
          </div>
          <svg width="100%" viewBox={`0 0 ${SW} ${SH}`} style={{ overflow:"visible", display:"block" }}>
            <defs>
              <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={G} stopOpacity="0.15" />
                <stop offset="100%" stopColor={G} stopOpacity="0.01" />
              </linearGradient>
            </defs>
            {spPts.length > 1 && (
              <>
                <path d={areaPath} fill="url(#ag)" />
                <path d={bezier} fill="none" stroke={G} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                {spPts.map((p, i) => (
                  <g key={i}>
                    <circle cx={p.x} cy={p.y} r="4.5" fill="#fff" stroke={G} strokeWidth="2" />
                    <circle cx={p.x} cy={p.y} r="1.8" fill={G} />
                  </g>
                ))}
              </>
            )}
            {spPts.length === 0 && <text x={SW/2} y={SH/2} textAnchor="middle" fill={TXT_SOFT} fontSize="11" fontFamily="Montserrat">No revenue data</text>}
          </svg>
          {spark7.length > 0 && (
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:"8px", paddingLeft:`${PAD}px`, paddingRight:`${PAD}px` }}>
              {spark7.map((d, i) => <span key={i} style={{ fontSize:"9px", color: TXT_SOFT }}>{d.name}</span>)}
            </div>
          )}
        </div>

        {/* Booking status donut */}
        <div className="zc au" style={{ animationDelay:"0.54s", padding:"28px" }}>
          <div style={{ fontSize:"9px", fontWeight:700, letterSpacing:"0.18em", color: TXT_SOFT, marginBottom:"5px" }}>BOOKING STATUS</div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"20px", fontWeight:600, color: TXT, marginBottom:"20px" }}>Distribution</div>
          <div style={{ display:"flex", alignItems:"center", gap:"16px" }}>
            <svg width="176" height="176" viewBox="0 0 176 176" style={{ flexShrink:0 }}>
              {donutPaths.length > 0 ? donutPaths.map((s, i) => (
                <path key={i} d={s.path} fill={s.color} opacity="0.9" />
              )) : <circle cx="88" cy="88" r="70" fill={G_LIGHT} />}
              <circle cx="88" cy="88" r="44" fill={WHITE} />
              <text x="88" y="83" textAnchor="middle" fill={TXT_SOFT} fontSize="8" fontFamily="Montserrat" fontWeight="700" letterSpacing="2">TOTAL</text>
              <text x="88" y="102" textAnchor="middle" fill={TXT} fontSize="24" fontFamily="Cormorant Garamond" fontWeight="700">
                {statusTotal}
              </text>
            </svg>
            <div style={{ display:"flex", flexDirection:"column", gap:"10px", flex:1 }}>
              {bookingStatusData.length === 0
                ? <span style={{ fontSize:"11px", color: TXT_SOFT }}>No bookings yet</span>
                : bookingStatusData.map((d, i) => (
                  <div key={i}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"4px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:"7px" }}>
                        <div style={{ width:"7px", height:"7px", borderRadius:"50%", background: SLOT_COLORS[i % SLOT_COLORS.length] }} />
                        <span style={{ fontSize:"11px", color: TXT_MID, fontWeight:500 }}>{d.name}</span>
                      </div>
                      <span style={{ fontSize:"12px", fontWeight:700, color: TXT }}>{d.value}</span>
                    </div>
                    <div style={{ height:"3px", borderRadius:"2px", background: BORDER }}>
                      <div style={{ height:"100%", width:`${statusTotal > 0 ? (d.value/statusTotal)*100 : 0}%`, background: SLOT_COLORS[i % SLOT_COLORS.length], borderRadius:"2px" }} />
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM ROW ───────────────────────────────────── */}
      <div className="admin-grid-2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px", marginBottom:"14px" }}>

        {/* Upcoming appointments */}
        <div className="zc-flat au" style={{ animationDelay:"0.6s", padding:"28px" }}>
          <div style={{ fontSize:"9px", fontWeight:700, letterSpacing:"0.18em", color: TXT_SOFT, marginBottom:"5px" }}>UPCOMING</div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"20px", fontWeight:600, color: TXT, marginBottom:"18px" }}>Today's Schedule</div>
          {upcomingAppointments.length === 0
            ? <div style={{ padding:"24px 0", textAlign:"center", fontSize:"12px", color: TXT_SOFT }}>No upcoming appointments</div>
            : <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
              {upcomingAppointments.slice(0, 5).map(a => (
                <div key={a.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 14px", borderRadius:"10px", background: CREAM, border:`1px solid ${BORDER}` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
                    <div style={{ width:"36px", height:"36px", borderRadius:"50%", background: G_LIGHT, border:`1.5px solid ${G}33`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"15px", flexShrink:0 }}>💆</div>
                    <div>
                      <div style={{ fontSize:"12px", fontWeight:600, color: TXT }}>{a.clientName}</div>
                      <div style={{ fontSize:"10px", color: TXT_SOFT, marginTop:"1px" }}>{a.serviceName || a.service}</div>
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:"12px", fontWeight:700, color: G }}>{a.time}</div>
                    <div style={{ fontSize:"10px", color: TXT_SOFT }}>{a.date ? format(new Date(a.date), "MMM d") : ""}</div>
                  </div>
                </div>
              ))}
            </div>
          }
        </div>

        {/* Alerts */}
        <div className="zc-flat au" style={{ animationDelay:"0.66s", padding:"28px" }}>
          <div style={{ fontSize:"9px", fontWeight:700, letterSpacing:"0.18em", color: TXT_SOFT, marginBottom:"5px" }}>ALERTS</div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"20px", fontWeight:600, color: TXT, marginBottom:"18px" }}>Action Items</div>
          <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
            {alerts.length === 0
              ? <div style={{ padding:"24px 0", textAlign:"center", fontSize:"12px", color: TXT_SOFT }}>All clear. No alerts.</div>
              : alerts.map((a, i) => {
                const cfg = {
                  warning:{ bg:"#FFFBEB", border:"#FDE68A", icon:"⚠️" },
                  info:   { bg:"#EFF6FF", border:"#BFDBFE", icon:"ℹ️" },
                  success:{ bg:"#F0FDF4", border:"#BBF7D0", icon:"✓" },
                }[a.type];
                return (
                  <div key={a.id} style={{ display:"flex", gap:"10px", padding:"12px 14px", borderRadius:"10px", background: cfg.bg, border:`1px solid ${cfg.border}` }}>
                    <span style={{ fontSize:"14px", flexShrink:0, lineHeight:1.5 }}>{cfg.icon}</span>
                    <span style={{ fontSize:"12px", color: TXT_MID, lineHeight:1.5 }}>{a.message}</span>
                  </div>
                );
              })
            }
          </div>
        </div>
      </div>

      {/* ── PAYMENT METHODS + TOP STAFF ──────────────────── */}
      <div className="admin-grid-2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px" }}>

        <div className="zc-flat au" style={{ animationDelay:"0.72s", padding:"28px" }}>
          <div style={{ fontSize:"9px", fontWeight:700, letterSpacing:"0.18em", color: TXT_SOFT, marginBottom:"5px" }}>PAYMENTS</div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"20px", fontWeight:600, color: TXT, marginBottom:"18px" }}>By Method · {filterLabel}</div>
          {paymentMethodData.length === 0
            ? <div style={{ padding:"24px 0", textAlign:"center", fontSize:"12px", color: TXT_SOFT }}>No payment data</div>
            : <>
              <div style={{ height:"5px", borderRadius:"3px", display:"flex", gap:"2px", marginBottom:"18px", overflow:"hidden" }}>
                {paymentMethodData.map((d, i) => (
                  <div key={i} style={{ flex: d.amount || 0, background: SLOT_COLORS[i % SLOT_COLORS.length], minWidth:"4px" }} />
                ))}
              </div>
              {paymentMethodData.map((d, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 0", borderBottom: i < paymentMethodData.length-1 ? `1px solid ${BORDER}` : "none" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                    <div style={{ width:"8px", height:"8px", borderRadius:"2px", background: SLOT_COLORS[i % SLOT_COLORS.length] }} />
                    <span style={{ fontSize:"12px", color: TXT_MID, fontWeight:500, textTransform:"capitalize" }}>{d.method.replace(/_/g," ")}</span>
                    <span style={{ fontSize:"10px", color: TXT_SOFT }}>{d.count}×</span>
                  </div>
                  <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"16px", fontWeight:600, color: TXT }}>GHS {d.amount.toLocaleString()}</span>
                </div>
              ))}
            </>
          }
        </div>

        <div className="zc-flat au" style={{ animationDelay:"0.78s", padding:"28px" }}>
          <div style={{ fontSize:"9px", fontWeight:700, letterSpacing:"0.18em", color: TXT_SOFT, marginBottom:"5px" }}>PERFORMANCE</div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"20px", fontWeight:600, color: TXT, marginBottom:"18px" }}>Top Staff · {filterLabel}</div>
          {topStaff.length === 0
            ? <div style={{ padding:"24px 0", textAlign:"center", fontSize:"12px", color: TXT_SOFT }}>No staff data yet</div>
            : topStaff.slice(0, 5).map((s: any, i: number) => (
              <div key={s.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0", borderBottom: i < topStaff.length-1 ? `1px solid ${BORDER}` : "none" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
                  <div style={{ width:"32px", height:"32px", borderRadius:"50%", background: i === 0 ? G_LIGHT : "#F5F5F5", border:`1.5px solid ${i === 0 ? G : BORDER}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", fontWeight:700, color: TXT_MID, flexShrink:0 }}>
                    {["1","2","3","4","5"][i]}
                  </div>
                  <div>
                    <div style={{ fontSize:"12px", fontWeight:600, color: TXT }}>{s.name}</div>
                    {s.specialization && <div style={{ fontSize:"10px", color: TXT_SOFT, marginTop:"1px" }}>{s.specialization}</div>}
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:"12px", fontWeight:700, color: G }}>{s.bookings} bookings</div>
                  {s.revenue > 0 && <div style={{ fontSize:"10px", color: TXT_SOFT }}>GHS {s.revenue.toLocaleString()}</div>}
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;