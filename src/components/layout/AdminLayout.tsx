import { useEffect, useState } from "react";
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

      console.log("Start of day", todayStart);
      console.log("End of day", todayEnd);
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
      ] = await Promise.all([
        supabase
          .from("bookings")
          .select("*")
          .eq("preferred_date", format(today, "yyyy-MM-dd")),
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

      // Payment method breakdown
      const paymentMethods = periodPaymentsRes.data?.reduce(
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

      const enabledMethodIds =
        settings?.payment_methods
          ?.filter((m: any) => m.enabled)
          .map((m: any) => m.id) || [];

      const paymentMethodBreakdown = paymentMethods
        ? Object.entries(paymentMethods)
            .map(([method, data]: [string, any]) => ({
              method,
              amount: data.amount,
              count: data.count,
              percentage: (data.amount / totalPaymentAmount) * 100,
            }))
            // Always include gift_card if present in data, even if not listed in settings
            .filter(
              (p: any) =>
                p.method === "gift_card" || enabledMethodIds.includes(p.method)
            )
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
              name: booking.staff.name,
              specialization: booking.staff.specialization,
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
  const gold = "#C9A84C";
  const goldLight = "#F5E6C0";
  const cream = "#FDFAF5";
  const beige = "#F7F3EC";
  const beigeDeep = "#EDE8DF";
  const textDark = "#1A1612";
  const textMid = "#6B6157";
  const textSoft = "#9E9489";

  // ─────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────

  // Donut chart geometry
  const statusTotal = bookingStatusData.reduce((s, d) => s + d.value, 0);
  const DONUT_R = 72, DONUT_CX = 90, DONUT_CY = 90;
  const SLOT_COLORS = ["#4A90D9", "#4CAF7D", "#E05A5A", "#C9A84C", "#9B7FCB"];
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

  // Revenue sparkline (last 7 days) — smooth cubic bezier
  const spark7 = revenueData.slice(-7);
  const SW = 360, SH = 90, PAD = 16;
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
  const areaPath = spPts.length > 1 ? `${bezier} L${spPts[spPts.length-1].x},${SH} L${spPts[0].x},${SH} Z` : "";

  const filterLabel = getFilterLabel();

  const G = "#B8975A";          // champagne gold
  const G_LIGHT = "#F5ECD6";    // gold tint background
  const CREAM = "#FAFAF8";      // page bg
  const CARD_BG = "#FFFFFF";    // card bg
  const BORDER = "#EDEBE5";     // subtle border
  const TXT = "#1C1917";        // near black
  const TXT_MID = "#78716C";    // warm gray
  const TXT_SOFT = "#A8A29E";   // light warm gray
  const SHADOW = "0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)";

  if (loading && !lastSync) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"60vh", background: CREAM }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ width:"40px", height:"40px", borderRadius:"50%", border:`3px solid ${G_LIGHT}`, borderTopColor: G, margin:"0 auto 16px", animation:"spin 0.9s linear infinite" }} />
          <p style={{ fontFamily:"'Montserrat',sans-serif", fontSize:"11px", letterSpacing:"0.16em", color: TXT_SOFT }}>LOADING</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: CREAM, minHeight:"100vh", padding:"clamp(20px,4vw,40px) clamp(20px,5vw,52px)", fontFamily:"'Montserrat',sans-serif", color: TXT }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Montserrat:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box}
        .z-card{background:${CARD_BG};border:1px solid ${BORDER};border-radius:16px;padding:24px;box-shadow:${SHADOW};transition:box-shadow 0.2s,transform 0.2s}
        .z-card:hover{box-shadow:0 2px 8px rgba(0,0,0,0.06),0 12px 36px rgba(0,0,0,0.1);transform:translateY(-2px)}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .fade-up{animation:fadeUp 0.4s ease both}
      `}</style>

      {/* ══ HEADER ══════════════════════════════════════════════ */}
      <div className="fade-up" style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"36px" }}>
        <div>
          <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(38px,5vw,56px)", fontWeight:600, color: TXT, margin:0, lineHeight:1, letterSpacing:"-0.02em" }}>
            Dashboard
          </h1>
          <p style={{ fontSize:"13px", fontWeight:300, color: TXT_MID, marginTop:"8px", letterSpacing:"0.01em" }}>
            Welcome back! Here's your executive overview.
          </p>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:"10px", paddingTop:"6px" }}>
          {/* Period pills */}
          <div style={{ display:"flex", gap:"2px", background: BORDER, borderRadius:"24px", padding:"3px" }}>
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
                  fontFamily:"'Montserrat',sans-serif", fontSize:"11px", fontWeight:600,
                  letterSpacing:"0.06em", padding:"7px 18px", borderRadius:"20px",
                  border:"none", cursor:"pointer", transition:"all 0.18s",
                  background: dateFilter===f ? G : "transparent",
                  color: dateFilter===f ? "#fff" : TXT_MID,
                  boxShadow: dateFilter===f ? `0 2px 8px ${G}55` : "none",
                }}>{labels[f]}</button>
              );
            })}
          </div>

          {/* Refresh */}
          <button onClick={fetchStats} title="Refresh" style={{ width:"38px", height:"38px", borderRadius:"50%", background: CARD_BG, border:`1px solid ${BORDER}`, boxShadow: SHADOW, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"15px", color: TXT_MID, transition:"all 0.2s" }}>
            <span style={{ display:"inline-block", animation: loading ? "spin 0.9s linear infinite" : "none" }}>↻</span>
          </button>

          {/* Bell */}
          <div style={{ position:"relative" }}>
            <div onClick={() => setBellOpen(o => !o)} style={{ width:"42px", height:"42px", borderRadius:"50%", background: CARD_BG, border:`1px solid ${BORDER}`, boxShadow: SHADOW, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"17px", transition:"all 0.2s" }}>🔔</div>
            {(stats.pendingRequests > 0 || alerts.length > 0) && (
              <div style={{ position:"absolute", top:"-1px", right:"-1px", minWidth:"16px", height:"16px", borderRadius:"8px", background:"#EF4444", border:"2px solid #fff", display:"flex", alignItems:"center", justifyContent:"center", padding:"0 3px" }}>
                <span style={{ fontSize:"8px", fontWeight:700, color:"#fff", lineHeight:1 }}>{stats.pendingRequests + alerts.length}</span>
              </div>
            )}
            {bellOpen && (
              <div style={{ position:"absolute", top:"50px", right:0, width:"320px", background:"#fff", borderRadius:"16px", boxShadow:"0 8px 40px rgba(0,0,0,0.14)", border:`1px solid ${BORDER}`, zIndex:200, overflow:"hidden" }}>
                <div style={{ padding:"16px 20px", borderBottom:`1px solid ${BORDER}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontWeight:700, fontSize:"14px" }}>Notifications</span>
                  <span onClick={() => setBellOpen(false)} style={{ cursor:"pointer", fontSize:"18px", color:TXT_SOFT }}>✕</span>
                </div>
                <div style={{ maxHeight:"360px", overflowY:"auto" }}>
                  {stats.pendingRequests > 0 && (
                    <div style={{ padding:"14px 20px", borderBottom:`1px solid ${BORDER}`, display:"flex", gap:"12px", alignItems:"flex-start" }}>
                      <span style={{ fontSize:"20px" }}>📋</span>
                      <div>
                        <div style={{ fontWeight:600, fontSize:"13px" }}>{stats.pendingRequests} Pending Booking{stats.pendingRequests > 1 ? "s" : ""}</div>
                        <div style={{ fontSize:"11px", color:TXT_SOFT, marginTop:"2px" }}>Requires confirmation</div>
                      </div>
                    </div>
                  )}
                  {absentStaff.length > 0 && (
                    <div style={{ padding:"14px 20px", borderBottom:`1px solid ${BORDER}`, display:"flex", gap:"12px", alignItems:"flex-start" }}>
                      <span style={{ fontSize:"20px" }}>⚠️</span>
                      <div>
                        <div style={{ fontWeight:600, fontSize:"13px" }}>Staff Not Checked In</div>
                        <div style={{ fontSize:"11px", color:TXT_SOFT, marginTop:"2px" }}>{absentStaff.slice(0,3).join(", ")}{absentStaff.length > 3 ? ` +${absentStaff.length - 3} more` : ""}</div>
                      </div>
                    </div>
                  )}
                  {alerts.map((a, i) => (
                    <div key={i} style={{ padding:"14px 20px", borderBottom:`1px solid ${BORDER}`, display:"flex", gap:"12px", alignItems:"flex-start" }}>
                      <span style={{ fontSize:"20px" }}>{a.type === "warning" ? "🔶" : a.type === "error" ? "🔴" : "ℹ️"}</span>
                      <div>
                        <div style={{ fontWeight:600, fontSize:"13px" }}>{a.title}</div>
                        <div style={{ fontSize:"11px", color:TXT_SOFT, marginTop:"2px" }}>{a.message}</div>
                      </div>
                    </div>
                  ))}
                  {stats.pendingRequests === 0 && absentStaff.length === 0 && alerts.length === 0 && (
                    <div style={{ padding:"32px 20px", textAlign:"center", color:TXT_SOFT, fontSize:"13px" }}>No notifications right now ✓</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ ROW 1 – KPI CARDS ═══════════════════════════════════ */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"16px", marginBottom:"16px" }}>
        {[
          { label:"TODAY'S BOOKINGS",  value: String(stats.todayBookings),
            formatted: String(stats.todayBookings),
            pct: stats.bookingChangePercentage === 0 ? "—" : stats.bookingChangePercentage >= 0 ? `+${stats.bookingChangePercentage}%` : `${stats.bookingChangePercentage}%`,
            up: stats.bookingChangePercentage >= 0,
            note:"vs yesterday",   icon:"📅" },
          { label:"TODAY'S REVENUE",   value: stats.todayRevenue,
            formatted:`GHC ${stats.todayRevenue.toLocaleString("en",{minimumFractionDigits:2})}`,
            pct: stats.todayRevenueChange === 0 ? "—" : stats.todayRevenueChange >= 0 ? `+${stats.todayRevenueChange}%` : `${stats.todayRevenueChange}%`,
            up: stats.todayRevenueChange >= 0,
            note:"vs yesterday", icon:"💳" },
          { label:"WEEKLY REVENUE",    value: stats.weeklyRevenue,
            formatted:`GHC ${stats.weeklyRevenue.toLocaleString("en",{minimumFractionDigits:2})}`,
            pct: stats.weeklyRevenueChange === 0 ? "—" : stats.weeklyRevenueChange >= 0 ? `+${stats.weeklyRevenueChange}%` : `${stats.weeklyRevenueChange}%`,
            up: stats.weeklyRevenueChange >= 0,
            note:"vs last week",  icon:"📊" },
          { label:"MONTHLY REVENUE",   value: stats.monthlyRevenue,
            formatted:`GHC ${stats.monthlyRevenue.toLocaleString("en",{minimumFractionDigits:2})}`,
            pct: stats.monthChangePercentage === 0 ? "—" : stats.monthChangePercentage >= 0 ? `+${stats.monthChangePercentage}%` : `${stats.monthChangePercentage}%`,
            up: stats.monthChangePercentage >= 0,
            note:"vs last month", icon:"🏆" },
        ].map((c, i) => (
          <div key={i} className="z-card fade-up" style={{ animationDelay:`${i*0.07}s` }}>
            {/* Gold icon badge */}
            <div style={{ width:"38px", height:"38px", borderRadius:"11px", background: G_LIGHT, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"18px", marginBottom:"18px" }}>{c.icon}</div>
            {/* Label */}
            <div style={{ fontSize:"9px", fontWeight:700, letterSpacing:"0.18em", color: TXT_SOFT, marginBottom:"10px" }}>{c.label}</div>
            {/* Value */}
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(24px,2.5vw,32px)", fontWeight:700, color: TXT, lineHeight:1, marginBottom:"12px", letterSpacing:"-0.01em" }}>{c.formatted}</div>
            {/* Trend */}
            <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
              <span style={{ fontSize:"11px", fontWeight:700, color: c.pct === "—" ? TXT_SOFT : c.up ? "#16A34A" : "#DC2626" }}>{c.pct}</span>
              <span style={{ fontSize:"10px", color: TXT_SOFT, fontWeight:400 }}>{c.note}</span>
            </div>
            {/* Bottom accent line */}
            <div style={{ marginTop:"18px", height:"2px", borderRadius:"1px", background:`linear-gradient(90deg,${G},transparent)` }} />
          </div>
        ))}
      </div>

      {/* ══ ROW 2 – SUMMARY CARDS ═══════════════════════════════ */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"16px", marginBottom:"16px" }}>
        {[
          { label:"TOTAL CLIENTS",  value: stats.totalClients, icon:"👥", sub: stats.clientChangePercentage ? `${stats.clientChangePercentage >= 0 ? "+" : ""}${stats.clientChangePercentage}% this month` : "" },
          { label:"ACTIVE STAFF",  value: stats.activeStaff,  icon:"✂️", sub: "On roster today" },
          { label:"PENDING ACTIONS", value: stats.pendingBookings + stats.pendingRequests, icon:"⏳", sub: "Require attention" },
        ].map((c, i) => (
          <div key={i} className="z-card fade-up" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 24px", animationDelay:`${0.28 + i*0.07}s` }}>
            <div style={{ display:"flex", alignItems:"center", gap:"16px" }}>
              <div style={{ width:"46px", height:"46px", borderRadius:"14px", background: G_LIGHT, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"22px", flexShrink:0 }}>{c.icon}</div>
              <div>
                <div style={{ fontSize:"9px", fontWeight:700, letterSpacing:"0.18em", color: TXT_SOFT, marginBottom:"5px" }}>{c.label}</div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"32px", fontWeight:700, color: TXT, lineHeight:1 }}>{c.value}</div>
                {c.sub && <div style={{ fontSize:"10px", color: TXT_SOFT, marginTop:"4px" }}>{c.sub}</div>}
              </div>
            </div>
            <div style={{ width:"36px", height:"36px", borderRadius:"50%", border:`1.5px solid ${BORDER}`, display:"flex", alignItems:"center", justifyContent:"center", color: TXT_SOFT, fontSize:"14px" }}>→</div>
          </div>
        ))}
      </div>

      {/* ══ GOLD HIGHLIGHT PANEL ════════════════════════════════ */}
      <div className="fade-up" style={{ animationDelay:"0.42s", position:"relative", borderRadius:"20px", overflow:"hidden", marginBottom:"20px", padding:"36px 40px", background:`linear-gradient(115deg, #C9A84C 0%, #E8D27A 45%, #BF9640 100%)`, boxShadow:`0 8px 40px ${G}44`, maxWidth:"560px" }}>
        {/* Decorative circles */}
        <div style={{ position:"absolute", top:"-50px", right:"80px", width:"200px", height:"200px", borderRadius:"50%", background:"rgba(255,255,255,0.10)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:"-60px", right:"-30px", width:"180px", height:"180px", borderRadius:"50%", background:"rgba(255,255,255,0.07)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", top:"50%", left:"55%", transform:"translateY(-50%)", width:"1px", height:"60%", background:"rgba(255,255,255,0.2)", pointerEvents:"none" }} />

        {/* Badge */}
        <div style={{ position:"absolute", top:"24px", right:"28px", background:"rgba(255,255,255,0.22)", backdropFilter:"blur(12px)", borderRadius:"20px", padding:"6px 16px", fontSize:"10px", fontWeight:700, letterSpacing:"0.14em", color:"#fff", border:"1px solid rgba(255,255,255,0.3)" }}>
          ✦ MOST POPULAR
        </div>

        <div style={{ fontSize:"10px", fontWeight:700, letterSpacing:"0.2em", color:"rgba(255,255,255,0.7)", marginBottom:"10px" }}>TOP SERVICE THIS MONTH</div>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(26px,4vw,42px)", fontWeight:700, color:"#fff", letterSpacing:"-0.01em", marginBottom:"28px", textShadow:"0 2px 12px rgba(0,0,0,0.12)" }}>
          {stats.topService === "N/A" ? "No data yet" : stats.topService}
        </div>

        <div style={{ display:"flex", gap:"clamp(24px,5vw,64px)" }}>
          {[
            { label:"TOTAL BOOKINGS",     val: stats.topServiceCount },
            { label:"REVENUE GENERATED",  val: `GHC ${stats.topServiceRevenue.toLocaleString("en",{minimumFractionDigits:2})}` },
            { label:"GROWTH",             val: stats.topServiceGrowth === 0 ? "—" : stats.topServiceGrowth >= 0 ? `+${stats.topServiceGrowth}%` : `${stats.topServiceGrowth}%` },
          ].map((s, i) => (
            <div key={i}>
              <div style={{ fontSize:"9px", fontWeight:700, letterSpacing:"0.18em", color:"rgba(255,255,255,0.65)", marginBottom:"8px" }}>{s.label}</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(22px,2.8vw,30px)", fontWeight:700, color:"#fff" }}>{s.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ CHARTS ROW ══════════════════════════════════════════ */}
      <div style={{ display:"grid", gridTemplateColumns:"3fr 2fr", gap:"20px", marginBottom:"20px" }}>

        {/* ─ Revenue Trend ─ */}
        <div className="z-card fade-up" style={{ animationDelay:"0.49s", padding:"28px 28px 20px" }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"22px" }}>
            <div>
              <div style={{ fontSize:"9px", fontWeight:700, letterSpacing:"0.18em", color: TXT_SOFT, marginBottom:"6px" }}>REVENUE TREND</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"22px", fontWeight:600, color: TXT }}>Last 7 Days</div>
            </div>
            <div style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:"20px", padding:"5px 13px", fontSize:"11px", fontWeight:700, color:"#DC2626", whiteSpace:"nowrap" }}>
              −23% vs last week
            </div>
          </div>

          <svg width="100%" viewBox={`0 0 ${SW} ${SH}`} style={{ overflow:"visible", display:"block" }}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={G} stopOpacity="0.18" />
                <stop offset="100%" stopColor={G} stopOpacity="0.01" />
              </linearGradient>
            </defs>
            {spPts.length > 1 && (
              <>
                <path d={areaPath} fill="url(#areaGrad)" />
                <path d={bezier} fill="none" stroke={G} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {spPts.map((p, i) => (
                  <g key={i}>
                    <circle cx={p.x} cy={p.y} r="5" fill="#fff" stroke={G} strokeWidth="2.5" />
                    <circle cx={p.x} cy={p.y} r="2" fill={G} />
                  </g>
                ))}
              </>
            )}
            {spPts.length === 0 && <text x={SW/2} y={SH/2} textAnchor="middle" fill={TXT_SOFT} fontSize="12" fontFamily="Montserrat">No data</text>}
          </svg>

          {spark7.length > 0 && (
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:"10px", paddingLeft:`${PAD}px`, paddingRight:`${PAD}px` }}>
              {spark7.map((d, i) => (
                <span key={i} style={{ fontSize:"9px", color: TXT_SOFT, fontWeight:500 }}>{d.name}</span>
              ))}
            </div>
          )}
        </div>

        {/* ─ Donut Chart ─ */}
        <div className="z-card fade-up" style={{ animationDelay:"0.56s", padding:"28px" }}>
          <div style={{ fontSize:"9px", fontWeight:700, letterSpacing:"0.18em", color: TXT_SOFT, marginBottom:"6px" }}>BOOKING STATUS</div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"22px", fontWeight:600, color: TXT, marginBottom:"20px" }}>Distribution</div>

          <div style={{ display:"flex", alignItems:"center", gap:"20px" }}>
            <div style={{ flexShrink:0 }}>
              <svg width="180" height="180" viewBox="0 0 180 180">
                {donutPaths.length > 0 ? donutPaths.map((s, i) => (
                  <path key={i} d={s.path} fill={s.color} opacity="0.88" />
                )) : (
                  <circle cx="90" cy="90" r="72" fill={G_LIGHT} />
                )}
                {/* Inner white disc */}
                <circle cx="90" cy="90" r="44" fill={CARD_BG} />
                {/* Center label */}
                <text x="90" y="85" textAnchor="middle" fill={TXT_SOFT} fontSize="9" fontFamily="Montserrat" fontWeight="700" letterSpacing="2">TOTAL</text>
                <text x="90" y="106" textAnchor="middle" fill={TXT} fontSize="26" fontFamily="Cormorant Garamond" fontWeight="700">
                  {bookingStatusData.reduce((s, d) => s + d.value, 0)}
                </text>
              </svg>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:"10px", flex:1 }}>
              {bookingStatusData.length === 0 ? (
                <span style={{ fontSize:"12px", color: TXT_SOFT }}>No bookings yet</span>
              ) : bookingStatusData.map((d, i) => (
                <div key={i}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"4px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                      <div style={{ width:"8px", height:"8px", borderRadius:"50%", background: SLOT_COLORS[i % SLOT_COLORS.length], flexShrink:0 }} />
                      <span style={{ fontSize:"11px", color: TXT_MID, fontWeight:500 }}>{d.name}</span>
                    </div>
                    <span style={{ fontSize:"12px", fontWeight:700, color: TXT }}>{d.value}</span>
                  </div>
                  <div style={{ height:"3px", borderRadius:"2px", background: BORDER }}>
                    <div style={{ height:"100%", width:`${statusTotal > 0 ? (d.value/statusTotal)*100 : 0}%`, background: SLOT_COLORS[i % SLOT_COLORS.length], borderRadius:"2px" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══ BOTTOM ROW – Alerts + Upcoming ══════════════════════ */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"20px", marginBottom:"20px" }}>
        
        {/* Alerts */}
        <div className="z-card fade-up" style={{ animationDelay:"0.63s", padding:"28px" }}>
          <div style={{ fontSize:"9px", fontWeight:700, letterSpacing:"0.18em", color: TXT_SOFT, marginBottom:"6px" }}>ALERTS</div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"22px", fontWeight:600, color: TXT, marginBottom:"18px" }}>Action Items</div>
          <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
            {alerts.map(a => {
              const cfg = {
                warning:{ bg:"#FFFBEB", border:"#FDE68A", icon:"⚠️" },
                info:   { bg:"#EFF6FF", border:"#BFDBFE", icon:"ℹ️" },
                success:{ bg:"#F0FDF4", border:"#BBF7D0", icon:"✅" },
              }[a.type];
              return (
                <div key={a.id} style={{ display:"flex", alignItems:"flex-start", gap:"10px", padding:"12px 14px", borderRadius:"10px", background: cfg.bg, border:`1px solid ${cfg.border}` }}>
                  <span style={{ fontSize:"14px", flexShrink:0, lineHeight:1.6 }}>{cfg.icon}</span>
                  <span style={{ fontSize:"12px", color: TXT_MID, lineHeight:1.6 }}>{a.message}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming appointments */}
        <div className="z-card fade-up" style={{ animationDelay:"0.70s", padding:"28px" }}>
          <div style={{ fontSize:"9px", fontWeight:700, letterSpacing:"0.18em", color: TXT_SOFT, marginBottom:"6px" }}>UPCOMING</div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"22px", fontWeight:600, color: TXT, marginBottom:"18px" }}>Today's Appointments</div>
          {upcomingAppointments.length === 0 ? (
            <div style={{ textAlign:"center", padding:"24px 0", fontSize:"12px", color: TXT_SOFT }}>No upcoming appointments</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
              {upcomingAppointments.slice(0, 5).map(a => (
                <div key={a.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"11px 14px", borderRadius:"10px", background: CREAM, border:`1px solid ${BORDER}` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
                    <div style={{ width:"34px", height:"34px", borderRadius:"50%", background: G_LIGHT, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px", flexShrink:0 }}>💆</div>
                    <div>
                      <div style={{ fontSize:"12px", fontWeight:600, color: TXT }}>{a.clientName}</div>
                      <div style={{ fontSize:"10px", color: TXT_SOFT, marginTop:"1px" }}>{a.serviceName}</div>
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:"13px", fontWeight:700, color: G }}>{a.time}</div>
                    <div style={{ fontSize:"10px", color: TXT_SOFT }}>{a.date ? format(new Date(a.date), "MMM d") : ""}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ══ BOTTOM ROW – Payments + Top Staff ═══════════════════ */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"20px" }}>

        {/* Payment methods */}
        <div className="z-card fade-up" style={{ animationDelay:"0.77s", padding:"28px" }}>
          <div style={{ fontSize:"9px", fontWeight:700, letterSpacing:"0.18em", color: TXT_SOFT, marginBottom:"6px" }}>PAYMENTS</div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"22px", fontWeight:600, color: TXT, marginBottom:"18px" }}>By Method · {filterLabel}</div>
          {paymentMethodData.length === 0 ? (
            <div style={{ textAlign:"center", padding:"24px 0", fontSize:"12px", color: TXT_SOFT }}>No payment data yet</div>
          ) : (
            <>
              {/* Stacked progress bar */}
              <div style={{ height:"6px", borderRadius:"3px", display:"flex", gap:"2px", marginBottom:"20px", overflow:"hidden" }}>
                {paymentMethodData.map((d, i) => (
                  <div key={i} style={{ flex: d.amount || 0, background: SLOT_COLORS[i % SLOT_COLORS.length], minWidth:"4px" }} />
                ))}
              </div>
              {paymentMethodData.map((d, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 0", borderBottom: i < paymentMethodData.length-1 ? `1px solid ${BORDER}` : "none" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                    <div style={{ width:"9px", height:"9px", borderRadius:"3px", background: SLOT_COLORS[i % SLOT_COLORS.length], flexShrink:0 }} />
                    <span style={{ fontSize:"12px", color: TXT_MID, fontWeight:500, textTransform:"capitalize" }}>{d.method.replace(/_/g," ")}</span>
                    <span style={{ fontSize:"10px", color: TXT_SOFT }}>{d.count}×</span>
                  </div>
                  <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"16px", fontWeight:600, color: TXT }}>GHC {d.amount.toLocaleString()}</span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Top staff */}
        <div className="z-card fade-up" style={{ animationDelay:"0.84s", padding:"28px" }}>
          <div style={{ fontSize:"9px", fontWeight:700, letterSpacing:"0.18em", color: TXT_SOFT, marginBottom:"6px" }}>PERFORMANCE</div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"22px", fontWeight:600, color: TXT, marginBottom:"18px" }}>Top Staff · {filterLabel}</div>
          {topStaff.length === 0 ? (
            <div style={{ textAlign:"center", padding:"24px 0", fontSize:"12px", color: TXT_SOFT }}>No staff data yet</div>
          ) : topStaff.slice(0, 5).map((s: any, i: number) => (
            <div key={s.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0", borderBottom: i < topStaff.length-1 ? `1px solid ${BORDER}` : "none" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
                <div style={{ width:"34px", height:"34px", borderRadius:"50%", background: i === 0 ? G_LIGHT : CREAM, border:`1.5px solid ${i === 0 ? G : BORDER}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px", flexShrink:0, fontWeight:700, color: TXT_MID }}>
                  {["🥇","🥈","🥉","4","5"][i]}
                </div>
                <div>
                  <div style={{ fontSize:"12px", fontWeight:600, color: TXT }}>{s.name}</div>
                  {s.specialization && <div style={{ fontSize:"10px", color: TXT_SOFT, marginTop:"1px" }}>{s.specialization}</div>}
                </div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:"13px", fontWeight:700, color: G }}>{s.bookings} bookings</div>
                {s.revenue > 0 && <div style={{ fontSize:"10px", color: TXT_SOFT, marginTop:"1px" }}>GHC {s.revenue.toLocaleString()}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default AdminDashboard;
