import { Building2, Settings, CheckCircle, Users } from 'lucide-react';

const clubSteps = [
  {
    icon: Building2,
    step: '01',
    title: 'Create Your Club',
    description: 'Sign up and set up your club profile with logo, colors, and stadium info.',
  },
  {
    icon: CheckCircle,
    step: '02',
    title: 'Get Verified',
    description: 'Submit 2 of 3: official email domain, public link, or authority declaration.',
  },
  {
    icon: Settings,
    step: '03',
    title: 'Build Your Program',
    description: 'Create activities with points and verification methods. Add rewards to your catalog.',
  },
  {
    icon: Users,
    step: '04',
    title: 'Engage Fans',
    description: 'Publish your program and watch fans join, complete activities, and earn rewards.',
  },
];

const fanSteps = [
  {
    step: '01',
    title: 'Join Your Club',
    description: 'Search for your favorite verified club and join their loyalty program.',
  },
  {
    step: '02',
    title: 'Complete Activities',
    description: 'Scan QR codes, check in at games, take quizzes, and submit proofs.',
  },
  {
    step: '03',
    title: 'Earn Points',
    description: 'Accumulate points for every completed activity.',
  },
  {
    step: '04',
    title: 'Redeem Rewards',
    description: 'Exchange points for exclusive merchandise, experiences, and vouchers.',
  },
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
          <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground tracking-tight">
            Simple Steps to Start
          </h2>
        </div>

        {/* For Clubs */}
        <div className="mb-24">
          <h3 className="text-xl font-display font-bold text-foreground mb-12 text-center">
            <span className="inline-flex items-center gap-3 bg-primary/10 rounded-full px-6 py-2.5">
              <Building2 className="h-5 w-5 text-primary" />
              For Clubs
            </span>
          </h3>
          <div className="grid md:grid-cols-4 gap-6">
            {clubSteps.map((item, index) => (
              <div key={item.title} className="relative group">
                {index < clubSteps.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-px bg-gradient-to-r from-primary/30 to-transparent" />
                )}
                <div className="bento-card text-center">
                  <div className="text-4xl font-display font-bold text-primary/20 mb-3">
                    {item.step}
                  </div>
                  <h4 className="text-base font-bold text-foreground mb-2">{item.title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* For Fans */}
        <div>
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
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-px bg-gradient-to-r from-accent/30 to-transparent" />
                )}
                <div className="bento-card text-center">
                  <div className="text-4xl font-display font-bold text-accent/20 mb-3">
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
