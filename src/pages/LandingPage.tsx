import { Link } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, X, Send, Loader2, Menu, Star, ArrowRight, Wifi, Droplets, Sparkles, Users, Shield, Clock, Phone, MapPin, ChevronDown } from "lucide-react";

// ─── PALETTE: Warm Ivory · Antique Gold · Dusty Rose · Deep Espresso ─────────
const C = {
  ivory:     "#FBF8F4",
  parchment: "#F5EDD8",
  blush:     "#F0DDD0",
  rose:      "#C9967A",
  gold:      "#C49A52",
  goldLight: "#DDB96E",
  goldPale:  "#EDD9A8",
  espresso:  "#1E110A",
  mocha:     "#2E1A10",
  mahogany:  "#4A2E1A",
  sienna:    "#8C5E3C",
  taupe:     "#A8917A",
  mist:      "#DDD0C4",
  white:     "#FFFFFF",
};

// ─── AMANDA WIDGET ────────────────────────────────────────────────────────────
const SYSTEM = `You are Amanda, Zolara Beauty Studio's AI beauty consultant in Sakasaka, Tamale, Ghana (Opposite CalBank). Be warm, concise, feminine, and professional. Services: Hair & Braiding from GHS 80, Nail Artistry from GHS 60, Lash Extensions from GHS 65, Makeup from GHS 125, Pedicure & Manicure from GHS 100, Wigs & Styling from GHS 150. Hours: Mon-Sat 8:30AM-9PM. Phone: 0594 365 314. Never use em-dashes or hyphens as pauses.`;

type Msg = { role: "user" | "assistant"; content: string };

function Amanda() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", content: "Hello, beautiful. I'm Amanda. How can I help you today?" }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, open]);

  const send = async () => {
    const t = input.trim(); if (!t || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: t }];
    setMsgs(next); setInput(""); setBusy(true);
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 300, system: SYSTEM, messages: next }),
      });
      const d = await r.json();
      setMsgs([...next, { role: "assistant", content: d?.content?.[0]?.text ?? "Please call us on 0594 365 314." }]);
    } catch { setMsgs([...next, { role: "assistant", content: "Please call us on 0594 365 314." }]); }
    finally { setBusy(false); }
  };

  return (
    <>
      {open && (
        <div style={{ position: "fixed", bottom: 92, right: 24, zIndex: 1000, width: 320, maxHeight: 480, borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 64px rgba(30,17,10,0.18)", border: `1px solid ${C.mist}`, display: "flex", flexDirection: "column", backgroundColor: C.ivory }}>
          <div style={{ background: `linear-gradient(135deg, ${C.espresso} 0%, ${C.mocha} 100%)`, padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: C.espresso, fontFamily: "Cormorant Garamond, serif" }}>A</div>
              <div><p style={{ color: C.ivory, fontSize: 13, fontWeight: 600, margin: 0, fontFamily: "Cormorant Garamond, serif", letterSpacing: "0.05em" }}>Amanda</p><p style={{ color: C.taupe, fontSize: 9, margin: 0, letterSpacing: "0.15em", fontFamily: "Jost, sans-serif" }}>ZOLARA AI CONSULTANT</p></div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: C.taupe, cursor: "pointer" }}><X size={15} /></button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10, maxHeight: 300 }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "82%", padding: "10px 14px", borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", fontSize: 13, lineHeight: 1.6, background: m.role === "user" ? `linear-gradient(135deg, ${C.espresso}, ${C.mocha})` : C.parchment, color: m.role === "user" ? C.ivory : C.espresso, border: m.role === "assistant" ? `1px solid ${C.mist}` : "none" }}>{m.content}</div>
              </div>
            ))}
            {busy && <div style={{ display: "flex", justifyContent: "flex-start" }}><div style={{ padding: "10px 14px", borderRadius: "16px 16px 16px 4px", background: C.parchment, border: `1px solid ${C.mist}` }}><Loader2 size={14} style={{ color: C.gold, animation: "spin 1s linear infinite" }} /></div></div>}
            <div ref={endRef} />
          </div>
          <div style={{ padding: "12px 14px", borderTop: `1px solid ${C.mist}`, display: "flex", gap: 8 }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Ask me anything..." style={{ flex: 1, padding: "10px 14px", borderRadius: 40, border: `1px solid ${C.mist}`, fontSize: 13, outline: "none", backgroundColor: C.white, color: C.espresso, fontFamily: "Jost, sans-serif" }} />
            <button onClick={send} disabled={busy || !input.trim()} style={{ width: 38, height: 38, borderRadius: "50%", border: "none", background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: !input.trim() ? 0.4 : 1 }}><Send size={13} color={C.espresso} /></button>
          </div>
        </div>
      )}
      <button onClick={() => setOpen(o => !o)} style={{ position: "fixed", bottom: 28, right: 24, zIndex: 1000, width: 56, height: 56, borderRadius: "50%", border: "none", background: `linear-gradient(135deg, ${C.espresso}, ${C.mocha})`, boxShadow: `0 8px 32px rgba(30,17,10,0.24)`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}>
        {open ? <X size={18} color={C.goldLight} /> : <MessageCircle size={20} color={C.goldLight} />}
      </button>
    </>
  );
}

// ─── SCROLL ANIMATION HOOK ────────────────────────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

// ─── REVEAL WRAPPER ───────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, dir = "up" }: { children: React.ReactNode; delay?: number; dir?: "up" | "left" | "right" | "fade" }) {
  const { ref, visible } = useReveal();
  const transforms: Record<string, string> = { up: "translateY(32px)", left: "translateX(-32px)", right: "translateX(32px)", fade: "none" };
  return (
    <div ref={ref} style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : transforms[dir], transition: `opacity 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}s` }}>
      {children}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [heroLoaded, setHeroLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHeroLoaded(true), 100);
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    supabase.from("reviews" as any).select("*").eq("visible", true).limit(6)
      .then(({ data }) => setReviews(data || []));
    return () => { window.removeEventListener("scroll", onScroll); clearTimeout(t); };
  }, []);

  const navLinks = [
    { label: "Experience", href: "#experience" },
    { label: "Services", href: "#services" },
    { label: "Gift Cards", href: "#giftcards" },
    { label: "Reviews", href: "#reviews" },
    { label: "Visit Us", href: "#visit" },
  ];

  const services = [
    { num: "01", name: "Hair & Braiding", desc: "Cornrows, knotless braids, Fulani, Rasta, Boho styles and natural hair care.", price: "From GHS 80", accent: C.rose },
    { num: "02", name: "Nail Artistry", desc: "Gel polish, acrylic sets, nail art and toenail services with top-tier products.", price: "From GHS 60", accent: C.gold },
    { num: "03", name: "Lash Extensions", desc: "Classic, Hybrid, Wispy, Volume and Mega Volume sets with professional removal.", price: "From GHS 65", accent: C.rose },
    { num: "04", name: "Makeup", desc: "Natural Glow, Soft Glam, Full Glam, Bridal and photoshoot makeup.", price: "From GHS 125", accent: C.gold },
    { num: "05", name: "Pedicure & Manicure", desc: "Classic, Jelly and Signature Pedicures. Classic and Special Manicures.", price: "From GHS 100", accent: C.rose },
    { num: "06", name: "Wigs & Styling", desc: "Glueless, HD lace and full lace installs. Wig coloring and sew-ins.", price: "From GHS 150", accent: C.gold },
  ];

  const perks = [
    { icon: Droplets, title: "Complimentary Water", desc: "Chilled bottled water for every client, always." },
    { icon: Wifi, title: "Free High-Speed WiFi", desc: "Stay connected throughout your visit." },
    { icon: Sparkles, title: "The Exit Ritual", desc: "Perfume spritz, mirror check, and the confidence you came for." },
    { icon: Users, title: "Expert Team", desc: "Certified specialists in every category." },
    { icon: Shield, title: "Premium Products", desc: "International quality products only." },
    { icon: Clock, title: "Flexible Hours", desc: "Open Monday to Saturday, 8:30 AM to 9:00 PM." },
  ];

  const giftTiers = [
    { name: "Silver", price: "GHS 220", desc: "Perfect for a single service treat", highlight: false },
    { name: "Gold", price: "GHS 450", desc: "A full afternoon of beauty", highlight: true },
    { name: "Platinum", price: "GHS 650", desc: "The complete Zolara experience", highlight: false },
    { name: "Diamond", price: "GHS 1,000", desc: "Ultimate luxury for someone special", highlight: true },
  ];

  const faqs = [
    { q: "Do I need to book in advance?", a: "We strongly recommend booking in advance to secure your preferred time. Walk-ins are welcome based on availability." },
    { q: "What is your cancellation policy?", a: "We ask for at least 24 hours notice. Late cancellations may incur a small fee." },
    { q: "Do you provide products and materials?", a: "Yes. All products are provided by Zolara. We use only premium, internationally sourced products." },
    { q: "How long do services take?", a: "Braiding: 2 to 6 hours. Nails and lashes: 1 to 2 hours. Makeup: 1 to 2 hours." },
    { q: "What payment methods do you accept?", a: "Cash, mobile money (MTN, Vodafone, AirtelTigo), and bank transfers." },
  ];

  const h = (delay: number, style: React.CSSProperties = {}) => ({
    ...style,
    opacity: heroLoaded ? 1 : 0,
    transform: heroLoaded ? "none" : "translateY(28px)",
    transition: `opacity 1s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 1s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
  });

  return (
    <div style={{ backgroundColor: C.ivory, color: C.espresso, fontFamily: "'Cormorant Garamond', Georgia, serif", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=Jost:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        .jost { font-family: 'Jost', sans-serif; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes float { 0%,100% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-12px) rotate(1deg); } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes pulse-ring { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(196,154,82,0.4); } 70% { transform: scale(1); box-shadow: 0 0 0 14px rgba(196,154,82,0); } 100% { transform: scale(0.95); } }
        .svc-card { transition: transform 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s cubic-bezier(0.16,1,0.3,1); }
        .svc-card:hover { transform: translateY(-6px); box-shadow: 0 24px 56px rgba(30,17,10,0.1); }
        .btn-dark { transition: all 0.25s cubic-bezier(0.16,1,0.3,1); background: ${C.espresso}; color: ${C.ivory}; }
        .btn-dark:hover { background: ${C.mocha}; transform: translateY(-2px); box-shadow: 0 12px 32px rgba(30,17,10,0.2); }
        .btn-gold { transition: all 0.25s cubic-bezier(0.16,1,0.3,1); }
        .btn-gold:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(196,154,82,0.3); filter: brightness(1.05); }
        .btn-ghost { transition: all 0.25s; border: 1px solid ${C.espresso}; color: ${C.espresso}; background: transparent; }
        .btn-ghost:hover { background: ${C.espresso}; color: ${C.ivory}; }
        .nav-link { transition: color 0.2s; color: ${C.taupe}; }
        .nav-link:hover { color: ${C.gold}; }
        .gift-card { transition: transform 0.35s cubic-bezier(0.16,1,0.3,1), box-shadow 0.35s; }
        .gift-card:hover { transform: translateY(-4px); box-shadow: 0 20px 48px rgba(30,17,10,0.12); }
        .perk-card { transition: transform 0.3s, box-shadow 0.3s; }
        .perk-card:hover { transform: translateY(-3px); box-shadow: 0 16px 40px rgba(30,17,10,0.08); }
        .faq-answer { overflow: hidden; transition: max-height 0.4s cubic-bezier(0.16,1,0.3,1), opacity 0.3s; }
        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
          .hero-h1 { font-size: clamp(38px, 9vw, 72px) !important; }
          .two-col { grid-template-columns: 1fr !important; gap: 40px !important; }
          .three-col { grid-template-columns: 1fr !important; }
          .two-col-gift { grid-template-columns: 1fr !important; }
          .section-px { padding-left: 20px !important; padding-right: 20px !important; }
          .nav-px { padding-left: 20px !important; padding-right: 20px !important; }
        }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: "0 48px", height: 72,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
        backgroundColor: scrolled ? "rgba(251,248,244,0.94)" : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: scrolled ? `1px solid ${C.mist}` : "1px solid transparent",
      }} className="nav-px">
        <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/logo.png" alt="Zolara" style={{ width: 42, height: 42, objectFit: "contain" }} />
          <div>
            <p style={{ fontSize: 15, fontWeight: 500, color: C.espresso, letterSpacing: "0.18em", lineHeight: 1 }}>ZOLARA</p>
            <p className="jost" style={{ fontSize: 8, color: C.taupe, letterSpacing: "0.25em", marginTop: 3 }}>BEAUTY STUDIO</p>
          </div>
        </Link>

        <div className="hide-mobile" style={{ display: "flex", alignItems: "center", gap: 40 }}>
          {navLinks.map(({ label, href }) => (
            <a key={href} href={href} className="nav-link jost" style={{ textDecoration: "none", fontSize: 11, fontWeight: 500, letterSpacing: "0.14em" }}>{label.toUpperCase()}</a>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link to="/book" style={{ textDecoration: "none" }}>
            <button className="btn-dark jost" style={{ padding: "10px 26px", border: "none", fontSize: 10, fontWeight: 600, letterSpacing: "0.16em", borderRadius: 2, cursor: "pointer" }}>BOOK NOW</button>
          </Link>
          <button className="hide-mobile" onClick={() => setMenuOpen(o => !o)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <Menu size={18} color={C.taupe} />
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        minHeight: "100vh",
        background: `
          radial-gradient(ellipse 80% 60% at 70% 40%, ${C.blush}60 0%, transparent 60%),
          radial-gradient(ellipse 60% 80% at 10% 80%, ${C.parchment}80 0%, transparent 50%),
          linear-gradient(160deg, ${C.ivory} 0%, #F2E8DA 50%, #EDE0CC 100%)
        `,
        display: "flex", alignItems: "center",
        paddingTop: 80, position: "relative", overflow: "hidden",
      }}>
        {/* Floating decorative orbs */}
        <div style={{ position: "absolute", top: "12%", right: "14%", width: 280, height: 280, borderRadius: "50%", background: `radial-gradient(circle, ${C.blush}50 0%, transparent 70%)`, animation: "float 7s ease-in-out infinite", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "15%", left: "4%", width: 180, height: 180, borderRadius: "50%", background: `radial-gradient(circle, ${C.parchment}80 0%, transparent 70%)`, animation: "float 9s ease-in-out infinite reverse", pointerEvents: "none" }} />

        {/* Thin decorative lines */}
        <div style={{ position: "absolute", top: "20%", right: "7%", width: 1, height: 140, background: `linear-gradient(to bottom, transparent, ${C.gold}50, transparent)` }} />
        <div style={{ position: "absolute", bottom: "25%", left: "5%", width: 100, height: 1, background: `linear-gradient(to right, transparent, ${C.gold}50, transparent)` }} />
        <div style={{ position: "absolute", top: "60%", right: "22%", width: 60, height: 1, background: `linear-gradient(to right, ${C.rose}40, transparent)` }} />

        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 48px", width: "100%" }} className="section-px">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 60, alignItems: "center" }} className="two-col">
            <div>
              <div style={h(0.15, { display: "flex", alignItems: "center", gap: 14, marginBottom: 30 })}>
                <div style={{ width: 36, height: 1, background: `linear-gradient(to right, ${C.rose}, ${C.gold})` }} />
                <span className="jost" style={{ fontSize: 10, letterSpacing: "0.3em", color: C.sienna, fontWeight: 500 }}>TAMALE'S PREMIER LUXURY STUDIO</span>
              </div>

              <h1 className="hero-h1" style={h(0.25, { fontSize: "clamp(44px, 5.5vw, 82px)", fontWeight: 300, lineHeight: 1.06, color: C.espresso, marginBottom: 28 })}>
                Where Luxury<br />
                <em style={{ color: C.rose, fontStyle: "italic" }}>Meets Beauty</em><br />
                in Tamale.
              </h1>

              <p className="jost" style={h(0.38, { fontSize: 15, lineHeight: 1.85, color: C.taupe, maxWidth: 480, marginBottom: 44, fontWeight: 300 })}>
                A sanctuary where every woman is treated to world-class beauty services, premium products, and an experience designed to make you feel extraordinary.
              </p>

              <div style={h(0.48, { display: "flex", gap: 14, flexWrap: "wrap" })}>
                <Link to="/book" style={{ textDecoration: "none" }}>
                  <button className="btn-dark jost" style={{ padding: "16px 40px", border: "none", fontSize: 11, fontWeight: 600, letterSpacing: "0.16em", borderRadius: 2, cursor: "pointer" }}>
                    BOOK APPOINTMENT
                  </button>
                </Link>
                <a href="#services" style={{ textDecoration: "none" }}>
                  <button className="btn-ghost jost" style={{ padding: "16px 40px", fontSize: 11, fontWeight: 500, letterSpacing: "0.16em", borderRadius: 2, cursor: "pointer" }}>
                    VIEW SERVICES
                  </button>
                </a>
              </div>

              <div className="jost" style={h(0.58, { display: "flex", gap: 36, marginTop: 56 })}>
                {[["Free WiFi", "For every client"], ["Free Water", "Always chilled"], ["Loyalty Points", "Ghana's first"]].map(([t, s]) => (
                  <div key={t}>
                    <div style={{ width: 20, height: 2, background: `linear-gradient(to right, ${C.rose}, ${C.gold})`, marginBottom: 8, borderRadius: 2 }} />
                    <p style={{ fontSize: 12, fontWeight: 600, color: C.espresso, letterSpacing: "0.08em" }}>{t}</p>
                    <p style={{ fontSize: 11, color: C.taupe, marginTop: 3 }}>{s}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero card */}
            <div className="hide-mobile" style={h(0.3, {})}>
              <div style={{ background: C.white, borderRadius: 12, padding: 36, boxShadow: "0 32px 80px rgba(30,17,10,0.1), 0 2px 0 rgba(196,154,82,0.15) inset", border: `1px solid ${C.mist}`, position: "relative", overflow: "hidden" }}>
                {/* Gold accent top */}
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(to right, ${C.rose}, ${C.gold}, ${C.goldLight})` }} />
                {/* Subtle background pattern */}
                <div style={{ position: "absolute", bottom: -20, right: -20, width: 120, height: 120, borderRadius: "50%", background: `radial-gradient(circle, ${C.blush}40 0%, transparent 70%)`, pointerEvents: "none" }} />

                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4CAF50", animation: "pulse-ring 2s infinite" }} />
                  <p className="jost" style={{ fontSize: 11, color: C.sienna, letterSpacing: "0.18em", fontWeight: 500 }}>OPEN TODAY</p>
                </div>

                <p style={{ fontSize: 36, fontWeight: 300, color: C.espresso, marginBottom: 4, lineHeight: 1 }}>8:30 AM</p>
                <p className="jost" style={{ fontSize: 12, color: C.taupe, marginBottom: 28, fontWeight: 300 }}>Until 9:00 PM. Monday to Saturday</p>

                <div style={{ borderTop: `1px solid ${C.mist}`, paddingTop: 22, marginBottom: 22 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <MapPin size={14} color={C.rose} style={{ marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <p className="jost" style={{ fontSize: 9, letterSpacing: "0.18em", color: C.taupe, marginBottom: 5 }}>FIND US AT</p>
                      <p style={{ fontSize: 14, color: C.espresso, lineHeight: 1.5 }}>Sakasaka, Opposite CalBank<br />Tamale, Ghana</p>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: `1px solid ${C.mist}`, paddingTop: 22, marginBottom: 28 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <Phone size={14} color={C.gold} style={{ marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <p className="jost" style={{ fontSize: 9, letterSpacing: "0.18em", color: C.taupe, marginBottom: 5 }}>CALL US</p>
                      <p style={{ fontSize: 14, color: C.espresso }}>0594 365 314</p>
                      <p className="jost" style={{ fontSize: 12, color: C.taupe }}>020 884 8707</p>
                    </div>
                  </div>
                </div>

                <Link to="/book" style={{ textDecoration: "none", display: "block" }}>
                  <button className="btn-gold jost" style={{ width: "100%", padding: "14px", background: `linear-gradient(135deg, ${C.rose}, ${C.gold})`, color: C.white, border: "none", fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", borderRadius: 6, cursor: "pointer" }}>
                    BOOK YOUR APPOINTMENT →
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll cue */}
        <div style={h(1.2, { position: "absolute", bottom: 36, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 })}>
          <p className="jost" style={{ fontSize: 9, letterSpacing: "0.25em", color: C.taupe }}>SCROLL</p>
          <ChevronDown size={14} color={C.taupe} style={{ animation: "float 2s ease-in-out infinite" }} />
        </div>
      </section>

      {/* ── MARQUEE ── */}
      <div style={{ background: `linear-gradient(135deg, ${C.espresso} 0%, ${C.mocha} 100%)`, padding: "16px 0", overflow: "hidden", position: "relative" }}>
        <div style={{ display: "flex", width: "fit-content", animation: "marquee 28s linear infinite", gap: 0 }}>
          {[...Array(2)].map((_, rep) => (
            <div key={rep} className="jost" style={{ display: "flex", gap: 0, whiteSpace: "nowrap", fontSize: 10, fontWeight: 500, letterSpacing: "0.2em", color: C.mist }}>
              {["HAIR & BRAIDING", "NAIL ARTISTRY", "LASH EXTENSIONS", "MAKEUP", "PEDICURE & MANICURE", "WIGS & STYLING", "LOYALTY PROGRAM", "GIFT CARDS", "FREE WIFI", "COMPLIMENTARY WATER"].map(t => (
                <span key={t} style={{ display: "flex", alignItems: "center", gap: 0, paddingRight: 48 }}>
                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: C.gold, display: "inline-block", marginRight: 48 }} />
                  {t}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── EXPERIENCE ── */}
      <section id="experience" style={{ padding: "130px 48px", backgroundColor: C.white }} className="section-px">
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }} className="two-col">
            <Reveal>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
                  <div style={{ width: 36, height: 1, background: `linear-gradient(to right, ${C.rose}, ${C.gold})` }} />
                  <span className="jost" style={{ fontSize: 10, letterSpacing: "0.28em", color: C.sienna, fontWeight: 500 }}>THE ZOLARA DIFFERENCE</span>
                </div>
                <h2 style={{ fontSize: "clamp(30px, 3.5vw, 50px)", fontWeight: 300, lineHeight: 1.18, color: C.espresso, marginBottom: 22 }}>
                  An Experience<br /><em style={{ color: C.rose }}>Beyond Beauty</em>
                </h2>
                <p className="jost" style={{ fontSize: 15, lineHeight: 1.9, color: C.taupe, fontWeight: 300, marginBottom: 22 }}>
                  We believe a salon visit should feel like an escape. Every element of Zolara is designed to comfort, elevate, and indulge you. From the moment you walk in to the moment you leave.
                </p>
                <p className="jost" style={{ fontSize: 15, lineHeight: 1.9, color: C.taupe, fontWeight: 300, marginBottom: 40 }}>
                  Our team of certified specialists bring international training and genuine passion to every service. This is not just a salon. This is your beauty sanctuary.
                </p>
                <Link to="/book" style={{ textDecoration: "none" }}>
                  <button className="btn-dark jost" style={{ padding: "14px 32px", border: "none", fontSize: 10, fontWeight: 600, letterSpacing: "0.16em", borderRadius: 2, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
                    EXPERIENCE ZOLARA <ArrowRight size={13} />
                  </button>
                </Link>
              </div>
            </Reveal>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {perks.map(({ icon: Icon, title, desc }, i) => (
                <Reveal key={title} delay={i * 0.08}>
                  <div className="perk-card" style={{ padding: 24, background: C.ivory, border: `1px solid ${C.mist}`, borderRadius: 10, position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: i % 2 === 0 ? `linear-gradient(to right, ${C.rose}, transparent)` : `linear-gradient(to right, ${C.gold}, transparent)` }} />
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: i % 2 === 0 ? `${C.blush}80` : `${C.parchment}80`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                      <Icon size={17} color={i % 2 === 0 ? C.rose : C.gold} />
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: C.espresso, marginBottom: 6 }}>{title}</p>
                    <p className="jost" style={{ fontSize: 12, color: C.taupe, lineHeight: 1.6, fontWeight: 300 }}>{desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section id="services" style={{ padding: "130px 48px", background: `linear-gradient(170deg, ${C.ivory} 0%, ${C.parchment}60 50%, ${C.ivory} 100%)` }} className="section-px">
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 72 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 20 }}>
                <div style={{ width: 40, height: 1, background: `linear-gradient(to right, transparent, ${C.gold})` }} />
                <span className="jost" style={{ fontSize: 10, letterSpacing: "0.3em", color: C.sienna, fontWeight: 500 }}>WHAT WE OFFER</span>
                <div style={{ width: 40, height: 1, background: `linear-gradient(to left, transparent, ${C.gold})` }} />
              </div>
              <h2 style={{ fontSize: "clamp(30px, 3.5vw, 50px)", fontWeight: 300, lineHeight: 1.18, color: C.espresso, marginBottom: 16 }}>
                Services <em style={{ color: C.rose }}>Designed</em> for You
              </h2>
              <p className="jost" style={{ fontSize: 15, color: C.taupe, fontWeight: 300, maxWidth: 440, margin: "0 auto" }}>
                From everyday elegance to special occasion transformations.
              </p>
            </div>
          </Reveal>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }} className="three-col">
            {services.map(({ num, name, desc, price, accent }, i) => (
              <Reveal key={name} delay={i * 0.07}>
                <div className="svc-card" style={{ padding: 34, background: C.white, border: `1px solid ${C.mist}`, borderRadius: 10, cursor: "pointer", position: "relative", overflow: "hidden", height: "100%" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(to right, ${accent}, transparent)` }} />
                  <div style={{ position: "absolute", bottom: -30, right: -20, fontSize: 100, fontWeight: 200, color: `${accent}10`, lineHeight: 1, fontFamily: "Cormorant Garamond, serif", pointerEvents: "none", userSelect: "none" }}>{num}</div>
                  <span style={{ fontSize: 32, fontWeight: 200, color: `${accent}40`, lineHeight: 1, display: "block", marginBottom: 14 }}>{num}</span>
                  <h3 style={{ fontSize: 20, fontWeight: 400, color: C.espresso, marginBottom: 10 }}>{name}</h3>
                  <p className="jost" style={{ fontSize: 13, color: C.taupe, lineHeight: 1.7, fontWeight: 300, marginBottom: 20 }}>{desc}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 20, height: 1, background: accent }} />
                    <p className="jost" style={{ fontSize: 11, fontWeight: 600, color: accent, letterSpacing: "0.1em" }}>{price}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.3}>
            <div style={{ textAlign: "center", marginTop: 52 }}>
              <Link to="/book" style={{ textDecoration: "none" }}>
                <button className="btn-ghost jost" style={{ padding: "14px 44px", fontSize: 10, fontWeight: 600, letterSpacing: "0.16em", borderRadius: 2, cursor: "pointer" }}>
                  BOOK ANY SERVICE →
                </button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── GIFT CARDS ── */}
      <section id="giftcards" style={{ padding: "130px 48px", background: `linear-gradient(145deg, ${C.espresso} 0%, ${C.mocha} 50%, #3A1E0E 100%)`, position: "relative", overflow: "hidden" }} className="section-px">
        {/* Decorative elements */}
        <div style={{ position: "absolute", top: "10%", right: "5%", width: 300, height: 300, borderRadius: "50%", background: `radial-gradient(circle, ${C.gold}08 0%, transparent 70%)`, pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "5%", left: "3%", width: 200, height: 200, borderRadius: "50%", background: `radial-gradient(circle, ${C.rose}08 0%, transparent 70%)`, pointerEvents: "none" }} />

        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }} className="two-col">
            <Reveal dir="left">
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
                  <div style={{ width: 36, height: 1, background: `linear-gradient(to right, ${C.rose}, ${C.gold})` }} />
                  <span className="jost" style={{ fontSize: 10, letterSpacing: "0.28em", color: C.goldLight, fontWeight: 500 }}>EXCLUSIVE GIFTING</span>
                </div>
                <h2 style={{ fontSize: "clamp(30px, 3.5vw, 50px)", fontWeight: 300, lineHeight: 1.18, color: C.ivory, marginBottom: 22 }}>
                  Give the Gift<br />of <em style={{ color: C.goldLight }}>Luxury</em>
                </h2>
                <p className="jost" style={{ fontSize: 15, lineHeight: 1.9, color: C.mist, fontWeight: 300, marginBottom: 36 }}>
                  The Zolara Gift Card is the perfect present for every woman in your life. Birthdays, anniversaries, graduations, or simply because she deserves it.
                </p>
                <ul style={{ listStyle: "none", marginBottom: 40 }}>
                  {["Valid for 12 months from purchase", "Redeemable for any service at Zolara", "Minor overages covered up to GHS 50", "Beautifully packaged for gifting"].map((item, i) => (
                    <li key={item} className="jost" style={{ fontSize: 13, color: C.mist, marginBottom: 12, display: "flex", alignItems: "center", gap: 12, fontWeight: 300 }}>
                      <span style={{ width: 18, height: 18, borderRadius: "50%", background: i % 2 === 0 ? `${C.rose}30` : `${C.gold}30`, border: `1px solid ${i % 2 === 0 ? C.rose : C.gold}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: i % 2 === 0 ? C.rose : C.gold }} />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link to="/buy-gift-card" style={{ textDecoration: "none" }}>
                  <button className="btn-gold jost" style={{ padding: "14px 34px", background: `linear-gradient(135deg, ${C.rose}, ${C.gold})`, color: C.white, border: "none", fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", borderRadius: 6, cursor: "pointer" }}>
                    PURCHASE A GIFT CARD →
                  </button>
                </Link>
              </div>
            </Reveal>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {giftTiers.map(({ name, price, desc, highlight }, i) => (
                <Reveal key={name} delay={i * 0.1} dir="right">
                  <div className="gift-card" style={{
                    padding: 26,
                    borderRadius: 10,
                    border: highlight ? `1px solid ${C.gold}60` : `1px solid rgba(255,255,255,0.08)`,
                    background: highlight ? `linear-gradient(135deg, rgba(196,154,82,0.12), rgba(201,150,122,0.08))` : `rgba(255,255,255,0.04)`,
                    cursor: "pointer",
                    position: "relative", overflow: "hidden",
                  }}>
                    {highlight && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(to right, ${C.rose}, ${C.gold})` }} />}
                    <p className="jost" style={{ fontSize: 9, fontWeight: 600, color: highlight ? C.goldLight : C.taupe, letterSpacing: "0.2em", marginBottom: 10 }}>{name.toUpperCase()}</p>
                    <p style={{ fontSize: 28, fontWeight: 300, color: C.ivory, lineHeight: 1, marginBottom: 8 }}>{price}</p>
                    <p className="jost" style={{ fontSize: 12, color: C.mist, fontWeight: 300, lineHeight: 1.5 }}>{desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── REVIEWS ── */}
      <section id="reviews" style={{ padding: "130px 48px", backgroundColor: C.ivory }} className="section-px">
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 72 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 20 }}>
                <div style={{ width: 40, height: 1, background: `linear-gradient(to right, transparent, ${C.rose})` }} />
                <span className="jost" style={{ fontSize: 10, letterSpacing: "0.3em", color: C.sienna, fontWeight: 500 }}>CLIENT STORIES</span>
                <div style={{ width: 40, height: 1, background: `linear-gradient(to left, transparent, ${C.rose})` }} />
              </div>
              <h2 style={{ fontSize: "clamp(30px, 3.5vw, 50px)", fontWeight: 300, lineHeight: 1.18, color: C.espresso }}>
                Words from Our <em style={{ color: C.rose }}>Clients</em>
              </h2>
            </div>
          </Reveal>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
            {(reviews.length > 0 ? reviews : [
              { id: "1", name: "VALENTINE", comment: "Zolara is an amazing beauty studio. The service is world class.", rating: 5 },
              { id: "2", name: "AMANDA", comment: "Superb service all round. I felt like royalty from start to finish.", rating: 5 },
            ]).map((r: any, i) => (
              <Reveal key={r.id} delay={i * 0.1}>
                <div style={{ padding: 36, background: C.white, border: `1px solid ${C.mist}`, borderRadius: 12, position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: i % 2 === 0 ? `linear-gradient(to right, ${C.rose}, transparent)` : `linear-gradient(to right, ${C.gold}, transparent)` }} />
                  <div style={{ fontSize: 52, color: i % 2 === 0 ? `${C.rose}30` : `${C.gold}30`, lineHeight: 1, marginBottom: 12, fontWeight: 200, fontFamily: "Cormorant Garamond, serif" }}>"</div>
                  <div style={{ display: "flex", gap: 3, marginBottom: 16 }}>
                    {[1,2,3,4,5].map(n => <Star key={n} size={12} fill={n <= r.rating ? C.gold : "none"} color={C.gold} />)}
                  </div>
                  <p style={{ fontSize: 16, fontWeight: 300, color: C.espresso, lineHeight: 1.75, marginBottom: 24, fontStyle: "italic" }}>{r.comment}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 24, height: 1, background: i % 2 === 0 ? C.rose : C.gold }} />
                    <p className="jost" style={{ fontSize: 10, fontWeight: 600, color: C.sienna, letterSpacing: "0.16em" }}>{r.name}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ padding: "130px 48px", background: C.white }} className="section-px">
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 20 }}>
                <div style={{ width: 40, height: 1, background: `linear-gradient(to right, transparent, ${C.gold})` }} />
                <span className="jost" style={{ fontSize: 10, letterSpacing: "0.3em", color: C.sienna, fontWeight: 500 }}>COMMON QUESTIONS</span>
                <div style={{ width: 40, height: 1, background: `linear-gradient(to left, transparent, ${C.gold})` }} />
              </div>
              <h2 style={{ fontSize: "clamp(28px, 3.2vw, 46px)", fontWeight: 300, color: C.espresso }}>
                Everything You <em style={{ color: C.gold }}>Need to Know</em>
              </h2>
            </div>
          </Reveal>

          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {faqs.map(({ q, a }, i) => (
              <Reveal key={i} delay={i * 0.06}>
                <div style={{ borderBottom: `1px solid ${C.mist}` }}>
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ width: "100%", padding: "22px 0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", cursor: "pointer", textAlign: "left", gap: 16 }}>
                    <span style={{ fontSize: 18, fontWeight: 400, color: openFaq === i ? C.rose : C.espresso, transition: "color 0.3s", lineHeight: 1.3 }}>{q}</span>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", border: `1px solid ${openFaq === i ? C.rose : C.mist}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.3s", transform: openFaq === i ? "rotate(45deg)" : "none", background: openFaq === i ? `${C.rose}10` : "transparent" }}>
                      <span style={{ fontSize: 16, color: openFaq === i ? C.rose : C.taupe, lineHeight: 1, fontWeight: 300 }}>+</span>
                    </div>
                  </button>
                  <div className="faq-answer" style={{ maxHeight: openFaq === i ? "200px" : "0px", opacity: openFaq === i ? 1 : 0 }}>
                    <p className="jost" style={{ fontSize: 14, color: C.taupe, lineHeight: 1.85, paddingBottom: 24, fontWeight: 300 }}>{a}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{
        padding: "140px 48px",
        background: `
          radial-gradient(ellipse 70% 60% at 30% 40%, ${C.blush}50 0%, transparent 60%),
          radial-gradient(ellipse 50% 70% at 80% 70%, ${C.parchment}60 0%, transparent 50%),
          linear-gradient(160deg, ${C.ivory} 0%, ${C.parchment}80 100%)
        `,
        textAlign: "center", position: "relative", overflow: "hidden",
      }} className="section-px">
        <div style={{ position: "absolute", top: "8%", left: "12%", width: 180, height: 1, background: `linear-gradient(to right, transparent, ${C.gold}30, transparent)` }} />
        <div style={{ position: "absolute", bottom: "12%", right: "10%", width: 1, height: 160, background: `linear-gradient(to bottom, transparent, ${C.rose}30, transparent)` }} />

        <Reveal>
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 28 }}>
              <div style={{ width: 32, height: 1, background: `linear-gradient(to right, transparent, ${C.rose})` }} />
              <span className="jost" style={{ fontSize: 10, letterSpacing: "0.3em", color: C.sienna, fontWeight: 500 }}>YOUR TRANSFORMATION AWAITS</span>
              <div style={{ width: 32, height: 1, background: `linear-gradient(to left, transparent, ${C.rose})` }} />
            </div>
            <h2 style={{ fontSize: "clamp(38px, 5.5vw, 76px)", fontWeight: 300, lineHeight: 1.08, color: C.espresso, marginBottom: 24 }}>
              Ready to Experience<br /><em style={{ color: C.rose }}>True Luxury?</em>
            </h2>
            <p className="jost" style={{ fontSize: 16, color: C.taupe, fontWeight: 300, lineHeight: 1.85, maxWidth: 460, margin: "0 auto 52px" }}>
              Join the women in Tamale who have made Zolara their beauty home. You deserve the best. That is exactly what we deliver.
            </p>
            <Link to="/book" style={{ textDecoration: "none" }}>
              <button className="btn-dark jost" style={{ padding: "18px 56px", border: "none", fontSize: 11, fontWeight: 600, letterSpacing: "0.18em", borderRadius: 2, cursor: "pointer" }}>
                BOOK YOUR LUXURY EXPERIENCE
              </button>
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ── VISIT US ── */}
      <section id="visit" style={{ padding: "130px 48px", background: `linear-gradient(145deg, ${C.espresso} 0%, ${C.mocha} 60%, #3A1E0E 100%)`, position: "relative", overflow: "hidden" }} className="section-px">
        <div style={{ position: "absolute", top: "20%", right: "6%", width: 1, height: 200, background: `linear-gradient(to bottom, transparent, ${C.gold}20, transparent)` }} />

        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "start" }} className="two-col">
          <Reveal dir="left">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
                <div style={{ width: 36, height: 1, background: `linear-gradient(to right, ${C.rose}, ${C.gold})` }} />
                <span className="jost" style={{ fontSize: 10, letterSpacing: "0.28em", color: C.goldLight, fontWeight: 500 }}>VISIT US</span>
              </div>
              <h2 style={{ fontSize: "clamp(28px, 3.2vw, 46px)", fontWeight: 300, color: C.ivory, marginBottom: 44, lineHeight: 1.2 }}>
                Find Zolara<br /><em style={{ color: C.goldLight }}>Beauty Studio</em>
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                {[
                  { label: "ADDRESS", value: "Sakasaka, Opposite CalBank\nTamale, Northern Region, Ghana", icon: MapPin, color: C.rose },
                  { label: "HOURS", value: "Monday to Saturday\n8:30 AM to 9:00 PM\nClosed Sundays", icon: Clock, color: C.gold },
                  { label: "PHONE", value: "0594 365 314\n020 884 8707", icon: Phone, color: C.rose },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}15`, border: `1px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                      <Icon size={15} color={color} />
                    </div>
                    <div>
                      <p className="jost" style={{ fontSize: 9, letterSpacing: "0.22em", color: C.taupe, marginBottom: 6, fontWeight: 500 }}>{label}</p>
                      <p style={{ fontSize: 14, color: C.ivory, fontWeight: 300, lineHeight: 1.65, whiteSpace: "pre-line" }}>{value}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 14, marginTop: 40 }}>
                <a href="tel:0594365314" style={{ textDecoration: "none" }}>
                  <button className="btn-gold jost" style={{ padding: "12px 28px", background: `linear-gradient(135deg, ${C.rose}, ${C.gold})`, color: C.white, border: "none", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", borderRadius: 6, cursor: "pointer" }}>CALL NOW</button>
                </a>
                <a href="https://maps.google.com/?q=Zolara+Beauty+Studio+Sakasaka+Tamale" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                  <button className="jost" style={{ padding: "12px 28px", background: "transparent", color: C.mist, border: `1px solid rgba(255,255,255,0.15)`, fontSize: 10, fontWeight: 500, letterSpacing: "0.14em", borderRadius: 6, cursor: "pointer", transition: "all 0.25s" }}>GET DIRECTIONS</button>
                </a>
              </div>
            </div>
          </Reveal>

          <Reveal dir="right">
            <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid rgba(255,255,255,0.06)`, boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
              <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3962.5!2d-0.8393!3d9.4075!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zOcKwMjQnMjcuMCJOIDDCsDUwJzIxLjUiVw!5e0!3m2!1sen!2sgh!4v1234567890" width="100%" height="420" style={{ border: 0, display: "block", filter: "sepia(20%) contrast(1.1)" }} allowFullScreen loading="lazy" title="Zolara Location" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: `linear-gradient(180deg, ${C.espresso} 0%, #100A06 100%)`, padding: "64px 48px 32px" }} className="section-px">
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 60, marginBottom: 56 }} className="three-col">
            <div>
              <p style={{ fontSize: 20, fontWeight: 400, color: C.ivory, letterSpacing: "0.16em", marginBottom: 4 }}>ZOLARA</p>
              <p className="jost" style={{ fontSize: 9, color: C.gold, letterSpacing: "0.25em", marginBottom: 20 }}>BEAUTY STUDIO</p>
              <p className="jost" style={{ fontSize: 13, color: "#6B5448", lineHeight: 1.85, fontWeight: 300, maxWidth: 280 }}>Tamale's premier luxury beauty studio. Where every visit is an experience and every client leaves extraordinary.</p>
              <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                <div style={{ width: 32, height: 1, background: `linear-gradient(to right, ${C.rose}, ${C.gold})` }} />
                <p style={{ fontSize: 13, fontStyle: "italic", color: "#6B5448" }}>Luxury. Redefined.</p>
              </div>
            </div>
            <div>
              <p className="jost" style={{ fontSize: 9, letterSpacing: "0.24em", color: C.gold, fontWeight: 600, marginBottom: 20 }}>SERVICES</p>
              {["Braiding", "Nail Artistry", "Lash Extensions", "Makeup", "Pedicure & Manicure", "Wigs & Styling"].map(s => (
                <Link key={s} to="/book" style={{ display: "block", textDecoration: "none", marginBottom: 10 }}>
                  <span className="jost" style={{ fontSize: 13, color: "#5A3D30", fontWeight: 300, transition: "color 0.2s" }}>{s}</span>
                </Link>
              ))}
            </div>
            <div>
              <p className="jost" style={{ fontSize: 9, letterSpacing: "0.24em", color: C.gold, fontWeight: 600, marginBottom: 20 }}>QUICK LINKS</p>
              {navLinks.map(({ label, href }) => (
                <a key={href} href={href} style={{ display: "block", textDecoration: "none", marginBottom: 10 }}>
                  <span className="jost" style={{ fontSize: 13, color: "#5A3D30", fontWeight: 300 }}>{label}</span>
                </a>
              ))}
              <Link to="/app/auth" style={{ display: "block", textDecoration: "none", marginTop: 24 }}>
                <span className="jost" style={{ fontSize: 10, color: C.gold, fontWeight: 600, letterSpacing: "0.12em" }}>STAFF LOGIN →</span>
              </Link>
            </div>
          </div>
          <div style={{ borderTop: "1px solid #1E0F09", paddingTop: 28, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <p className="jost" style={{ fontSize: 12, color: "#3D2418", fontWeight: 300 }}>© {new Date().getFullYear()} Zolara Beauty Studio. All rights reserved.</p>
            <p className="jost" style={{ fontSize: 11, color: "#3D2418", letterSpacing: "0.12em" }}>TAMALE · GHANA</p>
          </div>
        </div>
      </footer>

      <Amanda />
    </div>
  );
}
