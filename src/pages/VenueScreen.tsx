import { useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Wordmark } from "@/components/brand/Wordmark";
import { TeamBadge } from "@/components/brand/TeamBadge";
import { useI18n } from "@/i18n/I18nContext";
import { isFinished, isLive, loc, useParty, usePartyCounts } from "@/lib/data";

/** Full-screen display for the venue's TV or a tablet on the bar: QR to check in + live counter. */
export default function VenueScreen() {
  const { id } = useParams();
  const { t, lang } = useI18n();
  const { data: party } = useParty(id);
  const { data: counts } = usePartyCounts(id);
  if (!party) return <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">{t("common.loading")}</div>;
  const f = party.fixture;
  const team = party.group?.team;
  const url = `${window.location.origin}/checkin/${party.checkin_code}`;
  return (
    <div className="flex min-h-screen flex-col bg-background bg-floodlight p-8 text-foreground"
      style={{ backgroundImage: `radial-gradient(70% 50% at 50% 0%, ${team?.primary_color ?? "#1DB954"}55, transparent 70%)` }}>
      <div className="flex items-center justify-between">
        <Wordmark />
        <p className="text-xl font-semibold">{loc(party.group, "name", lang)}</p>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-10 lg:flex-row lg:gap-20">
        <div className="text-center">
          {f && (
            <div className="flex items-center justify-center gap-6" dir="ltr">
              <TeamBadge size="lg" shortName={f.home_team?.short_name || f.home_team_name.slice(0, 3)} primary={f.home_team?.primary_color} secondary={f.home_team?.secondary_color} className="scale-150" />
              <span className="scoreboard text-7xl font-bold">{isLive(f.status) || isFinished(f.status) ? `${f.home_score ?? 0}–${f.away_score ?? 0}` : "vs"}</span>
              <TeamBadge size="lg" shortName={f.away_team?.short_name || f.away_team_name.slice(0, 3)} primary={f.away_team?.primary_color} secondary={f.away_team?.secondary_color} className="scale-150" />
            </div>
          )}
          <p className="mt-10 text-lg text-muted-foreground">{t("screen.checkedIn")}</p>
          <p className="scoreboard text-[8rem] font-bold leading-none text-accent">{counts?.checked_in ?? 0}</p>
        </div>
        <div className="text-center">
          <div className="rounded-3xl bg-white p-6"><QRCodeSVG value={url} size={260} /></div>
          <p className="mt-4 text-2xl font-semibold">{t("screen.scan")}</p>
          <p className="mt-1 text-muted-foreground">{t("screen.orCode")} <span className="scoreboard font-bold tracking-[0.2em] text-foreground" dir="ltr">{party.checkin_code}</span></p>
        </div>
      </div>
      <p className="text-center text-sm text-muted-foreground">{t("brand.tagline")}</p>
    </div>
  );
}
