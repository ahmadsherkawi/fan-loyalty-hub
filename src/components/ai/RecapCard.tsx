import { useRef, useState } from "react";
import { Download, Sparkles, Share2 } from "lucide-react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/brand/Wordmark";
import { TeamBadge } from "@/components/brand/TeamBadge";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import type { PartyFull } from "@/lib/data";

type Recap = { headline_en: string; body_en: string; headline_ar: string; body_ar: string };
type Stats = { checked_in: number; predictions: number; exact_predictors: string[]; motm: string | null };

export function RecapCard({ party }: { party: PartyFull }) {
  const { t, lang } = useI18n();
  const [recap, setRecap] = useState<Recap | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const f = party.fixture;
  const team = party.group?.team;

  async function generate() {
    setBusy(true); setErr(false);
    const { data, error } = await supabase.functions.invoke("jamhoor-ai", { body: { action: "recap", watch_party_id: party.id, lang } });
    setBusy(false);
    if (error || (data as { error?: string })?.error) { setErr(true); return; }
    setRecap((data as { recap: Recap }).recap);
    setStats((data as { stats: Stats }).stats);
  }

  async function asImage() {
    if (!cardRef.current) return null;
    return toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
  }
  async function download() {
    const url = await asImage(); if (!url) return;
    const a = document.createElement("a"); a.href = url; a.download = "jamhoor-recap.png"; a.click();
  }
  async function share() {
    const url = await asImage(); if (!url) return;
    const blob = await (await fetch(url)).blob();
    const file = new File([blob], "jamhoor-recap.png", { type: "image/png" });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.canShare?.({ files: [file] })) await navigator.share({ files: [file] }).catch(() => undefined);
    else download();
  }

  const headline = recap ? (lang === "ar" ? recap.headline_ar : recap.headline_en) : "";
  const body = recap ? (lang === "ar" ? recap.body_ar : recap.body_en) : "";

  return (
    <div className="rounded-3xl border bg-card p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-accent"><Sparkles className="h-5 w-5" /></span>
        <div><h3 className="font-semibold">{t("recap.title")}</h3><p className="text-xs text-muted-foreground">{t("recap.sub")}</p></div>
      </div>
      {!recap && <Button className="mt-4 w-full rounded-full" onClick={generate} disabled={busy}>{busy ? t("recap.generating") : t("recap.generate")}</Button>}
      {err && <p className="mt-3 text-sm text-destructive">{t("common.error")}</p>}
      {recap && f && (
        <>
          <div ref={cardRef} dir={lang === "ar" ? "rtl" : "ltr"} className="mt-4 overflow-hidden rounded-2xl p-6 text-white"
            style={{ background: `radial-gradient(80% 60% at 50% 0%, ${team?.primary_color ?? "#1DB954"}AA, #0A0F0D 75%)` }}>
            <div className="flex items-center justify-between"><Wordmark /><span className="text-xs opacity-70">{party.group?.name}</span></div>
            <div className="mt-6 flex items-center justify-center gap-4">
              <TeamBadge shortName={f.home_team?.short_name || f.home_team_name.slice(0, 3)} primary={f.home_team?.primary_color} secondary={f.home_team?.secondary_color} size="lg" />
              <span className="scoreboard text-5xl font-bold" dir="ltr">{f.home_score ?? "-"}–{f.away_score ?? "-"}</span>
              <TeamBadge shortName={f.away_team?.short_name || f.away_team_name.slice(0, 3)} primary={f.away_team?.primary_color} secondary={f.away_team?.secondary_color} size="lg" />
            </div>
            <h4 className="mt-6 text-center font-display text-xl font-bold">{headline}</h4>
            <p className="mt-2 text-center text-sm opacity-85">{body}</p>
            {stats && (
              <div className="mt-6 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-white/10 p-2"><p className="scoreboard text-xl font-bold">{stats.checked_in}</p><p className="text-[10px] opacity-70">{t("party.checkedIn")}</p></div>
                <div className="rounded-xl bg-white/10 p-2"><p className="scoreboard text-xl font-bold">{stats.exact_predictors.length}</p><p className="text-[10px] opacity-70">{t("recap.exact")}</p></div>
                <div className="rounded-xl bg-white/10 p-2"><p className="truncate text-sm font-bold">{stats.motm ?? "—"}</p><p className="text-[10px] opacity-70">{t("motm.title")}</p></div>
              </div>
            )}
            <p className="mt-5 text-center text-[10px] opacity-60">{party.venue?.name}</p>
          </div>
          <div className="mt-3 flex gap-2">
            <Button variant="outline" className="flex-1 rounded-full" onClick={download}><Download className="me-1.5 h-4 w-4" />{t("recap.download")}</Button>
            <Button className="flex-1 rounded-full" onClick={share}><Share2 className="me-1.5 h-4 w-4" />{t("common.share")}</Button>
          </div>
        </>
      )}
    </div>
  );
}
