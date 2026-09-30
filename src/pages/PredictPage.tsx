import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Target } from "lucide-react";
import { AppShell, PageTitle } from "@/components/layout/AppShell";
import { PredictionInput } from "@/components/match/PredictionInput";
import { CardSkeletons, Chip, EmptyState } from "@/components/common/bits";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { FIXTURE_SELECT, useMyMemberships, type FixtureWithTeams } from "@/lib/data";

const COMP_ORDER = ["CL", "PL", "PD", "SA", "BL1", "FL1", "PPL", "DED"];

export default function PredictPage() {
  const { t, formatDateTime } = useI18n();
  const { user, profile } = useAuth();
  const { data: memberships } = useMyMemberships(user?.id);
  const [comp, setComp] = useState<string>("mine");

  const myTeamIds = useMemo(() => {
    const s = new Set<string>();
    if (profile?.favorite_team_id) s.add(profile.favorite_team_id);
    (memberships ?? []).forEach((m) => m.group?.team_id && s.add(m.group.team_id));
    return s;
  }, [profile?.favorite_team_id, memberships]);

  const { data: fixtures, isLoading } = useQuery({
    queryKey: ["predict-fixtures"],
    queryFn: async () => ((await supabase.from("fixtures").select(FIXTURE_SELECT).gt("kickoff_at", new Date().toISOString())
      .lt("kickoff_at", new Date(Date.now() + 21 * 864e5).toISOString()).order("kickoff_at").limit(300)).data ?? []) as unknown as FixtureWithTeams[],
  });
  const { data: mine } = useQuery({
    queryKey: ["my-predictions", user?.id],
    enabled: !!user,
    queryFn: async () => ((await supabase.from("predictions").select(`*, fixture:fixtures(${FIXTURE_SELECT})`).eq("user_id", user!.id)
      .order("created_at", { ascending: false }).limit(100)).data ?? []) as unknown as { id: string; home_score: number; away_score: number; points: number | null; fixture: FixtureWithTeams }[],
  });

  const comps = COMP_ORDER.filter((c) => (fixtures ?? []).some((f) => f.competition_code === c));
  const list = (fixtures ?? []).filter((f) => comp === "mine"
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
      <PageTitle title={t("page.predict")} sub={t("predict.hint")} />
      <div className="grid grid-cols-3 divide-x rounded-2xl bg-foreground py-4 text-center text-background rtl:divide-x-reverse divide-white/10">
        {[{ v: total, l: t("league.pts") }, { v: exact, l: t("league.exact") }, { v: (mine ?? []).length, l: t("predict.made") }].map((s) => (
          <div key={s.l}><p className="scoreboard text-3xl font-bold leading-none">{s.v}</p><p className="mt-1 text-xs text-background/60">{s.l}</p></div>
        ))}
      </div>

      <Tabs defaultValue="upcoming" className="mt-6">
        <TabsList className="w-full"><TabsTrigger value="upcoming">{t("predict.upcoming")}</TabsTrigger><TabsTrigger value="results">{t("predict.results")}</TabsTrigger></TabsList>
        <TabsContent value="upcoming">
          <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
            <Chip active={comp === "mine"} onClick={() => setComp("mine")}>{t("predict.myTeams")}</Chip>
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
                    <p className="mb-2 flex items-center justify-between text-xs text-muted-foreground"><span className="truncate">{f.competition}</span><span className="scoreboard text-sm font-semibold text-foreground">{formatDateTime(f.kickoff_at, { hour: "2-digit", minute: "2-digit", hour12: false })}</span></p>
                    <PredictionInput fixture={f} compact bare />
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
                    <p className="truncate font-medium">{p.fixture.home_team_name} v {p.fixture.away_team_name}</p>
                    <p className="text-xs text-muted-foreground" dir="ltr">{t("predict.youSaid")} {p.home_score}–{p.away_score} · FT {p.fixture.home_score}–{p.fixture.away_score}</p>
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
