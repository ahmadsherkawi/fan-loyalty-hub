import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/ui/Logo";
import { EnrollmentModal } from "@/components/ui/EnrollmentModal";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, AlertCircle, LogOut, Sparkles, Search, MapPin, Users, 
  ShieldCheck, Building2, Clock, CheckCircle, Send
} from "lucide-react";
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
  const [statusFilter, setStatusFilter] = useState("all");

  // Club request form
  const [requestClubName, setRequestClubName] = useState("");
  const [requestCountry, setRequestCountry] = useState("");
  const [requestContact, setRequestContact] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
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
      // Fetch clubs with their loyalty programs
      // Only show verified clubs that fans can join
      const { data, error } = await supabase
        .from("clubs")
        .select("*, loyalty_programs(*)")
        .in("status", ["verified", "official"])
        .order("name", { ascending: true });

      if (error) throw error;

      setClubs((data ?? []) as ClubWithProgram[]);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load clubs.";
      toast({
        title: "Error",
        description: errorMessage,
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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to join.";
      toast({
        title: "Error",
        description: errorMessage,
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
    
    const matchStatus = statusFilter === "all" || 
      (statusFilter === "has_program" && c.loyalty_programs?.length) ||
      (statusFilter === "no_program" && !c.loyalty_programs?.length);

    return matchSearch && matchCountry && matchStatus;
  });

  const handleSendClubRequest = async () => {
    if (!profile || !requestClubName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter the club name.",
        variant: "destructive",
      });
      return;
    }

    setRequestSending(true);

    try {
      // Store the request in a table that admin can see
      const { error } = await supabase.from("club_requests").insert({
        requester_id: profile.id,
        requester_email: profile.email,
        club_name: requestClubName.trim(),
        country: requestCountry.trim() || null,
        club_contact: requestContact.trim() || null,
        message: requestMessage.trim() || null,
        status: "pending",
      });

      if (error) {
        // If table doesn't exist, create a notification for admin instead
        if (error.message.includes("relation") || error.message.includes("does not exist")) {
          // Fallback: Create a notification
          await supabase.from("notifications").insert({
            user_id: "system",
            type: "club_request",
            data: {
              title: "New Club Request",
              message: `Fan ${profile.full_name || profile.email} requested club: ${requestClubName}`,
              requester_id: profile.id,
              requester_email: profile.email,
              club_name: requestClubName.trim(),
              country: requestCountry.trim() || null,
              club_contact: requestContact.trim() || null,
              notes: requestMessage.trim() || null,
            },
          });
        } else {
          throw error;
        }
      }

      toast({
        title: "Request Sent!",
        description: "We've received your request. Our team will reach out to the club.",
      });

      setRequestClubName("");
      setRequestCountry("");
      setRequestContact("");
      setRequestMessage("");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send request.";
      toast({
        title: "Error",
        description: errorMessage,
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
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight">
              Choose Your Club
            </h1>
            <p className="text-white/50 mt-2">Join a verified club's loyalty program and start earning rewards</p>
          </div>
        </div>

        {/* SEARCH + FILTER */}
        <Card className="rounded-2xl border-border/40">
          <CardContent className="p-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search club or city..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-11 rounded-xl bg-muted/30 border-border/40"
                />
              </div>
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger className="h-11 rounded-xl bg-muted/30 border-border/40">
                  <SelectValue placeholder="All countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All countries</SelectItem>
                  {countries.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-11 rounded-xl bg-muted/30 border-border/40">
                  <SelectValue placeholder="All clubs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All clubs</SelectItem>
                  <SelectItem value="has_program">Has Loyalty Program</SelectItem>
                  <SelectItem value="no_program">No Program Yet</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* STATS */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="rounded-2xl border-border/40 text-center">
            <CardContent className="py-4">
              <Building2 className="h-5 w-5 mx-auto text-primary mb-2" />
              <p className="text-2xl font-display font-bold">{clubs.length}</p>
              <p className="text-xs text-muted-foreground">Verified Clubs</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border/40 text-center">
            <CardContent className="py-4">
              <ShieldCheck className="h-5 w-5 mx-auto text-emerald-400 mb-2" />
              <p className="text-2xl font-display font-bold">{clubs.filter(c => c.loyalty_programs?.length).length}</p>
              <p className="text-xs text-muted-foreground">Active Programs</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border/40 text-center">
            <CardContent className="py-4">
              <MapPin className="h-5 w-5 mx-auto text-accent mb-2" />
              <p className="text-2xl font-display font-bold">{countries.length}</p>
              <p className="text-xs text-muted-foreground">Countries</p>
            </CardContent>
          </Card>
        </div>

        {/* CLUB GRID */}
        {filteredClubs.length === 0 ? (
          <Card className="rounded-2xl border-border/40">
            <CardContent className="py-12 text-center">
              <div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-muted/20 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-display font-semibold text-foreground">No clubs found</h3>
              <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filters</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClubs.map((club) => {
              const hasProgram = club.loyalty_programs?.length > 0;
              
              return (
                <Card key={club.id} className="relative overflow-hidden rounded-2xl border-border/40 card-hover group">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                  <CardContent className="relative z-10 p-5">
                    <div className="flex items-start gap-4">
                      {/* Logo */}
                      <div 
                        className="h-14 w-14 rounded-2xl flex items-center justify-center border border-border/30 flex-shrink-0 overflow-hidden"
                        style={{ backgroundColor: club.primary_color || "#16a34a" }}
                      >
                        {club.logo_url ? (
                          <img src={club.logo_url} alt={club.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl font-bold text-white">{club.name.charAt(0)}</span>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-display font-semibold text-foreground truncate">{club.name}</h3>
                          {club.status === "official" && (
                            <Badge className="bg-accent/10 text-accent border-accent/20 text-[10px] shrink-0">Official</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" />
                          {club.city}{club.city && club.country ? ", " : ""}{club.country}
                        </p>
                        
                        {hasProgram ? (
                          <Badge className="mt-2 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Loyalty Program Available
                          </Badge>
                        ) : (
                          <Badge className="mt-2 bg-muted/50 text-muted-foreground border-border/40 text-[10px]">
                            <Clock className="h-3 w-3 mr-1" />
                            Coming Soon
                          </Badge>
                        )}
                      </div>
                    </div>

                    <Button
                      className="w-full mt-4 rounded-xl font-semibold"
                      variant={hasProgram ? "default" : "outline"}
                      onClick={() => handleJoinClick(club)}
                      disabled={!hasProgram || joining === club.id}
                    >
                      {joining === club.id && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      {hasProgram ? "Enroll Now" : "Not Available Yet"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* REQUEST NEW CLUB */}
        <Card className="relative overflow-hidden rounded-2xl border-accent/20">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Send className="h-5 w-5 text-accent" />
              Can't Find Your Club?
            </CardTitle>
            <CardDescription>
              Let us know which club you'd like to join and we'll reach out to them
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Input
                  placeholder="Club name *"
                  value={requestClubName}
                  onChange={(e) => setRequestClubName(e.target.value)}
                  className="h-11 rounded-xl bg-muted/30 border-border/40"
                />
              </div>
              <div className="space-y-2">
                <Input
                  placeholder="Country"
                  value={requestCountry}
                  onChange={(e) => setRequestCountry(e.target.value)}
                  className="h-11 rounded-xl bg-muted/30 border-border/40"
                />
              </div>
            </div>
            <Input
              placeholder="Club email or website (optional)"
              value={requestContact}
              onChange={(e) => setRequestContact(e.target.value)}
              className="h-11 rounded-xl bg-muted/30 border-border/40"
            />
            <Textarea
              placeholder="Additional notes (optional)"
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              className="rounded-xl bg-muted/30 border-border/40 min-h-[80px]"
            />
            <Button 
              className="w-full rounded-xl gradient-golden font-semibold" 
              onClick={handleSendClubRequest} 
              disabled={requestSending || !requestClubName.trim()}
            >
              {requestSending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <Send className="h-4 w-4 mr-2" />
              Submit Request
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
