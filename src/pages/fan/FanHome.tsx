import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/ui/Logo';
import { Trophy, Zap, Gift, LogOut, Loader2 } from 'lucide-react';
import { Club, LoyaltyProgram, FanMembership } from '@/types/database';

export default function FanHome() {
  const navigate = useNavigate();
  const { user, profile, signOut, loading } = useAuth();
  const [membership, setMembership] = useState<FanMembership | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
    else if (!loading && profile?.role === 'club_admin') navigate('/club/dashboard');
  }, [user, profile, loading, navigate]);

  useEffect(() => {
    if (profile) fetchData();
  }, [profile]);

  const fetchData = async () => {
    if (!profile) return;
    setDataLoading(true);
    const { data: memberships } = await supabase.from('fan_memberships').select('*').eq('fan_id', profile.id).limit(1);
    if (!memberships || memberships.length === 0) { navigate('/fan/join'); return; }
    const m = memberships[0] as FanMembership;
    setMembership(m);
    const { data: clubs } = await supabase.from('clubs').select('*').eq('id', m.club_id).limit(1);
    if (clubs) setClub(clubs[0] as Club);
    const { data: programs } = await supabase.from('loyalty_programs').select('*').eq('id', m.program_id).limit(1);
    if (programs) setProgram(programs[0] as LoyaltyProgram);
    setDataLoading(false);
  };

  if (loading || dataLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b" style={{ backgroundColor: club?.primary_color || 'hsl(var(--primary))' }}>
        <div className="container py-4 flex items-center justify-between">
          <Logo />
          <Button variant="ghost" onClick={() => { signOut(); navigate('/'); }} className="text-primary-foreground"><LogOut className="h-4 w-4 mr-2" />Sign Out</Button>
        </div>
        <div className="container py-8 text-center">
          <h1 className="text-3xl font-display font-bold text-primary-foreground">{club?.name}</h1>
          <p className="text-primary-foreground/80">{program?.name}</p>
          <div className="mt-6 inline-flex items-center gap-2 bg-background/20 backdrop-blur rounded-full px-6 py-3">
            <Trophy className="h-6 w-6 text-accent" />
            <span className="text-3xl font-bold text-primary-foreground">{membership?.points_balance || 0}</span>
            <span className="text-primary-foreground/80">{program?.points_currency_name}</span>
          </div>
        </div>
      </header>
      <main className="container py-8">
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="card-hover cursor-pointer" onClick={() => navigate('/fan/activities')}>
            <CardContent className="pt-6 text-center"><Zap className="h-12 w-12 text-primary mx-auto mb-4" /><h3 className="text-xl font-semibold">Activities</h3><p className="text-muted-foreground">Complete activities to earn points</p></CardContent>
          </Card>
          <Card className="card-hover cursor-pointer" onClick={() => navigate('/fan/rewards')}>
            <CardContent className="pt-6 text-center"><Gift className="h-12 w-12 text-accent mx-auto mb-4" /><h3 className="text-xl font-semibold">Rewards</h3><p className="text-muted-foreground">Redeem your points for rewards</p></CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
