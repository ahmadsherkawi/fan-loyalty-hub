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
import { Building2, Users, Loader2, ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import { z } from "zod";

const { user, profile, loading } = useAuth();
const navigate = useNavigate();

useEffect(() => {
  if (loading) return;
  if (!user || !profile) return;

  if (profile.role === "fan") {
    navigate("/fan/home", { replace: true });
  } else if (profile.role === "club_admin") {
    navigate("/club/dashboard", { replace: true });
  }
}, [user, profile, loading, navigate]);

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

  /**
   * ROLE-BASED REDIRECT (DO NOT BLOCK RENDERING ON PROFILE)
   */
  useEffect(() => {
    if (!loading && user && profile?.role) {
      navigate(profile.role === "club_admin" ? "/club/dashboard" : "/fan/home", { replace: true });
    }
  }, [loading, user, profile, navigate]);

  /**
   * SIGN UP
   */
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const validation = signUpSchema.safeParse({
        email: signUpEmail,
        password: signUpPassword,
        fullName: signUpName,
      });

      if (!validation.success) {
        toast({
          title: "Validation Error",
          description: validation.error.errors[0].message,
          variant: "destructive",
        });
        return;
      }

      const { error } = await signUp(signUpEmail, signUpPassword, signUpRole, signUpName);

      if (error) {
        toast({
          title: "Sign Up Failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      setRegisteredEmail(signUpEmail);
      setShowConfirmationMessage(true);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * SIGN IN
   */
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const validation = signInSchema.safeParse({
        email: signInEmail,
        password: signInPassword,
      });

      if (!validation.success) {
        toast({
          title: "Validation Error",
          description: validation.error.errors[0].message,
          variant: "destructive",
        });
        return;
      }

      const { error } = await signIn(signInEmail, signInPassword);

      if (error) {
        toast({
          title: "Sign In Failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Welcome back",
        description: "Signing you in...",
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * GLOBAL LOADING STATE
   */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  /**
   * EMAIL CONFIRMATION SCREEN
   */
  if (showConfirmationMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
            <CardTitle>Check your email</CardTitle>
            <CardDescription>We sent a verification link to {registeredEmail}</CardDescription>
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

  /**
   * AUTH UI
   */
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Logo className="mx-auto h-10 w-auto mb-4" />
          <CardTitle>{activeTab === "signup" ? "Create account" : "Welcome back"}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
              <TabsTrigger value="signin">Sign In</TabsTrigger>
            </TabsList>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <RadioGroup
                  value={signUpRole}
                  onValueChange={(v) => setSignUpRole(v as UserRole)}
                  className="grid grid-cols-2 gap-2"
                >
                  <Label
                    htmlFor="role-fan"
                    className="flex items-center gap-2 border rounded-md p-3 cursor-pointer has-[:checked]:border-primary"
                  >
                    <RadioGroupItem value="fan" id="role-fan" />
                    <Users className="h-4 w-4" /> Fan
                  </Label>
                  <Label
                    htmlFor="role-club"
                    className="flex items-center gap-2 border rounded-md p-3 cursor-pointer has-[:checked]:border-primary"
                  >
                    <RadioGroupItem value="club_admin" id="role-club" />
                    <Building2 className="h-4 w-4" /> Club
                  </Label>
                </RadioGroup>

                <Input placeholder="Full Name" value={signUpName} onChange={(e) => setSignUpName(e.target.value)} />
                <Input
                  type="email"
                  placeholder="Email"
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                />
                <Input
                  type="password"
                  placeholder="Password"
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                />

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create account
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <Input
                  type="email"
                  placeholder="Email"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                />
                <Input
                  type="password"
                  placeholder="Password"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
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
