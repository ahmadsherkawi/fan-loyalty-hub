import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Download, Share2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { AppShell, PageTitle } from "@/components/layout/AppShell";
import { CardSkeletons, Chip, EmptyState } from "@/components/common/bits";
import { ImagePreview } from "@/components/common/ImagePreview";
import { TeamBadge } from "@/components/brand/TeamBadge";
import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { compLabel } from "@/lib/competitions";
import { FIXTURE_SELECT, type FixtureWithTeams } from "@/lib/data";
import { fixtureWeight } from "@/lib/predictor";
import { siteUrl, useShareableImage } from "@/lib/share";

const ORDER = ["AGC", "UPL", "ULC", "PL", "CL", "PD", "SPL", "SA", "BL1", "FL1", "ACL", "EGY", "TSL", "LPL", "UNL", "SKC", "QSL"];
/** Export sizes (270-wide design, saved at 4x = 1080px). The 4:5 card is shrunk and centred inside safe margins so
 * Instagram's square crop, the profile grid and story overlays (name at the top, reply bar at the bottom) never cut it. */
const FORMATS = {
  post: { h: 338, inner: 338, scale: 0.74, top: 44 },
  story: { h: 480, inner: 392, scale: 0.76, top: 74 },
} as const;
/** A full matchday: up to this many games, at most PER_COMP from each competition (its biggest games). */
const MAX_GAMES = 24;
const PER_COMP = 5;
type Format = keyof typeof FORMATS;
type Broadcaster = { competition_code: string; broadcaster: string; broadcaster_ar: string; free_to_air: boolean };

/** UAE calendar day [start, end) for an offset from today */
function uaeDay(offset: number) {
  const now = new Date(Date.now() + 4 * 3600e3); // UAE is UTC+4, no daylight saving
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset) - 4 * 3600e3;
  return { start: new Date(start), end: new Date(start + 864e5) };
}

/**
 * /today — the day's big games as a ready-to-post image (4:5 for X, Instagram and WhatsApp status):
 * kick-off in UAE time, the channel, and how many venues on Jamhoor are showing each one.
 */
export default function TodayPage() {
  const { t, lang, formatDateTime } = useI18n();
  const [offset, setOffset] = useState(0);
  const [params] = useSearchParams();
  const [fmt, setFmt] = useState<Format>(params.get("fmt") === "story" ? "story" : "post");
  const F = FORMATS[fmt];
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // How many games fit: start at the maximum and drop the least important until nothing overflows the poster
  const [cap, setCap] = useState(MAX_GAMES);
  const { start, end } = uaeDay(offset);

  const { data, isLoading } = useQuery({
    queryKey: ["today-card", offset],
    queryFn: async () => {
      const [{ data: fx }, { data: bc }] = await Promise.all([
        supabase.from("fixtures").select(FIXTURE_SELECT).not("status", "in", "(POSTPONED,CANCELLED)").in("competition_code", ORDER).gte("kickoff_at", start.toISOString()).lt("kickoff_at", end.toISOString()).order("kickoff_at").limit(200),
        supabase.from("competition_broadcasters").select("*"),
      ]);
      const fixtures = (fx ?? []) as unknown as FixtureWithTeams[];
      const ids = fixtures.map((f) => f.id);
      const { data: sc } = ids.length ? await supabase.from("venue_screenings").select("fixture_id").in("fixture_id", ids) : { data: [] };
      const showing = new Map<string, number>();
      (sc ?? []).forEach((s: { fixture_id: string }) => showing.set(s.fixture_id, (showing.get(s.fixture_id) ?? 0) + 1));
      return { fixtures, broadcasters: (bc ?? []) as Broadcaster[], showing };
    },
  });

  // The day's games grouped by competition (UAE order). When space is short, the biggest games across all
  // competitions are kept (Zamalek v Al Ahly beats a mid-table Serie A game), at most PER_COMP per competition.
  const groups = useMemo(() => {
    const all = (data?.fixtures ?? []).filter((f) => ORDER.includes(f.competition_code ?? ""));
    const rank = (c: string | null) => ORDER.indexOf(c ?? "");
    const ranked = [...all].sort((a, b) => fixtureWeight(b) - fixtureWeight(a) || rank(a.competition_code) - rank(b.competition_code) || a.kickoff_at.localeCompare(b.kickoff_at));
    const per = new Map<string, FixtureWithTeams[]>();
    let n = 0;
    for (const f of ranked) {
      if (n >= cap) break;
      const c = f.competition_code ?? ""; const l = per.get(c) ?? [];
      if (l.length >= PER_COMP) continue;
      per.set(c, [...l, f]); n++;
    }
    return ORDER.filter((c) => per.has(c)).map((c) => ({ code: c, games: per.get(c)!.sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at)) }));
  }, [data, cap]);
  useLayoutEffect(() => { setCap(MAX_GAMES); }, [data, fmt, lang, offset]);
  useLayoutEffect(() => {
    const el = listRef.current;
    if (el && cap > 4 && (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1)) setCap((c) => c - 1);
  });

  const img = useShareableImage(ref, `jamhoor-games-${start.toISOString().slice(0, 10)}-${fmt}.png`, [offset, lang, fmt, cap, groups.length, data?.fixtures.length], 4);
  async function share() { const r = await img.share(`${t("today.shareText")} ${siteUrl("/?ref=today")}`); if (r === "notready") toast(t("common.preparing")); else if (r === "downloaded") toast.success(t("common.saved")); }
  function save() { if (!img.download()) toast(t("common.preparing")); }
  const nm = (f: FixtureWithTeams, side: "home" | "away") => {
    const team = f[`${side}_team`];
    const full = (lang === "ar" && team?.name_ar) || team?.name || f[`${side}_team_name`];
    if (count > 8) { // the full-day poster wraps long names onto two lines; in English prefer the feed's shorter name ("Man City")
      const feed = f[`${side}_team_name`];
      return lang !== "ar" && feed && feed.length < full.length ? feed : full;
    }
    return full.length > 15 && team?.short_name ? team.short_name : full;
  };
  const channel = (code: string) => { const b = data?.broadcasters.find((x) => x.competition_code === code); return b ? (lang === "ar" ? b.broadcaster_ar : b.broadcaster).split(/[,،]/)[0].trim() : null; };
  const count = groups.reduce((s, g) => s + g.games.length, 0);
  const full = count > 8; // two columns, like a matchday poster
  const time = (f: FixtureWithTeams) => formatDateTime(f.kickoff_at, { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Dubai" } as never);
  const dot = (f: FixtureWithTeams, side: "home" | "away") => <span className="h-[7px] w-[6px] shrink-0 rounded-b-[3px] rounded-t-[1px] ring-[0.5px] ring-white/60" style={{ background: f[`${side}_team`]?.primary_color ?? "#64748b" }} />;

  return (
    <AppShell>
      <PageTitle title={t("today.title")} sub={t("today.sub")} />
      <div className="mb-4 flex gap-2">
        <Chip active={offset === 0} onClick={() => setOffset(0)}>{t("today.today")}</Chip>
        <Chip active={offset === 1} onClick={() => setOffset(1)}>{t("today.tomorrow")}</Chip>
        <Chip active={offset === 2} onClick={() => setOffset(2)}>{formatDateTime(uaeDay(2).start.toISOString(), { weekday: "long" })}</Chip>
      </div>
      <div className="mb-4 flex gap-2">
        <Chip active={fmt === "post"} onClick={() => setFmt("post")}>{t("today.fmtPost")}</Chip>
        <Chip active={fmt === "story"} onClick={() => setFmt("story")}>{t("today.fmtStory")}</Chip>
      </div>
      {isLoading ? <CardSkeletons n={1} /> : !count ? <EmptyState title={t("today.none")} /> : (
        <>
          <div className="flex justify-center">
            <div ref={ref} className="relative w-[270px] overflow-hidden" style={{ height: F.h, background: "radial-gradient(70% 30% at 50% 0%, rgba(0,197,102,.35), transparent 70%), #0B1220" }}>
            <div dir={lang === "ar" ? "rtl" : "ltr"} className="absolute flex w-[270px] flex-col px-3 pb-3 pt-3 text-white"
              style={{ height: F.inner, left: (270 - 270 * F.scale) / 2, top: F.top, transform: `scale(${F.scale})`, transformOrigin: "0 0" }}>
              <div className="flex items-center justify-between"><div className="origin-[left_center] scale-[0.7] rtl:origin-[right_center]"><Wordmark invert /></div><span className="rounded-full bg-[#00C566] px-2 py-0.5 text-[7px] font-extrabold text-[#0B1220]">{formatDateTime(start.toISOString(), { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Dubai" } as never)}</span></div>
              <p className="mt-1 text-center text-[19px] font-extrabold leading-none">{offset === 0 ? t("today.cardTitle") : offset === 1 ? t("today.cardTomorrow") : t("today.cardDay", { day: formatDateTime(start.toISOString(), { weekday: "long" }) })}</p>
              <div className="mx-auto mt-1 h-[2px] w-10 rounded-full bg-[#00C566]" />
              <p className="mt-0.5 text-center text-[6.5px] opacity-60">{t("today.uaeTime")}</p>
              {full ? (
                <div ref={listRef} className="mt-1.5 min-h-0 flex-1 overflow-hidden [column-fill:auto] [column-gap:6px] [columns:2]">
                  {groups.map((g) => (
                    <div key={g.code} className="mb-1.5 break-inside-avoid rounded-md bg-white/[0.06] p-1">
                      <p className="mb-0.5 flex items-center gap-1 text-[6.5px] font-extrabold text-[#3BE08A]"><span className="truncate">{compLabel(t as never, g.code, null)}</span>{channel(g.code) && <span className="ms-auto shrink-0 font-semibold text-white/45">{channel(g.code)}</span>}</p>
                      {g.games.map((f) => (
                        <div key={f.id} className="grid grid-cols-[1fr_auto_1fr] items-center gap-[3px] py-[1.5px]">
                          <span className="flex min-w-0 items-center justify-end gap-[3px] text-[6.5px] font-bold leading-[1.15]"><span className="line-clamp-2 text-end">{nm(f, "home")}</span>{dot(f, "home")}</span>
                          <span className="scoreboard rounded-[3px] bg-[#00C566] px-[3px] text-[7px] font-bold leading-[10px] text-[#0B1220]">{time(f)}</span>
                          <span className="flex min-w-0 items-center gap-[3px] text-[6.5px] font-bold leading-[1.15]">{dot(f, "away")}<span className="line-clamp-2">{nm(f, "away")}</span></span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div ref={listRef} className="mt-1.5 min-h-0 flex-1 space-y-1 overflow-hidden">
                  {groups.map((g) => (
                    <div key={g.code}>
                      <p className="mb-0.5 flex items-center gap-1 text-[7px] font-bold uppercase tracking-wide text-[#3BE08A]"><span className="h-2 w-0.5 rounded bg-[#00C566]" />{compLabel(t as never, g.code, null)}{channel(g.code) && <span className="ms-auto font-semibold normal-case tracking-normal text-white/50">{channel(g.code)}</span>}</p>
                      {g.games.map((f) => (
                        <div key={f.id} className="mb-[3px] grid grid-cols-[1fr_auto_1fr] items-center gap-1 rounded-md bg-white/[0.06] px-1.5 py-1">
                          <span className="flex min-w-0 items-center justify-end gap-1 text-[8px] font-bold"><span className="truncate">{nm(f, "home")}</span><TeamBadge size="xs" className="!h-3.5 !w-3 !text-[3px]" shortName={f.home_team?.short_name || f.home_team_name.slice(0, 3)} primary={f.home_team?.primary_color} secondary={f.home_team?.secondary_color} /></span>
                          <span className="scoreboard rounded bg-[#00C566] px-1 text-[9px] font-bold text-[#0B1220]">{time(f)}</span>
                          <span className="flex min-w-0 items-center gap-1 text-[8px] font-bold"><TeamBadge size="xs" className="!h-3.5 !w-3 !text-[3px]" shortName={f.away_team?.short_name || f.away_team_name.slice(0, 3)} primary={f.away_team?.primary_color} secondary={f.away_team?.secondary_color} /><span className="truncate">{nm(f, "away")}</span></span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-1 flex items-center gap-2 rounded-lg bg-white/[0.08] p-1.5">
                <div className="rounded bg-white p-0.5"><QRCodeSVG value={siteUrl("/?ref=today")} size={32} fgColor="#0B1220" /></div>
                <div className="min-w-0"><p className="text-[8px] font-extrabold leading-tight">{t("today.cta")}</p><p className="text-[7px] font-bold text-[#00C566]" dir="ltr">jamhoor.lovable.app</p></div>
              </div>
            </div>
            </div>
          </div>
          <div className="mx-auto mt-4 grid max-w-xs grid-cols-2 gap-2">
            <Button variant="outline" onClick={save}><Download />{t("pick.save")}</Button>
            <Button onClick={share}><Share2 />{t("common.share")}</Button>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">{t("today.hint")}</p>
        </>
      )}
      <ImagePreview url={img.preview} onClose={img.closePreview} />
    </AppShell>
  );
}
