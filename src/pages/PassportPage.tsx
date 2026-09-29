import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award, Download, Lock, MapPin, Share2, Stamp } from "lucide-react";
import { toPng } from "html-to-image";
import { AppShell, BackButton } from "@/components/layout/AppShell";
import { Wordmark } from "@/components/brand/Wordmark";
import { TeamBadge } from "@/components/brand/TeamBadge";
import { CardSkeletons, EmptyState } from "@/components/common/bits";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { loc, useTeams } from "@/lib/data";
import { cn } from "@/lib/utils";

type Passport = {
  caps: number; prediction_points: number; exact_scores: number; predictions_made: number; quiz_points: number; venues: number;
  badges: { key: string; earned_at: string }[];
  history: { created_at: string; home_team_name: string | null; away_team_name: string | null; home_score: number | null; away_score: number | null; venue_name: string | null; group_name: string | null }[];
};
const BADGES = [
  { key: "first_cap", need: 1 }, { key: "caps_5", need: 5 }, { key: "caps_10", need: 10 }, { key: "caps_25", need: 25 }, { key: "caps_50", need: 50 },
] as const;

export default function PassportPage() {
  const { t, lang, formatDateTime } = useI18n();
  const { user, profile } = useAuth();
  const { data: teams } = useTeams();
  const team = teams?.find((x) => x.id === profile?.favorite_team_id);
  const cardRef = useRef<HTMLDivElement>(null);
  const { data: pp, isLoading } = useQuery({
    queryKey: ["passport", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.rpc("my_passport")).data as unknown as Passport,
  });

  async function image() { return cardRef.current ? toPng(cardRef.current, { pixelRatio: 2, cacheBust: true }) : null; }
  async function download() { const u = await image(); if (!u) return; const a = document.createElement("a"); a.href = u; a.download = "jamhoor-passport.png"; a.click(); }
  async function share() {
    const u = await image(); if (!u) return;
    const file = new File([await (await fetch(u)).blob()], "jamhoor-passport.png", { type: "image/png" });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.canShare?.({ files: [file] })) await navigator.share({ files: [file] }).catch(() => undefined); else download();
  }

  if (!user) return <AppShell><EmptyState title={t("passport.signIn")} cta={{ to: "/auth?next=/passport", label: t("nav.signIn") }} /></AppShell>;
  return (
    <AppShell>
      <BackButton />
      <h1 className="text-3xl font-bold">{t("page.passport")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("passport.sub")}</p>
      {isLoading || !pp ? <CardSkeletons n={2} className="mt-6" /> : (
        <>
          <div ref={cardRef} dir={lang === "ar" ? "rtl" : "ltr"} className="relative mt-6 overflow-hidden rounded-3xl p-6 text-white"
            style={{ background: `linear-gradient(135deg, ${team?.primary_color ?? "#1DB954"}, #0A0F0D 80%)` }}>
            <div className="absolute inset-0 bg-pitch-lines opacity-40" />
            <div className="relative flex items-start justify-between">
              <Wordmark />
              {team && <TeamBadge shortName={team.short_name || "FC"} primary={team.primary_color} secondary={team.secondary_color} />}
            </div>
            <p className="relative mt-6 text-xs uppercase tracking-widest opacity-70">{t("passport.holder")}</p>
            <p className="relative font-display text-2xl font-bold">{profile?.full_name}</p>
            <p className="relative text-sm opacity-80">{loc(team, "name", lang)} · {profile?.city ? t(`city.${profile.city}` as never) : ""}</p>
            <div className="relative mt-6 grid grid-cols-3 gap-3">
              <div><p className="scoreboard text-4xl font-bold text-[#F5B301]">{pp.caps}</p><p className="text-xs opacity-70">{t("league.caps")}</p></div>
              <div><p className="scoreboard text-4xl font-bold">{pp.prediction_points}</p><p className="text-xs opacity-70">{t("passport.predPoints")}</p></div>
              <div><p className="scoreboard text-4xl font-bold">{pp.venues}</p><p className="text-xs opacity-70">{t("passport.venues")}</p></div>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button variant="outline" className="flex-1 rounded-full" onClick={download}><Download className="me-1.5 h-4 w-4" />{t("recap.download")}</Button>
            <Button className="flex-1 rounded-full" onClick={share}><Share2 className="me-1.5 h-4 w-4" />{t("common.share")}</Button>
          </div>

          <h2 className="mt-8 flex items-center gap-2 text-lg font-semibold"><Award className="h-5 w-5 text-accent" />{t("passport.badges")}</h2>
          <div className="mt-3 grid grid-cols-3 gap-3 md:grid-cols-5">
            {BADGES.map((b) => {
              const earned = pp.badges.some((x) => x.key === b.key);
              return (
                <div key={b.key} className={cn("rounded-2xl border p-3 text-center", earned ? "border-accent/50 bg-accent/10" : "bg-card opacity-60")}>
                  <div className={cn("mx-auto flex h-12 w-12 items-center justify-center rounded-full", earned ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground")}>
                    {earned ? <span className="scoreboard font-bold">{b.need}</span> : <Lock className="h-4 w-4" />}
                  </div>
                  <p className="mt-2 text-xs font-medium">{t(`badge.${b.key}` as never)}</p>
                </div>
              );
            })}
          </div>

          <h2 className="mt-8 flex items-center gap-2 text-lg font-semibold"><Stamp className="h-5 w-5 text-primary" />{t("passport.stamps")}</h2>
          {pp.history.length === 0 ? <EmptyState title={t("passport.noStamps")} body={t("passport.noStampsBody")} cta={{ to: "/", label: t("passport.findParty") }} /> : (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {pp.history.map((h, i) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl border bg-card p-4">
                  <span className="scoreboard flex h-10 w-10 shrink-0 rotate-[-6deg] items-center justify-center rounded-full border-2 border-dashed border-accent text-xs font-bold text-accent">#{pp.history.length - i}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{h.home_team_name} v {h.away_team_name}{h.home_score !== null ? <span className="scoreboard text-muted-foreground" dir="ltr"> {h.home_score}–{h.away_score}</span> : null}</p>
                    <p className="flex items-center gap-1 truncate text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{h.venue_name} · {h.group_name}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDateTime(h.created_at, { day: "numeric", month: "short" })}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
