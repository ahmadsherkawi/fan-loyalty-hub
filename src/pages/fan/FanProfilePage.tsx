import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePreviewMode } from '@/contexts/PreviewModeContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Logo } from '@/components/ui/Logo';
import { PreviewBanner } from '@/components/ui/PreviewBanner';
import { BadgeDisplay, computeFanBadges, BadgeDefinition } from '@/components/ui/BadgeDisplay';
import { 
  ArrowLeft, 
  Loader2, 
  Trophy,
  Zap,
  Gift,
  Calendar,
  Clock,
  CheckCircle2,
  MapPin,
  QrCode,
  FileText,
  Gamepad2
} from 'lucide-react';
import { 
  Club, 
  LoyaltyProgram, 
  FanMembership, 
  Activity,
  ActivityCompletion,
  RewardRedemption,
  RedemptionMethod
} from '@/types/database';

// Extended types
interface CompletionWithActivity extends ActivityCompletion {
  activities?: {
    name: string;
    verification_method: string;
    points_awarded: number;
  };
}

interface RedemptionWithReward extends RewardRedemption {
  rewards?: {
    name: string;
    redemption_method: RedemptionMethod;
  };
}

// Preview data
const PREVIEW_CLUB: Club = {
  id: 'preview-club-1',
  admin_id: 'preview-admin',
  name: 'Manchester United FC',
  logo_url: null,
  primary_color: '#DA291C',
  country: 'United Kingdom',
  city: 'Manchester',
  stadium_name: 'Old Trafford',
  season_start: null,
  season_end: null,
  status: 'verified',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const PREVIEW_PROGRAM: LoyaltyProgram = {
  id: 'preview-program-1',
  club_id: 'preview-club-1',
  name: 'Red Devils Rewards',
  description: null,
  points_currency_name: 'Red Points',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const PREVIEW_COMPLETIONS: CompletionWithActivity[] = [
  {
    id: 'comp-1',
    activity_id: 'act-1',
    fan_id: 'preview-fan',
    membership_id: 'preview-membership-1',
    points_earned: 100,
    completed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: null,
    activities: {
      name: 'Attend Home Match',
      verification_method: 'location_checkin',
      points_awarded: 100,
    },
  },
  {
    id: 'comp-2',
    activity_id: 'act-2',
    fan_id: 'preview-fan',
    membership_id: 'preview-membership-1',
    points_earned: 50,
    completed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: null,
    activities: {
      name: 'Scan Match Day QR',
      verification_method: 'qr_scan',
      points_awarded: 50,
    },
  },
  {
    id: 'comp-3',
    activity_id: 'act-3',
    fan_id: 'preview-fan',
    membership_id: 'preview-membership-1',
    points_earned: 25,
    completed_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: null,
    activities: {
      name: 'Match Day Quiz',
      verification_method: 'in_app_completion',
      points_awarded: 25,
    },
  },
];

const PREVIEW_REDEMPTIONS: RedemptionWithReward[] = [
  {
    id: 'red-1',
    reward_id: 'reward-1',
    fan_id: 'preview-fan',
    membership_id: 'preview-membership-1',
    points_spent: 200,
    redemption_code: 'MUFC10OFF',
    redeemed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    fulfilled_at: null,
    rewards: {
      name: '10% Shop Discount',
      redemption_method: 'voucher',
    },
  },
];

const verificationIcons: Record<string, React.ReactNode> = {
  qr_scan: <QrCode className="h-4 w-4" />,
  location_checkin: <MapPin className="h-4 w-4" />,
  in_app_completion: <Gamepad2 className="h-4 w-4" />,
  manual_proof: <FileText className="h-4 w-4" />,
};

export default function FanProfilePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, loading } = useAuth();
  const { previewPointsBalance, completedPreviewActivities } = usePreviewMode();
  
  const isPreviewMode = searchParams.get('preview') === 'fan';
  
  const [club, setClub] = useState<Club | null>(null);
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [membership, setMembership] = useState<FanMembership | null>(null);
  const [completions, setCompletions] = useState<CompletionWithActivity[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionWithReward[]>([]);
  const [badges, setBadges] = useState<BadgeDefinition[]>([]);
  const [totalPointsEarned, setTotalPointsEarned] = useState(0);
  const [leaderboardRank, setLeaderboardRank] = useState<number | undefined>(undefined);
  const [dataLoading, setDataLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('badges');

  useEffect(() => {
    if (isPreviewMode) {
      loadPreviewData();
    } else {
      if (!loading && !user) navigate('/auth');
      else if (!loading && profile) fetchData();
    }
  }, [user, profile, loading, navigate, isPreviewMode, previewPointsBalance, completedPreviewActivities]);

  const loadPreviewData = () => {
    setClub(PREVIEW_CLUB);
    setProgram(PREVIEW_PROGRAM);
    setMembership({
      id: 'preview-membership-1',
      fan_id: 'preview-fan',
      club_id: 'preview-club-1',
      program_id: 'preview-program-1',
      points_balance: previewPointsBalance,
      joined_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    });
    
    // Use preview completions plus any from context
    const baseCompletions = [...PREVIEW_COMPLETIONS];
    setCompletions(baseCompletions);
    setRedemptions(PREVIEW_REDEMPTIONS);
    
    // Calculate stats for badges
    const totalEarned = baseCompletions.reduce((sum, c) => sum + c.points_earned, 0) + previewPointsBalance;
    setTotalPointsEarned(totalEarned);
    setLeaderboardRank(5); // Preview rank
    
    const fanBadges = computeFanBadges({
      totalPoints: totalEarned,
      activitiesCompleted: baseCompletions.length + completedPreviewActivities.length,
      rewardsRedeemed: PREVIEW_REDEMPTIONS.length,
      memberSinceDays: 45,
      leaderboardRank: 5,
    });
    setBadges(fanBadges);
    setDataLoading(false);
  };

  const fetchData = async () => {
    if (!profile) return;
    setDataLoading(true);
    
    try {
      // Fetch membership
      const { data: memberships } = await supabase
        .from('fan_memberships')
        .select('*')
        .eq('fan_id', profile.id)
        .limit(1);
      
      if (!memberships || memberships.length === 0) { 
        navigate('/fan/join'); 
        return; 
      }
      
      const m = memberships[0] as FanMembership;
      setMembership(m);
      
      // Fetch club
      const { data: clubs } = await supabase
        .from('clubs')
        .select('*')
        .eq('id', m.club_id)
        .limit(1);
      if (clubs) setClub(clubs[0] as Club);
      
      // Fetch program
      const { data: programs } = await supabase
        .from('loyalty_programs')
        .select('*')
        .eq('id', m.program_id)
        .limit(1);
      if (programs) setProgram(programs[0] as LoyaltyProgram);
      
      // Fetch activity completions
      const { data: completionsData } = await supabase
        .from('activity_completions')
        .select(`
          *,
          activities (
            name,
            verification_method,
            points_awarded
          )
        `)
        .eq('fan_id', profile.id)
        .order('completed_at', { ascending: false })
        .limit(50);
      
      setCompletions((completionsData || []) as CompletionWithActivity[]);
      
      // Fetch redemptions
      const { data: redemptionsData } = await supabase
        .from('reward_redemptions')
        .select(`
          *,
          rewards (
            name,
            redemption_method
          )
        `)
        .eq('fan_id', profile.id)
        .order('redeemed_at', { ascending: false })
        .limit(50);
      
      setRedemptions((redemptionsData || []) as RedemptionWithReward[]);
      
      // Calculate total points earned
      const totalEarned = (completionsData || []).reduce(
        (sum: number, c: any) => sum + c.points_earned, 0
      );
      setTotalPointsEarned(totalEarned);
      
      // Get leaderboard rank
      const { data: allMemberships } = await supabase
        .from('fan_memberships')
        .select('fan_id, points_balance')
        .eq('club_id', m.club_id)
        .order('points_balance', { ascending: false });
      
      if (allMemberships) {
        const rank = allMemberships.findIndex(mem => mem.fan_id === profile.id) + 1;
        setLeaderboardRank(rank > 0 ? rank : undefined);
      }
      
      // Calculate days as member
      const memberSince = new Date(m.joined_at);
      const daysMember = Math.floor((Date.now() - memberSince.getTime()) / (1000 * 60 * 60 * 24));
      
      // Compute badges
      const fanBadges = computeFanBadges({
        totalPoints: totalEarned,
        activitiesCompleted: (completionsData || []).length,
        rewardsRedeemed: (redemptionsData || []).length,
        memberSinceDays: daysMember,
        leaderboardRank: leaderboardRank,
      });
      setBadges(fanBadges);
      
    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (!isPreviewMode && (loading || dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const earnedBadgesCount = badges.filter(b => b.earned).length;
  const displayName = isPreviewMode ? 'Preview Fan' : (profile?.full_name || profile?.email?.split('@')[0] || 'Fan');

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="fan" />}
      
      {/* Header */}
      <header 
        className="border-b"
        style={{ backgroundColor: club?.primary_color || 'hsl(var(--primary))' }}
      >
        <div className="container py-4 flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate(isPreviewMode ? '/fan/home?preview=fan' : '/fan/home')}
            className="text-primary-foreground hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Logo />
        </div>
        
        {/* Profile Header */}
        <div className="container py-8">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20 border-4 border-white/30">
              <AvatarFallback className="text-2xl font-bold bg-white/20 text-primary-foreground">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-display font-bold text-primary-foreground">
                {displayName}
              </h1>
              <p className="text-primary-foreground/80">{club?.name}</p>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <Badge variant="secondary" className="bg-white/20 text-primary-foreground border-0">
                  <Trophy className="h-3 w-3 mr-1" />
                  {membership?.points_balance || 0} {program?.points_currency_name}
                </Badge>
                {leaderboardRank && (
                  <Badge variant="secondary" className="bg-white/20 text-primary-foreground border-0">
                    Rank #{leaderboardRank}
                  </Badge>
                )}
                <Badge variant="secondary" className="bg-white/20 text-primary-foreground border-0">
                  🏅 {earnedBadgesCount} badges
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <Trophy className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">{totalPointsEarned}</p>
              <p className="text-xs text-muted-foreground">Total Earned</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Zap className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">{completions.length}</p>
              <p className="text-xs text-muted-foreground">Activities</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Gift className="h-8 w-8 text-accent mx-auto mb-2" />
              <p className="text-2xl font-bold">{redemptions.length}</p>
              <p className="text-xs text-muted-foreground">Rewards</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-2xl font-bold">
                {membership ? Math.floor((Date.now() - new Date(membership.joined_at).getTime()) / (1000 * 60 * 60 * 24)) : 0}
              </p>
              <p className="text-xs text-muted-foreground">Days Member</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="badges" className="gap-2">
              🏅 Badges
            </TabsTrigger>
            <TabsTrigger value="activities" className="gap-2">
              <Zap className="h-4 w-4" />
              Activities
            </TabsTrigger>
            <TabsTrigger value="rewards" className="gap-2">
              <Gift className="h-4 w-4" />
              Rewards
            </TabsTrigger>
          </TabsList>

          {/* Badges Tab */}
          <TabsContent value="badges">
            <BadgeDisplay 
              badges={badges} 
              title="All Badges" 
              showAll={true}
            />
          </TabsContent>

          {/* Activity History Tab */}
          <TabsContent value="activities">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Activity History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {completions.length === 0 ? (
                  <div className="text-center py-8">
                    <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      No activities completed yet. Start earning points!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {completions.map(completion => (
                      <div 
                        key={completion.id}
                        className="flex items-center gap-4 p-4 rounded-lg bg-muted/30"
                      >
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          {verificationIcons[completion.activities?.verification_method || 'manual_proof']}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {completion.activities?.name || 'Activity'}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDate(completion.completed_at)} at {formatTime(completion.completed_at)}
                          </div>
                        </div>
                        <Badge className="bg-primary/10 text-primary border-0">
                          +{completion.points_earned} {program?.points_currency_name}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Redemption History Tab */}
          <TabsContent value="rewards">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-accent" />
                  Redemption History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {redemptions.length === 0 ? (
                  <div className="text-center py-8">
                    <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      No rewards redeemed yet. Check out available rewards!
                    </p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => navigate(isPreviewMode ? '/fan/rewards?preview=fan' : '/fan/rewards')}
                    >
                      View Rewards
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {redemptions.map(redemption => (
                      <div 
                        key={redemption.id}
                        className="flex items-center gap-4 p-4 rounded-lg bg-muted/30"
                      >
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                          redemption.fulfilled_at ? 'bg-green-500/10' : 'bg-accent/10'
                        }`}>
                          {redemption.fulfilled_at ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <Gift className="h-5 w-5 text-accent" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {redemption.rewards?.name || 'Reward'}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDate(redemption.redeemed_at)}
                            {redemption.fulfilled_at && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0">
                                Fulfilled
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Badge variant="secondary">
                          -{redemption.points_spent} {program?.points_currency_name}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
