import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, CalendarCheck, Megaphone, QrCode, Stamp, Store, Target, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PartyCard } from "@/components/cards";
import { FixtureScoreboard } from "@/components/match/FixtureScoreboard";
import { AiTag, IconDot, SeeAll } from "@/components/common/bits";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nContext";
import { loc, useUpcomingParties } from "@/lib/data";

export default function Landing() {
  const { t, lang } = useI18n();
  const { data: parties } = useUpcomingParties(21);
  const featured = (parties ?? []).find((p) => p.fixture);
  const steps = [
    { icon: Users, title: t("landing.fan1t"), body: t("landing.fan1b") },
    { icon: QrCode, title: t("landing.fan2t"), body: t("landing.fan2b") },
    { icon: Stamp, title: t("landing.fan4t"), body: t("landing.fan4b") },
  ];

  return (
    <AppShell wide>
      {/* Hero */}
      <section className="relative -mx-4 -mt-5 overflow-hidden px-4 pb-10 pt-10 md:-mt-8 md:pt-16">
        <div className="absolute inset-0 bg-grid [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" aria-hidden />
        <div className="relative grid items-center gap-10 md:grid-cols-[1.1fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-semibold shadow-card">
              <span className="h-2 w-2 rounded-full bg-primary" />{t("landing.pill")}
            </span>
            <h1 className="mt-5 text-[40px] font-extrabold leading-[1.02] md:text-7xl">
              {t("landing.h1a")}<br />
              <span className="relative inline-block">
                <span className="relative z-10">{t("landing.h1b")}</span>
                <span className="absolute inset-x-0 bottom-1 z-0 h-3 rounded-sm bg-primary/70 md:bottom-2 md:h-5" aria-hidden />
              </span>
            </h1>
            <p className="mt-5 max-w-md text-base text-muted-foreground md:text-lg">{t("landing.sub")}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link to="/auth?mode=signup">{t("landing.cta")}<ArrowRight className="rtl:rotate-180" /></Link></Button>
              <Button asChild size="lg" variant="outline"><Link to="/groups">{t("landing.browse")}</Link></Button>
            </div>
          </div>

          {/* A real upcoming watch party, so visitors see the product instead of reading about it */}
          {featured?.fixture && (
            <Link to={`/party/${featured.id}`} className="block transition-transform hover:-translate-y-1">
              <FixtureScoreboard fixture={featured.fixture} footer={
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{loc(featured.venue, "name", lang)}</p>
                    <p className="truncate text-xs text-white/60">{loc(featured.group, "name", lang)}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">{t("landing.seeParty")}</span>
                </div>
              } />
            </Link>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="mt-2">
        <p className="eyebrow">{t("landing.how")}</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, body }, i) => (
            <div key={title} className="card flex gap-4 p-5">
              <span className="scoreboard flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-xl font-bold text-background">{i + 1}</span>
              <div>
                <p className="flex items-center gap-2 font-bold"><Icon className="h-4 w-4 text-brand" />{title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bento: match-day features */}
      <section className="mt-12">
        <h2 className="text-2xl font-extrabold md:text-3xl">{t("landing.matchday")}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3 md:grid-rows-2">
          <div className="card relative overflow-hidden bg-ai-soft p-6 md:col-span-2 md:row-span-2">
            <AiTag />
            <h3 className="mt-3 max-w-md text-2xl font-extrabold md:text-3xl">{t("landing.aiTitle")}</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">{t("landing.ai1")}</p>
            <div className="mt-6 max-w-sm space-y-2">
              <div className="ms-auto w-fit max-w-[85%] rounded-2xl rounded-ee-md bg-foreground px-3.5 py-2 text-sm text-background">{t("landing.chatQ")}</div>
              <div className="w-fit max-w-[90%] rounded-2xl rounded-es-md bg-card px-3.5 py-2 text-sm shadow-card">{t("landing.chatA")}</div>
            </div>
          </div>
          <div className="card p-5">
            <IconDot tone="brand"><Target /></IconDot>
            <p className="mt-3 font-bold">{t("landing.fan3t")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("landing.fan3b")}</p>
          </div>
          <div className="card p-5">
            <IconDot tone="gold"><Stamp /></IconDot>
            <p className="mt-3 font-bold">{t("landing.quizT")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("landing.ai2")}</p>
          </div>
        </div>
      </section>

      {/* Organisers + venues */}
      <section className="mt-12 grid gap-3 md:grid-cols-2">
        <div className="rounded-3xl bg-foreground p-6 text-background md:p-8">
          <p className="eyebrow !text-background/60">{t("landing.forOrgs")}</p>
          <h3 className="mt-2 text-2xl font-extrabold">{t("landing.forOrgsSub")}</h3>
          <ul className="mt-5 space-y-3 text-sm">
            {[{ icon: Users, text: t("landing.org1") }, { icon: CalendarCheck, text: t("landing.org2") }, { icon: Megaphone, text: t("landing.org3") }, { icon: BarChart3, text: t("landing.org4") }].map(({ icon: Icon, text }) => (
              <li key={text} className="flex gap-3"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{text}</li>
            ))}
          </ul>
          <Button asChild className="mt-6"><Link to="/auth?mode=signup">{t("landing.orgCta")}</Link></Button>
        </div>
        <div className="card flex flex-col p-6 md:p-8">
          <p className="eyebrow">{t("landing.forVenues")}</p>
          <h3 className="mt-2 text-2xl font-extrabold">{t("landing.venuesSub")}</h3>
          <div className="mt-auto flex items-center gap-3 pt-6">
            <IconDot><Store /></IconDot>
            <Button asChild variant="outline"><Link to="/auth?mode=signup&next=/profile">{t("landing.venueCta")}</Link></Button>
          </div>
        </div>
      </section>

      {(parties ?? []).length > 0 && (
        <section className="mt-12">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-2xl font-extrabold">{t("landing.upcoming")}</h2>
            <SeeAll to="/groups" label={t("common.seeAll")} />
          </div>
          <div className="grid gap-3 md:grid-cols-3">{parties!.slice(0, 3).map((p) => <PartyCard key={p.id} party={p} />)}</div>
        </section>
      )}
      <p className="mx-auto mt-12 max-w-xl text-center text-xs text-muted-foreground">{t("landing.footer")}</p>
    </AppShell>
  );
}
