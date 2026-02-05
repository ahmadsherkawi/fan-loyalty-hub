import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/ui/Logo";
import { PreviewBanner } from "@/components/ui/PreviewBanner";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, FileCheck, CheckCircle, XCircle, Clock, Loader2, ExternalLink } from "lucide-react";
import { ManualClaim, Activity, Profile, LoyaltyProgram } from "@/types/database";

interface ClaimWithDetails extends ManualClaim {
  activity: Activity;
  fan_profile: Profile;
}

export default function ClaimReview() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();

  const isPreviewMode = searchParams.get("preview") === "club_admin";

  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [claims, setClaims] = useState<ClaimWithDetails[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    if (isPreviewMode) {
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
      setClaims([]);
      setDataLoading(false);
    } else {
      if (!loading && !user) {
        navigate("/auth?role=club_admin");
      } else if (!loading && profile?.role !== "club_admin") {
        navigate("/fan/home");
      } else if (!loading && profile) {
        fetchData();
      }
    }
  }, [user, profile, loading, navigate, isPreviewMode]);

  const fetchData = async () => {
    if (!profile) return;
    setDataLoading(true);

    try {
      const { data: clubs } = await supabase.from("clubs").select("id").eq("admin_id", profile.id).limit(1);

      if (!clubs || clubs.length === 0) {
        navigate("/club/onboarding");
        return;
      }

      const { data: programs } = await supabase
        .from("loyalty_programs")
        .select("*")
        .eq("club_id", clubs[0].id)
        .limit(1);

      if (!programs || programs.length === 0) {
        navigate("/club/dashboard");
        return;
      }

      setProgram(programs[0] as LoyaltyProgram);

      // Fetch claims with activity and fan details
      const { data: claimsData } = await supabase
        .from("manual_claims")
        .select(
          `
          *,
          activities!inner(*, program_id),
          profiles!manual_claims_fan_id_fkey(*)
        `,
        )
        .eq("activities.program_id", programs[0].id)
        .order("created_at", { ascending: false });

      const formattedClaims = (claimsData || []).map((claim: unknown) => {
        const c = claim as { activities: Activity; profiles: Profile } & ManualClaim;
        return {
          ...c,
          activity: c.activities,
          fan_profile: c.profiles,
        };
      }) as ClaimWithDetails[];

      setClaims(formattedClaims);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setDataLoading(false);
    }
  };

  const handleApprove = async (claim: ClaimWithDetails) => {
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

      // Create activity completion
      const { error: completionError } = await supabase.from("activity_completions").insert({
        activity_id: claim.activity_id,
        fan_id: claim.fan_id,
        membership_id: claim.membership_id,
        points_earned: claim.activity.points_awarded,
      });

      if (completionError) throw completionError;

      // Award points
      const { error: pointsError } = await supabase.rpc("award_points", {
        p_membership_id: claim.membership_id,
        p_points: claim.activity.points_awarded,
      });

      if (pointsError) throw pointsError;

      toast({
        title: "Claim Approved",
        description: `Awarded ${claim.activity.points_awarded} ${program?.points_currency_name} to the fan.`,
      });

      fetchData();
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        title: "Error",
        description: err.message || "Failed to approve claim",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (claim: ClaimWithDetails) => {
    if (isPreviewMode) {
      toast({ title: "Preview Mode", description: "Rejection is simulated in preview mode." });
      return;
    }

    if (!rejectionReason) {
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
          rejection_reason: rejectionReason,
        })
        .eq("id", claim.id);

      if (error) throw error;

      toast({
        title: "Claim Rejected",
        description: "The fan has been notified.",
      });

      setRejectionReason("");
      fetchData();
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        title: "Error",
        description: err.message || "Failed to reject claim",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (!isPreviewMode && (loading || dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingClaims = claims.filter((c) => c.status === "pending");
  const reviewedClaims = claims.filter((c) => c.status !== "pending");

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
            Review Claims
          </h1>
          <p className="text-muted-foreground">Review and approve manual proof submissions from fans</p>
        </div>

        {/* Pending Claims */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-warning" />
            Pending ({pendingClaims.length})
          </h2>

          {pendingClaims.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {isPreviewMode ? "No Pending Claims" : "All Caught Up!"}
                </h3>
                <p className="text-muted-foreground">
                  {isPreviewMode
                    ? "When fans submit proof for activities, they will appear here for your review."
                    : "No pending claims to review."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingClaims.map((claim) => (
                <Card key={claim.id} className="border-l-4 border-l-warning">
                  <CardContent className="py-4">
                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-foreground">{claim.activity.name}</h3>
                          <Badge variant="secondary">
                            {claim.activity.points_awarded} {program?.points_currency_name}
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
                          Submitted: {new Date(claim.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 min-w-[200px]">
                        <Button
                          onClick={() => handleApprove(claim)}
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
                          onClick={() => handleReject(claim)}
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

        {/* Reviewed Claims */}
        {reviewedClaims.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">Recently Reviewed</h2>
            <div className="space-y-2">
              {reviewedClaims.slice(0, 10).map((claim) => (
                <Card
                  key={claim.id}
                  className={`${claim.status === "approved" ? "border-l-4 border-l-success" : "border-l-4 border-l-destructive"}`}
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
      </main>
    </div>
  );
}
