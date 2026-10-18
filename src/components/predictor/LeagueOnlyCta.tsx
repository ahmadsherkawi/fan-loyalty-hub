import { Link } from "react-router-dom";
import { Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nContext";
import { compLabel } from "@/lib/competitions";
import { LEAGUE_COMPS } from "@/lib/predictor";
import { cn } from "@/lib/utils";

/** Shown where a game can't be predicted because none of my leagues plays its competition: start one, or join one. */
export function LeagueOnlyCta({ comp, className }: { comp: string | null | undefined; className?: string }) {
  const { t } = useI18n();
  const canStart = !!comp && LEAGUE_COMPS.includes(comp);
  return (
    <div className={cn("card p-4", className)}>
      <div className="flex items-center gap-2"><Target className="h-5 w-5 text-brand" /><p className="font-bold">{t("leagueOnly.title")}</p></div>
      <p className="mt-1 text-sm text-muted-foreground">{canStart ? t("leagueOnly.body", { comp: compLabel(t as never, comp, comp ?? "") }) : t("leagueOnly.bodyAny")}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {canStart && <Button asChild><Link to={`/predictor?new=1&comp=${comp}`}>{t("leagueOnly.start")}</Link></Button>}
        <Button asChild variant={canStart ? "outline" : "default"} className={cn(!canStart && "col-span-2")}><Link to="/predictor">{t("leagueOnly.join")}</Link></Button>
      </div>
    </div>
  );
}
