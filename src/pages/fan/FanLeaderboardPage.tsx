import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePreviewMode } from '@/contexts/PreviewModeContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { FanLeaderboard } from '@/components/ui/FanLeaderboard';
import { Logo } from '@/components/ui/Logo';
import { PreviewBanner } from '@/components/ui/PreviewBanner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Club, LoyaltyProgram, FanMembership } from '@/types/database';

// Preview leaderboard data
const PREVIEW_LEADERBOARD = [
  { id: 'fan-1', name: 'Alex Thompson', points: 2450, rank: 1 },
  { id: 'fan-2', name: 'Sarah Mitchell', points: 2180, rank: 2 },
  { id: 'fan-3', name: 'James Wilson', points: 1920, rank: 3 },
  { id: 'fan-4', name: 'Emma Roberts', points: 1650, rank: 4 },
  { id: 'preview-fan', name: 'Preview Fan', points: 750, rank: 5, isCurrentUser: true },
  { id: 'fan-6', name: 'David Brown', points: 680, rank: 6 },
  { id: 'fan-7', name: 'Lisa Johnson', points: 520, rank: 7 },
  { id: 'fan-8', name: 'Chris Martinez', points: 410, rank: 8 },
  { id: 'fan-9', name: 'Amy Garcia', points: 350, rank: 9 },
  { id: 'fan-10', name: 'Tom Anderson', points: 280, rank: 10 },
];

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

interface LeaderboardEntry {
  id: string;
  name: string;
  points: number;
  rank: number;
}

export default function FanLeaderboardPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, loading } = useAuth();
  const { previewPointsBalance } = usePreviewMode();
  
  const isPreviewMode = searchParams.get('preview') === 'fan';
  
  const [club, setClub] = useState<Club | null>(null);
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (isPreviewMode) {
      setClub(PREVIEW_CLUB);
      setProgram(PREVIEW_PROGRAM);
      // Update preview fan's points based on context
      const updatedLeaderboard = PREVIEW_LEADERBOARD.map(fan => 
        fan.id === 'preview-fan' 
          ? { ...fan, points: previewPointsBalance } 
          : fan
      ).sort((a, b) => b.points - a.points)
       .map((fan, idx) => ({ ...fan, rank: idx + 1 }));
      setLeaderboard(updatedLeaderboard);
      setDataLoading(false);
    } else {
      if (!loading && !user) navigate('/auth');
      else if (!loading && profile) fetchData();
    }
  }, [user, profile, loading, navigate, isPreviewMode, previewPointsBalance]);

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
      
      // Fetch leaderboard - get all memberships for this club, sorted by points
      const { data: allMemberships } = await supabase
        .from('fan_memberships')
        .select(`
          id,
          fan_id,
          points_balance,
          profiles!fan_memberships_fan_id_fkey(full_name, email)
        `)
        .eq('club_id', m.club_id)
        .order('points_balance', { ascending: false })
        .limit(50);
      
      if (allMemberships) {
        const leaderboardData: LeaderboardEntry[] = allMemberships.map((membership: any, index: number) => ({
          id: membership.fan_id,
          name: membership.profiles?.full_name || membership.profiles?.email?.split('@')[0] || 'Anonymous Fan',
          points: membership.points_balance,
          rank: index + 1,
        }));
        setLeaderboard(leaderboardData);
      }
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
    } finally {
      setDataLoading(false);
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
      </header>

      <main className="container py-8">
        <div className="max-w-2xl mx-auto">
          <FanLeaderboard
            fans={leaderboard}
            currencyName={program?.points_currency_name || 'Points'}
            title={`${club?.name || 'Club'} Leaderboard`}
            showFullList={true}
            currentUserId={isPreviewMode ? 'preview-fan' : profile?.id}
          />
        </div>
      </main>
    </div>
  );
}
