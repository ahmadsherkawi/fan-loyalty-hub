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
  }, [isPreviewMode, loading, user, profile]);

  const fetchData = async () => {
    if (!profile) return;
    setDataLoading(true);

    try {
      // Club
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

      // Program
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

      // Manual activity claims
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
        return { ...c, activity: c.activities, fan_profile: c.profiles } as ClaimWithDetails;
      });

      setActivityClaims(formattedClaims);

      // 🔴 Corrected reward redemption query (MATCHES DASHBOARD LOGIC)
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
        .in("rewards.redemption_method", ["manual_fulfillment", "voucher", "code_display"])
        .is("fulfilled_at", null) // ← REQUIRED FIX
        .order("redeemed_at", { ascending: false });

      if (redsErr) throw redsErr;

      const formattedRedemptions = (redemptionsData ?? []).map((row: any) => {
        const r = row as RewardRedemption & { rewards: Reward; profiles: Profile };
        return { ...r, reward: r.rewards, fan_profile: r.profiles } as RedemptionWithDetails;
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

  const handleApproveActivityClaim = async (claim: ClaimWithDetails) => {
    setProcessingId(claim.id);

    try {
      const { error: claimError } = await supabase
        .from("manual_claims")
        .update({
          status: "approved",
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", claim.id);

      if (claimError) throw claimError;

      const { error: completeError } = await (supabase.rpc as any)("complete_activity", {
        p_membership_id: claim.membership_id,
        p_activity_id: claim.activity_id,
      });

      if (completeError) throw completeError;

      toast({
        title: "Claim Approved",
        description: `Awarded ${claim.activity.points_awarded} ${program?.points_currency_name || "Points"}.`,
      });

      await fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectActivityClaim = async (claim: ClaimWithDetails) => {
    if (!rejectionReason.trim()) {
      toast({ title: "Rejection reason required", variant: "destructive" });
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

      toast({ title: "Claim Rejected" });
      setRejectionReason("");
      await fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkFulfilled = async (redemption: RedemptionWithDetails) => {
    setProcessingId(redemption.id);

    try {
      const { error } = await supabase
        .from("reward_redemptions")
        .update({ fulfilled_at: new Date().toISOString() })
        .eq("id", redemption.id);

      if (error) throw error;

      toast({ title: "Marked fulfilled" });
      await fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const pendingActivityClaims = useMemo(() => activityClaims.filter((c) => c.status === "pending"), [activityClaims]);

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
        <div className="container py-4 flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/club/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Logo />
        </div>
      </header>

      <main className="container py-8 space-y-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileCheck className="h-8 w-8 text-primary" />
          Review
        </h1>

        {/* Pending Rewards */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Pending Reward Fulfillment ({rewardRedemptions.length})
          </h2>

          {rewardRedemptions.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex justify-between items-center py-4">
                <div>
                  <p className="font-medium">{r.reward?.name}</p>
                  <p className="text-sm text-muted-foreground">{r.fan_profile?.full_name}</p>
                </div>

                <Button onClick={() => handleMarkFulfilled(r)} disabled={processingId === r.id}>
                  {processingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mark Fulfilled"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pending Activity Claims */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Pending Activity Claims ({pendingActivityClaims.length})</h2>

          {pendingActivityClaims.map((claim) => (
            <Card key={claim.id}>
              <CardContent className="space-y-3 py-4">
                <div className="flex justify-between">
                  <p className="font-medium">{claim.activity.name}</p>
                  <Badge>{claim.activity.points_awarded} pts</Badge>
                </div>

                <Textarea
                  placeholder="Rejection reason..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />

                <div className="flex gap-2">
                  <Button onClick={() => handleApproveActivityClaim(claim)} disabled={processingId === claim.id}>
                    Approve
                  </Button>
                  <Button variant="destructive" onClick={() => handleRejectActivityClaim(claim)}>
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
