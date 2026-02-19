import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/Logo";
import { PreviewBanner } from "@/components/ui/PreviewBanner";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  ArrowLeft,
  Plus,
  CheckCircle,
  Calendar,
  CalendarDays,
  Sparkles,
  Clock,
  ChevronRight,
} from "lucide-react";
import type { Club } from "@/types/database";

interface Season {
  id: string;
  club_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

export default function ClubSeasons() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();

  const isPreviewMode = searchParams.get("preview") === "club_admin";

  const [club, setClub] = useState<Club | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [creating, setCreating] = useState(false);
  const [creatingDialogOpen, setCreatingDialogOpen] = useState(false);

  const [seasonName, setSeasonName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
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

      setSeasons([
        {
          id: "preview-s1",
          club_id: "preview",
          name: "2025/26 Season",
          start_date: "2025-08-01",
          end_date: "2026-05-31",
          is_current: true,
          created_at: "",
          updated_at: "",
        },
        {
          id: "preview-s2",
          club_id: "preview",
          name: "2024/25 Season",
          start_date: "2024-08-01",
          end_date: "2025-05-31",
          is_current: false,
          created_at: "",
          updated_at: "",
        },
      ]);

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
      const { data: clubs } = await supabase.from("clubs").select("*").eq("admin_id", profile.id).limit(1);

      if (!clubs?.length) {
        navigate("/club/onboarding");
        return;
      }

      const c = clubs[0] as Club;
      setClub(c);

      const { data: seasonRows, error } = await supabase
        .from("club_seasons")
        .select("*")
        .eq("club_id", c.id)
        .order("start_date", { ascending: false });

      if (error) throw error;

      setSeasons((seasonRows ?? []) as Season[]);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setDataLoading(false);
    }
  };

  const handleCreateSeason = async () => {
    if (!club) return;

    if (!seasonName || !startDate || !endDate) {
      toast({ title: "Missing fields", variant: "destructive" });
      return;
    }

    setCreating(true);

    try {
      const { error } = await supabase.rpc("create_season", {
        p_club_id: club.id,
        p_name: seasonName,
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) throw error;

      toast({ title: "Season created" });
      setCreatingDialogOpen(false);
      setSeasonName("");
      setStartDate("");
      setEndDate("");
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleSetCurrent = async (seasonId: string) => {
    if (!club) return;

    try {
      const { error } = await supabase.rpc("set_current_season", {
        p_club_id: club.id,
        p_season_id: seasonId,
      });

      if (error) throw error;

      toast({ title: "Season activated" });
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (!isPreviewMode && (loading || dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentSeason = seasons.find((s) => s.is_current);
  const pastSeasons = seasons.filter((s) => !s.is_current);

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="club_admin" />}

      <header className="relative border-b border-border/40 overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-40" />
        <div className="relative container py-5 flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/club/dashboard")}
            className="rounded-full hover:bg-card/60"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <div className="h-5 w-px bg-border/40" />
          <Logo size="sm" />
        </div>
      </header>

      <main className="container py-10 max-w-4xl space-y-10">
        <div className="relative overflow-hidden rounded-3xl border border-border/40 p-8 md:p-10">
          <div className="absolute inset-0 gradient-hero" />
          <div className="absolute inset-0 stadium-pattern" />
          <div className="absolute inset-0 pitch-lines opacity-30" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays className="h-4 w-4 text-accent" />
                <span className="text-xs font-semibold text-accent uppercase tracking-wider">Season Manager</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight">
                Seasons
              </h1>
              <p className="text-white/50 mt-2 max-w-md">
                Organize your loyalty program into seasons. Track progress and set active periods.
              </p>
            </div>

            <Dialog open={creatingDialogOpen} onOpenChange={setCreatingDialogOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-full gap-2 shadow-stadium self-start md:self-auto">
                  <Plus className="h-4 w-4" /> New Season
                </Button>
              </DialogTrigger>

              <DialogContent className="rounded-2xl border-border/40">
                <DialogHeader>
                  <DialogTitle className="font-display">Create Season</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                  <div>
                    <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Season Name</label>
                    <Input
                      placeholder="e.g. 2025/26 Season"
                      value={seasonName}
                      onChange={(e) => setSeasonName(e.target.value)}
                      className="rounded-xl border-border/40"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Start Date</label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="rounded-xl border-border/40"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground font-medium mb-1.5 block">End Date</label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="rounded-xl border-border/40"
                      />
                    </div>
                  </div>

                  <Button onClick={handleCreateSeason} disabled={creating} className="w-full rounded-xl">
                    {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Create Season
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {currentSeason && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" /> Active Season
            </h2>
            <Card className="relative overflow-hidden rounded-2xl border-primary/20 ring-1 ring-primary/10 shadow-stadium">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
              <CardContent className="relative z-10 py-6 px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl gradient-stadium flex items-center justify-center shadow-stadium">
                      <Calendar className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-display font-bold tracking-tight">{currentSeason.name}</h3>
                        <Badge className="bg-primary/15 text-primary border-primary/20 rounded-full text-[10px]">
                          Active
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(currentSeason.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        {" – "}
                        {new Date(currentSeason.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {pastSeasons.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4" /> Past Seasons
            </h2>
            <div className="space-y-3">
              {pastSeasons.map((s) => (
                <Card
                  key={s.id}
                  className="relative overflow-hidden rounded-2xl border-border/40 group hover:border-primary/20 transition-all duration-300"
                >
                  <CardContent className="py-4 px-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-muted/50 border border-border/30 flex items-center justify-center text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="font-display font-semibold tracking-tight">{s.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(s.start_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                          {" – "}
                          {new Date(s.end_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                        </p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSetCurrent(s.id)}
                      className="rounded-full border-border/40 hover:border-primary/30 hover:text-primary gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <CheckCircle className="h-3.5 w-3.5" /> Activate
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {seasons.length === 0 && (
          <Card className="rounded-2xl border-border/40 overflow-hidden">
            <CardContent className="py-16 text-center">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <CalendarDays className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-display font-bold text-lg">No Seasons Yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Create your first season to start organizing your loyalty program timeline.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
