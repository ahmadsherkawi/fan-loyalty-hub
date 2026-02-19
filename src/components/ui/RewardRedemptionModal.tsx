import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, CheckCircle, Copy, Clock, QrCode, Check } from "lucide-react";
import { toast } from "sonner";

import { Reward } from "@/types/database";

interface RedemptionResult {
  success: boolean;
  final_cost?: number;
  balance_after?: number;
  redemption_code?: string;
  redemption_method?: string;
  reward_name?: string;
  error?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reward: Reward | null;
  discountPercent?: number;
  pointsBalance: number;
  pointsCurrency: string;
  onConfirmRedeem: () => Promise<RedemptionResult>;
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
  isPreview,
}: Props) {
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [result, setResult] = useState<RedemptionResult | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setResult(null);
      setCopied(false);
      setIsRedeeming(false);
    }
  }, [isOpen]);

  if (!reward) return null;

  /* ---------- PRICE CALCULATION ---------- */
  const originalCost = reward.points_cost;
  const discountAmount = Math.round(originalCost * (discountPercent / 100));
  const finalCost = originalCost - discountAmount;
  const balanceAfter = pointsBalance - finalCost;

  const handleRedeem = async () => {
    setIsRedeeming(true);
    try {
      const res = await onConfirmRedeem();
      setResult(res);
    } catch (err: any) {
      setResult({ success: false, error: err.message });
    } finally {
      setIsRedeeming(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Code copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const getRedemptionMethodLabel = (method: string) => {
    switch (method) {
      case "voucher":
        return "Digital Voucher";
      case "code_display":
        return "Instant Code";
      case "manual_fulfillment":
        return "Manual Fulfillment";
      default:
        return "Reward Code";
    }
  };

  const getRedemptionMethodDescription = (method: string) => {
    switch (method) {
      case "voucher":
        return "Use this voucher code at the club shop or venue to claim your reward.";
      case "code_display":
        return "Show this code at the counter or enter it online to claim instantly.";
      case "manual_fulfillment":
        return "Your redemption request has been sent. The club will fulfill it and notify you.";
      default:
        return "Keep this code safe to redeem your reward.";
    }
  };

  /* ---------- SUCCESS STATE ---------- */
  if (result?.success) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Redemption Successful!
            </DialogTitle>
            <DialogDescription>Your reward has been redeemed</DialogDescription>
          </DialogHeader>

          <div className="text-center py-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <Gift className="h-8 w-8 text-green-600" />
            </div>
            <p className="font-semibold text-lg">{result.reward_name || reward.name}</p>
            <p className="text-sm text-muted-foreground">
              {result.final_cost} {pointsCurrency} spent
            </p>
          </div>

          {result.redemption_code && (
            <div className="border rounded-xl p-4 space-y-3 bg-muted/50">
              <div className="flex items-center justify-between">
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  {getRedemptionMethodLabel(result.redemption_method || "")}
                </Badge>
                {result.redemption_method === "manual_fulfillment" && (
                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                )}
              </div>

              <div className="bg-background rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Your Code</p>
                <p className="text-2xl font-mono font-bold tracking-wider text-primary">
                  {result.redemption_code}
                </p>
              </div>

              <p className="text-xs text-muted-foreground">
                {getRedemptionMethodDescription(result.redemption_method || "")}
              </p>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => copyToClipboard(result.redemption_code!)}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" /> Copy Code
                  </>
                )}
              </Button>
            </div>
          )}

          <div className="text-center text-sm text-muted-foreground">
            New balance: <span className="font-semibold text-foreground">{result.balance_after}</span> {pointsCurrency}
          </div>

          <Button className="w-full" onClick={onClose}>
            Done
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  /* ---------- CONFIRMATION STATE ---------- */
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
          <Badge className="mt-2">{getRedemptionMethodLabel(reward.redemption_method)}</Badge>
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
          {getRedemptionMethodDescription(reward.redemption_method)}
        </div>

        {result?.error && (
          <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded-lg">
            {result.error}
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>

          <Button className="flex-1" onClick={handleRedeem} disabled={isRedeeming}>
            {isRedeeming ? "Processing..." : "Confirm Redemption"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
