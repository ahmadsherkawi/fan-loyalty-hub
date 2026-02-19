import { Navbar } from '@/components/landing/Navbar';
import { Hero } from '@/components/landing/Hero';
import { Features } from '@/components/landing/Features';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { CTA } from '@/components/landing/CTA';
import { Footer } from '@/components/landing/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { user, profile, loading, profileError } = useAuth();
  const navigate = useNavigate();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Don't do anything while loading
    if (loading) return;

    // Only redirect if we have both user and profile with a role
    if (user && profile?.role) {
      setIsRedirecting(true);
      
      // Small delay to ensure smooth transition
      const redirectTimer = setTimeout(() => {
        // Redirect authenticated users to their dashboard
        if (profile.role === 'club_admin') {
          navigate('/club/onboarding', { replace: true });
        } else if (profile.role === 'system_admin' || profile.role === 'admin') {
          navigate('/admin', { replace: true });
        } else if (profile.role === 'fan') {
          // Check if fan has completed onboarding
          // Note: onboarding_completed may not exist if migration not run
          const onboardingDone = (profile as { onboarding_completed?: boolean })?.onboarding_completed;
          if (onboardingDone) {
            navigate('/fan/home', { replace: true });
          } else {
            navigate('/fan/onboarding', { replace: true });
          }
        } else {
          navigate('/fan/home', { replace: true });
        }
      }, 100);

      return () => clearTimeout(redirectTimer);
    }
    
    // If there's a profile error but user exists, don't redirect
    // Let the auth page handle the error
    if (user && profileError && !profile) {
      console.log('[Index] Profile error, redirecting to auth');
      navigate('/auth', { replace: true });
    }
  }, [user, profile, loading, profileError, navigate]);

  // Show loading while checking auth or redirecting
  if (loading || isRedirecting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">
          {isRedirecting ? "Redirecting to dashboard..." : "Loading..."}
        </p>
      </div>
    );
  }

  // If user is authenticated but profile is missing, show loading
  // (This shouldn't happen often, but handles edge cases)
  if (user && !profile && !profileError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading your profile...</p>
      </div>
    );
  }

  // Show landing page for unauthenticated users
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-16">
        <Hero />
        <Features />
        <HowItWorks />
        <CTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
