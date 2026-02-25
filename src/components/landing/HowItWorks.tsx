import { Bot, Users, Trophy, MessageCircle, ArrowRight } from 'lucide-react';

const fanSteps = [
  {
    icon: Users,
    step: '01',
    title: 'Join Your Club',
    description: 'Find and join your favorite club\'s community. Connect with thousands of fellow supporters.',
  },
  {
    icon: Bot,
    step: '02',
    title: 'Watch & Analyze',
    description: 'Follow live matches in our Match Center. Join AI Analysis Rooms and chat with Alex for expert insights.',
  },
  {
    icon: MessageCircle,
    step: '03',
    title: 'Engage & Create',
    description: 'Share chants, participate in discussions, complete activities, and cheer with the community.',
  },
  {
    icon: Trophy,
    step: '04',
    title: 'Earn & Redeem',
    description: 'Accumulate points for all activities. Redeem for exclusive rewards and climb the leaderboard.',
  },
];

const clubSteps = [
  {
    step: '01',
    title: 'Register & Verify',
    description: 'Create your club profile with logo, colors, and stadium info. Get verified to unlock all features.',
  },
  {
    step: '02',
    title: 'Build Your Program',
    description: 'Create activities with points and verification methods. Set up your rewards catalog.',
  },
  {
    step: '03',
    title: 'Engage Your Fans',
    description: 'Fans join automatically. Watch your community grow with real-time analytics.',
  },
  {
    step: '04',
    title: 'Foster Loyalty',
    description: 'Reward your most passionate supporters. Build lasting relationships with your fanbase.',
  },
];

const highlights = [
  { value: '10K+', label: 'Active Fans' },
  { value: '50+', label: 'Verified Clubs' },
  { value: '100K+', label: 'Points Earned' },
  { value: '1K+', label: 'AI Analyses' },
];

export function HowItWorks() {
  return (
    <section className="py-28 bg-secondary/30 relative overflow-hidden">
      <div className="absolute inset-0 gradient-mesh opacity-20" />

      <div className="container relative">
        <div className="text-center mb-20">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary mb-4 tracking-wide uppercase">
            How It Works
          </span>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground tracking-tight mb-5">
            Your Journey Starts Here
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Whether you're a passionate fan or a club looking to engage supporters, 
            getting started is simple.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
          {highlights.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl md:text-4xl font-display font-bold text-primary mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* For Fans */}
        <div className="mb-24">
          <h3 className="text-xl font-display font-bold text-foreground mb-12 text-center">
            <span className="inline-flex items-center gap-3 bg-accent/10 rounded-full px-6 py-2.5">
              <Users className="h-5 w-5 text-accent" />
              For Fans
            </span>
          </h3>
          <div className="grid md:grid-cols-4 gap-6">
            {fanSteps.map((item, index) => (
              <div key={item.title} className="relative group">
                {index < fanSteps.length - 1 && (
                  <div className="hidden md:flex absolute top-10 left-[60%] w-[80%] h-px items-center">
                    <div className="w-full h-px bg-gradient-to-r from-accent/30 to-transparent" />
                    <ArrowRight className="h-4 w-4 text-accent/30 absolute right-0" />
                  </div>
                )}
                <div className="bento-card text-center h-full">
                  <div className="flex justify-center mb-4">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center">
                      <item.icon className="h-7 w-7 text-accent" />
                    </div>
                  </div>
                  <div className="text-3xl font-display font-bold text-accent/20 mb-2">
                    {item.step}
                  </div>
                  <h4 className="text-base font-bold text-foreground mb-2">{item.title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* For Clubs */}
        <div>
          <h3 className="text-xl font-display font-bold text-foreground mb-12 text-center">
            <span className="inline-flex items-center gap-3 bg-primary/10 rounded-full px-6 py-2.5">
              <Trophy className="h-5 w-5 text-primary" />
              For Clubs
            </span>
          </h3>
          <div className="grid md:grid-cols-4 gap-6">
            {clubSteps.map((item, index) => (
              <div key={item.title} className="relative group">
                {index < clubSteps.length - 1 && (
                  <div className="hidden md:flex absolute top-10 left-[60%] w-[80%] h-px items-center">
                    <div className="w-full h-px bg-gradient-to-r from-primary/30 to-transparent" />
                    <ArrowRight className="h-4 w-4 text-primary/30 absolute right-0" />
                  </div>
                )}
                <div className="bento-card text-center h-full">
                  <div className="text-3xl font-display font-bold text-primary/20 mb-2">
                    {item.step}
                  </div>
                  <h4 className="text-base font-bold text-foreground mb-2">{item.title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
