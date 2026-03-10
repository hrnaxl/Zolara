import { Star } from "lucide-react";

interface TopServiceCardProps {
  serviceName: string;
  bookingCount: number;
}

export const TopServiceCard = ({ serviceName, bookingCount }: TopServiceCardProps) => (
  <div style={{
    background: "linear-gradient(135deg, #2C2010, #3D2F14)",
    border: "1px solid rgba(232,200,122,0.3)",
    borderRadius: "12px",
    padding: "24px",
    position: "relative",
    overflow: "hidden",
  }}>
    <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "80px", height: "80px", borderRadius: "50%", background: "radial-gradient(circle, rgba(232,200,122,0.15) 0%, transparent 70%)" }} />
    <div style={{ fontSize: "11px", fontFamily: "'Montserrat', sans-serif", fontWeight: 600, letterSpacing: "0.12em", color: "rgba(245,239,230,0.5)", textTransform: "uppercase", marginBottom: "16px" }}>Top Service</div>
    <Star size={20} style={{ color: "#E8C87A", marginBottom: "10px" }} />
    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "22px", fontWeight: 600, color: "#F5EFE6", lineHeight: 1.2, marginBottom: "8px" }}>{serviceName}</div>
    <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "12px", color: "#E8C87A" }}>{bookingCount} bookings this period</div>
  </div>
);

export default TopServiceCard;
