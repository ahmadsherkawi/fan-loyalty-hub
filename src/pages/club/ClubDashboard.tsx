import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePreviewMode } from "@/contexts/PreviewModeContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/Logo";
import { PreviewBanner } from "@/components/ui/PreviewBanner";
import { Loader2, ShieldCheck, ShieldAlert, LogOut } from "lucide-react";
import { Club, LoyaltyProgram } from "@/types/database";

export default function ClubDashboard() {
const navigate = useNavigate();
const [searchParams] = useSearchParams();
const { user, profile, signOut, loading } = useAuth();
const { previewClubStatus } = usePreviewMode();

const isPreviewMode = searchParams.get("preview") === "club_admin";

const [club, setClub] = useState<Club | null>(null);
const [program, setProgram] = useState<LoyaltyProgram | null>(null);
const [dataLoading, setDataLoading] = useState(true);

useEffect(() => {
if (isPreviewMode) {
setClub({
id: "preview",
admin_id: "preview",
name: "Demo Club",
logo_url: null,
primary_color: "#1a7a4c",
country: "",
city: "",
stadium_name: null,
season_start: null,
season_end: null,
status: previewClubStatus,
created_at: "",
updated_at: "",
});
setDataLoading(false);
return;
}

```
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
```

}, [user, profile, loading, isPreviewMode]);

const fetchData = async () => {
if (!profile) return;

```
setDataLoading(true);

try {
  const { data: clubs } = await supabase
    .from("clubs")
    .select("*")
    .eq("admin_id", profile.id)
    .limit(1);

  if (!clubs?.length) {
    navigate("/club/onboarding");
    return;
  }

  const clubData = clubs[0] as Club;
  setClub(clubData);

  const { data: programs } = await supabase
    .from("loyalty_programs")
    .select("*")
    .eq("club_id", clubData.id)
    .limit(1);

  if (programs?.length) setProgram(programs[0] as LoyaltyProgram);
} catch (err) {
  console.error("Dashboard error:", err);
} finally {
  setDataLoading(false);
}
```

};

const handleSignOut = async () => {
if (isPreviewMode) navigate("/preview");
else {
await signOut();
navigate("/");
}
};

if (!isPreviewMode && (loading || dataLoading)) {
return ( <div className="min-h-screen flex items-center justify-center"> <Loader2 className="h-8 w-8 animate-spin text-primary" /> </div>
);
}

const isVerified = club?.status === "verified" || club?.status === "official";

return ( <div className="min-h-screen bg-background">
{isPreviewMode && <PreviewBanner role="club_admin" />}

```
  <header className="border-b bg-card">
    <div className="container py-4 flex justify-between items-center">
      <Logo />
      <Button variant="ghost" onClick={handleSignOut}>
        <LogOut className="h-4 w-4 mr-2" />
        {isPreviewMode ? "Exit" : "Sign Out"}
      </Button>
    </div>
  </header>

  <main className="container py-8 space-y-6">
    {/* Verification Card */}
    {club && (
      <Card className={isVerified ? "border-primary bg-primary/5" : "border-warning bg-warning/5"}>
        <CardContent className="pt-6 flex items-center gap-4">
          {isVerified ? (
            <ShieldCheck className="h-6 w-6 text-primary" />
          ) : (
            <ShieldAlert className="h-6 w-6 text-warning" />
          )}

          <div>
            <h3 className="font-semibold">
              {isVerified ? "Club Verified" : "Verification Needed"}
            </h3>

            <Badge variant={isVerified ? "default" : "secondary"}>
              {club.status}
            </Badge>
          </div>
        </CardContent>
      </Card>
    )}

    {/* Program */}
    {program ? (
      <Card>
        <CardHeader>
          <CardTitle>{program.name}</CardTitle>
        </CardHeader>
        <CardContent>
          Points currency: <strong>{program.points_currency_name}</strong>
        </CardContent>
      </Card>
    ) : (
      <Card>
        <CardContent className="pt-6">
          No loyalty program yet.
        </CardContent>
      </Card>
    )}
  </main>
</div>
```

);
}
