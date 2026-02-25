import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Bot, Users, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function CTA() {
  const navigate = useNavigate();

  return (
    <section className="py-28 hero-gradient relative overflow-hidden">
      <div className="absolute inset-0 gradient-mesh opacity-60" />
      
      {/* Animated background elements */}
      <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-accent/10 rounded-full blur-[100px] animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[120px] animate-pulse-slow" />
      
      <div className="container relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-full px-5 py-2">
            <Zap className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-white/70">Free to join • No credit card required</span>
          </div>

          <h2 className="text-4xl md:text-6xl font-display font-bold text-white tracking-tight leading-tight">
            Ready to Experience
            <br />
            <span className="text-gradient-hero">Football Like Never Before?</span>
          </h2>
          
          <p className="text-lg text-white/50 max-w-xl mx-auto">
            Join thousands of passionate fans analyzing matches with AI, connecting with communities, 
            and earning rewards for their loyalty.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              size="lg"
              className="gradient-golden text-accent-foreground font-bold shadow-golden hover:opacity-90 transition-all duration-300 rounded-full px-8 text-base"
              onClick={() => navigate('/auth?role=fan')}
            >
              <Users className="mr-2 h-5 w-5" />
              Join as a Fan
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 rounded-full px-8 text-base backdrop-blur-sm"
              onClick={() => navigate('/auth?role=club_admin')}
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Register Your Club
            </Button>
          </div>

          {/* Feature highlights */}
          <div className="flex flex-wrap justify-center gap-6 pt-12">
            <div className="flex items-center gap-2 text-white/40">
              <Bot className="h-5 w-5 text-accent" />
              <span className="text-sm">AI Match Analysis</span>
            </div>
            <div className="flex items-center gap-2 text-white/40">
              <Users className="h-5 w-5 text-accent" />
              <span className="text-sm">Fan Communities</span>
            </div>
            <div className="flex items-center gap-2 text-white/40">
              <Sparkles className="h-5 w-5 text-accent" />
              <span className="text-sm">Live Match Center</span>
            </div>
            <div className="flex items-center gap-2 text-white/40">
              <Zap className="h-5 w-5 text-accent" />
              <span className="text-sm">Earn Rewards</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
