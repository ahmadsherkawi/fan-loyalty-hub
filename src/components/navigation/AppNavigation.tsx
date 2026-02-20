/**
 * AppNavigation - Unified Navigation Component
 * Supports landing, app, and minimal variants
 */

import * as React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/Logo";
import {
  LogOut,
  LayoutDashboard,
  Compass,
  Shield,
  ArrowLeft,
  Bell,
  User,
  Settings,
  BarChart3,
  Users,
  Zap,
  Gift,
  Crown,
  Calendar,
  FileCheck,
  Megaphone,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

// ============================================================
// TYPES
// ============================================================

interface NavItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  path: string;
  badge?: string | number;
}

interface AppNavigationProps {
  variant?: "landing" | "app" | "minimal";
  showLogo?: boolean;
  showBack?: boolean;
  backPath?: string;
  title?: string;
  subtitle?: string;
  clubLogo?: string | null;
  clubName?: string | null;
  clubStatus?: string;
  rightContent?: React.ReactNode;
  navItems?: NavItem[];
  activeNavId?: string;
  notificationCount?: number;
  onNotificationClick?: () => void;
  onProfileClick?: () => void;
  className?: string;
}

// ============================================================
// LANDING NAVIGATION
// ============================================================

function LandingNavigation({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const handleDashboard = () => {
    if (profile?.role === "club_admin") {
      navigate("/club/dashboard");
    } else {
      navigate("/fan/home");
    }
  };

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50",
        "bg-background/60 backdrop-blur-2xl border-b border-border/50",
        className
      )}
    >
      <div className="container flex items-center justify-between h-16">
        <button
          onClick={() => navigate("/")}
          className="hover:opacity-80 transition-opacity"
        >
          <Logo />
        </button>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button
                variant="ghost"
                onClick={handleDashboard}
                className="gap-2 rounded-full"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
              <Button
                variant="outline"
                onClick={signOut}
                className="gap-2 rounded-full"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => navigate("/explore")}
                className="gap-2 rounded-full"
              >
                <Compass className="h-4 w-4" />
                <span className="hidden sm:inline">Explore</span>
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate("/auth")}
                className="rounded-full"
              >
                Sign In
              </Button>
              <Button
                variant="primary"
                onClick={() => navigate("/auth?role=club_admin")}
                className="rounded-full shadow-stadium"
              >
                Register Club
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate("/admin")}
                className="rounded-full text-muted-foreground hover:text-foreground"
                title="Admin Panel"
              >
                <Shield className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

// ============================================================
// APP NAVIGATION (Dashboard)
// ============================================================

function AppNavigation({
  showBack = false,
  backPath,
  title,
  subtitle,
  clubLogo,
  clubName,
  clubStatus,
  navItems,
  activeNavId,
  notificationCount = 0,
  onNotificationClick,
  onProfileClick,
  rightContent,
  className,
}: AppNavigationProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleBack = () => {
    if (backPath) {
      navigate(backPath);
    } else {
      navigate(-1);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const isVerified = clubStatus === "verified" || clubStatus === "official";

  return (
    <header
      className={cn(
        "relative border-b border-border/40 overflow-hidden",
        className
      )}
    >
      {/* Background gradient */}
      <div className="absolute inset-0 gradient-mesh opacity-40" />

      <div className="relative container py-3 md:py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left side */}
          <div className="flex items-center gap-3">
            {showBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="rounded-full text-muted-foreground hover:text-foreground h-9"
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            )}

            <Logo size={showBack ? "sm" : "default"} />

            {/* Divider */}
            {(clubName || title) && (
              <>
                <div className="h-5 w-px bg-border/40 hidden sm:block" />

                {/* Club Avatar */}
                {clubLogo ? (
                  <img
                    src={clubLogo}
                    alt={clubName || ""}
                    className="w-8 h-8 rounded-full object-cover border border-border/30 hidden sm:block"
                  />
                ) : clubName ? (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center border border-border/30 hidden sm:flex"
                    style={{ backgroundColor: "#1a7a4c" }}
                  >
                    <span className="text-xs font-bold text-white">
                      {clubName.charAt(0)}
                    </span>
                  </div>
                ) : null}

                {/* Club Name */}
                {clubName && (
                  <span className="font-display font-bold text-foreground tracking-tight text-sm hidden sm:block">
                    {clubName}
                  </span>
                )}

                {/* Title */}
                {title && !clubName && (
                  <span className="font-display font-bold text-foreground tracking-tight text-sm hidden sm:block">
                    {title}
                  </span>
                )}

                {/* Status Badge */}
                {isVerified && (
                  <Badge className="bg-primary/10 text-primary border-primary/20 rounded-full text-xs hidden md:flex">
                    <Shield className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
                {clubStatus === "unverified" && (
                  <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 rounded-full text-xs hidden md:flex">
                    Pending
                  </Badge>
                )}
              </>
            )}
          </div>

          {/* Center - Navigation Pills (Desktop) */}
          {navItems && navItems.length > 0 && (
            <div className="hidden lg:flex items-center">
              <nav className="nav-pill-container">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.path)}
                    className={cn(
                      "nav-pill-item",
                      activeNavId === item.id
                        ? "nav-pill-item-active"
                        : "nav-pill-item-inactive"
                    )}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {item.badge !== undefined && (
                      <span className="ml-1.5 text-xs bg-primary/20 px-1.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-1">
            {rightContent}

            {onNotificationClick && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onNotificationClick}
                className="relative rounded-full text-muted-foreground hover:text-foreground h-9 w-9"
              >
                <Bell className="h-4 w-4" />
                {notificationCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[9px] flex items-center justify-center text-destructive-foreground font-bold">
                    {notificationCount > 9 ? "9+" : notificationCount}
                  </span>
                )}
              </Button>
            )}

            {onProfileClick && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onProfileClick}
                className="rounded-full text-muted-foreground hover:text-foreground h-9 w-9"
              >
                <User className="h-4 w-4" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="rounded-full text-muted-foreground hover:text-foreground hidden sm:flex"
            >
              <LogOut className="h-4 w-4 mr-1.5" />
              Sign out
            </Button>

            {/* Mobile menu button */}
            {navItems && navItems.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden rounded-full h-9 w-9"
              >
                {mobileMenuOpen ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Menu className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && navItems && (
          <div className="lg:hidden mt-4 pt-4 border-t border-border/40 animate-slide-down">
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    navigate(item.path);
                    setMobileMenuOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors",
                    activeNavId === item.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-card hover:text-foreground"
                  )}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="ml-auto text-xs bg-primary/20 px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

// ============================================================
// MINIMAL NAVIGATION
// ============================================================

function MinimalNavigation({
  showBack = true,
  backPath,
  title,
  className,
}: AppNavigationProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleBack = () => {
    if (backPath) {
      navigate(backPath);
    } else {
      navigate(-1);
    }
  };

  return (
    <header
      className={cn(
        "relative border-b border-border/40 overflow-hidden",
        className
      )}
    >
      <div className="absolute inset-0 gradient-mesh opacity-40" />
      <div className="relative container py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="rounded-full text-muted-foreground hover:text-foreground h-8"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back
            </Button>
          )}
          <Logo size="sm" />
        </div>

        {title && (
          <span className="font-display font-bold text-foreground tracking-tight text-sm">
            {title}
          </span>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            await signOut();
            navigate("/");
          }}
          className="rounded-full text-muted-foreground hover:text-foreground h-8"
        >
          <LogOut className="h-3.5 w-3.5 mr-1.5" />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      </div>
    </header>
  );
}

// ============================================================
// MAIN EXPORT
// ============================================================

export function AppNavigationComponent(props: AppNavigationProps) {
  const { variant = "app" } = props;

  if (variant === "landing") {
    return <LandingNavigation className={props.className} />;
  }

  if (variant === "minimal") {
    return <MinimalNavigation {...props} />;
  }

  return <AppNavigation {...props} />;
}

// ============================================================
// PRESET NAVIGATION CONFIGS
// ============================================================

export const fanNavItems: NavItem[] = [
  { id: "home", label: "Home", icon: <LayoutDashboard className="h-4 w-4" />, path: "/fan/home" },
  { id: "activities", label: "Activities", icon: <Zap className="h-4 w-4" />, path: "/fan/activities" },
  { id: "rewards", label: "Rewards", icon: <Gift className="h-4 w-4" />, path: "/fan/rewards" },
  { id: "leaderboard", label: "Rankings", icon: <BarChart3 className="h-4 w-4" />, path: "/fan/leaderboard" },
  { id: "chants", label: "Chants", icon: <Megaphone className="h-4 w-4" />, path: "/fan/chants" },
];

export const clubNavItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, path: "/club/dashboard" },
  { id: "activities", label: "Activities", icon: <Zap className="h-4 w-4" />, path: "/club/activities" },
  { id: "rewards", label: "Rewards", icon: <Gift className="h-4 w-4" />, path: "/club/rewards" },
  { id: "claims", label: "Claims", icon: <FileCheck className="h-4 w-4" />, path: "/club/claims" },
  { id: "analytics", label: "Analytics", icon: <BarChart3 className="h-4 w-4" />, path: "/club/analytics" },
  { id: "seasons", label: "Seasons", icon: <Calendar className="h-4 w-4" />, path: "/club/seasons" },
  { id: "tiers", label: "Tiers", icon: <Crown className="h-4 w-4" />, path: "/club/tiers" },
  { id: "settings", label: "Settings", icon: <Settings className="h-4 w-4" />, path: "/club/profile" },
];

export { LandingNavigation, AppNavigation, MinimalNavigation };
export type { AppNavigationProps, NavItem };
