import { Link } from "react-router-dom";
export default function SubscriptionsPage() {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh", fontFamily:"Montserrat,sans-serif", gap:16 }}>
      <div style={{ fontSize:48 }}>🚧</div>
      <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:28, color:"#1C160E", margin:0 }}>Subscriptions</h2>
      <p style={{ color:"#78716C", fontSize:14 }}>This feature is coming soon.</p>
      <Link to="/app/admin/dashboard" style={{ fontSize:13, color:"#8B6914", textDecoration:"none", fontWeight:700 }}>← Back to Dashboard</Link>
    </div>
  );
}
