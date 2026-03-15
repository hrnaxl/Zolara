import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const G = "#C8A97E", G_D = "#8B6914", NAVY = "#0F1E35", CREAM = "#FAFAF8";
const WHITE = "#FFFFFF", BORDER = "#EDEBE5", TXT = "#1C160E", TXT_MID = "#78716C";

export default function Feedback() {
  const [name, setName] = useState("");
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Please enter your name"); return; }
    if (!rating) { toast.error("Please select a rating"); return; }
    if (!comment.trim()) { toast.error("Please write a short review"); return; }
    setSubmitting(true);
    const { error } = await (supabase as any).from("reviews").insert({
      name: name.trim(), rating, comment: comment.trim(), visible: false,
    });
    if (error) { toast.error("Failed to submit. Please try again."); setSubmitting(false); return; }
    setDone(true);
    setSubmitting(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: CREAM, fontFamily: "'Montserrat',sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 16px" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Montserrat:wght@400;500;600;700&display=swap');`}</style>

      <div style={{ width: "100%", maxWidth: 480 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Link to="/" style={{ display: "inline-block", marginBottom: 20 }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 700, color: NAVY, letterSpacing: "0.1em" }}>ZOLARA</div>
            <div style={{ fontSize: 9, letterSpacing: "0.3em", color: G_D, fontWeight: 700 }}>BEAUTY STUDIO</div>
          </Link>
          {!done && <>
            <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 32, fontWeight: 600, color: TXT, margin: "0 0 8px" }}>How was your visit?</h1>
            <p style={{ fontSize: 13, color: TXT_MID, margin: 0, lineHeight: 1.6 }}>We'd love to hear about your experience. It only takes a moment.</p>
          </>}
        </div>

        {done ? (
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 20, padding: "48px 32px", textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💛</div>
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 700, color: TXT, margin: "0 0 12px" }}>Thank you!</h2>
            <p style={{ fontSize: 14, color: TXT_MID, lineHeight: 1.7, margin: "0 0 24px" }}>Your review has been received. We truly appreciate you taking the time to share your experience at Zolara.</p>
            <Link to="/" style={{ display: "inline-block", padding: "12px 32px", background: `linear-gradient(135deg,${G},${G_D})`, color: WHITE, borderRadius: 10, textDecoration: "none", fontSize: 13, fontWeight: 700, letterSpacing: "0.05em" }}>Back to Zolara</Link>
          </div>
        ) : (
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 20, padding: "clamp(24px,5vw,40px)", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
            {/* Name */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: G_D, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Your Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Abena K."
                style={{ width: "100%", border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: "11px 14px", fontSize: 14, color: TXT, outline: "none", fontFamily: "'Montserrat',sans-serif", boxSizing: "border-box" }} />
            </div>

            {/* Star rating */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: G_D, textTransform: "uppercase", display: "block", marginBottom: 10 }}>Your Rating</label>
              <div style={{ display: "flex", gap: 8 }}>
                {[1,2,3,4,5].map(s => (
                  <button key={s} type="button"
                    onMouseEnter={() => setHovered(s)} onMouseLeave={() => setHovered(0)}
                    onClick={() => setRating(s)}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 36, color: s <= (hovered || rating) ? "#F59E0B" : BORDER, padding: 0, transition: "color 0.15s", lineHeight: 1 }}>★</button>
                ))}
              </div>
              {rating > 0 && <p style={{ fontSize: 11, color: TXT_MID, margin: "6px 0 0" }}>
                {["","Poor","Below average","Good","Very good","Excellent! 🌸"][rating]}
              </p>}
            </div>

            {/* Comment */}
            <div style={{ marginBottom: 28 }}>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: G_D, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Your Review</label>
              <textarea value={comment} onChange={e => setComment(e.target.value)}
                placeholder="Tell us about your experience — what did you love?"
                rows={4}
                style={{ width: "100%", border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: "11px 14px", fontSize: 14, color: TXT, outline: "none", fontFamily: "'Montserrat',sans-serif", resize: "vertical", boxSizing: "border-box" }} />
            </div>

            <button onClick={handleSubmit} disabled={submitting}
              style={{ width: "100%", padding: "14px", background: submitting ? BORDER : `linear-gradient(135deg,${G},${G_D})`, color: WHITE, border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", letterSpacing: "0.06em", fontFamily: "'Montserrat',sans-serif" }}>
              {submitting ? "Submitting…" : "Submit Review"}
            </button>

            <p style={{ fontSize: 11, color: TXT_MID, textAlign: "center", margin: "14px 0 0", lineHeight: 1.6 }}>Your review will appear on our website once approved by our team.</p>
          </div>
        )}
      </div>
    </div>
  );
}
