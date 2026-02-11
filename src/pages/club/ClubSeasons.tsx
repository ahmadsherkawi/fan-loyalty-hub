import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/Logo";
import { PreviewBanner } from "@/components/ui/PreviewBanner";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  CalendarPlus,
  CalendarCheck,
  CalendarX2,
  ArrowLeft,
  Plus,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import type { Club } from "@/types/database";

interface Season {
  id: string;
  club_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * ClubSeasons allows club administrators to manage their seasons. They can
 * create new seasons and set which season is currently active. This page
 * relies on the season functions defined in seasons_and_tiers.sql. It
 * fetches existing seasons for the club and provides a simple form to
 * create a new one.
 */
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

  // Load club and seasons on mount
  useEffect(() => {
    if (isPreviewMode) {
      // Use dummy data in preview mode
      setClub({
        id: "preview",
        admin_id: "preview-admin",
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
          id: "preview-season-1",
          club_id: "preview",
          name: "2025 Season",
          start_date: "2025-01-01",
          end_date: "2025-12-31",
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
      setDataLoading(false);
    } else {
      if (!loading && !user) {
        navigate("/auth?role=club_admin");
        return;
      }
      if (!loading && profile?.role !== "club_admin") {
        navigate("/fan/home");
        return;
      }
      if (!loading && profile) {
        fetchData();
      }
    }
  }, [loading, user, profile, isPreviewMode]);

  const fetchData = async () => {
    if (!profile) return;
    setDataLoading(true);
    try {
      // Get the club owned by this admin
      const { data: clubs } = await supabase.from("clubs").select("*").eq("admin_id", profile.id).limit(1);
      if (!clubs?.length) {
        navigate("/club/onboarding");
        return;
      }
      const c = clubs[0] as Club;
      setClub(c);
      // Fetch seasons for this club
      const { data: seasonRows, error: seasonErr } = await supabase
        .from("club_seasons")
        .select("*")
        .eq("club_id", c.id)
        .order("start_date", { ascending: false });
      if (seasonErr) throw seasonErr;
      setSeasons((seasonRows ?? []) as Season[]);
    } catch (err: any) {
      console.error("ClubSeasons fetch error:", err);
      toast({ title: "Error", description: err?.message || "Failed to load seasons.", variant: "destructive" });
    } finally {
      setDataLoading(false);
    }
  };

  const handleCreateSeason = async () => {
    if (!club) return;
    // Basic validation
    if (!seasonName.trim()) {
      toast({ title: "Name required", description: "Please enter a season name.", variant: "destructive" });
      return;
    }
    if (!startDate || !endDate) {
      toast({ title: "Dates required", description: "Please select start and end dates.", variant: "destructive" });
      return;
    }
    if (new Date(startDate) >= new Date(endDate)) {
      toast({ title: "Invalid dates", description: "End date must be after start date.", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      // Call RPC to create the season
      const { error } = await supabase.rpc("create_season", {
        p_club_id: club.id,
        p_name: seasonName.trim(),
        p_start_date: startDate,
        p_end_date: endDate,
      });
      if (error) throw error;
      toast({ title: "Season Created", description: "Your new season has been created." });
      setCreatingDialogOpen(false);
      setSeasonName("");
      setStartDate("");
      setEndDate("");
      await fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to create season.", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleSetActive = async (seasonId: string) => {
    if (!club) return;
    try {
      const { error } = await supabase.rpc("set_current_season", {
        p_club_id: club.id,
        p_season_id: seasonId,
      });
      if (error) throw error;
      toast({ title: "Season Activated", description: "This season is now the current active season." });
      await fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to activate season.", variant: "destructive" });
    }
  };

  if (!isPreviewMode && (loading || dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="club_admin" />}

      {/* Header */}
      <header className="border-b bg-card">
        <div className="container py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate(isPreviewMode ? "/club/dashboard?preview=club_admin" : "/club/dashboard")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <Logo />
        </div>
      </header>

      {/* Main */}
      <main className="container py-8 max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-2">
              <CalendarPlus className="h-8 w-8 text-primary" /> Seasons
            </h1>
            <p className="text-muted-foreground">Manage your club’s seasons and set the current one.</p>
          </div>
          <Dialog open={creatingDialogOpen} onOpenChange={setCreatingDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-stadium">
                <Plus className="h-4 w-4 mr-2" /> Create Season
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Season</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1">
                  <Label htmlFor="seasonName">Name *</Label>
                  <Input
                    id="seasonName"
                    value={seasonName}
                    onChange={(e) => setSeasonName(e.target.value)}
                    placeholder="e.g., 2025 Season"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <Button onClick={handleCreateSeason} disabled={creating} className="w-full gradient-stadium">
                  {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Create Season
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        {/* Seasons list */}
        {seasons.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CalendarX2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No seasons created</h3>
              <p className="text-muted-foreground mb-4">
                Create your first season to begin tracking tiers and progress.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {seasons.map((s) => (
              <Card key={s.id} className="border-border/50">
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      {s.name}
                      {s.is_active && <Badge variant="default">Current</Badge>}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(s.start_date).toLocaleDateString()} – {new Date(s.end_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!s.is_active && (
                      <Button variant="outline" size="sm" onClick={() => handleSetActive(s.id)}>
                        <CheckCircle className="h-4 w-4 mr-1" /> Set Active
                      </Button>
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
