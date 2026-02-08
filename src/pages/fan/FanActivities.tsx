import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { usePreviewMode } from "@/contexts/PreviewModeContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/Logo";
import { PreviewBanner } from "@/components/ui/PreviewBanner";
import { ManualProofModal } from "@/components/ui/ManualProofModal";
import { QRScannerModal } from "@/components/ui/QRScannerModal";
import { LocationCheckinModal } from "@/components/ui/LocationCheckinModal";
import { PollQuizParticipation, InAppConfig } from "@/components/ui/PollQuizParticipation";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Zap,
  QrCode,
  MapPin,
  Smartphone,
  FileCheck,
  Loader2,
  CheckCircle,
  Clock,
  Trophy,
} from "lucide-react";
import type {
  Activity,
  FanMembership,
  LoyaltyProgram,
  ActivityCompletion,
  VerificationMethod,
} from "@/types/database";

const verificationMeta: Record<
  VerificationMethod,
  { icon: React.ComponentType<{ className?: string }>; label: string; style: string }
> = {
  qr_scan: { icon: QrCode, label: "Scan QR", style: "verification-qr" },
  location_checkin: { icon: MapPin, label: "Check In", style: "verification-location" },
  in_app_completion: { icon: Smartphone, label: "In-App", style: "verification-poll" },
  manual_proof: { icon: FileCheck, label: "Submit Proof", style: "verification-proof" },
};

export default function FanActivities() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, loading } = useAuth();
  const { toast } = useToast();

  const {
    previewPointsBalance,
    addPreviewPoints,
    completedPreviewActivities,
    markActivityCompleted,
  } = usePreviewMode();

  const isPreviewMode = searchParams.get("preview") === "fan";

  const [membership, setMembership] = useState<FanMembership | null>(null);
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [completions, setCompletions] = useState<ActivityCompletion[]>([]);
  const [pendingClaims, setPendingClaims] = useState<string[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [submittingProof, setSubmittingProof] = useState(false);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [processingQR, setProcessingQR] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [processingLocation, setProcessingLocation] = useState(false);
  const [pollQuizModalOpen, setPollQuizModalOpen] = useState(false);

  const effectivePointsBalance = isPreviewMode
    ? previewPointsBalance
    : membership?.points_balance || 0;

  const fetchData = useCallback(async () => {
    if (!profile) return;
    setDataLoading(true);
    try {
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

      const { data: prog, error: pErr } = await supabase
        .from("loyalty_programs")
        .select("*")
        .eq("id", m.program_id)
        .limit(1);
      if (pErr) throw pErr;
      if (prog?.length) setProgram(prog[0] as LoyaltyProgram);

      const { data: acts, error: aErr } = await supabase
        .from("activities")
        .select("*")
        .eq("program_id", m.program_id)
        .eq("is_active", true);
      if (aErr) throw aErr;
      setActivities((acts || []) as unknown as Activity[]);

      const { data: comps, error: cErr } = await supabase
        .from("activity_completions")
        .select("*")
        .eq("fan_id", profile.id);
      if (cErr) throw cErr;
      setCompletions((comps || []) as ActivityCompletion[]);

      const { data: claims, error: clErr } = await supabase
        .from("manual_claims")
        .select("activity_id")
        .eq("fan_id", profile.id)
        .eq("status", "pending");
      if (clErr) throw clErr;
      setPendingClaims((claims || []).map((c) => c.activity_id));
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
    const { data, error } = await (supabase as any).rpc("complete_activity", {
      p_membership_id: membership.id,
      p_activity_id: activity.id,
      p_metadata: metadata,
    });
    if (error) throw error;
    toast({
      title: "Activity Completed!",
      description: `You earned ${data} ${program?.points_currency_name || "Points"}!`,
    });
    await fetchData();
  };

  const handleStart = (activity: Activity) => {
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
    completeViaRpc(activity, { verification: activity.verification_method }).catch(
      (err: any) => {
        toast({
          title: "Error",
          description: err?.message || "Failed to complete activity.",
          variant: "destructive",
        });
      }
    );
  };

  const handleSubmitProof = async (proofDescription: string, proofUrl: string | null) => {
    if (!selectedActivity) return;
    if (isPreviewMode) {
      toast({
        title: "Proof Submitted!",
        description: "Preview mode: proof would be sent to the club admin for review.",
      });
      setProofModalOpen(false);
      return;
    }
    if (!membership || !profile) return;
    setSubmittingProof(true);
    try {
      const { error } = await supabase.from("manual_claims").insert({
        activity_id: selectedActivity.id,
        fan_id: profile.id,
        membership_id: membership.id,
        proof_description: proofDescription,
        proof_url: proofUrl,
      });
      if (error) throw error;
      toast({
        title: "Proof Submitted!",
        description: "The club admin will review it. You earn points once approved.",
      });
      setProofModalOpen(false);
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

  const handleQRSuccess = async () => {
    if (!selectedActivity) return;
    setProcessingQR(true);
    try {
      await completeViaRpc(selectedActivity, { verification: "qr_scan" });
      setQrScannerOpen(false);
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

  const handleLocationSuccess = async () => {
    if (!selectedActivity) return;
    setProcessingLocation(true);
    try {
      await completeViaRpc(selectedActivity, { verification: "location_checkin" });
      setLocationModalOpen(false);
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
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to record response.",
        variant: "destructive",
      });
    }
  };

  if (!isPreviewMode && (loading || dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const completedCount = activities.filter((a) => isCompleted(a.id)).length;

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="fan" />}

      {/* ─── HEADER ─── */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="flex items-center justify-between px-5 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              navigate(isPreviewMode ? "/fan/home?preview=fan" : "/fan/home")
            }
            className="gap-2 rounded-full -ml-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <div className="flex items-center gap-2 bg-primary/8 rounded-full px-3 py-1.5">
            <Trophy className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold">
              {effectivePointsBalance}
            </span>
            <span className="text-xs text-muted-foreground">
              {program?.points_currency_name || "pts"}
            </span>
          </div>
        </div>
      </header>

      <main className="px-5 py-6 max-w-2xl mx-auto">
        {/* Title area */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-display font-bold flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            Activities
          </h1>
          {activities.length > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              {completedCount}/{activities.length} completed
            </p>
          )}
        </motion.div>

        {/* Activity list */}
        {activities.length === 0 ? (
          <motion.div
            className="card-fan p-10 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Zap className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">
              No activities available yet
            </p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              Check back soon for new challenges!
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {activities.map((activity, i) => {
                const meta = verificationMeta[activity.verification_method];
                const Icon = meta.icon;
                const completed = isCompleted(activity.id);
                const pending = hasPendingClaim(activity.id);

                return (
                  <motion.div
                    key={activity.id}
                    className={`card-fan card-press p-4 ${
                      completed ? "opacity-60" : ""
                    }`}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    layout
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${meta.style}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm leading-tight">
                          {activity.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-bold bg-primary/8 text-primary border-0 px-2 py-0"
                          >
                            +{activity.points_awarded}{" "}
                            {program?.points_currency_name || "pts"}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground/60">
                            {meta.label}
                          </span>
                        </div>
                      </div>

                      {completed ? (
                        <div className="flex items-center gap-1.5 text-success">
                          <CheckCircle className="h-5 w-5" />
                          <span className="text-xs font-semibold">Done</span>
                        </div>
                      ) : pending ? (
                        <div className="flex items-center gap-1.5 text-warning">
                          <Clock className="h-4 w-4" />
                          <span className="text-xs font-medium">Pending</span>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleStart(activity)}
                          className="rounded-full px-5 h-9 font-semibold text-xs"
                        >
                          Start
                        </Button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Modals */}
      <ManualProofModal
        open={proofModalOpen}
        onOpenChange={setProofModalOpen}
        activityName={selectedActivity?.name || ""}
        pointsAwarded={selectedActivity?.points_awarded || 0}
        pointsCurrencyName={program?.points_currency_name || "Points"}
        onSubmit={handleSubmitProof}
        isLoading={submittingProof}
      />
      <QRScannerModal
        open={qrScannerOpen}
        onOpenChange={setQrScannerOpen}
        activityName={selectedActivity?.name || ""}
        expectedQRData={selectedActivity?.qr_code_data || null}
        pointsAwarded={selectedActivity?.points_awarded || 0}
        pointsCurrencyName={program?.points_currency_name || "Points"}
        onSuccess={handleQRSuccess}
        isLoading={processingQR}
      />
      <LocationCheckinModal
        open={locationModalOpen}
        onOpenChange={setLocationModalOpen}
        activityName={selectedActivity?.name || ""}
        targetLat={selectedActivity?.location_lat ?? null}
        targetLng={selectedActivity?.location_lng ?? null}
        radiusMeters={selectedActivity?.location_radius_meters || 500}
        pointsAwarded={selectedActivity?.points_awarded || 0}
        pointsCurrencyName={program?.points_currency_name || "Points"}
        onSuccess={handleLocationSuccess}
        isLoading={processingLocation}
      />
      {selectedActivity?.in_app_config && (
        <PollQuizParticipation
          isOpen={pollQuizModalOpen}
          onClose={() => setPollQuizModalOpen(false)}
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
