import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BarChart3, CalendarCheck, Gift, MapPin, Megaphone, QrCode, Search, Stamp, Store, Target, TicketCheck, Tv, Users } from "lucide-react";
import { TeamBadge } from "@/components/brand/TeamBadge";
import { AppShell } from "@/components/layout/AppShell";
import { PartyCard } from "@/components/cards";
import { FixtureScoreboard } from "@/components/match/FixtureScoreboard";
import { AiTag, IconDot, SeeAll } from "@/components/common/bits";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { compLabel } from "@/lib/competitions";
import { FIXTURE_SELECT, loc, useUpcomingParties, type FixtureWithTeams } from "@/lib/data";

// Priority order: one game from each, the first six competitions that have a game coming up
const TOURNAMENTS = ["AGC"];
const BIG = ["AGC", "PL", "CL", "UPL", "ULC", "SPL", "PD", "ACL", "SA", "BL1", "FL1"];

/** Live numbers for the hero: how many venues fans can find right now. */
function useDirectoryStats() {
  return useQuery({
    queryKey: ["landing-stats"],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { count } = await supabase.from("venues").select("id", { count: "exact", head: true }).eq("is_listed", true).eq("is_demo", false);
      return { venues: count ?? 0 };
    },
  });
}

/** The next big matches (3 weeks ahead, so international breaks never leave it empty), with how many venues are showing each. */
function useBigGames() {
  return useQuery({
    queryKey: ["landing-big-games"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const now = new Date();
      const { data } = await supabase.from("fixtures").select(FIXTURE_SELECT)
        .in("competition_code", BIG).gte("kickoff_at", now.toISOString()).lte("kickoff_at", new Date(now.getTime() + 21 * 864e5).toISOString())
        .order("kickoff_at").limit(400);
      const all = (data ?? []) as unknown as FixtureWithTeams[];
      // The next game of each competition, most-watched competitions first, then shown in kick-off order
      // A tournament's knockout games (Gulf Cup) all show while they are this week; other competitions one game each
      const soon = now.getTime() + 4 * 864e5;
      const cup = all.filter((f) => TOURNAMENTS.includes(f.competition_code ?? "") && new Date(f.kickoff_at).getTime() < soon);
      const pick = [...cup, ...BIG.filter((c) => !cup.some((f) => f.competition_code === c)).map((c) => all.find((f) => f.competition_code === c))]
        .filter((f): f is FixtureWithTeams => !!f).slice(0, 6)
        .sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at));
      const ids = pick.map((f) => f.id);
      const { data: sc } = ids.length ? await supabase.from("venue_screenings").select("fixture_id").in("fixture_id", ids) : { data: [] };
      const showing = new Map<string, number>();
      (sc ?? []).forEach((r) => showing.set(r.fixture_id, (showing.get(r.fixture_id) ?? 0) + 1));
      return pick.map((f) => ({ fixture: f, showing: showing.get(f.id) ?? 0 }));
    },
  });
}

export default function Landing() {
  const { t, lang } = useI18n();
  const { data: parties } = useUpcomingParties(21);
  const featured = (parties ?? []).find((p) => p.fixture);
  const { data: stats } = useDirectoryStats();
  const { data: games } = useBigGames();
  const { formatDateTime } = useI18n();
  const name = (f: FixtureWithTeams, side: "home" | "away") => (lang === "ar" && f[`${side}_team`]?.name_ar) || f[`${side}_team_name`];
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
            <p className="mt-5 max-w-md text-base text-muted-foreground md:text-lg">{t("landing.sub2")}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link to="/auth?mode=signup">{t("landing.cta")}<ArrowRight className="rtl:rotate-180" /></Link></Button>
              <Button asChild size="lg" variant="outline"><Link to="/venues"><Search />{t("landing.whereToWatch")}</Link></Button>
            </div>
            {/* Live proof, straight from the directory */}
            <div className="mt-6 space-y-1 text-sm">
              {stats?.venues ? <p className="flex items-center gap-1.5 font-semibold"><MapPin className="h-4 w-4 text-brand" />{t("landing.statVenues", { n: stats.venues })}</p> : null}
              <p className="text-muted-foreground">{t("landing.statLeagues")}</p>
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

      {/* This week's big games: proof the site works before anyone signs up */}
      {(games ?? []).length > 0 && (
        <section className="mb-12">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-extrabold md:text-3xl">{t("landing.bigGames")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("landing.bigGamesSub")}</p>
            </div>
            <SeeAll to="/matches" label={t("common.seeAll")} />
          </div>
          <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
            {games!.map(({ fixture: f, showing }) => (
              <Link key={f.id} to={`/match/${f.id}`} className="card card-hover w-[78%] shrink-0 snap-start p-4 md:w-auto">
                <p className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="truncate font-semibold">{compLabel(t, f.competition_code, f.competition)}</span>
                  <span className="shrink-0">{formatDateTime(f.kickoff_at, { weekday: "short", hour: "2-digit", minute: "2-digit" })}</span>
                </p>
                <div className="mt-3 space-y-2">
                  {(["home", "away"] as const).map((side) => (
                    <div key={side} className="flex items-center gap-2.5">
                      <TeamBadge shortName={f[`${side}_team`]?.short_name || f[`${side}_team_name`].slice(0, 3)} primary={f[`${side}_team`]?.primary_color} secondary={f[`${side}_team`]?.secondary_color} size="sm" />
                      <span className="truncate font-bold">{name(f, side)}</span>
                    </div>
                  ))}
                </div>
                <p className={`mt-3 flex items-center gap-1.5 text-xs font-semibold ${showing ? "text-brand" : "text-muted-foreground"}`}>
                  <Tv className="h-3.5 w-3.5" />{showing === 1 ? t("landing.showingAt1") : showing ? t("landing.showingAt", { n: showing }) : t("landing.findWhere")}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

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

      {/* Organisers + venues */}
      <section className="mt-12 grid gap-3 md:grid-cols-2">
        <div className="card flex flex-col p-6 md:p-8">
          <p className="eyebrow">{t("landing.forVenues")}</p>
          <h3 className="mt-2 text-2xl font-extrabold">{t("landing.venueClaimTitle")}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{t("landing.venueClaimSub")}</p>
          <ul className="mt-5 space-y-3 text-sm">
            {[{ icon: Tv, text: t("landing.venue1") }, { icon: TicketCheck, text: t("landing.venue2") }, { icon: Gift, text: t("landing.venue3") }].map(({ icon: Icon, text }) => (
              <li key={text} className="flex gap-3"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand" />{text}</li>
            ))}
          </ul>
          <div className="mt-auto flex flex-wrap items-center gap-3 pt-6">
            <Button asChild><Link to="/claim"><Store />{t("landing.findYourVenue")}</Link></Button>
            <Link to="/auth?mode=signup&type=venue" className="text-sm font-semibold text-muted-foreground hover:text-foreground">{t("landing.venueNew")}</Link>
          </div>
        </div>
        <div className="rounded-3xl bg-foreground p-6 text-background md:p-8">
          <p className="eyebrow !text-background/60">{t("landing.forOrgs")}</p>
          <h3 className="mt-2 text-2xl font-extrabold">{t("landing.forOrgsSub")}</h3>
          <ul className="mt-5 space-y-3 text-sm">
            {[{ icon: Users, text: t("landing.org1") }, { icon: CalendarCheck, text: t("landing.org2") }, { icon: Megaphone, text: t("landing.org3") }, { icon: BarChart3, text: t("landing.org4") }].map(({ icon: Icon, text }) => (
              <li key={text} className="flex gap-3"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{text}</li>
            ))}
          </ul>
          <Button asChild className="mt-6"><Link to="/auth?mode=signup&next=/groups">{t("landing.orgCta")}</Link></Button>
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

      {(parties ?? []).length > 0 && (
        <section className="mt-12">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-2xl font-extrabold">{t("landing.upcoming")}</h2>
            <SeeAll to="/groups" label={t("common.seeAll")} />
          </div>
          <div className="grid gap-3 md:grid-cols-3">{parties!.slice(0, 3).map((p) => <PartyCard key={p.id} party={p} />)}</div>
        </section>
      )}
      <p className="mx-auto mt-12 max-w-xl text-center text-xs text-muted-foreground">{t("landing.footer")} <Link to="/privacy" className="underline underline-offset-2">{t("privacy.title")}</Link></p>
    </AppShell>
  );
}
