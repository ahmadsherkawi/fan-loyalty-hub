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
import { Loader2, ArrowLeft, Plus, Trash2, Edit, Trophy, LogOut, Sparkles, Crown, Star, Zap, Gift } from "lucide-react";

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
        (benefitsData || []).forEach((b: { tier_id: string }) => {
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
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
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
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
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
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
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
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleDeleteBenefit = async (benefitId: string) => {
    if (!confirm("Delete this benefit?")) return;

    try {
      const { error } = await supabase.from("tier_benefits").delete().eq("id", benefitId);
      if (error) throw error;

      toast({ title: "Benefit deleted" });
      fetchData();
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
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
          <div className="relative overflow-hidden rounded-3xl border border-border/40 p-16 text-center">
            <div className="absolute inset-0 stadium-pattern opacity-30" />
            <div className="absolute inset-0 gradient-mesh opacity-20" />
            <div className="relative z-10">
              <div className="mx-auto h-20 w-20 rounded-3xl glass-dark flex items-center justify-center mb-6 animate-float">
                <Trophy className="h-9 w-9 text-accent" />
              </div>
              <h3 className="font-display font-bold text-xl text-foreground">No Tiers Yet</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">Create tiers to structure your loyalty program with escalating rewards.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Visual loyalty ladder connector */}
            {orderedTiers.map((tier, index) => {
              const tierBenefits = benefitsByTier[tier.id] || [];
              const draft = benefitDrafts[tier.id] || { type: "", value: "" };
              const def = draft.type ? BENEFIT_DEFS[draft.type] : null;

              // Tier-specific styling based on rank
              const tierIcon = index === 0 ? Crown : index === 1 ? Star : index === 2 ? Zap : Gift;
              const TierIcon = tierIcon;
              const tierGradients = [
                "from-accent/20 via-amber-500/10 to-transparent",
                "from-primary/20 via-emerald-500/10 to-transparent",
                "from-blue-500/20 via-indigo-500/10 to-transparent",
                "from-purple-500/20 via-pink-500/10 to-transparent",
              ];
              const tierAccentColors = [
                "text-accent",
                "text-primary",
                "text-blue-400",
                "text-purple-400",
              ];
              const tierBorderColors = [
                "border-accent/30 hover:border-accent/50",
                "border-primary/30 hover:border-primary/50",
                "border-blue-500/30 hover:border-blue-500/50",
                "border-purple-500/30 hover:border-purple-500/50",
              ];
              const tierBgAccents = [
                "bg-accent/10",
                "bg-primary/10",
                "bg-blue-500/10",
                "bg-purple-500/10",
              ];
              const gradientClass = tierGradients[index % tierGradients.length];
              const accentColor = tierAccentColors[index % tierAccentColors.length];
              const borderColor = tierBorderColors[index % tierBorderColors.length];
              const bgAccent = tierBgAccents[index % tierBgAccents.length];

              return (
                <div key={tier.id} className="relative">
                  {/* Ladder connector line */}
                  {index < orderedTiers.length - 1 && (
                    <div className="absolute left-10 top-full w-px h-5 bg-gradient-to-b from-border/60 to-transparent z-10" />
                  )}

                  <div className={`group relative overflow-hidden rounded-3xl border ${borderColor} bg-card transition-all duration-500 hover:shadow-lg`}>
                    {/* Top gradient banner */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass} opacity-60 pointer-events-none`} />
                    <div className="absolute inset-0 stadium-pattern opacity-20 pointer-events-none" />

                    <div className="relative z-10 p-6 md:p-8">
                      {/* Tier header row */}
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className={`h-14 w-14 rounded-2xl ${bgAccent} backdrop-blur-sm border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                            <TierIcon className={`h-7 w-7 ${accentColor}`} />
                          </div>
                          <div>
                            <h3 className="font-display font-bold text-xl text-foreground tracking-tight">{tier.name}</h3>
                            <div className="flex items-center gap-3 mt-1">
                              <Badge className={`rounded-full ${bgAccent} ${accentColor} border-transparent text-[10px] font-bold`}>
                                Rank {tier.rank}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Unlock at <span className="font-display font-bold text-foreground">{tier.points_threshold.toLocaleString()}</span> pts
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Quick actions */}
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl hover:bg-card/80" onClick={() => openEditTier(tier)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteTier(tier.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Benefits section */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-px flex-1 bg-border/40" />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Benefits</span>
                          <div className="h-px flex-1 bg-border/40" />
                        </div>

                        {tierBenefits.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-border/40 p-4 text-center">
                            <p className="text-xs text-muted-foreground">No benefits configured yet</p>
                          </div>
                        ) : (
                          <div className="grid gap-2 sm:grid-cols-2">
                            {tierBenefits.map((b) => (
                              <div
                                key={b.id}
                                className={`flex items-center justify-between rounded-xl ${bgAccent} backdrop-blur-sm border border-white/5 px-4 py-2.5 group/benefit`}
                              >
                                <div className="flex items-center gap-2">
                                  <Sparkles className={`h-3.5 w-3.5 ${accentColor} flex-shrink-0`} />
                                  <span className="text-sm font-medium">{formatBenefit(b)}</span>
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 rounded-lg text-destructive/60 hover:text-destructive opacity-0 group-hover/benefit:opacity-100 transition-opacity"
                                  onClick={() => handleDeleteBenefit(b.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Add benefit form */}
                      <div className="mt-5 rounded-2xl glass-dark p-4 space-y-3">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Add Benefit</Label>

                        <Select
                          value={draft.type}
                          onValueChange={(v) => updateDraft(tier.id, { type: v as BenefitType, value: "" })}
                        >
                          <SelectTrigger className="rounded-xl border-border/40 bg-background/50">
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
                              className="rounded-xl border-border/40 bg-background/50"
                              placeholder={def.valuePlaceholder}
                              value={draft.value}
                              onChange={(e) => updateDraft(tier.id, { value: e.target.value })}
                            />
                          </div>
                        )}

                        {def?.helper && <p className="text-[11px] text-muted-foreground">{def.helper}</p>}

                        <div className="flex gap-2">
                          <Button className="flex-1 rounded-xl gap-2" onClick={() => handleAddBenefit(tier.id)}>
                            <Plus className="h-4 w-4" />
                            Add Benefit
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
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
