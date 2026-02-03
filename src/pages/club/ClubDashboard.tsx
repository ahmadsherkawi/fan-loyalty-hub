import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePreviewMode } from '@/contexts/PreviewModeContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Logo } from '@/components/ui/Logo';
import { PreviewBanner } from '@/components/ui/PreviewBanner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { 
  Zap, 
  Gift, 
  FileCheck, 
  Users, 
  Trophy,
  LogOut,
  AlertCircle,
  Loader2,
  Plus,
  Sparkles,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { Club, LoyaltyProgram, ClubVerification } from '@/types/database';

interface DashboardStats {
  totalFans: number;
  activeActivities: number;
  activeRewards: number;
  pendingClaims: number;
  totalPointsIssued: number;
}

// Preview data factory - status comes from context
const createPreviewClub = (status: 'unverified' | 'verified' | 'official'): Club => ({
  id: 'preview-club-admin',
  admin_id: 'preview-admin',
  name: 'Demo Football Club',
  logo_url: null,
  primary_color: '#1a7a4c',
  country: 'United Kingdom',
  city: 'London',
  stadium_name: 'Demo Stadium',
  season_start: null,
  season_end: null,
  status,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

export default function ClubDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, signOut, loading } = useAuth();
  const { toast } = useToast();
  const { previewClubStatus } = usePreviewMode();

  const isPreviewMode = searchParams.get('preview') === 'club_admin';

  const [club, setClub] = useState<Club | null>(null);
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [verification, setVerification] = useState<ClubVerification | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalFans: 0,
    activeActivities: 0,
    activeRewards: 0,
    pendingClaims: 0,
    totalPointsIssued: 0,
  });
  const [dataLoading, setDataLoading] = useState(true);
  
  // Create program dialog
  const [isCreateProgramOpen, setIsCreateProgramOpen] = useState(false);
  const [programName, setProgramName] = useState('');
  const [pointsCurrencyName, setPointsCurrencyName] = useState('Points');
  const [isCreatingProgram, setIsCreatingProgram] = useState(false);

  useEffect(() => {
    if (isPreviewMode) {
      setClub(createPreviewClub(previewClubStatus));
      setProgram(null); // Start without a program to show the create flow
      setDataLoading(false);
    } else {
      if (!loading && !user) {
        navigate('/auth?role=club_admin');
      } else if (!loading && profile?.role !== 'club_admin') {
        navigate('/fan/home');
      } else if (!loading && profile) {
        fetchClubData();
      }
    }
  }, [user, profile, loading, navigate, isPreviewMode, previewClubStatus]);

  const fetchClubData = async () => {
    if (!profile) return;
    setDataLoading(true);

    try {
      // Fetch club
      const { data: clubs } = await supabase
        .from('clubs')
        .select('*')
        .eq('admin_id', profile.id)
        .limit(1);

      if (!clubs || clubs.length === 0) {
        navigate('/club/onboarding');
        return;
      }

      const clubData = clubs[0] as Club;
      setClub(clubData);

      // Fetch program
      const { data: programs } = await supabase
        .from('loyalty_programs')
        .select('*')
        .eq('club_id', clubData.id)
        .limit(1);

      if (programs && programs.length > 0) {
        setProgram(programs[0] as LoyaltyProgram);
      }

      // Fetch verification
      const { data: verifications } = await supabase
        .from('club_verifications')
        .select('*')
        .eq('club_id', clubData.id)
        .limit(1);

      if (verifications && verifications.length > 0) {
        setVerification(verifications[0] as ClubVerification);
      }

      // Fetch stats
      const programId = programs?.[0]?.id || '';
      
      const { count: fansCount } = await supabase
        .from('fan_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('club_id', clubData.id);

      const { count: activitiesCount } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .eq('program_id', programId)
        .eq('is_active', true);

      const { count: rewardsCount } = await supabase
        .from('rewards')
        .select('*', { count: 'exact', head: true })
        .eq('program_id', programId)
        .eq('is_active', true);

      const { count: claimsCount } = await supabase
        .from('manual_claims')
        .select('*, activities!inner(program_id)', { count: 'exact', head: true })
        .eq('activities.program_id', programId)
        .eq('status', 'pending');

      // Calculate total points issued
      const { data: completions } = await supabase
        .from('activity_completions')
        .select('points_earned, activities!inner(program_id)')
        .eq('activities.program_id', programId);

      const totalPoints = completions?.reduce((sum, c) => sum + c.points_earned, 0) || 0;

      setStats({
        totalFans: fansCount || 0,
        activeActivities: activitiesCount || 0,
        activeRewards: rewardsCount || 0,
        pendingClaims: claimsCount || 0,
        totalPointsIssued: totalPoints,
      });
    } catch (error) {
      console.error('Error fetching club data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const handleCreateProgram = async () => {
    if (!club) return;
    
    if (isPreviewMode) {
      // Simulate program creation
      setProgram({
        id: 'preview-program',
        club_id: club.id,
        name: programName,
        description: null,
        points_currency_name: pointsCurrencyName,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setIsCreateProgramOpen(false);
      setProgramName('');
      toast({
        title: 'Loyalty Program Created!',
        description: 'You can now create activities and rewards.',
      });
      return;
    }
    
    setIsCreatingProgram(true);
    try {
      const { data, error } = await supabase
        .from('loyalty_programs')
        .insert({
          club_id: club.id,
          name: programName,
          points_currency_name: pointsCurrencyName,
        })
        .select()
        .single();

      if (error) throw error;
      
      setProgram(data as LoyaltyProgram);
      setIsCreateProgramOpen(false);
      setProgramName('');
      toast({
        title: 'Loyalty Program Created!',
        description: 'You can now create activities and rewards.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create program',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingProgram(false);
    }
  };

  const handleSignOut = async () => {
    if (isPreviewMode) {
      navigate('/preview');
    } else {
      await signOut();
      navigate('/');
    }
  };

  if (!isPreviewMode && (loading || dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="club_admin" />}
      
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo />
            {club && (
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: club.primary_color }}
                >
                  <span className="text-sm font-bold text-white">
                    {club.name.charAt(0)}
                  </span>
                </div>
                <span className="font-semibold text-foreground">{club.name}</span>
              </div>
            )}
          </div>
          <Button variant="ghost" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            {isPreviewMode ? 'Exit' : 'Sign Out'}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage your loyalty program
            </p>
          </div>
        </div>

        {/* Verification Status Card */}
        {club && (
          <Card className={`mb-6 ${club.status === 'verified' || club.status === 'official' ? 'border-primary bg-primary/5' : 'border-warning bg-warning/5'}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center ${club.status === 'verified' || club.status === 'official' ? 'bg-primary/20' : 'bg-warning/20'}`}>
                    {club.status === 'verified' || club.status === 'official' ? (
                      <ShieldCheck className="h-6 w-6 text-primary" />
                    ) : (
                      <ShieldAlert className="h-6 w-6 text-warning" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">
                        {club.status === 'verified' || club.status === 'official' ? 'Club Verified' : 'Verification Needed'}
                      </h3>
                      <Badge variant={club.status === 'verified' || club.status === 'official' ? 'default' : 'secondary'}>
                        {club.status === 'official' ? 'Official' : club.status === 'verified' ? 'Verified' : 'Unverified'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground max-w-md">
                      {club.status === 'verified' || club.status === 'official' 
                        ? 'Your loyalty program is live. Fans can now discover and join your club.' 
                        : 'Verify your club to go live and let fans find you.'}
                    </p>
                  </div>
                </div>
                {club.status === 'unverified' && (
                  <Button 
                    onClick={() => navigate(isPreviewMode ? '/club/verification?preview=club_admin' : '/club/verification')}
                    className="gradient-stadium"
                  >
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Verify Now
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Program State */}
        {!program && (
          <Card className="mb-8 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Create Your Loyalty Program
              </CardTitle>
              <CardDescription>
                Set up your loyalty program to start engaging fans with activities and rewards.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={isCreateProgramOpen} onOpenChange={setIsCreateProgramOpen}>
                <DialogTrigger asChild>
                  <Button className="gradient-stadium">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Loyalty Program
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Loyalty Program</DialogTitle>
                    <DialogDescription>
                      Set up your fan loyalty program. You can customize these settings later.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="programName">Program Name *</Label>
                      <Input
                        id="programName"
                        value={programName}
                        onChange={(e) => setProgramName(e.target.value)}
                        placeholder="e.g., Super Fans Rewards"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pointsCurrency">Points Currency Name</Label>
                      <Input
                        id="pointsCurrency"
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
                      disabled={!programName || isCreatingProgram}
                      className="w-full gradient-stadium"
                    >
                      {isCreatingProgram && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Create Program
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Fans</p>
                  <p className="text-2xl font-bold text-foreground">{stats.totalFans}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Activities</p>
                  <p className="text-2xl font-bold text-foreground">{stats.activeActivities}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Gift className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Rewards</p>
                  <p className="text-2xl font-bold text-foreground">{stats.activeRewards}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={stats.pendingClaims > 0 ? 'border-warning' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${stats.pendingClaims > 0 ? 'bg-warning/20' : 'bg-primary/10'}`}>
                  <FileCheck className={`h-5 w-5 ${stats.pendingClaims > 0 ? 'text-warning' : 'text-primary'}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending Claims</p>
                  <p className="text-2xl font-bold text-foreground">{stats.pendingClaims}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Points Issued</p>
                  <p className="text-2xl font-bold text-foreground">{stats.totalPointsIssued.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card 
            className={`card-hover ${!program ? 'opacity-60' : 'cursor-pointer'}`}
            onClick={() => program && navigate(isPreviewMode ? '/club/activities?preview=club_admin' : '/club/activities')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Activities Manager
              </CardTitle>
              <CardDescription>
                Create activities for fans to earn {program?.points_currency_name || 'points'}. 
                Define how fans complete them (QR, GPS, in-app, or manual proof).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!program ? (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Create a loyalty program first
                </p>
              ) : stats.activeActivities === 0 ? (
                <Button className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Activity
                </Button>
              ) : (
                <Button variant="outline" className="w-full">
                  Manage Activities ({stats.activeActivities})
                </Button>
              )}
            </CardContent>
          </Card>

          <Card 
            className={`card-hover ${!program ? 'opacity-60' : 'cursor-pointer'}`}
            onClick={() => program && navigate(isPreviewMode ? '/club/rewards?preview=club_admin' : '/club/rewards')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                Rewards Manager
              </CardTitle>
              <CardDescription>
                Set up rewards fans can redeem with their {program?.points_currency_name || 'points'}. 
                Choose vouchers, manual fulfillment, or code display.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!program ? (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Create a loyalty program first
                </p>
              ) : stats.activeRewards === 0 ? (
                <Button className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Reward
                </Button>
              ) : (
                <Button variant="outline" className="w-full">
                  Manage Rewards ({stats.activeRewards})
                </Button>
              )}
            </CardContent>
          </Card>

          <Card 
            className={`card-hover ${!program ? 'opacity-60' : stats.pendingClaims > 0 ? 'border-warning cursor-pointer' : 'cursor-pointer'}`}
            onClick={() => program && navigate(isPreviewMode ? '/club/claims?preview=club_admin' : '/club/claims')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className={`h-5 w-5 ${stats.pendingClaims > 0 ? 'text-warning' : 'text-primary'}`} />
                Review Claims
                {stats.pendingClaims > 0 && (
                  <Badge variant="destructive" className="ml-2">{stats.pendingClaims}</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Review and approve manual proof submissions from fans for activities.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!program ? (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Create a loyalty program first
                </p>
              ) : stats.pendingClaims === 0 ? (
                <p className="text-sm text-muted-foreground">No pending claims</p>
              ) : (
                <Button variant="outline" className="w-full">
                  Review {stats.pendingClaims} Claims
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Program Info */}
        {program && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between flex-wrap gap-2">
                <span>Program Details</span>
                {club?.status === 'unverified' ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button disabled variant="secondary" size="sm">
                          Go Live
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Verify your club first to publish your loyalty program.</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Badge variant="default" className="bg-primary">
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    Live
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Program Name</p>
                  <p className="font-medium text-foreground">{program.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Points Currency</p>
                  <p className="font-medium text-foreground">{program.points_currency_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={program.is_active ? 'default' : 'secondary'}>
                    {program.is_active ? 'Active' : 'Draft'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fan Discovery</p>
                  {club?.status === 'unverified' ? (
                    <p className="text-sm text-warning flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      Hidden until verified
                    </p>
                  ) : (
                    <p className="text-sm text-primary flex items-center gap-1">
                      <ShieldCheck className="h-4 w-4" />
                      Fans can find you
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
