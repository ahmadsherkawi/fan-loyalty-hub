import { 
  QrCode, 
  MapPin, 
  Smartphone, 
  FileCheck, 
  Gift, 
  Shield, 
  Zap,
  Trophy
} from 'lucide-react';

const features = [
  {
    icon: Shield,
    title: 'Club Verification',
    description: 'Only verified football clubs can publish programs. We ensure authenticity through official domains, public links, and declarations.',
    gradient: 'from-primary/20 to-primary/5',
  },
  {
    icon: QrCode,
    title: 'QR Code Activities',
    description: 'Generate unique QR codes for match-day events. Fans scan to earn points instantly.',
    gradient: 'from-accent/20 to-accent/5',
  },
  {
    icon: MapPin,
    title: 'Location Check-ins',
    description: 'Enable GPS-based check-ins at your stadium. Fans must be present to claim their rewards.',
    gradient: 'from-blue-500/20 to-blue-500/5',
  },
  {
    icon: Smartphone,
    title: 'In-App Challenges',
    description: 'Create polls, quizzes, and interactive activities that fans can complete directly in the app.',
    gradient: 'from-purple-500/20 to-purple-500/5',
  },
  {
    icon: FileCheck,
    title: 'Manual Proof Submission',
    description: 'Let fans submit evidence for special activities. Club admins review and approve claims.',
    gradient: 'from-orange-500/20 to-orange-500/5',
  },
  {
    icon: Gift,
    title: 'Reward Catalog',
    description: 'Offer exclusive merchandise, experiences, and vouchers. Control quantities and redemption methods.',
    gradient: 'from-pink-500/20 to-pink-500/5',
  },
  {
    icon: Zap,
    title: 'Fraud Prevention',
    description: 'Built-in frequency rules, unique codes, and time windows prevent abuse and ensure fairness.',
    gradient: 'from-red-500/20 to-red-500/5',
  },
  {
    icon: Trophy,
    title: 'Points System',
    description: 'Customize your points currency name. Track balances and ensure points never go negative.',
    gradient: 'from-accent/20 to-accent/5',
  },
];

export function Features() {
  return (
    <section className="py-28 bg-background relative">
      <div className="absolute inset-0 gradient-mesh opacity-30" />
      
      <div className="container relative">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary mb-4 tracking-wide uppercase">
            <Zap className="h-4 w-4" />
            Features
          </span>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-5 tracking-tight">
            Everything Your Club Needs
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            A complete loyalty platform designed specifically for football clubs. 
            No payments, no analytics dashboards, no complexity — just fan engagement.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group bento-card animate-fade-in"
              style={{ animationDelay: `${index * 80}ms` }}
            >
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
