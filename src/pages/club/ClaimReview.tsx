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
return;
}

```
if (!loading && !user) navigate("/auth?role=club_admin");
if (!loading && profile?.role !== "club_admin") navigate("/fan/home");
if (!loading && profile) fetchData();
```

}, [user, profile, loading, navigate, isPreviewMode]);

const fetchData = async () => {
if (!profile) return;
setDataLoading(true);

```
try {
  /** 1️⃣ Get club */
  const { data: clubs } = await supabase
    .from("clubs")
    .select("id")
    .eq("admin_id", profile.id)
    .limit(1);

  if (!clubs?.length) {
    navigate("/club/onboarding");
    return;
  }

  /** 2️⃣ Get program */
  const { data: programs } = await supabase
    .from("loyalty_programs")
    .select("*")
    .eq("club_id", clubs[0].id)
    .limit(1);

  if (!programs?.length) {
    navigate("/club/dashboard");
    return;
  }

  const prog = programs[0] as LoyaltyProgram;
  setProgram(prog);

  /** 3️⃣ Get activity IDs for this program */
  const { data: activities } = await supabase
    .from("activities")
    .select("id, name, points_awarded")
    .eq("program_id", prog.id);

  const activityIds = activities?.map((a) => a.id) || [];

  if (activityIds.length === 0) {
    setClaims([]);
    return;
  }

  /** 4️⃣ Get manual claims */
  const { data: claimsData } = await supabase
    .from("manual_claims")
    .select(`
      *,
      profiles!manual_claims_fan_id_fkey(*)
    `)
    .in("activity_id", activityIds)
    .order("created_at", { ascending: false });

  /** 5️⃣ Merge activity info manually */
  const formatted: ClaimWithDetails[] =
    (claimsData || []).map((c: any) => ({
      ...c,
      activity: activities!.find((a) => a.id === c.activity_id)!,
      fan_profile: c.profiles,
    })) || [];

  setClaims(formatted);
} catch (err) {
  console.error("Claim fetch error:", err);
} finally {
  setDataLoading(false);
}
```

};

/** APPROVE */
const handleApprove = async (claim: ClaimWithDetails) => {
setProcessingId(claim.id);

```
try {
  /** mark approved */
  await supabase
    .from("manual_claims")
    .update({
      status: "approved",
      reviewed_by: profile?.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", claim.id);

  /** create completion */
  await supabase.from("activity_completions").insert({
    activity_id: claim.activity_id,
    fan_id: claim.fan_id,
    membership_id: claim.membership_id,
    points_earned: claim.activity.points_awarded,
  });

  /** award points */
  await supabase.rpc("award_points", {
    p_membership_id: claim.membership_id,
    p_points: claim.activity.points_awarded,
  });

  toast({
    title: "Claim Approved",
    description: `+${claim.activity.points_awarded} ${program?.points_currency_name}`,
  });

  fetchData();
} catch (err: any) {
  toast({
    title: "Error",
    description: err.message || "Approval failed",
    variant: "destructive",
  });
} finally {
  setProcessingId(null);
}
```

};

/** REJECT */
const handleReject = async (claim: ClaimWithDetails) => {
if (!rejectionReason) {
toast({
title: "Rejection reason required",
variant: "destructive",
});
return;
}

```
setProcessingId(claim.id);

try {
  await supabase
    .from("manual_claims")
    .update({
      status: "rejected",
      reviewed_by: profile?.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: rejectionReason,
    })
    .eq("id", claim.id);

  toast({ title: "Claim Rejected" });
  setRejectionReason("");
  fetchData();
} catch (err: any) {
  toast({
    title: "Error",
    description: err.message,
    variant: "destructive",
  });
} finally {
  setProcessingId(null);
}
```

};

if (!isPreviewMode && (loading || dataLoading)) {
return ( <div className="min-h-screen flex items-center justify-center"> <Loader2 className="h-8 w-8 animate-spin" /> </div>
);
}

const pending = claims.filter((c) => c.status === "pending");
const reviewed = claims.filter((c) => c.status !== "pending");

return ( <div className="min-h-screen bg-background">
{isPreviewMode && <PreviewBanner role="club_admin" />}

```
  <header className="border-b bg-card">
    <div className="container py-4 flex items-center gap-4">
      <Button variant="ghost" onClick={() => navigate("/club/dashboard")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>
      <Logo />
    </div>
  </header>

  <main className="container py-8 space-y-6">
    <h1 className="text-3xl font-bold flex items-center gap-2">
      <FileCheck className="h-8 w-8" />
      Review Claims
    </h1>

    {pending.map((claim) => (
      <Card key={claim.id}>
        <CardContent className="py-4 space-y-2">
          <p className="font-semibold">{claim.activity.name}</p>
          <p className="text-sm text-muted-foreground">
            by {claim.fan_profile?.full_name || "Fan"}
          </p>

          {claim.proof_url && (
            <a href={claim.proof_url} target="_blank" className="text-primary flex gap-1">
              <ExternalLink className="h-3 w-3" /> View proof
            </a>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => handleApprove(claim)}
              disabled={processingId === claim.id}
            >
              <CheckCircle className="h-4 w-4 mr-1" /> Approve
            </Button>

            <Button
              variant="destructive"
              onClick={() => handleReject(claim)}
              disabled={processingId === claim.id}
            >
              <XCircle className="h-4 w-4 mr-1" /> Reject
            </Button>
          </div>
        </CardContent>
      </Card>
    ))}

    {pending.length === 0 && <p className="text-muted-foreground">No pending claims.</p>}
  </main>
</div>
```

);
}
