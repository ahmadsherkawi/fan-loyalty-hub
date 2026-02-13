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
import { ArrowLeft, Loader2, BellOff, CheckCircle2, Gift, Trophy, Zap } from "lucide-react";

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

  /** ---------- SAFE unread counter ---------- */
  const unreadCount = notifications.filter((n) => n.is_read === false).length;

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
          id: "sample-1",
          user_id: "preview-fan",
          type: "points_earned",
          data: { points: 100, activityName: "Attend Match" },
          is_read: false,
          created_at: new Date().toISOString(),
        },
        {
          id: "sample-2",
          user_id: "preview-fan",
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
      subscribeToRealtime(); // 🔥 Phase 1.2
    }
  }, [loading, user, profile, isPreviewMode]);

  /* ================= FETCH CLUB ================= */
  const fetchClub = async () => {
    if (!profile) return;

    try {
      const { data: memberships } = await supabase
        .from("fan_memberships")
        .select("*")
        .eq("fan_id", profile.id)
        .limit(1);

      if (memberships?.length) {
        const m = memberships[0] as FanMembership;

        const { data: clubData } = await supabase.from("clubs").select("*").eq("id", m.club_id).limit(1);

        if (clubData?.length) setClub(clubData[0] as Club);
      }
    } catch {
      /* ignore */
    }
  };

  /* ================= FETCH NOTIFICATIONS ================= */
  const fetchNotifications = async () => {
    if (!profile) return;

    setDataLoading(true);

    try {
      const { data: rows, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      /** 🔥 normalize boolean */
      const normalized = (rows ?? []).map((n: any) => ({
        ...n,
        is_read: n.is_read === true,
      }));

      setNotifications(normalized as NotificationRow[]);
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

  /* ================= REALTIME SUBSCRIPTION ================= */
  const subscribeToRealtime = () => {
    if (!profile) return;

    const channel = supabase
      .channel("fan-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          const newNotif = payload.new as NotificationRow;

          setNotifications((prev) => [{ ...newNotif, is_read: newNotif.is_read === true }, ...prev]);

          toast({
            title: "New notification",
            description: "You received a new update.",
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  /* ================= MARK SINGLE ================= */
  const markAsRead = async (notification: NotificationRow) => {
    if (notification.is_read) return;

    setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)));

    await supabase.from("notifications").update({ is_read: true }).eq("id", notification.id);
  };

  /* ================= MARK ALL ================= */
  const markAllAsRead = async () => {
    if (unreadCount === 0) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

    await supabase.from("notifications").update({ is_read: true }).eq("user_id", profile?.id).eq("is_read", false);
  };

  /* ================= MESSAGE ================= */
  const getMessage = (notif: NotificationRow) => {
    switch (notif.type) {
      case "points_earned":
        return `You earned ${notif.data?.points ?? 0} points for ${notif.data?.activityName ?? "an activity"}`;
      case "reward_redeemed":
        return `You redeemed ${notif.data?.rewardName ?? "a reward"} for ${notif.data?.points ?? 0} points`;
      case "tier_upgraded":
        return `Congratulations! You reached ${notif.data?.newTier ?? "a new"} tier`;
      case "new_activity":
        return `New activity available: ${notif.data?.activityName ?? "an activity"}`;
      default:
        return notif.data?.message ?? "You have a new notification";
    }
  };

  /* ================= LOADING ================= */
  if (!isPreviewMode && (loading || dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  /* ================= UI ================= */
  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="fan" />}

      {/* HEADER */}
      <header className="border-b" style={{ backgroundColor: club?.primary_color || "hsl(var(--primary))" }}>
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
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
          </div>

          {unreadCount > 0 && <Badge variant="destructive">{unreadCount}</Badge>}
        </div>

        <div className="container pb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary-foreground">Notifications</h1>

          {unreadCount > 0 && (
            <Button size="sm" variant="secondary" onClick={markAllAsRead}>
              Mark all as read
            </Button>
          )}
        </div>
      </header>

      {/* MAIN */}
      <main className="container py-8 max-w-2xl mx-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center gap-4">
            <BellOff className="h-10 w-10 text-muted-foreground" />
            <h2 className="text-lg font-semibold">No Notifications</h2>
            <p className="text-sm text-muted-foreground">You’re all caught up.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <Card
                key={n.id}
                className={`border-border/50 ${n.is_read ? "opacity-70" : ""}`}
                onClick={() => markAsRead(n)}
              >
                <CardContent className="py-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium flex items-center gap-2">
                      {n.type === "points_earned" && <Trophy className="h-4 w-4 text-accent" />}
                      {n.type === "reward_redeemed" && <Gift className="h-4 w-4 text-accent" />}
                      {n.type === "tier_upgraded" && <CheckCircle2 className="h-4 w-4 text-accent" />}
                      {n.type === "new_activity" && <Zap className="h-4 w-4 text-accent" />}
                      {getMessage(n)}
                    </p>
                    <p className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
                  </div>

                  {!n.is_read && <Badge variant="destructive">New</Badge>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
