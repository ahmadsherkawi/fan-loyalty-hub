import { useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Download, Share2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { AppShell, BackButton } from "@/components/layout/AppShell";
import { CardSkeletons, EmptyState } from "@/components/common/bits";
import { ImagePreview } from "@/components/common/ImagePreview";
import { TeamBadge } from "@/components/brand/TeamBadge";
import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { compLabel } from "@/lib/competitions";
import { FIXTURE_SELECT, loc, type FixtureWithTeams, type Venue } from "@/lib/data";
import { siteUrl, useShareableImage } from "@/lib/share";

/**
 * /story/:venueId?fixture=… — an Instagram story for a venue: "We're showing <match> — book your table on Jamhoor",
 * with a QR to the venue's Jamhoor page. Jamhoor sends it to venues that confirm a screening; they post it to their followers.
 */
export default function StoryPage() {
  const { venueId } = useParams();
  const [sp] = useSearchParams();
  const fixtureId = sp.get("fixture");
  const { t, lang, formatDateTime } = useI18n();
  const ref = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["story", venueId, fixtureId],
    enabled: !!venueId && !!fixtureId,
    queryFn: async () => {
      const [{ data: v }, { data: f }] = await Promise.all([
        supabase.from("venues").select("*").eq("id", venueId!).maybeSingle(),
        supabase.from("fixtures").select(FIXTURE_SELECT).eq("id", fixtureId!).maybeSingle(),
      ]);
      return { venue: v as unknown as Venue | null, fixture: f as unknown as FixtureWithTeams | null };
    },
  });
  const img = useShareableImage(ref, "jamhoor-story.png", [data?.venue?.id, data?.fixture?.id, lang], 4);

  if (isLoading) return <AppShell><CardSkeletons /></AppShell>;
  const v = data?.venue, f = data?.fixture;
  if (!v || !f) return <AppShell><BackButton /><EmptyState title={t("party.notFound")} /></AppShell>;

  const url = siteUrl(`/venues/${v.id}?ref=story`);
  const name = (side: "home" | "away") => (lang === "ar" && f[`${side}_team`]?.name_ar) || f[`${side}_team`]?.name || f[`${side}_team_name`];
  const h = f.home_team, a = f.away_team;
  async function share() {
    const r = await img.share();
    if (r === "notready") toast(t("common.preparing")); else if (r === "downloaded") toast.success(t("common.saved"));
  }
  function save() { if (!img.download()) toast(t("common.preparing")); }

  return (
    <AppShell>
      <BackButton />
      <div className="flex justify-center">
        <div ref={ref} dir={lang === "ar" ? "rtl" : "ltr"} className="relative flex h-[480px] w-[270px] flex-col items-center overflow-hidden rounded-3xl px-5 pb-5 pt-6 text-center text-white"
          style={{ background: `radial-gradient(70% 40% at 0% 35%, ${h?.primary_color ?? "#00C566"}99, transparent 70%), radial-gradient(70% 40% at 100% 50%, ${a?.primary_color ?? "#00C566"}99, transparent 70%), #0B1220` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#00C566]">{t("story.showing")}</p>
          <p className="mt-1 line-clamp-2 text-2xl font-extrabold leading-tight">{loc(v, "name", lang)}</p>
          <p className="text-xs opacity-70">{v.area ?? v.city}</p>
          <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] opacity-80">{compLabel(t as never, f.competition_code, f.competition)}</p>
          <div className="mt-3 flex items-center justify-center gap-4">
            <div className="flex w-20 flex-col items-center gap-1.5"><TeamBadge size="lg" shortName={h?.short_name || f.home_team_name.slice(0, 3)} primary={h?.primary_color} secondary={h?.secondary_color} /><span className="text-xs font-bold leading-tight">{name("home")}</span></div>
            <span className="scoreboard text-xl font-bold opacity-70">{t("common.vs")}</span>
            <div className="flex w-20 flex-col items-center gap-1.5"><TeamBadge size="lg" shortName={a?.short_name || f.away_team_name.slice(0, 3)} primary={a?.primary_color} secondary={a?.secondary_color} /><span className="text-xs font-bold leading-tight">{name("away")}</span></div>
          </div>
          <p className="scoreboard mt-3 text-3xl font-bold">{formatDateTime(f.kickoff_at, { hour: "2-digit", minute: "2-digit", hour12: false })}</p>
          <p className="text-xs opacity-75">{formatDateTime(f.kickoff_at, { weekday: "long", day: "numeric", month: "long" })}</p>
          <div className="mt-auto flex w-full items-center gap-3 rounded-2xl bg-white/10 p-2.5 text-start">
            <div className="rounded-lg bg-white p-1.5"><QRCodeSVG value={url} size={64} fgColor="#0B1220" /></div>
            <div className="min-w-0">
              <p className="text-sm font-extrabold leading-tight">{t(v.owner_user_id ? "story.book" : "story.find")}</p>
              <div className="mt-1.5 scale-90 origin-[left_center] rtl:origin-[right_center]"><Wordmark invert /></div>
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-4 grid max-w-xs grid-cols-2 gap-2">
        <Button variant="outline" onClick={save}><Download />{t("pick.save")}</Button>
        <Button onClick={share}><Share2 />{t("common.share")}</Button>
      </div>
      <ImagePreview url={img.preview} onClose={img.closePreview} />
    </AppShell>
  );
}
