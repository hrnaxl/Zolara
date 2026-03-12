import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ViewServices = () => {
  const [services, setServices] = useState<any[]>([]);
  const [variants, setVariants] = useState<Record<string, any[]>>({});
  const [addons, setAddons] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [svcRes, varRes, addRes] = await Promise.all([
          supabase.from("services").select("*").eq("is_active", true).order("category").order("name"),
          (supabase as any).from("service_variants").select("*").eq("is_active", true).order("sort_order"),
          (supabase as any).from("service_addons").select("*").eq("is_active", true).order("sort_order"),
        ]);
        if (svcRes.data) setServices(svcRes.data);
        if (varRes.data) {
          const vm: Record<string, any[]> = {};
          for (const v of varRes.data) { if (!vm[v.service_id]) vm[v.service_id] = []; vm[v.service_id].push(v); }
          setVariants(vm);
        }
        if (addRes.data) {
          const am: Record<string, any[]> = {};
          for (const a of addRes.data) { if (!am[a.service_id]) am[a.service_id] = []; am[a.service_id].push(a); }
          setAddons(am);
        }
      } catch { toast.error("Failed to load services"); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: "60px" }}>
      <div style={{ width: 32, height: 32, border: "3px solid #C8A97E", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const grouped: Record<string, any[]> = {};
  for (const s of services) {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(s);
  }

  const GOLD = "#C8A97E";
  const DARK = "#1C160E";

  return (
    <div style={{ padding: "24px 20px", maxWidth: 1100, margin: "0 auto", fontFamily: "'Montserrat', sans-serif" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 700, color: DARK, margin: 0 }}>Services</h1>
        <p style={{ fontSize: 12, color: "#A8A29E", margin: "4px 0 0" }}>All active Zolara services — view only</p>
      </div>

      {Object.entries(grouped).map(([cat, svcs]) => (
        <div key={cat} style={{ marginBottom: 36 }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 700, color: DARK, marginBottom: 14, paddingBottom: 8, borderBottom: `2px solid ${GOLD}`, display: "inline-block" }}>{cat}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {svcs.map(svc => {
              const svcVariants = variants[svc.id] || [];
              const svcAddons = addons[svc.id] || [];
              const prices = svcVariants.map(v => Number(v.price_adjustment));
              const priceLabel = svcVariants.length === 0
                ? (Number(svc.price) > 0 ? `GHS ${Number(svc.price).toLocaleString()}` : "—")
                : prices.length === 1 ? `GHS ${prices[0].toLocaleString()}`
                : `GHS ${Math.min(...prices).toLocaleString()} – ${Math.max(...prices).toLocaleString()}`;

              return (
                <div key={svc.id} style={{ background: "#fff", border: "1px solid #EDE8E0", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                  {/* Header */}
                  <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid #F5EFE6", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: DARK }}>{svc.name}</p>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#8B6914", whiteSpace: "nowrap", marginLeft: 8 }}>{priceLabel}</span>
                  </div>

                  {/* Variants */}
                  {svcVariants.length > 0 && (
                    <div style={{ padding: "10px 16px", borderBottom: svcAddons.length > 0 ? "1px solid #F5EFE6" : "none" }}>
                      <p style={{ margin: "0 0 8px", fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: GOLD, textTransform: "uppercase" }}>Sizes / Lengths</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {svcVariants.map(v => (
                          <span key={v.id} style={{ padding: "4px 10px", borderRadius: 20, background: "rgba(200,169,126,0.1)", border: "1px solid rgba(200,169,126,0.35)", fontSize: 11, fontWeight: 600, color: "#8B6914" }}>
                            {v.name} · GHS {Number(v.price_adjustment).toLocaleString()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add-ons */}
                  {svcAddons.length > 0 && (
                    <div style={{ padding: "10px 16px" }}>
                      <p style={{ margin: "0 0 8px", fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: "#7C3AED", textTransform: "uppercase" }}>Add-ons</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {svcAddons.map(a => (
                          <span key={a.id} style={{ padding: "4px 10px", borderRadius: 20, background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.25)", fontSize: 11, fontWeight: 600, color: "#7C3AED" }}>
                            {a.name} +GHS {Number(a.price).toLocaleString()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ViewServices;
