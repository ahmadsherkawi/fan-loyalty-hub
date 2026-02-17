import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/ui/Logo";
import { PreviewBanner } from "@/components/ui/PreviewBanner";
import { RewardRedemptionModal } from "@/components/ui/RewardRedemptionModal";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Gift, Loader2, Trophy, Percent, LogOut, Sparkles, Clock, CheckCircle, Copy } from "lucide-react";
import { toast as sonnerToast } from "sonner";

import { Reward, FanMembership, LoyaltyProgram, RewardRedemption } from "@/types/database";

interface RedemptionWithReward extends RewardRedemption {
  rewards?: {
    name: string;
    description: string | null;
    redemption_method?: string;
  };
}

interface RewardWithIntelligence extends Reward {
  final_cost?: number;
  days_to_reach?: number | null;
  points_needed?: number | null;
}

export default function FanRewards() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, signOut, loading } = useAuth();
  const { toast } = useToast();

  const isPreviewMode = searchParams.get("preview") === "fan";

  const [membership, setMembership] = useState<FanMembership | null>(null);
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [rewards, setRewards] = useState<RewardWithIntelligence[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionWithReward[]>([]);
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  const [dataLoading, setDataLoading] = useState(true);

  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [redemptionModalOpen, setRedemptionModalOpen] = useState(false);
  const [redeeming, setRedeeming] = useState(false);

  /* ================= FETCH DATA ================= */
  useEffect(() => {
    if (isPreviewMode) {
      setDataLoading(false);
      return;
    }

    if (!loading && profile) fetchData();
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

      const { data: programData } = await supabase.from("loyalty_programs").select("*").eq("id", m.program_id).single();
      setProgram(programData as LoyaltyProgram);

      const { data: rewardsData } = await supabase.from("rewards").select("*").eq("program_id", m.program_id);

      const { data: redemptionsData } = await supabase
        .from("reward_redemptions")
        .select(`*, rewards (name, description)`)
        .eq("fan_id", profile.id)
        .order("redeemed_at", { ascending: false });

      setRedemptions((redemptionsData ?? []) as RedemptionWithReward[]);

      const { data: discountData, error: discountError } = await supabase.rpc("get_membership_discount", {
        p_membership_id: m.id,
      });

      if (discountError) throw discountError;
      setDiscountPercent(Number(discountData ?? 0));

      /* ================= SMART REWARD RECOMMENDATIONS ================= */
      const { data: recData, error: recError } = await supabase.rpc("get_reward_recommendations", {
        p_membership_id: m.id,
      });

      if (recError) throw recError;

      const baseRewards = (rewardsData ?? []) as Reward[];

      const enriched: RewardWithIntelligence[] = baseRewards.map((r) => {
        const rec = recData?.find((x: any) => x.id === r.id);

        return {
          ...r,
          final_cost: rec?.final_cost ?? r.points_cost,
          days_to_reach: rec?.days_to_reach ?? null,
          points_needed: rec?.points_needed ?? null,
        };
      });

      /* sort by smartest unlock order */
      enriched.sort((a, b) => {
        if ((a.points_needed ?? Infinity) !== (b.points_needed ?? Infinity)) {
          return (a.points_needed ?? Infinity) - (b.points_needed ?? Infinity);
        }
        return (a.days_to_reach ?? Infinity) - (b.days_to_reach ?? Infinity);
      });

      setRewards(enriched);
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

  /* ================= REDEEM ================= */
  const handleConfirmRedeem = async () => {
    if (!membership || !selectedReward) {
      return { success: false, error: "Missing required data" };
    }

    if (isPreviewMode) return { success: true };

    setRedeeming(true);

    try {
      const { data, error } = await supabase.rpc("redeem_reward", {
        p_membership_id: membership.id,
        p_reward_id: selectedReward.id,
      });

      if (error) throw error;

      const currency = program?.points_currency_name ?? "Points";

      toast({
        title: "Reward redeemed!",
        description: `Spent ${data.final_cost} ${currency}. New balance: ${data.balance_after}.`,
      });

      setRedemptionModalOpen(false);
      setSelectedReward(null);
      await fetchData();

      return { 
        success: true, 
        final_cost: data.final_cost,
        balance_after: data.balance_after,
        redemption_code: data.redemption_code,
        redemption_method: data.redemption_method,
        reward_name: data.reward_name
      };
    } catch (err: any) {
      const message = err?.message || "Redemption failed.";
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

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (!isPreviewMode && (loading || dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const balance = membership?.points_balance ?? 0;
  const currency = program?.points_currency_name ?? "Points";

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="fan" />}

      {/* HEADER */}
      <header className="relative border-b border-border/40 overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-40" />
        <div className="relative container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/fan/home")}
              className="rounded-full text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <Logo size="sm" />
          </div>
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="rounded-full text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </header>

      <main className="container py-10 space-y-10">
        {/* HERO */}
        <div className="relative overflow-hidden rounded-3xl border border-border/40">
          <div className="absolute inset-0 gradient-hero" />
          <div className="absolute inset-0 stadium-pattern" />
          <div className="absolute inset-0 pitch-lines opacity-30" />

          <div className="relative z-10 p-8 md:p-10">
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-accent" />
                  <span className="text-xs font-semibold text-accent uppercase tracking-wider">Redeem</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight">Rewards</h1>
              </div>

              <div className="glass-dark rounded-2xl px-5 py-3 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-accent" />
                <span className="font-display font-bold text-accent">{balance}</span>
                <span className="text-white/50 text-sm">{currency}</span>
              </div>
            </div>

            {discountPercent > 0 && (
              <div className="mt-4 flex items-center gap-2 text-sm text-accent font-semibold">
                <Percent className="h-4 w-4" />
                {discountPercent}% tier discount applied
              </div>
            )}
          </div>
        </div>

        {/* TABS */}
        <Tabs defaultValue="available">
          <TabsList className="grid grid-cols-2 max-w-md rounded-full h-11 bg-card border border-border/40">
            <TabsTrigger value="available" className="rounded-full">
              Available
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-full">
              My Redemptions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available">
            <div className="grid md:grid-cols-3 gap-4 mt-6">
              {rewards.map((reward) => {
                const originalCost = reward.points_cost;
                const discountAmount = Math.round(originalCost * (discountPercent / 100));
                const finalCost = reward.final_cost ?? originalCost - discountAmount;
                const canAfford = balance >= finalCost;

                return (
                  <Card key={reward.id} className="relative overflow-hidden rounded-2xl border-border/40 card-hover">
                    <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent pointer-events-none" />
                    <CardContent className="relative z-10 pt-6">
                      <h3 className="font-display font-semibold text-foreground">{reward.name}</h3>
                      <p className="text-sm text-muted-foreground">{reward.description}</p>

                      {discountPercent > 0 && (
                        <>
                          <p className="text-xs line-through text-muted-foreground mt-2">
                            {originalCost} {currency}
                          </p>
                          <p className="text-xs text-primary">
                            -{discountAmount} {currency} ({discountPercent}% off)
                          </p>
                        </>
                      )}

                      <Badge className="mt-2 rounded-full bg-accent/10 text-accent border-accent/20">
                        Cost: {finalCost} {currency}
                      </Badge>

                      {reward.days_to_reach !== null && reward.days_to_reach !== undefined && (
                        <p className="text-xs text-muted-foreground mt-1">
                          ~{Math.ceil(reward.days_to_reach)} days to unlock
                        </p>
                      )}

                      <Button
                        className="mt-4 w-full rounded-xl gradient-golden font-semibold"
                        disabled={!canAfford || redeeming}
                        onClick={() => {
                          setSelectedReward(reward);
                          setRedemptionModalOpen(true);
                        }}
                      >
                        Redeem
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <div className="space-y-3 mt-6">
              {redemptions.length === 0 ? (
                <Card className="rounded-2xl border-border/40">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No redemptions yet. Redeem your first reward!
                  </CardContent>
                </Card>
              ) : (
                redemptions.map((r) => {
                  const isFulfilled = r.fulfilled_at !== null;
                  const redemptionMethod = r.rewards?.redemption_method || "manual_fulfillment";
                  
                  const copyCode = (code: string) => {
                    navigator.clipboard.writeText(code);
                    sonnerToast.success("Code copied!");
                  };
                  
                  return (
                    <Card key={r.id} className="relative overflow-hidden rounded-2xl border-border/40">
                      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />
                      <CardContent className="relative z-10 py-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-display font-semibold text-foreground">{r.rewards?.name}</p>
                              {isFulfilled ? (
                                <Badge className="bg-green-100 text-green-700 border-green-200">
                                  <CheckCircle className="h-3 w-3 mr-1" /> Fulfilled
                                </Badge>
                              ) : redemptionMethod === "manual_fulfillment" ? (
                                <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                                  <Clock className="h-3 w-3 mr-1" /> Pending
                                </Badge>
                              ) : (
                                <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                                  Ready to Use
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {new Date(r.redeemed_at).toLocaleDateString()}
                            </p>
                            
                            {r.redemption_code && (
                              <div className="mt-3 flex items-center gap-2">
                                <div className="bg-muted rounded-lg px-3 py-1.5 font-mono text-sm">
                                  {r.redemption_code}
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0"
                                  onClick={() => copyCode(r.redemption_code!)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                          <Badge className="rounded-full bg-destructive/10 text-destructive border-destructive/20">
                            -{r.points_spent}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <RewardRedemptionModal
        isOpen={redemptionModalOpen}
        onClose={() => setRedemptionModalOpen(false)}
        reward={selectedReward}
        discountPercent={discountPercent}
        pointsBalance={balance}
        pointsCurrency={currency}
        onConfirmRedeem={handleConfirmRedeem}
        isPreview={isPreviewMode}
      />
    </div>
  );
}
