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
import { ArrowLeft, Loader2, BellOff, CheckCircle2, Gift, Trophy, Zap, LogOut, Sparkles } from "lucide-react";

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
  const { user, profile, signOut, loading } = useAuth();
  const { toast } = useToast();
  const { previewPointsBalance } = usePreviewMode();

  const isPreviewMode = searchParams.get("preview") === "fan";

  const [club, setClub] = useState<Club | null>(null);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

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
      subscribeToRealtime();
    }
  }, [loading, user, profile, isPreviewMode]);

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

  const fetchNotifications = async () => {
    if (!user) return;

    setDataLoading(true);

    try {
      console.log("AUTH USER ID:", user.id);
      console.log("PROFILE ID:", profile?.id);

      const { data: allRows, error: allError } = await supabase.from("notifications").select("*");
      console.log("ALL NOTIFICATIONS FROM FRONTEND:", allRows);

      if (allError) throw allError;

      const { data: rows, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const normalized = (rows ?? []).map((n: any) => ({
        ...n,
        is_read: n.is_read === true,
      }));

      setNotifications(normalized);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to load notifications.",
        variant: "destructive",
      });
    } finally {
      setDataLoading(false);
    }
  };

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

  const markAsRead = async (notification: NotificationRow) => {
    if (notification.is_read) return;
    setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)));
    await supabase.from("notifications").update({ is_read: true }).eq("id", notification.id);
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", profile?.id).eq("is_read", false);
  };

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

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
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
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(isPreviewMode ? "/fan/home?preview=fan" : "/fan/home")} className="rounded-full text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <Logo size="sm" />
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && <Badge className="bg-destructive text-destructive-foreground rounded-full">{unreadCount}</Badge>}
            <Button variant="ghost" onClick={handleSignOut} className="rounded-full text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-10 space-y-10">
        {/* HERO */}
        <div className="relative overflow-hidden rounded-3xl border border-border/40">
          <div className="absolute inset-0 gradient-hero" />
          <div className="absolute inset-0 stadium-pattern" />
          <div className="absolute inset-0 pitch-lines opacity-30" />

          <div className="relative z-10 p-8 md:p-10 flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-accent" />
                <span className="text-xs font-semibold text-accent uppercase tracking-wider">Updates</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight">Notifications</h1>
            </div>

            {unreadCount > 0 && (
              <Button size="sm" onClick={markAllAsRead} className="rounded-full gradient-stadium font-semibold shadow-stadium">
                Mark all as read
              </Button>
            )}
          </div>
        </div>

        {/* NOTIFICATIONS LIST */}
        <div className="max-w-2xl mx-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-muted/20 flex items-center justify-center">
                <BellOff className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-display font-semibold text-foreground">No Notifications</h2>
              <p className="text-sm text-muted-foreground">You're all caught up.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => (
                <Card
                  key={n.id}
                  className={`relative overflow-hidden rounded-2xl border-border/40 card-hover cursor-pointer ${n.is_read ? "opacity-60" : ""}`}
                  onClick={() => markAsRead(n)}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                  <CardContent className="relative z-10 py-4 flex justify-between items-center">
                    <div>
                      <p className="font-semibold flex items-center gap-2 text-foreground">
                        {n.type === "points_earned" && <Trophy className="h-4 w-4 text-accent" />}
                        {n.type === "reward_redeemed" && <Gift className="h-4 w-4 text-accent" />}
                        {n.type === "tier_upgraded" && <CheckCircle2 className="h-4 w-4 text-primary" />}
                        {n.type === "new_activity" && <Zap className="h-4 w-4 text-primary" />}
                        {getMessage(n)}
                      </p>
                      <p className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
                    </div>

                    {!n.is_read && <Badge className="bg-destructive text-destructive-foreground rounded-full">New</Badge>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
