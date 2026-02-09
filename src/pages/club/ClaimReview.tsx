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

import type { ManualClaim, Activity, Profile, LoyaltyProgram } from "@/types/database";

/* ================= TYPES ================= */

interface ClaimWithDetails extends ManualClaim {
  activity: Activity;
  fan_profile: Profile;
}

/* ================= COMPONENT ================= */

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

  /* ================= INIT ================= */

  useEffect(() => {
    if (isPreviewMode) {
      setProgram({
        id: "preview",
        club_id: "preview",
        name: "Demo Rewards",
        description: null,
        points_currency_name: "Points",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      setClaims([]);
      setDataLoading(false);
      return;
    }

    if (!loading && !user) {
      navigate("/auth?role=club_admin");
      return;
    }

    if (!loading && profile?.role !== "club_admin") {
      navigate("/fan/home");
      return;
    }

    if (!loading && profile) {
      fetchData();
    }
  }, [user, profile, loading, isPreviewMode]);

  /* ================= FETCH ================= */

  const fetchData = async () => {
    if (!profile) return;

    setDataLoading(true);

    try {
      /* Get club */
      const { data: clubs } = await supabase.from("clubs").select("id").eq("admin_id", profile.id).limit(1);

      if (!clubs?.length) {
        navigate("/club/onboarding");
        return;
      }

      /* Get program */
      const { data: programs } = await supabase
        .from("loyalty_programs")
        .select("*")
        .eq("club_id", clubs[0].id)
        .limit(1);

      if (!programs?.length) {
        navigate("/club/dashboard");
        return;
      }

      const programData = programs[0] as LoyaltyProgram;
      setProgram(programData);

      /* 🔥 Correct join for manual claims */
      const { data: claimsData, error } = await supabase
        .from("manual_claims")
        .select(
          `
          *,
          activities!inner(*),
          profiles!manual_claims_fan_id_fkey(*)
        `,
        )
        .eq("activities.program_id", programData.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formatted: ClaimWithDetails[] = (claimsData || []).map((c: any) => ({
        ...c,
        activity: c.activities,
        fan_profile: c.profiles,
      }));

      setClaims(formatted);
    } catch (err: any) {
      toast({
        title: "Error loading claims",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setDataLoading(false);
    }
  };

  /* ================= APPROVE ================= */

  const handleApprove = async (claim: ClaimWithDetails) => {
    if (isPreviewMode) {
      toast({ title: "Preview Mode", description: "Approval simulated." });
      return;
    }

    setProcessingId(claim.id);

    try {
      /* 1️⃣ Update claim */
      const { error: claimErr } = await supabase
        .from("manual_claims")
        .update({
          status: "approved",
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", claim.id);

      if (claimErr) throw claimErr;

      /* 2️⃣ Create completion */
      const { error: completionErr } = await supabase.from("activity_completions").insert({
        activity_id: claim.activity_id,
        fan_id: claim.fan_id,
        membership_id: claim.membership_id,
        points_earned: claim.activity.points_awarded,
      });

      if (completionErr) throw completionErr;

      /* 3️⃣ Update membership points (NO RPC needed) */
      const { error: pointsErr } = await supabase.rpc("award_points", {
        p_membership_id: claim.membership_id,
        p_points: claim.activity.points_awarded,
      });

      if (pointsErr) throw pointsErr;

      toast({
        title: "Claim Approved",
        description: `+${claim.activity.points_awarded} ${program?.points_currency_name}`,
      });

      fetchData();
    } catch (err: any) {
      toast({
        title: "Approval failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  /* ================= REJECT ================= */

  const handleReject = async (claim: ClaimWithDetails) => {
    if (isPreviewMode) {
      toast({ title: "Preview Mode", description: "Rejection simulated." });
      return;
    }

    if (!rejectionReason.trim()) {
      toast({
        title: "Rejection reason required",
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

      setRejectionReason("");
      toast({ title: "Claim rejected" });

      fetchData();
    } catch (err: any) {
      toast({
        title: "Rejection failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  /* ================= LOADING ================= */

  if (!isPreviewMode && (loading || dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pending = claims.filter((c) => c.status === "pending");
  const reviewed = claims.filter((c) => c.status !== "pending");

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="club_admin" />}

      {/* HEADER */}
      <header className="border-b bg-card">
        <div className="container py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate(isPreviewMode ? "/club/dashboard?preview=club_admin" : "/club/dashboard")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Logo />
        </div>
      </header>

      {/* CONTENT */}
      <main className="container py-8">
        <h1 className="text-3xl font-bold flex items-center gap-2 mb-6">
          <FileCheck className="h-8 w-8 text-primary" />
          Review Claims
        </h1>

        {/* ---------- Pending ---------- */}
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-warning" />
          Pending ({pending.length})
        </h2>

        {pending.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-success" />
              <p>No pending claims.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pending.map((claim) => (
              <Card key={claim.id}>
                <CardContent className="py-4 space-y-2">
                  <p className="font-semibold">{claim.activity.name}</p>
                  <p className="text-sm text-muted-foreground">
                    by {claim.fan_profile?.full_name || claim.fan_profile?.email}
                  </p>

                  {claim.proof_description && <p>{claim.proof_description}</p>}

                  {claim.proof_url && (
                    <a href={claim.proof_url} target="_blank" className="text-primary flex gap-1 items-center">
                      <ExternalLink className="h-3 w-3" /> View proof
                    </a>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => handleApprove(claim)}
                      disabled={processingId === claim.id}
                      className="bg-success"
                    >
                      {processingId === claim.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Approve
                    </Button>

                    <Textarea
                      placeholder="Reason..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                    />

                    <Button variant="destructive" onClick={() => handleReject(claim)}>
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ---------- Reviewed ---------- */}
        {reviewed.length > 0 && (
          <>
            <h2 className="text-xl font-semibold mt-10 mb-4">Recently Reviewed</h2>

            <div className="space-y-2">
              {reviewed.map((claim) => (
                <Card key={claim.id}>
                  <CardContent className="py-3 flex justify-between">
                    <span>{claim.activity.name}</span>
                    <Badge variant={claim.status === "approved" ? "default" : "destructive"}>{claim.status}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
