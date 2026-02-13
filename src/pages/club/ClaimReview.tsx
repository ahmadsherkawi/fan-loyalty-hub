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
import { ArrowLeft, FileCheck, CheckCircle, XCircle, Clock, Loader2, ExternalLink, Gift, LogOut, Sparkles } from "lucide-react";

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
  const { user, profile, signOut, loading } = useAuth();
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
      setProgram({ id: "preview-program", club_id: "preview-club", name: "Demo Rewards", description: null, points_currency_name: "Points", is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      setActivityClaims([]);
      setRewardRedemptions([]);
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
      const { data: claimsData, error: claimsErr } = await supabase.from("manual_claims").select(`*, activities!inner(*), profiles!manual_claims_fan_id_fkey(*)`).eq("activities.program_id", p.id).order("created_at", { ascending: false });
      if (claimsErr) throw claimsErr;
      const formattedClaims = (claimsData ?? []).map((row: any) => {
        const c = row as ManualClaim & { activities: Activity; profiles: Profile };
        return { ...c, activity: c.activities, fan_profile: c.profiles } as ClaimWithDetails;
      });
      setActivityClaims(formattedClaims);
      const { data: redemptionsData, error: redsErr } = await supabase.from("reward_redemptions").select(`*, rewards!inner(*), profiles!reward_redemptions_fan_id_fkey(*)`).eq("rewards.program_id", p.id).in("rewards.redemption_method", ["manual_fulfillment", "voucher", "code_display"]).is("fulfilled_at", null).order("redeemed_at", { ascending: false });
      if (redsErr) throw redsErr;
      const formattedRedemptions = (redemptionsData ?? []).map((row: any) => {
        const r = row as RewardRedemption & { rewards: Reward; profiles: Profile };
        return { ...r, reward: r.rewards, fan_profile: r.profiles } as RedemptionWithDetails;
      });
      setRewardRedemptions(formattedRedemptions);
    } catch (error: any) {
      console.error("ClaimReview fetch error:", error);
      toast({ title: "Error", description: error?.message || "Failed to load claims.", variant: "destructive" });
    } finally {
      setDataLoading(false);
    }
  };

  const handleApproveActivityClaim = async (claim: ClaimWithDetails) => {
    setProcessingId(claim.id);
    try {
      const { error: claimError } = await supabase.from("manual_claims").update({ status: "approved", reviewed_by: profile?.id, reviewed_at: new Date().toISOString() }).eq("id", claim.id);
      if (claimError) throw claimError;
      const { error: completeError } = await (supabase.rpc as any)("complete_activity", { p_membership_id: claim.membership_id, p_activity_id: claim.activity_id });
      if (completeError) throw completeError;
      toast({ title: "Claim Approved", description: `Awarded ${claim.activity.points_awarded} ${program?.points_currency_name || "Points"}.` });
      await fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
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
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkFulfilled = async (redemption: RedemptionWithDetails) => {
    setProcessingId(redemption.id);
    try {
      const { error } = await supabase.from("reward_redemptions").update({ fulfilled_at: new Date().toISOString() }).eq("id", redemption.id);
      if (error) throw error;
      toast({ title: "Marked fulfilled" });
      await fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleSignOut = async () => {
    if (isPreviewMode) navigate("/preview");
    else { await signOut(); navigate("/"); }
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

      <main className="container py-10 max-w-4xl space-y-10">
        {/* HERO */}
        <div className="relative overflow-hidden rounded-3xl border border-border/40 p-8 md:p-10">
          <div className="absolute inset-0 gradient-hero" />
          <div className="absolute inset-0 stadium-pattern" />
          <div className="absolute inset-0 pitch-lines opacity-30" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-xs font-semibold text-accent uppercase tracking-wider">Review Center</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight">Claims & Fulfillment</h1>
            <p className="text-white/50 mt-2 max-w-md">Review fan submissions and fulfill reward redemptions.</p>
          </div>
        </div>

        {/* Pending Rewards */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Gift className="h-4 w-4 text-accent" /> Pending Reward Fulfillment ({rewardRedemptions.length})
          </h2>

          {rewardRedemptions.length === 0 ? (
            <Card className="rounded-2xl border-border/40"><CardContent className="py-8 text-center text-muted-foreground">No pending reward fulfillments.</CardContent></Card>
          ) : (
            rewardRedemptions.map((r) => (
              <Card key={r.id} className="rounded-2xl border-border/40 hover:border-primary/20 transition-all duration-300">
                <CardContent className="flex justify-between items-center py-5 px-6">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center"><Gift className="h-5 w-5 text-accent" /></div>
                    <div>
                      <p className="font-display font-semibold tracking-tight">{r.reward?.name}</p>
                      <p className="text-sm text-muted-foreground">{r.fan_profile?.full_name}</p>
                    </div>
                  </div>
                  <Button onClick={() => handleMarkFulfilled(r)} disabled={processingId === r.id} className="rounded-full">
                    {processingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle className="h-4 w-4 mr-2" />Mark Fulfilled</>}
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Pending Activity Claims */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <FileCheck className="h-4 w-4" /> Pending Activity Claims ({pendingActivityClaims.length})
          </h2>

          {pendingActivityClaims.length === 0 ? (
            <Card className="rounded-2xl border-border/40"><CardContent className="py-8 text-center text-muted-foreground">No pending activity claims.</CardContent></Card>
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
                    <Button onClick={() => handleApproveActivityClaim(claim)} disabled={processingId === claim.id} className="rounded-full"><CheckCircle className="h-4 w-4 mr-2" />Approve</Button>
                    <Button variant="destructive" onClick={() => handleRejectActivityClaim(claim)} className="rounded-full"><XCircle className="h-4 w-4 mr-2" />Reject</Button>
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
