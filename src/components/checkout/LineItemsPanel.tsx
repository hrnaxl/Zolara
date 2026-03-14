import React from "react";
import { Receipt } from "lucide-react";

const G = "#C8A97E";
const G_D = "#8B6914";
const WHITE = "#FFFFFF";
const CREAM = "#FAFAF8";
const BORDER = "#EDEBE5";
const TXT = "#1C160E";
const TXT_MID = "#78716C";
const TXT_SOFT = "#A8A29E";
const SHADOW = "0 1px 3px rgba(0,0,0,0.04),0 4px 16px rgba(0,0,0,0.06)";

interface LineItem {
  type: "service" | "product" | "subscription";
  id: string; name: string; quantity: number; unitPrice: number; coveredBySubscription: boolean;
}
interface Props {
  lineItems: LineItem[]; lineItemsTotal: number; products: any[];
  productSearch: string; clientSubscription: any;
  cardHdr: React.CSSProperties; lbl: React.CSSProperties; inp: React.CSSProperties;
  onProductSearch: (v: string) => void; onAddProduct: (p: any) => void;
  onUpdateQty: (idx: number, qty: number) => void; onRemove: (idx: number) => void;
  onToggleSub: (idx: number) => void;
}

export default function LineItemsPanel(props: Props) {
  const { lineItems, lineItemsTotal, products, productSearch, clientSubscription,
    cardHdr, lbl, inp, onProductSearch, onAddProduct, onUpdateQty, onRemove, onToggleSub } = props;

  const filtered = products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));

  return (
    <div style={{ background: WHITE, border: "1px solid " + BORDER, borderRadius: "16px", overflow: "hidden", boxShadow: SHADOW }}>
      <div style={Object.assign({}, cardHdr, { justifyContent: "space-between" })}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Receipt style={{ width: "16px", height: "16px", color: G }} />
          <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "19px", fontWeight: 700, color: TXT }}>Line Items</span>
        </div>
        <span style={{ fontSize: "11px", color: TXT_SOFT }}>Add retail products sold at this visit</span>
      </div>
      <div style={{ padding: "20px" }}>

        <div style={{ marginBottom: "16px" }}>
          {lineItems.map((item, idx) => {
            const typeBg = item.type === "service" ? "#FBF6EE" : item.type === "product" ? "#EFF6FF" : "#F5F3FF";
            const typeClr = item.type === "service" ? G_D : item.type === "product" ? "#2563EB" : "#7C3AED";
            const rowBg = item.coveredBySubscription ? "#F0FDF4" : CREAM;
            const rowBd = "1px solid " + (item.coveredBySubscription ? "#BBF7D0" : BORDER);
            const amtClr = item.coveredBySubscription ? "#16A34A" : G_D;
            const amtTxt = item.coveredBySubscription ? "Plan" : ("GHS " + (item.unitPrice * item.quantity).toFixed(2));
            const sbBd = "1px solid " + (item.coveredBySubscription ? "#16A34A" : BORDER);
            const sbBg = item.coveredBySubscription ? "#DCFCE7" : WHITE;
            const sbClr = item.coveredBySubscription ? "#16A34A" : TXT_SOFT;
            const sbTxt = item.coveredBySubscription ? "Plan active" : "Use Plan";
            return (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderRadius: "10px", background: rowBg, border: rowBd, marginBottom: "8px" }}>
                <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "20px", fontWeight: 700, background: typeBg, color: typeClr }}>{item.type.toUpperCase()}</span>
                <span style={{ flex: 1, fontSize: "13px", fontWeight: 600, color: TXT }}>{item.name}</span>
                {item.type !== "service" && (
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <button onClick={() => onUpdateQty(idx, item.quantity - 1)} style={{ width: "22px", height: "22px", borderRadius: "6px", border: "1px solid " + BORDER, background: WHITE, cursor: "pointer", fontSize: "14px", fontWeight: 700, color: TXT_MID }}>-</button>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: TXT, minWidth: "20px", textAlign: "center" }}>{item.quantity}</span>
                    <button onClick={() => onUpdateQty(idx, item.quantity + 1)} style={{ width: "22px", height: "22px", borderRadius: "6px", border: "1px solid " + BORDER, background: WHITE, cursor: "pointer", fontSize: "14px", fontWeight: 700, color: TXT_MID }}>+</button>
                  </div>
                )}
                <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "16px", fontWeight: 700, color: amtClr, minWidth: "90px", textAlign: "right" }}>{amtTxt}</span>
                {clientSubscription && item.type === "service" && (
                  <button onClick={() => onToggleSub(idx)} style={{ fontSize: "10px", fontWeight: 700, padding: "3px 10px", borderRadius: "20px", border: sbBd, background: sbBg, color: sbClr, cursor: "pointer", whiteSpace: "nowrap" }}>{sbTxt}</button>
                )}
                {item.type !== "service" && (
                  <button onClick={() => onRemove(idx)} style={{ fontSize: "11px", color: "#DC2626", background: "none", border: "none", cursor: "pointer", padding: "2px 8px" }}>X</button>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ position: "relative", marginBottom: clientSubscription ? "14px" : "0" }}>
          <label style={lbl}>Add Product to Sale</label>
          <input placeholder="Search products..." value={productSearch} onChange={e => onProductSearch(e.target.value)} style={inp} />
          {productSearch.length > 0 && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: WHITE, border: "1px solid " + BORDER, borderRadius: "10px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", zIndex: 100, maxHeight: "200px", overflowY: "auto" }}>
              {filtered.length === 0 ? (
                <div style={{ padding: "12px 16px", fontSize: "13px", color: TXT_SOFT }}>No active products found</div>
              ) : filtered.map(p => (
                <div key={p.id} onClick={() => onAddProduct(p)}
                  style={{ padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", borderBottom: "1px solid " + BORDER, background: WHITE }}
                  onMouseEnter={e => { (e.currentTarget as any).style.background = "#FBF6EE"; }}
                  onMouseLeave={e => { (e.currentTarget as any).style.background = "#FFFFFF"; }}>
                  <div>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: TXT }}>{p.name}</span>
                    <span style={{ fontSize: "10px", color: TXT_SOFT, marginLeft: "8px" }}>Stock: {p.stock_quantity}</span>
                  </div>
                  <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "15px", fontWeight: 700, color: G_D }}>GHS {Number(p.price).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {clientSubscription && (
          <div style={{ marginTop: "14px", padding: "10px 14px", borderRadius: "10px", background: "#F5F3FF", border: "1px solid #DDD6FE", display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "10px", fontWeight: 700, color: "#7C3AED", letterSpacing: "0.1em" }}>ACTIVE PLAN</span>
            <span style={{ fontSize: "13px", fontWeight: 600, color: TXT }}>{clientSubscription.subscription_plans?.name}</span>
            <span style={{ fontSize: "11px", color: TXT_SOFT, marginLeft: "auto" }}>GHS {Number(clientSubscription.subscription_plans?.price || 0).toFixed(0)}/mo</span>
            <span style={{ fontSize: "10px", color: "#7C3AED" }}>{clientSubscription.subscription_plans?.max_usage_per_cycle || 2} uses/cycle</span>
          </div>
        )}

        <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid " + BORDER }}>
          {lineItems.map((item, idx) => {
            const sc = item.coveredBySubscription ? "#16A34A" : TXT;
            const st = item.coveredBySubscription ? "Included in plan" : ("GHS " + (item.unitPrice * item.quantity).toFixed(2));
            const nm = item.quantity > 1 ? (item.name + " x" + item.quantity) : item.name;
            return (
              <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                <span style={{ fontSize: "12px", color: TXT_MID }}>{nm}</span>
                <span style={{ fontSize: "12px", fontWeight: 600, color: sc }}>{st}</span>
              </div>
            );
          })}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", paddingTop: "12px", borderTop: "2px solid " + BORDER }}>
            <span style={{ fontSize: "15px", fontWeight: 700, color: TXT }}>Transaction Total</span>
            <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "28px", fontWeight: 700, color: G_D }}>GHS {lineItemsTotal.toFixed(2)}</span>
          </div>
        </div>

      </div>
    </div>
  );
}
