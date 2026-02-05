import { useState, useEffect } from "react";
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
import {
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
  const [pendingClaims, setPendingClaims] = useState<string[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // modals
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [pollQuizModalOpen, setPollQuizModalOpen] = useState(false);

  const effectivePointsBalance = isPreviewMode ? previewPointsBalance : membership?.points_balance || 0;

  /* -------------------------------- FETCH DATA -------------------------------- */

  useEffect(() => {
    if (isPreviewMode) {
      setDataLoading(false);
      return;
    }

    if (!loading && !profile) navigate("/auth");
    else if (!loading && profile) fetchData();
  }, [profile, loading, isPreviewMode]);

  const fetchData = async () => {
    if (!profile) return;

    setDataLoading(true);

    try {
      const { data: memberships } = await supabase
        .from("fan_memberships")
        .select("*")
        .eq("fan_id", profile.id)
        .limit(1);

      if (!memberships?.length) {
        navigate("/fan/join");
        return;
      }

      const m = memberships[0] as FanMembership;
      setMembership(m);

      const { data: programs } = await supabase.from("loyalty_programs").select("*").eq("id", m.program_id).limit(1);

      if (programs?.length) setProgram(programs[0]);

      const { data: acts } = await supabase
        .from("activities")
        .select("*")
        .eq("program_id", m.program_id)
        .eq("is_active", true);

      setActivities(acts || []);

      const { data: comps } = await supabase.from("activity_completions").select("*").eq("fan_id", profile.id);

      setCompletions(comps || []);

      const { data: claims } = await supabase
        .from("manual_claims")
        .select("activity_id")
        .eq("fan_id", profile.id)
        .eq("status", "pending");

      setPendingClaims((claims || []).map((c) => c.activity_id));
    } finally {
      setDataLoading(false);
    }
  };

  /* -------------------------------- HELPERS -------------------------------- */

  const isCompleted = (id: string) =>
    isPreviewMode ? completedPreviewActivities.includes(id) : completions.some((c) => c.activity_id === id);

  const hasPendingClaim = (id: string) => pendingClaims.includes(id);

  const getTimeWindowStatus = (activity: Activity) => {
    const now = new Date();
    const start = activity.time_window_start ? new Date(activity.time_window_start) : null;
    const end = activity.time_window_end ? new Date(activity.time_window_end) : null;

    if (start && now < start) return { available: false };
    if (end && now > end) return { available: false };

    return { available: true };
  };

  /* -------------------------------- COMPLETE ACTIVITY -------------------------------- */

  const completeViaRPC = async (activity: Activity, metadata?: any) => {
    if (!membership) return;

    const { error } = await supabase.rpc("complete_activity", {
      p_membership_id: membership.id,
      p_activity_id: activity.id,
      p_metadata: metadata ?? null,
    });

    if (error) throw error;

    fetchData();
  };

  const handleComplete = async (activity: Activity) => {
    if (!getTimeWindowStatus(activity).available) return;

    if (isCompleted(activity.id) || hasPendingClaim(activity.id)) return;

    if (activity.verification_method === "manual_proof") {
      setSelectedActivity(activity);
      setProofModalOpen(true);
      return;
    }

    if (activity.verification_method === "qr_scan") {
      setSelectedActivity(activity);
      setQrScannerOpen(true);
      return;
    }

    if (activity.verification_method === "location_checkin") {
      setSelectedActivity(activity);
      setLocationModalOpen(true);
      return;
    }

    if (activity.verification_method === "in_app_completion" && activity.in_app_config) {
      setSelectedActivity(activity);
      setPollQuizModalOpen(true);
      return;
    }

    if (isPreviewMode) {
      addPreviewPoints(activity.points_awarded);
      markActivityCompleted(activity.id);
      return;
    }

    try {
      await completeViaRPC(activity);
      toast({
        title: "Activity completed!",
        description: `+${activity.points_awarded} ${program?.points_currency_name}`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Could not complete activity",
        variant: "destructive",
      });
    }
  };

  /* -------------------------------- RENDER -------------------------------- */

  if (!isPreviewMode && (loading || dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const icons: Record<VerificationMethod, any> = {
    qr_scan: QrCode,
    location_checkin: MapPin,
    in_app_completion: Smartphone,
    manual_proof: FileCheck,
  };

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="fan" />}

      <header className="border-b bg-card">
        <div className="container py-4 flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/fan/home")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Logo />
        </div>
      </header>

      <main className="container py-8 space-y-4">
        {activities.map((activity) => {
          const Icon = icons[activity.verification_method];
          const completed = isCompleted(activity.id);
          const pending = hasPendingClaim(activity.id);
          const unavailable = !getTimeWindowStatus(activity).available;

          return (
            <Card key={activity.id}>
              <CardContent className="py-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <Icon className="h-6 w-6 text-primary" />
                  <div>
                    <p className="font-semibold">{activity.name}</p>
                    <p className="text-sm text-muted-foreground">
                      +{activity.points_awarded} {program?.points_currency_name}
                    </p>
                  </div>
                </div>

                {completed ? (
                  <Badge>Done</Badge>
                ) : pending ? (
                  <Badge variant="outline">Pending</Badge>
                ) : unavailable ? (
                  <Badge variant="outline">Unavailable</Badge>
                ) : (
                  <Button onClick={() => handleComplete(activity)}>Complete</Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </main>
    </div>
  );
}
