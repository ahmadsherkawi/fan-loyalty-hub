import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Minus, Plus, Target } from "lucide-react";
import { FeatureHeader } from "@/components/common/bits";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TeamBadge } from "@/components/brand/TeamBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { isFinished, isLive, type FixtureWithTeams } from "@/lib/data";
import { cn } from "@/lib/utils";

function Stepper({ value, onChange, disabled }: { value: number; onChange: (n: number) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <Button type="button" variant="outline" size="iconSm" disabled={disabled} onClick={() => onChange(Math.min(20, value + 1))} aria-label="+"><Plus className="h-4 w-4" /></Button>
      <span className="scoreboard flex h-14 w-12 items-center justify-center rounded-xl bg-foreground text-4xl font-bold text-background">{value}</span>
      <Button type="button" variant="outline" size="iconSm" disabled={disabled} onClick={() => onChange(Math.max(0, value - 1))} aria-label="-"><Minus className="h-4 w-4" /></Button>
    </div>
  );
}

function Row({ team, name, value, onChange, disabled }: { team: FixtureWithTeams["home_team"]; name: string; value: number; onChange: (n: number) => void; disabled?: boolean }) {
  const { lang } = useI18n();
  return (
    <div className="flex items-center gap-3">
      <TeamBadge size="sm" shortName={team?.short_name || name.slice(0, 3)} primary={team?.primary_color} secondary={team?.secondary_color} />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{(lang === "ar" && team?.name_ar) || team?.name || name}</span>
      <div className="flex items-center gap-1" dir="ltr">
        <Button type="button" variant="outline" size="iconSm" disabled={disabled || value === 0} onClick={() => onChange(Math.max(0, value - 1))} aria-label="-"><Minus /></Button>
        <span className="scoreboard w-9 text-center text-2xl font-bold">{value}</span>
        <Button type="button" variant="outline" size="iconSm" disabled={disabled} onClick={() => onChange(Math.min(20, value + 1))} aria-label="+"><Plus /></Button>
      </div>
    </div>
  );
}

/** After kick-off: the score (live or final) and the fan's locked pick, instead of the input. */
function ResultView({ fixture, existing, compact }: { fixture: FixtureWithTeams; existing?: { home_score: number; away_score: number; points: number | null } | null; compact: boolean }) {
  const { t, lang } = useI18n();
  const done = isFinished(fixture.status), live = isLive(fixture.status);
  const hasScore = fixture.home_score !== null && fixture.home_score !== undefined && fixture.away_score !== null && fixture.away_score !== undefined;
  const name = (team: FixtureWithTeams["home_team"], n: string) => (lang === "ar" && team?.name_ar) || team?.name || n;
  const status = done ? t("predict.ft") : live ? t("match.live") : t("predict.lockedShort");
  const sides = [
    { team: fixture.home_team, n: fixture.home_team_name, s: fixture.home_score },
    { team: fixture.away_team, n: fixture.away_team_name, s: fixture.away_score },
  ];
  return (
    <div>
      {compact ? (
        <div className="space-y-2">
          {sides.map(({ team, n, s }, i) => (
            <div key={i} className="flex items-center gap-3">
              <TeamBadge size="sm" shortName={team?.short_name || n.slice(0, 3)} primary={team?.primary_color} secondary={team?.secondary_color} />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{name(team, n)}</span>
              <span className="scoreboard w-9 text-center text-2xl font-bold">{hasScore ? s : "–"}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center gap-4" dir="ltr">
          <TeamBadge size="md" shortName={fixture.home_team?.short_name || fixture.home_team_name.slice(0, 3)} primary={fixture.home_team?.primary_color} secondary={fixture.home_team?.secondary_color} />
          <span className="scoreboard text-5xl font-bold">{hasScore ? `${fixture.home_score}–${fixture.away_score}` : "–"}</span>
          <TeamBadge size="md" shortName={fixture.away_team?.short_name || fixture.away_team_name.slice(0, 3)} primary={fixture.away_team?.primary_color} secondary={fixture.away_team?.secondary_color} />
        </div>
      )}
      <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2 text-xs">
        <span className={cn("rounded-full px-2 py-0.5 font-bold", live ? "bg-destructive text-destructive-foreground" : "bg-foreground text-background")}>{status}</span>
        {existing ? (
          <span className="flex items-center gap-2 font-semibold">
            <span className="text-muted-foreground">{t("predict.youSaid")} <span dir="ltr">{existing.home_score}–{existing.away_score}</span></span>
            {done && existing.points !== null && (
              <span className={cn("scoreboard rounded-full px-2 py-0.5 font-bold", existing.points === 3 ? "bg-gold text-accent-foreground" : existing.points === 1 ? "bg-brand-soft text-brand" : "bg-muted text-muted-foreground")}>+{existing.points}</span>
            )}
          </span>
        ) : <span className="text-muted-foreground">{t("predict.noPick")}</span>}
      </div>
    </div>
  );
}

export function PredictionInput({ fixture, compact = false, bare = false }: { fixture: FixtureWithTeams; compact?: boolean; bare?: boolean }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const locked = new Date(fixture.kickoff_at).getTime() <= Date.now();
  const { data: existing } = useQuery({
    queryKey: ["prediction", fixture.id, user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("predictions").select("*").eq("fixture_id", fixture.id).eq("user_id", user!.id).maybeSingle()).data,
  });
  const [h, setH] = useState(0);
  const [a, setA] = useState(0);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (existing) { setH(existing.home_score); setA(existing.away_score); } }, [existing]);

  async function save() {
    if (!user) { navigate(`/auth?next=${encodeURIComponent(window.location.pathname)}`); return; }
    setSaving(true);
    const { error } = existing
      ? await supabase.from("predictions").update({ home_score: h, away_score: a }).eq("id", existing.id)
      : await supabase.from("predictions").insert({ user_id: user.id, fixture_id: fixture.id, home_score: h, away_score: a });
    setSaving(false);
    if (error) return toast.error(t("predict.locked"));
    toast.success(t("predict.saved"));
    qc.invalidateQueries({ queryKey: ["prediction", fixture.id, user.id] });
    qc.invalidateQueries({ queryKey: ["my-predictions"] });
  }

  if (locked) return (
    <div className={cn(!bare && "card", !bare && (compact ? "p-3" : "p-4"))}>
      {!compact && <div className="mb-4"><FeatureHeader icon={<Target />} tone="brand" title={t("predict.yourPrediction")} sub={t("predict.hint")} /></div>}
      <ResultView fixture={fixture} existing={existing} compact={compact} />
    </div>
  );
  return (
    <div className={cn(!bare && "card", !bare && (compact ? "p-3" : "p-4"))}>
      {!compact && <div className="mb-4"><FeatureHeader icon={<Target />} tone="brand" title={t("predict.yourPrediction")} sub={t("predict.hint")} /></div>}
      {compact ? (
        <div className="space-y-2">
          <Row team={fixture.home_team} name={fixture.home_team_name} value={h} onChange={setH} />
          <Row team={fixture.away_team} name={fixture.away_team_name} value={a} onChange={setA} />
        </div>
      ) : (
        <div className="flex items-center justify-center gap-3" dir="ltr">
          <TeamBadge size="md" shortName={fixture.home_team?.short_name || fixture.home_team_name.slice(0, 3)} primary={fixture.home_team?.primary_color} secondary={fixture.home_team?.secondary_color} />
          <Stepper value={h} onChange={setH} />
          <span className="scoreboard text-2xl text-muted-foreground">–</span>
          <Stepper value={a} onChange={setA} />
          <TeamBadge size="md" shortName={fixture.away_team?.short_name || fixture.away_team_name.slice(0, 3)} primary={fixture.away_team?.primary_color} secondary={fixture.away_team?.secondary_color} />
        </div>
      )}
      <Button className={cn("w-full", compact ? "mt-3 h-10" : "mt-4")} variant={existing ? "outline" : "default"} onClick={save} disabled={saving}>{!user ? t("predict.signInToSave") : existing ? t("predict.update") : t("predict.save")}</Button>
    </div>
  );
}
