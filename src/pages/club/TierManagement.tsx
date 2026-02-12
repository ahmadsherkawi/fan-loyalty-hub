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

import { Loader2, ArrowLeft, Plus, Trash2, Edit, Trophy } from "lucide-react";

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

  const [name, setName] = useState("");
  const [rank, setRank] = useState("1");
  const [threshold, setThreshold] = useState("0");

  const [benefitLabel, setBenefitLabel] = useState("");
  const [benefitType, setBenefitType] = useState("");
  const [benefitValue, setBenefitValue] = useState("");
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);

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
        (benefitsData || []).forEach((b: any) => {
          if (!grouped[b.tier_id]) grouped[b.tier_id] = [];
          grouped[b.tier_id].push(b);
        });

        setBenefits(grouped);
      }
    } finally {
      setDataLoading(false);
    }
  };

  const handleSaveTier = async () => {
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

  const handleAddBenefit = async () => {
    if (!selectedTierId || !benefitType) return;

    try {
      const { error } = await supabase.from("tier_benefits").insert({
        tier_id: selectedTierId,
        benefit_type: benefitType,
        benefit_value: benefitValue ? Number(benefitValue) : null,
        benefit_label: benefitLabel || null,
      });

      if (error) throw error;

      setBenefitLabel("");
      setBenefitType("");
      setBenefitValue("");

      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteBenefit = async (benefitId: string) => {
    if (!confirm("Delete this benefit?")) return;

    try {
      const { error } = await supabase.from("tier_benefits").delete().eq("id", benefitId);
      if (error) throw error;

      toast({ title: "Benefit deleted" });
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const resetForm = () => {
    setDialogOpen(false);
    setEditingTier(null);
    setName("");
    setRank("1");
    setThreshold("0");
  };

  if (!isPreview && (loading || dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {isPreview && <PreviewBanner role="club_admin" />}

      <header className="border-b bg-card">
        <div className="container py-4 flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/club/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <Logo />
        </div>
      </header>

      <main className="container py-8 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-7 w-7 text-primary" /> Tier Management
          </h1>

          {/* ADD / EDIT TIER DIALOG */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" /> Add Tier
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

                <Button className="w-full" onClick={handleSaveTier}>
                  Save Tier
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* TIERS LIST */}
        {tiers.map((tier) => (
          <Card key={tier.id}>
            <CardHeader>
              <CardTitle className="flex justify-between">
                {tier.name} <Badge>Rank {tier.rank}</Badge>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Unlock at {tier.points_threshold} pts</p>

              {(benefits[tier.id] || []).map((b) => (
                <div key={b.id} className="flex justify-between items-center border rounded-lg px-3 py-2">
                  <span>{b.benefit_label || b.benefit_type}</span>
                  <Button size="icon" variant="destructive" onClick={() => handleDeleteBenefit(b.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {/* ADD BENEFIT */}
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="Label" value={benefitLabel} onChange={(e) => setBenefitLabel(e.target.value)} />
                <Input placeholder="Type" value={benefitType} onChange={(e) => setBenefitType(e.target.value)} />
                <Input placeholder="Value" value={benefitValue} onChange={(e) => setBenefitValue(e.target.value)} />
              </div>

              <Button
                onClick={() => {
                  setSelectedTierId(tier.id);
                  handleAddBenefit();
                }}
                className="w-full"
              >
                Add Benefit
              </Button>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}
