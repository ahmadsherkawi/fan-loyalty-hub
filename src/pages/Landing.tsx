import { Link } from "react-router-dom";
import { MapPin, QrCode, Target } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nContext";

export default function Landing() {
  const { t } = useI18n();
  const features = [
    { icon: MapPin, text: t("landing.f1") },
    { icon: QrCode, text: t("landing.f2") },
    { icon: Target, text: t("landing.f3") },
  ];
  return (
    <AppShell>
      <section className="relative overflow-hidden rounded-3xl border bg-card bg-pitch-lines px-6 py-16 text-center md:py-24">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">{t("brand.tagline")}</p>
        <h1 className="mx-auto mt-4 max-w-2xl text-4xl font-bold leading-tight md:text-6xl">{t("landing.headline")}</h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">{t("landing.sub")}</p>
        <Button asChild size="lg" className="mt-8 rounded-full px-8"><Link to="/auth?mode=signup">{t("landing.cta")}</Link></Button>
      </section>
      <section className="mt-6 grid gap-3 md:grid-cols-3">
        {features.map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-start gap-3 rounded-2xl border bg-card p-5">
            <span className="rounded-xl bg-primary/15 p-2 text-primary"><Icon className="h-5 w-5" /></span>
            <p className="text-sm font-medium">{text}</p>
          </div>
        ))}
      </section>
    </AppShell>
  );
}
