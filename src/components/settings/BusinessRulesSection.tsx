import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  depositAmount: number;
  loyaltyStampPerGhs: number;
  loyaltyStampsForReward: number;
  loyaltyRewardDiscount: number;
  onDepositChange: (v: number) => void;
  onStampPerGhsChange: (v: number) => void;
  onStampsForRewardChange: (v: number) => void;
  onRewardDiscountChange: (v: number) => void;
}

export function BusinessRulesSection({
  depositAmount, loyaltyStampPerGhs, loyaltyStampsForReward, loyaltyRewardDiscount,
  onDepositChange, onStampPerGhsChange, onStampsForRewardChange, onRewardDiscountChange,
}: Props) {
  return (
    <Card className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Business Rules</h2>
        <p className="text-sm text-muted-foreground mt-1">
          These values are live — changes here affect bookings, checkout, and the loyalty program immediately after saving.
        </p>
      </div>

      {/* Deposit */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Booking Deposit</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Deposit Amount (GHS)</Label>
            <Input type="number" min={0} step={5}
              value={depositAmount}
              onChange={e => onDepositChange(Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">
              Required to confirm any online booking. Currently GHS {depositAmount}.
            </p>
          </div>
        </div>
      </div>

      <hr className="border-border" />

      {/* Loyalty */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Loyalty Programme</h3>
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
          Current rule: 1 stamp per GHS {loyaltyStampPerGhs} spent → {loyaltyStampsForReward} stamps = GHS {loyaltyRewardDiscount} discount. Birthday month = double stamps.
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label>GHS spent per stamp</Label>
            <Input type="number" min={1} step={10}
              value={loyaltyStampPerGhs}
              onChange={e => onStampPerGhsChange(Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">1 stamp for every GHS {loyaltyStampPerGhs} spent</p>
          </div>
          <div className="space-y-1">
            <Label>Stamps needed for reward</Label>
            <Input type="number" min={1}
              value={loyaltyStampsForReward}
              onChange={e => onStampsForRewardChange(Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">Client earns reward at {loyaltyStampsForReward} stamps</p>
          </div>
          <div className="space-y-1">
            <Label>Reward discount (GHS)</Label>
            <Input type="number" min={1} step={5}
              value={loyaltyRewardDiscount}
              onChange={e => onRewardDiscountChange(Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">GHS {loyaltyRewardDiscount} off when threshold reached</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
