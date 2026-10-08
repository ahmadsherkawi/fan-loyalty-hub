import { useMemo, useRef, useState } from "react";
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
import { siteUrl, useShareableImage } from "@/lib/share";

const ORDER = ["AGC", "UPL", "ULC", "PL", "CL", "PD", "SPL", "SA", "BL1", "FL1", "ACL", "TSL", "LPL", "UNL", "SKC", "QSL"];
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
  const ref = useRef<HTMLDivElement>(null);
  const { start, end } = uaeDay(offset);

  const { data, isLoading } = useQuery({
    queryKey: ["today-card", offset],
    queryFn: async () => {
      const [{ data: fx }, { data: bc }] = await Promise.all([
        supabase.from("fixtures").select(FIXTURE_SELECT).in("competition_code", ORDER).gte("kickoff_at", start.toISOString()).lt("kickoff_at", end.toISOString()).order("kickoff_at").limit(200),
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

  // Up to 10 games: competitions in UAE order, at most 4 from each
  const groups = useMemo(() => {
    const per = new Map<string, FixtureWithTeams[]>();
    (data?.fixtures ?? []).forEach((f) => { const c = f.competition_code ?? ""; const l = per.get(c) ?? []; if (l.length < 4) per.set(c, [...l, f]); });
    const out: { code: string; games: FixtureWithTeams[] }[] = [];
    let n = 0;
    for (const c of ORDER) { const g = per.get(c); if (!g || n >= 10) continue; const take = g.slice(0, 10 - n); n += take.length; out.push({ code: c, games: take }); }
    return out;
  }, [data]);

  const img = useShareableImage(ref, `jamhoor-games-${start.toISOString().slice(0, 10)}.png`, [offset, lang, groups.length, data?.fixtures.length], 4);
  async function share() { const r = await img.share(`${t("today.shareText")} ${siteUrl("/?ref=today")}`); if (r === "notready") toast(t("common.preparing")); else if (r === "downloaded") toast.success(t("common.saved")); }
  function save() { if (!img.download()) toast(t("common.preparing")); }
  const nm = (f: FixtureWithTeams, side: "home" | "away") => {
    const team = f[`${side}_team`];
    const full = (lang === "ar" && team?.name_ar) || team?.name || f[`${side}_team_name`];
    return full.length > 15 && team?.short_name ? team.short_name : full;
  };
  const channel = (code: string) => { const b = data?.broadcasters.find((x) => x.competition_code === code); return b ? (lang === "ar" ? b.broadcaster_ar : b.broadcaster).split(/[,،]/)[0].trim() : null; };
  const count = groups.reduce((s, g) => s + g.games.length, 0);
  const dense = count > 7;

  return (
    <AppShell>
      <PageTitle title={t("today.title")} sub={t("today.sub")} />
      <div className="mb-4 flex gap-2">
        <Chip active={offset === 0} onClick={() => setOffset(0)}>{t("today.today")}</Chip>
        <Chip active={offset === 1} onClick={() => setOffset(1)}>{t("today.tomorrow")}</Chip>
        <Chip active={offset === 2} onClick={() => setOffset(2)}>{formatDateTime(uaeDay(2).start.toISOString(), { weekday: "long" })}</Chip>
      </div>
      {isLoading ? <CardSkeletons n={1} /> : !count ? <EmptyState title={t("today.none")} /> : (
        <>
          <div className="flex justify-center">
            <div ref={ref} dir={lang === "ar" ? "rtl" : "ltr"} className="relative flex h-[338px] w-[270px] flex-col overflow-hidden px-3.5 pb-3 pt-3.5 text-white"
              style={{ background: "radial-gradient(70% 30% at 50% 0%, rgba(0,197,102,.35), transparent 70%), #0B1220" }}>
              <div className="flex items-center justify-between"><div className="origin-[left_center] scale-[0.7] rtl:origin-[right_center]"><Wordmark invert /></div><span className="rounded-full bg-[#00C566] px-2 py-0.5 text-[7px] font-extrabold text-[#0B1220]">{formatDateTime(start.toISOString(), { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Dubai" } as never)}</span></div>
              <p className="mt-1 text-center text-[17px] font-extrabold leading-none">{offset === 0 ? t("today.cardTitle") : offset === 1 ? t("today.cardTomorrow") : t("today.cardDay", { day: formatDateTime(start.toISOString(), { weekday: "long" }) })}</p>
              <p className="mt-0.5 text-center text-[6.5px] opacity-60">{t("today.uaeTime")}</p>
              <div className="mt-1.5 flex-1 space-y-1 overflow-hidden">
                {groups.map((g) => (
                  <div key={g.code}>
                    <p className="mb-0.5 flex items-center gap-1 text-[7px] font-bold uppercase tracking-wide text-[#3BE08A]"><span className="h-2 w-0.5 rounded bg-[#00C566]" />{compLabel(t as never, g.code, null)}{channel(g.code) && <span className="ms-auto font-semibold normal-case tracking-normal text-white/50">{channel(g.code)}</span>}</p>
                    {g.games.map((f) => (
                      <div key={f.id} className={`grid grid-cols-[1fr_auto_1fr] items-center gap-1 rounded-md bg-white/[0.06] px-1.5 ${dense ? "py-[2px]" : "py-1"} mb-[3px]`}>
                        <span className="flex min-w-0 items-center justify-end gap-1 text-[8px] font-bold"><span className="truncate">{nm(f, "home")}</span><TeamBadge size="xs" className="!h-3.5 !w-3 !text-[3px]" shortName={f.home_team?.short_name || f.home_team_name.slice(0, 3)} primary={f.home_team?.primary_color} secondary={f.home_team?.secondary_color} /></span>
                        <span className="scoreboard rounded bg-[#00C566] px-1 text-[9px] font-bold text-[#0B1220]">{formatDateTime(f.kickoff_at, { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Dubai" } as never)}</span>
                        <span className="flex min-w-0 items-center gap-1 text-[8px] font-bold"><TeamBadge size="xs" className="!h-3.5 !w-3 !text-[3px]" shortName={f.away_team?.short_name || f.away_team_name.slice(0, 3)} primary={f.away_team?.primary_color} secondary={f.away_team?.secondary_color} /><span className="truncate">{nm(f, "away")}</span></span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="mt-1 flex items-center gap-2 rounded-lg bg-white/[0.08] p-1.5">
                <div className="rounded bg-white p-0.5"><QRCodeSVG value={siteUrl("/?ref=today")} size={30} fgColor="#0B1220" /></div>
                <div className="min-w-0"><p className="text-[8px] font-extrabold leading-tight">{t("today.cta")}</p><p className="text-[7px] font-bold text-[#00C566]" dir="ltr">jamhoor.lovable.app</p></div>
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
