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
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, BellOff, CheckCircle2, Gift, Trophy, Zap, Check } from "lucide-react";
import type { Club, FanMembership } from "@/types/database";

interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  data: any;
  is_read: boolean;
  created_at: string;
}

export default function FanNotifications() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();
  const { previewPointsBalance } = usePreviewMode();

  const isPreviewMode = searchParams.get("preview") === "fan";

  const [club, setClub] = useState<Club | null>(null);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  /* ================= INIT ================= */
  useEffect(() => {
    if (loading) return;

    if (isPreviewMode) {
      setClub({
        id: "preview",
        admin_id: "preview",
        name: "Preview Club",
        logo_url: null,
        primary_color: "#0f766e",
        country: "",
        city: "",
        stadium_name: null,
        season_start: null,
        season_end: null,
        status: "verified",
        created_at: "",
        updated_at: "",
      });

      setNotifications([
        {
          id: "1",
          user_id: "preview",
          type: "points_earned",
          data: { points: 120, activityName: "Attend Match" },
          is_read: false,
          created_at: new Date().toISOString(),
        },
        {
          id: "2",
          user_id: "preview",
          type: "reward_redeemed",
          data: { rewardName: "Club Scarf", points: 500 },
          is_read: false,
          created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
        },
      ]);

      setDataLoading(false);
      return;
    }

    if (!user) {
      navigate("/auth");
      return;
    }

    if (profile) {
      fetchNotifications();
      fetchClub();
    }
  }, [loading, user, profile, isPreviewMode]);

  /* ================= FETCH ================= */
  const fetchClub = async () => {
    if (!profile) return;

    const { data: memberships } = await supabase.from("fan_memberships").select("*").eq("fan_id", profile.id).limit(1);

    if (memberships?.length) {
      const m = memberships[0] as FanMembership;

      const { data: clubData } = await supabase.from("clubs").select("*").eq("id", m.club_id).limit(1);

      if (clubData?.length) setClub(clubData[0] as Club);
    }
  };

  const fetchNotifications = async () => {
    if (!profile) return;

    setDataLoading(true);

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setNotifications((data ?? []) as NotificationRow[]);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load notifications.",
        variant: "destructive",
      });
    } finally {
      setDataLoading(false);
    }
  };

  /* ================= ACTIONS ================= */

  const markAsRead = async (notif: NotificationRow) => {
    if (notif.is_read) return;

    setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n)));

    await supabase.from("notifications").update({ is_read: true }).eq("id", notif.id);
  };

  const markAllAsRead = async () => {
    if (!profile) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

    await supabase.from("notifications").update({ is_read: true }).eq("user_id", profile.id).eq("is_read", false);
  };

  /* ================= NAVIGATION ================= */

  const openNotification = async (n: NotificationRow) => {
    await markAsRead(n);

    switch (n.type) {
      case "points_earned":
      case "new_activity":
        navigate("/fan/activities");
        break;

      case "reward_redeemed":
        navigate("/fan/rewards");
        break;

      case "tier_upgraded":
        navigate("/fan/home");
        break;

      default:
        break;
    }
  };

  /* ================= HELPERS ================= */

  const getMessage = (n: NotificationRow) => {
    switch (n.type) {
      case "points_earned":
        return `You earned ${n.data?.points ?? 0} pts for ${n.data?.activityName ?? "an activity"}`;
      case "reward_redeemed":
        return `You redeemed ${n.data?.rewardName ?? "a reward"}`;
      case "tier_upgraded":
        return `You reached ${n.data?.newTier ?? "a new tier"} 🎉`;
      case "new_activity":
        return `New activity: ${n.data?.activityName ?? "Check it out!"}`;
      default:
        return n.data?.message ?? "New notification";
    }
  };

  const today = new Date().toDateString();

  const todayNotifs = notifications.filter((n) => new Date(n.created_at).toDateString() === today);

  const earlierNotifs = notifications.filter((n) => new Date(n.created_at).toDateString() !== today);

  /* ================= LOADING ================= */

  if (!isPreviewMode && (loading || dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  /* ================= UI ================= */

  const renderList = (list: NotificationRow[]) => (
    <div className="space-y-3">
      {list.map((n) => (
        <Card
          key={n.id}
          onClick={() => openNotification(n)}
          className={`cursor-pointer border-border/50 hover:border-primary/20 transition ${
            n.is_read ? "opacity-60" : ""
          }`}
        >
          <CardContent className="py-4 flex justify-between items-start gap-3">
            <div className="flex items-start gap-3">
              {n.type === "points_earned" && <Trophy className="h-5 w-5 text-accent" />}
              {n.type === "reward_redeemed" && <Gift className="h-5 w-5 text-accent" />}
              {n.type === "tier_upgraded" && <CheckCircle2 className="h-5 w-5 text-accent" />}
              {n.type === "new_activity" && <Zap className="h-5 w-5 text-accent" />}

              <div>
                <p className="font-medium">{getMessage(n)}</p>
                <p className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
              </div>
            </div>

            {!n.is_read && (
              <Badge variant="destructive" className="mt-1">
                New
              </Badge>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="fan" />}

      {/* HEADER */}
      <header className="border-b" style={{ backgroundColor: club?.primary_color || "hsl(var(--primary))" }}>
        <div className="container py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(isPreviewMode ? "/fan/home?preview=fan" : "/fan/home")}
            className="text-primary-foreground hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <Logo />

          <div className="ml-auto">
            <Button size="sm" variant="secondary" onClick={markAllAsRead} className="flex items-center gap-1">
              <Check className="h-4 w-4" />
              Mark all read
            </Button>
          </div>
        </div>

        <div className="container pb-6">
          <h1 className="text-2xl font-bold text-primary-foreground">Notifications</h1>
        </div>
      </header>

      {/* CONTENT */}
      <main className="container py-8 max-w-2xl mx-auto space-y-8">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-4">
            <BellOff className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">You’re all caught up.</p>
          </div>
        ) : (
          <>
            {todayNotifs.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground mb-3">Today</h2>
                {renderList(todayNotifs)}
              </section>
            )}

            {earlierNotifs.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground mb-3">Earlier</h2>
                {renderList(earlierNotifs)}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
