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
import CheckinPage from "./pages/CheckinPage";
import ProfilePage from "./pages/ProfilePage";
import Placeholder from "./pages/Placeholder";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/groups" element={<Placeholder titleKey="page.groups" />} />
              <Route path="/g/:slug" element={<Placeholder titleKey="page.group" />} />
              <Route path="/party/:id" element={<Placeholder titleKey="page.party" />} />
              <Route path="/checkin" element={<CheckinPage />} />
              <Route path="/checkin/:code" element={<CheckinPage />} />
              <Route path="/predict" element={<Placeholder titleKey="page.predict" />} />
              <Route path="/passport" element={<Placeholder titleKey="page.passport" />} />
              <Route path="/venues/:id" element={<Placeholder titleKey="page.venue" />} />
              <Route path="/organiser/:slug" element={<Placeholder titleKey="page.organiser" />} />
              <Route path="/venue-dashboard/:id" element={<Placeholder titleKey="page.venueDashboard" />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
