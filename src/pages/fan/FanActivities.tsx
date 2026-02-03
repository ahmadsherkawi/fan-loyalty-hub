import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/ui/Logo';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Zap, QrCode, MapPin, Smartphone, FileCheck, Loader2, CheckCircle } from 'lucide-react';
import { Activity, FanMembership, LoyaltyProgram, ActivityCompletion } from '@/types/database';

export default function FanActivities() {
  const navigate = useNavigate();
  const { profile, loading } = useAuth();
  const { toast } = useToast();
  const [membership, setMembership] = useState<FanMembership | null>(null);
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [completions, setCompletions] = useState<ActivityCompletion[]>([]);
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
    const { data: acts } = await supabase.from('activities').select('*').eq('program_id', m.program_id).eq('is_active', true);
    setActivities((acts || []) as Activity[]);
    const { data: comps } = await supabase.from('activity_completions').select('*').eq('fan_id', profile.id);
    setCompletions((comps || []) as ActivityCompletion[]);
    setDataLoading(false);
  };

  const isCompleted = (activityId: string) => completions.some(c => c.activity_id === activityId);

  const handleComplete = async (activity: Activity) => {
    if (!membership || !profile) return;
    try {
      await supabase.from('activity_completions').insert({ activity_id: activity.id, fan_id: profile.id, membership_id: membership.id, points_earned: activity.points_awarded });
      await supabase.rpc('award_points', { p_membership_id: membership.id, p_points: activity.points_awarded });
      toast({ title: 'Activity Completed!', description: `You earned ${activity.points_awarded} ${program?.points_currency_name}!` });
      fetchData();
    } catch (e) { toast({ title: 'Error', description: 'Failed to complete activity', variant: 'destructive' }); }
  };

  const icons = { qr_scan: QrCode, location_checkin: MapPin, in_app_completion: Smartphone, manual_proof: FileCheck };

  if (loading || dataLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card"><div className="container py-4 flex items-center gap-4"><Button variant="ghost" onClick={() => navigate('/fan/home')}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button><Logo /></div></header>
      <main className="container py-8">
        <h1 className="text-3xl font-display font-bold mb-6 flex items-center gap-2"><Zap className="h-8 w-8 text-primary" />Activities</h1>
        {activities.length === 0 ? <Card><CardContent className="py-12 text-center text-muted-foreground">No activities available yet.</CardContent></Card> : (
          <div className="space-y-4">
            {activities.map(activity => {
              const Icon = icons[activity.verification_method];
              const completed = isCompleted(activity.id);
              return (
                <Card key={activity.id} className={completed ? 'activity-completed' : 'activity-available'}>
                  <CardContent className="py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center"><Icon className="h-6 w-6 text-primary" /></div>
                      <div>
                        <h3 className="font-semibold">{activity.name}</h3>
                        <Badge variant="secondary">{activity.points_awarded} {program?.points_currency_name}</Badge>
                      </div>
                    </div>
                    {completed ? <Badge className="bg-success"><CheckCircle className="h-3 w-3 mr-1" />Done</Badge> : (
                      <Button onClick={() => handleComplete(activity)} disabled={activity.verification_method === 'manual_proof'}>
                        {activity.verification_method === 'in_app_completion' ? 'Complete' : 'Claim'}
                      </Button>
                    )}
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
