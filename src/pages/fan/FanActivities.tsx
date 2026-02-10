import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePreviewMode } from "@/contexts/PreviewModeContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/Logo";
import { PreviewBanner } from "@/components/ui/PreviewBanner";
import { ManualProofModal } from "@/components/ui/ManualProofModal";
import { QRScannerModal } from "@/components/ui/QRScannerModal";
import { LocationCheckinModal } from "@/components/ui/LocationCheckinModal";
import { PollQuizParticipation, InAppConfig } from "@/components/ui/PollQuizParticipation";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Zap, QrCode, MapPin, Smartphone, FileCheck, Loader2, CheckCircle } from "lucide-react";
import type { Activity, FanMembership, LoyaltyProgram, ActivityCompletion, VerificationMethod } from "@/types/database";

export default function FanActivities() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, loading } = useAuth();
  const { toast } = useToast();

  const { previewPointsBalance, addPreviewPoints, completedPreviewActivities, markActivityCompleted } =
    usePreviewMode();

  const isPreviewMode = searchParams.get("preview") === "fan";

  const [membership, setMembership] = useState<FanMembership | null>(null);
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [completions, setCompletions] = useState<ActivityCompletion[]>([]);
  const [pendingClaims, setPendingClaims] = useState<string[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Modal state
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [submittingProof, setSubmittingProof] = useState(false);

  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [processingQR, setProcessingQR] = useState(false);

  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [processingLocation, setProcessingLocation] = useState(false);

  const [pollQuizModalOpen, setPollQuizModalOpen] = useState(false);

  const effectivePointsBalance = isPreviewMode ? previewPointsBalance : membership?.points_balance || 0;

  const fetchData = useCallback(async () => {
    if (!profile) return;

    setDataLoading(true);

    try {
      // Membership
      const { data: memberships, error: mErr } = await supabase
        .from("fan_memberships")
        .select("*")
        .eq("fan_id", profile.id)
        .limit(1);

      if (mErr) throw mErr;

      if (!memberships?.length) {
        navigate("/fan/join");
        return;
      }

      const m = memberships[0] as FanMembership;
      setMembership(m);

      // Program
      const { data: prog, error: pErr } = await supabase
        .from("loyalty_programs")
        .select("*")
        .eq("id", m.program_id)
        .limit(1);

      if (pErr) throw pErr;
      if (prog?.length) setProgram(prog[0] as LoyaltyProgram);

      // Activities: fetch all activities for the program. Some databases may not have an
      // is_active column. Frontend will handle active/inactive display if present.
      const { data: acts, error: aErr } = await (supabase as any)
        .from("activities")
        .select("*")
        .eq("program_id", m.program_id);
        .eq("is_active", true);

      if (aErr) throw aErr;
      setActivities((acts || []) as unknown as Activity[]);

      // Completions
      const { data: comps, error: cErr } = await supabase
        .from("activity_completions")
        .select("*")
        .eq("fan_id", profile.id);

      if (cErr) throw cErr;
      setCompletions((comps || []) as ActivityCompletion[]);

      // Pending manual claims
      const { data: claims, error: clErr } = await supabase
        .from("manual_claims")
        .select("activity_id")
        .eq("fan_id", profile.id)
        .eq("status", "pending");

      if (clErr) throw clErr;
      setPendingClaims((claims || []).map((c: any) => c.activity_id));
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to load activities.",
        variant: "destructive",
      });
    } finally {
      setDataLoading(false);
    }
  }, [profile, navigate, toast]);

  useEffect(() => {
    if (isPreviewMode) {
      setDataLoading(false);
      return;
    }

    if (!loading && !profile) {
      navigate("/auth");
      return;
    }

    if (!loading && profile) {
      fetchData();
    }
  }, [isPreviewMode, loading, profile, navigate, fetchData]);

  const isCompleted = (activityId: string) => {
    if (isPreviewMode) return completedPreviewActivities.includes(activityId);
    return completions.some((c) => c.activity_id === activityId);
  };

  const hasPendingClaim = (activityId: string) => pendingClaims.includes(activityId);

  // Single source of truth completion
  const completeViaRpc = async (activity: Activity, metadata: Record<string, unknown>) => {
    if (isPreviewMode) {
      addPreviewPoints(activity.points_awarded);
      markActivityCompleted(activity.id);
      toast({
        title: "Activity Completed!",
        description: `You earned ${activity.points_awarded} ${program?.points_currency_name || "Points"}!`,
      });
      return;
    }

    if (!membership) return;

    // Call secure RPC without metadata. Points earned are known from the activity object.
    const { error } = await (supabase.rpc as any)("complete_activity", {
      p_membership_id: membership.id,
      p_activity_id: activity.id,
    });
    if (error) throw error;

    toast({
      title: "Activity Completed!",
      description: `You earned ${activity.points_awarded} ${program?.points_currency_name || "Points"}!`,
    });
    await fetchData();
  };

  // Decide what happens when user clicks an activity
  const handleStart = (activity: Activity) => {
    // Guard: already done
    if (isCompleted(activity.id)) {
      toast({ title: "Already completed", description: "You have already completed this activity." });
      return;
    }

    // Guard: manual proof already pending
    if (activity.verification_method === "manual_proof" && hasPendingClaim(activity.id)) {
      toast({
        title: "Pending review",
        description: "You already submitted proof. Wait for the club to review it.",
      });
      return;
    }

    setSelectedActivity(activity);

    if (activity.verification_method === "manual_proof") {
      setProofModalOpen(true);
      return;
    }

    if (activity.verification_method === "qr_scan") {
      setQrScannerOpen(true);
      return;
    }

    if (activity.verification_method === "location_checkin") {
      setLocationModalOpen(true);
      return;
    }

    if (activity.verification_method === "in_app_completion" && activity.in_app_config) {
      setPollQuizModalOpen(true);
      return;
    }

    // Fallback
    completeViaRpc(activity, { verification: activity.verification_method }).catch((err: any) => {
      toast({
        title: "Error",
        description: err?.message || "Failed to complete activity.",
        variant: "destructive",
      });
    });
  };

  // Manual proof submit
  const handleSubmitProof = async (proofDescription: string, proofUrl: string | null) => {
    if (!selectedActivity) return;

    // Validate basic input
    if (!proofDescription?.trim()) {
      toast({
        title: "Add a short description",
        description: "Please describe your proof briefly so the club can review it.",
        variant: "destructive",
      });
      return;
    }

    // Double guard: pending or completed
    if (hasPendingClaim(selectedActivity.id)) {
      toast({
        title: "Pending review",
        description: "You already submitted proof for this activity.",
      });
      setProofModalOpen(false);
      setSelectedActivity(null);
      return;
    }
    if (isCompleted(selectedActivity.id)) {
      toast({
        title: "Already completed",
        description: "This activity is already completed.",
      });
      setProofModalOpen(false);
      setSelectedActivity(null);
      return;
    }

    if (isPreviewMode) {
      toast({
        title: "Proof Submitted!",
        description: "Preview mode: proof would be sent to the club admin for review.",
      });
      setProofModalOpen(false);
      setSelectedActivity(null);
      return;
    }

    if (!membership || !profile) return;

    setSubmittingProof(true);
    try {
      const { error } = await supabase.from("manual_claims").insert({
        activity_id: selectedActivity.id,
        fan_id: profile.id,
        membership_id: membership.id,
        proof_description: proofDescription.trim(),
        proof_url: proofUrl,
        status: "pending",
      });

      if (error) throw error;

      // Optimistic UI: mark as pending immediately
      setPendingClaims((prev) => (prev.includes(selectedActivity.id) ? prev : [...prev, selectedActivity.id]));

      toast({
        title: "Proof Submitted!",
        description: "The club admin will review it. You earn points once approved.",
      });

      setProofModalOpen(false);
      setSelectedActivity(null);

      // Sync from DB
      await fetchData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to submit proof.",
        variant: "destructive",
      });
    } finally {
      setSubmittingProof(false);
    }
  };

  // QR success
  const handleQRSuccess = async () => {
    if (!selectedActivity) return;

    setProcessingQR(true);
    try {
      await completeViaRpc(selectedActivity, { verification: "qr_scan" });
      setQrScannerOpen(false);
      setSelectedActivity(null);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to complete QR activity.",
        variant: "destructive",
      });
    } finally {
      setProcessingQR(false);
    }
  };

  // Location success
  const handleLocationSuccess = async () => {
    if (!selectedActivity) return;

    setProcessingLocation(true);
    try {
      await completeViaRpc(selectedActivity, { verification: "location_checkin" });
      setLocationModalOpen(false);
      setSelectedActivity(null);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to complete check-in.",
        variant: "destructive",
      });
    } finally {
      setProcessingLocation(false);
    }
  };

  // Poll/Quiz submit
  const handlePollQuizSubmit = async (selectedOptionId: string, isCorrect: boolean) => {
    if (!selectedActivity) return;

    const isPoll = (selectedActivity.in_app_config as any)?.type === "poll";

    if (!isPoll && !isCorrect) {
      toast({ title: "Incorrect", description: "Better luck next time!" });
      return;
    }

    try {
      await completeViaRpc(selectedActivity, {
        verification: "in_app_completion",
        type: (selectedActivity.in_app_config as any)?.type,
        selected_option: selectedOptionId,
        is_correct: isCorrect,
      });

      setPollQuizModalOpen(false);
      setSelectedActivity(null);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to record response.",
        variant: "destructive",
      });
    }
  };

  const icons: Record<VerificationMethod, React.ComponentType<{ className?: string }>> = {
    qr_scan: QrCode,
    location_checkin: MapPin,
    in_app_completion: Smartphone,
    manual_proof: FileCheck,
  };

  if (!isPreviewMode && (loading || dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="fan" />}

      <header className="border-b bg-card">
        <div className="container py-4 flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(isPreviewMode ? "/fan/home?preview=fan" : "/fan/home")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Logo />
        </div>
      </header>

      <main className="container py-8">
        <div className="flex justify-between mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Zap className="h-8 w-8 text-primary" />
            Activities
          </h1>

          <Badge variant="secondary" className="text-lg px-4 py-2">
            {effectivePointsBalance} {program?.points_currency_name || "Points"}
          </Badge>
        </div>

        {activities.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground">No activities available yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const Icon = icons[activity.verification_method];
              const completed = isCompleted(activity.id);
              const pending = hasPendingClaim(activity.id);

              return (
                <Card key={activity.id} className={completed ? "border-success/50 bg-success/5" : ""}>
                  <CardContent className="py-4 flex justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>

                      <div>
                        <p className="font-semibold">{activity.name}</p>
                        <p className="text-sm text-muted-foreground">
                          +{activity.points_awarded} {program?.points_currency_name || "Points"}
                        </p>
                      </div>
                    </div>

                    {completed ? (
                      <Badge className="bg-success text-success-foreground">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Done
                      </Badge>
                    ) : pending ? (
                      <Badge variant="outline">Pending</Badge>
                    ) : (
                      <Button onClick={() => handleStart(activity)}>Start</Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Manual Proof */}
      <ManualProofModal
        open={proofModalOpen}
        onOpenChange={(open) => {
          setProofModalOpen(open);
          if (!open) setSelectedActivity(null);
        }}
        activityName={selectedActivity?.name || ""}
        pointsAwarded={selectedActivity?.points_awarded || 0}
        pointsCurrencyName={program?.points_currency_name || "Points"}
        onSubmit={handleSubmitProof}
        isLoading={submittingProof}
      />

      {/* QR Scanner */}
      <QRScannerModal
        open={qrScannerOpen}
        onOpenChange={(open) => {
          setQrScannerOpen(open);
          if (!open) setSelectedActivity(null);
        }}
        activityName={selectedActivity?.name || ""}
        expectedQRData={selectedActivity?.qr_code_data || null}
        pointsAwarded={selectedActivity?.points_awarded || 0}
        pointsCurrencyName={program?.points_currency_name || "Points"}
        onSuccess={handleQRSuccess}
        isLoading={processingQR}
      />

      {/* Location Check-in */}
      <LocationCheckinModal
        open={locationModalOpen}
        onOpenChange={(open) => {
          setLocationModalOpen(open);
          if (!open) setSelectedActivity(null);
        }}
        activityName={selectedActivity?.name || ""}
        targetLat={selectedActivity?.location_lat ?? null}
        targetLng={selectedActivity?.location_lng ?? null}
        radiusMeters={selectedActivity?.location_radius_meters || 500}
        pointsAwarded={selectedActivity?.points_awarded || 0}
        pointsCurrencyName={program?.points_currency_name || "Points"}
        onSuccess={handleLocationSuccess}
        isLoading={processingLocation}
      />

      {/* Poll/Quiz */}
      {selectedActivity?.in_app_config && (
        <PollQuizParticipation
          isOpen={pollQuizModalOpen}
          onClose={() => {
            setPollQuizModalOpen(false);
            setSelectedActivity(null);
          }}
          activityName={selectedActivity.name}
          config={selectedActivity.in_app_config as unknown as InAppConfig}
          pointsAwarded={selectedActivity.points_awarded}
          pointsCurrency={program?.points_currency_name || "Points"}
          onSubmit={handlePollQuizSubmit}
          isPreview={isPreviewMode}
        />
      )}
    </div>
  );
}
