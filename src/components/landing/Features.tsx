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
  },
  {
    icon: QrCode,
    title: 'QR Code Activities',
    description: 'Generate unique QR codes for match-day events. Fans scan to earn points instantly.',
  },
  {
    icon: MapPin,
    title: 'Location Check-ins',
    description: 'Enable GPS-based check-ins at your stadium. Fans must be present to claim their rewards.',
  },
  {
    icon: Smartphone,
    title: 'In-App Challenges',
    description: 'Create polls, quizzes, and interactive activities that fans can complete directly in the app.',
  },
  {
    icon: FileCheck,
    title: 'Manual Proof Submission',
    description: 'Let fans submit evidence for special activities. Club admins review and approve claims.',
  },
  {
    icon: Gift,
    title: 'Reward Catalog',
    description: 'Offer exclusive merchandise, experiences, and vouchers. Control quantities and redemption methods.',
  },
  {
    icon: Zap,
    title: 'Fraud Prevention',
    description: 'Built-in frequency rules, unique codes, and time windows prevent abuse and ensure fairness.',
  },
  {
    icon: Trophy,
    title: 'Points System',
    description: 'Customize your points currency name. Track balances and ensure points never go negative.',
  },
];

export function Features() {
  return (
    <section className="py-24 bg-background">
      <div className="container">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl font-display font-bold text-foreground mb-4">
            Everything Your Club Needs
          </h2>
          <p className="text-lg text-muted-foreground">
            A complete loyalty platform designed specifically for football clubs. 
            No payments, no analytics dashboards, no complexity — just fan engagement.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group p-6 bg-card rounded-xl border border-border card-hover"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="h-12 w-12 rounded-lg gradient-stadium flex items-center justify-center mb-4 group-hover:shadow-stadium transition-shadow">
                <feature.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
