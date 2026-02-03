import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Logo } from '@/components/ui/Logo';
import { useToast } from '@/hooks/use-toast';
import { Search, MapPin, CheckCircle, Loader2 } from 'lucide-react';
import { Club, LoyaltyProgram } from '@/types/database';

interface ClubWithProgram extends Club { loyalty_programs: LoyaltyProgram[]; }

export default function JoinClub() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, loading } = useAuth();
  const { toast } = useToast();
  const [clubs, setClubs] = useState<ClubWithProgram[]>([]);
  const [search, setSearch] = useState('');
  const [dataLoading, setDataLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const preselectedClub = searchParams.get('club');

  useEffect(() => { if (!loading && profile) { checkMembership(); fetchClubs(); } }, [profile, loading]);

  const checkMembership = async () => {
    if (!profile) return;
    const { data } = await supabase.from('fan_memberships').select('id').eq('fan_id', profile.id).limit(1);
    if (data?.length) navigate('/fan/home');
  };

  const fetchClubs = async () => {
    setDataLoading(true);
    const { data } = await supabase.from('clubs').select('*, loyalty_programs(*)').in('status', ['verified', 'official']);
    const clubsWithPrograms = ((data || []) as unknown as ClubWithProgram[]).filter((c) => c.loyalty_programs?.length > 0);
    setClubs(clubsWithPrograms);
    setDataLoading(false);
  };

  const handleJoin = async (club: ClubWithProgram) => {
    if (!profile) return;
    setJoining(club.id);
    try {
      const { error } = await supabase.from('fan_memberships').insert({ fan_id: profile.id, club_id: club.id, program_id: club.loyalty_programs[0].id });
      if (error) throw error;
      toast({ title: 'Welcome!', description: `You joined ${club.name}'s loyalty program!` });
      navigate('/fan/home');
    } catch (e) { toast({ title: 'Error', description: 'Failed to join', variant: 'destructive' }); }
    setJoining(null);
  };

  const filtered = clubs.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.city.toLowerCase().includes(search.toLowerCase()));

  if (loading || dataLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="py-16 gradient-stadium">
        <div className="container text-center">
          <Logo size="lg" />
          <h1 className="text-3xl font-display font-bold text-primary-foreground mt-6">Join a Club</h1>
          <p className="text-primary-foreground/80 mb-6">Find your club and start earning rewards</p>
          <div className="relative max-w-md mx-auto"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><Input placeholder="Search clubs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-background/90 border-0" /></div>
        </div>
      </header>
      <main className="container py-8">
        {filtered.length === 0 ? <Card><CardContent className="py-12 text-center text-muted-foreground">No verified clubs found.</CardContent></Card> : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(club => (
              <Card key={club.id} className="card-hover overflow-hidden">
                <div className="h-20 flex items-center justify-center" style={{ backgroundColor: club.primary_color }}>
                  <span className="text-2xl font-bold text-primary-foreground">{club.name.charAt(0)}</span>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold">{club.name}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mb-4"><MapPin className="h-4 w-4" />{club.city}, {club.country}</p>
                  <Button className="w-full" onClick={() => handleJoin(club)} disabled={joining === club.id}>
                    {joining === club.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}Join
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
