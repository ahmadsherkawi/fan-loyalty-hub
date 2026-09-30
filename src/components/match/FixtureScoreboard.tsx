import type { ReactNode } from "react";
import { TeamBadge } from "@/components/brand/TeamBadge";
import { LivePill } from "@/components/common/bits";
import { useI18n } from "@/i18n/I18nContext";
import { isFinished, isLive, type FixtureWithTeams } from "@/lib/data";
import { cn } from "@/lib/utils";

function Side({ name, team }: { name: string; team: FixtureWithTeams["home_team"] }) {
  const { lang } = useI18n();
  const label = (lang === "ar" && team?.name_ar) || team?.name || name;
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2.5 text-center">
      <TeamBadge shortName={team?.short_name || name.slice(0, 3)} primary={team?.primary_color} secondary={team?.secondary_color} size="xl" />
      <span className="line-clamp-2 text-sm font-bold leading-tight text-white">{label}</span>
    </div>
  );
}

/** The dark "stadium" match card — the one dark surface on a white app, so it always leads the eye. */
export function FixtureScoreboard({ fixture, footer, className }: { fixture: FixtureWithTeams; footer?: ReactNode; className?: string }) {
  const { t, formatDateTime } = useI18n();
  const live = isLive(fixture.status);
  const done = isFinished(fixture.status);
  return (
    <div className={cn("overflow-hidden rounded-3xl bg-stadium text-white shadow-lift", className)}>
      <div className="p-5 pb-6">
        <div className="mb-4 flex items-center justify-between gap-2 text-xs font-medium text-white/70">
          <span className="truncate">{fixture.competition}</span>
          {live ? <LivePill /> : done ? <span className="rounded-full bg-white/10 px-2 py-0.5 font-semibold text-white">{t("match.fullTime")}</span>
            : <span>{formatDateTime(fixture.kickoff_at, { weekday: "short", day: "numeric", month: "short" })}</span>}
        </div>
        <div className="flex items-center gap-2">
          <Side name={fixture.home_team_name} team={fixture.home_team} />
          <div className="shrink-0 text-center" dir="ltr">
            {live || done ? (
              <p className="scoreboard text-6xl font-bold leading-none">{fixture.home_score ?? 0}<span className="mx-1.5 text-white/40">–</span>{fixture.away_score ?? 0}</p>
            ) : (
              <>
                <p className="scoreboard text-5xl font-bold leading-none">{formatDateTime(fixture.kickoff_at, { hour: "2-digit", minute: "2-digit", hour12: false })}</p>
                <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/60">{t("match.kickoff")}</p>
              </>
            )}
          </div>
          <Side name={fixture.away_team_name} team={fixture.away_team} />
        </div>
      </div>
      {footer && <div className="border-t border-white/10 bg-white/[0.04] px-5 py-3.5">{footer}</div>}
    </div>
  );
}
