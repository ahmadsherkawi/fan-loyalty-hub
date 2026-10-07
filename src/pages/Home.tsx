import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { CalendarDays, ChevronRight, Gift, Store, Trophy, Tv, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, PageTitle } from "@/components/layout/AppShell";
import { TeamBadge } from "@/components/brand/TeamBadge";
import { FixtureScoreboard } from "@/components/match/FixtureScoreboard";
import { PartyCard } from "@/components/cards";
import { CardSkeletons, Chip, EmptyState, IconDot, Section, SeeAll } from "@/components/common/bits";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import {
  CITIES, loc, partyTime, useMyRewards, useMyVenues, useCityLeaderboard, useMyMemberships, useNextTeamFixture, usePartiesForFixture, useTeams, useUpcomingParties,
} from "@/lib/data";
import Landing, { CupPromo, PredictorPromo } from "./Landing";
import { useAccount } from "@/lib/access";

export default function Home() {
  const { user, profile, loading } = useAuth();
  const acct = useAccount();
  if (loading || (user && !acct.ready)) return null;
  if (!user) return <Landing />;
  if (acct.isVenue) return acct.ready ? <Navigate to={acct.venueHome} replace /> : null;
  if (profile && !profile.onboarding_completed) return <Navigate to="/onboarding" replace />;
  return <MatchDay />;
}

function MatchDay() {
  const { user, profile } = useAuth();
  const { t, lang, formatDateTime } = useI18n();
  const { data: teams } = useTeams();
  const team = teams?.find((x) => x.id === profile?.favorite_team_id) ?? null;
  const { data: next, isLoading: nextLoading } = useNextTeamFixture(profile?.favorite_team_id);
  const { data: nextParties } = usePartiesForFixture(next?.id);
  const { data: memberships } = useMyMemberships(user?.id);
  const { data: upcoming, isLoading: upLoading } = useUpcomingParties(21);
  const [city, setCity] = useState<string>("all");
  const myCity = profile?.city && profile.city !== "Other" ? profile.city : "Dubai";
  const { data: cityBoard } = useCityLeaderboard(myCity);

  const myGroupIds = useMemo(() => new Set((memberships ?? []).map((m) => m.group_id)), [memberships]);
  const nextByGroup = useMemo(() => {
    const map = new Map<string, NonNullable<typeof upcoming>[number]>();
    (upcoming ?? []).forEach((p) => { if (myGroupIds.has(p.group_id) && !map.has(p.group_id)) map.set(p.group_id, p); });
    return map;
  }, [upcoming, myGroupIds]);
  const filtered = (upcoming ?? []).filter((p) => city === "all" || p.group?.city === city);
  const citiesWithParties = CITIES.filter((c) => (upcoming ?? []).some((p) => p.group?.city === c));

  const heroParty = (nextParties ?? [])[0];
  return (
    <AppShell>
      <PageTitle eyebrow={formatDateTime(new Date(), { weekday: "long", day: "numeric", month: "long" })}
        title={<>{t("home.welcome")}{profile?.full_name ? <>{lang === "ar" ? "، " : ", "}<span className="text-brand">{profile.full_name.split(" ")[0]}</span></> : ""}</>} />
      <CupPromo />
      <PredictorPromo />

      {profile?.favorite_team_id && (
        <section>
          {nextLoading ? <CardSkeletons n={1} /> : next ? (
            <FixtureScoreboard fixture={next} footer={heroParty ? (
              <Link to={`/party/${heroParty.id}`} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-white/60">{t("home.watchWith", { group: loc(heroParty.group, "name", lang) })}</p>
                  <p className="truncate text-sm font-semibold">{loc(heroParty.venue, "name", lang)}</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground">{t("home.openParty")}<ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" /></span>
              </Link>
            ) : <p className="text-center text-xs text-white/70">{t("home.noPartyYet")}</p>} />
          ) : <EmptyState icon={<CalendarDays className="h-5 w-5" />} title={t("home.noFixture")} />}
          {(nextParties ?? []).length > 1 && (
            <div className="mt-3 grid gap-3">{nextParties!.slice(1).map((p) => <PartyCard key={p.id} party={p} />)}</div>
          )}
        </section>
      )}

      <ForYou />

      <Section title={t("home.yourGroups")} action={(memberships ?? []).length > 0 ? <SeeAll to="/groups" label={t("common.seeAll")} /> : undefined}>
        {(memberships ?? []).length === 0 ? (
          <EmptyState icon={<Users className="h-5 w-5" />} title={t("home.noGroupsTitle")}
            body={team ? t("home.noGroupsBodyTeam", { team: loc(team, "name", lang) }) : t("home.noGroupsBody")}
            cta={{ to: "/groups", label: t("home.findGroup") }} />
        ) : (
          <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
            {memberships!.map((m) => {
              if (!m.group) return null;
              const np = nextByGroup.get(m.group_id);
              return (
                <Link key={m.id} to={`/g/${m.group.slug}`} className="card card-hover w-60 shrink-0 snap-start p-4">
                  <div className="flex items-center gap-3">
                    <TeamBadge size="sm" shortName={m.group.team?.short_name || "FC"} primary={m.group.team?.primary_color} secondary={m.group.team?.secondary_color} />
                    <span className="min-w-0 flex-1 truncate font-bold">{loc(m.group, "name", lang)}</span>
                  </div>
                  <div className="mt-3 rounded-xl bg-surface px-3 py-2">
                    <p className="eyebrow">{t("home.nextParty")}</p>
                    <p className="mt-0.5 truncate text-sm font-semibold">{np ? formatDateTime(partyTime(np), { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : <span className="font-medium text-muted-foreground">{t("home.noUpcoming")}</span>}</p>
                  </div>
                  {m.role !== "member" && <p className="mt-2 text-xs font-semibold text-gold-ink">{t(`role.${m.role}` as never)}</p>}
                </Link>
              );
            })}
          </div>
        )}
      </Section>

      <Section title={t("home.thisWeek")} action={<SeeAll to="/venues" label={t("venues.title")} />}>
        {citiesWithParties.length > 1 && (
          <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
            <Chip active={city === "all"} onClick={() => setCity("all")}>{t("common.all")}</Chip>
            {citiesWithParties.map((c) => <Chip key={c} active={city === c} onClick={() => setCity(c)}>{t(`city.${c}` as never)}</Chip>)}
          </div>
        )}
        {upLoading ? <CardSkeletons /> : filtered.length ? (
          <div className="grid gap-3">{filtered.slice(0, 6).map((p) => <PartyCard key={p.id} party={p} />)}</div>
        ) : <EmptyState icon={<Tv className="h-5 w-5" />} title={t("home.tonightEmpty")} />}
      </Section>

      {(cityBoard ?? []).length > 0 && (
        <Section title={t("home.cityLeague", { city: t(`city.${myCity}` as never) })} icon={<Trophy className="h-5 w-5 text-gold-ink" />}>
          <div className="card overflow-hidden">
            {cityBoard!.slice(0, 5).map((g, i) => (
              <Link to={`/g/${g.slug}`} key={g.group_id} className={cn("flex items-center gap-3 border-b px-4 py-3 transition-colors last:border-0 hover:bg-surface", myGroupIds.has(g.group_id) && "bg-brand-soft")}>
                <span className={cn("scoreboard flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold", i === 0 ? "bg-gold text-accent-foreground" : "text-muted-foreground")}>{i + 1}</span>
                <TeamBadge size="xs" shortName={g.team_short || "FC"} primary={g.team_color} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{(lang === "ar" && g.name_ar) || g.name}</p>
                  <p className="text-xs text-muted-foreground">{g.team_name} · {t("home.members", { n: g.members })}</p>
                </div>
                <div className="text-end"><p className="scoreboard text-xl font-bold leading-none">{g.caps}</p><p className="text-[10px] font-semibold text-muted-foreground">{t("league.caps")}</p></div>
              </Link>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t("home.leagueHint")}</p>
        </Section>
      )}
    </AppShell>
  );
}

/** Shortcuts that tie the roles together: venue owners see requests, fans see rewards they can use. */
function ForYou() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const { data: rewards } = useMyRewards(!!user);
  const ready = (rewards ?? []).filter((r) => (r.available ?? r.unlocked) && r.min_caps > 0);
  if (!ready.length) return null;
  return (
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      {ready.length > 0 && (
        <Link to="/passport#rewards" className="card card-hover flex items-center gap-3 border-gold/60 bg-gold-soft p-4">
          <IconDot tone="gold" className="bg-gold text-accent-foreground"><Gift /></IconDot>
          <div className="min-w-0 flex-1">
            <p className="font-bold">{t("rewards.ready", { n: ready.length })}</p>
            <p className="truncate text-sm text-muted-foreground">{ready.map((r) => (lang === "ar" && r.title_ar) || r.title).join(" · ")}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground rtl:rotate-180" />
        </Link>
      )}
    </div>
  );
}
