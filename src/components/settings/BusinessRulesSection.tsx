import React from "react";


interface Props {
  depositAmount: number; loyaltyStampPerGhs: number; loyaltyStampsForReward: number; loyaltyRewardDiscount: number;
  onDepositChange: (v: number) => void; onStampPerGhsChange: (v: number) => void;
  onStampsForRewardChange: (v: number) => void; onRewardDiscountChange: (v: number) => void;
}

export function BusinessRulesSection({ depositAmount, loyaltyStampPerGhs, loyaltyStampsForReward, loyaltyRewardDiscount, onDepositChange, onStampPerGhsChange, onStampsForRewardChange, onRewardDiscountChange }: Props) {
  const G = "#C8A97E", G_D = "#8B6914", WHITE = "#FFFFFF", CREAM = "#FAFAF8";
  const BORDER = "#EDEBE5", TXT = "#1C160E", TXT_MID = "#78716C", TXT_SOFT = "#A8A29E";
  const SHADOW = "0 1px 3px rgba(0,0,0,0.04),0 4px 16px rgba(0,0,0,0.06)";
  return (
    <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "16px", overflow: "hidden", boxShadow: SHADOW }}>
      <div style={{ background: "linear-gradient(135deg,rgba(200,169,126,0.1),rgba(200,169,126,0.04))", padding: "14px 20px", borderBottom: `1px solid ${BORDER}` }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "20px", fontWeight: 700, color: TXT, margin: "0 0 2px" }}>Business Rules</h2>
        <p style={{ fontSize: "11px", color: TXT_SOFT, margin: 0 }}>Changes affect bookings, checkout, and loyalty immediately after saving.</p>
      </div>
      <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Deposit */}
        <div>
          <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", color: TXT_MID, textTransform: "uppercase", marginBottom: "12px" }}>Booking Deposit</p>
          <div style={{ maxWidth: "240px" }}>
            <label style={lbl}>Deposit Amount (GHS)</label>
            <input type="number" min={0} step={5} value={depositAmount} onChange={e => onDepositChange(Number(e.target.value))} style={inp} />
            <p style={{ fontSize: "10px", color: TXT_SOFT, marginTop: "4px" }}>Required to confirm any online booking. Currently GHS {depositAmount}.</p>
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: "20px" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", color: TXT_MID, textTransform: "uppercase", marginBottom: "12px" }}>Loyalty Programme</p>
          <div style={{ background: "#FBF6EE", border: "1px solid #F0E4CC", borderRadius: "10px", padding: "10px 14px", fontSize: "12px", color: G_D, marginBottom: "16px", fontWeight: 500 }}>
            Current rule: 1 stamp per GHS {loyaltyStampPerGhs} spent → {loyaltyStampsForReward} stamps = GHS {loyaltyRewardDiscount} discount. Birthday month = double stamps.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
            <div>
              <label style={lbl}>GHS per stamp</label>
              <input type="number" min={1} step={10} value={loyaltyStampPerGhs} onChange={e => onStampPerGhsChange(Number(e.target.value))} style={inp} />
              <p style={{ fontSize: "10px", color: TXT_SOFT, marginTop: "4px" }}>1 stamp per GHS {loyaltyStampPerGhs}</p>
            </div>
            <div>
              <label style={lbl}>Stamps for reward</label>
              <input type="number" min={1} value={loyaltyStampsForReward} onChange={e => onStampsForRewardChange(Number(e.target.value))} style={inp} />
              <p style={{ fontSize: "10px", color: TXT_SOFT, marginTop: "4px" }}>Reward at {loyaltyStampsForReward} stamps</p>
            </div>
            <div>
              <label style={lbl}>Reward discount (GHS)</label>
              <input type="number" min={1} step={5} value={loyaltyRewardDiscount} onChange={e => onRewardDiscountChange(Number(e.target.value))} style={inp} />
              <p style={{ fontSize: "10px", color: TXT_SOFT, marginTop: "4px" }}>GHS {loyaltyRewardDiscount} off</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
