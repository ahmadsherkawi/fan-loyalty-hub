import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award, Download, Gift, Lock, MapPin, Share2, Stamp } from "lucide-react";
import { RewardItem, RewardsSummary } from "@/components/rewards/Rewards";
import { toast } from "sonner";
import { useShareableImage } from "@/lib/share";
import { ImagePreview } from "@/components/common/ImagePreview";
import { AppShell, PageTitle } from "@/components/layout/AppShell";
import { Wordmark } from "@/components/brand/Wordmark";
import { TeamBadge } from "@/components/brand/TeamBadge";
import { CardSkeletons, EmptyState } from "@/components/common/bits";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { loc, useMyRewards, useTeams } from "@/lib/data";
import { cn } from "@/lib/utils";
import { BookingRecord } from "@/components/booking/Policy";

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
  const { data: rewards } = useMyRewards(!!user);
  const [showAll, setShowAll] = useState(false);
  const [showPerks, setShowPerks] = useState(false);
  useEffect(() => {
    if (rewards && window.location.hash === "#rewards") document.getElementById("rewards")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [rewards]);
  const { data: pp, isLoading } = useQuery({
    queryKey: ["passport", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.rpc("my_passport")).data as unknown as Passport,
  });

  const img = useShareableImage(cardRef, "jamhoor-passport.png", [pp, lang, team?.id]);
  async function share() {
    const r = await img.share(t("passport.shareText"));
    if (r === "notready") toast(t("common.preparing")); else if (r === "downloaded") toast.success(t("common.saved"));
  }
  function download() { if (!img.download()) toast(t("common.preparing")); }

  if (!user) return <AppShell><EmptyState title={t("passport.signIn")} cta={{ to: "/auth?next=/passport", label: t("nav.signIn") }} /></AppShell>;
  return (
    <AppShell>
      <PageTitle title={t("page.passport")} sub={t("passport.sub")} />
      {isLoading || !pp ? <CardSkeletons n={2} /> : (
        <>
          <div ref={cardRef} dir={lang === "ar" ? "rtl" : "ltr"} className="relative overflow-hidden rounded-3xl p-6 text-white shadow-lift"
            style={{ background: `radial-gradient(120% 90% at 100% 0%, ${team?.primary_color ?? "#00C566"}CC, #0B1220 62%)` }}>
            <div className="absolute inset-0 opacity-[0.07] [background-image:repeating-linear-gradient(135deg,#fff_0_1px,transparent_1px_12px)]" />
            <div className="relative flex items-start justify-between">
              <Wordmark invert />
              {team && <TeamBadge shortName={team.short_name || "FC"} primary={team.primary_color} secondary={team.secondary_color} />}
            </div>
            <p className="relative mt-8 text-[11px] font-semibold uppercase tracking-[0.14em] opacity-60">{t("passport.holder")}</p>
            <p className="relative font-display text-[26px] font-extrabold leading-tight">{profile?.full_name}</p>
            <p className="relative text-sm opacity-80">{loc(team, "name", lang)} · {profile?.city ? t(`city.${profile.city}` as never) : ""}</p>
            <div className="relative mt-6 grid grid-cols-3 gap-3 border-t border-white/15 pt-4">
              <div><p className="scoreboard text-5xl font-bold leading-none text-[#FFC53D]">{pp.caps}</p><p className="mt-1 text-xs opacity-70">{t("league.caps")}</p></div>
              <div><p className="scoreboard text-5xl font-bold leading-none">{pp.prediction_points}</p><p className="mt-1 text-xs opacity-70">{t("passport.predPoints")}</p></div>
              <div><p className="scoreboard text-5xl font-bold leading-none">{pp.venues}</p><p className="mt-1 text-xs opacity-70">{t("passport.venues")}</p></div>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={download}><Download />{t("recap.download")}</Button>
            <Button className="flex-1" onClick={share}><Share2 />{t("common.share")}</Button>
          </div>

          <section id="rewards" className="mt-9">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><Gift className="h-5 w-5 text-gold-ink" />{t("rewards.title")}</h2>
            {rewards && <RewardsSummary rewards={rewards} caps={pp.caps} />}
            <div className="mt-3 space-y-2">
              {(rewards ?? []).filter((r) => r.min_caps > 0 || showPerks).slice(0, showAll ? 99 : 5).map((r) => <RewardItem key={r.id} r={r} />)}
            </div>
            <div className="mt-2 flex gap-2">
              {!showAll && (rewards ?? []).filter((r) => r.min_caps > 0 || showPerks).length > 5 && <Button variant="ghost" size="sm" onClick={() => setShowAll(true)}>{t("rewards.showAll")}</Button>}
              <Button variant="ghost" size="sm" onClick={() => setShowPerks(!showPerks)}>{showPerks ? t("rewards.hidePerks") : t("rewards.showPerks")}</Button>
            </div>
          </section>

          <h2 className="mt-9 flex items-center gap-2 text-lg font-bold"><Award className="h-5 w-5 text-gold-ink" />{t("passport.badges")}</h2>
          <div className="mt-3 grid grid-cols-3 gap-3 md:grid-cols-5">
            {BADGES.map((b) => {
              const earned = pp.badges.some((x) => x.key === b.key);
              return (
                <div key={b.key} className={cn("rounded-2xl border p-3 text-center", earned ? "border-gold/60 bg-gold-soft" : "border-dashed bg-surface")}>
                  <div className={cn("mx-auto flex h-12 w-12 items-center justify-center rounded-full", earned ? "bg-gold text-accent-foreground shadow-card" : "bg-card text-muted-foreground")}>
                    {earned ? <span className="scoreboard font-bold">{b.need}</span> : <Lock className="h-4 w-4" />}
                  </div>
                  <p className={cn("mt-2 text-xs font-semibold", !earned && "text-muted-foreground")}>{t(`badge.${b.key}` as never)}</p>
                </div>
              );
            })}
          </div>

          <h2 className="mt-9 flex items-center gap-2 text-lg font-bold"><Stamp className="h-5 w-5 text-brand" />{t("passport.stamps")}</h2>
          {pp.history.length === 0 ? <EmptyState title={t("passport.noStamps")} body={t("passport.noStampsBody")} cta={{ to: "/", label: t("passport.findParty") }} /> : (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {pp.history.map((h, i) => (
                <div key={i} className="card flex items-center gap-3 p-4">
                  <span className="scoreboard flex h-10 w-10 shrink-0 rotate-[-6deg] items-center justify-center rounded-full border-2 border-dashed border-gold bg-gold-soft text-xs font-bold text-gold-ink">#{pp.history.length - i}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{h.home_team_name} {t("common.vs")} {h.away_team_name}{h.home_score !== null ? <span className="scoreboard text-muted-foreground" dir="ltr"> {h.home_score}–{h.away_score}</span> : null}</p>
                    <p className="flex items-center gap-1 truncate text-xs text-muted-foreground"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{h.venue_name} · {h.group_name}</span></p>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDateTime(h.created_at, { day: "numeric", month: "short" })}</span>
                </div>
              ))}
            </div>
          )}
          <BookingRecord />
        </>
      )}
      <ImagePreview url={img.preview} onClose={img.closePreview} />
    </AppShell>
  );
}
