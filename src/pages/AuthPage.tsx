import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Logo } from "@/components/ui/Logo";
import { useToast } from "@/hooks/use-toast";
import { UserRole } from "@/types/database";
import { Building2, Users, Loader2, CheckCircle2, Sparkles, Mail, ArrowLeft, AlertCircle } from "lucide-react";
import { z } from "zod";

const signUpSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(2, "Please enter your full name"),
});

const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Please enter your password"),
});

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signUp, signIn, user, profile, loading, profileError } = useAuth();
  const { toast } = useToast();

  const defaultRole = (searchParams.get("role") as UserRole) || "fan";

  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signup");
  const [showConfirmationMessage, setShowConfirmationMessage] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpName, setSignUpName] = useState("");
  const [signUpRole, setSignUpRole] = useState(defaultRole);

  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  // Handle navigation after successful authentication
  useEffect(() => {
    if (loading) return;

    if (user && profile?.role) {
      console.log("[AuthPage] User authenticated with role:", profile.role);
      setIsRedirecting(true);
      
      // Navigate to appropriate page based on role
      let redirectPath: string;
      if (profile.role === "club_admin") {
        redirectPath = "/club/onboarding";
      } else if (profile.role === "system_admin" || profile.role === "admin") {
        redirectPath = "/admin";
      } else {
        // Fan - check if onboarding completed
        // Note: onboarding_completed may not exist if migration not run
        // Default to onboarding if undefined/false
        const onboardingDone = (profile as { onboarding_completed?: boolean })?.onboarding_completed;
        redirectPath = onboardingDone ? "/fan/home" : "/fan/onboarding";
      }
      
      // Small delay to ensure state updates are processed
      setTimeout(() => {
        navigate(redirectPath, { replace: true });
      }, 100);
    } else if (user && !profile && !profileError) {
      // User exists but profile is being loaded
      console.log("[AuthPage] User authenticated, waiting for profile...");
    } else if (user && profileError) {
      // Profile loading failed
      console.error("[AuthPage] Profile error:", profileError);
      setIsRedirecting(false);
    }
  }, [loading, user, profile, profileError, navigate]);

  // Show error toast if profile loading fails
  useEffect(() => {
    if (profileError && user) {
      toast({
        title: "Profile Loading Issue",
        description: profileError,
        variant: "destructive",
      });
    }
  }, [profileError, user, toast]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const validation = signUpSchema.safeParse({ email: signUpEmail, password: signUpPassword, fullName: signUpName });
      if (!validation.success) {
        toast({ title: "Validation Error", description: validation.error.errors[0].message, variant: "destructive" });
        setIsLoading(false);
        return;
      }
      
      const { error, data } = await signUp(signUpEmail, signUpPassword, signUpRole, signUpName);
      
      if (error) {
        // Check if it's an email already registered error
        if (error.message.includes("already registered") || error.message.includes("already exists")) {
          toast({ 
            title: "Email Already Registered", 
            description: "This email is already in use. Please sign in instead.", 
            variant: "destructive" 
          });
          setActiveTab("signin");
          setSignInEmail(signUpEmail);
        } else {
          toast({ title: "Sign Up Failed", description: error.message, variant: "destructive" });
        }
        return;
      }

      // Check if email confirmation is required
      const session = data?.session;
      const needsConfirmation = !session;

      if (!needsConfirmation) {
        // Auto-signed in (Supabase has email confirmation disabled)
        toast({
          title: "Account Created!",
          description: `Welcome! Setting up your ${signUpRole === "club_admin" ? "club" : "fan"} account...`
        });
        // Navigation happens via useEffect
      } else {
        // Email confirmation is enabled in Supabase
        setRegisteredEmail(signUpEmail);
        setNeedsEmailConfirmation(true);
        setShowConfirmationMessage(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setIsRedirecting(false);
    
    try {
      const validation = signInSchema.safeParse({ email: signInEmail, password: signInPassword });
      if (!validation.success) {
        toast({ title: "Validation Error", description: validation.error.errors[0].message, variant: "destructive" });
        return;
      }
      
      const { error } = await signIn(signInEmail, signInPassword);
      
      if (error) {
        // Provide more specific error messages
        if (error.message.includes("Invalid login credentials")) {
          toast({ 
            title: "Sign In Failed", 
            description: "Invalid email or password. Please check your credentials.", 
            variant: "destructive" 
          });
        } else if (error.message.includes("Email not confirmed")) {
          toast({ 
            title: "Email Not Verified", 
            description: "Please check your email and click the verification link.", 
            variant: "destructive" 
          });
        } else {
          toast({ title: "Sign In Failed", description: error.message, variant: "destructive" });
        }
        return;
      }
      
      toast({ title: "Welcome back!", description: "Signing you in..." });
      // Navigation happens via useEffect
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while checking auth or redirecting
  if (loading || isRedirecting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">
          {isRedirecting ? "Redirecting..." : "Loading..."}
        </p>
      </div>
    );
  }

  // Show profile error state
  if (profileError && user && !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <Card className="rounded-2xl border-border/40">
            <CardContent className="pt-6 text-center">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-destructive/20 flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">Profile Loading Issue</h2>
              <p className="text-muted-foreground mt-2 mb-4">
                {profileError}
              </p>
              <div className="space-y-3">
                <Button
                  onClick={async () => {
                    // Try to refresh the session
                    const { data } = await signUp(signInEmail || "", "", "fan", "");
                    window.location.reload();
                  }}
                  className="w-full rounded-xl"
                >
                  Retry
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    const { supabase } = await import("@/integrations/supabase/client");
                    await supabase.auth.signOut();
                    window.location.reload();
                  }}
                  className="w-full rounded-xl"
                >
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (showConfirmationMessage && needsEmailConfirmation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-8">
          <div className="relative overflow-hidden rounded-3xl border border-border/40">
            <div className="absolute inset-0 gradient-hero" />
            <div className="absolute inset-0 stadium-pattern" />
            <div className="absolute inset-0 pitch-lines opacity-30" />

            <div className="relative z-10 p-8 md:p-10 text-center">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-6 shadow-stadium">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <h2 className="font-display text-2xl font-bold text-white">Verify your email</h2>
              <p className="text-white/50 mt-2">
                We sent a verification link to <span className="text-white font-medium">{registeredEmail}</span>
              </p>
              <p className="text-white/40 text-sm mt-4">
                Click the link in the email to activate your account. Check your spam folder if you don't see it.
              </p>

              <Button
                variant="outline"
                className="mt-6 rounded-full text-white border-white/20 hover:bg-white/10"
                onClick={() => {
                  setShowConfirmationMessage(false);
                  setActiveTab("signin");
                  setSignInEmail(registeredEmail);
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sign In
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* HERO CARD */}
        <div className="relative overflow-hidden rounded-3xl border border-border/40">
          <div className="absolute inset-0 gradient-hero" />
          <div className="absolute inset-0 stadium-pattern" />
          <div className="absolute inset-0 pitch-lines opacity-30" />

          <div className="relative z-10 p-8 text-center">
            <Logo className="mx-auto mb-4" />
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-xs font-semibold text-accent uppercase tracking-wider">Welcome</span>
            </div>
            <h1 className="font-display text-2xl font-bold text-white tracking-tight">
              {activeTab === "signup" ? "Create your account" : "Welcome back"}
            </h1>
            <p className="text-white/50 mt-1">
              {activeTab === "signup" ? "Join the football loyalty revolution" : "Sign in to continue"}
            </p>
          </div>
        </div>

        {/* AUTH FORM */}
        <Card className="rounded-2xl border-border/40">
          <CardContent className="pt-6">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "signin" | "signup")}>
              <TabsList className="grid w-full grid-cols-2 mb-6 rounded-full h-11 bg-muted/30 border border-border/40">
                <TabsTrigger value="signup" className="rounded-full font-semibold">Sign Up</TabsTrigger>
                <TabsTrigger value="signin" className="rounded-full font-semibold">Sign In</TabsTrigger>
              </TabsList>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <RadioGroup
                    value={signUpRole}
                    onValueChange={(v) => setSignUpRole(v as UserRole)}
                    className="grid grid-cols-2 gap-3"
                  >
                    <Label className="flex items-center gap-2.5 border border-border/40 rounded-2xl p-4 cursor-pointer hover:border-primary/40 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                      <RadioGroupItem value="fan" />
                      <Users className="h-4 w-4 text-primary" /> Fan
                    </Label>
                    <Label className="flex items-center gap-2.5 border border-border/40 rounded-2xl p-4 cursor-pointer hover:border-accent/40 transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent/5">
                      <RadioGroupItem value="club_admin" />
                      <Building2 className="h-4 w-4 text-accent" /> Club
                    </Label>
                  </RadioGroup>

                  <Input placeholder="Full Name" value={signUpName} onChange={(e) => setSignUpName(e.target.value)} className="h-12 rounded-xl bg-muted/10 border-border/40" />
                  <Input type="email" placeholder="Email" value={signUpEmail} onChange={(e) => setSignUpEmail(e.target.value)} className="h-12 rounded-xl bg-muted/10 border-border/40" />
                  <Input type="password" placeholder="Password (min 8 characters)" value={signUpPassword} onChange={(e) => setSignUpPassword(e.target.value)} className="h-12 rounded-xl bg-muted/10 border-border/40" />

                  <Button type="submit" className="w-full h-12 rounded-xl gradient-stadium font-semibold text-base shadow-stadium" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create account
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <Input type="email" placeholder="Email" value={signInEmail} onChange={(e) => setSignInEmail(e.target.value)} className="h-12 rounded-xl bg-muted/10 border-border/40" />
                  <Input type="password" placeholder="Password" value={signInPassword} onChange={(e) => setSignInPassword(e.target.value)} className="h-12 rounded-xl bg-muted/10 border-border/40" />

                  <Button type="submit" className="w-full h-12 rounded-xl gradient-stadium font-semibold text-base shadow-stadium" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign in
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Helper component for RadioGroup labels
function Label({ className, children, ...props }: { className?: string; children: React.ReactNode; [key: string]: unknown }) {
  return (
    <label className={className} {...props}>
      {children}
    </label>
  );
}
