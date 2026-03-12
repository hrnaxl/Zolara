import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/context/SettingsContext";
import { toast } from "sonner";
import { generatePhysicalBatch, GIFT_CARD_TIERS, GiftCardTier } from "@/lib/giftCardEcommerce";
import { voidGiftCard, expireGiftCard, deleteGiftCard, markGiftCardSold, resendGiftCardEmail } from "@/lib/useGiftCards";
import * as XLSX from "xlsx";

// ─── Design tokens ─────────────────────────────────────────────
const G      = "#C8A97E";
const G_D    = "#8B6914";
const CREAM  = "#F8F3EE";
const DARK   = "#1C160E";
const BORDER = "rgba(200,169,126,0.18)";
const SHADOW = "0 2px 12px rgba(0,0,0,0.06)";
const TXT    = "#1C160E";
const TXT_M  = "#6B5C45";
const TXT_S  = "#9C8878";
const WHITE  = "#FFFFFF";

const TIER_GRAD: Record<string, string> = {
  Silver:   "linear-gradient(135deg,#b0b0b0,#e8e8e8,#909090)",
  Gold:     "linear-gradient(135deg,#B8975A,#F5D98A,#8C6A30)",
  Platinum: "linear-gradient(135deg,#4B5563,#9CA3AF,#374151)",
  Diamond:  "linear-gradient(135deg,#312E81,#818CF8,#1E1B4B)",
  SLV:      "linear-gradient(135deg,#b0b0b0,#e8e8e8,#909090)",
  GLD:      "linear-gradient(135deg,#B8975A,#F5D98A,#8C6A30)",
  PLT:      "linear-gradient(135deg,#4B5563,#9CA3AF,#374151)",
  DMD:      "linear-gradient(135deg,#312E81,#818CF8,#1E1B4B)",
};

const TIER_ACCENT: Record<string, string> = {
  Silver: "#9CA3AF", SLV: "#9CA3AF",
  Gold: "#B8975A",   GLD: "#B8975A",
  Platinum: "#6B7280", PLT: "#6B7280",
  Diamond: "#6366F1", DMD: "#6366F1",
};

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  pending_payment: { bg: "#FEF9C3", color: "#854D0E", label: "Awaiting Payment" },
  pending_send:    { bg: "#DBEAFE", color: "#1D4ED8", label: "Sending Email…"   },
  active:          { bg: "#DCFCE7", color: "#166534", label: "Active"           },
  unused:          { bg: "#DCFCE7", color: "#166534", label: "Active"           },
  available:       { bg: "#DCFCE7", color: "#166534", label: "Available"        },
  redeemed:        { bg: "#F3F4F6", color: "#374151", label: "Redeemed"         },
  expired:         { bg: "#FEF3C7", color: "#92400E", label: "Expired"          },
  void:            { bg: "#FEE2E2", color: "#991B1B", label: "Void"             },
};

type Tab = "all" | "digital" | "physical";

export default function GiftCards() {
  const { userRole, roleReady } = useSettings();
  const isOwner = roleReady && userRole === "owner";

  // ─── State ───────────────────────────────────────────────────
  const [cards, setCards]           = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState<Tab>("all");
  const [statusFilter, setStatus]   = useState("all");
  const [search, setSearch]         = useState("");
  const [expanded, setExpanded]     = useState<string | null>(null);

  // Physical batch generator
  const [genOpen, setGenOpen]       = useState(false);
  const [genTier, setGenTier]       = useState<GiftCardTier>("Gold");
  const [genQty, setGenQty]         = useState(10);
  const [genBatch, setGenBatch]     = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [newBatch, setNewBatch]     = useState<any[]>([]);

  // Confirm actions
  const [confirmCard, setConfirmCard] = useState<any>(null);
  const [confirmAct, setConfirmAct]   = useState<"void"|"expire"|"delete"|"sold"|"resend"|null>(null);
  const [actLoading, setActLoading]   = useState(false);

  // ─── Fetch ───────────────────────────────────────────────────
  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("gift_cards")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      setCards(data || []);
    } catch (e: any) {
      toast.error("Failed to load gift cards");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ─── Helpers ─────────────────────────────────────────────────
  const getCode  = (c: any) => c.code || c.final_code || "—";
  const getValue = (c: any) => Number(c.amount || c.card_value || c.balance || 0);
  const getExp   = (c: any) => c.expires_at || c.expire_at;
  const isDigit  = (c: any) => c.card_type === "digital" || c.delivery_type === "email" || (!c.card_type && !c.is_admin_generated);
  const isPhys   = (c: any) => c.card_type === "physical" || c.delivery_type === "physical" || c.is_admin_generated;

  // ─── Stats ───────────────────────────────────────────────────
  const totalActive    = cards.filter(c => ["active","unused","available"].includes(c.status)).length;
  const totalPendingEmail = cards.filter(c => c.status === "pending_send").length;
  const thisMonth      = cards.filter(c => {
    const d = new Date(c.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && ["active","unused","available","redeemed"].includes(c.status) && c.payment_status === "paid";
  });
  const monthRevenue   = thisMonth.reduce((s, c) => s + getValue(c), 0);
  const totalRedeemed  = cards.filter(c => c.status === "redeemed").length;

  // ─── Filter ──────────────────────────────────────────────────
  const filtered = cards.filter(c => {
    if (tab === "digital" && !isDigit(c)) return false;
    if (tab === "physical" && !isPhys(c)) return false;
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (getCode(c) || "").toLowerCase().includes(q) ||
        (c.buyer_name || "").toLowerCase().includes(q) ||
        (c.recipient_name || "").toLowerCase().includes(q) ||
        (c.recipient_email || "").toLowerCase().includes(q) ||
        (c.serial_number || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  // ─── Actions ─────────────────────────────────────────────────
  const doAction = async () => {
    if (!confirmCard || !confirmAct) return;
    setActLoading(true);
    try {
      if (confirmAct === "void") {
        const res = await voidGiftCard(confirmCard.id);
        if (res.error) throw res.error;
        toast.success("Card voided");
      } else if (confirmAct === "expire") {
        const res = await expireGiftCard(confirmCard.id);
        if (res.error) throw res.error;
        toast.success("Card marked expired");
      } else if (confirmAct === "delete") {
        const res = await deleteGiftCard(confirmCard.id);
        if (res.error) throw res.error;
        toast.success("Card deleted");
      } else if (confirmAct === "sold") {
        const res = await markGiftCardSold(confirmCard.id);
        if (res.error) throw res.error;
        toast.success("Card marked as sold/issued");
      } else if (confirmAct === "resend") {
        const res = await resendGiftCardEmail(confirmCard.id);
        if (res.error) throw res.error;
        toast.success("Email re-queued — will send within 5 minutes");
      }
      setConfirmCard(null); setConfirmAct(null);
      await load();
    } catch (e: any) {
      toast.error(e.message || "Action failed");
    } finally {
      setActLoading(false);
    }
  };

  // ─── Generate Physical Batch ─────────────────────────────────
  const handleGenerate = async () => {
    if (!genBatch.trim()) { toast.error("Enter a batch ID"); return; }
    if (genQty < 1 || genQty > 200) { toast.error("Quantity must be 1–200"); return; }
    setGenLoading(true);
    try {
      const { cards: generated, error } = await generatePhysicalBatch({
        tier: genTier,
        quantity: genQty,
        batchId: genBatch.trim().toUpperCase(),
        adminUserId: "admin",
      });
      if (error) throw new Error(error);
      setNewBatch(generated);
      toast.success(`${generated.length} physical cards generated`);
      await load();
    } catch (e: any) {
      toast.error(e.message || "Generation failed");
    } finally {
      setGenLoading(false);
    }
  };

  const exportBatch = () => {
    const rows = newBatch.map(c => ({
      "Serial Number": c.serial_number,
      "Code": c.code || c.final_code,
      "Tier": c.tier,
      "Value (GHS)": getValue(c),
      "Batch": c.batch_id,
      "Status": c.status,
      "Expires": getExp(c) ? new Date(getExp(c)).toLocaleDateString() : "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Physical Cards");
    XLSX.writeFile(wb, `zolara_physical_${genBatch}_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    toast.success("Code copied");
  };

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: CREAM, fontFamily: "'Montserrat', sans-serif", padding: "28px 24px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap');
        .gc-card { background:${WHITE}; border:1px solid ${BORDER}; border-radius:14px; padding:18px 20px; transition:box-shadow 0.2s; }
        .gc-card:hover { box-shadow:0 6px 24px rgba(0,0,0,0.08); }
        .gc-tab { padding:8px 20px; border-radius:24px; cursor:pointer; font-size:11px; font-weight:600; letter-spacing:0.1em; transition:all 0.15s; border:none; }
        .gc-tab.active { background:${DARK}; color:${WHITE}; }
        .gc-tab.inactive { background:transparent; color:${TXT_M}; }
        .gc-tab.inactive:hover { background:rgba(200,169,126,0.12); color:${TXT}; }
        .gc-btn { padding:9px 18px; border-radius:8px; font-size:11px; font-weight:600; letter-spacing:0.08em; cursor:pointer; border:none; transition:all 0.15s; }
        .gc-btn-gold { background:${DARK}; color:${WHITE}; }
        .gc-btn-gold:hover { background:#2C2416; }
        .gc-btn-outline { background:transparent; color:${TXT_M}; border:1px solid ${BORDER}; }
        .gc-btn-outline:hover { border-color:${G}; color:${TXT}; }
        .gc-btn-danger { background:#FEE2E2; color:#991B1B; }
        .gc-btn-danger:hover { background:#FECACA; }
        .gc-input { border:1px solid ${BORDER}; border-radius:8px; padding:9px 12px; font-size:12px; width:100%; background:${WHITE}; color:${TXT}; outline:none; font-family:'Montserrat',sans-serif; }
        .gc-input:focus { border-color:${G}; }
        select.gc-input option { background:${WHITE}; }
        .gc-tier-badge { padding:3px 9px; border-radius:12px; font-size:9px; font-weight:700; letter-spacing:0.12em; color:${WHITE}; }
        .gc-status-badge { padding:3px 9px; border-radius:12px; font-size:9px; font-weight:600; letter-spacing:0.06em; }
        .overlay { position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:1000; display:flex; align-items:center; justify-content:center; }
        .modal { background:${WHITE}; border-radius:20px; padding:32px; width:min(560px,94vw); max-height:90vh; overflow-y:auto; }
      `}</style>

      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"24px", flexWrap:"wrap", gap:"12px" }}>
        <div>
          <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(26px,3vw,34px)", fontWeight:600, color:TXT, margin:0 }}>Gift Cards</h1>
          <p style={{ fontSize:"11px", color:TXT_S, letterSpacing:"0.1em", marginTop:"4px" }}>DIGITAL & PHYSICAL CARD MANAGEMENT</p>
        </div>
        <div style={{ display:"flex", gap:"10px", alignItems:"center" }}>
          <button className="gc-btn gc-btn-outline" onClick={load} disabled={loading}>
            {loading ? "↻" : "↻"} Refresh
          </button>
          {isOwner && (
            <button className="gc-btn gc-btn-gold" onClick={() => { setNewBatch([]); setGenOpen(true); }}>
              + New Physical Batch
            </button>
          )}
        </div>
      </div>

      {/* ── Stats row ───────────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"12px", marginBottom:"24px" }}>
        {[
          { label:"ACTIVE CARDS", val: totalActive, sub:"Ready to use", icon:"🎁" },
          { label:"SOLD THIS MONTH", val:`GHS ${monthRevenue.toLocaleString("en",{minimumFractionDigits:0})}`, sub:`${thisMonth.length} cards`, icon:"💳" },
          { label:"REDEEMED ALL TIME", val: totalRedeemed, sub:"Fully used", icon:"✓" },
          { label:"PENDING EMAIL", val: totalPendingEmail, sub: totalPendingEmail > 0 ? "Will send within 5 min" : "All sent", icon:"📧" },
        ].map((s, i) => (
          <div key={i} className="gc-card" style={{ padding:"20px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"10px" }}>
              <span style={{ fontSize:"9px", fontWeight:700, letterSpacing:"0.15em", color:TXT_S }}>{s.label}</span>
              <span style={{ fontSize:"18px" }}>{s.icon}</span>
            </div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"28px", fontWeight:600, color:TXT, lineHeight:1 }}>{s.val}</div>
            <div style={{ fontSize:"10px", color: i === 3 && totalPendingEmail > 0 ? "#1D4ED8" : TXT_S, marginTop:"6px" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Tab + Filters ───────────────────────────────────── */}
      <div className="gc-card" style={{ marginBottom:"16px", padding:"16px 20px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"24px", flexWrap:"wrap" }}>
          {/* Tabs */}
          <div style={{ display:"flex", gap:"4px", padding:"4px", background:"#F3EDE4", borderRadius:"28px" }}>
            {(["all","digital","physical"] as Tab[]).map(t => (
              <button key={t} className={`gc-tab ${tab===t?"active":"inactive"}`} onClick={() => setTab(t)}>
                {t === "all" ? "All Cards" : t === "digital" ? "📧 Digital" : "🃏 Physical"}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <select className="gc-input" style={{ width:"160px" }} value={statusFilter} onChange={e => setStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="unused">Unused</option>
            <option value="available">Available</option>
            <option value="pending_send">Pending Email</option>
            <option value="pending_payment">Awaiting Payment</option>
            <option value="redeemed">Redeemed</option>
            <option value="expired">Expired</option>
            <option value="void">Void</option>
          </select>

          {/* Search */}
          <div style={{ position:"relative", flex:1, minWidth:"200px" }}>
            <span style={{ position:"absolute", left:"11px", top:"50%", transform:"translateY(-50%)", color:TXT_S, fontSize:"13px" }}>🔍</span>
            <input className="gc-input" style={{ paddingLeft:"32px" }} placeholder="Search code, buyer, recipient…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <span style={{ fontSize:"11px", color:TXT_S, whiteSpace:"nowrap" }}>{filtered.length} card{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* ── Card List ───────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign:"center", padding:"60px", color:TXT_S }}>Loading gift cards…</div>
      ) : filtered.length === 0 ? (
        <div className="gc-card" style={{ textAlign:"center", padding:"60px 24px" }}>
          <div style={{ fontSize:"40px", marginBottom:"12px" }}>🎁</div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"22px", color:TXT, marginBottom:"6px" }}>No cards found</div>
          <div style={{ fontSize:"12px", color:TXT_S }}>Try adjusting your filters or generate a physical batch</div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
          {filtered.map(card => {
            const code     = getCode(card);
            const value    = getValue(card);
            const tier     = card.tier || "Gold";
            const status   = card.status || "active";
            const ss       = STATUS_STYLE[status] || { bg:"#F3F4F6", color:"#374151", label: status };
            const exp      = getExp(card);
            const isExpanded = expanded === card.id;
            const digital  = isDigit(card);

            return (
              <div key={card.id} className="gc-card" style={{ padding:0, overflow:"hidden" }}>
                {/* Tier accent strip */}
                <div style={{ height:"3px", background: TIER_GRAD[tier] || TIER_GRAD.Gold }} />

                <div style={{ padding:"16px 20px" }}>
                  <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"12px", flexWrap:"wrap" }}>
                    {/* Left: code + badges */}
                    <div style={{ flex:1, minWidth:"200px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap", marginBottom:"6px" }}>
                        <span style={{ fontFamily:"monospace", fontSize:"15px", fontWeight:700, color:TXT, letterSpacing:"0.05em" }}>{code}</span>
                        <button onClick={() => copyCode(code)} style={{ fontSize:"10px", padding:"2px 7px", borderRadius:"6px", border:`1px solid ${BORDER}`, background:"#F8F3EE", color:TXT_S, cursor:"pointer" }}>
                          Copy
                        </button>
                        {/* Tier badge */}
                        <span className="gc-tier-badge" style={{ background: TIER_ACCENT[tier] || G }}>{tier}</span>
                        {/* Status badge */}
                        <span className="gc-status-badge" style={{ background:ss.bg, color:ss.color }}>{ss.label}</span>
                        {/* Type badge */}
                        <span style={{ fontSize:"9px", color:TXT_S, letterSpacing:"0.08em" }}>{digital ? "📧 Digital" : "🃏 Physical"}</span>
                      </div>

                      <div style={{ display:"flex", alignItems:"center", gap:"16px", flexWrap:"wrap" }}>
                        <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"22px", fontWeight:600, color:TXT }}>GHS {value.toLocaleString()}</span>
                        {exp && <span style={{ fontSize:"10px", color: new Date(exp) < new Date() ? "#991B1B" : TXT_S }}>Expires {new Date(exp).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}</span>}
                        {card.serial_number && <span style={{ fontSize:"10px", color:TXT_S, fontFamily:"monospace" }}>S/N: {card.serial_number}</span>}
                        {card.batch_id && <span style={{ fontSize:"10px", color:TXT_S }}>Batch: {card.batch_id}</span>}
                      </div>

                      {/* Digital: buyer → recipient */}
                      {digital && (card.buyer_name || card.recipient_name) && (
                        <div style={{ marginTop:"6px", fontSize:"11px", color:TXT_M }}>
                          {card.buyer_name && <span>From: <strong>{card.buyer_name}</strong></span>}
                          {card.recipient_name && <span style={{ marginLeft:"12px" }}>To: <strong>{card.recipient_name}</strong>{card.recipient_email ? ` (${card.recipient_email})` : ""}</span>}
                        </div>
                      )}
                    </div>

                    {/* Right: actions */}
                    <div style={{ display:"flex", gap:"6px", alignItems:"center", flexShrink:0 }}>
                      {/* Resend email — only for digital pending_send or active with recipient_email */}
                      {isOwner && digital && (status === "pending_send" || (status !== "redeemed" && status !== "void" && card.recipient_email)) && (
                        <button className="gc-btn" style={{ background:"#DBEAFE", color:"#1D4ED8", fontSize:"10px", padding:"6px 12px" }}
                          onClick={() => { setConfirmCard(card); setConfirmAct("resend"); }}>
                          {status === "pending_send" ? "📧 Resend" : "📧 Resend Code"}
                        </button>
                      )}
                      {/* Mark as sold — physical available cards */}
                      {isOwner && !digital && status === "available" && (
                        <button className="gc-btn" style={{ background:"#DCFCE7", color:"#166534", fontSize:"10px", padding:"6px 12px" }}
                          onClick={() => { setConfirmCard(card); setConfirmAct("sold"); }}>
                          ✓ Mark Sold
                        </button>
                      )}
                      {/* Expand */}
                      <button className="gc-btn gc-btn-outline" style={{ padding:"6px 10px", fontSize:"12px" }}
                        onClick={() => setExpanded(isExpanded ? null : card.id)}>
                        {isExpanded ? "▲" : "▼"}
                      </button>
                      {/* Void / Expire / Delete */}
                      {isOwner && status !== "void" && status !== "redeemed" && (
                        <button className="gc-btn gc-btn-danger" style={{ padding:"6px 12px", fontSize:"10px" }}
                          onClick={() => { setConfirmCard(card); setConfirmAct("void"); }}>
                          Void
                        </button>
                      )}
                      {isOwner && (
                        <button className="gc-btn" style={{ background:"#FEE2E2", color:"#991B1B", padding:"6px 10px", fontSize:"12px" }}
                          onClick={() => { setConfirmCard(card); setConfirmAct("delete"); }}>
                          🗑
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div style={{ marginTop:"14px", paddingTop:"14px", borderTop:`1px solid ${BORDER}` }}>
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:"10px" }}>
                        {[
                          { l:"Card ID",       v:card.id?.slice(0,8)+"…" },
                          { l:"Card Type",     v:card.card_type || (digital?"digital":"physical") },
                          { l:"Payment Status",v:card.payment_status || "—" },
                          { l:"Payment Ref",   v:card.payment_ref || "—" },
                          { l:"Created",       v:card.created_at ? new Date(card.created_at).toLocaleDateString("en-GB") : "—" },
                          { l:"Redeemed At",   v:card.redeemed_at ? new Date(card.redeemed_at).toLocaleDateString("en-GB") : "—" },
                          { l:"Redeemed By",   v:card.redeemed_by_client || "—" },
                          { l:"Message",       v:card.message || "—" },
                          { l:"Buyer Phone",   v:card.buyer_phone || "—" },
                        ].map(f => (
                          <div key={f.l}>
                            <div style={{ fontSize:"9px", fontWeight:700, letterSpacing:"0.1em", color:TXT_S, marginBottom:"2px" }}>{f.l}</div>
                            <div style={{ fontSize:"11px", color:TXT, wordBreak:"break-all" }}>{f.v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Generate Physical Batch Modal ───────────────────── */}
      {genOpen && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) { setGenOpen(false); setNewBatch([]); }}}>
          <div className="modal">
            <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"26px", fontWeight:600, color:TXT, margin:"0 0 6px" }}>Generate Physical Cards</h2>
            <p style={{ fontSize:"11px", color:TXT_S, marginBottom:"24px", letterSpacing:"0.06em" }}>Cards are saved to the database as "Available" and can be handed to clients in person.</p>

            {newBatch.length > 0 ? (
              <>
                <div style={{ background:"#DCFCE7", borderRadius:"10px", padding:"14px 18px", marginBottom:"20px", display:"flex", alignItems:"center", gap:"10px" }}>
                  <span style={{ fontSize:"22px" }}>✓</span>
                  <div>
                    <div style={{ fontSize:"13px", fontWeight:700, color:"#166534" }}>{newBatch.length} cards generated successfully</div>
                    <div style={{ fontSize:"11px", color:"#166534" }}>Batch {genBatch} · {genTier} · GHS {GIFT_CARD_TIERS[genTier].value} each</div>
                  </div>
                </div>
                <div style={{ border:`1px solid ${BORDER}`, borderRadius:"10px", overflow:"hidden", marginBottom:"20px" }}>
                  <div style={{ padding:"10px 16px", background:"#F8F3EE", fontSize:"10px", fontWeight:700, letterSpacing:"0.1em", color:TXT_S }}>GENERATED CARDS</div>
                  <div style={{ maxHeight:"220px", overflowY:"auto" }}>
                    {newBatch.map((c, i) => (
                      <div key={i} style={{ padding:"10px 16px", borderTop: i > 0 ? `1px solid ${BORDER}` : "none", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <span style={{ fontFamily:"monospace", fontSize:"12px", color:TXT }}>{c.code || c.final_code}</span>
                        <span style={{ fontSize:"10px", color:TXT_S }}>{c.serial_number}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display:"flex", gap:"10px" }}>
                  <button className="gc-btn gc-btn-gold" style={{ flex:1 }} onClick={exportBatch}>📥 Download as Excel</button>
                  <button className="gc-btn gc-btn-outline" onClick={() => { setGenOpen(false); setNewBatch([]); }}>Close</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px", marginBottom:"20px" }}>
                  <div>
                    <label style={{ fontSize:"10px", fontWeight:600, letterSpacing:"0.1em", color:TXT_S, display:"block", marginBottom:"6px" }}>TIER</label>
                    <select className="gc-input" value={genTier} onChange={e => setGenTier(e.target.value as GiftCardTier)}>
                      {Object.entries(GIFT_CARD_TIERS).map(([k, v]) => (
                        <option key={k} value={k}>{v.label} — GHS {v.value}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize:"10px", fontWeight:600, letterSpacing:"0.1em", color:TXT_S, display:"block", marginBottom:"6px" }}>QUANTITY</label>
                    <input className="gc-input" type="number" min={1} max={200} value={genQty} onChange={e => setGenQty(Number(e.target.value))} />
                  </div>
                  <div style={{ gridColumn:"1/-1" }}>
                    <label style={{ fontSize:"10px", fontWeight:600, letterSpacing:"0.1em", color:TXT_S, display:"block", marginBottom:"6px" }}>BATCH ID</label>
                    <input className="gc-input" placeholder="e.g. MARCH-2026-01" value={genBatch} onChange={e => setGenBatch(e.target.value)} />
                    <div style={{ fontSize:"10px", color:TXT_S, marginTop:"4px" }}>Use a unique ID to group this set of cards for tracking.</div>
                  </div>
                </div>

                {/* Preview */}
                <div style={{ background:"#F8F3EE", borderRadius:"10px", padding:"14px 18px", marginBottom:"20px" }}>
                  <div style={{ fontSize:"10px", fontWeight:700, letterSpacing:"0.1em", color:TXT_S, marginBottom:"8px" }}>SUMMARY</div>
                  <div style={{ display:"flex", gap:"24px", flexWrap:"wrap" }}>
                    {[
                      { l:"Tier",     v: GIFT_CARD_TIERS[genTier]?.label || genTier },
                      { l:"Qty",      v: genQty },
                      { l:"Value ea", v:`GHS ${GIFT_CARD_TIERS[genTier]?.value || "?"}` },
                      { l:"Total",    v:`GHS ${((GIFT_CARD_TIERS[genTier]?.value||0)*genQty).toLocaleString()}` },
                    ].map(f => (
                      <div key={f.l}>
                        <div style={{ fontSize:"9px", color:TXT_S }}>{f.l}</div>
                        <div style={{ fontSize:"15px", fontWeight:600, color:TXT, fontFamily:"'Cormorant Garamond',serif" }}>{f.v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display:"flex", gap:"10px" }}>
                  <button className="gc-btn gc-btn-gold" style={{ flex:1 }} onClick={handleGenerate} disabled={genLoading}>
                    {genLoading ? "Generating…" : `Generate ${genQty} Cards`}
                  </button>
                  <button className="gc-btn gc-btn-outline" onClick={() => setGenOpen(false)}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Confirm Action Modal ─────────────────────────────── */}
      {confirmCard && confirmAct && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) { setConfirmCard(null); setConfirmAct(null); }}}>
          <div className="modal" style={{ maxWidth:"400px" }}>
            <div style={{ fontSize:"36px", textAlign:"center", marginBottom:"12px" }}>
              {confirmAct === "void" ? "⛔" : confirmAct === "delete" ? "🗑️" : confirmAct === "sold" ? "✅" : confirmAct === "resend" ? "📧" : "⏰"}
            </div>
            <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"22px", textAlign:"center", color:TXT, marginBottom:"8px" }}>
              {confirmAct === "void"   && "Void this card?"}
              {confirmAct === "delete" && "Delete this card?"}
              {confirmAct === "sold"   && "Mark as issued?"}
              {confirmAct === "resend" && "Resend email?"}
              {confirmAct === "expire" && "Mark as expired?"}
            </h3>
            <p style={{ fontSize:"12px", color:TXT_M, textAlign:"center", marginBottom:"24px", lineHeight:1.6 }}>
              {confirmAct === "void"   && `${getCode(confirmCard)} will be permanently voided and cannot be used.`}
              {confirmAct === "delete" && `${getCode(confirmCard)} will be permanently deleted. This cannot be undone.`}
              {confirmAct === "sold"   && `${getCode(confirmCard)} will be marked as sold/issued and set to Active. Do this when you physically hand the card to a client.`}
              {confirmAct === "resend" && `The gift card code will be re-emailed to ${confirmCard.recipient_email || "the recipient"}. This will happen within 5 minutes.`}
              {confirmAct === "expire" && `${getCode(confirmCard)} will be marked as expired.`}
            </p>
            <div style={{ display:"flex", gap:"10px" }}>
              <button className="gc-btn gc-btn-outline" style={{ flex:1 }} onClick={() => { setConfirmCard(null); setConfirmAct(null); }}>Cancel</button>
              <button
                className={`gc-btn ${confirmAct === "delete" || confirmAct === "void" ? "gc-btn-danger" : "gc-btn-gold"}`}
                style={{ flex:1 }}
                onClick={() => void doAction()}
                disabled={actLoading}
              >
                {actLoading ? "…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
