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
import { ArrowLeft, FileCheck, CheckCircle, XCircle, Clock, Loader2, ExternalLink, Gift } from "lucide-react";

import type { ManualClaim, Activity, Profile, LoyaltyProgram, RewardRedemption, Reward } from "@/types/database";

interface ClaimWithDetails extends ManualClaim {
  activity: Activity;
  fan_profile: Profile;
}

interface RedemptionWithDetails extends RewardRedemption {
  reward: Reward;
  fan_profile: Profile;
}

export default function ClaimReview() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();

  const isPreviewMode = searchParams.get("preview") === "club_admin";

  const [program, setProgram] = useState<LoyaltyProgram | null>(null);

  const [activityClaims, setActivityClaims] = useState<ClaimWithDetails[]>([]);
  const [rewardRedemptions, setRewardRedemptions] = useState<RedemptionWithDetails[]>([]);

  const [dataLoading, setDataLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // manual claim rejection reason (per-row would be nicer, but keeping simple)
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    if (isPreviewMode) {
      // Preview mode: keep empty and fast
      setProgram({
        id: "preview-program",
        club_id: "preview-club",
        name: "Demo Rewards",
        description: null,
        points_currency_name: "Points",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setActivityClaims([]);
      setRewardRedemptions([]);
      setDataLoading(false);
      return;
    }

    if (loading) return;

    if (!user) {
      navigate("/auth?role=club_admin");
      return;
    }

    if (profile?.role !== "club_admin") {
      navigate("/fan/home");
      return;
    }

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreviewMode, loading, user, profile]);

  const fetchData = async () => {
    if (!profile) return;
    setDataLoading(true);

    try {
      // Get club
      const { data: clubs, error: clubErr } = await supabase
        .from("clubs")
        .select("id")
        .eq("admin_id", profile.id)
        .limit(1);

      if (clubErr) throw clubErr;

      if (!clubs?.length) {
        navigate("/club/onboarding");
        return;
      }

      const clubId = clubs[0].id;

      // Get program
      const { data: programs, error: progErr } = await supabase
        .from("loyalty_programs")
        .select("*")
        .eq("club_id", clubId)
        .limit(1);

      if (progErr) throw progErr;

      if (!programs?.length) {
        navigate("/club/dashboard");
        return;
      }

      const p = programs[0] as LoyaltyProgram;
      setProgram(p);

      // 1) Manual proof claims (activity claims)
      const { data: claimsData, error: claimsErr } = await supabase
        .from("manual_claims")
        .select(
          `
          *,
          activities!inner(*),
          profiles!manual_claims_fan_id_fkey(*)
        `,
        )
        .eq("activities.program_id", p.id)
        .order("created_at", { ascending: false });

      if (claimsErr) throw claimsErr;

      const formattedClaims = (claimsData ?? []).map((row: any) => {
        const c = row as ManualClaim & { activities: Activity; profiles: Profile };
        return {
          ...c,
          activity: c.activities,
          fan_profile: c.profiles,
        } as ClaimWithDetails;
      });

      setActivityClaims(formattedClaims);

      // 2) Reward redemptions that require manual fulfillment
      // Pending = fulfilled_at is null
      const { data: redemptionsData, error: redsErr } = await supabase
        .from("reward_redemptions")
        .select(
          `
          *,
          rewards!inner(*),
          profiles!reward_redemptions_fan_id_fkey(*)
        `,
        )
        .eq("rewards.program_id", p.id)
        .eq("rewards.redemption_method", "manual_fulfillment")
        .order("redeemed_at", { ascending: false });

      if (redsErr) throw redsErr;

      const formattedRedemptions = (redemptionsData ?? []).map((row: any) => {
        const r = row as RewardRedemption & { rewards: Reward; profiles: Profile };
        return {
          ...r,
          reward: r.rewards,
          fan_profile: r.profiles,
        } as RedemptionWithDetails;
      });

      setRewardRedemptions(formattedRedemptions);
    } catch (error: any) {
      console.error("ClaimReview fetch error:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to load claims.",
        variant: "destructive",
      });
    } finally {
      setDataLoading(false);
    }
  };

  // APPROVE manual proof claim
  const handleApproveActivityClaim = async (claim: ClaimWithDetails) => {
    if (isPreviewMode) {
      toast({ title: "Preview Mode", description: "Approval is simulated in preview mode." });
      return;
    }

    setProcessingId(claim.id);

    try {
      // Update claim status
      const { error: claimError } = await supabase
        .from("manual_claims")
        .update({
          status: "approved",
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", claim.id);

      if (claimError) throw claimError;

      // Create completion row
      const { error: completionError } = await supabase.from("activity_completions").insert({
        activity_id: claim.activity_id,
        fan_id: claim.fan_id,
        membership_id: claim.membership_id,
        points_earned: claim.activity.points_awarded,
      });

      if (completionError) throw completionError;

      // Award points (RPC must exist)
      const { error: pointsError } = await supabase.rpc("award_points", {
        p_membership_id: claim.membership_id,
        p_points: claim.activity.points_awarded,
      });

      if (pointsError) throw pointsError;

      toast({
        title: "Claim Approved",
        description: `Awarded ${claim.activity.points_awarded} ${program?.points_currency_name || "Points"} to the fan.`,
      });

      await fetchData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to approve claim",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  // REJECT manual proof claim
  const handleRejectActivityClaim = async (claim: ClaimWithDetails) => {
    if (isPreviewMode) {
      toast({ title: "Preview Mode", description: "Rejection is simulated in preview mode." });
      return;
    }

    if (!rejectionReason.trim()) {
      toast({
        title: "Rejection Reason Required",
        description: "Please provide a reason for rejection.",
        variant: "destructive",
      });
      return;
    }

    setProcessingId(claim.id);

    try {
      const { error } = await supabase
        .from("manual_claims")
        .update({
          status: "rejected",
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason.trim(),
        })
        .eq("id", claim.id);

      if (error) throw error;

      toast({
        title: "Claim Rejected",
        description: "Saved rejection reason.",
      });

      setRejectionReason("");
      await fetchData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to reject claim",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  // MARK reward redemption fulfilled
  const handleMarkFulfilled = async (redemption: RedemptionWithDetails) => {
    if (isPreviewMode) {
      toast({ title: "Preview Mode", description: "Fulfillment is simulated in preview mode." });
      return;
    }

    setProcessingId(redemption.id);

    try {
      const { error } = await supabase
        .from("reward_redemptions")
        .update({
          fulfilled_at: new Date().toISOString(),
        })
        .eq("id", redemption.id);

      if (error) throw error;

      toast({
        title: "Marked fulfilled",
        description: `${redemption.reward?.name || "Reward"} was marked as fulfilled.`,
      });

      await fetchData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to mark fulfilled",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const pendingActivityClaims = useMemo(() => activityClaims.filter((c) => c.status === "pending"), [activityClaims]);
  const reviewedActivityClaims = useMemo(() => activityClaims.filter((c) => c.status !== "pending"), [activityClaims]);

  const pendingRewardRedemptions = useMemo(() => rewardRedemptions.filter((r) => !r.fulfilled_at), [rewardRedemptions]);
  const fulfilledRewardRedemptions = useMemo(
    () => rewardRedemptions.filter((r) => !!r.fulfilled_at),
    [rewardRedemptions],
  );

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

      <header className="border-b bg-card">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(isPreviewMode ? "/club/dashboard?preview=club_admin" : "/club/dashboard")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Logo />
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-2">
            <FileCheck className="h-8 w-8 text-primary" />
            Review
          </h1>
          <p className="text-muted-foreground">Approve activity proof claims and fulfill manual rewards</p>
        </div>

        <Tabs defaultValue="rewards">
          <TabsList className="grid grid-cols-2 max-w-md">
            <TabsTrigger value="rewards">
              <span className="flex items-center gap-2">
                <Gift className="h-4 w-4" />
                Rewards
                <Badge variant="secondary" className="ml-1">
                  {pendingRewardRedemptions.length}
                </Badge>
              </span>
            </TabsTrigger>
            <TabsTrigger value="activities">
              <span className="flex items-center gap-2">
                <FileCheck className="h-4 w-4" />
                Activities
                <Badge variant="secondary" className="ml-1">
                  {pendingActivityClaims.length}
                </Badge>
              </span>
            </TabsTrigger>
          </TabsList>

          {/* REWARDS TAB */}
          <TabsContent value="rewards" className="mt-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-warning" />
                Pending Fulfillment ({pendingRewardRedemptions.length})
              </h2>

              {pendingRewardRedemptions.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">All Caught Up</h3>
                    <p className="text-muted-foreground">No pending reward fulfillments.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {pendingRewardRedemptions.map((r) => (
                    <Card key={r.id} className="border-l-4 border-l-warning">
                      <CardContent className="py-4">
                        <div className="flex flex-col md:flex-row md:items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-foreground">{r.reward?.name || "Reward"}</h3>
                              <Badge variant="secondary">
                                -{r.points_spent} {program?.points_currency_name || "Points"}
                              </Badge>
                            </div>

                            <p className="text-sm text-muted-foreground mb-2">
                              Fan: {r.fan_profile?.full_name || r.fan_profile?.email || "Unknown"}
                            </p>

                            <p className="text-xs text-muted-foreground">
                              Redeemed: {new Date(r.redeemed_at).toLocaleString()}
                            </p>
                          </div>

                          <div className="flex flex-col gap-2 min-w-[200px]">
                            <Button
                              onClick={() => handleMarkFulfilled(r)}
                              disabled={processingId === r.id}
                              className="bg-success hover:bg-success/90"
                            >
                              {processingId === r.id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <CheckCircle className="h-4 w-4 mr-2" />
                              )}
                              Mark Fulfilled
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {fulfilledRewardRedemptions.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">Recently Fulfilled</h2>
                <div className="space-y-2">
                  {fulfilledRewardRedemptions.slice(0, 10).map((r) => (
                    <Card key={r.id} className="border-l-4 border-l-success">
                      <CardContent className="py-3 flex items-center justify-between">
                        <div>
                          <span className="font-medium text-foreground">{r.reward?.name || "Reward"}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            by {r.fan_profile?.full_name || "Unknown"}
                          </span>
                        </div>
                        <Badge variant="default">Fulfilled</Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ACTIVITIES TAB */}
          <TabsContent value="activities" className="mt-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-warning" />
                Pending Claims ({pendingActivityClaims.length})
              </h2>

              {pendingActivityClaims.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {isPreviewMode ? "No Pending Claims" : "All Caught Up"}
                    </h3>
                    <p className="text-muted-foreground">
                      {isPreviewMode
                        ? "When fans submit proof for activities, they will appear here."
                        : "No pending activity claims to review."}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {pendingActivityClaims.map((claim) => (
                    <Card key={claim.id} className="border-l-4 border-l-warning">
                      <CardContent className="py-4">
                        <div className="flex flex-col md:flex-row md:items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-foreground">{claim.activity.name}</h3>
                              <Badge variant="secondary">
                                {claim.activity.points_awarded} {program?.points_currency_name || "Points"}
                              </Badge>
                            </div>

                            <p className="text-sm text-muted-foreground mb-2">
                              Submitted by: {claim.fan_profile?.full_name || claim.fan_profile?.email || "Unknown"}
                            </p>

                            {claim.proof_description && (
                              <p className="text-sm text-foreground mb-2">
                                <strong>Description:</strong> {claim.proof_description}
                              </p>
                            )}

                            {claim.proof_url && (
                              <a
                                href={claim.proof_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline flex items-center gap-1"
                              >
                                <ExternalLink className="h-3 w-3" />
                                View Proof
                              </a>
                            )}

                            <p className="text-xs text-muted-foreground mt-2">
                              Submitted: {new Date(claim.created_at).toLocaleString()}
                            </p>
                          </div>

                          <div className="flex flex-col gap-2 min-w-[220px]">
                            <Button
                              onClick={() => handleApproveActivityClaim(claim)}
                              disabled={processingId === claim.id}
                              className="bg-success hover:bg-success/90"
                            >
                              {processingId === claim.id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <CheckCircle className="h-4 w-4 mr-2" />
                              )}
                              Approve
                            </Button>

                            <Textarea
                              placeholder="Rejection reason..."
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              rows={2}
                              className="text-sm"
                            />

                            <Button
                              variant="destructive"
                              onClick={() => handleRejectActivityClaim(claim)}
                              disabled={processingId === claim.id}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {reviewedActivityClaims.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">Recently Reviewed</h2>
                <div className="space-y-2">
                  {reviewedActivityClaims.slice(0, 10).map((claim) => (
                    <Card
                      key={claim.id}
                      className={
                        claim.status === "approved" ? "border-l-4 border-l-success" : "border-l-4 border-l-destructive"
                      }
                    >
                      <CardContent className="py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-foreground">{claim.activity.name}</span>
                            <span className="text-sm text-muted-foreground ml-2">
                              by {claim.fan_profile?.full_name || "Unknown"}
                            </span>
                          </div>
                          <Badge variant={claim.status === "approved" ? "default" : "destructive"}>
                            {claim.status === "approved" ? "Approved" : "Rejected"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
