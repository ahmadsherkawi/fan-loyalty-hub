import { Clock } from "lucide-react";
import { useI18n } from "@/i18n/I18nContext";
import type { TKey } from "@/i18n/en";
import { PHASES, type Phase } from "@/lib/matchPhase";
import { cn } from "@/lib/utils";

/** Demo parties only: move the match clock by hand to preview what opens when. */
export function DemoClock({ value, onChange }: { value: Phase; onChange: (p: Phase) => void }) {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-dashed p-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><Clock className="h-3.5 w-3.5" />{t("demo.clock")}</p>
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
        {PHASES.map((p) => (
          <button key={p} onClick={() => onChange(p)} className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold", value === p ? "bg-foreground text-background" : "bg-muted text-muted-foreground")}>
            {t(`phase.${p}` as TKey)}
          </button>
        ))}
      </div>
    </div>
  );
}
