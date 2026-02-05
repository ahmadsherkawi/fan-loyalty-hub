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
  CalendarClock,
} from "lucide-react";
import type {
  Activity,
  FanMembership,
  LoyaltyProgram,
  ActivityCompletion,
  VerificationMethod,
  ActivityFrequency,
} from "@/types/database";

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
  const [dataLoading, setDataLoading] = useState(true);

  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [submittingProof, setSubmittingProof] = useState(false);
  const [pendingClaims, setPendingClaims] = useState<string[]>([]);

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

      const { data: programs, error: pErr } = await supabase
        .from("loyalty_programs")
        .select("*")
        .eq("id", m.program_id)
        .limit(1);

      if (pErr) throw pErr;
      if (programs?.length) setProgram(programs[0] as LoyaltyProgram);

      const { data: acts, error: aErr } = await supabase
        .from("activities")
        .select("*")
        .eq("program_id", m.program_id)
        .eq("is_active", true);

      if (aErr) throw aErr;
      setActivities((acts || []) as Activity[]);

      const { data: comps, error: cErr } = await supabase
        .from("activity_completions")
        .select("*")
        .eq("fan_id", profile.id);

      if (cErr) throw cErr;
      setCompletions((comps || []) as ActivityCompletion[]);

      const { data: claims } = await supabase
        .from("manual_claims")
        .select("activity_id")
        .eq("fan_id", profile.id)
        .eq("status", "pending");

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
      setMembership(null);
      setProgram(null);
      setActivities([]);
      setCompletions([]);
      setPendingClaims([]);
      setDataLoading(false);
      return;
    }

    if (!loading && !profile) {
      navigate("/auth");
      return;
    }

    if (!loading && profile) fetchData();
  }, [isPreviewMode, loading, profile, navigate, fetchData]);

  const isCompleted = (activityId: string) =>
    isPreviewMode
      ? completedPreviewActivities.includes(activityId)
      : completions.some((c) => c.activity_id === activityId);

  const hasPendingClaim = (activityId: string) => pendingClaims.includes(activityId);

  const completeViaRpc = async (activity: Activity, metadata: Record<string, unknown>) => {
    if (isPreviewMode) {
      addPreviewPoints(activity.points_awarded);
      markActivityCompleted(activity.id);
      toast({
        title: "Activity Completed!",
        description: `You earned ${activity.points_awarded} Points!`,
      });
      return;
    }

    if (!membership) return;

    const { data, error } = await supabase.rpc("complete_activity", {
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

  const handleQRSuccess = async () => {
    if (!selectedActivity) return;
    setProcessingQR(true);
    try {
      await completeViaRpc(selectedActivity, { verification: "qr_scan" });
      setQrScannerOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
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
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setProcessingLocation(false);
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

        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = icons[activity.verification_method];
            const completed = isCompleted(activity.id);
            const pending = hasPendingClaim(activity.id);

            return (
              <Card key={activity.id}>
                <CardContent className="py-4 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <Icon className="h-6 w-6 text-primary" />
                    <div>
                      <p className="font-semibold">{activity.name}</p>
                      <p className="text-sm text-muted-foreground">
                        +{activity.points_awarded} {program?.points_currency_name || "Points"}
                      </p>
                    </div>
                  </div>

                  {completed ? (
                    <Badge className="bg-green-500 text-white">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Done
                    </Badge>
                  ) : pending ? (
                    <Badge variant="outline">Pending</Badge>
                  ) : (
                    <Button onClick={() => completeViaRpc(activity, { verification: activity.verification_method })}>
                      Complete
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>

      <QRScannerModal
        open={qrScannerOpen}
        onOpenChange={setQrScannerOpen}
        onSuccess={handleQRSuccess}
        isLoading={processingQR}
      />
      <LocationCheckinModal
        open={locationModalOpen}
        onOpenChange={setLocationModalOpen}
        onSuccess={handleLocationSuccess}
        isLoading={processingLocation}
      />
      <ManualProofModal
        open={proofModalOpen}
        onOpenChange={setProofModalOpen}
        onSubmit={() => {}}
        isLoading={submittingProof}
      />
      {selectedActivity?.in_app_config && (
        <PollQuizParticipation
          isOpen={pollQuizModalOpen}
          onClose={() => setPollQuizModalOpen(false)}
          activityName={selectedActivity.name}
          config={selectedActivity.in_app_config as InAppConfig}
          pointsAwarded={selectedActivity.points_awarded}
          pointsCurrency={program?.points_currency_name || "Points"}
          onSubmit={() => {}}
          isPreview={isPreviewMode}
        />
      )}
    </div>
  );
}
