import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/ui/Logo';
import { PreviewBanner } from '@/components/ui/PreviewBanner';
import { Trophy, Zap, Gift, LogOut, Loader2, ChevronRight } from 'lucide-react';
import { Club, LoyaltyProgram, FanMembership, Activity, Reward } from '@/types/database';

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
  description: 'Earn points by supporting United!',
  points_currency_name: 'Red Points',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const PREVIEW_MEMBERSHIP: FanMembership = {
  id: 'preview-membership-1',
  fan_id: 'preview-fan',
  club_id: 'preview-club-1',
  program_id: 'preview-program-1',
  points_balance: 0,
  joined_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const PREVIEW_ACTIVITIES: Activity[] = [
  {
    id: 'preview-activity-1',
    program_id: 'preview-program-1',
    name: 'Attend Home Match',
    description: 'Check in at Old Trafford during a home game',
    points_awarded: 100,
    frequency: 'once_per_match',
    verification_method: 'location_checkin',
    qr_code_data: null,
    location_lat: 53.4631,
    location_lng: -2.2913,
    location_radius_meters: 500,
    time_window_start: null,
    time_window_end: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'preview-activity-2',
    program_id: 'preview-program-1',
    name: 'Scan Match Day QR',
    description: 'Find and scan the QR code at the stadium entrance',
    points_awarded: 50,
    frequency: 'once_per_day',
    verification_method: 'qr_scan',
    qr_code_data: 'preview-qr-data',
    location_lat: null,
    location_lng: null,
    location_radius_meters: 100,
    time_window_start: null,
    time_window_end: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const PREVIEW_REWARDS: Reward[] = [
  {
    id: 'preview-reward-1',
    program_id: 'preview-program-1',
    name: 'Signed Team Photo',
    description: 'A photo signed by the first team squad',
    points_cost: 500,
    quantity_limit: 100,
    quantity_redeemed: 23,
    redemption_method: 'manual_fulfillment',
    voucher_code: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'preview-reward-2',
    program_id: 'preview-program-1',
    name: '10% Shop Discount',
    description: 'Get 10% off at the official club shop',
    points_cost: 200,
    quantity_limit: null,
    quantity_redeemed: 0,
    redemption_method: 'voucher',
    voucher_code: 'REDDEVILS10',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export default function FanHome() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, signOut, loading } = useAuth();
  
  const isPreviewMode = searchParams.get('preview') === 'fan';
  
  const [membership, setMembership] = useState<FanMembership | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (isPreviewMode) {
      // Load preview data
      setClub(PREVIEW_CLUB);
      setProgram(PREVIEW_PROGRAM);
      setMembership(PREVIEW_MEMBERSHIP);
      setActivities(PREVIEW_ACTIVITIES);
      setRewards(PREVIEW_REWARDS);
      setDataLoading(false);
    } else {
      if (!loading && !user) navigate('/auth');
      else if (!loading && profile?.role === 'club_admin') navigate('/club/dashboard');
      else if (!loading && profile) fetchData();
    }
  }, [user, profile, loading, navigate, isPreviewMode]);

  const fetchData = async () => {
    if (!profile) return;
    setDataLoading(true);
    
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
    
    // Fetch activities (limited)
    const { data: acts } = await supabase
      .from('activities')
      .select('*')
      .eq('program_id', m.program_id)
      .eq('is_active', true)
      .limit(3);
    setActivities((acts || []) as Activity[]);
    
    // Fetch rewards (limited)
    const { data: rews } = await supabase
      .from('rewards')
      .select('*')
      .eq('program_id', m.program_id)
      .eq('is_active', true)
      .limit(3);
    setRewards((rews || []) as Reward[]);
    
    setDataLoading(false);
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

  const verificationLabels: Record<string, string> = {
    qr_scan: 'Scan QR',
    location_checkin: 'Check in',
    in_app_completion: 'Complete',
    manual_proof: 'Submit proof',
  };

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="fan" />}
      
      {/* Header with Club Branding */}
      <header 
        className="border-b"
        style={{ backgroundColor: club?.primary_color || 'hsl(var(--primary))' }}
      >
        <div className="container py-4 flex items-center justify-between">
          <Logo />
          <Button 
            variant="ghost" 
            onClick={handleSignOut} 
            className="text-primary-foreground hover:bg-white/10"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {isPreviewMode ? 'Exit' : 'Sign Out'}
          </Button>
        </div>
        
        {/* Points Banner */}
        <div className="container py-8 text-center">
          <h1 className="text-3xl font-display font-bold text-primary-foreground">
            {club?.name}
          </h1>
          <p className="text-primary-foreground/80">{program?.name}</p>
          <div className="mt-6 inline-flex items-center gap-2 bg-background/20 backdrop-blur rounded-full px-6 py-3">
            <Trophy className="h-6 w-6 text-accent" />
            <span className="text-3xl font-bold text-primary-foreground">
              {membership?.points_balance || 0}
            </span>
            <span className="text-primary-foreground/80">
              {program?.points_currency_name || 'Points'}
            </span>
          </div>
          {membership?.points_balance === 0 && (
            <p className="text-primary-foreground/60 text-sm mt-2">
              Complete activities to earn your first points!
            </p>
          )}
        </div>
      </header>

      <main className="container py-8 space-y-8">
        {/* Activities Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Activities
            </h2>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate(isPreviewMode ? '/fan/activities?preview=fan' : '/fan/activities')}
            >
              View All <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          
          {activities.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Activities Yet</h3>
                <p className="text-muted-foreground">
                  No activities available yet. Check back soon.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activities.map(activity => (
                <Card key={activity.id} className="card-hover">
                  <CardContent className="py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Zap className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{activity.name}</h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            +{activity.points_awarded} {program?.points_currency_name}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {verificationLabels[activity.verification_method]}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-primary/10 text-primary border-0">
                      Available
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Rewards Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Gift className="h-5 w-5 text-accent" />
              Rewards
            </h2>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate(isPreviewMode ? '/fan/rewards?preview=fan' : '/fan/rewards')}
            >
              View All <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          
          {rewards.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Rewards Yet</h3>
                <p className="text-muted-foreground">
                  No rewards available yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              {rewards.map(reward => {
                const canAfford = (membership?.points_balance || 0) >= reward.points_cost;
                return (
                  <Card key={reward.id} className="card-hover">
                    <CardContent className="pt-6">
                      <div className="h-12 w-12 rounded-lg gradient-golden flex items-center justify-center mb-4">
                        <Gift className="h-6 w-6 text-accent-foreground" />
                      </div>
                      <h3 className="font-semibold mb-1">{reward.name}</h3>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {reward.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-primary">
                          {reward.points_cost} {program?.points_currency_name}
                        </span>
                        <Button 
                          size="sm" 
                          disabled={!canAfford}
                          variant={canAfford ? 'default' : 'outline'}
                        >
                          Redeem
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
