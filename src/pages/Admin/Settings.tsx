import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/context/SettingsContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BusinessInfoSection } from "@/components/settings/BusinessInfoSection";
import { OperatingHoursSection } from "@/components/settings/OperatingHoursSection";
import { DraggableListSection } from "@/components/settings/DraggableListSection";
import { PaymentMethodsSection } from "@/components/settings/PaymentMethodsSection";
import { PermissionLevelsSection } from "@/components/settings/PermissionLevelsSection";
import { DataManagementSection } from "@/components/settings/DataManagementSection";
import { BackupRestoreSection } from "@/components/settings/BackupRestoreSection";
import { Loader2 } from "lucide-react";
import { GallerySettingsSection } from "@/components/settings/GalllerySection";
import { ReviewsSettingsSection } from "@/components/settings/ReviewsManagement";

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
};

export default function Settings() {
  const { settings: ctxSettings, setSettings: setCtxSettings } = useSettings();
  const [settings, setSettings] = useState<Settings>({ ...defaultSettings, ...ctxSettings });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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
        staff_roles: settings.staff_roles,
        service_categories: settings.service_categories,
        use_24_hour_format: settings.use_24_hour_format,
        gallery_images: (settings as any).gallery_images ?? [],
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
    <div className="z-page">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="z-title" style={{ fontFamily:"'Cormorant Garamond', serif" }}>Settings</h1>
          <Button onClick={updateSettings} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Settings
          </Button>
        </div>

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

        <PermissionLevelsSection />

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
  );
}
