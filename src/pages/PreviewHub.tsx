import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/Logo';
import { Users, Building2, ArrowRight, Eye } from 'lucide-react';

export default function PreviewHub() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container py-4 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-warning/10 border border-warning/20">
            <Eye className="h-4 w-4 text-warning" />
            <span className="text-sm font-medium text-warning">Preview Mode</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-16">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h1 className="text-4xl font-display font-bold text-foreground mb-4">
            ClubPass Preview
          </h1>
          <p className="text-lg text-muted-foreground">
            Explore the complete ClubPass experience. Choose a role to see how the platform works.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Fan Experience */}
          <Card className="card-hover">
            <CardHeader className="text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Fan Experience</CardTitle>
              <CardDescription>
                See how fans discover clubs, enroll in loyalty programs, complete activities, and redeem rewards.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  Browse and select a club to join
                </li>
                <li className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  View available activities
                </li>
                <li className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  Check out rewards catalog
                </li>
              </ul>
              <Button 
                className="w-full gradient-stadium"
                onClick={() => navigate('/fan/join?preview=fan')}
              >
                Explore as Fan
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Club Admin Experience */}
          <Card className="card-hover">
            <CardHeader className="text-center">
              <div className="h-16 w-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-8 w-8 text-accent" />
              </div>
              <CardTitle className="text-2xl">Club Admin Experience</CardTitle>
              <CardDescription>
                See how clubs create loyalty programs, set up activities, and manage rewards for their fans.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-accent" />
                  Create a loyalty program
                </li>
                <li className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-accent" />
                  Build fan activities
                </li>
                <li className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-accent" />
                  Set up rewards
                </li>
              </ul>
              <Button 
                className="w-full"
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
