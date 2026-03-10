import { supabase } from "@/integrations/supabase/client";

export const getBusinessMetrics = async (startDate: string, endDate: string) => {
  const { data, error } = await supabase.from("business_metrics")
    .select("*").gte("date", startDate).lte("date", endDate).order("date");
  if (error) throw error;
  return data;
};

export const getClientAnalytics = async () => {
  const { data, error } = await supabase.from("client_analytics").select("*").order("total_spent", { ascending: false });
  if (error) throw error;
  return data;
};

export const getRevenueStats = async () => {
  const { data, error } = await supabase.from("payments")
    .select("amount, payment_date, payment_method").eq("payment_status", "completed");
  if (error) throw error;
  return data;
};

export const getBookingStats = async () => {
  const { data, error } = await supabase.from("bookings")
    .select("status, appointment_date, services(name), staff(full_name)");
  if (error) throw error;
  return data;
};

export const getTopServices = async () => {
  const { data, error } = await supabase.from("bookings")
    .select("service_id, services(name)").eq("status", "completed");
  if (error) throw error;
  const counts: Record<string, { name: string; count: number }> = {};
  data?.forEach((b: any) => {
    const id = b.service_id;
    if (!counts[id]) counts[id] = { name: b.services?.name || "Unknown", count: 0 };
    counts[id].count++;
  });
  return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
};
