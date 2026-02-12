// src/pages/club/TierManagement.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Logo } from "@/components/ui/Logo";
import { PreviewBanner } from "@/components/ui/PreviewBanner";
import { useToast } from "@/hooks/use-toast";

import { ArrowLeft, Loader2, Plus, Trophy, Trash2, Edit, ShieldCheck } from "lucide-react";

import type { Club, LoyaltyProgram } from "@/types/database";

type TierRow = {
  id: string;
  program_id: string;
  name: string;
  rank: number;
  points_required: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export default function TierManagement() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();

  const isPreviewMode = searchParams.get("preview") === "club_admin";

  const [club, setClub] = useState<Club | null>(null);
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [tiers, setTiers] = useState<TierRow[]>([]);

  const [dataLoading, setDataLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingTier, setEditingTier] = useState<TierRow | null>(null);

  // form
  const [name, setName] = useState("");
  const [rank, setRank] = useState("1");
  const [pointsRequired, setPointsRequired] = useState("0");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (loading) return;

    if (isPreviewMode) {
      setClub({
        id: "preview",
        admin_id: "preview",
        name: "Demo FC",
        logo_url: null,
        primary_color: "#16a34a",
        country: "",
        city: "",
        stadium_name: null,
        season_start: null,
        season_end: null,
        status: "verified",
        created_at: "",
        updated_at: "",
      });

      setProgram({
        id: "preview-program",
        club_id: "preview",
        name: "Demo Program",
        description: null,
        points_currency_name: "Points",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      setTiers([
        {
          id: "t1",
          program_id: "preview-program",
          name: "Bronze",
          rank: 1,
          points_required: 0,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "t2",
          program_id: "preview-program",
          name: "Silver",
          rank: 2,
          points_required: 500,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "t3",
          program_id: "preview-program",
          name: "Gold",
          rank: 3,
          points_required: 1500,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      setDataLoading(false);
      return;
    }

    if (!user) {
      navigate("/auth?role=club_admin");
      return;
    }

    if (profile?.role !== "club_admin") {
      navigate("/fan/home");
      return;
    }

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isPreviewMode, user, profile]);

  const resetForm = () => {
    setEditingTier(null);
    setName("");
    setRank("1");
    setPointsRequired("0");
    setIsActive(true);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (t: TierRow) => {
    setEditingTier(t);
    setName(t.name);
    setRank(String(t.rank));
    setPointsRequired(String(t.points_required));
    setIsActive(!!t.is_active);
    setDialogOpen(true);
  };

  const fetchData = async () => {
    if (!profile) return;
    setDataLoading(true);

    try {
      // 1) Club
      const { data: clubs, error: clubErr } = await supabase
        .from("clubs")
        .select("*")
        .eq("admin_id", profile.id)
        .limit(1);

      if (clubErr) throw clubErr;
      if (!clubs?.length) {
        navigate("/club/onboarding");
        return;
      }
      const clubData = clubs[0] as Club;
      setClub(clubData);

      // 2) Program
      const { data: programs, error: progErr } = await supabase
        .from("loyalty_programs")
        .select("*")
        .eq("club_id", clubData.id)
        .limit(1);

      if (progErr) throw progErr;
      if (!programs?.length) {
        navigate("/club/dashboard");
        return;
      }
      const programData = programs[0] as LoyaltyProgram;
      setProgram(programData);

      // 3) Tiers via RPC (ordered)
      const { data: tierRows, error: tierErr } = await (supabase.rpc as any)("list_tiers", {
        p_program_id: programData.id,
      });

      if (tierErr) throw tierErr;
      setTiers((tierRows ?? []) as TierRow[]);
    } catch (err: any) {
      console.error("TierManagement fetch error:", err);
      toast({
        title: "Error",
        description: err?.message || "Failed to load tiers.",
        variant: "destructive",
      });
    } finally {
      setDataLoading(false);
    }
  };

  const handleSave = async () => {
    if (!program) return;

    const r = parseInt(rank, 10);
    const p = parseInt(pointsRequired, 10);

    if (!name.trim()) {
      toast({ title: "Name required", description: "Please enter a tier name.", variant: "destructive" });
      return;
    }
    if (Number.isNaN(r) || r < 1) {
      toast({ title: "Invalid rank", description: "Rank must be an integer ≥ 1.", variant: "destructive" });
      return;
    }
    if (Number.isNaN(p) || p < 0) {
      toast({ title: "Invalid points", description: "Points required must be ≥ 0.", variant: "destructive" });
      return;
    }

    // extra client-side duplicate checks (server already enforces uniques)
    const other = tiers.filter((t) => t.id !== editingTier?.id);
    if (other.some((t) => t.rank === r)) {
      toast({ title: "Duplicate rank", description: "Another tier already uses this rank.", variant: "destructive" });
      return;
    }
    if (other.some((t) => t.points_required === p)) {
      toast({
        title: "Duplicate points threshold",
        description: "Another tier already uses this points required value.",
        variant: "destructive",
      });
      return;
    }

    if (isPreviewMode) {
      if (editingTier) {
        setTiers(
          tiers.map((t) =>
            t.id === editingTier.id
              ? {
                  ...t,
                  name: name.trim(),
                  rank: r,
                  points_required: p,
                  is_active: isActive,
                  updated_at: new Date().toISOString(),
                }
              : t,
          ),
        );
        toast({ title: "Tier updated (preview)" });
      } else {
        setTiers([
          ...tiers,
          {
            id: `preview-${Date.now()}`,
            program_id: program.id,
            name: name.trim(),
            rank: r,
            points_required: p,
            is_active: isActive,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);
        toast({ title: "Tier created (preview)" });
      }
      setDialogOpen(false);
      resetForm();
      return;
    }

    setSaving(true);
    try {
      if (editingTier) {
        const { data, error } = await (supabase.rpc as any)("update_tier", {
          p_tier_id: editingTier.id,
          p_name: name.trim(),
          p_rank: r,
          p_points_required: p,
          p_is_active: isActive,
        });

        if (error) throw error;

        toast({ title: "Tier updated", description: "Changes saved successfully." });
        setDialogOpen(false);
        resetForm();
        await fetchData();
        return;
      }

      const { data, error } = await (supabase.rpc as any)("create_tier", {
        p_program_id: program.id,
        p_name: name.trim(),
        p_rank: r,
        p_points_required: p,
        p_is_active: isActive,
      });

      if (error) throw error;

      toast({ title: "Tier created", description: "Your new tier is ready." });
      setDialogOpen(false);
      resetForm();
      await fetchData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to save tier.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (t: TierRow) => {
    const ok = confirm(`Delete tier "${t.name}"? This cannot be undone.`);
    if (!ok) return;

    if (isPreviewMode) {
      setTiers(tiers.filter((x) => x.id !== t.id));
      toast({ title: "Tier deleted (preview)" });
      return;
    }

    try {
      const { error } = await (supabase.rpc as any)("delete_tier", { p_tier_id: t.id });
      if (error) throw error;

      toast({ title: "Tier deleted" });
      await fetchData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to delete tier.",
        variant: "destructive",
      });
    }
  };

  const sortedTiers = useMemo(() => {
    return [...tiers].sort((a, b) => a.rank - b.rank);
  }, [tiers]);

  if (!isPreviewMode && (loading || dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const verified = club?.status === "verified" || club?.status === "official";

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="club_admin" />}

      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(isPreviewMode ? "/club/dashboard?preview=club_admin" : "/club/dashboard")}
              className="rounded-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>

            <Logo />

            <div className="h-6 w-px bg-border" />

            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">{club?.name}</span>
              {verified && (
                <Badge className="bg-primary/10 text-primary border-primary/20 rounded-full">
                  <ShieldCheck className="h-3 w-3 mr-1" /> Verified
                </Badge>
              )}
            </div>
          </div>

          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={openCreate} className="gradient-stadium rounded-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Tier
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingTier ? "Edit Tier" : "Create Tier"}</DialogTitle>
                <DialogDescription>
                  Define tier rank (order) and the points required to reach it. Ranks and points must be unique per
                  program.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                <div className="space-y-1">
                  <Label htmlFor="tierName">Tier Name *</Label>
                  <Input
                    id="tierName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Bronze / Silver / Gold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="tierRank">Rank *</Label>
                    <Input id="tierRank" type="number" min={1} value={rank} onChange={(e) => setRank(e.target.value)} />
                    <p className="text-xs text-muted-foreground">1 = lowest tier, higher rank = higher tier</p>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="tierPoints">Points Required *</Label>
                    <Input
                      id="tierPoints"
                      type="number"
                      min={0}
                      value={pointsRequired}
                      onChange={(e) => setPointsRequired(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Fans reach this tier once their points meet/exceed this value
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Active</p>
                    <p className="text-xs text-muted-foreground">
                      Inactive tiers won’t be considered by logic (if you choose to enforce later)
                    </p>
                  </div>
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-full gradient-stadium">
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {editingTier ? "Save Changes" : "Create Tier"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Main */}
      <main className="container py-10 space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-2">
            <Trophy className="h-7 w-7 text-primary" />
            Tier Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and maintain your tier ladder for <span className="font-medium">{program?.name}</span>.
          </p>
        </div>

        {sortedTiers.length === 0 ? (
          <Card className="rounded-2xl border-border/50">
            <CardContent className="py-12 text-center">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-semibold text-foreground mb-2">No tiers yet</p>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                Add your first tier (example: Bronze rank 1, points 0) to start tier tracking.
              </p>
              <Button onClick={openCreate} className="gradient-stadium">
                <Plus className="h-4 w-4 mr-2" /> Add Tier
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedTiers.map((t) => (
              <Card key={t.id} className={`rounded-2xl border-border/50 ${t.is_active ? "" : "opacity-60"}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate">{t.name}</span>
                    <Badge variant="secondary">Rank {t.rank}</Badge>
                  </CardTitle>
                  <CardDescription>
                    Requires <span className="font-medium">{t.points_required}</span>{" "}
                    {program?.points_currency_name || "Points"}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(t)}>
                        <Edit className="h-4 w-4 mr-1" /> Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(t)}>
                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                      </Button>
                    </div>

                    {!t.is_active ? <Badge variant="secondary">Inactive</Badge> : <Badge>Active</Badge>}
                  </div>

                  <p className="text-xs text-muted-foreground mt-3">
                    Tip: Keep points_required increasing with rank to avoid confusing tier jumps.
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
