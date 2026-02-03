import { Button } from '@/components/ui/button';
import { ArrowRight, Shield, Users, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Hero() {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[90vh] flex items-center hero-gradient overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 stadium-pattern opacity-50" />
      
      {/* Animated circles */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-slow" />

      <div className="container relative z-10 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/20 backdrop-blur-sm border border-primary/30 rounded-full px-4 py-2">
            <Star className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-primary-foreground/90">
              The Open Football Loyalty Platform
            </span>
          </div>

          {/* Main heading */}
          <h1 className="text-5xl md:text-7xl font-display font-bold text-primary-foreground leading-tight">
            Unite Your Fans.
            <br />
            <span className="bg-gradient-to-r from-accent to-accent/70 bg-clip-text text-transparent">
              Reward Their Passion.
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-xl text-primary-foreground/80 max-w-2xl mx-auto">
            Create verified loyalty programs for your football club. Engage fans with activities, 
            award points, and offer exclusive rewards — all on one open platform.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              size="lg"
              className="gradient-golden text-accent-foreground font-semibold shadow-golden hover:opacity-90 transition-opacity"
              onClick={() => navigate('/auth?role=club_admin')}
            >
              Register Your Club
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              className="gradient-golden text-accent-foreground font-semibold shadow-golden hover:opacity-90 transition-opacity"
              onClick={() => navigate('/auth?role=fan')}
            >
              Join as a Fan
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap justify-center gap-8 pt-12">
            <div className="flex items-center gap-2 text-primary-foreground/70">
              <Shield className="h-5 w-5 text-accent" />
              <span className="text-sm">Verified Clubs Only</span>
            </div>
            <div className="flex items-center gap-2 text-primary-foreground/70">
              <Users className="h-5 w-5 text-accent" />
              <span className="text-sm">Self-Serve Onboarding</span>
            </div>
            <div className="flex items-center gap-2 text-primary-foreground/70">
              <Star className="h-5 w-5 text-accent" />
              <span className="text-sm">Free Forever</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
