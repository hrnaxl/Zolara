import { useEffect, useState } from "react";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";
import { useSessionGuard } from "@/hooks/useSessionGuard";
import { RefreshCw, Bell, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, endOfDay } from "date-fns";
import { fetchPendingDepositBookings } from "@/lib/giftCardEcommerce";

const ReceptionistDashboard = () => {
  useInactivityLogout(30 * 60 * 1000); // 30-min inactivity logout
  useSessionGuard();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [stats, setStats] = useState({
    todayTotal: 0, checkedIn: 0, pending: 0, staffClockedIn: 0,
    completed: 0, totalClients: 0, todayRevenue: 0,
  });
  const [bookingStatusData, setBookingStatusData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [pendingDeposits, setPendingDeposits] = useState<any[]>([]);
  const [bellOpen, setBellOpen] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const todayStr = format(new Date(), "yyyy-MM-dd");
      const tomorrowStr = format(new Date(Date.now() + 86400000), "yyyy-MM-dd");
      const todayDateStr = new Date().toISOString().slice(0, 10);

      // Run all queries in parallel instead of sequentially
      const [
        profileRes,
        bookingsRes,
        upcomingRes,
        pendingBookingsRes,
        depositRes,
        clientCountRes,
        todaySalesRes,
        staffClockedInRes,
      ] = await Promise.all([
        supabase.from("staff").select("name").eq("user_id", user.id).maybeSingle(),
        supabase.from("bookings").select("*")
          .gte("preferred_date", todayStr).lt("preferred_date", tomorrowStr)
          .order("preferred_time", { ascending: true }),
        supabase.from("bookings").select("*")
          .gte("preferred_date", todayStr)
          .in("status", ["pending", "confirmed"])
          .order("preferred_date", { ascending: true })
          .order("preferred_time", { ascending: true })
          .limit(5),
        supabase.from("bookings").select("*")
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(8),
        fetchPendingDepositBookings(),
        supabase.from("clients").select("*", { count: "exact", head: true }),
        supabase.from("sales").select("amount, notes, service_name")
          .eq("status", "completed")
          .gte("payment_date", startOfDay(new Date()).toISOString())
          .lte("payment_date", endOfDay(new Date()).toISOString()),
        supabase.from("attendance").select("id", { count: "exact", head: true })
          .eq("date", todayDateStr).is("check_out", null).not("check_in", "is", null),
      ]);

      if (profileRes.data) setUserName(profileRes.data.name);
      setPendingDeposits(depositRes.data || []);

      const bookings = bookingsRes.data || [];
      const upcoming = upcomingRes.data || [];
      const pendingBookings = pendingBookingsRes.data || [];
      const clientCount = clientCountRes.count;
      const staffClockedIn = staffClockedInRes.count || 0;

      const todaySalesRaw = todaySalesRes.data || [];
      const todaySales = (todaySalesRaw as any[]).filter((s: any) =>
        !(s.notes && s.notes.toLowerCase().includes("gift card purchase online"))
      );
      const todayRevenue = todaySales.reduce((sum: number, s: any) => sum + Number(s.amount || 0), 0);
      const checkedIn = bookings.filter((b: any) => b.status === "confirmed").length;
      const completed = bookings.filter((b: any) => b.status === "completed").length;
      const pending   = bookings.filter((b: any) => b.status === "pending").length;

      setStats({ todayTotal: bookings.length, checkedIn, pending, completed, totalClients: clientCount || 0, todayRevenue, staffClockedIn: staffClockedIn || 0 });

      setBookingStatusData([
        { name: "Pending",   value: pending,   color: "#C9A84C" },
        { name: "Confirmed", value: checkedIn, color: "#4A90D9" },
        { name: "Completed", value: completed, color: "#4CAF7D" },
      ].filter(d => d.value > 0));

      setUpcomingAppointments(upcoming.map((b: any) => ({
        id: b.id, clientName: b.client_name || "Client",
        serviceName: b.service_name || "Service", staffName: b.staff_name || "—",
        date: b.preferred_date, time: b.preferred_time, status: b.status,
      })));

      setPendingItems(pendingBookings.map((b: any) => ({
        id: b.id, title: b.service_name || "Service Request",
        subtitle: b.client_name || "Client", date: b.created_at,
      })));

    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  };

  // ── DESIGN TOKENS (same as admin) ──────────────────────────
  const G        = "#B8975A";
  const G_LIGHT  = "#F5ECD6";
  const CREAM    = "#FAFAF8";
  const WHITE    = "#FFFFFF";
  const BORDER   = "#EDEBE5";
  const NAVY     = "#0F1E35";
  const TXT      = "#1C1917";
  const TXT_MID  = "#78716C";
  const TXT_SOFT = "#A8A29E";
  const SHADOW   = "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)";
  const SLOT_COLORS = ["#C9A84C", "#4A90D9", "#4CAF7D", "#E05A5A", "#9B7FCB"];

  // Donut geometry
  const statusTotal = bookingStatusData.reduce((s, d) => s + d.value, 0);
  const DONUT_R = 60, DONUT_CX = 74, DONUT_CY = 74;
  let cumDeg = -90;
  const donutPaths = bookingStatusData.map((d) => {
    const sweep = statusTotal > 0 ? (d.value / statusTotal) * 360 : 0;
    const s = (cumDeg * Math.PI) / 180;
    const e = ((cumDeg + sweep) * Math.PI) / 180;
    cumDeg += sweep;
    const x1 = DONUT_CX + DONUT_R * Math.cos(s);
    const y1 = DONUT_CY + DONUT_R * Math.sin(s);
    const x2 = DONUT_CX + DONUT_R * Math.cos(e);
    const y2 = DONUT_CY + DONUT_R * Math.sin(e);
    return { ...d, path: `M${DONUT_CX},${DONUT_CY} L${x1.toFixed(2)},${y1.toFixed(2)} A${DONUT_R},${DONUT_R} 0 ${sweep > 180 ? 1 : 0},1 ${x2.toFixed(2)},${y2.toFixed(2)} Z` };
  });

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", background: CREAM }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", border: `2.5px solid ${G_LIGHT}`, borderTopColor: G, margin: "0 auto 14px", animation: "spin 0.9s linear infinite" }} />
          <p style={{ fontFamily: "Montserrat,sans-serif", fontSize: "10px", letterSpacing: "0.18em", color: TXT_SOFT, textTransform: "uppercase" }}>Loading</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: CREAM, minHeight: "100vh", padding: "clamp(14px,4vw,32px) clamp(12px,4vw,36px)", fontFamily: "Montserrat,sans-serif", color: TXT }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box}
        .rc{background:${WHITE};border:1px solid ${BORDER};border-radius:16px;padding:24px;box-shadow:${SHADOW};transition:box-shadow 0.2s,transform 0.2s;position:relative;z-index:0}
        .rc:hover{box-shadow:0 2px 8px rgba(0,0,0,0.06),0 12px 36px rgba(0,0,0,0.1);transform:translateY(-1px)}
        .rc-flat{background:${WHITE};border:1px solid ${BORDER};border-radius:16px;padding:24px;box-shadow:${SHADOW}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .au{animation:up 0.35s ease both}
      `}</style>

      {/* ── HEADER ─────────────────────────────────────── */}
      <div className="au" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px", position: "relative", zIndex: 1000 }}>
        <div>
          <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.16em", color: G, marginBottom: "6px", textTransform: "uppercase" }}>
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
          <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(32px,4vw,48px)", fontWeight: 700, color: TXT, margin: 0, lineHeight: 1, letterSpacing: "-0.02em" }}>
            {userName ? `${greeting()}, ${userName.split(" ")[0]}` : "Reception"}
          </h1>
          <p style={{ fontSize: "12px", color: TXT_SOFT, marginTop: "6px", fontWeight: 400 }}>
            Manage today's appointments and front desk operations.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button onClick={fetchData} title="Refresh"
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg,#8B6914,#C8A97E)"; (e.currentTarget as HTMLElement).style.color = "#fff"; (e.currentTarget as HTMLElement).style.borderColor = "transparent"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(200,169,126,0.35)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = WHITE; (e.currentTarget as HTMLElement).style.color = TXT_MID; (e.currentTarget as HTMLElement).style.borderColor = BORDER; (e.currentTarget as HTMLElement).style.boxShadow = SHADOW; }}
            style={{ width: "40px", height: "40px", borderRadius: "12px", background: WHITE, border: `1px solid ${BORDER}`, boxShadow: SHADOW, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: TXT_MID, transition: "all 0.22s ease" }}>
            <RefreshCw size={15} />
          </button>
          <div style={{ position: "relative", zIndex: 100000 }}>
            <button onClick={() => setBellOpen(o => !o)} title="Notifications"
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg,#8B6914,#C8A97E)"; (e.currentTarget as HTMLElement).style.color = "#fff"; (e.currentTarget as HTMLElement).style.borderColor = "transparent"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(200,169,126,0.35)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = WHITE; (e.currentTarget as HTMLElement).style.color = TXT_MID; (e.currentTarget as HTMLElement).style.borderColor = BORDER; (e.currentTarget as HTMLElement).style.boxShadow = SHADOW; }}
              style={{ width: "40px", height: "40px", borderRadius: "12px", background: WHITE, border: `1px solid ${BORDER}`, boxShadow: SHADOW, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: TXT_MID, transition: "all 0.22s ease" }}>
              <Bell size={15} />
            </button>
            {stats.pending > 0 && (
              <div style={{ position: "absolute", top: "-2px", right: "-2px", minWidth: "16px", height: "16px", borderRadius: "8px", background: "#EF4444", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>
                <span style={{ fontSize: "8px", fontWeight: 700, color: "#fff" }}>{stats.pending}</span>
              </div>
            )}
            {bellOpen && (
              <div style={{ position: "fixed", top: "70px", right: "36px", width: "300px", background: WHITE, borderRadius: "16px", boxShadow: "0 8px 40px rgba(0,0,0,0.14)", border: `1px solid ${BORDER}`, zIndex: 99999, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, fontSize: "13px" }}>Notifications</span>
                  <button onClick={() => setBellOpen(false)} style={{ background:"none", border:"none", cursor:"pointer", color: TXT_SOFT, display:"flex", alignItems:"center", padding:"2px" }}><X size={14} /></button>
                </div>
                <div style={{ maxHeight: "340px", overflowY: "auto" }}>
                  {pendingItems.length > 0 ? pendingItems.map((b: any, i: number) => (
                    <div key={i} style={{ padding: "13px 18px", borderBottom: `1px solid ${BORDER}`, display: "flex", gap: "10px" }}>
                      <span style={{ fontSize: "16px" }}>⚠️</span>
                      <span style={{ fontSize: "12px", lineHeight: 1.5 }}>{b.name} — {b.service} needs attention</span>
                    </div>
                  )) : (
                    <div style={{ padding: "28px 18px", textAlign: "center", color: TXT_SOFT, fontSize: "12px" }}>All clear. No pending bookings.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── KPI ROW ──────────────────────────────────────── */}
      <div className="admin-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px", marginBottom: "14px" }}>
        {[
          { label: "TODAY'S BOOKINGS", val: String(stats.todayTotal),   color: "#4A90D9", bg: "#EFF6FF" },
          { label: "STAFF CLOCKED IN",  val: String(stats.staffClockedIn), color: "#16A34A", bg: "#F0FDF4" },
          { label: "PENDING",          val: String(stats.pending),      color: G,         bg: G_LIGHT   },
          { label: "COMPLETED",        val: String(stats.completed),    color: "#7C3AED", bg: "#F5F3FF" },
        ].map((c, i) => (
          <div key={i} className="rc au" style={{ animationDelay: `${i * 0.06}s` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em", color: TXT_SOFT }}>{c.label}</span>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: c.color }} />
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(28px,3vw,40px)", fontWeight: 700, color: TXT, lineHeight: 1, marginBottom: "14px" }}>{c.val}</div>
            <div style={{ height: "2px", borderRadius: "1px", background: `linear-gradient(90deg,${c.color}66,transparent)` }} />
          </div>
        ))}
      </div>

      {/* ── SECONDARY KPI ─────────────────────────────────── */}
      <div className="admin-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
        {[
          { label: "TOTAL CLIENTS",  val: stats.totalClients.toLocaleString(), sub: "In the system" },
          { label: "TODAY'S REVENUE", val: `GHS ${stats.todayRevenue.toLocaleString("en", { minimumFractionDigits: 2 })}`, sub: "From completed sales" },
        ].map((c, i) => (
          <div key={i} className="rc-flat au" style={{ animationDelay: `${0.24 + i * 0.06}s`, display: "flex", alignItems: "center", gap: "18px" }}>
            <div style={{ width: "52px", height: "52px", borderRadius: "14px", background: G_LIGHT, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "13px", fontWeight: 700, color: G, letterSpacing: "-0.01em", textAlign: "center", lineHeight: 1.1, maxWidth: "48px", padding: "0 4px" }}>{c.val}</span>
            </div>
            <div>
              <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.16em", color: TXT_SOFT, marginBottom: "4px" }}>{c.label}</div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "26px", fontWeight: 700, color: TXT, lineHeight: 1 }}>{c.val}</div>
              <div style={{ fontSize: "10px", color: TXT_SOFT, marginTop: "3px" }}>{c.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── CHARTS + APPOINTMENTS ROW ─────────────────────── */}
      <div className="admin-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "14px", marginBottom: "14px" }}>

        {/* Booking status donut */}
        <div className="rc-flat au" style={{ animationDelay: "0.36s", padding: "clamp(14px,3vw,28px)" }}>
          <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em", color: TXT_SOFT, marginBottom: "5px" }}>TODAY'S STATUS</div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "20px", fontWeight: 600, color: TXT, marginBottom: "20px" }}>Distribution</div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
            <svg width="148" height="148" viewBox="0 0 148 148">
              {donutPaths.length > 0
                ? donutPaths.map((s, i) => <path key={i} d={s.path} fill={s.color} opacity="0.9" />)
                : <circle cx="74" cy="74" r="60" fill={G_LIGHT} />
              }
              <circle cx="74" cy="74" r="38" fill={WHITE} />
              <text x="74" y="69" textAnchor="middle" fill={TXT_SOFT} fontSize="8" fontFamily="Montserrat" fontWeight="700" letterSpacing="1.5">TOTAL</text>
              <text x="74" y="86" textAnchor="middle" fill={TXT} fontSize="22" fontFamily="Cormorant Garamond" fontWeight="700">{statusTotal}</text>
            </svg>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
              {bookingStatusData.length === 0
                ? <span style={{ fontSize: "11px", color: TXT_SOFT, textAlign: "center" }}>No bookings today</span>
                : bookingStatusData.map((d, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                      <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: SLOT_COLORS[i % SLOT_COLORS.length] }} />
                      <span style={{ fontSize: "11px", color: TXT_MID }}>{d.name}</span>
                    </div>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: TXT }}>{d.value}</span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>

        {/* Upcoming appointments */}
        <div className="rc-flat au" style={{ animationDelay: "0.42s", padding: "clamp(14px,3vw,28px)" }}>
          <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em", color: TXT_SOFT, marginBottom: "5px" }}>UPCOMING</div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "20px", fontWeight: 600, color: TXT, marginBottom: "18px" }}>Today's Schedule</div>
          {upcomingAppointments.length === 0
            ? <div style={{ padding: "24px 0", textAlign: "center", fontSize: "12px", color: TXT_SOFT }}>No upcoming appointments</div>
            : <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {upcomingAppointments.map(a => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: "10px", background: CREAM, border: `1px solid ${BORDER}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: G_LIGHT, border: `1.5px solid ${G}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", flexShrink: 0 }}>💆</div>
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: 600, color: TXT }}>{a.clientName}</div>
                      <div style={{ fontSize: "10px", color: TXT_SOFT, marginTop: "1px" }}>{a.serviceName}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: G }}>{a.time}</div>
                    <div style={{ fontSize: "10px", color: TXT_SOFT }}>{a.date ? format(new Date(a.date), "MMM d") : ""}</div>
                  </div>
                </div>
              ))}
            </div>
          }
        </div>
      </div>

      {/* ── INCOMPLETE BOOKINGS (no deposit paid) ───────── */}
      {pendingDeposits.length > 0 && (
        <div className="rc-flat au" style={{ animationDelay: "0.42s", padding: "clamp(14px,3vw,28px)", border: "1.5px solid #FCA5A5", background: "#FFF5F5" }}>
          <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em", color: "#DC2626", marginBottom: "5px" }}>DEPOSIT NOT PAID</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "20px", fontWeight: 600, color: TXT }}>
              Deposit Not Paid ({pendingDeposits.length})
            </div>
          </div>
          <div style={{ fontSize: "12px", color: TXT_MID, marginBottom: "16px" }}>
            These clients did not pay the deposit. Their slot is <strong>not reserved</strong>. At checkout, collect the <strong>full service amount</strong> — do not deduct the GH₵50 deposit.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: "10px" }}>
            {pendingDeposits.map((b: any) => (
              <div key={b.id} style={{ padding: "14px 16px", borderRadius: "10px", background: "white", border: "1px solid #FCA5A5", display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <span style={{ fontSize: "18px", flexShrink: 0 }}>⚠️</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: TXT }}>{b.client_name || "Client"}</div>
                  <div style={{ fontSize: "11px", color: TXT_MID, marginTop: "2px" }}>{b.service_name || "Service"}</div>
                  <div style={{ fontSize: "11px", color: TXT_SOFT, marginTop: "2px" }}>{b.preferred_date} · {b.preferred_time}</div>
                  <div style={{ marginTop: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ display: "inline-block", background: "#FEE2E2", color: "#DC2626", fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px", letterSpacing: "0.05em" }}>
                      DEPOSIT NOT PAID
                    </span>
                    <button
                      onClick={async () => {
                        await supabase.from("bookings").update({ status: "cancelled" } as any).eq("id", b.id);
                        setPendingDeposits(prev => prev.filter(x => x.id !== b.id));
                      }}
                      style={{ fontSize: "10px", color: "#DC2626", background: "none", border: "1px solid #FCA5A5", borderRadius: "20px", padding: "2px 8px", cursor: "pointer", fontWeight: 600 }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PENDING REQUESTS ─────────────────────────────── */}
      <div className="rc-flat au" style={{ animationDelay: "0.48s", padding: "clamp(14px,3vw,28px)" }}>
        <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em", color: TXT_SOFT, marginBottom: "5px" }}>PENDING</div>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "20px", fontWeight: 600, color: TXT, marginBottom: "18px" }}>Requests Awaiting Confirmation</div>
        {pendingItems.length === 0
          ? <div style={{ padding: "20px 0", textAlign: "center", fontSize: "12px", color: TXT_SOFT }}>No pending requests. All clear.</div>
          : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: "10px" }}>
            {pendingItems.map(p => (
              <div key={p.id} style={{ padding: "12px 14px", borderRadius: "10px", background: "#FFFBEB", border: "1px solid #FDE68A", display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <span style={{ fontSize: "14px", flexShrink: 0, lineHeight: 1.5 }}>⏳</span>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: TXT }}>{p.title}</div>
                  <div style={{ fontSize: "10px", color: TXT_SOFT, marginTop: "2px" }}>{p.subtitle}</div>
                </div>
              </div>
            ))}
          </div>
        }
      </div>
    </div>
  );
};

export default ReceptionistDashboard;
