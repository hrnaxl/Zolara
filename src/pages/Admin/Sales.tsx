import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { toast } from "sonner";
import { CSVLink } from "react-csv";

const G = "#C8A97E", G_D = "#8B6914", CREAM = "#FAFAF8", WHITE = "#FFFFFF";
const BORDER = "#EDEBE5", TXT = "#1C160E", TXT_MID = "#78716C", TXT_SOFT = "#A8A29E";
const SHADOW = "0 1px 3px rgba(0,0,0,0.04),0 4px 16px rgba(0,0,0,0.06)";

const METHOD_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  cash:          { bg: "#F0FDF4", color: "#16A34A", label: "Cash" },
  mobile_money:  { bg: "#EFF6FF", color: "#2563EB", label: "MoMo" },
  card:          { bg: "#FDF4FF", color: "#9333EA", label: "Card" },
  bank_transfer: { bg: "#FFF7ED", color: "#EA580C", label: "Bank Transfer" },
  gift_card:     { bg: "#FFFBEB", color: "#D97706", label: "Gift Card" },
  deposit:       { bg: "#F0FDF4", color: "#059669", label: "Deposit" },
};
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  completed: { bg: "#F0FDF4", color: "#16A34A" },
  pending:   { bg: "#FFFBEB", color: "#D97706" },
  refunded:  { bg: "#FEF2F2", color: "#DC2626" },
};

type DateRange = "today" | "week" | "month" | "custom";

export default function SalesRevenue() {
  const [payments, setPayments] = useState<any[]>([]);
  const [revSplit, setRevSplit] = useState({ service: 0, product: 0, subscription: 0 });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [filterMethod, setFilterMethod] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => { fetchPayments(); }, [dateRange, customStart, customEnd]);

  const dateRangeLabel = () => {
    const now = new Date();
    if (dateRange === "today") return format(now, "MMMM d, yyyy");
    if (dateRange === "week") return `${format(startOfWeek(now), "MMM d")} – ${format(endOfWeek(now), "MMM d, yyyy")}`;
    if (dateRange === "month") return format(now, "MMMM yyyy");
    if (customStart && customEnd) return `${customStart} – ${customEnd}`;
    return "All time";
  };

  const fetchPayments = async () => {
    setLoading(true);
    try {
      let q = supabase.from("sales").select("*").order("created_at", { ascending: false });
      const now = new Date();
      if (dateRange === "today") {
        const d = format(now, "yyyy-MM-dd");
        q = q.gte("created_at", d + "T00:00:00").lte("created_at", d + "T23:59:59");
      } else if (dateRange === "week") {
        q = q.gte("created_at", format(startOfWeek(now), "yyyy-MM-dd")).lte("created_at", format(endOfWeek(now), "yyyy-MM-dd") + "T23:59:59");
      } else if (dateRange === "month") {
        q = q.gte("created_at", format(startOfMonth(now), "yyyy-MM-dd")).lte("created_at", format(endOfMonth(now), "yyyy-MM-dd") + "T23:59:59");
      } else if (dateRange === "custom") {
        if (customStart) q = q.gte("created_at", customStart);
        if (customEnd) q = q.lte("created_at", customEnd + "T23:59:59");
      }
      const { data, error } = await q;
      if (error) throw error;
      setPayments(data || []);
      const completedSales = (data || []).filter((p: any) => p.status === "completed");
      const productSalesAmt = completedSales
        .filter((p: any) => p.notes && p.notes.toLowerCase().includes("product sale"))
        .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
      const giftCardAmt = completedSales
        .filter((p: any) => (p.service_name || "").toLowerCase().includes("gift card"))
        .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
      const serviceSalesAmt = completedSales
        .filter((p: any) =>
          (!p.notes || !p.notes.toLowerCase().includes("product sale")) &&
          !(p.service_name || "").toLowerCase().includes("gift card")
        )
        .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
      setRevSplit({ service: serviceSalesAmt, product: productSalesAmt, subscription: giftCardAmt });
    } catch (e: any) { toast.error(e.message || "Failed to load sales"); }
    finally { setLoading(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase.from("sales").update({ status } as any).eq("id", id);
      if (error) throw error;
      toast.success("Updated");
      fetchPayments();
      setSelected(null);
    } catch (e: any) { toast.error(e.message); }
  };

  const filtered = payments
    .filter(p => {
      if (!filterMethod) return true;
      if (filterMethod === "deposit") return p.payment_method === "deposit" || (p.notes && p.notes.toLowerCase().includes("deposit"));
      return p.payment_method === filterMethod;
    })
    .filter(p => !filterStatus || p.status === filterStatus);

  const completed = filtered.filter(p => p.status === "completed");
  const pending = filtered.filter(p => p.status === "pending");
  const completedTotal = completed.reduce((s, p) => s + Number(p.amount || 0), 0);
  const pendingTotal = pending.reduce((s, p) => s + Number(p.amount || 0), 0);

  const byMethod = Object.entries(
    completed.reduce((acc: any, p) => {
      const m = p.payment_method || "other";
      acc[m] = (acc[m] || 0) + Number(p.amount || 0);
      return acc;
    }, {})
  ).sort((a: any, b: any) => (b[1] as number) - (a[1] as number));

  const escHtml = (s: any) => String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

  const printReport = () => {
    const rows = filtered.map(p => ({
      client: p.client_name || "N/A", service: p.service_name || "N/A",
      method: p.payment_method || "", amount: `GH${Number(p.amount).toFixed(2)}`,
      date: p.created_at ? format(new Date(p.created_at), "MMM dd, yyyy") : "",
      status: p.status || "",
    }));
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Sales Report</title><style>body{font-family:Georgia,serif;color:#111;padding:20px}h1{font-size:20px;margin-bottom:4px}p{color:#666;font-size:13px;margin-bottom:16px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ddd;padding:7px}th{background:#C8A97E;color:#fff}</style></head><body><h1>Zolara — Sales Report</h1><p>${dateRangeLabel()}</p><table><thead><tr><th>Client</th><th>Service</th><th>Method</th><th>Amount</th><th>Date</th><th>Status</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${escHtml(r.client)}</td><td>${escHtml(r.service)}</td><td>${escHtml(r.method)}</td><td>${r.amount}</td><td>${r.date}</td><td>${r.status}</td></tr>`).join("")}</tbody><tfoot><tr><td colspan="3"><strong>Completed total</strong></td><td><strong>GH${completedTotal.toFixed(2)}</strong></td><td colspan="2"></td></tr></tfoot></table><script>setTimeout(()=>window.print(),300)</script></body></html>`;
    const w = window.open("","_blank"); w?.document.write(html); w?.document.close();
  };

  const card: React.CSSProperties = { background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "16px", padding: "24px", boxShadow: SHADOW };

  return (
    <div style={{ background: CREAM, minHeight: "100dvh", padding: "clamp(16px,4vw,32px)", fontFamily: "Montserrat,sans-serif", color: TXT }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap');*{box-sizing:border-box}.sr:hover{background:rgba(200,169,126,0.05)!important;cursor:pointer}`}</style>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"28px", flexWrap:"wrap", gap:"12px" }}>
        <div>
          <p style={{ fontSize:"11px", fontWeight:700, letterSpacing:"0.16em", color:G, textTransform:"uppercase", marginBottom:"4px" }}>{dateRangeLabel()}</p>
          <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(28px,4vw,42px)", fontWeight:700, color:TXT, margin:0, lineHeight:1 }}>Sales & Revenue</h1>
          <p style={{ fontSize:"12px", color:TXT_SOFT, marginTop:"6px" }}>Track all payments and earnings</p>
        </div>
        <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
          <button onClick={printReport} style={{ padding:"9px 16px", borderRadius:"10px", border:`1px solid ${BORDER}`, background:WHITE, fontSize:"12px", fontWeight:600, cursor:"pointer", color:TXT_MID }}>Print Report</button>
          <CSVLink data={filtered.map(p=>({ client:p.client_name, service:p.service_name, method:p.payment_method, status:p.status, amount:p.amount, date:p.created_at ? format(new Date(p.created_at),"yyyy-MM-dd") : "" }))} filename={`sales_${dateRange}.csv`} style={{ textDecoration:"none" }}>
            <button style={{ padding:"9px 16px", borderRadius:"10px", border:`1px solid ${G}`, background:WHITE, fontSize:"12px", fontWeight:600, cursor:"pointer", color:G_D }}>Export CSV</button>
          </CSVLink>
        </div>
      </div>

      {/* Date Range Filters */}
      <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", marginBottom:"20px" }}>
        {(["today","week","month","custom"] as DateRange[]).map(r => (
          <button key={r} onClick={() => setDateRange(r)} style={{ padding:"7px 16px", borderRadius:"20px", border:`1.5px solid ${dateRange===r ? G : BORDER}`, background:dateRange===r ? G : WHITE, color:dateRange===r ? WHITE : TXT_MID, fontSize:"12px", fontWeight:600, cursor:"pointer" }}>{r === "week" ? "This Week" : r === "month" ? "This Month" : r.charAt(0).toUpperCase()+r.slice(1)}</button>
        ))}
        {dateRange === "custom" && (
          <>
            <input type="date" value={customStart} onChange={e=>setCustomStart(e.target.value)} style={{ border:`1px solid ${BORDER}`, borderRadius:"8px", padding:"6px 10px", fontSize:"12px", color:TXT }} />
            <input type="date" value={customEnd} onChange={e=>setCustomEnd(e.target.value)} style={{ border:`1px solid ${BORDER}`, borderRadius:"8px", padding:"6px 10px", fontSize:"12px", color:TXT }} />
          </>
        )}
      </div>

      {/* KPI Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:"14px", marginBottom:"24px" }}>
        {[
          { label:"COMPLETED", value:`GH₵${completedTotal.toLocaleString("en",{minimumFractionDigits:2})}`, sub:`${completed.length} transactions`, color:"#16A34A", bg:"#F0FDF4", border:"#BBF7D0" },
          { label:"AWAITING CONFIRMATION", value:`GH₵${pendingTotal.toLocaleString("en",{minimumFractionDigits:2})}`, sub:`${pending.length} bank transfer${pending.length !== 1 ? "s" : ""} pending`, color:"#D97706", bg:"#FFFBEB", border:"#FDE68A" },
          { label:"TOTAL RECORDS", value:String(filtered.length), sub:dateRangeLabel(), color:G_D, bg:"#FBF6EE", border:"#F0E4CC" },
        ].map(k => (
          <div key={k.label} style={{ background:k.bg, border:`1px solid ${k.border}`, borderRadius:"14px", padding:"20px" }}>
            <p style={{ fontSize:"10px", fontWeight:700, letterSpacing:"0.1em", color:k.color, marginBottom:"8px" }}>{k.label}</p>
            <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"28px", fontWeight:700, color:TXT, margin:0 }}>{k.value}</p>
            <p style={{ fontSize:"11px", color:TXT_SOFT, marginTop:"4px" }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Revenue Split */}
      {completedTotal > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"14px", marginBottom:"24px" }}>
          {[
            { l:"SERVICE REVENUE",      v: revSplit.service,      c:"#8B6914", bg:"#FBF6EE", bd:"#F0E4CC" },
            { l:"PRODUCT REVENUE",       v: revSplit.product,      c:"#2563EB", bg:"#EFF6FF", bd:"#BFDBFE" },
            { l:"GIFT CARDS & SUBS",     v: revSplit.subscription, c:"#7C3AED", bg:"#F5F3FF", bd:"#DDD6FE" },
          ].map(k => (
            <div key={k.l} style={{ background:k.bg, border:`1px solid ${k.bd}`, borderRadius:"14px", padding:"16px 20px" }}>
              <p style={{ fontSize:"9px", fontWeight:700, letterSpacing:"0.12em", color:k.c, margin:"0 0 6px" }}>{k.l}</p>
              <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"24px", fontWeight:700, color:TXT, margin:0 }}>GHS {Number(k.v||0).toLocaleString()}</p>
              {completedTotal > 0 && <p style={{ fontSize:"10px", color:k.c, margin:"4px 0 0" }}>{((Number(k.v||0)/completedTotal)*100).toFixed(1)}% of total</p>}
            </div>
          ))}
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px", marginBottom:"24px" }}>
        {/* Revenue by Method */}
        <div style={card}>
          <p style={{ fontSize:"10px", fontWeight:700, letterSpacing:"0.1em", color:TXT_SOFT, textTransform:"uppercase", marginBottom:"16px" }}>Revenue by Method</p>
          {byMethod.length === 0 ? <p style={{ fontSize:"13px", color:TXT_SOFT }}>No completed revenue yet</p> : byMethod.map(([m, v]) => {
            const mc = METHOD_COLORS[m] || { bg:"#F5F5F5", color:TXT_MID, label:m };
            const pct = completedTotal > 0 ? ((v as number) / completedTotal) * 100 : 0;
            return (
              <div key={m} style={{ marginBottom:"14px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"5px" }}>
                  <span style={{ padding:"2px 10px", borderRadius:"20px", fontSize:"10px", fontWeight:700, background:mc.bg, color:mc.color }}>{mc.label}</span>
                  <span style={{ fontSize:"13px", fontWeight:700, color:TXT }}>GH₵{Number(v).toLocaleString()}</span>
                </div>
                <div style={{ height:"5px", background:"#F0EDE8", borderRadius:"99px" }}>
                  <div style={{ height:"100%", width:`${pct}%`, background:G, borderRadius:"99px" }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div style={card}>
          <p style={{ fontSize:"10px", fontWeight:700, letterSpacing:"0.1em", color:TXT_SOFT, textTransform:"uppercase", marginBottom:"14px" }}>Filter by Method</p>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"7px", marginBottom:"16px" }}>
            {[null,...Object.keys(METHOD_COLORS)].map(m => (
              <button key={m||"all"} onClick={()=>setFilterMethod(m)} style={{ padding:"5px 12px", borderRadius:"20px", border:`1.5px solid ${filterMethod===m ? G : BORDER}`, background:filterMethod===m ? G : WHITE, color:filterMethod===m ? WHITE : TXT_MID, fontSize:"11px", fontWeight:600, cursor:"pointer" }}>
                {m ? (METHOD_COLORS[m]?.label || m) : "All"}
              </button>
            ))}
          </div>
          <p style={{ fontSize:"10px", fontWeight:700, letterSpacing:"0.1em", color:TXT_SOFT, textTransform:"uppercase", marginBottom:"10px" }}>Filter by Status</p>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"7px" }}>
            {[null,"completed","pending","refunded"].map(s => (
              <button key={s||"all"} onClick={()=>setFilterStatus(s)} style={{ padding:"5px 12px", borderRadius:"20px", border:`1.5px solid ${filterStatus===s ? G : BORDER}`, background:filterStatus===s ? G : WHITE, color:filterStatus===s ? WHITE : TXT_MID, fontSize:"11px", fontWeight:600, cursor:"pointer" }}>
                {s ? s.charAt(0).toUpperCase()+s.slice(1) : "All"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div style={card}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px" }}>
          <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"18px", fontWeight:700, color:TXT, margin:0 }}>Transactions</p>
          <p style={{ fontSize:"11px", color:TXT_SOFT }}>{filtered.length} record{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        {loading ? (
          <div style={{ display:"flex", justifyContent:"center", padding:"40px" }}>
            <div style={{ width:"32px", height:"32px", border:`3px solid #F0E4CC`, borderTopColor:G, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:"center", padding:"48px 0", color:TXT_SOFT }}>
            <div style={{ fontSize:"36px", marginBottom:"12px" }}>💳</div>
            <p style={{ fontSize:"14px", fontWeight:500 }}>No transactions found</p>
            <p style={{ fontSize:"12px", marginTop:"4px" }}>Adjust the date range or filters above</p>
          </div>
        ) : (
          <>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 110px 120px 120px 95px", gap:"12px", padding:"8px 14px", borderBottom:`1px solid ${BORDER}`, marginBottom:"4px" }}>
              {["Client","Service","Amount","Method","Date","Status"].map(h => (
                <span key={h} style={{ fontSize:"9px", fontWeight:700, letterSpacing:"0.1em", color:TXT_SOFT, textTransform:"uppercase" }}>{h}</span>
              ))}
            </div>
            {filtered.map((p, i) => {
              const mc = METHOD_COLORS[p.payment_method] || { bg:"#F5F5F5", color:TXT_MID, label:p.payment_method||"—" };
              const sc2 = STATUS_COLORS[p.status] || { bg:"#F5F5F5", color:TXT_MID };
              return (
                <div key={p.id} className="sr" onClick={() => setSelected(selected?.id === p.id ? null : p)}
                  style={{ display:"grid", gridTemplateColumns:"1fr 1fr 110px 120px 120px 95px", gap:"12px", padding:"12px 14px", borderRadius:"10px", alignItems:"center", borderBottom: i < filtered.length-1 ? `1px solid ${BORDER}` : "none", background: selected?.id===p.id ? "#FBF6EE" : "transparent", transition:"background 0.15s" }}>
                  <div>
                    <p style={{ fontSize:"12px", fontWeight:600, color:TXT, margin:0 }}>{p.client_name || "—"}</p>
                    {p.notes && <p style={{ fontSize:"10px", color:TXT_SOFT, margin:"2px 0 0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.notes}</p>}
                  </div>
                  <p style={{ fontSize:"12px", color:TXT_MID, margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.service_name || "—"}</p>
                  <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"16px", fontWeight:700, color:TXT, margin:0 }}>GH₵{Number(p.amount).toLocaleString()}</p>
                  <span style={{ display:"inline-block", padding:"3px 10px", borderRadius:"20px", fontSize:"10px", fontWeight:700, background:mc.bg, color:mc.color }}>{mc.label}</span>
                  <p style={{ fontSize:"11px", color:TXT_SOFT, margin:0 }}>{p.created_at ? format(new Date(p.created_at),"MMM d, yyyy") : "—"}</p>
                  <span style={{ display:"inline-block", padding:"3px 10px", borderRadius:"20px", fontSize:"10px", fontWeight:700, background:sc2.bg, color:sc2.color }}>{p.status}</span>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <div style={{ ...card, marginTop:"16px", borderLeft:`3px solid ${G}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px" }}>
            <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"18px", fontWeight:700, color:TXT, margin:0 }}>Payment Detail</p>
            <button onClick={()=>setSelected(null)} style={{ width:"28px", height:"28px", borderRadius:"50%", border:`1px solid ${BORDER}`, background:WHITE, cursor:"pointer", fontSize:"14px", color:TXT_SOFT }}>✕</button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"16px", marginBottom:"20px" }}>
            {[["Client",selected.client_name||"—"],["Service",selected.service_name||"—"],["Amount",`GH₵${Number(selected.amount).toFixed(2)}`],["Method",selected.payment_method||"—"],["Status",selected.status||"—"],["Date",selected.created_at ? format(new Date(selected.created_at),"MMM d, yyyy 'at' h:mm a") : "—"]].map(([l,v]) => (
              <div key={l}><p style={{ fontSize:"10px", fontWeight:700, letterSpacing:"0.1em", color:TXT_SOFT, textTransform:"uppercase", marginBottom:"4px" }}>{l}</p><p style={{ fontSize:"13px", fontWeight:600, color:TXT, margin:0 }}>{v}</p></div>
            ))}
          </div>
          {selected.notes && <p style={{ fontSize:"12px", color:TXT_MID, marginBottom:"16px" }}>Note: {selected.notes}</p>}
          <div style={{ display:"flex", gap:"8px" }}>
            {selected.status !== "completed" && <button onClick={()=>updateStatus(selected.id,"completed")} style={{ padding:"8px 18px", borderRadius:"10px", background:G, color:WHITE, border:"none", fontSize:"12px", fontWeight:600, cursor:"pointer" }}>Mark Completed</button>}
            {selected.status !== "refunded" && <button onClick={()=>updateStatus(selected.id,"refunded")} style={{ padding:"8px 18px", borderRadius:"10px", background:WHITE, color:"#DC2626", border:`1px solid #FECACA`, fontSize:"12px", fontWeight:600, cursor:"pointer" }}>Mark Refunded</button>}
          </div>
        </div>
      )}
    </div>
  );
}
