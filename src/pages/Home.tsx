import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { CalendarDays, Trophy, Tv, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { TeamBadge } from "@/components/brand/TeamBadge";
import { FixtureScoreboard } from "@/components/match/FixtureScoreboard";
import { PartyCard } from "@/components/cards";
import { CardSkeletons, Chip, EmptyState, Section } from "@/components/common/bits";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import {
  CITIES, loc, partyTime, useCityLeaderboard, useMyMemberships, useNextTeamFixture, usePartiesForFixture, useTeams, useUpcomingParties,
} from "@/lib/data";
import Landing from "./Landing";

export default function Home() {
  const { user, profile, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Landing />;
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
  const { data: upcoming, isLoading: upLoading } = useUpcomingParties(10);
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

  return (
    <AppShell>
      <div className="flex items-center gap-3">
        {team && <TeamBadge shortName={team.short_name || "FC"} primary={team.primary_color} secondary={team.secondary_color} />}
        <div>
          <p className="text-sm text-muted-foreground">{formatDateTime(new Date(), { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="text-2xl font-bold md:text-3xl">{t("home.welcome")}{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}</h1>
        </div>
      </div>

      {profile?.favorite_team_id && (
        <Section title={t("home.nextUp")} icon={<CalendarDays className="h-5 w-5 text-accent" />}>
          {nextLoading ? <CardSkeletons n={1} /> : next ? (
            <div className="space-y-3">
              <FixtureScoreboard fixture={next} />
              {(nextParties ?? []).length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">{nextParties!.map((p) => <PartyCard key={p.id} party={p} />)}</div>
              ) : (
                <p className="rounded-2xl border border-dashed p-4 text-center text-sm text-muted-foreground">{t("home.noPartyYet")}</p>
              )}
            </div>
          ) : <p className="text-sm text-muted-foreground">{t("home.noFixture")}</p>}
        </Section>
      )}

      <Section title={t("home.yourGroups")} icon={<Users className="h-5 w-5 text-primary" />}
        action={<Link to="/groups" className="text-sm font-medium text-primary">{t("common.seeAll")}</Link>}>
        {(memberships ?? []).length === 0 ? (
          <EmptyState icon={<Users className="h-5 w-5" />} title={t("home.noGroupsTitle")}
            body={team ? t("home.noGroupsBodyTeam", { team: loc(team, "name", lang) }) : t("home.noGroupsBody")}
            cta={{ to: "/groups", label: t("home.findGroup") }} />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {memberships!.map((m) => m.group && (
              <div key={m.id} className="rounded-2xl border bg-card p-4">
                <Link to={`/g/${m.group.slug}`} className="flex items-center gap-3">
                  <TeamBadge size="sm" shortName={m.group.team?.short_name || "FC"} primary={m.group.team?.primary_color} secondary={m.group.team?.secondary_color} />
                  <span className="font-semibold">{loc(m.group, "name", lang)}</span>
                  {m.role !== "member" && <span className="ms-auto rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">{t(`role.${m.role}` as never)}</span>}
                </Link>
                {nextByGroup.get(m.group_id) ? (
                  <Link to={`/party/${nextByGroup.get(m.group_id)!.id}`} className="mt-3 block rounded-xl bg-secondary/60 p-3 text-sm">
                    <span className="text-muted-foreground">{t("home.nextParty")}: </span>
                    <span className="font-medium">{nextByGroup.get(m.group_id)!.fixture ? `${nextByGroup.get(m.group_id)!.fixture!.home_team_name} v ${nextByGroup.get(m.group_id)!.fixture!.away_team_name}` : nextByGroup.get(m.group_id)!.title}</span>
                    <span className="block text-xs text-muted-foreground">{formatDateTime(partyTime(nextByGroup.get(m.group_id)!))}</span>
                  </Link>
                ) : <p className="mt-3 text-xs text-muted-foreground">{t("home.noUpcoming")}</p>}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title={t("home.thisWeek")} icon={<Tv className="h-5 w-5 text-accent" />}>
        {citiesWithParties.length > 1 && (
          <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
            <Chip active={city === "all"} onClick={() => setCity("all")}>{t("common.all")}</Chip>
            {citiesWithParties.map((c) => <Chip key={c} active={city === c} onClick={() => setCity(c)}>{t(`city.${c}` as never)}</Chip>)}
          </div>
        )}
        {upLoading ? <CardSkeletons /> : filtered.length ? (
          <div className="grid gap-3 md:grid-cols-2">{filtered.slice(0, 12).map((p) => <PartyCard key={p.id} party={p} />)}</div>
        ) : <EmptyState icon={<Tv className="h-5 w-5" />} title={t("home.tonightEmpty")} />}
        <p className="mt-2 text-xs text-muted-foreground">{t("home.localTime")}</p>
      </Section>

      {(cityBoard ?? []).length > 0 && (
        <Section title={t("home.cityLeague", { city: t(`city.${myCity}` as never) })} icon={<Trophy className="h-5 w-5 text-accent" />}>
          <div className="overflow-hidden rounded-2xl border bg-card">
            {cityBoard!.slice(0, 5).map((g, i) => (
              <div key={g.group_id} className="flex items-center gap-3 border-b px-4 py-3 last:border-0">
                <span className="scoreboard w-5 text-center font-bold text-muted-foreground">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{(lang === "ar" && g.name_ar) || g.name}</p>
                  <p className="text-xs text-muted-foreground">{g.team_name} · {t("home.members", { n: g.members })}</p>
                </div>
                <div className="text-end text-xs"><p className="scoreboard text-base font-bold">{g.caps}</p><p className="text-muted-foreground">{t("league.caps")}</p></div>
                <div className="w-14 text-end text-xs"><p className="scoreboard text-base font-bold">{Number(g.avg_prediction_points).toFixed(1)}</p><p className="text-muted-foreground">{t("home.avgPts")}</p></div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </AppShell>
  );
}
