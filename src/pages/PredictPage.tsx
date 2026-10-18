import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Store, Target, Trophy, Tv } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AppShell, PageTitle } from "@/components/layout/AppShell";
import { TeamBadge } from "@/components/brand/TeamBadge";
import { CardSkeletons, Chip, EmptyState } from "@/components/common/bits";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { FIXTURE_SELECT, useMyMemberships, type FixtureWithTeams } from "@/lib/data";

import { COMPETITIONS as COMP_ORDER, isKnownComp } from "@/lib/competitions";

/** /matches — every upcoming game and where to watch it. Predictions are made in leagues, not here. */
export default function PredictPage() {
  const { t, lang, formatDateTime } = useI18n();
  const { user, profile } = useAuth();
  const { data: memberships } = useMyMemberships(user?.id);
  const [pickedComp, setComp] = useState<string | null>(null);

  const myTeamIds = useMemo(() => {
    const s = new Set<string>();
    if (profile?.favorite_team_id) s.add(profile.favorite_team_id);
    (memberships ?? []).forEach((m) => m.group?.team_id && s.add(m.group.team_id));
    return s;
  }, [profile?.favorite_team_id, memberships]);

  const { data: fixtures, isLoading } = useQuery({
    queryKey: ["predict-fixtures"],
    queryFn: async () => ((await supabase.from("fixtures").select(FIXTURE_SELECT).not("status", "in", "(POSTPONED,CANCELLED)").gt("kickoff_at", new Date(Date.now() - 150 * 60e3).toISOString())
      .lt("kickoff_at", new Date(Date.now() + 21 * 864e5).toISOString()).order("kickoff_at").limit(300)).data ?? []) as unknown as FixtureWithTeams[],
  });
  const { data: screenCounts } = useQuery({
    queryKey: ["screen-counts"],
    queryFn: async () => {
      const rows = ((await supabase.from("venue_screenings").select("fixture_id, venue:venues!inner(is_listed)").eq("venue.is_listed", true)).data ?? []) as { fixture_id: string }[];
      const m = new Map<string, number>(); rows.forEach((r) => m.set(r.fixture_id, (m.get(r.fixture_id) ?? 0) + 1)); return m;
    },
  });
  // Default to "My teams" only when the fan actually follows a team
  const comp = pickedComp ?? (myTeamIds.size ? "mine" : "all");
  const comps = COMP_ORDER.filter((c) => (fixtures ?? []).some((f) => f.competition_code === c));
  const list = (fixtures ?? []).filter((f) => comp === "all" ? true : comp === "mine"
    ? (f.home_team_id && myTeamIds.has(f.home_team_id)) || (f.away_team_id && myTeamIds.has(f.away_team_id))
    : f.competition_code === comp);
  const byDay = list.reduce<Record<string, FixtureWithTeams[]>>((acc, f) => {
    const d = f.kickoff_at.slice(0, 10); (acc[d] ??= []).push(f); return acc;
  }, {});

  return (
    <AppShell>
      <PageTitle title={t("page.predict")} sub={t("matches.sub")} action={<Button asChild variant="outline" size="sm"><Link to="/venues"><Store />{t("venues.title")}</Link></Button>} />
      {user && (
        <Link to="/predictor" className="card mb-4 flex items-center gap-3 p-3">
          <Trophy className="h-5 w-5 shrink-0 text-brand" />
          <span className="min-w-0 flex-1"><span className="block text-sm font-bold">{t("matches.leaguesT")}</span><span className="block text-xs text-muted-foreground">{t("matches.leaguesB")}</span></span>
          <ChevronRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
        </Link>
      )}
      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {myTeamIds.size > 0 && <Chip active={comp === "mine"} onClick={() => setComp("mine")}>{t("predict.myTeams")}</Chip>}
        <Chip active={comp === "all"} onClick={() => setComp("all")}>{t("common.all")}</Chip>
        {comps.map((c) => <Chip key={c} active={comp === c} onClick={() => setComp(c)}>{t(`comp.${c}` as never)}</Chip>)}
      </div>
      {isLoading ? <CardSkeletons /> : Object.keys(byDay).length === 0 ? (
        <EmptyState icon={<Target className="h-5 w-5" />} title={t("predict.none")} body={t("predict.noneBody")} />
      ) : Object.entries(byDay).map(([day, fs]) => (
        <div key={day} className="mb-6">
          <h3 className="mb-2 eyebrow">{formatDateTime(`${day}T12:00:00Z`, { weekday: "long", day: "numeric", month: "long" })}</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {fs.map((f) => (
              <Link key={f.id} to={`/match/${f.id}`} className="card block p-3">
                <p className="mb-2 flex items-center justify-between text-xs text-muted-foreground"><span className="truncate">{isKnownComp(f.competition_code) ? t(`comp.${f.competition_code}` as never) : f.competition}</span><span className="scoreboard text-sm font-semibold text-foreground">{formatDateTime(f.kickoff_at, { hour: "2-digit", minute: "2-digit", hour12: false })}</span></p>
                <div className="space-y-2">
                  {[{ team: f.home_team, n: f.home_team_name }, { team: f.away_team, n: f.away_team_name }].map(({ team, n }, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <TeamBadge size="sm" shortName={team?.short_name || n.slice(0, 3)} primary={team?.primary_color} secondary={team?.secondary_color} />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{(lang === "ar" && team?.name_ar) || team?.name || n}</span>
                    </div>
                  ))}
                </div>
                <span className="mt-3 flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-xs font-semibold">
                  <span className="flex items-center gap-1.5"><Tv className="h-3.5 w-3.5" />{screenCounts?.get(f.id) ? t("matches.venuesShowing", { n: screenCounts.get(f.id)! }) : t("matches.whereToWatch")}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </AppShell>
  );
}
