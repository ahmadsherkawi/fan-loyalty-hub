import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/ui/Logo';
import { PreviewBanner } from '@/components/ui/PreviewBanner';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Gift, Loader2, Trophy, AlertCircle } from 'lucide-react';
import { Reward, FanMembership, LoyaltyProgram, RedemptionMethod } from '@/types/database';

// Preview data
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
  {
    id: 'preview-reward-3',
    program_id: 'preview-program-1',
    name: 'Stadium Tour',
    description: 'Exclusive behind-the-scenes tour of Old Trafford',
    points_cost: 1000,
    quantity_limit: 50,
    quantity_redeemed: 12,
    redemption_method: 'manual_fulfillment',
    voucher_code: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'preview-reward-4',
    program_id: 'preview-program-1',
    name: 'Match Day Ticket Priority',
    description: 'Early access code for match ticket sales',
    points_cost: 300,
    quantity_limit: null,
    quantity_redeemed: 0,
    redemption_method: 'code_display',
    voucher_code: 'PRIORITY2024',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

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

const PREVIEW_MEMBERSHIP: FanMembership = {
  id: 'preview-membership-1',
  fan_id: 'preview-fan',
  club_id: 'preview-club-1',
  program_id: 'preview-program-1',
  points_balance: 150,
  joined_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export default function FanRewards() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, loading } = useAuth();
  const { toast } = useToast();
  
  const isPreviewMode = searchParams.get('preview') === 'fan';
  
  const [membership, setMembership] = useState<FanMembership | null>(null);
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => { 
    if (isPreviewMode) {
      setMembership(PREVIEW_MEMBERSHIP);
      setProgram(PREVIEW_PROGRAM);
      setRewards(PREVIEW_REWARDS);
      setDataLoading(false);
    } else if (!loading && profile) {
      fetchData(); 
    }
  }, [profile, loading, isPreviewMode]);

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
    if (isPreviewMode) {
      toast({ 
        title: 'Preview Mode', 
        description: 'Redemption is simulated in preview mode.' 
      });
      return;
    }
    
    if (!membership || !profile) return;
    if ((membership.points_balance || 0) < reward.points_cost) { 
      toast({ title: 'Not Enough Points', variant: 'destructive' }); 
      return; 
    }
    try {
      const success = await supabase.rpc('spend_points', { 
        p_membership_id: membership.id, 
        p_points: reward.points_cost 
      });
      if (!success) throw new Error('Insufficient points');
      await supabase.from('reward_redemptions').insert({ 
        reward_id: reward.id, 
        fan_id: profile.id, 
        membership_id: membership.id, 
        points_spent: reward.points_cost, 
        redemption_code: reward.voucher_code 
      });
      await supabase.from('rewards').update({ 
        quantity_redeemed: (reward.quantity_redeemed || 0) + 1 
      }).eq('id', reward.id);
      toast({ 
        title: 'Reward Redeemed!', 
        description: reward.voucher_code 
          ? `Your code: ${reward.voucher_code}` 
          : 'Check with the club for fulfillment.' 
      });
      fetchData();
    } catch (e) { 
      toast({ title: 'Error', description: 'Failed to redeem reward', variant: 'destructive' }); 
    }
  };
  
  const redemptionLabels: Record<RedemptionMethod, string> = {
    voucher: 'Digital Voucher',
    manual_fulfillment: 'Fulfilled by Club',
    code_display: 'Display Code',
  };

  if (!isPreviewMode && (loading || dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {isPreviewMode && <PreviewBanner role="fan" />}
      
      <header className="border-b bg-card">
        <div className="container py-4 flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate(isPreviewMode ? '/fan/home?preview=fan' : '/fan/home')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Logo />
        </div>
      </header>
      
      <main className="container py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-display font-bold flex items-center gap-2">
            <Gift className="h-8 w-8 text-accent" />
            Rewards
          </h1>
          <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2">
            <Trophy className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold">{membership?.points_balance || 0}</span>
            <span className="text-muted-foreground">{program?.points_currency_name}</span>
          </div>
        </div>
        
        {rewards.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Rewards Available Yet</h3>
              <p className="text-muted-foreground">Check back soon.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rewards.map(reward => {
              const canAfford = (membership?.points_balance || 0) >= reward.points_cost;
              const soldOut = reward.quantity_limit && reward.quantity_redeemed >= reward.quantity_limit;
              const remaining = reward.quantity_limit ? reward.quantity_limit - reward.quantity_redeemed : null;
              
              return (
                <Card key={reward.id} className={`card-hover ${!canAfford && !soldOut ? 'opacity-80' : ''}`}>
                  <CardContent className="pt-6">
                    <div className="h-14 w-14 rounded-lg gradient-golden flex items-center justify-center mb-4">
                      <Gift className="h-7 w-7 text-accent-foreground" />
                    </div>
                    
                    <h3 className="font-semibold text-lg mb-1">{reward.name}</h3>
                    {reward.description && (
                      <p className="text-sm text-muted-foreground mb-3">{reward.description}</p>
                    )}
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge variant="outline">
                        {redemptionLabels[reward.redemption_method]}
                      </Badge>
                      {remaining !== null && (
                        <Badge variant="secondary">
                          {remaining} left
                        </Badge>
                      )}
                    </div>
                    
                    <div className="border-t pt-4 mt-4">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-xl text-primary">
                          {reward.points_cost}
                          <span className="text-sm font-normal text-muted-foreground ml-1">
                            {program?.points_currency_name}
                          </span>
                        </div>
                        
                        <Button 
                          onClick={() => handleRedeem(reward)}
                          disabled={!canAfford || !!soldOut}
                          variant={soldOut ? 'outline' : canAfford ? 'default' : 'secondary'}
                        >
                          {soldOut ? 'Sold Out' : canAfford ? 'Redeem' : 'Not Enough'}
                        </Button>
                      </div>
                      
                      {!canAfford && !soldOut && (
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          You need {reward.points_cost - (membership?.points_balance || 0)} more {program?.points_currency_name}
                        </p>
                      )}
                    </div>
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
