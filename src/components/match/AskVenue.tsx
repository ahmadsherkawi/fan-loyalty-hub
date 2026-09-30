import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock, MapPin, Megaphone, Tv, X } from "lucide-react";
import { toast } from "sonner";
import { FeatureHeader } from "@/components/common/bits";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { loc, useVenues, type FixtureWithTeams } from "@/lib/data";
import { cn } from "@/lib/utils";

type Broadcaster = { competition_code: string; broadcaster: string; broadcaster_ar: string; free_to_air: boolean };

/** Who shows a competition in the UAE, from our own short list (the match feeds don't carry TV data). */
export function useBroadcaster(code?: string | null) {
  const { data } = useQuery({
    queryKey: ["broadcasters"],
    staleTime: 60 * 60_000,
    queryFn: async () => ((await supabase.from("competition_broadcasters").select("*")).data ?? []) as Broadcaster[],
  });
  return code ? data?.find((b) => b.competition_code === code) ?? null : null;
}

/** One line: "On beIN Sports" / "Free-to-air on Abu Dhabi Sports, …" */
export function BroadcasterLine({ code, className }: { code?: string | null; className?: string }) {
  const { t, lang } = useI18n();
  const b = useBroadcaster(code);
  if (!b) return null;
  const name = lang === "ar" ? b.broadcaster_ar : b.broadcaster;
  return (
    <p className={cn("flex items-center gap-1.5 text-sm text-muted-foreground", className)}>
      <Tv className="h-4 w-4 shrink-0" />
      <span className="min-w-0">{b.free_to_air ? t("tv.freeToAir", { name }) : t("tv.on", { name })}</span>
    </p>
  );
}

/** A fan asks venues on Jamhoor to put this match on. The venue answers from its dashboard. */
export function AskVenueToShow({ fixture, showingIds }: { fixture: FixtureWithTeams; showingIds: Set<string> }) {
  const { t, lang } = useI18n();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const b = useBroadcaster(fixture.competition_code);
  const { data: venues } = useVenues();
  const { data: mine } = useQuery({
    queryKey: ["my-screening-requests", fixture.id, user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("screening_requests").select("venue_id, status").eq("fixture_id", fixture.id).eq("user_id", user!.id)).data ?? [],
  });
  if (new Date(fixture.kickoff_at).getTime() <= Date.now()) return null;

  const statusOf = new Map((mine ?? []).map((r) => [r.venue_id, r.status]));
  const candidates = (venues ?? [])
    .filter((v) => v.owner_user_id && v.is_listed && !showingIds.has(v.id))
    .sort((a, c) => Number(c.city === profile?.city) - Number(a.city === profile?.city) || a.name.localeCompare(c.name));

  function start() {
    if (!user) { navigate(`/auth?next=${encodeURIComponent(`/match/${fixture.id}`)}`); return; }
    setOpen(true);
  }
  async function ask(venueId: string, venueName: string) {
    setBusy(venueId);
    const { error } = await supabase.rpc("request_screening", { p_venue: venueId, p_fixture: fixture.id });
    setBusy(null);
    if (error) {
      const m = error.message;
      return toast.error(m.includes("already showing") ? t("askv.alreadyShowing") : m.includes("already asked") ? t("askv.alreadyAsked")
        : m.includes("started") ? t("tables.started") : m.includes("limit") ? t("askv.limit") : t("common.error"));
    }
    toast.success(t("askv.sent", { venue: venueName }));
    qc.invalidateQueries({ queryKey: ["my-screening-requests", fixture.id] });
  }

  return (
    <div className="card p-4">
      <FeatureHeader icon={<Megaphone />} title={showingIds.size ? t("askv.title") : t("askv.titleNone")} sub={t("askv.sub")} />
      {b && <BroadcasterLine code={fixture.competition_code} className="mt-3" />}
      <Button variant="outline" className="mt-3 w-full" onClick={start}>{t("askv.cta")}</Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl">
          <SheetHeader><SheetTitle>{t("askv.pickVenue")}</SheetTitle></SheetHeader>
          <p className="mt-1 text-sm text-muted-foreground">{t("askv.pickSub", { match: `${fixture.home_team_name} ${t("common.vs")} ${fixture.away_team_name}` })}</p>
          {b && <BroadcasterLine code={fixture.competition_code} className="mt-2" />}
          <div className="mt-4 card divide-y">
            {candidates.length === 0 && <p className="px-4 py-5 text-center text-sm text-muted-foreground">{t("askv.noVenues")}</p>}
            {candidates.map((v) => {
              const st = statusOf.get(v.id);
              return (
                <div key={v.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{loc(v, "name", lang)}</p>
                    <p className="flex items-center gap-1 truncate text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{[v.area, t(`city.${v.city}` as never)].filter(Boolean).join(" · ")}</p>
                  </div>
                  {st === "pending" ? <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-muted-foreground"><Clock className="h-3.5 w-3.5" />{t("askv.asked")}</span>
                    : st === "accepted" ? <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-bold text-brand"><Check className="h-3.5 w-3.5" />{t("askv.yes")}</span>
                    : st === "declined" ? <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground"><X className="h-3.5 w-3.5" />{t("askv.no")}</span>
                    : <Button size="sm" onClick={() => ask(v.id, loc(v, "name", lang))} disabled={busy === v.id}>{t("askv.ask")}</Button>}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{t("askv.note")}</p>
        </SheetContent>
      </Sheet>
    </div>
  );
}
