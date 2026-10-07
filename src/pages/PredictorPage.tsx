import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Plus, Target, Trophy, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageTitle } from "@/components/layout/AppShell";
import { CardSkeletons, EmptyState, Section } from "@/components/common/bits";
import { PredictionInput } from "@/components/match/PredictionInput";
import { Board } from "@/components/predictor/Board";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { compLabel } from "@/lib/competitions";
import { LEAGUE_COMPS, useMyLeagues, usePredictorFixtures, useSeasonBoard } from "@/lib/predictor";
import { Chip } from "@/components/common/bits";
import type { FixtureWithTeams } from "@/lib/data";

/** /predictor — the weekly Predictor: call this week's big games, run private leagues with friends, climb the season table. */
export default function PredictorPage() {
  const { t, formatDateTime } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const { data: fixtures, isLoading } = usePredictorFixtures(12);
  const { data: board } = useSeasonBoard();
  const { data: leagues } = useMyLeagues(!!user);
  const [creating, setCreating] = useState(params.get("new") === "1");
  const [name, setName] = useState("");
  const [comps, setComps] = useState<string[]>(["PL"]);
  const toggleComp = (c: string) => setComps((l) => (l.includes(c) ? l.filter((x) => x !== c) : [...l, c]));
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const signup = (next: string) => `/auth?mode=signup&next=${encodeURIComponent(next)}`;

  async function create() {
    if (!user) return navigate(signup("/predictor?new=1"));
    setBusy(true);
    const { data, error } = await supabase.rpc("create_league" as never, { p_name: name, p_comps: comps } as never);
    setBusy(false);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["my-leagues"] });
    setCreating(false);
    navigate(`/league/${data as unknown as string}?created=1`);
  }
  function join() {
    const c = code.trim().toUpperCase();
    if (c.length < 4) return;
    navigate(`/league/${c}`);
  }

  const byDay = (fixtures ?? []).reduce<Record<string, FixtureWithTeams[]>>((acc, f) => { const d = f.kickoff_at.slice(0, 10); (acc[d] ??= []).push(f); return acc; }, {});

  return (
    <AppShell>
      <PageTitle eyebrow={t("predictor.eyebrow")} title={t("predictor.title")} sub={t("predictor.sub")} />

      {!user && (
        <div className="card mb-4 flex items-center justify-between gap-3 bg-foreground p-4 text-background">
          <p className="text-sm font-semibold">{t("cup.joinToPlay")}</p>
          <Button asChild size="sm"><Link to={signup("/predictor")}>{t("cup.join")}</Link></Button>
        </div>
      )}

      {/* Leagues */}
      <div className="card p-4">
        <div className="flex items-center gap-2"><Users className="h-5 w-5 text-brand" /><p className="font-bold">{t("predictor.leaguesT")}</p></div>
        <p className="mt-1 text-sm text-muted-foreground">{t("predictor.leaguesB")}</p>
        {(leagues ?? []).length > 0 && (
          <div className="mt-3 divide-y rounded-xl border">
            {leagues!.map((l) => (
              <Link key={l.code} to={`/league/${l.code}`} className="flex items-center gap-3 px-3 py-2.5">
                <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{l.name}</span><span className="text-xs text-muted-foreground">{t("predictor.members", { n: l.members })}</span></span>
                {l.my_rank && <span className="scoreboard rounded-full bg-surface px-2.5 py-1 text-sm font-bold">#{l.my_rank}</span>}
                <ChevronRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
              </Link>
            ))}
          </div>
        )}
        <div className="mt-3 grid gap-2 sm:grid-cols-[auto_1fr]">
          <Button onClick={() => (user ? setCreating(true) : navigate(signup("/predictor?new=1")))}><Plus />{t("predictor.create")}</Button>
          <div className="flex gap-2">
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder={t("predictor.codePh")} maxLength={8} className="uppercase" dir="ltr" />
            <Button variant="outline" onClick={join} disabled={code.trim().length < 4}>{t("predictor.join")}</Button>
          </div>
        </div>
      </div>

      {/* This week's games */}
      <Section title={t("predictor.week")} icon={<Target className="h-5 w-5" />}>
        {isLoading ? <CardSkeletons /> : Object.keys(byDay).length === 0 ? <EmptyState title={t("predict.none")} /> : Object.entries(byDay).map(([day, fs]) => (
          <div key={day} className="mb-5">
            <h3 className="mb-2 eyebrow">{formatDateTime(`${day}T12:00:00Z`, { weekday: "long", day: "numeric", month: "long" })}</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {fs.map((f) => (
                <div key={f.id} className="card p-3">
                  <p className="mb-2 flex items-center justify-between text-xs text-muted-foreground"><span className="truncate">{compLabel(t as never, f.competition_code, f.competition)}</span><span className="scoreboard text-sm font-semibold text-foreground">{formatDateTime(f.kickoff_at, { hour: "2-digit", minute: "2-digit", hour12: false })}</span></p>
                  <PredictionInput fixture={f} compact bare />
                </div>
              ))}
            </div>
          </div>
        ))}
        <Link to="/matches" className="block text-center text-sm font-semibold text-brand">{t("predictor.allGames")}</Link>
      </Section>

      {/* Season table */}
      <Section title={t("predictor.season")} icon={<Trophy className="h-5 w-5" />}>
        {(board ?? []).length ? <Board rows={board!} me={user?.id} limit={20} /> : <p className="rounded-2xl bg-surface px-4 py-5 text-center text-sm text-muted-foreground">{t("predictor.seasonEmpty")}</p>}
        <p className="mt-2 text-xs text-muted-foreground">{t("predictor.rules")}</p>
      </Section>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>{t("predictor.create")}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{t("predictor.createB")}</p>
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={t("predictor.namePh")} maxLength={40} />
          <div>
            <p className="mb-2 text-sm font-semibold">{t("predictor.compsQ")}</p>
            <div className="flex flex-wrap gap-2">
              {LEAGUE_COMPS.map((c) => <Chip key={c} active={comps.includes(c)} onClick={() => toggleComp(c)}>{t(`comp.${c}` as never)}</Chip>)}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{t("predictor.compsHint")}</p>
          </div>
          <Button onClick={create} disabled={busy || name.trim().length < 2 || !comps.length} className="rounded-full">{busy ? t("common.loading") : t("predictor.createCta")}</Button>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
