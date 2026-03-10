import { useEffect, useState } from "react";
import { getRevenueStats, getBookingStats, getTopServices, getClientAnalytics } from "@/lib/analytics";
import { toast } from "sonner";

export default function AnalyticsDashboard() {
  const [revenue, setRevenue] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [topServices, setTopServices] = useState<any[]>([]);
  const [clientAnalytics, setClientAnalytics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [r, b, s, c] = await Promise.all([getRevenueStats(), getBookingStats(), getTopServices(), getClientAnalytics()]);
        setRevenue(r || []);
        setBookings(b || []);
        setTopServices(s || []);
        setClientAnalytics(c || []);
      } catch { toast.error("Failed to load analytics"); } finally { setLoading(false); }
    };
    load();
  }, []);

  const totalRevenue = revenue.reduce((sum, p) => sum + (p.amount || 0), 0);
  const completedBookings = bookings.filter(b => b.status === "completed").length;
  const cancelledBookings = bookings.filter(b => b.status === "cancelled").length;
  const completionRate = bookings.length > 0 ? Math.round((completedBookings / bookings.length) * 100) : 0;

  const tierCounts = clientAnalytics.reduce((acc, c) => {
    acc[c.client_tier] = (acc[c.client_tier] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const paymentMethodTotals = revenue.reduce((acc, p) => {
    acc[p.payment_method] = (acc[p.payment_method] || 0) + p.amount;
    return acc;
  }, {} as Record<string, number>);

  const statCards = [
    { label: "Total Revenue", value: `GHS ${totalRevenue.toLocaleString("en-GH", { minimumFractionDigits: 2 })}`, color: "text-green-600" },
    { label: "Total Bookings", value: bookings.length.toString(), color: "text-blue-600" },
    { label: "Completed", value: completedBookings.toString(), color: "text-green-600" },
    { label: "Completion Rate", value: `${completionRate}%`, color: completionRate >= 80 ? "text-green-600" : "text-yellow-600" },
    { label: "Cancellations", value: cancelledBookings.toString(), color: "text-red-600" },
    { label: "Total Clients", value: clientAnalytics.length.toString(), color: "text-purple-600" },
  ];

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading analytics...</div>;

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Analytics Dashboard</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map(s => (
          <div key={s.label} className="border rounded-xl p-5 bg-card">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Services */}
        <div className="border rounded-xl p-5">
          <h3 className="font-semibold mb-4">Top Services (by completions)</h3>
          <div className="space-y-3">
            {topServices.map((s, i) => (
              <div key={s.name} className="flex items-center gap-3">
                <span className="text-sm font-bold text-muted-foreground w-5">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span>{s.name}</span>
                    <span className="font-medium">{s.count} bookings</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${topServices[0]?.count ? (s.count / topServices[0].count) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>
            ))}
            {topServices.length === 0 && <p className="text-sm text-muted-foreground">No data yet</p>}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="border rounded-xl p-5">
          <h3 className="font-semibold mb-4">Revenue by Payment Method</h3>
          <div className="space-y-3">
            {Object.entries(paymentMethodTotals).map(([method, amount]) => (
              <div key={method} className="flex justify-between items-center">
                <span className="text-sm capitalize">{method.replace("_", " ")}</span>
                <span className="font-semibold text-sm">GHS {(amount as number).toLocaleString("en-GH", { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
            {Object.keys(paymentMethodTotals).length === 0 && <p className="text-sm text-muted-foreground">No payment data yet</p>}
          </div>
        </div>

        {/* Client Tiers */}
        <div className="border rounded-xl p-5">
          <h3 className="font-semibold mb-4">Client Tiers</h3>
          <div className="grid grid-cols-2 gap-3">
            {[["new","New","bg-gray-100 text-gray-800"],["regular","Regular","bg-blue-100 text-blue-800"],["vip","VIP","bg-purple-100 text-purple-800"],["platinum","Platinum","bg-yellow-100 text-yellow-800"]].map(([tier,label,color])=>(
              <div key={tier} className={`rounded-lg p-3 ${color}`}>
                <p className="text-xs font-medium">{label}</p>
                <p className="text-xl font-bold">{tierCounts[tier] || 0}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Top Clients */}
        <div className="border rounded-xl p-5">
          <h3 className="font-semibold mb-4">Top Clients by Spend</h3>
          <div className="space-y-2">
            {clientAnalytics.slice(0, 5).map((c, i) => (
              <div key={c.id} className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{i + 1}.</span>
                <span className="flex-1 px-2 truncate">{c.client_id}</span>
                <span className="font-semibold">GHS {(c.total_spent || 0).toLocaleString("en-GH", { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
            {clientAnalytics.length === 0 && <p className="text-sm text-muted-foreground">No client data yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
