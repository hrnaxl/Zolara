import { useNavigate } from "react-router-dom";
import EnhancedBookingForm from "@/components/EnhancedBookingForm";
import { ArrowLeft } from "lucide-react";

const GOLD = "#C9A84C";
const DARK = "#0F0D0B";

const PublicBooking = () => {
  const navigate = useNavigate();
  return (
    <div style={{ background: DARK, minHeight: "100vh" }}>
      {/* Top bar */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(15,13,11,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid #2D2420", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button
          onClick={() => navigate("/")}
          style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", color: "#9A8878", fontSize: 13, fontWeight: 500, fontFamily: "'Montserrat',sans-serif", transition: "color 0.15s", padding: 0 }}
          onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
          onMouseLeave={e => (e.currentTarget.style.color = "#9A8878")}
        >
          <ArrowLeft size={16} />
          Back to homepage
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/logo.png" style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover", border: `1.5px solid ${GOLD}` }} alt="Zolara" />
          <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700, color: "#FAF7F2", letterSpacing: "0.02em" }}>Zolara</span>
        </div>
      </div>

      <EnhancedBookingForm />
    </div>
  );
};

export default PublicBooking;
