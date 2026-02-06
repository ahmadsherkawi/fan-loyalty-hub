import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePreviewMode } from "@/contexts/PreviewModeContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/Logo";
import { PreviewBanner } from "@/components/ui/PreviewBanner";
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
  const { previewEnrolledClub, setPreviewEnrolledClub } = usePreviewMode();
  const { toast } = useToast();

  const isPreviewMode = searchParams.get("preview") === "fan";

  const [clubs, setClubs] = useState<ClubWithProgram[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [selectedClub, setSelectedClub] = useState<ClubWithProgram | null>(null);

  // invite request state
  const [requestClubName, setRequestClubName] = useState("");
  const [requestCountry, setRequestCountry] = useState("");
  const [requestContact, setRequestContact] = useState("");
  const [requestSending, setRequestSending] = useState(false);

  /* AUTH GUARD */
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
    } else {
      setDataLoading(false);
    }
  }, [loading, profile, isPreviewMode]);

  const initRealFlow = async () => {
    const { data } = await supabase.from("fan_memberships").select("id").eq("fan_id", profile!.id).limit(1);

    if (data?.length) {
      navigate("/fan/home", { replace: true });
      return;
    }

    await fetchClubs();
  };

  const fetchClubs = async () => {
    setDataLoading(true);
    try {
      const { data, error } = await supabase
        .from("clubs")
        .select("*, loyalty_programs(*)")
        .in("status", ["verified", "official"]);

      if (error) throw error;
      setClubs((data ?? []) as ClubWithProgram[]);
    } catch {
      toast({ title: "Error", description: "Failed to load clubs.", variant: "destructive" });
    } finally {
      setDataLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  /* JOIN */
  const handleJoinClick = (club: ClubWithProgram) => {
    if (!club.loyalty_programs?.length) {
      toast({ title: "No Loyalty Program", description: "This club has not launched one.", variant: "destructive" });
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

      toast({ title: "Welcome!", description: `You joined ${selectedClub.name}!` });
      navigate("/fan/home");
    } catch {
      toast({ title: "Error", description: "Failed to join.", variant: "destructive" });
    } finally {
      setJoining(null);
      setEnrollModalOpen(false);
    }
  };

  /* INVITE CLUB EMAIL */
  const handleSendJoinRequest = async () => {
    if (!requestClubName.trim()) {
      toast({ title: "Missing info", description: "Enter club name.", variant: "destructive" });
      return;
    }

    const fanName = profile?.full_name || profile?.email?.split("@")[0] || "Fan";

    const subject = "Request to join ClubPass loyalty program";
    const body = `Hello,

My name is ${fanName}.
I tried to join your ClubPass loyalty program but couldn't find your club in the app.

Club name: ${requestClubName}
Country: ${requestCountry || "N/A"}

Please create or verify your club so fans can enroll.

Thanks,
${fanName}`;

    setRequestSending(true);

    try {
      await supabase.from("club_join_requests").insert({
        fan_id: profile!.id,
        club_name: requestClubName,
        country: requestCountry || null,
        club_contact: requestContact || null,
        message: body,
      });

      toast({ title: "Request saved", description: "You can also email the club." });

      if (requestContact.includes("@")) {
        window.location.href = `mailto:${requestContact}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      }
    } catch {
      toast({ title: "Error", description: "Failed to send request.", variant: "destructive" });
    } finally {
      setRequestSending(false);
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
      <div className="absolute top-4 right-4">
        <Button variant="secondary" onClick={handleSignOut}>
          Sign out
        </Button>
      </div>

      {isPreviewMode && <PreviewBanner role="fan" />}

      <header className="py-16 gradient-stadium text-center">
        <Logo size="lg" className="justify-center" />
        <h1 className="text-3xl font-bold text-primary-foreground mt-6">Choose Your Club</h1>
      </header>

      <main className="container py-8 space-y-8">
        {clubs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4" />
              <h3 className="text-lg font-semibold">No Clubs Found</h3>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clubs.map((club) => (
              <Card key={club.id}>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg">{club.name}</h3>
                  <Button className="w-full mt-4" onClick={() => handleJoinClick(club)} disabled={joining === club.id}>
                    {joining === club.id && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Enroll
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Invite club */}
        <Card>
          <CardContent className="p-6 space-y-3">
            <h3 className="font-semibold text-lg">Can’t find your club?</h3>

            <Input
              placeholder="Club name"
              value={requestClubName}
              onChange={(e) => setRequestClubName(e.target.value)}
            />
            <Input placeholder="Country" value={requestCountry} onChange={(e) => setRequestCountry(e.target.value)} />
            <Input
              placeholder="Club email (optional)"
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
