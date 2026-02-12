// FULL FILE — READY TO PASTE

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
import { ArrowLeft, Gift, Loader2, Trophy, Star } from "lucide-react";
import { Reward, FanMembership, LoyaltyProgram, RewardRedemption } from "@/types/database";

interface RedemptionWithReward extends RewardRedemption {
  rewards?: {
    name: string;
    description: string | null;
  };
}

interface TierBenefit {
  benefit_type: string;
  benefit_value: number;
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
  const [tierBenefits, setTierBenefits] = useState<TierBenefit[]>([]);

  const [dataLoading, setDataLoading] = useState(true);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [redemptionModalOpen, setRedemptionModalOpen] = useState(false);
  const [redeeming, setRedeeming] = useState(false);

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

      setRewards((rewardsData ?? []) as Reward[]);

      const { data: redemptionsData } = await supabase
        .from("reward_redemptions")
        .select(`*, rewards(name, description)`)
        .eq("fan_id", profile.id)
        .order("redeemed_at", { ascending: false });

      setRedemptions((redemptionsData ?? []) as RedemptionWithReward[]);

      /** 🔥 Fetch tier benefits */
      const { data: benefits } = await supabase
        .from("membership_tier_state")
        .select(`tier_benefits(benefit_type, benefit_value)`)
        .eq("membership_id", m.id)
        .maybeSingle();

      setTierBenefits((benefits?.tier_benefits ?? []) as TierBenefit[]);
    } catch (err) {
      console.error("FanRewards fetch error:", err);
      toast({ title: "Error loading rewards", variant: "destructive" });
    } finally {
      setDataLoading(false);
    }
  };

  const discount = tierBenefits.find((b) => b.benefit_type === "discount_percent")?.benefit_value ?? 0;

  const applyDiscount = (cost: number) => Math.ceil(cost * (1 - discount / 100));

  const handleConfirmRedeem = async () => {
    if (!membership || !selectedReward) return { success: false };

    setRedeeming(true);

    try {
      const { data, error } = await (supabase.rpc as any)("redeem_reward", {
        p_membership_id: membership.id,
        p_reward_id: selectedReward.id,
      });

      if (error) throw error;

      toast({ title: "Reward redeemed!", description: data ? `Code: ${data}` : undefined });

      setRedemptionModalOpen(false);
      setSelectedReward(null);
      await fetchData();

      return { success: true };
    } catch (err: any) {
      toast({
        title: "Redemption failed",
        description: err?.message,
        variant: "destructive",
      });
      return { success: false };
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

  const balance = membership?.points_balance ?? 0;
  const currency = program?.points_currency_name ?? "Points";

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="fan" />}

      <header className="border-b bg-card">
        <div className="container py-4 flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/fan/home")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <Logo />
        </div>
      </header>

      <main className="container py-8">
        <div className="flex justify-between mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Gift className="h-8 w-8 text-accent" /> Rewards
          </h1>

          <div className="flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2">
            <Trophy className="h-5 w-5 text-primary" />
            <span className="font-bold">{balance}</span>
            <span className="text-muted-foreground">{currency}</span>
          </div>
        </div>

        {discount > 0 && (
          <Badge className="mb-4 bg-green-100 text-green-700">
            <Star className="h-3 w-3 mr-1" />
            {discount}% Tier Discount Applied
          </Badge>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {rewards.map((reward) => {
            const finalCost = applyDiscount(reward.points_cost);
            const canAfford = balance >= finalCost;

            return (
              <Card key={reward.id}>
                <CardContent className="pt-6">
                  <h3 className="font-semibold">{reward.name}</h3>
                  <p className="text-sm text-muted-foreground">{reward.description}</p>

                  {discount > 0 ? (
                    <div className="mt-3">
                      <p className="line-through text-sm text-muted-foreground">
                        {reward.points_cost} {currency}
                      </p>
                      <Badge>
                        {finalCost} {currency}
                      </Badge>
                    </div>
                  ) : (
                    <Badge className="mt-3">
                      {reward.points_cost} {currency}
                    </Badge>
                  )}

                  <Button
                    className="mt-4 w-full"
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
      </main>

      <RewardRedemptionModal
        isOpen={redemptionModalOpen}
        onClose={() => setRedemptionModalOpen(false)}
        reward={selectedReward}
        pointsBalance={balance}
        pointsCurrency={currency}
        onConfirmRedeem={handleConfirmRedeem}
        isPreview={isPreviewMode}
      />
    </div>
  );
}
