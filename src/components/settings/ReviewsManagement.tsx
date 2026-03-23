import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Star } from "lucide-react";


interface Review { id: string; name: string; rating: number; comment: string; visible: boolean; created_at?: string; }

export function ReviewsSettingsSection({ settingsId }: { settingsId?: string }) {
  const G = "#C8A97E", G_D = "#8B6914", WHITE = "#FFFFFF", CREAM = "#FAFAF8"; const BORDER = "#EDEBE5", TXT = "#1C160E", TXT_MID = "#78716C", TXT_SOFT = "#A8A29E"; const GOLD = "#C8A97E", GOLD_DARK = "#8B6914", GOLD_LIGHT = "#FDF6E3";
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newReview, setNewReview] = useState({ name: "", rating: 5, comment: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchReviews(); }, []);

  const fetchReviews = async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("reviews").select("*").order("created_at", { ascending: false });
    setReviews(data || []);
    setLoading(false);
  };

  const toggleVisible = async (id: string, visible: boolean) => {
    const { error } = await (supabase as any).from("reviews").update({ visible }).eq("id", id);
    if (error) { toast.error("Failed to update"); return; }
    setReviews(prev => prev.map(r => r.id === id ? { ...r, visible } : r));
    toast.success(visible ? "Review visible on landing page" : "Review hidden");
  };

  const deleteReview = async (id: string) => {
    if (!confirm("Delete this review?")) return;
    const { error } = await (supabase as any).from("reviews").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    setReviews(prev => prev.filter(r => r.id !== id));
    toast.success("Review deleted");
  };

  const addReview = async () => {
    if (!newReview.name.trim() || !newReview.comment.trim()) { toast.error("Name and comment are required"); return; }
    setSaving(true);
    const { data, error } = await (supabase as any).from("reviews").insert({
      name: newReview.name.trim(),
      rating: newReview.rating,
      comment: newReview.comment.trim(),
      visible: true,
    }).select().single();
    if (error) { toast.error("Failed to add review"); setSaving(false); return; }
    setReviews(prev => [data, ...prev]);
    setNewReview({ name: "", rating: 5, comment: "" });
    setAdding(false);
    setSaving(false);
    toast.success("Review added and visible on landing page");
  };

  const visibleCount = reviews.filter(r => r.visible).length;

  return (
    <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04),0 4px 20px rgba(0,0,0,0.06)" }}>
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}`, background: "linear-gradient(135deg,rgba(200,169,126,0.08),rgba(200,169,126,0.02))", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 700, color: TXT, margin: "0 0 2px" }}>Manage Reviews</h2>
          <p style={{ fontSize: 11, color: TXT_SOFT, margin: 0 }}>{visibleCount} of {reviews.length} showing on landing page</p>
        </div>
        <button onClick={() => setAdding(!adding)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, background: adding ? "#FEF2F2" : `linear-gradient(135deg,${G},${G_D})`, color: adding ? "#DC2626" : WHITE, border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          <Plus size={14} /> {adding ? "Cancel" : "Add Review"}
        </button>
      </div>

      {/* Add review form */}
      {adding && (
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}`, background: "#FFFDF9", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "end" }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: TXT_SOFT, letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Client Name</label>
              <input style={inp} placeholder="e.g. Abena K." value={newReview.name} onChange={e => setNewReview(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: TXT_SOFT, letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Rating</label>
              <div style={{ display: "flex", gap: 4 }}>
                {[1,2,3,4,5].map(s => (
                  <button key={s} type="button" onClick={() => setNewReview(p => ({ ...p, rating: s }))}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: s <= newReview.rating ? "#F59E0B" : BORDER, padding: 2 }}>★</button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: TXT_SOFT, letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Review</label>
            <textarea style={{ ...inp, resize: "vertical", minHeight: 80 } as any} placeholder="What the client said..." value={newReview.comment} onChange={e => setNewReview(p => ({ ...p, comment: e.target.value }))} />
          </div>
          <button onClick={addReview} disabled={saving} style={{ alignSelf: "flex-end", padding: "9px 24px", borderRadius: 10, background: saving ? BORDER : `linear-gradient(135deg,${G},${G_D})`, color: WHITE, border: "none", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Saving…" : "Add to Landing Page"}
          </button>
        </div>
      )}

      {/* Reviews list */}
      <div style={{ padding: "12px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
        {loading && <p style={{ fontSize: 13, color: TXT_SOFT, textAlign: "center", padding: 20 }}>Loading…</p>}
        {!loading && reviews.length === 0 && (
          <p style={{ fontSize: 13, color: TXT_SOFT, textAlign: "center", padding: 24 }}>No reviews yet. Add your first one above.</p>
        )}
        {reviews.map(r => (
          <div key={r.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", borderRadius: 12, background: r.visible ? "#FFFDF9" : "#FAFAF8", border: `1px solid ${r.visible ? "#F0E4CC" : BORDER}` }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: TXT, margin: 0 }}>{r.name}</p>
                <div style={{ display: "flex", gap: 2 }}>
                  {[1,2,3,4,5].map(s => <span key={s} style={{ fontSize: 13, color: s <= r.rating ? "#F59E0B" : BORDER }}>★</span>)}
                </div>
              </div>
              <p style={{ fontSize: 12, color: "#78716C", margin: 0, lineHeight: 1.5 }}>"{r.comment}"</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <Switch checked={r.visible} onCheckedChange={checked => toggleVisible(r.id, checked)} />
                <span style={{ fontSize: 9, color: TXT_SOFT, letterSpacing: "0.05em" }}>{r.visible ? "VISIBLE" : "HIDDEN"}</span>
              </div>
              <button onClick={() => deleteReview(r.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#DC2626", opacity: 0.6, padding: 4 }}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
