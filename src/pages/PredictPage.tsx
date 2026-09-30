import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Store, Target, Tv } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AppShell, PageTitle } from "@/components/layout/AppShell";
import { PredictionInput } from "@/components/match/PredictionInput";
import { CardSkeletons, Chip, EmptyState } from "@/components/common/bits";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { FIXTURE_SELECT, useMyMemberships, type FixtureWithTeams } from "@/lib/data";

import { COMPETITIONS as COMP_ORDER, isKnownComp } from "@/lib/competitions";

export default function PredictPage() {
  const { t, formatDateTime } = useI18n();
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
    queryFn: async () => ((await supabase.from("fixtures").select(FIXTURE_SELECT).gt("kickoff_at", new Date(Date.now() - 150 * 60e3).toISOString())
      .lt("kickoff_at", new Date(Date.now() + 21 * 864e5).toISOString()).order("kickoff_at").limit(300)).data ?? []) as unknown as FixtureWithTeams[],
  });
  const { data: mine } = useQuery({
    queryKey: ["my-predictions", user?.id],
    enabled: !!user,
    queryFn: async () => ((await supabase.from("predictions").select(`*, fixture:fixtures(${FIXTURE_SELECT})`).eq("user_id", user!.id)
      .order("created_at", { ascending: false }).limit(100)).data ?? []) as unknown as { id: string; home_score: number; away_score: number; points: number | null; fixture: FixtureWithTeams }[],
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
  const total = (mine ?? []).reduce((s, p) => s + (p.points ?? 0), 0);
  const exact = (mine ?? []).filter((p) => p.points === 3).length;
  const settled = (mine ?? []).filter((p) => p.points !== null);

  return (
    <AppShell>
      <PageTitle title={t("page.predict")} sub={t("matches.sub")} action={<Button asChild variant="outline" size="sm"><Link to="/venues"><Store />{t("venues.title")}</Link></Button>} />
      <div className="grid grid-cols-3 divide-x rounded-2xl bg-foreground py-4 text-center text-background rtl:divide-x-reverse divide-white/10">
        {[{ v: total, l: t("league.pts") }, { v: exact, l: t("league.exact") }, { v: (mine ?? []).length, l: t("predict.made") }].map((s) => (
          <div key={s.l}><p className="scoreboard text-3xl font-bold leading-none">{s.v}</p><p className="mt-1 text-xs text-background/60">{s.l}</p></div>
        ))}
      </div>

      <Tabs defaultValue="upcoming" className="mt-6">
        <TabsList className="w-full"><TabsTrigger value="upcoming">{t("predict.upcoming")}</TabsTrigger><TabsTrigger value="results">{t("predict.results")}</TabsTrigger></TabsList>
        <TabsContent value="upcoming">
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
                  <div key={f.id} className="card p-3">
                    <p className="mb-2 flex items-center justify-between text-xs text-muted-foreground"><span className="truncate">{isKnownComp(f.competition_code) ? t(`comp.${f.competition_code}` as never) : f.competition}</span><span className="scoreboard text-sm font-semibold text-foreground">{formatDateTime(f.kickoff_at, { hour: "2-digit", minute: "2-digit", hour12: false })}</span></p>
                    <PredictionInput fixture={f} compact bare />
                    <Link to={`/match/${f.id}`} className="mt-2 flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-xs font-semibold">
                      <span className="flex items-center gap-1.5"><Tv className="h-3.5 w-3.5" />{screenCounts?.get(f.id) ? t("matches.venuesShowing", { n: screenCounts.get(f.id)! }) : t("matches.whereToWatch")}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </TabsContent>
        <TabsContent value="results">
          {settled.length === 0 ? <EmptyState title={t("predict.noResults")} /> : (
            <div className="card overflow-hidden">
              {settled.map((p) => (
                <div key={p.id} className="flex items-center gap-3 border-b px-4 py-3 text-sm last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.fixture.home_team_name} {t("common.vs")} {p.fixture.away_team_name}</p>
                    <p className="text-xs text-muted-foreground">{t("predict.youSaid")} <span dir="ltr">{p.home_score}–{p.away_score}</span> · {t("predict.ft")} <span dir="ltr">{p.fixture.home_score}–{p.fixture.away_score}</span></p>
                  </div>
                  <span className={`scoreboard rounded-full px-2.5 py-1 text-xs font-bold ${p.points === 3 ? "bg-gold text-accent-foreground" : p.points === 1 ? "bg-brand-soft text-brand" : "bg-muted text-muted-foreground"}`}>+{p.points}</span>
                </div>
              ))}
            </div>
          )}
          <p className="mt-2 text-xs text-muted-foreground">{t("league.rules")}</p>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
