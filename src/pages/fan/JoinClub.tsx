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
import { PreviewBanner } from "@/components/ui/PreviewBanner";
import { EnrollmentModal } from "@/components/ui/EnrollmentModal";
import { useToast } from "@/hooks/use-toast";
import { Search, MapPin, Loader2, Globe, AlertCircle } from "lucide-react";
import { Club, LoyaltyProgram } from "@/types/database";

interface ClubWithProgram extends Club {
  loyalty_programs: LoyaltyProgram[];
}

// Sample preview data for demo
const PREVIEW_CLUBS: ClubWithProgram[] = [
  {
    id: "preview-club-1",
    admin_id: "preview-admin",
    name: "Manchester United FC",
    logo_url: null,
    primary_color: "#DA291C",
    country: "United Kingdom",
    city: "Manchester",
    stadium_name: "Old Trafford",
    season_start: null,
    season_end: null,
    status: "verified",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    loyalty_programs: [
      {
        id: "preview-program-1",
        club_id: "preview-club-1",
        name: "Red Devils Rewards",
        description: "Earn points by supporting United!",
        points_currency_name: "Red Points",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  },
  {
    id: "preview-club-2",
    admin_id: "preview-admin",
    name: "Real Madrid CF",
    logo_url: null,
    primary_color: "#FEBE10",
    country: "Spain",
    city: "Madrid",
    stadium_name: "Santiago Bernabéu",
    season_start: null,
    season_end: null,
    status: "verified",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    loyalty_programs: [
      {
        id: "preview-program-2",
        club_id: "preview-club-2",
        name: "Madridista Points",
        description: "Be part of the best club in the world!",
        points_currency_name: "Galáctico Points",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  },
  {
    id: "preview-club-3",
    admin_id: "preview-admin",
    name: "Bayern Munich",
    logo_url: null,
    primary_color: "#DC052D",
    country: "Germany",
    city: "Munich",
    stadium_name: "Allianz Arena",
    season_start: null,
    season_end: null,
    status: "verified",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    loyalty_programs: [
      {
        id: "preview-program-3",
        club_id: "preview-club-3",
        name: "Bayern Fan Club",
        description: "Mia san Mia - Earn rewards!",
        points_currency_name: "Bayern Stars",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  },
];

// Club without a loyalty program for demo
const PREVIEW_CLUB_NO_PROGRAM: ClubWithProgram = {
  id: "preview-club-no-program",
  admin_id: "preview-admin",
  name: "New Town FC",
  logo_url: null,
  primary_color: "#6B7280",
  country: "United Kingdom",
  city: "New Town",
  stadium_name: "Community Stadium",
  season_start: null,
  season_end: null,
  status: "verified",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  loyalty_programs: [],
};

// Unverified club (should NOT appear in fan search - shown here for demo)
const PREVIEW_CLUB_UNVERIFIED: ClubWithProgram = {
  id: "preview-club-unverified",
  admin_id: "preview-admin",
  name: "Pending FC",
  logo_url: null,
  primary_color: "#9CA3AF",
  country: "France",
  city: "Paris",
  stadium_name: "Small Stadium",
  season_start: null,
  season_end: null,
  status: "unverified", // Not shown to fans
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  loyalty_programs: [
    {
      id: "preview-program-unverified",
      club_id: "preview-club-unverified",
      name: "Pending Rewards",
      description: "Not yet visible",
      points_currency_name: "Points",
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
};

export default function JoinClub() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, loading } = useAuth();
  const { previewEnrolledClub, setPreviewEnrolledClub } = usePreviewMode();
  const { toast } = useToast();

  const isPreviewMode = searchParams.get("preview") === "fan";

  const [clubs, setClubs] = useState<ClubWithProgram[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [dataLoading, setDataLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [selectedClub, setSelectedClub] = useState<ClubWithProgram | null>(null);

  useEffect(() => {
    if (isPreviewMode) {
      // Use preview data - only include verified/official clubs (filter out unverified)
      const allPreviewClubs = [...PREVIEW_CLUBS, PREVIEW_CLUB_NO_PROGRAM, PREVIEW_CLUB_UNVERIFIED];
      const verifiedClubs = allPreviewClubs.filter((c) => c.status === "verified" || c.status === "official");
      setClubs(verifiedClubs);
      setDataLoading(false);
    } else if (!loading && profile) {
      checkMembership();
      fetchClubs();
    }
  }, [profile, loading, isPreviewMode]);

  const checkMembership = async () => {
    if (!profile) return;
    const { data } = await supabase.from("fan_memberships").select("id").eq("fan_id", profile.id).limit(1);
    if (data?.length) navigate("/fan/home");
  };

  const fetchClubs = async () => {
    setDataLoading(true);
    const { data } = await supabase
      .from("clubs")
      .select("*, loyalty_programs(*)")
      .in("status", ["verified", "official"]);
    const clubsWithPrograms = (data || []) as unknown as ClubWithProgram[];
    setClubs(clubsWithPrograms);
    setDataLoading(false);
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
    if (!selectedClub) return;

    if (isPreviewMode) {
      // In preview mode, track the enrolled club in context
      setPreviewEnrolledClub({ id: selectedClub.id, name: selectedClub.name });
      toast({
        title: "Welcome!",
        description: `You joined ${selectedClub.name}'s loyalty program!`,
      });
      navigate(`/fan/home?preview=fan&club=${selectedClub.id}`);
      return;
    }

    if (!profile) return;
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
        description: `You joined ${selectedClub.name}'s loyalty program!`,
      });
      navigate("/fan/home");
    } catch (e) {
      toast({ title: "Error", description: "Failed to join", variant: "destructive" });
    }
    setJoining(null);
    setEnrollModalOpen(false);
  };

  // Get unique countries
  const countries = Array.from(new Set(clubs.map((c) => c.country))).sort();

  // Filter clubs
  const filtered = clubs.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) || c.city.toLowerCase().includes(search.toLowerCase());
    const matchesCountry = selectedCountry === "all" || c.country === selectedCountry;
    return matchesSearch && matchesCountry;
  });

  if (!isPreviewMode && (loading || dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="fan" />}

      {/* Header */}
      <header className="py-16 gradient-stadium">
        <div className="absolute top-4 right-4">
          <Button variant="secondary" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
        <div className="container text-center">
          <Logo size="lg" className="justify-center" />
          <h1 className="text-3xl font-display font-bold text-primary-foreground mt-6">Choose Your Club</h1>
          <p className="text-primary-foreground/80 mb-6">Find your club and start earning rewards</p>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search clubs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-background/90 border-0"
              />
            </div>
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger className="w-full sm:w-48 bg-background/90 border-0">
                <Globe className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Countries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {countries.map((country) => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      {/* Club Grid */}
      <main className="container py-8">
        {dataLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Clubs Found</h3>
              <p className="text-muted-foreground">
                {search || selectedCountry !== "all"
                  ? "Try adjusting your search or filters."
                  : "No clubs are available yet. Check back soon!"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((club) => {
              const hasProgram = club.loyalty_programs?.length > 0;
              return (
                <Card key={club.id} className="card-hover overflow-hidden">
                  {/* Club Header with Color */}
                  <div
                    className="h-24 flex items-center justify-center relative"
                    style={{ backgroundColor: club.primary_color }}
                  >
                    <span className="text-4xl font-bold text-white/90">{club.name.charAt(0)}</span>
                    {!hasProgram && (
                      <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/50 rounded text-xs text-white">
                        Coming Soon
                      </div>
                    )}
                  </div>

                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg">{club.name}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                      <MapPin className="h-4 w-4" />
                      {club.city}, {club.country}
                    </p>

                    {hasProgram ? (
                      <>
                        <p className="text-sm text-primary mb-4">{club.loyalty_programs[0].name}</p>
                        <Button
                          className="w-full gradient-stadium"
                          onClick={() => handleJoinClick(club)}
                          disabled={joining === club.id}
                        >
                          {joining === club.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Enroll
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground mb-4 italic">
                          This club has not launched a loyalty program yet.
                        </p>
                        <Button className="w-full" variant="outline" disabled>
                          Not Available
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Enrollment Modal */}
      <EnrollmentModal
        open={enrollModalOpen}
        onOpenChange={setEnrollModalOpen}
        clubName={selectedClub?.name || ""}
        onConfirm={handleConfirmJoin}
        isLoading={!!joining}
        isAlreadyEnrolled={!!previewEnrolledClub && selectedClub?.id !== previewEnrolledClub.id}
        currentClubName={previewEnrolledClub?.name}
        onViewMyClub={() => {
          setEnrollModalOpen(false);
          navigate(`/fan/home?preview=fan&club=${previewEnrolledClub?.id}`);
        }}
      />
    </div>
  );
}
