import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Store, Volume2, VolumeX } from "lucide-react";
import { AppShell, BackButton } from "@/components/layout/AppShell";
import { PartyCard } from "@/components/cards";
import { CardSkeletons, EmptyState, Section } from "@/components/common/bits";
import { FixtureScoreboard } from "@/components/match/FixtureScoreboard";
import { PredictionInput } from "@/components/match/PredictionInput";
import { RequestTable } from "@/components/venue/RequestTable";
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
  const { data: showing } = useQuery({
    queryKey: ["fixture-venues", id],
    enabled: !!id,
    queryFn: async () => ((await supabase.from("venue_screenings").select("id, sound, venue:venues(*)").eq("fixture_id", id!)).data ?? []) as unknown as { id: string; sound: boolean; venue: Venue }[],
  });
  if (isLoading) return <AppShell><CardSkeletons /></AppShell>;
  if (!fixture) return <AppShell><BackButton /><EmptyState title={t("party.notFound")} /></AppShell>;
  const venues = (showing ?? []).filter((s) => s.venue?.is_listed).sort((a, b) => Number(b.venue.is_pro) - Number(a.venue.is_pro) || a.venue.name.localeCompare(b.venue.name));
  const label = `${fixture.home_team_name} v ${fixture.away_team_name} · ${formatDateTime(fixture.kickoff_at)}`;
  return (
    <AppShell>
      <BackButton />
      <FixtureScoreboard fixture={fixture} />
      {user && !isFinished(fixture.status) && <div className="mt-4"><PredictionInput fixture={fixture} /></div>}

      <Section title={t("match.parties")}>
        {(parties ?? []).length ? <div className="grid gap-3">{parties!.map((p) => <PartyCard key={p.id} party={p} />)}</div>
          : <p className="rounded-2xl bg-surface px-4 py-5 text-center text-sm text-muted-foreground">{t("match.noParties")}</p>}
      </Section>

      <Section title={t("match.venues", { n: venues.length })} icon={<Store className="h-5 w-5" />}>
        {venues.length ? (
          <div className="card divide-y">
            {venues.map(({ id: sid, sound, venue: v }) => (
              <div key={sid} className="flex items-center gap-3 px-4 py-3">
                <Link to={`/venues/${v.id}`} className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate font-semibold">{loc(v, "name", lang)}{v.is_pro && <span className="rounded bg-foreground px-1 text-[9px] font-bold text-background">PRO</span>}</p>
                  <p className="flex items-center gap-1 truncate text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{v.area ?? t(`city.${v.city}` as never)} · {sound ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}{sound ? t("venue.withSound") : t("venue.noSound")}</p>
                </Link>
                <RequestTable venueId={v.id} venueName={loc(v, "name", lang)} fixtureId={fixture.id} matchLabel={label} trigger={<Button size="xs" variant="outline">{t("tables.book")}</Button>} />
              </div>
            ))}
          </div>
        ) : <p className="rounded-2xl bg-surface px-4 py-5 text-center text-sm text-muted-foreground">{t("match.noVenues")}</p>}
        <Link to="/venues" className="mt-3 inline-block text-sm font-bold text-brand hover:underline">{t("match.allVenues")} →</Link>
      </Section>
    </AppShell>
  );
}
