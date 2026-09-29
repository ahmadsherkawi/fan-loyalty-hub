import { Link } from "react-router-dom";
import { MapPin, Users, Tv, Volume2, Wine, Coffee, Baby, Crown } from "lucide-react";
import { TeamBadge } from "@/components/brand/TeamBadge";
import { DemoChip, Initials } from "@/components/common/bits";
import { useI18n } from "@/i18n/I18nContext";
import { isFinished, isLive, loc, partyTime, usePartyCounts, type GroupFull, type LeaderRow, type PartyFull, type Venue } from "@/lib/data";
import { cn } from "@/lib/utils";

export function PartyCard({ party, showGroup = true }: { party: PartyFull; showGroup?: boolean }) {
  const { t, lang, formatDateTime } = useI18n();
  const { data: counts } = usePartyCounts(party.id);
  const f = party.fixture;
  const live = isLive(f?.status) || party.status === "live";
  const done = isFinished(f?.status) || party.status === "finished";
  const cap = party.capacity ?? 0;
  const pct = cap ? Math.min(100, Math.round(((counts?.going ?? 0) / cap) * 100)) : 0;
  return (
    <Link to={`/party/${party.id}`} className="block rounded-2xl border bg-card p-4 transition-colors hover:border-primary/50">
      <div className="flex items-start gap-3">
        {f ? (
          <div className="flex -space-x-2 rtl:space-x-reverse">
            <TeamBadge size="sm" shortName={f.home_team?.short_name || f.home_team_name.slice(0, 3)} primary={f.home_team?.primary_color} secondary={f.home_team?.secondary_color} />
            <TeamBadge size="sm" shortName={f.away_team?.short_name || f.away_team_name.slice(0, 3)} primary={f.away_team?.primary_color} secondary={f.away_team?.secondary_color} />
          </div>
        ) : <Tv className="h-8 w-8 text-accent" />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold">{f ? `${f.home_team_name} v ${f.away_team_name}` : party.title}</p>
            {live && <span className="flex items-center gap-1 text-[11px] font-semibold text-red-500"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />{t("match.live")}</span>}
            <DemoChip show={party.is_demo} />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {done && f ? <span className="scoreboard font-semibold text-foreground" dir="ltr">{f.home_score}–{f.away_score} · </span> : null}
            {formatDateTime(partyTime(party))}
          </p>
          <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />{loc(party.venue, "name", lang) || t("party.venueTbc")}{party.venue?.area ? ` · ${party.venue.area}` : ""}
          </p>
          {showGroup && party.group && <p className="mt-1 truncate text-xs font-medium text-primary">{loc(party.group, "name", lang)}</p>}
        </div>
        <div className="shrink-0 text-end">
          <p className="scoreboard text-lg font-bold leading-none">{done ? counts?.checked_in ?? 0 : counts?.going ?? 0}</p>
          <p className="text-[10px] text-muted-foreground">{done ? t("party.checkedIn") : t("party.going")}</p>
        </div>
      </div>
      {!done && cap > 0 && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>
      )}
    </Link>
  );
}

export function GroupCard({ group, memberCount }: { group: GroupFull; memberCount?: number }) {
  const { t, lang } = useI18n();
  const team = group.team;
  return (
    <Link to={`/g/${group.slug}`} className="flex items-center gap-3 rounded-2xl border bg-card p-4 transition-colors hover:border-primary/50">
      <TeamBadge shortName={team?.short_name || "FC"} primary={team?.primary_color} secondary={team?.secondary_color} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-semibold">{loc(group, "name", lang)}</p>
          {group.is_official && <Crown className="h-3.5 w-3.5 text-accent" aria-label={t("group.official")} />}
          <DemoChip show={group.is_demo} />
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {t(`city.${group.city}` as never) || group.city}{group.home_venue ? ` · ${loc(group.home_venue, "name", lang)}` : ""}
        </p>
      </div>
      {memberCount !== undefined && (
        <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5" />{memberCount}</span>
      )}
    </Link>
  );
}

export function VenueFacts({ venue }: { venue: Venue }) {
  const { t } = useI18n();
  const chips = [
    venue.screens ? { icon: Tv, label: t("venue.screens", { n: venue.screens }) } : null,
    venue.has_sound ? { icon: Volume2, label: t("venue.sound") } : null,
    venue.alcohol_free ? { icon: Coffee, label: t("venue.alcoholFree") } : { icon: Wine, label: t("venue.licensed") },
    venue.family_friendly ? { icon: Baby, label: t("venue.family") } : null,
    venue.capacity ? { icon: Users, label: t("venue.capacity", { n: venue.capacity }) } : null,
  ].filter(Boolean) as { icon: typeof Tv; label: string }[];
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map(({ icon: Icon, label }) => (
        <span key={label} className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs"><Icon className="h-3.5 w-3.5" />{label}</span>
      ))}
    </div>
  );
}

export function VenueCard({ venue }: { venue: Venue }) {
  const { lang, t } = useI18n();
  return (
    <Link to={`/venues/${venue.id}`} className="block rounded-2xl border bg-card p-4 transition-colors hover:border-primary/50">
      <div className="flex items-center gap-2">
        <p className="font-semibold">{loc(venue, "name", lang)}</p>
        <DemoChip show={venue.is_demo} />
      </div>
      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{[venue.area, t(`city.${venue.city}` as never)].filter(Boolean).join(" · ")}</p>
      <div className="mt-3"><VenueFacts venue={venue} /></div>
    </Link>
  );
}

const medal = ["bg-accent text-accent-foreground", "bg-zinc-300 text-zinc-900", "bg-amber-700 text-white"];

export function LeaderboardTable({ rows, currentUserId }: { rows: LeaderRow[]; currentUserId?: string }) {
  const { t } = useI18n();
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="grid grid-cols-[2rem_1fr_3.5rem_3.5rem_3rem] gap-2 border-b px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span>#</span><span>{t("league.fan")}</span><span className="text-end">{t("league.pts")}</span><span className="text-end">{t("league.exact")}</span><span className="text-end">{t("league.caps")}</span>
      </div>
      {rows.map((r, i) => (
        <div key={r.user_id} className={cn("grid grid-cols-[2rem_1fr_3.5rem_3.5rem_3rem] items-center gap-2 px-4 py-2.5 text-sm", r.user_id === currentUserId && "bg-primary/10")}>
          <span className={cn("scoreboard flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold", medal[i] ?? "text-muted-foreground")}>{i + 1}</span>
          <span className="flex min-w-0 items-center gap-2"><Initials name={r.full_name} className="h-7 w-7" /><span className="truncate">{r.full_name ?? "—"}</span></span>
          <span className="scoreboard text-end font-bold">{r.prediction_points}</span>
          <span className="scoreboard text-end">{r.exact_scores}</span>
          <span className="scoreboard text-end">{r.caps}</span>
        </div>
      ))}
    </div>
  );
}
