import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/ui/Logo';
import { PreviewBanner } from '@/components/ui/PreviewBanner';
import { ManualProofModal } from '@/components/ui/ManualProofModal';
import { QRScannerModal } from '@/components/ui/QRScannerModal';
import { LocationCheckinModal } from '@/components/ui/LocationCheckinModal';
import { PollQuizParticipation, InAppConfig } from '@/components/ui/PollQuizParticipation';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Zap, QrCode, MapPin, Smartphone, FileCheck, Loader2, CheckCircle, Clock } from 'lucide-react';
import { Activity, FanMembership, LoyaltyProgram, ActivityCompletion, VerificationMethod, ActivityFrequency } from '@/types/database';

// Preview data
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
    in_app_config: null,
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
    in_app_config: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'preview-activity-3',
    program_id: 'preview-program-1',
    name: 'Complete Fan Quiz',
    description: 'Test your knowledge about the club history',
    points_awarded: 25,
    frequency: 'once_ever',
    verification_method: 'in_app_completion',
    qr_code_data: null,
    location_lat: null,
    location_lng: null,
    location_radius_meters: 100,
    time_window_start: null,
    time_window_end: null,
    in_app_config: {
      type: 'quiz',
      question: 'In which year was the club founded?',
      options: [
        { id: 'opt1', text: '1878', isCorrect: true },
        { id: 'opt2', text: '1892', isCorrect: false },
        { id: 'opt3', text: '1902', isCorrect: false },
        { id: 'opt4', text: '1910', isCorrect: false },
      ],
    },
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'preview-activity-4',
    program_id: 'preview-program-1',
    name: 'Share Match Photo',
    description: 'Upload a photo from the match for review',
    points_awarded: 75,
    frequency: 'once_per_match',
    verification_method: 'manual_proof',
    qr_code_data: null,
    location_lat: null,
    location_lng: null,
    location_radius_meters: 100,
    time_window_start: null,
    time_window_end: null,
    in_app_config: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'preview-activity-5',
    program_id: 'preview-program-1',
    name: 'Match Day Poll',
    description: 'Vote for your man of the match',
    points_awarded: 15,
    frequency: 'once_per_match',
    verification_method: 'in_app_completion',
    qr_code_data: null,
    location_lat: null,
    location_lng: null,
    location_radius_meters: 100,
    time_window_start: null,
    time_window_end: null,
    in_app_config: {
      type: 'poll',
      question: 'Who was the Man of the Match?',
      options: [
        { id: 'opt1', text: 'Rashford' },
        { id: 'opt2', text: 'Fernandes' },
        { id: 'opt3', text: 'Onana' },
        { id: 'opt4', text: 'Garnacho' },
      ],
    },
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
  points_balance: 0,
  joined_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export default function FanActivities() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, loading } = useAuth();
  const { toast } = useToast();
  
  const isPreviewMode = searchParams.get('preview') === 'fan';
  
  const [membership, setMembership] = useState<FanMembership | null>(null);
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [completions, setCompletions] = useState<ActivityCompletion[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  
  // Manual proof submission state
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [submittingProof, setSubmittingProof] = useState(false);
  const [pendingClaims, setPendingClaims] = useState<string[]>([]);
  
  // QR scanner state
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [processingQR, setProcessingQR] = useState(false);
  
  // Location check-in state
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [processingLocation, setProcessingLocation] = useState(false);
  
  // Poll/Quiz state
  const [pollQuizModalOpen, setPollQuizModalOpen] = useState(false);

  useEffect(() => { 
    if (isPreviewMode) {
      setMembership(PREVIEW_MEMBERSHIP);
      setProgram(PREVIEW_PROGRAM);
      setActivities(PREVIEW_ACTIVITIES);
      setCompletions([]);
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
    const { data: acts } = await supabase.from('activities').select('*').eq('program_id', m.program_id).eq('is_active', true);
    setActivities((acts || []) as unknown as Activity[]);
    const { data: comps } = await supabase.from('activity_completions').select('*').eq('fan_id', profile.id);
    setCompletions((comps || []) as ActivityCompletion[]);
    
    // Fetch pending manual claims
    const { data: claims } = await supabase
      .from('manual_claims')
      .select('activity_id')
      .eq('fan_id', profile.id)
      .eq('status', 'pending');
    setPendingClaims((claims || []).map(c => c.activity_id));
    
    setDataLoading(false);
  };

  const isCompleted = (activityId: string) => completions.some(c => c.activity_id === activityId);
  const hasPendingClaim = (activityId: string) => pendingClaims.includes(activityId);

  const handleComplete = async (activity: Activity) => {
    // Manual proof activities open the modal instead
    if (activity.verification_method === 'manual_proof') {
      setSelectedActivity(activity);
      setProofModalOpen(true);
      return;
    }
    
    // QR scan activities open the scanner
    if (activity.verification_method === 'qr_scan') {
      setSelectedActivity(activity);
      setQrScannerOpen(true);
      return;
    }
    
    // Location check-in activities open the location modal
    if (activity.verification_method === 'location_checkin') {
      setSelectedActivity(activity);
      setLocationModalOpen(true);
      return;
    }
    
    // In-app completion activities (polls/quizzes) open the participation modal
    if (activity.verification_method === 'in_app_completion' && activity.in_app_config) {
      setSelectedActivity(activity);
      setPollQuizModalOpen(true);
      return;
    }
    
    if (isPreviewMode) {
      toast({ 
        title: 'Preview Mode', 
        description: 'Activity completion is simulated in preview mode.' 
      });
      return;
    }
    
    if (!membership || !profile) return;
    try {
      await supabase.from('activity_completions').insert({ 
        activity_id: activity.id, 
        fan_id: profile.id, 
        membership_id: membership.id, 
        points_earned: activity.points_awarded 
      });
      await supabase.rpc('award_points', { 
        p_membership_id: membership.id, 
        p_points: activity.points_awarded 
      });
      toast({ 
        title: 'Activity Completed!', 
        description: `You earned ${activity.points_awarded} ${program?.points_currency_name}!` 
      });
      fetchData();
    } catch (e) { 
      toast({ title: 'Error', description: 'Failed to complete activity', variant: 'destructive' }); 
    }
  };

  const handleSubmitProof = async (proofDescription: string, proofUrl: string | null) => {
    if (!selectedActivity || !membership || !profile) return;
    
    if (isPreviewMode) {
      toast({ 
        title: 'Proof Submitted!', 
        description: 'In preview mode, your proof would be sent to the club admin for review.' 
      });
      setProofModalOpen(false);
      return;
    }
    
    setSubmittingProof(true);
    try {
      const { error } = await supabase.from('manual_claims').insert({
        activity_id: selectedActivity.id,
        fan_id: profile.id,
        membership_id: membership.id,
        proof_description: proofDescription,
        proof_url: proofUrl,
      });
      
      if (error) throw error;
      
      toast({ 
        title: 'Proof Submitted!', 
        description: 'The club admin will review your submission. You\'ll earn points once approved.' 
      });
      setProofModalOpen(false);
      fetchData();
    } catch (e) { 
      toast({ title: 'Error', description: 'Failed to submit proof', variant: 'destructive' }); 
    } finally {
      setSubmittingProof(false);
    }
  };

  const handleQRSuccess = async () => {
    if (!selectedActivity || !membership || !profile) return;
    
    if (isPreviewMode) {
      toast({ 
        title: 'Activity Completed!', 
        description: `You earned ${selectedActivity.points_awarded} ${program?.points_currency_name}! (simulated in preview)` 
      });
      setQrScannerOpen(false);
      return;
    }
    
    setProcessingQR(true);
    try {
      await supabase.from('activity_completions').insert({ 
        activity_id: selectedActivity.id, 
        fan_id: profile.id, 
        membership_id: membership.id, 
        points_earned: selectedActivity.points_awarded,
        metadata: { verification: 'qr_scan' }
      });
      await supabase.rpc('award_points', { 
        p_membership_id: membership.id, 
        p_points: selectedActivity.points_awarded 
      });
      toast({ 
        title: 'Activity Completed!', 
        description: `You earned ${selectedActivity.points_awarded} ${program?.points_currency_name}!` 
      });
      setQrScannerOpen(false);
      fetchData();
    } catch (e) { 
      toast({ title: 'Error', description: 'Failed to complete activity', variant: 'destructive' }); 
    } finally {
      setProcessingQR(false);
    }
  };

  const handleLocationSuccess = async () => {
    if (!selectedActivity || !membership || !profile) return;
    
    if (isPreviewMode) {
      toast({ 
        title: 'Check-in Successful!', 
        description: `You earned ${selectedActivity.points_awarded} ${program?.points_currency_name}! (simulated in preview)` 
      });
      setLocationModalOpen(false);
      return;
    }
    
    setProcessingLocation(true);
    try {
      await supabase.from('activity_completions').insert({ 
        activity_id: selectedActivity.id, 
        fan_id: profile.id, 
        membership_id: membership.id, 
        points_earned: selectedActivity.points_awarded,
        metadata: { verification: 'location_checkin' }
      });
      await supabase.rpc('award_points', { 
        p_membership_id: membership.id, 
        p_points: selectedActivity.points_awarded 
      });
      toast({ 
        title: 'Check-in Successful!', 
        description: `You earned ${selectedActivity.points_awarded} ${program?.points_currency_name}!` 
      });
      setLocationModalOpen(false);
      fetchData();
    } catch (e) { 
      toast({ title: 'Error', description: 'Failed to complete check-in', variant: 'destructive' }); 
    } finally {
      setProcessingLocation(false);
    }
  };

  const handlePollQuizSubmit = async (selectedOptionId: string, isCorrect: boolean) => {
    if (!selectedActivity || !membership || !profile) return;
    
    const isPoll = selectedActivity.in_app_config?.type === 'poll';
    const pointsToAward = (isPoll || isCorrect) ? selectedActivity.points_awarded : 0;
    
    if (isPreviewMode) {
      if (pointsToAward > 0) {
        toast({ 
          title: isPoll ? 'Vote Recorded!' : 'Correct!', 
          description: `You earned ${pointsToAward} ${program?.points_currency_name}! (simulated in preview)` 
        });
      } else {
        toast({ 
          title: 'Incorrect', 
          description: 'Better luck next time! (simulated in preview)' 
        });
      }
      return;
    }
    
    if (pointsToAward > 0) {
      try {
        await supabase.from('activity_completions').insert({ 
          activity_id: selectedActivity.id, 
          fan_id: profile.id, 
          membership_id: membership.id, 
          points_earned: pointsToAward,
          metadata: { 
            verification: 'in_app_completion',
            type: selectedActivity.in_app_config?.type,
            selected_option: selectedOptionId,
            is_correct: isCorrect,
          }
        });
        await supabase.rpc('award_points', { 
          p_membership_id: membership.id, 
          p_points: pointsToAward 
        });
        fetchData();
      } catch (e) { 
        toast({ title: 'Error', description: 'Failed to record response', variant: 'destructive' }); 
      }
    }
  };

  const icons: Record<VerificationMethod, React.ComponentType<{ className?: string }>> = { 
    qr_scan: QrCode, 
    location_checkin: MapPin, 
    in_app_completion: Smartphone, 
    manual_proof: FileCheck 
  };
  
  const ctaLabels: Record<VerificationMethod, string> = {
    qr_scan: 'Scan QR',
    location_checkin: 'Check In',
    in_app_completion: 'Complete',
    manual_proof: 'Submit Proof',
  };
  
  const frequencyLabels: Record<ActivityFrequency, string> = {
    once_ever: 'One time only',
    once_per_match: 'Once per match',
    once_per_day: 'Daily',
    unlimited: 'Unlimited',
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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-display font-bold flex items-center gap-2">
            <Zap className="h-8 w-8 text-primary" />
            Activities
          </h1>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {membership?.points_balance || 0} {program?.points_currency_name}
          </Badge>
        </div>
        
        {activities.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Activities Available Yet</h3>
              <p className="text-muted-foreground">Check back soon.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {activities.map(activity => {
              const Icon = icons[activity.verification_method];
              const completed = isCompleted(activity.id);
              const pending = hasPendingClaim(activity.id);
              
              return (
                <Card 
                  key={activity.id} 
                  className={
                    completed ? 'border-success/50 bg-success/5' : 
                    pending ? 'border-warning/50 bg-warning/5' : 
                    'card-hover'
                  }
                >
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                          completed ? 'bg-success/20' : 
                          pending ? 'bg-warning/20' : 
                          'bg-primary/10'
                        }`}>
                          <Icon className={`h-6 w-6 ${
                            completed ? 'text-success' : 
                            pending ? 'text-warning' : 
                            'text-primary'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">{activity.name}</h3>
                          {activity.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {activity.description}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <Badge variant="secondary">
                              +{activity.points_awarded} {program?.points_currency_name}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {frequencyLabels[activity.frequency]}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      {completed ? (
                        <Badge className="bg-success text-success-foreground shrink-0">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Done
                        </Badge>
                      ) : pending ? (
                        <Badge variant="outline" className="border-warning text-warning shrink-0">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending Review
                        </Badge>
                      ) : (
                        <Button 
                          onClick={() => handleComplete(activity)} 
                          className="shrink-0"
                        >
                          {ctaLabels[activity.verification_method]}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Manual Proof Submission Modal */}
      <ManualProofModal
        open={proofModalOpen}
        onOpenChange={setProofModalOpen}
        activityName={selectedActivity?.name || ''}
        pointsAwarded={selectedActivity?.points_awarded || 0}
        pointsCurrencyName={program?.points_currency_name || 'Points'}
        onSubmit={handleSubmitProof}
        isLoading={submittingProof}
      />

      {/* QR Scanner Modal */}
      <QRScannerModal
        open={qrScannerOpen}
        onOpenChange={setQrScannerOpen}
        activityName={selectedActivity?.name || ''}
        expectedQRData={selectedActivity?.qr_code_data || null}
        pointsAwarded={selectedActivity?.points_awarded || 0}
        pointsCurrencyName={program?.points_currency_name || 'Points'}
        onSuccess={handleQRSuccess}
        isLoading={processingQR}
      />

      {/* Location Check-in Modal */}
      <LocationCheckinModal
        open={locationModalOpen}
        onOpenChange={setLocationModalOpen}
        activityName={selectedActivity?.name || ''}
        targetLat={selectedActivity?.location_lat ?? null}
        targetLng={selectedActivity?.location_lng ?? null}
        radiusMeters={selectedActivity?.location_radius_meters || 500}
        pointsAwarded={selectedActivity?.points_awarded || 0}
        pointsCurrencyName={program?.points_currency_name || 'Points'}
        onSuccess={handleLocationSuccess}
        isLoading={processingLocation}
      />

      {/* Poll/Quiz Participation Modal */}
      {selectedActivity?.in_app_config && (
        <PollQuizParticipation
          isOpen={pollQuizModalOpen}
          onClose={() => setPollQuizModalOpen(false)}
          activityName={selectedActivity.name}
          config={selectedActivity.in_app_config as InAppConfig}
          pointsAwarded={selectedActivity.points_awarded}
          pointsCurrency={program?.points_currency_name || 'Points'}
          onSubmit={handlePollQuizSubmit}
          isPreview={isPreviewMode}
        />
      )}
    </div>
  );
}
