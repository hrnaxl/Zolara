import { format } from "date-fns";
import { Clock } from "lucide-react";

interface Appointment {
  id: string;
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  status: string;
}

export const UpcomingAppointments = ({ appointments }: { appointments: Appointment[] }) => (
  <div style={{ background: "linear-gradient(135deg, #1C160E, #2C2416)", border: "1px solid rgba(200,169,126,0.2)", borderRadius: "12px", padding: "24px" }}>
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
      <Clock size={16} style={{ color: "#C8A97E" }} />
      <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "20px", fontWeight: 600, color: "#F5EFE6", margin: 0 }}>Upcoming Appointments</h3>
    </div>
    {appointments.length === 0 ? (
      <div style={{ textAlign: "center", padding: "32px 0", fontFamily: "'Montserrat', sans-serif", fontSize: "12px", color: "rgba(245,239,230,0.25)" }}>No upcoming appointments</div>
    ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {appointments.slice(0, 5).map(a => (
          <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: "8px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(200,169,126,0.08)" }}>
            <div>
              <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "12px", fontWeight: 600, color: "#F5EFE6" }}>{a.clientName}</div>
              <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "10px", color: "rgba(245,239,230,0.4)", marginTop: "2px" }}>{a.serviceName}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "14px", color: "#C8A97E" }}>{a.time}</div>
              <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "10px", color: "rgba(245,239,230,0.3)" }}>{a.date ? format(new Date(a.date), "MMM d") : ""}</div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default UpcomingAppointments;
