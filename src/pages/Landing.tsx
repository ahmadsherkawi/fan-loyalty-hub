import { Link } from "react-router-dom";
import { BarChart3, Brain, CalendarCheck, MapPin, Megaphone, QrCode, Sparkles, Stamp, Store, Target, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PartyCard } from "@/components/cards";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nContext";
import { useUpcomingParties } from "@/lib/data";

export default function Landing() {
  const { t } = useI18n();
  const { data: parties } = useUpcomingParties(21);
  const fans = [
    { icon: MapPin, title: t("landing.fan1t"), body: t("landing.fan1b") },
    { icon: QrCode, title: t("landing.fan2t"), body: t("landing.fan2b") },
    { icon: Target, title: t("landing.fan3t"), body: t("landing.fan3b") },
    { icon: Stamp, title: t("landing.fan4t"), body: t("landing.fan4b") },
  ];
  const orgs = [
    { icon: Users, text: t("landing.org1") }, { icon: CalendarCheck, text: t("landing.org2") },
    { icon: Megaphone, text: t("landing.org3") }, { icon: BarChart3, text: t("landing.org4") },
  ];
  return (
    <AppShell>
      <section className="relative overflow-hidden rounded-3xl border bg-card bg-pitch-lines px-6 py-14 text-center md:py-24">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">{t("brand.tagline")}</p>
        <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-bold leading-tight md:text-6xl">{t("landing.headline")}</h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">{t("landing.sub")}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="rounded-full px-8"><Link to="/auth?mode=signup">{t("landing.cta")}</Link></Button>
          <Button asChild size="lg" variant="outline" className="rounded-full px-8"><Link to="/groups">{t("landing.browse")}</Link></Button>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold">{t("landing.forFans")}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {fans.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border bg-card p-5">
              <span className="inline-flex rounded-xl bg-primary/15 p-2 text-primary"><Icon className="h-5 w-5" /></span>
              <p className="mt-3 font-semibold">{title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-accent/30 bg-accent/5 p-6">
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-accent"><Sparkles className="h-4 w-4" />{t("landing.aiKicker")}</p>
          <h2 className="mt-2 text-2xl font-bold">{t("landing.aiTitle")}</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex gap-2"><Brain className="mt-0.5 h-4 w-4 shrink-0 text-accent" />{t("landing.ai1")}</li>
            <li className="flex gap-2"><Target className="mt-0.5 h-4 w-4 shrink-0 text-accent" />{t("landing.ai2")}</li>
            <li className="flex gap-2"><Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-accent" />{t("landing.ai3")}</li>
            <li className="flex gap-2"><Stamp className="mt-0.5 h-4 w-4 shrink-0 text-accent" />{t("landing.ai4")}</li>
          </ul>
        </div>
        <div className="rounded-3xl border bg-card p-6">
          <h2 className="text-2xl font-bold">{t("landing.forOrgs")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("landing.forOrgsSub")}</p>
          <ul className="mt-4 space-y-3 text-sm">
            {orgs.map(({ icon: Icon, text }) => <li key={text} className="flex gap-2"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{text}</li>)}
          </ul>
          <Button asChild className="mt-5 rounded-full"><Link to="/auth?mode=signup">{t("landing.orgCta")}</Link></Button>
        </div>
      </section>

      <section className="mt-4 rounded-3xl border bg-card p-6 md:flex md:items-center md:justify-between md:gap-6">
        <div>
          <p className="flex items-center gap-2 text-2xl font-bold"><Store className="h-6 w-6 text-primary" />{t("landing.forVenues")}</p>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">{t("landing.venuesSub")}</p>
        </div>
        <Button asChild variant="outline" className="mt-4 shrink-0 rounded-full md:mt-0"><Link to="/auth?mode=signup&next=/profile">{t("landing.venueCta")}</Link></Button>
      </section>

      {(parties ?? []).length > 0 && (
        <section className="mt-10">
          <h2 className="text-2xl font-bold">{t("landing.upcoming")}</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">{parties!.slice(0, 6).map((p) => <PartyCard key={p.id} party={p} />)}</div>
        </section>
      )}
      <p className="mt-10 text-center text-xs text-muted-foreground">{t("landing.footer")}</p>
    </AppShell>
  );
}
