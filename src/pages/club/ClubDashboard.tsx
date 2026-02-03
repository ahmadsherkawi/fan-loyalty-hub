import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/ui/Logo';
import { 
  LayoutDashboard, 
  Zap, 
  Gift, 
  FileCheck, 
  Users, 
  Trophy,
  LogOut,
  Shield,
  AlertCircle,
  Loader2,
  Plus
} from 'lucide-react';
import { Club, LoyaltyProgram, ClubVerification } from '@/types/database';

interface DashboardStats {
  totalFans: number;
  activeActivities: number;
  activeRewards: number;
  pendingClaims: number;
  totalPointsIssued: number;
}

export default function ClubDashboard() {
  const navigate = useNavigate();
  const { user, profile, signOut, loading } = useAuth();

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

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth?role=club_admin');
    } else if (!loading && profile?.role !== 'club_admin') {
      navigate('/fan/home');
    }
  }, [user, profile, loading, navigate]);

  useEffect(() => {
    if (profile) {
      fetchClubData();
    }
  }, [profile]);

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
      const { count: fansCount } = await supabase
        .from('fan_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('club_id', clubData.id);

      const { count: activitiesCount } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .eq('program_id', programs?.[0]?.id || '')
        .eq('is_active', true);

      const { count: rewardsCount } = await supabase
        .from('rewards')
        .select('*', { count: 'exact', head: true })
        .eq('program_id', programs?.[0]?.id || '')
        .eq('is_active', true);

      const { count: claimsCount } = await supabase
        .from('manual_claims')
        .select('*, activities!inner(program_id)', { count: 'exact', head: true })
        .eq('activities.program_id', programs?.[0]?.id || '')
        .eq('status', 'pending');

      // Calculate total points issued
      const { data: completions } = await supabase
        .from('activity_completions')
        .select('points_earned, activities!inner(program_id)')
        .eq('activities.program_id', programs?.[0]?.id || '');

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

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isVerified = club?.status === 'verified' || club?.status === 'official';

  return (
    <div className="min-h-screen bg-background">
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
                  <span className="text-sm font-bold text-primary-foreground">
                    {club.name.charAt(0)}
                  </span>
                </div>
                <span className="font-semibold text-foreground">{club.name}</span>
                <Badge className={isVerified ? 'badge-verified' : 'badge-unverified'}>
                  {isVerified ? (
                    <>
                      <Shield className="h-3 w-3 mr-1" />
                      Verified
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Unverified
                    </>
                  )}
                </Badge>
              </div>
            )}
          </div>
          <Button variant="ghost" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Unverified Warning */}
      {!isVerified && (
        <div className="bg-warning/10 border-b border-warning/20">
          <div className="container py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-warning">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm font-medium">
                Your club is unverified. Verify to publish and engage fans.
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-warning text-warning hover:bg-warning/10"
              onClick={() => navigate('/club/onboarding')}
            >
              Complete Verification
            </Button>
          </div>
        </div>
      )}

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
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/club/activities')}
              disabled={!program}
            >
              <Zap className="h-4 w-4 mr-2" />
              Activities
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/club/rewards')}
              disabled={!program}
            >
              <Gift className="h-4 w-4 mr-2" />
              Rewards
            </Button>
          </div>
        </div>

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
          <Card className="card-hover cursor-pointer" onClick={() => navigate('/club/activities')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Activity Builder
              </CardTitle>
              <CardDescription>
                Create and manage fan activities with various verification methods
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" disabled={!program}>
                <Plus className="h-4 w-4 mr-2" />
                Create Activity
              </Button>
            </CardContent>
          </Card>

          <Card className="card-hover cursor-pointer" onClick={() => navigate('/club/rewards')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                Rewards Builder
              </CardTitle>
              <CardDescription>
                Set up exclusive rewards for your loyal fans
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" disabled={!program}>
                <Plus className="h-4 w-4 mr-2" />
                Create Reward
              </Button>
            </CardContent>
          </Card>

          <Card 
            className={`card-hover cursor-pointer ${stats.pendingClaims > 0 ? 'border-warning' : ''}`}
            onClick={() => navigate('/club/claims')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className={`h-5 w-5 ${stats.pendingClaims > 0 ? 'text-warning' : 'text-primary'}`} />
                Review Claims
                {stats.pendingClaims > 0 && (
                  <Badge className="badge-unverified ml-2">{stats.pendingClaims}</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Approve or reject manual proof submissions from fans
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" disabled={!program}>
                View Claims
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Program Info */}
        {program && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Program Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
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
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
