import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Instagram, MapPin, MessageCircle, Store, Users, Volume2, VolumeX } from "lucide-react";
import { AppShell, BackButton } from "@/components/layout/AppShell";
import { PartyCard } from "@/components/cards";
import { CardSkeletons, EmptyState, Section } from "@/components/common/bits";
import { FixtureScoreboard } from "@/components/match/FixtureScoreboard";
import { PredictionInput } from "@/components/match/PredictionInput";
import { LeagueOnlyCta } from "@/components/predictor/LeagueOnlyCta";
import { leaguesCountingFixture, useMyLeagueComps } from "@/lib/predictor";
import { RequestTable } from "@/components/venue/RequestTable";
import { BroadcasterLine } from "@/components/match/AskVenue";
import { CheckWithVenues, igLink, useFanCounts, waLink } from "@/components/match/CheckWithVenues";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { FIXTURE_SELECT, isFinished, loc, usePartiesForFixture, type FixtureWithTeams, type Venue } from "@/lib/data";

/** One match: where to watch it (supporter parties first, then venues showing it) and your prediction. */
export default function MatchPage() {
  const { id } = useParams();
  const { t, lang, formatDateTime } = useI18n();
  const { user } = useAuth();
  const { data: fixture, isLoading } = useQuery({
    queryKey: ["fixture", id],
    enabled: !!id,
    queryFn: async () => (await supabase.from("fixtures").select(FIXTURE_SELECT).eq("id", id!).single()).data as unknown as FixtureWithTeams | null,
  });
  const { data: parties } = usePartiesForFixture(id);
  const { data: myLeagues } = useMyLeagueComps(!!user);
  const { data: showing } = useQuery({
    queryKey: ["fixture-venues", id],
    enabled: !!id,
    queryFn: async () => ((await supabase.from("venue_screenings").select("id, sound, source, venue:venues(*)").eq("fixture_id", id!)).data ?? []) as unknown as { id: string; sound: boolean; source: string; venue: Venue }[],
  });
  const { data: fanCounts } = useFanCounts(id);
  if (isLoading) return <AppShell><CardSkeletons /></AppShell>;
  if (!fixture) return <AppShell><BackButton /><EmptyState title={t("party.notFound")} /></AppShell>;
  const venues = (showing ?? []).filter((s) => s.venue?.is_listed).sort((a, b) => Number(b.venue.is_pro) - Number(a.venue.is_pro) || a.venue.name.localeCompare(b.venue.name));
  const fans = new Map((fanCounts ?? []).map((c) => [c.venue_id, c]));
  const askMsg = fixture ? t("check.msg", { match: `${fixture.home_team_name} ${t("common.vs")} ${fixture.away_team_name}`, when: formatDateTime(fixture.kickoff_at) }) : "";
  const label = `${fixture.home_team_name} ${t("common.vs")} ${fixture.away_team_name} · ${formatDateTime(fixture.kickoff_at)}`;
  return (
    <AppShell>
      <BackButton />
      <FixtureScoreboard fixture={fixture} />
      {!isFinished(fixture.status) && <BroadcasterLine code={fixture.competition_code} className="mt-3 px-1" />}
      {/* Predictions live in leagues: predict here only when this game counts in one of mine (the Gulf Cup is its own tournament) */}
      {user && !isFinished(fixture.status) && (
        leaguesCountingFixture(myLeagues, fixture).length || fixture.competition_code === "AGC"
          ? <div className="mt-4"><PredictionInput fixture={fixture} /></div>
          : myLeagues && <LeagueOnlyCta comp={fixture.competition_code} className="mt-4" />
      )}

      <Section title={t("match.parties")}>
        {(parties ?? []).length ? <div className="grid gap-3">{parties!.map((p) => <PartyCard key={p.id} party={p} />)}</div>
          : <p className="rounded-2xl bg-surface px-4 py-5 text-center text-sm text-muted-foreground">{t("match.noParties")}</p>}
      </Section>

      <Section title={t("match.venues", { n: venues.length })} icon={<Store className="h-5 w-5" />}>
        {venues.length ? (
          <div className="card divide-y">
            {venues.map(({ id: sid, sound, source, venue: v }) => {
              const fc = fans.get(v.id);
              const byFans = source === "fan";
              return (
              <div key={sid} className="flex items-center gap-3 px-4 py-3">
                <Link to={`/venues/${v.id}`} className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate font-semibold">{loc(v, "name", lang)}{v.is_pro && <span className="rounded bg-foreground px-1 text-[9px] font-bold text-background">PRO</span>}</p>
                  {byFans ? (
                    <>
                    <p className="flex items-center gap-1 truncate text-xs text-muted-foreground"><MapPin className="h-3 w-3 shrink-0" />{v.area ?? t(`city.${v.city}` as never)}</p>
                    <p className="flex items-center gap-1 truncate text-xs"><span className="font-semibold text-brand">{t("check.byFans", { n: fc?.confirmations ?? 1 })}</span>{!!fc?.coming && <span className="inline-flex items-center gap-1 text-muted-foreground">· <Users className="h-3 w-3 shrink-0" />{t("check.going", { n: fc.coming })}</span>}</p>
                    </>
                  ) : (
                    <p className="flex items-center gap-1 truncate text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{v.area ?? t(`city.${v.city}` as never)} · {sound ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}{sound ? t("venue.withSound") : t("venue.noSound")}</p>
                  )}
                </Link>
                {!v.owner_user_id && v.whatsapp && <Button asChild size="xs" className="bg-[#25D366] text-white hover:bg-[#1fb457]"><a href={waLink(v.whatsapp, askMsg)} target="_blank" rel="noreferrer" aria-label="WhatsApp"><MessageCircle className="h-3.5 w-3.5" /></a></Button>}
                {!v.owner_user_id && !v.whatsapp && v.instagram && <Button asChild size="xs" variant="outline"><a href={igLink(v.instagram)} target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram className="h-3.5 w-3.5" /></a></Button>}
                {v.owner_user_id && new Date(fixture.kickoff_at).getTime() > Date.now() && <RequestTable venueId={v.id} venueName={loc(v, "name", lang)} fixtureId={fixture.id} matchLabel={label} kickoff={fixture.kickoff_at} trigger={<Button size="xs" variant="outline">{t("tables.book")}</Button>} />}
              </div>
            ); })}
          </div>
        ) : <p className="rounded-2xl bg-surface px-4 py-5 text-center text-sm text-muted-foreground">{t("match.noVenues")}</p>}
        <Link to="/venues" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-brand hover:underline">{t("match.allVenues")}<ChevronRight className="h-4 w-4 rtl:rotate-180" /></Link>
        <div className="mt-4"><CheckWithVenues fixture={fixture} showingIds={new Set((showing ?? []).map((s) => s.venue?.id).filter(Boolean))} /></div>
      </Section>
    </AppShell>
  );
}
