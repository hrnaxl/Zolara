import { Link } from "react-router-dom";

const LandingPage = () => {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#EDE3D8", fontFamily: "'Inter', sans-serif" }}>

      {/* NAVBAR */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        backgroundColor: "#EDE3D8",
        borderBottom: "1px solid rgba(180,150,100,0.15)",
        padding: "0 40px", height: "64px",
        display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", border: "1px solid #B8956A", overflow: "hidden", backgroundColor: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src="https://ekvjnydomfresnkealpb.supabase.co/storage/v1/object/public/avatars/logo_1764609621458.jpg" alt="Zolara" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div>
            <div style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.15em", color: "#2C2416" }}>ZOLARA</div>
            <div style={{ fontSize: "9px", letterSpacing: "0.2em", color: "#8B7355", marginTop: "-2px" }}>BEAUTY STUDIO</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "36px", alignItems: "center" }}>
          {[["#experience","EXPERIENCE"],["#services","SERVICES"],["#gift-cards","GIFT CARDS"],["#reviews","REVIEWS"],["#visit-us","VISIT US"]].map(([href, label]) => (
            <a key={label} href={href} style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.12em", color: "#2C2416", textDecoration: "none" }}>{label}</a>
          ))}
        </div>

        <Link to="/book" style={{ textDecoration: "none" }}>
          <button style={{ backgroundColor: "#8B6914", color: "#fff", border: "none", padding: "10px 24px", fontSize: "11px", fontWeight: 600, letterSpacing: "0.12em", cursor: "pointer", borderRadius: "2px" }}>
            BOOK NOW
          </button>
        </Link>
      </nav>

      {/* HERO */}
      <section style={{ paddingTop: "64px", minHeight: "100vh", display: "flex", alignItems: "center", padding: "64px 80px 40px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", paddingTop: "40px" }}>

          {/* Left */}
          <div style={{ maxWidth: "540px" }}>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(48px,7vw,88px)", fontWeight: 700, color: "#2C2416", lineHeight: 1.05, margin: "0 0 4px" }}>
              Where Luxury
            </h1>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(48px,7vw,88px)", fontWeight: 400, fontStyle: "italic", color: "#B8956A", lineHeight: 1.05, margin: "0 0 32px" }}>
              Meets Beauty<span style={{ color: "#2C2416", fontStyle: "normal" }}>.</span>
            </h1>
            <p style={{ fontSize: "15px", color: "#5C4D3A", lineHeight: 1.7, marginBottom: "40px", maxWidth: "420px" }}>
              A sanctuary of beauty, comfort, and professional excellence. Every detail of your experience at Zolara is crafted to make you feel extraordinary.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "flex-start" }}>
              <Link to="/book" style={{ textDecoration: "none" }}>
                <button style={{ backgroundColor: "#8B6914", color: "#fff", border: "none", padding: "14px 32px", fontSize: "12px", fontWeight: 600, letterSpacing: "0.1em", cursor: "pointer", borderRadius: "2px" }}>
                  BOOK YOUR APPOINTMENT →
                </button>
              </Link>
              <Link to="/gift-cards" style={{ textDecoration: "none" }}>
                <button style={{ backgroundColor: "transparent", color: "#2C2416", border: "1.5px solid #2C2416", padding: "13px 32px", fontSize: "12px", fontWeight: 600, letterSpacing: "0.1em", cursor: "pointer", borderRadius: "2px" }}>
                  🎁 GIFT CARDS
                </button>
              </Link>
              <a href="#services" style={{ textDecoration: "none" }}>
                <button style={{ backgroundColor: "transparent", color: "#2C2416", border: "1.5px solid #2C2416", padding: "13px 32px", fontSize: "12px", fontWeight: 600, letterSpacing: "0.1em", cursor: "pointer", borderRadius: "2px" }}>
                  VIEW SERVICES
                </button>
              </a>
            </div>
          </div>

          {/* Right card */}
          <div style={{ backgroundColor: "#D9CAB8", borderRadius: "4px", padding: "48px 40px", width: "280px", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", border: "2px solid #B8956A", overflow: "hidden", backgroundColor: "#fff", marginBottom: "24px" }}>
              <img src="https://ekvjnydomfresnkealpb.supabase.co/storage/v1/object/public/avatars/logo_1764609621458.jpg" alt="Zolara" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <p style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: "16px", color: "#3A2E20", textAlign: "center", lineHeight: 1.6, marginBottom: "24px" }}>
              "Not just a salon: a<br />complete luxury<br />experience."
            </p>
            <div style={{ width: "40px", height: "1px", backgroundColor: "#B8956A", marginBottom: "24px" }} />
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <p style={{ fontSize: "9px", letterSpacing: "0.15em", color: "#8B7355", fontWeight: 600, marginBottom: "4px" }}>OPEN DAILY</p>
                <p style={{ fontSize: "13px", color: "#2C2416", fontWeight: 500 }}>8:30 AM – 9:00 PM</p>
              </div>
              <div>
                <p style={{ fontSize: "9px", letterSpacing: "0.15em", color: "#8B7355", fontWeight: 600, marginBottom: "4px" }}>LOCATION</p>
                <p style={{ fontSize: "13px", color: "#2C2416", fontWeight: 500 }}>Sakasaka, Tamale</p>
              </div>
              <div>
                <p style={{ fontSize: "9px", letterSpacing: "0.15em", color: "#8B7355", fontWeight: 600, marginBottom: "4px" }}>CALL US</p>
                <p style={{ fontSize: "13px", color: "#2C2416", fontWeight: 500 }}>0594 365 314 / 020 884 8707</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BOTTOM STRIP */}
      <div style={{ borderTop: "1px solid rgba(44,36,22,0.15)", padding: "20px 80px", display: "flex", gap: "48px", alignItems: "center" }}>
        {["FREE WIFI","FREE WATER","LOYALTY REWARDS","EXPERT STYLISTS"].map(item => (
          <span key={item} style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.12em", color: "#5C4D3A", display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: "#B8956A" }}>+</span> {item}
          </span>
        ))}
      </div>

      {/* SERVICES */}
      <section id="services" style={{ padding: "80px", backgroundColor: "#E8DDD0" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <p style={{ fontSize: "10px", letterSpacing: "0.2em", color: "#8B7355", fontWeight: 600, marginBottom: "12px" }}>WHAT WE OFFER</p>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "40px", color: "#2C2416", margin: 0 }}>Our Services</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "24px" }}>
          {[
            { name: "Hair Braiding", desc: "Cornrows, box braids, twists & more", price: "From GHS 30" },
            { name: "Nail Care", desc: "Manicure, pedicure & acrylic nails", price: "From GHS 60" },
            { name: "Lash Extensions", desc: "Classic, volume & cluster lashes", price: "From GHS 50" },
            { name: "Hair Washing", desc: "Deep cleanse & conditioning", price: "From GHS 40" },
          ].map(s => (
            <div key={s.name} style={{ backgroundColor: "#D9CAB8", borderRadius: "4px", padding: "32px 24px", textAlign: "center" }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", color: "#2C2416", marginBottom: "8px" }}>{s.name}</h3>
              <p style={{ fontSize: "13px", color: "#5C4D3A", lineHeight: 1.6, marginBottom: "12px" }}>{s.desc}</p>
              <p style={{ fontSize: "12px", fontWeight: 600, color: "#8B6914", letterSpacing: "0.05em" }}>{s.price}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: "40px" }}>
          <Link to="/book">
            <button style={{ backgroundColor: "#8B6914", color: "#fff", border: "none", padding: "14px 40px", fontSize: "12px", fontWeight: 600, letterSpacing: "0.1em", cursor: "pointer", borderRadius: "2px" }}>
              BOOK AN APPOINTMENT
            </button>
          </Link>
        </div>
      </section>

      {/* EXPERIENCE */}
      <section id="experience" style={{ padding: "80px", backgroundColor: "#EDE3D8" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "80px", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: "10px", letterSpacing: "0.2em", color: "#8B7355", fontWeight: 600, marginBottom: "16px" }}>THE ZOLARA DIFFERENCE</p>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "40px", color: "#2C2416", marginBottom: "24px", lineHeight: 1.2 }}>A Complete Luxury Experience</h2>
            <p style={{ fontSize: "14px", color: "#5C4D3A", lineHeight: 1.8, marginBottom: "32px" }}>
              Every visit to Zolara is designed to be more than just a salon appointment. From the moment you walk in to the Exit Ritual. a perfume spritz, chocolate, and mirror check. you leave feeling extraordinary.
            </p>
            {["Free WiFi and complimentary bottled water","Ghana's first salon loyalty rewards program","Expert stylists with specialised training","Premium products only"].map(item => (
              <div key={item} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <span style={{ color: "#B8956A", fontSize: "16px" }}>✦</span>
                <span style={{ fontSize: "13px", color: "#5C4D3A" }}>{item}</span>
              </div>
            ))}
          </div>
          <div style={{ backgroundColor: "#D9CAB8", borderRadius: "4px", padding: "48px", textAlign: "center" }}>
            <p style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: "22px", color: "#2C2416", lineHeight: 1.6, marginBottom: "24px" }}>
              "Not just a salon: a complete luxury experience."
            </p>
            <div style={{ width: "40px", height: "1px", backgroundColor: "#B8956A", margin: "0 auto 24px" }} />
            <p style={{ fontSize: "12px", letterSpacing: "0.1em", color: "#8B7355" }}>ZOLARA BEAUTY STUDIO</p>
            <p style={{ fontSize: "12px", color: "#8B7355", marginTop: "4px" }}>Sakasaka, Tamale</p>
          </div>
        </div>
      </section>

      {/* GIFT CARDS */}
      <section id="gift-cards" style={{ padding: "80px", backgroundColor: "#2C2416", textAlign: "center" }}>
        <p style={{ fontSize: "10px", letterSpacing: "0.2em", color: "#B8956A", fontWeight: 600, marginBottom: "16px" }}>GIVE THE GIFT OF BEAUTY</p>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "40px", color: "#FFF8F0", marginBottom: "16px" }}>Gift Cards</h2>
        <p style={{ fontSize: "14px", color: "rgba(255,248,240,0.7)", lineHeight: 1.8, maxWidth: "480px", margin: "0 auto 40px" }}>
          Give someone special the gift of a luxury beauty experience at Zolara. Available in any amount.
        </p>
        <Link to="/gift-cards">
          <button style={{ backgroundColor: "#B8956A", color: "#fff", border: "none", padding: "14px 40px", fontSize: "12px", fontWeight: 600, letterSpacing: "0.1em", cursor: "pointer", borderRadius: "2px" }}>
            VIEW GIFT CARDS
          </button>
        </Link>
      </section>

      {/* VISIT US */}
      <section id="visit-us" style={{ padding: "80px", backgroundColor: "#EDE3D8" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <p style={{ fontSize: "10px", letterSpacing: "0.2em", color: "#8B7355", fontWeight: 600, marginBottom: "12px" }}>FIND US</p>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "40px", color: "#2C2416", margin: 0 }}>Visit Us</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "24px", maxWidth: "800px", margin: "0 auto" }}>
          {[
            { label: "LOCATION", value: "Sakasaka, Opposite CalBank\nTamale, Ghana" },
            { label: "CALL US", value: "0594 365 314\n020 884 8707" },
            { label: "HOURS", value: "Monday – Saturday\n8:30 AM – 9:00 PM" },
          ].map(item => (
            <div key={item.label} style={{ backgroundColor: "#D9CAB8", borderRadius: "4px", padding: "32px 24px", textAlign: "center" }}>
              <p style={{ fontSize: "9px", letterSpacing: "0.15em", color: "#8B7355", fontWeight: 600, marginBottom: "12px" }}>{item.label}</p>
              <p style={{ fontSize: "14px", color: "#2C2416", lineHeight: 1.7, whiteSpace: "pre-line" }}>{item.value}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: "40px" }}>
          <Link to="/book">
            <button style={{ backgroundColor: "#8B6914", color: "#fff", border: "none", padding: "14px 40px", fontSize: "12px", fontWeight: 600, letterSpacing: "0.1em", cursor: "pointer", borderRadius: "2px" }}>
              BOOK YOUR APPOINTMENT
            </button>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ backgroundColor: "#1A1408", padding: "48px 80px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "40px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", border: "1px solid #B8956A", overflow: "hidden", backgroundColor: "#fff" }}>
                <img src="https://ekvjnydomfresnkealpb.supabase.co/storage/v1/object/public/avatars/logo_1764609621458.jpg" alt="Zolara" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div>
                <div style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.15em", color: "#FFF8F0" }}>ZOLARA</div>
                <div style={{ fontSize: "8px", letterSpacing: "0.2em", color: "#8B7355" }}>BEAUTY STUDIO</div>
              </div>
            </div>
            <p style={{ fontSize: "12px", color: "rgba(255,248,240,0.4)" }}>Where Luxury Meets Beauty.</p>
          </div>
          <div style={{ display: "flex", gap: "48px" }}>
            <div>
              <p style={{ fontSize: "10px", letterSpacing: "0.15em", color: "#B8956A", fontWeight: 600, marginBottom: "16px" }}>LINKS</p>
              {[["#experience","Experience"],["#services","Services"],["#gift-cards","Gift Cards"],["#visit-us","Visit Us"]].map(([href,label]) => (
                <div key={label} style={{ marginBottom: "8px" }}>
                  <a href={href} style={{ fontSize: "12px", color: "rgba(255,248,240,0.6)", textDecoration: "none" }}>{label}</a>
                </div>
              ))}
            </div>
            <div>
              <p style={{ fontSize: "10px", letterSpacing: "0.15em", color: "#B8956A", fontWeight: 600, marginBottom: "16px" }}>SOCIAL</p>
              {[["https://www.instagram.com/zolarastudio","Instagram"],["https://www.tiktok.com/@zolarastudio","TikTok"],["https://x.com/zolarastudio","X (Twitter)"]].map(([href,label]) => (
                <div key={label} style={{ marginBottom: "8px" }}>
                  <a href={href} target="_blank" rel="noreferrer" style={{ fontSize: "12px", color: "rgba(255,248,240,0.6)", textDecoration: "none" }}>{label}</a>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,248,240,0.1)", paddingTop: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ fontSize: "11px", color: "rgba(255,248,240,0.3)" }}>© {new Date().getFullYear()} Zolara Beauty Studio. All rights reserved.</p>
          <Link to="/app/auth" style={{ fontSize: "11px", color: "rgba(184,149,106,0.7)", textDecoration: "none" }}>Staff Login</Link>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
