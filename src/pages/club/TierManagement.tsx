import { useEffect, useMemo, useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Plus, Trash2, Edit, Trophy, LogOut, Sparkles } from "lucide-react";

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

type BenefitType = "points_multiplier" | "reward_discount_percent" | "vip_access" | "monthly_bonus_points";

const BENEFIT_DEFS: Record<
  BenefitType,
  {
    label: string;
    needsValue: boolean;
    valueLabel?: string;
    valuePlaceholder?: string;
    min?: number;
    max?: number;
    helper?: string;
  }
> = {
  points_multiplier: {
    label: "Points Multiplier",
    needsValue: true,
    valueLabel: "Multiplier",
    valuePlaceholder: "e.g. 1.25",
    min: 1,
    max: 10,
    helper: "Multiply points earned from activities.",
  },
  reward_discount_percent: {
    label: "Reward Discount",
    needsValue: true,
    valueLabel: "Discount (%)",
    valuePlaceholder: "e.g. 10",
    min: 0,
    max: 100,
    helper: "Discount reward cost for fans in this tier.",
  },
  vip_access: {
    label: "VIP Access",
    needsValue: false,
    helper: "Unlock VIP-only rewards or areas for fans in this tier.",
  },
  monthly_bonus_points: {
    label: "Monthly Bonus Points",
    needsValue: true,
    valueLabel: "Bonus Points",
    valuePlaceholder: "e.g. 200",
    min: 0,
    max: 1000000,
    helper: "Add a monthly points grant.",
  },
};

function formatBenefit(b: TierBenefit): string {
  const t = b.benefit_type as BenefitType;
  const def = BENEFIT_DEFS[t];
  if (!def) return b.benefit_label || b.benefit_type;
  if (!def.needsValue) return def.label;
  const v = b.benefit_value ?? 0;
  if (t === "reward_discount_percent") return `${def.label}: ${v}%`;
  if (t === "points_multiplier") return `${def.label}: x${v}`;
  return `${def.label}: ${v}`;
}

export default function TierManagement() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, signOut, loading } = useAuth();
  const { toast } = useToast();

  const isPreview = searchParams.get("preview") === "club_admin";

  const [tiers, setTiers] = useState<Tier[]>([]);
  const [benefitsByTier, setBenefitsByTier] = useState<Record<string, TierBenefit[]>>({});
  const [programId, setProgramId] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  // Tier dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<Tier | null>(null);
  const [name, setName] = useState("");
  const [rank, setRank] = useState("1");
  const [threshold, setThreshold] = useState("0");

  // Benefit form per-tier (stored by tier_id)
  const [benefitDrafts, setBenefitDrafts] = useState<Record<string, { type: BenefitType | ""; value: string }>>({});

  const orderedTiers = useMemo(() => [...tiers].sort((a, b) => a.rank - b.rank), [tiers]);

  useEffect(() => {
    if (isPreview) {
      setTiers([]);
      setBenefitsByTier({});
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
      const { data: clubs, error: cErr } = await supabase
        .from("clubs")
        .select("id")
        .eq("admin_id", profile.id)
        .limit(1);

      if (cErr) throw cErr;

      if (!clubs?.length) {
        navigate("/club/onboarding");
        return;
      }

      const { data: programs, error: pErr } = await supabase
        .from("loyalty_programs")
        .select("id")
        .eq("club_id", clubs[0].id)
        .limit(1);

      if (pErr) throw pErr;
      if (!programs?.length) return;

      const pId = programs[0].id as string;
      setProgramId(pId);

      const { data: tiersData, error: tErr } = await supabase
        .from("tiers")
        .select("*")
        .eq("program_id", pId)
        .order("rank", { ascending: true });

      if (tErr) throw tErr;

      const tierList = (tiersData || []) as Tier[];
      setTiers(tierList);

      if (tierList.length) {
        const { data: benefitsData, error: bErr } = await supabase
          .from("tier_benefits")
          .select("*")
          .in(
            "tier_id",
            tierList.map((t) => t.id),
          );

        if (bErr) throw bErr;

        const grouped: Record<string, TierBenefit[]> = {};
        (benefitsData || []).forEach((b: any) => {
          if (!grouped[b.tier_id]) grouped[b.tier_id] = [];
          grouped[b.tier_id].push(b);
        });
        setBenefitsByTier(grouped);

        // Ensure drafts exist for tiers
        setBenefitDrafts((prev) => {
          const next = { ...prev };
          tierList.forEach((t) => {
            if (!next[t.id]) next[t.id] = { type: "", value: "" };
          });
          return next;
        });
      } else {
        setBenefitsByTier({});
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setDataLoading(false);
    }
  };

  const resetTierForm = () => {
    setDialogOpen(false);
    setEditingTier(null);
    setName("");
    setRank("1");
    setThreshold("0");
  };

  const openEditTier = (tier: Tier) => {
    setEditingTier(tier);
    setName(tier.name);
    setRank(String(tier.rank));
    setThreshold(String(tier.points_threshold));
    setDialogOpen(true);
  };

  const handleSaveTier = async () => {
    if (!programId) return;

    const rankNum = parseInt(rank, 10);
    const thresholdNum = parseInt(threshold, 10);

    if (!name || Number.isNaN(rankNum) || Number.isNaN(thresholdNum)) {
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

      resetTierForm();
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteTier = async (tierId: string) => {
    if (!confirm("Delete this tier? This will also remove its benefits.")) return;

    try {
      // If your DB has ON DELETE CASCADE from tier_benefits.tier_id -> tiers.id this is enough.
      // Otherwise, delete benefits first.
      await supabase.from("tier_benefits").delete().eq("tier_id", tierId);

      const { error } = await supabase.from("tiers").delete().eq("id", tierId);
      if (error) throw error;

      toast({ title: "Tier deleted" });
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const updateDraft = (tierId: string, patch: Partial<{ type: BenefitType | ""; value: string }>) => {
    setBenefitDrafts((prev) => ({
      ...prev,
      [tierId]: { ...(prev[tierId] || { type: "", value: "" }), ...patch },
    }));
  };

  const handleAddBenefit = async (tierId: string) => {
    const draft = benefitDrafts[tierId] || { type: "", value: "" };
    const type = draft.type;
    if (!type) {
      toast({ title: "Select a benefit type", variant: "destructive" });
      return;
    }

    const def = BENEFIT_DEFS[type];
    let valueNum: number | null = null;

    if (def.needsValue) {
      const v = Number(draft.value);
      if (Number.isNaN(v)) {
        toast({ title: "Enter a valid value", variant: "destructive" });
        return;
      }
      if (def.min !== undefined && v < def.min) {
        toast({ title: `Value must be ≥ ${def.min}`, variant: "destructive" });
        return;
      }
      if (def.max !== undefined && v > def.max) {
        toast({ title: `Value must be ≤ ${def.max}`, variant: "destructive" });
        return;
      }
      valueNum = v;
    }

    // Optional: prevent duplicate benefit types per tier
    const existing = (benefitsByTier[tierId] || []).some((b) => b.benefit_type === type);
    if (existing) {
      toast({ title: "This benefit already exists for this tier", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase.from("tier_benefits").insert({
        tier_id: tierId,
        benefit_type: type,
        benefit_value: valueNum,
        benefit_label: def.label,
      });

      if (error) throw error;

      toast({ title: "Benefit added" });

      // reset draft for that tier only
      updateDraft(tierId, { type: "", value: "" });

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

  const handleSignOut = async () => {
    if (isPreview) navigate("/preview");
    else { await signOut(); navigate("/"); }
  };

  if (!isPreview && (loading || dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {isPreview && <PreviewBanner role="club_admin" />}

      <header className="relative border-b border-border/40 overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-40" />
        <div className="relative container py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/club/dashboard")} className="rounded-full hover:bg-card/60">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="h-5 w-px bg-border/40" />
            <Logo size="sm" />
          </div>
          <Button variant="ghost" onClick={handleSignOut} className="rounded-full text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </header>

      <main className="container py-10 max-w-5xl space-y-10">
        {/* HERO */}
        <div className="relative overflow-hidden rounded-3xl border border-border/40 p-8 md:p-10">
          <div className="absolute inset-0 gradient-hero" />
          <div className="absolute inset-0 stadium-pattern" />
          <div className="absolute inset-0 pitch-lines opacity-30" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-accent" />
                <span className="text-xs font-semibold text-accent uppercase tracking-wider">Loyalty Ladder</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight">Tier Management</h1>
              <p className="text-white/50 mt-2 max-w-md">Define loyalty tiers and their benefits to reward your most engaged fans.</p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-full gap-2 shadow-stadium self-start md:self-auto">
                  <Plus className="h-4 w-4" />
                  Add Tier
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl border-border/40">
                <DialogHeader>
                  <DialogTitle className="font-display">{editingTier ? "Edit Tier" : "Create Tier"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl border-border/40" />
                  </div>
                  <div>
                    <Label>Rank</Label>
                    <Input type="number" value={rank} onChange={(e) => setRank(e.target.value)} className="rounded-xl border-border/40" />
                  </div>
                  <div>
                    <Label>Points Threshold</Label>
                    <Input type="number" value={threshold} onChange={(e) => setThreshold(e.target.value)} className="rounded-xl border-border/40" />
                  </div>
                  <Button className="w-full rounded-xl" onClick={handleSaveTier}>
                    Save Tier
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {orderedTiers.length === 0 ? (
          <Card className="rounded-2xl border-border/40 overflow-hidden">
            <CardContent className="py-16 text-center">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <Trophy className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-display font-bold text-lg">No Tiers Yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">Create tiers to structure your loyalty program with escalating rewards.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orderedTiers.map((tier) => {
              const tierBenefits = benefitsByTier[tier.id] || [];
              const draft = benefitDrafts[tier.id] || { type: "", value: "" };
              const def = draft.type ? BENEFIT_DEFS[draft.type] : null;

              return (
                <Card key={tier.id} className="rounded-2xl border-border/40 group hover:border-primary/20 transition-all duration-300">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between font-display">
                      <span>{tier.name}</span>
                      <Badge className="rounded-full bg-primary/10 text-primary border-primary/20 text-[10px]">
                        Rank {tier.rank}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Unlock at</span>
                      <span className="font-display font-semibold">{tier.points_threshold} pts</span>
                    </div>

                    {/* BENEFITS LIST */}
                    <div className="space-y-2">
                      {tierBenefits.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No benefits yet.</div>
                      ) : (
                        tierBenefits.map((b) => (
                          <div
                            key={b.id}
                            className="flex items-center justify-between rounded-xl border border-border/40 bg-card/50 px-3 py-2"
                          >
                            <div className="text-sm font-medium">{formatBenefit(b)}</div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="rounded-full text-destructive hover:text-destructive"
                              onClick={() => handleDeleteBenefit(b.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* ADD BENEFIT FORM */}
                    <div className="rounded-2xl border border-border/40 p-3 space-y-3">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Add Benefit</Label>

                        <Select
                          value={draft.type}
                          onValueChange={(v) => updateDraft(tier.id, { type: v as BenefitType, value: "" })}
                        >
                          <SelectTrigger className="rounded-xl border-border/40">
                            <SelectValue placeholder="Select benefit type" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(BENEFIT_DEFS).map(([key, d]) => (
                              <SelectItem key={key} value={key}>
                                {d.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {def?.needsValue && (
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">{def.valueLabel}</Label>
                            <Input
                              className="rounded-xl border-border/40"
                              placeholder={def.valuePlaceholder}
                              value={draft.value}
                              onChange={(e) => updateDraft(tier.id, { value: e.target.value })}
                            />
                          </div>
                        )}

                        {def?.helper && <p className="text-xs text-muted-foreground">{def.helper}</p>}
                      </div>

                      <div className="flex gap-2">
                        <Button className="flex-1 rounded-xl" onClick={() => handleAddBenefit(tier.id)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add
                        </Button>

                        <Button
                          variant="outline"
                          className="rounded-xl border-border/40"
                          onClick={() => updateDraft(tier.id, { type: "", value: "" })}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>

                    {/* TIER ACTIONS */}
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" className="rounded-full border-border/40" onClick={() => openEditTier(tier)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="rounded-full"
                        onClick={() => handleDeleteTier(tier.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
