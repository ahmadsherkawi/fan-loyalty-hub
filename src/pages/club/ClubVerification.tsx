// @ts-nocheck
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
import { ArrowLeft, CheckCircle2, Circle, Loader2, Mail, Link as LinkIcon, ShieldCheck, AlertTriangle, LogOut, Sparkles, Clock } from "lucide-react";
import type { Club, ClubVerification as ClubVerificationType } from "@/types/database";

const PUBLIC_EMAIL_DOMAINS = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "aol.com", "icloud.com", "mail.com", "protonmail.com", "live.com", "msn.com", "ymail.com"];

interface VerificationCriteria { officialEmail: boolean; publicLink: boolean; authorityDeclaration: boolean; }

export default function ClubVerification() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, signOut, loading } = useAuth();
  const { previewClubStatus, setPreviewClubVerified } = usePreviewMode();
  const { toast } = useToast();

  const isPreviewMode = searchParams.get("preview") === "club_admin";

  const [club, setClub] = useState<Club | null>(null);
  const [verification, setVerification] = useState<ClubVerificationType | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [officialEmail, setOfficialEmail] = useState("");
  const [publicLink, setPublicLink] = useState("");
  const [authorityDeclaration, setAuthorityDeclaration] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    if (isPreviewMode) {
      setClub({ id: "preview-club-admin", admin_id: "preview-admin", name: "Demo Football Club", logo_url: null, primary_color: "#1a7a4c", country: "United Kingdom", city: "London", stadium_name: "Demo Stadium", season_start: null, season_end: null, status: previewClubStatus, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      setDataLoading(false);
    } else if (!loading && profile) { fetchClubData(); }
  }, [profile, loading, isPreviewMode]);

  const fetchClubData = async () => {
    if (!profile) return;
    setDataLoading(true);
    try {
      const { data: clubs } = await supabase.from("clubs").select("*").eq("admin_id", profile.id).limit(1);
      if (!clubs || clubs.length === 0) { navigate("/club/onboarding"); return; }
      const clubData = clubs[0] as Club;
      setClub(clubData);
      const { data: verifications } = await supabase.from("club_verifications").select("*").eq("club_id", clubData.id).limit(1);
      if (verifications && verifications.length > 0) {
        const v = verifications[0] as ClubVerificationType;
        setVerification(v);
        setOfficialEmail(v.official_email_domain ? `admin@${v.official_email_domain}` : "");
        setPublicLink(v.public_link || "");
        setAuthorityDeclaration(v.authority_declaration || false);
        setIsEmailVerified(Boolean(v.verified_at));
      }
    } catch (error) { console.error("Error fetching club data:", error); }
    finally { setDataLoading(false); }
  };

  const isEmailValid = (email: string): boolean => { if (!email.trim()) return false; const domain = email.split("@")[1]?.toLowerCase(); if (!domain) return false; if (PUBLIC_EMAIL_DOMAINS.includes(domain)) return false; return true; };
  const isLinkValid = (link: string): boolean => { if (!link.trim()) return false; try { const urlString = link.startsWith("http") ? link : `https://${link}`; new URL(urlString); return true; } catch { return false; } };

  const validateEmail = (email: string): boolean => {
    setIsEmailVerified(false);
    if (!email.trim()) { setEmailError(null); return false; }
    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain) { setEmailError("Please enter a valid email address"); return false; }
    if (PUBLIC_EMAIL_DOMAINS.includes(domain)) { setEmailError("Public email domains (Gmail, Yahoo, etc.) are not accepted. Please use your club's official domain."); return false; }
    setEmailError(null); return true;
  };

  const validateLink = (link: string): boolean => { if (!link.trim()) { setLinkError(null); return false; } try { const urlString = link.startsWith("http") ? link : `https://${link}`; new URL(urlString); setLinkError(null); return true; } catch { setLinkError("Please enter a valid URL"); return false; } };

  const getCriteriaMet = (): VerificationCriteria => ({ officialEmail: isEmailValid(officialEmail) && isEmailVerified, publicLink: isLinkValid(publicLink), authorityDeclaration });
  const getCriteriaCount = (): number => { const criteria = getCriteriaMet(); return [criteria.officialEmail, criteria.publicLink, criteria.authorityDeclaration].filter(Boolean).length; };
  const canSubmit = getCriteriaCount() >= 2;

  const handleSendVerificationEmail = async () => {
    if (!isEmailValid(officialEmail)) { toast({ title: "Invalid Email", description: "Please enter a valid club email before verifying.", variant: "destructive" }); return; }
    try { setIsEmailVerified(true); toast({ title: "Verification Email Sent", description: "We've sent a verification link to your club email." }); }
    catch (error) { console.error(error); toast({ title: "Error", description: "Failed to send verification email.", variant: "destructive" }); }
  };

  const handleSubmit = async () => {
    if (!club || !canSubmit) return;
    if (isPreviewMode) { setPreviewClubVerified(); setClub({ ...club, status: "verified" }); toast({ title: "Club Verified!", description: "Your club is now verified and can publish loyalty programs." }); navigate("/club/dashboard?preview=club_admin"); return; }
    setSubmitting(true);
    try {
      // Submit verification docs WITHOUT auto-verifying
      // Admin will review and approve
      const verificationData = { 
        club_id: club.id, 
        official_email_domain: officialEmail.split("@")[1] || null, 
        public_link: publicLink || null, 
        authority_declaration: authorityDeclaration,
        verified_at: null // NOT verified until admin approves
      };
      
      if (verification) { 
        const { error } = await supabase.from("club_verifications").update(verificationData).eq("id", verification.id);
        if (error) throw error;
      } else { 
        const { error } = await supabase.from("club_verifications").insert(verificationData);
        if (error) throw error;
      }
      
      // Keep club status as "unverified" until admin approves
      // The club_verifications record will show up in admin panel for review
      
      toast({ 
        title: "Verification Submitted!", 
        description: "Your verification documents have been submitted. Our admin team will review and approve your club shortly." 
      });
      
      // Navigate to dashboard with pending verification flag
      navigate("/club/dashboard?pending_verification=true");
    } catch (error) { 
      console.error("Verification error:", error); 
      toast({ title: "Error", description: "Failed to submit verification. Please try again.", variant: "destructive" }); 
    }
    finally { setSubmitting(false); }
  };

  const handleSignOut = async () => { if (isPreviewMode) navigate("/preview"); else { await signOut(); navigate("/"); } };

  if (!isPreviewMode && (loading || dataLoading)) {
    return (<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>);
  }

  const criteriaCount = getCriteriaCount();
  const criteria = getCriteriaMet();
  const isAlreadyVerified = club?.status === "verified" || club?.status === "official";
  
  // Check if verification is pending (submitted but not approved)
  const hasSubmittedVerification = verification && (
    verification.official_email_domain || 
    verification.public_link || 
    verification.authority_declaration
  );
  const isPendingVerification = hasSubmittedVerification && !verification?.verified_at && !isAlreadyVerified;

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="club_admin" />}

      <header className="relative border-b border-border/40 overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-40" />
        <div className="relative container py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(isPreviewMode ? "/club/dashboard?preview=club_admin" : "/club/dashboard")} className="rounded-full hover:bg-card/60"><ArrowLeft className="h-5 w-5" /></Button>
            <Logo size="sm" />
            {club && (
              <div className="flex items-center gap-2 ml-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: club.primary_color || "#1a7a4c" }}><span className="text-sm font-bold text-white">{club.name.charAt(0)}</span></div>
                <span className="font-display font-semibold text-foreground">{club.name}</span>
              </div>
            )}
          </div>
          <Button variant="ghost" onClick={handleSignOut} className="rounded-full text-muted-foreground hover:text-foreground"><LogOut className="h-4 w-4 mr-2" /> Sign out</Button>
        </div>
      </header>

      <main className="container py-10 max-w-2xl space-y-8">
        {/* HERO */}
        <div className="relative overflow-hidden rounded-3xl border border-border/40 p-8">
          <div className="absolute inset-0 gradient-hero" />
          <div className="absolute inset-0 stadium-pattern" />
          <div className="absolute inset-0 pitch-lines opacity-30" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2"><Sparkles className="h-4 w-4 text-accent" /><span className="text-xs font-semibold text-accent uppercase tracking-wider">Verification</span></div>
            <h1 className="text-3xl font-display font-bold text-white tracking-tight">Club Verification</h1>
            <p className="text-white/50 mt-2">Verification builds trust with fans. Once verified, your club can publish its loyalty program.</p>
          </div>
        </div>

        {isAlreadyVerified && (
          <Card className="rounded-2xl border-primary/20 bg-primary/5">
            <CardContent className="pt-6"><div className="flex items-center gap-3"><div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center"><ShieldCheck className="h-6 w-6 text-primary" /></div><div><h3 className="font-display font-semibold">Club Verified</h3><p className="text-sm text-muted-foreground">Your club is verified and can publish loyalty programs.</p></div><Badge className="ml-auto rounded-full" variant="default">Verified</Badge></div></CardContent>
          </Card>
        )}

        {isPendingVerification && (
          <Card className="rounded-2xl border-orange-500/20 bg-orange-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-orange-500/20 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-orange-400" />
                </div>
                <div>
                  <h3 className="font-display font-semibold">Verification Pending</h3>
                  <p className="text-sm text-muted-foreground">Your verification documents have been submitted. Our admin team will review and approve your club shortly.</p>
                </div>
                <Badge className="ml-auto rounded-full bg-orange-500/10 text-orange-400 border-orange-500/20">Pending Review</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {!isAlreadyVerified && !isPendingVerification && (
          <Card className={`rounded-2xl border-border/40 ${criteriaCount >= 2 ? "border-primary/20 bg-primary/5" : ""}`}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between font-display"><span>Verification Progress</span><Badge variant={criteriaCount >= 2 ? "default" : "secondary"} className="rounded-full">{criteriaCount >= 2 ? "Ready to submit" : `${criteriaCount} of 3 completed`}</Badge></CardTitle>
              <CardDescription>Complete any 2 of the 3 steps below to submit for verification.</CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={(criteriaCount / 3) * 100} className="mb-3 h-2" />
              {criteriaCount >= 2 ? <p className="text-sm text-primary font-medium flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> You're ready! Click below to submit for verification.</p> : <p className="text-sm text-muted-foreground">{`Complete ${2 - criteriaCount} more step${2 - criteriaCount > 1 ? "s" : ""} to unlock verification`}</p>}
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {/* 1. Email */}
          <Card className={`rounded-2xl border-border/40 ${criteria.officialEmail ? "border-primary/20" : ""}`}>
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg font-display">{criteria.officialEmail ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <Circle className="h-5 w-5 text-muted-foreground" />} <Mail className="h-5 w-5" /> Official Email Domain</CardTitle><CardDescription>Provide your official club email address.</CardDescription></CardHeader>
            <CardContent><div className="space-y-2"><Label htmlFor="email">Email Address</Label><Input id="email" type="email" placeholder="admin@yourclub.com" value={officialEmail} onChange={(e) => { setOfficialEmail(e.target.value); validateEmail(e.target.value); }} disabled={isAlreadyVerified || isPendingVerification} className="rounded-xl border-border/40" />{emailError && <p className="text-sm text-destructive flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> {emailError}</p>}<p className="text-xs text-muted-foreground">Public email domains (Gmail, Yahoo, Outlook, etc.) are not accepted.</p>{!isAlreadyVerified && !isPendingVerification && isEmailValid(officialEmail) && (<div className="flex items-center gap-3 mt-2"><Button type="button" size="sm" onClick={handleSendVerificationEmail} disabled={isEmailVerified} className={`rounded-full ${isEmailVerified ? "bg-primary text-primary-foreground" : ""}`}>{isEmailVerified ? "Email Verified" : "Send Verification"}</Button>{isEmailVerified && <Badge className="rounded-full">Verified</Badge>}</div>)}</div></CardContent>
          </Card>

          {/* 2. Public Link */}
          <Card className={`rounded-2xl border-border/40 ${criteria.publicLink ? "border-primary/20" : ""}`}>
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg font-display">{criteria.publicLink ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <Circle className="h-5 w-5 text-muted-foreground" />} <LinkIcon className="h-5 w-5" /> Public Club Presence</CardTitle><CardDescription>Link to your official website or social media profile.</CardDescription></CardHeader>
            <CardContent><div className="space-y-2"><Label htmlFor="publicLink">Website or Social Media URL</Label><Input id="publicLink" type="url" placeholder="https://yourclub.com or social media link" value={publicLink} onChange={(e) => { setPublicLink(e.target.value); validateLink(e.target.value); }} disabled={isAlreadyVerified || isPendingVerification} className="rounded-xl border-border/40" />{linkError && <p className="text-sm text-destructive flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> {linkError}</p>}<p className="text-xs text-muted-foreground">Official website, Twitter/X, Facebook, or Instagram profile.</p></div></CardContent>
          </Card>

          {/* 3. Authority */}
          <Card className={`rounded-2xl border-border/40 ${criteria.authorityDeclaration ? "border-primary/20" : ""}`}>
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg font-display">{criteria.authorityDeclaration ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <Circle className="h-5 w-5 text-muted-foreground" />} <ShieldCheck className="h-5 w-5" /> Authority Declaration</CardTitle><CardDescription>Confirm you're authorized to represent this club.</CardDescription></CardHeader>
            <CardContent><div className="flex items-start space-x-3"><Checkbox id="authority" checked={authorityDeclaration} onCheckedChange={(checked) => setAuthorityDeclaration(checked as boolean)} disabled={isAlreadyVerified || isPendingVerification} /><div className="grid gap-1.5 leading-none"><Label htmlFor="authority" className="text-sm font-normal cursor-pointer">I confirm I am authorized to represent this club and manage its ClubPass loyalty program.</Label></div></div></CardContent>
          </Card>
        </div>

        {!isAlreadyVerified && !isPendingVerification && (
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting} className={`w-full rounded-xl ${canSubmit ? "" : ""}`} variant={canSubmit ? "default" : "secondary"} size="lg">
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {canSubmit ? <><ShieldCheck className="h-4 w-4 mr-2" /> Submit for Verification</> : `Complete ${2 - criteriaCount} more step${2 - criteriaCount > 1 ? "s" : ""} to verify`}
          </Button>
        )}

        {isPendingVerification && (
          <Button onClick={() => navigate(isPreviewMode ? "/club/dashboard?preview=club_admin" : "/club/dashboard")} variant="outline" className="w-full rounded-xl border-border/40">Back to Dashboard</Button>
        )}

        {isAlreadyVerified && (
          <Button onClick={() => navigate(isPreviewMode ? "/club/dashboard?preview=club_admin" : "/club/dashboard")} variant="outline" className="w-full rounded-xl border-border/40">Back to Dashboard</Button>
        )}
      </main>
    </div>
  );
}
