import { TeamBadge } from "@/components/brand/TeamBadge";
import { useI18n } from "@/i18n/I18nContext";
import { isFinished, isLive, type FixtureWithTeams } from "@/lib/data";
import { cn } from "@/lib/utils";

function Side({ name, team, align }: { name: string; team: FixtureWithTeams["home_team"]; align: "start" | "end" }) {
  const { lang } = useI18n();
  const label = (lang === "ar" && team?.name_ar) || team?.name || name;
  return (
    <div className={cn("flex min-w-0 flex-1 flex-col items-center gap-2 text-center")}>
      <TeamBadge shortName={team?.short_name || name.slice(0, 3)} primary={team?.primary_color} secondary={team?.secondary_color} size="lg" />
      <span className={cn("line-clamp-2 text-sm font-semibold leading-tight", align === "end" && "")}>{label}</span>
    </div>
  );
}

export function FixtureScoreboard({ fixture, compact = false }: { fixture: FixtureWithTeams; compact?: boolean }) {
  const { t, formatDateTime } = useI18n();
  const live = isLive(fixture.status);
  const done = isFinished(fixture.status);
  return (
    <div className={cn("rounded-3xl border bg-card bg-pitch-lines", compact ? "p-4" : "p-5 md:p-6")}>
      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span className="truncate">{fixture.competition}</span>
        {live ? (
          <span className="flex items-center gap-1.5 font-semibold text-red-500">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />{t("match.live")}
          </span>
        ) : done ? (
          <span className="font-semibold">{t("match.fullTime")}</span>
        ) : (
          <span>{formatDateTime(fixture.kickoff_at)}</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Side name={fixture.home_team_name} team={fixture.home_team} align="start" />
        <div className="scoreboard shrink-0 rounded-2xl bg-background/70 px-4 py-2 text-center text-3xl font-bold" dir="ltr">
          {live || done ? `${fixture.home_score ?? 0} – ${fixture.away_score ?? 0}` : (
            <span className="text-xl">{formatDateTime(fixture.kickoff_at, { hour: "2-digit", minute: "2-digit" })}</span>
          )}
        </div>
        <Side name={fixture.away_team_name} team={fixture.away_team} align="end" />
      </div>
    </div>
  );
}
