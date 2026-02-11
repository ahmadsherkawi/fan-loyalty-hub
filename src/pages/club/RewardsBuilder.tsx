import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Logo } from "@/components/ui/Logo";
import { PreviewBanner } from "@/components/ui/PreviewBanner";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Gift, Ticket, Wrench, Code, Loader2, Trash2, Edit, HelpCircle } from "lucide-react";
import { Reward, RedemptionMethod, LoyaltyProgram } from "@/types/database";

const redemptionLabels: Record<RedemptionMethod, string> = {
  voucher: "Digital Voucher",
  manual_fulfillment: "Manual Fulfillment",
  code_display: "Code Display",
};

const redemptionDescriptions: Record<RedemptionMethod, string> = {
  voucher: "Fan receives a digital voucher code to use at your shop or venue",
  manual_fulfillment: "You manually fulfill the reward (e.g., physical item, experience)",
  code_display: "Fan sees a code on screen to show at point of redemption",
};

const redemptionIcons: Record<RedemptionMethod, React.ReactNode> = {
  voucher: <Ticket className="h-4 w-4" />,
  manual_fulfillment: <Wrench className="h-4 w-4" />,
  code_display: <Code className="h-4 w-4" />,
};

export default function RewardsBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();

  const isPreviewMode = searchParams.get("preview") === "club_admin";

  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pointsCost, setPointsCost] = useState("500");
  const [quantityLimit, setQuantityLimit] = useState("");
  const [redemptionMethod, setRedemptionMethod] = useState<RedemptionMethod>("voucher");
  const [voucherCode, setVoucherCode] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (isPreviewMode) {
      setProgram({
        id: "preview-program",
        club_id: "preview-club",
        name: "Demo Rewards",
        description: null,
        points_currency_name: "Points",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setRewards([]);
      setDataLoading(false);
    } else {
      if (!loading && !user) {
        navigate("/auth?role=club_admin");
      } else if (!loading && profile?.role !== "club_admin") {
        navigate("/fan/home");
      } else if (!loading && profile) {
        fetchData();
      }
    }
  }, [user, profile, loading, navigate, isPreviewMode]);

  const fetchData = async () => {
    if (!profile) return;
    setDataLoading(true);

    try {
      const { data: clubs } = await supabase.from("clubs").select("id").eq("admin_id", profile.id).limit(1);

      if (!clubs || clubs.length === 0) {
        navigate("/club/onboarding");
        return;
      }

      const { data: programs } = await supabase
        .from("loyalty_programs")
        .select("*")
        .eq("club_id", clubs[0].id)
        .limit(1);

      if (!programs || programs.length === 0) {
        navigate("/club/dashboard");
        return;
      }

      setProgram(programs[0] as LoyaltyProgram);

      // ✅ UPDATED — fetch real redeemed count from DB
      const { data: rewardsData } = await supabase
        .from("rewards")
        .select(
          `
          *,
          reward_redemptions(count)
        `,
        )
        .eq("program_id", programs[0].id)
        .order("created_at", { ascending: false });

      setRewards(
        (rewardsData || []).map((r: any) => ({
          ...r,
          quantity_redeemed: r.reward_redemptions?.[0]?.count || 0,
        })),
      );
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setDataLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setPointsCost("500");
    setQuantityLimit("");
    setRedemptionMethod("voucher");
    setVoucherCode("");
    setIsActive(true);
    setEditingReward(null);
  };

  const openEditDialog = (reward: Reward) => {
    setEditingReward(reward);
    setName(reward.name);
    setDescription(reward.description || "");
    setPointsCost(reward.points_cost.toString());
    setQuantityLimit(reward.quantity_limit?.toString() || "");
    setRedemptionMethod(reward.redemption_method);
    setVoucherCode(reward.voucher_code || "");
    setIsActive(reward.is_active);
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!program) return;

    const cost = parseInt(pointsCost);
    if (isNaN(cost) || cost <= 0) {
      toast({
        title: "Invalid Points Cost",
        description: "Points cost must be a positive number.",
        variant: "destructive",
      });
      return;
    }

    if (isPreviewMode) {
      const newReward: Reward = {
        id: `preview-${Date.now()}`,
        program_id: program.id,
        name,
        description: description || null,
        points_cost: cost,
        quantity_limit: quantityLimit ? parseInt(quantityLimit) : null,
        quantity_redeemed: 0,
        redemption_method: redemptionMethod,
        voucher_code: voucherCode || null,
        is_active: isActive,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (editingReward) {
        setRewards(rewards.map((r) => (r.id === editingReward.id ? newReward : r)));
        toast({ title: "Reward Updated" });
      } else {
        setRewards([newReward, ...rewards]);
        toast({ title: "Reward Created" });
      }

      setIsDialogOpen(false);
      resetForm();
      return;
    }

    setIsSubmitting(true);

    try {
      const rewardData = {
        program_id: program.id,
        name,
        description: description || null,
        points_cost: cost,
        quantity_limit: quantityLimit ? parseInt(quantityLimit) : null,
        redemption_method: redemptionMethod,
        voucher_code: voucherCode || null,
        is_active: isActive,
      };

      if (editingReward) {
        await supabase.from("rewards").update(rewardData).eq("id", editingReward.id);
        toast({ title: "Reward Updated" });
      } else {
        await supabase.from("rewards").insert(rewardData);
        toast({ title: "Reward Created" });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save reward",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (rewardId: string) => {
    if (!confirm("Are you sure you want to delete this reward?")) return;

    if (isPreviewMode) {
      setRewards(rewards.filter((r) => r.id !== rewardId));
      toast({ title: "Reward Deleted" });
      return;
    }

    try {
      await supabase.from("rewards").delete().eq("id", rewardId);
      toast({ title: "Reward Deleted" });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete reward",
        variant: "destructive",
      });
    }
  };

  if (!isPreviewMode && (loading || dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="club_admin" />}
      <header className="border-b bg-card">
        <div className="container py-4 flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/club/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <Logo />
        </div>
      </header>

      <main className="container py-8">
        {rewards.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">No rewards yet</h3>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Create Reward
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewards.map((reward) => (
              <Card key={reward.id}>
                <CardContent className="pt-6">
                  <h3 className="font-semibold">{reward.name}</h3>

                  <div className="flex gap-2 mt-3">
                    <Badge>{redemptionLabels[reward.redemption_method]}</Badge>

                    {reward.quantity_limit && (
                      <Badge variant="secondary">
                        {reward.quantity_redeemed}/{reward.quantity_limit} redeemed
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
