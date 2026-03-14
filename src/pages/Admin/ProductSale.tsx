import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShoppingBag, Search, Plus, Minus, X, CheckCircle2, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const G = "#C8A97E", G_D = "#8B6914", CREAM = "#FAFAF8", WHITE = "#FFFFFF";
const BORDER = "#EDEBE5", TXT = "#1C160E", TXT_MID = "#78716C", TXT_SOFT = "#A8A29E";
const SHADOW = "0 1px 3px rgba(0,0,0,0.04),0 4px 16px rgba(0,0,0,0.06)";
const inp: React.CSSProperties = { border: "1.5px solid " + BORDER, borderRadius: "10px", padding: "9px 12px", fontSize: "13px", color: TXT, outline: "none", background: WHITE, fontFamily: "Montserrat,sans-serif", width: "100%" };

type CartItem = { id: string; name: string; price: number; cost_price: number; stock_quantity: number; quantity: number };
type PayMethod = "cash" | "mobile_money" | "card" | "bank_transfer";

export default function ProductSale() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PayMethod>("cash");
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [totalCharged, setTotalCharged] = useState(0);

  useEffect(() => {
    supabase.from("products" as any).select("*").eq("is_active", true).order("name")
      .then(({ data }) => setProducts((data as any) || []));
  }, []);

  const filtered = products.filter(p =>
    p.stock_quantity > 0 &&
    (!search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.category || "").toLowerCase().includes(search.toLowerCase()))
  );

  const addToCart = (p: any) => {
    setCart(prev => {
      const ex = prev.find(i => i.id === p.id);
      if (ex) return prev.map(i => i.id === p.id ? { ...i, quantity: Math.min(i.quantity + 1, p.stock_quantity) } : i);
      return [...prev, { id: p.id, name: p.name, price: Number(p.price), cost_price: Number(p.cost_price || 0), stock_quantity: p.stock_quantity, quantity: 1 }];
    });
  };

  const updateQty = (id: string, qty: number) => {
    if (qty < 1) setCart(prev => prev.filter(i => i.id !== id));
    else setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i));
  };

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  const handleSale = async () => {
    if (cart.length === 0) { toast.error("Add at least one product"); return; }
    if (!paymentMethod) { toast.error("Select a payment method"); return; }
    setProcessing(true);
    try {
      // Deduct stock + record each product sale
      for (const item of cart) {
        await (supabase as any).from("products").update({
          stock_quantity: Math.max(0, item.stock_quantity - item.quantity)
        }).eq("id", item.id);

        await supabase.from("sales").insert({
          amount: item.price * item.quantity,
          payment_method: paymentMethod as any,
          status: "completed",
          client_name: clientName.trim() || null,
          service_name: item.name + (item.quantity > 1 ? " x" + item.quantity : ""),
          notes: "Product sale" + (clientName.trim() ? " · " + clientName.trim() : ""),
          booking_id: null,
          client_id: null,
          staff_id: null,
        } as any);
      }

      // Write checkout session + items
      const { data: sess } = await (supabase as any).from("checkout_sessions").insert([{
        client_id: null,
        staff_id: null,
        booking_id: null,
        total_amount: total,
        payment_method: paymentMethod,
        status: "completed",
      }]).select("id").single();

      if (sess?.id) {
        await (supabase as any).from("checkout_items").insert(
          cart.map(item => ({
            checkout_session_id: sess.id,
            item_type: "product",
            item_id: item.id,
            name: item.name,
            quantity: item.quantity,
            price_at_time: item.price,
            subtotal: item.price * item.quantity,
          }))
        );
      }

      setTotalCharged(total);
      setCompleted(true);
      toast.success("Sale recorded!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Sale failed");
    } finally { setProcessing(false); }
  };

  if (completed) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: CREAM, fontFamily: "Montserrat,sans-serif", padding: "24px" }}>
        <div style={{ background: WHITE, border: "1px solid " + BORDER, borderRadius: "20px", overflow: "hidden", maxWidth: "420px", width: "100%" }}>
          <div style={{ background: "linear-gradient(135deg," + G + "," + G_D + ")", padding: "36px 28px", textAlign: "center", color: WHITE }}>
            <CheckCircle2 style={{ width: "48px", height: "48px", margin: "0 auto 12px" }} />
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "28px", fontWeight: 700, margin: "0 0 6px" }}>Sale Complete</h2>
            <p style={{ fontSize: "13px", opacity: 0.85, margin: 0 }}>Products sold and stock updated</p>
          </div>
          <div style={{ padding: "24px 28px" }}>
            {cart.map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid " + BORDER }}>
                <span style={{ fontSize: "12px", color: TXT_MID }}>{item.name}{item.quantity > 1 ? " x" + item.quantity : ""}</span>
                <span style={{ fontSize: "12px", fontWeight: 600, color: TXT }}>GHS {(item.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0" }}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: TXT }}>Total</span>
              <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "24px", fontWeight: 700, color: G_D }}>GHS {totalCharged.toLocaleString()}</span>
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
              <button onClick={() => { setCart([]); setClientName(""); setClientPhone(""); setSearch(""); setCompleted(false); }}
                style={{ flex: 1, padding: "11px", borderRadius: "12px", background: CREAM, color: TXT_MID, border: "1px solid " + BORDER, fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                New Sale
              </button>
              <button onClick={() => navigate("/app/admin/products")}
                style={{ flex: 1, padding: "11px", borderRadius: "12px", background: "linear-gradient(135deg," + G + "," + G_D + ")", color: WHITE, border: "none", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: CREAM, minHeight: "100vh", padding: "clamp(16px,4vw,32px)", fontFamily: "Montserrat,sans-serif", color: TXT }}>
      <div style={{ maxWidth: "960px", margin: "0 auto" }}>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px" }}>
          <ShoppingBag style={{ width: "24px", height: "24px", color: G }} />
          <div>
            <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "32px", fontWeight: 700, color: TXT, margin: 0 }}>Sell Products</h1>
            <p style={{ fontSize: "12px", color: TXT_SOFT, margin: 0 }}>Direct product sale — no booking required</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "24px", alignItems: "start" }}>

          {/* Left — product picker */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ position: "relative" }}>
              <Search style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", width: "16px", height: "16px", color: TXT_SOFT }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
                style={{ ...inp, paddingLeft: "38px" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: "12px" }}>
              {filtered.length === 0 && (
                <p style={{ color: TXT_SOFT, fontSize: "13px", gridColumn: "1/-1", textAlign: "center", padding: "32px" }}>
                  {search ? "No products match your search" : "No products in stock"}
                </p>
              )}
              {filtered.map(p => {
                const inCart = cart.find(i => i.id === p.id);
                return (
                  <div key={p.id} onClick={() => addToCart(p)}
                    style={{ background: WHITE, border: "1.5px solid " + (inCart ? G : BORDER), borderRadius: "14px", padding: "16px", cursor: "pointer", boxShadow: SHADOW, transition: "border-color 0.15s" }}
                    onMouseEnter={e => { (e.currentTarget as any).style.borderColor = G; }}
                    onMouseLeave={e => { (e.currentTarget as any).style.borderColor = inCart ? G : BORDER; }}>
                    <p style={{ fontSize: "13px", fontWeight: 700, color: TXT, margin: "0 0 4px" }}>{p.name}</p>
                    {p.category && <p style={{ fontSize: "10px", color: TXT_SOFT, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.1em" }}>{p.category}</p>}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "20px", fontWeight: 700, color: G_D }}>GHS {Number(p.price).toLocaleString()}</span>
                      <span style={{ fontSize: "10px", color: p.stock_quantity <= p.low_stock_threshold ? "#DC2626" : TXT_SOFT }}>
                        {p.stock_quantity} left
                      </span>
                    </div>
                    {inCart && <div style={{ marginTop: "8px", padding: "4px 10px", background: "#FBF6EE", borderRadius: "8px", fontSize: "11px", fontWeight: 600, color: G_D, textAlign: "center" }}>
                      {inCart.quantity} in cart
                    </div>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right — cart + checkout */}
          <div style={{ position: "sticky", top: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>

            {/* Cart */}
            <div style={{ background: WHITE, border: "1px solid " + BORDER, borderRadius: "16px", overflow: "hidden", boxShadow: SHADOW }}>
              <div style={{ background: "linear-gradient(135deg,rgba(200,169,126,0.1),rgba(200,169,126,0.04))", padding: "14px 18px", borderBottom: "1px solid " + BORDER, display: "flex", alignItems: "center", gap: "8px" }}>
                <ShoppingBag style={{ width: "15px", height: "15px", color: G }} />
                <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "17px", fontWeight: 700, color: TXT }}>Cart ({cart.length})</span>
              </div>
              <div style={{ padding: "16px" }}>
                {cart.length === 0 && <p style={{ fontSize: "12px", color: TXT_SOFT, textAlign: "center", padding: "16px 0" }}>Click products to add them</p>}
                {cart.map(item => (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 0", borderBottom: "1px solid " + BORDER }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: "12px", fontWeight: 600, color: TXT, margin: 0 }}>{item.name}</p>
                      <p style={{ fontSize: "11px", color: G_D, margin: 0 }}>GHS {item.price.toLocaleString()} each</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <button onClick={() => updateQty(item.id, item.quantity - 1)} style={{ width: "22px", height: "22px", borderRadius: "6px", border: "1px solid " + BORDER, background: WHITE, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Minus style={{ width: "10px", height: "10px" }} /></button>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: TXT, minWidth: "20px", textAlign: "center" }}>{item.quantity}</span>
                      <button onClick={() => updateQty(item.id, item.quantity + 1)} disabled={item.quantity >= item.stock_quantity} style={{ width: "22px", height: "22px", borderRadius: "6px", border: "1px solid " + BORDER, background: WHITE, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: item.quantity >= item.stock_quantity ? 0.4 : 1 }}><Plus style={{ width: "10px", height: "10px" }} /></button>
                    </div>
                    <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "15px", fontWeight: 700, color: G_D, minWidth: "70px", textAlign: "right" }}>GHS {(item.price * item.quantity).toLocaleString()}</span>
                    <button onClick={() => updateQty(item.id, 0)} style={{ background: "none", border: "none", cursor: "pointer", color: "#DC2626", padding: "2px" }}><X style={{ width: "14px", height: "14px" }} /></button>
                  </div>
                ))}
                {cart.length > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "12px", marginTop: "4px" }}>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: TXT }}>Total</span>
                    <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "26px", fontWeight: 700, color: G_D }}>GHS {total.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Client (optional) */}
            <div style={{ background: WHITE, border: "1px solid " + BORDER, borderRadius: "14px", padding: "16px" }}>
              <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: TXT_SOFT, textTransform: "uppercase", marginBottom: "12px" }}>Client (optional)</p>
              <input placeholder="Client name" value={clientName} onChange={e => setClientName(e.target.value)} style={{ ...inp, marginBottom: "8px" }} />
              <input placeholder="Phone number" value={clientPhone} onChange={e => setClientPhone(e.target.value)} style={inp} />
            </div>

            {/* Payment */}
            <div style={{ background: WHITE, border: "1px solid " + BORDER, borderRadius: "14px", padding: "16px" }}>
              <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: TXT_SOFT, textTransform: "uppercase", marginBottom: "12px" }}>Payment Method</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {(["cash", "mobile_money", "card", "bank_transfer"] as PayMethod[]).map(m => (
                  <button key={m} onClick={() => setPaymentMethod(m)}
                    style={{ padding: "10px 8px", borderRadius: "10px", border: "1.5px solid " + (paymentMethod === m ? G : BORDER), background: paymentMethod === m ? "#FBF6EE" : WHITE, color: paymentMethod === m ? G_D : TXT_MID, fontSize: "11px", fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>
                    {m.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleSale} disabled={processing || cart.length === 0}
              style={{ padding: "14px 20px", borderRadius: "12px", background: cart.length === 0 ? "#E8E0D4" : "linear-gradient(135deg," + G + "," + G_D + ")", color: cart.length === 0 ? TXT_SOFT : WHITE, border: "none", fontSize: "13px", fontWeight: 700, cursor: cart.length === 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              {processing ? <Loader2 style={{ width: "18px", height: "18px", animation: "spin 1s linear infinite" }} /> : <><CheckCircle2 style={{ width: "18px", height: "18px" }} />Complete Sale — GHS {total.toLocaleString()}</>}
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
