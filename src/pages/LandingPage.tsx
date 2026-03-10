import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/context/SettingsContext";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SocialIcon } from "react-social-icons";
import {
  Wifi, Droplets, Star, Users, Home, Sparkles, Lock, Clock,
  MapPin, Phone, ChevronDown, Menu, X, MessageCircle, Send, Loader2
} from "lucide-react";

interface Review { id: string; name: string; rating: number; comment: string; }
interface Message { role: "user" | "assistant"; content: string; }

const AMANDA_SYSTEM = `You are Amanda, the AI beauty consultant for Zolara Beauty Studio in Sakasaka, Tamale, Ghana (Opposite CalBank). Help clients with services, pricing, bookings, and general beauty advice. Be warm, professional, and concise. Services: Hair & Braiding from GHS 80, Nail Artistry from GHS 60, Lash Extensions from GHS 65, Makeup from GHS 125, Pedicure & Manicure from GHS 100, Wigs & Styling from GHS 150. Hours: Mon-Sat 8:30AM-9PM, closed Sundays. Phone: 0594 365 314 / 020 884 8707. Never use em-dashes.`;

function AmandaWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi, I am Amanda. How can I help you today? I can tell you about our services, pricing, or help you book an appointment." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 300,
          system: AMANDA_SYSTEM,
          messages: newMessages,
        }),
      });
      const data = await res.json();
      const reply = data?.content?.[0]?.text ?? "Sorry, please call us on 0594 365 314.";
      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Something went wrong. Please call 0594 365 314." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-5 z-50 w-80 rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ backgroundColor: "#F5EFE6", border: "1px solid #C9A87C", maxHeight: "480px" }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: "#1C1008" }}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: "#C9A87C", color: "#1C1008" }}>A</div>
              <div>
                <p className="text-xs font-bold text-white">Amanda</p>
                <p className="text-[10px]" style={{ color: "#C9A87C" }}>Zolara Beauty Consultant</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: "320px" }}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className="text-xs leading-relaxed px-3 py-2 rounded-xl max-w-[85%]"
                  style={msg.role === "user" ? { backgroundColor: "#1C1008", color: "#F5EFE6" } : { backgroundColor: "#EDE3D5", color: "#1C1008", border: "1px solid #D4B896" }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-xl" style={{ backgroundColor: "#EDE3D5", border: "1px solid #D4B896" }}>
                  <Loader2 className="w-3 h-3 animate-spin" style={{ color: "#C9A87C" }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="px-3 py-3 border-t flex gap-2" style={{ borderColor: "#D4B896" }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
              placeholder="Ask me anything..." className="flex-1 text-xs px-3 py-2 rounded-lg outline-none"
              style={{ backgroundColor: "#EDE3D5", border: "1px solid #D4B896", color: "#1C1008" }} />
            <button onClick={send} disabled={loading || !input.trim()} className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-40" style={{ backgroundColor: "#C9A87C" }}>
              <Send className="w-3.5 h-3.5" style={{ color: "#1C1008" }} />
            </button>
          </div>
        </div>
      )}
      <button onClick={() => setOpen(o => !o)} className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center hover:scale-105 transition-transform" style={{ backgroundColor: "#C9A87C" }}>
        {open ? <X className="w-5 h-5" style={{ color: "#1C1008" }} /> : <MessageCircle className="w-6 h-6" style={{ color: "#1C1008" }} />}
      </button>
    </>
  );
}

const LandingPage = () => {
  const { settings } = useSettings();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    const { data } = await (supabase as any).from("reviews").select("*").eq("visible", true).order("created_at", { ascending: false }).limit(6);
    setReviews(data ?? []);
  };

  const logo = settings?.logo_url || "https://tlepcrmwidzbkmkvmpdd.supabase.co/storage/v1/object/public/avatars/logo_1764609621458.jpg";
  const bizName = (settings as any)?.business_name || "Zolara Beauty Studio";
  const openTime = (settings as any)?.open_time || "8:30 AM";
  const closeTime = (settings as any)?.close_time || "9:00 PM";
  const phone = (settings as any)?.business_phone || "0594 365 314";
  const address = (settings as any)?.business_address || "Sakasaka, Tamale";

  const navLinks = [
    { href: "#experience", label: "Experience" },
    { href: "#services", label: "Services" },
    { href: "#gift-cards", label: "Gift Cards" },
    { href: "#reviews", label: "Reviews" },
    { href: "#visit", label: "Visit Us" },
  ];

  const features = [
    { icon: Wifi, title: "Free High-Speed WiFi", desc: "Stay connected while you unwind. Premium WiFi available throughout the studio." },
    { icon: Droplets, title: "Complimentary Water", desc: "Every client receives chilled bottled water upon arrival. Because you deserve it." },
    { icon: Star, title: "Loyalty Rewards", desc: "Ghana's first salon loyalty program. Earn points on every visit and redeem for free services." },
    { icon: Users, title: "Professional Team", desc: "Trained, certified specialists in every category. Your look is in expert hands." },
    { icon: Home, title: "Serene Environment", desc: "Marble floors, warm lighting, and a calm atmosphere curated for total relaxation." },
    { icon: Sparkles, title: "The Exit Ritual", desc: "Leave with a perfume spritz, mirror check, and the confidence you came for." },
    { icon: Lock, title: "Private & Comfortable", desc: "A safe, clean space where every client is treated with discretion and respect." },
    { icon: Clock, title: "Flexible Hours", desc: "Open every day from 8:30 AM to 9:00 PM. Book around your schedule." },
  ];

  const services = [
    { num: "01", name: "Hair & Braiding", desc: "Cornrows, knotless braids, Fulani, Rasta, Boho styles, retouching, natural styling and kids services. Extensions included.", price: "FROM GHS 80" },
    { num: "02", name: "Nail Artistry", desc: "Gel polish, acrylic sets, nail art, manicures, and toenail services using top-tier products.", price: "FROM GHS 60" },
    { num: "03", name: "Lash Extensions", desc: "Cluster, Classic, Hybrid, Wispy, Volume and Mega Volume sets. Refills and professional removal available.", price: "FROM GHS 65" },
    { num: "04", name: "Makeup", desc: "Natural Glow, Soft Glam, Full Glam, Bridal packages, photoshoot and stage makeup by certified artists.", price: "FROM GHS 125" },
    { num: "05", name: "Pedicure & Manicure", desc: "Classic, Jelly and Signature Pedicures. Classic and Special Manicures. Combo packages available.", price: "FROM GHS 100" },
    { num: "06", name: "Wigs & Styling", desc: "Glueless, glued, HD lace and full lace installs. Wig customisation, coloring, sew-ins and natural hair styling.", price: "FROM GHS 150" },
  ];

  const giftTiers = [
    { name: "SILVER", price: "GHS 220" },
    { name: "GOLD", price: "GHS 450" },
    { name: "PLATINUM", price: "GHS 650" },
    { name: "DIAMOND", price: "GHS 1,000" },
  ];

  const faqs = [
    { q: "Do I need to book an appointment in advance?", a: "We strongly recommend booking in advance to secure your preferred time slot. Walk-ins are welcome based on availability." },
    { q: "What is your cancellation policy?", a: "We ask for at least 24 hours notice for cancellations. Late cancellations may incur a fee." },
    { q: "Do you provide all the products and materials?", a: "Yes. All products and materials are provided by Zolara. We use only premium, top-tier products." },
    { q: "How long do different services typically take?", a: "Service times vary. Hair braiding can take 2-6 hours. Nails take 1-2 hours. Lashes take 1-2 hours. Makeup takes 1-2 hours." },
    { q: "Can I bring friends or family during my appointment?", a: "Absolutely. We welcome guests and offer a comfortable waiting area with WiFi and refreshments." },
    { q: "What forms of payment do you accept?", a: "We accept cash, mobile money (MTN, Vodafone, AirtelTigo), and bank transfers." },
  ];

  const packages = [
    { badge: "MOST POPULAR", name: "The Full Zolara", sub: "Complete Transformation", items: ["Hair styling or braids", "Full glam makeup", "Classic manicure", "Lash extensions"] },
    { badge: "PREMIUM", name: "Bridal Beauty", sub: "Your Special Day", items: ["Bridal makeup & trial", "Hair styling", "Manicure & pedicure", "Lash extensions"] },
    { badge: "FUN & SOCIAL", name: "Friends Package", sub: "Group of 3+", items: ["Any 2 services per person", "Complimentary refreshments", "Group photos", "Special group rates"] },
  ];

  const S = { bg: "#F5EFE6", dark: "#1C1008", gold: "#C9A87C", mid: "#EDE3D5", border: "#D4B896", muted: "#6B5744", light: "#8B7355" };

  return (
    <div style={{ backgroundColor: S.bg, color: S.dark, fontFamily: "Inter, sans-serif" }}>
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b" style={{ backgroundColor: S.bg, borderColor: S.border }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Zolara" className="w-10 h-10 rounded-full object-cover border-2" style={{ borderColor: S.gold }} />
            <div className="hidden sm:block">
              <p className="text-xs font-bold tracking-widest uppercase" style={{ color: S.gold }}>Zolara</p>
              <p className="text-[10px] tracking-widest uppercase" style={{ color: S.light }}>Beauty Studio</p>
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map(({ href, label }) => (
              <a key={href} href={href} className="text-xs font-semibold tracking-widest uppercase hover:opacity-60 transition-opacity" style={{ color: S.dark }}>{label}</a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link to="/book">
              <button className="text-xs font-bold tracking-widest uppercase px-5 py-2.5" style={{ backgroundColor: S.gold, color: S.dark }}> BOOK NOW </button>
            </Link>
            <button className="md:hidden" onClick={() => setMobileOpen(o => !o)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="md:hidden border-t px-6 py-5 flex flex-col gap-5" style={{ backgroundColor: S.bg, borderColor: S.border }}>
            {navLinks.map(({ href, label }) => (
              <a key={href} href={href} onClick={() => setMobileOpen(false)} className="text-sm font-semibold tracking-widest uppercase" style={{ color: S.dark }}>{label}</a>
            ))}
          </div>
        )}
      </nav>

      {/* HERO */}
      <section id="experience" className="min-h-screen flex items-center pt-20">
        <div className="max-w-7xl mx-auto px-6 w-full grid md:grid-cols-2 gap-12 items-center py-20">
          <div>
            <h1 className="leading-tight mb-6" style={{ fontFamily: "Playfair Display, Georgia, serif", fontSize: "clamp(3.5rem, 7vw, 6rem)", fontWeight: 400, color: S.dark }}>
              Where Luxury<br />
              <span className="italic" style={{ color: S.gold, fontStyle: "italic" }}>Meets Beauty</span>
              <span>.</span>
            </h1>
            <p className="text-base leading-relaxed mb-10 max-w-md" style={{ color: S.muted }}>
              A sanctuary of beauty, comfort, and professional excellence. Every detail of your experience at Zolara is crafted to make you feel extraordinary.
            </p>
            <div className="flex flex-col gap-3 max-w-sm">
              <div className="flex gap-3">
                <Link to="/book" className="flex-1">
                  <button className="w-full text-xs font-bold tracking-widest uppercase px-4 py-3.5" style={{ backgroundColor: S.gold, color: S.dark }}>
                    BOOK YOUR APPOINTMENT →
                  </button>
                </Link>
                <Link to="/buy-gift-card">
                  <button className="text-xs font-bold tracking-widest uppercase px-4 py-3.5 border" style={{ borderColor: S.dark, color: S.dark, backgroundColor: "transparent" }}>
                    🎁 GIFT CARDS
                  </button>
                </Link>
              </div>
              <a href="#services">
                <button className="w-full text-xs font-bold tracking-widest uppercase px-4 py-3.5 border" style={{ borderColor: S.dark, color: S.dark, backgroundColor: "transparent" }}>
                  VIEW SERVICES
                </button>
              </a>
            </div>
            <div className="flex flex-wrap gap-6 mt-10">
              {["FREE WIFI", "FREE WATER", "LOYALTY REWARDS", "EXPERT STYLISTS"].map(p => (
                <span key={p} className="text-[11px] font-semibold tracking-wider" style={{ color: S.light }}>+ {p}</span>
              ))}
            </div>
          </div>
          <div className="flex justify-center md:justify-end">
            <div className="rounded-2xl p-8 shadow-xl max-w-sm w-full" style={{ backgroundColor: S.mid, border: `1px solid ${S.border}` }}>
              <img src={logo} alt="Zolara" className="w-14 h-14 rounded-full object-cover mx-auto mb-5 border-2" style={{ borderColor: S.gold }} />
              <p className="text-center italic text-xl mb-6 leading-snug" style={{ fontFamily: "Playfair Display, Georgia, serif", color: "#4A3728" }}>
                "Not just a salon: a complete luxury experience."
              </p>
              <div className="border-t pt-5 space-y-4" style={{ borderColor: S.border }}>
                <div>
                  <p className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: S.gold }}>OPEN DAILY</p>
                  <p className="text-sm font-medium">{openTime} — {closeTime}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: S.gold }}>LOCATION</p>
                  <p className="text-sm font-medium">{address}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: S.gold }}>CALL US</p>
                  <p className="text-sm font-medium">0594 365 314 / 020 884 8707</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AN EXPERIENCE BEYOND BEAUTY */}
      <section className="py-24" style={{ backgroundColor: S.bg }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[11px] font-bold tracking-widest uppercase mb-3" style={{ color: S.gold }}>THE ZOLARA DIFFERENCE</p>
            <h2 className="text-5xl mb-3" style={{ fontFamily: "Playfair Display, Georgia, serif", color: S.dark }}>
              An Experience <span className="italic" style={{ color: S.gold }}>Beyond</span> Beauty
            </h2>
            <div className="w-12 h-0.5 mx-auto mb-6" style={{ backgroundColor: S.gold }} />
            <p className="text-base max-w-xl mx-auto" style={{ color: S.muted }}>
              We believe a salon visit should feel like an escape. Every element of Zolara is designed to comfort, elevate, and indulge you.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-6 rounded-xl" style={{ backgroundColor: S.mid, border: `1px solid ${S.border}` }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${S.gold}20` }}>
                  <Icon className="w-5 h-5" style={{ color: S.gold }} />
                </div>
                <h3 className="text-sm font-semibold mb-2" style={{ color: S.dark }}>{title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: S.muted }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OUR STORY */}
      <section className="py-24" style={{ backgroundColor: S.mid }}>
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-start">
          <div>
            <p className="text-[11px] font-bold tracking-widest uppercase mb-4" style={{ color: S.gold }}>OUR STORY</p>
            <h2 className="text-5xl mb-4 leading-tight" style={{ fontFamily: "Playfair Display, Georgia, serif", color: S.dark }}>
              Redefining Beauty <span className="italic" style={{ color: S.gold }}>Standards</span> in Tamale
            </h2>
            <div className="w-12 h-0.5 mb-8" style={{ backgroundColor: S.gold }} />
            <p className="text-sm leading-relaxed mb-4" style={{ color: S.muted }}>
              Zolara Beauty Studio was born from a vision to bring world-class luxury beauty services to Northern Ghana. We believe every woman deserves to feel extraordinary, confident, and beautiful.
            </p>
            <p className="text-sm leading-relaxed mb-8" style={{ color: S.muted }}>
              Our commitment goes beyond beauty treatments. We are creating an experience where luxury meets authenticity, where modern techniques honor natural beauty, and where every client leaves feeling transformed.
            </p>
            <div className="space-y-4">
              {[
                { title: "Premium Standards", desc: "International quality products and techniques" },
                { title: "Authentic Luxury", desc: "Genuine hospitality with sophisticated service" },
                { title: "Community Pride", desc: "Elevating Tamale's beauty industry together" },
              ].map(({ title, desc }) => (
                <div key={title} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: S.gold }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: S.dark }}>{title}</p>
                    <p className="text-xs" style={{ color: S.muted }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl p-8" style={{ backgroundColor: S.bg, border: `1px solid ${S.border}` }}>
            <h3 className="text-xl font-semibold text-center mb-8" style={{ fontFamily: "Playfair Display, Georgia, serif", color: S.dark }}>Our Values</h3>
            <div className="space-y-5">
              {[
                { emoji: "✨", title: "Excellence", desc: "Every service delivered with precision and care" },
                { emoji: "💎", title: "Luxury", desc: "Premium experience in every detail" },
                { emoji: "⭐", title: "Authenticity", desc: "Celebrating natural beauty with modern techniques" },
                { emoji: "💝", title: "Hospitality", desc: "Warm, professional service that feels personal" },
              ].map(({ emoji, title, desc }) => (
                <div key={title} className="flex items-center gap-4">
                  <span className="text-2xl">{emoji}</span>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: S.dark }}>{title}</p>
                    <p className="text-xs" style={{ color: S.muted }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="py-24" style={{ backgroundColor: S.bg }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[11px] font-bold tracking-widest uppercase mb-3" style={{ color: S.gold }}>WHAT WE OFFER</p>
            <h2 className="text-5xl mb-3" style={{ fontFamily: "Playfair Display, Georgia, serif", color: S.dark }}>
              Services <span className="italic" style={{ color: S.gold }}>Designed</span> for You
            </h2>
            <div className="w-12 h-0.5 mx-auto mb-6" style={{ backgroundColor: S.gold }} />
            <p className="text-base max-w-xl mx-auto" style={{ color: S.muted }}>
              From everyday elegance to special occasion transformations, we do it all with precision and care.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {services.map(({ num, name, desc, price }) => (
              <div key={name} className="p-8 rounded-xl" style={{ backgroundColor: S.mid, border: `1px solid ${S.border}` }}>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-8 h-0.5" style={{ backgroundColor: S.gold }} />
                  <span className="text-3xl font-light" style={{ color: `${S.gold}40` }}>{num}</span>
                </div>
                <h3 className="text-lg font-semibold mb-3" style={{ fontFamily: "Playfair Display, Georgia, serif", color: S.dark }}>{name}</h3>
                <p className="text-sm leading-relaxed mb-5" style={{ color: S.muted }}>{desc}</p>
                <p className="text-xs font-bold tracking-widest" style={{ color: S.gold }}>{price}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link to="/book">
              <button className="text-xs font-bold tracking-widest uppercase px-10 py-4" style={{ backgroundColor: S.gold, color: S.dark }}>
                BOOK ANY SERVICE →
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* PACKAGES */}
      <section className="py-24" style={{ backgroundColor: S.mid }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[11px] font-bold tracking-widest uppercase mb-3" style={{ color: S.gold }}>COMING SOON</p>
            <h2 className="text-5xl mb-3" style={{ fontFamily: "Playfair Display, Georgia, serif", color: S.dark }}>
              Luxury <span className="italic" style={{ color: S.gold }}>Packages</span> & Experiences
            </h2>
            <div className="w-12 h-0.5 mx-auto mb-6" style={{ backgroundColor: S.gold }} />
            <p className="text-base max-w-xl mx-auto" style={{ color: S.muted }}>
              We are crafting exclusive packages that deliver the complete Zolara experience. Get ready for luxury beauty packages that exceed expectations.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {packages.map(({ badge, name, sub, items }) => (
              <div key={name} className="rounded-xl p-8" style={{ backgroundColor: S.bg, border: `1px solid ${S.border}` }}>
                <div className="mb-6">
                  <span className="text-[10px] font-bold tracking-widest px-3 py-1 rounded-full" style={{ backgroundColor: S.gold, color: S.dark }}>{badge}</span>
                </div>
                <h3 className="text-xl font-semibold mb-1" style={{ fontFamily: "Playfair Display, Georgia, serif", color: S.dark }}>{name}</h3>
                <p className="text-xs mb-6" style={{ color: S.muted }}>{sub}</p>
                <ul className="space-y-2 mb-8">
                  {items.map(item => (
                    <li key={item} className="flex items-center gap-2 text-sm" style={{ color: S.muted }}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: S.gold }} />{item}
                    </li>
                  ))}
                </ul>
                <p className="text-xs font-semibold mb-1" style={{ color: S.light }}>Exclusive Package</p>
                <p className="text-lg font-semibold mb-1" style={{ fontFamily: "Playfair Display, Georgia, serif", color: S.gold }}>Coming Soon</p>
                <p className="text-xs mb-6" style={{ color: S.muted }}>Pricing details available at booking</p>
                <Link to="/book">
                  <button className="w-full text-xs font-bold tracking-widest uppercase py-3" style={{ backgroundColor: S.gold, color: S.dark }}>
                    BOOK CONSULTATION
                  </button>
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-xs mt-8" style={{ color: S.muted }}>
            <strong>Package Information:</strong> Detailed pricing and package availability will be announced soon. Packages are designed to offer the complete Zolara luxury experience with premium value.
          </p>
        </div>
      </section>

      {/* GIFT CARDS */}
      <section id="gift-cards" className="py-24" style={{ backgroundColor: "#1C1008" }}>
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-[11px] font-bold tracking-widest uppercase mb-4" style={{ color: S.gold }}>EXCLUSIVE GIFTING</p>
            <h2 className="text-5xl mb-6 leading-tight" style={{ fontFamily: "Playfair Display, Georgia, serif", color: S.bg }}>
              Give the Gift of <span className="italic" style={{ color: S.gold }}>Luxury</span>
            </h2>
            <p className="text-sm leading-relaxed mb-8" style={{ color: "#D4C4B0" }}>
              The Zolara Gift Card is the perfect present for the women in your life who deserve the finest. Available for any occasion: birthdays, anniversaries, graduations, or simply because she deserves it.
            </p>
            <ul className="space-y-3 mb-10">
              {["Valid for 12 months from date of purchase", "Redeemable for any service at Zolara", "Minor overages covered by Zolara (up to GHS 50)", "Cannot be split across multiple visits"].map(item => (
                <li key={item} className="flex items-center gap-3 text-sm" style={{ color: "#D4C4B0" }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: S.gold }} />{item}
                </li>
              ))}
            </ul>
            <div className="grid grid-cols-2 gap-3 mb-8">
              {giftTiers.map(({ name, price }) => (
                <div key={name} className="flex justify-between items-center px-4 py-3 rounded" style={{ border: `1px solid ${S.gold}40`, backgroundColor: `${S.gold}10` }}>
                  <span className="text-xs font-bold tracking-wider" style={{ color: "#D4C4B0" }}>{name}</span>
                  <span className="text-xs font-bold" style={{ color: S.gold }}>{price}</span>
                </div>
              ))}
            </div>
            <Link to="/buy-gift-card">
              <button className="text-xs font-bold tracking-widest uppercase px-8 py-4" style={{ backgroundColor: S.gold, color: S.dark }}>
                PURCHASE A GIFT CARD →
              </button>
            </Link>
          </div>
          <div className="rounded-2xl p-8" style={{ backgroundColor: "#2C1F14", border: `1px solid ${S.gold}40` }}>
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-base font-semibold mb-1" style={{ color: S.bg }}>{bizName} Ltd</p>
                <p className="text-[11px] tracking-widest uppercase" style={{ color: S.gold }}>GIFT CARD</p>
              </div>
              <Star className="w-5 h-5" style={{ color: S.gold }} />
            </div>
            <p className="text-xs mb-2" style={{ color: "#8B7355" }}>VALUE</p>
            <p className="text-5xl font-light mb-8" style={{ fontFamily: "Playfair Display, Georgia, serif", color: S.gold }}>GHS 500</p>
            <div className="flex justify-between pt-6 border-t" style={{ borderColor: `${S.gold}30` }}>
              <div>
                <p className="text-[10px] tracking-widest uppercase mb-1" style={{ color: "#8B7355" }}>VALID FOR</p>
                <p className="text-xs" style={{ color: S.bg }}>All Services</p>
              </div>
              <div>
                <p className="text-[10px] tracking-widest uppercase mb-1" style={{ color: "#8B7355" }}>LOCATION</p>
                <p className="text-xs" style={{ color: S.bg }}>Sakasaka, Tamale</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24" style={{ backgroundColor: "#1C1008" }}>
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[11px] font-bold tracking-widest uppercase mb-3" style={{ color: S.gold }}>COMMON QUESTIONS</p>
            <h2 className="text-5xl" style={{ fontFamily: "Playfair Display, Georgia, serif", color: S.bg }}>
              Everything You <span className="italic" style={{ color: S.gold }}>Need to Know</span>
            </h2>
            <div className="w-12 h-0.5 mx-auto mt-4" style={{ backgroundColor: S.gold }} />
          </div>
          <div className="space-y-3">
            {faqs.map(({ q, a }, i) => (
              <div key={i} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${S.gold}20`, backgroundColor: "#2C1F14" }}>
                <button className="w-full flex justify-between items-center px-6 py-5 text-left" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span className="text-sm font-medium" style={{ color: S.bg }}>{q}</span>
                  <ChevronDown className="w-4 h-4 flex-shrink-0 transition-transform" style={{ color: S.gold, transform: openFaq === i ? "rotate(180deg)" : "none" }} />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5">
                    <p className="text-sm leading-relaxed" style={{ color: "#D4C4B0" }}>{a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-16 rounded-2xl p-10 text-center" style={{ backgroundColor: "#2C1F14", border: `1px solid ${S.gold}30` }}>
            <h3 className="text-xl font-semibold mb-3" style={{ fontFamily: "Playfair Display, Georgia, serif", color: S.bg }}>Still Have Questions?</h3>
            <p className="text-sm mb-6" style={{ color: "#D4C4B0" }}>Our friendly team is here to help. Call us or chat with Amanda, our AI beauty consultant.</p>
            <div className="flex justify-center gap-4">
              <a href={`tel:${phone}`}>
                <button className="text-xs font-bold tracking-widest uppercase px-6 py-3 rounded-lg" style={{ backgroundColor: S.gold, color: S.dark }}>📞 Call Us</button>
              </a>
              <Link to="/book">
                <button className="text-xs font-bold tracking-widest uppercase px-6 py-3 rounded-lg border" style={{ borderColor: S.gold, color: S.gold, backgroundColor: "transparent" }}>📅 Book Now</button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section id="reviews" className="py-24" style={{ backgroundColor: S.bg }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[11px] font-bold tracking-widest uppercase mb-3" style={{ color: S.gold }}>CLIENT STORIES</p>
            <h2 className="text-5xl mb-3" style={{ fontFamily: "Playfair Display, Georgia, serif", color: S.dark }}>
              Words from Our <span className="italic" style={{ color: S.gold }}>Clients</span>
            </h2>
            <div className="w-12 h-0.5 mx-auto" style={{ backgroundColor: S.gold }} />
          </div>
          {reviews.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-6">
              {reviews.map(review => (
                <div key={review.id} className="p-8 rounded-xl" style={{ backgroundColor: S.mid, border: `1px solid ${S.border}` }}>
                  <div className="text-3xl font-serif mb-4" style={{ color: S.gold }}>"</div>
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="w-4 h-4" fill={i < review.rating ? S.gold : "none"} style={{ color: S.gold }} />
                    ))}
                  </div>
                  <p className="text-sm italic leading-relaxed mb-6" style={{ color: S.muted }}>"{review.comment}"</p>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-0.5" style={{ backgroundColor: S.gold }} />
                    <p className="text-xs font-bold tracking-widest uppercase" style={{ color: S.dark }}>{review.name}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm" style={{ color: S.muted }}>Be the first to share your experience.</p>
          )}
        </div>
      </section>

      {/* READY CTA */}
      <section className="py-32" style={{ backgroundColor: "#1C1008", backgroundImage: "radial-gradient(ellipse at center, #2C1F14 0%, #1C1008 70%)" }}>
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-[11px] font-bold tracking-widest uppercase mb-6" style={{ color: S.gold }}>YOUR TRANSFORMATION AWAITS</p>
          <h2 className="text-6xl mb-8 leading-tight" style={{ fontFamily: "Playfair Display, Georgia, serif", color: S.bg }}>
            Ready to Experience<br /><span className="italic" style={{ color: S.gold }}>True Luxury?</span>
          </h2>
          <p className="text-base mb-3" style={{ color: "#D4C4B0" }}>Join hundreds of women in Tamale who have made Zolara their beauty home.</p>
          <p className="text-base mb-10" style={{ color: "#D4C4B0" }}>You deserve the best. That is exactly what we deliver.</p>
          <Link to="/book">
            <button className="text-xs font-bold tracking-widest uppercase px-10 py-5" style={{ backgroundColor: S.gold, color: S.dark }}>
              BOOK YOUR EXPERIENCE
            </button>
          </Link>
        </div>
      </section>

      {/* VISIT US */}
      <section id="visit" className="py-24" style={{ backgroundColor: S.bg }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[11px] font-bold tracking-widest uppercase mb-3" style={{ color: S.gold }}>VISIT US</p>
            <h2 className="text-5xl mb-3" style={{ fontFamily: "Playfair Display, Georgia, serif", color: S.dark }}>
              Find Zolara <span className="italic" style={{ color: S.gold }}>Beauty Studio</span>
            </h2>
            <div className="w-12 h-0.5 mx-auto mb-6" style={{ backgroundColor: S.gold }} />
            <p className="text-base" style={{ color: S.muted }}>Located in the heart of Sakasaka, opposite CalBank. Easy to find, with convenient parking nearby.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <h3 className="text-lg font-semibold mb-8" style={{ fontFamily: "Playfair Display, Georgia, serif", color: S.dark }}>How to Find Us</h3>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${S.gold}20` }}>
                    <MapPin className="w-4 h-4" style={{ color: S.gold }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: S.dark }}>Address</p>
                    <p className="text-sm" style={{ color: S.muted }}>Sakasaka, Opposite CalBank<br />Tamale, Northern Region<br />Ghana</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${S.gold}20` }}>
                    <Clock className="w-4 h-4" style={{ color: S.gold }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: S.dark }}>Opening Hours</p>
                    <p className="text-sm" style={{ color: S.muted }}>Monday – Saturday<br />8:30 AM – 9:00 PM</p>
                    <p className="text-sm font-semibold mt-1" style={{ color: "#C0392B" }}>Closed Sundays</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <a href={`tel:${phone}`}>
                  <button className="flex items-center gap-2 text-xs font-bold tracking-widest uppercase px-5 py-3" style={{ backgroundColor: S.gold, color: S.dark }}>
                    <Phone className="w-3.5 h-3.5" /> Call Now
                  </button>
                </a>
                <a href="https://maps.google.com/?q=Zolara+Beauty+Studio+Sakasaka+Tamale+Ghana" target="_blank" rel="noopener noreferrer">
                  <button className="flex items-center gap-2 text-xs font-bold tracking-widest uppercase px-5 py-3 border" style={{ borderColor: S.gold, color: S.gold, backgroundColor: "transparent" }}>
                    <MapPin className="w-3.5 h-3.5" /> Get Directions
                  </button>
                </a>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${S.border}` }}>
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3962.5!2d-0.8393!3d9.4075!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zOcKwMjQnMjcuMCJOIDDCsDUwJzIxLjUiVw!5e0!3m2!1sen!2sgh!4v1234567890"
                width="100%" height="350" style={{ border: 0 }} allowFullScreen loading="lazy"
                title="Zolara Beauty Studio Location"
              />
              <div className="p-5" style={{ backgroundColor: S.mid }}>
                <h4 className="text-sm font-semibold mb-4 text-center" style={{ color: S.dark }}>Nearby Landmarks</h4>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { name: "CalBank", dist: "Directly opposite" },
                    { name: "Tamale Central Mosque", dist: "5 min walk" },
                    { name: "Central Market", dist: "10 min walk" },
                    { name: "Taxi Rank", dist: "2 min walk" },
                  ].map(({ name, dist }) => (
                    <div key={name} className="text-center">
                      <p className="text-xs font-semibold" style={{ color: S.dark }}>{name}</p>
                      <p className="text-[11px]" style={{ color: S.muted }}>{dist}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT STRIP */}
      <section className="py-16" style={{ backgroundColor: S.dark }}>
        <div className="max-w-4xl mx-auto px-6 grid md:grid-cols-3 gap-8 text-center">
          <div>
            <MapPin className="w-6 h-6 mx-auto mb-3" style={{ color: S.gold }} />
            <p className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: S.gold }}>FIND US</p>
            <p className="text-sm" style={{ color: "#D4C4B0" }}>Sakasaka, Opposite CalBank, Tamale</p>
            <p className="text-xs mt-1" style={{ color: "#8B7355" }}>Ghana</p>
          </div>
          <div>
            <Phone className="w-6 h-6 mx-auto mb-3" style={{ color: S.gold }} />
            <p className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: S.gold }}>CALL US</p>
            <p className="text-sm" style={{ color: "#D4C4B0" }}>0594 365 314 + 020 884 8707</p>
            <p className="text-xs mt-1" style={{ color: "#8B7355" }}>Two lines available</p>
          </div>
          <div>
            <Clock className="w-6 h-6 mx-auto mb-3" style={{ color: S.gold }} />
            <p className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: S.gold }}>OPENING HOURS</p>
            <p className="text-sm" style={{ color: "#D4C4B0" }}>08:30 to 21:00</p>
            <p className="text-xs mt-1" style={{ color: "#8B7355" }}>Monday to Saturday</p>
          </div>
        </div>
      </section>

      {/* STAY BEAUTIFUL + BEAUTY TIPS */}
      <section className="py-24" style={{ backgroundColor: S.bg }}>
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16">
          <div>
            <h2 className="text-5xl mb-4 leading-tight" style={{ fontFamily: "Playfair Display, Georgia, serif", color: S.dark }}>
              Stay <span className="italic" style={{ color: S.gold }}>Beautiful</span>
            </h2>
            <div className="w-12 h-0.5 mb-8" style={{ backgroundColor: S.gold }} />
            <p className="text-sm leading-relaxed mb-6" style={{ color: S.muted }}>
              Join our exclusive newsletter for beauty tips, seasonal promotions, new service announcements, and insider access to Zolara's luxury world.
            </p>
            <ul className="space-y-3 mb-8">
              {["Monthly beauty tips & tutorials", "Exclusive promotions & early access", "New service announcements", "Seasonal style inspiration"].map(item => (
                <li key={item} className="flex items-center gap-3 text-sm" style={{ color: S.muted }}>
                  <span>💄</span>{item}
                </li>
              ))}
            </ul>
            <div className="rounded-xl p-6" style={{ backgroundColor: S.mid, border: `1px solid ${S.border}` }}>
              <input type="email" placeholder="Enter your email address" className="w-full px-4 py-3 text-sm rounded-lg mb-3 outline-none" style={{ backgroundColor: S.bg, border: `1px solid ${S.border}`, color: S.dark }} />
              <button className="w-full text-xs font-bold tracking-widest uppercase py-3" style={{ backgroundColor: S.gold, color: S.dark }}>
                SUBSCRIBE TO BEAUTY UPDATES
              </button>
              <p className="text-center text-xs mt-3" style={{ color: S.light }}>No spam, just beauty. Unsubscribe anytime.</p>
            </div>
          </div>
          <div>
            <h3 className="text-2xl mb-8" style={{ fontFamily: "Playfair Display, Georgia, serif", color: S.dark }}>Beauty Tips from Zolara</h3>
            <div className="space-y-4">
              {[
                { emoji: "🌙", title: "Protect Your Braids at Night", tip: "Sleep with a silk or satin scarf to reduce friction and maintain your style longer. This simple habit can extend your braid lifespan by weeks." },
                { emoji: "👁️", title: "Lash Extension Care", tip: "Avoid oil-based products near your eyes and gently brush lashes daily with a spoolie. Never pull or tug on extensions." },
                { emoji: "💅", title: "Nail Health First", tip: "Always use a base coat to protect your natural nails and moisturize your cuticles daily with vitamin E oil or cuticle cream." },
                { emoji: "💄", title: "Makeup Longevity", tip: "Set your makeup with translucent powder and use a setting spray for all-day wear. Prime your skin for best results." },
              ].map(({ emoji, title, tip }) => (
                <div key={title} className="flex items-start gap-4 p-5 rounded-xl" style={{ backgroundColor: S.mid, border: `1px solid ${S.border}` }}>
                  <span className="text-2xl">{emoji}</span>
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: S.dark }}>{title}</p>
                    <p className="text-xs leading-relaxed" style={{ color: S.muted }}>{tip}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-xl p-6 text-center" style={{ backgroundColor: S.mid, border: `1px solid ${S.border}` }}>
              <p className="text-sm mb-4" style={{ color: S.muted }}>Want personalized beauty advice? Our specialists are here to help.</p>
              <Link to="/book">
                <button className="text-xs font-bold tracking-widest uppercase px-6 py-3 border" style={{ borderColor: S.gold, color: S.gold, backgroundColor: "transparent" }}>
                  📅 Book a Consultation
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-16" style={{ backgroundColor: S.dark }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src={logo} alt="Zolara" className="w-10 h-10 rounded-full object-cover border-2" style={{ borderColor: S.gold }} />
                <div>
                  <p className="text-sm font-bold" style={{ color: S.bg }}>{bizName} Ltd</p>
                </div>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "#6B5744" }}>Tamale's premier luxury beauty studio. Where every visit is an experience and every client leaves extraordinary.</p>
              <div className="flex gap-2 mt-5">
                <SocialIcon url="https://www.instagram.com/zolarastudio" style={{ width: 30, height: 30 }} />
                <SocialIcon url="https://www.tiktok.com/@zolarastudio" style={{ width: 30, height: 30 }} />
                <SocialIcon url="https://x.com/zolarastudio" style={{ width: 30, height: 30 }} />
                <SocialIcon url="https://www.threads.com/@zolarastudio" style={{ width: 30, height: 30 }} />
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold tracking-widest uppercase mb-5" style={{ color: S.gold }}>SERVICES</h4>
              <ul className="space-y-2">
                {["Braiding", "Wig Install", "Nail Care", "Lash Extensions", "Makeup", "Loyalty Program"].map(s => (
                  <li key={s}><Link to="/book" className="text-xs hover:opacity-80 transition-opacity" style={{ color: "#6B5744" }}>{s}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold tracking-widest uppercase mb-5" style={{ color: S.gold }}>VISIT US</h4>
              <div className="space-y-1 text-xs" style={{ color: "#6B5744" }}>
                <p>Sakasaka</p>
                <p>Opposite CalBank</p>
                <p>Tamale, Ghana</p>
                <p className="mt-3">Mon to Sat</p>
                <p>8:30 AM to 9:00 PM</p>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold tracking-widest uppercase mb-5" style={{ color: S.gold }}>QUICK LINKS</h4>
              <ul className="space-y-2">
                {navLinks.map(({ href, label }) => (
                  <li key={href}><a href={href} className="text-xs hover:opacity-80 transition-opacity" style={{ color: "#6B5744" }}>{label}</a></li>
                ))}
                <li><Link to="/book" className="text-xs hover:opacity-80 transition-opacity" style={{ color: "#6B5744" }}>Book Appointment</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4" style={{ borderColor: "#2C1F14" }}>
            <p className="text-xs" style={{ color: "#4A3728" }}>© {new Date().getFullYear()} {bizName} Ltd. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <span className="text-xs italic" style={{ color: "#4A3728" }}>Luxury. Redefined.</span>
              <Link to="/app/auth" className="text-xs font-semibold hover:opacity-80 transition-opacity" style={{ color: S.gold }}>STAFF LOGIN</Link>
            </div>
          </div>
        </div>
      </footer>

      <AmandaWidget />
    </div>
  );
};

export default LandingPage;
