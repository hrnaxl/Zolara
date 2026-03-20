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
import { GiftCardPricingSection } from "@/components/settings/GiftCardPricingSection";
import { ReviewsSettingsSection } from "@/components/settings/ReviewsManagement";
import {
  Settings as SettingsIcon, Save, RefreshCw, Building2, Clock, CreditCard,
  Users, Tag, Calendar, Wrench, BarChart3, Star, Database, Loader2, CheckCircle2, Sparkles
} from "lucide-react";

const G = "#C8A97E", G_D = "#8B6914", CREAM = "#FAFAF8", WHITE = "#FFFFFF";
const BORDER = "#EDEBE5", TXT = "#1C160E", TXT_MID = "#78716C", TXT_SOFT = "#A8A29E";
const SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 20px rgba(0,0,0,0.06)";

interface PaymentMethod { id: string; name: string; enabled: boolean; }

interface Settings {
  id?: string;
  business_name: string; logo_url: string; open_time: string; close_time: string;
  currency: string; staff_roles: string[]; service_categories: string[]; staff_specialties: string[];
  use_24_hour_format: boolean; business_phone: string; business_email: string;
  business_address: string; payment_methods: PaymentMethod[];
  closed_dates?: string[]; deposit_amount?: number;
  loyalty_stamp_per_ghs?: number; loyalty_stamps_for_reward?: number;
  loyalty_reward_discount?: number; created_at?: string; updated_at?: string;
}

const defaultSettings: Settings = {
  business_name: "", logo_url: "", open_time: "8:30", close_time: "21:00",
  currency: "GH₵", staff_roles: ["Hairdresser", "Barber", "Receptionist"], staff_specialties: ["Braider", "Lash Tech", "Nail Tech", "Wig & Hair Stylist", "Makeup Artist", "Pedicurist & Manicurist"],
  service_categories: ["Hair", "Nails", "Makeup"], use_24_hour_format: false,
  business_phone: "", business_email: "", business_address: "",
  payment_methods: [], closed_dates: [], deposit_amount: 50,
  loyalty_stamp_per_ghs: 100, loyalty_stamps_for_reward: 20, loyalty_reward_discount: 50,
};

type TabId = "business" | "hours" | "payments" | "categories" | "closures" | "loyalty" | "promo" | "rules" | "social" | "announcement" | "data";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "business",   label: "Business",        icon: Building2 },
  { id: "hours",      label: "Hours",            icon: Clock },
  { id: "payments",   label: "Payments",         icon: CreditCard },
  { id: "categories", label: "Categories",       icon: Tag },
  { id: "closures",   label: "Closures",         icon: Calendar },
  { id: "loyalty",    label: "Loyalty",          icon: Star },
  { id: "promo",      label: "Promo Banner",     icon: Sparkles },
  { id: "rules",      label: "Business Rules",   icon: Wrench },
  { id: "social",     label: "Social & Contact", icon: Users },
  { id: "announcement", label: "Announcement",   icon: Star },
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
  // ctxSettings sync removed — fetchSettings() loads from DB directly

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).from("settings").select("*").limit(1).maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      if (data) {
        const DEFAULT_PAYMENT_METHODS = [
          { id: "cash",          name: "Cash",          enabled: true  },
          { id: "mobile_money",  name: "Mobile Money",  enabled: true  },
          { id: "card",          name: "Card",          enabled: false },
          { id: "bank_transfer", name: "Bank Transfer", enabled: false },
          { id: "gift_card",     name: "Gift Card",     enabled: true  },
        ];
        // Merge: if existing records lack name, backfill from defaults
        const nameMap: Record<string,string> = {
          cash: "Cash", mobile_money: "Mobile Money", card: "Card",
          bank_transfer: "Bank Transfer", gift_card: "Gift Card",
        };
        const existing = data.payment_methods && data.payment_methods.length > 0
          ? data.payment_methods.map((m: any) => ({ ...m, name: m.name || nameMap[m.id] || m.id }))
          : DEFAULT_PAYMENT_METHODS;
        const methods = existing;
        // Convert gift_card_prices to numbers (DB can return mixed types)
        const rawPrices = data.gift_card_prices || {};
        const gift_card_prices: Record<string,number> = {};
        for (const [k, v] of Object.entries(rawPrices)) { gift_card_prices[k] = Number(v); }
        setSettings({ ...defaultSettings, ...data, payment_methods: methods, gift_card_prices } as any);
      }
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

    const doSave = async () => {
      const logoUrl = await uploadLogo();

      const payload: any = {
        business_name: settings.business_name,
        logo_url: logoUrl ?? settings.logo_url ?? null,
        open_time: settings.open_time,
        close_time: settings.close_time,
        currency: settings.currency,
        business_phone: settings.business_phone ?? "",
        business_email: settings.business_email ?? "",
        business_address: settings.business_address ?? "",
        payment_methods: settings.payment_methods ?? [],
        deposit_amount: Number(settings.deposit_amount ?? 50),
        loyalty_stamp_per_ghs: Number(settings.loyalty_stamp_per_ghs ?? 100),
        loyalty_stamps_for_reward: Number(settings.loyalty_stamps_for_reward ?? 20),
        loyalty_reward_discount: Number(settings.loyalty_reward_discount ?? 50),
        service_categories: settings.service_categories ?? [],
        staff_roles: settings.staff_roles ?? [],
        staff_specialties: (settings as any).staff_specialties ?? [],
        closed_dates: settings.closed_dates ?? [],
        gift_card_prices: (settings as any).gift_card_prices ?? {},
        landing_sections: {
          show_gift_cards: (settings as any).landing_sections?.show_gift_cards ?? true,
          show_subscriptions: (settings as any).landing_sections?.show_subscriptions ?? false,
        },
        promo_banner: (settings as any).promo_banner ?? null,
        announcement: (settings as any).announcement ?? null,
        business_phone_2: (settings as any).business_phone_2 ?? "",
        whatsapp_number: (settings as any).whatsapp_number ?? "",
        instagram_handle: (settings as any).instagram_handle ?? "",
        tiktok_handle: (settings as any).tiktok_handle ?? "",
        facebook_handle: (settings as any).facebook_handle ?? "",
        cancellation_policy: (settings as any).cancellation_policy ?? "",
        lateness_fee: Number((settings as any).lateness_fee ?? 50),
        lateness_cutoff: Number((settings as any).lateness_cutoff ?? 15),
        student_discount: Number((settings as any).student_discount ?? 10),
        max_bookings_per_slot: Number((settings as any).max_bookings_per_slot ?? 6),
      };

      // POST to our own Vercel serverless function — no CORS, no browser timeout
      const bodyStr = JSON.stringify(payload);
      const bodySize = bodyStr.length;
      // Log size breakdown
      const sizes: Record<string,number> = {};
      for (const [k,v] of Object.entries(payload)) sizes[k] = JSON.stringify(v).length;
      console.log("Payload total:", bodySize, "bytes. Fields:", sizes);
      // Show toast with size so we can debug
      if (bodySize > 100_000) {
        const biggest = Object.entries(sizes).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>`${k}:${v}`).join(", ");
        toast.error(`Payload too large: ${Math.round(bodySize/1024)}KB. Biggest: ${biggest}`);
        return;
      }
      const res = await fetch("/api/save-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: bodyStr,
      });

      let data: any = {};
      try { data = await res.json(); } catch (_) {}
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      const gcPrices: Record<string,number> = {};
      for (const [k,v] of Object.entries(payload.gift_card_prices || {})) gcPrices[k] = Number(v);
      const merged = { ...settings, ...payload, logo_url: logoUrl || settings.logo_url, gift_card_prices: gcPrices };
      setSettings(merged as any);
      setCtxSettings((prev: any) => ({ ...prev, ...merged }));
      toast.success("Settings saved");
      setLogoFile(null);
    };

    doSave()
      .catch((err: any) => {
        console.error("Settings save error:", err);
        toast.error(err?.message || "Save failed");
      })
      .finally(() => setSaving(false));
  };;;;;;

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
      <div style={{ background: WHITE, borderBottom: `1px solid ${BORDER}`, padding: "0 clamp(16px,4vw,40px)", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 1px 0 rgba(0,0,0,0.04)" }}>
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

            {/* Staff Specialties */}
            <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", boxShadow: SHADOW }}>
              <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}`, background: "linear-gradient(135deg,rgba(200,169,126,0.08),rgba(200,169,126,0.02))" }}>
                <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 700, color: TXT, margin: "0 0 2px" }}>Staff Specialties</h2>
                <p style={{ fontSize: 11, color: TXT_SOFT, margin: 0 }}>Service skills that can be assigned to staff members. Used for smart booking assignment.</p>
              </div>
              <div style={{ padding: 20 }}>
                <DraggableListSection title="staff-specialties" items={settings.staff_specialties || []}
                  onItemsChange={items => setSettings(p => ({ ...p, staff_specialties: items }))} addButtonText="Add Specialty" />
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
            {/* Landing Page Visibility */}
            <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "24px 28px", marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", color: G, marginBottom: 18 }}>LANDING PAGE SECTIONS</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { key: "show_gift_cards", label: "Gift Cards Section", desc: "Show the gift cards section on the public landing page" },
                  { key: "show_subscriptions", label: "Subscriptions / Plans Section", desc: "Show the monthly plans section on the public landing page" },
                ].map(({ key, label, desc }) => {
                  const val = ((settings as any).landing_sections?.[key]) ?? (key === "show_gift_cards" ? true : false);
                  return (
                    <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: CREAM, borderRadius: 10, border: `1px solid ${BORDER}` }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: TXT, marginBottom: 2 }}>{label}</div>
                        <div style={{ fontSize: 11, color: TXT_SOFT }}>{desc}</div>
                      </div>
                      <button
                        onClick={() => setSettings((p: any) => ({ ...p, landing_sections: { ...((p.landing_sections) || {}), [key]: !val } }))}
                        style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", position: "relative", flexShrink: 0, background: val ? `linear-gradient(135deg,${G},${G_D})` : BORDER, transition: "background 0.2s" }}>
                        <span style={{ position: "absolute", top: 2, left: val ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "white", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                      </button>
                    </div>
                  );
                })}
              </div>
              <p style={{ fontSize: 11, color: TXT_SOFT, marginTop: 12 }}>Remember to save settings after toggling.</p>
            </div>
            <GiftCardPricingSection />
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

        {tab("promo", (
          <div>
            <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:26, fontWeight:600, color:TXT, marginBottom:6 }}>Promo Banner</h2>
            <p style={{ fontSize:13, color:TXT_SOFT, marginBottom:24, fontFamily:"'Montserrat',sans-serif" }}>Show a promotional strip on the landing page. Use it for Eid, Christmas, seasonal deals, or any campaign. Goes live immediately when enabled.</p>

            <div style={{ background:WHITE, border:`1px solid ${BORDER}`, borderRadius:12, padding:"18px 20px", marginBottom:16, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <p style={{ fontSize:13, fontWeight:600, color:TXT, margin:"0 0 3px", fontFamily:"'Montserrat',sans-serif" }}>Show Promo Banner</p>
                <p style={{ fontSize:12, color:TXT_SOFT, margin:0, fontFamily:"'Montserrat',sans-serif" }}>Toggles the banner on/off on the public landing page</p>
              </div>
              <div onClick={() => setSettings((p:any) => ({ ...p, promo_banner: { ...(p.promo_banner||{}), enabled: !(p.promo_banner?.enabled) } }))}
                style={{ width:44, height:24, borderRadius:12, background:(settings as any).promo_banner?.enabled ? "#C8A97E" : "#D1C5B8", cursor:"pointer", position:"relative", transition:"background 0.2s", flexShrink:0 }}>
                <div style={{ position:"absolute", top:3, left:(settings as any).promo_banner?.enabled ? 23 : 3, width:18, height:18, borderRadius:"50%", background:"white", transition:"left 0.2s", boxShadow:"0 1px 4px rgba(0,0,0,0.2)" }} />
              </div>
            </div>

            <div style={{ background:WHITE, border:`1px solid ${BORDER}`, borderRadius:12, padding:"18px 20px", marginBottom:16 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:700, letterSpacing:"0.12em", color:TXT_SOFT, marginBottom:8, fontFamily:"'Montserrat',sans-serif" }}>BANNER MESSAGE</label>
              <input
                value={(settings as any).promo_banner?.message || ""}
                onChange={e => setSettings((p:any) => ({ ...p, promo_banner: { ...(p.promo_banner||{}), message: e.target.value } }))}
                placeholder="e.g. 🌙 Eid Special: 15% off all braids this week! Use code EID15"
                style={{ width:"100%", padding:"11px 14px", border:`1.5px solid ${BORDER}`, borderRadius:10, fontSize:13, color:TXT, fontFamily:"'Montserrat',sans-serif", outline:"none" }}
              />
              <p style={{ fontSize:11, color:TXT_SOFT, marginTop:6, fontFamily:"'Montserrat',sans-serif" }}>Include the promo code in the message so clients can copy it easily.</p>
            </div>

            <div style={{ background:WHITE, border:`1px solid ${BORDER}`, borderRadius:12, padding:"18px 20px", marginBottom:16 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:700, letterSpacing:"0.12em", color:TXT_SOFT, marginBottom:12, fontFamily:"'Montserrat',sans-serif" }}>BANNER STYLE</label>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                {([
                  { val:"gold",   bg:"linear-gradient(90deg,#8B6914,#C8A97E,#8B6914)", label:"Gold" },
                  { val:"dark",   bg:"linear-gradient(90deg,#1C160E,#2D2318,#1C160E)", label:"Dark" },
                  { val:"green",  bg:"linear-gradient(90deg,#064E3B,#10B981,#064E3B)", label:"Green" },
                  { val:"purple", bg:"linear-gradient(90deg,#4C1D95,#8B5CF6,#4C1D95)", label:"Purple" },
                  { val:"red",    bg:"linear-gradient(90deg,#7F1D1D,#EF4444,#7F1D1D)", label:"Red" },
                ] as const).map(s => {
                  const current = (settings as any).promo_banner?.style || "gold";
                  return (
                    <div key={s.val} onClick={() => setSettings((p:any) => ({ ...p, promo_banner: { ...(p.promo_banner||{}), style: s.val } }))}
                      style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 14px", borderRadius:20, border:`2px solid ${current === s.val ? "#C8A97E" : BORDER}`, cursor:"pointer", background:"white" }}>
                      <div style={{ width:16, height:16, borderRadius:"50%", background:s.bg, flexShrink:0 }} />
                      <span style={{ fontSize:12, fontWeight:600, color:TXT, fontFamily:"'Montserrat',sans-serif" }}>{s.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ background:WHITE, border:`1px solid ${BORDER}`, borderRadius:12, padding:"18px 20px", marginBottom:24 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:700, letterSpacing:"0.12em", color:TXT_SOFT, marginBottom:8, fontFamily:"'Montserrat',sans-serif" }}>AUTO-EXPIRE DATE & TIME (optional)</label>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                <input type="date"
                  value={(settings as any).promo_banner?.expires_date || ""}
                  onChange={e => setSettings((p:any) => ({ ...p, promo_banner: { ...(p.promo_banner||{}), expires_date: e.target.value } }))}
                  style={{ padding:"11px 14px", border:`1.5px solid ${BORDER}`, borderRadius:10, fontSize:13, color:TXT, fontFamily:"'Montserrat',sans-serif", outline:"none", flex:1, minWidth:140 }}
                />
                <input type="time"
                  value={(settings as any).promo_banner?.expires_time || "23:59"}
                  onChange={e => setSettings((p:any) => ({ ...p, promo_banner: { ...(p.promo_banner||{}), expires_time: e.target.value } }))}
                  style={{ padding:"11px 14px", border:`1.5px solid ${BORDER}`, borderRadius:10, fontSize:13, color:TXT, fontFamily:"'Montserrat',sans-serif", outline:"none", width:130 }}
                />
              </div>
              <p style={{ fontSize:11, color:TXT_SOFT, marginTop:6, fontFamily:"'Montserrat',sans-serif" }}>Banner hides automatically at this exact date and time. Leave blank to keep it until you toggle it off.</p>
            </div>

            {(settings as any).promo_banner?.message && (
              <div style={{ marginBottom:8 }}>
                <p style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", color:TXT_SOFT, marginBottom:8, fontFamily:"'Montserrat',sans-serif" }}>PREVIEW</p>
                <div style={{
                  background: (settings as any).promo_banner?.style === "dark" ? "linear-gradient(90deg,#1C160E,#2D2318,#1C160E)"
                    : (settings as any).promo_banner?.style === "green" ? "linear-gradient(90deg,#064E3B,#10B981,#064E3B)"
                    : (settings as any).promo_banner?.style === "purple" ? "linear-gradient(90deg,#4C1D95,#8B5CF6,#4C1D95)"
                    : (settings as any).promo_banner?.style === "red" ? "linear-gradient(90deg,#7F1D1D,#EF4444,#7F1D1D)"
                    : "linear-gradient(90deg,#8B6914,#C8A97E,#8B6914)",
                  padding:"12px 20px", textAlign:"center", borderRadius:8
                }}>
                  <span style={{ fontFamily:"'Montserrat',sans-serif", fontSize:13, fontWeight:600, color:"white", letterSpacing:"0.04em" }}>
                    {(settings as any).promo_banner?.message}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}

        {tab("rules", (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:26, fontWeight:600, color:TXT, marginBottom:4 }}>Business Rules</h2>
            <p style={{ fontSize:13, color:TXT_SOFT, fontFamily:"'Montserrat',sans-serif", marginBottom:8 }}>These values appear on the booking page and guide client behaviour. Change them here — no code needed.</p>

            <div style={{ background:WHITE, border:`1px solid ${BORDER}`, borderRadius:12, padding:"18px 20px" }}>
              <label style={{ display:"block", fontSize:11, fontWeight:700, letterSpacing:"0.12em", color:TXT_SOFT, marginBottom:8, fontFamily:"'Montserrat',sans-serif" }}>CANCELLATION POLICY TEXT</label>
              <textarea rows={3} value={(settings as any).cancellation_policy || ""}
                onChange={e => setSettings((p:any) => ({ ...p, cancellation_policy: e.target.value }))}
                style={{ width:"100%", padding:"11px 14px", border:`1.5px solid ${BORDER}`, borderRadius:10, fontSize:13, color:TXT, fontFamily:"'Montserrat',sans-serif", outline:"none", resize:"vertical" }}
              />
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
              <div style={{ background:WHITE, border:`1px solid ${BORDER}`, borderRadius:12, padding:"18px 20px" }}>
                <label style={{ display:"block", fontSize:11, fontWeight:700, letterSpacing:"0.12em", color:TXT_SOFT, marginBottom:8, fontFamily:"'Montserrat',sans-serif" }}>LATENESS FEE (GHS)</label>
                <input type="number" value={(settings as any).lateness_fee ?? 50}
                  onChange={e => setSettings((p:any) => ({ ...p, lateness_fee: Number(e.target.value) }))}
                  style={{ width:"100%", padding:"11px 14px", border:`1.5px solid ${BORDER}`, borderRadius:10, fontSize:13, color:TXT, fontFamily:"'Montserrat',sans-serif", outline:"none" }} />
                <p style={{ fontSize:11, color:TXT_SOFT, marginTop:6, fontFamily:"'Montserrat',sans-serif" }}>Fee charged when client is late</p>
              </div>
              <div style={{ background:WHITE, border:`1px solid ${BORDER}`, borderRadius:12, padding:"18px 20px" }}>
                <label style={{ display:"block", fontSize:11, fontWeight:700, letterSpacing:"0.12em", color:TXT_SOFT, marginBottom:8, fontFamily:"'Montserrat',sans-serif" }}>LATENESS CUTOFF (mins)</label>
                <input type="number" value={(settings as any).lateness_cutoff ?? 15}
                  onChange={e => setSettings((p:any) => ({ ...p, lateness_cutoff: Number(e.target.value) }))}
                  style={{ width:"100%", padding:"11px 14px", border:`1.5px solid ${BORDER}`, borderRadius:10, fontSize:13, color:TXT, fontFamily:"'Montserrat',sans-serif", outline:"none" }} />
                <p style={{ fontSize:11, color:TXT_SOFT, marginTop:6, fontFamily:"'Montserrat',sans-serif" }}>Minutes late before fee applies</p>
              </div>
              <div style={{ background:WHITE, border:`1px solid ${BORDER}`, borderRadius:12, padding:"18px 20px" }}>
                <label style={{ display:"block", fontSize:11, fontWeight:700, letterSpacing:"0.12em", color:TXT_SOFT, marginBottom:8, fontFamily:"'Montserrat',sans-serif" }}>STUDENT DISCOUNT (%)</label>
                <input type="number" value={(settings as any).student_discount ?? 10}
                  onChange={e => setSettings((p:any) => ({ ...p, student_discount: Number(e.target.value) }))}
                  style={{ width:"100%", padding:"11px 14px", border:`1.5px solid ${BORDER}`, borderRadius:10, fontSize:13, color:TXT, fontFamily:"'Montserrat',sans-serif", outline:"none" }} />
                <p style={{ fontSize:11, color:TXT_SOFT, marginTop:6, fontFamily:"'Montserrat',sans-serif" }}>Mon–Thu with valid student ID</p>
              </div>
            </div>

            <div style={{ background:WHITE, border:`1px solid ${BORDER}`, borderRadius:12, padding:"18px 20px" }}>
              <label style={{ display:"block", fontSize:11, fontWeight:700, letterSpacing:"0.12em", color:TXT_SOFT, marginBottom:8, fontFamily:"'Montserrat',sans-serif" }}>MAX BOOKINGS PER TIME SLOT</label>
              <input type="number" min={1} max={20} value={(settings as any).max_bookings_per_slot ?? 6}
                onChange={e => setSettings((p:any) => ({ ...p, max_bookings_per_slot: Number(e.target.value) }))}
                style={{ width:120, padding:"11px 14px", border:`1.5px solid ${BORDER}`, borderRadius:10, fontSize:13, color:TXT, fontFamily:"'Montserrat',sans-serif", outline:"none" }} />
              <p style={{ fontSize:11, color:TXT_SOFT, marginTop:6, fontFamily:"'Montserrat',sans-serif" }}>Currently set to 6. When a slot has this many confirmed bookings, new clients go to the waitlist.</p>
            </div>
          </div>
        ))}

        {tab("social", (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:26, fontWeight:600, color:TXT, marginBottom:4 }}>Social & Contact</h2>
            <p style={{ fontSize:13, color:TXT_SOFT, fontFamily:"'Montserrat',sans-serif", marginBottom:8 }}>Update once here and it changes everywhere on the site.</p>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div style={{ background:WHITE, border:`1px solid ${BORDER}`, borderRadius:12, padding:"18px 20px" }}>
                <label style={{ display:"block", fontSize:11, fontWeight:700, letterSpacing:"0.12em", color:TXT_SOFT, marginBottom:8, fontFamily:"'Montserrat',sans-serif" }}>PRIMARY PHONE</label>
                <input value={settings.business_phone || ""}
                  onChange={e => setSettings((p:any) => ({ ...p, business_phone: e.target.value }))}
                  placeholder="059 436 5314"
                  style={{ width:"100%", padding:"11px 14px", border:`1.5px solid ${BORDER}`, borderRadius:10, fontSize:13, color:TXT, fontFamily:"'Montserrat',sans-serif", outline:"none" }} />
              </div>
              <div style={{ background:WHITE, border:`1px solid ${BORDER}`, borderRadius:12, padding:"18px 20px" }}>
                <label style={{ display:"block", fontSize:11, fontWeight:700, letterSpacing:"0.12em", color:TXT_SOFT, marginBottom:8, fontFamily:"'Montserrat',sans-serif" }}>SECOND PHONE</label>
                <input value={(settings as any).business_phone_2 || ""}
                  onChange={e => setSettings((p:any) => ({ ...p, business_phone_2: e.target.value }))}
                  placeholder="020 884 8707"
                  style={{ width:"100%", padding:"11px 14px", border:`1.5px solid ${BORDER}`, borderRadius:10, fontSize:13, color:TXT, fontFamily:"'Montserrat',sans-serif", outline:"none" }} />
              </div>
              <div style={{ background:WHITE, border:`1px solid ${BORDER}`, borderRadius:12, padding:"18px 20px" }}>
                <label style={{ display:"block", fontSize:11, fontWeight:700, letterSpacing:"0.12em", color:TXT_SOFT, marginBottom:8, fontFamily:"'Montserrat',sans-serif" }}>WHATSAPP NUMBER</label>
                <input value={(settings as any).whatsapp_number || ""}
                  onChange={e => setSettings((p:any) => ({ ...p, whatsapp_number: e.target.value }))}
                  placeholder="233594365314 (include country code, no +)"
                  style={{ width:"100%", padding:"11px 14px", border:`1.5px solid ${BORDER}`, borderRadius:10, fontSize:13, color:TXT, fontFamily:"'Montserrat',sans-serif", outline:"none" }} />
              </div>
              <div style={{ background:WHITE, border:`1px solid ${BORDER}`, borderRadius:12, padding:"18px 20px" }}>
                <label style={{ display:"block", fontSize:11, fontWeight:700, letterSpacing:"0.12em", color:TXT_SOFT, marginBottom:8, fontFamily:"'Montserrat',sans-serif" }}>INSTAGRAM HANDLE</label>
                <input value={(settings as any).instagram_handle || ""}
                  onChange={e => setSettings((p:any) => ({ ...p, instagram_handle: e.target.value }))}
                  placeholder="zolarastudio"
                  style={{ width:"100%", padding:"11px 14px", border:`1.5px solid ${BORDER}`, borderRadius:10, fontSize:13, color:TXT, fontFamily:"'Montserrat',sans-serif", outline:"none" }} />
                <p style={{ fontSize:11, color:TXT_SOFT, marginTop:4, fontFamily:"'Montserrat',sans-serif" }}>Without @</p>
              </div>
              <div style={{ background:WHITE, border:`1px solid ${BORDER}`, borderRadius:12, padding:"18px 20px" }}>
                <label style={{ display:"block", fontSize:11, fontWeight:700, letterSpacing:"0.12em", color:TXT_SOFT, marginBottom:8, fontFamily:"'Montserrat',sans-serif" }}>TIKTOK HANDLE</label>
                <input value={(settings as any).tiktok_handle || ""}
                  onChange={e => setSettings((p:any) => ({ ...p, tiktok_handle: e.target.value }))}
                  placeholder="zolarastudio"
                  style={{ width:"100%", padding:"11px 14px", border:`1.5px solid ${BORDER}`, borderRadius:10, fontSize:13, color:TXT, fontFamily:"'Montserrat',sans-serif", outline:"none" }} />
                <p style={{ fontSize:11, color:TXT_SOFT, marginTop:4, fontFamily:"'Montserrat',sans-serif" }}>Without @</p>
              </div>
              <div style={{ background:WHITE, border:`1px solid ${BORDER}`, borderRadius:12, padding:"18px 20px" }}>
                <label style={{ display:"block", fontSize:11, fontWeight:700, letterSpacing:"0.12em", color:TXT_SOFT, marginBottom:8, fontFamily:"'Montserrat',sans-serif" }}>FACEBOOK PAGE</label>
                <input value={(settings as any).facebook_handle || ""}
                  onChange={e => setSettings((p:any) => ({ ...p, facebook_handle: e.target.value }))}
                  placeholder="zolarastudio"
                  style={{ width:"100%", padding:"11px 14px", border:`1.5px solid ${BORDER}`, borderRadius:10, fontSize:13, color:TXT, fontFamily:"'Montserrat',sans-serif", outline:"none" }} />
                <p style={{ fontSize:11, color:TXT_SOFT, marginTop:4, fontFamily:"'Montserrat',sans-serif" }}>Page name from facebook.com/</p>
              </div>
            </div>
          </div>
        ))}

        {tab("announcement", (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:26, fontWeight:600, color:TXT, marginBottom:4 }}>Announcement Modal</h2>
            <p style={{ fontSize:13, color:TXT_SOFT, fontFamily:"'Montserrat',sans-serif", marginBottom:8 }}>A popup shown once per visitor on the landing page. Use it for openings, new services, seasonal news, or anything important.</p>

            <div style={{ background:WHITE, border:`1px solid ${BORDER}`, borderRadius:12, padding:"18px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <p style={{ fontSize:13, fontWeight:600, color:TXT, margin:"0 0 3px", fontFamily:"'Montserrat',sans-serif" }}>Show Announcement</p>
                <p style={{ fontSize:12, color:TXT_SOFT, margin:0, fontFamily:"'Montserrat',sans-serif" }}>Shows once per visitor (stored in their browser)</p>
              </div>
              <div onClick={() => setSettings((p:any) => ({ ...p, announcement: { ...(p.announcement||{}), enabled: !(p.announcement?.enabled) } }))}
                style={{ width:44, height:24, borderRadius:12, background:(settings as any).announcement?.enabled ? "#C8A97E" : "#D1C5B8", cursor:"pointer", position:"relative", transition:"background 0.2s", flexShrink:0 }}>
                <div style={{ position:"absolute", top:3, left:(settings as any).announcement?.enabled ? 23 : 3, width:18, height:18, borderRadius:"50%", background:"white", transition:"left 0.2s", boxShadow:"0 1px 4px rgba(0,0,0,0.2)" }} />
              </div>
            </div>

            <div style={{ background:WHITE, border:`1px solid ${BORDER}`, borderRadius:12, padding:"18px 20px" }}>
              <label style={{ display:"block", fontSize:11, fontWeight:700, letterSpacing:"0.12em", color:TXT_SOFT, marginBottom:8, fontFamily:"'Montserrat',sans-serif" }}>TITLE</label>
              <input value={(settings as any).announcement?.title || ""}
                onChange={e => setSettings((p:any) => ({ ...p, announcement: { ...(p.announcement||{}), title: e.target.value } }))}
                placeholder="e.g. We're Now Open! 🎉"
                style={{ width:"100%", padding:"11px 14px", border:`1.5px solid ${BORDER}`, borderRadius:10, fontSize:13, color:TXT, fontFamily:"'Montserrat',sans-serif", outline:"none", marginBottom:12 }} />
              <label style={{ display:"block", fontSize:11, fontWeight:700, letterSpacing:"0.12em", color:TXT_SOFT, marginBottom:8, fontFamily:"'Montserrat',sans-serif" }}>MESSAGE</label>
              <textarea rows={3} value={(settings as any).announcement?.message || ""}
                onChange={e => setSettings((p:any) => ({ ...p, announcement: { ...(p.announcement||{}), message: e.target.value } }))}
                placeholder="e.g. Zolara Beauty Studio is officially open in Sakasaka! Book your first appointment today and get 10% off."
                style={{ width:"100%", padding:"11px 14px", border:`1.5px solid ${BORDER}`, borderRadius:10, fontSize:13, color:TXT, fontFamily:"'Montserrat',sans-serif", outline:"none", resize:"vertical" }} />
            </div>

            <div style={{ background:WHITE, border:`1px solid ${BORDER}`, borderRadius:12, padding:"18px 20px" }}>
              <label style={{ display:"block", fontSize:11, fontWeight:700, letterSpacing:"0.12em", color:TXT_SOFT, marginBottom:8, fontFamily:"'Montserrat',sans-serif" }}>AUTO-EXPIRE DATE & TIME (optional)</label>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                <input type="date"
                  value={(settings as any).announcement?.expires_date || ""}
                  onChange={e => setSettings((p:any) => ({ ...p, announcement: { ...(p.announcement||{}), expires_date: e.target.value } }))}
                  style={{ padding:"11px 14px", border:`1.5px solid ${BORDER}`, borderRadius:10, fontSize:13, color:TXT, fontFamily:"'Montserrat',sans-serif", outline:"none", flex:1, minWidth:140 }}
                />
                <input type="time"
                  value={(settings as any).announcement?.expires_time || "23:59"}
                  onChange={e => setSettings((p:any) => ({ ...p, announcement: { ...(p.announcement||{}), expires_time: e.target.value } }))}
                  style={{ padding:"11px 14px", border:`1.5px solid ${BORDER}`, borderRadius:10, fontSize:13, color:TXT, fontFamily:"'Montserrat',sans-serif", outline:"none", width:130 }}
                />
              </div>
              <p style={{ fontSize:11, color:TXT_SOFT, marginTop:6, fontFamily:"'Montserrat',sans-serif" }}>Modal stops showing at this exact date and time. Leave blank to keep it until you toggle it off.</p>
            </div>

            {(settings as any).announcement?.title && (
              <div>
                <p style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", color:TXT_SOFT, marginBottom:8, fontFamily:"'Montserrat',sans-serif" }}>PREVIEW</p>
                <div style={{ background:"rgba(0,0,0,0.5)", borderRadius:12, padding:32, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <div style={{ background:"white", borderRadius:16, padding:"32px 28px", maxWidth:400, width:"100%", textAlign:"center", boxShadow:"0 32px 80px rgba(0,0,0,0.4)" }}>
                    <div style={{ fontSize:32, marginBottom:12 }}>✦</div>
                    <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:24, fontWeight:600, color:"#1C160E", marginBottom:12 }}>{(settings as any).announcement?.title}</h3>
                    {(settings as any).announcement?.message && <p style={{ fontFamily:"'Montserrat',sans-serif", fontSize:13, color:"#57534E", lineHeight:1.7, marginBottom:20 }}>{(settings as any).announcement?.message}</p>}
                    <div style={{ background:"linear-gradient(135deg,#8B6914,#C8A97E)", borderRadius:8, padding:"12px 24px", display:"inline-block" }}>
                      <span style={{ fontFamily:"'Montserrat',sans-serif", fontSize:11, fontWeight:700, color:"white", letterSpacing:"0.14em" }}>BOOK NOW →</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
