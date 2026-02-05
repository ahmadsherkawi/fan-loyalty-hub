import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Gift, Trophy, Ticket, Wrench, Code, CheckCircle2, AlertCircle, Loader2, Copy, Check } from "lucide-react";
import { Reward, RedemptionMethod } from "@/types/database";

interface RewardRedemptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  reward: Reward | null;
  pointsBalance: number;
  pointsCurrency: string;
  onConfirmRedeem: () => Promise<{ success: boolean; code?: string | null; error?: string }>;
  isPreview?: boolean;
}

type ModalState = "confirm" | "processing" | "success" | "error";

const redemptionIcons: Record<RedemptionMethod, React.ReactNode> = {
  voucher: <Ticket className="h-5 w-5" />,
  manual_fulfillment: <Wrench className="h-5 w-5" />,
  code_display: <Code className="h-5 w-5" />,
};

const redemptionLabels: Record<RedemptionMethod, string> = {
  voucher: "Digital Voucher",
  manual_fulfillment: "Fulfilled by Club",
  code_display: "Display Code",
};

const redemptionInstructions: Record<RedemptionMethod, string> = {
  voucher: "You will receive a digital voucher code to use at the club shop or venue.",
  manual_fulfillment: "The club will fulfill this reward. Check your email or contact the club for details.",
  code_display: "You will receive a code to show at the point of redemption.",
};

export function RewardRedemptionModal({
  isOpen,
  onClose,
  reward,
  pointsBalance,
  pointsCurrency,
  onConfirmRedeem,
  isPreview = false,
}: RewardRedemptionModalProps) {
  const [state, setState] = useState<ModalState>("confirm");
  const [redemptionCode, setRedemptionCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [copied, setCopied] = useState(false);

  if (!reward) return null;

  const canAfford = pointsBalance >= reward.points_cost;
  const remainingBalance = pointsBalance - reward.points_cost;

  const handleConfirm = async () => {
    setState("processing");

    if (isPreview) {
      // Simulate redemption in preview mode
      setTimeout(() => {
        setState("success");
        if (reward.redemption_method !== "manual_fulfillment") {
          setRedemptionCode(reward.voucher_code || "PREVIEW-CODE-2024");
        }
      }, 1000);
      return;
    }

    try {
      const result = await onConfirmRedeem();
      if (result.success) {
        setState("success");
        setRedemptionCode(result.code || null);
      } else {
        setState("error");
        setErrorMessage(result.error || "Failed to redeem reward");
      }
    } catch (e) {
      setState("error");
      setErrorMessage("An unexpected error occurred");
    }
  };

  const handleClose = () => {
    setState("confirm");
    setRedemptionCode(null);
    setErrorMessage("");
    setCopied(false);
    onClose();
  };

  const handleCopyCode = async () => {
    if (redemptionCode) {
      await navigator.clipboard.writeText(redemptionCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md">
        {/* Confirmation State */}
        {state === "confirm" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                Redeem Reward
              </DialogTitle>
              <DialogDescription>Confirm your redemption</DialogDescription>
            </DialogHeader>

            <div className="space-y-6 pt-4">
              {/* Reward Info */}
              <div className="p-4 rounded-lg border bg-muted/30">
                <h3 className="font-semibold text-lg">{reward.name}</h3>
                {reward.description && <p className="text-sm text-muted-foreground mt-1">{reward.description}</p>}
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="outline" className="gap-1">
                    {redemptionIcons[reward.redemption_method]}
                    {redemptionLabels[reward.redemption_method]}
                  </Badge>
                </div>
              </div>

              {/* Points Summary */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Your balance</span>
                  <span className="font-medium">
                    {pointsBalance} {pointsCurrency}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Reward cost</span>
                  <span className="font-medium text-destructive">
                    -{reward.points_cost} {pointsCurrency}
                  </span>
                </div>
                <div className="border-t pt-3 flex justify-between items-center">
                  <span className="font-medium">Balance after</span>
                  <span className={`font-bold text-lg ${remainingBalance >= 0 ? "text-success" : "text-destructive"}`}>
                    {remainingBalance} {pointsCurrency}
                  </span>
                </div>
              </div>

              {/* Instructions */}
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-muted-foreground">
                {redemptionInstructions[reward.redemption_method]}
              </div>

              {!canAfford && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" />
                  You don't have enough {pointsCurrency} for this reward
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleConfirm} disabled={!canAfford} className="flex-1">
                  Confirm Redemption
                </Button>
              </div>

              {isPreview && (
                <p className="text-xs text-muted-foreground text-center">
                  This is a preview. No actual redemption will occur.
                </p>
              )}
            </div>
          </>
        )}

        {/* Processing State */}
        {state === "processing" && (
          <div className="py-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <h3 className="font-semibold text-lg">Processing Redemption...</h3>
            <p className="text-muted-foreground mt-1">Please wait</p>
          </div>
        )}

        {/* Success State */}
        {state === "success" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-success">
                <CheckCircle2 className="h-5 w-5" />
                Reward Redeemed!
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 pt-4">
              <div className="text-center">
                <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                  <Gift className="h-8 w-8 text-success" />
                </div>
                <h3 className="font-semibold text-lg">{reward.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Successfully redeemed for {reward.points_cost} {pointsCurrency}
                </p>
              </div>

              {/* Show code for voucher/code_display */}
              {redemptionCode && reward.redemption_method !== "manual_fulfillment" && (
                <div className="p-4 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 text-center">
                  <p className="text-xs text-muted-foreground mb-2">Your redemption code</p>
                  <div className="flex items-center justify-center gap-2">
                    <code className="text-2xl font-mono font-bold tracking-wider text-primary">{redemptionCode}</code>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopyCode}>
                      {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  {reward.redemption_method === "voucher" && (
                    <p className="text-xs text-muted-foreground mt-3">Use this code at checkout to apply your reward</p>
                  )}
                  {reward.redemption_method === "code_display" && (
                    <p className="text-xs text-muted-foreground mt-3">Show this code to claim your reward</p>
                  )}
                </div>
              )}

              {/* Manual fulfillment message */}
              {reward.redemption_method === "manual_fulfillment" && (
                <div className="p-4 rounded-lg bg-muted text-center">
                  <Wrench className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    The club will fulfill this reward. Check your email or contact the club for pickup/delivery details.
                  </p>
                </div>
              )}

              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </div>
          </>
        )}

        {/* Error State */}
        {state === "error" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Redemption Failed
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 pt-4">
              <div className="text-center">
                <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
                <p className="text-muted-foreground">{errorMessage}</p>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Close
                </Button>
                <Button onClick={() => setState("confirm")} className="flex-1">
                  Try Again
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
