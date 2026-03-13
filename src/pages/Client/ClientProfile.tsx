import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Phone, Mail, Cake, Save, Lock } from "lucide-react";

const G      = "#C8A97E";
const G_DARK = "#8B6914";
const TXT    = "#1C160E";
const TXT_M  = "#78716C";
const TXT_S  = "#A8A29E";
const CREAM  = "#FAFAF8";
const WHITE  = "#FFFFFF";
const BORDER = "#EDE8E0";
const SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)";

const inp: React.CSSProperties = {
  width: "100%", border: `1.5px solid ${BORDER}`, borderRadius: 10,
  padding: "10px 14px", fontSize: 14, color: TXT, outline: "none",
  background: WHITE, fontFamily: "Montserrat, sans-serif",
};
const label: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: TXT_S,
  textTransform: "uppercase", display: "block", marginBottom: 6,
};

export default function ClientProfile() {
  const { client, setClient } = useOutletContext<any>();

  const [form, setForm] = useState({
    name:          client?.name          || "",
    phone:         client?.phone         || "",
    email:         client?.email         || "",
    date_of_birth: client?.date_of_birth || "",
  });
  const [saving, setSaving]         = useState(false);
  const [pwForm, setPwForm]         = useState({ current: "", next: "", confirm: "" });
  const [changingPw, setChangingPw] = useState(false);
  const [showPw, setShowPw]         = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("clients")
        .update({
          name:          form.name.trim(),
          phone:         form.phone.trim() || null,
          email:         form.email.trim() || null,
          date_of_birth: form.date_of_birth || null,
        })
        .eq("id", client.id);

      if (error) throw error;

      // Update auth email if changed
      if (form.email && form.email !== client.email) {
        await supabase.auth.updateUser({ email: form.email.trim() });
      }

      if (setClient) setClient({ ...client, ...form });
      toast.success("Profile updated");
    } catch (e: any) {
      toast.error(e.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!pwForm.next || pwForm.next.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (pwForm.next !== pwForm.confirm) { toast.error("Passwords do not match"); return; }
    setChangingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwForm.next });
      if (error) throw error;
      toast.success("Password updated");
      setPwForm({ current: "", next: "", confirm: "" });
      setShowPw(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to update password");
    } finally {
      setChangingPw(false);
    }
  };

  if (!client) return (
    <div style={{ padding: 40, textAlign: "center", color: TXT_S }}>
      No profile linked to this account.
    </div>
  );

  return (
    <div style={{ padding: "clamp(16px,4vw,32px)", maxWidth: 560, margin: "0 auto", fontFamily: "Montserrat, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Montserrat:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box}
        .inp-focus:focus{border-color:${G}!important;box-shadow:0 0 0 3px rgba(200,169,126,0.15)}
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", color: G, textTransform: "uppercase", marginBottom: 4 }}>Account</p>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 700, color: TXT, margin: "0 0 6px" }}>My Profile</h1>
        <p style={{ fontSize: 13, color: TXT_M }}>Update your personal information and password.</p>
      </div>

      {/* Personal info card */}
      <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "24px 24px 28px", boxShadow: SHADOW, marginBottom: 20 }}>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 700, color: TXT, margin: "0 0 20px" }}>Personal Information</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Name */}
          <div>
            <label style={label}>Full Name</label>
            <div style={{ position: "relative" }}>
              <User size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: TXT_S }} />
              <input
                className="inp-focus"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                style={{ ...inp, paddingLeft: 36 }}
                placeholder="Your full name"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label style={label}>Phone Number</label>
            <div style={{ position: "relative" }}>
              <Phone size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: TXT_S }} />
              <input
                className="inp-focus"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                style={{ ...inp, paddingLeft: 36 }}
                placeholder="0XX XXX XXXX"
                type="tel"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label style={label}>Email Address</label>
            <div style={{ position: "relative" }}>
              <Mail size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: TXT_S }} />
              <input
                className="inp-focus"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                style={{ ...inp, paddingLeft: 36 }}
                placeholder="your@email.com"
                type="email"
              />
            </div>
            {form.email !== client.email && (
              <p style={{ fontSize: 11, color: "#F59E0B", marginTop: 6 }}>⚠ Changing your email will require re-verification.</p>
            )}
          </div>

          {/* Date of birth */}
          <div>
            <label style={label}>Date of Birth <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, color: TXT_S }}>(for birthday rewards 🎂)</span></label>
            <div style={{ position: "relative" }}>
              <Cake size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: TXT_S }} />
              <input
                className="inp-focus"
                value={form.date_of_birth}
                onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))}
                style={{ ...inp, paddingLeft: 36 }}
                type="date"
                max={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 8, background: `linear-gradient(135deg, ${G_DARK}, ${G})`, color: WHITE, border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, letterSpacing: "0.04em" }}
        >
          <Save size={14} />
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {/* Password card */}
      <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "24px", boxShadow: SHADOW }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Lock size={16} style={{ color: G }} />
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 700, color: TXT, margin: 0 }}>Password</p>
          </div>
          <button
            onClick={() => setShowPw(v => !v)}
            style={{ fontSize: 12, fontWeight: 600, color: G_DARK, background: "rgba(200,169,126,0.1)", border: `1px solid rgba(200,169,126,0.3)`, borderRadius: 20, padding: "6px 16px", cursor: "pointer" }}
          >
            {showPw ? "Cancel" : "Change Password"}
          </button>
        </div>

        {showPw && (
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={label}>New Password</label>
              <input
                className="inp-focus"
                value={pwForm.next}
                onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
                style={inp}
                type="password"
                placeholder="At least 6 characters"
              />
            </div>
            <div>
              <label style={label}>Confirm New Password</label>
              <input
                className="inp-focus"
                value={pwForm.confirm}
                onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                style={inp}
                type="password"
                placeholder="Repeat password"
              />
            </div>
            <button
              onClick={handleChangePassword}
              disabled={changingPw}
              style={{ display: "flex", alignItems: "center", gap: 8, background: "#1C160E", color: WHITE, border: "none", borderRadius: 10, padding: "11px 24px", fontSize: 12, fontWeight: 700, cursor: changingPw ? "not-allowed" : "pointer", opacity: changingPw ? 0.7 : 1, width: "fit-content" }}
            >
              <Lock size={13} />
              {changingPw ? "Updating…" : "Update Password"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
