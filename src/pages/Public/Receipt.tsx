import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const G = "#C8A97E", G_DARK = "#8B6914", DARK = "#1C160E", CREAM = "#F5EFE6";
const BORDER = "#E8E2D9", TXT_MID = "#78716C";

export default function Receipt() {
  const { ref } = useParams<{ ref: string }>();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ref) return;
    (supabase as any).from("bookings")
      .select("*, sales:sales(amount, payment_method, payment_date)")
      .or(`booking_ref.eq.${ref},id.eq.${ref}`)
      .maybeSingle()
      .then(({ data }: any) => { setBooking(data); setLoading(false); });
  }, [ref]);

  if (loading) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background: CREAM }}><div style={{ width:36, height:36, borderRadius:"50%", border:"3px solid #E8E2D9", borderTop:`3px solid ${G}`, animation:"spin 0.8s linear infinite" }}/><style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style></div>;
  if (!booking) return <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:CREAM, fontFamily:"Montserrat,sans-serif" }}><p style={{ color: TXT_MID }}>Receipt not found.</p><Link to="/" style={{ color: G_DARK, marginTop: 16 }}>← Home</Link></div>;

  const sale = Array.isArray(booking.sales) ? booking.sales[0] : booking.sales;
  const total = sale?.amount || booking.price || 0;
  const method = (sale?.payment_method || "cash").replace("_", " ");
  const date = booking.preferred_date ? format(new Date(booking.preferred_date + "T00:00"), "EEEE, MMMM d yyyy") : "";

  return (
    <div style={{ minHeight:"100vh", background: CREAM, display:"flex", alignItems:"center", justifyContent:"center", padding: 24, fontFamily:"Montserrat,sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Montserrat:wght@400;500;600;700&display=swap');`}</style>
      <div style={{ width: "100%", maxWidth: 480, background: "#fff", borderRadius: 20, boxShadow:"0 4px 24px rgba(0,0,0,0.08)", overflow:"hidden" }}>
        <div style={{ background: DARK, padding:"28px 32px", textAlign:"center" }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", color: G, fontSize: 28, fontWeight: 700, marginBottom: 2 }}>ZOLARA</div>
          <div style={{ color:"rgba(200,169,126,0.6)", fontSize: 10, letterSpacing:"0.24em" }}>BEAUTY STUDIO</div>
        </div>
        <div style={{ padding:"32px", borderBottom:`1px solid ${BORDER}` }}>
          <div style={{ textAlign:"center", marginBottom: 24 }}>
            <div style={{ fontSize: 12, color: TXT_MID, letterSpacing:"0.12em", marginBottom: 6 }}>RECEIPT</div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize: 40, fontWeight: 700, color: DARK }}>GH₵ {Number(total).toLocaleString()}</div>
          </div>
          {[
            ["Client", booking.client_name],
            ["Service", booking.service_name],
            ["Date", date],
            ["Time", booking.preferred_time?.slice(0,5)],
            ["Stylist", booking.staff_name],
            ["Payment", method.charAt(0).toUpperCase() + method.slice(1)],
            ["Reference", booking.booking_ref],
          ].filter(([,v]) => v).map(([label, value]) => (
            <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${BORDER}` }}>
              <span style={{ fontSize: 12, color: TXT_MID, fontWeight: 600 }}>{label}</span>
              <span style={{ fontSize: 13, color: DARK, fontWeight: 600 }}>{value}</span>
            </div>
          ))}
        </div>
        <div style={{ padding:"24px 32px", textAlign:"center" }}>
          <p style={{ fontSize: 12, color: TXT_MID, marginBottom: 16 }}>Thank you for visiting Zolara Beauty Studio.</p>
          <p style={{ fontSize: 11, color:"#A8A29E" }}>Sakasaka, Opposite CalBank, Tamale · 0594365314</p>
          <div style={{ display:"flex", gap: 12, justifyContent:"center", marginTop: 20 }}>
            <Link to="/book" style={{ fontSize: 12, fontWeight: 700, color: G_DARK, textDecoration:"none", background:"rgba(200,169,126,0.1)", padding:"8px 18px", borderRadius: 20, border:`1px solid rgba(200,169,126,0.3)` }}>Book Again</Link>
            <button onClick={() => window.print()} style={{ fontSize: 12, fontWeight: 700, color:"#fff", background:`linear-gradient(135deg,${G_DARK},${G})`, border:"none", padding:"8px 18px", borderRadius: 20, cursor:"pointer" }}>Print</button>
          </div>
        </div>
      </div>
    </div>
  );
}
