import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Instagram, MapPin, MessageCircle, Phone, Search, X } from "lucide-react";
import { toast } from "sonner";
import { FeatureHeader } from "@/components/common/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { loc, useVenues, type FixtureWithTeams, type Venue } from "@/lib/data";
import { cn } from "@/lib/utils";

type Answer = "coming" | "not_coming" | "not_showing";
export type FanCount = { venue_id: string; confirmations: number; coming: number; not_showing: number };

/** A random id per browser so one fan's answers replace each other instead of piling up. */
function deviceId(): string {
  try {
    let id = localStorage.getItem("jamhoor.device");
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("jamhoor.device", id); }
    return id;
  } catch { return "anon-" + Math.random().toString(36).slice(2, 12); }
}

/** How many fans confirmed each venue is showing this match / are going. */
export function useFanCounts(fixtureId?: string) {
  return useQuery({
    queryKey: ["fan-counts", fixtureId],
    enabled: !!fixtureId,
    queryFn: async () => (((await (supabase.rpc as any)("screening_fan_counts", { p_fixture: fixtureId })).data ?? []) as FanCount[]),
  });
}

export const waLink = (num: string, text: string) => `https://wa.me/${num.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
export const igLink = (handle: string) => `https://ig.me/m/${handle.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/.*$/, "")}`;

/**
 * Pilot: venues haven't listed their screenings yet, so fans check for us. A fan messages a venue on
 * WhatsApp / Instagram (or calls), then tells us the answer — "showing, I'm going", "showing, not going"
 * or "not showing". Confirmed answers add the venue to "Venues showing it" for everyone.
 */
export function CheckWithVenues({ fixture, showingIds }: { fixture: FixtureWithTeams; showingIds: Set<string> }) {
  const { t, lang, formatDateTime } = useI18n();
  const { profile } = useAuth();
  const qc = useQueryClient();
  const { data: venues } = useVenues();
  const [q, setQ] = useState("");
  const [city, setCity] = useState<string>(profile?.city ?? "all");
  const [asked, setAsked] = useState<Set<string>>(new Set());
  const [done, setDone] = useState<Map<string, Answer>>(new Map());
  const [busy, setBusy] = useState<string | null>(null);
  const [limit, setLimit] = useState(15);

  const cities = useMemo(() => {
    const m = new Map<string, number>();
    (venues ?? []).forEach((v) => v.is_listed && m.set(v.city, (m.get(v.city) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  }, [venues]);

  if (new Date(fixture.kickoff_at).getTime() < Date.now() - 2 * 3600e3) return null;

  const match = `${fixture.home_team_name} ${t("common.vs")} ${fixture.away_team_name}`;
  const when = formatDateTime(fixture.kickoff_at);
  const msg = t("check.msg", { match, when });
  const needle = q.trim().toLowerCase();
  const list = (venues ?? [])
    .filter((v) => v.is_listed && !showingIds.has(v.id) && (v.whatsapp || v.instagram || v.phone))
    .filter((v) => city === "all" || v.city === city)
    .filter((v) => !needle || [v.name, v.name_ar, v.area].some((s) => s?.toLowerCase().includes(needle)))
    .sort((a, b) => Number(!!b.whatsapp) - Number(!!a.whatsapp) || Number(b.venue_type === "bar" || b.venue_type === "cafe") - Number(a.venue_type === "bar" || a.venue_type === "cafe") || a.name.localeCompare(b.name));

  const contacted = (id: string) => setAsked((s) => new Set(s).add(id));

  async function report(v: Venue, answer: Answer) {
    setBusy(v.id);
    const { error } = await (supabase.rpc as any)("report_screening", { p_fixture: fixture.id, p_venue: v.id, p_answer: answer, p_device: deviceId() });
    setBusy(null);
    if (error) return toast.error(error.message.includes("limit") ? t("askv.limit") : error.message.includes("closed") ? t("tables.started") : t("common.error"));
    setDone((m) => new Map(m).set(v.id, answer));
    toast.success(answer === "not_showing" ? t("check.thanksNo") : t("check.thanksYes", { venue: loc(v, "name", lang) }));
    qc.invalidateQueries({ queryKey: ["fixture-venues", fixture.id] });
    qc.invalidateQueries({ queryKey: ["fan-counts", fixture.id] });
  }

  return (
    <div className="card p-4">
      <FeatureHeader icon={<MessageCircle />} title={showingIds.size ? t("check.titleMore") : t("check.title")} sub={t("check.sub")} />
      <div className="relative mt-3">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("check.search")} className="ps-9" />
      </div>
      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
        {["all", ...cities].map((c) => (
          <button key={c} onClick={() => setCity(c)} className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-semibold", city === c ? "bg-foreground text-background" : "bg-surface text-muted-foreground")}>
            {c === "all" ? t("check.allCities") : t(`city.${c}` as never)}
          </button>
        ))}
      </div>
      <div className="mt-3 divide-y rounded-2xl border">
        {list.length === 0 && <p className="px-4 py-5 text-center text-sm text-muted-foreground">{t("askv.noVenues")}</p>}
        {list.slice(0, limit).map((v) => {
          const ans = done.get(v.id);
          return (
            <div key={v.id} className="px-3 py-3">
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{loc(v, "name", lang)}</p>
                  <p className="flex items-center gap-1 truncate text-xs text-muted-foreground"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{[v.area, t(`city.${v.city}` as never)].filter(Boolean).join(" · ")}</span></p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {v.whatsapp && <Button asChild size="xs" className="bg-[#25D366] text-white hover:bg-[#1fb457]"><a href={waLink(v.whatsapp, msg)} target="_blank" rel="noreferrer" onClick={() => contacted(v.id)} aria-label="WhatsApp"><MessageCircle className="h-3.5 w-3.5" /></a></Button>}
                  {v.instagram && <Button asChild size="xs" variant="outline"><a href={igLink(v.instagram)} target="_blank" rel="noreferrer" onClick={() => contacted(v.id)} aria-label="Instagram"><Instagram className="h-3.5 w-3.5" /></a></Button>}
                  {v.phone && <Button asChild size="xs" variant="outline"><a href={`tel:${v.phone.replace(/\s/g, "")}`} onClick={() => contacted(v.id)} aria-label={t("venue.call")}><Phone className="h-3.5 w-3.5" /></a></Button>}
                </div>
              </div>
              {ans ? (
                <p className={cn("mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold", ans === "not_showing" ? "bg-muted text-muted-foreground" : "bg-brand-soft text-brand")}>
                  {ans === "not_showing" ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}{t(`check.done.${ans}` as never)}
                </p>
              ) : asked.has(v.id) && (
                <div className="mt-2 rounded-xl bg-surface p-2">
                  <p className="px-1 text-xs font-semibold">{t("check.whatSaid")}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <Button size="xs" disabled={busy === v.id} onClick={() => report(v, "coming")}>{t("check.coming")}</Button>
                    <Button size="xs" variant="outline" disabled={busy === v.id} onClick={() => report(v, "not_coming")}>{t("check.notComing")}</Button>
                    <Button size="xs" variant="outline" disabled={busy === v.id} onClick={() => report(v, "not_showing")}>{t("check.notShowing")}</Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {list.length > limit && <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => setLimit((n) => n + 20)}>{t("check.more", { n: list.length - limit })}</Button>}
      <p className="mt-3 text-xs text-muted-foreground">{t("check.note")}</p>
    </div>
  );
}
