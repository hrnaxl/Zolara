import { supabase } from "@/integrations/supabase/client";
import { useState, useRef, useEffect } from "react";

const LOGO = "https://ekvjnydomfresnkealpb.supabase.co/storage/v1/object/public/avatars/logo_1764609621458.jpg";

const BASE_PROMPT = `You are Amanda, the AI beauty consultant for Zolara Beauty Studio in Tamale, Ghana. You are warm, elegant, knowledgeable, and a luxury sales consultant, not just a FAQ bot. Your job is to make clients feel excited about visiting Zolara and help them book.

PERSONALITY:
- Speak with warmth, elegance, and sophistication
- Use phrases like "Gorgeous!", "You're going to love this", "Let me help you look stunning"
- Be conversational, never robotic
- Always guide toward booking an appointment
- Never use em dashes as pauses. Use commas, colons, or periods instead.

LANGUAGE:
- Match the client's language automatically. If they write in Dagbani, Twi, Hausa, French, reply in that language.

ABOUT ZOLARA:
- Location: Sakasaka, Opposite CalBank, Tamale, Ghana
- Hours: Monday to Saturday, 8:30 AM to 9:00 PM. Closed Sundays.
- Phone: 0594 365 314 / 020 884 8707
- Website: zolarasalon.com
- Instagram: @zolarastudio
- Perks: Free WiFi, free bottled water, Arctic AC, Ghana's first salon loyalty rewards program, Exit Ritual (perfume spritz, chocolate, mirror check)

LOYALTY PROGRAM:
- 1 stamp per GHS 100 spent
- 20 stamps = GHS 50 discount
- Birthday month = double stamps

DISCOUNTS:
- Student 10% off Mon to Thu with student ID
- Group 5+ people: 10% off
- Refer 3 friends: GHS 100 credit

BOOKING AND DEPOSITS:
- All bookings require a GHS 50 deposit paid online at zolarasalon.com/book
- Deposit is applied to the total cost; client pays balance at the studio
- Cancellations: 24+ hours for full reschedule, less than 12 hours forfeits deposit
- Cancellations must be done by phone call only

ZOLARA MATCH:
If someone asks "what should I get" or wants a recommendation or says "Zolara Match", ask:
1. What's the occasion? (everyday, date night, wedding, event, work)
2. What's your budget range?
3. Do you already have any services booked or done?
Then give a personalised recommendation with exact prices from the live service data below.

BOOKING:
Always end with: "Ready to book? Visit zolarasalon.com/book or call 059 436 5314"

Keep responses concise: 2 to 4 sentences max unless recommending services. Be warm and welcoming.

LIVE DATA FROM SYSTEM (use these exact prices — ignore any outdated prices you may know):
`;

async function buildSystemPrompt(): Promise<string> {
  try {
    const [svcRes, varRes, addRes, gcRes, promoRes] = await Promise.all([
      supabase.from("services").select("name, category, price, description").eq("is_active", true).order("category").order("name"),
      (supabase as any).from("service_variants").select("service_id, name, price_adjustment").eq("is_active", true).order("sort_order"),
      (supabase as any).from("service_addons").select("service_id, name, price").eq("is_active", true).order("sort_order"),
      (supabase as any).from("gift_cards").select("name, amount, description").eq("is_active", true).order("amount").limit(20),
      (supabase as any).from("promo_codes").select("code, discount_type, discount_value, description").eq("is_active", true).limit(20),
    ]);

    const services = svcRes.data || [];
    const variants: Record<string, any[]> = {};
    for (const v of (varRes.data || [])) {
      if (!variants[v.service_id]) variants[v.service_id] = [];
      variants[v.service_id].push(v);
    }
    const addons: Record<string, any[]> = {};
    for (const a of (addRes.data || [])) {
      if (!addons[a.service_id]) addons[a.service_id] = [];
      addons[a.service_id].push(a);
    }

    // Group services by category
    const grouped: Record<string, any[]> = {};
    for (const s of services) {
      if (!grouped[s.category]) grouped[s.category] = [];
      grouped[s.category].push(s);
    }

    let serviceBlock = "\nSERVICES AND PRICES (live from system):\n";
    for (const [cat, svcs] of Object.entries(grouped)) {
      serviceBlock += `
${cat.toUpperCase()}:
`;
      for (const s of svcs) {
        const vars = variants[s.id] || [];
        if (vars.length > 0) {
          const varStr = vars.map((v: any) => `${v.name} GHS ${Number(v.price_adjustment).toLocaleString()}`).join(", ");
          serviceBlock += `- ${s.name}: ${varStr}
`;
          const adds = addons[s.id] || [];
          if (adds.length > 0) {
            serviceBlock += `  Add-ons: ${adds.map((a: any) => `${a.name} +GHS ${Number(a.price).toLocaleString()}`).join(", ")}
`;
          }
        } else {
          const price = Number(s.price);
          serviceBlock += `- ${s.name}${price > 0 ? ` GHS ${price.toLocaleString()}` : ""}
`;
        }
      }
    }

    let giftBlock = "";
    if (gcRes.data && gcRes.data.length > 0) {
      giftBlock = "\nGIFT CARDS (live):\n";
      for (const g of gcRes.data) {
        giftBlock += `- ${g.name}: GHS ${Number(g.amount).toLocaleString()}${g.description ? ` (${g.description})` : ""}\n`;
      }
      giftBlock += "Valid 12 months, redeemable for any service.\n";
    }

    let promoBlock = "";
    if (promoRes.data && promoRes.data.length > 0) {
      promoBlock = "\nACTIVE PROMO CODES (share only when asked):\n";
      for (const p of promoRes.data) {
        const disc = p.discount_type === "percentage" ? `${p.discount_value}% off` : `GHS ${p.discount_value} off`;
        promoBlock += `- ${p.code}: ${disc}${p.description ? ` (${p.description})` : ""}\n`;
      }
    }

    return BASE_PROMPT + serviceBlock + giftBlock + promoBlock;
  } catch {
    return BASE_PROMPT + "\n(Live service data temporarily unavailable. Use your best knowledge of Zolara services.)\n";
  }
}


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
  const [systemPrompt, setSystemPrompt] = useState(BASE_PROMPT);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
      buildSystemPrompt().then(p => setSystemPrompt(p));
    }
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
      const res = await fetch("/api/amanda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 600,
          system: systemPrompt,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      const reply = data?.content?.[0]?.text || "I'm sorry, I had a small moment there. Please try again or call us at 059 436 5314!";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I'm having a moment. Please call us at 059 436 5314 and we'll help you directly!" }]);
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
        @keyframes amandaPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(200,169,126,0.4); } 50% { box-shadow: 0 0 0 12px rgba(200,169,126,0); } }
        @keyframes typingDot { 0%,80%,100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
        .amanda-window { animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1); }
        .amanda-pulse { animation: amandaPulse 2.5s infinite; }
        .typing-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ${gold}; margin: 0 2px; animation: typingDot 1.2s ease-in-out infinite; }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        .msg-bubble { max-width: 82%; word-break: break-word; line-height: 1.6; }
        .quick-btn:hover { background: rgba(200,169,126,0.18) !important; border-color: ${gold} !important; color: #3D2E1A !important; }
        .amanda-send-btn:hover { opacity: 0.88 !important; }
        .amanda-close:hover { background: rgba(255,255,255,0.12) !important; }
      `}</style>

      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="amanda-pulse"
          style={{
            position: "fixed", bottom: "28px", right: "28px", zIndex: 999,
            width: "64px", height: "64px", borderRadius: "50%",
            background: `linear-gradient(135deg, #8B6914, ${gold})`,
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          title="Chat with Amanda"
        >
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", overflow: "hidden", border: "2px solid rgba(255,255,255,0.45)" }}>
            <img src={LOGO} alt="Amanda" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div className="amanda-window" style={{
          position: "fixed", bottom: "28px", right: "28px", zIndex: 1000,
          width: "368px", height: "540px",
          background: "#FDFAF6",
          borderRadius: "16px",
          boxShadow: "0 32px 100px rgba(28,22,14,0.28), 0 0 0 1px rgba(200,169,126,0.22)",
          display: "flex", flexDirection: "column", overflow: "hidden",
          fontFamily: "'Montserrat', sans-serif",
        }}>

          {/* Header */}
          <div style={{
            background: `linear-gradient(135deg, ${dark} 0%, #2C2416 100%)`,
            padding: "16px 18px",
            display: "flex", alignItems: "center", gap: "12px",
            borderBottom: "1px solid rgba(200,169,126,0.18)",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 80% 50%, rgba(200,169,126,0.1) 0%, transparent 60%)", pointerEvents: "none" }} />
            <div style={{ width: "42px", height: "42px", borderRadius: "50%", overflow: "hidden", border: `2px solid ${gold}`, flexShrink: 0, boxShadow: "0 0 0 3px rgba(200,169,126,0.15)" }}>
              <img src={LOGO} alt="Amanda" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#F5EFE6", letterSpacing: "0.05em" }}>Amanda</div>
              <div style={{ fontSize: "9px", color: gold, letterSpacing: "0.14em", fontWeight: 600, marginTop: "2px", display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "#4ade80" }} />
                ZOLARA BEAUTY CONSULTANT
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="amanda-close" style={{
              background: "transparent", border: "none", cursor: "pointer",
              color: "rgba(245,239,230,0.5)", fontSize: "16px", padding: "6px 8px", borderRadius: "6px",
              transition: "background 0.2s",
            }}>✕</button>
          </div>

          {/* Messages area */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: "12px", background: "#F8F3EC" }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", gap: "8px", alignItems: "flex-end" }}>
                {m.role === "assistant" && (
                  <div style={{ width: "28px", height: "28px", borderRadius: "50%", overflow: "hidden", flexShrink: 0, border: `1.5px solid ${gold}` }}>
                    <img src={LOGO} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                )}
                <div className="msg-bubble" style={{
                  background: m.role === "user"
                    ? `linear-gradient(135deg, #8B6914, ${gold})`
                    : "#fff",
                  color: m.role === "user" ? "#fff" : "#1C160E",
                  padding: "11px 14px",
                  borderRadius: m.role === "user" ? "16px 16px 3px 16px" : "16px 16px 16px 3px",
                  fontSize: "13px", fontWeight: 400,
                  boxShadow: "0 2px 10px rgba(28,22,14,0.08)",
                  border: m.role === "assistant" ? "1px solid rgba(200,169,126,0.18)" : "none",
                }}>
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "50%", overflow: "hidden", border: `1.5px solid ${gold}` }}>
                  <img src={LOGO} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ background: "#fff", border: "1px solid rgba(200,169,126,0.18)", borderRadius: "16px 16px 16px 3px", padding: "13px 16px", boxShadow: "0 2px 10px rgba(28,22,14,0.08)" }}>
                  <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                </div>
              </div>
            )}

            {showQuick && messages.length === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "7px", marginTop: "4px" }}>
                {QUICK_ACTIONS.map(q => (
                  <button key={q} className="quick-btn" onClick={() => send(q)} style={{
                    background: "rgba(200,169,126,0.08)", border: "1px solid rgba(200,169,126,0.25)",
                    borderRadius: "10px", padding: "9px 13px", fontSize: "12px", fontWeight: 500,
                    color: "#5C4D3A", cursor: "pointer", textAlign: "left",
                    transition: "all 0.2s", fontFamily: "'Montserrat', sans-serif",
                  }}>{q}</button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input row */}
          <div style={{
            padding: "12px 14px",
            borderTop: "1px solid rgba(200,169,126,0.2)",
            background: "#EFE7DA",
            display: "flex", gap: "8px", alignItems: "center",
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send(input)}
              placeholder="Ask Amanda anything..."
              style={{
                flex: 1, border: "1.5px solid rgba(200,169,126,0.3)",
                borderRadius: "10px", padding: "10px 13px", fontSize: "13px",
                background: "#fff", color: dark, outline: "none",
                fontFamily: "'Montserrat', sans-serif", transition: "border-color 0.2s",
              }}
              onFocus={e => (e.target.style.borderColor = gold)}
              onBlur={e => (e.target.style.borderColor = "rgba(200,169,126,0.3)")}
            />
            <button
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
              className="amanda-send-btn"
              style={{
                background: `linear-gradient(135deg, #8B6914, ${gold})`,
                border: "none", borderRadius: "10px",
                width: "38px", height: "38px", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                opacity: loading || !input.trim() ? 0.45 : 1,
                transition: "opacity 0.2s", flexShrink: 0,
              }}
            >
              <span style={{ color: "#fff", fontSize: "16px", lineHeight: 1 }}>→</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
