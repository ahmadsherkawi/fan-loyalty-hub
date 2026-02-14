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
import { ArrowLeft, Gift, Loader2, Trophy, Percent, LogOut } from "lucide-react";

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
  const { profile, signOut, loading } = useAuth();
  const { toast } = useToast();

  const isPreviewMode = searchParams.get("preview") === "fan";

  const [membership, setMembership] = useState<FanMembership | null>(null);
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
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
      /* ---------- Membership ---------- */
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

      /* ---------- Program ---------- */
      const { data: programData } = await supabase.from("loyalty_programs").select("*").eq("id", m.program_id).single();

      setProgram(programData as LoyaltyProgram);

      /* ---------- Rewards ---------- */
      const { data: rewardsData } = await supabase.from("rewards").select("*").eq("program_id", m.program_id);

      setRewards((rewardsData ?? []) as Reward[]);

      /* ---------- Redemption history ---------- */
      const { data: redemptionsData } = await supabase
        .from("reward_redemptions")
        .select(`*, rewards (name, description)`)
        .eq("fan_id", profile.id)
        .order("redeemed_at", { ascending: false });

      setRedemptions((redemptionsData ?? []) as RedemptionWithReward[]);

      /* ---------- REAL backend discount ---------- */
      const { data: discountData, error: discountError } = await supabase.rpc("get_membership_discount", {
        p_membership_id: m.id,
      });

      if (discountError) throw discountError;

      setDiscountPercent(Number(discountData ?? 0));
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

      toast({
        title: "Reward redeemed!",
        description: `Spent ${data.final_cost} ${currency}. New balance: ${data.balance_after}.`,
      });

      setRedemptionModalOpen(false);
      setSelectedReward(null);
      await fetchData();

      return { success: true };
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

  /* ================= LOADING ================= */
  if (!isPreviewMode && (loading || dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const balance = membership?.points_balance ?? 0;
  const currency = program?.points_currency_name ?? "Points";

  /* ================= UI ================= */
  return (
    <div className="min-h-screen gradient-hero text-foreground">
      {isPreviewMode && <PreviewBanner role="fan" />}

      {/* HEADER */}
      <header className="relative border-b border-border/40 overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-40" />
        <div className="relative container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/fan/home")} className="rounded-full text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Logo size="sm" />
          </div>
          <Button variant="ghost" onClick={handleSignOut} className="rounded-full text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </header>

      {/* HERO */}
      <section className="relative py-10 overflow-hidden">
        <div className="absolute inset-0 stadium-pattern" />
        <div className="relative container">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-3xl md:text-4xl font-display font-bold flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl gradient-golden flex items-center justify-center shadow-golden">
                <Gift className="h-6 w-6 text-accent-foreground" />
              </div>
              Rewards
            </h1>

            <div className="flex items-center gap-2 glass-dark rounded-full px-5 py-2.5">
              <Trophy className="h-5 w-5 text-accent" />
              <span className="font-display font-bold text-accent">{balance}</span>
              <span className="text-muted-foreground">{currency}</span>
            </div>
          </div>

          {discountPercent > 0 && (
            <div className="mt-4 flex items-center gap-2 text-sm text-primary font-semibold">
              <Percent className="h-4 w-4" />
              {discountPercent}% tier discount applied
            </div>
          )}
        </div>
      </section>

      <main className="container pb-10">
        <Tabs defaultValue="available">
          <TabsList className="grid grid-cols-2 max-w-md rounded-full h-11 bg-card/50 backdrop-blur-sm border border-border/30">
            <TabsTrigger value="available" className="rounded-full">Available</TabsTrigger>
            <TabsTrigger value="history" className="rounded-full">My Redemptions</TabsTrigger>
          </TabsList>

          {/* AVAILABLE */}
          <TabsContent value="available">
            <div className="grid md:grid-cols-3 gap-6 mt-6">
              {rewards.map((reward) => {
                const originalCost = reward.points_cost;
                const discountAmount = Math.round(originalCost * (discountPercent / 100));
                const finalCost = originalCost - discountAmount;
                const canAfford = balance >= finalCost;

                return (
                  <Card key={reward.id} className="rounded-3xl border-border/30 bg-card/50 backdrop-blur-sm card-hover">
                    <CardContent className="pt-6">
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

                      <Badge className="mt-2 rounded-full bg-accent/20 text-accent border-accent/30">
                        Cost: {finalCost} {currency}
                      </Badge>

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

          {/* HISTORY */}
          <TabsContent value="history">
            <div className="space-y-4 mt-6">
              {redemptions.map((r) => (
                <Card key={r.id} className="rounded-3xl border-border/30 bg-card/50 backdrop-blur-sm">
                  <CardContent className="py-4 flex justify-between">
                    <div>
                      <p className="font-display font-semibold text-foreground">{r.rewards?.name}</p>
                      <p className="text-sm text-muted-foreground">{new Date(r.redeemed_at).toLocaleDateString()}</p>
                    </div>
                    <Badge className="rounded-full bg-destructive/20 text-destructive border-destructive/30">-{r.points_spent}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* MODAL */}
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
