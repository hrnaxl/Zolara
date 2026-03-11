import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import AmandaWidget from "@/components/AmandaWidget";

const LOGO = "https://ekvjnydomfresnkealpb.supabase.co/storage/v1/object/public/avatars/logo_1764609621458.jpg";

const services = [
  { name: "Hair Braiding", icon: "✦", desc: "Cornrows, box braids, twists and knotless braids crafted with precision and care.", price: "From GHS 80", color: "#C8A97E" },
  { name: "Nail Care", icon: "◈", desc: "Manicure, pedicure, gel, acrylic and nail art by certified nail technicians.", price: "From GHS 100", color: "#B8956A" },
  { name: "Lash Extensions", icon: "◇", desc: "Classic, hybrid and volume sets using only premium mink-effect lashes.", price: "From GHS 65", color: "#A0825A" },
  { name: "Hair Washing", icon: "❋", desc: "Deep cleanse, conditioning and blow-dry treatments for every hair type.", price: "From GHS 80", color: "#C8A97E" },
  { name: "Makeup", icon: "◉", desc: "Bridal, glam and everyday looks by our trained makeup artists.", price: "From GHS 125", color: "#B8956A" },
  { name: "Wig Styling", icon: "◈", desc: "Custom wig fitting, installation and transformation for any occasion.", price: "From GHS 150", color: "#A0825A" },
];

const reviews = [
  { name: "Abena K.", text: "Zolara is in a class of its own. The atmosphere, the staff, the results. I've never felt more pampered in Tamale.", stars: 5 },
  { name: "Fatima A.", text: "My lashes were absolutely perfect. The attention to detail is incredible. I won't go anywhere else.", stars: 5 },
  { name: "Priscilla M.", text: "The loyalty program is a game changer. Free water, WiFi, and they even spray you with perfume on your way out. Elite.", stars: 5 },
  { name: "Sandra O.", text: "I drove 2 hours from Kumasi for this salon. Worth every minute. The box braids were immaculate.", stars: 5 },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [activeReview, setActiveReview] = useState(0);
  const [reviewVisible, setReviewVisible] = useState(false);
  const reviewRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => setActiveReview(r => (r + 1) % reviews.length), 4500);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setReviewVisible(true); }, { threshold: 0.1 });
    if (reviewRef.current) obs.observe(reviewRef.current);
    return () => obs.disconnect();
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
        ::selection { background: #C8A97E55; }
        .sans { font-family: 'Montserrat', sans-serif; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(36px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-14px); } }
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes pulseGreen { 0%,100% { opacity:1; } 60% { opacity:0.7; } }
        @keyframes borderGlow { 0%,100% { box-shadow: 0 24px 64px rgba(28,22,14,0.10), 0 0 0 1px rgba(200,169,126,0.22); } 50% { box-shadow: 0 32px 80px rgba(200,169,126,0.18), 0 0 0 1.5px rgba(200,169,126,0.58); } }
        @keyframes orb { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(40px,-30px) scale(1.1); } 66% { transform: translate(-20px,20px) scale(0.95); } }
        @keyframes goldPulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
        @keyframes slideInLeft { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes reviewPop { from { opacity: 0; transform: scale(0.94) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .fade-up { animation: fadeUp 0.9s cubic-bezier(0.16,1,0.3,1) forwards; opacity: 0; }
        .delay-1 { animation-delay: 0.15s; }
        .delay-2 { animation-delay: 0.3s; }
        .delay-3 { animation-delay: 0.45s; }
        .delay-4 { animation-delay: 0.6s; }
        .delay-5 { animation-delay: 0.75s; }
        .service-card { transition: transform 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s ease, background 0.3s ease; cursor: default; }
        .service-card:hover { transform: translateY(-12px); box-shadow: 0 40px 72px rgba(28,22,14,0.14), 0 0 0 1.5px rgba(200,169,126,0.35); background: #fff !important; }
        .service-card:hover .svc-icon { transform: scale(1.25) rotate(15deg); }
        .svc-icon { transition: transform 0.4s cubic-bezier(0.16,1,0.3,1); display: inline-block; }
        .btn-primary { transition: all 0.3s ease; }
        .btn-primary:hover { transform: translateY(-3px); box-shadow: 0 16px 48px rgba(139,105,20,0.48) !important; }
        .btn-outline:hover { background: #1C160E !important; color: #F5EFE6 !important; }
        .nav-link { position: relative; }
        .nav-link::after { content: ''; position: absolute; bottom: -2px; left: 0; width: 0; height: 1.5px; background: #C8A97E; transition: width 0.3s ease; }
        .nav-link:hover::after { width: 100%; }
        .float { animation: float 7s ease-in-out infinite; }
        .marquee-track { animation: marquee 28s linear infinite; }
        .review-card-anim { opacity: 0; }
        .review-visible .review-card-anim { animation: reviewPop 0.7s cubic-bezier(0.16,1,0.3,1) forwards; }
        .review-card { transition: all 0.5s ease; }
        .hero-floating-card { animation: borderGlow 4.5s ease-in-out infinite; }
        .live-dot { width: 8px; height: 8px; border-radius: 50%; background: #4ade80; animation: pulseGreen 2s ease-in-out infinite; flex-shrink: 0; }
        .visit-card { transition: transform 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease; }
        .visit-card:hover { transform: translateY(-7px); box-shadow: 0 24px 60px rgba(28,22,14,0.13); border-color: rgba(200,169,126,0.5) !important; }
        .gift-card-tile { transition: transform 0.35s ease, box-shadow 0.35s ease; cursor: pointer; }
        .gift-card-tile:hover { transform: translateY(-9px) scale(1.03); box-shadow: 0 36px 72px rgba(0,0,0,0.32); }
        .kpi-card { transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .kpi-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(28,22,14,0.1) !important; }
        .orb-bg { position: absolute; border-radius: 50%; pointer-events: none; }
        @media (max-width: 768px) {
          .hero-floating-card-wrapper { display: none !important; }
          .landing-experience-grid { grid-template-columns: 1fr !important; }
          .landing-gift-grid { grid-template-columns: 1fr !important; }
          .landing-footer-grid { grid-template-columns: 1fr !important; }
          .desktop-nav { display: none !important; }
        }
      `}</style>

      {/* NAVBAR */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: "0 clamp(24px,5vw,80px)",
        height: scrolled ? "60px" : "74px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: scrolled ? "rgba(245,239,230,0.97)" : "transparent",
        backdropFilter: scrolled ? "blur(24px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(200,169,126,0.2)" : "none",
        boxShadow: scrolled ? "0 4px 40px rgba(28,22,14,0.06)" : "none",
        transition: "all 0.4s ease",
      }}>
        <a href="#" style={{ display: "flex", alignItems: "center", gap: "11px", textDecoration: "none" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "50%", border: "2px solid #C8A97E", overflow: "hidden", background: "#fff", flexShrink: 0, boxShadow: "0 0 0 3px rgba(200,169,126,0.15)" }}>
            <img src={LOGO} alt="Zolara" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div>
            <div className="sans" style={{ fontSize: "14px", fontWeight: 800, letterSpacing: "0.22em", color: dark, lineHeight: 1.1 }}>ZOLARA</div>
            <div className="sans" style={{ fontSize: "10px", letterSpacing: "0.22em", color: gold, marginTop: "2px", fontWeight: 600, lineHeight: 1 }}>BEAUTY STUDIO</div>
          </div>
        </a>

        <div className="desktop-nav" style={{ display: "flex", gap: "36px", alignItems: "center" }}>
          {[["#services","SERVICES"],["#experience","EXPERIENCE"],["#gift-cards","GIFT CARDS"],["#reviews","REVIEWS"],["#visit-us","VISIT US"]].map(([href,label]) => (
            <a key={label} href={href} className="nav-link sans" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.14em", color: dark, textDecoration: "none" }}>{label}</a>
          ))}
        </div>

        <Link to="/book" className="btn-primary" style={{
          fontFamily: "'Montserrat', sans-serif", fontSize: "10px", fontWeight: 700,
          letterSpacing: "0.14em", color: "#fff", textDecoration: "none",
          background: "linear-gradient(135deg, #8B6914, #C8A97E)",
          padding: "10px 26px", borderRadius: "1px",
          boxShadow: "0 4px 20px rgba(139,105,20,0.32)",
        }}>BOOK NOW</Link>
      </nav>

      {/* HERO */}
      <section ref={heroRef} style={{ minHeight: "100vh", display: "flex", alignItems: "center", position: "relative", overflow: "hidden", padding: "0 clamp(24px,6vw,100px)" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 65% 40%, rgba(200,169,126,0.17) 0%, transparent 55%), radial-gradient(ellipse at 15% 85%, rgba(200,169,126,0.10) 0%, transparent 45%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 80px, rgba(200,169,126,0.018) 80px, rgba(200,169,126,0.018) 81px)", pointerEvents: "none" }} />
        <div className="orb-bg" style={{ top: "12%", right: "28%", width: "480px", height: "480px", background: "radial-gradient(circle, rgba(200,169,126,0.12) 0%, transparent 70%)", animation: "orb 14s ease-in-out infinite" }} />
        <div className="orb-bg" style={{ bottom: "8%", right: "8%", width: "320px", height: "320px", background: "radial-gradient(circle, rgba(200,169,126,0.08) 0%, transparent 70%)", animation: "orb 18s ease-in-out infinite reverse", animationDelay: "-6s" }} />
        <div style={{ position: "absolute", right: "-1%", top: "50%", transform: "translateY(-50%)", fontSize: "clamp(280px,35vw,500px)", fontWeight: 700, color: "rgba(200,169,126,0.055)", lineHeight: 1, pointerEvents: "none", userSelect: "none", letterSpacing: "-0.05em" }}>Z</div>

        {/* Floating info card — aligned with the hero text, top ~18% */}
        <div className="hero-floating-card-wrapper float" style={{ position: "absolute", right: "clamp(80px,13vw,200px)", top: "18%", width: "300px", pointerEvents: "none" }}>
          <div className="hero-floating-card" style={{ width: "300px", border: "1px solid rgba(200,169,126,0.4)", borderRadius: "5px", background: "rgba(252,249,244,0.92)", backdropFilter: "blur(24px)", padding: "36px 30px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
            <div style={{ width: "70px", height: "70px", borderRadius: "50%", border: "2.5px solid #C8A97E", overflow: "hidden", background: "#fff", boxShadow: "0 0 0 5px rgba(200,169,126,0.15)" }}>
              <img src={LOGO} alt="Zolara" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div style={{ width: "40px", height: "1px", background: "linear-gradient(90deg, transparent, #C8A97E, transparent)" }} />
            <p style={{ fontStyle: "italic", fontSize: "17px", color: dark, textAlign: "center", lineHeight: 1.7, letterSpacing: "0.01em", fontWeight: 500 }}>
              "Not just a salon. A complete luxury experience."
            </p>
            <div style={{ width: "40px", height: "1px", background: "linear-gradient(90deg, transparent, #C8A97E, transparent)" }} />
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <p className="sans" style={{ fontSize: "9px", letterSpacing: "0.2em", color: gold, fontWeight: 700, marginBottom: "4px" }}>LOCATION</p>
                <p className="sans" style={{ fontSize: "12.5px", color: dark, fontWeight: 500 }}>Sakasaka, Tamale</p>
              </div>
              <div>
                <p className="sans" style={{ fontSize: "9px", letterSpacing: "0.2em", color: gold, fontWeight: 700, marginBottom: "4px" }}>HOURS</p>
                <p className="sans" style={{ fontSize: "12.5px", color: dark, fontWeight: 500 }}>Mon – Sat · 8:30 AM – 9:00 PM</p>
              </div>
              <div>
                <p className="sans" style={{ fontSize: "9px", letterSpacing: "0.2em", color: gold, fontWeight: 700, marginBottom: "4px" }}>CALL</p>
                <p className="sans" style={{ fontSize: "12.5px", color: dark, fontWeight: 500 }}>059 436 5314</p>
                <p className="sans" style={{ fontSize: "12.5px", color: dark, fontWeight: 500, marginTop: "2px" }}>020 884 8707</p>
              </div>
            </div>
          </div>
        </div>

        {/* Hero left content */}
        <div style={{ maxWidth: "600px", paddingTop: "90px", paddingBottom: "90px", position: "relative", zIndex: 2 }}>
          <div className="fade-up sans" style={{ display: "inline-flex", alignItems: "center", gap: "16px", marginBottom: "32px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "32px", height: "1.5px", background: gold }} />
              <span style={{ fontSize: "10.5px", letterSpacing: "0.22em", color: gold, fontWeight: 700 }}>TAMALE'S FINEST BEAUTY STUDIO</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "7px", background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.35)", borderRadius: "100px", padding: "4px 12px" }}>
              <div className="live-dot" />
              <span className="sans" style={{ fontSize: "9px", letterSpacing: "0.15em", color: "#15803d", fontWeight: 700 }}>NOW OPEN</span>
            </div>
          </div>

          <h1 className="fade-up delay-1" style={{ fontSize: "clamp(54px,8vw,96px)", fontWeight: 300, lineHeight: 1.0, marginBottom: "8px", letterSpacing: "-0.01em" }}>
            Where Luxury
          </h1>
          <h1 className="fade-up delay-2" style={{ fontSize: "clamp(54px,8vw,96px)", fontWeight: 600, fontStyle: "italic", color: gold, lineHeight: 1.0, marginBottom: "36px", letterSpacing: "-0.01em" }}>
            Meets Beauty.
          </h1>

          <p className="fade-up delay-3 sans" style={{ fontSize: "15.5px", lineHeight: 1.9, color: "#3D2E1A", maxWidth: "460px", marginBottom: "44px", fontWeight: 400 }}>
            A sanctuary crafted for women who demand the finest. Every appointment at Zolara is a ritual, every stylist an artist, every result extraordinary.
          </p>

          <div className="fade-up delay-4" style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <Link to="/book" className="btn-primary" style={{
              textDecoration: "none", display: "inline-block",
              fontFamily: "'Montserrat', sans-serif", fontSize: "11px", fontWeight: 700,
              letterSpacing: "0.14em", color: "#fff",
              background: "linear-gradient(135deg, #8B6914, #C8A97E)",
              padding: "17px 38px", borderRadius: "1px",
              boxShadow: "0 8px 32px rgba(139,105,20,0.38)",
            }}>BOOK YOUR APPOINTMENT →</Link>
            <a href="#services" className="btn-outline sans" style={{
              textDecoration: "none", display: "inline-block",
              fontSize: "11px", fontWeight: 600, letterSpacing: "0.14em",
              color: dark, border: "1.5px solid #1C160E",
              padding: "16px 32px", borderRadius: "1px",
              transition: "all 0.3s ease", background: "transparent",
            }}>VIEW SERVICES</a>
          </div>

          <div className="fade-up delay-5" style={{ display: "flex", gap: "44px", marginTop: "60px", paddingTop: "40px", borderTop: "1px solid rgba(200,169,126,0.3)" }}>
            {[["500+","Happy Clients"],["7","Expert Stylists"],["4+","Years of Excellence"]].map(([n,l]) => (
              <div key={l}>
                <p style={{ fontSize: "clamp(28px,3vw,42px)", fontWeight: 600, color: goldDark, lineHeight: 1 }}>{n}</p>
                <p className="sans" style={{ fontSize: "10.5px", letterSpacing: "0.1em", color: "#6B5740", marginTop: "6px", fontWeight: 500 }}>{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div style={{ background: "linear-gradient(90deg, #1A1208, #2C2010, #1A1208)", overflow: "hidden", padding: "20px 0", borderTop: "1px solid rgba(200,169,126,0.18)", borderBottom: "1px solid rgba(200,169,126,0.18)" }}>
        <div className="marquee-track" style={{ display: "flex", gap: "0", whiteSpace: "nowrap", width: "max-content" }}>
          {[...Array(3)].map((_, i) => (
            <span key={i} className="sans" style={{ display: "inline-flex", alignItems: "center" }}>
              {["HAIR BRAIDING","NAIL CARE","LASH EXTENSIONS","MAKEUP","WIG STYLING","LOYALTY REWARDS","FREE WIFI","FREE WATER","PREMIUM PRODUCTS","EXPERT STYLISTS"].map(item => (
                <span key={item} style={{ display: "inline-flex", alignItems: "center", gap: "20px", paddingRight: "52px" }}>
                  <span style={{ fontSize: "10.5px", letterSpacing: "0.22em", color: "rgba(245,239,230,0.78)", fontWeight: 600 }}>{item}</span>
                  <span style={{ color: gold, fontSize: "11px" }}>✦</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* SERVICES */}
      <section id="services" style={{ padding: "clamp(64px,8vw,120px) clamp(24px,6vw,100px)", background: mid, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 85% 15%, rgba(200,169,126,0.08) 0%, transparent 45%), radial-gradient(circle at 15% 85%, rgba(200,169,126,0.06) 0%, transparent 45%)", pointerEvents: "none" }} />
        <div style={{ textAlign: "center", marginBottom: "64px", position: "relative", zIndex: 1 }}>
          <div className="sans" style={{ fontSize: "10px", letterSpacing: "0.26em", color: gold, fontWeight: 700, marginBottom: "16px" }}>WHAT WE OFFER</div>
          <h2 style={{ fontSize: "clamp(36px,5vw,60px)", fontWeight: 400, marginBottom: "16px", letterSpacing: "-0.01em" }}>Our <em>Services</em></h2>
          <p className="sans" style={{ fontSize: "14.5px", color: "#3D2E1A", maxWidth: "420px", margin: "0 auto", lineHeight: 1.85, fontWeight: 400 }}>
            From precision braids to flawless nails, every service at Zolara is delivered with artistry and care.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px", position: "relative", zIndex: 1 }}>
          {services.map((s, i) => (
            <div key={s.name} className="service-card fade-up" style={{ animationDelay: `${i * 0.08}s`, background: cream, borderRadius: "3px", padding: "40px 32px", position: "relative", overflow: "hidden", border: "1px solid rgba(200,169,126,0.18)" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: `linear-gradient(90deg, ${s.color}, ${s.color}88, transparent)` }} />
              <div className="svc-icon" style={{ fontSize: "30px", color: s.color, marginBottom: "20px", lineHeight: 1 }}>{s.icon}</div>
              <h3 style={{ fontSize: "23px", fontWeight: 500, marginBottom: "12px" }}>{s.name}</h3>
              <p className="sans" style={{ fontSize: "13.5px", color: "#3D2E1A", lineHeight: 1.85, marginBottom: "24px", fontWeight: 400 }}>{s.desc}</p>
              <p className="sans" style={{ fontSize: "11.5px", fontWeight: 700, color: goldDark, letterSpacing: "0.06em" }}>{s.price}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: "60px", position: "relative", zIndex: 1 }}>
          <Link to="/book" className="btn-primary" style={{
            textDecoration: "none", display: "inline-block",
            fontFamily: "'Montserrat', sans-serif", fontSize: "11px", fontWeight: 700,
            letterSpacing: "0.14em", color: "#fff",
            background: "linear-gradient(135deg, #8B6914, #C8A97E)",
            padding: "17px 52px", borderRadius: "1px",
            boxShadow: "0 8px 32px rgba(139,105,20,0.3)",
          }}>BOOK AN APPOINTMENT</Link>
        </div>
      </section>

      {/* EXPERIENCE */}
      <section id="experience" style={{ padding: "clamp(64px,8vw,120px) clamp(24px,6vw,100px)", background: cream, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: "-60px", top: "50%", transform: "translateY(-50%)", fontSize: "380px", color: "rgba(200,169,126,0.045)", fontWeight: 700, lineHeight: 1, pointerEvents: "none" }}>✦</div>
        <div className="landing-experience-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(40px,6vw,100px)", alignItems: "center", maxWidth: "1100px", margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div>
            <div className="sans" style={{ fontSize: "10px", letterSpacing: "0.26em", color: gold, fontWeight: 700, marginBottom: "16px" }}>THE ZOLARA DIFFERENCE</div>
            <h2 style={{ fontSize: "clamp(32px,4.5vw,54px)", fontWeight: 400, lineHeight: 1.15, marginBottom: "28px" }}>A Complete <em>Luxury</em> Experience</h2>
            <p className="sans" style={{ fontSize: "14.5px", color: "#3D2E1A", lineHeight: 1.95, marginBottom: "36px", fontWeight: 400 }}>
              Every visit to Zolara is designed to be more than just a salon appointment. From the moment you walk in to your Exit Ritual, a perfume spritz, a piece of chocolate, and a final mirror check, you leave feeling extraordinary.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              {[
                ["Free WiFi and complimentary bottled water for every client","✦"],
                ["Ghana's first salon loyalty rewards program","◈"],
                ["Certified stylists with specialised training","◇"],
                ["Premium products only. No compromises.","❋"],
                ["Private, comfortable styling stations","◉"],
              ].map(([item, icon]) => (
                <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                  <span style={{ color: gold, fontSize: "15px", flexShrink: 0, marginTop: "2px" }}>{icon}</span>
                  <span className="sans" style={{ fontSize: "13.5px", color: "#3D2E1A", lineHeight: 1.65, fontWeight: 400 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", inset: "-20px", background: "radial-gradient(circle at 50% 50%, rgba(200,169,126,0.1) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
            <div style={{ background: "linear-gradient(150deg, #2C2416 0%, #1A1008 60%, #251D0E 100%)", borderRadius: "4px", padding: "60px 48px", textAlign: "center", position: "relative", overflow: "hidden", boxShadow: "0 32px 80px rgba(28,22,14,0.35)" }}>
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 0%, rgba(200,169,126,0.18) 0%, transparent 55%)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", top: "0", left: "0", right: "0", height: "3px", background: "linear-gradient(90deg, transparent, #C8A97E, transparent)" }} />
              <div style={{ position: "absolute", top: "20px", right: "20px", width: "52px", height: "52px", border: "1px solid rgba(200,169,126,0.28)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: gold, fontSize: "18px", animation: "goldPulse 3s ease-in-out infinite" }}>✦</span>
              </div>
              <p style={{ fontStyle: "italic", fontSize: "clamp(18px,2.5vw,27px)", color: "#F5EFE6", lineHeight: 1.65, marginBottom: "32px", position: "relative", zIndex: 1, fontWeight: 400 }}>
                "Not just a salon. A complete luxury experience."
              </p>
              <div style={{ width: "44px", height: "1px", background: "linear-gradient(90deg, transparent, #C8A97E, transparent)", margin: "0 auto 24px" }} />
              <p className="sans" style={{ fontSize: "10.5px", letterSpacing: "0.22em", color: gold, fontWeight: 700 }}>ZOLARA BEAUTY STUDIO</p>
              <p className="sans" style={{ fontSize: "12px", color: "rgba(245,239,230,0.55)", marginTop: "8px", fontWeight: 400 }}>Sakasaka, Tamale</p>
              <div style={{ marginTop: "36px", display: "flex", justifyContent: "center", gap: "8px" }}>
                {[1,2,3,4,5].map(s => <span key={s} style={{ color: gold, fontSize: "18px" }}>★</span>)}
              </div>
              <p className="sans" style={{ fontSize: "11px", color: "rgba(245,239,230,0.55)", marginTop: "10px", fontWeight: 400 }}>5.0 · 500+ Reviews</p>
              <div style={{ marginTop: "36px", padding: "24px 0 0", borderTop: "1px solid rgba(200,169,126,0.15)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  {[["Free WiFi","◈"],["Free Water","❋"],["Loyalty Program","◉"],["Exit Ritual","✦"]].map(([f,ic]) => (
                    <div key={f} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                      <span style={{ color: gold, fontSize: "15px" }}>{ic}</span>
                      <span className="sans" style={{ fontSize: "9.5px", color: "rgba(245,239,230,0.65)", letterSpacing: "0.12em", fontWeight: 600 }}>{(f as string).toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* REVIEWS — ANIMATED */}
      <section id="reviews" style={{ padding: "clamp(64px,8vw,120px) clamp(24px,6vw,100px)", background: dark, textAlign: "center", overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 0%, rgba(200,169,126,0.10) 0%, transparent 55%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(135deg, transparent, transparent 60px, rgba(200,169,126,0.015) 60px, rgba(200,169,126,0.015) 61px)", pointerEvents: "none" }} />

        <div ref={reviewRef} className={reviewVisible ? "review-visible" : ""} style={{ position: "relative", zIndex: 1 }}>
          <div className="sans" style={{ fontSize: "10px", letterSpacing: "0.26em", color: gold, fontWeight: 700, marginBottom: "16px" }}>CLIENT STORIES</div>
          <h2 style={{ fontSize: "clamp(32px,4.5vw,54px)", fontWeight: 400, color: cream, marginBottom: "16px" }}>What Our <em>Clients</em> Say</h2>
          <p className="sans" style={{ fontSize: "14px", color: "rgba(245,239,230,0.55)", maxWidth: "420px", margin: "0 auto 60px", lineHeight: 1.8, fontWeight: 400 }}>
            Real women. Real results. Real luxury.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "24px", maxWidth: "1100px", margin: "0 auto 60px" }}>
            {reviews.map((r, i) => (
              <div key={r.name} className={`review-card review-card-anim`}
                style={{
                  background: i === activeReview ? "rgba(200,169,126,0.13)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${i === activeReview ? "rgba(200,169,126,0.42)" : "rgba(255,255,255,0.07)"}`,
                  borderRadius: "3px", padding: "36px 28px", textAlign: "left",
                  boxShadow: i === activeReview ? "0 16px 48px rgba(200,169,126,0.12)" : "none",
                  animationDelay: `${i * 0.15}s`,
                }}>
                <div style={{ display: "flex", gap: "4px", marginBottom: "20px" }}>
                  {[1,2,3,4,5].map(s => <span key={s} style={{ color: gold, fontSize: "15px" }}>★</span>)}
                </div>
                <p style={{ fontStyle: "italic", fontSize: "17px", color: "rgba(245,239,230,0.92)", lineHeight: 1.8, marginBottom: "24px", fontWeight: 400 }}>"{r.text}"</p>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: "linear-gradient(135deg, #C8A97E, #8B6914)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span className="sans" style={{ fontSize: "13px", fontWeight: 700, color: "#fff" }}>{r.name[0]}</span>
                  </div>
                  <p className="sans" style={{ fontSize: "13px", fontWeight: 600, color: gold }}>{r.name}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Active indicator dots */}
          <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "40px" }}>
            {reviews.map((_, i) => (
              <div key={i} onClick={() => setActiveReview(i)} style={{
                width: i === activeReview ? "24px" : "8px", height: "8px", borderRadius: "4px",
                background: i === activeReview ? gold : "rgba(200,169,126,0.3)",
                cursor: "pointer", transition: "all 0.4s ease",
              }} />
            ))}
          </div>

          <Link to="/book" className="btn-primary" style={{
            textDecoration: "none", display: "inline-block",
            fontFamily: "'Montserrat', sans-serif", fontSize: "11px", fontWeight: 700,
            letterSpacing: "0.14em", color: dark,
            background: "linear-gradient(135deg, #C8A97E, #E8C89A)",
            padding: "17px 52px", borderRadius: "1px",
          }}>JOIN OUR HAPPY CLIENTS</Link>
        </div>
      </section>

      {/* GIFT CARDS — 2 column with KPI marketing */}
      <section id="gift-cards" style={{ padding: "clamp(64px,8vw,120px) clamp(24px,6vw,100px)", background: mid, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 70% 30%, rgba(200,169,126,0.07) 0%, transparent 50%)", pointerEvents: "none" }} />

        <div style={{ textAlign: "center", marginBottom: "64px", position: "relative", zIndex: 1 }}>
          <div className="sans" style={{ fontSize: "10px", letterSpacing: "0.26em", color: gold, fontWeight: 700, marginBottom: "16px" }}>THE PERFECT PRESENT</div>
          <h2 style={{ fontSize: "clamp(36px,5vw,60px)", fontWeight: 400, marginBottom: "20px" }}>Gift the <em>Experience</em></h2>
          <p className="sans" style={{ fontSize: "14.5px", color: "#3D2E1A", lineHeight: 1.9, maxWidth: "520px", margin: "0 auto", fontWeight: 400 }}>
            Give someone you love a luxury beauty experience at Zolara. Valid for 12 months. Redeemable for any service.
          </p>
        </div>

        <div className="landing-gift-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(32px,5vw,72px)", maxWidth: "1100px", margin: "0 auto", alignItems: "start", position: "relative", zIndex: 1 }}>

          {/* LEFT: Marketing KPI cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <h3 style={{ fontSize: "clamp(24px,3vw,36px)", fontWeight: 400, lineHeight: 1.2, marginBottom: "8px" }}>Why Give a <em>Zolara</em> Gift Card?</h3>

            {[
              {
                icon: "✦", title: "Works Like Cash",
                body: "Redeemable for any service across our full menu. Braids, nails, lashes, makeup — your recipient chooses.",
              },
              {
                icon: "◈", title: "12-Month Validity",
                body: "No rush. Gift cards stay active for a full year from purchase. Plenty of time to plan a special visit.",
              },
              {
                icon: "◉", title: "Delivered Instantly",
                body: "Digital cards land in their inbox within minutes. Physical pickup also available at the studio.",
              },
              {
                icon: "◇", title: "A Little Extra on Us",
                body: "If the service total slightly exceeds the card value (up to GHS 50 on Diamond cards), the difference is on Zolara.",
              },
              {
                icon: "❋", title: "Four Tiers. One for Everyone.",
                body: "Silver GHS 220, Gold GHS 450, Platinum GHS 650, Diamond GHS 1,000. From a treat to a full luxury day.",
              },
            ].map(({ icon, title, body }) => (
              <div key={title} className="kpi-card" style={{ background: cream, border: "1px solid rgba(200,169,126,0.2)", borderRadius: "4px", padding: "22px 24px", display: "flex", gap: "16px", alignItems: "flex-start", boxShadow: "0 4px 20px rgba(28,22,14,0.05)" }}>
                <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: "linear-gradient(135deg, #8B6914, #C8A97E)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: "#fff", fontSize: "14px" }}>{icon}</span>
                </div>
                <div>
                  <p className="sans" style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.06em", color: dark, marginBottom: "6px" }}>{title}</p>
                  <p className="sans" style={{ fontSize: "13px", color: "#4A3520", lineHeight: 1.75, fontWeight: 400 }}>{body}</p>
                </div>
              </div>
            ))}

            <Link to="/buy-gift-card" className="btn-primary" style={{
              textDecoration: "none", display: "inline-block",
              fontFamily: "'Montserrat', sans-serif", fontSize: "11px", fontWeight: 700,
              letterSpacing: "0.14em", color: "#fff",
              background: "linear-gradient(135deg, #8B6914, #C8A97E)",
              padding: "17px 40px", borderRadius: "1px", textAlign: "center",
              boxShadow: "0 8px 32px rgba(139,105,20,0.3)",
            }}>BUY A GIFT CARD</Link>
          </div>

          {/* RIGHT: Gift card tiers */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", paddingTop: "12px" }}>
            {[
              { amount: "GH₵ 220", tier: "Silver", desc: "Perfect for a treat. Covers a wash, nail set, or cluster lashes.", gradient: "linear-gradient(145deg, #a8a8a8, #f0f0f0, #8a8a8a)" },
              { amount: "GH₵ 450", tier: "Gold", desc: "A full pampering session. Braids, manicure and more.", gradient: "linear-gradient(145deg, #8B6914, #C8A97E, #A07030)" },
              { amount: "GH₵ 650", tier: "Platinum", desc: "Premium luxury experience. A day of indulgence.", gradient: "linear-gradient(145deg, #3D4852, #8B9BAB, #2D3740)" },
              { amount: "GH₵ 1,000", tier: "Diamond Luxury Pass", desc: "The ultimate gift. Bridal prep, full styling and more.", gradient: "linear-gradient(145deg, #2D2570, #7C6FD4, #1E1860)" },
            ].map(({ amount, tier, desc, gradient }) => (
              <div key={tier} className="gift-card-tile" style={{ background: gradient, borderRadius: "10px", padding: "28px 28px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -14, right: -14, width: 70, height: 70, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
                <div style={{ position: "absolute", bottom: -10, left: -10, width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p className="sans" style={{ fontSize: "9px", letterSpacing: "0.2em", color: "rgba(255,255,255,0.72)", marginBottom: "10px", fontWeight: 600 }}>ZOLARA BEAUTY STUDIO</p>
                    <p style={{ fontSize: "30px", fontWeight: 700, color: "white", marginBottom: "2px", fontFamily: "'Cormorant Garamond', serif" }}>{amount}</p>
                    <p className="sans" style={{ fontSize: "9px", letterSpacing: "0.18em", fontWeight: 700, color: "rgba(255,255,255,0.78)", marginBottom: "10px" }}>{tier.toUpperCase()}</p>
                  </div>
                  <div style={{ width: "40px", height: "40px", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "16px" }}>✦</span>
                  </div>
                </div>
                <p className="sans" style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.72)", lineHeight: 1.65, fontWeight: 400, maxWidth: "280px" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VISIT US */}
      <section id="visit-us" style={{ padding: "clamp(64px,8vw,120px) clamp(24px,6vw,100px)", background: cream, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 30% 70%, rgba(200,169,126,0.09) 0%, transparent 50%)", pointerEvents: "none" }} />
        <div style={{ textAlign: "center", marginBottom: "64px", position: "relative", zIndex: 1 }}>
          <div className="sans" style={{ fontSize: "10px", letterSpacing: "0.26em", color: gold, fontWeight: 700, marginBottom: "16px" }}>FIND US</div>
          <h2 style={{ fontSize: "clamp(36px,5vw,60px)", fontWeight: 400 }}>Come <em>Visit Us</em></h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px", maxWidth: "900px", margin: "0 auto 60px", position: "relative", zIndex: 1 }}>
          {[
            { icon: "◉", label: "LOCATION", lines: ["Sakasaka, Opposite CalBank", "Tamale, Ghana"] },
            { icon: "◈", label: "CALL US", lines: ["059 436 5314", "020 884 8707"] },
            { icon: "◇", label: "HOURS", lines: ["Monday – Saturday", "8:30 AM – 9:00 PM"] },
            { icon: "✦", label: "CLOSED", lines: ["Every Sunday", "We rest so we can serve you better"] },
          ].map(item => (
            <div key={item.label} className="visit-card" style={{ background: mid, border: "1px solid rgba(200,169,126,0.22)", borderRadius: "3px", padding: "40px 28px", textAlign: "center", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "48px", height: "2px", background: "linear-gradient(90deg, transparent, #C8A97E, transparent)" }} />
              <div style={{ fontSize: "26px", color: gold, marginBottom: "18px" }}>{item.icon}</div>
              <p className="sans" style={{ fontSize: "10px", letterSpacing: "0.22em", color: gold, fontWeight: 700, marginBottom: "14px" }}>{item.label}</p>
              {item.lines.map(l => <p key={l} className="sans" style={{ fontSize: "14px", color: dark, lineHeight: 1.75, fontWeight: 400 }}>{l}</p>)}
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
          <Link to="/book" className="btn-primary" style={{
            textDecoration: "none", display: "inline-block",
            fontFamily: "'Montserrat', sans-serif", fontSize: "11px", fontWeight: 700,
            letterSpacing: "0.14em", color: "#fff",
            background: "linear-gradient(135deg, #8B6914, #C8A97E)",
            padding: "17px 52px", borderRadius: "1px",
            boxShadow: "0 8px 32px rgba(139,105,20,0.3)",
          }}>BOOK YOUR APPOINTMENT</Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: "linear-gradient(160deg, #1A1208, #0D0A06)", padding: "clamp(40px,6vw,80px) clamp(24px,6vw,100px)", borderTop: "1px solid rgba(200,169,126,0.14)" }}>
        <div className="landing-footer-grid" style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "clamp(32px,5vw,80px)", alignItems: "flex-start", marginBottom: "48px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "50%", border: "2px solid #C8A97E", overflow: "hidden", background: "#fff" }}>
                <img src={LOGO} alt="Zolara" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div>
                <div className="sans" style={{ fontSize: "18px", fontWeight: 800, letterSpacing: "0.22em", color: cream, lineHeight: 1.05 }}>ZOLARA</div>
                <div className="sans" style={{ fontSize: "10px", letterSpacing: "0.22em", color: gold, marginTop: "3px", fontWeight: 600 }}>BEAUTY STUDIO</div>
              </div>
            </div>
            <p className="sans" style={{ fontSize: "12.5px", color: "rgba(245,239,230,0.45)", lineHeight: 1.8, maxWidth: "240px", fontWeight: 400 }}>
              Tamale's premier luxury beauty studio. Where every visit is an experience.
            </p>
          </div>
          <div>
            <p className="sans" style={{ fontSize: "10px", letterSpacing: "0.22em", color: gold, fontWeight: 700, marginBottom: "20px" }}>NAVIGATE</p>
            {[["#services","Services"],["#experience","Experience"],["#gift-cards","Gift Cards"],["#visit-us","Visit Us"]].map(([href,label]) => (
              <div key={label} style={{ marginBottom: "12px" }}>
                <a href={href} className="sans" style={{ fontSize: "13px", color: "rgba(245,239,230,0.55)", textDecoration: "none", fontWeight: 400, transition: "color 0.2s" }}
                  onMouseEnter={e => (e.target as HTMLElement).style.color = gold}
                  onMouseLeave={e => (e.target as HTMLElement).style.color = "rgba(245,239,230,0.55)"}
                >{label}</a>
              </div>
            ))}
          </div>
          <div>
            <p className="sans" style={{ fontSize: "10px", letterSpacing: "0.22em", color: gold, fontWeight: 700, marginBottom: "20px" }}>SOCIAL</p>
            {[["https://www.instagram.com/zolarastudio","Instagram"],["https://www.tiktok.com/@zolarastudio","TikTok"],["https://x.com/zolarastudio","X (Twitter)"]].map(([href,label]) => (
              <div key={label} style={{ marginBottom: "12px" }}>
                <a href={href} target="_blank" rel="noreferrer" className="sans" style={{ fontSize: "13px", color: "rgba(245,239,230,0.55)", textDecoration: "none", fontWeight: 400, transition: "color 0.2s" }}
                  onMouseEnter={e => (e.target as HTMLElement).style.color = gold}
                  onMouseLeave={e => (e.target as HTMLElement).style.color = "rgba(245,239,230,0.55)"}
                >{label}</a>
              </div>
            ))}
          </div>
        </div>
        <div style={{ borderTop: "1px solid rgba(200,169,126,0.1)", paddingTop: "28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p className="sans" style={{ fontSize: "12px", color: "rgba(245,239,230,0.28)", fontWeight: 400 }}>© {new Date().getFullYear()} Zolara Beauty Studio. All rights reserved.</p>
          <Link to="/app/auth" className="sans" style={{ fontSize: "12px", color: "rgba(200,169,126,0.5)", textDecoration: "none" }}>Staff Login</Link>
        </div>
      </footer>
      <AmandaWidget />
    </div>
  );
}
