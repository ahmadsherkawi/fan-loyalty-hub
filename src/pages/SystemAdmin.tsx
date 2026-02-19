import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/Logo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, LogOut, ShieldCheck, Shield, Users, Trophy, Gift,
  CheckCircle2, AlertTriangle, Building2, BarChart3,
  Sparkles, TrendingUp, Clock, FileText,
  Mail, RefreshCw, Search, MoreHorizontal,
  Trash2, Activity, Zap, ArrowLeft, Lock
} from "lucide-react";

import type { Club, ClubVerification, Profile } from "@/types/database";

// ============================================
// ADMIN AUTHENTICATION
// ============================================

// Admin credentials - these should match a Supabase Auth user with profile role = 'system_admin'

// IMMEDIATELY clear OLD admin session keys when this module loads
if (typeof window !== 'undefined') {
  const keysToClear = [
    'clubpass_admin_session',
    'clubpass_admin_auth_session',
    'clubpass_admin_auth_session_v1',
    'clubpass_admin_auth_session_v2',
    'clubpass_admin_auth_session_v3'
  ];
  keysToClear.forEach(key => localStorage.removeItem(key));
}

// Check if user is admin by querying their profile role
async function checkAdminRole(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();
  
  return (profile?.role as string) === 'system_admin';
}

// ============================================
// INTERFACES
// ============================================

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

// ============================================
// ADMIN LOGIN COMPONENT
// ============================================

function AdminLoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Sign in with Supabase Auth
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (authError) {
        setError("Invalid email or password");
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError("Login failed. Please try again.");
        setLoading(false);
        return;
      }

      // Check if user has admin role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', data.user.id)
        .single();

      if (!profile || (profile.role as string) !== 'system_admin') {
        // Sign out if not admin
        await supabase.auth.signOut();
        setError("Access denied. Admin privileges required.");
        setLoading(false);
        return;
      }

      onLogin();
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with Back Button */}
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm">
        <div className="container py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo className="h-6" />
          </div>
          <Button
            variant="ghost"
            onClick={() => window.location.href = "/"}
            className="gap-2 rounded-full text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Button>
        </div>
      </header>

      {/* Login Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          {/* Hero Card */}
          <div className="relative overflow-hidden rounded-3xl border border-border/40">
            <div className="absolute inset-0 gradient-hero" />
            <div className="absolute inset-0 stadium-pattern" />
            <div className="absolute inset-0 pitch-lines opacity-30" />
            
            <div className="relative z-10 p-8 text-center">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-6 shadow-stadium">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Lock className="h-4 w-4 text-accent" />
                <span className="text-xs font-semibold text-accent uppercase tracking-wider">Admin Portal</span>
              </div>
              <h1 className="font-display text-2xl font-bold text-white tracking-tight">
                ClubPass Admin
              </h1>
              <p className="text-white/50 mt-1">
                Sign in to access the admin panel
              </p>
            </div>
          </div>

          {/* Login Form */}
          <Card className="rounded-2xl border-border/40">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@clubpass.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 rounded-xl bg-muted/10 border-border/40"
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-xl bg-muted/10 border-border/40"
                    required
                    autoComplete="current-password"
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl gradient-stadium font-semibold text-base shadow-stadium"
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================
// SYSTEM ADMIN COMPONENT
// ============================================

export default function SystemAdmin() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Admin auth state
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  // Data state
  const [dataLoading, setDataLoading] = useState(false);
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
  const [clubToDelete, setClubToDelete] = useState<Club | null>(null);
  const [fanToDelete, setFanToDelete] = useState<Profile | null>(null);

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

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Check if user has admin role
        const isAdminUser = await checkAdminRole();
        if (isAdminUser) {
          setIsAdmin(true);
          setAdminEmail(session.user.email || null);
        } else {
          setIsAdmin(false);
        }
      }
      
      setCheckingSession(false);
    };
    
    checkSession();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const isAdminUser = await checkAdminRole();
        if (isAdminUser) {
          setIsAdmin(true);
          setAdminEmail(session.user.email || null);
        }
      } else if (event === 'SIGNED_OUT') {
        setIsAdmin(false);
        setAdminEmail(null);
      }
    });
    
    return () => subscription.unsubscribe();
  }, []);

  // Load data when admin is authenticated
  useEffect(() => {
    if (isAdmin) {
      fetchAllData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const handleAdminLogin = () => {
    setIsAdmin(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAdminEmail(session?.user?.email || null);
    });
    toast({
      title: "Welcome, Admin!",
      description: "You have successfully logged in."
    });
  };

  const handleAdminLogout = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setAdminEmail(null);
    
    toast({
      title: "Logged out",
      description: "You have been signed out."
    });
    
    navigate("/");
  };

  const fetchAllData = useCallback(async () => {
    const isAdminUser = await checkAdminRole();
    if (!isAdminUser) return;
    
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
  }, []);

  const fetchVerificationRequests = async () => {
    const { data: allClubs } = await supabase.from("clubs").select("*");
    const clubList = (allClubs ?? []) as Club[];
    setClubs(clubList);

    const { data: verifications } = await supabase.from("club_verifications").select("*");
    const vList = (verifications ?? []) as ClubVerification[];

    const pendingVerifications: VerificationRequest[] = vList
      .filter((v) => {
        const club = clubList.find((c) => c.id === v.club_id);
        if (!club) return false;
        
        const criteriaCount = [
          !!v.official_email_domain,
          !!v.public_link,
          !!v.authority_declaration,
        ].filter(Boolean).length;

        return club.status === "unverified" && criteriaCount >= 2 && !v.verified_at;
      })
      .map((v) => ({
        ...v,
        club: clubList.find((c) => c.id === v.club_id),
      }));

    setVerificationRequests(pendingVerifications);
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
    const { count: totalClubs } = await supabase
      .from("clubs")
      .select("*", { count: "exact", head: true });

    const { count: verifiedClubs } = await supabase
      .from("clubs")
      .select("*", { count: "exact", head: true })
      .in("status", ["verified", "official"]);

    const { count: unverifiedClubs } = await supabase
      .from("clubs")
      .select("*", { count: "exact", head: true })
      .eq("status", "unverified");

    const { count: totalFans } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "fan");

    const { data: allCompletions } = await supabase
      .from("activity_completions")
      .select("points_earned");
    const totalPointsIssued = allCompletions?.reduce((s: number, c: { points_earned: number }) => s + (c.points_earned || 0), 0) ?? 0;

    const { data: allRedemptions } = await supabase
      .from("reward_redemptions")
      .select("points_spent");
    const totalPointsSpent = allRedemptions?.reduce((s: number, r: { points_spent: number }) => s + (r.points_spent || 0), 0) ?? 0;

    const { count: totalRedemptions } = await supabase
      .from("reward_redemptions")
      .select("*", { count: "exact", head: true });

    const { count: totalActivities } = await supabase
      .from("activities")
      .select("*", { count: "exact", head: true });

    const { count: totalRewards } = await supabase
      .from("rewards")
      .select("*", { count: "exact", head: true });

    const pendingVerifications = unverifiedClubs ?? 0;

    const { count: pendingClaims } = await supabase
      .from("manual_claims")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

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
      pendingClubRequests: 0,
    });
  };

  const fetchRecentActivity = async () => {
    const activities: RecentActivity[] = [];

    // Use any-cast for reward_redemptions since the select columns cause type mismatch
    const { data: recentRedemptions } = await (supabase as any)
      .from("reward_redemptions")
      .select("id, redeemed_at, points_spent, fan_id, profiles(full_name), rewards(name)")
      .order("redeemed_at", { ascending: false })
      .limit(5);

    ((recentRedemptions ?? []) as Array<{ id: string; redeemed_at: string; points_spent: number; profiles?: { full_name: string | null }; rewards?: { name: string } }>).forEach((r) => {
      activities.push({
        id: r.id,
        type: "redemption",
        created_at: r.redeemed_at,
        details: `Redeemed "${r.rewards?.name}" for ${r.points_spent} points`,
        user_name: r.profiles?.full_name || "Unknown Fan",
      });
    });

    const { data: recentCompletions } = await (supabase as any)
      .from("activity_completions")
      .select("id, completed_at, points_earned, fan_id, profiles(full_name), activities(name)")
      .order("completed_at", { ascending: false })
      .limit(5);

    ((recentCompletions ?? []) as Array<{ id: string; completed_at: string; points_earned: number; profiles?: { full_name: string | null }; activities?: { name: string } }>).forEach((c) => {
      activities.push({
        id: c.id,
        type: "completion",
        created_at: c.completed_at,
        details: `Completed "${c.activities?.name}" (+${c.points_earned} pts)`,
        user_name: c.profiles?.full_name || "Unknown Fan",
      });
    });

    const { data: recentUsers } = await supabase
      .from("profiles")
      .select("id, created_at, full_name, role")
      .order("created_at", { ascending: false })
      .limit(5);

    ((recentUsers ?? []) as Array<{ id: string; created_at: string; full_name: string | null; role: string }>).forEach((u) => {
      activities.push({
        id: u.id,
        type: "registration",
        created_at: u.created_at,
        details: `New ${u.role === "club_admin" ? "Club Admin" : "Fan"} registered`,
        user_name: u.full_name || "Unknown",
      });
    });

    activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setRecentActivity(activities.slice(0, 15));
  };

  const fetchClubRequests = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("club_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching club requests:", error);
        setClubRequests([]);
        return;
      }

      setClubRequests((data ?? []) as unknown as ClubRequest[]);
      
      const pendingCount = ((data ?? []) as unknown as ClubRequest[]).filter((r) => r.status === "pending").length;
      setAdminStats((prev) => ({ ...prev, pendingClubRequests: pendingCount }));
    } catch (err) {
      console.error("Error fetching club requests:", err);
      setClubRequests([]);
    }
  };

  const handleUpdateClubRequest = async (requestId: string, newStatus: ClubRequest["status"]) => {
    setActionLoading(true);
    try {
      const { error } = await (supabase as any)
        .from("club_requests")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", requestId);

      if (error) throw error;

      toast({ title: "Request Updated", description: `Request marked as ${newStatus}.` });
      await fetchClubRequests();
    } catch (err) {
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
      // Update verification record
      await supabase.from("club_verifications").update({ verified_at: new Date().toISOString() }).eq("id", request.id);
      
      // Update club status to verified
      await supabase.from("clubs").update({ status: "verified" }).eq("id", request.club_id);
      
      // Activate the loyalty program if it exists
      await supabase.from("loyalty_programs").update({ is_active: true }).eq("club_id", request.club_id);

      await fetchAllData();
      setSelectedVerification(null);
      toast({ title: "Club Verified", description: `${request.club.name} has been verified and their loyalty program is now active.` });
    } finally {
      setActionLoading(false);
    }
  };

  const handleQuickVerify = async (clubId: string, clubName: string) => {
    setActionLoading(true);
    try {
      const { data: existingVerif } = await supabase
        .from("club_verifications")
        .select("id")
        .eq("club_id", clubId)
        .single();

      if (existingVerif) {
        await supabase.from("club_verifications").update({ verified_at: new Date().toISOString() }).eq("club_id", clubId);
      } else {
        await supabase.from("club_verifications").insert({
          club_id: clubId,
          verified_at: new Date().toISOString(),
          authority_declaration: true
        });
      }

      // Update club status to verified
      await supabase.from("clubs").update({ status: "verified" }).eq("id", clubId);
      
      // Activate the loyalty program
      await supabase.from("loyalty_programs").update({ is_active: true }).eq("club_id", clubId);

      await fetchAllData();
      toast({ title: "Club Verified", description: `${clubName} has been verified and their loyalty program is now active.` });
    } catch (error) {
      console.error("Error verifying club:", error);
      toast({ title: "Error", description: "Failed to verify club", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      setActionLoading(true);

      // Delete fan data
      await supabase.from("activity_completions").delete().eq("fan_id", userId);
      await supabase.from("manual_claims").delete().eq("fan_id", userId);
      await supabase.from("reward_redemptions").delete().eq("fan_id", userId);
      await supabase.from("fan_memberships").delete().eq("fan_id", userId);
      await (supabase as any).from("notifications").delete().eq("user_id", userId);

      // Delete profile
      const { error: profileError } = await supabase.from("profiles").delete().eq("user_id", userId);
      if (profileError) {
        toast({ title: "Error", description: `Failed to delete user: ${profileError.message}`, variant: "destructive" });
        return;
      }

      toast({ title: "User Deleted", description: "The user has been removed from the system." });
      await fetchAllData();
    } catch (error) {
      console.error("Delete user error:", error);
      toast({ title: "Error", description: "Failed to delete user", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteClub = async (clubId: string, clubName: string) => {
    try {
      setActionLoading(true);

      // Get programs for this club
      const { data: programs, error: programsError } = await supabase
        .from("loyalty_programs")
        .select("id")
        .eq("club_id", clubId);
      
      if (programsError) {
        console.error("Error fetching programs:", programsError);
      }
      
      const programIds = programs?.map(p => p.id) || [];

      if (programIds.length > 0) {
        const { data: activities, error: activitiesError } = await supabase
          .from("activities")
          .select("id")
          .in("program_id", programIds);
        
        if (activitiesError) {
          console.error("Error fetching activities:", activitiesError);
        }
        
        const activityIds = activities?.map(a => a.id) || [];

        if (activityIds.length > 0) {
          const { error: completionsError } = await supabase.from("activity_completions").delete().in("activity_id", activityIds);
          if (completionsError) console.error("Error deleting completions:", completionsError);
          
          const { error: claimsError } = await supabase.from("manual_claims").delete().in("activity_id", activityIds);
          if (claimsError) console.error("Error deleting claims:", claimsError);
        }

        const { data: rewards, error: rewardsError } = await supabase
          .from("rewards")
          .select("id")
          .in("program_id", programIds);
        
        if (rewardsError) {
          console.error("Error fetching rewards:", rewardsError);
        }
        
        const rewardIds = rewards?.map(r => r.id) || [];

        if (rewardIds.length > 0) {
          const { error: redemptionsError } = await supabase.from("reward_redemptions").delete().in("reward_id", rewardIds);
          if (redemptionsError) console.error("Error deleting redemptions:", redemptionsError);
        }

        const { error: delRewardsError } = await supabase.from("rewards").delete().in("program_id", programIds);
        if (delRewardsError) console.error("Error deleting rewards:", delRewardsError);
        
        const { error: delActivitiesError } = await supabase.from("activities").delete().in("program_id", programIds);
        if (delActivitiesError) console.error("Error deleting activities:", delActivitiesError);
        
        const { error: delTiersError } = await (supabase as any).from("tiers").delete().in("program_id", programIds);
        if (delTiersError) console.error("Error deleting tiers:", delTiersError);
      }

      const { error: membershipsError } = await supabase.from("fan_memberships").delete().eq("club_id", clubId);
      if (membershipsError) console.error("Error deleting memberships:", membershipsError);
      
      const { error: verificationsError } = await supabase.from("club_verifications").delete().eq("club_id", clubId);
      if (verificationsError) console.error("Error deleting verifications:", verificationsError);
      
      const { error: delProgramsError } = await supabase.from("loyalty_programs").delete().eq("club_id", clubId);
      if (delProgramsError) console.error("Error deleting programs:", delProgramsError);

      const { data: clubData } = await supabase.from("clubs").select("admin_id").eq("id", clubId).single();

      const { error: clubDeleteError } = await supabase.from("clubs").delete().eq("id", clubId);
      if (clubDeleteError) {
        toast({ title: "Error", description: `Failed to delete club: ${clubDeleteError.message}`, variant: "destructive" });
        return;
      }

      if (clubData?.admin_id) {
        const { error: profileError } = await supabase.from("profiles").delete().eq("id", clubData.admin_id);
        if (profileError) console.error("Error deleting admin profile:", profileError);
      }

      toast({ title: "Club Deleted", description: `${clubName} and all associated data have been removed.` });
      await fetchAllData();
    } catch (error) {
      console.error("Delete club error:", error);
      toast({ title: "Error", description: "Failed to delete club", variant: "destructive" });
    } finally {
      setActionLoading(false);
      setClubToDelete(null);
    }
  };

  // Loading state
  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!isAdmin) {
    return <AdminLoginScreen onLogin={handleAdminLogin} />;
  }



  // Dashboard
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
            <span className="text-sm text-muted-foreground hidden sm:inline">Welcome, {adminEmail || 'Admin'}</span>
            <Button variant="ghost" size="sm" onClick={fetchAllData} className="rounded-full text-muted-foreground hover:text-foreground">
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleAdminLogout}
              className="rounded-full"
            >
              <LogOut className="h-4 w-4 mr-2" /> Sign Out
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
                const criteriaCount = [
                  !!request.official_email_domain,
                  !!request.public_link,
                  !!request.authority_declaration,
                ].filter(Boolean).length;

                return (
                  <Card key={request.id} className="rounded-2xl border-border/40 overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{club?.name}</h3>
                            <Badge variant="secondary" className="rounded-full">{club?.city}, {club?.country}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            {request.official_email_domain && (
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="h-4 w-4 text-green-500" /> Email Domain
                              </span>
                            )}
                            {request.public_link && (
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="h-4 w-4 text-green-500" /> Public Link
                              </span>
                            )}
                            {request.authority_declaration && (
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="h-4 w-4 text-green-500" /> Authority Declaration
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{criteriaCount}/3 verification criteria met</p>
                        </div>
                        <Button onClick={() => handleApproveVerification(request)} disabled={actionLoading}>
                          <CheckCircle2 className="h-4 w-4 mr-2" /> Verify
                        </Button>
                      </div>
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
                <Mail className="h-4 w-4" /> Club Requests
              </h2>
            </div>

            {clubRequests.length === 0 ? (
              <Card className="rounded-2xl border-border/40">
                <CardContent className="pt-8 pb-8 text-center">
                  <Mail className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No club requests found.</p>
                </CardContent>
              </Card>
            ) : (
              clubRequests.map((request) => (
                <Card key={request.id} className="rounded-2xl border-border/40">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{request.club_name}</h3>
                          <Badge className={`rounded-full ${
                            request.status === "pending" ? "bg-yellow-500/20 text-yellow-700" :
                            request.status === "contacted" ? "bg-blue-500/20 text-blue-700" :
                            request.status === "resolved" ? "bg-green-500/20 text-green-700" :
                            "bg-red-500/20 text-red-700"
                          }`}>
                            {request.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          From: {request.requester_email} • {request.country}
                        </p>
                        {request.message && (
                          <p className="text-sm bg-muted/30 p-3 rounded-lg">{request.message}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {request.status === "pending" && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => handleUpdateClubRequest(request.id, "contacted")} disabled={actionLoading}>
                              Contacted
                            </Button>
                            <Button size="sm" onClick={() => handleUpdateClubRequest(request.id, "resolved")} disabled={actionLoading}>
                              Resolved
                            </Button>
                          </>
                        )}
                        {request.status === "contacted" && (
                          <Button size="sm" onClick={() => handleUpdateClubRequest(request.id, "resolved")} disabled={actionLoading}>
                            Resolved
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* CLUBS TAB */}
          <TabsContent value="clubs" className="mt-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search clubs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-xl"
                />
              </div>
              <Badge variant="secondary" className="rounded-full">{filteredClubs.length} clubs</Badge>
            </div>

            {dataLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-3">
                {filteredClubs.map((club) => (
                  <Card key={club.id} className="rounded-2xl border-border/40">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                          {club.logo_url ? (
                            <img src={club.logo_url} alt={club.name} className="h-10 w-10 rounded-lg object-cover" />
                          ) : (
                            <Building2 className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{club.name}</h3>
                            <Badge className={`rounded-full text-xs ${
                              club.status === "verified" ? "bg-green-500/20 text-green-700" :
                              club.status === "official" ? "bg-blue-500/20 text-blue-700" :
                              "bg-yellow-500/20 text-yellow-700"
                            }`}>
                              {club.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{club.city}, {club.country}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {club.status === "unverified" && (
                          <Button size="sm" variant="outline" onClick={() => handleQuickVerify(club.id, club.name)} disabled={actionLoading}>
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Verify
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="text-destructive" onClick={() => setClubToDelete(club)}>
                              <Trash2 className="h-4 w-4 mr-2" /> Delete Club
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* FANS TAB */}
          <TabsContent value="fans" className="mt-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search fans..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-xl"
                />
              </div>
              <Badge variant="secondary" className="rounded-full">{filteredFans.length} fans</Badge>
            </div>

            {dataLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-3">
                {filteredFans.map((fan) => (
                  <Card key={fan.id} className="rounded-2xl border-border/40">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                          <Users className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{fan.full_name || "Unknown"}</h3>
                          <p className="text-sm text-muted-foreground">{fan.email}</p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="text-destructive" onClick={() => setFanToDelete(fan)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete Fan
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* REPORTS TAB */}
          <TabsContent value="reports" className="mt-6 space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <FileText className="h-4 w-4" /> Club Reports
            </h2>

            {/* Reported Chants Quick Access */}
            <Card className="rounded-2xl border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Reported Chants</h3>
                      <p className="text-sm text-muted-foreground">Review and moderate reported fan chants</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => navigate("/admin/reports")}
                    className="rounded-xl"
                  >
                    View Reported Chants
                  </Button>
                </div>
              </CardContent>
            </Card>

            {clubReports.length === 0 ? (
              <Card className="rounded-2xl border-border/40">
                <CardContent className="pt-8 pb-8 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No club reports available.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {clubReports.map((report) => (
                  <Card key={report.club_id} className="rounded-2xl border-border/40">
                    <CardHeader>
                      <CardTitle className="text-lg">{report.club_name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 rounded-lg bg-muted/30">
                          <p className="text-xs text-muted-foreground">Total Fans</p>
                          <p className="text-xl font-bold">{report.total_fans}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/30">
                          <p className="text-xs text-muted-foreground">Points Claimed</p>
                          <p className="text-xl font-bold">{report.total_points_claimed.toLocaleString()}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/30">
                          <p className="text-xs text-muted-foreground">Redemptions</p>
                          <p className="text-xl font-bold">{report.total_rewards_redeemed}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/30">
                          <p className="text-xs text-muted-foreground">Pending Claims</p>
                          <p className="text-xl font-bold text-yellow-500">{report.pending_claims}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Delete Club Dialog */}
      <AlertDialog open={!!clubToDelete} onOpenChange={() => setClubToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Club</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{clubToDelete?.name}&quot;? This will also delete all associated data including activities, rewards, and member data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => clubToDelete && handleDeleteClub(clubToDelete.id, clubToDelete.name)}
            >
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Fan Dialog */}
      <AlertDialog open={!!fanToDelete} onOpenChange={() => setFanToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Fan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{fanToDelete?.full_name || fanToDelete?.email}&quot;? This will also delete all their data including points, memberships, and activity history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => fanToDelete && handleDeleteUser(fanToDelete.user_id)}
            >
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
