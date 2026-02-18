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
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/fan/home")} className="rounded-full text-muted-foreground hover:text-foreground h-9">
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
            </Button>
            <Logo size="sm" />
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="rounded-full text-muted-foreground hover:text-foreground h-9">
            <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sign out
          </Button>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        {/* HERO */}
        <div className="relative overflow-hidden rounded-3xl border border-border/40">
          <div className="absolute inset-0 gradient-hero" />
          <div className="absolute inset-0 stadium-pattern" />
          <div className="absolute inset-0 pitch-lines opacity-30" />

          <div className="relative z-10 p-6 md:p-10">
            <div className="flex justify-between items-center gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-3.5 w-3.5 text-accent" />
                  <span className="text-[11px] font-semibold text-accent uppercase tracking-widest">Redeem</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight">Rewards</h1>
              </div>

              <div className="flex items-center gap-3">
                {discountPercent > 0 && (
                  <div className="glass-dark rounded-2xl px-4 py-2.5 flex items-center gap-1.5 text-sm text-accent font-semibold">
                    <Percent className="h-4 w-4" />
                    {discountPercent}% off
                  </div>
                )}
                <div className="glass-dark rounded-2xl px-5 py-3 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-accent" />
                  <span className="font-display font-bold text-gradient-accent">{balance}</span>
                  <span className="text-white/50 text-sm">{currency}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TABS */}
        <Tabs defaultValue="available">
          <TabsList className="grid grid-cols-2 max-w-sm rounded-full h-10 bg-card border border-border/40 p-1">
            <TabsTrigger value="available" className="rounded-full text-xs font-semibold">Available</TabsTrigger>
            <TabsTrigger value="history" className="rounded-full text-xs font-semibold">My Redemptions</TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="mt-6">
            <div className="grid md:grid-cols-3 gap-4">
              {rewards.map((reward) => {
                const originalCost = reward.points_cost;
                const discountAmount = Math.round(originalCost * (discountPercent / 100));
                const finalCost = reward.final_cost ?? originalCost - discountAmount;
                const canAfford = balance >= finalCost;

                return (
                  <div key={reward.id} className="relative overflow-hidden rounded-3xl bg-card border border-border/50 p-5 card-hover flex flex-col gap-3">
                    <div className="absolute inset-0 bg-gradient-to-br from-accent/8 to-transparent pointer-events-none rounded-3xl" />
                    <div className="relative z-10 flex items-start justify-between gap-2">
                      <div className="h-10 w-10 rounded-2xl bg-accent/15 flex items-center justify-center flex-shrink-0">
                        <Gift className="h-5 w-5 text-accent" />
                      </div>
                      <Badge className="rounded-full bg-accent/15 text-accent border-accent/25 text-xs shrink-0">
                        {finalCost} {currency}
                      </Badge>
                    </div>
                    <div className="relative z-10 flex-1">
                      <h3 className="font-display font-bold text-foreground text-sm">{reward.name}</h3>
                      {reward.description && <p className="text-xs text-muted-foreground mt-0.5">{reward.description}</p>}
                      {discountPercent > 0 && (
                        <p className="text-xs text-primary mt-1">−{discountPercent}% discount applied</p>
                      )}
                      {reward.days_to_reach !== null && reward.days_to_reach !== undefined && (
                        <p className="text-xs text-muted-foreground mt-1">~{Math.ceil(reward.days_to_reach)} days to unlock</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      className="relative z-10 w-full rounded-2xl gradient-golden font-semibold text-xs mt-auto"
                      disabled={!canAfford || redeeming}
                      onClick={() => { setSelectedReward(reward); setRedemptionModalOpen(true); }}
                    >
                      {canAfford ? "Redeem" : "Need more points"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <div className="space-y-3">
              {redemptions.length === 0 ? (
                <div className="rounded-3xl bg-card border border-border/40 p-12 text-center text-muted-foreground text-sm">
                  No redemptions yet. Redeem your first reward!
                </div>
              ) : redemptions.map((r) => {
                const isFulfilled = r.fulfilled_at !== null;
                const redemptionMethod = r.rewards?.redemption_method || "manual_fulfillment";
                const copyCode = (code: string) => { navigator.clipboard.writeText(code); sonnerToast.success("Code copied!"); };

                return (
                  <div key={r.id} className="relative overflow-hidden rounded-3xl bg-card border border-border/50 px-5 py-4">
                    <div className="absolute inset-0 bg-gradient-to-r from-accent/5 to-transparent rounded-3xl pointer-events-none" />
                    <div className="relative z-10 flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-foreground text-sm">{r.rewards?.name}</p>
                          {isFulfilled ? (
                            <Badge className="rounded-full bg-green-500/15 text-green-600 border-green-500/25 text-xs"><CheckCircle className="h-3 w-3 mr-1" />Fulfilled</Badge>
                          ) : redemptionMethod === "manual_fulfillment" ? (
                            <Badge className="rounded-full bg-orange-500/15 text-orange-600 border-orange-500/25 text-xs"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
                          ) : (
                            <Badge className="rounded-full bg-primary/15 text-primary border-primary/25 text-xs">Ready</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{new Date(r.redeemed_at).toLocaleDateString()}</p>
                        {r.redemption_code && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="bg-muted rounded-xl px-3 py-1.5 font-mono text-xs">{r.redemption_code}</div>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-xl" onClick={() => copyCode(r.redemption_code!)}>
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <Badge className="rounded-full bg-destructive/10 text-destructive border-destructive/20 text-xs shrink-0">-{r.points_spent}</Badge>
                    </div>
                  </div>
                );
              })}
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
