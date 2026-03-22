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
  const [visitVisible, setVisitVisible] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [pageLoaded, setPageLoaded] = useState(false);
  const visitRef = useRef<HTMLDivElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [salonSettings, setSalonSettings] = useState<any>(null);
  const [announcementDismissed, setAnnouncementDismissed] = useState(() => {
    try { return localStorage.getItem("zolara_announcement_dismissed") === "true"; } catch { return false; }
  });
  const dismissAnnouncement = () => {
    setAnnouncementDismissed(true);
    try { localStorage.setItem("zolara_announcement_dismissed", "true"); } catch {}
  };
  const [promoGiftCards, setPromoGiftCards] = useState<any[]>([]);
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
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
      const el = document.documentElement;
      const progress = (el.scrollTop) / (el.scrollHeight - el.clientHeight);
      setScrollProgress(Math.min(1, Math.max(0, progress)));
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setPageLoaded(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const container = document.getElementById("kpiParticles");
    if (!container) return;
    const configs = [
      ...Array.from({length:12}, () => ({x:8+Math.random()*84,b:Math.random()*12,w:'2px',h:'2px',bg:'#C8A97E',d:3+Math.random()*4,dl:Math.random()*7})),
      ...Array.from({length:7},  () => ({x:15+Math.random()*70,b:Math.random()*18,w:'1.5px',h:'1.5px',bg:'rgba(245,239,230,0.6)',d:4+Math.random()*3,dl:Math.random()*6})),
      ...Array.from({length:3},  () => ({x:20+Math.random()*60,b:Math.random()*8,w:'3px',h:'3px',bg:'rgba(200,169,126,0.5)',d:5+Math.random()*3,dl:Math.random()*8})),
    ];
    configs.forEach(cfg => {
      const p = document.createElement("div");
      p.className = "kpi-particle";
      p.style.cssText = `left:${cfg.x}%;bottom:${cfg.b}%;width:${cfg.w};height:${cfg.h};background:${cfg.bg};--kd:${cfg.d}s;--kdl:${cfg.dl}s`;
      container.appendChild(p);
    });
    return () => { if (container) container.innerHTML = ""; };
  }, []);

  useEffect(() => {
    supabase.from("settings").select("open_time, close_time, closed_dates, landing_sections, promo_banner, business_phone, business_phone_2, whatsapp_number, instagram_handle, tiktok_handle, facebook_handle, cancellation_policy, lateness_fee, student_discount, announcement, gift_card_prices, max_bookings_per_slot").limit(1).maybeSingle()
      .then(({ data }) => { if (data) setSalonSettings(data); });
    // Load visible reviews from DB
    (supabase as any).from("reviews").select("*").eq("visible", true).order("created_at", { ascending: false })
      .then(({ data }: any) => { if (data && data.length > 0) setDbReviews(data); });
    // Load active promotional gift card types
    (supabase as any).from("promo_gift_card_types").select("*").eq("is_active", true)
      .then(({ data }: any) => {
        const now = new Date();
        const active = (data || []).filter((p: any) => {
          if (p.expires_at && new Date(p.expires_at) < now) return false;
          if (p.max_uses && p.uses_count >= p.max_uses) return false;
          return true;
        });
        setPromoGiftCards(active);
      });
  }, []);

  useEffect(() => {
    const reviews = dbReviews.length > 0 ? dbReviews.map((r: any) => ({ name: r.name, text: r.comment, stars: r.rating })) : FALLBACK_REVIEWS;
    const iv = setInterval(() => setActiveReview(r => (r + 1) % reviews.length), 4500);
    return () => clearInterval(iv);
  }, []);

  // Urgency: count this week's bookings
  const [todayBookings, setTodayBookings] = useState(0);
  const [todayBraidingBookings, setTodayBraidingBookings] = useState(0);
  useEffect(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    // Total bookings today
    supabase.from("bookings")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending","confirmed"])
      .eq("preferred_date", todayStr)
      .then(({ count }: any) => { if (count != null) setTodayBookings(count); });
    // Braiding bookings today
    (supabase as any).from("bookings")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending","confirmed"])
      .eq("preferred_date", todayStr)
      .ilike("service_name", "%braid%")
      .then(({ count }: any) => { if (count != null) setTodayBraidingBookings(count); });
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
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisitVisible(true); }, { threshold: 0.1 });
    if (visitRef.current) obs.observe(visitRef.current);
    return () => obs.disconnect();
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

  // Compute live open/closed status: null means settings not loaded yet (show nothing)
  const isOpenNow = (() => {
    if (salonSettings === null) return null; // not loaded yet, don't flash open
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
    <div className={"page-fade" + (pageLoaded ? " loaded" : "")} style={{ fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif", background: cream, color: dark, overflowX: "hidden" }}>
      {/* SCROLL PROGRESS BAR */}
      <div style={{ position: "fixed", top: 0, left: 0, zIndex: 9999, height: "2px", width: (scrollProgress * 100) + "%", background: "linear-gradient(90deg,#8B6914,#C8A97E,#D4B896)", transition: "width 0.1s linear", pointerEvents: "none" }} />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500&family=Montserrat:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        /* Force lining numerals: Cormorant Garamond defaults to oldstyle (1 looks like I) */
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
        @keyframes kpiGlowRing { 0%,100% { box-shadow: 0 0 0 0 rgba(200,169,126,0), 0 22px 60px rgba(200,169,126,0.10); } 50% { box-shadow: 0 0 0 10px rgba(200,169,126,0.07), 0 38px 90px rgba(200,169,126,0.26); } }
        @keyframes kpiShimmer { 0% { left:-100%; opacity:0; } 14% { opacity:1; } 62% { left:160%; opacity:0.8; } 76%,100% { left:160%; opacity:0; } }
        @keyframes kpiBorderPulse { 0%,100% { opacity:0.4; } 50% { opacity:1; } }
        @keyframes kpiParticle { 0% { opacity:0; transform:translateY(0) scale(0); } 15% { opacity:0.85; } 75% { opacity:0.25; } 100% { opacity:0; transform:translateY(-88px) scale(0.2); } }
        @keyframes kpiDivBreath { 0%,100% { width:36px; opacity:0.5; } 50% { width:54px; opacity:1; } }
        @keyframes kpiLogoBreath { 0%,100% { box-shadow:0 0 0 4px rgba(200,169,126,0.13),0 3px 14px rgba(200,169,126,0.09); } 50% { box-shadow:0 0 0 7px rgba(200,169,126,0.22),0 7px 28px rgba(200,169,126,0.26); } }
        @keyframes kpiInfoReveal { 0% { opacity:0; transform:translateX(-5px); } 8%,82% { opacity:1; transform:none; } 93%,100% { opacity:0; transform:translateX(4px); } }
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
        .hero-floating-card { animation: cardFloat 7s ease-in-out infinite; }
        .hero-floating-card::before { content:''; position:absolute; top:0; left:-100%; width:60%; height:100%; background:linear-gradient(108deg,transparent 0%,rgba(200,169,126,0.04) 25%,rgba(245,239,230,0.18) 50%,rgba(200,169,126,0.04) 75%,transparent 100%); animation:kpiShimmer 4.5s ease-in-out infinite; pointer-events:none; z-index:8; border-radius:5px; }
        .hero-floating-card::after { content:''; position:absolute; inset:0; border-radius:5px; border:1px solid transparent; background:linear-gradient(rgba(252,249,244,0),rgba(252,249,244,0)) padding-box, linear-gradient(160deg,rgba(200,169,126,0.12),rgba(200,169,126,0.72),rgba(245,239,230,0.35),rgba(200,169,126,0.72),rgba(200,169,126,0.12)) border-box; animation:kpiBorderPulse 4s ease-in-out infinite; pointer-events:none; z-index:9; }
        .hero-floating-card-wrapper { animation: kpiGlowRing 4s ease-in-out infinite; }
        .kpi-div { animation:kpiDivBreath 4s ease-in-out infinite; }
        .kpi-logo { animation:kpiLogoBreath 4s ease-in-out infinite; }
        .kpi-info { opacity:0; animation:kpiInfoReveal 9s ease-in-out infinite; }
        .kpi-info:nth-child(1) { animation-delay:0.3s; }
        .kpi-info:nth-child(2) { animation-delay:0.85s; }
        .kpi-info:nth-child(3) { animation-delay:1.4s; }
        .kpi-particle { position:absolute; border-radius:50%; animation:kpiParticle var(--kd,4s) var(--kdl,0s) ease-in-out infinite; opacity:0; pointer-events:none; }
        .live-dot { width: 8px; height: 8px; border-radius: 50%; background: #4ade80; animation: pulseGreen 2s ease-in-out infinite; flex-shrink: 0; }
        .visit-card { transition: transform 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease; }
        .visit-card:hover { transform: translateY(-7px); box-shadow: 0 24px 60px rgba(28,22,14,0.13); border-color: rgba(200,169,126,0.5) !important; }
        .gift-card-tile { transition: transform 0.35s ease, box-shadow 0.35s ease; cursor: pointer; }
        .gift-card-tile:hover { transform: translateY(-9px) scale(1.03); box-shadow: 0 36px 72px rgba(0,0,0,0.32); }
        .kpi-card { transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .kpi-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(28,22,14,0.1) !important; }
        @keyframes visitCardIn { from { opacity:0; transform:translateY(36px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        .visit-card-reveal { opacity:0; }
        .visit-cards-visible .visit-card-reveal { animation: visitCardIn 0.65s cubic-bezier(0.16,1,0.3,1) forwards; }
        @keyframes parallaxFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        .section-divider { height:1px; background:linear-gradient(90deg,transparent,rgba(200,169,126,0.3),transparent); margin:0; }
        .rev-card-visible { animation: reviewPop 0.7s cubic-bezier(0.16,1,0.3,1) forwards !important; }
        .review-card { cursor:default; }
        .review-card:hover { transform:translateY(-6px); box-shadow:0 24px 60px rgba(200,169,126,0.15); border-color:rgba(200,169,126,0.55) !important; }
        .orb-bg { position: absolute; border-radius: 50%; pointer-events: none; }
        @keyframes pageFadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
        .page-fade { opacity:0; }
        .page-fade.loaded { animation: pageFadeIn 0.5s cubic-bezier(0.16,1,0.3,1) forwards; }
        .nav-glass { backdrop-filter: blur(20px) saturate(1.4); -webkit-backdrop-filter: blur(20px) saturate(1.4); }
        .nav-link-item { position:relative; }
        .nav-link-item::after { content:''; position:absolute; bottom:-3px; left:0; width:0; height:1px; background:#C8A97E; transition:width 0.3s ease; }
        .nav-link-item:hover::after { width:100%; }
        .nav-link-item:hover { color:#C8A97E !important; }
        .section-label { font-size:9px; font-weight:700; letter-spacing:0.28em; color:#C8A97E; text-transform:uppercase; margin-bottom:14px; display:block; }
        .heading-xl { font-size:clamp(36px,5.2vw,68px); font-weight:300; line-height:0.94; letter-spacing:-0.015em; }
        .heading-lg { font-size:clamp(28px,3.8vw,52px); font-weight:300; line-height:1.05; letter-spacing:-0.01em; }
        .body-copy { font-size:14px; line-height:1.95; color:#3D2E1A; font-family:'Montserrat',sans-serif; font-weight:400; }
        .craft-card { border-top:1px solid rgba(200,169,126,0.18); padding:36px 0; display:grid; grid-template-columns:1fr 1fr; align-items:center; gap:24px; transition:background 0.3s,padding 0.3s,margin 0.3s,border-color 0.3s,opacity 0.65s cubic-bezier(0.16,1,0.3,1),transform 0.65s cubic-bezier(0.16,1,0.3,1); cursor:pointer; opacity:0; transform:translateY(28px); }
        .craft-card.craft-visible { opacity:1; transform:none; }
        .craft-card:last-child { border-bottom:1px solid rgba(200,169,126,0.18); }
        .craft-card:hover { background:rgba(200,169,126,0.06); margin:0 -28px; padding:36px 28px; border-radius:6px; border-top-color:transparent; box-shadow:0 4px 32px rgba(200,169,126,0.08); }
        .craft-card:hover+.craft-card { border-top-color:transparent; }
        .craft-num { font-size:clamp(42px,5.5vw,72px); font-weight:600; line-height:1; background:linear-gradient(135deg,#8B6914,#C8A97E); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; opacity:0.7; transition:opacity 0.3s; font-family:'Cormorant Garamond',serif; }
        .craft-card:hover .craft-num { opacity:1; }
        .craft-arrow { opacity:0; transform:translateX(-10px); transition:all 0.3s ease; }
        .craft-card:hover .craft-arrow { opacity:1; transform:none; }
        .craft-tag { display:inline-block; padding:3px 10px; background:rgba(200,169,126,0.12); border:1px solid rgba(200,169,126,0.3); border-radius:20px; font-size:9px; font-weight:700; letter-spacing:0.18em; color:#8B6914; text-transform:uppercase; margin-bottom:8px; transition:background 0.2s,border-color 0.2s; font-family:'Montserrat',sans-serif; }
        .craft-card:hover .craft-tag { background:linear-gradient(135deg,#8B6914,#C8A97E); border-color:transparent; color:white; }
        @keyframes craftIn { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:none; } }
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
          .craft-card { grid-template-columns:1fr !important; gap:16px !important; }
          .visit-cards-visible .visit-card-reveal { animation-duration:0.5s; }
        }
        @media (max-width: 480px) {
          .lyl-stamp-grid { grid-template-columns: repeat(4,1fr) !important; gap: 6px !important; }
          .lyl-stamp-grid > div { height: 30px !important; font-size: 11px !important; }
          .craft-card:hover { margin:0 !important; padding:20px 0 !important; }
          .hero-actions-wrap { flex-direction:column !important; }
          .hero-actions-wrap a { width:100% !important; text-align:center !important; }
          .exp-moment-grid { grid-template-columns:1fr !important; }
        }
      `}</style>

      {/* PROMO BANNER */}
      {(() => {
        const pb = (salonSettings as any)?.promo_banner;
        if (!pb?.enabled || !pb?.message) return null;
        if (pb.expires_date) {
          const expiry = new Date(`${pb.expires_date}T${pb.expires_time || "23:59"}:00`);
          if (expiry < new Date()) return null;
        }

        const colors: Record<string,{a:string;b:string;c:string}> = {
          gold:   { a:"#6B4E0A", b:"#D4AF6A", c:"#8B6914" },
          dark:   { a:"#0D0A06", b:"#5C4A2A", c:"#1C160E" },
          green:  { a:"#022C22", b:"#34D399", c:"#059669" },
          purple: { a:"#2E1065", b:"#A78BFA", c:"#6D28D9" },
          red:    { a:"#450A0A", b:"#F87171", c:"#B91C1C" },
        };
        const col = colors[pb.style || "gold"] || colors.gold;
        // Repeat message 6× so marquee loop is seamless
        const msg = pb.message;
        const repeated = Array(6).fill(`${msg}    ✦    `).join("");

        return (
          <div style={{ position:"relative", zIndex:101, overflow:"hidden" }}>
            <style>{`
              /* Animated gradient background */
              @keyframes pbGrad {
                0%   { background-position: 0% 50%; }
                50%  { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
              }
              /* Sweeping light sweep */
              @keyframes pbSweep {
                0%   { transform: translateX(-100%); }
                100% { transform: translateX(400%); }
              }
              /* Continuous marquee scroll */
              @keyframes pbScroll {
                0%   { transform: translateX(0); }
                100% { transform: translateX(-50%); }
              }
              /* Sparkle pulse */
              @keyframes pbSpark {
                0%,100% { opacity:0.5; transform:scale(1) rotate(0deg); }
                50%     { opacity:1;   transform:scale(1.3) rotate(20deg); }
              }
              /* Book Now button pulse */
              @keyframes pbBtn {
                0%,100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.4); }
                50%     { box-shadow: 0 0 0 6px rgba(255,255,255,0); }
              }
              .pb-bg {
                background: linear-gradient(120deg, ${col.a}, ${col.b}, ${col.c}, ${col.b}, ${col.a});
                background-size: 300% 300%;
                animation: pbGrad 5s ease infinite;
              }
              .pb-sweep {
                position:absolute; inset:0; pointer-events:none;
                background: linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.22) 50%,transparent 100%);
                width:60%; animation: pbSweep 3.5s ease-in-out infinite;
              }
              .pb-scroll-track {
                display:flex; white-space:nowrap;
                animation: pbScroll 22s linear infinite;
              }
              .pb-spark { animation: pbSpark 2s ease-in-out infinite; display:inline-block; }
              .pb-spark-2 { animation: pbSpark 2s ease-in-out infinite 0.7s; display:inline-block; }
              .pb-btn {
                animation: pbBtn 2s ease-in-out infinite;
                font-family:'Montserrat',sans-serif; font-size:10px; font-weight:800;
                color:white; letter-spacing:0.14em; text-decoration:none;
                background:rgba(255,255,255,0.18); border:1.5px solid rgba(255,255,255,0.55);
                border-radius:20px; padding:6px 16px; white-space:nowrap; flex-shrink:0;
                backdrop-filter:blur(4px); transition:background 0.2s;
              }
              .pb-btn:hover { background:rgba(255,255,255,0.32) !important; }
            `}</style>

            <div className="pb-bg" style={{ position:"relative", overflow:"hidden" }}>
              {/* Sweep light */}
              <div className="pb-sweep" />

              <div style={{ padding:"12px 20px", display:"flex", alignItems:"center", gap:14, position:"relative" }}>
                {/* Left sparkle */}
                <span className="pb-spark" style={{ fontSize:15, color:"rgba(255,255,255,0.9)", flexShrink:0 }}>✦</span>

                {/* Scrolling message */}
                <div style={{ flex:1, overflow:"hidden", maskImage:"linear-gradient(90deg,transparent,black 8%,black 92%,transparent)", WebkitMaskImage:"linear-gradient(90deg,transparent,black 8%,black 92%,transparent)" }}>
                  <div className="pb-scroll-track">
                    <span style={{ fontFamily:"'Montserrat',sans-serif", fontSize:"12.5px", fontWeight:700, color:"white", letterSpacing:"0.07em", textShadow:"0 1px 10px rgba(0,0,0,0.3)" }}>
                      {repeated}
                    </span>
                    <span style={{ fontFamily:"'Montserrat',sans-serif", fontSize:"12.5px", fontWeight:700, color:"white", letterSpacing:"0.07em", textShadow:"0 1px 10px rgba(0,0,0,0.3)" }}>
                      {repeated}
                    </span>
                  </div>
                </div>

                {/* Right sparkle */}
                <span className="pb-spark-2" style={{ fontSize:15, color:"rgba(255,255,255,0.9)", flexShrink:0 }}>✦</span>

                {/* CTA */}
                <a href="/book" className="pb-btn">BOOK NOW →</a>
              </div>
            </div>
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
          {[["#services","SERVICES"],["#experience","EXPERIENCE"],["#gift-cards","GIFT CARDS"],["#loyalty","LOYALTY"],...((salonSettings as any)?.landing_sections?.show_subscriptions === true ? [["#subscriptions","PLANS"]] : []),["#reviews","REVIEWS"],["#visit-us","VISIT US"]].map(([href,label]) => (
            <a key={label} href={href} className="nav-link-item sans" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.14em", color: dark, textDecoration: "none" }}>{label}</a>
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
        {[["#services","SERVICES"],["#experience","EXPERIENCE"],["#gift-cards","GIFT CARDS"],["#loyalty","LOYALTY"],...((salonSettings as any)?.landing_sections?.show_subscriptions === true ? [["#subscriptions","PLANS"]] : []),["#reviews","REVIEWS"],["#visit-us","VISIT US"]].map(([href, label]) => (
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
        <div className="hero-floating-card-wrapper" style={{ position: "absolute", right: "clamp(80px,13vw,200px)", top: "18%", width: "300px", pointerEvents: "none" }}>
          <div className="hero-floating-card" style={{ width: "300px", border: "1px solid rgba(200,169,126,0.36)", borderRadius: "5px", background: "rgba(252,249,244,0.97)", backdropFilter: "blur(28px)", padding: "36px 30px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", overflow: "hidden", position: "relative" }}>
              {/* Particles */}
              <div id="kpiParticles" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 3, overflow: "hidden", borderRadius: "5px" }} />
            <div className="kpi-logo" style={{ width: "70px", height: "70px", borderRadius: "50%", border: "2.5px solid #C8A97E", overflow: "hidden", background: "#fff" }}>
               <img src={LOGO} alt="Zolara" style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
            </div>
            <div className="kpi-div" style={{ height: "1px", background: "linear-gradient(90deg, transparent, #C8A97E, transparent)" }} />
            <p style={{ fontStyle: "italic", fontSize: "17px", color: dark, textAlign: "center", lineHeight: 1.7, letterSpacing: "0.01em", fontWeight: 500 }}>
              "Not just a salon. A complete luxury experience."
            </p>
            <div className="kpi-div" style={{ height: "1px", background: "linear-gradient(90deg, transparent, #C8A97E, transparent)" }} />
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="kpi-info">
                <p className="sans" style={{ fontSize: "9px", letterSpacing: "0.2em", color: gold, fontWeight: 700, marginBottom: "4px" }}>LOCATION</p>
                <p className="sans" style={{ fontSize: "12.5px", color: dark, fontWeight: 500 }}>Sakasaka, Tamale</p>
              </div>
              <div className="kpi-info">
                <p className="sans" style={{ fontSize: "9px", letterSpacing: "0.2em", color: gold, fontWeight: 700, marginBottom: "4px" }}>HOURS</p>
                <p className="sans" style={{ fontSize: "12.5px", color: dark, fontWeight: 500 }}>Mon to Sat · 8:30 AM to 9:00 PM</p>
              </div>
              <div className="kpi-info">
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
              background: isOpenNow === null ? "transparent" : isOpenNow ? "rgba(74,222,128,0.12)" : "rgba(239,68,68,0.10)",
              border: isOpenNow === null ? "none" : isOpenNow ? "1px solid rgba(74,222,128,0.35)" : "1px solid rgba(239,68,68,0.3)",
              borderRadius: "100px", padding: "4px 12px" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%",
                background: isOpenNow === null ? "transparent" : isOpenNow ? "#16a34a" : "#dc2626",
                boxShadow: isOpenNow === null ? "none" : isOpenNow ? "0 0 0 2px rgba(22,163,74,0.25)" : "none" }} />
              <span className="sans" style={{ fontSize: "9px", letterSpacing: "0.15em",
                color: isOpenNow === null ? "transparent" : isOpenNow ? "#15803d" : "#dc2626", fontWeight: 700 }}>
                {isOpenNow === null ? "..." : isOpenNow ? "NOW OPEN" : "CLOSED"}
              </span>
            </div>
          </div>

          <h1 className="fade-up delay-1" style={{ fontSize: "clamp(54px,8vw,96px)", fontWeight: 300, lineHeight: 1.0, marginBottom: "8px", letterSpacing: "-0.01em" }}>
            Where Luxury
          </h1>
          <h1 className="fade-up delay-2" style={{ fontSize: "clamp(54px,8vw,96px)", fontWeight: 400, fontStyle: "italic", color: gold, lineHeight: 1.0, marginBottom: "36px", letterSpacing: "-0.01em" }}>
            Meets Beauty.
          </h1>

          <p className="fade-up delay-3 sans" style={{ fontSize: "15.5px", lineHeight: 1.9, color: "#3D2E1A", maxWidth: "460px", marginBottom: "44px", fontWeight: 400 }}>
            A sanctuary crafted for women who demand the finest. Every appointment at Zolara is a ritual, every stylist an artist, every result extraordinary.
          </p>

          {/* URGENCY CARD — hidden on Sundays */}
          {new Date().getDay() !== 0 && (() => {
            const maxPerDay = salonSettings?.max_bookings_per_slot || 6;
            const remaining = Math.max(0, maxPerDay - todayBookings);
            const braidingRemaining = Math.max(0, Math.ceil(maxPerDay * 0.4) - todayBraidingBookings);
            const pct = maxPerDay > 0 ? Math.round((todayBookings / maxPerDay) * 100) : 0;
            const urgencyColor = pct >= 80 ? "#DC2626" : pct >= 50 ? "#D97706" : "#16A34A";
            const urgencyLabel = pct >= 80 ? "Almost Full" : pct >= 50 ? "Filling Fast" : "Open";
            const dotAnim = pct >= 50 ? "pulseGreen 1.5s infinite" : "pulseGreen 2s infinite";
            const braidTag = braidingRemaining <= 0
              ? "No braiding left today"
              : braidingRemaining === 1
              ? "Last braiding slot"
              : `${braidingRemaining} braiding slots left`;
            const tagColor = braidingRemaining === 0 ? "#DC2626" : braidingRemaining === 1 ? "#D97706" : "#8B6914";
            const tagBg = braidingRemaining === 0 ? "rgba(220,38,38,.06)" : "rgba(200,169,126,.1)";
            return (
              <div className="fade-up delay-3" style={{ marginBottom: "28px", padding: "16px 20px", background: "rgba(200,169,126,0.08)", border: "1px solid rgba(200,169,126,0.22)", borderLeft: "3px solid #8B6914", borderRadius: "4px", maxWidth: 380 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "9px" }}>
                  <span className="sans" style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.2em", color: goldDark, textTransform: "uppercase" }}>Today's Availability</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: urgencyColor, display: "inline-block", boxShadow: `0 0 6px ${urgencyColor}88`, animation: dotAnim }} />
                    <span className="sans" style={{ fontSize: "9px", fontWeight: 700, color: urgencyColor, letterSpacing: "0.12em", textTransform: "uppercase" }}>{urgencyLabel}</span>
                  </span>
                </div>
                <div style={{ height: 3, background: "rgba(200,169,126,0.15)", borderRadius: 2, overflow: "hidden", marginBottom: 10 }}>
                  <div style={{ height: "100%", width: pct + "%", background: `linear-gradient(90deg, #8B6914, ${urgencyColor})`, borderRadius: 2, transition: "width 1.2s ease" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <span className="sans" style={{ fontSize: "13px", color: "#5C4A2A", fontWeight: 500 }}>
                    <strong style={{ color: dark, fontSize: "15px" }}>{remaining}</strong> {remaining === 1 ? "slot" : "slots"} left today
                  </span>
                  <span className="sans" style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.14em", color: tagColor, background: tagBg, border: `1px solid ${tagColor}44`, borderRadius: "20px", padding: "3px 10px", textTransform: "uppercase" }}>
                    ✦ {braidTag}
                  </span>
                </div>
              </div>
            );
          })()}

          <div className="fade-up delay-4 hero-actions-wrap" style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
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
            }}>OUR SERVICES</a>
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
      <section id="services" style={{ padding: "clamp(64px,8vw,120px) clamp(24px,6vw,100px)", background: mid, position: "relative", overflow: "hidden" }}>
        <style>{`
          @keyframes craftIn { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:none; } }
          .craft-card { border-top: 1px solid rgba(200,169,126,0.18); padding: 36px 0; display: grid; grid-template-columns: 1fr 1fr; align-items: center; gap: 24px; transition: background 0.3s, padding 0.3s, margin 0.3s, border-color 0.3s, opacity 0.65s cubic-bezier(0.16,1,0.3,1), transform 0.65s cubic-bezier(0.16,1,0.3,1); cursor: pointer; opacity:0; transform:translateY(28px); }
          .craft-card.craft-visible { opacity:1; transform:none; }
          .craft-card:last-child { border-bottom: 1px solid rgba(200,169,126,0.18); }
          .craft-card:hover { background: rgba(200,169,126,0.06); margin: 0 -28px; padding: 36px 28px; border-radius: 6px; border-top-color: transparent; box-shadow: 0 4px 32px rgba(200,169,126,0.08); }
          .craft-card:hover + .craft-card { border-top-color: transparent; }
          .craft-num { font-family: 'Cormorant Garamond',serif; font-size: clamp(42px,5.5vw,72px); font-weight: 600; line-height: 1; background: linear-gradient(135deg,#8B6914,#C8A97E); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; opacity:0.7; transition: opacity 0.3s; }
          .craft-card:hover .craft-num { opacity:1; }
          .craft-arrow { opacity: 0; transform: translateX(-10px); transition: all 0.3s ease; }
          .craft-card:hover .craft-arrow { opacity: 1; transform: none; }
          .craft-tag { display:inline-block; padding: 3px 10px; background: rgba(200,169,126,0.12); border: 1px solid rgba(200,169,126,0.3); border-radius: 20px; font-size:9px; font-weight:700; letter-spacing:0.18em; color:#8B6914; text-transform:uppercase; margin-bottom:8px; transition: background 0.2s, border-color 0.2s; }
          .craft-card:hover .craft-tag { background: linear-gradient(135deg,#8B6914,#C8A97E); border-color:transparent; color:white; }
        `}</style>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 85% 15%, rgba(200,169,126,0.06) 0%, transparent 50%)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "clamp(40px,6vw,72px)", flexWrap: "wrap", gap: 20 }}>
            <div>
              <div className="sans" style={{ fontSize: "10px", letterSpacing: "0.26em", color: gold, fontWeight: 700, marginBottom: "14px" }}>OUR CRAFT</div>
              <h2 className="heading-xl" style={{ fontWeight: 300, lineHeight: 0.94 }}>What we <em>do best.</em></h2>
            </div>
            <Link to="/book" className="sans" style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.16em", color: goldDark, textDecoration: "none", borderBottom: "1px solid rgba(139,105,20,0.4)", paddingBottom: "2px", transition: "all 0.2s", whiteSpace: "nowrap" }}>
              FULL MENU INSIDE BOOKING →
            </Link>
          </div>

          {[
            { num: "01", name: "Braids & Protective Styles", desc: "Box braids, knotless, cornrows, Senegalese twists. Every length, every texture, executed with precision.", tag: "Signature Service" },
            { num: "02", name: "Nails, Pedicure & Manicure", desc: "Acrylic sets, gel overlays, pedicures and classic manicures. Clean lines, lasting colour, flawless finish.", tag: "Nails" },
            { num: "03", name: "Lash Extensions & Makeup", desc: "Classic, hybrid and volume lash sets by certified technicians. Everyday glam to full event-ready makeup.", tag: "Beauty" },
            { num: "04", name: "Wigs, Installs & Hair Treatments", desc: "Frontal installs, closure setups, wig customisation and deep conditioning treatments. Your crown, perfected.", tag: "Hair" },
          ].map(({ num, name, desc, tag }, idx) => (
            <Link key={num} to="/book" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
              <div
                className="craft-card"
                ref={(el) => {
                  if (!el) return;
                  const obs = new IntersectionObserver(([entry]) => {
                    if (entry.isIntersecting) {
                      setTimeout(() => el.classList.add("craft-visible"), idx * 120);
                      obs.disconnect();
                    }
                  }, { threshold: 0.1 });
                  obs.observe(el);
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "clamp(16px,3vw,40px)" }}>
                  <div className="craft-num" style={{ flexShrink: 0 }}>{num}</div>
                  <div>
                    <span className="craft-tag">{tag}</span>
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(22px,2.8vw,34px)", fontWeight: 600, color: dark, lineHeight: 1.1 }}>{name}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
                  <p className="sans" style={{ fontSize: "13px", color: "#5C4A2A", lineHeight: 1.8, fontWeight: 400, maxWidth: 360 }}>{desc}</p>
                  <div className="craft-arrow sans" style={{ fontSize: "11px", fontWeight: 700, color: goldDark, whiteSpace: "nowrap", flexShrink: 0 }}>BOOK →</div>
                </div>
              </div>
            </Link>
          ))}

          <div style={{ textAlign: "center", marginTop: "clamp(40px,5vw,64px)" }}>
            <Link to="/book" style={{
              textDecoration: "none", display: "inline-block", fontFamily: "'Montserrat',sans-serif",
              fontSize: "11px", fontWeight: 700, letterSpacing: "0.14em", color: "#fff",
              background: "linear-gradient(135deg,#8B6914,#C8A97E)", padding: "17px 52px",
              borderRadius: "1px", boxShadow: "0 8px 32px rgba(139,105,20,0.3)",
            }}>BOOK YOUR APPOINTMENT</Link>
          </div>
        </div>
      </section>

            {/* WAVE DIVIDER */}
      <div style={{ background: mid, marginBottom: "-2px", lineHeight: 0 }}><svg viewBox="0 0 1440 40" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style={{ display:"block", width:"100%", height:"40px" }}><path d="M0 40 L0 20 Q360 0 720 20 Q1080 40 1440 20 L1440 40 Z" fill={cream}/><path d="M0 20 Q360 0 720 20 Q1080 40 1440 20" fill="none" stroke="rgba(200,169,126,.18)" strokeWidth="1"/></svg></div>
            {/* EXPERIENCE */}
      <section id="experience" style={{ padding: "clamp(64px,8vw,120px) clamp(24px,6vw,100px)", background: cream, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: "-60px", top: "50%", transform: "translateY(-50%)", fontSize: "380px", color: "rgba(200,169,126,0.045)", fontWeight: 700, lineHeight: 1, pointerEvents: "none" }}>✦</div>
        <div className="landing-experience-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(40px,6vw,100px)", alignItems: "center", maxWidth: "1100px", margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div ref={expRef} className={expVisible ? "exp-visible" : ""}>
            <div className="sans" style={{ fontSize: "10px", letterSpacing: "0.26em", color: gold, fontWeight: 700, marginBottom: "16px" }}>THE ZOLARA DIFFERENCE</div>
            <h2 className="heading-lg" style={{ fontWeight: 300, lineHeight: 1.05, marginBottom: "28px" }}>A Complete <em>Luxury</em> Experience</h2>
            <p className="sans" style={{ fontSize: "14px", color: "#3D2E1A", lineHeight: 2, marginBottom: "44px", fontWeight: 400 }}>
              You walk in. Cold water waiting. Your name already known.
              Your stylist ready, products pulled, station prepared.
              You leave with a perfume spritz, a piece of chocolate, and a final mirror check.
              That is the Zolara standard. Every single visit.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 0, borderTop: "1px solid rgba(200,169,126,0.15)" }}>
              {[
                { moment: "The Welcome", detail: "Cold water. WiFi connected. Your stylist waiting.", icon: "◉" },
                { moment: "The Craft", detail: "Certified hands. Premium products. Zero shortcuts.", icon: "✦" },
                { moment: "The Loyalty", detail: "Every GHS 100 earns a stamp. 20 stamps, GHS 50 off.", icon: "◈" },
                { moment: "The Exit Ritual", detail: "Perfume spritz. Chocolate. One last mirror check.", icon: "◇" },
              ].map(({ moment, detail, icon }, idx) => (
                <div key={moment} className="exp-kpi" style={{ animationDelay: `${idx * 0.12}s`, display: "flex", alignItems: "center", gap: "20px", padding: "20px 0", borderBottom: "1px solid rgba(200,169,126,0.12)" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "linear-gradient(135deg, #8B6914, #C8A97E)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 16px rgba(139,105,20,0.2)" }}>
                    <span style={{ color: "#fff", fontSize: "14px" }}>{icon}</span>
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "20px", fontWeight: 600, color: "#1C160E", marginBottom: "2px" }}>{moment}</div>
                    <div className="sans" style={{ fontSize: "12px", color: "#5C4A2A", lineHeight: 1.65, fontWeight: 400 }}>{detail}</div>
                  </div>
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
          <h2 className="heading-xl" style={{ fontWeight: 300, color: cream, marginBottom: "16px" }}>What Our <em>Clients</em> Say</h2>
          <p className="sans" style={{ fontSize: "14px", color: "rgba(245,239,230,0.55)", maxWidth: "420px", margin: "0 auto 60px", lineHeight: 1.8, fontWeight: 400 }}>
            Real women. Real results. Real luxury.
          </p>

          {(() => {
            const allReviews = dbReviews.length > 0 ? dbReviews.map((r: any) => ({ name: r.name, text: r.comment, stars: r.rating })) : FALLBACK_REVIEWS;
            const visible = allReviews.slice(0, 3);
            return (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", maxWidth: "1100px", margin: "0 auto 48px" }}>
                {visible.map((r, i) => (
                  <div key={r.name}
                    onClick={() => setActiveReview(i)}
                    className="review-card review-card-anim"
                    style={{
                      background: i === activeReview ? "rgba(200,169,126,0.13)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${i === activeReview ? "rgba(200,169,126,0.5)" : "rgba(255,255,255,0.07)"}`,
                      borderRadius: "4px", padding: "32px 28px", textAlign: "left",
                      boxShadow: i === activeReview ? "0 20px 56px rgba(200,169,126,0.15)" : "none",
                      animationDelay: `${i * 0.15}s`,
                      transition: "all 0.4s ease",
                      cursor: "pointer",
                    }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                      <div style={{ display: "flex", gap: "3px" }}>
                        {[1,2,3,4,5].map(s => <span key={s} style={{ color: gold, fontSize: "13px" }}>★</span>)}
                      </div>
                      <span className="sans" style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.16em", color: "rgba(200,169,126,0.45)", textTransform: "uppercase" }}>Verified</span>
                    </div>
                    <p style={{ fontStyle: "italic", fontSize: "clamp(15px,1.8vw,18px)", color: "rgba(245,239,230,0.92)", lineHeight: 1.85, marginBottom: "24px", fontWeight: 400 }}>"{r.text}"</p>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", paddingTop: "20px", borderTop: "1px solid rgba(200,169,126,0.12)" }}>
                      <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg, #C8A97E, #8B6914)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span className="sans" style={{ fontSize: "13px", fontWeight: 700, color: "#fff" }}>{r.name[0]}</span>
                      </div>
                      <div>
                        <p className="sans" style={{ fontSize: "12px", fontWeight: 700, color: gold, letterSpacing: "0.06em" }}>{r.name}</p>
                        <p className="sans" style={{ fontSize: "10px", color: "rgba(245,239,230,0.35)", marginTop: "1px" }}>Zolara Client</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

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
          <h2 className="heading-xl" style={{ fontWeight: 300, color: "#F5EFE6", lineHeight: 0.94, marginBottom: "20px" }}>Gift the <em style={{ color: gold }}>Experience</em></h2>
          <p className="sans" style={{ fontSize: "14px", color: "rgba(245,239,230,0.55)", lineHeight: 1.85, maxWidth: "480px", margin: "0 auto 32px", fontWeight: 400 }}>
            When you do not know what to give, give them a choice. Every Zolara Gift Card is valid for 12 months and redeemable for any service. Buy it now, book it whenever she is ready.
          </p>
          <Link to="/buy-gift-card" className="btn-primary" style={{ textDecoration: "none", display: "inline-block", fontFamily: "'Montserrat',sans-serif", fontSize: "11px", fontWeight: 700, letterSpacing: "0.14em", color: "#fff", background: "linear-gradient(135deg,#8B6914,#C8A97E)", padding: "15px 40px", borderRadius: "1px", boxShadow: "0 8px 32px rgba(139,105,20,0.35)" }}>
            BUY A GIFT CARD
          </Link>
        </div>

        {/* Promotional Gift Cards: shown first if any active */}
        {promoGiftCards.length > 0 && (
          <div style={{ maxWidth:"1100px", margin:"0 auto 32px", position:"relative", zIndex:1 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:20 }}>
              <span style={{ color: gold, fontSize:12 }}>✦</span>
              <p style={{ fontFamily:"'Montserrat',sans-serif", fontSize:10, fontWeight:700, letterSpacing:"0.22em", color: gold, margin:0 }}>SPECIAL EDITIONS</p>
              <span style={{ color: gold, fontSize:12 }}>✦</span>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:"20px" }}>
              {promoGiftCards.map((pt: any) => {
                const THEME_GRADS: Record<string,string> = {
                  valentines:"linear-gradient(145deg,#7F1D1D,#E11D48,#FB7185)",
                  christmas:"linear-gradient(145deg,#14532D,#16A34A,#DC2626)",
                  eid:"linear-gradient(145deg,#1E3A5F,#2563EB,#60A5FA)",
                  birthday:"linear-gradient(145deg,#4C1D95,#A855F7,#F0ABFC)",
                  mothers:"linear-gradient(145deg,#831843,#EC4899,#FBCFE8)",
                  graduation:"linear-gradient(145deg,#1E3A5F,#B8975A,#D4AF6A)",
                  gold:"linear-gradient(145deg,#6B4E0A,#C8A97E,#D4AF6A)",
                  custom:"linear-gradient(145deg,#1C160E,#3A2D1A,#C8A97E)",
                };
                const grad = THEME_GRADS[pt.theme] || THEME_GRADS.gold;
                return (
                  <div key={pt.id} className="gc-tier-card" style={{ background: grad, boxShadow:"0 20px 48px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.3)", animation:"cardFloat 5.5s ease-in-out infinite" }}>
                    <div style={{ position:"absolute", top:-20, right:-20, width:80, height:80, borderRadius:"50%", background:"rgba(255,255,255,0.06)" }} />
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"20px", position:"relative" }}>
                      <div>
                        <div className="sans" style={{ fontSize:"8px", letterSpacing:"0.22em", color:"rgba(255,255,255,0.5)", marginBottom:"8px", fontWeight:600 }}>SPECIAL EDITION</div>
                        <div className="gc-chip" style={{ background:"rgba(255,255,255,0.15)", color:"rgba(255,255,255,0.85)", border:"1px solid rgba(255,255,255,0.25)" }}>{pt.emoji} {pt.name}</div>
                      </div>
                    </div>
                    <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(28px,3vw,38px)", fontWeight:300, color:"white", lineHeight:1, marginBottom:"14px" }}>GHS {pt.amount.toLocaleString()}</div>
                    <div style={{ height:"1px", background:"rgba(255,255,255,0.12)", marginBottom:"14px" }} />
                    <p className="sans" style={{ fontSize:"12px", color:"rgba(255,255,255,0.62)", lineHeight:1.65, margin:0 }}>{pt.description || "A special gift for a special occasion."}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tier cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: "20px", maxWidth: "1100px", margin: "0 auto 64px", position: "relative", zIndex: 1 }}>
          {(() => {
            const gcPrices = (salonSettings as any)?.gift_card_prices || {};
            const getGCPrice = (tier: string, def: number) => {
              const v = gcPrices[tier];
              return (v !== undefined && v !== null) ? Number(v) : def;
            };
            return [
              { amount: `GHS ${getGCPrice("Silver",220).toLocaleString()}`, tier: "Silver", label: "SILVER", desc: "A perfect treat. Covers a wash, nail set or lashes.", gradient: "linear-gradient(145deg,#6B6B6B,#B8B8B8,#555)", glow: "rgba(180,180,180,0.15)", anim: "cardFloat 5s ease-in-out infinite", chip: "#9CA3AF" },
              { amount: `GHS ${getGCPrice("Gold",450).toLocaleString()}`, tier: "Gold", label: "GOLD", desc: "A full pampering session. Braids, manicure and more.", gradient: "linear-gradient(145deg,#6B4E0A,#C8A97E,#8B6914)", glow: "rgba(200,169,126,0.2)", anim: "cardFloat2 5.5s ease-in-out infinite 0.4s", chip: "#C8A97E" },
              { amount: `GHS ${getGCPrice("Platinum",650).toLocaleString()}`, tier: "Platinum", label: "PLATINUM", desc: "Premium luxury. A full day of indulgence.", gradient: "linear-gradient(145deg,#2D3A45,#6B8090,#1E2830)", glow: "rgba(107,128,144,0.15)", anim: "cardFloat 6s ease-in-out infinite 0.2s", chip: "#94A3B8" },
              { amount: `GHS ${getGCPrice("Diamond",1000).toLocaleString()}`, tier: "Diamond", label: "DIAMOND", desc: "The ultimate gift. Use across 3 visits. Balance carries forward.", gradient: "linear-gradient(145deg,#1a1660,#5B54C8,#12104A)", glow: "rgba(99,102,241,0.25)", anim: "cardFloat3 4.5s ease-in-out infinite 0.6s", chip: "#818CF8" },
            ];
          })().map(t => (
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
            <h2 className="heading-xl" style={{ fontWeight: 300, lineHeight: 0.94, marginBottom: "24px" }}>Your Loyalty,<br /><em>Beautifully Rewarded</em></h2>
            <p className="sans" style={{ fontSize: "14px", color: "#3D2E1A", lineHeight: 2, marginBottom: "36px", fontWeight: 400 }}>
              The Zolara Rewards Card is not a points system. It is a thank-you. Every GHS 100 you spend earns one stamp. Reach 20 and your next service gets GHS 50 off. No app, no sign-up. Your card lives in the system the moment you book.
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
          <h2 className="heading-xl" style={{ fontWeight: 300, lineHeight: 0.94, marginBottom: "16px" }}>Beauty on <em>Subscription</em></h2>
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
          <a href={`https://wa.me/${(salonSettings as any)?.whatsapp_number || "233594365314"}`} target="_blank" rel="noreferrer" className="sans" style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", color: goldDark, textDecoration: "none" }}>
            CONTACT US ON WHATSAPP →
          </a>
        </div>
      </section>
      </>
      )}

      {/* FAQ */}
      <div className="section-divider" />
      <section style={{ padding: "clamp(64px,8vw,120px) clamp(24px,6vw,100px)", background: dark, position: "relative", overflow: "hidden" }}>
        <style>{`
          @keyframes faqIn { from { opacity:0; max-height:0; } to { opacity:1; max-height:500px; } }
          .faq-answer { overflow:hidden; transition: max-height 0.4s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease; }
          .faq-item { border-bottom: 1px solid rgba(200,169,126,0.12); transition: background 0.2s; }
          .faq-item:first-child { border-top: 1px solid rgba(200,169,126,0.12); }
          .faq-q { width:100%; background:none; border:none; cursor:pointer; display:flex; justify-content:space-between; align-items:center; padding: 22px 0; text-align:left; gap:16px; }
          .faq-q:hover .faq-q-text { color: #C8A97E; }
          .faq-icon { width:28px; height:28px; border-radius:50%; border:1px solid rgba(200,169,126,0.3); display:flex; align-items:center; justify-content:center; flex-shrink:0; transition: background 0.2s, transform 0.3s; }
          .faq-icon.open { background: linear-gradient(135deg,#8B6914,#C8A97E); border-color:transparent; transform:rotate(45deg); }
        `}</style>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 0%, rgba(200,169,126,0.06) 0%, transparent 60%)", pointerEvents: "none" }} />
        <div style={{ maxWidth: "780px", margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div style={{ textAlign: "center", marginBottom: "clamp(40px,5vw,64px)" }}>
            <div className="sans" style={{ fontSize: "10px", letterSpacing: "0.26em", color: gold, fontWeight: 700, marginBottom: "16px" }}>GOOD TO KNOW</div>
            <h2 className="heading-xl" style={{ fontWeight: 300, color: cream }}>Questions we <em>always</em> get.</h2>
          </div>
          {[
            { q: "How long do box braids take?", a: "It depends on the length and style. Short to medium box braids take 3 to 5 hours. Long or extra-large sets can take 6 to 8 hours. We will give you a time estimate when you book." },
            { q: "Do I need to pay a deposit?", a: "Yes. All bookings require a GHS 50 deposit paid online when you book. This deposit goes toward your total. You pay the balance at the studio on the day." },
            { q: "What happens if I am late?", a: "We allow a 15-minute grace period. After that, a lateness fee of GHS 50 applies. If you are more than 30 minutes late, your slot may be given to another client and you will need to rebook." },
            { q: "Can I cancel or reschedule?", a: "Yes. Give us at least 24 hours notice and we will reschedule at no cost. Cancellations with less than 12 hours notice forfeit the deposit. Cancellations must be made by phone call only." },
            { q: "Do I need to come with washed hair?", a: "For braiding and styling services, we ask that you come with clean, detangled hair. If that is not possible, we offer a wash and blow-dry service you can add to your booking." },
            { q: "Is there parking?", a: "Yes. There is parking available directly in front of the studio on the Sakasaka main road, opposite CalBank." },
            { q: "Do you offer student discounts?", a: "Yes. Students get 10% off all services Monday to Thursday with a valid student ID. Just show it when you arrive." },
          ].map(({ q, a }, i) => (
            <div key={i} className="faq-item">
              <button className="faq-q" onClick={() => setFaqOpen(faqOpen === i ? null : i)}>
                <span className="faq-q-text sans" style={{ fontSize: "14px", fontWeight: 600, color: faqOpen === i ? gold : cream, transition: "color 0.2s", fontFamily: "'Montserrat',sans-serif" }}>{q}</span>
                <span className={"faq-icon" + (faqOpen === i ? " open" : "")}>
                  <span style={{ color: faqOpen === i ? "white" : gold, fontSize: "16px", lineHeight: 1, marginTop: "-1px" }}>+</span>
                </span>
              </button>
              <div className="faq-answer" style={{ maxHeight: faqOpen === i ? "500px" : "0", opacity: faqOpen === i ? 1 : 0 }}>
                <p className="sans" style={{ fontSize: "13.5px", color: "rgba(245,239,230,0.65)", lineHeight: 1.9, paddingBottom: "22px", fontWeight: 400 }}>{a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

            <div style={{ background: cream, marginBottom: "-2px", lineHeight: 0 }}><svg viewBox="0 0 1440 40" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style={{ display:"block", width:"100%", height:"40px" }}><path d="M0 40 L0 20 Q360 0 720 20 Q1080 40 1440 20 L1440 40 Z" fill={cream}/><path d="M0 20 Q360 0 720 20 Q1080 40 1440 20" fill="none" stroke="rgba(200,169,126,.15)" strokeWidth="1"/></svg></div>
      <section id="visit-us" style={{ padding: "clamp(64px,8vw,120px) clamp(24px,6vw,100px)", background: cream, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 30% 70%, rgba(200,169,126,0.09) 0%, transparent 50%)", pointerEvents: "none" }} />
        <div style={{ textAlign: "center", marginBottom: "64px", position: "relative", zIndex: 1 }}>
          <div className="sans" style={{ fontSize: "10px", letterSpacing: "0.26em", color: gold, fontWeight: 700, marginBottom: "16px" }}>FIND US</div>
          <h2 className="heading-xl" style={{ fontWeight: 300 }}>Come <em>Visit Us</em></h2>
          <p className="sans" style={{ fontSize: "14px", color: "#78716C", marginTop: "12px", fontWeight: 400 }}>Sakasaka, Tamale. Walk in or book ahead.</p>
        </div>
        <div ref={visitRef} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px", maxWidth: "900px", margin: "0 auto 60px", position: "relative", zIndex: 1 }}>
          {[
            { icon: "◉", label: "LOCATION", lines: ["Sakasaka, Opposite CalBank", "Tamale, Northern Region"], delay: 0 },
            { icon: "◈", label: "CALL US", lines: ["059 436 5314", "020 884 8707"], tel: true, delay: 120 },
            { icon: "◇", label: "HOURS", lines: ["Monday to Saturday", "8:30 AM until 9:00 PM"], delay: 240 },
            { icon: "✦", label: "SUNDAYS", lines: ["We are closed", "Rest day. Back Monday, ready for you."], delay: 360 },
          ].map(item => (
            <div key={item.label} className="visit-card"
              ref={(el) => {
                if (!el) return;
                const obs = new IntersectionObserver(([e]) => {
                  if (e.isIntersecting) {
                    setTimeout(() => {
                      el.style.opacity = "1";
                      el.style.transform = "translateY(0) scale(1)";
                    }, (item as any).delay);
                    obs.disconnect();
                  }
                }, { threshold: 0.15 });
                obs.observe(el);
              }}
              style={{ background: mid, border: "1px solid rgba(200,169,126,0.22)", borderRadius: "3px", padding: "40px 28px", textAlign: "center", position: "relative", overflow: "hidden", opacity: 0, transform: "translateY(32px) scale(0.97)", transition: "opacity 0.65s cubic-bezier(0.16,1,0.3,1), transform 0.65s cubic-bezier(0.16,1,0.3,1)" }}>
              <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "48px", height: "2px", background: "linear-gradient(90deg, transparent, #C8A97E, transparent)" }} />
              <div style={{ fontSize: "26px", color: gold, marginBottom: "18px" }}>{item.icon}</div>
              <p className="sans" style={{ fontSize: "10px", letterSpacing: "0.22em", color: gold, fontWeight: 700, marginBottom: "14px" }}>{item.label}</p>
              {item.lines.map((l, li) => (item as any).tel
                ? <a key={l} href={`tel:+233${l.replace(/^0/, "").replace(/\s/g,"")}`} className="sans" style={{ fontSize: "16px", color: dark, lineHeight: 1.75, fontWeight: 600, textDecoration: "none", display: "block" }}>{l}</a>
                : <p key={l} className="sans" style={{ fontSize: li === 0 ? "17px" : "13px", color: li === 0 ? dark : "#78716C", lineHeight: 1.75, fontWeight: li === 0 ? 600 : 400 }}>{l}</p>
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

      {/* ANNOUNCEMENT MODAL */}
      {(() => {
        const ann = (salonSettings as any)?.announcement;
        if (!ann?.enabled || !ann?.title || announcementDismissed) return null;
        // Check expiry
        if (ann.expires_date) {
          const expiry = new Date(`${ann.expires_date}T${ann.expires_time || "23:59"}:00`);
          if (expiry < new Date()) return null;
        }
        return (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px", backdropFilter:"blur(4px)" }}
            onClick={dismissAnnouncement}>
            <div onClick={e => e.stopPropagation()} style={{
              background:"white", borderRadius:20, padding:"40px 36px", maxWidth:460, width:"100%",
              textAlign:"center", boxShadow:"0 40px 100px rgba(0,0,0,0.45)", position:"relative",
              animation:"fadeUp 0.4s cubic-bezier(0.16,1,0.3,1)"
            }}>
              <button onClick={dismissAnnouncement} style={{ position:"absolute", top:16, right:16, background:"none", border:"none", cursor:"pointer", color:"#A8A29E", fontSize:22, lineHeight:1 }}>×</button>
              <div style={{ width:52, height:52, borderRadius:"50%", background:"linear-gradient(135deg,#8B6914,#C8A97E)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px", fontSize:22 }}>✦</div>
              <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:28, fontWeight:600, color:"#1C160E", marginBottom:12, lineHeight:1.2 }}>{ann.title}</h3>
              {ann.message && <p style={{ fontFamily:"'Montserrat',sans-serif", fontSize:13, color:"#57534E", lineHeight:1.75, marginBottom:24 }}>{ann.message}</p>}
              <a href="/book" onClick={dismissAnnouncement}
                style={{ display:"inline-block", background:"linear-gradient(135deg,#8B6914,#C8A97E)", color:"white", textDecoration:"none", padding:"14px 36px", borderRadius:8, fontFamily:"'Montserrat',sans-serif", fontSize:12, fontWeight:700, letterSpacing:"0.1em" }}>
                BOOK NOW →
              </a>
              <p style={{ fontFamily:"'Montserrat',sans-serif", fontSize:11, color:"#A8A29E", marginTop:16, cursor:"pointer" }} onClick={dismissAnnouncement}>Dismiss</p>
            </div>
          </div>
        );
      })()}

      {/* FOOTER */}
      <footer style={{ background: "linear-gradient(160deg,#1A1208,#0D0A06)", position: "relative", overflow: "hidden" }}>
        {/* Top accent bar */}
        <div style={{ height: "3px", background: "linear-gradient(90deg,transparent,#8B6914,#C8A97E,#8B6914,transparent)" }} />

        {/* Brand statement */}
        <div style={{ padding: "clamp(52px,7vw,96px) clamp(24px,6vw,100px) clamp(40px,5vw,72px)", borderBottom: "1px solid rgba(200,169,126,0.08)", textAlign: "center", position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 0%,rgba(200,169,126,.06) 0%,transparent 65%)", pointerEvents: "none" }} />
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(34px,5vw,70px)", fontWeight: 300, color: "rgba(245,239,230,.92)", lineHeight: 1, marginBottom: "18px", position: "relative", zIndex: 1 }}>
            Ready to feel like <em style={{ color: gold, fontStyle: "italic" }}>royalty?</em>
          </h2>
          <p className="sans" style={{ fontSize: "12px", color: "rgba(245,239,230,.3)", letterSpacing: ".06em", marginBottom: "28px", position: "relative", zIndex: 1 }}>
            Sakasaka, Tamale · Monday to Saturday · 8:30 AM to 9:00 PM
          </p>
          <Link to="/book" className="sans" style={{ display: "inline-block", padding: "14px 40px", background: "linear-gradient(135deg,#8B6914,#C8A97E)", borderRadius: "3px", fontSize: "10px", fontWeight: 800, letterSpacing: ".18em", color: "#1C160E", textDecoration: "none", transition: "all .3s", position: "relative", zIndex: 1 }}>
            BOOK YOUR APPOINTMENT →
          </Link>
        </div>

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
              Built in Tamale for the women of the North. Where precision craft meets genuine care.
            </p>
            <div className="sans" style={{ fontSize: "12px", color: "rgba(245,239,230,0.55)", lineHeight: 1.9 }}>
              <div>Sakasaka, Opposite CalBank, Tamale</div>
              <div><a href="tel:+233594365314" style={{ color: "inherit", textDecoration: "none" }}>059 436 5314</a> · <a href="tel:+233208848707" style={{ color: "inherit", textDecoration: "none" }}>020 884 8707</a></div>
              <div>Mon to Sat · 8:30 AM to 9:00 PM</div>
            </div>
          </div>

          {/* Navigate */}
          <div>
            <p className="sans" style={{ fontSize: "9px", letterSpacing: "0.22em", color: gold, fontWeight: 700, marginBottom: "16px" }}>NAVIGATE</p>
            {[["#services","Services"],["#experience","Experience"],["#gift-cards","Gift Cards"],["#loyalty","Loyalty"],...((salonSettings as any)?.landing_sections?.show_subscriptions === true ? [["#subscriptions","Plans"]] : []),["#visit-us","Visit Us"]].map(([href,label]) => (
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
                { label: "Instagram", handle: "@" + ((salonSettings as any)?.instagram_handle || "zolarastudio"), href: "https://www.instagram.com/" + ((salonSettings as any)?.instagram_handle || "zolarastudio"), icon: "IG" },
                { label: "TikTok",   handle: "@" + ((salonSettings as any)?.tiktok_handle || "zolarastudio"),   href: "https://www.tiktok.com/@" + ((salonSettings as any)?.tiktok_handle || "zolarastudio"),   icon: "TK" },
                { label: "Facebook", handle: (salonSettings as any)?.facebook_handle || "Zolara Studio", href: "https://www.facebook.com/" + ((salonSettings as any)?.facebook_handle || "zolarastudio"), icon: "FB" },
                { label: "WhatsApp", handle: "Message us", href: "https://wa.me/" + ((salonSettings as any)?.whatsapp_number || "233594365314"), icon: "WA" },
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
