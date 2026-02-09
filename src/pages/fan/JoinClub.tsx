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
import { Loader2, AlertCircle } from "lucide-react";
import { Club, LoyaltyProgram } from "@/types/database";

interface ClubWithProgram extends Club {
  loyalty_programs: LoyaltyProgram[];
}

export default function JoinClub() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, loading } = useAuth();
  const { toast } = useToast();

  const isPreviewMode = searchParams.get("preview") === "fan";

  const [clubs, setClubs] = useState<ClubWithProgram[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [selectedClub, setSelectedClub] = useState<ClubWithProgram | null>(null);

  // Search/filter
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");

  // Invite-club state
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
      const { data, error } = await supabase.from("clubs").select("*, loyalty_programs(*)").eq("is_verified", true);

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
    await supabase.auth.signOut();
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

  // SEARCH + FILTER
  const countries = Array.from(new Set(clubs.map((c) => c.country).filter(Boolean))).sort();

  const filteredClubs = clubs.filter((c) => {
    const matchSearch =
      (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.city || "").toLowerCase().includes(search.toLowerCase());

    const matchCountry = countryFilter === "all" || c.country === countryFilter;

    return matchSearch && matchCountry;
  });

  // INVITE CLUB
  const handleSendJoinRequest = async () => {
    if (!profile || !requestClubName.trim()) return;

    setRequestSending(true);

    try {
      const { error } = await supabase.from("club_join_requests").insert({
        fan_id: profile.id,
        club_name: requestClubName.trim(),
        country: requestCountry || null,
        club_contact: requestContact || null,
      });

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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute top-4 right-4">
        <Button variant="secondary" onClick={handleSignOut}>
          Sign out
        </Button>
      </div>

      <header className="py-16 gradient-stadium text-center">
        <Logo size="lg" className="justify-center" />
        <h1 className="text-3xl font-bold text-primary-foreground mt-6">Choose Your Club</h1>
      </header>

      <main className="container py-8 space-y-6">
        {/* SEARCH + FILTER */}
        <div className="grid md:grid-cols-3 gap-4">
          <Input placeholder="Search club or city..." value={search} onChange={(e) => setSearch(e.target.value)} />

          <Select value={countryFilter} onValueChange={setCountryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All countries</SelectItem>
              {countries.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* CLUB GRID */}
        {filteredClubs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4" />
              <h3 className="text-lg font-semibold">No clubs found</h3>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClubs.map((club) => (
              <Card key={club.id} className="card-hover">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg">{club.name}</h3>

                  <Button
                    className="w-full mt-4"
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
        <Card>
          <CardContent className="p-6 space-y-3">
            <h3 className="font-semibold text-lg">Can’t find your club?</h3>

            <Input
              placeholder="Club name"
              value={requestClubName}
              onChange={(e) => setRequestClubName(e.target.value)}
            />
            <Input
              placeholder="Country (optional)"
              value={requestCountry}
              onChange={(e) => setRequestCountry(e.target.value)}
            />
            <Input
              placeholder="Club email or website (optional)"
              value={requestContact}
              onChange={(e) => setRequestContact(e.target.value)}
            />

            <Button className="w-full" onClick={handleSendJoinRequest} disabled={requestSending}>
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
