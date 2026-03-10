import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import AmandaWidget from "@/components/AmandaWidget";

const LOGO = "https://ekvjnydomfresnkealpb.supabase.co/storage/v1/object/public/avatars/logo_1764609621458.jpg";

const services = [
  { name: "Hair Braiding", icon: "✦", desc: "Cornrows, box braids, twists & knotless braids crafted with precision and care.", price: "From GHS 30", color: "#C8A97E" },
  { name: "Nail Care", icon: "◈", desc: "Manicure, pedicure, gel, acrylic and nail art by certified nail technicians.", price: "From GHS 60", color: "#B8956A" },
  { name: "Lash Extensions", icon: "◇", desc: "Classic, hybrid and volume sets using only premium mink-effect lashes.", price: "From GHS 50", color: "#A0825A" },
  { name: "Hair Washing", icon: "❋", desc: "Deep cleanse, conditioning and blow-dry treatments for every hair type.", price: "From GHS 40", color: "#C8A97E" },
  { name: "Makeup", icon: "◉", desc: "Bridal, glam and everyday looks by our trained makeup artists.", price: "From GHS 150", color: "#B8956A" },
  { name: "Wig Styling", icon: "◈", desc: "Custom wig fitting, styling and transformation for any occasion.", price: "From GHS 80", color: "#A0825A" },
];

const reviews = [
  { name: "Abena K.", text: "Zolara is in a class of its own. The atmosphere, the staff, the results. I've never felt more pampered in Tamale.", stars: 5 },
  { name: "Fatima A.", text: "My lashes were absolutely perfect. The attention to detail is incredible. I won't go anywhere else.", stars: 5 },
  { name: "Priscilla M.", text: "The loyalty program is a game changer. Free water, WiFi, and they even spray you with perfume on your way out. Elite.", stars: 5 },
  { name: "Sandra O.", text: "I drove 2 hours from Kumasi for this salon. Worth every minute. The box braids were immaculate.", stars: 5 },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeReview, setActiveReview] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => setActiveReview(r => (r + 1) % reviews.length), 4000);
    return () => clearInterval(iv);
  }, []);

  const gold = "#C8A97E";
  const goldDark = "#8B6914";
  const cream = "#F5EFE6";
  const dark = "#1C160E";
  const mid = "#EDE3D5";

  return (
    <div style={{ fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif", background: cream, color: dark, overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500&family=Montserrat:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { overflow-x: hidden; }
        ::selection { background: ${gold}55; }
        .sans { font-family: 'Montserrat', sans-serif; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes shimmer { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
        @keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-12px); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .fade-up { animation: fadeUp 0.9s cubic-bezier(0.16,1,0.3,1) forwards; opacity: 0; }
        .delay-1 { animation-delay: 0.15s; }
        .delay-2 { animation-delay: 0.3s; }
        .delay-3 { animation-delay: 0.45s; }
        .delay-4 { animation-delay: 0.6s; }
        .delay-5 { animation-delay: 0.75s; }
        .service-card { transition: transform 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s ease; cursor: default; }
        .service-card:hover { transform: translateY(-8px); box-shadow: 0 32px 64px rgba(28,22,14,0.15); }
        .btn-primary { transition: all 0.3s ease; }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(139,105,20,0.4); }
        .btn-outline:hover { background: ${dark} !important; color: ${cream} !important; }
        .nav-link { position: relative; }
        .nav-link::after { content: ''; position: absolute; bottom: -2px; left: 0; width: 0; height: 1px; background: ${gold}; transition: width 0.3s ease; }
        .nav-link:hover::after { width: 100%; }
        .ornament { animation: shimmer 3s ease-in-out infinite; }
        .float { animation: float 6s ease-in-out infinite; }
        .marquee-track { animation: marquee 30s linear infinite; }
        .review-card { transition: all 0.5s ease; }
      `}</style>

      {/* ── NAVBAR ─────────────────────────────── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: "0 clamp(24px,5vw,80px)",
        height: scrolled ? "60px" : "72px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: scrolled ? `rgba(245,239,230,0.96)` : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? `1px solid rgba(200,169,126,0.2)` : "none",
        transition: "all 0.4s ease",
      }}>
        <a href="#" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
          <div style={{ width: "38px", height: "38px", borderRadius: "50%", border: `1.5px solid ${gold}`, overflow: "hidden", background: "#fff", flexShrink: 0 }}>
            <img src={LOGO} alt="Zolara" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div>
            <div className="sans" style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.2em", color: dark }}>ZOLARA</div>
            <div className="sans" style={{ fontSize: "8px", letterSpacing: "0.25em", color: gold, marginTop: "-1px" }}>BEAUTY STUDIO</div>
          </div>
        </a>

        {/* Desktop Nav */}
        <div style={{ display: "flex", gap: "36px", alignItems: "center" }} className="desktop-nav">
          {[["#services","SERVICES"],["#experience","EXPERIENCE"],["#gift-cards","GIFT CARDS"],["#reviews","REVIEWS"],["#visit-us","VISIT US"]].map(([href,label]) => (
            <a key={label} href={href} className="nav-link sans" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.14em", color: dark, textDecoration: "none" }}>{label}</a>
          ))}
        </div>

        <Link to="/book" className="btn-primary" style={{
          fontFamily: "'Montserrat', sans-serif", fontSize: "10px", fontWeight: 700,
          letterSpacing: "0.14em", color: "#fff", textDecoration: "none",
          background: `linear-gradient(135deg, ${goldDark}, ${gold})`,
          padding: "10px 24px", borderRadius: "1px",
          boxShadow: `0 4px 20px rgba(139,105,20,0.3)`,
        }}>BOOK NOW</Link>
      </nav>

      {/* ── HERO ───────────────────────────────── */}
      <section ref={heroRef} style={{ minHeight: "100vh", display: "flex", alignItems: "center", position: "relative", overflow: "hidden", padding: "0 clamp(24px,6vw,100px)" }}>

        {/* Background texture */}
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 70% 50%, rgba(200,169,126,0.12) 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, rgba(200,169,126,0.08) 0%, transparent 50%)`, pointerEvents: "none" }} />

        {/* Decorative large letter */}
        <div style={{ position: "absolute", right: "-2%", top: "50%", transform: "translateY(-50%)", fontSize: "clamp(280px,35vw,480px)", fontWeight: 700, color: "rgba(200,169,126,0.06)", lineHeight: 1, pointerEvents: "none", userSelect: "none", letterSpacing: "-0.05em" }}>Z</div>

        {/* Floating ornament */}
        <div className="float" style={{ position: "absolute", right: "clamp(24px,8vw,120px)", top: "20%", width: "280px", pointerEvents: "none" }}>
          <div style={{ width: "280px", height: "380px", border: `1px solid rgba(200,169,126,0.25)`, borderRadius: "2px", background: "rgba(237,227,213,0.6)", backdropFilter: "blur(10px)", padding: "32px", display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", border: `2px solid ${gold}`, overflow: "hidden", background: "#fff" }}>
              <img src={LOGO} alt="Zolara" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div style={{ width: "32px", height: "1px", background: gold }} />
            <p style={{ fontStyle: "italic", fontSize: "17px", color: dark, textAlign: "center", lineHeight: 1.65 }}>
              "Not just a salon. A complete luxury experience."
            </p>
            <div style={{ width: "32px", height: "1px", background: gold }} />
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "14px" }}>
              {[["LOCATION","Sakasaka, Tamale"],["HOURS","Mon – Sat · 8:30 AM – 9 PM"],["CALL","0594 365 314"]].map(([l,v]) => (
                <div key={l}>
                  <p className="sans" style={{ fontSize: "8px", letterSpacing: "0.2em", color: gold, fontWeight: 700, marginBottom: "3px" }}>{l}</p>
                  <p className="sans" style={{ fontSize: "11px", color: dark }}>{v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Left content */}
        <div style={{ maxWidth: "600px", paddingTop: "80px", paddingBottom: "80px", position: "relative", zIndex: 2 }}>
          <div className="fade-up sans" style={{ display: "inline-flex", alignItems: "center", gap: "10px", marginBottom: "32px" }}>
            <div style={{ width: "32px", height: "1px", background: gold }} />
            <span style={{ fontSize: "10px", letterSpacing: "0.25em", color: gold, fontWeight: 600 }}>TAMALE'S FINEST BEAUTY STUDIO</span>
          </div>

          <h1 className="fade-up delay-1" style={{ fontSize: "clamp(56px,8vw,96px)", fontWeight: 300, lineHeight: 1.0, marginBottom: "8px", letterSpacing: "-0.01em" }}>
            Where Luxury
          </h1>
          <h1 className="fade-up delay-2" style={{ fontSize: "clamp(56px,8vw,96px)", fontWeight: 600, fontStyle: "italic", color: gold, lineHeight: 1.0, marginBottom: "36px", letterSpacing: "-0.01em" }}>
            Meets Beauty.
          </h1>

          <p className="fade-up delay-3 sans" style={{ fontSize: "15px", lineHeight: 1.85, color: "#5C4D3A", maxWidth: "460px", marginBottom: "44px", fontWeight: 300 }}>
            A sanctuary crafted for women who demand the finest. Every appointment at Zolara is a ritual, every stylist an artist, every result extraordinary.
          </p>

          <div className="fade-up delay-4" style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <Link to="/book" className="btn-primary" style={{
              textDecoration: "none", display: "inline-block",
              fontFamily: "'Montserrat', sans-serif", fontSize: "11px", fontWeight: 700,
              letterSpacing: "0.14em", color: "#fff",
              background: `linear-gradient(135deg, ${goldDark}, ${gold})`,
              padding: "16px 36px", borderRadius: "1px",
              boxShadow: `0 8px 32px rgba(139,105,20,0.35)`,
            }}>BOOK YOUR APPOINTMENT →</Link>

            <a href="#services" className="btn-outline sans" style={{
              textDecoration: "none", display: "inline-block",
              fontSize: "11px", fontWeight: 600, letterSpacing: "0.14em",
              color: dark, border: `1.5px solid ${dark}`,
              padding: "15px 32px", borderRadius: "1px",
              transition: "all 0.3s ease", background: "transparent",
            }}>VIEW SERVICES</a>
          </div>

          {/* Stats */}
          <div className="fade-up delay-5" style={{ display: "flex", gap: "40px", marginTop: "56px", paddingTop: "40px", borderTop: `1px solid rgba(200,169,126,0.25)` }}>
            {[["500+","Happy Clients"],["7","Expert Stylists"],["4+","Years of Excellence"]].map(([n,l]) => (
              <div key={l}>
                <p style={{ fontSize: "clamp(28px,3vw,40px)", fontWeight: 600, color: goldDark, lineHeight: 1 }}>{n}</p>
                <p className="sans" style={{ fontSize: "10px", letterSpacing: "0.1em", color: "#8B7355", marginTop: "4px" }}>{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MARQUEE STRIP ──────────────────────── */}
      <div style={{ background: dark, overflow: "hidden", padding: "18px 0", borderTop: `1px solid rgba(200,169,126,0.15)` }}>
        <div className="marquee-track" style={{ display: "flex", gap: "0", whiteSpace: "nowrap", width: "max-content" }}>
          {[...Array(3)].map((_, i) => (
            <span key={i} className="sans" style={{ display: "inline-flex", alignItems: "center", gap: "0" }}>
              {["HAIR BRAIDING","NAIL CARE","LASH EXTENSIONS","MAKEUP","WIG STYLING","LOYALTY REWARDS","FREE WIFI","FREE WATER","PREMIUM PRODUCTS","EXPERT STYLISTS"].map(item => (
                <span key={item} style={{ display: "inline-flex", alignItems: "center", gap: "20px", paddingRight: "48px" }}>
                  <span style={{ fontSize: "10px", letterSpacing: "0.2em", color: "rgba(245,239,230,0.7)", fontWeight: 500 }}>{item}</span>
                  <span style={{ color: gold, fontSize: "14px" }}>✦</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* ── SERVICES ───────────────────────────── */}
      <section id="services" style={{ padding: "clamp(60px,8vw,120px) clamp(24px,6vw,100px)", background: mid }}>
        <div style={{ textAlign: "center", marginBottom: "64px" }}>
          <div className="sans" style={{ fontSize: "9px", letterSpacing: "0.25em", color: gold, fontWeight: 700, marginBottom: "16px" }}>WHAT WE OFFER</div>
          <h2 style={{ fontSize: "clamp(36px,5vw,60px)", fontWeight: 400, marginBottom: "16px", letterSpacing: "-0.01em" }}>Our <em>Services</em></h2>
          <p className="sans" style={{ fontSize: "13px", color: "#5C4D3A", maxWidth: "400px", margin: "0 auto", lineHeight: 1.8, fontWeight: 300 }}>
            From precision braids to flawless nails. every service at Zolara is delivered with artistry and care.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
          {services.map((s, i) => (
            <div key={s.name} className="service-card fade-up" style={{ animationDelay: `${i * 0.1}s`, background: cream, borderRadius: "2px", padding: "40px 32px", position: "relative", overflow: "hidden", border: `1px solid rgba(200,169,126,0.15)` }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, ${s.color}, transparent)` }} />
              <div style={{ fontSize: "28px", color: s.color, marginBottom: "20px", lineHeight: 1 }}>{s.icon}</div>
              <h3 style={{ fontSize: "22px", fontWeight: 500, marginBottom: "12px" }}>{s.name}</h3>
              <p className="sans" style={{ fontSize: "13px", color: "#5C4D3A", lineHeight: 1.75, marginBottom: "24px", fontWeight: 300 }}>{s.desc}</p>
              <p className="sans" style={{ fontSize: "11px", fontWeight: 700, color: goldDark, letterSpacing: "0.05em" }}>{s.price}</p>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: "56px" }}>
          <Link to="/book" className="btn-primary" style={{
            textDecoration: "none", display: "inline-block",
            fontFamily: "'Montserrat', sans-serif", fontSize: "11px", fontWeight: 700,
            letterSpacing: "0.14em", color: "#fff",
            background: `linear-gradient(135deg, ${goldDark}, ${gold})`,
            padding: "16px 48px", borderRadius: "1px",
            boxShadow: `0 8px 32px rgba(139,105,20,0.3)`,
          }}>BOOK AN APPOINTMENT</Link>
        </div>
      </section>

      {/* ── EXPERIENCE ─────────────────────────── */}
      <section id="experience" style={{ padding: "clamp(60px,8vw,120px) clamp(24px,6vw,100px)", background: cream, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: "-80px", top: "50%", transform: "translateY(-50%)", fontSize: "320px", color: "rgba(200,169,126,0.05)", fontWeight: 700, lineHeight: 1, pointerEvents: "none" }}>✦</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(40px,6vw,100px)", alignItems: "center", maxWidth: "1100px", margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div>
            <div className="sans" style={{ fontSize: "9px", letterSpacing: "0.25em", color: gold, fontWeight: 700, marginBottom: "16px" }}>THE ZOLARA DIFFERENCE</div>
            <h2 style={{ fontSize: "clamp(32px,4.5vw,54px)", fontWeight: 400, lineHeight: 1.15, marginBottom: "28px" }}>A Complete <em>Luxury</em> Experience</h2>
            <p className="sans" style={{ fontSize: "14px", color: "#5C4D3A", lineHeight: 1.9, marginBottom: "36px", fontWeight: 300 }}>
              Every visit to Zolara is designed to be more than just a salon appointment. From the moment you walk in to your Exit Ritual, a perfume spritz, a piece of chocolate, and a final mirror check, you leave feeling extraordinary.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {[
                ["Free WiFi and complimentary bottled water for every client","✦"],
                ["Ghana's first salon loyalty rewards program","◈"],
                ["Certified stylists with specialised training","◇"],
                ["Premium products only. no compromises","❋"],
                ["Private, comfortable styling stations","◉"],
              ].map(([item, icon]) => (
                <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                  <span style={{ color: gold, fontSize: "14px", flexShrink: 0, marginTop: "2px" }}>{icon}</span>
                  <span className="sans" style={{ fontSize: "13px", color: "#4A3C2A", lineHeight: 1.6, fontWeight: 300 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ position: "relative" }}>
            <div style={{ background: `linear-gradient(145deg, #2C2416, #1A1008)`, borderRadius: "2px", padding: "56px 48px", textAlign: "center", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 0%, rgba(200,169,126,0.15) 0%, transparent 60%)`, pointerEvents: "none" }} />
              <div style={{ position: "absolute", top: "20px", right: "20px", width: "60px", height: "60px", border: `1px solid rgba(200,169,126,0.2)`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: gold, fontSize: "20px" }}>✦</span>
              </div>
              <p style={{ fontStyle: "italic", fontSize: "clamp(18px,2.5vw,26px)", color: "#F5EFE6", lineHeight: 1.65, marginBottom: "32px", position: "relative", zIndex: 1 }}>
                "Not just a salon. A complete luxury experience."
              </p>
              <div style={{ width: "40px", height: "1px", background: gold, margin: "0 auto 24px" }} />
              <p className="sans" style={{ fontSize: "10px", letterSpacing: "0.2em", color: gold, fontWeight: 600 }}>ZOLARA BEAUTY STUDIO</p>
              <p className="sans" style={{ fontSize: "11px", color: "rgba(245,239,230,0.5)", marginTop: "6px" }}>Sakasaka, Tamale</p>
              <div style={{ marginTop: "40px", display: "flex", justifyContent: "center", gap: "8px" }}>
                {[1,2,3,4,5].map(s => <span key={s} style={{ color: gold, fontSize: "16px" }}>★</span>)}
              </div>
              <p className="sans" style={{ fontSize: "10px", color: "rgba(245,239,230,0.5)", marginTop: "8px" }}>5.0 · 500+ Reviews</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── REVIEWS ────────────────────────────── */}
      <section id="reviews" style={{ padding: "clamp(60px,8vw,120px) clamp(24px,6vw,100px)", background: dark, textAlign: "center", overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 0%, rgba(200,169,126,0.08) 0%, transparent 60%)`, pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div className="sans" style={{ fontSize: "9px", letterSpacing: "0.25em", color: gold, fontWeight: 700, marginBottom: "16px" }}>CLIENT STORIES</div>
          <h2 style={{ fontSize: "clamp(32px,4.5vw,54px)", fontWeight: 400, color: cream, marginBottom: "56px" }}>What Our <em>Clients</em> Say</h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "24px", maxWidth: "1100px", margin: "0 auto 56px" }}>
            {reviews.map((r, i) => (
              <div key={r.name} className="review-card" style={{
                background: i === activeReview ? "rgba(200,169,126,0.12)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${i === activeReview ? "rgba(200,169,126,0.35)" : "rgba(255,255,255,0.06)"}`,
                borderRadius: "2px", padding: "36px 28px", textAlign: "left",
              }}>
                <div style={{ display: "flex", gap: "4px", marginBottom: "20px" }}>
                  {[1,2,3,4,5].map(s => <span key={s} style={{ color: gold, fontSize: "14px" }}>★</span>)}
                </div>
                <p style={{ fontStyle: "italic", fontSize: "16px", color: "rgba(245,239,230,0.85)", lineHeight: 1.75, marginBottom: "24px" }}>"{r.text}"</p>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: `linear-gradient(135deg, ${gold}, ${goldDark})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span className="sans" style={{ fontSize: "12px", fontWeight: 700, color: "#fff" }}>{r.name[0]}</span>
                  </div>
                  <p className="sans" style={{ fontSize: "12px", fontWeight: 600, color: gold }}>{r.name}</p>
                </div>
              </div>
            ))}
          </div>

          <Link to="/book" className="btn-primary" style={{
            textDecoration: "none", display: "inline-block",
            fontFamily: "'Montserrat', sans-serif", fontSize: "11px", fontWeight: 700,
            letterSpacing: "0.14em", color: dark,
            background: `linear-gradient(135deg, ${gold}, #E8C89A)`,
            padding: "16px 48px", borderRadius: "1px",
          }}>JOIN OUR HAPPY CLIENTS</Link>
        </div>
      </section>

      {/* ── GIFT CARDS ─────────────────────────── */}
      <section id="gift-cards" style={{ padding: "clamp(60px,8vw,120px) clamp(24px,6vw,100px)", background: mid, position: "relative", overflow: "hidden" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
          <div className="sans" style={{ fontSize: "9px", letterSpacing: "0.25em", color: gold, fontWeight: 700, marginBottom: "16px" }}>THE PERFECT PRESENT</div>
          <h2 style={{ fontSize: "clamp(36px,5vw,60px)", fontWeight: 400, marginBottom: "20px" }}>Gift the <em>Experience</em></h2>
          <p className="sans" style={{ fontSize: "14px", color: "#5C4D3A", lineHeight: 1.85, maxWidth: "520px", margin: "0 auto 48px", fontWeight: 300 }}>
            Give someone you love a luxury beauty experience at Zolara. Our gift cards are available in any amount and redeemable for any service.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginBottom: "48px" }}>
            {[["GHS 100","Starter","Perfect for a single service"],["GHS 250","Classic","For a full pampering session"],["GHS 500","Premium","The ultimate luxury gift"]].map(([amount, tier, desc]) => (
              <div key={tier} style={{ background: tier === "Classic" ? `linear-gradient(145deg, ${dark}, #2C2416)` : cream, border: `1px solid ${tier === "Classic" ? gold : "rgba(200,169,126,0.25)"}`, borderRadius: "2px", padding: "32px 24px", position: "relative", overflow: "hidden" }}>
                {tier === "Classic" && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, ${gold}, transparent)` }} />}
                <p style={{ fontSize: "28px", fontWeight: 600, color: tier === "Classic" ? gold : goldDark, marginBottom: "8px" }}>{amount}</p>
                <p className="sans" style={{ fontSize: "11px", letterSpacing: "0.15em", fontWeight: 700, color: tier === "Classic" ? "rgba(245,239,230,0.6)" : "#8B7355", marginBottom: "12px" }}>{tier.toUpperCase()}</p>
                <p className="sans" style={{ fontSize: "12px", color: tier === "Classic" ? "rgba(245,239,230,0.7)" : "#5C4D3A", lineHeight: 1.6, fontWeight: 300 }}>{desc}</p>
              </div>
            ))}
          </div>

          <Link to="/gift-cards" className="btn-primary" style={{
            textDecoration: "none", display: "inline-block",
            fontFamily: "'Montserrat', sans-serif", fontSize: "11px", fontWeight: 700,
            letterSpacing: "0.14em", color: "#fff",
            background: `linear-gradient(135deg, ${goldDark}, ${gold})`,
            padding: "16px 48px", borderRadius: "1px",
            boxShadow: `0 8px 32px rgba(139,105,20,0.3)`,
          }}>VIEW GIFT CARDS</Link>
        </div>
      </section>

      {/* ── VISIT US ───────────────────────────── */}
      <section id="visit-us" style={{ padding: "clamp(60px,8vw,120px) clamp(24px,6vw,100px)", background: cream }}>
        <div style={{ textAlign: "center", marginBottom: "64px" }}>
          <div className="sans" style={{ fontSize: "9px", letterSpacing: "0.25em", color: gold, fontWeight: 700, marginBottom: "16px" }}>FIND US</div>
          <h2 style={{ fontSize: "clamp(36px,5vw,60px)", fontWeight: 400 }}>Come <em>Visit Us</em></h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px", maxWidth: "900px", margin: "0 auto 56px" }}>
          {[
            { icon: "◉", label: "LOCATION", lines: ["Sakasaka, Opposite CalBank", "Tamale, Ghana"] },
            { icon: "◈", label: "CALL US", lines: ["0594 365 314", "020 884 8707"] },
            { icon: "◇", label: "HOURS", lines: ["Monday – Saturday", "8:30 AM – 9:00 PM"] },
            { icon: "✦", label: "CLOSED", lines: ["Every Sunday", "We rest so we can serve you better"] },
          ].map(item => (
            <div key={item.label} style={{ background: mid, border: `1px solid rgba(200,169,126,0.2)`, borderRadius: "2px", padding: "36px 28px", textAlign: "center" }}>
              <div style={{ fontSize: "24px", color: gold, marginBottom: "16px" }}>{item.icon}</div>
              <p className="sans" style={{ fontSize: "9px", letterSpacing: "0.2em", color: gold, fontWeight: 700, marginBottom: "12px" }}>{item.label}</p>
              {item.lines.map(l => <p key={l} className="sans" style={{ fontSize: "13px", color: dark, lineHeight: 1.7, fontWeight: 300 }}>{l}</p>)}
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center" }}>
          <Link to="/book" className="btn-primary" style={{
            textDecoration: "none", display: "inline-block",
            fontFamily: "'Montserrat', sans-serif", fontSize: "11px", fontWeight: 700,
            letterSpacing: "0.14em", color: "#fff",
            background: `linear-gradient(135deg, ${goldDark}, ${gold})`,
            padding: "16px 48px", borderRadius: "1px",
            boxShadow: `0 8px 32px rgba(139,105,20,0.3)`,
          }}>BOOK YOUR APPOINTMENT</Link>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────── */}
      <footer style={{ background: `linear-gradient(160deg, #1C160E, #0F0C08)`, padding: "clamp(40px,6vw,80px) clamp(24px,6vw,100px)", borderTop: `1px solid rgba(200,169,126,0.12)` }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "clamp(32px,5vw,80px)", alignItems: "flex-start", marginBottom: "48px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <div style={{ width: "38px", height: "38px", borderRadius: "50%", border: `1.5px solid ${gold}`, overflow: "hidden", background: "#fff" }}>
                <img src={LOGO} alt="Zolara" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div>
                <div className="sans" style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.2em", color: cream }}>ZOLARA</div>
                <div className="sans" style={{ fontSize: "8px", letterSpacing: "0.25em", color: gold }}>BEAUTY STUDIO</div>
              </div>
            </div>
            <p className="sans" style={{ fontSize: "12px", color: "rgba(245,239,230,0.4)", lineHeight: 1.7, maxWidth: "240px", fontWeight: 300 }}>
              Tamale's premier luxury beauty studio. Where every visit is an experience.
            </p>
          </div>

          <div>
            <p className="sans" style={{ fontSize: "9px", letterSpacing: "0.2em", color: gold, fontWeight: 700, marginBottom: "20px" }}>NAVIGATE</p>
            {[["#services","Services"],["#experience","Experience"],["#gift-cards","Gift Cards"],["#visit-us","Visit Us"]].map(([href,label]) => (
              <div key={label} style={{ marginBottom: "10px" }}>
                <a href={href} className="sans" style={{ fontSize: "12px", color: "rgba(245,239,230,0.55)", textDecoration: "none", fontWeight: 300, transition: "color 0.2s" }}
                  onMouseEnter={e => (e.target as HTMLElement).style.color = gold}
                  onMouseLeave={e => (e.target as HTMLElement).style.color = "rgba(245,239,230,0.55)"}
                >{label}</a>
              </div>
            ))}
          </div>

          <div>
            <p className="sans" style={{ fontSize: "9px", letterSpacing: "0.2em", color: gold, fontWeight: 700, marginBottom: "20px" }}>SOCIAL</p>
            {[["https://www.instagram.com/zolarastudio","Instagram"],["https://www.tiktok.com/@zolarastudio","TikTok"],["https://x.com/zolarastudio","X (Twitter)"]].map(([href,label]) => (
              <div key={label} style={{ marginBottom: "10px" }}>
                <a href={href} target="_blank" rel="noreferrer" className="sans" style={{ fontSize: "12px", color: "rgba(245,239,230,0.55)", textDecoration: "none", fontWeight: 300, transition: "color 0.2s" }}
                  onMouseEnter={e => (e.target as HTMLElement).style.color = gold}
                  onMouseLeave={e => (e.target as HTMLElement).style.color = "rgba(245,239,230,0.55)"}
                >{label}</a>
              </div>
            ))}
          </div>
        </div>

        <div style={{ borderTop: `1px solid rgba(200,169,126,0.1)`, paddingTop: "28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p className="sans" style={{ fontSize: "11px", color: "rgba(245,239,230,0.25)", fontWeight: 300 }}>© {new Date().getFullYear()} Zolara Beauty Studio. All rights reserved.</p>
          <Link to="/app/auth" className="sans" style={{ fontSize: "11px", color: "rgba(200,169,126,0.5)", textDecoration: "none" }}>Staff Login</Link>
        </div>
      </footer>
      <AmandaWidget />
    </div>
  );
}
