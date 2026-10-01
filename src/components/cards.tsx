import { Link } from "react-router-dom";
import { ChevronRight, MapPin, Users, Tv, Volume2, Wine, Coffee, Baby, BadgeCheck } from "lucide-react";
import { TeamBadge } from "@/components/brand/TeamBadge";
import { DemoChip, Initials, LivePill } from "@/components/common/bits";
import { useI18n } from "@/i18n/I18nContext";
import { isFinished, isLive, loc, partyTime, usePartyCounts, type GroupFull, type LeaderRow, type PartyFull, type Venue } from "@/lib/data";
import { cn } from "@/lib/utils";

/** Date "ticket stub": weekday, day, month stacked. */
function DateStub({ iso, muted }: { iso: string; muted?: boolean }) {
  const { formatDateTime } = useI18n();
  return (
    <div className={cn("flex w-14 shrink-0 flex-col items-center justify-center rounded-xl py-2 text-center", muted ? "bg-muted text-muted-foreground" : "bg-foreground text-background")}>
      <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{formatDateTime(iso, { weekday: "short" })}</span>
      <span className="scoreboard text-2xl font-bold leading-none">{formatDateTime(iso, { day: "numeric" })}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{formatDateTime(iso, { month: "short" })}</span>
    </div>
  );
}

export function PartyCard({ party, showGroup = true }: { party: PartyFull; showGroup?: boolean }) {
  const { t, lang, formatDateTime } = useI18n();
  const { data: counts } = usePartyCounts(party.id);
  const f = party.fixture;
  const live = isLive(f?.status) || party.status === "live";
  const done = isFinished(f?.status) || party.status === "finished";
  const when = partyTime(party);
  const homeName = (lang === "ar" && f?.home_team?.name_ar) || f?.home_team?.name || f?.home_team_name;
  const awayName = (lang === "ar" && f?.away_team?.name_ar) || f?.away_team?.name || f?.away_team_name;
  return (
    <Link to={`/party/${party.id}`} className="card card-hover flex min-w-0 items-center gap-3 p-3 pe-4">
      <DateStub iso={when} muted={done} />
      <div className="min-w-0 flex-1">
        {f ? (
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex shrink-0 -space-x-1.5 rtl:space-x-reverse">
              <TeamBadge size="xs" shortName={f.home_team?.short_name || f.home_team_name.slice(0, 3)} primary={f.home_team?.primary_color} secondary={f.home_team?.secondary_color} />
              <TeamBadge size="xs" shortName={f.away_team?.short_name || f.away_team_name.slice(0, 3)} primary={f.away_team?.primary_color} secondary={f.away_team?.secondary_color} />
            </span>
            <p className="min-w-0 flex-1 truncate font-bold">
              {homeName} <span className="font-medium text-muted-foreground">{done ? <span className="scoreboard text-foreground" dir="ltr">{f.home_score}–{f.away_score}</span> : t("common.vs")}</span> {awayName}
            </p>
          </div>
        ) : <p className="flex items-center gap-1.5 truncate font-bold"><Tv className="h-4 w-4" />{party.title}</p>}
        <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
          <span className="scoreboard text-sm font-semibold text-foreground">{formatDateTime(when, { hour: "2-digit", minute: "2-digit", hour12: false })}</span>
          <span aria-hidden>·</span>
          <MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{loc(party.venue, "name", lang) || t("party.venueTbc")}</span>
        </p>
        {(showGroup && party.group) || live || party.is_demo || (!done && party.venue_status !== "confirmed" && party.venue_status !== "none") ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {live && <LivePill />}
            {!done && party.venue_status === "pending" && <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{t("org.status_pending")}</span>}
            {!done && party.venue_status === "declined" && <span className="rounded-md bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">{t("org.status_declined")}</span>}
            {showGroup && party.group && <span className="truncate text-xs font-semibold text-brand">{loc(party.group, "name", lang)}</span>}
            <DemoChip show={party.is_demo} />
          </div>
        ) : null}
      </div>
      <div className="shrink-0 text-center">
        <p className="scoreboard text-2xl font-bold leading-none">{done ? counts?.checked_in ?? 0 : counts?.going ?? 0}</p>
        <p className="mt-0.5 text-[10px] font-semibold text-muted-foreground">{done ? t("party.checkedIn") : t("party.going")}</p>
      </div>
    </Link>
  );
}

export function GroupCard({ group, memberCount }: { group: GroupFull; memberCount?: number }) {
  const { t, lang } = useI18n();
  const team = group.team;
  return (
    <Link to={`/g/${group.slug}`} className="card card-hover flex items-center gap-3 p-3 pe-4">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl" style={{ background: `${team?.primary_color ?? "#00C566"}14` }}>
        <TeamBadge shortName={team?.short_name || "FC"} primary={team?.primary_color} secondary={team?.secondary_color} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate font-bold">{loc(group, "name", lang)}</p>
          {group.is_official && <BadgeCheck className="h-4 w-4 shrink-0 text-brand" aria-label={t("group.official")} />}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {loc(team, "name", lang)} · {t(`city.${group.city}` as never) || group.city}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          {memberCount !== undefined && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground"><Users className="h-3.5 w-3.5 text-muted-foreground" />{t("home.members", { n: memberCount })}</span>
          )}
          <DemoChip show={group.is_demo} />
        </div>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground rtl:rotate-180" />
    </Link>
  );
}

export function VenueFacts({ venue }: { venue: Venue }) {
  const { t } = useI18n();
  const chips = [
    venue.screens ? { icon: Tv, label: t("venue.screens", { n: venue.screens }) } : null,
    venue.has_sound ? { icon: Volume2, label: t("venue.sound") } : null,
    venue.alcohol_free ? { icon: Coffee, label: t("venue.alcoholFree") } : venue.alcohol_free === false ? { icon: Wine, label: t("venue.licensed") } : null,
    venue.family_friendly ? { icon: Baby, label: t("venue.family") } : null,
    venue.capacity ? { icon: Users, label: t("venue.capacity", { n: venue.capacity }) } : null,
  ].filter(Boolean) as { icon: typeof Tv; label: string }[];
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map(({ icon: Icon, label }) => (
        <span key={label} className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1.5 text-xs font-medium"><Icon className="h-3.5 w-3.5 text-muted-foreground" />{label}</span>
      ))}
    </div>
  );
}

export function VenueCard({ venue }: { venue: Venue }) {
  const { lang, t } = useI18n();
  return (
    <Link to={`/venues/${venue.id}`} className="card card-hover block p-4">
      <div className="flex items-center gap-2">
        <p className="font-bold">{loc(venue, "name", lang)}</p>
        <DemoChip show={venue.is_demo} />
      </div>
      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{[venue.area, t(`city.${venue.city}` as never)].filter(Boolean).join(" · ")}</p>
      <div className="mt-3"><VenueFacts venue={venue} /></div>
    </Link>
  );
}

const podium = ["bg-gold text-accent-foreground", "bg-[#D9DEE5] text-foreground", "bg-[#E8C9A8] text-foreground"];

export function LeaderboardTable({ rows: input, currentUserId, sortBy = "points" }: { rows: LeaderRow[]; currentUserId?: string; sortBy?: "points" | "caps" }) {
  const { t } = useI18n();
  const rows = [...input].sort((a, b) => sortBy === "caps" ? b.caps - a.caps || b.prediction_points - a.prediction_points : b.prediction_points - a.prediction_points || b.exact_scores - a.exact_scores);
  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-[2rem_1fr_3rem_3rem_3rem] gap-2 border-b bg-surface px-4 py-2.5 eyebrow">
        <span>#</span><span>{t("league.fan")}</span><span className="text-end">{t("league.pts")}</span><span className="text-end">{t("league.exact")}</span><span className="text-end">{t("league.caps")}</span>
      </div>
      {rows.map((r, i) => (
        <div key={r.user_id} className={cn("grid grid-cols-[2rem_1fr_3rem_3rem_3rem] items-center gap-2 border-b px-4 py-3 text-sm last:border-0", r.user_id === currentUserId && "bg-brand-soft")}>
          <span className={cn("scoreboard flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold", podium[i] ?? "text-muted-foreground")}>{i + 1}</span>
          <span className="flex min-w-0 items-center gap-2"><Initials name={r.full_name} className="h-7 w-7" /><span className="truncate font-medium">{r.full_name ?? "—"}</span></span>
          <span className={cn("scoreboard text-end text-lg", sortBy === "points" ? "font-bold" : "text-muted-foreground")}>{r.prediction_points}</span>
          <span className="scoreboard text-end text-lg text-muted-foreground">{r.exact_scores}</span>
          <span className={cn("scoreboard text-end text-lg", sortBy === "caps" ? "font-bold" : "text-muted-foreground")}>{r.caps}</span>
        </div>
      ))}
    </div>
  );
}
