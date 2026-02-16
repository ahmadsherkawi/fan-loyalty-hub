import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/Logo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2, LogOut, ShieldCheck, Shield, Users, Trophy, Gift,
  CheckCircle2, XCircle, AlertTriangle, Building2, BarChart3,
  Sparkles, TrendingUp, Eye, ChevronRight, Clock, FileText,
  Mail, Link as LinkIcon, RefreshCw
} from "lucide-react";

import type { Club, ClubVerification, LoyaltyProgram } from "@/types/database";

interface VerificationRequest extends ClubVerification {
  club?: Club;
}

interface ClubReport {
  club_id: string;
  club_name: string;
  total_fans: number;
  total_points_claimed: number;
  total_rewards_redeemed: number;
  total_activities: number;
  total_rewards: number;
  pending_claims: number;
}

export default function SystemAdmin() {
  const navigate = useNavigate();
  const { user, profile, signOut, loading } = useAuth();

  const [dataLoading, setDataLoading] = useState(true);
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [clubReports, setClubReports] = useState<ClubReport[]>([]);
  const [selectedVerification, setSelectedVerification] = useState<VerificationRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("verifications");

  // Platform-level stats
  const [platformStats, setPlatformStats] = useState({
    totalClubs: 0,
    verifiedClubs: 0,
    totalFans: 0,
    totalPointsIssued: 0,
    totalRedemptions: 0,
    pendingVerifications: 0,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
      return;
    }
    if (!loading && user) {
      fetchAllData();
    }
  }, [loading, user]);

  const fetchAllData = async () => {
    setDataLoading(true);
    try {
      await Promise.all([
        fetchVerificationRequests(),
        fetchClubReports(),
        fetchPlatformStats(),
      ]);
    } finally {
      setDataLoading(false);
    }
  };

  const fetchVerificationRequests = async () => {
    // Get all clubs first
    const { data: allClubs } = await supabase.from("clubs").select("*");
    const clubList = (allClubs ?? []) as Club[];
    setClubs(clubList);

    // Get all verification records
    const { data: verifications } = await supabase.from("club_verifications").select("*");
    const vList = (verifications ?? []) as ClubVerification[];

    // Merge club data
    const merged: VerificationRequest[] = vList.map((v) => ({
      ...v,
      club: clubList.find((c) => c.id === v.club_id),
    }));

    setVerificationRequests(merged);
  };

  const fetchClubReports = async () => {
    const { data: allClubs } = await supabase.from("clubs").select("*");
    const clubList = (allClubs ?? []) as Club[];

    const reports: ClubReport[] = [];

    for (const club of clubList) {
      // Get program
      const { data: programs } = await supabase
        .from("loyalty_programs")
        .select("id")
        .eq("club_id", club.id)
        .limit(1);

      const programId = programs?.[0]?.id;

      const { count: fans } = await supabase
        .from("fan_memberships")
        .select("*", { count: "exact", head: true })
        .eq("club_id", club.id);

      let totalPoints = 0;
      let totalRedemptions = 0;
      let activityCount = 0;
      let rewardCount = 0;
      let pendingClaims = 0;

      if (programId) {
        const { data: completions } = await supabase
          .from("activity_completions")
          .select("points_earned, activities!inner(program_id)")
          .eq("activities.program_id", programId);

        totalPoints = completions?.reduce((s, c: any) => s + (c.points_earned || 0), 0) ?? 0;

        const { count: redemptions } = await supabase
          .from("reward_redemptions")
          .select("id, rewards!inner(program_id)", { count: "exact", head: true })
          .eq("rewards.program_id", programId);

        totalRedemptions = redemptions ?? 0;

        const { count: acts } = await supabase
          .from("activities")
          .select("*", { count: "exact", head: true })
          .eq("program_id", programId);

        activityCount = acts ?? 0;

        const { count: rews } = await supabase
          .from("rewards")
          .select("*", { count: "exact", head: true })
          .eq("program_id", programId);

        rewardCount = rews ?? 0;

        const { count: pending } = await supabase
          .from("manual_claims")
          .select("id, activities!inner(program_id)", { count: "exact", head: true })
          .eq("status", "pending")
          .eq("activities.program_id", programId);

        pendingClaims = pending ?? 0;
      }

      reports.push({
        club_id: club.id,
        club_name: club.name,
        total_fans: fans ?? 0,
        total_points_claimed: totalPoints,
        total_rewards_redeemed: totalRedemptions,
        total_activities: activityCount,
        total_rewards: rewardCount,
        pending_claims: pendingClaims,
      });
    }

    setClubReports(reports);
  };

  const fetchPlatformStats = async () => {
    const { count: totalClubs } = await supabase
      .from("clubs")
      .select("*", { count: "exact", head: true });

    const { count: verifiedClubs } = await supabase
      .from("clubs")
      .select("*", { count: "exact", head: true })
      .in("status", ["verified", "official"]);

    const { count: totalFans } = await supabase
      .from("fan_memberships")
      .select("*", { count: "exact", head: true });

    const { data: allCompletions } = await supabase
      .from("activity_completions")
      .select("points_earned");

    const totalPointsIssued = allCompletions?.reduce((s, c: any) => s + (c.points_earned || 0), 0) ?? 0;

    const { count: totalRedemptions } = await supabase
      .from("reward_redemptions")
      .select("*", { count: "exact", head: true });

    const pendingVerifications = clubs.filter(
      (c) => c.status === "unverified"
    ).length;

    setPlatformStats({
      totalClubs: totalClubs ?? 0,
      verifiedClubs: verifiedClubs ?? 0,
      totalFans: totalFans ?? 0,
      totalPointsIssued: totalPointsIssued,
      totalRedemptions: totalRedemptions ?? 0,
      pendingVerifications,
    });
  };

  const handleApproveVerification = async (request: VerificationRequest) => {
    if (!request.club) return;
    setActionLoading(true);
    try {
      await supabase
        .from("club_verifications")
        .update({ verified_at: new Date().toISOString() })
        .eq("id", request.id);

      await supabase
        .from("clubs")
        .update({ status: "verified" })
        .eq("id", request.club_id);

      await fetchAllData();
      setSelectedVerification(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectVerification = async (request: VerificationRequest) => {
    if (!request.club) return;
    setActionLoading(true);
    try {
      await supabase
        .from("club_verifications")
        .update({ verified_at: null })
        .eq("id", request.id);

      await supabase
        .from("clubs")
        .update({ status: "unverified" })
        .eq("id", request.club_id);

      await fetchAllData();
      setSelectedVerification(null);
      setRejectionReason("");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const statItems = [
    { icon: <Building2 className="h-5 w-5" />, label: "Total Clubs", value: platformStats.totalClubs, gradient: "from-primary/30 to-primary/5", iconColor: "text-primary" },
    { icon: <ShieldCheck className="h-5 w-5" />, label: "Verified", value: platformStats.verifiedClubs, gradient: "from-emerald-500/30 to-emerald-500/5", iconColor: "text-emerald-400" },
    { icon: <Users className="h-5 w-5" />, label: "Total Fans", value: platformStats.totalFans, gradient: "from-blue-500/30 to-blue-500/5", iconColor: "text-blue-400" },
    { icon: <Trophy className="h-5 w-5" />, label: "Points Issued", value: platformStats.totalPointsIssued, gradient: "from-accent/30 to-accent/5", iconColor: "text-accent" },
    { icon: <Gift className="h-5 w-5" />, label: "Redemptions", value: platformStats.totalRedemptions, gradient: "from-purple-500/30 to-purple-500/5", iconColor: "text-purple-400" },
    { icon: <AlertTriangle className="h-5 w-5" />, label: "Pending Verifs", value: platformStats.pendingVerifications, gradient: "from-orange-500/30 to-orange-500/5", iconColor: "text-orange-400" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <header className="relative border-b border-border/40 overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-40" />
        <div className="relative container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo />
            <div className="h-6 w-px bg-border/40" />
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-accent" />
              <span className="font-display font-bold text-foreground tracking-tight">System Admin</span>
            </div>
          </div>
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
          <div className="relative z-10 p-8 md:p-10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-xs font-semibold text-accent uppercase tracking-wider">Platform Control</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight">
              ClubPass Admin Panel
            </h1>
            <p className="text-white/50 mt-2 max-w-lg">
              Manage club verifications, monitor platform activity, and generate reports across all clubs.
            </p>
          </div>
        </div>

        {/* PLATFORM STATS */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {statItems.map((s) => (
            <Card key={s.label} className="relative overflow-hidden rounded-2xl border-border/40 group card-hover">
              <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient} opacity-50 pointer-events-none`} />
              <CardContent className="relative z-10 pt-5 pb-4 px-4">
                <div className={`mb-2.5 h-9 w-9 rounded-xl bg-card/80 border border-border/30 flex items-center justify-center ${s.iconColor}`}>
                  {s.icon}
                </div>
                <p className="text-2xl font-display font-bold tracking-tight">{s.value.toLocaleString()}</p>
                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* MAIN TABS */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-card/60 border border-border/40 rounded-2xl p-1">
            <TabsTrigger value="verifications" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ShieldCheck className="h-4 w-4 mr-2" /> Verifications
            </TabsTrigger>
            <TabsTrigger value="reports" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart3 className="h-4 w-4 mr-2" /> Club Reports
            </TabsTrigger>
            <TabsTrigger value="clubs" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Building2 className="h-4 w-4 mr-2" /> All Clubs
            </TabsTrigger>
          </TabsList>

          {/* VERIFICATIONS TAB */}
          <TabsContent value="verifications" className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Verification Requests
              </h2>
              <Button variant="ghost" size="sm" onClick={fetchAllData} className="rounded-full text-muted-foreground hover:text-foreground">
                <RefreshCw className="h-4 w-4 mr-2" /> Refresh
              </Button>
            </div>

            {verificationRequests.length === 0 ? (
              <Card className="rounded-2xl border-border/40">
                <CardContent className="pt-8 pb-8 text-center">
                  <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No verification requests found.</p>
                </CardContent>
              </Card>
            ) : (
              verificationRequests.map((request) => {
                const club = request.club;
                const isVerified = club?.status === "verified" || club?.status === "official";
                const criteriaCount = [
                  !!request.official_email_domain,
                  !!request.public_link,
                  !!request.authority_declaration,
                ].filter(Boolean).length;

                return (
                  <Card key={request.id} className={`rounded-2xl border-border/40 overflow-hidden ${isVerified ? "border-primary/20" : ""}`}>
                    <div className={`absolute inset-0 bg-gradient-to-br ${isVerified ? "from-primary/5" : "from-orange-500/5"} to-transparent pointer-events-none`} />
                    <CardHeader className="relative z-10 pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center border border-border/30"
                            style={{ backgroundColor: club?.primary_color || "#1a7a4c" }}
                          >
                            {club?.logo_url ? (
                              <img src={club.logo_url} alt={club.name} className="w-full h-full object-cover rounded-xl" />
                            ) : (
                              <span className="text-sm font-bold text-white">{club?.name?.charAt(0) ?? "?"}</span>
                            )}
                          </div>
                          <div>
                            <CardTitle className="text-base font-display">{club?.name ?? "Unknown Club"}</CardTitle>
                            <CardDescription>{club?.city}, {club?.country}</CardDescription>
                          </div>
                        </div>
                        <Badge className={`rounded-full ${isVerified ? "bg-primary/10 text-primary border-primary/20" : "bg-orange-500/10 text-orange-400 border-orange-500/20"}`}>
                          {isVerified ? "Verified" : "Pending"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="relative z-10 space-y-3">
                      {/* Criteria display */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className={`flex items-center gap-2 text-xs p-2 rounded-xl ${request.official_email_domain ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                          <Mail className="h-3 w-3" />
                          <span>{request.official_email_domain ? `@${request.official_email_domain}` : "No email"}</span>
                        </div>
                        <div className={`flex items-center gap-2 text-xs p-2 rounded-xl ${request.public_link ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                          <LinkIcon className="h-3 w-3" />
                          <span>{request.public_link ? "Provided" : "No link"}</span>
                        </div>
                        <div className={`flex items-center gap-2 text-xs p-2 rounded-xl ${request.authority_declaration ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                          <ShieldCheck className="h-3 w-3" />
                          <span>{request.authority_declaration ? "Declared" : "Not declared"}</span>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        {criteriaCount}/3 criteria met · Submitted {new Date(request.created_at).toLocaleDateString()}
                      </p>

                      {request.public_link && (
                        <a
                          href={request.public_link.startsWith("http") ? request.public_link : `https://${request.public_link}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3" /> View public link
                        </a>
                      )}

                      {!isVerified && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            onClick={() => handleApproveVerification(request)}
                            disabled={actionLoading}
                            className="rounded-xl gradient-stadium font-semibold shadow-stadium flex-1"
                          >
                            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (selectedVerification?.id === request.id) {
                                handleRejectVerification(request);
                              } else {
                                setSelectedVerification(request);
                              }
                            }}
                            disabled={actionLoading}
                            className="rounded-xl flex-1"
                          >
                            <XCircle className="h-4 w-4 mr-1" /> Reject
                          </Button>
                        </div>
                      )}

                      {selectedVerification?.id === request.id && (
                        <div className="space-y-2 pt-2">
                          <Textarea
                            placeholder="Optional: reason for rejection or changes needed..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="rounded-xl border-border/40 text-sm"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" variant="destructive" onClick={() => handleRejectVerification(request)} className="rounded-xl">
                              Confirm Reject
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setSelectedVerification(null)} className="rounded-xl">
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* REPORTS TAB */}
          <TabsContent value="reports" className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <FileText className="h-4 w-4" /> Club Reports
              </h2>
              <Button variant="ghost" size="sm" onClick={fetchAllData} className="rounded-full text-muted-foreground hover:text-foreground">
                <RefreshCw className="h-4 w-4 mr-2" /> Refresh
              </Button>
            </div>

            {clubReports.length === 0 ? (
              <Card className="rounded-2xl border-border/40">
                <CardContent className="pt-8 pb-8 text-center">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No clubs found.</p>
                </CardContent>
              </Card>
            ) : (
              clubReports.map((report) => {
                const club = clubs.find((c) => c.id === report.club_id);
                const isVerified = club?.status === "verified" || club?.status === "official";

                return (
                  <Card key={report.club_id} className="rounded-2xl border-border/40 overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center border border-border/30"
                            style={{ backgroundColor: club?.primary_color || "#1a7a4c" }}
                          >
                            {club?.logo_url ? (
                              <img src={club.logo_url} alt={report.club_name} className="w-full h-full object-cover rounded-xl" />
                            ) : (
                              <span className="text-sm font-bold text-white">{report.club_name.charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <CardTitle className="text-base font-display">{report.club_name}</CardTitle>
                            <CardDescription>{club?.city}, {club?.country}</CardDescription>
                          </div>
                        </div>
                        <Badge className={`rounded-full ${isVerified ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground"}`}>
                          {club?.status ?? "unknown"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {[
                          { label: "Fans", value: report.total_fans, icon: <Users className="h-3 w-3" />, color: "text-blue-400" },
                          { label: "Points Claimed", value: report.total_points_claimed, icon: <Trophy className="h-3 w-3" />, color: "text-accent" },
                          { label: "Rewards Redeemed", value: report.total_rewards_redeemed, icon: <Gift className="h-3 w-3" />, color: "text-purple-400" },
                          { label: "Activities", value: report.total_activities, icon: <TrendingUp className="h-3 w-3" />, color: "text-primary" },
                          { label: "Rewards", value: report.total_rewards, icon: <Gift className="h-3 w-3" />, color: "text-accent" },
                          { label: "Pending Claims", value: report.pending_claims, icon: <Clock className="h-3 w-3" />, color: "text-orange-400" },
                        ].map((stat) => (
                          <div key={stat.label} className="bg-muted/50 rounded-xl p-3 text-center">
                            <div className={`flex items-center justify-center gap-1 mb-1 ${stat.color}`}>
                              {stat.icon}
                            </div>
                            <p className="text-lg font-display font-bold">{stat.value.toLocaleString()}</p>
                            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* ALL CLUBS TAB */}
          <TabsContent value="clubs" className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Building2 className="h-4 w-4" /> All Registered Clubs
              </h2>
              <Badge variant="secondary" className="rounded-full">{clubs.length} clubs</Badge>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clubs.map((club) => {
                const isVerified = club.status === "verified" || club.status === "official";

                return (
                  <Card key={club.id} className="rounded-2xl border-border/40 overflow-hidden card-hover">
                    <div className={`absolute inset-0 bg-gradient-to-br ${isVerified ? "from-primary/5" : "from-muted/30"} to-transparent pointer-events-none`} />
                    <CardContent className="relative z-10 pt-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center border border-border/30"
                          style={{ backgroundColor: club.primary_color || "#1a7a4c" }}
                        >
                          {club.logo_url ? (
                            <img src={club.logo_url} alt={club.name} className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            <span className="text-lg font-bold text-white">{club.name.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <h3 className="font-display font-bold text-foreground">{club.name}</h3>
                          <p className="text-xs text-muted-foreground">{club.city}, {club.country}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <Badge className={`rounded-full ${isVerified ? "bg-primary/10 text-primary border-primary/20" : "bg-orange-500/10 text-orange-400 border-orange-500/20"}`}>
                          {isVerified ? <><ShieldCheck className="h-3 w-3 mr-1" /> Verified</> : <><AlertTriangle className="h-3 w-3 mr-1" /> Unverified</>}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          Joined {new Date(club.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {club.stadium_name && (
                        <p className="text-xs text-muted-foreground mt-2">🏟️ {club.stadium_name}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
