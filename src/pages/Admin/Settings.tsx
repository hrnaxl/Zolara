import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/context/SettingsContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BusinessInfoSection } from "@/components/settings/BusinessInfoSection";
import { OperatingHoursSection } from "@/components/settings/OperatingHoursSection";
import { DraggableListSection } from "@/components/settings/DraggableListSection";
import { PaymentMethodsSection } from "@/components/settings/PaymentMethodsSection";
import { DataManagementSection } from "@/components/settings/DataManagementSection";
import { BackupRestoreSection } from "@/components/settings/BackupRestoreSection";
import { Loader2 } from "lucide-react";
import { GallerySettingsSection } from "@/components/settings/GalllerySection";
import { ReviewsSettingsSection } from "@/components/settings/ReviewsManagement";
import { TemporaryClosuresSection } from "@/components/settings/TemporaryClosuresSection";
import { BusinessRulesSection } from "@/components/settings/BusinessRulesSection";

interface PaymentMethod {
  id: string;
  name: string;
  enabled: boolean;
}

interface Settings {
  id?: string;
  business_name: string;
  logo_url: string;
  open_time: string;
  close_time: string;
  currency: string;
  staff_roles: string[];
  service_categories: string[];
  use_24_hour_format: boolean;
  business_phone: string;
  business_email: string;
  business_address: string;
  payment_methods: PaymentMethod[];
  closed_dates?: string[];
  deposit_amount?: number;
  loyalty_stamp_per_ghs?: number;
  loyalty_stamps_for_reward?: number;
  loyalty_reward_discount?: number;
  created_at?: string;
  updated_at?: string;
}

// const defaultPaymentMethods: PaymentMethod[] = [
//   { id: "cash", name: "Cash", enabled: true },
//   { id: "momo", name: "Mobile Money (MoMo)", enabled: true },
//   { id: "card", name: "Card", enabled: true },
//   { id: "bank_transfer", name: "Bank Transfer", enabled: true },
// ];

const defaultSettings: Settings = {
  business_name: "",
  logo_url: "",
  open_time: "8:30",
  close_time: "21:00",
  currency: "GH₵",
  staff_roles: ["Hairdresser", "Barber", "Receptionist"],
  service_categories: ["Hair", "Nails", "Massage"],
  use_24_hour_format: false,
  business_phone: "",
  business_email: "",
  business_address: "",
  payment_methods: [],
  closed_dates: [],
  deposit_amount: 50,
  loyalty_stamp_per_ghs: 100,
  loyalty_stamps_for_reward: 20,
  loyalty_reward_discount: 50,
};

function SMSTestPanel() {
  const [phone, setPhone] = React.useState("0594922679");
  const [sending, setSending] = React.useState<string | null>(null);
  const [results, setResults] = React.useState<Record<string, string>>({});

  const SUPABASE_URL = "https://vwvrhbyfytmqsywfdhvd.supabase.co";
  const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dnJoYnlmeXRtcXN5d2ZkaHZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTA1MTQsImV4cCI6MjA4ODcyNjUxNH0.UFzTXEiS-dPXDoeSJSVfQGkRUuFA1aNQxHWu6jk62L4";
  const ARKESEL_KEY = "S0JhVWFlcm1VV1pkSWJvWnpacEs";
  const CONTACT = "0594365314 / 0208848707";

  function formatPhone(p: string) {
    const d = p.replace(/\D/g, "");
    if (d.startsWith("0") && d.length === 10) return "233" + d.slice(1);
    if (d.startsWith("233")) return d;
    return d;
  }

  async function sendTestSMS(key: string, message: string) {
    setSending(key);
    try {
      const res = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
        method: "POST",
        headers: { "api-key": ARKESEL_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ sender: "Zolara", message, recipients: [formatPhone(phone)] }),
      });
      const data = await res.json();
      const ok = data.status === "success" || res.ok;
      setResults(r => ({ ...r, [key]: ok ? "✓ Sent" : "✗ Failed: " + JSON.stringify(data) }));
    } catch (e: any) {
      setResults(r => ({ ...r, [key]: "✗ Error: " + e.message }));
    } finally {
      setSending(null);
    }
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-GH", { weekday: "long", day: "numeric", month: "long" });
  const timeStr = now.toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" });

  const TESTS = [
    {
      key: "booking_deposit",
      label: "1. Booking Received (Deposit Paid)",
      msg: `Hi Harun, your booking request at Zolara has been received.

Service: Box Braids
Date: ${dateStr}
Time: ${timeStr}
Ref: ZLR-TEST01

Deposit: GHS 50 received.

Your appointment is being reviewed by our team. You will receive a confirmation message shortly.

Zolara Beauty Studio
${CONTACT}`,
    },
    {
      key: "booking_no_deposit",
      label: "2. Booking Received (No Deposit)",
      msg: `Hi Harun, your booking request at Zolara has been received.

Service: Box Braids
Date: ${dateStr}
Time: ${timeStr}
Ref: ZLR-TEST01

Deposit: Not recorded.

Your appointment request is awaiting confirmation. You will receive an update shortly.

Zolara Beauty Studio
${CONTACT}`,
    },
    {
      key: "booking_confirmed",
      label: "3. Booking Confirmed",
      msg: `Hi Harun, your Zolara appointment is confirmed.

Service: Box Braids
Date: ${dateStr}
Time: ${timeStr}
Stylist: Amanda
Ref: ZLR-TEST01

We look forward to serving you. Please arrive about 5 minutes early.

Zolara Beauty Studio
${CONTACT}`,
    },
    {
      key: "reminder",
      label: "4. Appointment Reminder (2hrs before)",
      msg: `Hi Harun, this is a reminder of your Zolara appointment today.

Service: Box Braids
Time: ${timeStr}
Stylist: Amanda
Ref: ZLR-TEST01

We look forward to serving you.

Zolara Beauty Studio
${CONTACT}`,
    },
    {
      key: "checkout",
      label: "5. Checkout Complete",
      msg: `Thank you for visiting Zolara, Harun.

Service: Box Braids
Total Paid: GHS 655
Ref: ZLR-TEST01

You earned 6 stamps from this visit.
Your total stamps: 24

Collect 20 stamps and enjoy a GHS 50 reward.

Book your next visit:
zolarasalon.com

Zolara Beauty Studio
${CONTACT}`,
    },
    {
      key: "rebooking",
      label: "6. Rebooking Reminder",
      msg: `Hi Harun, it may be time for your next Zolara visit.

Your last service: Box Braids

Book your next appointment anytime:
zolarasalon.com

We would love to welcome you back.

Zolara Beauty Studio
${CONTACT}`,
    },
    {
      key: "loyalty_reward",
      label: "7. Loyalty Reward Unlocked",
      msg: `Hi Harun, great news from Zolara.

You have collected 20 stamps and unlocked your reward.

Your GHS 50 loyalty credit is ready to use on your next visit.

Book your appointment:
zolarasalon.com

Zolara Beauty Studio
${CONTACT}`,
    },
    {
      key: "missed_you",
      label: "8. Missed-You Recovery",
      msg: `Hi Harun, we have missed seeing you at Zolara.

It has been a while since your last visit and we would love to welcome you back.

Book your next appointment anytime:
zolarasalon.com

We look forward to taking care of you again.

Zolara Beauty Studio
${CONTACT}`,
    },
  ];

  return (
    <div style={{ background: "#fff", border: "1px solid #EDE8E0", borderRadius: 16, padding: "24px 28px", marginBottom: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: "#A8A29E", marginBottom: 10 }}>SMS TEST PANEL</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#1C160E", marginBottom: 6 }}>Test All SMS Messages</div>
      <div style={{ fontSize: 12, color: "#78716C", marginBottom: 16 }}>Send a sample of each message type to verify they arrive correctly.</div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20 }}>
        <input
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="Phone number"
          style={{ border: "1.5px solid #EDE8E0", borderRadius: 10, padding: "9px 14px", fontSize: 13, fontFamily: "Montserrat,sans-serif", width: 180, outline: "none" }}
        />
        <span style={{ fontSize: 12, color: "#A8A29E" }}>Test messages will go to this number</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {TESTS.map(t => (
          <div key={t.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#FAFAF8", borderRadius: 10, border: "1px solid #EDE8E0", gap: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#1C160E", flex: 1 }}>{t.label}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {results[t.key] && (
                <span style={{ fontSize: 11, fontWeight: 600, color: results[t.key].startsWith("✓") ? "#16A34A" : "#DC2626" }}>
                  {results[t.key]}
                </span>
              )}
              <button
                onClick={() => sendTestSMS(t.key, t.msg)}
                disabled={sending === t.key}
                style={{ background: sending === t.key ? "#EDE8E0" : "linear-gradient(135deg,#C8A97E,#8B6914)", color: sending === t.key ? "#A8A29E" : "#fff", border: "none", borderRadius: 8, padding: "7px 16px", fontSize: 11, fontWeight: 700, cursor: sending === t.key ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}
              >
                {sending === t.key ? "Sending…" : "Send Test"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecalcLoyaltyButton() {
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<string | null>(null);

  const handleRecalc = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(
        "https://vwvrhbyfytmqsywfdhvd.supabase.co/functions/v1/recalculate-loyalty",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dnJoYnlmeXRtcXN5d2ZkaHZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTA1MTQsImV4cCI6MjA4ODcyNjUxNH0.UFzTXEiS-dPXDoeSJSVfQGkRUuFA1aNQxHWu6jk62L4",
          },
        }
      );
      const data = await res.json();
      if (data.ok) {
        setResult(`✓ Updated ${data.clients_updated} client${data.clients_updated !== 1 ? "s" : ""}. Points are now correct.`);
      } else {
        setResult(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setResult("Failed to reach function. Make sure it is deployed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: "#fff", border: "1px solid #EDE8E0", borderRadius: 16, padding: "24px 28px", marginBottom: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: "#A8A29E", marginBottom: 10 }}>LOYALTY MAINTENANCE</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#1C160E", marginBottom: 6 }}>Recalculate All Client Points</div>
      <div style={{ fontSize: 12, color: "#78716C", marginBottom: 16, lineHeight: 1.6 }}>
        Recalculates every client's loyalty points from their completed bookings. Run this once to fix any clients with incorrect points.
      </div>
      <button
        onClick={handleRecalc}
        disabled={loading}
        style={{ background: loading ? "#EDE8E0" : "linear-gradient(135deg,#C8A97E,#8B6914)", color: loading ? "#A8A29E" : "#fff", border: "none", borderRadius: 10, padding: "10px 24px", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", letterSpacing: "0.05em" }}
      >
        {loading ? "Recalculating…" : "Recalculate Points Now"}
      </button>
      {result && (
        <div style={{ marginTop: 12, fontSize: 13, color: result.startsWith("✓") ? "#16A34A" : "#DC2626", fontWeight: 600 }}>
          {result}
        </div>
      )}
    </div>
  );
}

export default function Settings() {
  const { settings: ctxSettings, setSettings: setCtxSettings } = useSettings();
  const [settings, setSettings] = useState<Settings>({ ...defaultSettings, ...ctxSettings });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap";
    document.head.appendChild(link);
    const style = document.createElement("style");
    style.id = "zolara-settings-overrides";
    style.textContent = `
      .zolara-settings [class*="Card"],[class*="card"] { border-color: #EDEBE5 !important; border-radius: 16px !important; }
      .zolara-settings h2,.zolara-settings h3,.zolara-settings [class*="CardTitle"] { font-family: 'Cormorant Garamond',serif !important; color: #1C160E !important; }
      .zolara-settings label,[class*="Label"] { font-size: 11px !important; font-weight: 600 !important; color: #78716C !important; font-family: Montserrat,sans-serif !important; }
      .zolara-settings input,.zolara-settings select,.zolara-settings textarea { font-family: Montserrat,sans-serif !important; font-size: 13px !important; border-color: #EDEBE5 !important; border-radius: 10px !important; }
      .zolara-settings button { font-family: Montserrat,sans-serif !important; }
    `;
    document.head.appendChild(style);
    return () => { document.getElementById("zolara-settings-overrides")?.remove(); };
  }, []);

  useEffect(() => {
    fetchSettings();
  }, []);

  // Keep local state in sync if context loads/updates after mount
  useEffect(() => {
    if (ctxSettings && ctxSettings.business_name !== undefined) {
      setSettings(prev => ({ ...defaultSettings, ...ctxSettings, ...prev }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("settings")
        .select("*")
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setSettings({
          ...defaultSettings,
          ...data,
          payment_methods: data.payment_methods,
        });
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return settings.logo_url || null;

    try {
      const fileExt = logoFile.name.split(".").pop();
      const fileName = `logo_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, logoFile, { cacheControl: "3600", upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error("Logo upload failed:", error);
      toast.error("Failed to upload logo");
      return settings.logo_url || null;
    }
  };

  const updateSettings = async () => {
    setSaving(true);
    try {
      const logoUrl = await uploadLogo();

      // Only include columns that actually exist in the settings table
      const settingsData = {
        business_name: settings.business_name,
        logo_url: logoUrl,
        open_time: settings.open_time,
        close_time: settings.close_time,
        currency: settings.currency,
        business_phone: settings.business_phone,
        business_email: settings.business_email,
        business_address: settings.business_address,
        payment_methods: settings.payment_methods,
        gallery_images: (settings as any).gallery_images ?? [],
        closed_dates: settings.closed_dates ?? [],
        deposit_amount: settings.deposit_amount ?? 50,
        loyalty_stamp_per_ghs: settings.loyalty_stamp_per_ghs ?? 100,
        loyalty_stamps_for_reward: settings.loyalty_stamps_for_reward ?? 20,
        loyalty_reward_discount: settings.loyalty_reward_discount ?? 50,
      };

      // Always fetch the real row id first, then update
      const { data: existing, error: fetchErr } = await (supabase as any)
        .from("settings").select("id").limit(1).maybeSingle();

      if (fetchErr && fetchErr.code !== "PGRST116") throw fetchErr;

      if (existing?.id) {
        const { data: updated, error } = await (supabase as any)
          .from("settings").update(settingsData).eq("id", existing.id).select();
        if (error) throw error;
        // If RLS blocked update silently (0 rows), updated will be empty
        if (!updated || updated.length === 0) throw new Error("Update blocked — check database permissions");
      } else {
        const { error } = await (supabase as any)
          .from("settings").insert([settingsData]);
        if (error) throw error;
      }
      toast.success("Settings saved successfully!");

      setLogoFile(null);
      const merged = { ...settings, ...settingsData, logo_url: logoUrl || settings.logo_url };
      // Update local state
      setSettings(merged);
      // Sync context so navigating away and back shows correct data immediately
      setCtxSettings((prev: any) => ({ ...prev, ...merged }));
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handlePaymentMethodToggle = (id: string, enabled: boolean) => {
    setSettings({
      ...settings,
      payment_methods: settings.payment_methods.map((m) =>
        m.id === id ? { ...m, enabled } : m
      ),
    });
  };

  const handleRestore = (restoredSettings: any) => {
    setSettings({
      ...defaultSettings,
      ...restoredSettings,
      payment_methods: restoredSettings.payment_methods,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="zolara-settings" style={{background:"#FAFAF8",minHeight:"100vh",padding:"clamp(16px,4vw,32px)",fontFamily:"Montserrat,sans-serif"}}>
      <div style={{maxWidth:"900px",margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:"32px",flexWrap:"wrap",gap:"12px"}}>
          <div>
            <p style={{fontSize:"11px",fontWeight:700,letterSpacing:"0.16em",color:"#C8A97E",textTransform:"uppercase",marginBottom:"4px"}}>Configuration</p>
            <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(28px,4vw,42px)",fontWeight:700,color:"#1C160E",margin:0,lineHeight:1}}>Settings</h1>
            <p style={{fontSize:"12px",color:"#A8A29E",marginTop:"6px"}}>Configure your salon preferences and business rules</p>
          </div>
          <Button onClick={updateSettings} disabled={saving} style={{background:"#C8A97E",border:"none",borderRadius:"12px",padding:"10px 24px",color:"white",fontWeight:600,fontSize:"13px"}}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Settings
          </Button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>

        <BusinessInfoSection
          businessName={settings.business_name}
          logoUrl={settings.logo_url}
          logoFile={logoFile}
          phone={settings.business_phone}
          email={settings.business_email}
          address={settings.business_address}
          onBusinessNameChange={(v) =>
            setSettings(prev => ({ ...prev, business_name: v  }))
          }
          onLogoUrlChange={(v) => setSettings(prev => ({ ...prev, logo_url: v  }))}
          onLogoFileChange={setLogoFile}
          onPhoneChange={(v) => setSettings(prev => ({ ...prev, business_phone: v  }))}
          onEmailChange={(v) => setSettings(prev => ({ ...prev, business_email: v  }))}
          onAddressChange={(v) =>
            setSettings(prev => ({ ...prev, business_address: v  }))
          }
        />

        <OperatingHoursSection
          openTime={settings.open_time}
          closeTime={settings.close_time}
          currency={settings.currency}
          use24HourFormat={settings.use_24_hour_format}
          onOpenTimeChange={(v) => setSettings(prev => ({ ...prev, open_time: v  }))}
          onCloseTimeChange={(v) => setSettings(prev => ({ ...prev, close_time: v  }))}
          onCurrencyChange={(v) => setSettings(prev => ({ ...prev, currency: v  }))}
          onFormatChange={(v) =>
            setSettings(prev => ({ ...prev, use_24_hour_format: v  }))
          }
        />

        {/* Temporary Closures */}
        <TemporaryClosuresSection
          closedDates={settings.closed_dates || []}
          onClosedDatesChange={(dates) => setSettings(prev => ({ ...prev, closed_dates: dates }))}
        />

        {/* Loyalty Points Recalculation */}
        <SMSTestPanel />
        <RecalcLoyaltyButton />

        {/* Deposit + Loyalty business rules */}
        <BusinessRulesSection
          depositAmount={settings.deposit_amount ?? 50}
          loyaltyStampPerGhs={settings.loyalty_stamp_per_ghs ?? 100}
          loyaltyStampsForReward={settings.loyalty_stamps_for_reward ?? 20}
          loyaltyRewardDiscount={settings.loyalty_reward_discount ?? 50}
          onDepositChange={(v) => setSettings(prev => ({ ...prev, deposit_amount: v }))}
          onStampPerGhsChange={(v) => setSettings(prev => ({ ...prev, loyalty_stamp_per_ghs: v }))}
          onStampsForRewardChange={(v) => setSettings(prev => ({ ...prev, loyalty_stamps_for_reward: v }))}
          onRewardDiscountChange={(v) => setSettings(prev => ({ ...prev, loyalty_reward_discount: v }))}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DraggableListSection
            title="Staff Roles"
            items={settings.staff_roles}
            onItemsChange={(items) =>
              setSettings(prev => ({ ...prev, staff_roles: items  }))
            }
            addButtonText="Add Role"
          />

          <DraggableListSection
            title="Service Categories"
            items={settings.service_categories}
            onItemsChange={(items) =>
              setSettings(prev => ({ ...prev, service_categories: items  }))
            }
            addButtonText="Add Category"
          />
        </div>


        <PaymentMethodsSection
          paymentMethods={settings.payment_methods}
          onPaymentMethodToggle={handlePaymentMethodToggle}
        />

        <DataManagementSection />
        <GallerySettingsSection //@ts-ignore
          settingsId={settings.id!} //@ts-ignore
          images={settings.gallery_images || []} //@ts-ignore
          onSaved={(imgs) => { //@ts-ignore
            setSettings(prev => ({ ...prev, gallery_images: imgs  }));
            fetchSettings();
          }}
        />

        <ReviewsSettingsSection settingsId={settings.id} />
        <BackupRestoreSection settings={settings} onRestore={handleRestore} />
        </div>
      </div>
    </div>
  );
}
