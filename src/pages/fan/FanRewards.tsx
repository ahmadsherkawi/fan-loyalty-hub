import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/ui/Logo';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Gift, Loader2 } from 'lucide-react';
import { Reward, FanMembership, LoyaltyProgram } from '@/types/database';

export default function FanRewards() {
  const navigate = useNavigate();
  const { profile, loading } = useAuth();
  const { toast } = useToast();
  const [membership, setMembership] = useState<FanMembership | null>(null);
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => { if (!loading && profile) fetchData(); }, [profile, loading]);

  const fetchData = async () => {
    if (!profile) return;
    setDataLoading(true);
    const { data: memberships } = await supabase.from('fan_memberships').select('*').eq('fan_id', profile.id).limit(1);
    if (!memberships?.length) { navigate('/fan/join'); return; }
    const m = memberships[0] as FanMembership;
    setMembership(m);
    const { data: programs } = await supabase.from('loyalty_programs').select('*').eq('id', m.program_id).limit(1);
    if (programs) setProgram(programs[0] as LoyaltyProgram);
    const { data: rews } = await supabase.from('rewards').select('*').eq('program_id', m.program_id).eq('is_active', true);
    setRewards((rews || []) as Reward[]);
    setDataLoading(false);
  };

  const handleRedeem = async (reward: Reward) => {
    if (!membership || !profile) return;
    if ((membership.points_balance || 0) < reward.points_cost) { toast({ title: 'Not Enough Points', variant: 'destructive' }); return; }
    try {
      const success = await supabase.rpc('spend_points', { p_membership_id: membership.id, p_points: reward.points_cost });
      if (!success) throw new Error('Insufficient points');
      await supabase.from('reward_redemptions').insert({ reward_id: reward.id, fan_id: profile.id, membership_id: membership.id, points_spent: reward.points_cost, redemption_code: reward.voucher_code });
      await supabase.from('rewards').update({ quantity_redeemed: (reward.quantity_redeemed || 0) + 1 }).eq('id', reward.id);
      toast({ title: 'Reward Redeemed!', description: reward.voucher_code ? `Your code: ${reward.voucher_code}` : 'Check with the club for fulfillment.' });
      fetchData();
    } catch (e) { toast({ title: 'Error', description: 'Failed to redeem reward', variant: 'destructive' }); }
  };

  if (loading || dataLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card"><div className="container py-4 flex items-center gap-4"><Button variant="ghost" onClick={() => navigate('/fan/home')}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button><Logo /></div></header>
      <main className="container py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-display font-bold flex items-center gap-2"><Gift className="h-8 w-8 text-accent" />Rewards</h1>
          <Badge variant="secondary" className="text-lg px-4 py-2">{membership?.points_balance || 0} {program?.points_currency_name}</Badge>
        </div>
        {rewards.length === 0 ? <Card><CardContent className="py-12 text-center text-muted-foreground">No rewards available yet.</CardContent></Card> : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewards.map(reward => {
              const canAfford = (membership?.points_balance || 0) >= reward.points_cost;
              const soldOut = reward.quantity_limit && reward.quantity_redeemed >= reward.quantity_limit;
              return (
                <Card key={reward.id}>
                  <CardContent className="pt-6">
                    <div className="h-12 w-12 rounded-lg gradient-golden flex items-center justify-center mb-4"><Gift className="h-6 w-6 text-accent-foreground" /></div>
                    <h3 className="font-semibold mb-1">{reward.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{reward.description}</p>
                    <div className="points-display mb-4">{reward.points_cost} {program?.points_currency_name}</div>
                    <Button className="w-full" disabled={!canAfford || !!soldOut} onClick={() => handleRedeem(reward)}>
                      {soldOut ? 'Sold Out' : canAfford ? 'Redeem' : 'Not Enough Points'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
