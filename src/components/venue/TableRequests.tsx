import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ReliabilityTag } from "@/components/booking/Policy";
import type { Reliability } from "@/lib/data";

type TableReq = { id: string; user_id: string; full_name: string | null; party_size: number; note: string | null; status: string; venue_reply: string | null;
  home_team_name: string | null; away_team_name: string | null; kickoff: string | null; created_at: string; caps: number;
  reconfirmed: boolean; arrived: boolean; no_show: boolean; reliability: Reliability["label"] | null };

/** Fans asking the venue directly for a table (no organiser involved). */
export function TableRequests({ venueId }: { venueId: string }) {
  const { t } = useI18n();
  const { data } = useQuery({
    queryKey: ["venue-tables", venueId],
    refetchInterval: 20_000,
    queryFn: async () => ((await supabase.rpc("venue_tables", { p_venue: venueId })).data ?? []) as unknown as TableReq[],
  });
  if (!data?.length) return <p className="rounded-2xl bg-surface px-4 py-5 text-center text-sm text-muted-foreground">{t("tables.none")}</p>;
  return <div className="space-y-3">{data.map((r) => <TableRow key={r.id} r={r} venueId={venueId} />)}</div>;
}

function TableRow({ r, venueId }: { r: TableReq; venueId: string }) {
  const { t, formatDateTime } = useI18n();
  const qc = useQueryClient();
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  async function answer(d: "confirmed" | "declined") {
    if (busy) return;
    setBusy(true);
    const { error } = await supabase.rpc("respond_table", { p_booking: r.id, p_decision: d, p_reply: reply });
    setBusy(false);
    if (error) { qc.invalidateQueries({ queryKey: ["venue-tables", venueId] }); return toast.error(t("common.error")); }
    toast.success(d === "confirmed" ? t("tables.confirmedToast") : t("tables.declinedToast"));
    qc.invalidateQueries({ queryKey: ["venue-tables", venueId] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }
  async function mark(outcome: "arrived" | "no_show") {
    if (busy) return;
    if (outcome === "no_show" && !window.confirm(t("tables.noShowQ"))) return;
    setBusy(true);
    const { error } = await supabase.rpc("mark_table", { p_booking: r.id, p_outcome: outcome });
    setBusy(false);
    qc.invalidateQueries({ queryKey: ["venue-tables", venueId] });
    if (error) return toast.error(error.message.includes("too early") ? t("tables.markTooEarly") : error.message.includes("too late") ? t("tables.markTooLate") : t("common.error"));
    toast.success(outcome === "arrived" ? t("tables.markedArrived") : t("tables.markedNoShow"));
  }
  const ko = r.kickoff ? new Date(r.kickoff).getTime() : null;
  const now = Date.now();
  const canArrive = r.status === "confirmed" && ko !== null && now > ko - 3 * 3600e3 && now < ko + 24 * 3600e3;
  const canNoShow = canArrive && now > ko!;
  return (
    <div className={cn("card p-4", r.status === "pending" && "border-foreground/20")}>
      <div className="flex items-start gap-3">
        <span className="scoreboard flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-foreground text-background leading-none">
          <span className="text-xl font-bold">{r.party_size}</span><Users className="h-3 w-3 opacity-70" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold">{r.full_name ?? "—"} <span className="text-xs font-medium text-muted-foreground">· {t("vdash.capsN", { n: r.caps })}</span></p>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs"><ReliabilityTag label={r.reliability} reconfirmed={r.status === "confirmed" && r.reconfirmed} /></p>
          <p className="text-sm text-muted-foreground">{r.home_team_name ? `${r.home_team_name} ${t("common.vs")} ${r.away_team_name}` : t("tables.anyNight")}{r.kickoff ? ` · ${formatDateTime(r.kickoff)}` : ""}</p>
          {r.note && <p className="mt-1 rounded-lg bg-surface px-2.5 py-1.5 text-sm">“{r.note}”</p>}
        </div>
        {r.status !== "pending" && <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", r.no_show ? "bg-destructive/10 text-destructive" : r.status === "confirmed" ? "bg-brand-soft text-brand" : "bg-muted text-muted-foreground")}>{r.no_show ? t("tables.noShow") : r.arrived ? t("tables.arrived") : t(`org.status_${r.status}` as never)}</span>}
      </div>
      {canArrive && !r.arrived && !r.no_show && (
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="outline" className="flex-1" disabled={busy} onClick={() => mark("arrived")}><Check />{t("tables.arrived")}</Button>
          {canNoShow && <Button size="sm" variant="outline" disabled={busy} onClick={() => mark("no_show")}><X />{t("tables.noShow")}</Button>}
        </div>
      )}
      {canArrive && r.no_show && (
        <div className="mt-3"><Button size="xs" variant="outline" disabled={busy} onClick={() => mark("arrived")}>{t("tables.arrived")}</Button></div>
      )}
      {r.status === "pending" && (
        <div className="mt-3 flex gap-2">
          <Input value={reply} onChange={(e) => setReply(e.target.value)} placeholder={t("tables.replyPlaceholder")} className="h-10" />
          <Button size="sm" className="h-10" disabled={busy} onClick={() => answer("confirmed")} aria-label={t("vdash.confirm")}><Check /></Button>
          <Button size="sm" variant="outline" className="h-10" disabled={busy} onClick={() => answer("declined")} aria-label={t("vdash.decline")}><X /></Button>
        </div>
      )}
    </div>
  );
}
