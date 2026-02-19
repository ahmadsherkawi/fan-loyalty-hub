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
import { ArrowLeft, Zap, QrCode, MapPin, Smartphone, FileCheck, Loader2, CheckCircle, LogOut, Sparkles } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Activity = Database["public"]["Tables"]["activities"]["Row"];
type FanMembership = Database["public"]["Tables"]["fan_memberships"]["Row"];
type LoyaltyProgram = Database["public"]["Tables"]["loyalty_programs"]["Row"];
type ActivityCompletion = Database["public"]["Tables"]["activity_completions"]["Row"];
type VerificationMethod = Database["public"]["Enums"]["verification_method"];

export default function FanActivities() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, signOut, loading } = useAuth();
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
  const [multiplier, setMultiplier] = useState<number>(1);

  const effectivePointsBalance = isPreviewMode ? previewPointsBalance : membership?.points_balance || 0;

  const fetchData = useCallback(async () => {
    if (!profile) return;

    setDataLoading(true);

    try {
      const { data: memberships, error: mErr } = await supabase.
      from("fan_memberships").
      select("*").
      eq("fan_id", profile.id).
      limit(1);

      if (mErr) throw mErr;

      if (!memberships?.length) {
        navigate("/fan/join");
        return;
      }

      const m = memberships[0] as FanMembership;
      setMembership(m);

      const { data: multData, error: multErr } = await supabase.rpc("get_membership_multiplier", {
        p_membership_id: m.id
      });

      if (multErr) throw multErr;

      const multValue = Number(multData ?? 1);
      setMultiplier(Number.isFinite(multValue) && multValue > 0 ? multValue : 1);

      const { data: prog, error: pErr } = await supabase.
      from("loyalty_programs").
      select("*").
      eq("id", m.program_id).
      limit(1);

      if (pErr) throw pErr;
      if (prog?.length) setProgram(prog[0] as LoyaltyProgram);

      const { data: acts, error: aErr } = await (supabase as any).
      from("activities").
      select("*").
      eq("program_id", m.program_id).
      eq("is_active", true);

      if (aErr) throw aErr;
      setActivities((acts || []) as unknown as Activity[]);

      const { data: comps, error: cErr } = await supabase.
      from("activity_completions").
      select("*").
      eq("fan_id", profile.id);

      if (cErr) throw cErr;
      setCompletions((comps || []) as ActivityCompletion[]);

      const { data: claims, error: clErr } = await supabase.
      from("manual_claims").
      select("activity_id").
      eq("fan_id", profile.id).
      eq("status", "pending");

      if (clErr) throw clErr;
      setPendingClaims((claims || []).map((c: any) => c.activity_id));
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to load activities.",
        variant: "destructive"
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

  const completeViaRpc = async (activity: Activity) => {
    if (isPreviewMode) {
      const previewMultiplier = 1;
      const previewFinal = Math.round(activity.points_awarded * previewMultiplier);

      addPreviewPoints(previewFinal);
      markActivityCompleted(activity.id);

      toast({
        title: "Activity Completed!",
        description: `You earned ${previewFinal} ${program?.points_currency_name || "Points"} (×${previewMultiplier}).`
      });
      return;
    }

    if (!membership) return;

    const { data, error } = await supabase.rpc("complete_activity", {
      p_membership_id: membership.id,
      p_activity_id: activity.id
    });
    if (error) throw error;

    const earned =
    data?.final_points != null ?
    Number(data.final_points) :
    Math.round(Number(activity.points_awarded || 0) * (multiplier || 1));
    const mult =
    data?.multiplier != null ?
    Number(data.multiplier) :
    Number.isFinite(multiplier) && multiplier > 0 ?
    multiplier :
    1;

    toast({
      title: "Activity Completed!",
      description: `You earned ${earned} ${program?.points_currency_name || "Points"} (×${mult}).`
    });

    await fetchData();
  };

  const handleStart = (activity: Activity) => {
    if (isCompleted(activity.id)) {
      toast({ title: "Already completed", description: "You have already completed this activity." });
      return;
    }

    if (activity.verification_method === "manual_proof" && hasPendingClaim(activity.id)) {
      toast({
        title: "Pending review",
        description: "You already submitted proof. Wait for the club to review it."
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

    completeViaRpc(activity).catch((err: any) => {
      toast({
        title: "Error",
        description: err?.message || "Failed to complete activity.",
        variant: "destructive"
      });
    });
  };

  const handleSubmitProof = async (proofDescription: string, proofUrl: string | null) => {
    if (!selectedActivity) return;

    if (!proofDescription?.trim()) {
      toast({
        title: "Add a short description",
        description: "Please describe your proof briefly so the club can review it.",
        variant: "destructive"
      });
      return;
    }

    if (hasPendingClaim(selectedActivity.id)) {
      toast({
        title: "Pending review",
        description: "You already submitted proof for this activity."
      });
      setProofModalOpen(false);
      setSelectedActivity(null);
      return;
    }
    if (isCompleted(selectedActivity.id)) {
      toast({
        title: "Already completed",
        description: "This activity is already completed."
      });
      setProofModalOpen(false);
      setSelectedActivity(null);
      return;
    }

    if (isPreviewMode) {
      toast({
        title: "Proof Submitted!",
        description: "Preview mode: proof would be sent to the club admin for review."
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
        status: "pending"
      });

      if (error) throw error;

      setPendingClaims((prev) => prev.includes(selectedActivity.id) ? prev : [...prev, selectedActivity.id]);

      toast({
        title: "Proof Submitted!",
        description: "The club admin will review it. You earn points once approved."
      });

      setProofModalOpen(false);
      setSelectedActivity(null);

      await fetchData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to submit proof.",
        variant: "destructive"
      });
    } finally {
      setSubmittingProof(false);
    }
  };

  const handleQRSuccess = async () => {
    if (!selectedActivity) return;

    setProcessingQR(true);
    try {
      await completeViaRpc(selectedActivity);
      setQrScannerOpen(false);
      setSelectedActivity(null);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to complete QR activity.",
        variant: "destructive"
      });
    } finally {
      setProcessingQR(false);
    }
  };

  const handleLocationSuccess = async () => {
    if (!selectedActivity) return;

    setProcessingLocation(true);
    try {
      await completeViaRpc(selectedActivity);
      setLocationModalOpen(false);
      setSelectedActivity(null);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to complete check-in.",
        variant: "destructive"
      });
    } finally {
      setProcessingLocation(false);
    }
  };

  const handlePollQuizSubmit = async (selectedOptionId: string, isCorrect: boolean) => {
    if (!selectedActivity) return;

    const isPoll = (selectedActivity.in_app_config as any)?.type === "poll";

    if (!isPoll && !isCorrect) {
      toast({ title: "Incorrect", description: "Better luck next time!" });
      return;
    }

    try {
      // Store the selected option in metadata for poll results tracking
      if (isPoll && !isPreviewMode && membership) {
        // We need to manually complete the activity to include metadata
        const { error: completionError } = await supabase.from("activity_completions").insert({
          activity_id: selectedActivity.id,
          fan_id: profile?.id,
          membership_id: membership.id,
          points_earned: Math.round((selectedActivity.points_awarded || 0) * (multiplier || 1)),
          metadata: { selectedOption: selectedOptionId }
        });
        
        if (completionError) throw completionError;
        
        // Update points balance
        await supabase.rpc("award_points", {
          p_membership_id: membership.id,
          p_points: Math.round((selectedActivity.points_awarded || 0) * (multiplier || 1))
        });
        
        const earned = Math.round((selectedActivity.points_awarded || 0) * (multiplier || 1));
        toast({
          title: "Activity Completed!",
          description: `You earned ${earned} ${program?.points_currency_name || "Points"}${multiplier > 1 ? ` (×${multiplier})` : ""}.`
        });
        
        await fetchData();
      } else {
        await completeViaRpc(selectedActivity);
      }

      setPollQuizModalOpen(false);
      setSelectedActivity(null);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to record response.",
        variant: "destructive"
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const icons: Record<VerificationMethod, React.ComponentType<{className?: string;}>> = {
    qr_scan: QrCode,
    location_checkin: MapPin,
    in_app_completion: Smartphone,
    manual_proof: FileCheck
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
      {isPreviewMode && <PreviewBanner role="fan" />}

      {/* HEADER */}
      <header className="relative border-b border-border/40 overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-40" />
        <div className="relative container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(isPreviewMode ? "/fan/home?preview=fan" : "/fan/home")} className="rounded-full text-muted-foreground hover:text-foreground h-9">
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
            </Button>
            <Logo size="sm" />
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="rounded-full text-muted-foreground hover:text-foreground h-9">
            <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sign out
          </Button>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        {/* HERO */}
        <div className="relative overflow-hidden rounded-3xl border border-border/40">
          <div className="absolute inset-0 gradient-hero" />
          <div className="absolute inset-0 stadium-pattern" />
          <div className="absolute inset-0 pitch-lines opacity-30" />

          <div className="relative z-10 p-6 md:p-10 flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                <span className="text-[11px] font-semibold text-accent uppercase tracking-widest">Earn Points</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight">Activities</h1>
            </div>
            <div className="glass-dark rounded-2xl px-5 py-3 flex items-center gap-2">
              <Zap className="h-5 w-5 text-accent" />
              <span className="font-display font-bold text-gradient-accent">{effectivePointsBalance}</span>
              <span className="text-white/50 text-sm">{program?.points_currency_name || "Points"}</span>
            </div>
          </div>
        </div>

        {/* ACTIVITIES LIST */}
        {activities.length === 0 ? (
          <div className="rounded-3xl bg-card border border-border/40 p-12 text-center text-muted-foreground text-sm">
            No activities available yet.
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => {
              const Icon = icons[activity.verification_method];
              const completed = isCompleted(activity.id);
              const pending = hasPendingClaim(activity.id);

              return (
                <div
                  key={activity.id}
                  className={`relative overflow-hidden rounded-3xl bg-card border border-border/50 card-hover ${completed ? "opacity-60" : ""}`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${completed ? "from-primary/8" : "from-primary/5"} to-transparent pointer-events-none rounded-3xl`} />
                  <div className="relative z-10 px-5 py-5 flex justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-card/80 border border-border/30 flex items-center justify-center text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-display font-semibold text-foreground">{activity.name}</p>
                        <p className="text-sm text-muted-foreground">
                          +{Math.round((activity.points_awarded || 0) * (multiplier || 1))}{" "}
                          {program?.points_currency_name || "Points"}
                          {multiplier > 1 && (
                            <span className="ml-2 text-xs text-primary font-semibold">×{multiplier}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {completed ? (
                      <Badge className="bg-primary/10 text-primary border-primary/20 rounded-full">
                        <CheckCircle className="h-3 w-3 mr-1" /> Done
                      </Badge>
                    ) : pending ? (
                      <Badge variant="outline" className="rounded-full border-accent/30 text-accent">Pending</Badge>
                    ) : (
                      <Button onClick={() => handleStart(activity)} className="rounded-2xl gradient-stadium font-semibold shadow-stadium text-sm px-4">Start</Button>
                    )}
                  </div>
                </div>
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
        pointsAwarded={selectedActivity ? Math.round((selectedActivity.points_awarded || 0) * (multiplier || 1)) : 0}
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
        pointsAwarded={selectedActivity ? Math.round((selectedActivity.points_awarded || 0) * (multiplier || 1)) : 0}
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
        pointsAwarded={selectedActivity ? Math.round((selectedActivity.points_awarded || 0) * (multiplier || 1)) : 0}
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
          pointsAwarded={selectedActivity ? Math.round((selectedActivity.points_awarded || 0) * (multiplier || 1)) : 0}
          pointsCurrency={program?.points_currency_name || "Points"}
          onSubmit={handlePollQuizSubmit}
          isPreview={isPreviewMode}
        />
      )}
    </div>
  );
}
