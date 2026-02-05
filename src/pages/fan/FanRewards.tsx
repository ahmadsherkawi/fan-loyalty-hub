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
import {
  ArrowLeft,
  Gift,
  Loader2,
  Trophy,
  AlertCircle,
  History,
  CheckCircle2,
  Clock,
  Ticket,
  Wrench,
  Code,
} from "lucide-react";
import { Reward, FanMembership, LoyaltyProgram, RewardRedemption, RedemptionMethod } from "@/types/database";

interface RedemptionWithReward extends RewardRedemption {
  rewards?: {
    name: string;
    description: string | null;
    redemption_method: RedemptionMethod;
  };
}

const redemptionIcons: Record<RedemptionMethod, React.ReactNode> = {
  voucher: <Ticket className="h-4 w-4" />,
  manual_fulfillment: <Wrench className="h-4 w-4" />,
  code_display: <Code className="h-4 w-4" />,
};

const redemptionLabels: Record<RedemptionMethod, string> = {
  voucher: "Digital Voucher",
  manual_fulfillment: "Fulfilled by Club",
  code_display: "Display Code",
};

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
  const [activeTab, setActiveTab] = useState("available");

  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [redemptionModalOpen, setRedemptionModalOpen] = useState(false);
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    if (!isPreviewMode && !loading && profile) fetchData();
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

      const { data: programs } = await supabase.from("loyalty_programs").select("*").eq("id", m.program_id).single();

      setProgram(programs as LoyaltyProgram);

      const { data: rews } = await supabase
        .from("rewards")
        .select("*")
        .eq("program_id", m.program_id)
        .eq("is_active", true);

      setRewards((rews ?? []) as Reward[]);

      const { data: redemptionsData } = await supabase
        .from("reward_redemptions")
        .select(
          `
          *,
          rewards (
            name,
            description,
            redemption_method
          )
        `,
        )
        .eq("fan_id", profile.id)
        .order("redeemed_at", { ascending: false });

      setRedemptions((redemptionsData ?? []) as RedemptionWithReward[]);
    } catch (err) {
      console.error("FanRewards fetch error:", err);
    } finally {
      setDataLoading(false);
    }
  };

  /**
   * SECURE REDEMPTION USING RPC
   */
  const handleConfirmRedeem = async (): Promise<{ success: boolean; code?: string | null; error?: string }> => {
    if (!membership || !selectedReward) {
      return { success: false, error: "Missing required data" };
    }

    setRedeeming(true);

    try {
      const { data, error } = await supabase.rpc("redeem_reward", {
        p_membership_id: membership.id,
        p_reward_id: selectedReward.id,
      });

      if (error) throw error;

      toast({
        title: "Reward redeemed!",
        description: "Your redemption was successful.",
      });

      await fetchData();

      return { success: true, code: data ?? null };
    } catch (err: any) {
      return { success: false, error: err.message ?? "Redemption failed" };
    } finally {
      setRedeeming(false);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  if (!isPreviewMode && (loading || dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="fan" />}

      <header className="border-b bg-card">
        <div className="container py-4 flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/fan/home")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Logo />
        </div>
      </header>

      <main className="container py-8">
        <div className="flex justify-between mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Gift className="h-8 w-8 text-accent" />
            Rewards
          </h1>

          <div className="flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2">
            <Trophy className="h-5 w-5 text-primary" />
            <span className="font-bold">{membership?.points_balance ?? 0}</span>
            <span className="text-muted-foreground">{program?.points_currency_name}</span>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 max-w-md">
            <TabsTrigger value="available">Available</TabsTrigger>
            <TabsTrigger value="history">My Redemptions</TabsTrigger>
          </TabsList>

          <TabsContent value="available">
            <div className="grid md:grid-cols-3 gap-6 mt-6">
              {rewards.map((reward) => {
                const canAfford = (membership?.points_balance ?? 0) >= reward.points_cost;

                return (
                  <Card key={reward.id}>
                    <CardContent className="pt-6">
                      <h3 className="font-semibold">{reward.name}</h3>
                      <p className="text-sm text-muted-foreground">{reward.description}</p>

                      <Button
                        className="mt-4"
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
            <div className="space-y-4 mt-6">
              {redemptions.map((r) => (
                <Card key={r.id}>
                  <CardContent className="py-4 flex justify-between">
                    <div>
                      <p className="font-semibold">{r.rewards?.name}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(r.redeemed_at)}</p>
                    </div>
                    <Badge>-{r.points_spent}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <RewardRedemptionModal
        isOpen={redemptionModalOpen}
        onClose={() => setRedemptionModalOpen(false)}
        reward={selectedReward}
        pointsBalance={membership?.points_balance ?? 0}
        pointsCurrency={program?.points_currency_name ?? "Points"}
        onConfirmRedeem={handleConfirmRedeem}
        isPreview={isPreviewMode}
      />
    </div>
  );
}
