import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Megaphone, Tv, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { compLabel } from "@/lib/competitions";

export type ScreeningAsk = {
  fixture_id: string; home_team_name: string; away_team_name: string; kickoff: string; competition: string | null; competition_code: string | null;
  broadcaster: string | null; broadcaster_ar: string | null; free_to_air: boolean | null; fans: number; names: string[] | null;
};

export function useScreeningAsks(venueId: string, enabled = true) {
  return useQuery({
    queryKey: ["venue-screening-requests", venueId],
    enabled,
    refetchInterval: 30_000,
    queryFn: async () => ((await supabase.rpc("venue_screening_requests", { p_venue: venueId })).data ?? []) as unknown as ScreeningAsk[],
  });
}

/** Fans asking the venue to put a match on. One card per match; the venue adds it to its games or says no. */
export function ScreeningRequests({ venueId }: { venueId: string }) {
  const { data } = useScreeningAsks(venueId);
  if (!data?.length) return null;
  return <div className="space-y-3">{data.map((r) => <AskCard key={r.fixture_id} r={r} venueId={venueId} />)}</div>;
}

function AskCard({ r, venueId }: { r: ScreeningAsk; venueId: string }) {
  const { t, lang, formatDateTime } = useI18n();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const tv = lang === "ar" ? r.broadcaster_ar : r.broadcaster;
  const names = (r.names ?? []).filter(Boolean);
  async function answer(decision: "accepted" | "declined") {
    setBusy(decision);
    const { error } = await supabase.rpc("respond_screening", { p_venue: venueId, p_fixture: r.fixture_id, p_decision: decision });
    setBusy(null);
    qc.invalidateQueries({ queryKey: ["venue-screening-requests", venueId] });
    if (error) return toast.error(error.message.includes("started") ? t("vdash.tooLate") : t("common.error"));
    toast.success(decision === "accepted" ? t("askv.addedToast", { n: r.fans }) : t("askv.declinedToast"));
    qc.invalidateQueries({ queryKey: ["screenings", venueId] });
    qc.invalidateQueries({ queryKey: ["venue-screenings", venueId] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }
  return (
    <div className="card overflow-hidden border-foreground/20">
      <div className="flex items-center gap-2 bg-surface px-4 py-2 text-xs font-semibold text-muted-foreground">
        <Megaphone className="h-3.5 w-3.5" />{r.fans === 1 ? t("askv.oneFan") : t("askv.nFans", { n: r.fans })}{names.length ? ` · ${names.join("، ")}` : ""}
      </div>
      <div className="p-4">
        <p className="font-bold leading-tight">{r.home_team_name} {t("common.vs")} {r.away_team_name}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{compLabel(t, r.competition_code, r.competition)} · {formatDateTime(r.kickoff, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
        <p className="mt-2 flex items-center gap-1.5 text-sm"><Tv className="h-4 w-4 shrink-0 text-muted-foreground" />
          {tv ? (r.free_to_air ? t("tv.freeToAir", { name: tv }) : t("tv.on", { name: tv })) : t("tv.unknown")}
        </p>
        <div className="mt-3 flex gap-2">
          <Button className="flex-1" onClick={() => answer("accepted")} disabled={!!busy}><Check />{busy === "accepted" ? t("common.loading") : t("askv.addToGames")}</Button>
          <Button variant="outline" onClick={() => answer("declined")} disabled={!!busy}><X />{t("askv.cantShow")}</Button>
        </div>
      </div>
    </div>
  );
}
