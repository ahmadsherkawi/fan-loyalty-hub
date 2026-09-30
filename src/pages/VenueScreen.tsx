import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Wordmark } from "@/components/brand/Wordmark";
import { TeamBadge } from "@/components/brand/TeamBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { isFinished, isLive, loc, partyTime, useParty, usePartyCounts } from "@/lib/data";
import { checkinWindow } from "@/lib/matchPhase";

type Token = { code: string; seconds_left: number };

/**
 * Full-screen display for the venue TV. The check-in code rotates every 30 seconds,
 * so a code sent over WhatsApp is useless a minute later — you have to be in the room.
 */
export default function VenueScreen() {
  const { id } = useParams();
  const { t, lang } = useI18n();
  const { user, loading } = useAuth();
  const { data: party } = useParty(id);
  const { data: counts } = usePartyCounts(id);
  const { data: token, error, refetch } = useQuery({
    queryKey: ["checkin-token", id],
    enabled: !!id && !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("current_checkin_token", { p_party: id! });
      if (error) throw error;
      return data as unknown as Token;
    },
  });
  const [left, setLeft] = useState(30);
  useEffect(() => { if (token) setLeft(token.seconds_left); }, [token]);
  useEffect(() => {
    const i = setInterval(() => setLeft((s) => { if (s <= 1) { refetch(); return 30; } return s - 1; }), 1000);
    return () => clearInterval(i);
  }, [refetch]);

  if (!loading && !user) return <Centered>{t("screen.signIn")} <Link className="underline" to={`/auth?next=/party/${id}/screen`}>{t("nav.signIn")}</Link></Centered>;
  if (error) return <Centered>{t("screen.notAllowed")}</Centered>;
  if (!party) return <Centered>{t("common.loading")}</Centered>;
  const f = party.fixture;
  const team = party.group?.team;
  const url = token ? `${window.location.origin}/checkin/${token.code}` : "";
  const kickoff = partyTime(party);
  const win = party.venue_status !== "confirmed" ? "unconfirmed" : checkinWindow(kickoff);
  return (
    <div className="flex min-h-screen flex-col bg-foreground p-8 text-white"
      style={{ backgroundImage: `radial-gradient(70% 50% at 50% 0%, ${team?.primary_color ?? "#00C566"}55, transparent 70%)` }}>
      <div className="flex items-center justify-between">
        <Wordmark invert />
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
          <p className="mt-10 text-lg text-white/60">{t("screen.checkedIn")}</p>
          <p className="scoreboard text-[9rem] font-bold leading-none text-primary">{counts?.checked_in ?? 0}</p>
        </div>
        {win !== "open" ? (
          <div className="w-[320px] rounded-3xl border border-white/15 p-8 text-center">
            <p className="text-2xl font-semibold">{win === "early" ? t("screen.opensLater") : win === "closed" ? t("screen.closed") : t("screen.notConfirmed")}</p>
            {win === "early" && <p className="mt-2 text-white/60">{t("checkin.window")}</p>}
          </div>
        ) : (
        <div className="w-[320px] text-center">
          <div className="rounded-3xl bg-white p-6">{token ? <QRCodeSVG value={url} size={260} fgColor="#0B1220" /> : <div className="h-[260px] w-[260px]" />}</div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full bg-primary transition-[width] duration-1000 ease-linear" style={{ width: `${(left / 30) * 100}%` }} /></div>
          <p className="mt-4 text-2xl font-semibold">{t("screen.scan")}</p>
          <p className="mt-1 text-white/60">{t("screen.orCode")} <span className="scoreboard text-2xl font-bold tracking-[0.2em] text-white" dir="ltr">{token?.code ?? "······"}</span></p>
          <p className="mt-1 text-xs text-white/40">{t("screen.rotates", { n: left })}</p>
        </div>
        )}
      </div>
      <p className="text-center text-sm text-white/60">{t("brand.tagline")}</p>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center gap-2 bg-foreground p-8 text-center text-white/70">{children}</div>;
}
