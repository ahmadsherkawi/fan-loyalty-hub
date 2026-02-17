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
import { 
  ArrowLeft, Loader2, BellOff, CheckCircle2, Gift, Trophy, Zap, LogOut, Sparkles,
  Target, Star, Clock, MapPin, Users, TrendingUp, Calendar, AlertCircle, ChevronRight
} from "lucide-react";

import type { Club, FanMembership, Notification } from "@/types/database";

interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  data: {
    title?: string;
    message?: string;
    actionUrl?: string;
    actionLabel?: string;
    priority?: string;
    [key: string]: any;
  };
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
          type: "tier_progress",
          title: "Almost Gold! 🌟",
          data: { message: "Only 50 points away from Gold tier!", pointsNeeded: 50, nextTier: "Gold" },
          is_read: false,
          created_at: new Date().toISOString(),
        },
        {
          id: "sample-2",
          user_id: "preview-fan",
          type: "reward_available",
          title: "Reward Ready! 🎁",
          data: { message: "You can redeem Club Scarf with your current points!", rewardName: "Club Scarf" },
          is_read: false,
          created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
        },
        {
          id: "sample-3",
          user_id: "preview-fan",
          type: "streak_reminder",
          title: "We miss you! 🏟️",
          data: { message: "It's been 3 days since your last activity. Come back!", daysSinceActive: 3 },
          is_read: false,
          created_at: new Date(Date.now() - 86400 * 1000).toISOString(),
        },
        {
          id: "sample-4",
          user_id: "preview-fan",
          type: "new_activities",
          title: "New Activities Available! 🆕",
          data: { message: "2 new activities added this week. Check them out!", count: 2 },
          is_read: true,
          created_at: new Date(Date.now() - 86400 * 2 * 1000).toISOString(),
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
    if (!user) return;

    const channel = supabase
      .channel("fan-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as NotificationRow;
          setNotifications((prev) => [{ ...newNotif, is_read: newNotif.is_read === true }, ...prev]);
          toast({
            title: newNotif.data?.title || "New notification",
            description: newNotif.data?.message || "You received a new update.",
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
    if (unreadCount === 0 || !user) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "points_earned":
        return <Trophy className="h-5 w-5 text-accent" />;
      case "reward_redeemed":
      case "reward_available":
      case "reward_close":
        return <Gift className="h-5 w-5 text-accent" />;
      case "tier_upgraded":
      case "tier_progress":
        return <Star className="h-5 w-5 text-yellow-500" />;
      case "new_activity":
      case "new_activities":
        return <Zap className="h-5 w-5 text-primary" />;
      case "streak_reminder":
        return <Clock className="h-5 w-5 text-orange-400" />;
      case "claim_approved":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "claim_rejected":
        return <AlertCircle className="h-5 w-5 text-red-400" />;
      case "pending_claims":
        return <Clock className="h-5 w-5 text-blue-400" />;
      case "morning_motivation":
      case "evening_recap":
        return <Sparkles className="h-5 w-5 text-purple-400" />;
      case "proximity_nudge":
        return <MapPin className="h-5 w-5 text-teal-400" />;
      case "smart_nudge":
        return <TrendingUp className="h-5 w-5 text-indigo-400" />;
      default:
        return <Sparkles className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "points_earned":
      case "reward_redeemed":
        return "from-accent/10 to-transparent";
      case "reward_available":
      case "reward_close":
        return "from-green-500/10 to-transparent";
      case "tier_upgraded":
      case "tier_progress":
        return "from-yellow-500/10 to-transparent";
      case "new_activity":
      case "new_activities":
        return "from-primary/10 to-transparent";
      case "streak_reminder":
        return "from-orange-500/10 to-transparent";
      case "claim_approved":
        return "from-green-500/10 to-transparent";
      case "claim_rejected":
        return "from-red-500/10 to-transparent";
      default:
        return "from-primary/5 to-transparent";
    }
  };

  const handleNotificationAction = (notification: NotificationRow) => {
    markAsRead(notification);
    
    const actionUrl = notification.data?.actionUrl;
    if (actionUrl) {
      navigate(actionUrl);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
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
                <span className="text-xs font-semibold text-accent uppercase tracking-wider">Smart Updates</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight">Notifications</h1>
              <p className="text-white/50 mt-2 text-sm">AI-powered nudges personalized just for you</p>
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
              <h2 className="text-lg font-display font-semibold text-foreground">All Caught Up!</h2>
              <p className="text-sm text-muted-foreground">No new notifications. We'll notify you when there's something new.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => (
                <Card
                  key={n.id}
                  className={`relative overflow-hidden rounded-2xl border-border/40 card-hover cursor-pointer transition-all ${n.is_read ? "opacity-60" : ""}`}
                  onClick={() => handleNotificationAction(n)}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${getNotificationColor(n.type)} pointer-events-none`} />
                  <CardContent className="relative z-10 py-4 px-5">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-card/80 border border-border/30 flex items-center justify-center">
                        {getNotificationIcon(n.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-foreground">
                            {n.data?.title || n.type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                          </p>
                          {!n.is_read && (
                            <Badge className="bg-accent text-accent-foreground rounded-full text-xs">New</Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {n.data?.message || "You have a new notification"}
                        </p>
                        
                        <p className="text-xs text-muted-foreground/60">{formatTimeAgo(n.created_at)}</p>
                      </div>

                      {n.data?.actionUrl && !n.is_read && (
                        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>

                    {/* Action button if available */}
                    {n.data?.actionLabel && !n.is_read && (
                      <div className="mt-3 ml-14">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="rounded-full text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNotificationAction(n);
                          }}
                        >
                          {n.data.actionLabel}
                        </Button>
                      </div>
                    )}
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
