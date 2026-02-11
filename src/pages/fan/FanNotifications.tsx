import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/ui/Logo";
import {
  ArrowLeft,
  Bell,
  Trophy,
  Gift,
  Zap,
  CheckCircle2,
  Clock,
  Star,
  Megaphone,
} from "lucide-react";

interface Notification {
  id: string;
  type: "points" | "reward" | "activity" | "announcement" | "badge";
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const demoNotifications: Notification[] = [
  {
    id: "1",
    type: "points",
    title: "Points Earned!",
    message: "You earned 50 points for completing Match Day Check-in.",
    time: "2 min ago",
    read: false,
  },
  {
    id: "2",
    type: "reward",
    title: "Reward Available",
    message: "You now have enough points to redeem the VIP Matchday Pass!",
    time: "1 hr ago",
    read: false,
  },
  {
    id: "3",
    type: "activity",
    title: "New Activity",
    message: "A new activity 'Half-time Quiz' is now live. Earn 30 points!",
    time: "3 hrs ago",
    read: false,
  },
  {
    id: "4",
    type: "announcement",
    title: "Season Update",
    message: "The new season loyalty program starts next Monday. Stay tuned!",
    time: "1 day ago",
    read: true,
  },
  {
    id: "5",
    type: "badge",
    title: "Badge Unlocked!",
    message: "You've earned the 'Super Fan' badge for attending 10 matches.",
    time: "2 days ago",
    read: true,
  },
  {
    id: "6",
    type: "points",
    title: "Bonus Points",
    message: "Weekly bonus: 25 extra points added to your balance.",
    time: "3 days ago",
    read: true,
  },
];

const iconMap: Record<Notification["type"], React.ReactNode> = {
  points: <Trophy className="h-5 w-5 text-accent" />,
  reward: <Gift className="h-5 w-5 text-primary" />,
  activity: <Zap className="h-5 w-5 text-blue-400" />,
  announcement: <Megaphone className="h-5 w-5 text-orange-400" />,
  badge: <Star className="h-5 w-5 text-yellow-400" />,
};

const colorMap: Record<Notification["type"], string> = {
  points: "from-accent/20 to-accent/5",
  reward: "from-primary/20 to-primary/5",
  activity: "from-blue-500/20 to-blue-500/5",
  announcement: "from-orange-500/20 to-orange-500/5",
  badge: "from-yellow-500/20 to-yellow-500/5",
};

export default function FanNotifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(demoNotifications);

  const unread = notifications.filter((n) => !n.read);
  const read = notifications.filter((n) => n.read);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-30">
        <div className="container py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/fan/home")}
            className="rounded-full"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Logo />
        </div>
      </header>

      <main className="container py-8 max-w-2xl">
        {/* Page Title */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold tracking-tight">
                Notifications
              </h1>
              <p className="text-sm text-muted-foreground">
                {unread.length} unread
              </p>
            </div>
          </div>
          {unread.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllRead}
              className="rounded-full text-primary hover:text-primary"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all">
          <TabsList className="grid grid-cols-3 max-w-sm rounded-full bg-muted/50 p-1">
            <TabsTrigger value="all" className="rounded-full text-xs">
              All ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="unread" className="rounded-full text-xs">
              Unread ({unread.length})
            </TabsTrigger>
            <TabsTrigger value="read" className="rounded-full text-xs">
              Read ({read.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6 space-y-3">
            {notifications.map((n) => (
              <NotificationCard
                key={n.id}
                notification={n}
                onRead={markAsRead}
              />
            ))}
          </TabsContent>

          <TabsContent value="unread" className="mt-6 space-y-3">
            {unread.length === 0 ? (
              <EmptyState message="You're all caught up!" />
            ) : (
              unread.map((n) => (
                <NotificationCard
                  key={n.id}
                  notification={n}
                  onRead={markAsRead}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="read" className="mt-6 space-y-3">
            {read.length === 0 ? (
              <EmptyState message="No read notifications yet." />
            ) : (
              read.map((n) => (
                <NotificationCard
                  key={n.id}
                  notification={n}
                  onRead={markAsRead}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function NotificationCard({
  notification,
  onRead,
}: {
  notification: Notification;
  onRead: (id: string) => void;
}) {
  return (
    <Card
      className={`rounded-2xl border-border/50 transition-all duration-300 cursor-pointer hover:shadow-md hover:-translate-y-0.5 ${
        !notification.read
          ? "border-l-4 border-l-primary bg-primary/[0.03]"
          : "opacity-70"
      }`}
      onClick={() => onRead(notification.id)}
    >
      <CardContent className="py-4 px-5 flex items-start gap-4">
        <div
          className={`shrink-0 h-10 w-10 rounded-xl bg-gradient-to-br ${colorMap[notification.type]} flex items-center justify-center mt-0.5`}
        >
          {iconMap[notification.type]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-semibold text-sm truncate">
              {notification.title}
            </p>
            {!notification.read && (
              <Badge className="bg-primary/10 text-primary border-primary/20 rounded-full text-[10px] px-2 py-0">
                New
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {notification.message}
          </p>
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {notification.time}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-16">
      <div className="mx-auto h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
        <Bell className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <p className="text-muted-foreground font-medium">{message}</p>
    </div>
  );
}
