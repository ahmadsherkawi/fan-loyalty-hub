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

import type { Database } from "@/integrations/supabase/types";

type Activity = Database["public"]["Tables"]["activities"]["Row"];
type FanMembership = Database["public"]["Tables"]["fan_memberships"]["Row"];
type LoyaltyProgram = Database["public"]["Tables"]["loyalty_programs"]["Row"];
type ActivityCompletion = Database["public"]["Tables"]["activity_completions"]["Row"];
type VerificationMethod = Database["public"]["Enums"]["verification_method"];

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
  const [multiplier, setMultiplier] = useState<number>(1);

  const [dataLoading, setDataLoading] = useState(true);

  // Modal state
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [pollQuizModalOpen, setPollQuizModalOpen] = useState(false);

  const effectivePointsBalance = isPreviewMode ? previewPointsBalance : membership?.points_balance || 0;

  /* ================= FETCH ================= */
  const fetchData = useCallback(async () => {
    if (!profile) return;

    setDataLoading(true);

    try {
      // Membership
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

      // 🔥 multiplier from backend
      const { data: multData } = await supabase.rpc("get_membership_multiplier", {
        p_membership_id: m.id,
      });

      const multValue = Number(multData ?? 1);
      setMultiplier(Number.isFinite(multValue) && multValue > 0 ? multValue : 1);

      // Program
      const { data: prog } = await supabase.from("loyalty_programs").select("*").eq("id", m.program_id).limit(1);

      if (prog?.length) setProgram(prog[0] as LoyaltyProgram);

      // Activities
      const { data: acts } = await supabase
        .from("activities")
        .select("*")
        .eq("program_id", m.program_id)
        .eq("is_active", true);

      setActivities((acts || []) as Activity[]);

      // Completions
      const { data: comps } = await supabase.from("activity_completions").select("*").eq("fan_id", profile.id);

      setCompletions((comps || []) as ActivityCompletion[]);

      // Pending manual claims
      const { data: claims } = await supabase
        .from("manual_claims")
        .select("activity_id")
        .eq("fan_id", profile.id)
        .eq("status", "pending");

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

  /* ================= HELPERS ================= */

  const isCompleted = (activityId: string) => {
    if (isPreviewMode) return completedPreviewActivities.includes(activityId);
    return completions.some((c) => c.activity_id === activityId);
  };

  const hasPendingClaim = (activityId: string) => pendingClaims.includes(activityId);

  /* ================= COMPLETE ================= */

  const completeViaRpc = async (activity: Activity) => {
    if (isPreviewMode) {
      const previewFinal = Math.round(activity.points_awarded * 1);
      addPreviewPoints(previewFinal);
      markActivityCompleted(activity.id);

      toast({
        title: "Activity Completed!",
        description: `You earned ${previewFinal} ${program?.points_currency_name || "Points"}.`,
      });
      return;
    }

    if (!membership) return;

    const { data, error } = await supabase.rpc("complete_activity", {
      p_membership_id: membership.id,
      p_activity_id: activity.id,
    });

    if (error) throw error;

    const earned = data?.final_points ?? Math.round((activity.points_awarded || 0) * (multiplier || 1));

    toast({
      title: "Activity Completed!",
      description: `You earned ${earned} ${program?.points_currency_name || "Points"} (×${multiplier}).`,
    });

    await fetchData();
  };

  /* ================= CLICK HANDLER ================= */

  const handleStart = (activity: Activity) => {
    if (isCompleted(activity.id)) {
      toast({ title: "Already completed" });
      return;
    }

    if (activity.verification_method === "manual_proof" && hasPendingClaim(activity.id)) {
      toast({ title: "Pending review" });
      return;
    }

    setSelectedActivity(activity);

    if (activity.verification_method === "manual_proof") return setProofModalOpen(true);
    if (activity.verification_method === "qr_scan") return setQrScannerOpen(true);
    if (activity.verification_method === "location_checkin") return setLocationModalOpen(true);
    if (activity.verification_method === "in_app_completion" && activity.in_app_config)
      return setPollQuizModalOpen(true);

    completeViaRpc(activity).catch(() =>
      toast({ title: "Error", description: "Failed to complete activity.", variant: "destructive" }),
    );
  };

  /* ================= LOADING ================= */

  if (!isPreviewMode && (loading || dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  /* ================= UI ================= */

  const icons: Record<VerificationMethod, React.ComponentType<{ className?: string }>> = {
    qr_scan: QrCode,
    location_checkin: MapPin,
    in_app_completion: Smartphone,
    manual_proof: FileCheck,
  };

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="fan" />}

      {/* HEADER */}
      <header className="border-b bg-card">
        <div className="container py-4 flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/fan/home")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Logo />
        </div>
      </header>

      {/* MAIN */}
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
                          +{Math.round((activity.points_awarded || 0) * (multiplier || 1))}{" "}
                          {program?.points_currency_name || "Points"}
                          {multiplier > 1 && (
                            <span className="ml-2 text-xs text-green-600 font-semibold">×{multiplier}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {completed ? (
                      <Badge className="bg-success text-success-foreground">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Done
                      </Badge>
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
    </div>
  );
}
