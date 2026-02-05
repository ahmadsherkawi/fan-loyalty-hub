import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePreviewMode } from "@/contexts/PreviewModeContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

  /**
   * AUTH + ROLE GUARD
   */
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

    if (isPreviewMode) {
      loadPreviewClubs();
    } else if (profile?.role === "fan") {
      initRealFlow();
    }
  }, [loading, profile, isPreviewMode]);

  /**
   * PREVIEW MODE
   */
  const loadPreviewClubs = () => {
    // Keep your preview data as-is
    setDataLoading(false);
  };

  /**
   * REAL FLOW
   */
  const initRealFlow = async () => {
    const alreadyMember = await checkMembership();
    if (alreadyMember) return;

    await fetchClubs();
  };

  /**
   * CHECK MEMBERSHIP
   */
  const checkMembership = async (): Promise<boolean> => {
    if (!profile) return false;

    try {
      const { data } = await supabase.from("fan_memberships").select("id").eq("fan_id", profile.id).limit(1);

      if (data?.length) {
        navigate("/fan/home", { replace: true });
        return true;
      }
    } catch (err) {
      console.error("Membership check failed:", err);
    }

    return false;
  };

  /**
   * FETCH CLUBS
   */
  const fetchClubs = async () => {
    setDataLoading(true);

    try {
      const { data, error } = await supabase
        .from("clubs")
        .select("*, loyalty_programs(*)")
        .in("status", ["verified", "official"]);

      if (error) throw error;

      setClubs((data ?? []) as unknown as ClubWithProgram[]);
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

  /**
   * JOIN CLICK
   */
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

  /**
   * CONFIRM JOIN
   */
  const handleConfirmJoin = async () => {
    if (!selectedClub || !profile) return;

    if (isPreviewMode) {
      setPreviewEnrolledClub({ id: selectedClub.id, name: selectedClub.name });
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

      if (error) {
        // Duplicate membership protection
        if (error.message.includes("duplicate")) {
          navigate("/fan/home");
          return;
        }

        throw error;
      }

      toast({
        title: "Welcome!",
        description: `You joined ${selectedClub.name}!`,
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

  /**
   * LOADING
   */
  if (!isPreviewMode && (loading || dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  /**
   * UI
   */
  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="fan" />}

      <header className="py-16 gradient-stadium">
        <div className="container text-center">
          <Logo size="lg" className="justify-center" />
          <h1 className="text-3xl font-bold text-primary-foreground mt-6">Choose Your Club</h1>
        </div>
      </header>

      <main className="container py-8">
        {clubs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4" />
              <h3 className="text-lg font-semibold">No Clubs Found</h3>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clubs.map((club) => {
              const hasProgram = club.loyalty_programs?.length > 0;

              return (
                <Card key={club.id} className="card-hover">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg">{club.name}</h3>

                    <Button
                      className="w-full mt-4"
                      onClick={() => handleJoinClick(club)}
                      disabled={!hasProgram || joining === club.id}
                    >
                      {joining === club.id && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      {hasProgram ? "Enroll" : "Not Available"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
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
