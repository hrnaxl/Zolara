import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";

const G = "#C8A97E";
const G_DARK = "#8B6914";
const NAVY = "#0F1E35";
const CREAM = "#FAFAF8";
const BORDER = "#EDE8E0";
const TXT = "#1C160E";
const TXT_M = "#78716C";

function normalizePhone(raw: string) {
  let p = raw.replace(/\s+/g, "").replace(/[^0-9+]/g, "");
  if (p.startsWith("0")) p = "233" + p.slice(1);
  if (p.startsWith("+")) p = p.slice(1);
  if (!p.startsWith("233")) p = "233" + p;
  return p;
}

export default function ClientLogin() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") || "/app/client/dashboard";

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);

  // Check if already logged in
  useEffect(() => {
    const token = localStorage.getItem("zolara_client_token");
    const phone = localStorage.getItem("zolara_client_phone");
    if (token && phone) navigate(redirect, { replace: true });
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const sendOTP = async () => {
    setError("");
    const raw = phone.trim();
    if (!raw || raw.replace(/\D/g, "").length < 9) {
      setError("Enter a valid phone number"); return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/client-send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizePhone(raw) }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Failed to send code"); return; }
      setStep("otp");
      setCountdown(60);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    setError("");
    if (otp.length !== 6) { setError("Enter the 6-digit code"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/client-verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizePhone(phone.trim()), code: otp }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Verification failed"); return; }
      localStorage.setItem("zolara_client_token", d.token);
      localStorage.setItem("zolara_client_phone", normalizePhone(phone.trim()));
      if (d.client) localStorage.setItem("zolara_client_id", d.client.id);
      navigate(redirect, { replace: true });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inp: React.CSSProperties = {
    width: "100%", padding: "14px 16px",
    border: `1.5px solid ${BORDER}`, borderRadius: 10,
    fontSize: 15, fontFamily: "Montserrat,sans-serif",
    background: "#fff", outline: "none", color: TXT,
    transition: "border-color 0.15s",
  };

  return (
    <div style={{ minHeight: "100vh", background: CREAM, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", fontFamily: "Montserrat,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Montserrat:wght@300;400;500;600;700&display=swap');
        input:focus { border-color: ${G} !important; box-shadow: 0 0 0 3px rgba(200,169,126,0.12); }
        .otp-input { text-align:center; font-size:28px !important; font-weight:700 !important; letter-spacing:0.3em; }
      `}</style>

      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 32, fontWeight: 600, color: NAVY, letterSpacing: "0.04em" }}>Zolara</div>
          <div style={{ fontSize: 9, letterSpacing: "0.28em", color: G_DARK, fontWeight: 600, textTransform: "uppercase", marginTop: 2 }}>Beauty Studio</div>
        </div>

        <div style={{ background: "#fff", borderRadius: 20, padding: "40px 36px", border: `1px solid ${BORDER}`, boxShadow: "0 4px 24px rgba(28,22,14,0.06)" }}>

          {step === "phone" && (
            <>
              <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, fontWeight: 400, color: NAVY, marginBottom: 6 }}>
                Sign in to your account
              </h1>
              <p style={{ fontSize: 13, color: TXT_M, lineHeight: 1.7, marginBottom: 28 }}>
                Enter your phone number to receive a verification code.
              </p>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: TXT_M, display: "block", marginBottom: 7 }}>PHONE NUMBER</label>
              <input
                style={inp}
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="0XX XXX XXXX"
                onKeyDown={e => e.key === "Enter" && sendOTP()}
                autoFocus
              />
              {error && <p style={{ color: "#EF4444", fontSize: 12, marginTop: 8 }}>{error}</p>}
              <button
                onClick={sendOTP}
                disabled={loading}
                style={{ width: "100%", marginTop: 20, padding: "15px", background: loading ? "rgba(139,105,20,0.4)" : `linear-gradient(135deg,${G_DARK},${G})`, border: "none", borderRadius: 12, fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", color: "#fff", cursor: loading ? "not-allowed" : "pointer", fontFamily: "Montserrat,sans-serif", textTransform: "uppercase" }}>
                {loading ? "Sending..." : "Send Verification Code →"}
              </button>
              <p style={{ textAlign: "center", fontSize: 11, color: TXT_M, marginTop: 20, lineHeight: 1.7 }}>
                Don't have an account? Just enter your phone number.<br />
                If you've booked with us before, your history will appear automatically.
              </p>
            </>
          )}

          {step === "otp" && (
            <>
              <button onClick={() => { setStep("phone"); setOtp(""); setError(""); }} style={{ background: "none", border: "none", color: G_DARK, cursor: "pointer", fontSize: 12, fontWeight: 600, padding: 0, marginBottom: 20, display: "flex", alignItems: "center", gap: 4 }}>
                ← Back
              </button>
              <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, fontWeight: 400, color: NAVY, marginBottom: 6 }}>
                Enter verification code
              </h1>
              <p style={{ fontSize: 13, color: TXT_M, lineHeight: 1.7, marginBottom: 28 }}>
                We sent a 6-digit code to <strong style={{ color: TXT }}>{phone}</strong>. Check your messages.
              </p>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: TXT_M, display: "block", marginBottom: 7 }}>VERIFICATION CODE</label>
              <input
                style={{ ...inp, textAlign: "center", fontSize: 28, fontWeight: 700, letterSpacing: "0.3em" }}
                type="tel"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                onKeyDown={e => e.key === "Enter" && otp.length === 6 && verifyOTP()}
                autoFocus
              />
              {error && <p style={{ color: "#EF4444", fontSize: 12, marginTop: 8 }}>{error}</p>}
              <button
                onClick={verifyOTP}
                disabled={loading || otp.length !== 6}
                style={{ width: "100%", marginTop: 20, padding: "15px", background: (loading || otp.length !== 6) ? "rgba(139,105,20,0.3)" : `linear-gradient(135deg,${G_DARK},${G})`, border: "none", borderRadius: 12, fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", color: "#fff", cursor: (loading || otp.length !== 6) ? "not-allowed" : "pointer", fontFamily: "Montserrat,sans-serif", textTransform: "uppercase" }}>
                {loading ? "Verifying..." : "Verify & Sign In →"}
              </button>
              <div style={{ textAlign: "center", marginTop: 16 }}>
                {countdown > 0 ? (
                  <p style={{ fontSize: 12, color: TXT_M }}>Resend code in {countdown}s</p>
                ) : (
                  <button onClick={() => { sendOTP(); setOtp(""); }} style={{ background: "none", border: "none", color: G_DARK, cursor: "pointer", fontSize: 12, fontWeight: 600, textDecoration: "underline" }}>
                    Resend code
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <p style={{ textAlign: "center", fontSize: 11, color: TXT_M, marginTop: 20 }}>
          <Link to="/" style={{ color: G_DARK, textDecoration: "none" }}>← Back to Zolara</Link>
          &nbsp;&nbsp;·&nbsp;&nbsp;
          <Link to="/book" style={{ color: G_DARK, textDecoration: "none" }}>Book an appointment</Link>
        </p>
      </div>
    </div>
  );
}
