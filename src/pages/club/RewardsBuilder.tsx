import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Logo } from '@/components/ui/Logo';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Plus, 
  Gift,
  Ticket,
  Wrench,
  Code,
  Loader2,
  Trash2,
  Edit
} from 'lucide-react';
import { Reward, RedemptionMethod, LoyaltyProgram } from '@/types/database';

const redemptionLabels: Record<RedemptionMethod, string> = {
  voucher: 'Voucher Code',
  manual_fulfillment: 'Manual Fulfillment',
  code_display: 'Code Display',
};

const redemptionIcons: Record<RedemptionMethod, React.ReactNode> = {
  voucher: <Ticket className="h-4 w-4" />,
  manual_fulfillment: <Wrench className="h-4 w-4" />,
  code_display: <Code className="h-4 w-4" />,
};

export default function RewardsBuilder() {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();

  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pointsCost, setPointsCost] = useState('500');
  const [quantityLimit, setQuantityLimit] = useState('');
  const [redemptionMethod, setRedemptionMethod] = useState<RedemptionMethod>('voucher');
  const [voucherCode, setVoucherCode] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth?role=club_admin');
    } else if (!loading && profile?.role !== 'club_admin') {
      navigate('/fan/home');
    }
  }, [user, profile, loading, navigate]);

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    if (!profile) return;
    setDataLoading(true);

    try {
      const { data: clubs } = await supabase
        .from('clubs')
        .select('id')
        .eq('admin_id', profile.id)
        .limit(1);

      if (!clubs || clubs.length === 0) {
        navigate('/club/onboarding');
        return;
      }

      const { data: programs } = await supabase
        .from('loyalty_programs')
        .select('*')
        .eq('club_id', clubs[0].id)
        .limit(1);

      if (!programs || programs.length === 0) {
        navigate('/club/onboarding');
        return;
      }

      setProgram(programs[0] as LoyaltyProgram);

      const { data: rewardsData } = await supabase
        .from('rewards')
        .select('*')
        .eq('program_id', programs[0].id)
        .order('created_at', { ascending: false });

      setRewards((rewardsData || []) as Reward[]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setPointsCost('500');
    setQuantityLimit('');
    setRedemptionMethod('voucher');
    setVoucherCode('');
    setIsActive(true);
    setEditingReward(null);
  };

  const openEditDialog = (reward: Reward) => {
    setEditingReward(reward);
    setName(reward.name);
    setDescription(reward.description || '');
    setPointsCost(reward.points_cost.toString());
    setQuantityLimit(reward.quantity_limit?.toString() || '');
    setRedemptionMethod(reward.redemption_method);
    setVoucherCode(reward.voucher_code || '');
    setIsActive(reward.is_active);
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!program) return;

    const cost = parseInt(pointsCost);
    if (isNaN(cost) || cost <= 0) {
      toast({
        title: 'Invalid Points Cost',
        description: 'Points cost must be a positive number.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const rewardData = {
        program_id: program.id,
        name,
        description: description || null,
        points_cost: cost,
        quantity_limit: quantityLimit ? parseInt(quantityLimit) : null,
        redemption_method: redemptionMethod,
        voucher_code: voucherCode || null,
        is_active: isActive,
      };

      if (editingReward) {
        const { error } = await supabase
          .from('rewards')
          .update(rewardData)
          .eq('id', editingReward.id);

        if (error) throw error;

        toast({
          title: 'Reward Updated',
          description: 'The reward has been updated successfully.',
        });
      } else {
        const { error } = await supabase
          .from('rewards')
          .insert(rewardData);

        if (error) throw error;

        toast({
          title: 'Reward Created',
          description: 'Your new reward is ready for fans.',
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        title: 'Error',
        description: err.message || 'Failed to save reward',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (rewardId: string) => {
    if (!confirm('Are you sure you want to delete this reward?')) return;

    try {
      const { error } = await supabase
        .from('rewards')
        .delete()
        .eq('id', rewardId);

      if (error) throw error;

      toast({
        title: 'Reward Deleted',
        description: 'The reward has been removed.',
      });
      fetchData();
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        title: 'Error',
        description: err.message || 'Failed to delete reward',
        variant: 'destructive',
      });
    }
  };

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/club/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Logo />
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-2">
              <Gift className="h-8 w-8 text-primary" />
              Rewards Builder
            </h1>
            <p className="text-muted-foreground">
              Create rewards fans can redeem with their {program?.points_currency_name || 'points'}
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gradient-stadium">
                <Plus className="h-4 w-4 mr-2" />
                New Reward
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingReward ? 'Edit Reward' : 'Create New Reward'}
                </DialogTitle>
                <DialogDescription>
                  Set up a reward that fans can redeem with their points
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Reward Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Signed Jersey"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the reward..."
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pointsCost">Points Cost *</Label>
                    <Input
                      id="pointsCost"
                      type="number"
                      min="1"
                      value={pointsCost}
                      onChange={(e) => setPointsCost(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantityLimit">Quantity Limit</Label>
                    <Input
                      id="quantityLimit"
                      type="number"
                      min="1"
                      value={quantityLimit}
                      onChange={(e) => setQuantityLimit(e.target.value)}
                      placeholder="Unlimited"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Redemption Method *</Label>
                  <Select value={redemptionMethod} onValueChange={(v) => setRedemptionMethod(v as RedemptionMethod)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(redemptionLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          <div className="flex items-center gap-2">
                            {redemptionIcons[value as RedemptionMethod]}
                            {label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {(redemptionMethod === 'voucher' || redemptionMethod === 'code_display') && (
                  <div className="space-y-2">
                    <Label htmlFor="voucherCode">Voucher/Display Code</Label>
                    <Input
                      id="voucherCode"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value)}
                      placeholder="REWARD2024"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Label htmlFor="isActive">Active</Label>
                  <Switch
                    id="isActive"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={!name || isSubmitting}
                  className="w-full gradient-stadium"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {editingReward ? 'Update Reward' : 'Create Reward'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {rewards.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No Rewards Yet
              </h3>
              <p className="text-muted-foreground mb-4">
                Create your first reward to incentivize fans
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Reward
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewards.map((reward) => (
              <Card key={reward.id} className={`${reward.is_active ? '' : 'opacity-60'}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-12 w-12 rounded-lg gradient-golden flex items-center justify-center">
                      <Gift className="h-6 w-6 text-accent-foreground" />
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(reward)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(reward.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <h3 className="font-semibold text-foreground mb-1">{reward.name}</h3>
                  {reward.description && (
                    <p className="text-sm text-muted-foreground mb-3">{reward.description}</p>
                  )}

                  <div className="flex items-center gap-2 mb-3">
                    <span className="points-display">{reward.points_cost}</span>
                    <span className="text-sm text-muted-foreground">{program?.points_currency_name}</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {redemptionLabels[reward.redemption_method]}
                    </Badge>
                    {reward.quantity_limit && (
                      <Badge variant="secondary">
                        {reward.quantity_redeemed}/{reward.quantity_limit} redeemed
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
