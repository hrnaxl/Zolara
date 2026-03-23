import { useEffect, useState } from "react";
import { getAddons, createAddon, updateAddon, deleteAddon } from "@/lib/addons";
import { sanitizeText } from "@/lib/sanitize";
import { toast } from "sonner";



function priceLabel(a: any) {
  if (a.price_min != null && a.price_max != null && a.price_max > 0) {
    return `GHS ${Number(a.price_min).toLocaleString()} – ${Number(a.price_max).toLocaleString()}`;
  }
  return `GHS ${Number(a.price || 0).toLocaleString()}`;
}

export default function AddonsManagement() {
const GOLD = "#C8A97E", G_D = "#8B6914", G_L = "#FDF6E3";
const WHITE = "#FFFFFF", CREAM = "#FAFAF8", BORDER = "#EDEBE5";
const TXT = "#1C160E", TXT_S = "#A8A29E", TXT_M = "#57534E";
const CATEGORIES = ["general", "hair", "nails", "beauty", "lashes", "wigs"];
const EMPTY = { name: "", description: "", category: "general", is_range: false, price: "", price_min: "", price_max: "" };
  const [addons, setAddons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try { setAddons(await getAddons()); }
    catch { toast.error("Failed to load add-ons"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const f = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }

    let price = 0, price_min = null, price_max = null;

    if (form.is_range) {
      if (!form.price_min || !form.price_max) {
        toast.error("Enter both min and max price for the range");
        return;
      }
      price_min = parseFloat(form.price_min);
      price_max = parseFloat(form.price_max);
      if (isNaN(price_min) || isNaN(price_max) || price_min >= price_max) {
        toast.error("Min price must be less than max price");
        return;
      }
      price = price_min; // store min as the base price
    } else {
      if (!form.price) { toast.error("Price is required"); return; }
      price = parseFloat(form.price);
      if (isNaN(price) || price < 0) { toast.error("Enter a valid price"); return; }
    }

    setSaving(true);
    try {
      await createAddon({
        name: sanitizeText(form.name),
        description: sanitizeText(form.description),
        category: form.category,
        price,
        ...(price_min !== null ? { price_min, price_max } : { price_min: null, price_max: null }),
      } as any);
      toast.success("Add-on created");
      setForm({ ...EMPTY });
      setShowForm(false);
      load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  const inp: React.CSSProperties = {
    width: "100%", padding: "10px 14px",
    border: `1.5px solid ${BORDER}`, borderRadius: 10,
    fontSize: 13, color: TXT, outline: "none",
    background: WHITE, fontFamily: "'Montserrat',sans-serif",
  };
  const lbl: React.CSSProperties = {
    display: "block", fontSize: 10, fontWeight: 700,
    letterSpacing: "0.12em", color: TXT_S, marginBottom: 6,
    fontFamily: "'Montserrat',sans-serif", textTransform: "uppercase",
  };

  return (
    <div style={{ padding: "24px", maxWidth: 860, margin: "0 auto", fontFamily: "'Montserrat',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Montserrat:wght@400;500;600;700&display=swap');`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 600, color: TXT, margin: 0 }}>Service Add-ons</h1>
        <button onClick={() => { setShowForm(s => !s); setForm({ ...EMPTY }); }}
          style={{ padding: "9px 20px", background: `linear-gradient(135deg,${G_D},${GOLD})`, color: WHITE, border: "none", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer", letterSpacing: "0.06em" }}>
          + NEW ADD-ON
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background: WHITE, border: `1.5px solid ${GOLD}55`, borderRadius: 14, padding: 24, marginBottom: 24, boxShadow: `0 4px 20px rgba(200,169,126,0.12)` }}>
          <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: TXT, margin: "0 0 20px" }}>New Add-on</h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            {/* Name */}
            <div>
              <label style={lbl}>Name *</label>
              <input value={form.name} onChange={e => f("name", e.target.value)} placeholder="e.g. Beads, Butterfly Locs, Gel Top Coat" style={inp} />
            </div>

            {/* Category */}
            <div>
              <label style={lbl}>Category</label>
              <select value={form.category} onChange={e => f("category", e.target.value)}
                style={{ ...inp, cursor: "pointer" }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
          </div>

          {/* Price section */}
          <div style={{ background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "16px 18px", marginBottom: 14 }}>
            <label style={{ ...lbl, marginBottom: 12 }}>Pricing *</label>

            {/* Toggle */}
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <button onClick={() => f("is_range", false)}
                style={{ padding: "7px 16px", borderRadius: 8, border: `2px solid ${!form.is_range ? G_D : BORDER}`, background: !form.is_range ? G_L : WHITE, fontSize: 12, fontWeight: 700, cursor: "pointer", color: !form.is_range ? G_D : TXT_M, transition: "all 0.15s" }}>
                Fixed Price
              </button>
              <button onClick={() => f("is_range", true)}
                style={{ padding: "7px 16px", borderRadius: 8, border: `2px solid ${form.is_range ? G_D : BORDER}`, background: form.is_range ? G_L : WHITE, fontSize: 12, fontWeight: 700, cursor: "pointer", color: form.is_range ? G_D : TXT_M, transition: "all 0.15s" }}>
                Price Range
              </button>
            </div>

            {form.is_range ? (
              <div>
                <p style={{ fontSize: 11, color: TXT_S, marginBottom: 10 }}>Use a range when the price varies by type or complexity (e.g. Beads: GHS 50 – 200)</p>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ ...lbl, marginBottom: 4 }}>Min (GHS)</label>
                    <input type="number" min="0" value={form.price_min}
                      onChange={e => f("price_min", e.target.value)}
                      placeholder="e.g. 50" style={inp} />
                  </div>
                  <div style={{ paddingTop: 20, color: TXT_S, fontSize: 16, fontWeight: 700 }}>–</div>
                  <div style={{ flex: 1 }}>
                    <label style={{ ...lbl, marginBottom: 4 }}>Max (GHS)</label>
                    <input type="number" min="0" value={form.price_max}
                      onChange={e => f("price_max", e.target.value)}
                      placeholder="e.g. 200" style={inp} />
                  </div>
                </div>
                {form.price_min && form.price_max && Number(form.price_min) < Number(form.price_max) && (
                  <p style={{ fontSize: 12, color: G_D, fontWeight: 600, marginTop: 8 }}>
                    Will display as: GHS {form.price_min} – {form.price_max}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 11, color: TXT_S, marginBottom: 10 }}>Use a fixed price when the cost is always the same</p>
                <div style={{ maxWidth: 200 }}>
                  <label style={{ ...lbl, marginBottom: 4 }}>Price (GHS)</label>
                  <input type="number" min="0" value={form.price}
                    onChange={e => f("price", e.target.value)}
                    placeholder="e.g. 50" style={inp} />
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div style={{ marginBottom: 20 }}>
            <label style={lbl}>Description (optional)</label>
            <input value={form.description} onChange={e => f("description", e.target.value)}
              placeholder="Brief description shown to clients" style={inp} />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleSubmit} disabled={saving}
              style={{ padding: "10px 24px", background: `linear-gradient(135deg,${G_D},${GOLD})`, color: WHITE, border: "none", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Saving..." : "Save Add-on"}
            </button>
            <button onClick={() => setShowForm(false)}
              style={{ padding: "10px 18px", background: WHITE, color: TXT_M, border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <p style={{ textAlign: "center", color: TXT_S, padding: 40 }}>Loading...</p>
      ) : addons.length === 0 ? (
        <div style={{ textAlign: "center", background: WHITE, borderRadius: 14, border: `1px solid ${BORDER}`, padding: 48 }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>✦</p>
          <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, color: TXT, marginBottom: 6 }}>No add-ons yet</p>
          <p style={{ fontSize: 13, color: TXT_S }}>Create your first add-on above.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {addons.map(a => (
            <div key={a.id} style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "16px 18px", opacity: a.is_active ? 1 : 0.5 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: TXT, margin: "0 0 2px" }}>{a.name}</p>
                  <p style={{ fontSize: 10, color: TXT_S, margin: 0, letterSpacing: "0.1em", textTransform: "uppercase" }}>{a.category}</p>
                </div>
                <p style={{ fontSize: 14, fontWeight: 700, color: G_D, margin: 0, flexShrink: 0, marginLeft: 8 }}>{priceLabel(a)}</p>
              </div>
              {a.description && <p style={{ fontSize: 12, color: TXT_M, margin: "0 0 12px", lineHeight: 1.5 }}>{a.description}</p>}
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={async () => { await updateAddon(a.id, { is_active: !a.is_active }); load(); }}
                  style={{ flex: 1, padding: "5px 0", borderRadius: 8, border: `1px solid ${a.is_active ? "#BBF7D0" : BORDER}`, background: a.is_active ? "#F0FDF4" : CREAM, fontSize: 11, fontWeight: 600, cursor: "pointer", color: a.is_active ? "#15803D" : TXT_S }}>
                  {a.is_active ? "Active" : "Inactive"}
                </button>
                <button onClick={async () => { if (confirm(`Delete "${a.name}"?`)) { await deleteAddon(a.id); toast.success("Deleted"); load(); } }}
                  style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid #FECACA", background: WHITE, fontSize: 11, cursor: "pointer", color: "#DC2626" }}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
