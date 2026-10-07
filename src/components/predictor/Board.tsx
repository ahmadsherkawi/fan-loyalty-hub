import { Initials } from "@/components/common/bits";
import { useI18n } from "@/i18n/I18nContext";
import type { BoardRow } from "@/lib/predictor";
import { cn } from "@/lib/utils";

const podium = ["bg-gold text-accent-foreground", "bg-[#D9DEE5] text-foreground", "bg-[#E8C9A8] text-foreground"];

/** A predictor table: rank, fan, points, exact scores. The signed-in fan's row is highlighted. */
export function Board({ rows, me, limit }: { rows: BoardRow[]; me?: string; limit?: number }) {
  const { t } = useI18n();
  const shown = limit ? rows.slice(0, limit) : rows;
  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-[2rem_1fr_3rem_3rem] gap-2 border-b bg-surface px-4 py-2.5 eyebrow">
        <span>#</span><span>{t("league.fan")}</span><span className="text-end">{t("league.pts")}</span><span className="text-end">{t("league.exact")}</span>
      </div>
      {shown.map((r, i) => (
        <div key={r.user_id} className={cn("grid grid-cols-[2rem_1fr_3rem_3rem] items-center gap-2 border-b px-4 py-3 text-sm last:border-0", r.user_id === me && "bg-brand-soft")}>
          <span className={cn("scoreboard flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold", r.points > 0 ? podium[i] ?? "text-muted-foreground" : "text-muted-foreground")}>{i + 1}</span>
          <span className="flex min-w-0 items-center gap-2"><Initials name={r.name} className="h-7 w-7" /><span className="truncate font-medium">{r.name}</span></span>
          <span className="scoreboard text-end text-lg font-bold">{r.points}</span>
          <span className="scoreboard text-end text-lg text-muted-foreground">{r.exact}</span>
        </div>
      ))}
    </div>
  );
}
