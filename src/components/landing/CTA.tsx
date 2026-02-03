import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function CTA() {
  const navigate = useNavigate();

  return (
    <section className="py-24 hero-gradient relative overflow-hidden">
      <div className="absolute inset-0 stadium-pattern opacity-30" />
      
      <div className="container relative z-10">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-primary-foreground">
            Ready to Join ClubPass?
          </h2>
          <p className="text-xl text-primary-foreground/80">
            Join the open platform where verified clubs create authentic connections with their supporters.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              size="lg"
              className="gradient-golden text-accent-foreground font-semibold shadow-golden hover:opacity-90 transition-opacity"
              onClick={() => navigate('/auth?role=club_admin')}
            >
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
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
