import { Building2, Settings, CheckCircle, Users } from 'lucide-react';

const clubSteps = [
  {
    icon: Building2,
    step: '1',
    title: 'Create Your Club',
    description: 'Sign up and set up your club profile with logo, colors, and stadium info.',
  },
  {
    icon: CheckCircle,
    step: '2',
    title: 'Get Verified',
    description: 'Submit 2 of 3: official email domain, public link, or authority declaration.',
  },
  {
    icon: Settings,
    step: '3',
    title: 'Build Your Program',
    description: 'Create activities with points and verification methods. Add rewards to your catalog.',
  },
  {
    icon: Users,
    step: '4',
    title: 'Engage Fans',
    description: 'Publish your program and watch fans join, complete activities, and earn rewards.',
  },
];

const fanSteps = [
  {
    step: '1',
    title: 'Join Your Club',
    description: 'Search for your favorite verified club and join their loyalty program.',
  },
  {
    step: '2',
    title: 'Complete Activities',
    description: 'Scan QR codes, check in at games, take quizzes, and submit proofs.',
  },
  {
    step: '3',
    title: 'Earn Points',
    description: 'Accumulate points for every completed activity.',
  },
  {
    step: '4',
    title: 'Redeem Rewards',
    description: 'Exchange points for exclusive merchandise, experiences, and vouchers.',
  },
];

export function HowItWorks() {
  return (
    <section className="py-24 bg-secondary/50">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-display font-bold text-foreground mb-4">
            How It Works
          </h2>
        </div>

        {/* For Clubs */}
        <div className="mb-20">
          <h3 className="text-2xl font-display font-semibold text-foreground mb-8 text-center">
            For Clubs
          </h3>
          <div className="grid md:grid-cols-4 gap-8">
            {clubSteps.map((item, index) => (
              <div key={item.title} className="relative text-center">
                {index < clubSteps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary to-transparent" />
                )}
                <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full gradient-stadium text-primary-foreground font-display text-2xl font-bold mb-4 shadow-stadium">
                  {item.step}
                </div>
                <h4 className="text-lg font-semibold text-foreground mb-2">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* For Fans */}
        <div>
          <h3 className="text-2xl font-display font-semibold text-foreground mb-8 text-center">
            For Fans
          </h3>
          <div className="grid md:grid-cols-4 gap-8">
            {fanSteps.map((item, index) => (
              <div key={item.title} className="relative text-center">
                {index < fanSteps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-accent to-transparent" />
                )}
                <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full gradient-golden text-accent-foreground font-display text-2xl font-bold mb-4 shadow-golden">
                  {item.step}
                </div>
                <h4 className="text-lg font-semibold text-foreground mb-2">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
