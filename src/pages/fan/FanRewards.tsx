// RewardRedemptionModal.tsx
// NOTE: Only changes are adding discountPercent prop + using it to compute/display discounted cost.
// Keep everything else in your file as-is if you have extra UI. If you paste this whole file, it will work standalone.

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift } from "lucide-react";
import type { Reward } from "@/types/database";

export function RewardRedemptionModal({
  isOpen,
  onClose,
  reward,
  pointsBalance,
  pointsCurrency,
  onConfirmRedeem,
  isPreview,
  discountPercent = 0, // ✅ NEW
}: {
  isOpen: boolean;
  onClose: () => void;
  reward: Reward | null;
  pointsBalance: number;
  pointsCurrency: string;
  onConfirmRedeem: () => Promise<{ success: boolean; code?: string | null; error?: string }>;
  isPreview: boolean;
  discountPercent?: number; // ✅ NEW
}) {
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { originalCost, discount, finalCost, balanceAfter, canAffordFinal } = useMemo(() => {
    const original = reward?.points_cost ?? 0;
    const disc = Number.isFinite(Number(discountPercent)) ? Number(discountPercent) : 0;

    const final = disc > 0 ? Math.round(original * (1 - disc / 100)) : original;
    const after = (pointsBalance ?? 0) - final;

    return {
      originalCost: original,
      discount: disc,
      finalCost: final,
      balanceAfter: after,
      canAffordFinal: (pointsBalance ?? 0) >= final,
    };
  }, [reward, pointsBalance, discountPercent]);

  const handleConfirm = async () => {
    if (!reward) return;

    setSubmitting(true);
    setServerError(null);

    try {
      const res = await onConfirmRedeem();
      if (!res.success) {
        setServerError(res.error || "Failed to redeem reward");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            <DialogTitle>Redeem Reward</DialogTitle>
          </div>
          <DialogDescription>Confirm your redemption</DialogDescription>
        </DialogHeader>

        {!reward ? (
          <div className="text-sm text-muted-foreground">No reward selected.</div>
        ) : (
          <div className="space-y-4">
            {/* Reward card */}
            <div className="rounded-2xl border bg-muted/30 p-5">
              <div className="text-lg font-semibold">{reward.name}</div>
              <div className="text-sm text-muted-foreground">{reward.description}</div>

              {/* If you have redemption_method UI in your version, keep it.
                  This is a safe placeholder badge. */}
              <div className="mt-3">
                <Badge variant="secondary" className="rounded-full">
                  Fulfilled by Club
                </Badge>
              </div>
            </div>

            {/* Cost breakdown */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Your balance</span>
                <span className="font-medium">
                  {pointsBalance} {pointsCurrency}
                </span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-xs text-green-700">
                  <span>Tier discount</span>
                  <span>-{discount}%</span>
                </div>
              )}

              <div className="flex justify-between text-sm">
                <span>Reward cost</span>
                <div className="text-right">
                  <div className="text-red-600 font-medium">
                    -{finalCost} {pointsCurrency}
                  </div>
                  {discount > 0 && (
                    <div className="text-xs text-muted-foreground">
                      <span className="line-through">
                        {originalCost} {pointsCurrency}
                      </span>
                      <span className="ml-2 text-green-700">saved {originalCost - finalCost}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between font-semibold pt-2 border-t">
                <span>Balance after</span>
                <span className={balanceAfter < 0 ? "text-red-600" : "text-green-600"}>
                  {balanceAfter} {pointsCurrency}
                </span>
              </div>
            </div>

            {serverError && (
              <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">
                {serverError}
              </div>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleConfirm} disabled={submitting || !canAffordFinal} className="min-w-[180px]">
                {submitting ? "Processing..." : "Confirm Redemption"}
              </Button>
            </div>

            {isPreview && (
              <div className="text-xs text-muted-foreground">Preview mode: no real redemption is performed.</div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
