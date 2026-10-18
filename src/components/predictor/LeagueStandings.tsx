import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ListOrdered } from "lucide-react";
import { Chip } from "@/components/common/bits";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { compLabel } from "@/lib/competitions";
import { cn } from "@/lib/utils";

type Row = { pos: number; team: string; team_ar: string | null; team_id: string | null; points: number; played: number };
type Standing = { comp_code: string; groups: { group: string | null; rows: Row[] }[]; fetched_at: string | null };

/** "Show the table": current standings (position, team, points) of the league's competitions, one tab per competition. */
export function LeagueStandings({ comps }: { comps: string[] }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["standings", comps.join(",")],
    enabled: open && comps.length > 0,
    staleTime: 30 * 60_000,
    queryFn: async () => ((await supabase.functions.invoke("standings", { body: { codes: comps } })).data?.standings ?? []) as Standing[],
  });
  if (!comps.length) return null;
  const comp = pick ?? comps[0];
  const st = data?.find((s) => s.comp_code === comp);
  const groups = (st?.groups ?? []).filter((g) => g.rows.length);

  return (
    <div className="card mt-4 overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 px-4 py-3 text-start font-bold" aria-expanded={open}>
        <ListOrdered className="h-5 w-5 text-brand" />
        <span className="flex-1">{t("league.standings")}</span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="border-t px-4 pb-4 pt-3">
          {comps.length > 1 && (
            <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4">
              {comps.map((c) => <Chip key={c} active={c === comp} onClick={() => setPick(c)}>{compLabel(t as never, c, c)}</Chip>)}
            </div>
          )}
          {isLoading ? <p className="py-4 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
            : !groups.length ? <p className="rounded-xl bg-surface px-3 py-4 text-center text-sm text-muted-foreground">{t("league.standingsNone")}</p>
            : groups.map((g, gi) => (
              <div key={gi} className={cn(gi > 0 && "mt-4")}>
                {g.group && <p className="mb-1 eyebrow">{g.group}</p>}
                <div className="grid grid-cols-[2rem_1fr_3rem] gap-2 border-b pb-1.5 text-xs font-semibold text-muted-foreground">
                  <span>#</span><span>{t("league.team")}</span><span className="text-end">{t("league.pts")}</span>
                </div>
                {g.rows.map((r) => (
                  <div key={`${r.pos}-${r.team}`} className="grid grid-cols-[2rem_1fr_3rem] items-center gap-2 border-b py-1.5 text-sm last:border-0">
                    <span className="scoreboard text-muted-foreground">{r.pos}</span>
                    <span className="truncate font-medium">{(lang === "ar" && r.team_ar) || r.team}</span>
                    <span className="scoreboard text-end font-bold">{r.points}</span>
                  </div>
                ))}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
