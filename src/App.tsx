import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { AuthProvider } from "@/contexts/AuthContext";
import { PreviewModeProvider } from "@/contexts/PreviewModeContext";

// Core pages
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import ExplorePage from "./pages/ExplorePage";
import PreviewHub from "./pages/PreviewHub";
import NotFound from "./pages/NotFound";

// Club pages
import ClubOnboarding from "./pages/club/ClubOnboarding";
import ClubDashboard from "./pages/club/ClubDashboard";
import ClubVerification from "./pages/club/ClubVerification";
import ActivityBuilder from "./pages/club/ActivityBuilder";
import RewardsBuilder from "./pages/club/RewardsBuilder";
import ClaimReview from "./pages/club/ClaimReview";
import ClubAnalytics from "./pages/club/ClubAnalytics";
import ClubSeasons from "./pages/club/ClubSeasons";
import TierManagement from "./pages/club/TierManagement";
import FanNotifications from "./pages/club/FanNotifications";

// Fan pages
import FanHome from "./pages/fan/FanHome";
import FanActivities from "./pages/fan/FanActivities";
import FanRewards from "./pages/fan/FanRewards";
import FanLeaderboardPage from "./pages/fan/FanLeaderboardPage";
import FanProfilePage from "./pages/fan/FanProfilePage";
import JoinClub from "./pages/fan/JoinClub";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PreviewModeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />

            <BrowserRouter>
              <Routes>
                {/* Public */}
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/explore" element={<ExplorePage />} />
                <Route path="/preview" element={<PreviewHub />} />

                {/* ================= CLUB ADMIN ================= */}
                <Route path="/club/onboarding" element={<ClubOnboarding />} />
                <Route path="/club/dashboard" element={<ClubDashboard />} />
                <Route path="/club/verification" element={<ClubVerification />} />
                <Route path="/club/activities" element={<ActivityBuilder />} />
                <Route path="/club/rewards" element={<RewardsBuilder />} />
                <Route path="/club/claims" element={<ClaimReview />} />
                <Route path="/club/analytics" element={<ClubAnalytics />} />
                <Route path="/club/seasons" element={<ClubSeasons />} />
                <Route path="/club/notification" element={<FanNotifications />} />

                {/* ✅ TIER MANAGEMENT — KEEP THIS EXACT PATH */}
                <Route path="/club/tiers" element={<TierManagement />} />

                {/* ================= FAN ================= */}
                <Route path="/fan/home" element={<FanHome />} />
                <Route path="/fan/activities" element={<FanActivities />} />
                <Route path="/fan/rewards" element={<FanRewards />} />
                <Route path="/fan/leaderboard" element={<FanLeaderboardPage />} />
                <Route path="/fan/profile" element={<FanProfilePage />} />
                <Route path="/fan/join" element={<JoinClub />} />

                {/* Catch-all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </PreviewModeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
