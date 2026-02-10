import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Logo } from "@/components/ui/Logo";
import { useToast } from "@/hooks/use-toast";
import { UserRole } from "@/types/database";
import { Building2, Users, Loader2, CheckCircle2, Sparkles } from "lucide-react";
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
  const { signUp, signIn, user, profile, loading } = useAuth();
  const { toast } = useToast();

  const defaultRole = (searchParams.get("role") as UserRole) || "fan";

  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signup");
  const [showConfirmationMessage, setShowConfirmationMessage] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpName, setSignUpName] = useState("");
  const [signUpRole, setSignUpRole] = useState(defaultRole);

  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  useEffect(() => {
    if (loading) return;
    if (user && profile?.role) {
      navigate(profile.role === "club_admin" ? "/club/dashboard" : "/fan/home", { replace: true });
    }
  }, [loading, user, profile, navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const validation = signUpSchema.safeParse({ email: signUpEmail, password: signUpPassword, fullName: signUpName });
      if (!validation.success) {
        toast({ title: "Validation Error", description: validation.error.errors[0].message, variant: "destructive" });
        return;
      }
      const { error } = await signUp(signUpEmail, signUpPassword, signUpRole, signUpName);
      if (error) {
        toast({ title: "Sign Up Failed", description: error.message, variant: "destructive" });
        return;
      }
      setRegisteredEmail(signUpEmail);
      setShowConfirmationMessage(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const validation = signInSchema.safeParse({ email: signInEmail, password: signInPassword });
      if (!validation.success) {
        toast({ title: "Validation Error", description: validation.error.errors[0].message, variant: "destructive" });
        return;
      }
      const { error } = await signIn(signInEmail, signInPassword);
      if (error) {
        toast({ title: "Sign In Failed", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Welcome back", description: "Signing you in..." });
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (showConfirmationMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative">
        <div className="absolute inset-0 gradient-mesh opacity-30" />
        <Card className="w-full max-w-md text-center relative z-10 rounded-3xl border-border/50 shadow-lg">
          <CardHeader className="pb-4">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="font-display text-2xl">Check your email</CardTitle>
            <CardDescription className="text-base">We sent a verification link to {registeredEmail}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="link"
              onClick={() => {
                setShowConfirmationMessage(false);
                setActiveTab("signin");
                setSignInEmail(registeredEmail);
              }}
            >
              Already verified? Sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative p-4">
      <div className="absolute inset-0 gradient-mesh opacity-30" />

      <Card className="w-full max-w-md relative z-10 rounded-3xl border-border/50 shadow-xl">
        <CardHeader className="text-center pb-2">
          <Logo className="mx-auto mb-6" />
          <CardTitle className="font-display text-2xl tracking-tight">
            {activeTab === "signup" ? "Create your account" : "Welcome back"}
          </CardTitle>
          <CardDescription className="text-base">
            {activeTab === "signup" ? "Join the football loyalty revolution" : "Sign in to continue"}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-2">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2 mb-6 rounded-full h-11">
              <TabsTrigger value="signup" className="rounded-full">Sign Up</TabsTrigger>
              <TabsTrigger value="signin" className="rounded-full">Sign In</TabsTrigger>
            </TabsList>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <RadioGroup
                  value={signUpRole}
                  onValueChange={(v) => setSignUpRole(v as UserRole)}
                  className="grid grid-cols-2 gap-3"
                >
                  <Label className="flex items-center gap-2.5 border border-border/60 rounded-2xl p-4 cursor-pointer hover:border-primary/40 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <RadioGroupItem value="fan" />
                    <Users className="h-4 w-4 text-primary" /> Fan
                  </Label>
                  <Label className="flex items-center gap-2.5 border border-border/60 rounded-2xl p-4 cursor-pointer hover:border-accent/40 transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent/5">
                    <RadioGroupItem value="club_admin" />
                    <Building2 className="h-4 w-4 text-accent" /> Club
                  </Label>
                </RadioGroup>

                <Input placeholder="Full Name" value={signUpName} onChange={(e) => setSignUpName(e.target.value)} className="h-12 rounded-xl" />
                <Input type="email" placeholder="Email" value={signUpEmail} onChange={(e) => setSignUpEmail(e.target.value)} className="h-12 rounded-xl" />
                <Input type="password" placeholder="Password" value={signUpPassword} onChange={(e) => setSignUpPassword(e.target.value)} className="h-12 rounded-xl" />

                <Button type="submit" className="w-full h-12 rounded-xl gradient-stadium font-semibold text-base" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create account
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <Input type="email" placeholder="Email" value={signInEmail} onChange={(e) => setSignInEmail(e.target.value)} className="h-12 rounded-xl" />
                <Input type="password" placeholder="Password" value={signInPassword} onChange={(e) => setSignInPassword(e.target.value)} className="h-12 rounded-xl" />

                <Button type="submit" className="w-full h-12 rounded-xl gradient-stadium font-semibold text-base" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign in
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
