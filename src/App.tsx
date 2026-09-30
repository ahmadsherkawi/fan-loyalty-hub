import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { I18nProvider } from "@/i18n/I18nContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Home from "./pages/Home";
import AuthPage from "./pages/AuthPage";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";

const GroupsPage = lazy(() => import("./pages/GroupsPage"));
const GroupPage = lazy(() => import("./pages/GroupPage"));
const PartyPage = lazy(() => import("./pages/PartyPage"));
const VenueScreen = lazy(() => import("./pages/VenueScreen"));
const CheckinPage = lazy(() => import("./pages/CheckinPage"));
const PredictPage = lazy(() => import("./pages/PredictPage"));
const PassportPage = lazy(() => import("./pages/PassportPage"));
const VenuePage = lazy(() => import("./pages/VenuePage"));
const OrganiserPage = lazy(() => import("./pages/OrganiserPage"));
const VenueDashboard = lazy(() => import("./pages/VenueDashboard"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const VenuesPage = lazy(() => import("./pages/VenuesPage"));
const MatchPage = lazy(() => import("./pages/MatchPage"));

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 } } });

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<div className="min-h-screen bg-background" />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/groups" element={<GroupsPage />} />
                <Route path="/g/:slug" element={<GroupPage />} />
                <Route path="/party/:id" element={<PartyPage />} />
                <Route path="/party/:id/screen" element={<VenueScreen />} />
                <Route path="/checkin" element={<CheckinPage />} />
                <Route path="/checkin/:code" element={<CheckinPage />} />
                <Route path="/predict" element={<PredictPage />} />
                <Route path="/passport" element={<PassportPage />} />
                <Route path="/venues" element={<VenuesPage />} />
                <Route path="/venues/:id" element={<VenuePage />} />
                <Route path="/match/:id" element={<MatchPage />} />
                <Route path="/matches" element={<PredictPage />} />
                <Route path="/organiser/:slug" element={<OrganiserPage />} />
                <Route path="/venue-dashboard/:id" element={<VenueDashboard />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
