import { Link } from "react-router-dom";

const LOGO = "https://ekvjnydomfresnkealpb.supabase.co/storage/v1/object/public/avatars/logo_1764609621458.jpg";
const G = "#C8A97E";
const G_DARK = "#8B6914";
const DARK = "#1C160E";
const MID = "#6B5D52";
const CREAM = "#F5EFE6";
const BORDER = "#EDE8E0";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: 40 }}>
    <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, fontWeight: 600, color: DARK, marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${BORDER}` }}>{title}</h2>
    <div style={{ fontSize: 15, color: MID, lineHeight: 1.85 }}>{children}</div>
  </div>
);

export default function PrivacyPolicy() {
  return (
    <div style={{ minHeight: "100vh", background: CREAM, fontFamily: "Montserrat, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Montserrat:wght@300;400;500;600&display=swap');`}</style>

      {/* Header */}
      <div style={{ background: DARK, padding: "20px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
          <img src={LOGO} alt="Zolara" style={{ width: 40, height: 40, borderRadius: "50%", border: `2px solid ${G}`, objectFit: "cover" }} />
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", color: G, fontSize: 20, fontWeight: 600 }}>Zolara</div>
            <div style={{ fontSize: 8, color: "rgba(200,169,126,0.6)", letterSpacing: "0.2em" }}>BEAUTY STUDIO</div>
          </div>
        </Link>
        <Link to="/" style={{ color: "rgba(200,169,126,0.6)", fontSize: 12, textDecoration: "none" }}>← Back to home</Link>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "60px 32px" }}>
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", color: G_DARK, marginBottom: 12 }}>LEGAL</div>
          <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 48, fontWeight: 300, color: DARK, lineHeight: 1.1, marginBottom: 16 }}>Privacy Policy</h1>
          <p style={{ fontSize: 13, color: MID }}>Last updated: March 2026. This policy applies to all services operated by Zolara Holdings Ltd, including Zolara Beauty Studio.</p>
        </div>

        <Section title="Who We Are">
          <p>Zolara Beauty Studio is a premium beauty salon operated by Zolara Holdings Ltd, located at Sakasaka, Opposite CalBank, Tamale, Northern Region, Ghana. When you book an appointment, purchase a gift card, or use our client portal, you are sharing information with us. This policy explains what we collect, why we collect it, and how we protect it.</p>
          <p style={{ marginTop: 12 }}>For any privacy-related questions, contact us at 0594365314 or visit the studio directly.</p>
        </Section>

        <Section title="What We Collect">
          <p>We collect the following information when you interact with Zolara:</p>
          <p style={{ marginTop: 10 }}><strong style={{ color: DARK }}>Information you provide directly:</strong> Your name, phone number, and email address when you book an appointment or purchase a gift card. Your date of birth if you choose to provide it for birthday rewards. Any personal messages you include with gift card purchases.</p>
          <p style={{ marginTop: 10 }}><strong style={{ color: DARK }}>Booking and transaction data:</strong> The services you book, the dates and times of your appointments, your payment references, and your visit history.</p>
          <p style={{ marginTop: 10 }}><strong style={{ color: DARK }}>Loyalty data:</strong> Your accumulated loyalty points, tier status, and redemption history.</p>
          <p style={{ marginTop: 10 }}><strong style={{ color: DARK }}>Device and usage data:</strong> Basic information about how you use the website, collected through privacy-respecting analytics tools. We do not use invasive tracking or sell your data to advertisers.</p>
        </Section>

        <Section title="Why We Collect It">
          <p>We use your information for the following purposes only:</p>
          <p style={{ marginTop: 10 }}>To process and confirm your bookings and send you appointment reminders and confirmations by SMS. To manage your loyalty points and rewards. To send your gift card to the recipient you specify. To maintain your client profile in our portal. To send you a review request after your appointment. To contact you if there is an issue with your booking or payment.</p>
          <p style={{ marginTop: 12 }}>We do not use your information for unsolicited marketing without your consent. We do not sell, rent, or share your personal information with any third party for commercial purposes.</p>
        </Section>

        <Section title="SMS Communications">
          <p>By providing your phone number and making a booking, you consent to receive transactional SMS messages from Zolara Beauty Studio. These messages include booking confirmations, appointment reminders, checkout receipts, and a single feedback request after your appointment.</p>
          <p style={{ marginTop: 12 }}>You will not receive more than four SMS messages per booking. If you do not want to receive SMS messages from us, call us on 0594365314 and we will update your preferences.</p>
          <p style={{ marginTop: 12 }}>SMS messages are sent using Arkesel, a Ghana-based SMS provider. Your phone number is shared with Arkesel solely for the purpose of message delivery.</p>
        </Section>

        <Section title="Payment Information">
          <p>All online payments are processed securely through Paystack. Zolara does not store your card details. Paystack handles all payment data in accordance with PCI-DSS standards. We only receive confirmation that a payment was made and the reference number.</p>
        </Section>

        <Section title="Your Client Portal">
          <p>Your client portal is accessed using your phone number and a one-time code sent by SMS. No password is stored. Your session token is stored in your browser and expires after 30 days, after which you will need to log in again.</p>
          <p style={{ marginTop: 12 }}>Your portal contains your booking history, loyalty points, and any gift cards associated with your phone number. Only you can access this information using your verified phone number.</p>
        </Section>

        <Section title="Data Retention">
          <p>We retain your booking history and client record for as long as you are an active client of Zolara. If you would like your data deleted, contact us directly and we will remove your records within 14 days, except where retention is required for financial compliance.</p>
        </Section>

        <Section title="Your Rights">
          <p>You have the right to access the personal information we hold about you. You have the right to request correction of any inaccurate information. You have the right to request deletion of your data, subject to our legal obligations. You have the right to opt out of SMS communications at any time by contacting us directly.</p>
          <p style={{ marginTop: 12 }}>To exercise any of these rights, contact us at 0594365314 or visit Zolara Beauty Studio at Sakasaka, Opposite CalBank, Tamale.</p>
        </Section>

        <Section title="Cookies and Analytics">
          <p>Our website uses minimal analytics to understand how visitors use the site. We use PostHog for analytics, which is configured to respect user privacy. We do not use advertising cookies or share browsing data with advertising networks.</p>
        </Section>

        <Section title="Changes to This Policy">
          <p>We may update this policy from time to time. The date at the top of this page will always reflect the most recent update. Continued use of our services after changes constitutes acceptance of the updated policy.</p>
        </Section>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: `1px solid ${BORDER}`, textAlign: "center" }}>
          <p style={{ fontSize: 13, color: MID }}>Zolara Beauty Studio. Sakasaka, Opposite CalBank, Tamale, Ghana.</p>
          <p style={{ fontSize: 13, color: MID, marginTop: 4 }}>0594365314 / 0208848707 · zolarasalon.com</p>
          <Link to="/" style={{ display: "inline-block", marginTop: 20, color: G_DARK, fontSize: 12, textDecoration: "none", fontWeight: 600 }}>← Back to Zolara</Link>
        </div>
      </div>
    </div>
  );
}
