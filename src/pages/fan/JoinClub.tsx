// FULL FINAL VERSION — SEARCH + FILTER + INVITE + SIGNOUT
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePreviewMode } from "@/contexts/PreviewModeContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Logo } from "@/components/ui/Logo";
import { EnrollmentModal } from "@/components/ui/EnrollmentModal";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle, LogOut, Sparkles } from "lucide-react";
import { Club, LoyaltyProgram } from "@/types/database";

interface ClubWithProgram extends Club {
  loyalty_programs: LoyaltyProgram[];
}

export default function JoinClub() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, signOut, loading } = useAuth();
  const { toast } = useToast();

  const isPreviewMode = searchParams.get("preview") === "fan";

  const [clubs, setClubs] = useState<ClubWithProgram[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [selectedClub, setSelectedClub] = useState<ClubWithProgram | null>(null);

  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");

  const [requestClubName, setRequestClubName] = useState("");
  const [requestCountry, setRequestCountry] = useState("");
  const [requestContact, setRequestContact] = useState("");
  const [requestSending, setRequestSending] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!isPreviewMode && !profile) {
      navigate("/auth", { replace: true });
      return;
    }

    if (!isPreviewMode && profile?.role === "club_admin") {
      navigate("/club/dashboard", { replace: true });
      return;
    }

    if (!isPreviewMode && profile?.role === "fan") {
      initRealFlow();
    }
  }, [loading, profile, isPreviewMode, navigate]);

  const initRealFlow = async () => {
    const alreadyMember = await checkMembership();
    if (alreadyMember) return;
    await fetchClubs();
  };

  const checkMembership = async (): Promise<boolean> => {
    if (!profile) return false;

    const { data, error } = await supabase.from("fan_memberships").select("id").eq("fan_id", profile.id).limit(1);

    if (error) return false;

    if (data?.length) {
      navigate("/fan/home", { replace: true });
      return true;
    }

    return false;
  };

  const fetchClubs = async () => {
    setDataLoading(true);

    try {
      const { data, error } = await (supabase as any)
        .from("clubs")
        .select("*, loyalty_programs(*)")
        .eq("is_verified", true);

      if (error) throw error;

      setClubs((data ?? []) as unknown as ClubWithProgram[]);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to load clubs.",
        variant: "destructive",
      });
    } finally {
      setDataLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  const handleJoinClick = (club: ClubWithProgram) => {
    if (!club.loyalty_programs?.length) {
      toast({
        title: "No Loyalty Program",
        description: "This club has not launched a loyalty program yet.",
        variant: "destructive",
      });
      return;
    }

    setSelectedClub(club);
    setEnrollModalOpen(true);
  };

  const handleConfirmJoin = async () => {
    if (!selectedClub || !profile) return;

    setJoining(selectedClub.id);

    try {
      const { error } = await supabase.from("fan_memberships").insert({
        fan_id: profile.id,
        club_id: selectedClub.id,
        program_id: selectedClub.loyalty_programs[0].id,
      });

      if (error) throw error;

      toast({
        title: "Welcome!",
        description: `You joined ${selectedClub.name}!`,
      });

      navigate("/fan/home");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to join.",
        variant: "destructive",
      });
    } finally {
      setJoining(null);
      setEnrollModalOpen(false);
    }
  };

  const countries = Array.from(new Set(clubs.map((c) => c.country).filter(Boolean))).sort();

  const filteredClubs = clubs.filter((c) => {
    const matchSearch =
      (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.city || "").toLowerCase().includes(search.toLowerCase());

    const matchCountry = countryFilter === "all" || c.country === countryFilter;

    return matchSearch && matchCountry;
  });

  const handleSendJoinRequest = async () => {
    if (!profile || !requestClubName.trim()) return;

    setRequestSending(true);

    try {
      const { error } = await (supabase as any).from("club_join_requests").insert({
        fan_id: profile.id,
        club_name: requestClubName.trim(),
        country: requestCountry || null,
        club_contact: requestContact || null,
      } as any);

      if (error) throw error;

      toast({
        title: "Request sent",
        description: "We saved your request and will notify the club.",
      });

      setRequestClubName("");
      setRequestCountry("");
      setRequestContact("");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to send request.",
        variant: "destructive",
      });
    } finally {
      setRequestSending(false);
    }
  };

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <header className="relative border-b border-border/40 overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-40" />
        <div className="relative container py-4 flex items-center justify-between">
          <Logo size="sm" />
          <Button variant="ghost" onClick={handleSignOut} className="rounded-full text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </header>

      <main className="container py-10 space-y-10">
        {/* HERO */}
        <div className="relative overflow-hidden rounded-3xl border border-border/40">
          <div className="absolute inset-0 gradient-hero" />
          <div className="absolute inset-0 stadium-pattern" />
          <div className="absolute inset-0 pitch-lines opacity-30" />

          <div className="relative z-10 p-8 md:p-10 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-xs font-semibold text-accent uppercase tracking-wider">Get Started</span>
            </div>
            <Logo size="lg" className="justify-center" />
            <h1 className="text-3xl md:text-4xl font-display font-bold mt-6 text-white tracking-tight">Choose Your Club</h1>
            <p className="text-white/50 mt-2">Join a loyalty program and start earning rewards</p>
          </div>
        </div>

        {/* SEARCH + FILTER */}
        <div className="grid md:grid-cols-3 gap-4">
          <Input
            placeholder="Search club or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-12 rounded-xl bg-card border-border/40"
          />
          <Select value={countryFilter} onValueChange={setCountryFilter}>
            <SelectTrigger className="h-12 rounded-xl bg-card border-border/40">
              <SelectValue placeholder="Filter by country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All countries</SelectItem>
              {countries.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* CLUB GRID */}
        {filteredClubs.length === 0 ? (
          <Card className="rounded-2xl border-border/40">
            <CardContent className="py-12 text-center">
              <div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-muted/20 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-display font-semibold text-foreground">No clubs found</h3>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClubs.map((club) => (
              <Card key={club.id} className="relative overflow-hidden rounded-2xl border-border/40 card-hover">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
                <CardContent className="relative z-10 p-6">
                  <h3 className="font-display font-semibold text-lg text-foreground">{club.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{club.city}, {club.country}</p>

                  <Button
                    className="w-full mt-4 rounded-xl gradient-stadium font-semibold shadow-stadium"
                    onClick={() => handleJoinClick(club)}
                    disabled={!club.loyalty_programs?.length || joining === club.id}
                  >
                    {joining === club.id && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {club.loyalty_programs?.length ? "Enroll" : "Not Available"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* INVITE CLUB */}
        <Card className="relative overflow-hidden rounded-2xl border-border/40">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />
          <CardContent className="relative z-10 p-6 space-y-3">
            <h3 className="font-display font-semibold text-lg text-foreground">Can't find your club?</h3>
            <p className="text-sm text-muted-foreground">Let us know and we'll reach out to them</p>

            <Input
              placeholder="Club name"
              value={requestClubName}
              onChange={(e) => setRequestClubName(e.target.value)}
              className="h-12 rounded-xl bg-card border-border/40"
            />
            <Input
              placeholder="Country (optional)"
              value={requestCountry}
              onChange={(e) => setRequestCountry(e.target.value)}
              className="h-12 rounded-xl bg-card border-border/40"
            />
            <Input
              placeholder="Club email or website (optional)"
              value={requestContact}
              onChange={(e) => setRequestContact(e.target.value)}
              className="h-12 rounded-xl bg-card border-border/40"
            />

            <Button className="w-full rounded-xl gradient-golden font-semibold" onClick={handleSendJoinRequest} disabled={requestSending}>
              {requestSending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Send request
            </Button>
          </CardContent>
        </Card>
      </main>

      <EnrollmentModal
        open={enrollModalOpen}
        onOpenChange={setEnrollModalOpen}
        clubName={selectedClub?.name || ""}
        onConfirm={handleConfirmJoin}
        isLoading={!!joining}
      />
    </div>
  );
}
