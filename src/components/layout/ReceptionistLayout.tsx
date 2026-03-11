import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, endOfDay } from "date-fns";
import {
  Calendar, Clock, Users, CheckCircle2, Bell, UserCheck, CreditCard,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { DonutChart } from "@/components/dashboard/DonutChart";
import { ActivityList } from "@/components/dashboard/ActivityList";
import { UpcomingAppointments } from "@/components/dashboard/UpcomingAppointments";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const ReceptionistDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [stats, setStats] = useState({
    todayTotal: 0, checkedIn: 0, pending: 0,
    completed: 0, totalClients: 0, pendingRequests: 0,
    todayRevenue: 0,
  });
  const [bookingStatusData, setBookingStatusData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [pendingItems, setPendingItems] = useState<any[]>([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("staff").select("name").eq("user_id", user.id).maybeSingle();
      if (profile) setUserName(profile.name);

      const todayStr = format(new Date(), "yyyy-MM-dd");
      const tomorrowStr = format(new Date(Date.now() + 86400000), "yyyy-MM-dd");

      const { data: bookings = [] } = await supabase
        .from("bookings").select("*")
        .gte("preferred_date", todayStr).lt("preferred_date", tomorrowStr)
        .order("preferred_time", { ascending: true });

      const { data: upcoming = [] } = await supabase
        .from("bookings").select("*")
        .gte("preferred_date", todayStr)
        .in("status", ["pending", "confirmed"])
        .order("preferred_date", { ascending: true })
        .order("preferred_time", { ascending: true })
        .limit(5);

      const { data: pendingBookings = [] } = await supabase
        .from("bookings").select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(8);

      const { count: clientCount } = await supabase
        .from("clients").select("*", { count: "exact", head: true });

      // Today revenue from sales
      const { data: todaySales = [] } = await supabase
        .from("sales").select("amount")
        .gte("created_at", startOfDay(new Date()).toISOString())
        .lte("created_at", endOfDay(new Date()).toISOString());

      const todayRevenue = todaySales.reduce((sum: number, s: any) => sum + (s.amount || 0), 0);
      const checkedIn = bookings.filter((b: any) => b.status === "confirmed").length;
      const completed = bookings.filter((b: any) => b.status === "completed").length;
      const pending = bookings.filter((b: any) => b.status === "pending").length;

      setStats({
        todayTotal: bookings.length, checkedIn, pending, completed,
        totalClients: clientCount || 0, pendingRequests: pendingBookings.length, todayRevenue,
      });

      setBookingStatusData([
        { name: "Pending",   value: pending,   color: "hsl(38,92%,50%)" },
        { name: "Confirmed", value: checkedIn, color: "hsl(210,80%,52%)" },
        { name: "Completed", value: completed, color: "hsl(152,60%,42%)" },
      ].filter(d => d.value > 0));

      setUpcomingAppointments(upcoming.map((b: any) => ({
        id: b.id, clientName: b.client_name || "Client",
        service: b.service_name || "Service", staffName: b.staff_name || "—",
        date: b.preferred_date, time: b.preferred_time, status: b.status,
      })));

      setPendingItems(pendingBookings.map((b: any) => ({
        id: b.id, title: b.service_name || "Service Request",
        subtitle: b.client_name || "Client", date: b.created_at, status: "pending",
      })));

    } catch (err: any) {
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/20 rounded-full" />
            <Loader2 className="w-16 h-16 absolute inset-0 animate-spin text-primary" />
          </div>
          <p className="text-muted-foreground font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <DashboardHeader
        title="Reception Dashboard"
        userName={userName}
        subtitle="Manage today's appointments and front desk operations"
      />

      {/* Primary stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Today's Appointments" value={stats.todayTotal}
          icon={<Calendar className="w-6 h-6" />} variant="gold" delay={0} />
        <StatCard title="Checked In" value={stats.checkedIn}
          icon={<UserCheck className="w-6 h-6" />} variant="blue" delay={0.1} />
        <StatCard title="Pending" value={stats.pending}
          icon={<Clock className="w-6 h-6" />} variant="purple" delay={0.2} />
        <StatCard title="Completed" value={stats.completed}
          icon={<CheckCircle2 className="w-6 h-6" />} variant="green" delay={0.3} />
      </div>

      {/* Secondary stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Total Clients" value={stats.totalClients.toLocaleString()}
          icon={<Users className="w-6 h-6" />} variant="default" delay={0.4} />
        <StatCard title="Today's Revenue" value={`GHS ${stats.todayRevenue.toFixed(2)}`}
          icon={<CreditCard className="w-6 h-6" />} variant="gold" delay={0.5} />
        <DonutChart data={bookingStatusData} title="Today's Status"
          subtitle="Appointment distribution" centerValue={stats.todayTotal} centerLabel="Total" />
      </div>

      {/* Upcoming + Pending */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <UpcomingAppointments appointments={upcomingAppointments} />
        <ActivityList title="Pending Requests" subtitle="Awaiting confirmation"
          items={pendingItems} icon={<Bell className="w-5 h-5 text-warning" />}
          emptyMessage="No pending requests" />
      </div>
    </div>
  );
};

export default ReceptionistDashboard;
