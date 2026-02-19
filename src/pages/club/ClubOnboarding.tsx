import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/ui/Logo";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Building2, CheckCircle, Shield, Loader2, Upload, X, LogOut, Sparkles, AlertCircle } from "lucide-react";

type Step = "club" | "program" | "verification";

interface ExistingClub {
  id: string;
  status: string;
  name: string;
  country: string | null;
  city: string | null;
  primary_color: string | null;
  logo_url: string | null;
}

export default function ClubOnboarding() {
  const navigate = useNavigate();
  const { user, profile, signOut, loading } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("club");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Club form state
  const [clubName, setClubName] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [stadiumName, setStadiumName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#1a7a4c");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Program form state
  const [programName, setProgramName] = useState("");
  const [programDescription, setProgramDescription] = useState("");
  const [pointsCurrencyName, setPointsCurrencyName] = useState("Points");

  // Verification form state
  const [officialEmailDomain, setOfficialEmailDomain] = useState("");
  const [publicLink, setPublicLink] = useState("");
  const [authorityDeclaration, setAuthorityDeclaration] = useState(false);

  // Created IDs
  const [clubId, setClubId] = useState<string | null>(null);
  const [programId, setProgramId] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return; // Wait for loading to complete
    
    if (!user) {
      // No user, redirect to auth
      navigate("/auth?role=club_admin", { replace: true });
    } else if (!profile) {
      // User exists but profile is missing - wait a bit for profile to load
      console.log("[ClubOnboarding] Waiting for profile to load...");
    } else if (profile.role !== "club_admin") {
      // User is not a club admin, redirect to fan home
      navigate("/fan/home", { replace: true });
    }
  }, [user, profile, loading, navigate]);

  // Check if user already has a club
  useEffect(() => {
    if (profile) {
      checkExistingClub();
    }
  }, [profile]);

  const checkExistingClub = async () => {
    if (!profile) return;

    const { data: clubs } = await supabase
      .from("clubs")
      .select("id, status, name, country, city, primary_color, logo_url")
      .eq("admin_id", profile.id)
      .limit(1);

    if (clubs && clubs.length > 0) {
      const club = clubs[0];

      // Check if loyalty program exists
      const { data: programs } = await supabase
        .from("loyalty_programs")
        .select("id")
        .eq("club_id", club.id)
        .limit(1);

      if (programs && programs.length > 0) {
        // Both club and program exist, redirect to dashboard
        navigate("/club/dashboard", { replace: true });
      } else {
        // Club exists but no program - start from program step
        // This happens when a club claimed a community
        setClubId(club.id);
        setClubName(club.name);
        setCountry(club.country || "");
        setCity(club.city || "");
        setPrimaryColor(club.primary_color || "#1a7a4c");
        if (club.logo_url) {
          setLogoPreview(club.logo_url);
        }
        setStep("program");

        toast({
          title: "Complete Your Setup",
          description: "Your club is ready! Now set up your loyalty program.",
        });
      }
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file (PNG, JPG, etc.)",
          variant: "destructive",
        });
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Logo must be less than 2MB",
          variant: "destructive",
        });
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadLogo = async (clubId: string): Promise<string | null> => {
    if (!logoFile) return null;

    setIsUploadingLogo(true);
    try {
      const fileExt = logoFile.name.split(".").pop();
      const fileName = `${clubId}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("club-logos")
        .upload(fileName, logoFile, { upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("club-logos").getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error("Logo upload error:", error);
      return null;
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleCreateClub = async () => {
    if (!profile) {
      toast({
        title: "Profile Not Loaded",
        description: "Please wait for your profile to load before creating a club.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);

    try {
      // Create club with UNVERIFIED status - admin must approve
      const { data: club, error } = await supabase
        .from("clubs")
        .insert({
          admin_id: profile.id,
          name: clubName,
          country,
          city,
          stadium_name: stadiumName || null,
          primary_color: primaryColor,
          status: "unverified", // Always start as unverified
        })
        .select()
        .single();

      if (error) throw error;

      // Upload logo if provided
      if (logoFile) {
        const logoUrl = await uploadLogo(club.id);
        if (logoUrl) {
          await supabase.from("clubs").update({ logo_url: logoUrl }).eq("id", club.id);
        }
      }

      setClubId(club.id);
      setStep("program");
      toast({
        title: "Club Created",
        description: "Now set up your loyalty program.",
      });
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        title: "Error",
        description: err.message || "Failed to create club",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateProgram = async () => {
    if (!clubId) return;
    setIsSubmitting(true);

    try {
      // Create program but keep it INACTIVE until club is verified
      const { data: program, error } = await supabase
        .from("loyalty_programs")
        .insert({
          club_id: clubId,
          name: programName,
          description: programDescription || null,
          points_currency_name: pointsCurrencyName,
          is_active: false, // Program starts inactive until verification
        })
        .select()
        .single();

      if (error) throw error;

      setProgramId(program.id);
      setStep("verification");
      toast({
        title: "Program Created",
        description: "Now submit verification to activate your club and program.",
      });
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        title: "Error",
        description: err.message || "Failed to create program",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitVerification = async () => {
    if (!clubId) {
      console.error("No clubId found");
      toast({
        title: "Error",
        description: "Club not found. Please try again.",
        variant: "destructive",
      });
      return;
    }

    // Check if at least 2 of 3 requirements are met
    let count = 0;
    if (
      officialEmailDomain &&
      !["gmail", "yahoo", "outlook", "hotmail", "live"].some((d) => officialEmailDomain.toLowerCase().includes(d))
    ) {
      count++;
    }
    if (publicLink) count++;
    if (authorityDeclaration) count++;

    console.log("Verification criteria count:", count);

    if (count < 2) {
      toast({
        title: "Verification Requirements",
        description: "Please provide at least 2 of 3 verification requirements.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("Submitting verification for club:", clubId);
      
      // Submit verification request (WITHOUT verified_at - admin must approve)
      const { data, error } = await supabase.from("club_verifications").insert({
        club_id: clubId,
        official_email_domain: officialEmailDomain || null,
        public_link: publicLink || null,
        authority_declaration: authorityDeclaration,
        verified_at: null, // NOT verified until admin approves
      }).select();

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      console.log("Verification submitted successfully:", data);

      // Do NOT change club status - it stays "unverified" until admin approves
      
      toast({
        title: "Verification Submitted!",
        description: "Your verification request has been submitted. An admin will review it shortly. You can view your dashboard while waiting.",
      });
      
      // Redirect to dashboard with pending verification flag
      navigate("/club/dashboard?pending_verification=true");
    } catch (error: unknown) {
      console.error("Verification submission error:", error);
      const err = error as Error;
      toast({
        title: "Error",
        description: err.message || "Failed to submit verification",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipVerification = () => {
    toast({
      title: "Verification Required",
      description: "Your club needs verification before you can create activities and rewards. You can submit verification later from your dashboard.",
      variant: "default",
    });
    navigate("/club/dashboard?needs_verification=true");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (loading || (user && !profile)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">
          {loading ? "Loading..." : "Loading your profile..."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="relative border-b border-border/40 overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-40" />
        <div className="relative container py-5 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate("/")} className="rounded-full hover:bg-card/60"><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
            <Button variant="ghost" onClick={handleSignOut} className="rounded-full text-muted-foreground hover:text-foreground"><LogOut className="h-4 w-4 mr-2" /> Sign out</Button>
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="container py-10">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            {(["club", "program", "verification"] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center font-display font-bold transition-all ${
                    step === s
                      ? "bg-primary text-primary-foreground shadow-stadium"
                      : i < ["club", "program", "verification"].indexOf(step)
                        ? "bg-primary/20 text-primary"
                        : "bg-muted/50 text-muted-foreground border border-border/40"
                  }`}
                >
                  {i < ["club", "program", "verification"].indexOf(step) ? <CheckCircle className="h-5 w-5" /> : i + 1}
                </div>
                {i < 2 && (
                  <div
                    className={`w-16 md:w-24 h-0.5 mx-2 rounded-full ${
                      i < ["club", "program", "verification"].indexOf(step) ? "bg-primary" : "bg-border/40"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Club Details */}
          {step === "club" && (
            <Card className="rounded-3xl border-border/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display">
                  <Building2 className="h-5 w-5 text-primary" />
                  Club Details
                </CardTitle>
                <CardDescription>Tell us about your football club</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Club Logo Upload */}
                <div className="space-y-2">
                  <Label>Club Logo</Label>
                  <div className="flex items-center gap-4">
                    {logoPreview ? (
                      <div className="relative">
                        <img
                          src={logoPreview}
                          alt="Club logo preview"
                          className="w-20 h-20 rounded-2xl object-cover border border-border/40"
                        />
                        <button
                          type="button"
                          onClick={removeLogo}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/90"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div
                        className="w-20 h-20 rounded-2xl border-2 border-dashed border-border/40 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full rounded-xl border-border/40"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {logoFile ? "Change Logo" : "Upload Logo"}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1">PNG or JPG, max 2MB</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clubName">Club Name *</Label>
                  <Input
                    id="clubName"
                    value={clubName}
                    onChange={(e) => setClubName(e.target.value)}
                    placeholder="Manchester United FC"
                    className="rounded-xl border-border/40"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="country">Country *</Label>
                    <Input
                      id="country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="United Kingdom"
                      className="rounded-xl border-border/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Manchester"
                      className="rounded-xl border-border/40"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stadiumName">Stadium Name</Label>
                  <Input
                    id="stadiumName"
                    value={stadiumName}
                    onChange={(e) => setStadiumName(e.target.value)}
                    placeholder="Old Trafford"
                    className="rounded-xl border-border/40"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      id="primaryColor"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-12 h-10 rounded-xl border border-border/40 cursor-pointer"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      placeholder="#1a7a4c"
                      className="rounded-xl border-border/40"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleCreateClub}
                  disabled={!clubName || !country || !city || isSubmitting || isUploadingLogo || !profile}
                  className="w-full rounded-xl"
                >
                  {isSubmitting || isUploadingLogo ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {isUploadingLogo ? "Uploading Logo..." : "Continue to Program Setup"}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Program Setup */}
          {step === "program" && (
            <Card className="rounded-3xl border-border/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display">
                  <Shield className="h-5 w-5 text-primary" />
                  Loyalty Program
                </CardTitle>
                <CardDescription>Set up your fan loyalty program</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    <strong>Note:</strong> Your program will be inactive until an admin verifies your club.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="programName">Program Name *</Label>
                  <Input
                    id="programName"
                    value={programName}
                    onChange={(e) => setProgramName(e.target.value)}
                    placeholder="Red Devils Rewards"
                    className="rounded-xl border-border/40"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="programDescription">Description</Label>
                  <Textarea
                    id="programDescription"
                    value={programDescription}
                    onChange={(e) => setProgramDescription(e.target.value)}
                    placeholder="Earn points by supporting your team!"
                    rows={3}
                    className="rounded-xl border-border/40"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pointsCurrencyName">Points Currency Name</Label>
                  <Input
                    id="pointsCurrencyName"
                    value={pointsCurrencyName}
                    onChange={(e) => setPointsCurrencyName(e.target.value)}
                    placeholder="Points, Stars, Coins..."
                    className="rounded-xl border-border/40"
                  />
                  <p className="text-sm text-muted-foreground">Example: "You earned 100 {pointsCurrencyName}!"</p>
                </div>

                <Button
                  onClick={handleCreateProgram}
                  disabled={!programName || isSubmitting}
                  className="w-full rounded-xl"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Continue to Verification
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Verification */}
          {step === "verification" && (
            <Card className="rounded-3xl border-border/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  Club Verification
                </CardTitle>
                <CardDescription>Submit verification for admin approval</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Admin Approval Required</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        After you submit, a system admin will review your verification. Your club will be active once approved.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-accent/5 rounded-2xl border border-accent/20">
                  <p className="text-sm text-muted-foreground">
                    <strong>Why verify?</strong> Only verified clubs can publish programs, appear in search, issue QR codes, and allow fans to earn points.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emailDomain">1. Official Email Domain</Label>
                  <Input
                    id="emailDomain"
                    value={officialEmailDomain}
                    onChange={(e) => setOfficialEmailDomain(e.target.value)}
                    placeholder="example.club.com"
                    className="rounded-xl border-border/40"
                  />
                  <p className="text-sm text-muted-foreground">
                    No Gmail, Yahoo, Outlook, etc. Use your club's official domain.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="publicLink">2. Public Link</Label>
                  <Input
                    id="publicLink"
                    value={publicLink}
                    onChange={(e) => setPublicLink(e.target.value)}
                    placeholder="https://www.yourclub.com"
                    className="rounded-xl border-border/40"
                  />
                  <p className="text-sm text-muted-foreground">Official website or verified social media page.</p>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="authorityDeclaration"
                    checked={authorityDeclaration}
                    onCheckedChange={(checked) => setAuthorityDeclaration(checked as boolean)}
                  />
                  <div>
                    <Label htmlFor="authorityDeclaration" className="font-medium">
                      3. Authority Declaration
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      I confirm that I am authorized to represent this football club and create a loyalty program on
                      their behalf.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button variant="outline" onClick={handleSkipVerification} className="flex-1 rounded-xl border-border/40">
                    Skip for Now
                  </Button>
                  <Button
                    onClick={handleSubmitVerification}
                    disabled={isSubmitting}
                    className="flex-1 rounded-xl"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Submit for Approval
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
