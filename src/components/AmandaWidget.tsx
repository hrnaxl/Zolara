import { useState, useRef, useEffect } from "react";

const LOGO = "https://ekvjnydomfresnkealpb.supabase.co/storage/v1/object/public/avatars/logo_1764609621458.jpg";

const SYSTEM_PROMPT = `You are Amanda, the AI beauty consultant for Zolara Beauty Studio in Tamale, Ghana. You are warm, elegant, knowledgeable, and a luxury sales consultant — not just a FAQ bot. Your job is to make clients feel excited about visiting Zolara and help them book.

PERSONALITY:
- Speak with warmth, elegance, and sophistication
- Use phrases like "Gorgeous!", "You're going to love this", "Let me help you look stunning"
- Be conversational, never robotic
- Always guide toward booking an appointment

LANGUAGE:
- Match the client's language automatically. If they write in Dagbani, Twi, Hausa, French — reply in that language.

ABOUT ZOLARA:
- Location: Sakasaka, Opposite CalBank, Tamale, Ghana
- Hours: Monday to Saturday, 8:30 AM to 9:00 PM. Closed Sundays.
- Phone: 0594 365 314 / 020 884 8707
- Website: zolarasalon.com
- Perks: Free WiFi, free bottled water, Ghana's first salon loyalty rewards program, Exit Ritual (perfume spritz, chocolate, mirror check)

SERVICES & PRICES:
Hair: Wash GHS 40–70, Cornrows GHS 30–50, Box Braids Short GHS 160 / Medium GHS 250 / Long GHS 350+, Knotless Braids from GHS 200
Nails: Manicure Classic GHS 60 / Gel GHS 100, Pedicure Classic GHS 100 / Signature GHS 180 / Premium GHS 250, Acrylic Basic GHS 120 / Premium GHS 300
Lashes: Cluster GHS 50, Classic GHS 100, Volume GHS 180
Makeup: from GHS 150
Wig Styling: from GHS 80

ZOLARA MATCH:
If someone asks "what should I get" or "what do you recommend" or wants a Zolara Match, ask them:
1. What's the occasion? (everyday, date night, wedding, event, work)
2. What's your budget range?
3. Do you already have any services booked or done?
Then give a personalised recommendation with exact prices.

BOOKING:
Always end with "Ready to book? Visit zolarasalon.com/book or call 0594 365 314"

Keep responses concise — 2–4 sentences max unless recommending services. Never use em dashes as pauses.`;

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_ACTIONS = [
  "What services do you offer?",
  "How much are box braids?",
  "I want a Zolara Match",
  "How do I book?",
];

export default function AmandaWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi gorgeous! I'm Amanda, your personal beauty consultant at Zolara. How can I help you look stunning today? ✨" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    setShowQuick(false);
    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || "I'm sorry, I couldn't process that. Please try again!";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I'm having a moment. Please call us at 0594 365 314 and we'll help you directly!" }]);
    } finally {
      setLoading(false);
    }
  };

  const gold = "#C8A97E";
  const dark = "#1C160E";

  return (
    <>
      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(200,169,126,0.4); } 50% { box-shadow: 0 0 0 12px rgba(200,169,126,0); } }
        @keyframes typingDot { 0%,80%,100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
        .amanda-window { animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1); }
        .pulse-btn { animation: pulse 2.5s infinite; }
        .typing-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ${gold}; margin: 0 2px; animation: typingDot 1.2s ease-in-out infinite; }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        .msg-bubble { max-width: 82%; word-break: break-word; line-height: 1.55; }
        .quick-btn:hover { background: rgba(200,169,126,0.2) !important; border-color: ${gold} !important; }
        .send-btn:hover { background: rgba(200,169,126,0.9) !important; }
        .close-btn:hover { background: rgba(255,255,255,0.1) !important; }
      `}</style>

      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="pulse-btn"
          style={{
            position: "fixed", bottom: "28px", right: "28px", zIndex: 999,
            width: "64px", height: "64px", borderRadius: "50%",
            background: `linear-gradient(135deg, #8B6914, ${gold})`,
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: "column", gap: "2px",
          }}
          title="Chat with Amanda"
        >
          <div style={{ width: "32px", height: "32px", borderRadius: "50%", overflow: "hidden", border: "1.5px solid rgba(255,255,255,0.4)" }}>
            <img src={LOGO} alt="Amanda" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div className="amanda-window" style={{
          position: "fixed", bottom: "28px", right: "28px", zIndex: 1000,
          width: "360px", height: "520px",
          background: "#F5EFE6",
          borderRadius: "12px",
          boxShadow: "0 24px 80px rgba(28,22,14,0.25), 0 0 0 1px rgba(200,169,126,0.2)",
          display: "flex", flexDirection: "column", overflow: "hidden",
          fontFamily: "'Montserrat', sans-serif",
        }}>
          {/* Header */}
          <div style={{
            background: `linear-gradient(135deg, ${dark}, #2C2416)`,
            padding: "14px 16px",
            display: "flex", alignItems: "center", gap: "10px",
            borderBottom: `1px solid rgba(200,169,126,0.2)`,
          }}>
            <div style={{ width: "38px", height: "38px", borderRadius: "50%", overflow: "hidden", border: `1.5px solid ${gold}`, flexShrink: 0 }}>
              <img src={LOGO} alt="Amanda" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#F5EFE6", letterSpacing: "0.05em" }}>Amanda</div>
              <div style={{ fontSize: "10px", color: gold, letterSpacing: "0.1em" }}>
                <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "#4ade80", marginRight: "4px", verticalAlign: "middle" }} />
                ZOLARA BEAUTY CONSULTANT
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="close-btn" style={{
              background: "transparent", border: "none", cursor: "pointer",
              color: "rgba(245,239,230,0.6)", fontSize: "18px", padding: "4px 8px", borderRadius: "4px",
            }}>✕</button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", gap: "8px", alignItems: "flex-end" }}>
                {m.role === "assistant" && (
                  <div style={{ width: "26px", height: "26px", borderRadius: "50%", overflow: "hidden", flexShrink: 0, border: `1px solid ${gold}` }}>
                    <img src={LOGO} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                )}
                <div className="msg-bubble" style={{
                  background: m.role === "user"
                    ? `linear-gradient(135deg, #8B6914, ${gold})`
                    : "#fff",
                  color: m.role === "user" ? "#fff" : dark,
                  padding: "10px 13px",
                  borderRadius: m.role === "user" ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                  fontSize: "13px",
                  boxShadow: "0 2px 8px rgba(28,22,14,0.08)",
                  border: m.role === "assistant" ? `1px solid rgba(200,169,126,0.15)` : "none",
                }}>
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
                <div style={{ width: "26px", height: "26px", borderRadius: "50%", overflow: "hidden", border: `1px solid ${gold}` }}>
                  <img src={LOGO} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ background: "#fff", border: `1px solid rgba(200,169,126,0.15)`, borderRadius: "14px 14px 14px 2px", padding: "12px 16px", boxShadow: "0 2px 8px rgba(28,22,14,0.08)" }}>
                  <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                </div>
              </div>
            )}

            {/* Quick actions */}
            {showQuick && messages.length === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
                {QUICK_ACTIONS.map(q => (
                  <button key={q} className="quick-btn" onClick={() => send(q)} style={{
                    background: "transparent", border: `1px solid rgba(200,169,126,0.3)`,
                    borderRadius: "8px", padding: "8px 12px", fontSize: "12px",
                    color: "#5C4D3A", cursor: "pointer", textAlign: "left",
                    transition: "all 0.2s",
                  }}>{q}</button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: "12px 14px",
            borderTop: `1px solid rgba(200,169,126,0.2)`,
            background: "#F0E8DC",
            display: "flex", gap: "8px", alignItems: "center",
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send(input)}
              placeholder="Ask Amanda anything..."
              style={{
                flex: 1, border: `1px solid rgba(200,169,126,0.3)`,
                borderRadius: "8px", padding: "9px 12px", fontSize: "13px",
                background: "#fff", color: dark, outline: "none",
                fontFamily: "'Montserrat', sans-serif",
              }}
            />
            <button
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
              className="send-btn"
              style={{
                background: `linear-gradient(135deg, #8B6914, ${gold})`,
                border: "none", borderRadius: "8px",
                width: "36px", height: "36px", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                opacity: loading || !input.trim() ? 0.5 : 1,
                transition: "all 0.2s", flexShrink: 0,
              }}
            >
              <span style={{ color: "#fff", fontSize: "14px" }}>→</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
