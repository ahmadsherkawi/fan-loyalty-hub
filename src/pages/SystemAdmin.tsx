import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/Logo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, LogOut, ShieldCheck, Shield, Users, Trophy, Gift,
  CheckCircle2, XCircle, AlertTriangle, Building2, BarChart3,
  Sparkles, TrendingUp, Eye, ChevronRight, Clock, FileText,
  Mail, Link as LinkIcon, RefreshCw, Search, MoreHorizontal,
  Trash2, UserX, UserCheck, Activity, Calendar, MapPin,
  Crown, Zap, Ban
} from "lucide-react";

import type { Club, ClubVerification, LoyaltyProgram, Profile } from "@/types/database";

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

interface RecentActivity {
  id: string;
  type: "redemption" | "completion" | "registration" | "claim";
  created_at: string;
  details: string;
  user_name?: string;
  club_name?: string;
}

interface AdminStats {
  totalClubs: number;
  verifiedClubs: number;
  unverifiedClubs: number;
  totalFans: number;
  totalPointsIssued: number;
  totalPointsSpent: number;
  totalRedemptions: number;
  totalActivities: number;
  totalRewards: number;
  pendingVerifications: number;
  pendingClaims: number;
  recentRegistrations: number;
  pendingClubRequests: number;
}

interface ClubRequest {
  id: string;
  requester_id: string;
  requester_email: string;
  club_name: string;
  country: string | null;
  club_contact: string | null;
  message: string | null;
  status: "pending" | "contacted" | "resolved" | "rejected";
  created_at: string;
  updated_at: string;
}

export default function SystemAdmin() {
  const navigate = useNavigate();
  const { user, profile, signOut, loading } = useAuth();
  const { toast } = useToast();

  const [dataLoading, setDataLoading] = useState(true);
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [fanProfiles, setFanProfiles] = useState<Profile[]>([]);
  const [clubReports, setClubReports] = useState<ClubReport[]>([]);
  const [clubRequests, setClubRequests] = useState<ClubRequest[]>([]);
  const [selectedVerification, setSelectedVerification] = useState<VerificationRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  const [adminStats, setAdminStats] = useState<AdminStats>({
    totalClubs: 0,
    verifiedClubs: 0,
    unverifiedClubs: 0,
    totalFans: 0,
    totalPointsIssued: 0,
    totalPointsSpent: 0,
    totalRedemptions: 0,
    totalActivities: 0,
    totalRewards: 0,
    pendingVerifications: 0,
    pendingClaims: 0,
    recentRegistrations: 0,
    pendingClubRequests: 0,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
      return;
    }
    if (!loading && user) {
      fetchAllData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  const fetchAllData = async () => {
    setDataLoading(true);
    try {
      await Promise.all([
        fetchVerificationRequests(),
        fetchClubReports(),
        fetchAdminStats(),
        fetchFanProfiles(),
        fetchRecentActivity(),
        fetchClubRequests(),
      ]);
    } finally {
      setDataLoading(false);
    }
  };

  const fetchVerificationRequests = async () => {
    const { data: allClubs } = await supabase.from("clubs").select("*");
    const clubList = (allClubs ?? []) as Club[];
    setClubs(clubList);

    const { data: verifications } = await supabase.from("club_verifications").select("*");
    const vList = (verifications ?? []) as ClubVerification[];

    const merged: VerificationRequest[] = vList.map((v) => ({
      ...v,
      club: clubList.find((c) => c.id === v.club_id),
    }));

    setVerificationRequests(merged);
  };

  const fetchFanProfiles = async () => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "fan")
      .order("created_at", { ascending: false })
      .limit(100);
    
    setFanProfiles((profiles ?? []) as Profile[]);
  };

  const fetchClubReports = async () => {
    const { data: allClubs } = await supabase.from("clubs").select("*");
    const clubList = (allClubs ?? []) as Club[];

    const reports: ClubReport[] = [];

    for (const club of clubList) {
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

        totalPoints = completions?.reduce((s: number, c: { points_earned: number }) => s + (c.points_earned || 0), 0) ?? 0;

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

  const fetchAdminStats = async () => {
    // Total clubs
    const { count: totalClubs } = await supabase
      .from("clubs")
      .select("*", { count: "exact", head: true });

    // Verified clubs
    const { count: verifiedClubs } = await supabase
      .from("clubs")
      .select("*", { count: "exact", head: true })
      .in("status", ["verified", "official"]);

    // Unverified clubs
    const { count: unverifiedClubs } = await supabase
      .from("clubs")
      .select("*", { count: "exact", head: true })
      .eq("status", "unverified");

    // Total fans
    const { count: totalFans } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "fan");

    // Total points issued
    const { data: allCompletions } = await supabase
      .from("activity_completions")
      .select("points_earned");
    const totalPointsIssued = allCompletions?.reduce((s: number, c: any) => s + (c.points_earned || 0), 0) ?? 0;

    // Total points spent
    const { data: allRedemptions } = await supabase
      .from("reward_redemptions")
      .select("points_spent");
    const totalPointsSpent = allRedemptions?.reduce((s: number, r: any) => s + (r.points_spent || 0), 0) ?? 0;

    // Total redemptions
    const { count: totalRedemptions } = await supabase
      .from("reward_redemptions")
      .select("*", { count: "exact", head: true });

    // Total activities
    const { count: totalActivities } = await supabase
      .from("activities")
      .select("*", { count: "exact", head: true });

    // Total rewards
    const { count: totalRewards } = await supabase
      .from("rewards")
      .select("*", { count: "exact", head: true });

    // Pending verifications
    const pendingVerifications = (await supabase
      .from("clubs")
      .select("*", { count: "exact", head: true })
      .eq("status", "unverified")).count ?? 0;

    // Pending claims
    const { count: pendingClaims } = await supabase
      .from("manual_claims")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    // Recent registrations (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { count: recentRegistrations } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo.toISOString());

    setAdminStats({
      totalClubs: totalClubs ?? 0,
      verifiedClubs: verifiedClubs ?? 0,
      unverifiedClubs: unverifiedClubs ?? 0,
      totalFans: totalFans ?? 0,
      totalPointsIssued,
      totalPointsSpent,
      totalRedemptions: totalRedemptions ?? 0,
      totalActivities: totalActivities ?? 0,
      totalRewards: totalRewards ?? 0,
      pendingVerifications,
      pendingClaims: pendingClaims ?? 0,
      recentRegistrations: recentRegistrations ?? 0,
    });
  };

  const fetchRecentActivity = async () => {
    const activities: RecentActivity[] = [];

    // Recent redemptions
    const { data: recentRedemptions } = await supabase
      .from("reward_redemptions")
      .select("id, created_at, points_spent, fan_id, profiles(full_name), rewards(name)")
      .order("created_at", { ascending: false })
      .limit(5);

    (recentRedemptions ?? []).forEach((r: any) => {
      activities.push({
        id: r.id,
        type: "redemption",
        created_at: r.created_at,
        details: `Redeemed "${r.rewards?.name}" for ${r.points_spent} points`,
        user_name: r.profiles?.full_name || "Unknown Fan",
      });
    });

    // Recent completions
    const { data: recentCompletions } = await supabase
      .from("activity_completions")
      .select("id, completed_at, points_earned, fan_id, profiles(full_name), activities(name)")
      .order("completed_at", { ascending: false })
      .limit(5);

    (recentCompletions ?? []).forEach((c: any) => {
      activities.push({
        id: c.id,
        type: "completion",
        created_at: c.completed_at,
        details: `Completed "${c.activities?.name}" (+${c.points_earned} pts)`,
        user_name: c.profiles?.full_name || "Unknown Fan",
      });
    });

    // Recent registrations
    const { data: recentUsers } = await supabase
      .from("profiles")
      .select("id, created_at, full_name, role")
      .order("created_at", { ascending: false })
      .limit(5);

    (recentUsers ?? []).forEach((u: any) => {
      activities.push({
        id: u.id,
        type: "registration",
        created_at: u.created_at,
        details: `New ${u.role === "club_admin" ? "Club Admin" : "Fan"} registered`,
        user_name: u.full_name || "Unknown",
      });
    });

    // Sort by date
    activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setRecentActivity(activities.slice(0, 15));
  };

  const fetchClubRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("club_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        // Table might not exist yet
        console.error("Error fetching club requests:", error);
        setClubRequests([]);
        return;
      }

      setClubRequests((data ?? []) as ClubRequest[]);
      
      // Update stats with pending count
      const pendingCount = (data ?? []).filter((r: ClubRequest) => r.status === "pending").length;
      setAdminStats((prev) => ({ ...prev, pendingClubRequests: pendingCount }));
    } catch (err) {
      console.error("Error fetching club requests:", err);
      setClubRequests([]);
    }
  };

  const handleUpdateClubRequest = async (requestId: string, newStatus: ClubRequest["status"]) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("club_requests")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", requestId);

      if (error) throw error;

      toast({ 
        title: "Request Updated", 
        description: `Request marked as ${newStatus}.` 
      });
      
      await fetchClubRequests();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update request";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
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
      toast({ title: "Club Verified", description: `${request.club.name} has been verified.` });
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
      toast({ title: "Verification Rejected", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, role: string) => {
    try {
      if (role === "fan") {
        // Delete fan data
        await supabase.from("activity_completions").delete().eq("fan_id", userId);
        await supabase.from("manual_claims").delete().eq("fan_id", userId);
        await supabase.from("reward_redemptions").delete().eq("fan_id", userId);
        await supabase.from("fan_memberships").delete().eq("fan_id", userId);
      }
      
      // Delete notifications and profile
      await supabase.from("notifications").delete().eq("user_id", userId);
      await supabase.from("profiles").delete().eq("user_id", userId);

      toast({ title: "User Deleted", description: "The user has been removed from the system." });
      await fetchAllData();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete user", variant: "destructive" });
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

  const filteredClubs = clubs.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.country?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFans = fanProfiles.filter((f) =>
    f.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statCards = [
    { icon: <Building2 className="h-5 w-5" />, label: "Total Clubs", value: adminStats.totalClubs, color: "text-primary", gradient: "from-primary/30 to-primary/5" },
    { icon: <ShieldCheck className="h-5 w-5" />, label: "Verified", value: adminStats.verifiedClubs, color: "text-emerald-400", gradient: "from-emerald-500/30 to-emerald-500/5" },
    { icon: <Users className="h-5 w-5" />, label: "Total Fans", value: adminStats.totalFans, color: "text-blue-400", gradient: "from-blue-500/30 to-blue-500/5" },
    { icon: <Trophy className="h-5 w-5" />, label: "Points Issued", value: adminStats.totalPointsIssued.toLocaleString(), color: "text-accent", gradient: "from-accent/30 to-accent/5" },
    { icon: <Gift className="h-5 w-5" />, label: "Redemptions", value: adminStats.totalRedemptions, color: "text-purple-400", gradient: "from-purple-500/30 to-purple-500/5" },
    { icon: <Zap className="h-5 w-5" />, label: "Activities", value: adminStats.totalActivities, color: "text-orange-400", gradient: "from-orange-500/30 to-orange-500/5" },
    { icon: <AlertTriangle className="h-5 w-5" />, label: "Pending Verifs", value: adminStats.pendingVerifications, color: "text-red-400", gradient: "from-red-500/30 to-red-500/5" },
    { icon: <Clock className="h-5 w-5" />, label: "Pending Claims", value: adminStats.pendingClaims, color: "text-yellow-400", gradient: "from-yellow-500/30 to-yellow-500/5" },
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
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={fetchAllData} className="rounded-full text-muted-foreground hover:text-foreground">
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
            <Button variant="ghost" onClick={handleSignOut} className="rounded-full text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </Button>
          </div>
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
              Manage club verifications, monitor platform activity, and oversee all users and data.
            </p>
          </div>
        </div>

        {/* STATS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statCards.map((s) => (
            <Card key={s.label} className="relative overflow-hidden rounded-2xl border-border/40 group card-hover">
              <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient} opacity-50 pointer-events-none`} />
              <CardContent className="relative z-10 pt-5 pb-4 px-4">
                <div className={`mb-2.5 h-9 w-9 rounded-xl bg-card/80 border border-border/30 flex items-center justify-center ${s.color}`}>
                  {s.icon}
                </div>
                <p className="text-2xl font-display font-bold tracking-tight">{s.value}</p>
                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* MAIN TABS */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-card/60 border border-border/40 rounded-2xl p-1 flex flex-wrap gap-1">
            <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart3 className="h-4 w-4 mr-2" /> Overview
            </TabsTrigger>
            <TabsTrigger value="verifications" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ShieldCheck className="h-4 w-4 mr-2" /> Verifications
            </TabsTrigger>
            <TabsTrigger value="requests" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Mail className="h-4 w-4 mr-2" /> Requests
              {adminStats.pendingClubRequests > 0 && (
                <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center bg-accent text-white text-xs rounded-full">
                  {adminStats.pendingClubRequests}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="clubs" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Building2 className="h-4 w-4 mr-2" /> Clubs
            </TabsTrigger>
            <TabsTrigger value="fans" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="h-4 w-4 mr-2" /> Fans
            </TabsTrigger>
            <TabsTrigger value="reports" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileText className="h-4 w-4 mr-2" /> Reports
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <Card className="rounded-2xl border-border/40">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Activity className="h-5 w-5 text-primary" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>Latest platform activity</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recentActivity.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">No recent activity</p>
                  ) : (
                    recentActivity.slice(0, 8).map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                          activity.type === "redemption" ? "bg-purple-500/20 text-purple-400" :
                          activity.type === "completion" ? "bg-green-500/20 text-green-400" :
                          activity.type === "registration" ? "bg-blue-500/20 text-blue-400" :
                          "bg-orange-500/20 text-orange-400"
                        }`}>
                          {activity.type === "redemption" ? <Gift className="h-4 w-4" /> :
                           activity.type === "completion" ? <Zap className="h-4 w-4" /> :
                           activity.type === "registration" ? <Users className="h-4 w-4" /> :
                           <FileText className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{activity.details}</p>
                          <p className="text-xs text-muted-foreground">
                            {activity.user_name} • {new Date(activity.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Platform Health */}
              <Card className="rounded-2xl border-border/40">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Platform Health
                  </CardTitle>
                  <CardDescription>Key metrics and health indicators</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-muted/30">
                      <p className="text-xs text-muted-foreground">Points in Circulation</p>
                      <p className="text-2xl font-display font-bold">
                        {(adminStats.totalPointsIssued - adminStats.totalPointsSpent).toLocaleString()}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/30">
                      <p className="text-xs text-muted-foreground">Redemption Rate</p>
                      <p className="text-2xl font-display font-bold">
                        {adminStats.totalPointsIssued > 0 
                          ? Math.round((adminStats.totalPointsSpent / adminStats.totalPointsIssued) * 100) 
                          : 0}%
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/30">
                      <p className="text-xs text-muted-foreground">New Users (7 days)</p>
                      <p className="text-2xl font-display font-bold">{adminStats.recentRegistrations}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/30">
                      <p className="text-xs text-muted-foreground">Verification Rate</p>
                      <p className="text-2xl font-display font-bold">
                        {adminStats.totalClubs > 0 
                          ? Math.round((adminStats.verifiedClubs / adminStats.totalClubs) * 100) 
                          : 0}%
                      </p>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Rewards Created</span>
                      <span className="font-medium">{adminStats.totalRewards}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Redemptions</span>
                      <span className="font-medium">{adminStats.totalRedemptions}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Unverified Clubs</span>
                      <span className="font-medium text-orange-400">{adminStats.unverifiedClubs}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Pending Claims</span>
                      <span className="font-medium text-yellow-400">{adminStats.pendingClaims}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* VERIFICATIONS TAB */}
          <TabsContent value="verifications" className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Verification Requests
              </h2>
              <Badge variant="secondary" className="rounded-full">{verificationRequests.length} requests</Badge>
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
                          <Input
                            placeholder="Optional: reason for rejection..."
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

          {/* REQUESTS TAB */}
          <TabsContent value="requests" className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Mail className="h-4 w-4" /> Club Requests from Fans
              </h2>
              <Badge variant="secondary" className="rounded-full">{clubRequests.length} total</Badge>
            </div>

            {clubRequests.length === 0 ? (
              <Card className="rounded-2xl border-border/40">
                <CardContent className="pt-8 pb-8 text-center">
                  <Mail className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No club requests yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">When fans request new clubs, they'll appear here.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {clubRequests.map((request) => (
                  <Card key={request.id} className="rounded-2xl border-border/40 overflow-hidden">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-display font-semibold">{request.club_name}</h3>
                            <Badge className={`rounded-full text-xs ${
                              request.status === "pending" ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                              request.status === "contacted" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                              request.status === "resolved" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                              "bg-red-500/10 text-red-400 border-red-500/20"
                            }`}>
                              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                            {request.country && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3" />
                                {request.country}
                              </div>
                            )}
                            {request.club_contact && (
                              <div className="flex items-center gap-2">
                                <Mail className="h-3 w-3" />
                                {request.club_contact}
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Users className="h-3 w-3" />
                              Requester: {request.requester_email}
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3" />
                              {new Date(request.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          
                          {request.message && (
                            <div className="mt-3 p-3 rounded-xl bg-muted/30 text-sm">
                              "{request.message}"
                            </div>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          {request.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateClubRequest(request.id, "contacted")}
                                disabled={actionLoading}
                                className="rounded-xl"
                              >
                                <Mail className="h-3 w-3 mr-1" />
                                Contact
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleUpdateClubRequest(request.id, "resolved")}
                                disabled={actionLoading}
                                className="rounded-xl"
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Resolve
                              </Button>
                            </>
                          )}
                          {request.status === "contacted" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleUpdateClubRequest(request.id, "resolved")}
                                disabled={actionLoading}
                                className="rounded-xl"
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Resolve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleUpdateClubRequest(request.id, "rejected")}
                                disabled={actionLoading}
                                className="rounded-xl"
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* CLUBS TAB */}
          <TabsContent value="clubs" className="mt-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Building2 className="h-4 w-4" /> All Clubs
              </h2>
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search clubs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-full"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClubs.map((club) => {
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

          {/* FANS TAB */}
          <TabsContent value="fans" className="mt-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Users className="h-4 w-4" /> All Fans
              </h2>
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search fans..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-full"
                />
              </div>
            </div>

            <Card className="rounded-2xl border-border/40 overflow-hidden">
              <CardContent className="p-0">
                <div className="divide-y divide-border/40">
                  {filteredFans.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">No fans found</div>
                  ) : (
                    filteredFans.slice(0, 50).map((fan) => (
                      <div key={fan.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                            {fan.avatar_url ? (
                              <img src={fan.avatar_url} alt={fan.full_name || "Fan"} className="w-full h-full object-cover rounded-xl" />
                            ) : (
                              <Users className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{fan.full_name || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">{fan.email} {fan.username && `· @${fan.username}`}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            Joined {new Date(fan.created_at).toLocaleDateString()}
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem className="text-destructive">
                                    <Trash2 className="h-4 w-4 mr-2" /> Delete User
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete User?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete {fan.full_name || fan.email} and all their data.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteUser(fan.user_id, "fan")}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* REPORTS TAB */}
          <TabsContent value="reports" className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <FileText className="h-4 w-4" /> Club Reports
              </h2>
            </div>

            <Card className="rounded-2xl border-border/40 overflow-hidden">
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Club</th>
                      <th className="text-center p-4 text-xs font-semibold text-muted-foreground uppercase">Fans</th>
                      <th className="text-center p-4 text-xs font-semibold text-muted-foreground uppercase">Points Issued</th>
                      <th className="text-center p-4 text-xs font-semibold text-muted-foreground uppercase">Redemptions</th>
                      <th className="text-center p-4 text-xs font-semibold text-muted-foreground uppercase">Activities</th>
                      <th className="text-center p-4 text-xs font-semibold text-muted-foreground uppercase">Rewards</th>
                      <th className="text-center p-4 text-xs font-semibold text-muted-foreground uppercase">Pending</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {clubReports.map((report) => {
                      const club = clubs.find((c) => c.id === report.club_id);
                      return (
                        <tr key={report.club_id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center border border-border/30"
                                style={{ backgroundColor: club?.primary_color || "#1a7a4c" }}
                              >
                                {club?.logo_url ? (
                                  <img src={club.logo_url} alt={report.club_name} className="w-full h-full object-cover rounded-lg" />
                                ) : (
                                  <span className="text-xs font-bold text-white">{report.club_name.charAt(0)}</span>
                                )}
                              </div>
                              <div>
                                <p className="font-medium">{report.club_name}</p>
                                <p className="text-xs text-muted-foreground">{club?.city}, {club?.country}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-center font-medium">{report.total_fans}</td>
                          <td className="p-4 text-center font-medium">{report.total_points_claimed.toLocaleString()}</td>
                          <td className="p-4 text-center font-medium">{report.total_rewards_redeemed}</td>
                          <td className="p-4 text-center font-medium">{report.total_activities}</td>
                          <td className="p-4 text-center font-medium">{report.total_rewards}</td>
                          <td className="p-4 text-center">
                            {report.pending_claims > 0 ? (
                              <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 rounded-full">
                                {report.pending_claims}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
