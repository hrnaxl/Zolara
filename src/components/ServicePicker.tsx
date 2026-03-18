import { useState } from "react";

interface Props {
  services: any[];
  allVariantsMap: Record<string,any[]>;
  svcVariantsMap: Record<string,any[]>;
  svcAddonsMap: Record<string,any[]>;
  svcVariantSel: Record<string,string>;
  svcAddonsSel: Record<string,string[]>;
  svcLoading: Record<string,boolean>;
  expandedSvc: string | null;
  serviceIds: string[];
  onToggle: (svcId: string) => void;
  onExpandToggle: (svcId: string) => void;
  onVariantSel: (svcId: string, varId: string) => void;
  onAddonToggle: (svcId: string, addId: string, checked: boolean) => void;
  GOLD: string; GOLD_DARK: string; GOLD_LIGHT: string;
  BORDER: string; WHITE: string; TXT: string; TXT_SOFT: string; TXT_MID: string;
  inp: React.CSSProperties;
}

export default function ServicePicker(props: Props) {
  const { services, allVariantsMap, svcVariantsMap, svcAddonsMap, svcVariantSel, svcAddonsSel,
    svcLoading, expandedSvc, serviceIds, onToggle, onExpandToggle, onVariantSel, onAddonToggle,
    GOLD, GOLD_DARK, GOLD_LIGHT, BORDER, WHITE, TXT, TXT_SOFT, TXT_MID, inp } = props;

  const [search, setSearch] = useState("");

  // Group services by category
  const grouped: Record<string, any[]> = {};
  const q = search.toLowerCase();
  for (const s of services) {
    if (q && !s.name.toLowerCase().includes(q) && !(s.category||"").toLowerCase().includes(q)) continue;
    const cat = s.category || "Other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(s);
  }

  const getPriceLabel = (s: any) => {
    const vars = allVariantsMap[s.id] || [];
    if (vars.length === 0) return Number(s.price) > 0 ? "GHS " + Number(s.price).toLocaleString() : "Price varies";
    const prices = vars.map((v: any) => Number(v.price_adjustment));
    const mn = Math.min(...prices), mx = Math.max(...prices);
    return mn === mx ? "GHS " + mn.toLocaleString() : "GHS " + mn.toLocaleString() + " – " + mx.toLocaleString();
  };

  return (
    <div>
      {/* Search box */}
      <div style={{ position:"relative", marginBottom:14 }}>
        <span style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", color:TXT_SOFT, fontSize:13, pointerEvents:"none" }}>🔍</span>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search services…"
          style={{ ...inp, paddingLeft:36, fontSize:12 }}
        />
      </div>

      {/* Selected chips */}
      {serviceIds.length > 0 && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:12 }}>
          {services.filter(s => serviceIds.includes(s.id)).map(s => (
            <div key={s.id} style={{ display:"flex", alignItems:"center", gap:5, background:GOLD_LIGHT, border:`1.5px solid ${GOLD}`, borderRadius:20, padding:"4px 10px 4px 12px", fontSize:11, fontWeight:600, color:GOLD_DARK }}>
              {s.name}
              <button onClick={() => onToggle(s.id)} style={{ background:"none", border:"none", cursor:"pointer", color:GOLD_DARK, fontSize:14, lineHeight:1, padding:"0 0 0 2px" }}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* Service list */}
      {Object.entries(grouped).length === 0 && (
        <p style={{ color:TXT_SOFT, fontSize:13, textAlign:"center", padding:"20px 0" }}>No services found</p>
      )}
      {Object.entries(grouped).map(([cat, svcs]) => (
        <div key={cat} style={{ marginBottom:12 }}>
          <p style={{ fontSize:9, fontWeight:700, letterSpacing:"0.18em", color:TXT_SOFT, textTransform:"uppercase", marginBottom:6, paddingLeft:2 }}>{cat}</p>
          <div style={{ border:`1px solid ${BORDER}`, borderRadius:10, overflow:"hidden" }}>
            {(svcs as any[]).map((s, i) => {
              const sel = serviceIds.includes(s.id);
              const expanded = expandedSvc === s.id && sel;
              const svcVars = svcVariantsMap[s.id] || [];
              const svcAdds = svcAddonsMap[s.id] || [];
              const isLoading = !!svcLoading[s.id];
              const hasExtras = isLoading || svcVars.length > 0 || svcAdds.length > 0;
              return (
                <div key={s.id}>
                  {i > 0 && <div style={{ height:1, background:`${BORDER}` }} />}
                  {/* Row */}
                  <div
                    className="svc-row"
                    onClick={() => onToggle(s.id)}
                    style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 14px", background: sel ? GOLD_LIGHT : WHITE, cursor:"pointer", transition:"background 0.12s" }}
                  >
                    {/* Checkbox */}
                    <div style={{
                      width:18, height:18, borderRadius:4, flexShrink:0,
                      border:`2px solid ${sel ? GOLD : BORDER}`,
                      background: sel ? GOLD : WHITE,
                      display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.12s",
                    }}>
                      {sel && <span style={{ color:WHITE, fontSize:10, fontWeight:700, lineHeight:1 }}>✓</span>}
                    </div>

                    {/* Name */}
                    <span style={{ flex:1, fontSize:13, fontWeight: sel ? 600 : 400, color: sel ? GOLD_DARK : TXT, lineHeight:1.3 }}>{s.name}</span>

                    {/* Price */}
                    <span style={{ fontSize:12, fontWeight:700, color: sel ? GOLD_DARK : TXT_SOFT, whiteSpace:"nowrap" }}>{getPriceLabel(s)}</span>

                    {/* Expand arrow — only if selected and has variants/addons */}
                    {sel && (hasExtras || svcVariantsMap[s.id] !== undefined) && (
                      <button
                        onClick={e => { e.stopPropagation(); onExpandToggle(s.id); }}
                        style={{ background:"none", border:"none", cursor:"pointer", color:GOLD_DARK, fontSize:11, fontWeight:700, padding:"2px 4px", fontFamily:"'Montserrat',sans-serif" }}
                      >
                        {expanded ? "▲" : "▼"}
                      </button>
                    )}
                  </div>

                  {/* Expanded options */}
                  {expanded && (
                    <div style={{ background:"#FDFAF6", borderTop:`1px solid ${GOLD}44`, padding:"12px 16px", display:"flex", flexDirection:"column", gap:12 }}>
                      {isLoading && <p style={{ fontSize:11, color:TXT_SOFT }}>Loading options…</p>}

                      {/* Variants */}
                      {svcVars.length > 0 && (
                        <div>
                          <p style={{ fontSize:9, fontWeight:700, letterSpacing:"0.14em", color:GOLD_DARK, marginBottom:8 }}>SIZE / LENGTH <span style={{ color:"#C0392B" }}>*</span></p>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                            {svcVars.map((v: any) => {
                              const active = (svcVariantSel[s.id] || "") === v.id;
                              return (
                                <button key={v.id} type="button"
                                  onClick={() => onVariantSel(s.id, v.id)}
                                  style={{ background:active ? GOLD_DARK : WHITE, color:active ? WHITE : TXT, border:`1.5px solid ${active ? GOLD_DARK : BORDER}`, borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:11, fontWeight:600, transition:"all 0.12s" }}>
                                  {v.name}
                                  <span style={{ display:"block", fontSize:10, fontWeight:700, color:active?"rgba(255,255,255,0.85)":GOLD_DARK, marginTop:2 }}>GHS {Number(v.price_adjustment).toLocaleString()}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Add-ons */}
                      {svcAdds.length > 0 && (
                        <div>
                          <p style={{ fontSize:9, fontWeight:700, letterSpacing:"0.14em", color:"#7C3AED", marginBottom:8 }}>ADD-ONS <span style={{ fontWeight:400, color:TXT_SOFT }}>(optional)</span></p>
                          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                            {svcAdds.map((a: any) => {
                              const chk = (svcAddonsSel[s.id] || []).includes(a.id);
                              return (
                                <label key={a.id} onClick={() => onAddonToggle(s.id, a.id, chk)}
                                  style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:chk?"#F5F3FF":WHITE, border:`1.5px solid ${chk?"#A78BFA":BORDER}`, borderRadius:8, padding:"8px 12px", cursor:"pointer", transition:"all 0.12s" }}>
                                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                    <div style={{ width:14, height:14, borderRadius:3, border:`2px solid ${chk?"#7C3AED":"#D1C5B8"}`, background:chk?"#7C3AED":WHITE, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                                      {chk && <span style={{ color:WHITE, fontSize:9, fontWeight:700 }}>✓</span>}
                                    </div>
                                    <span style={{ fontSize:11, fontWeight:600, color:TXT }}>{a.name}</span>
                                  </div>
                                  <span style={{ fontSize:11, fontWeight:700, color:"#7C3AED", whiteSpace:"nowrap", marginLeft:8 }}>+GHS {Number(a.price).toLocaleString()}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
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
}
