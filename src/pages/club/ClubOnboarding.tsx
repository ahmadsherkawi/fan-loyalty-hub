import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/ui/Logo';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, ArrowRight, Building2, CheckCircle, Shield, Loader2 } from 'lucide-react';

type Step = 'club' | 'program' | 'verification';

export default function ClubOnboarding() {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>('club');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Club form state
  const [clubName, setClubName] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [stadiumName, setStadiumName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#1a7a4c');

  // Program form state
  const [programName, setProgramName] = useState('');
  const [programDescription, setProgramDescription] = useState('');
  const [pointsCurrencyName, setPointsCurrencyName] = useState('Points');

  // Verification form state
  const [officialEmailDomain, setOfficialEmailDomain] = useState('');
  const [publicLink, setPublicLink] = useState('');
  const [authorityDeclaration, setAuthorityDeclaration] = useState(false);

  // Created IDs
  const [clubId, setClubId] = useState<string | null>(null);
  const [programId, setProgramId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth?role=club_admin');
    } else if (!loading && profile?.role !== 'club_admin') {
      navigate('/fan/home');
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
      .from('clubs')
      .select('id')
      .eq('admin_id', profile.id)
      .limit(1);

    if (clubs && clubs.length > 0) {
      navigate('/club/dashboard');
    }
  };

  const handleCreateClub = async () => {
    if (!profile) return;
    setIsSubmitting(true);

    try {
      const { data: club, error } = await supabase
        .from('clubs')
        .insert({
          admin_id: profile.id,
          name: clubName,
          country,
          city,
          stadium_name: stadiumName || null,
          primary_color: primaryColor,
        })
        .select()
        .single();

      if (error) throw error;

      setClubId(club.id);
      setStep('program');
      toast({
        title: 'Club Created',
        description: 'Now set up your loyalty program.',
      });
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        title: 'Error',
        description: err.message || 'Failed to create club',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateProgram = async () => {
    if (!clubId) return;
    setIsSubmitting(true);

    try {
      const { data: program, error } = await supabase
        .from('loyalty_programs')
        .insert({
          club_id: clubId,
          name: programName,
          description: programDescription || null,
          points_currency_name: pointsCurrencyName,
        })
        .select()
        .single();

      if (error) throw error;

      setProgramId(program.id);
      setStep('verification');
      toast({
        title: 'Program Created',
        description: 'Now verify your club to publish.',
      });
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        title: 'Error',
        description: err.message || 'Failed to create program',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitVerification = async () => {
    if (!clubId) return;

    // Check if at least 2 of 3 requirements are met
    let count = 0;
    if (officialEmailDomain && !['gmail', 'yahoo', 'outlook', 'hotmail', 'live'].some(d => officialEmailDomain.toLowerCase().includes(d))) {
      count++;
    }
    if (publicLink) count++;
    if (authorityDeclaration) count++;

    if (count < 2) {
      toast({
        title: 'Verification Requirements',
        description: 'Please provide at least 2 of 3 verification requirements.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('club_verifications')
        .insert({
          club_id: clubId,
          official_email_domain: officialEmailDomain || null,
          public_link: publicLink || null,
          authority_declaration: authorityDeclaration,
        });

      if (error) throw error;

      toast({
        title: 'Verification Submitted',
        description: 'Your club is now verified! You can start building activities.',
      });
      navigate('/club/dashboard');
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        title: 'Error',
        description: err.message || 'Failed to submit verification',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipVerification = () => {
    toast({
      title: 'Verification Skipped',
      description: 'You can verify later. Note: Only verified clubs can publish programs.',
    });
    navigate('/club/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container py-4 flex items-center justify-between">
          <Logo />
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="container py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            {(['club', 'program', 'verification'] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    step === s
                      ? 'gradient-stadium text-primary-foreground'
                      : i < ['club', 'program', 'verification'].indexOf(step)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {i < ['club', 'program', 'verification'].indexOf(step) ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    i + 1
                  )}
                </div>
                {i < 2 && (
                  <div
                    className={`w-24 md:w-32 h-1 mx-2 ${
                      i < ['club', 'program', 'verification'].indexOf(step)
                        ? 'bg-primary'
                        : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Club Details */}
          {step === 'club' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Club Details
                </CardTitle>
                <CardDescription>
                  Tell us about your football club
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="clubName">Club Name *</Label>
                  <Input
                    id="clubName"
                    value={clubName}
                    onChange={(e) => setClubName(e.target.value)}
                    placeholder="Manchester United FC"
                    required
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
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Manchester"
                      required
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
                      className="w-12 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      placeholder="#1a7a4c"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleCreateClub}
                  disabled={!clubName || !country || !city || isSubmitting}
                  className="w-full gradient-stadium"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Continue to Program Setup
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Program Setup */}
          {step === 'program' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Loyalty Program
                </CardTitle>
                <CardDescription>
                  Set up your fan loyalty program
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="programName">Program Name *</Label>
                  <Input
                    id="programName"
                    value={programName}
                    onChange={(e) => setProgramName(e.target.value)}
                    placeholder="Red Devils Rewards"
                    required
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
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pointsCurrencyName">Points Currency Name</Label>
                  <Input
                    id="pointsCurrencyName"
                    value={pointsCurrencyName}
                    onChange={(e) => setPointsCurrencyName(e.target.value)}
                    placeholder="Points, Stars, Coins..."
                  />
                  <p className="text-sm text-muted-foreground">
                    Example: "You earned 100 {pointsCurrencyName}!"
                  </p>
                </div>

                <Button
                  onClick={handleCreateProgram}
                  disabled={!programName || isSubmitting}
                  className="w-full gradient-stadium"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Continue to Verification
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Verification */}
          {step === 'verification' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  Club Verification
                </CardTitle>
                <CardDescription>
                  Provide at least 2 of 3 requirements to become verified
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-warning/10 rounded-lg border border-warning/20">
                  <p className="text-sm text-warning-foreground">
                    <strong>Why verify?</strong> Only verified clubs can publish programs, 
                    appear in search, issue QR codes, and allow fans to earn points.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emailDomain">1. Official Email Domain</Label>
                  <Input
                    id="emailDomain"
                    value={officialEmailDomain}
                    onChange={(e) => setOfficialEmailDomain(e.target.value)}
                    placeholder="example.club.com"
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
                  />
                  <p className="text-sm text-muted-foreground">
                    Official website or verified social media page.
                  </p>
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
                      I confirm that I am authorized to represent this football club and 
                      create a loyalty program on their behalf.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    onClick={handleSkipVerification}
                    className="flex-1"
                  >
                    Skip for Now
                  </Button>
                  <Button
                    onClick={handleSubmitVerification}
                    disabled={isSubmitting}
                    className="flex-1 gradient-stadium"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Submit Verification
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
