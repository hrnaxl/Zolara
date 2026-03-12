import React from "react";
import { AvatarUpload } from "@/components/AvatarUpload";

const G = "#C8A97E", G_D = "#8B6914", CREAM = "#FAFAF8", WHITE = "#FFFFFF";
const BORDER = "#EDEBE5", TXT = "#1C160E", TXT_MID = "#78716C", TXT_SOFT = "#A8A29E";
const SHADOW = "0 1px 3px rgba(0,0,0,0.04),0 4px 16px rgba(0,0,0,0.06)";
const inp: React.CSSProperties = { border: `1.5px solid ${BORDER}`, borderRadius: "10px", padding: "9px 12px", fontSize: "13px", color: TXT, outline: "none", background: WHITE, fontFamily: "Montserrat,sans-serif", width: "100%", boxSizing: "border-box" };
const lbl: React.CSSProperties = { fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: TXT_SOFT, textTransform: "uppercase", display: "block", marginBottom: "6px" };

interface BusinessInfoProps {
  businessName: string;
  logoUrl: string;
  logoFile: File | null;
  phone: string;
  email: string;
  address: string;
  onBusinessNameChange: (value: string) => void;
  onLogoUrlChange: (value: string) => void;
  onLogoFileChange: (file: File) => void;
  onPhoneChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onAddressChange: (value: string) => void;
}

export function BusinessInfoSection({
  businessName, logoUrl, logoFile, phone, email, address,
  onBusinessNameChange, onLogoUrlChange, onLogoFileChange,
  onPhoneChange, onEmailChange, onAddressChange,
}: BusinessInfoProps) {
  return (
    <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "16px", overflow: "hidden", boxShadow: SHADOW }}>
      <div style={{ background: "linear-gradient(135deg,rgba(200,169,126,0.1),rgba(200,169,126,0.04))", padding: "14px 20px", borderBottom: `1px solid ${BORDER}` }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "20px", fontWeight: 700, color: TXT, margin: 0 }}>Business Information</h2>
      </div>
      <div style={{ padding: "20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={lbl}>Business Name</label>
              <input value={businessName} onChange={e => onBusinessNameChange(e.target.value)} placeholder="Enter business name" style={inp} />
            </div>
            <div>
              <label style={lbl}>Logo</label>
              <AvatarUpload image={logoFile || logoUrl || null} onChange={onLogoFileChange} />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={lbl}>Business Phone</label>
              <input value={phone} onChange={e => onPhoneChange(e.target.value)} placeholder="+233 XX XXX XXXX" style={inp} />
            </div>
            <div>
              <label style={lbl}>Business Email</label>
              <input type="email" value={email} onChange={e => onEmailChange(e.target.value)} placeholder="contact@business.com" style={inp} />
            </div>
            <div>
              <label style={lbl}>Business Address</label>
              <input value={address} onChange={e => onAddressChange(e.target.value)} placeholder="123 Main Street, City" style={inp} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
