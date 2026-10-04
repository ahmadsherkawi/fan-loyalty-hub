import { useRef } from "react";
import { Download, Share2 } from "lucide-react";
import { toast } from "sonner";
import { ImagePreview } from "@/components/common/ImagePreview";
import { Wordmark } from "@/components/brand/Wordmark";
import { TeamBadge } from "@/components/brand/TeamBadge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nContext";
import { siteUrl, useShareableImage } from "@/lib/share";
import type { FixtureWithTeams } from "@/lib/data";

/**
 * A story-sized image of the fan's pick ("My pick: UAE 2–1 KSA"), ready for WhatsApp status and
 * Instagram stories. Every shared pick carries the link back to the predictor.
 */
export function ShareMyPick({ fixture, pick, title, path }: { fixture: FixtureWithTeams; pick: { home_score: number; away_score: number }; title: string; path: string }) {
  const { t, lang, formatDateTime } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const img = useShareableImage(ref, "jamhoor-my-pick.png", [pick.home_score, pick.away_score, lang], 4);
  const url = siteUrl(`${path}?ref=pick`);
  const name = (side: "home" | "away") => (lang === "ar" && fixture[`${side}_team`]?.name_ar) || fixture[`${side}_team`]?.name || fixture[`${side}_team_name`];
  const h = fixture.home_team, a = fixture.away_team;

  async function share() {
    const r = await img.share(`${t("pick.shareText", { h: name("home"), hs: pick.home_score, as: pick.away_score, a: name("away") })} ${url}`);
    if (r === "notready") toast(t("common.preparing")); else if (r === "downloaded") toast.success(t("common.saved"));
  }
  function save() { if (!img.download()) toast(t("common.preparing")); }

  return (
    <div className="card p-4">
      <p className="font-bold">{t("pick.title")}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">{t("pick.sub")}</p>
      <div className="mt-4 flex justify-center">
        <div ref={ref} dir={lang === "ar" ? "rtl" : "ltr"} className="relative flex h-[480px] w-[270px] flex-col items-center overflow-hidden rounded-3xl px-5 py-7 text-center text-white"
          style={{ background: `radial-gradient(70% 45% at 0% 40%, ${h?.primary_color ?? "#00C566"}99, transparent 70%), radial-gradient(70% 45% at 100% 60%, ${a?.primary_color ?? "#00C566"}99, transparent 70%), #0B1220` }}>
          <Wordmark invert />
          <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.16em] text-[#00C566]">{title}</p>
          <p className="mt-1 text-xl font-extrabold leading-tight">{t("pick.myPick")}</p>
          <div className="mt-7 flex items-center justify-center gap-3" dir="ltr">
            <TeamBadge size="lg" shortName={h?.short_name || fixture.home_team_name.slice(0, 3)} primary={h?.primary_color} secondary={h?.secondary_color} />
            <span className="scoreboard text-6xl font-bold">{pick.home_score}–{pick.away_score}</span>
            <TeamBadge size="lg" shortName={a?.short_name || fixture.away_team_name.slice(0, 3)} primary={a?.primary_color} secondary={a?.secondary_color} />
          </div>
          <p className="mt-3 text-sm font-semibold">{name("home")} {t("common.vs")} {name("away")}</p>
          <p className="mt-1 text-xs opacity-70">{formatDateTime(fixture.kickoff_at, { weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
          <div className="mt-auto w-full rounded-2xl bg-white/10 px-3 py-3">
            <p className="text-base font-extrabold">{t("pick.yours")}</p>
            <p className="mt-0.5 text-sm font-bold text-[#00C566]" dir="ltr">{url.replace(/^https?:\/\//, "").replace("?ref=pick", "")}</p>
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={save}><Download />{t("pick.save")}</Button>
        <Button onClick={share}><Share2 />{t("common.share")}</Button>
      </div>
      <ImagePreview url={img.preview} onClose={img.closePreview} />
    </div>
  );
}
