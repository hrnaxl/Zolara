import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import { User, Phone, Mail, Cake, Save } from "lucide-react";

const G      = "#C8A97E";
const G_DARK = "#8B6914";
const TXT    = "#1C160E";
const TXT_M  = "#78716C";
const TXT_S  = "#A8A29E";
const WHITE  = "#FFFFFF";
const BORDER = "#EDE8E0";
const SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)";

const inp: React.CSSProperties = {
  width: "100%", border: `1.5px solid ${BORDER}`, borderRadius: 10,
  padding: "10px 14px", fontSize: 14, color: TXT, outline: "none",
  background: WHITE, fontFamily: "Montserrat, sans-serif",
};
const lbl: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: TXT_S,
  textTransform: "uppercase", display: "block", marginBottom: 6,
};

export default function ClientProfile() {
  const { client, setClient } = useOutletContext<any>();

  const [form, setForm] = useState({
    name:     client?.name     || "",
    phone:    client?.phone    || "",
    email:    client?.email    || "",
    birthday: client?.birthday || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!client?.id) return;
    setSaving(true);
    try {
      const res = await fetch("/api/client-update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: localStorage.getItem("zolara_client_token"),
          phone: localStorage.getItem("zolara_client_phone"),
          updates: {
            name: form.name.trim() || client.name,
            email: form.email.trim() || null,
            birthday: form.birthday || null,
          },
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Update failed");
      setClient({ ...client, ...d.client });
      toast.success("Profile updated");
    } catch (e: any) {
      toast.error(e.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: "clamp(16px,4vw,32px)", fontFamily: "Montserrat,sans-serif", maxWidth: 560 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Montserrat:wght@400;500;600;700&display=swap'); .inp-focus:focus{border-color:${G}!important;box-shadow:0 0 0 3px rgba(200,169,126,0.12);}`}</style>

      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", color: G_DARK, textTransform: "uppercase", marginBottom: 6 }}>Account</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 32, fontWeight: 300, color: "#0F1E35", lineHeight: 1.1 }}>My Profile</h1>
        <p style={{ fontSize: 13, color: TXT_M, marginTop: 6 }}>Update your personal information.</p>
      </div>

      <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 28, boxShadow: SHADOW, display: "flex", flexDirection: "column", gap: 18 }}>

        <div>
          <label style={lbl}><User size={10} style={{ marginRight: 4 }} />Full Name</label>
          <input className="inp-focus" style={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your full name" />
        </div>

        <div>
          <label style={lbl}><Phone size={10} style={{ marginRight: 4 }} />Phone Number</label>
          <input style={{ ...inp, background: "#FAF8F5", color: TXT_M }} value={form.phone} readOnly />
          <p style={{ fontSize: 11, color: TXT_S, marginTop: 4 }}>Phone number cannot be changed — it's your account identifier.</p>
        </div>

        <div>
          <label style={lbl}><Mail size={10} style={{ marginRight: 4 }} />Email Address <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
          <input className="inp-focus" style={inp} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="your@email.com" />
        </div>

        <div>
          <label style={lbl}><Cake size={10} style={{ marginRight: 4 }} />Date of Birth <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(for birthday rewards 🎂)</span></label>
          <input className="inp-focus" style={inp} type="date" value={form.birthday} onChange={e => setForm(f => ({ ...f, birthday: e.target.value }))} />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: saving ? "rgba(139,105,20,0.4)" : `linear-gradient(135deg,${G_DARK},${G})`, color: WHITE, border: "none", borderRadius: 10, padding: "13px 28px", fontSize: 12, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", letterSpacing: "0.1em", textTransform: "uppercase", width: "fit-content" }}
        >
          <Save size={13} />
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
