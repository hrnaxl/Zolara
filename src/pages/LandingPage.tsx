import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import AmandaWidget from "@/components/AmandaWidget";
import { supabase } from "@/integrations/supabase/client";

const LOGO = "https://ekvjnydomfresnkealpb.supabase.co/storage/v1/object/public/avatars/logo_1764609621458.jpg";

const services = [
  { name: "Hair Braiding", icon: "✦", desc: "Cornrows, box braids, twists and knotless braids crafted with precision and care.", price: "From GHS 80", color: "#C8A97E" },
  { name: "Nail Care", icon: "◈", desc: "Manicure, pedicure, gel, acrylic and nail art by certified nail technicians.", price: "From GHS 100", color: "#B8956A" },
  { name: "Lash Extensions", icon: "◇", desc: "Classic, hybrid and volume sets using only premium mink-effect lashes.", price: "From GHS 65", color: "#A0825A" },
  { name: "Hair Washing", icon: "❋", desc: "Deep cleanse, conditioning and blow-dry treatments for every hair type.", price: "From GHS 80", color: "#C8A97E" },
  { name: "Makeup", icon: "◉", desc: "Bridal, glam and everyday looks by our trained makeup artists.", price: "From GHS 125", color: "#B8956A" },
  { name: "Wig Styling", icon: "◈", desc: "Custom wig fitting, installation and transformation for any occasion.", price: "From GHS 150", color: "#A0825A" },
];

// Reviews loaded from DB; fallback shown until DB loads
const FALLBACK_REVIEWS = [
  { name: "Abena K.", text: "Zolara is in a class of its own. The atmosphere, the staff, the results. I've never felt more pampered in Tamale.", stars: 5 },
  { name: "Fatima A.", text: "My lashes were absolutely perfect. The attention to detail is incredible. I won't go anywhere else.", stars: 5 },
  { name: "Priscilla M.", text: "The loyalty program is a game changer. Free water, WiFi, and they even spray you with perfume on your way out. Elite.", stars: 5 },
  { name: "Sandra O.", text: "I drove 2 hours from Kumasi for this salon. Worth every minute. The box braids were immaculate.", stars: 5 },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  // Handle Supabase email confirmation tokens landing on homepage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token_hash = params.get("token_hash");
    const type = params.get("type");
    if (token_hash && type) {
      navigate(`/app/auth/callback?token_hash=${token_hash}&type=${type}`, { replace: true });
    }
  }, []);
  const [activeReview, setActiveReview] = useState(0);
  const [dbReviews, setDbReviews] = useState<any[]>([]);
  const [reviewVisible, setReviewVisible] = useState(false);
  const [expVisible, setExpVisible] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [salonSettings, setSalonSettings] = useState<any>(null);
  const [dbServices, setDbServices] = useState<any[]>([]);
  const [subPlans, setSubPlans] = useState<any[]>([]);
  const [dbVariantsMap, setDbVariantsMap] = useState<Record<string,any[]>>({});
  const [activeSvcCat, setActiveSvcCat] = useState("all");
  const [svcVisible, setSvcVisible] = useState(false);
  const svcRef = useRef<HTMLDivElement>(null);
  const reviewRef = useRef<HTMLDivElement>(null);
  const expRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    supabase.from("settings").select("open_time, close_time, closed_dates, landing_sections, promo_banner").limit(1).maybeSingle()
      .then(({ data }) => { if (data) setSalonSettings(data); });
    // Load visible reviews from DB
    (supabase as any).from("reviews").select("*").eq("visible", true).order("created_at", { ascending: false })
      .then(({ data }: any) => { if (data && data.length > 0) setDbReviews(data); });
  }, []);

  useEffect(() => {
    const reviews = dbReviews.length > 0 ? dbReviews.map((r: any) => ({ name: r.name, text: r.comment, stars: r.rating })) : FALLBACK_REVIEWS;
    const iv = setInterval(() => setActiveReview(r => (r + 1) % reviews.length), 4500);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setReviewVisible(true); }, { threshold: 0.1 });
    if (reviewRef.current) obs.observe(reviewRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setExpVisible(true); }, { threshold: 0.15 });
    if (expRef.current) obs.observe(expRef.current);
    return () => obs.disconnect();
  }, []);

  // Fetch real services from DB for showcase
  useEffect(() => {
    Promise.all([
      supabase.from("services").select("id,name,category,price,description,is_active").eq("is_active",true).order("category").order("name"),
      (supabase as any).from("service_variants").select("service_id,price_adjustment,name").eq("is_active",true),
    ]).then(([{data:svcs},{data:vars}]) => {
      setDbServices(svcs || []);
      const vm: Record<string,any[]> = {};
      for (const v of (vars||[])) { if (!vm[v.service_id]) vm[v.service_id]=[]; vm[v.service_id].push(v); }
      setDbVariantsMap(vm);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!svcRef.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setSvcVisible(true); }, { threshold: 0.05 });
    obs.observe(svcRef.current);
    return () => obs.disconnect();
  }, []);

  const gold = "#C8A97E";
  const goldDark = "#8B6914";
  const cream = "#F5EFE6";
  const dark = "#1C160E";
  const mid = "#EDE3D5";

  // Compute live open/closed status
  const isOpenNow = (() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD in UTC, use local
    const localDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    // Check manual closure for today
    const closedDates: string[] = salonSettings?.closed_dates || [];
    if (closedDates.some((d: string) => d === localDate || d.startsWith(localDate + "|"))) return false;
    // Closed on Sundays
    if (now.getDay() === 0) return false;
    // Check hours
    const openTime = salonSettings?.open_time || "08:30";
    const closeTime = salonSettings?.close_time || "21:00";
    const [oh, om] = openTime.split(":").map(Number);
    const [ch, cm] = closeTime.split(":").map(Number);
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const openMins = oh * 60 + om;
    const closeMins = ch * 60 + cm;
    return nowMins >= openMins && nowMins < closeMins;
  })();


  return (
    <div style={{ fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif", background: cream, color: dark, overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500&family=Montserrat:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        /* Force lining numerals — Cormorant Garamond defaults to oldstyle (1 looks like I) */
        * { font-variant-numeric: lining-nums; }
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
        @keyframes expKpi { from { opacity: 0; transform: translateX(-28px); } to { opacity: 1; transform: translateX(0); } }
        .exp-kpi { opacity: 0; }
        .exp-visible .exp-kpi { animation: expKpi 0.6s cubic-bezier(0.16,1,0.3,1) forwards; }
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
          .mobile-ham { display: flex !important; }
          .lyl-stamp-grid { grid-template-columns: repeat(4,1fr) !important; }
          .lyl-tier-grid { grid-template-columns: repeat(2,1fr) !important; }
          .svc-db-card { min-width: 0 !important; }
        }
        @media (max-width: 480px) {
          .lyl-stamp-grid { grid-template-columns: repeat(4,1fr) !important; gap: 6px !important; }
          .lyl-stamp-grid > div { height: 30px !important; font-size: 11px !important; }
        }
      `}</style>

      {/* PROMO BANNER */}
      {(() => {
        const pb = (salonSettings as any)?.promo_banner;
        if (!pb?.enabled || !pb?.message) return null;
        if (pb.expires && new Date(pb.expires) < new Date()) return null;
        const bg =
          pb.style === "dark"   ? "linear-gradient(90deg,#1C160E,#2D2318,#1C160E)" :
          pb.style === "green"  ? "linear-gradient(90deg,#064E3B,#10B981,#064E3B)" :
          pb.style === "purple" ? "linear-gradient(90deg,#4C1D95,#8B5CF6,#4C1D95)" :
          pb.style === "red"    ? "linear-gradient(90deg,#7F1D1D,#EF4444,#7F1D1D)" :
                                  "linear-gradient(90deg,#8B6914,#C8A97E,#8B6914)";
        return (
          <div style={{ background: bg, padding: "10px 20px", textAlign: "center", position: "relative", zIndex: 101 }}>
            <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "12px", fontWeight: 600, color: "white", letterSpacing: "0.04em" }}>
              {pb.message}
            </span>
          </div>
        );
      })()}

      {/* NAVBAR */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: "0 clamp(20px,5vw,80px)",
        height: scrolled ? "60px" : "74px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: scrolled ? "rgba(245,239,230,0.97)" : "transparent",
        backdropFilter: scrolled ? "blur(24px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(200,169,126,0.2)" : "none",
        boxShadow: scrolled ? "0 4px 40px rgba(28,22,14,0.06)" : "none",
        transition: "all 0.4s ease",
      }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "11px", textDecoration: "none" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "50%", border: "2px solid #C8A97E", overflow: "hidden", background: "#fff", flexShrink: 0 }}>
            <img src={LOGO} alt="Zolara" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div>
            <div className="sans" style={{ fontSize: "14px", fontWeight: 800, letterSpacing: "0.22em", color: dark, lineHeight: 1.1 }}>ZOLARA</div>
            <div className="sans" style={{ fontSize: "10px", letterSpacing: "0.22em", color: gold, marginTop: "2px", fontWeight: 600, lineHeight: 1 }}>BEAUTY STUDIO</div>
          </div>
        </a>

        <div className="desktop-nav" style={{ display: "flex", gap: "36px", alignItems: "center" }}>
          {[["#services","SERVICES"],["#experience","EXPERIENCE"],["#gift-cards","GIFT CARDS"],["#loyalty","LOYALTY"],["#subscriptions","PLANS"],["#reviews","REVIEWS"],["#visit-us","VISIT US"]].map(([href,label]) => (
            <a key={label} href={href} className="nav-link sans" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.14em", color: dark, textDecoration: "none" }}>{label}</a>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link to="/book" className="btn-primary" style={{
            fontFamily: "'Montserrat', sans-serif", fontSize: "10px", fontWeight: 700,
            letterSpacing: "0.14em", color: "#fff", textDecoration: "none",
            background: "linear-gradient(135deg, #8B6914, #C8A97E)",
            padding: "10px 22px", borderRadius: "1px",
            boxShadow: "0 4px 20px rgba(139,105,20,0.32)",
          }}>BOOK NOW</Link>
          <button onClick={() => setMobileMenuOpen(o => !o)}
            className="mobile-ham" aria-label="Menu"
            style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "none", flexDirection: "column", gap: "5px" }}>
            <span style={{ display: "block", width: "22px", height: "2px", background: dark, borderRadius: "2px", transition: "all 0.25s", transform: mobileMenuOpen ? "rotate(45deg) translateY(7px)" : "none" }} />
            <span style={{ display: "block", width: "22px", height: "2px", background: dark, borderRadius: "2px", transition: "all 0.25s", opacity: mobileMenuOpen ? 0 : 1 }} />
            <span style={{ display: "block", width: "22px", height: "2px", background: dark, borderRadius: "2px", transition: "all 0.25s", transform: mobileMenuOpen ? "rotate(-45deg) translateY(-7px)" : "none" }} />
          </button>
        </div>
      </nav>

      {/* Mobile menu backdrop */}
      {mobileMenuOpen && (
        <div onClick={() => setMobileMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 99, background: "rgba(28,22,14,0.55)", backdropFilter: "blur(4px)" }} />
      )}
      {/* Mobile menu panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 105,
        width: "min(300px, 85vw)",
        background: "linear-gradient(180deg, #1C160E 0%, #2A1E0D 100%)",
        transform: mobileMenuOpen ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.32s cubic-bezier(0.16,1,0.3,1)",
        display: "flex", flexDirection: "column", padding: "80px 28px 48px",
        boxShadow: "-24px 0 80px rgba(0,0,0,0.35)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "36px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", border: `2px solid ${gold}`, overflow: "hidden" }}>
             <img src={LOGO} alt="Zolara" style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
          </div>
          <div>
            <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "13px", fontWeight: 800, letterSpacing: "0.2em", color: "#F5EFE6" }}>ZOLARA</div>
            <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "8px", letterSpacing: "0.2em", color: gold, fontWeight: 600 }}>BEAUTY STUDIO</div>
          </div>
        </div>
        {[["#services","SERVICES"],["#experience","EXPERIENCE"],["#gift-cards","GIFT CARDS"],["#loyalty","LOYALTY"],["#subscriptions","PLANS"],["#reviews","REVIEWS"],["#visit-us","VISIT US"]].map(([href, label]) => (
          <a key={label} href={href} onClick={() => setMobileMenuOpen(false)}
            style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "11px", fontWeight: 700, letterSpacing: "0.18em", color: "rgba(245,239,230,0.7)", textDecoration: "none", padding: "15px 0", borderBottom: "1px solid rgba(200,169,126,0.1)" }}>
            {label}
          </a>
        ))}
        <Link to="/book" onClick={() => setMobileMenuOpen(false)}
          style={{ marginTop: "28px", fontFamily: "'Montserrat',sans-serif", display: "block", textAlign: "center", padding: "16px", background: `linear-gradient(135deg, #8B6914, ${gold})`, color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: "11px", letterSpacing: "0.14em", borderRadius: "2px" }}>
          BOOK AN APPOINTMENT
        </Link>
        <Link to="/app/auth" onClick={() => setMobileMenuOpen(false)}
          style={{ marginTop: "16px", fontFamily: "'Montserrat',sans-serif", display: "block", textAlign: "center", padding: "14px", background: "rgba(200,169,126,0.08)", color: "rgba(200,169,126,0.7)", textDecoration: "none", fontWeight: 700, fontSize: "11px", letterSpacing: "0.14em", borderRadius: "2px", border: "1px solid rgba(200,169,126,0.2)" }}>
          STAFF LOGIN
        </Link>
        <div style={{ marginTop: "auto", paddingTop: "28px" }}>
          <a href="tel:+233594365314" style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "11px", color: "rgba(245,239,230,0.28)", marginBottom: "5px", display: "block", textDecoration: "none" }}>059 436 5314</a>
          <a href="tel:+233208848707" style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "11px", color: "rgba(245,239,230,0.28)", display: "block", textDecoration: "none" }}>020 884 8707</a>
        </div>
      </div>

      {/* HERO */}
      <section ref={heroRef} style={{ minHeight: "100vh", display: "flex", alignItems: "center", position: "relative", overflow: "hidden", padding: "0 clamp(24px,6vw,100px)" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 65% 40%, rgba(200,169,126,0.17) 0%, transparent 55%), radial-gradient(ellipse at 15% 85%, rgba(200,169,126,0.10) 0%, transparent 45%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 80px, rgba(200,169,126,0.018) 80px, rgba(200,169,126,0.018) 81px)", pointerEvents: "none" }} />
        <div className="orb-bg" style={{ top: "12%", right: "28%", width: "480px", height: "480px", background: "radial-gradient(circle, rgba(200,169,126,0.12) 0%, transparent 70%)", animation: "orb 14s ease-in-out infinite" }} />
        <div className="orb-bg" style={{ bottom: "8%", right: "8%", width: "320px", height: "320px", background: "radial-gradient(circle, rgba(200,169,126,0.08) 0%, transparent 70%)", animation: "orb 18s ease-in-out infinite reverse", animationDelay: "-6s" }} />
        <div style={{ position: "absolute", right: "-1%", top: "50%", transform: "translateY(-50%)", fontSize: "clamp(280px,35vw,500px)", fontWeight: 700, color: "rgba(200,169,126,0.055)", lineHeight: 1, pointerEvents: "none", userSelect: "none", letterSpacing: "-0.05em" }}>Z</div>

        {/* Floating info card: aligned with the hero text, top ~18% */}
        <div className="hero-floating-card-wrapper float" style={{ position: "absolute", right: "clamp(80px,13vw,200px)", top: "18%", width: "300px", pointerEvents: "none" }}>
          <div className="hero-floating-card" style={{ width: "300px", border: "1px solid rgba(200,169,126,0.4)", borderRadius: "5px", background: "rgba(252,249,244,0.92)", backdropFilter: "blur(24px)", padding: "36px 30px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
            <div style={{ width: "70px", height: "70px", borderRadius: "50%", border: "2.5px solid #C8A97E", overflow: "hidden", background: "#fff", boxShadow: "0 0 0 5px rgba(200,169,126,0.15)" }}>
               <img src={LOGO} alt="Zolara" style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
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
                <a href="tel:+233594365314" className="sans" style={{ fontSize: "12.5px", color: dark, fontWeight: 500, textDecoration: "none", display: "block" }}>059 436 5314</a>
                <a href="tel:+233208848707" className="sans" style={{ fontSize: "12.5px", color: dark, fontWeight: 500, marginTop: "2px", textDecoration: "none", display: "block" }}>020 884 8707</a>
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
            <div style={{ display: "flex", alignItems: "center", gap: "7px",
              background: isOpenNow ? "rgba(74,222,128,0.12)" : "rgba(239,68,68,0.10)",
              border: isOpenNow ? "1px solid rgba(74,222,128,0.35)" : "1px solid rgba(239,68,68,0.3)",
              borderRadius: "100px", padding: "4px 12px" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%",
                background: isOpenNow ? "#16a34a" : "#dc2626",
                boxShadow: isOpenNow ? "0 0 0 2px rgba(22,163,74,0.25)" : "none" }} />
              <span className="sans" style={{ fontSize: "9px", letterSpacing: "0.15em",
                color: isOpenNow ? "#15803d" : "#dc2626", fontWeight: 700 }}>
                {isOpenNow ? "NOW OPEN" : "CLOSED"}
              </span>
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
            {[["500+","Happy Clients"],["7+","Expert Stylists"],["4+","Years of Excellence"]].map(([n,l]) => (
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
      <section id="services" ref={svcRef} style={{ padding: "clamp(64px,8vw,120px) clamp(24px,6vw,100px)", background: mid, position: "relative", overflow: "hidden" }}>
        <style>{`
          .svc-db-card { background:#FDFCF9; border-radius:3px; border:1px solid rgba(200,169,126,0.2); overflow:hidden; transition:all 0.25s; opacity:0; transform:translateY(20px); }
          .svc-db-card.visible { opacity:1; transform:none; transition:opacity 0.5s ease, transform 0.5s ease, box-shadow 0.25s, border-color 0.25s; }
          .svc-db-card:hover { transform:translateY(-4px) !important; box-shadow:0 16px 48px rgba(28,22,14,0.1); border-color:rgba(200,169,126,0.5); }
          .svc-cat-tab { font-family:'Montserrat',sans-serif; font-size:11px; font-weight:600; letter-spacing:0.08em; padding:8px 20px; border-radius:20px; cursor:pointer; border:1.5px solid #D4B896; background:transparent; color:#5C3D1A; transition:all 0.2s; }
          .svc-cat-tab.active, .svc-cat-tab:hover { background:linear-gradient(135deg,#8B6914,#C8A97E); color:white; border-color:transparent; }
          .svc-book-link { font-family:'Montserrat',sans-serif; font-size:10px; font-weight:700; letter-spacing:0.1em; color:#8B6914; background:rgba(200,169,126,0.12); border:1.5px solid rgba(200,169,126,0.4); padding:8px 16px; border-radius:1px; cursor:pointer; text-decoration:none; transition:all 0.2s; white-space:nowrap; }
          .svc-book-link:hover { background:linear-gradient(135deg,#8B6914,#C8A97E); color:white; border-color:transparent; }
        `}</style>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 85% 15%, rgba(200,169,126,0.08) 0%, transparent 45%)", pointerEvents: "none" }} />

        <div style={{ textAlign: "center", marginBottom: "56px", position: "relative", zIndex: 1 }}>
          <div className="sans" style={{ fontSize: "10px", letterSpacing: "0.26em", color: gold, fontWeight: 700, marginBottom: "16px" }}>WHAT WE OFFER</div>
          <h2 style={{ fontSize: "clamp(36px,5vw,60px)", fontWeight: 400, marginBottom: "16px", letterSpacing: "-0.01em" }}>Our <em>Services</em></h2>
          <p className="sans" style={{ fontSize: "14px", color: "#3D2E1A", maxWidth: "420px", margin: "0 auto", lineHeight: 1.85, fontWeight: 400 }}>
            From precision braids to flawless nails. Click any service to book it directly.
          </p>
        </div>

        {/* Category tabs */}
        {dbServices.length > 0 && (() => {
          const cats = ["all", ...Array.from(new Set(dbServices.map(s => s.category).filter(Boolean)))];
          const filtered = activeSvcCat === "all" ? dbServices : dbServices.filter(s => s.category === activeSvcCat);
          return (
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 40 }}>
                {cats.map(cat => (
                  <button key={cat} className={"svc-cat-tab" + (activeSvcCat === cat ? " active" : "")} onClick={() => setActiveSvcCat(cat)}>
                    {cat === "all" ? "All Services" : cat}
                  </button>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))", gap: 16, marginBottom: 48 }}>
                {filtered.map((svc, i) => {
                  const vars = dbVariantsMap[svc.id] || [];
                  const priceDisplay = (() => {
                    if (vars.length === 0) return Number(svc.price) > 0 ? "GHS " + Number(svc.price).toLocaleString() : "See pricing";
                    const prices = vars.map((v:any) => Number(v.price_adjustment));
                    const mn = Math.min(...prices), mx = Math.max(...prices);
                    return mn === mx ? "GHS " + mn.toLocaleString() : "GHS " + mn.toLocaleString() + " – " + mx.toLocaleString();
                  })();
                  return (
                    <div key={svc.id} className={"svc-db-card" + (svcVisible ? " visible" : "")} style={{ transitionDelay: (i * 0.05) + "s" }}>
                      <div style={{ height: 3, background: "linear-gradient(90deg,#C8A97E,#8B6914)" }} />
                      <div style={{ padding: "22px 20px" }}>
                        <div className="sans" style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", color: gold, marginBottom: 8 }}>{svc.category?.toUpperCase()}</div>
                        <div style={{ fontSize: 20, fontWeight: 600, color: "#1C160E", marginBottom: 8, lineHeight: 1.2 }}>{svc.name}</div>
                        {svc.description && <div className="sans" style={{ fontSize: 12, color: "#5C4A2A", lineHeight: 1.75, marginBottom: 16 }}>{svc.description.slice(0,80)}{svc.description.length>80?"…":""}</div>}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: svc.description ? 0 : 16 }}>
                          <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 700, color: goldDark }}>{priceDisplay}</span>
                          <Link to={"/book?prefill_service=" + encodeURIComponent(svc.name)} className="svc-book-link">BOOK →</Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
          <Link to="/book" className="btn-primary" style={{
            textDecoration: "none", display: "inline-block", fontFamily: "'Montserrat',sans-serif",
            fontSize: "11px", fontWeight: 700, letterSpacing: "0.14em", color: "#fff",
            background: "linear-gradient(135deg,#8B6914,#C8A97E)", padding: "17px 52px",
            borderRadius: "1px", boxShadow: "0 8px 32px rgba(139,105,20,0.3)",
          }}>VIEW ALL SERVICES & BOOK</Link>
        </div>
      </section>

      {/* EXPERIENCE */}
      <section id="experience" style={{ padding: "clamp(64px,8vw,120px) clamp(24px,6vw,100px)", background: cream, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: "-60px", top: "50%", transform: "translateY(-50%)", fontSize: "380px", color: "rgba(200,169,126,0.045)", fontWeight: 700, lineHeight: 1, pointerEvents: "none" }}>✦</div>
        <div className="landing-experience-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(40px,6vw,100px)", alignItems: "center", maxWidth: "1100px", margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div ref={expRef} className={expVisible ? "exp-visible" : ""}>
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
              ].map(([item, icon], idx) => (
                <div key={item} className="exp-kpi" style={{ animationDelay: `${idx * 0.12}s`, display: "flex", alignItems: "flex-start", gap: "14px", background: "#fff", border: "1px solid rgba(200,169,126,0.18)", borderRadius: "8px", padding: "16px 18px", boxShadow: "0 2px 12px rgba(28,22,14,0.05)" }}>
                  <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: "linear-gradient(135deg, #8B6914, #C8A97E)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ color: "#fff", fontSize: "13px" }}>{icon}</span>
                  </div>
                  <span className="sans" style={{ fontSize: "13.5px", color: "#3D2E1A", lineHeight: 1.65, fontWeight: 400, paddingTop: "6px" }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", inset: "-20px", background: "radial-gradient(circle at 50% 50%, rgba(200,169,126,0.1) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
            <div style={{ background: "linear-gradient(150deg, #2C2416 0%, #1A1008 60%, #251D0E 100%)", borderRadius: "4px", padding: "60px 48px", textAlign: "center", position: "relative", overflow: "hidden", boxShadow: "0 32px 80px rgba(28,22,14,0.35)" }}>
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 0%, rgba(200,169,126,0.18) 0%, transparent 55%)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", top: "0", left: "0", right: "0", height: "3px", background: "linear-gradient(90deg, transparent, #C8A97E, transparent)" }} />
              {/* Logo in circle, top right */}
              <div style={{ position: "absolute", top: "20px", right: "20px", width: "52px", height: "52px", border: "2px solid rgba(200,169,126,0.5)", borderRadius: "50%", overflow: "hidden", background: "#fff", boxShadow: "0 0 0 4px rgba(200,169,126,0.12)" }}>
                 <img src={LOGO} alt="Zolara" style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
              </div>
              <p style={{ fontStyle: "italic", fontSize: "clamp(18px,2.5vw,27px)", color: "#F5EFE6", lineHeight: 1.65, marginBottom: "32px", position: "relative", zIndex: 1, fontWeight: 400 }}>
                "Not just a salon. A complete luxury experience."
              </p>
              <div style={{ width: "44px", height: "1px", background: "linear-gradient(90deg, transparent, #C8A97E, transparent)", margin: "0 auto 24px" }} />
              <p className="sans" style={{ fontSize: "10.5px", letterSpacing: "0.22em", color: gold, fontWeight: 700 }}>ZOLARA BEAUTY STUDIO</p>
              <p className="sans" style={{ fontSize: "12px", color: "rgba(245,239,230,0.55)", marginTop: "8px", fontWeight: 400 }}>Sakasaka, Tamale</p>
              <style>{`
                @keyframes starDrop {
                  0%   { transform: translateY(-40px) scale(0.3); opacity: 0; filter: blur(4px); }
                  60%  { transform: translateY(4px) scale(1.2); opacity: 1; filter: blur(0); }
                  80%  { transform: translateY(-2px) scale(0.95); }
                  100% { transform: translateY(0) scale(1); opacity: 1; filter: blur(0); }
                }
                @keyframes scoreReveal {
                  0%   { clip-path: inset(0 100% 0 0); opacity: 0; }
                  20%  { opacity: 1; }
                  100% { clip-path: inset(0 0% 0 0); opacity: 1; }
                }
                @keyframes badgeSlide {
                  0%   { transform: translateY(16px) scaleX(0.7); opacity: 0; }
                  100% { transform: translateY(0) scaleX(1); opacity: 1; }
                }
                @keyframes shimmerLine {
                  0%   { transform: translateX(-100%); }
                  100% { transform: translateX(200%); }
                }
                @keyframes ratingPulse {
                  0%,100% { text-shadow: 0 0 0px rgba(200,169,126,0); }
                  50%     { text-shadow: 0 0 20px rgba(200,169,126,0.6), 0 0 40px rgba(200,169,126,0.2); }
                }
              `}</style>

              {/* Stars */}
              <div style={{ marginTop: "36px", display: "flex", justifyContent: "center", gap: "10px" }}>
                {[0,1,2,3,4].map(i => (
                  <span key={i} style={{
                    fontSize: "22px", display: "inline-block", color: gold,
                    animation: expVisible ? `starDrop 0.55s cubic-bezier(0.22,1,0.36,1) ${0.1 + i * 0.1}s both` : "none",
                    filter: "drop-shadow(0 2px 6px rgba(200,169,126,0.5))",
                  }}>★</span>
                ))}
              </div>

              {/* Score */}
              <div style={{ marginTop: "16px", position: "relative", display: "inline-block" }}>
                <span style={{
                  fontFamily: "'Cormorant Garamond',serif",
                  fontSize: "clamp(52px,6vw,72px)",
                  fontWeight: 300, color: "#F5EFE6", lineHeight: 1,
                  letterSpacing: "-0.03em", display: "block",
                  animation: expVisible ? "ratingPulse 2.5s ease 0.8s infinite, scoreReveal 0.9s cubic-bezier(0.22,1,0.36,1) 0.55s both" : "none",
                }}>5.0</span>
                {/* Shimmer sweep */}
                <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", borderRadius: 4 }}>
                  <div style={{
                    position: "absolute", top: 0, left: 0, width: "40%", height: "100%",
                    background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)",
                    animation: expVisible ? "shimmerLine 0.8s ease 1.5s 1 forwards" : "none",
                  }} />
                </div>
              </div>

              {/* Label + badge */}
              <div style={{ animation: expVisible ? "badgeSlide 0.5s cubic-bezier(0.22,1,0.36,1) 0.9s both" : "none" }}>
                <p className="sans" style={{ fontSize: "10px", letterSpacing: "0.2em", color: "rgba(200,169,126,0.7)", fontWeight: 700, marginBottom: "10px" }}>
                  OUT OF 5.0
                </p>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(200,169,126,0.1)", border: "1px solid rgba(200,169,126,0.25)", borderRadius: "4px", padding: "8px 18px" }}>
                  <div style={{ display: "flex", gap: "3px" }}>
                    {[0,1,2,3,4].map(i => (
                      <div key={i} style={{ width: "4px", height: "14px", borderRadius: "2px", background: `rgba(200,169,126,${0.4 + i * 0.15})` }} />
                    ))}
                  </div>
                  <span className="sans" style={{ fontSize: "11px", color: "rgba(245,239,230,0.75)", fontWeight: 600, letterSpacing: "0.06em" }}>500+ Reviews</span>
                </div>
              </div>
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

      {/* REVIEWS: ANIMATED */}
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
            {(() => { const reviews = dbReviews.length > 0 ? dbReviews.map((r: any) => ({ name: r.name, text: r.comment, stars: r.rating })) : FALLBACK_REVIEWS; return reviews.map((r, i) => (
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
            )); })()}
          </div>

          {/* Active indicator dots */}
          <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "40px" }}>
            {(() => { const reviews = dbReviews.length > 0 ? dbReviews.map((r: any) => ({ name: r.name, text: r.comment, stars: r.rating })) : FALLBACK_REVIEWS; return reviews.map((_, i) => (
              <div key={i} onClick={() => setActiveReview(i)} style={{
                width: i === activeReview ? "24px" : "8px", height: "8px", borderRadius: "4px",
                background: i === activeReview ? gold : "rgba(200,169,126,0.3)",
                cursor: "pointer", transition: "all 0.4s ease",
              }} />
            )); })()}
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

      {/* GIFT CARDS: 2 column with KPI marketing */}
      {((salonSettings as any)?.landing_sections?.show_gift_cards !== false) && (
      <section id="gift-cards" style={{ background: dark, padding: "clamp(64px,8vw,120px) clamp(24px,6vw,100px)", position: "relative", overflow: "hidden" }}>
        <style>{`
          @keyframes cardFloat { 0%,100%{transform:translateY(0) rotate(-1deg)} 50%{transform:translateY(-8px) rotate(-1deg)} }
          @keyframes cardFloat2 { 0%,100%{transform:translateY(0) rotate(1.5deg)} 50%{transform:translateY(-6px) rotate(1.5deg)} }
          @keyframes cardFloat3 { 0%,100%{transform:translateY(0) rotate(-0.5deg)} 50%{transform:translateY(-10px) rotate(-0.5deg)} }
          .gc-tier-card { position:relative; overflow:hidden; border-radius:14px; padding:28px 24px; cursor:pointer; transition:transform 0.3s,box-shadow 0.3s; }
          .gc-tier-card::after { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(255,255,255,0.06) 0%,transparent 60%); pointer-events:none; }
          .gc-tier-card:hover { transform:translateY(-6px) !important; }
          .gc-chip { font-family:'Montserrat',sans-serif; font-size:9px; font-weight:700; letter-spacing:0.16em; padding:4px 10px; border-radius:20px; display:inline-block; }
        `}</style>

        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse at 20% 50%, rgba(200,169,126,0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(99,102,241,0.05) 0%, transparent 45%)", pointerEvents: "none" }} />

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "clamp(48px,6vw,80px)", position: "relative", zIndex: 1 }}>
          <div className="sans" style={{ fontSize: "10px", letterSpacing: "0.26em", color: gold, fontWeight: 700, marginBottom: "16px" }}>THE PERFECT PRESENT</div>
          <h2 style={{ fontSize: "clamp(36px,5vw,64px)", fontWeight: 400, color: "#F5EFE6", lineHeight: 1.05, marginBottom: "20px" }}>Gift the <em style={{ color: gold }}>Experience</em></h2>
          <p className="sans" style={{ fontSize: "14px", color: "rgba(245,239,230,0.55)", lineHeight: 1.85, maxWidth: "480px", margin: "0 auto 32px", fontWeight: 400 }}>
            Give someone you love a luxury beauty experience at Zolara. Valid for 12 months. Redeemable for any service.
          </p>
          <Link to="/buy-gift-card" className="btn-primary" style={{ textDecoration: "none", display: "inline-block", fontFamily: "'Montserrat',sans-serif", fontSize: "11px", fontWeight: 700, letterSpacing: "0.14em", color: "#fff", background: "linear-gradient(135deg,#8B6914,#C8A97E)", padding: "15px 40px", borderRadius: "1px", boxShadow: "0 8px 32px rgba(139,105,20,0.35)" }}>
            BUY A GIFT CARD
          </Link>
        </div>

        {/* Tier cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: "20px", maxWidth: "1100px", margin: "0 auto 64px", position: "relative", zIndex: 1 }}>
          {[
            { amount: "GHS 220", tier: "Silver", label: "SILVER", desc: "A perfect treat. Covers a wash, nail set or lashes.", gradient: "linear-gradient(145deg,#6B6B6B,#B8B8B8,#555)", glow: "rgba(180,180,180,0.15)", anim: "cardFloat 5s ease-in-out infinite", chip: "#9CA3AF" },
            { amount: "GHS 450", tier: "Gold", label: "GOLD", desc: "A full pampering session. Braids, manicure and more.", gradient: "linear-gradient(145deg,#6B4E0A,#C8A97E,#8B6914)", glow: "rgba(200,169,126,0.2)", anim: "cardFloat2 5.5s ease-in-out infinite 0.4s", chip: "#C8A97E" },
            { amount: "GHS 650", tier: "Platinum", label: "PLATINUM", desc: "Premium luxury. A full day of indulgence.", gradient: "linear-gradient(145deg,#2D3A45,#6B8090,#1E2830)", glow: "rgba(107,128,144,0.15)", anim: "cardFloat 6s ease-in-out infinite 0.2s", chip: "#94A3B8" },
            { amount: "GHS 1,000", tier: "Diamond", label: "DIAMOND", desc: "The ultimate gift. Use across 3 visits. Balance carries forward.", gradient: "linear-gradient(145deg,#1a1660,#5B54C8,#12104A)", glow: "rgba(99,102,241,0.25)", anim: "cardFloat3 4.5s ease-in-out infinite 0.6s", chip: "#818CF8" },
          ].map(t => (
            <div key={t.tier} className="gc-tier-card" style={{ background: t.gradient, boxShadow: `0 20px 48px ${t.glow}, 0 2px 8px rgba(0,0,0,0.4)`, animation: t.anim }}>
              {/* Decorative circles */}
              <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
              <div style={{ position: "absolute", bottom: -12, left: -12, width: 50, height: 50, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
              {/* Card top */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", position: "relative" }}>
                <div>
                  <div className="sans" style={{ fontSize: "8px", letterSpacing: "0.22em", color: "rgba(255,255,255,0.5)", marginBottom: "8px", fontWeight: 600 }}>ZOLARA</div>
                  <div className="gc-chip" style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.75)", border: `1px solid ${t.chip}44` }}>{t.label}</div>
                </div>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.3)", overflow: "hidden", background: "#fff" }}>
                   <img src={LOGO} alt="Z" style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
                </div>
              </div>
              {/* Amount */}
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(28px,3vw,38px)", fontWeight: 300, color: "white", lineHeight: 1, marginBottom: "14px", letterSpacing: "-0.01em" }}>{t.amount}</div>
              <div style={{ height: "1px", background: "rgba(255,255,255,0.12)", marginBottom: "14px" }} />
              <p className="sans" style={{ fontSize: "12px", color: "rgba(255,255,255,0.62)", lineHeight: 1.65, fontWeight: 400, margin: 0 }}>{t.desc}</p>
            </div>
          ))}
        </div>

        {/* Features row */}
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "1px", background: "rgba(200,169,126,0.1)", borderRadius: "4px", overflow: "hidden", position: "relative", zIndex: 1 }}>
          {[
            { icon: "✦", title: "Works Like Cash", body: "Redeemable for any service across our full menu." },
            { icon: "◈", title: "12-Month Validity", body: "Gift cards stay active for a full year from purchase." },
            { icon: "◉", title: "Instant Delivery", body: "Digital cards arrive by email within minutes." },
            { icon: "◇", title: "Grace Buffer Included", body: "Each card covers slight overages. Your recipient is never turned away." },
          ].map(f => (
            <div key={f.title} style={{ background: "rgba(255,255,255,0.02)", padding: "24px 22px" }}>
              <div style={{ color: gold, fontSize: "16px", marginBottom: "10px" }}>{f.icon}</div>
              <div className="sans" style={{ fontSize: "11px", fontWeight: 700, color: "rgba(245,239,230,0.85)", letterSpacing: "0.04em", marginBottom: "6px" }}>{f.title}</div>
              <div className="sans" style={{ fontSize: "12px", color: "rgba(245,239,230,0.45)", lineHeight: 1.65, fontWeight: 400 }}>{f.body}</div>
            </div>
          ))}
        </div>
      </section>
      )}
      {/* ── LOYALTY SECTION ─────────────────────────────── */}
      <section id="loyalty" style={{ padding: "clamp(64px,8vw,120px) clamp(24px,6vw,100px)", background: cream, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: "-60px", top: "50%", transform: "translateY(-50%)", fontSize: "380px", color: "rgba(200,169,126,0.045)", fontWeight: 700, lineHeight: 1, pointerEvents: "none" }}>◈</div>
        <style>{`
          @keyframes lyl-glow { 0%,100%{opacity:.45} 50%{opacity:1} }
          .lyl-stamp { aspect-ratio:1; border-radius:5px; display:flex; align-items:center; justify-content:center; }
          .lyl-stamp.on  { background:linear-gradient(135deg,#8B6914,#C8A97E); box-shadow:0 3px 10px rgba(200,169,126,0.3); }
          .lyl-stamp.off { background:rgba(200,169,126,0.08); border:1px solid rgba(200,169,126,0.18); }
          .lyl-stamp.gift { background:linear-gradient(135deg,#1e3a5c,#3b7dd8); box-shadow:0 3px 10px rgba(59,125,216,0.3); }
        `}</style>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(40px,6vw,100px)", alignItems: "center", maxWidth: "1100px", margin: "0 auto", position: "relative", zIndex: 1 }} className="landing-experience-grid">

          {/* Left */}
          <div>
            <div className="sans" style={{ fontSize: "10px", letterSpacing: "0.26em", color: gold, fontWeight: 700, marginBottom: "16px" }}>LOYALTY REWARDS</div>
            <h2 style={{ fontSize: "clamp(32px,4.5vw,54px)", fontWeight: 400, lineHeight: 1.15, marginBottom: "24px" }}>Your Loyalty,<br /><em>Beautifully Rewarded</em></h2>
            <p className="sans" style={{ fontSize: "14.5px", color: "#3D2E1A", lineHeight: 1.95, marginBottom: "36px", fontWeight: 400 }}>
              Every GHS 100 you spend earns a stamp. Hit 20 stamps and receive GHS 50 off your next service. No app needed.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "36px" }}>
              {[
                ["Every GHS 100 spent earns 1 stamp", "◈"],
                ["20 stamps unlocks GHS 50 off", "✦"],
                ["Double stamps every birthday month", "❋"],
                ["SMS notification when reward is ready", "◉"],
              ].map(([text, icon], idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "14px", background: "#fff", border: "1px solid rgba(200,169,126,0.18)", borderRadius: "8px", padding: "14px 18px", boxShadow: "0 2px 12px rgba(28,22,14,0.05)" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg,#8B6914,#C8A97E)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ color: "#fff", fontSize: "12px" }}>{icon}</span>
                  </div>
                  <span className="sans" style={{ fontSize: "13px", color: "#3D2E1A", lineHeight: 1.65, fontWeight: 400, paddingTop: "5px" }}>{text}</span>
                </div>
              ))}
            </div>

            <Link to="/book" className="btn-primary" style={{ textDecoration: "none", display: "inline-block", fontFamily: "'Montserrat',sans-serif", fontSize: "11px", fontWeight: 700, letterSpacing: "0.14em", color: "#fff", background: "linear-gradient(135deg,#8B6914,#C8A97E)", padding: "17px 44px", borderRadius: "1px", boxShadow: "0 8px 32px rgba(139,105,20,0.3)" }}>
              START EARNING STAMPS
            </Link>
          </div>

          {/* Right: stamp card */}
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", inset: "-20px", background: "radial-gradient(circle at 50% 50%, rgba(200,169,126,0.1) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
            <div style={{ background: "linear-gradient(150deg,#2C2416 0%,#1A1008 60%,#251D0E 100%)", borderRadius: "4px", padding: "44px 36px", position: "relative", overflow: "hidden", boxShadow: "0 32px 80px rgba(28,22,14,0.35)" }}>
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 0%, rgba(200,169,126,0.18) 0%, transparent 55%)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg,transparent,#C8A97E,transparent)" }} />
              <div style={{ position: "absolute", top: "20px", right: "20px", width: "48px", height: "48px", border: "2px solid rgba(200,169,126,0.5)", borderRadius: "50%", overflow: "hidden", background: "#fff" }}>
                 <img src={LOGO} alt="Zolara" style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
              </div>

              {/* Card title */}
              <div style={{ marginBottom: "28px", position: "relative", zIndex: 1 }}>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "20px", fontWeight: 500, color: "#F5EFE6", marginBottom: "4px" }}>Loyalty Card</div>
                <div className="sans" style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.22em", color: gold }}>ZOLARA BEAUTY STUDIO</div>
              </div>

              {/* Stamps */}
              <div className="lyl-stamp-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "8px", marginBottom: "20px", position: "relative", zIndex: 1 }}>
                {Array.from({length:20}, (_,i) => (
                  <div key={i} className={"lyl-stamp" + (i<15?" on":i===19?" gift":" off")} style={{ height: "36px", fontSize: 13, color: i<15?"rgba(255,255,255,0.85)":i===19?"#90CAF9":"transparent" }}>
                    {i < 15 ? "✦" : i === 19 ? "★" : ""}
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <div style={{ height: "3px", background: "rgba(255,255,255,0.08)", borderRadius: "2px", marginBottom: "14px", overflow: "hidden", position: "relative", zIndex: 1 }}>
                <div style={{ height: "100%", width: "75%", background: "linear-gradient(90deg,#6B4E0A,#C8A97E)", borderRadius: "2px", animation: "lyl-glow 3s ease-in-out infinite" }} />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 1 }}>
                <span className="sans" style={{ fontSize: "10px", color: "rgba(245,239,230,0.4)" }}>15 of 20 stamps</span>
                <span className="sans" style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", color: gold, background: "rgba(200,169,126,0.12)", border: "1px solid rgba(200,169,126,0.25)", borderRadius: "20px", padding: "4px 14px" }}>GHS 50 REWARD</span>
              </div>

              {/* Divider + tier row */}
              <div style={{ marginTop: "28px", paddingTop: "24px", borderTop: "1px solid rgba(200,169,126,0.15)", position: "relative", zIndex: 1 }}>
                <div className="lyl-tier-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px", textAlign: "center" }}>
                  {[["Bronze","#CD7F32"],["Silver","#9CA3AF"],["Gold","#C8A97E"],["Diamond","#818CF8"]].map(([name,col]) => (
                    <div key={name}>
                      <div className="sans" style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.14em", color: col, opacity: 0.9 }}>{name.toUpperCase()}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {((salonSettings as any)?.landing_sections?.show_subscriptions === true) && (
      <>
      {/* ── SUBSCRIPTIONS ─────────────────────────────── */}
      <section id="subscriptions" style={{ padding: "clamp(64px,8vw,120px) clamp(24px,6vw,100px)", background: cream, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: "-40px", top: "50%", transform: "translateY(-50%)", fontSize: "320px", color: "rgba(200,169,126,0.04)", fontWeight: 700, lineHeight: 1, pointerEvents: "none" }}>✦</div>
        <div style={{ textAlign: "center", marginBottom: "clamp(40px,5vw,64px)", position: "relative", zIndex: 1 }}>
          <div className="sans" style={{ fontSize: "10px", letterSpacing: "0.26em", color: gold, fontWeight: 700, marginBottom: "16px" }}>MONTHLY PLANS</div>
          <h2 style={{ fontSize: "clamp(32px,4.5vw,56px)", fontWeight: 400, lineHeight: 1.1, marginBottom: "16px" }}>Beauty on <em>Subscription</em></h2>
          <p className="sans" style={{ fontSize: "14px", color: "#3D2E1A", lineHeight: 1.85, maxWidth: "440px", margin: "0 auto", fontWeight: 400 }}>
            Pay once a month, visit as often as your plan allows. Priority booking, fixed price, always ready.
          </p>
        </div>

        {(subPlans.length > 0 ? subPlans : [
          { id:"1", name:"Essential", description:"Two services per month. Perfect for maintaining your look.", price:300, billing_cycle:"monthly", max_usage_per_cycle:2 },
          { id:"2", name:"Premium",   description:"Four services per month. For the client who never misses a week.", price:500, billing_cycle:"monthly", max_usage_per_cycle:4 },
          { id:"3", name:"Luxury",    description:"Unlimited visits all month. Full access to everything Zolara offers.", price:800, billing_cycle:"monthly", max_usage_per_cycle:99 },
        ]).length > 0 && (
          <div style={{ maxWidth: "1100px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "20px", position: "relative", zIndex: 1, marginBottom: "48px" }}>
            {(subPlans.length > 0 ? subPlans : [
              { id:"1", name:"Essential", description:"Two services per month. Perfect for maintaining your look.", price:300, billing_cycle:"monthly", max_usage_per_cycle:2 },
              { id:"2", name:"Premium",   description:"Four services per month. For the client who never misses a week.", price:500, billing_cycle:"monthly", max_usage_per_cycle:4 },
              { id:"3", name:"Luxury",    description:"Unlimited visits all month. Full access to everything Zolara offers.", price:800, billing_cycle:"monthly", max_usage_per_cycle:99 },
            ]).map((plan: any, idx: number) => {
              const icons = ["◇","✦","◉","◆"];
              const featured = idx === 1;
              const visits = plan.max_usage_per_cycle >= 99 ? "Unlimited" : plan.max_usage_per_cycle + " visits";
              return (
                <div key={plan.id} style={{
                  background: featured ? "linear-gradient(150deg,#2C2416,#1A1008)" : "#fff",
                  border: featured ? "1px solid rgba(200,169,126,0.35)" : "1px solid rgba(200,169,126,0.18)",
                  borderRadius: "4px", padding: "36px 28px", position: "relative", overflow: "hidden",
                  boxShadow: featured ? "0 24px 60px rgba(28,22,14,0.3)" : "0 4px 20px rgba(28,22,14,0.06)",
                }}>
                  {featured && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg,transparent,#C8A97E,transparent)" }} />}
                  {featured && (
                    <div style={{ position: "absolute", top: "16px", right: "16px" }}>
                      <span className="sans" style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.18em", color: "#1C160E", background: gold, padding: "4px 10px", borderRadius: "20px" }}>POPULAR</span>
                    </div>
                  )}
                  <div style={{ color: featured ? gold : goldDark, fontSize: "18px", marginBottom: "16px" }}>{icons[idx % icons.length]}</div>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "22px", fontWeight: 600, color: featured ? "#F5EFE6" : dark, marginBottom: "4px" }}>{plan.name}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "6px" }}>
                    <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "36px", fontWeight: 300, color: featured ? gold : goldDark, lineHeight: 1 }}>GHS {Number(plan.price).toLocaleString()}</span>
                    <span className="sans" style={{ fontSize: "11px", color: featured ? "rgba(245,239,230,0.45)" : "#78716C", fontWeight: 400 }}>/ {plan.billing_cycle || "month"}</span>
                  </div>
                  <div className="sans" style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", color: featured ? gold : goldDark, marginBottom: "16px" }}>{visits.toUpperCase()} PER MONTH</div>
                  <div style={{ height: "1px", background: "rgba(200,169,126,0.15)", marginBottom: "16px" }} />
                  <p className="sans" style={{ fontSize: "13px", color: featured ? "rgba(245,239,230,0.6)" : "#4A3520", lineHeight: 1.75, fontWeight: 400, marginBottom: "24px" }}>{plan.description || ""}</p>
                  <Link to="/book" style={{
                    display: "block", textAlign: "center", textDecoration: "none",
                    fontFamily: "'Montserrat',sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em",
                    color: featured ? "#1C160E" : "#fff",
                    background: featured ? "linear-gradient(135deg,#C8A97E,#8B6914)" : "linear-gradient(135deg,#8B6914,#C8A97E)",
                    padding: "12px 24px", borderRadius: "1px",
                  }}>ENQUIRE NOW</Link>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ maxWidth: "680px", margin: "0 auto", background: "#fff", border: "1px solid rgba(200,169,126,0.2)", borderRadius: "4px", padding: "28px 32px", textAlign: "center", boxShadow: "0 4px 20px rgba(28,22,14,0.06)", position: "relative", zIndex: 1 }}>
          <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "22px", fontWeight: 400, color: dark, marginBottom: "8px" }}>Custom plans available for groups and businesses</p>
          <p className="sans" style={{ fontSize: "13px", color: "#78716C", lineHeight: 1.75, marginBottom: "20px", fontWeight: 400 }}>Bridal parties, corporate teams and student groups get tailored packages. Call us to discuss.</p>
          <a href="https://wa.me/233594365314" target="_blank" rel="noreferrer" className="sans" style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", color: goldDark, textDecoration: "none" }}>
            CONTACT US ON WHATSAPP →
          </a>
        </div>
      </section>
      </>
      )}

      <section id="visit-us" style={{ padding: "clamp(64px,8vw,120px) clamp(24px,6vw,100px)", background: cream, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 30% 70%, rgba(200,169,126,0.09) 0%, transparent 50%)", pointerEvents: "none" }} />
        <div style={{ textAlign: "center", marginBottom: "64px", position: "relative", zIndex: 1 }}>
          <div className="sans" style={{ fontSize: "10px", letterSpacing: "0.26em", color: gold, fontWeight: 700, marginBottom: "16px" }}>FIND US</div>
          <h2 style={{ fontSize: "clamp(36px,5vw,60px)", fontWeight: 400 }}>Come <em>Visit Us</em></h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px", maxWidth: "900px", margin: "0 auto 60px", position: "relative", zIndex: 1 }}>
          {[
            { icon: "◉", label: "LOCATION", lines: ["Sakasaka, Opposite CalBank", "Tamale, Ghana"] },
            { icon: "◈", label: "CALL US", lines: ["059 436 5314", "020 884 8707"], tel: true },
            { icon: "◇", label: "HOURS", lines: ["Monday – Saturday", "8:30 AM – 9:00 PM"] },
            { icon: "✦", label: "CLOSED", lines: ["Every Sunday", "We rest so we can serve you better"] },
          ].map(item => (
            <div key={item.label} className="visit-card" style={{ background: mid, border: "1px solid rgba(200,169,126,0.22)", borderRadius: "3px", padding: "40px 28px", textAlign: "center", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "48px", height: "2px", background: "linear-gradient(90deg, transparent, #C8A97E, transparent)" }} />
              <div style={{ fontSize: "26px", color: gold, marginBottom: "18px" }}>{item.icon}</div>
              <p className="sans" style={{ fontSize: "10px", letterSpacing: "0.22em", color: gold, fontWeight: 700, marginBottom: "14px" }}>{item.label}</p>
              {item.lines.map(l => (item as any).tel
  ? <a key={l} href={`tel:+233${l.replace(/^0/, "").replace(/\s/g,"")}`} className="sans" style={{ fontSize: "14px", color: dark, lineHeight: 1.75, fontWeight: 400, textDecoration: "none", display: "block" }}>{l}</a>
  : <p key={l} className="sans" style={{ fontSize: "14px", color: dark, lineHeight: 1.75, fontWeight: 400 }}>{l}</p>
)}
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
      <footer style={{ background: "linear-gradient(160deg,#1A1208,#0D0A06)", borderTop: "1px solid rgba(200,169,126,0.14)" }}>

        {/* Main footer */}
        <div style={{ padding: "clamp(36px,5vw,60px) clamp(24px,6vw,100px)", display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: "clamp(24px,4vw,60px)", alignItems: "start" }} className="landing-footer-grid">

          {/* Brand */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <div style={{ width: "38px", height: "38px", borderRadius: "50%", border: "1.5px solid rgba(200,169,126,0.55)", overflow: "hidden", flexShrink: 0 }}>
                 <img src={LOGO} alt="Zolara" style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
              </div>
              <div>
                <div className="sans" style={{ fontSize: "15px", fontWeight: 800, letterSpacing: "0.2em", color: cream, lineHeight: 1 }}>ZOLARA</div>
                <div className="sans" style={{ fontSize: "8px", letterSpacing: "0.2em", color: gold, marginTop: "2px", fontWeight: 600 }}>BEAUTY STUDIO</div>
              </div>
            </div>
            <p className="sans" style={{ fontSize: "12px", color: "rgba(245,239,230,0.55)", lineHeight: 1.8, marginBottom: "14px", maxWidth: "240px", fontWeight: 400 }}>
              Tamale's premier luxury beauty studio.
            </p>
            <div className="sans" style={{ fontSize: "12px", color: "rgba(245,239,230,0.55)", lineHeight: 1.9 }}>
              <div>Sakasaka, Opposite CalBank, Tamale</div>
              <div><a href="tel:+233594365314" style={{ color: "inherit", textDecoration: "none" }}>059 436 5314</a> · <a href="tel:+233208848707" style={{ color: "inherit", textDecoration: "none" }}>020 884 8707</a></div>
              <div>Mon – Sat · 8:30 AM – 9:00 PM</div>
            </div>
          </div>

          {/* Navigate */}
          <div>
            <p className="sans" style={{ fontSize: "9px", letterSpacing: "0.22em", color: gold, fontWeight: 700, marginBottom: "16px" }}>NAVIGATE</p>
            {[["#services","Services"],["#experience","Experience"],["#gift-cards","Gift Cards"],["#loyalty","Loyalty"],["#subscriptions","Plans"],["#visit-us","Visit Us"]].map(([href,label]) => (
              <div key={label} style={{ marginBottom: "11px" }}>
                <a href={href} className="sans" style={{ fontSize: "13px", color: "rgba(245,239,230,0.65)", textDecoration: "none", fontWeight: 400, transition: "color 0.2s" }}
                  onMouseEnter={e => (e.target as HTMLElement).style.color = gold}
                  onMouseLeave={e => (e.target as HTMLElement).style.color = "rgba(245,239,230,0.65)"}>{label}</a>
              </div>
            ))}
          </div>

          {/* Social */}
          <div>
            <p className="sans" style={{ fontSize: "9px", letterSpacing: "0.22em", color: gold, fontWeight: 700, marginBottom: "16px" }}>FOLLOW US</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[
                { label: "Instagram", handle: "@zolarastudio", href: "https://www.instagram.com/zolarastudio", icon: "IG" },
                { label: "TikTok",    handle: "@zolarastudio", href: "https://www.tiktok.com/@zolarastudio",    icon: "TK" },
                { label: "Facebook",  handle: "Zolara Studio", href: "https://www.facebook.com/zolarastudio",  icon: "FB" },
                { label: "WhatsApp",  handle: "Message us",    href: "https://wa.me/233594365314",             icon: "WA" },
              ].map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", transition: "all 0.2s", padding: "6px 0" }}
                  onMouseEnter={e => { const el = e.currentTarget; el.style.opacity="1"; }}
                  onMouseLeave={e => { const el = e.currentTarget; el.style.opacity="1"; }}>
                  <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: "rgba(200,169,126,0.1)", border: "1px solid rgba(200,169,126,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background="rgba(200,169,126,0.2)"; (e.currentTarget as HTMLElement).style.borderColor="rgba(200,169,126,0.5)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background="rgba(200,169,126,0.1)"; (e.currentTarget as HTMLElement).style.borderColor="rgba(200,169,126,0.2)"; }}>
                    <span className="sans" style={{ fontSize: "8px", fontWeight: 700, color: gold, letterSpacing: "0.05em" }}>{s.icon}</span>
                  </div>
                  <div>
                    <div className="sans" style={{ fontSize: "12px", fontWeight: 600, color: "rgba(245,239,230,0.75)", lineHeight: 1.2 }}>{s.label}</div>
                    <div className="sans" style={{ fontSize: "10px", color: "rgba(245,239,230,0.4)", lineHeight: 1.2 }}>{s.handle}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: "1px solid rgba(200,169,126,0.1)", padding: "16px clamp(24px,6vw,100px)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <p className="sans" style={{ fontSize: "11px", color: "rgba(245,239,230,0.3)", fontWeight: 400 }}>
            © {new Date().getFullYear()} Zolara Beauty Studio
          </p>
          <Link to="/app/auth" className="sans" style={{ fontSize: "10px", fontWeight: 600, color: "rgba(200,169,126,0.5)", textDecoration: "none", letterSpacing: "0.14em", padding: "6px 16px", border: "1px solid rgba(200,169,126,0.18)", borderRadius: "20px", transition: "all 0.25s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = gold; (e.currentTarget as HTMLElement).style.borderColor = "rgba(200,169,126,0.45)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(200,169,126,0.5)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(200,169,126,0.18)"; }}>
            STAFF LOGIN
          </Link>
        </div>
      </footer>
      <AmandaWidget />
    </div>
  );
}
