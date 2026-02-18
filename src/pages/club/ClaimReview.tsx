import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/ui/Logo";
import { PreviewBanner } from "@/components/ui/PreviewBanner";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, FileCheck, CheckCircle, XCircle, Clock, Loader2, Gift, LogOut, Sparkles, Package, ClipboardCheck, User, Hash, Calendar } from "lucide-react";

import type { ManualClaim, Activity, Profile, LoyaltyProgram, RewardRedemption, Reward } from "@/types/database";

interface ClaimWithDetails extends ManualClaim {
  activity: Activity;
  fan_profile: Profile;
}

interface RedemptionWithDetails extends RewardRedemption {
  reward: Reward;
  fan_profile: Profile & { user_id?: string; email?: string };
}

type RedemptionStatus = 'pending' | 'fulfilled' | 'completed';

export default function ClaimReview() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, signOut, loading } = useAuth();
  const { toast } = useToast();

  const isPreviewMode = searchParams.get("preview") === "club_admin";

  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [activityClaims, setActivityClaims] = useState<ClaimWithDetails[]>([]);
  const [allRedemptions, setAllRedemptions] = useState<RedemptionWithDetails[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [activeTab, setActiveTab] = useState<RedemptionStatus>("pending");

  useEffect(() => {
    if (isPreviewMode) {
      setProgram({ id: "preview-program", club_id: "preview-club", name: "Demo Rewards", description: null, points_currency_name: "Points", is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      setActivityClaims([]);
      setAllRedemptions([]);
      setDataLoading(false);
      return;
    }
    if (loading) return;
    if (!user) { navigate("/auth?role=club_admin"); return; }
    if (profile?.role !== "club_admin") { navigate("/fan/home"); return; }
    fetchData();
  }, [isPreviewMode, loading, user, profile]);

  const fetchData = async () => {
    if (!profile) return;
    setDataLoading(true);
    try {
      const { data: clubs, error: clubErr } = await supabase.from("clubs").select("id").eq("admin_id", profile.id).limit(1);
      if (clubErr) throw clubErr;
      if (!clubs?.length) { navigate("/club/onboarding"); return; }
      const clubId = clubs[0].id;
      const { data: programs, error: progErr } = await supabase.from("loyalty_programs").select("*").eq("club_id", clubId).limit(1);
      if (progErr) throw progErr;
      if (!programs?.length) { navigate("/club/dashboard"); return; }
      const p = programs[0] as LoyaltyProgram;
      setProgram(p);
      
      // Fetch activity claims
      const { data: claimsData, error: claimsErr } = await supabase
        .from("manual_claims")
        .select(`*, activities!inner(*), profiles!manual_claims_fan_id_fkey(*)`)
        .eq("activities.program_id", p.id)
        .order("created_at", { ascending: false });
      if (claimsErr) throw claimsErr;
      const formattedClaims = (claimsData ?? []).map((row: { activities: Activity; profiles: Profile }) => {
        const c = row as ManualClaim & { activities: Activity; profiles: Profile };
        return { ...c, activity: c.activities, fan_profile: c.profiles } as ClaimWithDetails;
      });
      setActivityClaims(formattedClaims);
      
      // Fetch ALL redemptions for this program
      const { data: redemptionsData, error: redsErr } = await supabase
        .from("reward_redemptions")
        .select(`
          id,
          reward_id,
          fan_id,
          membership_id,
          points_spent,
          redemption_code,
          fulfilled_at,
          completed_at,
          redeemed_at,
          rewards!inner(id, name, description, points_cost, redemption_method, program_id)
        `)
        .eq("rewards.program_id", p.id)
        .order("redeemed_at", { ascending: false });
      
      if (redsErr) {
        console.error("Redemptions fetch error:", redsErr);
        throw redsErr;
      }
      
      // Fetch fan profiles separately to avoid join issues
      const fanIds = [...new Set((redemptionsData ?? []).map(r => r.fan_id))];
      const { data: fanProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, user_id, phone")
        .in("id", fanIds);
      
      const fanProfileMap = new Map((fanProfiles ?? []).map(p => [p.id, p]));
      
      const formattedRedemptions = (redemptionsData ?? []).map((row) => {
        const r = row as RewardRedemption & { rewards: Reward };
        const fanProfile = fanProfileMap.get(r.fan_id);
        return { 
          ...r, 
          reward: r.rewards, 
          fan_profile: fanProfile ? { 
            id: fanProfile.id, 
            full_name: fanProfile.full_name, 
            email: fanProfile.email, 
            user_id: fanProfile.user_id,
            phone: fanProfile.phone
          } : null 
        } as RedemptionWithDetails;
      });
      setAllRedemptions(formattedRedemptions);
    } catch (error: unknown) {
      console.error("ClaimReview fetch error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load claims.";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setDataLoading(false);
    }
  };

  // Categorize redemptions by status
  const pendingRedemptions = useMemo(() => 
    allRedemptions.filter((r) => !r.fulfilled_at), 
    [allRedemptions]
  );
  
  const fulfilledRedemptions = useMemo(() => 
    allRedemptions.filter((r) => r.fulfilled_at && !r.completed_at), 
    [allRedemptions]
  );
  
  const completedRedemptions = useMemo(() => 
    allRedemptions.filter((r) => r.completed_at), 
    [allRedemptions]
  );

  const handleApproveActivityClaim = async (claim: ClaimWithDetails) => {
    setProcessingId(claim.id);
    try {
      const { error: claimError } = await supabase.from("manual_claims").update({ status: "approved", reviewed_by: profile?.id, reviewed_at: new Date().toISOString() }).eq("id", claim.id);
      if (claimError) throw claimError;
      const { error: completeError } = await supabase.rpc("complete_activity", { p_membership_id: claim.membership_id, p_activity_id: claim.activity_id });
      if (completeError) throw completeError;
      toast({ title: "Claim Approved", description: `Awarded ${claim.activity.points_awarded} ${program?.points_currency_name || "Points"}.` });
      await fetchData();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectActivityClaim = async (claim: ClaimWithDetails) => {
    if (!rejectionReason.trim()) { toast({ title: "Rejection reason required", variant: "destructive" }); return; }
    setProcessingId(claim.id);
    try {
      const { error } = await supabase.from("manual_claims").update({ status: "rejected", reviewed_by: profile?.id, reviewed_at: new Date().toISOString(), rejection_reason: rejectionReason.trim() }).eq("id", claim.id);
      if (error) throw error;
      toast({ title: "Claim Rejected" });
      setRejectionReason("");
      await fetchData();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkFulfilled = async (redemption: RedemptionWithDetails) => {
    setProcessingId(redemption.id);
    try {
      // Update redemption as fulfilled (ready for pickup)
      const { error } = await supabase.from("reward_redemptions").update({ fulfilled_at: new Date().toISOString() }).eq("id", redemption.id);
      if (error) throw error;
      
      // Get the fan's profile to access their user_id for notification
      const { data: fanProfile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("id", redemption.fan_id)
        .single();
      
      // Create notification for the fan
      if (fanProfile?.user_id) {
        const { error: notifError } = await supabase.from("notifications").insert({
          user_id: fanProfile.user_id,
          type: "reward_fulfilled",
          data: {
            title: "Reward Ready! 🎁",
            message: `Your "${redemption.reward?.name}" is ready for pickup! Show your code at the venue.`,
            rewardName: redemption.reward?.name,
            redemptionCode: redemption.redemption_code,
            actionUrl: "/fan/rewards",
            actionLabel: "View My Rewards",
            priority: "high"
          }
        });
        
        if (notifError) {
          console.error("Failed to create notification:", notifError);
        }
      }
      
      toast({ title: "Marked as Ready", description: "The fan has been notified to pick up their reward." });
      await fetchData();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkCompleted = async (redemption: RedemptionWithDetails) => {
    setProcessingId(redemption.id);
    try {
      // Update redemption as completed (handed to fan)
      const now = new Date().toISOString();
      const { error } = await supabase.from("reward_redemptions").update({ 
        completed_at: now 
      }).eq("id", redemption.id);
      
      if (error) {
        // If completed_at column doesn't exist, show helpful message
        if (error.message.includes('column') || error.message.includes('completed_at')) {
          throw new Error("Database needs update: The 'completed_at' column is missing. Please run the SQL migration in Supabase.");
        }
        throw error;
      }
      
      // Use fan_profile from the redemption if available, otherwise fetch
      let fanUserId = redemption.fan_profile?.user_id;
      
      if (!fanUserId) {
        const { data: fanProfile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("id", redemption.fan_id)
          .single();
        fanUserId = fanProfile?.user_id;
      }
      
      // Create notification for the fan confirming completion
      if (fanUserId) {
        await supabase.from("notifications").insert({
          user_id: fanUserId,
          type: "reward_completed",
          data: {
            title: "Reward Collected! ✅",
            message: `You have successfully collected your "${redemption.reward?.name}". Enjoy!`,
            rewardName: redemption.reward?.name,
            pointsSpent: redemption.points_spent,
            completedAt: now,
            priority: "normal"
          }
        });
      }
      
      toast({ title: "Reward Completed", description: "The reward has been handed to the fan. Record saved to audit log." });
      await fetchData();
    } catch (error: unknown) {
      console.error("Mark completed error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleSignOut = async () => {
    if (isPreviewMode) navigate("/preview");
    else { await signOut(); navigate("/"); }
  };

  const pendingActivityClaims = useMemo(() => activityClaims.filter((c) => c.status === "pending"), [activityClaims]);

  const getMethodLabel = (method: string) => {
    switch (method) {
      case "voucher": return "Voucher Code";
      case "code_display": return "Instant Code";
      case "manual_fulfillment": return "Manual Fulfillment";
      default: return "Redemption";
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case "voucher": return "🎟️";
      case "code_display": return "⚡";
      case "manual_fulfillment": return "📦";
      default: return "🎁";
    }
  };

  // Redemption card component for reuse
  const RedemptionCard = ({ redemption, showActions, actionType }: { 
    redemption: RedemptionWithDetails; 
    showActions: boolean;
    actionType: 'fulfill' | 'complete' | 'none';
  }) => {
    const method = redemption.reward?.redemption_method || "manual_fulfillment";
    
    return (
      <Card className="rounded-2xl border-border/40 hover:border-primary/20 transition-all duration-300">
        <CardContent className="py-5 px-6 space-y-4">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-2xl">
                {getMethodIcon(method)}
              </div>
              <div>
                <p className="font-display font-semibold tracking-tight text-lg">{redemption.reward?.name}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>{redemption.fan_profile?.full_name || "Unknown Fan"}</span>
                </div>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">{getMethodLabel(method)}</Badge>
          </div>
          
          {/* Fan Contact Info */}
          <div className="bg-muted/30 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Fan:</span>
              <span>{redemption.fan_profile?.full_name}</span>
            </div>
            {redemption.fan_profile?.email && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="text-xs">Email: {redemption.fan_profile.email}</span>
              </div>
            )}
          </div>
          
          {/* Code Display */}
          {redemption.redemption_code && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Hash className="h-3 w-3" /> Redemption Code
                  </p>
                  <p className="font-mono text-xl font-bold text-primary tracking-wider">{redemption.redemption_code}</p>
                </div>
                <div className="text-right">
                  <Badge className="bg-accent/20 text-accent border-accent/30">{redemption.points_spent} pts</Badge>
                </div>
              </div>
            </div>
          )}
          
          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Redeemed: {new Date(redemption.redeemed_at).toLocaleDateString()}</span>
            </div>
            {redemption.fulfilled_at && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Ready: {new Date(redemption.fulfilled_at).toLocaleDateString()}</span>
              </div>
            )}
            {redemption.completed_at && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>Completed: {new Date(redemption.completed_at).toLocaleDateString()}</span>
              </div>
            )}
          </div>
          
          {/* Actions */}
          {showActions && (
            <div className="flex justify-end gap-2 pt-2 border-t">
              {actionType === 'fulfill' && (
                <Button 
                  onClick={() => handleMarkFulfilled(redemption)} 
                  disabled={processingId === redemption.id} 
                  className="rounded-full"
                >
                  {processingId === redemption.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Package className="h-4 w-4 mr-2" />
                      Mark Ready for Pickup
                    </>
                  )}
                </Button>
              )}
              {actionType === 'complete' && (
                <Button 
                  onClick={() => handleMarkCompleted(redemption)} 
                  disabled={processingId === redemption.id} 
                  className="rounded-full bg-green-600 hover:bg-green-700"
                >
                  {processingId === redemption.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <ClipboardCheck className="h-4 w-4 mr-2" />
                      Mark Collected
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (!isPreviewMode && (loading || dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="club_admin" />}

      <header className="relative border-b border-border/40 overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-40" />
        <div className="relative container py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/club/dashboard")} className="rounded-full hover:bg-card/60">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <div className="h-5 w-px bg-border/40" />
            <Logo size="sm" />
          </div>
          <Button variant="ghost" onClick={handleSignOut} className="rounded-full text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </header>

      <main className="container py-10 max-w-5xl space-y-10">
        {/* HERO */}
        <div className="relative overflow-hidden rounded-3xl border border-border/40 p-8 md:p-10">
          <div className="absolute inset-0 gradient-hero" />
          <div className="absolute inset-0 stadium-pattern" />
          <div className="absolute inset-0 pitch-lines opacity-30" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-xs font-semibold text-accent uppercase tracking-wider">Fulfillment Center</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight">Claims & Rewards</h1>
            <p className="text-white/50 mt-2 max-w-md">Manage reward fulfillments and track completed redemptions.</p>
          </div>
        </div>

        {/* REDEMPTION TABS */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as RedemptionStatus)}>
          <TabsList className="grid grid-cols-3 max-w-lg rounded-full h-11 bg-card border border-border/40">
            <TabsTrigger value="pending" className="rounded-full relative">
              Pending
              {pendingRedemptions.length > 0 && (
                <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center bg-orange-500 text-white text-xs rounded-full">
                  {pendingRedemptions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="fulfilled" className="rounded-full relative">
              Ready
              {fulfilledRedemptions.length > 0 && (
                <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center bg-blue-500 text-white text-xs rounded-full">
                  {fulfilledRedemptions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" className="rounded-full">
              Completed ({completedRedemptions.length})
            </TabsTrigger>
          </TabsList>

          {/* PENDING TAB */}
          <TabsContent value="pending" className="mt-6 space-y-4">
            {pendingRedemptions.length === 0 ? (
              <Card className="rounded-2xl border-border/40">
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No pending reward fulfillments.</p>
                </CardContent>
              </Card>
            ) : (
              pendingRedemptions.map((r) => (
                <RedemptionCard 
                  key={r.id} 
                  redemption={r} 
                  showActions={true} 
                  actionType="fulfill" 
                />
              ))
            )}
          </TabsContent>

          {/* FULFILLED/READY TAB */}
          <TabsContent value="fulfilled" className="mt-6 space-y-4">
            {fulfilledRedemptions.length === 0 ? (
              <Card className="rounded-2xl border-border/40">
                <CardContent className="py-12 text-center">
                  <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No rewards waiting for pickup.</p>
                  <p className="text-xs text-muted-foreground mt-2">Rewards marked as fulfilled will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-400">
                  <strong>Ready for Pickup:</strong> These rewards have been prepared. When the fan comes to collect, verify their code and mark as collected.
                </div>
                {fulfilledRedemptions.map((r) => (
                  <RedemptionCard 
                    key={r.id} 
                    redemption={r} 
                    showActions={true} 
                    actionType="complete" 
                  />
                ))}
              </>
            )}
          </TabsContent>

          {/* COMPLETED/AUDIT TAB */}
          <TabsContent value="completed" className="mt-6 space-y-4">
            {completedRedemptions.length === 0 ? (
              <Card className="rounded-2xl border-border/40">
                <CardContent className="py-12 text-center">
                  <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No completed rewards yet.</p>
                  <p className="text-xs text-muted-foreground mt-2">Completed rewards will be logged here for audit.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-sm text-green-400">
                  <strong>Audit Log:</strong> Record of all completed reward redemptions. This log is kept for verification and audit purposes.
                </div>
                {completedRedemptions.map((r) => (
                  <RedemptionCard 
                    key={r.id} 
                    redemption={r} 
                    showActions={false} 
                    actionType="none" 
                  />
                ))}
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* ACTIVITY CLAIMS SECTION */}
        <div className="space-y-4 pt-8 border-t">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <FileCheck className="h-4 w-4" /> Pending Activity Claims ({pendingActivityClaims.length})
          </h2>

          {pendingActivityClaims.length === 0 ? (
            <Card className="rounded-2xl border-border/40">
              <CardContent className="py-8 text-center text-muted-foreground">No pending activity claims.</CardContent>
            </Card>
          ) : (
            pendingActivityClaims.map((claim) => (
              <Card key={claim.id} className="rounded-2xl border-border/40 hover:border-primary/20 transition-all duration-300">
                <CardContent className="space-y-4 py-5 px-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-display font-semibold tracking-tight">{claim.activity.name}</p>
                      <p className="text-sm text-muted-foreground">{claim.fan_profile?.full_name}</p>
                    </div>
                    <Badge className="rounded-full bg-primary/10 text-primary border-primary/20">{claim.activity.points_awarded} pts</Badge>
                  </div>

                  {claim.proof_description && <p className="text-sm text-muted-foreground bg-muted/30 rounded-xl p-3">{claim.proof_description}</p>}

                  <Textarea placeholder="Rejection reason..." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} className="rounded-xl border-border/40" />

                  <div className="flex gap-2">
                    <Button onClick={() => handleApproveActivityClaim(claim)} disabled={processingId === claim.id} className="rounded-full">
                      <CheckCircle className="h-4 w-4 mr-2" />Approve
                    </Button>
                    <Button variant="destructive" onClick={() => handleRejectActivityClaim(claim)} className="rounded-full">
                      <XCircle className="h-4 w-4 mr-2" />Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
