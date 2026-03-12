import { useEffect, useState } from "react";
import { useSettings } from "@/context/SettingsContext";
import { supabase } from "@/integrations/supabase/client";
import { Star, Gift, Award, Search, Plus, Minus, RefreshCw, Crown, Calendar, Phone } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const G = {
  gold: "#B8966E",
  goldLight: "#D4AF7A",
  goldDark: "#8B6A3E",
  cream: "#FAF7F2",
  champagne: "#F2EAD8",
  charcoal: "#1A1A1A",
  warmGrey: "#6B6057",
  border: "#E8DFD0",
  white: "#FFFFFF",
  success: "#10B981",
  danger: "#EF4444",
  mid: "#EDE3D5",
};

interface Client {
  id: string;
  name: string;
  phone: string;
  loyalty_points: number;
  loyalty_rewards_redeemed: number;
  birthday?: string;
  email?: string;
}

const STAMPS_PER_REWARD = 20;
// REWARD_DISCOUNT now comes from settings
const STAMP_EARN_RATE = 100; // GHS per stamp

export default function Loyalty() {
  const { settings } = useSettings();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Client | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [stampNote, setStampNote] = useState("");
  const [stampAmount, setStampAmount] = useState("");

  useEffect(() => { fetchClients(); }, []);

  const fetchClients = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("clients" as any)
      .select("id, name, phone, loyalty_points, loyalty_rewards_redeemed, birthday, email")
      .order("loyalty_points", { ascending: false });
    setClients((data as Client[]) || []);
    setLoading(false);
  };

  const filtered = clients.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  const isBirthdayMonth = (bday?: string) => {
    if (!bday) return false;
    const m = new Date(bday).getMonth();
    return m === new Date().getMonth();
  };

  const addStamp = async (client: Client, count: number) => {
    setIssuing(true);
    const amount = parseFloat(stampAmount) || 0;
    const stamps = amount > 0 ? Math.floor(amount / STAMP_EARN_RATE) : count;
    const bonus = isBirthdayMonth(client.birthday) ? stamps : 0;
    const total = stamps + bonus;

    const { error } = await supabase
      .from("clients" as any)
      .update({ loyalty_points: (client.loyalty_points || 0) + total })
      .eq("id", client.id);

    if (error) { toast.error("Failed to add stamps"); }
    else {
      toast.success(`+${total} stamp${total > 1 ? "s" : ""} added${bonus > 0 ? ` (incl. ${bonus} birthday bonus!)` : ""}`);
      fetchClients();
      setSelected(prev => prev ? { ...prev, loyalty_points: prev.loyalty_points + total } : null);
    }
    setIssuing(false);
    setStampAmount("");
  };

  const redeemReward = async (client: Client) => {
    if ((client.loyalty_points || 0) < STAMPS_PER_REWARD) {
      toast.error(`Need ${STAMPS_PER_REWARD} stamps to redeem. Client has ${client.loyalty_points || 0}.`);
      return;
    }
    setIssuing(true);
    const { error } = await supabase
      .from("clients" as any)
      .update({
        loyalty_points: (client.loyalty_points || 0) - STAMPS_PER_REWARD,
        loyalty_rewards_redeemed: (client.loyalty_rewards_redeemed || 0) + 1,
      })
      .eq("id", client.id);

    if (error) { toast.error("Failed to redeem"); }
    else {
      toast.success(`Reward redeemed! GHS ${REWARD_DISCOUNT} discount applied.`);
      fetchClients();
      setSelected(null);
      setRedeemOpen(false);
    }
    setIssuing(false);
  };

  const progress = (stamps: number) => Math.min((stamps % STAMPS_PER_REWARD) / STAMPS_PER_REWARD * 100, 100);
  const stampsToNext = (stamps: number) => STAMPS_PER_REWARD - (stamps % STAMPS_PER_REWARD);
  const tier = (stamps: number) => {
    const total = stamps + 0;
    if (total >= 50) return { name: "Diamond", color: "#60A5FA", icon: "💎" };
    if (total >= 30) return { name: "Gold", color: G.gold, icon: "👑" };
    if (total >= 15) return { name: "Silver", color: "#9CA3AF", icon: "⭐" };
    return { name: "Bronze", color: "#CD7F32", icon: "🌟" };
  };

  return (
    <div style={{ padding: "clamp(14px,3vw,24px)", maxWidth: 1200, margin: "0 auto", overflowY: "auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: `linear-gradient(135deg, ${G.gold}, ${G.goldLight})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Star size={20} color={G.charcoal} />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 600, color: G.charcoal, fontFamily: "Playfair Display, serif" }}>Loyalty Program</h1>
            <p style={{ fontSize: 13, color: G.warmGrey }}>{`1 stamp per GHS ${(settings as any)?.loyalty_stamp_per_ghs ?? 100} spent. ${(settings as any)?.loyalty_stamps_for_reward ?? 20} stamps = GHS ${(settings as any)?.loyalty_reward_discount ?? 50} discount`}</p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="admin-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Total Members", value: clients.length, icon: Award, color: G.gold },
          { label: "Active Stamps (Total)", value: clients.reduce((s, c) => s + (c.loyalty_points || 0), 0), icon: Star, color: "#10B981" },
          { label: "Rewards Redeemed", value: clients.reduce((s, c) => s + (c.loyalty_rewards_redeemed || 0), 0), icon: Gift, color: "#8B5CF6" },
          { label: "Birthday This Month", value: clients.filter(c => isBirthdayMonth(c.birthday)).length, icon: Crown, color: "#F59E0B" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{ padding: 20, background: G.white, border: `1px solid ${G.border}`, borderRadius: 12, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: color }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ fontSize: 11, color: G.warmGrey, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Jost, sans-serif", marginBottom: 8 }}>{label}</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: G.charcoal }}>{value}</p>
              </div>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={18} color={color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-grid-2" style={{ display: "grid", gridTemplateColumns: selected ? "1fr 360px" : "1fr", gap: 20 }}>
        {/* Client List */}
        <div style={{ background: G.white, border: `1px solid ${G.border}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${G.border}`, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: G.cream, border: `1px solid ${G.border}`, borderRadius: 8, padding: "8px 12px" }}>
              <Search size={14} color={G.warmGrey} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or phone..." style={{ flex: 1, border: "none", background: "transparent", fontSize: 13, color: G.charcoal, outline: "none" }} />
            </div>
            <button onClick={fetchClients} style={{ padding: "8px 10px", border: `1px solid ${G.border}`, borderRadius: 8, background: "transparent", cursor: "pointer" }}>
              <RefreshCw size={14} color={G.warmGrey} />
            </button>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: G.warmGrey, fontSize: 14 }}>Loading clients...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: G.warmGrey, fontSize: 14 }}>No clients found</div>
          ) : (
            <div style={{ overflowY: "visible" }}>
              {filtered.map(client => {
                const t = tier(client.loyalty_points || 0);
                const prog = progress(client.loyalty_points || 0);
                const isSelected = selected?.id === client.id;
                const bday = isBirthdayMonth(client.birthday);
                return (
                  <div key={client.id} onClick={() => setSelected(isSelected ? null : client)} style={{ padding: "14px 20px", borderBottom: `1px solid ${G.border}`, cursor: "pointer", background: isSelected ? `${G.gold}08` : "transparent", transition: "background 0.15s" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 40, height: 40, borderRadius: "50%", background: `linear-gradient(135deg, ${t.color}20, ${t.color}40)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{t.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <p style={{ fontSize: 14, fontWeight: 600, color: G.charcoal }}>{client.name}</p>
                          {bday && <span style={{ fontSize: 10, background: "#FEF3C7", color: "#92400E", padding: "1px 6px", borderRadius: 20, fontFamily: "Jost, sans-serif" }}>🎂 Birthday Month</span>}
                          <span style={{ fontSize: 10, color: t.color, background: `${t.color}15`, padding: "1px 8px", borderRadius: 20, fontFamily: "Jost, sans-serif", marginLeft: "auto" }}>{t.name}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ flex: 1, height: 4, background: G.border, borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ width: `${prog}%`, height: "100%", background: `linear-gradient(to right, ${G.gold}, ${G.goldLight})`, borderRadius: 2, transition: "width 0.3s" }} />
                          </div>
                          <span style={{ fontSize: 11, color: G.warmGrey, flexShrink: 0, fontFamily: "Jost, sans-serif" }}>{client.loyalty_points || 0} stamps</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Client Detail Panel */}
        {selected && (
          <div style={{ background: G.white, border: `1px solid ${G.border}`, borderRadius: 12, overflow: "hidden", height: "fit-content" }}>
            <div style={{ background: `linear-gradient(135deg, ${G.charcoal}, #2D2D2D)`, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: `linear-gradient(135deg, ${G.gold}, ${G.goldLight})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{tier(selected.loyalty_points || 0).icon}</div>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 600, color: G.white, fontFamily: "Playfair Display, serif" }}>{selected.name}</p>
                  <p style={{ fontSize: 12, color: "#9CA3AF", fontFamily: "Jost, sans-serif" }}>{selected.phone}</p>
                  <p style={{ fontSize: 11, color: tier(selected.loyalty_points || 0).color, fontFamily: "Jost, sans-serif", marginTop: 2 }}>{tier(selected.loyalty_points || 0).name} Member</p>
                </div>
              </div>

              <div className="admin-grid-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                {[
                  { label: "Stamps", value: selected.loyalty_points || 0 },
                  { label: "To Next Reward", value: stampsToNext(selected.loyalty_points || 0) },
                  { label: "Rewards Redeemed", value: selected.loyalty_rewards_redeemed || 0 },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 8, padding: "12px 10px", textAlign: "center" }}>
                    <p style={{ fontSize: 20, fontWeight: 700, color: G.goldLight }}>{value}</p>
                    <p style={{ fontSize: 10, color: "#9CA3AF", fontFamily: "Jost, sans-serif", marginTop: 2 }}>{label}</p>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "Jost, sans-serif" }}>Progress to next reward</span>
                  <span style={{ fontSize: 11, color: G.goldLight, fontFamily: "Jost, sans-serif" }}>{(selected.loyalty_points || 0) % STAMPS_PER_REWARD}/{STAMPS_PER_REWARD}</span>
                </div>
                <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${progress(selected.loyalty_points || 0)}%`, height: "100%", background: `linear-gradient(to right, ${G.gold}, ${G.goldLight})`, borderRadius: 3 }} />
                </div>
              </div>
            </div>

            <div style={{ padding: 20 }}>
              {isBirthdayMonth(selected.birthday) && (
                <div style={{ background: "#FEF3C720", border: "1px solid #F59E0B40", borderRadius: 8, padding: 12, marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 18 }}>🎂</span>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#92400E" }}>Birthday Month!</p>
                    <p style={{ fontSize: 11, color: "#92400E", fontFamily: "Jost, sans-serif" }}>Stamps earned this month are doubled.</p>
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: G.warmGrey, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Jost, sans-serif", display: "block", marginBottom: 6 }}>Add Stamps by Amount (GHS)</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={stampAmount} onChange={e => setStampAmount(e.target.value)} placeholder="e.g. 250 = 2 stamps" type="number" style={{ flex: 1, padding: "10px 12px", border: `1px solid ${G.border}`, borderRadius: 8, fontSize: 13, outline: "none", color: G.charcoal }} />
                  <button onClick={() => addStamp(selected, 0)} disabled={issuing || !stampAmount} style={{ padding: "10px 16px", background: `linear-gradient(135deg, ${G.gold}, ${G.goldLight})`, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, color: G.charcoal, opacity: !stampAmount ? 0.5 : 1, fontFamily: "Jost, sans-serif" }}>
                    {issuing ? "..." : "ADD"}
                  </button>
                </div>
                <p style={{ fontSize: 11, color: G.warmGrey, marginTop: 4, fontFamily: "Jost, sans-serif" }}>
                  {stampAmount ? `= ${Math.floor(parseFloat(stampAmount) / STAMP_EARN_RATE)} stamp${Math.floor(parseFloat(stampAmount)/STAMP_EARN_RATE) !== 1 ? "s" : ""}${isBirthdayMonth(selected.birthday) ? ` × 2 birthday bonus = ${Math.floor(parseFloat(stampAmount)/STAMP_EARN_RATE) * 2} total` : ""}` : `GHS ${STAMP_EARN_RATE} = 1 stamp. Birthday month = double stamps.`}
                </p>
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <button onClick={() => addStamp(selected, 1)} disabled={issuing} style={{ flex: 1, padding: "10px", border: `1px solid ${G.border}`, borderRadius: 8, cursor: "pointer", fontSize: 12, color: G.charcoal, background: G.cream, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "Jost, sans-serif" }}>
                  <Plus size={14} /> +1 Stamp
                </button>
                <button onClick={() => addStamp(selected, -1)} disabled={issuing || (selected.loyalty_points || 0) <= 0} style={{ flex: 1, padding: "10px", border: `1px solid ${G.border}`, borderRadius: 8, cursor: "pointer", fontSize: 12, color: G.warmGrey, background: G.cream, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "Jost, sans-serif", opacity: (selected.loyalty_points || 0) <= 0 ? 0.4 : 1 }}>
                  <Minus size={14} /> Remove 1
                </button>
              </div>

              <button
                onClick={() => redeemReward(selected)}
                disabled={issuing || (selected.loyalty_points || 0) < STAMPS_PER_REWARD}
                style={{ width: "100%", padding: "14px", background: (selected.loyalty_points || 0) >= STAMPS_PER_REWARD ? `linear-gradient(135deg, ${G.charcoal}, #2D2D2D)` : G.border, border: "none", borderRadius: 8, cursor: (selected.loyalty_points || 0) >= STAMPS_PER_REWARD ? "pointer" : "not-allowed", color: (selected.loyalty_points || 0) >= STAMPS_PER_REWARD ? G.white : G.warmGrey, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "Jost, sans-serif" }}>
                <Gift size={16} />
                {(selected.loyalty_points || 0) >= STAMPS_PER_REWARD
                  ? `Redeem Reward (GHS ${REWARD_DISCOUNT} discount)`
                  : `Need ${stampsToNext(selected.loyalty_points || 0)} more stamp${stampsToNext(selected.loyalty_points || 0) !== 1 ? "s" : ""} to redeem`}
              </button>

              <div style={{ marginTop: 16, padding: "12px 14px", background: `${G.gold}10`, border: `1px solid ${G.border}`, borderRadius: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: G.goldDark, marginBottom: 4, fontFamily: "Jost, sans-serif", letterSpacing: "0.08em" }}>HOW LOYALTY WORKS</p>
                <ul style={{ listStyle: "none", padding: 0 }}>
                  {["1 stamp per GHS 100 spent", "Birthday month = double stamps", "20 stamps = GHS 50 discount", `${selected.name} has redeemed ${selected.loyalty_rewards_redeemed || 0} reward${(selected.loyalty_rewards_redeemed || 0) !== 1 ? "s" : ""} total`].map(item => (
                    <li key={item} style={{ fontSize: 11, color: G.warmGrey, padding: "2px 0", fontFamily: "Jost, sans-serif", display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ width: 4, height: 4, borderRadius: "50%", background: G.gold, flexShrink: 0 }} />{item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
