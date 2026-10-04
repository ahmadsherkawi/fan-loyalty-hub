import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Store, Trophy, Volume2, VolumeX } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { CardSkeletons, EmptyState, Section } from "@/components/common/bits";
import { TeamBadge } from "@/components/brand/TeamBadge";
import { PredictionInput } from "@/components/match/PredictionInput";
import { ShareMyPick } from "@/components/match/ShareMyPick";
import { BroadcasterLine } from "@/components/match/AskVenue";
import { RequestTable } from "@/components/venue/RequestTable";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { FIXTURE_SELECT, isFinished, isLive, loc, type FixtureWithTeams, type Venue } from "@/lib/data";

const CODE = "AGC";

function useCountdown(target?: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  if (!target) return null;
  const ms = new Date(target).getTime() - now;
  if (ms <= 0) return null;
  const s = Math.floor(ms / 1000);
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

/** /final — the Gulf Cup final: countdown, your prediction (and a story to share it), and where to watch it in the UAE. */
export default function FinalPage() {
  const { t, lang, formatDateTime } = useI18n();
  const { user } = useAuth();

  // The final is the tournament's last game
  const { data: fixture, isLoading } = useQuery({
    queryKey: ["cup-final", CODE],
    queryFn: async () => ((await supabase.from("fixtures").select(FIXTURE_SELECT).eq("competition_code", CODE)
      .order("kickoff_at", { ascending: false }).limit(1)).data ?? [])[0] as unknown as FixtureWithTeams | undefined,
  });
  const { data: pick } = useQuery({
    queryKey: ["prediction", fixture?.id, user?.id],
    enabled: !!user && !!fixture,
    queryFn: async () => (await supabase.from("predictions").select("*").eq("fixture_id", fixture!.id).eq("user_id", user!.id).maybeSingle()).data,
  });
  const { data: showing } = useQuery({
    queryKey: ["fixture-venues", fixture?.id],
    enabled: !!fixture,
    queryFn: async () => ((await supabase.from("venue_screenings").select("id, sound, created_at, venue:venues(*)").eq("fixture_id", fixture!.id).order("created_at")).data ?? []) as unknown as { id: string; sound: boolean; created_at: string; venue: Venue }[],
  });
  const cd = useCountdown(fixture?.kickoff_at);

  if (isLoading) return <AppShell><CardSkeletons /></AppShell>;
  if (!fixture) return <AppShell><EmptyState icon={<Trophy className="h-5 w-5" />} title={t("cup.none")} /></AppShell>;

  const name = (side: "home" | "away") => (lang === "ar" && fixture[`${side}_team`]?.name_ar) || fixture[`${side}_team`]?.name || fixture[`${side}_team_name`];
  const live = isLive(fixture.status), done = isFinished(fixture.status);
  // First to confirm, first on the list
  const venues = (showing ?? []).filter((s) => s.venue?.is_listed).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const label = `${fixture.home_team_name} ${t("common.vs")} ${fixture.away_team_name} · ${formatDateTime(fixture.kickoff_at)}`;
  const h = fixture.home_team, a = fixture.away_team;

  return (
    <AppShell>
      {/* Hero */}
      <div className="relative -mx-4 -mt-5 overflow-hidden px-4 pb-6 pt-7 text-white md:mx-0 md:mt-0 md:rounded-3xl"
        style={{ background: `radial-gradient(60% 70% at 0% 50%, ${h?.primary_color ?? "#00C566"}88, transparent 70%), radial-gradient(60% 70% at 100% 50%, ${a?.primary_color ?? "#00C566"}88, transparent 70%), #0B1220` }}>
        <p className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary"><Trophy className="h-4 w-4" />{t("comp.AGC")}</p>
        <h1 className="mt-1 text-center text-3xl font-extrabold md:text-4xl">{t("final.title")}</h1>
        <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
          <div className="flex flex-col items-center gap-2"><TeamBadge size="xl" shortName={h?.short_name || fixture.home_team_name.slice(0, 3)} primary={h?.primary_color} secondary={h?.secondary_color} /><span className="font-bold">{name("home")}</span></div>
          <div className="px-2">
            {live || done ? (
              <><p className="scoreboard text-5xl font-bold" dir="ltr">{fixture.home_score ?? 0}–{fixture.away_score ?? 0}</p>
                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-bold ${live ? "bg-destructive" : "bg-white/15"}`}>{live ? t("match.live") : t("predict.ft")}</span></>
            ) : (
              <><p className="scoreboard text-4xl font-bold">{formatDateTime(fixture.kickoff_at, { hour: "2-digit", minute: "2-digit", hour12: false })}</p>
                <p className="text-xs text-white/70">{formatDateTime(fixture.kickoff_at, { weekday: "long", day: "numeric", month: "short" })}</p></>
            )}
          </div>
          <div className="flex flex-col items-center gap-2"><TeamBadge size="xl" shortName={a?.short_name || fixture.away_team_name.slice(0, 3)} primary={a?.primary_color} secondary={a?.secondary_color} /><span className="font-bold">{name("away")}</span></div>
        </div>
        {cd && (
          <div className="mx-auto mt-5 grid max-w-xs grid-cols-4 gap-2 text-center" dir="ltr">
            {([["d", cd.d], ["h", cd.h], ["m", cd.m], ["s", cd.s]] as const).map(([k, v]) => (
              <div key={k} className="rounded-xl bg-white/10 py-2"><p className="scoreboard text-2xl font-bold">{String(v).padStart(2, "0")}</p><p className="text-[10px] uppercase text-white/60">{t(`final.${k}` as never)}</p></div>
            ))}
          </div>
        )}
      </div>
      {!done && <BroadcasterLine code={fixture.competition_code} className="mt-3 px-1" />}

      {/* Predict */}
      <Section title={t("final.predict")}>
        {!user && !live && !done && (
          <div className="card mb-3 flex items-center justify-between gap-3 bg-foreground p-4 text-background">
            <p className="text-sm font-semibold">{t("cup.joinToPlay")}</p>
            <Button asChild size="sm"><Link to={`/auth?mode=signup&next=${encodeURIComponent("/final")}`}>{t("cup.join")}</Link></Button>
          </div>
        )}
        <PredictionInput fixture={fixture} />
        {pick && !done && <div className="mt-3"><ShareMyPick fixture={fixture} pick={pick} title={t("final.title")} path="/final" /></div>}
        <Link to="/gulf-cup" className="mt-3 block text-center text-sm font-semibold text-brand">{t("final.board")}</Link>
      </Section>

      {/* Where to watch */}
      <Section title={t("final.where", { n: venues.length })} icon={<Store className="h-5 w-5" />}>
        {venues.length ? (
          <div className="card divide-y">
            {venues.map(({ id: sid, sound, venue: v }) => (
              <div key={sid} className="flex items-center gap-3 px-4 py-3">
                <Link to={`/venues/${v.id}`} className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{loc(v, "name", lang)}</p>
                  <p className="flex items-center gap-1 truncate text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{v.area ?? t(`city.${v.city}` as never)} · {sound ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}{sound ? t("venue.withSound") : t("venue.noSound")}</p>
                </Link>
                {v.owner_user_id && !live && !done && <RequestTable venueId={v.id} venueName={loc(v, "name", lang)} fixtureId={fixture.id} matchLabel={label} kickoff={fixture.kickoff_at} trigger={<Button size="xs" variant="outline">{t("tables.book")}</Button>} />}
              </div>
            ))}
          </div>
        ) : <p className="rounded-2xl bg-surface px-4 py-5 text-center text-sm text-muted-foreground">{t("final.noVenues")}</p>}
        <Link to={`/match/${fixture.id}`} className="mt-2 block text-center text-sm font-semibold text-brand">{t("final.matchPage")}</Link>
      </Section>

      {/* For venues */}
      {!done && (
        <div className="card mt-6 p-4">
          <p className="font-bold">{t("final.venueT")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("final.venueB")}</p>
          <Button asChild className="mt-3 w-full"><Link to="/claim?ref=final">{t("final.venueCta")}</Link></Button>
        </div>
      )}
    </AppShell>
  );
}
