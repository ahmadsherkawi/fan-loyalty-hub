import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/Logo";
import { PreviewBanner } from "@/components/ui/PreviewBanner";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CalendarPlus, CalendarX2, ArrowLeft, Plus, CheckCircle } from "lucide-react";
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
          id: "preview-season",
          club_id: "preview",
          name: "2025 Season",
          start_date: "2025-01-01",
          end_date: "2025-12-31",
          is_current: true,
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
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

      <main className="container py-8 max-w-3xl">
        <div className="flex justify-between mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CalendarPlus className="h-8 w-8 text-primary" /> Seasons
          </h1>

          <Dialog open={creatingDialogOpen} onOpenChange={setCreatingDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" /> Create Season
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Season</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <Input placeholder="Season name" value={seasonName} onChange={(e) => setSeasonName(e.target.value)} />
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />

                <Button onClick={handleCreateSeason} disabled={creating} className="w-full">
                  {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Create
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {seasons.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">No seasons yet</CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {seasons.map((s) => (
              <Card key={s.id}>
                <CardContent className="flex justify-between py-4">
                  <div>
                    <h3 className="font-semibold flex gap-2">
                      {s.name}
                      {s.is_current && <Badge>Current</Badge>}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(s.start_date).toLocaleDateString()} – {new Date(s.end_date).toLocaleDateString()}
                    </p>
                  </div>

                  {!s.is_current && (
                    <Button size="sm" onClick={() => handleSetCurrent(s.id)}>
                      <CheckCircle className="h-4 w-4 mr-1" /> Set Current
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
