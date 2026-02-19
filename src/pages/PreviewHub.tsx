import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/Logo';
import { Users, Building2, ArrowRight, Eye } from 'lucide-react';

export default function PreviewHub() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute inset-0 gradient-mesh opacity-30" />

      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl relative z-10">
        <div className="container py-4 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20">
            <Eye className="h-4 w-4 text-accent" />
            <span className="text-sm font-semibold text-accent">Preview Mode</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-5 tracking-tight">
            ClubPass Preview
          </h1>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto">
            Explore the complete ClubPass experience. Choose a role to see how the platform works.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Fan Experience */}
          <Card className="card-hover rounded-3xl border-border/50 overflow-hidden">
            <CardHeader className="text-center pt-10">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-5">
                <Users className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-2xl font-display">Fan Experience</CardTitle>
              <CardDescription className="text-base">
                See how fans discover clubs, enroll in loyalty programs, complete activities, and redeem rewards.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pb-8">
              <ul className="space-y-3 text-sm text-muted-foreground">
                {['Browse and select a club to join', 'View available activities', 'Check out rewards catalog'].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button 
                className="w-full gradient-stadium rounded-xl h-12 font-semibold"
                onClick={() => navigate('/fan/join?preview=fan')}
              >
                Explore as Fan
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Club Admin Experience */}
          <Card className="card-hover rounded-3xl border-border/50 overflow-hidden">
            <CardHeader className="text-center pt-10">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center mx-auto mb-5">
                <Building2 className="h-10 w-10 text-accent" />
              </div>
              <CardTitle className="text-2xl font-display">Club Admin Experience</CardTitle>
              <CardDescription className="text-base">
                See how clubs create loyalty programs, set up activities, and manage rewards for their fans.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pb-8">
              <ul className="space-y-3 text-sm text-muted-foreground">
                {['Create a loyalty program', 'Build fan activities', 'Set up rewards'].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button 
                className="w-full rounded-xl h-12 font-semibold"
                variant="outline"
                onClick={() => navigate('/club/dashboard?preview=club_admin')}
              >
                Explore as Club Admin
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
