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

  /* ---------------- SIGN OUT ---------------- */
  const handleSignOut = async () => {
    try {
      if (isPreviewMode) {
        setPreviewEnrolledClub(null);
        navigate("/auth?preview=fan");
        return;
      }

      await supabase.auth.signOut();

      toast({
        title: "Signed out",
        description: "You have been logged out successfully.",
      });

      navigate("/auth");
    } catch {
      toast({
        title: "Error",
        description: "Failed to sign out.",
        variant: "destructive",
      });
    }
  };

  /* ---------------- EFFECT ---------------- */
  useEffect(() => {
    if (isPreviewMode) {
      const allPreviewClubs = [...PREVIEW_CLUBS, PREVIEW_CLUB_NO_PROGRAM, PREVIEW_CLUB_UNVERIFIED];
      const verifiedClubs = allPreviewClubs.filter((c) => c.status === "verified" || c.status === "official");
      setClubs(verifiedClubs);
      setDataLoading(false);
      return;
    }

    if (!loading && !profile) {
      navigate("/auth");
      return;
    }

    if (!loading && profile) {
      checkMembership();
      fetchClubs();
    }
  }, [profile, loading, isPreviewMode]);

  /* ---------------- MEMBERSHIP CHECK ---------------- */
  const checkMembership = async () => {
    if (!profile) return;

    const { data, error } = await supabase.from("fan_memberships").select("id").eq("fan_id", profile.id).limit(1);

    if (!error && data?.length) navigate("/fan/home");
  };

  /* ---------------- FETCH CLUBS ---------------- */
  const fetchClubs = async () => {
    setDataLoading(true);

    try {
      const { data, error } = await supabase
        .from("clubs")
        .select("*, loyalty_programs(*)")
        .in("status", ["verified", "official"]);

      if (error) throw error;

      setClubs((data || []) as unknown as ClubWithProgram[]);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load clubs.",
        variant: "destructive",
      });
    } finally {
      setDataLoading(false);
    }
  };

  /* ---------------- JOIN FLOW ---------------- */
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

    if (isPreviewMode) {
      setPreviewEnrolledClub({ id: selectedClub.id, name: selectedClub.name });

      toast({
        title: "Welcome!",
        description: `You joined ${selectedClub.name}'s loyalty program!`,
      });

      navigate(`/fan/home?preview=fan&club=${selectedClub.id}`);
      return;
    }

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
    } catch {
      toast({
        title: "Error",
        description: "Failed to join.",
        variant: "destructive",
      });
    } finally {
      setJoining(null);
      setEnrollModalOpen(false);
    }
  };

  /* ---------------- FILTERING ---------------- */
  const countries = Array.from(new Set(clubs.map((c) => c.country))).sort();

  const filtered = clubs.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) || c.city.toLowerCase().includes(search.toLowerCase());

    const matchesCountry = selectedCountry === "all" || c.country === selectedCountry;

    return matchesSearch && matchesCountry;
  });

  /* ---------------- LOADING ---------------- */
  if (!isPreviewMode && (loading || dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="fan" />}

      {/* HEADER */}
      <header className="py-16 gradient-stadium relative">
        <div className="absolute top-4 right-4">
          <Button variant="secondary" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>

        <div className="container text-center">
          <Logo size="lg" className="justify-center" />
          <h1 className="text-3xl font-display font-bold text-primary-foreground mt-6">Choose Your Club</h1>
          <p className="text-primary-foreground/80 mb-6">Find your club and start earning rewards</p>
        </div>
      </header>

      {/* CLUB GRID */}
      <main className="container py-8">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Clubs Found</h3>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((club) => {
              const hasProgram = club.loyalty_programs?.length > 0;

              return (
                <Card key={club.id} className="card-hover overflow-hidden">
                  <div
                    className="h-24 flex items-center justify-center relative"
                    style={{ backgroundColor: club.primary_color }}
                  >
                    <span className="text-4xl font-bold text-white/90">{club.name.charAt(0)}</span>
                  </div>

                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg">{club.name}</h3>

                    {hasProgram ? (
                      <Button
                        className="w-full gradient-stadium mt-4"
                        onClick={() => handleJoinClick(club)}
                        disabled={joining === club.id}
                      >
                        {joining === club.id && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Enroll
                      </Button>
                    ) : (
                      <Button className="w-full mt-4" variant="outline" disabled>
                        Not Available
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* ENROLL MODAL */}
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
