import { 
  Bot, 
  Radio, 
  Users, 
  MessageCircle, 
  Trophy, 
  Gift, 
  Zap,
  Shield,
  TrendingUp,
  Calendar,
  Sparkles
} from 'lucide-react';

const features = [
  {
    icon: Bot,
    title: 'AI Analysis Rooms',
    description: 'Chat with Alex, our AI football analyst, during live matches. Get expert insights, tactical analysis, and predictions in real-time.',
    gradient: 'from-primary/20 to-primary/5',
    badge: 'NEW',
  },
  {
    icon: Radio,
    title: 'Live Match Center',
    description: 'Follow live scores, fixtures, and results for your club. Real-time updates with AI-powered match predictions and analysis.',
    gradient: 'from-red-500/20 to-red-500/5',
    badge: 'LIVE',
  },
  {
    icon: Users,
    title: 'Fan Communities',
    description: 'Connect with fellow supporters in dedicated club spaces. Share chants, discuss matches, and build lasting friendships.',
    gradient: 'from-accent/20 to-accent/5',
  },
  {
    icon: MessageCircle,
    title: 'Chants & Social',
    description: 'Create and share football chants, cheer for others, and earn points. Express your passion and get recognized by the community.',
    gradient: 'from-purple-500/20 to-purple-500/5',
  },
  {
    icon: Trophy,
    title: 'Loyalty Points',
    description: 'Earn points for every interaction — attending matches, creating chants, participating in activities. Climb the leaderboard!',
    gradient: 'from-yellow-500/20 to-yellow-500/5',
  },
  {
    icon: Gift,
    title: 'Exclusive Rewards',
    description: 'Redeem points for club merchandise, match tickets, VIP experiences, and exclusive digital collectibles.',
    gradient: 'from-pink-500/20 to-pink-500/5',
  },
  {
    icon: TrendingUp,
    title: 'AI Match Predictions',
    description: 'Get data-driven predictions powered by team form, head-to-head stats, and live match analysis.',
    gradient: 'from-blue-500/20 to-blue-500/5',
    badge: 'AI',
  },
  {
    icon: Calendar,
    title: 'Match Activities',
    description: 'QR code check-ins, location verification, polls, and quizzes. Engage on match days and earn bonus points.',
    gradient: 'from-green-500/20 to-green-500/5',
  },
];

export function Features() {
  return (
    <section className="py-28 bg-background relative">
      <div className="absolute inset-0 gradient-mesh opacity-30" />
      
      <div className="container relative">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary mb-4 tracking-wide uppercase">
            <Sparkles className="h-4 w-4" />
            Features
          </span>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-5 tracking-tight">
            More Than Just Loyalty
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            A complete fan engagement platform powered by AI. From live match analysis to 
            community building — everything a passionate football fan needs.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group bento-card animate-fade-in relative"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              {/* Badge for new features */}
              {feature.badge && (
                <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-primary text-[10px] font-bold text-primary-foreground rounded-full">
                  {feature.badge}
                </div>
              )}
              <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-500`}>
                <feature.icon className="h-6 w-6 text-foreground" />
              </div>
              <h3 className="text-base font-bold text-foreground mb-2 tracking-tight">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
