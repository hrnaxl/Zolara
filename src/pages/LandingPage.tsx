import { Link } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageCircle, X, Send, Loader2, Menu, Star, ArrowRight,
  Wifi, Droplets, Sparkles, Users, Shield, Clock, Phone, MapPin, ChevronDown,
} from "lucide-react";

/* ─── OFFICIAL BRAND PALETTE ─────────────────────────────────────────────── */
const P = {
  /* Golds */
  champagne:   "#D4AF89",   /* primary buttons / CTAs        */
  richGold:    "#D4AF37",   /* accent elements / icons        */
  brightGold:  "#F4D03F",   /* hover states                   */
  goldenrod:   "#B8860B",   /* pressed / deep accents         */
  goldLight:   "#E6D5AC",   /* backgrounds / tints            */
  goldDark:    "#B8956A",   /* borders / secondary gold       */
  /* Surfaces & Text */
  alabaster:   "#FFF8F0",   /* page background                */
  obsidian:    "#2C2416",   /* headings / primary text        */
  white:       "#FFFFFF",   /* cards / modals / inputs        */
  muted:       "#F8F9FA",   /* secondary surfaces             */
  textSec:     "#64748B",   /* captions / labels              */
  /* Structure */
  navy:        "#1A1A2E",   /* sidebar / dark sections        */
  coral:       "#E94560",   /* alerts / destructive           */
};

/* ─── AMANDA AI CHAT ─────────────────────────────────────────────────────── */
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
        <div style={{ position:"fixed", bottom:92, right:24, zIndex:1000, width:320, maxHeight:480, borderRadius:16, overflow:"hidden", boxShadow:`0 24px 60px rgba(26,26,46,0.18)`, border:`1px solid ${P.goldLight}`, display:"flex", flexDirection:"column", background:P.alabaster }}>
          <div style={{ background:`linear-gradient(135deg, ${P.navy} 0%, #252542 100%)`, padding:"15px 18px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:34, height:34, borderRadius:"50%", background:`linear-gradient(135deg, ${P.champagne}, ${P.richGold})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, color:P.navy, fontFamily:"Playfair Display, serif" }}>A</div>
              <div>
                <p style={{ color:"#fff", fontSize:13, fontWeight:600, margin:0, fontFamily:"Playfair Display, serif" }}>Amanda</p>
                <p style={{ color:P.goldLight, fontSize:9, margin:0, letterSpacing:"0.16em", fontFamily:"Inter, sans-serif" }}>ZOLARA BEAUTY CONSULTANT</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background:"none", border:"none", color:P.textSec, cursor:"pointer" }}><X size={15}/></button>
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:16, display:"flex", flexDirection:"column", gap:10, maxHeight:300 }}>
            {msgs.map((m,i) => (
              <div key={i} style={{ display:"flex", justifyContent: m.role==="user"?"flex-end":"flex-start" }}>
                <div style={{ maxWidth:"82%", padding:"10px 14px", borderRadius: m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px", fontSize:13, lineHeight:1.6, background: m.role==="user"?`linear-gradient(135deg, ${P.navy}, #252542)`:P.goldLight+"55", color: m.role==="user"?"#fff":P.obsidian, border: m.role==="assistant"?`1px solid ${P.goldLight}`:"none", fontFamily:"Inter, sans-serif" }}>{m.content}</div>
              </div>
            ))}
            {busy && <div style={{ display:"flex", justifyContent:"flex-start" }}><div style={{ padding:"10px 14px", borderRadius:"16px 16px 16px 4px", background:P.goldLight+"55", border:`1px solid ${P.goldLight}` }}><Loader2 size={14} style={{ color:P.champagne, animation:"_spin 1s linear infinite" }}/></div></div>}
            <div ref={endRef}/>
          </div>
          <div style={{ padding:"12px 14px", borderTop:`1px solid ${P.goldLight}`, display:"flex", gap:8 }}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask me anything..." style={{ flex:1, padding:"10px 14px", borderRadius:40, border:`1px solid ${P.goldLight}`, fontSize:13, outline:"none", background:P.white, color:P.obsidian, fontFamily:"Inter, sans-serif" }}/>
            <button onClick={send} disabled={busy||!input.trim()} style={{ width:38, height:38, borderRadius:"50%", border:"none", background:`linear-gradient(135deg, ${P.champagne}, ${P.richGold})`, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", opacity:!input.trim()?0.45:1 }}><Send size={13} color={P.navy}/></button>
          </div>
        </div>
      )}
      <button onClick={() => setOpen(o=>!o)} style={{ position:"fixed", bottom:28, right:24, zIndex:1000, width:56, height:56, borderRadius:"50%", border:"none", background:`linear-gradient(135deg, ${P.navy}, #252542)`, boxShadow:`0 8px 30px rgba(26,26,46,0.28)`, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"transform 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}>
        {open ? <X size={18} color={P.champagne}/> : <MessageCircle size={20} color={P.champagne}/>}
      </button>
    </>
  );
}

/* ─── SCROLL REVEAL ──────────────────────────────────────────────────────── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } }, { threshold: 0.1 });
    obs.observe(el); return () => obs.disconnect();
  }, []);
  return { ref, vis };
}

function Reveal({ children, delay=0, dir="up" }: { children: React.ReactNode; delay?: number; dir?: "up"|"left"|"right"|"fade" }) {
  const { ref, vis } = useReveal();
  const t: Record<string,string> = { up:"translateY(36px)", left:"translateX(-36px)", right:"translateX(36px)", fade:"scale(0.97)" };
  return (
    <div ref={ref} style={{ opacity:vis?1:0, transform:vis?"none":t[dir], transition:`opacity 0.75s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.75s cubic-bezier(0.16,1,0.3,1) ${delay}s` }}>
      {children}
    </div>
  );
}

/* ─── GOLD DIVIDER ───────────────────────────────────────────────────────── */
const GoldLine = ({ center=false }) => (
  <div style={{ display:"flex", alignItems:"center", gap:14, justifyContent:center?"center":"flex-start", marginBottom:20 }}>
    {center && <div style={{ flex:1, maxWidth:48, height:1, background:`linear-gradient(to right, transparent, ${P.goldDark})` }}/>}
    <div style={{ width:32, height:2, borderRadius:2, background:`linear-gradient(to right, ${P.champagne}, ${P.richGold})` }}/>
    {center && <div style={{ flex:1, maxWidth:48, height:1, background:`linear-gradient(to left, transparent, ${P.goldDark})` }}/>}
  </div>
);

/* ─── SECTION LABEL ──────────────────────────────────────────────────────── */
const Label = ({ text, center=false }: {text:string; center?:boolean}) => (
  <p style={{ fontFamily:"Inter, sans-serif", fontSize:10, fontWeight:600, letterSpacing:"0.28em", color:P.goldDark, textAlign:center?"center":"left" }}>{text}</p>
);

/* ─── MAIN ───────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [openFaq, setOpenFaq] = useState<number|null>(null);
  const [heroIn, setHeroIn] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHeroIn(true), 80);
    const onScroll = () => setScrolled(window.scrollY > 52);
    window.addEventListener("scroll", onScroll);
    supabase.from("reviews" as any).select("*").eq("visible", true).limit(6)
      .then(({ data }) => setReviews(data || []));
    return () => { window.removeEventListener("scroll", onScroll); clearTimeout(t); };
  }, []);

  const hi = (d: number, s: React.CSSProperties = {}): React.CSSProperties => ({
    ...s,
    opacity: heroIn ? 1 : 0,
    transform: heroIn ? "none" : "translateY(28px)",
    transition: `opacity 0.9s cubic-bezier(0.16,1,0.3,1) ${d}s, transform 0.9s cubic-bezier(0.16,1,0.3,1) ${d}s`,
  });

  const navLinks = [
    { label:"Experience", href:"#experience" },
    { label:"Services",   href:"#services"   },
    { label:"Gift Cards", href:"#giftcards"  },
    { label:"Reviews",    href:"#reviews"    },
    { label:"Visit Us",   href:"#visit"      },
  ];

  const services = [
    { num:"01", name:"Hair & Braiding",    desc:"Cornrows, knotless braids, Fulani, Rasta, Boho styles and natural hair care.",                  price:"From GHS 80"  },
    { num:"02", name:"Nail Artistry",      desc:"Gel polish, acrylic sets, nail art and toenail services with top-tier products.",                price:"From GHS 60"  },
    { num:"03", name:"Lash Extensions",    desc:"Classic, Hybrid, Wispy, Volume and Mega Volume sets with professional removal.",                 price:"From GHS 65"  },
    { num:"04", name:"Makeup",             desc:"Natural Glow, Soft Glam, Full Glam, Bridal and photoshoot makeup.",                             price:"From GHS 125" },
    { num:"05", name:"Pedicure & Manicure",desc:"Classic, Jelly and Signature Pedicures. Classic and Special Manicures.",                        price:"From GHS 100" },
    { num:"06", name:"Wigs & Styling",     desc:"Glueless, HD lace and full lace installs. Wig coloring and sew-ins.",                           price:"From GHS 150" },
  ];

  const perks = [
    { icon:Droplets, title:"Complimentary Water",  desc:"Chilled bottled water for every client, always."                          },
    { icon:Wifi,     title:"Free High-Speed WiFi", desc:"Stay connected throughout your entire visit."                             },
    { icon:Sparkles, title:"The Exit Ritual",       desc:"Perfume spritz, mirror check, and the confidence you came for."           },
    { icon:Users,    title:"Expert Team",           desc:"Certified specialists across every service category."                    },
    { icon:Shield,   title:"Premium Products",      desc:"International quality products and techniques only."                     },
    { icon:Clock,    title:"Flexible Hours",        desc:"Open Monday to Saturday, 8:30 AM to 9:00 PM."                           },
  ];

  const giftTiers = [
    { name:"Silver",   price:"GHS 220",   desc:"Perfect for a single service treat",     featured:false },
    { name:"Gold",     price:"GHS 450",   desc:"A full afternoon of beauty",              featured:true  },
    { name:"Platinum", price:"GHS 650",   desc:"The complete Zolara experience",          featured:false },
    { name:"Diamond",  price:"GHS 1,000", desc:"Ultimate luxury for someone special",     featured:true  },
  ];

  const faqs = [
    { q:"Do I need to book in advance?",           a:"We strongly recommend booking in advance to secure your preferred time. Walk-ins are welcome based on availability."     },
    { q:"What is your cancellation policy?",       a:"We ask for at least 24 hours notice. Late cancellations may incur a small fee."                                         },
    { q:"Do you provide products and materials?",  a:"Yes. All products are provided by Zolara. We use only premium, internationally sourced products."                      },
    { q:"How long do services take?",              a:"Braiding: 2 to 6 hours. Nails and lashes: 1 to 2 hours. Makeup: 1 to 2 hours."                                        },
    { q:"What payment methods do you accept?",     a:"Cash, mobile money (MTN, Vodafone, AirtelTigo), and bank transfers."                                                   },
  ];

  return (
    <div style={{ backgroundColor:P.alabaster, color:P.obsidian, fontFamily:"Playfair Display, Georgia, serif", overflowX:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Inter:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        @keyframes _spin{to{transform:rotate(360deg)}}
        @keyframes _marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes _float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes _pulse{0%,100%{opacity:.6;transform:scale(1)}50%{opacity:1;transform:scale(1.05)}}
        @keyframes _glow{0%,100%{box-shadow:0 0 0 0 rgba(212,175,55,0)}50%{box-shadow:0 0 0 8px rgba(212,175,55,0.15)}}
        .inter{font-family:"Inter",sans-serif}
        .nav-a{font-family:"Inter",sans-serif;text-decoration:none;font-size:11px;font-weight:500;letter-spacing:.14em;color:${P.textSec};transition:color .2s}
        .nav-a:hover{color:${P.champagne}}
        .btn-champagne{font-family:"Inter",sans-serif;background:${P.champagne};color:${P.navy};border:none;cursor:pointer;transition:all .25s cubic-bezier(.16,1,.3,1)}
        .btn-champagne:hover{background:${P.richGold};transform:translateY(-2px);box-shadow:0 10px 28px rgba(212,175,137,.35)}
        .btn-outline{font-family:"Inter",sans-serif;background:transparent;color:${P.obsidian};border:1.5px solid ${P.goldDark};cursor:pointer;transition:all .25s}
        .btn-outline:hover{background:${P.obsidian};color:#fff;border-color:${P.obsidian}}
        .btn-gold{font-family:"Inter",sans-serif;background:linear-gradient(135deg,${P.champagne},${P.richGold});color:${P.navy};border:none;cursor:pointer;font-weight:600;transition:all .25s}
        .btn-gold:hover{transform:translateY(-2px);box-shadow:0 12px 32px rgba(212,175,137,.32);filter:brightness(1.06)}
        .btn-navy{font-family:"Inter",sans-serif;background:${P.navy};color:#fff;border:none;cursor:pointer;transition:all .25s}
        .btn-navy:hover{background:#252542;transform:translateY(-2px);box-shadow:0 10px 28px rgba(26,26,46,.3)}
        .svc{transition:transform .4s cubic-bezier(.16,1,.3,1),box-shadow .4s cubic-bezier(.16,1,.3,1);cursor:pointer}
        .svc:hover{transform:translateY(-6px);box-shadow:0 24px 52px rgba(44,36,22,.1)}
        .perk{transition:transform .3s,box-shadow .3s}
        .perk:hover{transform:translateY(-3px);box-shadow:0 14px 36px rgba(44,36,22,.08)}
        .gift{transition:transform .3s cubic-bezier(.16,1,.3,1),box-shadow .3s}
        .gift:hover{transform:translateY(-4px);box-shadow:0 18px 44px rgba(26,26,46,.18)}
        .faq-body{overflow:hidden;transition:max-height .4s cubic-bezier(.16,1,.3,1),opacity .3s}
        @media(max-width:768px){
          .hide-m{display:none!important}
          .h1{font-size:clamp(36px,9vw,68px)!important}
          .two{grid-template-columns:1fr!important;gap:40px!important}
          .three{grid-template-columns:1fr!important}
          .two-sm{grid-template-columns:1fr 1fr!important}
          .px{padding-left:20px!important;padding-right:20px!important}
        }
      `}</style>

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:100, padding:"0 52px", height:70, display:"flex", alignItems:"center", justifyContent:"space-between", transition:"all .4s cubic-bezier(.16,1,.3,1)", backgroundColor:scrolled?"rgba(255,248,240,.95)":"transparent", backdropFilter:scrolled?"blur(14px)":"none", borderBottom:scrolled?`1px solid ${P.goldLight}`:"1px solid transparent" }} className="px">
        <Link to="/" style={{ textDecoration:"none", display:"flex", alignItems:"center", gap:12 }}>
          <img src="/logo.png" alt="Zolara" style={{ width:42, height:42, objectFit:"contain" }}/>
          <div>
            <p style={{ fontSize:15, fontWeight:600, color:P.obsidian, letterSpacing:".18em", lineHeight:1 }}>ZOLARA</p>
            <p className="inter" style={{ fontSize:8, color:P.textSec, letterSpacing:".24em", marginTop:3 }}>BEAUTY STUDIO</p>
          </div>
        </Link>

        <div className="hide-m" style={{ display:"flex", gap:40 }}>
          {navLinks.map(({label,href}) => <a key={href} href={href} className="nav-a">{label.toUpperCase()}</a>)}
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <Link to="/book" style={{ textDecoration:"none" }}>
            <button className="btn-champagne" style={{ padding:"10px 26px", fontSize:10, fontWeight:600, letterSpacing:".15em", borderRadius:3 }}>BOOK NOW</button>
          </Link>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section style={{ minHeight:"100vh", background:`radial-gradient(ellipse 75% 65% at 65% 45%, ${P.goldLight}45 0%, transparent 62%), linear-gradient(165deg, ${P.alabaster} 0%, #FFF3E0 55%, #F9EBCF 100%)`, display:"flex", alignItems:"center", paddingTop:70, position:"relative", overflow:"hidden" }}>
        {/* Floating shapes */}
        <div style={{ position:"absolute", top:"8%", right:"12%", width:320, height:320, borderRadius:"50%", background:`radial-gradient(circle, ${P.goldLight}35 0%, transparent 68%)`, animation:"_float 8s ease-in-out infinite", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", bottom:"14%", left:"3%", width:220, height:220, borderRadius:"50%", background:`radial-gradient(circle, ${P.champagne}20 0%, transparent 68%)`, animation:"_float 11s ease-in-out infinite reverse", pointerEvents:"none" }}/>
        {/* Fine lines */}
        <div style={{ position:"absolute", top:"18%", right:"6%", width:1, height:160, background:`linear-gradient(to bottom, transparent, ${P.champagne}60, transparent)` }}/>
        <div style={{ position:"absolute", bottom:"22%", left:"4%", width:110, height:1, background:`linear-gradient(to right, transparent, ${P.champagne}60, transparent)` }}/>

        <div style={{ maxWidth:1200, margin:"0 auto", padding:"90px 52px", width:"100%" }} className="px">
          <div style={{ display:"grid", gridTemplateColumns:"1fr 360px", gap:64, alignItems:"center" }} className="two">
            <div>
              <div style={hi(.12,{ display:"flex", alignItems:"center", gap:14, marginBottom:28 })}>
                <div style={{ width:32, height:2, borderRadius:2, background:`linear-gradient(to right, ${P.champagne}, ${P.richGold})` }}/>
                <span className="inter" style={{ fontSize:10, letterSpacing:".3em", color:P.goldDark, fontWeight:600 }}>TAMALE'S PREMIER LUXURY STUDIO</span>
              </div>

              <h1 className="h1" style={hi(.22,{ fontSize:"clamp(42px,5.2vw,80px)", fontWeight:400, lineHeight:1.06, color:P.obsidian, marginBottom:26 })}>
                Where Luxury<br/>
                <em style={{ color:P.champagne, fontStyle:"italic" }}>Meets Beauty</em><br/>
                in Tamale.
              </h1>

              <p className="inter" style={hi(.34,{ fontSize:15, lineHeight:1.85, color:P.textSec, maxWidth:460, marginBottom:44, fontWeight:400 })}>
                A sanctuary where every woman is treated to world-class beauty services, premium products, and an experience designed to make you feel extraordinary.
              </p>

              <div style={hi(.44,{ display:"flex", gap:14, flexWrap:"wrap" })}>
                <Link to="/book" style={{ textDecoration:"none" }}>
                  <button className="btn-champagne" style={{ padding:"15px 40px", fontSize:11, fontWeight:600, letterSpacing:".16em", borderRadius:3 }}>BOOK APPOINTMENT</button>
                </Link>
                <a href="#services" style={{ textDecoration:"none" }}>
                  <button className="btn-outline" style={{ padding:"15px 40px", fontSize:11, fontWeight:500, letterSpacing:".16em", borderRadius:3 }}>VIEW SERVICES</button>
                </a>
              </div>

              <div className="inter" style={hi(.54,{ display:"flex", gap:36, marginTop:52 })}>
                {[["Free WiFi","For every client"],["Free Water","Always chilled"],["Loyalty Points","Ghana's first"]].map(([t,s])=>(
                  <div key={t}>
                    <div style={{ width:22, height:2, borderRadius:2, background:`linear-gradient(to right, ${P.champagne}, ${P.richGold})`, marginBottom:8 }}/>
                    <p style={{ fontSize:12, fontWeight:600, color:P.obsidian, letterSpacing:".06em" }}>{t}</p>
                    <p style={{ fontSize:11, color:P.textSec, marginTop:3 }}>{s}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Info card */}
            <div className="hide-m" style={hi(.28,{})}>
              <div style={{ background:P.white, borderRadius:14, padding:36, boxShadow:`0 32px 72px rgba(44,36,22,.1), 0 1px 0 ${P.goldLight} inset`, border:`1px solid ${P.goldLight}`, position:"relative", overflow:"hidden" }}>
                <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:`linear-gradient(to right, ${P.champagne}, ${P.richGold}, ${P.brightGold})` }}/>
                <div style={{ position:"absolute", bottom:-24, right:-24, width:140, height:140, borderRadius:"50%", background:`radial-gradient(circle, ${P.goldLight}30 0%, transparent 70%)`, pointerEvents:"none" }}/>

                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:22 }}>
                  <div style={{ width:9, height:9, borderRadius:"50%", background:"#10B981", animation:"_glow 2s infinite" }}/>
                  <p className="inter" style={{ fontSize:10, color:"#10B981", letterSpacing:".18em", fontWeight:600 }}>OPEN TODAY</p>
                </div>

                <p style={{ fontSize:38, fontWeight:400, color:P.obsidian, marginBottom:4, lineHeight:1 }}>8:30 AM</p>
                <p className="inter" style={{ fontSize:12, color:P.textSec, marginBottom:28 }}>Until 9:00 PM. Monday to Saturday</p>

                <div style={{ borderTop:`1px solid ${P.goldLight}`, paddingTop:22, marginBottom:22 }}>
                  <div style={{ display:"flex", gap:11, alignItems:"flex-start" }}>
                    <MapPin size={14} color={P.champagne} style={{ marginTop:3, flexShrink:0 }}/>
                    <div>
                      <p className="inter" style={{ fontSize:9, letterSpacing:".18em", color:P.textSec, marginBottom:5, fontWeight:500 }}>FIND US AT</p>
                      <p style={{ fontSize:14, color:P.obsidian, lineHeight:1.55 }}>Sakasaka, Opposite CalBank<br/>Tamale, Ghana</p>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop:`1px solid ${P.goldLight}`, paddingTop:22, marginBottom:28 }}>
                  <div style={{ display:"flex", gap:11, alignItems:"flex-start" }}>
                    <Phone size={14} color={P.richGold} style={{ marginTop:3, flexShrink:0 }}/>
                    <div>
                      <p className="inter" style={{ fontSize:9, letterSpacing:".18em", color:P.textSec, marginBottom:5, fontWeight:500 }}>CALL US</p>
                      <p style={{ fontSize:14, color:P.obsidian }}>0594 365 314</p>
                      <p className="inter" style={{ fontSize:12, color:P.textSec }}>020 884 8707</p>
                    </div>
                  </div>
                </div>

                <Link to="/book" style={{ textDecoration:"none", display:"block" }}>
                  <button className="btn-gold" style={{ width:"100%", padding:14, fontSize:10, letterSpacing:".18em", borderRadius:8 }}>BOOK YOUR APPOINTMENT →</button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll cue */}
        <div style={hi(1.1,{ position:"absolute", bottom:30, left:"50%", transform:"translateX(-50%)", display:"flex", flexDirection:"column", alignItems:"center", gap:6 })}>
          <p className="inter" style={{ fontSize:9, letterSpacing:".22em", color:P.textSec }}>SCROLL</p>
          <ChevronDown size={13} color={P.textSec} style={{ animation:"_float 2s ease-in-out infinite" }}/>
        </div>
      </section>

      {/* ── MARQUEE ─────────────────────────────────────────────────────── */}
      <div style={{ background:`linear-gradient(135deg, ${P.navy} 0%, #252542 100%)`, padding:"15px 0", overflow:"hidden" }}>
        <div style={{ display:"flex", width:"fit-content", animation:"_marquee 30s linear infinite" }}>
          {[...Array(2)].map((_,rep)=>(
            <div key={rep} className="inter" style={{ display:"flex", whiteSpace:"nowrap", fontSize:10, fontWeight:500, letterSpacing:".2em", color:P.goldLight+"AA" }}>
              {["HAIR & BRAIDING","NAIL ARTISTRY","LASH EXTENSIONS","MAKEUP","PEDICURE & MANICURE","WIGS & STYLING","LOYALTY PROGRAM","GIFT CARDS","FREE WIFI","COMPLIMENTARY WATER"].map(t=>(
                <span key={t} style={{ display:"flex", alignItems:"center", paddingRight:52 }}>
                  <span style={{ width:4, height:4, borderRadius:"50%", background:P.champagne, display:"inline-block", marginRight:52 }}/>
                  {t}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── EXPERIENCE ──────────────────────────────────────────────────── */}
      <section id="experience" style={{ padding:"128px 52px", background:P.white }} className="px">
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:84, alignItems:"center" }} className="two">
            <Reveal>
              <div>
                <Label text="THE ZOLARA DIFFERENCE"/>
                <GoldLine/>
                <h2 style={{ fontSize:"clamp(28px,3.4vw,48px)", fontWeight:400, lineHeight:1.2, color:P.obsidian, marginBottom:20 }}>
                  An Experience<br/><em style={{ color:P.champagne }}>Beyond Beauty</em>
                </h2>
                <p className="inter" style={{ fontSize:15, lineHeight:1.9, color:P.textSec, fontWeight:400, marginBottom:20 }}>
                  We believe a salon visit should feel like an escape. Every element of Zolara is designed to comfort, elevate, and indulge you. From the moment you walk in to the moment you leave.
                </p>
                <p className="inter" style={{ fontSize:15, lineHeight:1.9, color:P.textSec, fontWeight:400, marginBottom:40 }}>
                  Our team of certified specialists bring international training and genuine passion to every service. This is not just a salon. This is your beauty sanctuary.
                </p>
                <Link to="/book" style={{ textDecoration:"none" }}>
                  <button className="btn-champagne" style={{ padding:"13px 32px", fontSize:10, fontWeight:600, letterSpacing:".16em", borderRadius:3, display:"inline-flex", alignItems:"center", gap:8 }}>
                    EXPERIENCE ZOLARA <ArrowRight size={12}/>
                  </button>
                </Link>
              </div>
            </Reveal>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }} className="two-sm">
              {perks.map(({icon:Icon,title,desc},i)=>(
                <Reveal key={title} delay={i*.07}>
                  <div className="perk" style={{ padding:24, background:P.alabaster, border:`1px solid ${P.goldLight}`, borderRadius:10, position:"relative", overflow:"hidden" }}>
                    <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:i%2===0?`linear-gradient(to right, ${P.champagne}, transparent)`:`linear-gradient(to right, ${P.richGold}, transparent)` }}/>
                    <div style={{ width:36, height:36, borderRadius:8, background:i%2===0?`${P.goldLight}50`:P.muted, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:14 }}>
                      <Icon size={17} color={i%2===0?P.champagne:P.richGold}/>
                    </div>
                    <p style={{ fontSize:14, fontWeight:500, color:P.obsidian, marginBottom:6 }}>{title}</p>
                    <p className="inter" style={{ fontSize:12, color:P.textSec, lineHeight:1.65, fontWeight:400 }}>{desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVICES ────────────────────────────────────────────────────── */}
      <section id="services" style={{ padding:"128px 52px", background:`linear-gradient(170deg, ${P.alabaster} 0%, ${P.goldLight}30 50%, ${P.alabaster} 100%)` }} className="px">
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <Reveal>
            <div style={{ textAlign:"center", marginBottom:72 }}>
              <Label text="WHAT WE OFFER" center/>
              <GoldLine center/>
              <h2 style={{ fontSize:"clamp(28px,3.4vw,48px)", fontWeight:400, lineHeight:1.2, color:P.obsidian, marginBottom:14 }}>
                Services <em style={{ color:P.champagne }}>Designed</em> for You
              </h2>
              <p className="inter" style={{ fontSize:15, color:P.textSec, maxWidth:420, margin:"0 auto" }}>
                From everyday elegance to special occasion transformations.
              </p>
            </div>
          </Reveal>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:18 }} className="three">
            {services.map(({num,name,desc,price},i)=>(
              <Reveal key={name} delay={i*.06}>
                <div className="svc" style={{ padding:34, background:P.white, border:`1px solid ${P.goldLight}`, borderRadius:10, position:"relative", overflow:"hidden" }}>
                  <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(to right, ${i%2===0?P.champagne:P.richGold}, transparent)` }}/>
                  {/* Large ghost number */}
                  <span style={{ position:"absolute", bottom:-8, right:12, fontSize:88, fontWeight:700, color:`${P.goldLight}50`, lineHeight:1, pointerEvents:"none", userSelect:"none", fontFamily:"Playfair Display, serif" }}>{num}</span>
                  <span style={{ fontSize:30, fontWeight:300, color:P.goldDark+"55", lineHeight:1, display:"block", marginBottom:14 }}>{num}</span>
                  <h3 style={{ fontSize:19, fontWeight:500, color:P.obsidian, marginBottom:10 }}>{name}</h3>
                  <p className="inter" style={{ fontSize:13, color:P.textSec, lineHeight:1.7, marginBottom:22 }}>{desc}</p>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:18, height:2, borderRadius:2, background:`linear-gradient(to right, ${P.champagne}, ${P.richGold})` }}/>
                    <p className="inter" style={{ fontSize:11, fontWeight:600, color:P.champagne, letterSpacing:".1em" }}>{price}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={.25}>
            <div style={{ textAlign:"center", marginTop:52 }}>
              <Link to="/book" style={{ textDecoration:"none" }}>
                <button className="btn-outline" style={{ padding:"13px 44px", fontSize:10, fontWeight:600, letterSpacing:".16em", borderRadius:3 }}>BOOK ANY SERVICE →</button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── GIFT CARDS ──────────────────────────────────────────────────── */}
      <section id="giftcards" style={{ padding:"128px 52px", background:`linear-gradient(145deg, ${P.navy} 0%, #1E1E38 55%, #161628 100%)`, position:"relative", overflow:"hidden" }} className="px">
        <div style={{ position:"absolute", top:"8%", right:"4%", width:340, height:340, borderRadius:"50%", background:`radial-gradient(circle, ${P.champagne}07 0%, transparent 68%)`, pointerEvents:"none" }}/>
        <div style={{ position:"absolute", bottom:"6%", left:"2%", width:220, height:220, borderRadius:"50%", background:`radial-gradient(circle, ${P.richGold}06 0%, transparent 68%)`, pointerEvents:"none" }}/>
        <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:`linear-gradient(to right, transparent, ${P.champagne}30, transparent)` }}/>

        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:80, alignItems:"center" }} className="two">
            <Reveal dir="left">
              <div>
                <Label text="EXCLUSIVE GIFTING"/>
                <GoldLine/>
                <h2 style={{ fontSize:"clamp(28px,3.4vw,48px)", fontWeight:400, lineHeight:1.2, color:"#fff", marginBottom:20 }}>
                  Give the Gift<br/>of <em style={{ color:P.champagne }}>Luxury</em>
                </h2>
                <p className="inter" style={{ fontSize:15, lineHeight:1.9, color:P.goldLight+"BB", marginBottom:36 }}>
                  The Zolara Gift Card is the perfect present for every woman in your life. Birthdays, anniversaries, graduations, or simply because she deserves it.
                </p>
                <ul style={{ listStyle:"none", marginBottom:40 }}>
                  {["Valid for 12 months from purchase","Redeemable for any service at Zolara","Minor overages covered up to GHS 50","Beautifully packaged for gifting"].map((item,i)=>(
                    <li key={item} className="inter" style={{ fontSize:13, color:P.goldLight+"BB", marginBottom:12, display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ width:18, height:18, borderRadius:"50%", background:`${P.champagne}20`, border:`1px solid ${P.champagne}50`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <div style={{ width:5, height:5, borderRadius:"50%", background:i%2===0?P.champagne:P.richGold }}/>
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link to="/buy-gift-card" style={{ textDecoration:"none" }}>
                  <button className="btn-gold" style={{ padding:"13px 34px", fontSize:10, letterSpacing:".16em", borderRadius:6 }}>PURCHASE A GIFT CARD →</button>
                </Link>
              </div>
            </Reveal>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }} className="two-sm">
              {giftTiers.map(({name,price,desc,featured},i)=>(
                <Reveal key={name} delay={i*.09} dir="right">
                  <div className="gift" style={{ padding:26, borderRadius:10, border:featured?`1px solid ${P.champagne}55`:`1px solid rgba(255,255,255,.07)`, background:featured?`linear-gradient(135deg, ${P.champagne}14, ${P.richGold}08)`:P.goldLight+"05", position:"relative", overflow:"hidden" }}>
                    {featured && <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(to right, ${P.champagne}, ${P.richGold})` }}/>}
                    <p className="inter" style={{ fontSize:9, fontWeight:600, color:featured?P.champagne:P.goldLight+"80", letterSpacing:".2em", marginBottom:10 }}>{name.toUpperCase()}</p>
                    <p style={{ fontSize:28, fontWeight:400, color:"#fff", lineHeight:1, marginBottom:8 }}>{price}</p>
                    <p className="inter" style={{ fontSize:12, color:P.goldLight+"99", lineHeight:1.5 }}>{desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── REVIEWS ─────────────────────────────────────────────────────── */}
      <section id="reviews" style={{ padding:"128px 52px", background:P.muted }} className="px">
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <Reveal>
            <div style={{ textAlign:"center", marginBottom:72 }}>
              <Label text="CLIENT STORIES" center/>
              <GoldLine center/>
              <h2 style={{ fontSize:"clamp(28px,3.4vw,48px)", fontWeight:400, lineHeight:1.2, color:P.obsidian }}>
                Words from Our <em style={{ color:P.champagne }}>Clients</em>
              </h2>
            </div>
          </Reveal>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:20 }}>
            {(reviews.length > 0 ? reviews : [
              { id:"1", name:"VALENTINE", comment:"Zolara is an amazing beauty studio. The service is world class.", rating:5 },
              { id:"2", name:"AMANDA",    comment:"Superb service all round. I felt like royalty from start to finish.", rating:5 },
            ]).map((r:any,i)=>(
              <Reveal key={r.id} delay={i*.08}>
                <div style={{ padding:36, background:P.white, border:`1px solid ${P.goldLight}`, borderRadius:12, position:"relative", overflow:"hidden" }}>
                  <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:i%2===0?`linear-gradient(to right, ${P.champagne}, transparent)`:`linear-gradient(to right, ${P.richGold}, transparent)` }}/>
                  <p style={{ fontSize:52, color:`${P.champagne}30`, lineHeight:1, marginBottom:12, fontWeight:400 }}>"</p>
                  <div style={{ display:"flex", gap:3, marginBottom:16 }}>
                    {[1,2,3,4,5].map(n=><Star key={n} size={12} fill={n<=r.rating?P.richGold:"none"} color={P.richGold}/>)}
                  </div>
                  <p style={{ fontSize:16, fontWeight:400, color:P.obsidian, lineHeight:1.75, marginBottom:24, fontStyle:"italic" }}>{r.comment}</p>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:20, height:2, borderRadius:2, background:`linear-gradient(to right, ${P.champagne}, ${P.richGold})` }}/>
                    <p className="inter" style={{ fontSize:10, fontWeight:600, color:P.goldDark, letterSpacing:".16em" }}>{r.name}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section style={{ padding:"128px 52px", background:P.white }} className="px">
        <div style={{ maxWidth:740, margin:"0 auto" }}>
          <Reveal>
            <div style={{ textAlign:"center", marginBottom:64 }}>
              <Label text="COMMON QUESTIONS" center/>
              <GoldLine center/>
              <h2 style={{ fontSize:"clamp(26px,3vw,44px)", fontWeight:400, color:P.obsidian }}>
                Everything You <em style={{ color:P.champagne }}>Need to Know</em>
              </h2>
            </div>
          </Reveal>

          {faqs.map(({q,a},i)=>(
            <Reveal key={i} delay={i*.05}>
              <div style={{ borderBottom:`1px solid ${P.goldLight}` }}>
                <button onClick={()=>setOpenFaq(openFaq===i?null:i)} style={{ width:"100%", padding:"22px 0", display:"flex", justifyContent:"space-between", alignItems:"center", background:"none", border:"none", cursor:"pointer", textAlign:"left", gap:16 }}>
                  <span style={{ fontSize:17, fontWeight:500, color:openFaq===i?P.champagne:P.obsidian, transition:"color .3s", lineHeight:1.3 }}>{q}</span>
                  <div style={{ width:28, height:28, borderRadius:"50%", border:`1.5px solid ${openFaq===i?P.champagne:P.goldLight}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all .3s", transform:openFaq===i?"rotate(45deg)":"none", background:openFaq===i?`${P.champagne}15`:"transparent" }}>
                    <span style={{ fontSize:16, color:openFaq===i?P.champagne:P.goldDark, lineHeight:1 }}>+</span>
                  </div>
                </button>
                <div className="faq-body" style={{ maxHeight:openFaq===i?"200px":"0", opacity:openFaq===i?1:0 }}>
                  <p className="inter" style={{ fontSize:14, color:P.textSec, lineHeight:1.85, paddingBottom:24 }}>{a}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────────────────── */}
      <section style={{ padding:"140px 52px", background:`radial-gradient(ellipse 70% 65% at 35% 45%, ${P.goldLight}40 0%, transparent 62%), linear-gradient(160deg, ${P.alabaster} 0%, #FFF3E0 100%)`, textAlign:"center", position:"relative", overflow:"hidden" }} className="px">
        <div style={{ position:"absolute", top:"6%", left:"10%", width:200, height:1, background:`linear-gradient(to right, transparent, ${P.champagne}25, transparent)` }}/>
        <div style={{ position:"absolute", bottom:"10%", right:"8%", width:1, height:180, background:`linear-gradient(to bottom, transparent, ${P.richGold}25, transparent)` }}/>
        <Reveal>
          <div style={{ maxWidth:660, margin:"0 auto" }}>
            <Label text="YOUR TRANSFORMATION AWAITS" center/>
            <GoldLine center/>
            <h2 style={{ fontSize:"clamp(36px,5.2vw,74px)", fontWeight:400, lineHeight:1.08, color:P.obsidian, marginBottom:22 }}>
              Ready to Experience<br/><em style={{ color:P.champagne }}>True Luxury?</em>
            </h2>
            <p className="inter" style={{ fontSize:16, color:P.textSec, lineHeight:1.85, maxWidth:440, margin:"0 auto 52px" }}>
              Join the women in Tamale who have made Zolara their beauty home. You deserve the best. That is exactly what we deliver.
            </p>
            <Link to="/book" style={{ textDecoration:"none" }}>
              <button className="btn-champagne" style={{ padding:"17px 54px", fontSize:11, fontWeight:600, letterSpacing:".18em", borderRadius:3 }}>BOOK YOUR LUXURY EXPERIENCE</button>
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ── VISIT US ────────────────────────────────────────────────────── */}
      <section id="visit" style={{ padding:"128px 52px", background:`linear-gradient(145deg, ${P.navy} 0%, #202038 55%, #171728 100%)`, position:"relative", overflow:"hidden" }} className="px">
        <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:`linear-gradient(to right, transparent, ${P.champagne}25, transparent)` }}/>
        <div style={{ maxWidth:1200, margin:"0 auto", display:"grid", gridTemplateColumns:"1fr 1fr", gap:80, alignItems:"start" }} className="two">
          <Reveal dir="left">
            <div>
              <Label text="VISIT US"/>
              <GoldLine/>
              <h2 style={{ fontSize:"clamp(26px,3.2vw,44px)", fontWeight:400, color:"#fff", marginBottom:44, lineHeight:1.2 }}>
                Find Zolara<br/><em style={{ color:P.champagne }}>Beauty Studio</em>
              </h2>
              <div style={{ display:"flex", flexDirection:"column", gap:28 }}>
                {[
                  { label:"ADDRESS", value:"Sakasaka, Opposite CalBank\nTamale, Northern Region, Ghana", icon:MapPin,  color:P.champagne },
                  { label:"HOURS",   value:"Monday to Saturday\n8:30 AM to 9:00 PM\nClosed Sundays",              icon:Clock,   color:P.richGold  },
                  { label:"PHONE",   value:"0594 365 314\n020 884 8707",                                           icon:Phone,  color:P.champagne },
                ].map(({label,value,icon:Icon,color})=>(
                  <div key={label} style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
                    <div style={{ width:36, height:36, borderRadius:8, background:`${color}15`, border:`1px solid ${color}30`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <Icon size={14} color={color}/>
                    </div>
                    <div>
                      <p className="inter" style={{ fontSize:9, letterSpacing:".22em", color:P.goldLight+"80", marginBottom:5, fontWeight:600 }}>{label}</p>
                      <p style={{ fontSize:14, color:"rgba(255,255,255,.85)", fontWeight:400, lineHeight:1.65, whiteSpace:"pre-line" }}>{value}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", gap:14, marginTop:40 }}>
                <a href="tel:0594365314" style={{ textDecoration:"none" }}>
                  <button className="btn-gold" style={{ padding:"11px 28px", fontSize:10, letterSpacing:".14em", borderRadius:6 }}>CALL NOW</button>
                </a>
                <a href="https://maps.google.com/?q=Zolara+Beauty+Studio+Sakasaka+Tamale" target="_blank" rel="noopener noreferrer" style={{ textDecoration:"none" }}>
                  <button className="inter" style={{ padding:"11px 28px", background:"transparent", color:P.goldLight+"BB", border:`1px solid rgba(255,255,255,.12)`, fontSize:10, fontWeight:500, letterSpacing:".14em", borderRadius:6, cursor:"pointer", transition:"all .25s" }}>GET DIRECTIONS</button>
                </a>
              </div>
            </div>
          </Reveal>

          <Reveal dir="right">
            <div style={{ borderRadius:12, overflow:"hidden", border:`1px solid rgba(255,255,255,.07)`, boxShadow:"0 24px 60px rgba(0,0,0,.3)" }}>
              <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3962.5!2d-0.8393!3d9.4075!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zOcKwMjQnMjcuMCJOIDDCsDUwJzIxLjUiVw!5e0!3m2!1sen!2sgh!4v1234567890" width="100%" height="420" style={{ border:0, display:"block", filter:"sepia(15%) contrast(1.08)" }} allowFullScreen loading="lazy" title="Zolara Location"/>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer style={{ background:`linear-gradient(180deg, #0F0F1E 0%, #0A0A14 100%)`, padding:"64px 52px 32px" }} className="px">
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr", gap:60, marginBottom:52 }} className="three">
            <div>
              <p style={{ fontSize:20, fontWeight:600, color:"#fff", letterSpacing:".16em", marginBottom:4 }}>ZOLARA</p>
              <p className="inter" style={{ fontSize:9, color:P.champagne, letterSpacing:".26em", marginBottom:18, fontWeight:600 }}>BEAUTY STUDIO</p>
              <p className="inter" style={{ fontSize:13, color:"#4A4464", lineHeight:1.85, maxWidth:280 }}>Tamale's premier luxury beauty studio. Where every visit is an experience and every client leaves extraordinary.</p>
              <div style={{ display:"flex", gap:10, marginTop:22 }}>
                <div style={{ width:28, height:2, borderRadius:2, background:`linear-gradient(to right, ${P.champagne}, ${P.richGold})` }}/>
                <p style={{ fontSize:13, fontStyle:"italic", color:"#4A4464" }}>Luxury. Redefined.</p>
              </div>
            </div>
            <div>
              <p className="inter" style={{ fontSize:9, letterSpacing:".24em", color:P.champagne, fontWeight:600, marginBottom:18 }}>SERVICES</p>
              {["Braiding","Nail Artistry","Lash Extensions","Makeup","Pedicure & Manicure","Wigs & Styling"].map(s=>(
                <Link key={s} to="/book" style={{ display:"block", textDecoration:"none", marginBottom:10 }}>
                  <span className="inter" style={{ fontSize:13, color:"#4A4464", transition:"color .2s" }}>{s}</span>
                </Link>
              ))}
            </div>
            <div>
              <p className="inter" style={{ fontSize:9, letterSpacing:".24em", color:P.champagne, fontWeight:600, marginBottom:18 }}>QUICK LINKS</p>
              {navLinks.map(({label,href})=>(
                <a key={href} href={href} style={{ display:"block", textDecoration:"none", marginBottom:10 }}>
                  <span className="inter" style={{ fontSize:13, color:"#4A4464" }}>{label}</span>
                </a>
              ))}
              <Link to="/app/auth" style={{ display:"block", textDecoration:"none", marginTop:22 }}>
                <span className="inter" style={{ fontSize:10, color:P.champagne, fontWeight:600, letterSpacing:".12em" }}>STAFF LOGIN →</span>
              </Link>
            </div>
          </div>
          <div style={{ borderTop:"1px solid #1A1A30", paddingTop:28, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
            <p className="inter" style={{ fontSize:12, color:"#332D3D" }}>© {new Date().getFullYear()} Zolara Beauty Studio. All rights reserved.</p>
            <p className="inter" style={{ fontSize:11, color:"#332D3D", letterSpacing:".12em" }}>TAMALE · GHANA</p>
          </div>
        </div>
      </footer>

      <Amanda/>
    </div>
  );
}
