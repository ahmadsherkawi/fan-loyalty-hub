import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Logo } from "@/components/ui/Logo";
import { PreviewBanner } from "@/components/ui/PreviewBanner";
import { useToast } from "@/hooks/use-toast";

import { Loader2, ArrowLeft, Plus, Trash2, Edit, Trophy, Sparkles } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

interface Tier {
  id: string;
  program_id: string;
  name: string;
  rank: number;
  points_threshold: number;
  created_at: string;
}

interface TierBenefit {
  id: string;
  tier_id: string;
  benefit_type: string;
  benefit_value: number | null;
  benefit_label: string | null;
}

/* -------------------------------------------------------------------------- */
/*                              BENEFIT OPTIONS                               */
/* -------------------------------------------------------------------------- */

const BENEFIT_TYPES = [
  { value: "points_multiplier", label: "Points Multiplier", needsValue: true, suffix: "× faster points" },
  { value: "reward_discount", label: "Reward Discount", needsValue: true, suffix: "% off rewards" },
  { value: "vip_access", label: "VIP Access", needsValue: false, suffix: "VIP rewards unlocked" },
  { value: "exclusive_badge", label: "Exclusive Badge", needsValue: false, suffix: "Special badge" },
];

/* -------------------------------------------------------------------------- */
/*                                COMPONENT                                   */
/* -------------------------------------------------------------------------- */

export default function TierManagement() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();

  const isPreview = searchParams.get("preview") === "club_admin";

  const [tiers, setTiers] = useState<Tier[]>([]);
  const [benefits, setBenefits] = useState<Record<string, TierBenefit[]>>({});
  const [programId, setProgramId] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<Tier | null>(null);

  const [benefitDialogTier, setBenefitDialogTier] = useState<Tier | null>(null);
  const [benefitType, setBenefitType] = useState("points_multiplier");
  const [benefitValue, setBenefitValue] = useState("");

  const [name, setName] = useState("");
  const [rank, setRank] = useState("1");
  const [threshold, setThreshold] = useState("0");

  /* -------------------------------------------------------------------------- */
  /*                                   AUTH                                     */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    if (isPreview) {
      setTiers([]);
      setDataLoading(false);
      return;
    }

    if (!loading && !user) navigate("/auth?role=club_admin");
    if (!loading && profile?.role !== "club_admin") navigate("/fan/home");
    if (!loading && profile) fetchData();
  }, [loading, user, profile]);

  /* -------------------------------------------------------------------------- */
  /*                                   FETCH                                    */
  /* -------------------------------------------------------------------------- */

  const fetchData = async () => {
    if (!profile) return;

    setDataLoading(true);

    try {
      const { data: clubs } = await supabase.from("clubs").select("id").eq("admin_id", profile.id).limit(1);

      if (!clubs?.length) {
        navigate("/club/onboarding");
        return;
      }

      const { data: programs } = await supabase
        .from("loyalty_programs")
        .select("id")
        .eq("club_id", clubs[0].id)
        .limit(1);

      if (!programs?.length) return;

      const pId = programs[0].id;
      setProgramId(pId);

      const { data: tiersData } = await supabase
        .from("tiers")
        .select("*")
        .eq("program_id", pId)
        .order("rank", { ascending: true });

      const tierList = (tiersData || []) as Tier[];
      setTiers(tierList);

      if (tierList.length) {
        const { data: benefitsData } = await supabase
          .from("tier_benefits")
          .select("*")
          .in(
            "tier_id",
            tierList.map((t) => t.id),
          );

        const grouped: Record<string, TierBenefit[]> = {};

        benefitsData?.forEach((b) => {
          if (!grouped[b.tier_id]) grouped[b.tier_id] = [];
          grouped[b.tier_id].push(b as TierBenefit);
        });

        setBenefits(grouped);
      } else {
        setBenefits({});
      }
    } finally {
      setDataLoading(false);
    }
  };

  /* -------------------------------------------------------------------------- */
  /*                                 TIER SAVE                                  */
  /* -------------------------------------------------------------------------- */

  const handleSave = async () => {
    if (!programId) return;

    const rankNum = parseInt(rank);
    const thresholdNum = parseInt(threshold);

    if (!name || isNaN(rankNum) || isNaN(thresholdNum)) {
      toast({ title: "Invalid data", variant: "destructive" });
      return;
    }

    try {
      if (editingTier) {
        const { error } = await supabase
          .from("tiers")
          .update({ name, rank: rankNum, points_threshold: thresholdNum })
          .eq("id", editingTier.id);

        if (error) throw error;

        toast({ title: "Tier updated" });
      } else {
        const { error } = await supabase.from("tiers").insert({
          program_id: programId,
          name,
          rank: rankNum,
          points_threshold: thresholdNum,
        });

        if (error) throw error;

        toast({ title: "Tier created" });
      }

      resetForm();
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  /* -------------------------------------------------------------------------- */
  /*                              BENEFIT CREATION                              */
  /* -------------------------------------------------------------------------- */

  const handleAddBenefit = async () => {
    if (!benefitDialogTier) return;

    const selected = BENEFIT_TYPES.find((b) => b.value === benefitType);

    const numericValue = benefitValue ? parseFloat(benefitValue) : null;

    const label = selected?.needsValue ? `${numericValue}${selected?.suffix}` : selected?.suffix;

    try {
      const { error } = await supabase.from("tier_benefits").insert({
        tier_id: benefitDialogTier.id,
        benefit_type: benefitType,
        benefit_value: numericValue,
        benefit_label: label,
      });

      if (error) throw error;

      toast({ title: "Benefit added" });

      setBenefitDialogTier(null);
      setBenefitValue("");
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  /* -------------------------------------------------------------------------- */
  /*                                DELETE TIER                                 */
  /* -------------------------------------------------------------------------- */

  const handleDelete = async (tierId: string) => {
    if (!confirm("Delete this tier?")) return;

    try {
      const { error } = await supabase.from("tiers").delete().eq("id", tierId);
      if (error) throw error;

      toast({ title: "Tier deleted" });
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  /* -------------------------------------------------------------------------- */
  /*                                  FORM                                      */
  /* -------------------------------------------------------------------------- */

  const resetForm = () => {
    setDialogOpen(false);
    setEditingTier(null);
    setName("");
    setRank("1");
    setThreshold("0");
  };

  const openEdit = (tier: Tier) => {
    setEditingTier(tier);
    setName(tier.name);
    setRank(String(tier.rank));
    setThreshold(String(tier.points_threshold));
    setDialogOpen(true);
  };

  /* -------------------------------------------------------------------------- */
  /*                                  LOADING                                   */
  /* -------------------------------------------------------------------------- */

  if (!isPreview && (loading || dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /*                                    UI                                      */
  /* -------------------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-background">
      {isPreview && <PreviewBanner role="club_admin" />}

      <header className="border-b bg-card">
        <div className="container py-4 flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/club/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Logo />
        </div>
      </header>

      <main className="container py-8 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-7 w-7 text-primary" />
            Tier Management
          </h1>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Tier
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingTier ? "Edit Tier" : "Create Tier"}</DialogTitle>
              </DialogHeader>

              <div className="space-y-3">
                <div>
                  <Label>Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>

                <div>
                  <Label>Rank</Label>
                  <Input type="number" value={rank} onChange={(e) => setRank(e.target.value)} />
                </div>

                <div>
                  <Label>Points Threshold</Label>
                  <Input type="number" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
                </div>

                <Button className="w-full" onClick={handleSave}>
                  Save
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tier list */}
        {tiers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">No tiers created yet.</CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tiers.map((tier) => (
              <Card key={tier.id} className="relative overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    {tier.name}
                    <Badge>Rank {tier.rank}</Badge>
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">Unlock at {tier.points_threshold} pts</p>

                  {/* Benefits */}
                  <div className="space-y-1">
                    {benefits[tier.id]?.length ? (
                      benefits[tier.id].map((b) => (
                        <div key={b.id} className="text-xs flex items-center gap-2 text-muted-foreground">
                          <Sparkles className="h-3 w-3" />
                          {b.benefit_label}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">No benefits yet</p>
                    )}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" onClick={() => openEdit(tier)}>
                      <Edit className="h-4 w-4" />
                    </Button>

                    <Button size="sm" variant="secondary" onClick={() => setBenefitDialogTier(tier)}>
                      Manage Benefits
                    </Button>

                    <Button size="sm" variant="destructive" onClick={() => handleDelete(tier.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Benefit Dialog */}
        <Dialog open={!!benefitDialogTier} onOpenChange={() => setBenefitDialogTier(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Benefit</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <div>
                <Label>Benefit Type</Label>
                <select
                  className="w-full border rounded-md p-2"
                  value={benefitType}
                  onChange={(e) => setBenefitType(e.target.value)}
                >
                  {BENEFIT_TYPES.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>

              {BENEFIT_TYPES.find((b) => b.value === benefitType)?.needsValue && (
                <div>
                  <Label>Value</Label>
                  <Input value={benefitValue} onChange={(e) => setBenefitValue(e.target.value)} />
                </div>
              )}

              <Button className="w-full" onClick={handleAddBenefit}>
                Save Benefit
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
