import { supabase } from "@/integrations/supabase/client";
import { useState, useRef, useEffect } from "react";

const LOGO = "https://ekvjnydomfresnkealpb.supabase.co/storage/v1/object/public/avatars/logo_1764609621458.jpg";

const BASE_PROMPT = `You are Amanda, the AI beauty consultant for Zolara Beauty Studio in Tamale, Ghana. You are warm, knowledgeable, and a luxury sales consultant, not a FAQ bot. Your job is to make clients feel genuinely excited about visiting Zolara and guide them toward booking.

TONE AND VOICE:
- Warm, elegant, and confident. Not overly enthusiastic. No exclamation marks on every sentence.
- Speak like a knowledgeable friend who genuinely wants to help, not a chatbot running through a script.
- Never use em dashes. Use commas, colons, or periods instead.
- No filler words like "Gorgeous!" or "Amazing!" at the start of every reply. Reserve warmth for moments that call for it.
- Never use bullet point lists with emoji icons in a row. That looks cluttered and cheap.

FORMATTING RULES (critical):
- When listing services, use clean plain text grouped by category. No emoji bullet rows.
- Use short paragraphs. One idea per paragraph.
- Separate distinct ideas with a blank line so they render as separate paragraphs. One idea per paragraph.
- If you need to list items, use a simple line break between them, no dashes or bullets.
- Keep replies concise. 3 to 5 sentences for simple questions. Only go longer for Zolara Match recommendations.
- Never cram everything into one reply. If they ask what services are available, give a clean overview and invite them to ask about a specific one.
- Short replies (one sentence, a greeting, a yes/no answer) do not need paragraphs. Use paragraphs only when the reply has 2 or more distinct ideas.

LANGUAGE:
- Match the client's language automatically. If they write in Dagbani, Twi, Hausa, or French, reply in that language.

ABOUT ZOLARA:
- Location: Sakasaka, Opposite CalBank, Tamale, Ghana
- Hours: Monday to Saturday, 8:30 AM to 9:00 PM. Closed Sundays.
- Phone: 059 436 5314 / 020 884 8707
- Website: zolarasalon.com
- Instagram: @zolarastudio
- Perks: Free WiFi, complimentary bottled water, air conditioning, Exit Ritual (perfume spritz, chocolate, mirror check on the way out)

LOYALTY PROGRAM:
- 1 stamp per GHS 100 spent
- 20 stamps unlocks a GHS 50 discount
- Birthday month earns double stamps

DISCOUNTS:
- Students: 10% off Monday to Thursday with a valid student ID
- Groups of 5 or more: 10% off
- Refer 3 friends: GHS 100 credit

BOOKING AND DEPOSITS:
- All bookings require a GHS 50 deposit paid online at zolarasalon.com/book
- Deposit goes toward the total. Balance is paid at the studio.
- Cancellations with 24 or more hours notice can be rescheduled. Less than 12 hours forfeits the deposit.
- Cancellations must be done by phone call only.

ZOLARA MATCH:
If someone asks "what should I get", wants a recommendation, or says "Zolara Match", ask these three questions one at a time:
1. What is the occasion? (everyday, date night, wedding, event, work)
2. What is your budget range?
3. Do you already have anything booked or done recently?
Then give a personalised recommendation with exact prices from the live service data.

WHEN ASKED ABOUT SERVICES:
Give a clean, category-by-category overview. Example format:

Our services cover braids and protective styles, nail care, lash extensions, makeup, wig installs, and hair treatments.

For braids, we do box braids, knotless braids, cornrows, Senegalese twists, Fulani braids, and more.
For nails, we offer acrylic sets, gel manicures, pedicures, and nail art.
Lashes: classic, hybrid, and volume extension sets.
Makeup: full glam for any occasion.
Wigs: installs, styling, and customisation.

Which one are you most interested in? I can give you exact prices.

BOOKING CLOSE:
End helpful replies with: "Ready to book? Visit zolarasalon.com/book or call 059 436 5314 / 020 884 8707."

LIVE DATA FROM SYSTEM (use these exact prices, ignore any outdated prices you may know):
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


interface MessageContent {
  type: "text" | "image";
  text?: string;
  source?: { type: "base64"; media_type: string; data: string };
}
interface Message {
  role: "user" | "assistant";
  content: string | MessageContent[];
  imagePreview?: string; // local preview URL for UI only
}

const QUICK_ACTIONS = [
  "What services do you offer?",
  "How much are box braids?",
  "I want a Zolara Match",
  "How do I book?",
];


function MessageContent({ content, role }: { content: any; role: string }) {
  const text = typeof content === "string"
    ? content
    : (Array.isArray(content) ? content.find((p: any) => p.type === "text")?.text : null) || "";

  if (role !== "assistant" || !text.includes("\n\n")) {
    return <>{text}</>;
  }

  const paras = text.split("\n\n").map((p: string) => p.trim()).filter(Boolean);
  if (paras.length <= 1) return <>{text}</>;

  return (
    <>
      {paras.map((para: string, i: number) => (
        <p key={i} style={{ margin: i === 0 ? "0" : "10px 0 0", lineHeight: 1.75 }}>{para}</p>
      ))}
    </>
  );
}

export default function AmandaWidget() {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem("amanda_dismissed") === "1"; } catch { return false; }
  });
  const dismiss = () => {
    setOpen(false);
    setDismissed(true);
    try { sessionStorage.setItem("amanda_dismissed", "1"); } catch {}
  };
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi gorgeous! I'm Amanda, your personal beauty consultant at Zolara. How can I help you look stunning today? ✨" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const [systemPrompt, setSystemPrompt] = useState(BASE_PROMPT);
  const [imageFile, setImageFile] = useState<{ data: string; mime: string; preview: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
      buildSystemPrompt().then(p => setSystemPrompt(p));
    }
  }, [open]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      const [header, data] = result.split(",");
      const mime = header.match(/data:([^;]+)/)?.[1] || "image/jpeg";
      setImageFile({ data, mime, preview: result });
      // Auto-fill input with prompt if empty
      setInput(prev => prev || "Can you identify this hairstyle and tell me if Zolara does it?");
    };
    reader.readAsDataURL(file);
    // Reset file input
    e.target.value = "";
  };

  const send = async (text: string) => {
    if ((!text.trim() && !imageFile) || loading) return;
    setShowQuick(false);

    // Build content array for this message
    let userContent: string | any[];
    if (imageFile) {
      userContent = [
        { type: "image", source: { type: "base64", media_type: imageFile.mime, data: imageFile.data } },
        { type: "text", text: text.trim() || "Can you identify this hairstyle and tell me if Zolara does it?" },
      ];
    } else {
      userContent = text;
    }

    const userMsg: Message = { role: "user", content: userContent, imagePreview: imageFile?.preview };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setImageFile(null);
    setLoading(true);

    // Build messages for API — strip base64 from old history (keep only text),
    // only the last message gets full image data to avoid huge payloads
    const apiMessages = newMessages.map((m, idx) => {
      const isLast = idx === newMessages.length - 1;
      if (Array.isArray(m.content)) {
        if (isLast) return { role: m.role, content: m.content };
        // For older image messages: strip to text only
        const textPart = (m.content as any[]).find((p: any) => p.type === "text");
        return { role: m.role, content: textPart?.text || "[Image]" };
      }
      return { role: m.role, content: m.content };
    });

    try {
      const res = await fetch("/api/amanda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 700,
          system: systemPrompt + `

IMAGE ANALYSIS INSTRUCTIONS:
When a client sends a photo of a hairstyle, carefully analyze it and:
1. Identify the specific hairstyle (e.g. knotless braids, box braids, cornrows, locs, wig, etc.)
2. Describe the key features (length, size, pattern, color if relevant)
3. State clearly whether Zolara does this style (YES or NO based on the services list above)
4. If yes, give the price range from the live data
5. End with a CTA to book`,
          messages: apiMessages,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error("Amanda API error:", res.status, errData);
        throw new Error("API error " + res.status);
      }
      const data = await res.json();
      const reply = data?.content?.[0]?.text || "I'm sorry, I had a small moment there. Please try again or call us at 059 436 5314 or 020 884 8707!";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      console.error("Amanda error:", err);
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I'm having a moment. Please call us at 059 436 5314 or 020 884 8707 and we'll help you directly!" }]);
    } finally {
      setLoading(false);
    }
  };

  const gold = "#C8A97E";
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
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
            position: "fixed",
            bottom: isMobile ? "16px" : "28px",
            right: isMobile ? "16px" : "28px",
            zIndex: 999,
            width: isMobile ? "52px" : "64px",
            height: isMobile ? "52px" : "64px", borderRadius: "50%",
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
          position: "fixed",
          bottom: isMobile ? "0" : "28px",
          right: isMobile ? "0" : "28px",
          left: isMobile ? "0" : "auto",
          zIndex: 1000,
          width: isMobile ? "100%" : "368px",
          height: isMobile ? "85vh" : "540px",
          borderRadius: isMobile ? "20px 20px 0 0" : "16px",
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
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <button onClick={() => setOpen(false)} className="amanda-close" style={{
                background: "transparent", border: "none", cursor: "pointer",
                color: "rgba(245,239,230,0.5)", fontSize: "16px", padding: "6px 8px", borderRadius: "6px",
                transition: "background 0.2s", title: "Minimise",
              }}>—</button>
              <button onClick={dismiss} className="amanda-close" style={{
                background: "transparent", border: "none", cursor: "pointer",
                color: "rgba(245,239,230,0.5)", fontSize: "16px", padding: "6px 8px", borderRadius: "6px",
                transition: "background 0.2s",
              }} title="Close">✕</button>
            </div>
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
                  {m.imagePreview && (
                    <img src={m.imagePreview} alt="Uploaded" style={{ width:"100%", maxWidth:180, borderRadius:8, marginBottom:6, display:"block" }} />
                  )}
                  <MessageContent content={m.content} role={m.role} />
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
          <div style={{ borderTop: "1px solid rgba(200,169,126,0.2)", background: "#EFE7DA" }}>
            {/* Image preview */}
            {imageFile && (
              <div style={{ padding: "8px 14px 0", display: "flex", alignItems: "center", gap: 8 }}>
                <img src={imageFile.preview} alt="Preview" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", border: "1.5px solid rgba(200,169,126,0.4)" }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 11, color: "#8B6914", fontWeight: 600, margin: 0 }}>Photo ready to send</p>
                  <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 10, color: "#A8A29E", margin: 0 }}>Amanda will identify the hairstyle</p>
                </div>
                <button onClick={() => setImageFile(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#A8A29E", fontSize: 16, lineHeight: 1 }}>×</button>
              </div>
            )}
            <div style={{ padding: "10px 14px", display: "flex", gap: "8px", alignItems: "center" }}>
              {/* Hidden file input */}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
              {/* Photo button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Upload a hairstyle photo"
                style={{
                  background: imageFile ? `linear-gradient(135deg, #8B6914, ${gold})` : "rgba(200,169,126,0.15)",
                  border: `1.5px solid ${imageFile ? gold : "rgba(200,169,126,0.3)"}`,
                  borderRadius: "10px", width: "38px", height: "38px", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  transition: "all 0.2s",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: imageFile ? "#fff" : "#8B6914" }}>
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="4"/><path d="M8 3v2M16 3v2"/>
                </svg>
              </button>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && send(input)}
                placeholder={imageFile ? "Add a message (optional)..." : "Ask Amanda anything..."}
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
                disabled={loading || (!input.trim() && !imageFile)}
                className="amanda-send-btn"
                style={{
                  background: `linear-gradient(135deg, #8B6914, ${gold})`,
                  border: "none", borderRadius: "10px",
                  width: "38px", height: "38px", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  opacity: loading || (!input.trim() && !imageFile) ? 0.45 : 1,
                  transition: "opacity 0.2s", flexShrink: 0,
                }}
              >
                <span style={{ color: "#fff", fontSize: "16px", lineHeight: 1 }}>→</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
