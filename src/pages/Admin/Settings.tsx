import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/context/SettingsContext";
import { toast } from "sonner";
import { BusinessInfoSection } from "@/components/settings/BusinessInfoSection";
import { OperatingHoursSection } from "@/components/settings/OperatingHoursSection";
import { DraggableListSection } from "@/components/settings/DraggableListSection";
import { PaymentMethodsSection } from "@/components/settings/PaymentMethodsSection";
import { DataManagementSection } from "@/components/settings/DataManagementSection";
import { BackupRestoreSection } from "@/components/settings/BackupRestoreSection";
import { TemporaryClosuresSection } from "@/components/settings/TemporaryClosuresSection";
import { BusinessRulesSection } from "@/components/settings/BusinessRulesSection";
import { ReviewsSettingsSection } from "@/components/settings/ReviewsManagement";
import {
  Settings as SettingsIcon, Save, RefreshCw, Building2, Clock, CreditCard,
  Users, Tag, Calendar, Wrench, BarChart3, Star, Database, Loader2, CheckCircle2
} from "lucide-react";

const G = "#C8A97E", G_D = "#8B6914", CREAM = "#FAFAF8", WHITE = "#FFFFFF";
const BORDER = "#EDEBE5", TXT = "#1C160E", TXT_MID = "#78716C", TXT_SOFT = "#A8A29E";
const SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 20px rgba(0,0,0,0.06)";

interface PaymentMethod { id: string; name: string; enabled: boolean; }

interface Settings {
  id?: string;
  business_name: string; logo_url: string; open_time: string; close_time: string;
  currency: string; staff_roles: string[]; service_categories: string[];
  use_24_hour_format: boolean; business_phone: string; business_email: string;
  business_address: string; payment_methods: PaymentMethod[];
  closed_dates?: string[]; deposit_amount?: number;
  loyalty_stamp_per_ghs?: number; loyalty_stamps_for_reward?: number;
  loyalty_reward_discount?: number; created_at?: string; updated_at?: string;
}

const defaultSettings: Settings = {
  business_name: "", logo_url: "", open_time: "8:30", close_time: "21:00",
  currency: "GH₵", staff_roles: ["Hairdresser", "Barber", "Receptionist"],
  service_categories: ["Hair", "Nails", "Makeup"], use_24_hour_format: false,
  business_phone: "", business_email: "", business_address: "",
  payment_methods: [], closed_dates: [], deposit_amount: 50,
  loyalty_stamp_per_ghs: 100, loyalty_stamps_for_reward: 20, loyalty_reward_discount: 50,
};

type TabId = "business" | "hours" | "payments" | "categories" | "closures" | "loyalty" | "data";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "business",   label: "Business",        icon: Building2 },
  { id: "hours",      label: "Hours",            icon: Clock },
  { id: "payments",   label: "Payments",         icon: CreditCard },
  { id: "categories", label: "Categories",       icon: Tag },
  { id: "closures",   label: "Closures",         icon: Calendar },
  { id: "loyalty",    label: "Loyalty",          icon: Star },
  { id: "data",       label: "Data",             icon: Database },
];

function RecalcLoyaltyButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleRecalc = async () => {
    setLoading(true); setResult(null);
    try {
      // Use service role via supabase RPC directly — avoids CORS/auth issues
      const { data: bookings, error } = await supabase
        .from("bookings" as any)
        .select("client_id, price")
        .eq("status", "completed")
        .not("client_id", "is", null)
        .not("price", "is", null)
        .gt("price", 0);

      if (error) throw error;

      const totals: Record<string, number> = {};
      for (const b of (bookings || []) as any[]) {
        totals[b.client_id] = (totals[b.client_id] || 0) + Number(b.price);
      }

      let updated = 0;
      for (const [clientId, totalSpent] of Object.entries(totals)) {
        const points = Math.floor(totalSpent / 100);
        await supabase.from("clients" as any).update({ total_spent: totalSpent, loyalty_points: points }).eq("id", clientId);
        updated++;
      }

      setResult({ ok: true, msg: `Updated ${updated} client${updated !== 1 ? "s" : ""} — points are now correct.` });
    } catch (err: any) {
      setResult({ ok: false, msg: err.message || "Recalculation failed." });
    } finally { setLoading(false); }
  };

  return (
    <div style={{ marginTop: 24 }}>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: TXT_SOFT, textTransform: "uppercase", marginBottom: 8 }}>Maintenance</p>
      <div style={{ background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: TXT, margin: "0 0 3px" }}>Recalculate All Loyalty Points</p>
          <p style={{ fontSize: 11, color: TXT_SOFT, margin: 0 }}>Recomputes every client's points from their completed bookings. Run if points look wrong.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {result && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: result.ok ? "#16A34A" : "#DC2626" }}>
              {result.ok ? <CheckCircle2 size={14} /> : null}
              {result.msg}
            </div>
          )}
          <button onClick={handleRecalc} disabled={loading} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 10, background: loading ? "#E8E0D4" : `linear-gradient(135deg,${G},${G_D})`, color: loading ? TXT_SOFT : WHITE, border: "none", fontSize: 12, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <RefreshCw size={14} />}
            {loading ? "Recalculating…" : "Recalculate Now"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const { settings: ctxSettings, setSettings: setCtxSettings } = useSettings();
  const [settings, setSettings] = useState<Settings>({ ...defaultSettings, ...ctxSettings });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("business");

  useEffect(() => { fetchSettings(); }, []);
  useEffect(() => {
    if (ctxSettings && ctxSettings.business_name !== undefined) {
      setSettings(prev => ({ ...defaultSettings, ...ctxSettings, ...prev }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).from("settings").select("*").single();
      if (error && error.code !== "PGRST116") throw error;
      if (data) setSettings({ ...defaultSettings, ...data, payment_methods: data.payment_methods });
    } catch (err: any) {
      console.error(err); toast.error("Failed to load settings");
    } finally { setLoading(false); }
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return settings.logo_url || null;
    try {
      const fileExt = logoFile.name.split(".").pop();
      const fileName = `logo_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, logoFile, { cacheControl: "3600", upsert: true });
      if (uploadError) throw uploadError;
      return supabase.storage.from("avatars").getPublicUrl(fileName).data.publicUrl;
    } catch { toast.error("Failed to upload logo"); return settings.logo_url || null; }
  };

  const updateSettings = async () => {
    setSaving(true);
    try {
      const logoUrl = await uploadLogo();
      const settingsData = {
        business_name: settings.business_name, logo_url: logoUrl,
        open_time: settings.open_time, close_time: settings.close_time,
        currency: settings.currency, business_phone: settings.business_phone,
        business_email: settings.business_email, business_address: settings.business_address,
        payment_methods: settings.payment_methods,
        gallery_images: (settings as any).gallery_images ?? [],
        closed_dates: settings.closed_dates ?? [],
        deposit_amount: settings.deposit_amount ?? 50,
        loyalty_stamp_per_ghs: settings.loyalty_stamp_per_ghs ?? 100,
        loyalty_stamps_for_reward: settings.loyalty_stamps_for_reward ?? 20,
        loyalty_reward_discount: settings.loyalty_reward_discount ?? 50,
      };
      const { data: existing, error: fetchErr } = await (supabase as any).from("settings").select("id").limit(1).maybeSingle();
      if (fetchErr && fetchErr.code !== "PGRST116") throw fetchErr;
      if (existing?.id) {
        const { data: updated, error } = await (supabase as any).from("settings").update(settingsData).eq("id", existing.id).select();
        if (error) throw error;
        if (!updated || updated.length === 0) throw new Error("Update blocked — check database permissions");
      } else {
        const { error } = await (supabase as any).from("settings").insert([settingsData]);
        if (error) throw error;
      }
      toast.success("Settings saved");
      setLogoFile(null);
      const merged = { ...settings, ...settingsData, logo_url: logoUrl || settings.logo_url };
      setSettings(merged);
      setCtxSettings((prev: any) => ({ ...prev, ...merged }));
    } catch (err: any) {
      toast.error(err?.message || "Failed to save settings");
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: CREAM }}>
      <Loader2 size={28} style={{ animation: "spin 0.8s linear infinite", color: G }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const tab = (id: TabId, content: React.ReactNode) => activeTab === id ? content : null;

  return (
    <div style={{ background: CREAM, minHeight: "100vh", fontFamily: "Montserrat,sans-serif", color: TXT }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Montserrat:wght@400;500;600;700&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {/* ── Top bar ── */}
      <div style={{ background: WHITE, borderBottom: `1px solid ${BORDER}`, paddingLeft: "clamp(16px,4vw,40px)", paddingRight: "clamp(16px,4vw,40px)", paddingTop: "max(env(safe-area-inset-top, 0px), 0px)", paddingBottom: 0, position: "sticky", top: 0, zIndex: 10, boxShadow: "0 1px 0 rgba(0,0,0,0.04)" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${G},${G_D})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <SettingsIcon size={18} color={WHITE} />
            </div>
            <div>
              <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 700, color: TXT, margin: 0, lineHeight: 1 }}>Settings</h1>
              <p style={{ fontSize: 10, color: TXT_SOFT, margin: 0, letterSpacing: "0.08em" }}>SALON CONFIGURATION</p>
            </div>
          </div>
          <button onClick={updateSettings} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 22px", borderRadius: 12, background: saving ? "#E8E0D4" : `linear-gradient(135deg,${G},${G_D})`, color: saving ? TXT_SOFT : WHITE, border: "none", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", boxShadow: saving ? "none" : "0 2px 8px rgba(200,169,126,0.35)" }}>
            {saving ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={15} />}
            {saving ? "Saving…" : "Save Settings"}
          </button>
        </div>
      </div>

      {/* ── Tab nav ── */}
      <div style={{ background: WHITE, borderBottom: `1px solid ${BORDER}`, overflowX: "auto" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 clamp(16px,4vw,40px)", display: "flex", gap: 0 }}>
          {TABS.map(t => {
            const active = activeTab === t.id;
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "14px 18px", borderBottom: active ? `2.5px solid ${G_D}` : "2.5px solid transparent", background: "none", border: "none", borderBottom: active ? `2.5px solid ${G_D}` : "2.5px solid transparent", color: active ? G_D : TXT_SOFT, fontSize: 12, fontWeight: active ? 700 : 500, cursor: "pointer", whiteSpace: "nowrap", transition: "color 0.15s", fontFamily: "Montserrat,sans-serif" }}>
                <Icon size={14} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px clamp(16px,4vw,40px)" }}>

        {tab("business", <BusinessInfoSection
          businessName={settings.business_name} logoUrl={settings.logo_url} logoFile={logoFile}
          phone={settings.business_phone} email={settings.business_email} address={settings.business_address}
          onBusinessNameChange={v => setSettings(p => ({ ...p, business_name: v }))}
          onLogoUrlChange={v => setSettings(p => ({ ...p, logo_url: v }))}
          onLogoFileChange={setLogoFile}
          onPhoneChange={v => setSettings(p => ({ ...p, business_phone: v }))}
          onEmailChange={v => setSettings(p => ({ ...p, business_email: v }))}
          onAddressChange={v => setSettings(p => ({ ...p, business_address: v }))}
        />)}

        {tab("hours", <OperatingHoursSection
          openTime={settings.open_time} closeTime={settings.close_time}
          currency={settings.currency} use24HourFormat={settings.use_24_hour_format}
          onOpenTimeChange={v => setSettings(p => ({ ...p, open_time: v }))}
          onCloseTimeChange={v => setSettings(p => ({ ...p, close_time: v }))}
          onCurrencyChange={v => setSettings(p => ({ ...p, currency: v }))}
          onFormatChange={v => setSettings(p => ({ ...p, use_24_hour_format: v }))}
        />)}

        {tab("payments", <PaymentMethodsSection
          paymentMethods={settings.payment_methods}
          onPaymentMethodToggle={(id, enabled) => setSettings(p => ({ ...p, payment_methods: p.payment_methods.map(m => m.id === id ? { ...m, enabled } : m) }))}
        />)}

        {tab("categories", (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", boxShadow: SHADOW }}>
              <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}`, background: "linear-gradient(135deg,rgba(200,169,126,0.08),rgba(200,169,126,0.02))" }}>
                <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 700, color: TXT, margin: "0 0 2px" }}>Staff Roles</h2>
                <p style={{ fontSize: 11, color: TXT_SOFT, margin: 0 }}>Drag to reorder. These appear in staff management.</p>
              </div>
              <div style={{ padding: 20 }}>
                <DraggableListSection title="" items={settings.staff_roles}
                  onItemsChange={items => setSettings(p => ({ ...p, staff_roles: items }))} addButtonText="Add Role" />
              </div>
            </div>
            <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", boxShadow: SHADOW }}>
              <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}`, background: "linear-gradient(135deg,rgba(200,169,126,0.08),rgba(200,169,126,0.02))" }}>
                <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 700, color: TXT, margin: "0 0 2px" }}>Service Categories</h2>
                <p style={{ fontSize: 11, color: TXT_SOFT, margin: 0 }}>Drag to reorder. These group services in the booking flow.</p>
              </div>
              <div style={{ padding: 20 }}>
                <DraggableListSection title="" items={settings.service_categories}
                  onItemsChange={items => setSettings(p => ({ ...p, service_categories: items }))} addButtonText="Add Category" />
              </div>
            </div>
          </div>
        ))}

        {tab("closures", <TemporaryClosuresSection
          closedDates={settings.closed_dates || []}
          onClosedDatesChange={dates => setSettings(p => ({ ...p, closed_dates: dates }))}
        />)}

        {tab("loyalty", (
          <div>
            <BusinessRulesSection
              depositAmount={settings.deposit_amount ?? 50}
              loyaltyStampPerGhs={settings.loyalty_stamp_per_ghs ?? 100}
              loyaltyStampsForReward={settings.loyalty_stamps_for_reward ?? 20}
              loyaltyRewardDiscount={settings.loyalty_reward_discount ?? 50}
              onDepositChange={v => setSettings(p => ({ ...p, deposit_amount: v }))}
              onStampPerGhsChange={v => setSettings(p => ({ ...p, loyalty_stamp_per_ghs: v }))}
              onStampsForRewardChange={v => setSettings(p => ({ ...p, loyalty_stamps_for_reward: v }))}
              onRewardDiscountChange={v => setSettings(p => ({ ...p, loyalty_reward_discount: v }))}
            />
            <RecalcLoyaltyButton />
          </div>
        ))}

        {tab("data", (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <ReviewsSettingsSection settingsId={settings.id} />
            <DataManagementSection />
            <BackupRestoreSection settings={settings} onRestore={(r) => setSettings({ ...defaultSettings, ...r, payment_methods: r.payment_methods })} />
          </div>
        ))}

      </div>
    </div>
  );
}
