import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift } from "lucide-react";

import { Reward } from "@/types/database";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reward: Reward | null;
  discountPercent?: number;
  pointsBalance: number;
  pointsCurrency: string;
  onConfirmRedeem: () => Promise<{ success: boolean; code?: string | null; error?: string }>;
  isPreview?: boolean;
}

export function RewardRedemptionModal({
  isOpen,
  onClose,
  reward,
  discountPercent = 0,
  pointsBalance,
  pointsCurrency,
  onConfirmRedeem,
}: Props) {
  if (!reward) return null;

  /* ---------- PRICE CALCULATION ---------- */
  const originalCost = reward.points_cost;
  const discountAmount = Math.round(originalCost * (discountPercent / 100));
  const finalCost = originalCost - discountAmount;
  const balanceAfter = pointsBalance - finalCost;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Redeem Reward
          </DialogTitle>
          <DialogDescription>Confirm your redemption</DialogDescription>
        </DialogHeader>

        {/* REWARD INFO */}
        <div className="border rounded-xl p-4 space-y-1">
          <p className="font-semibold">{reward.name}</p>
          {reward.description && <p className="text-sm text-muted-foreground">{reward.description}</p>}
          <Badge className="mt-2">Digital Voucher</Badge>
        </div>

        {/* BALANCE + COST */}
        <div className="space-y-2 mt-4 text-sm">
          <div className="flex justify-between">
            <span>Your balance</span>
            <span className="font-semibold">
              {pointsBalance} {pointsCurrency}
            </span>
          </div>

          {discountPercent > 0 && (
            <div className="flex justify-between text-muted-foreground line-through">
              <span>Original cost</span>
              <span>
                {originalCost} {pointsCurrency}
              </span>
            </div>
          )}

          {discountPercent > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount ({discountPercent}%)</span>
              <span>
                -{discountAmount} {pointsCurrency}
              </span>
            </div>
          )}

          <div className="flex justify-between text-red-600 font-semibold">
            <span>Reward cost</span>
            <span>
              -{finalCost} {pointsCurrency}
            </span>
          </div>

          <hr />

          <div className="flex justify-between font-bold text-green-600">
            <span>Balance after</span>
            <span>
              {balanceAfter} {pointsCurrency}
            </span>
          </div>
        </div>

        <div className="mt-4 rounded-lg border bg-muted p-3 text-sm text-muted-foreground">
          You will receive a digital voucher code to use at the club shop or venue.
        </div>

        <div className="flex gap-3 mt-4">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>

          <Button className="flex-1" onClick={onConfirmRedeem}>
            Confirm Redemption
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
