import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { usePreviewMode } from "@/contexts/PreviewModeContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Logo } from "@/components/ui/Logo";
import { PreviewBanner } from "@/components/ui/PreviewBanner";
import { EnrollmentModal } from "@/components/ui/EnrollmentModal";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Search,
  MapPin,
  Shield,
  LogOut,
  Trophy,
  Sparkles,
} from "lucide-react";
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

  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");

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
  }, [loading, profile, isPreviewMode]);

  const initRealFlow = async () => {
    const alreadyMember = await checkMembership();
    if (alreadyMember) return;
    await fetchClubs();
  };

  const checkMembership = async (): Promise<boolean> => {
    if (!profile) return false;
    const { data } = await supabase
      .from("fan_memberships")
      .select("id")
      .eq("fan_id", profile.id)
      .limit(1);
    if (data?.length) {
      navigate("/fan/home", { replace: true });
      return true;
    }
    return false;
  };

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

  const countries = Array.from(new Set(clubs.map((c) => c.country))).sort();

  const filteredClubs = clubs.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.city.toLowerCase().includes(search.toLowerCase());
    const matchCountry = countryFilter === "all" || c.country === countryFilter;
    return matchSearch && matchCountry;
  });

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="fan" />}

      {/* Sign out button */}
      <div className="absolute top-4 right-4 z-20">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="text-white/70 hover:text-white hover:bg-white/10 rounded-full gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>

      {/* ─── HERO ─── */}
      <header className="fan-hero-header gradient-fan-hero px-5 pt-16 pb-10 text-center relative">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10"
        >
          <Logo size="lg" className="justify-center" />
          <h1 className="text-3xl font-display font-bold text-white mt-6">
            Choose Your Club
          </h1>
          <p className="text-white/50 text-sm mt-2 max-w-xs mx-auto">
            Join a loyalty program and start earning rewards for your fandom
          </p>
        </motion.div>
      </header>

      <main className="px-5 py-6 max-w-2xl mx-auto space-y-5">
        {/* ─── SEARCH & FILTER ─── */}
        <motion.div
          className="flex gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search club or city…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl h-11 bg-card border-border/50"
            />
          </div>
          <Select value={countryFilter} onValueChange={setCountryFilter}>
            <SelectTrigger className="w-[140px] rounded-xl h-11 bg-card border-border/50">
              <SelectValue placeholder="Country" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">All countries</SelectItem>
              {countries.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {/* ─── CLUB GRID ─── */}
        {filteredClubs.length === 0 ? (
          <motion.div
            className="card-fan p-12 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Trophy className="h-16 w-16 text-muted-foreground/15 mx-auto mb-4" />
            <h3 className="text-lg font-display font-semibold text-foreground">
              No clubs found
            </h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
              Try a different search or check back later for new clubs
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AnimatePresence>
              {filteredClubs.map((club, i) => {
                const hasProgram = club.loyalty_programs?.length > 0;
                return (
                  <motion.div
                    key={club.id}
                    className="card-fan card-press p-5 flex flex-col gap-3"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileTap={{ scale: 0.97 }}
                    layout
                  >
                    <div className="flex items-start gap-3">
                      {/* Club color dot */}
                      <div
                        className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: club.primary_color
                            ? `${club.primary_color}20`
                            : "hsl(var(--primary) / 0.1)",
                        }}
                      >
                        <Shield
                          className="h-5 w-5"
                          style={{
                            color: club.primary_color || "hsl(var(--primary))",
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm leading-tight">
                          {club.name}
                        </h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" />
                          {club.city}, {club.country}
                        </p>
                      </div>
                    </div>

                    {hasProgram && (
                      <div className="flex items-center gap-1.5 text-xs text-primary">
                        <Sparkles className="h-3 w-3" />
                        <span className="font-medium">
                          {club.loyalty_programs[0].name}
                        </span>
                      </div>
                    )}

                    <Button
                      className="w-full rounded-xl h-9 text-xs font-semibold gradient-stadium text-white"
                      onClick={() => handleJoinClick(club)}
                      disabled={!hasProgram || joining === club.id}
                    >
                      {joining === club.id && (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      )}
                      {hasProgram ? "Join Club" : "No Program Yet"}
                    </Button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
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
