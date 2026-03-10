import { Link } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, X, Send, Loader2, Menu, Star, ArrowRight, Wifi, Droplets, Sparkles, Users, Shield, Clock } from "lucide-react";

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const C = {
  cream: "#FAF7F2",
  champagne: "#F2EAD8",
  gold: "#B8935A",
  goldLight: "#D4AF7A",
  goldDark: "#8B6E3F",
  charcoal: "#1A1A1A",
  charcoalMid: "#2D2D2D",
  warmGrey: "#6B6057",
  taupe: "#C4B89A",
  marble: "#F8F5F0",
  white: "#FFFFFF",
  border: "#E8DFD0",
};

// ─── AMANDA WIDGET ───────────────────────────────────────────────────────────
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
        <div style={{ position: "fixed", bottom: 88, right: 20, zIndex: 1000, width: 320, maxHeight: 480, borderRadius: 20, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.15)", border: `1px solid ${C.border}`, display: "flex", flexDirection: "column", backgroundColor: C.cream }}>
          <div style={{ background: `linear-gradient(135deg, ${C.charcoal} 0%, ${C.charcoalMid} 100%)`, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: C.charcoal }}>A</div>
              <div><p style={{ color: C.white, fontSize: 13, fontWeight: 600, margin: 0 }}>Amanda</p><p style={{ color: C.taupe, fontSize: 10, margin: 0, letterSpacing: "0.05em" }}>ZOLARA BEAUTY CONSULTANT</p></div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#999", cursor: "pointer" }}><X size={16} /></button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10, maxHeight: 300 }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "82%", padding: "10px 14px", borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", fontSize: 13, lineHeight: 1.5, background: m.role === "user" ? `linear-gradient(135deg, ${C.charcoal}, ${C.charcoalMid})` : C.champagne, color: m.role === "user" ? C.white : C.charcoal, border: m.role === "assistant" ? `1px solid ${C.border}` : "none" }}>{m.content}</div>
              </div>
            ))}
            {busy && <div style={{ display: "flex", justifyContent: "flex-start" }}><div style={{ padding: "10px 14px", borderRadius: "18px 18px 18px 4px", background: C.champagne, border: `1px solid ${C.border}` }}><Loader2 size={14} style={{ color: C.gold, animation: "spin 1s linear infinite" }} /></div></div>}
            <div ref={endRef} />
          </div>
          <div style={{ padding: "12px 14px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8 }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Ask me anything..." style={{ flex: 1, padding: "10px 14px", borderRadius: 50, border: `1px solid ${C.border}`, fontSize: 13, outline: "none", backgroundColor: C.marble, color: C.charcoal }} />
            <button onClick={send} disabled={busy || !input.trim()} style={{ width: 38, height: 38, borderRadius: "50%", border: "none", background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: !input.trim() ? 0.4 : 1 }}><Send size={14} color={C.charcoal} /></button>
          </div>
        </div>
      )}
      <button onClick={() => setOpen(o => !o)} style={{ position: "fixed", bottom: 24, right: 20, zIndex: 1000, width: 56, height: 56, borderRadius: "50%", border: "none", background: `linear-gradient(135deg, ${C.charcoal}, ${C.charcoalMid})`, boxShadow: "0 8px 30px rgba(0,0,0,0.2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "transform 0.2s" }}>
        {open ? <X size={20} color={C.goldLight} /> : <MessageCircle size={22} color={C.goldLight} />}
      </button>
    </>
  );
}

// ─── MAIN LANDING PAGE ────────────────────────────────────────────────────────
export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    supabase.from("reviews" as any).select("*").eq("visible", true).limit(6).then(({ data }) => setReviews(data || []));
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { label: "Experience", href: "#experience" },
    { label: "Services", href: "#services" },
    { label: "Gift Cards", href: "#giftcards" },
    { label: "Reviews", href: "#reviews" },
    { label: "Visit Us", href: "#visit" },
  ];

  const services = [
    { num: "01", name: "Hair & Braiding", desc: "Cornrows, knotless braids, Fulani, Rasta, Boho styles and natural hair care.", price: "From GHS 80" },
    { num: "02", name: "Nail Artistry", desc: "Gel polish, acrylic sets, nail art and toenail services with top-tier products.", price: "From GHS 60" },
    { num: "03", name: "Lash Extensions", desc: "Classic, Hybrid, Wispy, Volume and Mega Volume sets with professional removal.", price: "From GHS 65" },
    { num: "04", name: "Makeup", desc: "Natural Glow, Soft Glam, Full Glam, Bridal and photoshoot makeup.", price: "From GHS 125" },
    { num: "05", name: "Pedicure & Manicure", desc: "Classic, Jelly and Signature Pedicures. Classic and Special Manicures.", price: "From GHS 100" },
    { num: "06", name: "Wigs & Styling", desc: "Glueless, HD lace and full lace installs. Wig coloring and sew-ins.", price: "From GHS 150" },
  ];

  const perks = [
    { icon: Droplets, title: "Complimentary Water", desc: "Chilled bottled water for every client, always." },
    { icon: Wifi, title: "Free High-Speed WiFi", desc: "Stay connected throughout your visit." },
    { icon: Sparkles, title: "The Exit Ritual", desc: "Perfume spritz, mirror check, and the confidence you came for." },
    { icon: Users, title: "Expert Team", desc: "Certified specialists in every category." },
    { icon: Shield, title: "Premium Products", desc: "International quality products and techniques only." },
    { icon: Clock, title: "Flexible Hours", desc: "Open Monday to Saturday, 8:30 AM to 9:00 PM." },
  ];

  const giftTiers = [
    { name: "Silver", price: "GHS 220", desc: "Perfect for a single service treat" },
    { name: "Gold", price: "GHS 450", desc: "A full afternoon of beauty" },
    { name: "Platinum", price: "GHS 650", desc: "The complete Zolara experience" },
    { name: "Diamond", price: "GHS 1,000", desc: "Ultimate luxury for someone special" },
  ];

  const faqs = [
    { q: "Do I need to book in advance?", a: "We strongly recommend booking in advance to secure your preferred time. Walk-ins are welcome based on availability." },
    { q: "What is your cancellation policy?", a: "We ask for at least 24 hours notice. Late cancellations may incur a small fee." },
    { q: "Do you provide products and materials?", a: "Yes. All products are provided by Zolara. We use only premium, internationally sourced products." },
    { q: "How long do services take?", a: "Braiding: 2 to 6 hours. Nails and lashes: 1 to 2 hours. Makeup: 1 to 2 hours." },
    { q: "What payment methods do you accept?", a: "Cash, mobile money (MTN, Vodafone, AirtelTigo), and bank transfers." },
  ];

  const navStyle: React.CSSProperties = {
    position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
    padding: "0 40px",
    height: 72,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    transition: "all 0.3s",
    backgroundColor: scrolled ? "rgba(250,247,242,0.96)" : "transparent",
    backdropFilter: scrolled ? "blur(12px)" : "none",
    borderBottom: scrolled ? `1px solid ${C.border}` : "1px solid transparent",
  };

  return (
    <div style={{ backgroundColor: C.cream, color: C.charcoal, fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Jost:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { overflow-x: hidden; }
        .jost { font-family: 'Jost', sans-serif; }
        .fade-in { animation: fadeUp 0.8s ease forwards; opacity: 0; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .gold-line::after { content: ''; display: block; width: 40px; height: 1px; background: ${C.gold}; margin-top: 16px; }
        .gold-line-center::after { content: ''; display: block; width: 40px; height: 1px; background: ${C.gold}; margin: 16px auto 0; }
        .service-card:hover { transform: translateY(-4px); box-shadow: 0 20px 50px rgba(0,0,0,0.08); }
        .service-card { transition: all 0.3s ease; }
        .btn-primary:hover { opacity: 0.88; transform: translateY(-1px); }
        .btn-primary { transition: all 0.2s; }
        .btn-ghost:hover { background: ${C.charcoal} !important; color: ${C.cream} !important; }
        .btn-ghost { transition: all 0.2s; }
        .nav-link:hover { color: ${C.gold} !important; }
        @media (max-width: 768px) {
          .hero-grid { flex-direction: column !important; }
          .services-grid { grid-template-columns: 1fr !important; }
          .perks-grid { grid-template-columns: 1fr 1fr !important; }
          .gift-grid { grid-template-columns: 1fr 1fr !important; }
          .hide-mobile { display: none !important; }
          .nav-pad { padding: 0 20px !important; }
          .section-pad { padding: 80px 20px !important; }
          .hero-pad { padding: 0 20px !important; }
          .hero-h1 { font-size: clamp(42px, 10vw, 80px) !important; }
        }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav style={navStyle} className="nav-pad">
        <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: "50%", border: `1.5px solid ${C.gold}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.gold, letterSpacing: "0.05em" }}>Z</span>
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 500, color: C.charcoal, letterSpacing: "0.15em", lineHeight: 1 }}>ZOLARA</p>
            <p className="jost" style={{ fontSize: 9, color: C.warmGrey, letterSpacing: "0.2em", marginTop: 2 }}>BEAUTY STUDIO</p>
          </div>
        </Link>

        <div className="hide-mobile" style={{ display: "flex", alignItems: "center", gap: 36 }}>
          {navLinks.map(({ label, href }) => (
            <a key={href} href={href} className="nav-link jost" style={{ textDecoration: "none", fontSize: 12, fontWeight: 500, letterSpacing: "0.12em", color: C.warmGrey, transition: "color 0.2s" }}>{label.toUpperCase()}</a>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link to="/book" className="btn-primary" style={{ textDecoration: "none" }}>
            <div className="jost" style={{ padding: "10px 24px", background: C.charcoal, color: C.cream, fontSize: 11, fontWeight: 500, letterSpacing: "0.14em", borderRadius: 2, cursor: "pointer" }}>BOOK NOW</div>
          </Link>
          <button className="hide-mobile" onClick={() => setMenuOpen(o => !o)} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <Menu size={20} color={C.warmGrey} />
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ minHeight: "100vh", background: `linear-gradient(160deg, ${C.cream} 0%, ${C.champagne} 60%, #EDE5D8 100%)`, display: "flex", alignItems: "center", paddingTop: 80, position: "relative", overflow: "hidden" }}>
        {/* Marble texture overlay */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E\")", opacity: 0.4 }} />
        
        {/* Gold decorative lines */}
        <div style={{ position: "absolute", top: "15%", right: "8%", width: 1, height: 120, background: `linear-gradient(to bottom, transparent, ${C.gold}60, transparent)` }} />
        <div style={{ position: "absolute", bottom: "20%", left: "6%", width: 80, height: 1, background: `linear-gradient(to right, transparent, ${C.gold}60, transparent)` }} />

        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 40px", width: "100%" }} className="hero-pad">
          <div style={{ display: "flex", alignItems: "center", gap: 60 }} className="hero-grid">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="jost fade-in" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28, animationDelay: "0.1s" }}>
                <div style={{ width: 30, height: 1, background: C.gold }} />
                <span style={{ fontSize: 11, letterSpacing: "0.25em", color: C.gold, fontWeight: 500 }}>TAMALE'S PREMIER LUXURY STUDIO</span>
              </div>
              
              <h1 className="hero-h1 fade-in" style={{ fontSize: "clamp(48px, 6vw, 88px)", fontWeight: 300, lineHeight: 1.05, color: C.charcoal, marginBottom: 28, animationDelay: "0.2s" }}>
                Where Luxury<br />
                <em style={{ color: C.gold, fontStyle: "italic" }}>Meets Beauty</em><br />
                in Tamale.
              </h1>
              
              <p className="jost fade-in" style={{ fontSize: 16, lineHeight: 1.8, color: C.warmGrey, maxWidth: 480, marginBottom: 40, fontWeight: 300, animationDelay: "0.3s" }}>
                A sanctuary where every woman is treated to world-class beauty services, premium products, and an experience designed to make you feel extraordinary.
              </p>

              <div className="fade-in" style={{ display: "flex", gap: 14, flexWrap: "wrap", animationDelay: "0.4s" }}>
                <Link to="/book" style={{ textDecoration: "none" }}>
                  <button className="btn-primary jost" style={{ padding: "16px 36px", background: C.charcoal, color: C.cream, border: "none", fontSize: 12, fontWeight: 500, letterSpacing: "0.14em", borderRadius: 2, cursor: "pointer" }}>
                    BOOK APPOINTMENT
                  </button>
                </Link>
                <a href="#services" style={{ textDecoration: "none" }}>
                  <button className="btn-ghost jost" style={{ padding: "16px 36px", background: "transparent", color: C.charcoal, border: `1px solid ${C.charcoal}`, fontSize: 12, fontWeight: 500, letterSpacing: "0.14em", borderRadius: 2, cursor: "pointer" }}>
                    VIEW SERVICES
                  </button>
                </a>
              </div>

              <div className="jost fade-in" style={{ display: "flex", gap: 32, marginTop: 52, animationDelay: "0.5s" }}>
                {[["Free WiFi", "For every client"], ["Free Water", "Always chilled"], ["Loyalty Points", "Ghana's first"]].map(([t, s]) => (
                  <div key={t}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: C.charcoal, letterSpacing: "0.08em" }}>{t}</p>
                    <p style={{ fontSize: 11, color: C.warmGrey, marginTop: 2 }}>{s}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero card */}
            <div className="hide-mobile fade-in" style={{ width: 340, flexShrink: 0, animationDelay: "0.35s" }}>
              <div style={{ background: C.white, borderRadius: 4, padding: 36, boxShadow: "0 30px 80px rgba(0,0,0,0.08)", border: `1px solid ${C.border}`, position: "relative" }}>
                <div style={{ position: "absolute", top: -1, left: 36, width: 60, height: 2, background: C.gold }} />
                <p style={{ fontSize: 11, fontWeight: 400, color: C.gold, letterSpacing: "0.2em", marginBottom: 20 }} className="jost">OPEN TODAY</p>
                <p style={{ fontSize: 28, fontWeight: 300, color: C.charcoal, marginBottom: 6, lineHeight: 1.2 }}>8:30 AM</p>
                <p style={{ fontSize: 13, color: C.warmGrey, marginBottom: 28 }} className="jost">Until 9:00 PM — Monday to Saturday</p>
                
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 24, marginBottom: 24 }}>
                  <p style={{ fontSize: 11, color: C.warmGrey, letterSpacing: "0.15em", marginBottom: 6 }} className="jost">FIND US AT</p>
                  <p style={{ fontSize: 15, fontWeight: 400, color: C.charcoal }}>Sakasaka, Opposite CalBank<br />Tamale, Ghana</p>
                </div>

                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 24, marginBottom: 28 }}>
                  <p style={{ fontSize: 11, color: C.warmGrey, letterSpacing: "0.15em", marginBottom: 6 }} className="jost">CALL US</p>
                  <p style={{ fontSize: 15, fontWeight: 400, color: C.charcoal }}>0594 365 314</p>
                  <p style={{ fontSize: 13, color: C.warmGrey }} className="jost">020 884 8707</p>
                </div>

                <Link to="/book" style={{ textDecoration: "none", display: "block" }}>
                  <button className="btn-primary jost" style={{ width: "100%", padding: "14px", background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: C.charcoal, border: "none", fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", borderRadius: 2, cursor: "pointer" }}>
                    BOOK YOUR APPOINTMENT →
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MARQUEE STRIP ── */}
      <div style={{ background: C.charcoal, padding: "14px 0", overflow: "hidden" }}>
        <div className="jost" style={{ display: "flex", gap: 48, animation: "none", whiteSpace: "nowrap", fontSize: 11, fontWeight: 500, letterSpacing: "0.2em", color: C.taupe, justifyContent: "center", flexWrap: "wrap", padding: "0 20px" }}>
          {["HAIR & BRAIDING", "NAIL ARTISTRY", "LASH EXTENSIONS", "MAKEUP", "PEDICURE & MANICURE", "WIGS & STYLING", "LOYALTY PROGRAM", "GIFT CARDS"].map(t => (
            <span key={t} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: C.gold, display: "inline-block" }} />
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* ── EXPERIENCE ── */}
      <section id="experience" style={{ padding: "120px 40px", backgroundColor: C.white }} className="section-pad">
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
            <div>
              <p className="jost gold-line" style={{ fontSize: 11, letterSpacing: "0.25em", color: C.gold, fontWeight: 500, marginBottom: 0 }}>THE ZOLARA DIFFERENCE</p>
              <h2 style={{ fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 300, lineHeight: 1.2, color: C.charcoal, marginTop: 24, marginBottom: 20 }}>
                An Experience<br /><em style={{ color: C.gold }}>Beyond Beauty</em>
              </h2>
              <p className="jost" style={{ fontSize: 15, lineHeight: 1.9, color: C.warmGrey, fontWeight: 300, marginBottom: 32 }}>
                We believe a salon visit should feel like an escape. Every element of Zolara is designed to comfort, elevate, and indulge you. From the moment you walk in to the moment you leave.
              </p>
              <p className="jost" style={{ fontSize: 15, lineHeight: 1.9, color: C.warmGrey, fontWeight: 300, marginBottom: 40 }}>
                Our team of certified specialists bring international training and genuine passion to every service. This is not just a salon. This is your beauty sanctuary.
              </p>
              <Link to="/book" style={{ textDecoration: "none" }}>
                <button className="btn-primary jost" style={{ padding: "14px 32px", background: C.charcoal, color: C.cream, border: "none", fontSize: 11, fontWeight: 500, letterSpacing: "0.14em", borderRadius: 2, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                  EXPERIENCE ZOLARA <ArrowRight size={14} />
                </button>
              </Link>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="perks-grid">
              {perks.map(({ icon: Icon, title, desc }) => (
                <div key={title} style={{ padding: 24, background: C.cream, border: `1px solid ${C.border}`, borderRadius: 4, position: "relative" }}>
                  <div style={{ position: "absolute", top: 0, left: 24, width: 30, height: 1.5, background: C.gold }} />
                  <Icon size={20} color={C.gold} style={{ marginBottom: 12, marginTop: 8 }} />
                  <p style={{ fontSize: 14, fontWeight: 500, color: C.charcoal, marginBottom: 6 }}>{title}</p>
                  <p className="jost" style={{ fontSize: 12, color: C.warmGrey, lineHeight: 1.6, fontWeight: 300 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section id="services" style={{ padding: "120px 40px", backgroundColor: C.cream }} className="section-pad">
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 70 }}>
            <p className="jost gold-line-center" style={{ fontSize: 11, letterSpacing: "0.25em", color: C.gold, fontWeight: 500 }}>WHAT WE OFFER</p>
            <h2 style={{ fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 300, lineHeight: 1.2, color: C.charcoal, marginTop: 24, marginBottom: 16 }}>
              Services <em style={{ color: C.gold }}>Designed</em> for You
            </h2>
            <p className="jost" style={{ fontSize: 15, color: C.warmGrey, fontWeight: 300, maxWidth: 480, margin: "0 auto" }}>
              From everyday elegance to special occasion transformations.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }} className="services-grid">
            {services.map(({ num, name, desc, price }) => (
              <div key={name} className="service-card" style={{ padding: 36, background: C.white, border: `1px solid ${C.border}`, borderRadius: 4, cursor: "pointer", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(to right, ${C.gold}, transparent)` }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <span style={{ fontSize: 36, fontWeight: 200, color: C.border, lineHeight: 1 }}>{num}</span>
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 400, color: C.charcoal, marginBottom: 10 }}>{name}</h3>
                <p className="jost" style={{ fontSize: 13, color: C.warmGrey, lineHeight: 1.7, fontWeight: 300, marginBottom: 20 }}>{desc}</p>
                <p className="jost" style={{ fontSize: 12, fontWeight: 600, color: C.gold, letterSpacing: "0.08em" }}>{price}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 50 }}>
            <Link to="/book" style={{ textDecoration: "none" }}>
              <button className="btn-ghost jost" style={{ padding: "14px 40px", background: "transparent", color: C.charcoal, border: `1px solid ${C.charcoal}`, fontSize: 11, fontWeight: 500, letterSpacing: "0.14em", borderRadius: 2, cursor: "pointer" }}>
                BOOK ANY SERVICE →
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── GIFT CARDS ── */}
      <section id="giftcards" style={{ padding: "120px 40px", backgroundColor: C.charcoal }} className="section-pad">
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
            <div>
              <p className="jost" style={{ fontSize: 11, letterSpacing: "0.25em", color: C.gold, fontWeight: 500, marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 30, height: 1, background: C.gold, display: "inline-block" }} />
                EXCLUSIVE GIFTING
              </p>
              <h2 style={{ fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 300, lineHeight: 1.2, color: C.cream, marginBottom: 20 }}>
                Give the Gift<br />of <em style={{ color: C.goldLight }}>Luxury</em>
              </h2>
              <p className="jost" style={{ fontSize: 15, lineHeight: 1.9, color: C.taupe, fontWeight: 300, marginBottom: 36 }}>
                The Zolara Gift Card is the perfect present for every woman in your life. Birthdays, anniversaries, graduations, or simply because she deserves it.
              </p>
              <ul style={{ listStyle: "none", marginBottom: 40 }}>
                {["Valid for 12 months from purchase", "Redeemable for any service at Zolara", "Minor overages covered up to GHS 50", "Beautifully packaged for gifting"].map(item => (
                  <li key={item} className="jost" style={{ fontSize: 13, color: C.taupe, marginBottom: 10, display: "flex", alignItems: "center", gap: 10, fontWeight: 300 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.gold, flexShrink: 0 }} />{item}
                  </li>
                ))}
              </ul>
              <Link to="/buy-gift-card" style={{ textDecoration: "none" }}>
                <button className="btn-primary jost" style={{ padding: "14px 32px", background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: C.charcoal, border: "none", fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", borderRadius: 2, cursor: "pointer" }}>
                  PURCHASE A GIFT CARD →
                </button>
              </Link>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="gift-grid">
              {giftTiers.map(({ name, price, desc }) => (
                <div key={name} style={{ padding: 24, border: `1px solid rgba(184,147,90,0.3)`, borderRadius: 4, background: "rgba(184,147,90,0.06)", cursor: "pointer", transition: "all 0.2s" }}>
                  <p style={{ fontSize: 11, fontWeight: 400, color: C.gold, letterSpacing: "0.15em", marginBottom: 10 }} className="jost">{name.toUpperCase()}</p>
                  <p style={{ fontSize: 28, fontWeight: 300, color: C.cream, lineHeight: 1, marginBottom: 8 }}>{price}</p>
                  <p className="jost" style={{ fontSize: 12, color: C.taupe, fontWeight: 300 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── REVIEWS ── */}
      <section id="reviews" style={{ padding: "120px 40px", backgroundColor: C.marble }} className="section-pad">
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 70 }}>
            <p className="jost gold-line-center" style={{ fontSize: 11, letterSpacing: "0.25em", color: C.gold, fontWeight: 500 }}>CLIENT STORIES</p>
            <h2 style={{ fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 300, lineHeight: 1.2, color: C.charcoal, marginTop: 24 }}>
              Words from Our <em style={{ color: C.gold }}>Clients</em>
            </h2>
          </div>
          {reviews.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
              {reviews.map((r: any) => (
                <div key={r.id} style={{ padding: 36, background: C.white, border: `1px solid ${C.border}`, borderRadius: 4, position: "relative" }}>
                  <div style={{ fontSize: 48, color: C.gold, lineHeight: 1, marginBottom: 12, fontWeight: 200 }}>"</div>
                  <div style={{ display: "flex", gap: 3, marginBottom: 16 }}>
                    {[1,2,3,4,5].map(i => <Star key={i} size={12} fill={i <= r.rating ? C.gold : "none"} color={C.gold} />)}
                  </div>
                  <p style={{ fontSize: 16, fontWeight: 300, color: C.charcoal, lineHeight: 1.7, marginBottom: 24, fontStyle: "italic" }}>{r.comment}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 24, height: 1, background: C.gold }} />
                    <p className="jost" style={{ fontSize: 11, fontWeight: 600, color: C.warmGrey, letterSpacing: "0.12em" }}>{r.name.toUpperCase()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
              {[{ name: "VALENTINE", comment: "Zolara is an amazing beauty studio. The service is world class." }, { name: "AMANDA", comment: "Superb service all round. I felt like royalty from start to finish." }].map(r => (
                <div key={r.name} style={{ padding: 36, background: C.white, border: `1px solid ${C.border}`, borderRadius: 4 }}>
                  <div style={{ fontSize: 48, color: C.gold, lineHeight: 1, marginBottom: 12, fontWeight: 200 }}>"</div>
                  <div style={{ display: "flex", gap: 3, marginBottom: 16 }}>
                    {[1,2,3,4,5].map(i => <Star key={i} size={12} fill={C.gold} color={C.gold} />)}
                  </div>
                  <p style={{ fontSize: 16, fontWeight: 300, color: C.charcoal, lineHeight: 1.7, marginBottom: 24, fontStyle: "italic" }}>{r.comment}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 24, height: 1, background: C.gold }} />
                    <p className="jost" style={{ fontSize: 11, fontWeight: 600, color: C.warmGrey, letterSpacing: "0.12em" }}>{r.name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ padding: "120px 40px", backgroundColor: C.white }} className="section-pad">
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <p className="jost gold-line-center" style={{ fontSize: 11, letterSpacing: "0.25em", color: C.gold, fontWeight: 500 }}>COMMON QUESTIONS</p>
            <h2 style={{ fontSize: "clamp(28px, 3.5vw, 46px)", fontWeight: 300, color: C.charcoal, marginTop: 24 }}>
              Everything You <em style={{ color: C.gold }}>Need to Know</em>
            </h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {faqs.map(({ q, a }, i) => (
              <div key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ width: "100%", padding: "22px 0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontSize: 17, fontWeight: 400, color: C.charcoal }}>{q}</span>
                  <span style={{ fontSize: 20, color: C.gold, flexShrink: 0, marginLeft: 16, transition: "transform 0.2s", transform: openFaq === i ? "rotate(45deg)" : "none" }}>+</span>
                </button>
                {openFaq === i && (
                  <p className="jost" style={{ fontSize: 14, color: C.warmGrey, lineHeight: 1.8, paddingBottom: 22, fontWeight: 300 }}>{a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ padding: "140px 40px", background: `linear-gradient(160deg, ${C.champagne} 0%, ${C.cream} 50%, #EDE5D8 100%)`, textAlign: "center", position: "relative", overflow: "hidden" }} className="section-pad">
        <div style={{ position: "absolute", top: "10%", left: "10%", width: 200, height: 1, background: `linear-gradient(to right, transparent, ${C.gold}40, transparent)` }} />
        <div style={{ position: "absolute", bottom: "15%", right: "8%", width: 1, height: 140, background: `linear-gradient(to bottom, transparent, ${C.gold}40, transparent)` }} />
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <p className="jost" style={{ fontSize: 11, letterSpacing: "0.3em", color: C.gold, fontWeight: 500, marginBottom: 28 }}>YOUR TRANSFORMATION AWAITS</p>
          <h2 style={{ fontSize: "clamp(40px, 6vw, 80px)", fontWeight: 300, lineHeight: 1.1, color: C.charcoal, marginBottom: 24 }}>
            Ready to Experience<br /><em style={{ color: C.gold }}>True Luxury?</em>
          </h2>
          <p className="jost" style={{ fontSize: 16, color: C.warmGrey, fontWeight: 300, lineHeight: 1.8, marginBottom: 48, maxWidth: 480, margin: "0 auto 48px" }}>
            Join the women in Tamale who have made Zolara their beauty home. You deserve the best. That is exactly what we deliver.
          </p>
          <Link to="/book" style={{ textDecoration: "none" }}>
            <button className="btn-primary jost" style={{ padding: "18px 52px", background: C.charcoal, color: C.cream, border: "none", fontSize: 12, fontWeight: 500, letterSpacing: "0.16em", borderRadius: 2, cursor: "pointer" }}>
              BOOK YOUR LUXURY EXPERIENCE
            </button>
          </Link>
        </div>
      </section>

      {/* ── VISIT US ── */}
      <section id="visit" style={{ padding: "120px 40px", backgroundColor: C.charcoal }} className="section-pad">
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "start" }}>
          <div>
            <p className="jost" style={{ fontSize: 11, letterSpacing: "0.25em", color: C.gold, fontWeight: 500, marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 30, height: 1, background: C.gold, display: "inline-block" }} />VISIT US
            </p>
            <h2 style={{ fontSize: "clamp(28px, 3.5vw, 46px)", fontWeight: 300, color: C.cream, marginBottom: 40, lineHeight: 1.2 }}>
              Find Zolara<br /><em style={{ color: C.goldLight }}>Beauty Studio</em>
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
              {[
                { label: "ADDRESS", value: "Sakasaka, Opposite CalBank\nTamale, Northern Region, Ghana" },
                { label: "HOURS", value: "Monday to Saturday\n8:30 AM to 9:00 PM\nClosed Sundays" },
                { label: "PHONE", value: "0594 365 314\n020 884 8707" },
              ].map(({ label, value }) => (
                <div key={label} style={{ borderLeft: `2px solid ${C.gold}`, paddingLeft: 20 }}>
                  <p className="jost" style={{ fontSize: 10, letterSpacing: "0.2em", color: C.gold, marginBottom: 8, fontWeight: 500 }}>{label}</p>
                  <p style={{ fontSize: 15, color: C.cream, fontWeight: 300, lineHeight: 1.6, whiteSpace: "pre-line" }}>{value}</p>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 14, marginTop: 40 }}>
              <a href="tel:0594365314" style={{ textDecoration: "none" }}>
                <button className="btn-primary jost" style={{ padding: "12px 28px", background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: C.charcoal, border: "none", fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", borderRadius: 2, cursor: "pointer" }}>CALL NOW</button>
              </a>
              <a href="https://maps.google.com/?q=Zolara+Beauty+Studio+Sakasaka+Tamale" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                <button className="btn-ghost jost" style={{ padding: "12px 28px", background: "transparent", color: C.cream, border: `1px solid rgba(255,255,255,0.2)`, fontSize: 11, fontWeight: 500, letterSpacing: "0.12em", borderRadius: 2, cursor: "pointer" }}>GET DIRECTIONS</button>
              </a>
            </div>
          </div>
          <div style={{ borderRadius: 4, overflow: "hidden", border: `1px solid rgba(255,255,255,0.08)` }}>
            <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3962.5!2d-0.8393!3d9.4075!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zOcKwMjQnMjcuMCJOIDDCsDUwJzIxLjUiVw!5e0!3m2!1sen!2sgh!4v1234567890" width="100%" height="420" style={{ border: 0, display: "block", filter: "grayscale(20%) contrast(1.1)" }} allowFullScreen loading="lazy" title="Zolara Location" />
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ backgroundColor: "#111111", padding: "60px 40px 30px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 60, marginBottom: 50 }}>
            <div>
              <p style={{ fontSize: 22, fontWeight: 400, color: C.cream, letterSpacing: "0.1em", marginBottom: 6 }}>ZOLARA</p>
              <p className="jost" style={{ fontSize: 10, color: C.gold, letterSpacing: "0.2em", marginBottom: 20 }}>BEAUTY STUDIO</p>
              <p className="jost" style={{ fontSize: 13, color: "#666", lineHeight: 1.8, fontWeight: 300, maxWidth: 280 }}>Tamale's premier luxury beauty studio. Where every visit is an experience and every client leaves extraordinary.</p>
            </div>
            <div>
              <p className="jost" style={{ fontSize: 10, letterSpacing: "0.2em", color: C.gold, fontWeight: 500, marginBottom: 20 }}>SERVICES</p>
              {["Braiding", "Nail Artistry", "Lash Extensions", "Makeup", "Pedicure & Manicure", "Wigs & Styling"].map(s => (
                <Link key={s} to="/book" style={{ display: "block", textDecoration: "none", marginBottom: 10 }}>
                  <span className="jost" style={{ fontSize: 13, color: "#555", fontWeight: 300 }}>{s}</span>
                </Link>
              ))}
            </div>
            <div>
              <p className="jost" style={{ fontSize: 10, letterSpacing: "0.2em", color: C.gold, fontWeight: 500, marginBottom: 20 }}>QUICK LINKS</p>
              {navLinks.map(({ label, href }) => (
                <a key={href} href={href} style={{ display: "block", textDecoration: "none", marginBottom: 10 }}>
                  <span className="jost" style={{ fontSize: 13, color: "#555", fontWeight: 300 }}>{label}</span>
                </a>
              ))}
              <Link to="/app/auth" style={{ display: "block", textDecoration: "none", marginTop: 20 }}>
                <span className="jost" style={{ fontSize: 11, color: C.gold, fontWeight: 500, letterSpacing: "0.1em" }}>STAFF LOGIN</span>
              </Link>
            </div>
          </div>
          <div style={{ borderTop: "1px solid #222", paddingTop: 28, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <p className="jost" style={{ fontSize: 12, color: "#444", fontWeight: 300 }}>© {new Date().getFullYear()} Zolara Beauty Studio Ltd. All rights reserved.</p>
            <p style={{ fontSize: 13, color: "#444", fontStyle: "italic" }}>Luxury. Redefined.</p>
          </div>
        </div>
      </footer>

      <Amanda />
    </div>
  );
}
