import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, eachWeekOfInterval } from "date-fns";

export const getRevenueStats = async () => {
  const { data, error } = await supabase
    .from("sales")
    .select("amount, created_at, payment_method, service_name, client_name")
    .eq("status", "completed")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
};

export const getBookingStats = async () => {
  const { data, error } = await supabase
    .from("bookings")
    .select("status, preferred_date, service_name, client_name, staff_name, price");
  if (error) throw error;
  return data || [];
};

export const getTopServices = async () => {
  const { data, error } = await supabase
    .from("bookings")
    .select("service_name, price")
    .eq("status", "completed")
    .not("service_name", "is", null);
  if (error) throw error;
  const counts: Record<string, { name: string; count: number; revenue: number }> = {};
  data?.forEach((b: any) => {
    const name = b.service_name || "Unknown";
    if (!counts[name]) counts[name] = { name, count: 0, revenue: 0 };
    counts[name].count++;
    counts[name].revenue += Number(b.price || 0);
  });
  return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 8);
};

export const getTopClients = async () => {
  // Calculate from completed bookings — source of truth for spend and visits
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("client_name, client_id, price")
    .eq("status", "completed");
  if (error) throw error;

  const map: Record<string, { name: string; total_spent: number; total_visits: number }> = {};
  for (const b of bookings || []) {
    const key = b.client_id || b.client_name || "Unknown";
    if (!map[key]) map[key] = { name: b.client_name || "Unknown", total_spent: 0, total_visits: 0 };
    map[key].total_spent  += Number(b.price || 0);
    map[key].total_visits += 1;
  }

  return Object.values(map)
    .map(c => ({
      ...c,
      loyalty_points: Math.floor(c.total_spent / 100),
    }))
    .sort((a, b) => b.total_spent - a.total_spent)
    .slice(0, 10);
};

export const getRevenueByDay = (sales: any[], days = 30) => {
  const end = new Date();
  const start = subDays(end, days - 1);
  const interval = eachDayOfInterval({ start, end });
  return interval.map(day => {
    const key = format(day, "yyyy-MM-dd");
    const dayRevenue = sales
      .filter(s => (s.payment_date || s.created_at || "").startsWith(key))
      .reduce((sum, s) => sum + Number(s.amount || 0), 0);
    return { date: format(day, "MMM d"), revenue: dayRevenue };
  });
};

export const getRevenueByWeek = (sales: any[]) => {
  const end = new Date();
  const start = subDays(end, 83); // ~12 weeks
  const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
  return weeks.map(weekStart => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const wStart = format(weekStart, "yyyy-MM-dd");
    const wEnd = format(weekEnd, "yyyy-MM-dd");
    const weekRevenue = sales
      .filter(s => { const d = s.payment_date || s.created_at || ""; return d >= wStart + "T00:00:00" && d <= wEnd + "T23:59:59"; })
      .reduce((sum, s) => sum + Number(s.amount || 0), 0);
    return { date: format(weekStart, "MMM d"), revenue: weekRevenue };
  });
};

export const getPaymentMethodBreakdown = (sales: any[]) => {
  const totals: Record<string, { amount: number; count: number }> = {};
  sales.forEach(s => {
    const m = s.payment_method || "cash";
    if (!totals[m]) totals[m] = { amount: 0, count: 0 };
    totals[m].amount += Number(s.amount || 0);
    totals[m].count += 1;
  });
  return Object.entries(totals)
    .map(([method, d]) => ({ method, ...d }))
    .sort((a, b) => b.amount - a.amount);
};
