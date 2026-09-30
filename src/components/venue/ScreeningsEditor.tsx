import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { Chip } from "@/components/common/bits";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/i18n/I18nContext";
import type { TKey } from "@/i18n/en";
import { supabase } from "@/integrations/supabase/client";
import { FIXTURE_SELECT, type FixtureWithTeams } from "@/lib/data";
import { cn } from "@/lib/utils";

const COMPS = ["PL", "CL", "PD", "SA", "BL1", "FL1", "PPL", "DED"];

/** The venue ticks the games it will show; fans find them in "Where to watch". */
export function ScreeningsEditor({ venueId }: { venueId: string }) {
  const { t, formatDateTime } = useI18n();
  const qc = useQueryClient();
  const [comp, setComp] = useState<string>("all");
  const { data: fixtures } = useQuery({
    queryKey: ["fixtures-3w"],
    queryFn: async () => ((await supabase.from("fixtures").select(FIXTURE_SELECT).gt("kickoff_at", new Date().toISOString())
      .lt("kickoff_at", new Date(Date.now() + 21 * 864e5).toISOString()).order("kickoff_at").limit(400)).data ?? []) as unknown as FixtureWithTeams[],
  });
  const { data: showing } = useQuery({
    queryKey: ["screenings", venueId],
    queryFn: async () => (await supabase.from("venue_screenings").select("*").eq("venue_id", venueId)).data ?? [],
  });
  const byFixture = useMemo(() => new Map((showing ?? []).map((s) => [s.fixture_id, s])), [showing]);
  const list = (fixtures ?? []).filter((f) => comp === "all" ? true : comp === "on" ? byFixture.has(f.id) : f.competition_code === comp);
  const days = list.reduce<Record<string, FixtureWithTeams[]>>((a, f) => { (a[f.kickoff_at.slice(0, 10)] ??= []).push(f); return a; }, {});
  const comps = COMPS.filter((c) => (fixtures ?? []).some((f) => f.competition_code === c));

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["screenings", venueId] });
    qc.invalidateQueries({ queryKey: ["venue-screenings", venueId] });
    qc.invalidateQueries({ queryKey: ["fixture-venues"] });
    qc.invalidateQueries({ queryKey: ["venues-next-games"] });
    qc.invalidateQueries({ queryKey: ["screen-counts"] });
  };
  async function toggle(f: FixtureWithTeams, on: boolean) {
    const { error } = on
      ? await supabase.from("venue_screenings").insert({ venue_id: venueId, fixture_id: f.id })
      : await supabase.from("venue_screenings").delete().eq("venue_id", venueId).eq("fixture_id", f.id);
    if (error && !error.message.includes("duplicate")) toast.error(t("common.error"));
    refresh();
  }
  async function sound(id: string, v: boolean) {
    const { error } = await supabase.from("venue_screenings").update({ sound: v }).eq("id", id);
    if (error) toast.error(t("common.error"));
    refresh();
  }

  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">{t("screen.editorHint", { n: byFixture.size })}</p>
      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip active={comp === "all"} onClick={() => setComp("all")}>{t("common.all")}</Chip>
        <Chip active={comp === "on"} onClick={() => setComp("on")}>{t("screen.showingOnly")}</Chip>
        {comps.map((c) => <Chip key={c} active={comp === c} onClick={() => setComp(c)}>{t(`comp.${c}` as TKey)}</Chip>)}
      </div>
      {Object.entries(days).map(([day, fs]) => (
        <div key={day} className="mb-5">
          <p className="eyebrow mb-2">{formatDateTime(`${day}T12:00:00Z`, { weekday: "long", day: "numeric", month: "long" })}</p>
          <div className="card divide-y">
            {fs.map((f) => {
              const s = byFixture.get(f.id);
              return (
                <div key={f.id} className={cn("flex items-center gap-3 px-4 py-2.5", s && "bg-brand-soft/40")}>
                  <span className="scoreboard w-11 shrink-0 text-sm font-semibold">{formatDateTime(f.kickoff_at, { hour: "2-digit", minute: "2-digit", hour12: false })}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{f.home_team_name} {t("common.vs")} {f.away_team_name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{f.competition}</p>
                  </div>
                  {s && (
                    <button onClick={() => sound(s.id, !s.sound)} className="text-muted-foreground" aria-label={t("venue.sound")}>
                      {s.sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    </button>
                  )}
                  <Switch checked={!!s} onCheckedChange={(v) => toggle(f, v)} aria-label={t("screen.showThis")} />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
