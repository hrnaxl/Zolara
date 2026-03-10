import { Link } from "react-router-dom";
import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageCircle, X, Send, Loader2, Menu, Star, ArrowRight,
  Wifi, Droplets, Sparkles, Users, Shield, Clock, Phone, MapPin,
} from "lucide-react";

// ─── PALETTE: Pearl · Lace · Caramel · Terracotta · Walnut ───────────────────
const P = {
  pearl:      "#FDFAF6",   // page background
  lace:       "#F7F1E8",   // alternate sections
  sand:       "#EDE0CE",   // deeper warm sections
  blush:      "#EDD5C5",   // soft pink-beige
  rose:       "#C4816A",   // dusty terracotta rose
  roseDark:   "#A8614C",   // deeper rose
  roseLight:  "#D9A896",   // muted rose light
  caramel:    "#B8834A",   // warm caramel gold
  gold:       "#C9973A",   // antique gold
  goldLight:  "#DBBF7A",   // pale gold
  goldPale:   "#EDD9A8",   // wash gold
  walnut:     "#2A1508",   // darkest — deep walnut (NOT black)
  mahogany:   "#3D1E0C",   // deep mahogany
  chestnut:   "#5A3018",   // mid brown
  sienna:     "#8B5E3C",   // warm sienna
  taupe:      "#A0846E",   // muted brown-taupe
  mist:       "#D8CBBC",   // border/divider
  fog:        "#C8B8A6",   // medium border
  white:      "#FFFFFF",
};

// ─── GLOBAL CSS ──────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500;1,600&family=Jost:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { overflow-x: hidden; }
  .jost { font-family: 'Jost', sans-serif; }

  /* ── Keyframes ── */
  @keyframes fadeSlideUp   { from { opacity:0; transform:translateY(36px);  } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeSlideLeft { from { opacity:0; transform:translateX(28px);  } to { opacity:1; transform:translateX(0); } }
  @keyframes spin          { to { transform:rotate(360deg); } }
  @keyframes marquee       { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
  @keyframes floatA        { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-18px) rotate(2deg)} }
  @keyframes floatB        { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-12px) rotate(-1.5deg)} }
  @keyframes floatC        { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
  @keyframes shimmer       { 0%{background-position:-300% center} 100%{background-position:300% center} }
  @keyframes pulse         { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.7;transform:scale(0.92)} }
  @keyframes petalDrift {
    0%   { transform:translateY(-10vh) translateX(0px) rotate(0deg); opacity:0; }
    10%  { opacity: 0.6; }
    90%  { opacity: 0.4; }
    100% { transform:translateY(110vh) translateX(60px) rotate(540deg); opacity:0; }
  }
  @keyframes wordReveal {
    from { opacity:0; transform:translateY(100%) rotateX(-30deg); }
    to   { opacity:1; transform:translateY(0) rotateX(0deg); }
  }
  @keyframes lineGrow { from{scaleX:0} to{scaleX:1} }
  @keyframes counterUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }

  /* ── Utility ── */
  .reveal {
    opacity: 0;
    transform: translateY(28px);
    transition: opacity 0.9s cubic-bezier(.16,1,.3,1), transform 0.9s cubic-bezier(.16,1,.3,1);
  }
  .reveal.revealed { opacity:1; transform:translateY(0); }
  .reveal-left {
    opacity:0; transform:translateX(-28px);
    transition: opacity 0.9s cubic-bezier(.16,1,.3,1), transform 0.9s cubic-bezier(.16,1,.3,1);
  }
  .reveal-left.revealed { opacity:1; transform:translateX(0); }
  .reveal-right {
    opacity:0; transform:translateX(28px);
    transition: opacity 0.9s cubic-bezier(.16,1,.3,1), transform 0.9s cubic-bezier(.16,1,.3,1);
  }
  .reveal-right.revealed { opacity:1; transform:translateX(0); }

  /* ── Word split hero ── */
  .word-wrap { overflow: hidden; display: inline-block; }
  .word-inner {
    display: inline-block;
    opacity: 0;
    transform: translateY(100%);
    animation: wordReveal .9s cubic-bezier(.16,1,.3,1) forwards;
  }

  /* ── Cards ── */
  .svc-card {
    transition: transform .45s cubic-bezier(.16,1,.3,1), box-shadow .45s cubic-bezier(.16,1,.3,1), border-color .3s;
    will-change: transform;
  }
  .svc-card:hover {
    transform: translateY(-8px);
    box-shadow: 0 28px 60px rgba(42,21,8,.1);
    border-color: ${P.caramel}60 !important;
  }
  .svc-card:hover .svc-num { color: ${P.caramel} !important; -webkit-text-stroke-color: ${P.caramel} !important; }

  .perk-card { transition: transform .4s cubic-bezier(.16,1,.3,1), box-shadow .4s; }
  .perk-card:hover { transform: translateY(-5px); box-shadow: 0 16px 40px rgba(42,21,8,.08); }

  .gift-tile { transition: transform .4s cubic-bezier(.16,1,.3,1), box-shadow .4s, background .3s; }
  .gift-tile:hover { transform: translateY(-5px) scale(1.01); }

  /* ── Buttons ── */
  .btn-walnut {
    background: ${P.walnut}; color: ${P.pearl};
    border: none; cursor: pointer;
    transition: background .25s, transform .25s cubic-bezier(.16,1,.3,1), box-shadow .25s;
  }
  .btn-walnut:hover { background: ${P.mahogany}; transform: translateY(-2px); box-shadow: 0 12px 32px rgba(42,21,8,.22); }

  .btn-rose {
    background: linear-gradient(135deg, ${P.rose}, ${P.caramel});
    color: ${P.white}; border: none; cursor: pointer;
    transition: filter .25s, transform .25s cubic-bezier(.16,1,.3,1), box-shadow .25s;
  }
  .btn-rose:hover { filter: brightness(1.07); transform: translateY(-2px); box-shadow: 0 14px 36px rgba(196,129,106,.3); }

  .btn-outline {
    background: transparent;
    border: 1.5px solid ${P.walnut}; color: ${P.walnut}; cursor: pointer;
    transition: background .25s, color .25s, transform .25s;
  }
  .btn-outline:hover { background: ${P.walnut}; color: ${P.pearl}; transform: translateY(-2px); }

  .btn-ghost-light {
    background: transparent;
    border: 1px solid rgba(253,250,246,.22); color: ${P.lace}; cursor: pointer;
    transition: background .25s, border-color .25s, transform .25s;
  }
  .btn-ghost-light:hover { background: rgba(253,250,246,.1); border-color: rgba(253,250,246,.5); transform: translateY(-2px); }

  /* ── Nav ── */
  .nav-link { color: ${P.taupe}; transition: color .22s; text-decoration: none; }
  .nav-link:hover { color: ${P.caramel}; }

  /* ── FAQ ── */
  .faq-body {
    overflow: hidden;
    max-height: 0;
    opacity: 0;
    transition: max-height .5s cubic-bezier(.16,1,.3,1), opacity .35s ease, padding .35s;
  }
  .faq-body.open { max-height: 200px; opacity: 1; padding-bottom: 22px; }
  .faq-icon { transition: transform .35s cubic-bezier(.16,1,.3,1); }
  .faq-icon.open { transform: rotate(45deg); }

  /* ── Mobile ── */
  @media (max-width: 768px) {
    .hide-m  { display: none !important; }
    .col2    { grid-template-columns: 1fr !important; gap: 36px !important; }
    .col3    { grid-template-columns: 1fr !important; }
    .col2g   { grid-template-columns: 1fr 1fr !important; }
    .sec-px  { padding-left: 22px !important; padding-right: 22px !important; }
    .sec-py  { padding-top: 80px !important; padding-bottom: 80px !important; }
    .hero-h1 { font-size: clamp(38px, 9vw, 64px) !important; line-height: 1.08 !important; }
    .nav-px  { padding-left: 20px !important; padding-right: 20px !important; }
  }
  @media (max-width: 480px) {
    .col2g { grid-template-columns: 1fr !important; }
  }
`;

// ─── PETAL PARTICLE ──────────────────────────────────────────────────────────
function Petal({ x, delay, dur }: { x: number; delay: number; dur: number }) {
  return (
    <div style={{
      position: "absolute", top: 0, left: `${x}%`,
      width: 6, height: 9,
      borderRadius: "60% 40% 60% 40% / 50% 50% 50% 50%",
      background: `linear-gradient(135deg, ${P.roseLight}80, ${P.goldPale}60)`,
      animation: `petalDrift ${dur}s ease-in ${delay}s infinite`,
      pointerEvents: "none",
    }} />
  );
}

// ─── SCROLL REVEAL HOOK ──────────────────────────────────────────────────────
function useReveal(cls = "reveal") {
  useEffect(() => {
    const els = document.querySelectorAll(`.${cls}:not(.revealed)`);
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const el = e.target as HTMLElement;
          const delay = parseFloat(el.dataset.delay || "0");
          setTimeout(() => el.classList.add("revealed"), delay * 1000);
          obs.unobserve(el);
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  });
}

// ─── AMANDA AI ───────────────────────────────────────────────────────────────
const SYS = `You are Amanda, Zolara Beauty Studio's AI beauty consultant. Warm, concise, feminine. Location: Sakasaka, Tamale, Opposite CalBank. Services: Hair & Braiding from GHS 80, Nail Artistry from GHS 60, Lash Extensions from GHS 65, Makeup from GHS 125, Pedicure & Manicure from GHS 100, Wigs & Styling from GHS 150. Hours: Mon-Sat 8:30AM-9PM. Phone: 0594 365 314. No em-dashes.`;
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
        body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 300, system: SYS, messages: next }),
      });
      const d = await r.json();
      setMsgs([...next, { role: "assistant", content: d?.content?.[0]?.text ?? "Please call us on 0594 365 314." }]);
    } catch { setMsgs([...next, { role: "assistant", content: "Please call us on 0594 365 314." }]); }
    finally { setBusy(false); }
  };

  return (
    <>
      {open && (
        <div style={{ position:"fixed", bottom:92, right:22, zIndex:1000, width:320, maxHeight:480, borderRadius:18, overflow:"hidden", boxShadow:`0 24px 60px rgba(42,21,8,.18)`, border:`1px solid ${P.mist}`, display:"flex", flexDirection:"column", background:P.pearl }}>
          <div style={{ background:`linear-gradient(135deg, ${P.walnut}, ${P.mahogany})`, padding:"15px 18px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:34, height:34, borderRadius:"50%", background:`linear-gradient(135deg, ${P.rose}, ${P.caramel})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:600, color:P.white, fontFamily:"Cormorant Garamond, serif" }}>A</div>
              <div>
                <p style={{ color:P.pearl, fontSize:13, fontWeight:500, margin:0, fontFamily:"Cormorant Garamond, serif", letterSpacing:"0.04em" }}>Amanda</p>
                <p className="jost" style={{ color:P.taupe, fontSize:9, margin:0, letterSpacing:"0.16em" }}>ZOLARA AI CONSULTANT</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background:"none", border:"none", color:P.taupe, cursor:"pointer" }}><X size={15} /></button>
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:14, display:"flex", flexDirection:"column", gap:10, maxHeight:300 }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ display:"flex", justifyContent: m.role==="user" ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth:"82%", padding:"9px 14px", borderRadius: m.role==="user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", fontSize:13, lineHeight:1.6, background: m.role==="user" ? `linear-gradient(135deg,${P.walnut},${P.mahogany})` : P.lace, color: m.role==="user" ? P.pearl : P.walnut, border: m.role==="assistant" ? `1px solid ${P.mist}` : "none" }}>{m.content}</div>
              </div>
            ))}
            {busy && <div style={{ display:"flex" }}><div style={{ padding:"9px 14px", borderRadius:"16px 16px 16px 4px", background:P.lace, border:`1px solid ${P.mist}` }}><Loader2 size={13} style={{ color:P.caramel, animation:"spin 1s linear infinite" }} /></div></div>}
            <div ref={endRef} />
          </div>
          <div style={{ padding:"11px 13px", borderTop:`1px solid ${P.mist}`, display:"flex", gap:8 }}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask me anything..." style={{ flex:1, padding:"9px 14px", borderRadius:40, border:`1px solid ${P.mist}`, fontSize:13, outline:"none", background:P.white, color:P.walnut, fontFamily:"Jost, sans-serif" }} />
            <button onClick={send} disabled={busy||!input.trim()} style={{ width:36, height:36, borderRadius:"50%", border:"none", background:`linear-gradient(135deg,${P.rose},${P.caramel})`, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", opacity:!input.trim()?0.4:1 }}><Send size={13} color={P.white} /></button>
          </div>
        </div>
      )}
      <button onClick={() => setOpen(o=>!o)} style={{ position:"fixed", bottom:24, right:22, zIndex:1000, width:54, height:54, borderRadius:"50%", border:"none", background:`linear-gradient(135deg,${P.rose},${P.caramel})`, boxShadow:`0 10px 32px rgba(196,129,106,.35)`, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"transform .35s cubic-bezier(.34,1.56,.64,1)", transform: open?"rotate(10deg)":"none" }}>
        {open ? <X size={18} color={P.white} /> : <MessageCircle size={20} color={P.white} />}
      </button>
    </>
  );
}

// ─── HERO WORD SPLIT ─────────────────────────────────────────────────────────
function AnimWord({ word, delay, em = false }: { word: string; delay: number; em?: boolean }) {
  const Tag = em ? "em" : "span";
  return (
    <span className="word-wrap" style={{ marginRight: "0.22em" }}>
      <Tag className="word-inner" style={{ animationDelay: `${delay}s`, color: em ? P.rose : "inherit", fontStyle: em ? "italic" : "normal" }}>
        {word}
      </Tag>
    </span>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useReveal("reveal");
  useReveal("reveal-left");
  useReveal("reveal-right");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    supabase.from("reviews" as any).select("*").eq("visible", true).limit(6)
      .then(({ data }) => setReviews(data || []));
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { label: "Experience", href: "#experience" },
    { label: "Services",   href: "#services" },
    { label: "Gift Cards", href: "#giftcards" },
    { label: "Reviews",    href: "#reviews" },
    { label: "Visit Us",   href: "#visit" },
  ];

  const services = [
    { n:"01", name:"Hair & Braiding",      desc:"Cornrows, knotless braids, Fulani, Rasta, Boho styles and natural hair care.",                 price:"From GHS 80",  col:P.rose },
    { n:"02", name:"Nail Artistry",        desc:"Gel polish, acrylic sets, nail art and toenail services with top-tier products.",              price:"From GHS 60",  col:P.caramel },
    { n:"03", name:"Lash Extensions",      desc:"Classic, Hybrid, Wispy, Volume and Mega Volume sets with professional removal.",               price:"From GHS 65",  col:P.rose },
    { n:"04", name:"Makeup",               desc:"Natural Glow, Soft Glam, Full Glam, Bridal and photoshoot makeup.",                           price:"From GHS 125", col:P.caramel },
    { n:"05", name:"Pedicure & Manicure",  desc:"Classic, Jelly and Signature Pedicures. Classic and Special Manicures.",                      price:"From GHS 100", col:P.rose },
    { n:"06", name:"Wigs & Styling",       desc:"Glueless, HD lace and full lace installs. Wig coloring and sew-ins.",                         price:"From GHS 150", col:P.caramel },
  ];

  const perks = [
    { Icon:Droplets, title:"Complimentary Water",  desc:"Chilled bottled water for every client, always.",          col:P.rose },
    { Icon:Wifi,     title:"Free High-Speed WiFi", desc:"Stay connected throughout your visit.",                    col:P.caramel },
    { Icon:Sparkles, title:"The Exit Ritual",       desc:"Perfume spritz, mirror check, and your confidence back.", col:P.rose },
    { Icon:Users,    title:"Expert Team",           desc:"Certified specialists in every service category.",        col:P.caramel },
    { Icon:Shield,   title:"Premium Products",      desc:"International quality products only.",                    col:P.rose },
    { Icon:Clock,    title:"Flexible Hours",        desc:"Monday to Saturday, 8:30 AM to 9:00 PM.",                col:P.caramel },
  ];

  const giftTiers = [
    { name:"Silver",   price:"GHS 220",   desc:"Perfect for a single service",    star:false },
    { name:"Gold",     price:"GHS 450",   desc:"A full afternoon of beauty",      star:true  },
    { name:"Platinum", price:"GHS 650",   desc:"The complete Zolara experience",  star:false },
    { name:"Diamond",  price:"GHS 1,000", desc:"Ultimate luxury, fully deserved", star:true  },
  ];

  const faqs = [
    { q:"Do I need to book in advance?",           a:"We strongly recommend booking to secure your preferred time. Walk-ins are welcome based on availability." },
    { q:"What is your cancellation policy?",       a:"Please give at least 24 hours notice. Late cancellations may incur a small fee." },
    { q:"Do you provide products and materials?",  a:"Yes. All products are provided by Zolara. We use only premium internationally sourced products." },
    { q:"How long do services take?",              a:"Braiding: 2 to 6 hours. Nails and lashes: 1 to 2 hours. Makeup: 1 to 2 hours." },
    { q:"What payment methods do you accept?",     a:"Cash, mobile money (MTN, Vodafone, AirtelTigo), and bank transfers." },
  ];

  // Shared style helpers
  const eyebrow = (light = false) => ({
    display:"flex" as const, alignItems:"center" as const, gap:14, marginBottom:24,
  });
  const eyebrowLine = (light = false) => ({
    width:32, height:1, background:`linear-gradient(to right,${light?P.roseLight:P.rose},${light?P.goldLight:P.caramel})`,
  });
  const eyebrowText = (light = false): React.CSSProperties => ({
    fontFamily:"Jost,sans-serif", fontSize:10, letterSpacing:"0.3em",
    color: light ? P.goldLight : P.sienna, fontWeight:500,
  });

  const sectionTitle = (light = false) => ({
    fontSize:"clamp(30px,3.6vw,52px)" as any, fontWeight:300, lineHeight:1.16,
    color: light ? P.pearl : P.walnut,
  });

  return (
    <div style={{ backgroundColor:P.pearl, color:P.walnut, fontFamily:"'Cormorant Garamond',Georgia,serif", overflowX:"hidden" }}>
      <style>{CSS}</style>

      {/* ── NAVBAR ────────────────────────────────────────────────────────── */}
      <nav style={{
        position:"fixed", top:0, left:0, right:0, zIndex:200,
        height:70, padding:"0 52px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        transition:"background .4s, border-color .4s, backdrop-filter .4s",
        background: scrolled ? "rgba(253,250,246,0.92)" : "transparent",
        backdropFilter: scrolled ? "blur(18px)" : "none",
        borderBottom: scrolled ? `1px solid ${P.mist}` : "1px solid transparent",
      }} className="nav-px">
        <Link to="/" style={{ textDecoration:"none", display:"flex", alignItems:"center", gap:12 }}>
          <img src="/logo.png" alt="Zolara" style={{ width:40, height:40, objectFit:"contain" }} />
          <div>
            <p style={{ fontSize:14, fontWeight:500, letterSpacing:"0.18em", color:P.walnut, lineHeight:1 }}>ZOLARA</p>
            <p className="jost" style={{ fontSize:8, color:P.taupe, letterSpacing:"0.26em", marginTop:3 }}>BEAUTY STUDIO</p>
          </div>
        </Link>

        <div className="hide-m" style={{ display:"flex", gap:40 }}>
          {navLinks.map(({ label, href }) => (
            <a key={href} href={href} className="nav-link jost" style={{ fontSize:11, fontWeight:500, letterSpacing:"0.14em" }}>{label.toUpperCase()}</a>
          ))}
        </div>

        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <Link to="/book" style={{ textDecoration:"none" }}>
            <button className="btn-rose jost" style={{ padding:"10px 26px", fontSize:10, fontWeight:600, letterSpacing:"0.16em", borderRadius:4 }}>
              BOOK NOW
            </button>
          </Link>
          <button className="hide-m" style={{ background:"none", border:"none", cursor:"pointer", padding:4 }}>
            <Menu size={18} color={P.taupe} />
          </button>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section style={{
        minHeight:"100vh", paddingTop:70, position:"relative", overflow:"hidden",
        background:`
          radial-gradient(ellipse 90% 70% at 65% 30%, ${P.blush}70 0%, transparent 55%),
          radial-gradient(ellipse 60% 60% at 10% 85%, ${P.sand}60 0%, transparent 55%),
          radial-gradient(ellipse 40% 40% at 85% 80%, ${P.goldPale}40 0%, transparent 50%),
          linear-gradient(165deg, ${P.pearl} 0%, ${P.lace} 40%, ${P.sand}50 100%)
        `,
        display:"flex", alignItems:"center",
      }}>
        {/* Floating petals */}
        {[{x:8,d:0,dur:12},{x:22,d:3,dur:15},{x:45,d:1.5,dur:11},{x:68,d:5,dur:14},{x:82,d:2,dur:13},{x:91,d:7,dur:16}].map((p,i)=>(
          <Petal key={i} x={p.x} delay={p.d} dur={p.dur} />
        ))}

        {/* Decorative geometry */}
        <div style={{ position:"absolute", top:"15%", right:"6%", width:220, height:220, borderRadius:"50%", border:`1px solid ${P.roseLight}30`, animation:"floatA 8s ease-in-out infinite" }} />
        <div style={{ position:"absolute", top:"18%", right:"5.5%", width:160, height:160, borderRadius:"50%", border:`1px solid ${P.goldLight}25`, animation:"floatA 8s ease-in-out infinite .5s" }} />
        <div style={{ position:"absolute", bottom:"22%", left:"3%", width:130, height:130, borderRadius:"50%", border:`1px solid ${P.rose}20`, animation:"floatB 10s ease-in-out infinite" }} />
        <div style={{ position:"absolute", top:"42%", right:"18%", width:60, height:60, borderRadius:"50%", background:`radial-gradient(circle,${P.goldPale}50,transparent)`, animation:"floatC 6s ease-in-out infinite" }} />

        {/* Thin gold lines */}
        <div style={{ position:"absolute", top:"20%", right:"9%", width:1, height:110, background:`linear-gradient(to bottom,transparent,${P.caramel}40,transparent)` }} />
        <div style={{ position:"absolute", bottom:"28%", left:"7%", width:80, height:1, background:`linear-gradient(to right,transparent,${P.rose}40,transparent)` }} />

        <div style={{ maxWidth:1200, margin:"0 auto", padding:"80px 52px", width:"100%" }} className="sec-px">
          <div style={{ display:"grid", gridTemplateColumns:"1fr 370px", gap:64, alignItems:"center" }} className="col2">

            {/* Left content */}
            <div>
              {/* Eyebrow */}
              <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:32, animation:"fadeSlideUp .7s cubic-bezier(.16,1,.3,1) .1s both" }}>
                <div style={{ width:34, height:1, background:`linear-gradient(to right,${P.rose},${P.caramel})` }} />
                <span className="jost" style={{ fontSize:10, letterSpacing:"0.32em", color:P.sienna, fontWeight:500 }}>TAMALE'S PREMIER LUXURY STUDIO</span>
              </div>

              {/* Headline with word-split animation */}
              <h1 className="hero-h1" style={{ fontSize:"clamp(44px,5.6vw,84px)", fontWeight:300, lineHeight:1.07, marginBottom:32 }}>
                <span style={{ display:"block" }}>
                  <AnimWord word="Where" delay={0.2} />
                  <AnimWord word="Luxury" delay={0.3} />
                </span>
                <span style={{ display:"block" }}>
                  <AnimWord word="Meets" delay={0.42} em />
                  <AnimWord word="Beauty" delay={0.52} em />
                </span>
                <span style={{ display:"block" }}>
                  <AnimWord word="in" delay={0.64} />
                  <AnimWord word="Tamale." delay={0.74} />
                </span>
              </h1>

              <p className="jost" style={{ fontSize:15, lineHeight:1.88, color:P.taupe, maxWidth:480, marginBottom:44, fontWeight:300, animation:"fadeSlideUp .9s cubic-bezier(.16,1,.3,1) .85s both" }}>
                A sanctuary where every woman is treated to world-class beauty services, premium products, and an experience designed to make you feel extraordinary.
              </p>

              <div style={{ display:"flex", gap:14, flexWrap:"wrap", animation:"fadeSlideUp .9s cubic-bezier(.16,1,.3,1) .95s both" }}>
                <Link to="/book" style={{ textDecoration:"none" }}>
                  <button className="btn-walnut jost" style={{ padding:"16px 40px", fontSize:11, fontWeight:600, letterSpacing:"0.16em", borderRadius:4 }}>
                    BOOK APPOINTMENT
                  </button>
                </Link>
                <a href="#services" style={{ textDecoration:"none" }}>
                  <button className="btn-outline jost" style={{ padding:"16px 40px", fontSize:11, fontWeight:500, letterSpacing:"0.16em", borderRadius:4 }}>
                    VIEW SERVICES
                  </button>
                </a>
              </div>

              {/* Stat pills */}
              <div className="jost" style={{ display:"flex", gap:32, marginTop:56, animation:"fadeSlideUp .9s cubic-bezier(.16,1,.3,1) 1.1s both", flexWrap:"wrap" }}>
                {[["Free WiFi","For every client"], ["Free Water","Always chilled"], ["Loyalty Points","Ghana's first"]].map(([t,s])=>(
                  <div key={t}>
                    <div style={{ width:22, height:2, background:`linear-gradient(to right,${P.rose},${P.caramel})`, marginBottom:9, borderRadius:2 }} />
                    <p style={{ fontSize:12, fontWeight:600, letterSpacing:"0.08em", color:P.walnut }}>{t}</p>
                    <p style={{ fontSize:11, color:P.taupe, marginTop:3 }}>{s}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero info card */}
            <div className="hide-m" style={{ animation:"fadeSlideLeft .9s cubic-bezier(.16,1,.3,1) .45s both" }}>
              <div style={{
                background:P.white, borderRadius:16,
                padding:38,
                boxShadow:`0 40px 90px rgba(42,21,8,.1), 0 1px 0 ${P.goldPale} inset`,
                border:`1px solid ${P.mist}`,
                position:"relative", overflow:"hidden",
              }}>
                {/* Gradient top bar */}
                <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:`linear-gradient(to right,${P.rose},${P.caramel},${P.goldLight})` }} />
                {/* Soft bloom in corner */}
                <div style={{ position:"absolute", bottom:-40, right:-40, width:160, height:160, borderRadius:"50%", background:`radial-gradient(circle,${P.blush}50,transparent)`, pointerEvents:"none" }} />

                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:22 }}>
                  <div style={{ width:9, height:9, borderRadius:"50%", background:"#5BAD6F", animation:"pulse 2.2s ease-in-out infinite" }} />
                  <span className="jost" style={{ fontSize:10, color:P.sienna, letterSpacing:"0.2em", fontWeight:500 }}>OPEN TODAY</span>
                </div>

                <p style={{ fontSize:38, fontWeight:300, color:P.walnut, lineHeight:1, marginBottom:5 }}>8:30 AM</p>
                <p className="jost" style={{ fontSize:12, color:P.taupe, marginBottom:28, fontWeight:300 }}>Until 9:00 PM. Monday to Saturday</p>

                <div style={{ borderTop:`1px solid ${P.mist}`, paddingTop:20, marginBottom:20 }}>
                  <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                    <MapPin size={14} color={P.rose} style={{ marginTop:3, flexShrink:0 }} />
                    <div>
                      <p className="jost" style={{ fontSize:9, letterSpacing:"0.2em", color:P.taupe, marginBottom:5 }}>FIND US AT</p>
                      <p style={{ fontSize:14, color:P.walnut, lineHeight:1.55 }}>Sakasaka, Opposite CalBank<br />Tamale, Ghana</p>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop:`1px solid ${P.mist}`, paddingTop:20, marginBottom:28 }}>
                  <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                    <Phone size={14} color={P.caramel} style={{ marginTop:3, flexShrink:0 }} />
                    <div>
                      <p className="jost" style={{ fontSize:9, letterSpacing:"0.2em", color:P.taupe, marginBottom:5 }}>CALL US</p>
                      <p style={{ fontSize:14, color:P.walnut }}>0594 365 314</p>
                      <p className="jost" style={{ fontSize:12, color:P.taupe }}>020 884 8707</p>
                    </div>
                  </div>
                </div>

                <Link to="/book" style={{ textDecoration:"none", display:"block" }}>
                  <button className="btn-rose jost" style={{ width:"100%", padding:"14px", fontSize:10, fontWeight:700, letterSpacing:"0.18em", borderRadius:8 }}>
                    BOOK YOUR APPOINTMENT →
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll cue */}
        <div style={{ position:"absolute", bottom:30, left:"50%", transform:"translateX(-50%)", display:"flex", flexDirection:"column", alignItems:"center", gap:6, animation:"fadeSlideUp .8s 1.4s both" }}>
          <p className="jost" style={{ fontSize:9, letterSpacing:"0.3em", color:P.fog }}>SCROLL</p>
          <div style={{ width:1, height:40, background:`linear-gradient(to bottom,${P.caramel}50,transparent)`, animation:"floatC 2s ease-in-out infinite" }} />
        </div>
      </section>

      {/* ── MARQUEE ───────────────────────────────────────────────────────── */}
      <div style={{ background:`linear-gradient(135deg,${P.walnut},${P.mahogany})`, padding:"15px 0", overflow:"hidden" }}>
        <div style={{ display:"flex", width:"max-content", animation:"marquee 30s linear infinite" }}>
          {[0,1].map(rep => (
            <div key={rep} className="jost" style={{ display:"flex", whiteSpace:"nowrap", fontSize:10, fontWeight:500, letterSpacing:"0.22em", color:`${P.mist}99` }}>
              {["HAIR & BRAIDING","NAIL ARTISTRY","LASH EXTENSIONS","MAKEUP","PEDICURE & MANICURE","WIGS & STYLING","LOYALTY PROGRAM","GIFT CARDS","FREE WIFI","COMPLIMENTARY WATER"].map(t=>(
                <span key={t} style={{ display:"flex", alignItems:"center", paddingRight:52 }}>
                  <span style={{ width:4, height:4, borderRadius:"50%", background:P.caramel, flexShrink:0, marginRight:52 }} />
                  {t}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── EXPERIENCE ────────────────────────────────────────────────────── */}
      <section id="experience" style={{ padding:"130px 52px", background:P.white }} className="sec-px sec-py">
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:88, alignItems:"center" }} className="col2">

            <div className="reveal-left">
              <div style={eyebrow()}>
                <div style={eyebrowLine()} />
                <span style={eyebrowText()}>THE ZOLARA DIFFERENCE</span>
              </div>
              <h2 style={sectionTitle()}>
                An Experience<br /><em style={{ color:P.rose, fontStyle:"italic" }}>Beyond Beauty</em>
              </h2>
              <p className="jost" style={{ fontSize:15, lineHeight:1.9, color:P.taupe, fontWeight:300, marginTop:22, marginBottom:20 }}>
                We believe a salon visit should feel like an escape. Every element of Zolara is designed to comfort, elevate, and indulge you. From the moment you arrive to the moment you leave glowing.
              </p>
              <p className="jost" style={{ fontSize:15, lineHeight:1.9, color:P.taupe, fontWeight:300, marginBottom:38 }}>
                Our certified specialists bring international training and genuine passion to every service. This is not just a salon. This is your sanctuary.
              </p>
              <Link to="/book" style={{ textDecoration:"none" }}>
                <button className="btn-walnut jost" style={{ padding:"14px 32px", fontSize:10, fontWeight:600, letterSpacing:"0.16em", borderRadius:4, display:"inline-flex", alignItems:"center", gap:8 }}>
                  EXPERIENCE ZOLARA <ArrowRight size={13} />
                </button>
              </Link>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              {perks.map(({ Icon, title, desc, col }, i) => (
                <div key={title} className={`perk-card reveal`} data-delay={`${i * 0.08}`}
                  style={{ padding:24, background:P.pearl, border:`1px solid ${P.mist}`, borderRadius:12, position:"relative", overflow:"hidden" }}>
                  <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(to right,${col},transparent)` }} />
                  <div style={{ width:38, height:38, borderRadius:10, background:`${col}14`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:14 }}>
                    <Icon size={17} color={col} />
                  </div>
                  <p style={{ fontSize:14, fontWeight:500, color:P.walnut, marginBottom:6 }}>{title}</p>
                  <p className="jost" style={{ fontSize:12, color:P.taupe, lineHeight:1.65, fontWeight:300 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVICES ──────────────────────────────────────────────────────── */}
      <section id="services" style={{ padding:"130px 52px", background:`linear-gradient(175deg,${P.pearl} 0%,${P.lace} 50%,${P.sand}30 100%)` }} className="sec-px sec-py">
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div className="reveal" style={{ textAlign:"center", marginBottom:76 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:18, marginBottom:20 }}>
              <div style={{ width:40, height:1, background:`linear-gradient(to right,transparent,${P.caramel})` }} />
              <span className="jost" style={{ fontSize:10, letterSpacing:"0.32em", color:P.sienna, fontWeight:500 }}>WHAT WE OFFER</span>
              <div style={{ width:40, height:1, background:`linear-gradient(to left,transparent,${P.caramel})` }} />
            </div>
            <h2 style={sectionTitle()}>
              Services <em style={{ color:P.rose }}>Designed</em> for You
            </h2>
            <p className="jost" style={{ fontSize:15, color:P.taupe, fontWeight:300, maxWidth:440, margin:"16px auto 0" }}>
              From everyday elegance to special occasion transformations.
            </p>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:18 }} className="col3">
            {services.map(({ n, name, desc, price, col }, i) => (
              <div key={name} className="svc-card reveal" data-delay={`${i * 0.07}`}
                style={{ padding:36, background:P.white, border:`1px solid ${P.mist}`, borderRadius:12, cursor:"pointer", position:"relative", overflow:"hidden" }}>
                <div style={{ position:"absolute", top:0, left:0, right:0, height:2.5, background:`linear-gradient(to right,${col},transparent)` }} />
                {/* Big watermark number */}
                <div className="svc-num" style={{ position:"absolute", bottom:-10, right:8, fontSize:96, fontWeight:200, color:`${col}0D`, lineHeight:1, transition:"color .4s", WebkitTextStroke:`1px ${col}14`, pointerEvents:"none", userSelect:"none" }}>{n}</div>
                <span style={{ fontSize:28, fontWeight:200, color:`${col}40`, lineHeight:1, display:"block", marginBottom:16 }}>{n}</span>
                <h3 style={{ fontSize:21, fontWeight:400, color:P.walnut, marginBottom:10, lineHeight:1.25 }}>{name}</h3>
                <p className="jost" style={{ fontSize:13, color:P.taupe, lineHeight:1.75, fontWeight:300, marginBottom:22 }}>{desc}</p>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:22, height:1, background:`linear-gradient(to right,${col},${P.goldLight})` }} />
                  <span className="jost" style={{ fontSize:11, fontWeight:600, color:col, letterSpacing:"0.1em" }}>{price}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="reveal" style={{ textAlign:"center", marginTop:56 }}>
            <Link to="/book" style={{ textDecoration:"none" }}>
              <button className="btn-outline jost" style={{ padding:"14px 46px", fontSize:10, fontWeight:600, letterSpacing:"0.18em", borderRadius:4 }}>
                BOOK ANY SERVICE →
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── GIFT CARDS ────────────────────────────────────────────────────── */}
      <section id="giftcards" style={{ padding:"130px 52px", background:`linear-gradient(148deg,${P.walnut} 0%,${P.mahogany} 40%,#3D1E0C 100%)`, position:"relative", overflow:"hidden" }} className="sec-px sec-py">
        {/* Ambient glows */}
        <div style={{ position:"absolute", top:"5%", right:"8%", width:360, height:360, borderRadius:"50%", background:`radial-gradient(circle,${P.caramel}0A,transparent)`, pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:"10%", left:"4%", width:240, height:240, borderRadius:"50%", background:`radial-gradient(circle,${P.rose}0A,transparent)`, pointerEvents:"none" }} />
        {/* Thin ornamental circles */}
        <div style={{ position:"absolute", top:"20%", right:"4%", width:280, height:280, borderRadius:"50%", border:`1px solid ${P.caramel}15`, pointerEvents:"none" }} />
        <div style={{ position:"absolute", top:"23%", right:"3%", width:220, height:220, borderRadius:"50%", border:`1px solid ${P.rose}10`, pointerEvents:"none" }} />

        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:88, alignItems:"center" }} className="col2">

            <div className="reveal-left">
              <div style={eyebrow(true)}>
                <div style={eyebrowLine(true)} />
                <span style={eyebrowText(true)}>EXCLUSIVE GIFTING</span>
              </div>
              <h2 style={{ ...sectionTitle(true), marginBottom:22 }}>
                Give the Gift<br />of <em style={{ color:P.goldLight }}>Luxury</em>
              </h2>
              <p className="jost" style={{ fontSize:15, lineHeight:1.9, color:`${P.mist}BB`, fontWeight:300, marginBottom:34 }}>
                The Zolara Gift Card is the perfect present for every woman in your life. Birthdays, anniversaries, graduations, or simply because she deserves it.
              </p>
              <ul style={{ listStyle:"none", marginBottom:40 }}>
                {["Valid for 12 months from purchase","Redeemable for any service","Minor overages covered up to GHS 50","Beautifully packaged for gifting"].map((item,i)=>(
                  <li key={item} className="jost" style={{ fontSize:13, color:`${P.mist}99`, marginBottom:11, display:"flex", alignItems:"center", gap:12, fontWeight:300 }}>
                    <span style={{ width:20, height:20, borderRadius:"50%", border:`1px solid ${i%2===0?P.rose:P.caramel}50`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <span style={{ width:6, height:6, borderRadius:"50%", background:i%2===0?P.rose:P.caramel }} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/buy-gift-card" style={{ textDecoration:"none" }}>
                <button className="btn-rose jost" style={{ padding:"14px 36px", fontSize:10, fontWeight:700, letterSpacing:"0.18em", borderRadius:6 }}>
                  PURCHASE A GIFT CARD →
                </button>
              </Link>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }} className="col2g">
              {giftTiers.map(({ name, price, desc, star }, i) => (
                <div key={name} className="gift-tile reveal" data-delay={`${i * 0.1}`}
                  style={{ padding:28, borderRadius:12, cursor:"pointer", position:"relative", overflow:"hidden",
                    border: star ? `1px solid ${P.caramel}50` : `1px solid rgba(253,250,246,0.07)`,
                    background: star ? `linear-gradient(135deg,rgba(196,129,106,0.12),rgba(185,131,74,0.1))` : `rgba(253,250,246,0.04)`,
                  }}>
                  {star && <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(to right,${P.rose},${P.caramel})` }} />}
                  <p className="jost" style={{ fontSize:9, fontWeight:600, letterSpacing:"0.22em", color:star?P.goldLight:P.taupe, marginBottom:10 }}>{name.toUpperCase()}</p>
                  <p style={{ fontSize:32, fontWeight:300, color:P.pearl, lineHeight:1, marginBottom:8 }}>{price}</p>
                  <p className="jost" style={{ fontSize:12, color:`${P.mist}90`, fontWeight:300, lineHeight:1.55 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── REVIEWS ───────────────────────────────────────────────────────── */}
      <section id="reviews" style={{ padding:"130px 52px", background:P.lace }} className="sec-px sec-py">
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div className="reveal" style={{ textAlign:"center", marginBottom:76 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:18, marginBottom:20 }}>
              <div style={{ width:40, height:1, background:`linear-gradient(to right,transparent,${P.rose})` }} />
              <span className="jost" style={{ fontSize:10, letterSpacing:"0.32em", color:P.sienna, fontWeight:500 }}>CLIENT STORIES</span>
              <div style={{ width:40, height:1, background:`linear-gradient(to left,transparent,${P.rose})` }} />
            </div>
            <h2 style={sectionTitle()}>
              Words from Our <em style={{ color:P.rose }}>Clients</em>
            </h2>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:20 }}>
            {(reviews.length > 0 ? reviews : [
              { id:"1", name:"VALENTINE", comment:"Zolara is an amazing beauty studio. The service is world class.", rating:5 },
              { id:"2", name:"AMANDA",    comment:"Superb service all round. I felt like royalty from start to finish.", rating:5 },
              { id:"3", name:"HADIZA",    comment:"Finally a salon in Tamale that matches international standards. I love it.", rating:5 },
            ]).map((r:any, i:number) => (
              <div key={r.id} className="reveal" data-delay={`${i * 0.09}`}
                style={{ padding:36, background:P.white, border:`1px solid ${P.mist}`, borderRadius:14, position:"relative", overflow:"hidden" }}>
                <div style={{ position:"absolute", top:0, left:0, right:0, height:2.5, background:`linear-gradient(to right,${i%2===0?P.rose:P.caramel},transparent)` }} />
                <div style={{ fontSize:54, fontWeight:200, color:i%2===0?`${P.rose}25`:`${P.caramel}25`, lineHeight:1, marginBottom:14, fontFamily:"Cormorant Garamond,serif" }}>"</div>
                <div style={{ display:"flex", gap:3, marginBottom:16 }}>
                  {[1,2,3,4,5].map(n=><Star key={n} size={12} fill={n<=r.rating?P.gold:"none"} color={P.gold} />)}
                </div>
                <p style={{ fontSize:16, fontWeight:300, color:P.walnut, lineHeight:1.78, marginBottom:24, fontStyle:"italic" }}>{r.comment}</p>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:24, height:1, background:i%2===0?P.rose:P.caramel }} />
                  <p className="jost" style={{ fontSize:10, fontWeight:600, color:P.sienna, letterSpacing:"0.18em" }}>{r.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section style={{ padding:"130px 52px", background:P.white }} className="sec-px sec-py">
        <div style={{ maxWidth:760, margin:"0 auto" }}>
          <div className="reveal" style={{ textAlign:"center", marginBottom:68 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:18, marginBottom:20 }}>
              <div style={{ width:40, height:1, background:`linear-gradient(to right,transparent,${P.gold})` }} />
              <span className="jost" style={{ fontSize:10, letterSpacing:"0.32em", color:P.sienna, fontWeight:500 }}>COMMON QUESTIONS</span>
              <div style={{ width:40, height:1, background:`linear-gradient(to left,transparent,${P.gold})` }} />
            </div>
            <h2 style={sectionTitle()}>Everything You <em style={{ color:P.gold }}>Need to Know</em></h2>
          </div>
          {faqs.map(({ q, a }, i) => (
            <div key={i} className="reveal" data-delay={`${i * 0.06}`} style={{ borderBottom:`1px solid ${P.mist}` }}>
              <button onClick={() => setOpenFaq(openFaq===i?null:i)}
                style={{ width:"100%", padding:"22px 0", display:"flex", justifyContent:"space-between", alignItems:"center", background:"none", border:"none", cursor:"pointer", textAlign:"left", gap:16 }}>
                <span style={{ fontSize:18, fontWeight:400, color: openFaq===i ? P.rose : P.walnut, transition:"color .3s", lineHeight:1.3 }}>{q}</span>
                <div style={{ width:28, height:28, borderRadius:"50%", border:`1.5px solid ${openFaq===i?P.rose:P.fog}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, background:openFaq===i?`${P.rose}0E`:"transparent", transition:"all .3s" }}>
                  <span className={`faq-icon ${openFaq===i?"open":""}`} style={{ fontSize:18, color:openFaq===i?P.rose:P.taupe, lineHeight:1, fontWeight:300, display:"block" }}>+</span>
                </div>
              </button>
              <div className={`faq-body ${openFaq===i?"open":""}`}>
                <p className="jost" style={{ fontSize:14, color:P.taupe, lineHeight:1.88, fontWeight:300 }}>{a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────────────── */}
      <section style={{
        padding:"140px 52px",
        background:`
          radial-gradient(ellipse 80% 60% at 30% 50%,${P.blush}60 0%,transparent 55%),
          radial-gradient(ellipse 50% 70% at 80% 60%,${P.goldPale}40 0%,transparent 50%),
          linear-gradient(165deg,${P.pearl} 0%,${P.sand}60 100%)
        `,
        textAlign:"center", position:"relative", overflow:"hidden",
      }} className="sec-px sec-py">
        <div style={{ position:"absolute", top:"12%", left:"8%", width:160, height:1, background:`linear-gradient(to right,transparent,${P.caramel}25,transparent)` }} />
        <div style={{ position:"absolute", bottom:"15%", right:"7%", width:1, height:120, background:`linear-gradient(to bottom,transparent,${P.rose}25,transparent)` }} />
        {/* Big ornamental rings */}
        <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:600, height:600, borderRadius:"50%", border:`1px solid ${P.roseLight}12`, pointerEvents:"none" }} />
        <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:460, height:460, borderRadius:"50%", border:`1px solid ${P.caramel}10`, pointerEvents:"none" }} />

        <div className="reveal" style={{ maxWidth:680, margin:"0 auto", position:"relative", zIndex:1 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:18, marginBottom:28 }}>
            <div style={{ width:36, height:1, background:`linear-gradient(to right,transparent,${P.rose})` }} />
            <span className="jost" style={{ fontSize:10, letterSpacing:"0.32em", color:P.sienna, fontWeight:500 }}>YOUR TRANSFORMATION AWAITS</span>
            <div style={{ width:36, height:1, background:`linear-gradient(to left,transparent,${P.rose})` }} />
          </div>
          <h2 style={{ fontSize:"clamp(38px,5.5vw,76px)", fontWeight:300, lineHeight:1.08, color:P.walnut, marginBottom:22 }}>
            Ready to Experience<br /><em style={{ color:P.rose }}>True Luxury?</em>
          </h2>
          <p className="jost" style={{ fontSize:16, color:P.taupe, fontWeight:300, lineHeight:1.88, maxWidth:460, margin:"0 auto 52px" }}>
            Join the women in Tamale who have made Zolara their beauty home. You deserve the best. That is exactly what we deliver.
          </p>
          <Link to="/book" style={{ textDecoration:"none" }}>
            <button className="btn-walnut jost" style={{ padding:"18px 58px", fontSize:11, fontWeight:600, letterSpacing:"0.18em", borderRadius:4 }}>
              BOOK YOUR LUXURY EXPERIENCE
            </button>
          </Link>
        </div>
      </section>

      {/* ── VISIT US ──────────────────────────────────────────────────────── */}
      <section id="visit" style={{ padding:"130px 52px", background:`linear-gradient(148deg,${P.walnut} 0%,${P.mahogany} 55%,#3D1E0C 100%)`, position:"relative", overflow:"hidden" }} className="sec-px sec-py">
        <div style={{ position:"absolute", top:"25%", right:"5%", width:1, height:180, background:`linear-gradient(to bottom,transparent,${P.caramel}20,transparent)` }} />

        <div style={{ maxWidth:1200, margin:"0 auto", display:"grid", gridTemplateColumns:"1fr 1fr", gap:80, alignItems:"start" }} className="col2">
          <div className="reveal-left">
            <div style={eyebrow(true)}>
              <div style={eyebrowLine(true)} />
              <span style={eyebrowText(true)}>VISIT US</span>
            </div>
            <h2 style={{ ...sectionTitle(true), marginBottom:44 }}>
              Find Zolara<br /><em style={{ color:P.goldLight }}>Beauty Studio</em>
            </h2>
            <div style={{ display:"flex", flexDirection:"column", gap:28 }}>
              {[
                { label:"ADDRESS", val:"Sakasaka, Opposite CalBank\nTamale, Northern Region, Ghana", Icon:MapPin, col:P.rose },
                { label:"HOURS",   val:"Monday to Saturday\n8:30 AM to 9:00 PM\nClosed Sundays",         Icon:Clock,  col:P.caramel },
                { label:"PHONE",   val:"0594 365 314\n020 884 8707",                                     Icon:Phone,  col:P.rose },
              ].map(({ label, val, Icon, col }) => (
                <div key={label} style={{ display:"flex", gap:16, alignItems:"flex-start" }}>
                  <div style={{ width:38, height:38, borderRadius:10, background:`${col}18`, border:`1px solid ${col}30`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:3 }}>
                    <Icon size={15} color={col} />
                  </div>
                  <div>
                    <p className="jost" style={{ fontSize:9, letterSpacing:"0.22em", color:P.taupe, marginBottom:6, fontWeight:500 }}>{label}</p>
                    <p style={{ fontSize:14, color:P.pearl, fontWeight:300, lineHeight:1.7, whiteSpace:"pre-line" }}>{val}</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:12, marginTop:40 }}>
              <a href="tel:0594365314" style={{ textDecoration:"none" }}>
                <button className="btn-rose jost" style={{ padding:"12px 28px", fontSize:10, fontWeight:700, letterSpacing:"0.14em", borderRadius:6 }}>CALL NOW</button>
              </a>
              <a href="https://maps.google.com/?q=Zolara+Beauty+Studio+Sakasaka+Tamale" target="_blank" rel="noopener noreferrer" style={{ textDecoration:"none" }}>
                <button className="btn-ghost-light jost" style={{ padding:"12px 28px", fontSize:10, fontWeight:500, letterSpacing:"0.14em", borderRadius:6 }}>GET DIRECTIONS</button>
              </a>
            </div>
          </div>

          <div className="reveal-right">
            <div style={{ borderRadius:14, overflow:"hidden", border:`1px solid rgba(255,255,255,0.07)`, boxShadow:`0 28px 64px rgba(0,0,0,.3)` }}>
              <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3962.5!2d-0.8393!3d9.4075!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zOcKwMjQnMjcuMCJOIDDCsDUwJzIxLjUiVw!5e0!3m2!1sen!2sgh!4v1234567890"
                width="100%" height="420" style={{ border:0, display:"block", filter:"sepia(15%) contrast(1.05) brightness(0.95)" }}
                allowFullScreen loading="lazy" title="Zolara Location" />
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer style={{ background:`linear-gradient(180deg,${P.walnut} 0%,#100804 100%)`, padding:"64px 52px 32px" }} className="sec-px">
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr", gap:60, marginBottom:56 }} className="col3">
            <div>
              <p style={{ fontSize:20, fontWeight:400, color:P.pearl, letterSpacing:"0.18em", marginBottom:4 }}>ZOLARA</p>
              <p className="jost" style={{ fontSize:9, color:P.caramel, letterSpacing:"0.28em", marginBottom:20 }}>BEAUTY STUDIO</p>
              <p className="jost" style={{ fontSize:13, color:"#6B4A38", lineHeight:1.88, fontWeight:300, maxWidth:280 }}>Tamale's premier luxury beauty studio. Where every visit is an experience and every client leaves extraordinary.</p>
              <div style={{ display:"flex", gap:10, alignItems:"center", marginTop:24 }}>
                <div style={{ width:28, height:1, background:`linear-gradient(to right,${P.rose},${P.caramel})` }} />
                <p style={{ fontSize:13, fontStyle:"italic", color:"#5A3828" }}>Luxury. Redefined.</p>
              </div>
            </div>
            <div>
              <p className="jost" style={{ fontSize:9, letterSpacing:"0.26em", color:P.caramel, fontWeight:600, marginBottom:20 }}>SERVICES</p>
              {["Braiding","Nail Artistry","Lash Extensions","Makeup","Pedicure & Manicure","Wigs & Styling"].map(s=>(
                <Link key={s} to="/book" style={{ display:"block", textDecoration:"none", marginBottom:10 }}>
                  <span className="jost" style={{ fontSize:13, color:"#5A3828", fontWeight:300 }}>{s}</span>
                </Link>
              ))}
            </div>
            <div>
              <p className="jost" style={{ fontSize:9, letterSpacing:"0.26em", color:P.caramel, fontWeight:600, marginBottom:20 }}>QUICK LINKS</p>
              {navLinks.map(({ label, href }) => (
                <a key={href} href={href} style={{ display:"block", textDecoration:"none", marginBottom:10 }}>
                  <span className="jost" style={{ fontSize:13, color:"#5A3828", fontWeight:300 }}>{label}</span>
                </a>
              ))}
              <Link to="/app/auth" style={{ display:"block", textDecoration:"none", marginTop:24 }}>
                <span className="jost" style={{ fontSize:10, color:P.caramel, fontWeight:600, letterSpacing:"0.14em" }}>STAFF LOGIN →</span>
              </Link>
            </div>
          </div>
          <div style={{ borderTop:"1px solid #1E0C08", paddingTop:28, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
            <p className="jost" style={{ fontSize:12, color:"#3D2015", fontWeight:300 }}>© {new Date().getFullYear()} Zolara Beauty Studio. All rights reserved.</p>
            <p className="jost" style={{ fontSize:10, color:"#3D2015", letterSpacing:"0.18em" }}>TAMALE · GHANA</p>
          </div>
        </div>
      </footer>

      <Amanda />
    </div>
  );
}
