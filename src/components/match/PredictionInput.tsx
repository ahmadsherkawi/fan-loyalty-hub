import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, Target } from "lucide-react";
import { FeatureHeader } from "@/components/common/bits";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TeamBadge } from "@/components/brand/TeamBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { isFinished, type FixtureWithTeams } from "@/lib/data";
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

export function PredictionInput({ fixture, compact = false, bare = false }: { fixture: FixtureWithTeams; compact?: boolean; bare?: boolean }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
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
    if (!user) return;
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

  const done = isFinished(fixture.status);
  return (
    <div className={cn(!bare && "card", !bare && (compact ? "p-3" : "p-4"))}>
      {!compact && <div className="mb-4"><FeatureHeader icon={<Target />} tone="brand" title={t("predict.yourPrediction")} sub={t("predict.hint")} /></div>}
      {compact ? (
        <div className="space-y-2">
          <Row team={fixture.home_team} name={fixture.home_team_name} value={h} onChange={setH} disabled={locked} />
          <Row team={fixture.away_team} name={fixture.away_team_name} value={a} onChange={setA} disabled={locked} />
        </div>
      ) : (
        <div className="flex items-center justify-center gap-3" dir="ltr">
          <TeamBadge size="md" shortName={fixture.home_team?.short_name || fixture.home_team_name.slice(0, 3)} primary={fixture.home_team?.primary_color} secondary={fixture.home_team?.secondary_color} />
          <Stepper value={h} onChange={setH} disabled={locked} />
          <span className="scoreboard text-2xl text-muted-foreground">–</span>
          <Stepper value={a} onChange={setA} disabled={locked} />
          <TeamBadge size="md" shortName={fixture.away_team?.short_name || fixture.away_team_name.slice(0, 3)} primary={fixture.away_team?.primary_color} secondary={fixture.away_team?.secondary_color} />
        </div>
      )}
      {locked ? (
        <p className="mt-3 rounded-lg bg-surface py-2 text-center text-xs font-semibold text-muted-foreground">
          {existing ? (done && existing.points !== null ? t("predict.points", { n: existing.points }) : t("predict.lockedIn")) : t("predict.closed")}
        </p>
      ) : (
        <Button className={cn("w-full", compact ? "mt-3 h-10" : "mt-4")} variant={existing ? "outline" : "default"} onClick={save} disabled={saving}>{existing ? t("predict.update") : t("predict.save")}</Button>
      )}
    </div>
  );
}
