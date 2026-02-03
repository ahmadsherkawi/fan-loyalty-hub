import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Logo } from '@/components/ui/Logo';
import { PreviewBanner } from '@/components/ui/PreviewBanner';
import { RewardRedemptionModal } from '@/components/ui/RewardRedemptionModal';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Gift, 
  Loader2, 
  Trophy, 
  AlertCircle, 
  History, 
  CheckCircle2,
  Clock,
  Ticket,
  Wrench,
  Code
} from 'lucide-react';
import { Reward, FanMembership, LoyaltyProgram, RewardRedemption, RedemptionMethod } from '@/types/database';

// Extended type for redemptions with reward details
interface RedemptionWithReward extends RewardRedemption {
  rewards?: {
    name: string;
    description: string | null;
    redemption_method: RedemptionMethod;
  };
}

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
  points_balance: 750,
  joined_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const PREVIEW_REDEMPTIONS: RedemptionWithReward[] = [
  {
    id: 'preview-redemption-1',
    reward_id: 'preview-reward-2',
    fan_id: 'preview-fan',
    membership_id: 'preview-membership-1',
    points_spent: 200,
    redemption_code: 'REDDEVILS10',
    fulfilled_at: null,
    redeemed_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    rewards: {
      name: '10% Shop Discount',
      description: 'Get 10% off at the official club shop',
      redemption_method: 'voucher',
    },
  },
];

const redemptionIcons: Record<RedemptionMethod, React.ReactNode> = {
  voucher: <Ticket className="h-4 w-4" />,
  manual_fulfillment: <Wrench className="h-4 w-4" />,
  code_display: <Code className="h-4 w-4" />,
};

const redemptionLabels: Record<RedemptionMethod, string> = {
  voucher: 'Digital Voucher',
  manual_fulfillment: 'Fulfilled by Club',
  code_display: 'Display Code',
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
  const [redemptions, setRedemptions] = useState<RedemptionWithReward[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available');
  
  // Redemption modal state
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [redemptionModalOpen, setRedemptionModalOpen] = useState(false);

  useEffect(() => { 
    if (isPreviewMode) {
      setMembership(PREVIEW_MEMBERSHIP);
      setProgram(PREVIEW_PROGRAM);
      setRewards(PREVIEW_REWARDS);
      setRedemptions(PREVIEW_REDEMPTIONS);
      setDataLoading(false);
    } else if (!loading && profile) {
      fetchData(); 
    }
  }, [profile, loading, isPreviewMode]);

  const fetchData = async () => {
    if (!profile) return;
    setDataLoading(true);
    
    const { data: memberships } = await supabase
      .from('fan_memberships')
      .select('*')
      .eq('fan_id', profile.id)
      .limit(1);
    
    if (!memberships?.length) { 
      navigate('/fan/join'); 
      return; 
    }
    
    const m = memberships[0] as FanMembership;
    setMembership(m);
    
    const { data: programs } = await supabase
      .from('loyalty_programs')
      .select('*')
      .eq('id', m.program_id)
      .limit(1);
    
    if (programs) setProgram(programs[0] as LoyaltyProgram);
    
    const { data: rews } = await supabase
      .from('rewards')
      .select('*')
      .eq('program_id', m.program_id)
      .eq('is_active', true);
    
    setRewards((rews || []) as Reward[]);
    
    // Fetch redemption history
    const { data: redemptionsData } = await supabase
      .from('reward_redemptions')
      .select(`
        *,
        rewards (
          name,
          description,
          redemption_method
        )
      `)
      .eq('fan_id', profile.id)
      .order('redeemed_at', { ascending: false });
    
    setRedemptions((redemptionsData || []) as RedemptionWithReward[]);
    setDataLoading(false);
  };

  const handleRedeemClick = (reward: Reward) => {
    setSelectedReward(reward);
    setRedemptionModalOpen(true);
  };

  const handleConfirmRedeem = async (): Promise<{ success: boolean; code?: string | null; error?: string }> => {
    if (!membership || !profile || !selectedReward) {
      return { success: false, error: 'Missing required data' };
    }

    if ((membership.points_balance || 0) < selectedReward.points_cost) {
      return { success: false, error: 'Insufficient points' };
    }

    try {
      // Spend points
      const { data: spendResult } = await supabase.rpc('spend_points', { 
        p_membership_id: membership.id, 
        p_points: selectedReward.points_cost 
      });
      
      if (!spendResult) {
        return { success: false, error: 'Failed to deduct points' };
      }

      // Create redemption record
      const { error: redemptionError } = await supabase
        .from('reward_redemptions')
        .insert({ 
          reward_id: selectedReward.id, 
          fan_id: profile.id, 
          membership_id: membership.id, 
          points_spent: selectedReward.points_cost, 
          redemption_code: selectedReward.voucher_code 
        });

      if (redemptionError) {
        return { success: false, error: 'Failed to record redemption' };
      }

      // Update quantity redeemed
      await supabase
        .from('rewards')
        .update({ 
          quantity_redeemed: (selectedReward.quantity_redeemed || 0) + 1 
        })
        .eq('id', selectedReward.id);

      // Refresh data
      fetchData();

      return { 
        success: true, 
        code: selectedReward.voucher_code 
      };
    } catch (e) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="available" className="gap-2">
              <Gift className="h-4 w-4" />
              Available
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              My Redemptions
            </TabsTrigger>
          </TabsList>

          {/* Available Rewards Tab */}
          <TabsContent value="available">
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
                          <Badge variant="outline" className="gap-1">
                            {redemptionIcons[reward.redemption_method]}
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
                              onClick={() => handleRedeemClick(reward)}
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
          </TabsContent>

          {/* Redemption History Tab */}
          <TabsContent value="history">
            {redemptions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Redemptions Yet</h3>
                  <p className="text-muted-foreground">
                    Redeem rewards to see them here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {redemptions.map(redemption => (
                  <Card key={redemption.id}>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                            redemption.fulfilled_at 
                              ? 'bg-success/10' 
                              : 'bg-primary/10'
                          }`}>
                            {redemption.fulfilled_at ? (
                              <CheckCircle2 className="h-6 w-6 text-success" />
                            ) : (
                              <Clock className="h-6 w-6 text-primary" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold">
                              {redemption.rewards?.name || 'Unknown Reward'}
                            </h3>
                            {redemption.rewards?.description && (
                              <p className="text-sm text-muted-foreground mt-0.5">
                                {redemption.rewards.description}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <Badge variant="secondary">
                                -{redemption.points_spent} {program?.points_currency_name}
                              </Badge>
                              {redemption.rewards?.redemption_method && (
                                <Badge variant="outline" className="gap-1">
                                  {redemptionIcons[redemption.rewards.redemption_method]}
                                  {redemptionLabels[redemption.rewards.redemption_method]}
                                </Badge>
                              )}
                              {redemption.fulfilled_at ? (
                                <Badge className="bg-success text-success-foreground">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Fulfilled
                                </Badge>
                              ) : (
                                <Badge variant="outline">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Pending
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right shrink-0">
                          <p className="text-sm text-muted-foreground">
                            {formatDate(redemption.redeemed_at)}
                          </p>
                          {redemption.redemption_code && (
                            <code className="text-xs font-mono bg-muted px-2 py-1 rounded mt-1 inline-block">
                              {redemption.redemption_code}
                            </code>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Redemption Modal */}
      <RewardRedemptionModal
        isOpen={redemptionModalOpen}
        onClose={() => {
          setRedemptionModalOpen(false);
          setSelectedReward(null);
        }}
        reward={selectedReward}
        pointsBalance={membership?.points_balance || 0}
        pointsCurrency={program?.points_currency_name || 'Points'}
        onConfirmRedeem={handleConfirmRedeem}
        isPreview={isPreviewMode}
      />
    </div>
  );
}
