import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, Key, Eye, EyeOff, Users, CheckCircle2, XCircle, Loader2 } from "lucide-react";



export default function SecuritySettings() {
const G = "#C8A97E", G_D = "#8B6914", CREAM = "#FAFAF8", WHITE = "#FFFFFF";
const BORDER = "#EDEBE5", TXT = "#1C160E", TXT_MID = "#78716C", TXT_SOFT = "#A8A29E";
const inp: React.CSSProperties = { width: "100%", border: `1.5px solid ${BORDER}`, borderRadius: "10px", padding: "10px 12px", fontSize: "13px", color: TXT, outline: "none", background: WHITE, fontFamily: "Montserrat,sans-serif" };
const lbl: React.CSSProperties = { fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: TXT_SOFT, textTransform: "uppercase", display: "block", marginBottom: "6px" };
const card: React.CSSProperties = { background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "16px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.04),0 4px 16px rgba(0,0,0,0.04)", marginBottom: "16px" };
const OWNER_EMAIL = "info@zolarasalon.com";
  const [userRole, setUserRole]   = useState<string>("");
  const [userId, setUserId]       = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [users, setUsers]         = useState<any[]>([]);

  // Change password state
  const [cpCurrent, setCpCurrent] = useState("");
  const [cpNew, setCpNew]         = useState("");
  const [cpConfirm, setCpConfirm] = useState("");
  const [cpShow, setCpShow]       = useState<Record<string,boolean>>({});
  const [cpSaving, setCpSaving]   = useState(false);

  // Forgot password (reset) state
  const [rpEmail, setRpEmail]     = useState("");
  const [rpSent, setRpSent]       = useState(false);
  const [rpSaving, setRpSaving]   = useState(false);

  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      setUserEmail(user.email || "");
      (supabase as any).from("user_roles").select("role").eq("user_id", user.id).single()
        .then(({ data }: any) => {
          if (data?.role) setUserRole(data.role);
        });
    });
  }, []);

  useEffect(() => {
    if (userRole !== "owner" && userRole !== "admin") return;
    loadUsers();
  }, [userRole]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    const { data } = await (supabase as any).from("user_roles")
      .select("user_id, role, account_status, created_at")
      .order("created_at");
    // Enrich with staff name where available
    const enriched = await Promise.all((data || []).map(async (ur: any) => {
      const { data: staff } = await supabase.from("staff" as any).select("name, email").eq("user_id", ur.user_id).maybeSingle();
      return { ...ur, name: (staff as any)?.name || null, email: (staff as any)?.email || null };
    }));
    setUsers(enriched);
    setLoadingUsers(false);
  };

  const handleChangePassword = async () => {
    if (!cpNew || cpNew.length < 8) { toast.error("New password must be at least 8 characters"); return; }
    if (cpNew !== cpConfirm) { toast.error("Passwords don't match"); return; }
    setCpSaving(true);
    try {
      // Re-authenticate with current password to verify identity
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: userEmail, password: cpCurrent });
      if (signInErr) { toast.error("Current password is incorrect"); setCpSaving(false); return; }
      const { error } = await supabase.auth.updateUser({ password: cpNew });
      if (error) throw error;
      toast.success("Password changed successfully");
      setCpCurrent(""); setCpNew(""); setCpConfirm("");
    } catch (e: any) {
      toast.error(e.message || "Failed to change password");
    } finally { setCpSaving(false); }
  };

  const handleForgotPassword = async () => {
    const email = userRole === "owner" ? OWNER_EMAIL : rpEmail.trim();
    if (!email) { toast.error("Enter your email address"); return; }
    setRpSaving(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/app/auth/reset-password`,
      });
      if (error) throw error;
      setRpSent(true);
      toast.success(`Reset link sent to ${email}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to send reset email");
    } finally { setRpSaving(false); }
  };

  const toggleAccountStatus = async (targetUserId: string, currentStatus: string, targetRole: string) => {
    if (targetRole === "owner") { toast.error("Cannot deactivate the owner account"); return; }
    if (targetUserId === userId) { toast.error("You cannot deactivate your own account"); return; }
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    const { error } = await (supabase as any).from("user_roles")
      .update({ account_status: newStatus })
      .eq("user_id", targetUserId);
    if (error) { toast.error("Failed to update account status"); return; }
    toast.success(`Account ${newStatus === "active" ? "activated" : "deactivated"}`);
    loadUsers();
  };

  const ROLE_COLOR: Record<string, string> = {
    owner: "#7C3AED", admin: "#2563EB", receptionist: "#D97706",
    staff: "#16A34A", cleaner: "#6B7280", client: "#A8A29E",
  };

  return (
    <div style={{ background: CREAM, minHeight: "100vh", padding: "clamp(16px,4vw,32px)", fontFamily: "Montserrat,sans-serif", color: TXT }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Montserrat:wght@400;500;600;700&display=swap');`}</style>

      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px" }}>
          <Shield size={24} style={{ color: G }} />
          <div>
            <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "32px", fontWeight: 700, color: TXT, margin: 0 }}>Security</h1>
            <p style={{ fontSize: "12px", color: TXT_SOFT, margin: 0 }}>Password management and account access control</p>
          </div>
        </div>

        {/* Change Password */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
            <Key size={18} style={{ color: G }} />
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "20px", fontWeight: 700, color: TXT, margin: 0 }}>Change Password</h2>
          </div>
          <p style={{ fontSize: "12px", color: TXT_MID, marginBottom: "20px" }}>
            You are logged in as <strong>{userEmail}</strong>. Your current password is required to confirm this change.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {[
              { key: "current", label: "Current Password", val: cpCurrent, set: setCpCurrent },
              { key: "new",     label: "New Password (min 8 characters)", val: cpNew, set: setCpNew },
              { key: "confirm", label: "Confirm New Password", val: cpConfirm, set: setCpConfirm },
            ].map(f => (
              <div key={f.key}>
                <label style={lbl}>{f.label}</label>
                <div style={{ position: "relative" }}>
                  <input type={cpShow[f.key] ? "text" : "password"} value={f.val}
                    onChange={e => f.set(e.target.value)}
                    style={{ ...inp, paddingRight: 40 }} />
                  <button onClick={() => setCpShow(p => ({ ...p, [f.key]: !p[f.key] }))}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: TXT_SOFT }}>
                    {cpShow[f.key] ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            ))}
            <button onClick={handleChangePassword} disabled={cpSaving || !cpCurrent || !cpNew || !cpConfirm}
              style={{ padding: "11px 24px", borderRadius: "12px", background: cpSaving || !cpCurrent || !cpNew || !cpConfirm ? "#E8E0D4" : `linear-gradient(135deg,${G},${G_D})`, color: cpSaving || !cpCurrent || !cpNew || !cpConfirm ? TXT_SOFT : WHITE, border: "none", fontSize: "13px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, width: "fit-content" }}>
              {cpSaving ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Key size={16} />}
              Change Password
            </button>
          </div>
        </div>

        {/* Forgot / Reset Password */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
            <Shield size={18} style={{ color: "#D97706" }} />
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "20px", fontWeight: 700, color: TXT, margin: 0 }}>Forgot Password</h2>
          </div>
          {rpSent ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12 }}>
              <CheckCircle2 size={18} color="#16A34A" />
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#15803D", margin: 0 }}>Reset link sent</p>
                <p style={{ fontSize: 12, color: "#16A34A", margin: 0 }}>
                  Check {userRole === "owner" ? OWNER_EMAIL : rpEmail} for a password reset link. Link expires in 1 hour.
                </p>
              </div>
            </div>
          ) : (
            <div>
              {userRole === "owner" ? (
                <p style={{ fontSize: 13, color: TXT_MID, marginBottom: 16 }}>
                  As owner, your reset link will always be sent to <strong>{OWNER_EMAIL}</strong>.
                </p>
              ) : (
                <div style={{ marginBottom: 16 }}>
                  <label style={lbl}>Your Email Address</label>
                  <input value={rpEmail} onChange={e => setRpEmail(e.target.value)} placeholder={userEmail}
                    style={inp} type="email" />
                </div>
              )}
              <button onClick={handleForgotPassword} disabled={rpSaving}
                style={{ padding: "11px 24px", borderRadius: 12, background: `linear-gradient(135deg,#D97706,#92400E)`, color: WHITE, border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                {rpSaving ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Shield size={16} />}
                Send Reset Link
              </button>
            </div>
          )}
        </div>

        {/* Account Status Management (owner + admin only) */}
        {(userRole === "owner" || userRole === "admin") && (
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Users size={18} style={{ color: G }} />
                <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "20px", fontWeight: 700, color: TXT, margin: 0 }}>Account Access Control</h2>
              </div>
              <button onClick={loadUsers} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "6px 12px", fontSize: 11, cursor: "pointer", color: TXT_MID }}>
                Refresh
              </button>
            </div>
            <p style={{ fontSize: 12, color: TXT_MID, marginBottom: 20 }}>
              Set a staff account to <strong>Inactive</strong> to immediately block access. Their history, bookings, and records remain intact. Reactivate any time.
            </p>
            {loadingUsers ? (
              <div style={{ textAlign: "center", padding: 24, color: TXT_SOFT }}>Loading accounts...</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {users.map(u => {
                  const isOwner = u.role === "owner";
                  const isSelf = u.user_id === userId;
                  const isActive = u.account_status !== "inactive";
                  return (
                    <div key={u.user_id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 12, border: `1px solid ${isActive ? BORDER : "#FECACA"}`, background: isActive ? WHITE : "#FEF2F2" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: TXT }}>{u.name || u.email || u.user_id.slice(0, 8)}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 8px", borderRadius: 20, background: `${ROLE_COLOR[u.role] || "#A8A29E"}18`, color: ROLE_COLOR[u.role] || "#A8A29E" }}>{u.role}</span>
                          {isSelf && <span style={{ fontSize: 10, color: TXT_SOFT, fontStyle: "italic" }}>(you)</span>}
                        </div>
                        {u.email && <p style={{ fontSize: 11, color: TXT_SOFT, margin: "2px 0 0" }}>{u.email}</p>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: isActive ? "#F0FDF4" : "#FEF2F2", color: isActive ? "#16A34A" : "#DC2626" }}>
                          {isActive ? "Active" : "Inactive"}
                        </span>
                        {!isOwner && !isSelf && (
                          <button
                            onClick={() => toggleAccountStatus(u.user_id, u.account_status, u.role)}
                            style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${isActive ? "#FECACA" : "#BBF7D0"}`, background: isActive ? "#FEF2F2" : "#F0FDF4", color: isActive ? "#DC2626" : "#16A34A", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                            {isActive ? <><XCircle size={12} /> Deactivate</> : <><CheckCircle2 size={12} /> Activate</>}
                          </button>
                        )}
                        {(isOwner || isSelf) && <span style={{ fontSize: 10, color: TXT_SOFT, fontStyle: "italic" }}>{isOwner ? "Protected" : "Cannot change own"}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
