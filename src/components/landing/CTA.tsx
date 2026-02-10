import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function CTA() {
  const navigate = useNavigate();

  return (
    <section className="py-28 hero-gradient relative overflow-hidden">
      <div className="absolute inset-0 gradient-mesh opacity-60" />
      
      <div className="container relative z-10">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-full px-5 py-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-white/70">Get started today</span>
          </div>

          <h2 className="text-4xl md:text-6xl font-display font-bold text-white tracking-tight leading-tight">
            Ready to Join
            <br />
            <span className="text-gradient-hero">ClubPass?</span>
          </h2>
          <p className="text-lg text-white/50 max-w-xl mx-auto">
            Join the open platform where verified clubs create authentic connections with their supporters.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              size="lg"
              className="gradient-golden text-accent-foreground font-bold shadow-golden hover:opacity-90 transition-all duration-300 rounded-full px-8"
              onClick={() => navigate('/auth?role=club_admin')}
            >
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 rounded-full px-8 backdrop-blur-sm"
              onClick={() => navigate('/explore')}
            >
              Explore Clubs
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
