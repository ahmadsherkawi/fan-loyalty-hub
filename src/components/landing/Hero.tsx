import { Button } from '@/components/ui/button';
import { ArrowRight, Shield, Users, Sparkles, Bot, Radio, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Hero() {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[95vh] flex items-center hero-gradient overflow-hidden">
      {/* Mesh gradient background */}
      <div className="absolute inset-0 gradient-mesh opacity-80" />

      {/* Animated orbs */}
      <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[120px] animate-pulse-slow" />
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-accent/6 rounded-full blur-[100px] animate-pulse-slow" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/4 rounded-full blur-[140px] animate-float" />

      <div className="container relative z-10 py-24">
        <div className="max-w-5xl mx-auto text-center space-y-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-full px-5 py-2.5 animate-fade-in">
            <Bot className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-white/80 tracking-wide">
              AI-Powered Fan Engagement Platform
            </span>
          </div>

          {/* Main heading */}
          <h1 className="text-6xl md:text-8xl font-display font-bold text-white leading-[0.95] tracking-tight animate-fade-in-up">
            Where Fans Become
            <br />
            <span className="text-gradient-hero">
              Part of the Game.
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '200ms' }}>
            Join live match analysis with AI experts, connect with fellow supporters, earn rewards, 
            and experience football like never before. The ultimate platform for passionate fans.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2 animate-fade-in" style={{ animationDelay: '400ms' }}>
            <Button
              size="lg"
              className="gradient-golden text-accent-foreground font-bold shadow-golden hover:opacity-90 transition-all duration-300 rounded-full px-8 text-base"
              onClick={() => navigate('/auth?role=fan')}
            >
              Join as a Fan
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 rounded-full px-8 text-base backdrop-blur-sm"
              onClick={() => navigate('/auth?role=club_admin')}
            >
              Register Your Club
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap justify-center gap-8 pt-16 animate-fade-in" style={{ animationDelay: '600ms' }}>
            {[
              { icon: Bot, label: 'AI Match Analysis' },
              { icon: Radio, label: 'Live Match Center' },
              { icon: Users, label: 'Fan Communities' },
              { icon: Trophy, label: 'Rewards & Points' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5 text-white/40">
                <div className="p-2 rounded-full bg-white/5">
                  <Icon className="h-4 w-4 text-accent" />
                </div>
                <span className="text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
