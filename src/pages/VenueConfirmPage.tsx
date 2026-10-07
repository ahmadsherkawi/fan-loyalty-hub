import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Store, Tv } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { CardSkeletons, EmptyState } from "@/components/common/bits";
import { TeamBadge } from "@/components/brand/TeamBadge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { compLabel } from "@/lib/competitions";
import { FIXTURE_SELECT, type FixtureWithTeams } from "@/lib/data";
import { cn } from "@/lib/utils";

type VenueRef = { venue_id: string; name: string; name_ar: string | null; area: string | null; city: string; claimed: boolean; showing: string[] };
const COMPS = ["AGC", "PL", "CL", "UPL", "SPL", "PD", "SA", "BL1", "FL1", "ACL", "TSL", "LPL", "UNL", "ULC"];

/**
 * /v/:code — the one-tap link sent to a venue. No account: they tick the games they're showing this week and
 * fans see them straight away. Claiming the page (for bookings) is offered after, never required.
 */
export default function VenueConfirmPage() {
  const { code = "" } = useParams();
  const { t, lang, formatDateTime } = useI18n();
  const qc = useQueryClient();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(0);

  const { data: venue, isLoading } = useQuery({
    queryKey: ["venue-by-code", code],
    queryFn: async () => (((await supabase.rpc("venue_by_code" as never, { p_code: code } as never)).data ?? []) as unknown as VenueRef[])[0] ?? null,
  });
  const { data: fixtures } = useQuery({
    queryKey: ["venue-confirm-fixtures"],
    enabled: !!venue,
    queryFn: async () => ((await supabase.from("fixtures").select(FIXTURE_SELECT).in("competition_code", COMPS)
      .gt("kickoff_at", new Date().toISOString()).lt("kickoff_at", new Date(Date.now() + 10 * 864e5).toISOString()).order("kickoff_at").limit(300)).data ?? []) as unknown as FixtureWithTeams[],
  });
  // The big games only: up to 6 per competition, competitions in UAE order
  const list = useMemo(() => {
    const per = new Map<string, number>();
    return (fixtures ?? []).filter((f) => { const c = f.competition_code ?? ""; const n = per.get(c) ?? 0; per.set(c, n + 1); return n < 6; })
      .sort((a, b) => COMPS.indexOf(a.competition_code ?? "") - COMPS.indexOf(b.competition_code ?? "") || a.kickoff_at.localeCompare(b.kickoff_at));
  }, [fixtures]);

  if (isLoading) return <AppShell><CardSkeletons /></AppShell>;
  if (!venue) return <AppShell><EmptyState icon={<Store className="h-5 w-5" />} title={t("vc.invalid")} body={t("vc.invalidB")} /></AppShell>;
  const vname = (lang === "ar" && venue.name_ar) || venue.name;
  if (venue.claimed) return <AppShell><EmptyState icon={<Store className="h-5 w-5" />} title={vname} body={t("vc.claimedB")} cta={{ to: "/auth", label: t("nav.signIn") }} /></AppShell>;

  const showing = new Set(venue.showing);
  const nm = (f: FixtureWithTeams, side: "home" | "away") => (lang === "ar" && f[`${side}_team`]?.name_ar) || f[`${side}_team`]?.name || f[`${side}_team_name`];
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  async function save() {
    setSaving(true);
    const { data, error } = await supabase.rpc("venue_confirm_screenings" as never, { p_code: code, p_fixtures: [...picked] } as never);
    setSaving(false);
    if (error) return toast.error(error.message);
    setDone((data as unknown as number) ?? picked.size);
    setPicked(new Set());
    qc.invalidateQueries({ queryKey: ["venue-by-code", code] });
  }

  let lastComp = "";
  return (
    <AppShell>
      <div className="relative -mx-4 -mt-5 overflow-hidden bg-foreground px-4 pb-6 pt-7 text-background md:mx-0 md:mt-0 md:rounded-3xl">
        <div className="absolute inset-0 bg-[radial-gradient(70%_80%_at_100%_0%,hsl(var(--primary)/0.35),transparent_60%)]" aria-hidden />
        <div className="relative">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-primary"><Tv className="h-4 w-4" />{t("vc.eyebrow")}</p>
          <h1 className="mt-1 text-3xl font-extrabold leading-tight">{vname}</h1>
          <p className="text-sm text-background/70">{[venue.area, venue.city].filter(Boolean).join(" · ")}</p>
          <p className="mt-3 text-sm text-background/85">{t("vc.sub")}</p>
        </div>
      </div>

      {done > 0 && (
        <div className="card mt-4 border-primary/40 bg-brand-soft p-4">
          <p className="flex items-center gap-2 font-bold"><Check className="h-5 w-5 text-brand" />{t("vc.doneT", { n: done })}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("vc.doneB")}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button asChild variant="outline"><Link to={`/venues/${venue.venue_id}`}>{t("vc.seePage")}</Link></Button>
            <Button asChild><Link to={`/claim/${code}`}>{t("vc.claim")}</Link></Button>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-2 pb-28">
        {list.map((f) => {
          const on = showing.has(f.id), sel = picked.has(f.id);
          const head = f.competition_code !== lastComp ? (lastComp = f.competition_code ?? "", <h3 key={`h-${f.id}`} className="eyebrow mt-4 first:mt-0">{compLabel(t as never, f.competition_code, f.competition)}</h3>) : null;
          return (
            <div key={f.id}>
              {head}
              <button disabled={on} onClick={() => toggle(f.id)}
                className={cn("card mt-2 flex w-full items-center gap-3 p-3 text-start transition", on ? "border-primary/50 bg-brand-soft" : sel ? "border-primary ring-2 ring-primary/40" : "")}>
                <div className="min-w-0 flex-1 space-y-1">
                  {(["home", "away"] as const).map((side) => (
                    <div key={side} className="flex items-center gap-2"><TeamBadge size="xs" shortName={f[`${side}_team`]?.short_name || f[`${side}_team_name`].slice(0, 3)} primary={f[`${side}_team`]?.primary_color} secondary={f[`${side}_team`]?.secondary_color} /><span className="truncate text-sm font-semibold">{nm(f, side)}</span></div>
                  ))}
                </div>
                <div className="text-end text-xs text-muted-foreground"><p className="scoreboard text-base font-bold text-foreground">{formatDateTime(f.kickoff_at, { hour: "2-digit", minute: "2-digit", hour12: false })}</p><p>{formatDateTime(f.kickoff_at, { weekday: "short", day: "numeric", month: "short" })}</p></div>
                <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2", on || sel ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30")}>{(on || sel) && <Check className="h-4 w-4" />}</span>
              </button>
            </div>
          );
        })}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur">
        <div className="mx-auto max-w-xl">
          <Button className="w-full" size="lg" disabled={!picked.size || saving} onClick={save}>{picked.size ? t("vc.save", { n: picked.size }) : t("vc.pick")}</Button>
          <p className="mt-1.5 text-center text-[11px] text-muted-foreground">{t("vc.note")}</p>
        </div>
      </div>
    </AppShell>
  );
}
