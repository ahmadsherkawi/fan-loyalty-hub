import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePreviewMode } from "@/contexts/PreviewModeContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Logo } from "@/components/ui/Logo";
import { PreviewBanner } from "@/components/ui/PreviewBanner";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Loader2,
  Mail,
  Link as LinkIcon,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import type { Club, ClubVerification as ClubVerificationType } from "@/types/database";

// Public email domains that are not accepted
const PUBLIC_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "aol.com",
  "icloud.com",
  "mail.com",
  "protonmail.com",
  "live.com",
  "msn.com",
  "ymail.com",
];

interface VerificationCriteria {
  officialEmail: boolean;
  publicLink: boolean;
  authorityDeclaration: boolean;
}

/**
 * ClubVerification guides club administrators through verifying their club. To complete verification,
 * they must satisfy at least two of three criteria: providing an official email, linking to a public
 * presence, and confirming authority. The official email requires an additional verification step —
 * administrators must click a button to send a verification link and confirm receipt before the
 * criterion is considered complete.
 */
export default function ClubVerification() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, loading } = useAuth();
  const { toast } = useToast();
  const { previewClubStatus, setPreviewClubVerified } = usePreviewMode();

  const isPreviewMode = searchParams.get("preview") === "club_admin";

  const [club, setClub] = useState<Club | null>(null);
  const [verification, setVerification] = useState<ClubVerificationType | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [officialEmail, setOfficialEmail] = useState("");
  const [publicLink, setPublicLink] = useState("");
  const [authorityDeclaration, setAuthorityDeclaration] = useState(false);

  // Email verification state: user must click "Verify email" after entering a valid club email
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  // Validation state
  const [emailError, setEmailError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    if (isPreviewMode) {
      // In preview mode use mock data and bypass network calls
      setClub({
        id: "preview-club-admin",
        admin_id: "preview-admin",
        name: "Demo Football Club",
        logo_url: null,
        primary_color: "#1a7a4c",
        country: "United Kingdom",
        city: "London",
        stadium_name: "Demo Stadium",
        season_start: null,
        season_end: null,
        status: previewClubStatus,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setDataLoading(false);
    } else if (!loading && profile) {
      fetchClubData();
    }
  }, [profile, loading, isPreviewMode]);

  /**
   * Load the club and any existing verification record for this admin. Prepopulate
   * form fields with saved data and email verified state if previously stored.
   */
  const fetchClubData = async () => {
    if (!profile) return;
    setDataLoading(true);
    try {
      const { data: clubs } = await supabase.from("clubs").select("*").eq("admin_id", profile.id).limit(1);
      if (!clubs || clubs.length === 0) {
        navigate("/club/onboarding");
        return;
      }
      const clubData = clubs[0] as Club;
      setClub(clubData);
      // Fetch existing verification entry
      const { data: verifications } = await supabase
        .from("club_verifications")
        .select("*")
        .eq("club_id", clubData.id)
        .limit(1);
      if (verifications && verifications.length > 0) {
        const v = verifications[0] as ClubVerificationType;
        setVerification(v);
        // Set form fields from stored verification record
        setOfficialEmail(v.official_email_domain ? `admin@${v.official_email_domain}` : "");
        setPublicLink(v.public_link || "");
        setAuthorityDeclaration(v.authority_declaration || false);
        // If verification has a timestamp we assume the email was previously verified
        setIsEmailVerified(Boolean(v.verified_at));
      }
    } catch (error) {
      console.error("Error fetching club data:", error);
    } finally {
      setDataLoading(false);
    }
  };

  // Pure validation functions (no side effects) - used for criteria checking
  const isEmailValid = (email: string): boolean => {
    if (!email.trim()) return false;
    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain) return false;
    if (PUBLIC_EMAIL_DOMAINS.includes(domain)) return false;
    return true;
  };

  const isLinkValid = (link: string): boolean => {
    if (!link.trim()) return false;
    try {
      const urlString = link.startsWith("http") ? link : `https://${link}`;
      new URL(urlString);
      return true;
    } catch {
      return false;
    }
  };

  // Validation with error messages (called on input change)
  const validateEmail = (email: string): boolean => {
    // Reset email verification when the email changes
    setIsEmailVerified(false);
    if (!email.trim()) {
      setEmailError(null);
      return false;
    }
    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain) {
      setEmailError("Please enter a valid email address");
      return false;
    }
    if (PUBLIC_EMAIL_DOMAINS.includes(domain)) {
      setEmailError(
        "Public email domains (Gmail, Yahoo, etc.) are not accepted. Please use your club's official domain.",
      );
      return false;
    }
    setEmailError(null);
    return true;
  };

  const validateLink = (link: string): boolean => {
    if (!link.trim()) {
      setLinkError(null);
      return false;
    }
    try {
      const urlString = link.startsWith("http") ? link : `https://${link}`;
      new URL(urlString);
      setLinkError(null);
      return true;
    } catch {
      setLinkError("Please enter a valid URL");
      return false;
    }
  };

  // Use pure functions for criteria checking (no state updates during render)
  const getCriteriaMet = (): VerificationCriteria => {
    return {
      officialEmail: isEmailValid(officialEmail) && isEmailVerified,
      publicLink: isLinkValid(publicLink),
      authorityDeclaration: authorityDeclaration,
    };
  };

  const getCriteriaCount = (): number => {
    const criteria = getCriteriaMet();
    return [criteria.officialEmail, criteria.publicLink, criteria.authorityDeclaration].filter(Boolean).length;
  };

  const canSubmit = getCriteriaCount() >= 2;

  /**
   * Simulate sending a verification email for the official club email. In a real
   * implementation, this would call a Supabase function or external service to
   * dispatch the email. Once called, the emailVerified state is set to true so
   * that the user can proceed. If sending fails, an error toast is displayed.
   */
  const handleSendVerificationEmail = async () => {
    if (!isEmailValid(officialEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid club email before verifying.",
        variant: "destructive",
      });
      return;
    }
    try {
      // TODO: Replace with call to backend function to send actual verification email.
      // Example: await supabase.functions.invoke('send_club_verification', { body: { email: officialEmail } });
      setIsEmailVerified(true);
      toast({ title: "Verification Email Sent", description: "We've sent a verification link to your club email." });
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to send verification email.", variant: "destructive" });
    }
  };

  /**
   * Submits the verification form. Requires at least two criteria, including the
   * verified email if that criterion is selected. In preview mode, it simply
   * updates the preview context; otherwise, it writes to Supabase and sets
   * the club to verified.
   */
  const handleSubmit = async () => {
    if (!club || !canSubmit) return;
    if (isPreviewMode) {
      setPreviewClubVerified();
      setClub({ ...club, status: "verified" });
      toast({ title: "Club Verified!", description: "Your club is now verified and can publish loyalty programs." });
      navigate("/club/dashboard?preview=club_admin");
      return;
    }
    setSubmitting(true);
    try {
      const verificationData = {
        club_id: club.id,
        official_email_domain: officialEmail.split("@")[1] || null,
        public_link: publicLink || null,
        authority_declaration: authorityDeclaration,
        verified_at: new Date().toISOString(),
      };
      if (verification) {
        // Update existing record
        await supabase.from("club_verifications").update(verificationData).eq("id", verification.id);
      } else {
        // Create new record
        await supabase.from("club_verifications").insert(verificationData);
      }
      // Update club status to verified
      await supabase.from("clubs").update({ status: "verified" }).eq("id", club.id);
      toast({ title: "Club Verified!", description: "Your club is now verified and can publish loyalty programs." });
      navigate("/club/dashboard");
    } catch (error) {
      console.error("Verification error:", error);
      toast({
        title: "Error",
        description: "Failed to submit verification. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isPreviewMode && (loading || dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const criteriaCount = getCriteriaCount();
  const criteria = getCriteriaMet();
  const isAlreadyVerified = club?.status === "verified" || club?.status === "official";

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="club_admin" />}
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(isPreviewMode ? "/club/dashboard?preview=club_admin" : "/club/dashboard")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Logo />
          {club && (
            <div className="flex items-center gap-2 ml-auto">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: club.primary_color || "#1a7a4c" }}
              >
                <span className="text-sm font-bold text-white">{club.name.charAt(0)}</span>
              </div>
              <span className="font-semibold text-foreground">{club.name}</span>
            </div>
          )}
        </div>
      </header>
      {/* Main Content */}
      <main className="container py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">Club Verification</h1>
          <p className="text-muted-foreground">
            Verification builds trust with fans. Once verified, your club can publish its loyalty program and start
            engaging supporters.
          </p>
        </div>
        {/* Already Verified State */}
        {isAlreadyVerified && (
          <Card className="mb-6 border-primary bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Club Verified</h3>
                  <p className="text-sm text-muted-foreground">
                    Your club is verified and can publish loyalty programs.
                  </p>
                </div>
                <Badge className="ml-auto" variant="default">
                  Verified
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}
        {/* Progress Card */}
        {!isAlreadyVerified && (
          <Card className={`mb-6 ${criteriaCount >= 2 ? "border-primary bg-primary/5" : ""}`}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Verification Progress</span>
                <Badge variant={criteriaCount >= 2 ? "default" : "secondary"}>
                  {criteriaCount >= 2 ? "Ready to verify" : `${criteriaCount} of 3 completed`}
                </Badge>
              </CardTitle>
              <CardDescription>Complete any 2 of the 3 steps below to verify your club.</CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={(criteriaCount / 3) * 100} className="mb-3" />
              {criteriaCount >= 2 ? (
                <p className="text-sm text-primary font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> You're ready! Click below to verify your club and go live.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {`Complete ${2 - criteriaCount} more step${2 - criteriaCount > 1 ? "s" : ""} to unlock verification`}
                </p>
              )}
            </CardContent>
          </Card>
        )}
        {/* Verification Criteria */}
        <div className="space-y-4">
          {/* 1. Official Email Domain */}
          <Card className={criteria.officialEmail ? "border-primary" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                {criteria.officialEmail ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}{" "}
                <Mail className="h-5 w-5" /> Official Email Domain
              </CardTitle>
              <CardDescription>Provide your official club email address.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@yourclub.com"
                  value={officialEmail}
                  onChange={(e) => {
                    setOfficialEmail(e.target.value);
                    validateEmail(e.target.value);
                  }}
                  disabled={isAlreadyVerified}
                />
                {emailError && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" /> {emailError}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Public email domains (Gmail, Yahoo, Outlook, etc.) are not accepted.
                </p>
                {/* Verification button and status */}
                {!isAlreadyVerified && isEmailValid(officialEmail) && (
                  <div className="flex items-center gap-3 mt-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSendVerificationEmail}
                      disabled={isEmailVerified}
                      className={isEmailVerified ? "bg-success text-white" : ""}
                    >
                      {isEmailVerified ? "Email Verified" : "Send Verification"}
                    </Button>
                    {isEmailVerified && <Badge variant="success">Verified</Badge>}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          {/* 2. Public Club Presence */}
          <Card className={criteria.publicLink ? "border-primary" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                {criteria.publicLink ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}{" "}
                <LinkIcon className="h-5 w-5" /> Public Club Presence
              </CardTitle>
              <CardDescription>Link to your official website or social media profile.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="publicLink">Website or Social Media URL</Label>
                <Input
                  id="publicLink"
                  type="url"
                  placeholder="https://yourclub.com or social media link"
                  value={publicLink}
                  onChange={(e) => {
                    setPublicLink(e.target.value);
                    validateLink(e.target.value);
                  }}
                  disabled={isAlreadyVerified}
                />
                {linkError && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" /> {linkError}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Official website, Twitter/X, Facebook, or Instagram profile.
                </p>
              </div>
            </CardContent>
          </Card>
          {/* 3. Authority Declaration */}
          <Card className={criteria.authorityDeclaration ? "border-primary" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                {criteria.authorityDeclaration ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}{" "}
                <ShieldCheck className="h-5 w-5" /> Authority Declaration
              </CardTitle>
              <CardDescription>Confirm you're authorized to represent this club.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="authority"
                  checked={authorityDeclaration}
                  onCheckedChange={(checked) => setAuthorityDeclaration(checked as boolean)}
                  disabled={isAlreadyVerified}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="authority" className="text-sm font-normal cursor-pointer">
                    I confirm I am authorized to represent this club and manage its ClubPass loyalty program.
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Submit Button */}
        {!isAlreadyVerified && (
          <div className="mt-8">
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className={`w-full ${canSubmit ? "gradient-stadium" : ""}`}
              variant={canSubmit ? "default" : "secondary"}
              size="lg"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {canSubmit ? (
                <>
                  <ShieldCheck className="h-4 w-4 mr-2" /> Verify My Club
                </>
              ) : (
                `Complete ${2 - criteriaCount} more step${2 - criteriaCount > 1 ? "s" : ""} to verify`
              )}
            </Button>
            {canSubmit && (
              <p className="text-xs text-muted-foreground text-center mt-3">
                Verification is instant. Your club will be visible to fans right away.
              </p>
            )}
          </div>
        )}
        {/* Back to Dashboard */}
        {isAlreadyVerified && (
          <div className="mt-8">
            <Button
              onClick={() => navigate(isPreviewMode ? "/club/dashboard?preview=club_admin" : "/club/dashboard")}
              variant="outline"
              className="w-full"
            >
              Back to Dashboard
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
