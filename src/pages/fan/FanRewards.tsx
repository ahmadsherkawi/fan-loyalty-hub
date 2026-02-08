import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/ui/Logo";
import { PreviewBanner } from "@/components/ui/PreviewBanner";
import { RewardRedemptionModal } from "@/components/ui/RewardRedemptionModal";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Gift, Loader2, Trophy, Clock, CheckCircle2, Sparkles } from "lucide-react";
import { Reward, FanMembership, LoyaltyProgram, RewardRedemption } from "@/types/database";

interface RedemptionWithReward extends RewardRedemption {
  rewards?: {
    name: string;
    description: string | null;
  };
}

export default function FanRewards() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, loading } = useAuth();
  const { toast } = useToast();

  const isPreviewMode = searchParams.get("preview") === "fan";

  const [membership, setMembership] = useState<FanMembership | null>(null);
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionWithReward[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [redemptionModalOpen, setRedemptionModalOpen] = useState(false);
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    if (isPreviewMode) {
      setDataLoading(false);
      return;
    }
    if (!loading && profile) {
      fetchData();
    }
  }, [profile, loading, isPreviewMode]);

  const fetchData = async () => {
    if (!profile) return;
    setDataLoading(true);
    try {
      const { data: memberships } = await supabase
        .from("fan_memberships")
        .select("*")
        .eq("fan_id", profile.id)
        .limit(1);
      if (!memberships?.length) {
        navigate("/fan/join");
        return;
      }
      const m = memberships[0] as FanMembership;
      setMembership(m);

      const { data: programData } = await supabase
        .from("loyalty_programs")
        .select("*")
        .eq("id", m.program_id)
        .single();
      setProgram(programData as LoyaltyProgram);

      const { data: rewardsData } = await supabase
        .from("rewards")
        .select("*")
        .eq("program_id", m.program_id)
        .eq("is_active", true);
      setRewards((rewardsData ?? []) as Reward[]);

      const { data: redemptionsData } = await supabase
        .from("reward_redemptions")
        .select(`*, rewards (name, description)`)
        .eq("fan_id", profile.id)
        .order("redeemed_at", { ascending: false });
      setRedemptions((redemptionsData ?? []) as RedemptionWithReward[]);
    } catch (err) {
      console.error("FanRewards fetch error:", err);
      toast({
        title: "Error loading rewards",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDataLoading(false);
    }
  };

  const handleConfirmRedeem = async (): Promise<{
    success: boolean;
    code?: string | null;
    error?: string;
  }> => {
    if (!membership || !selectedReward) {
      return { success: false, error: "Missing required data" };
    }
    if (isPreviewMode) {
      return { success: true };
    }
    setRedeeming(true);
    try {
      // Use spend_points RPC + manual insert as redeem_reward may not exist
      const { data: spent, error: spendErr } = await supabase.rpc("spend_points", {
        p_membership_id: membership.id,
        p_points: selectedReward.points_cost,
      });
      if (spendErr) throw spendErr;
      if (!spent) throw new Error("Insufficient points");

      const code = selectedReward.voucher_code || null;
      const { error: insertErr } = await supabase.from("reward_redemptions").insert({
        reward_id: selectedReward.id,
        fan_id: membership.fan_id,
        membership_id: membership.id,
        points_spent: selectedReward.points_cost,
        redemption_code: code,
      });
      if (insertErr) throw insertErr;

      toast({
        title: "Reward redeemed!",
        description: code ? `Your code: ${code}` : "Your redemption was successful.",
      });
      setRedemptionModalOpen(false);
      setSelectedReward(null);
      await fetchData();
      return { success: true, code };
    } catch (err: any) {
      const message = err?.message || "Redemption failed. Please try again.";
      toast({
        title: "Redemption failed",
        description: message,
        variant: "destructive",
      });
      return { success: false, error: message };
    } finally {
      setRedeeming(false);
    }
  };

  if (!isPreviewMode && (loading || dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pointsBalance = membership?.points_balance ?? 0;

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="fan" />}

      {/* ─── HEADER ─── */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="flex items-center justify-between px-5 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/fan/home")}
            className="gap-2 rounded-full -ml-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-2 bg-primary/8 rounded-full px-3 py-1.5">
            <Trophy className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold">{pointsBalance}</span>
            <span className="text-xs text-muted-foreground">
              {program?.points_currency_name || "pts"}
            </span>
          </div>
        </div>
      </header>

      <main className="px-5 py-6 max-w-2xl mx-auto">
        {/* Title */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-display font-bold flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-accent/10 flex items-center justify-center">
              <Gift className="h-5 w-5 text-accent" />
            </div>
            Rewards
          </h1>
        </motion.div>

        <Tabs defaultValue="available">
          <TabsList className="grid grid-cols-2 max-w-xs rounded-full bg-muted/50 p-1">
            <TabsTrigger
              value="available"
              className="rounded-full text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Available
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="rounded-full text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <Clock className="h-3 w-3 mr-1" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Available rewards */}
          <TabsContent value="available" className="mt-5">
            {rewards.length === 0 ? (
              <motion.div
                className="card-fan p-10 text-center"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Gift className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">
                  No rewards available yet
                </p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  Keep earning points — rewards are coming!
                </p>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {rewards.map((reward, i) => {
                  const canAfford = pointsBalance >= reward.points_cost;
                  return (
                    <motion.div
                      key={reward.id}
                      className={`card-fan card-press p-5 flex flex-col gap-3 ${
                        canAfford ? "glow-affordable" : ""
                      }`}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="h-10 w-10 rounded-2xl bg-accent/10 flex items-center justify-center">
                          <Gift className="h-5 w-5 text-accent" />
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-xs font-bold px-2.5 ${
                            canAfford
                              ? "bg-primary/10 text-primary border-primary/20"
                              : "text-muted-foreground"
                          }`}
                        >
                          {reward.points_cost} pts
                        </Badge>
                      </div>

                      <div className="flex-1">
                        <h3 className="font-semibold text-sm leading-tight">
                          {reward.name}
                        </h3>
                        {reward.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {reward.description}
                          </p>
                        )}
                      </div>

                      <Button
                        className={`w-full rounded-xl h-9 text-xs font-semibold ${
                          canAfford ? "gradient-stadium text-white" : ""
                        }`}
                        disabled={!canAfford || redeeming}
                        onClick={() => {
                          setSelectedReward(reward);
                          setRedemptionModalOpen(true);
                        }}
                      >
                        {canAfford ? "Redeem Now" : "Not enough points"}
                      </Button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* History */}
          <TabsContent value="history" className="mt-5">
            {redemptions.length === 0 ? (
              <motion.div
                className="card-fan p-10 text-center"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Gift className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">
                  No redemptions yet
                </p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  Redeem your first reward above!
                </p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {redemptions.map((r, i) => (
                  <motion.div
                    key={r.id}
                    className="card-fan p-4 flex items-center gap-4"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <div className="h-10 w-10 rounded-2xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                      {r.fulfilled_at ? (
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      ) : (
                        <Clock className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {r.rewards?.name ?? "Reward"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(r.redeemed_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="text-xs font-bold bg-destructive/8 text-destructive border-0"
                    >
                      -{r.points_spent}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <RewardRedemptionModal
        isOpen={redemptionModalOpen}
        onClose={() => setRedemptionModalOpen(false)}
        reward={selectedReward}
        pointsBalance={pointsBalance}
        pointsCurrency={program?.points_currency_name ?? "Points"}
        onConfirmRedeem={handleConfirmRedeem}
        isPreview={isPreviewMode}
      />
    </div>
  );
}
