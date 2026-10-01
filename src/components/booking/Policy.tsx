import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Hand, Info, PauseCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { POLICY, type Reliability } from "@/lib/data";
import { cn } from "@/lib/utils";

type Kind = "seat" | "table";
const H = 3600e3;

/** The signed-in fan's own booking record (points, pause). */
export function useMyReliability() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-reliability", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => (await supabase.rpc("my_reliability")).data as unknown as Reliability | null,
  });
}

/** True while the fan's guests / table bookings are paused. */
export function usePaused() {
  const { data } = useMyReliability();
  const until = data?.paused_until && new Date(data.paused_until).getTime() > Date.now() ? data.paused_until : null;
  return until;
}

/** "Free to cancel until …" — the hour, or the generic rule when there's no kick-off. */
function useFreeUntil(kickoff?: string | null) {
  const { formatDateTime } = useI18n();
  return kickoff ? formatDateTime(new Date(new Date(kickoff).getTime() - POLICY.freeCancelHours * H).toISOString(), { weekday: "short", hour: "2-digit", minute: "2-digit" }) : null;
}

/** One quiet line under a booking button, with the full policy one tap away. */
export function PolicyNote({ kind, kickoff, className }: { kind: Kind; kickoff?: string | null; className?: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("text-xs text-muted-foreground", className)}>
      <p className="flex items-start gap-1.5">
        <Info className="mt-px h-3.5 w-3.5 shrink-0" />
        <span>
          {t("policy.note")}{" "}
          <button type="button" className="font-semibold text-foreground underline underline-offset-2" onClick={() => setOpen(!open)} aria-expanded={open}>
            {open ? t("policy.hide") : t("policy.how")}
          </button>
        </span>
      </p>
      {open && <PolicyDetails kind={kind} kickoff={kickoff} className="mt-2" />}
    </div>
  );
}

/** The dedicated cancellation-policy paragraph, shown once the venue has confirmed the booking. */
export function PolicyDetails({ kind, kickoff, className, title = false }: { kind: Kind; kickoff?: string | null; className?: string; title?: boolean }) {
  const { t } = useI18n();
  const until = useFreeUntil(kickoff);
  return (
    <div className={cn("rounded-xl border bg-card px-3.5 py-3 text-xs leading-relaxed text-muted-foreground", className)}>
      {title && <p className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-foreground"><ShieldCheck className="h-4 w-4 text-brand" />{t("policy.title")}</p>}
      <ul className="list-disc space-y-1 ps-4">
        <li>{until ? t("policy.freeUntil", { time: until }) : t("policy.free")}</li>
        <li>{kind === "seat" ? t("policy.reconfirmSeat") : t("policy.reconfirmTable")}</li>
        <li>{t("policy.cantMake")}</li>
        <li>{t("policy.points")}</li>
        <li className="font-semibold text-foreground">{t("policy.noCharge")}</li>
      </ul>
    </div>
  );
}

/** Match-day check: within 24h of kick-off, ask the fan to confirm or let the place go. */
export function StillComing({ kind, kickoff, confirmedAt, onYes, onRelease, busy }: {
  kind: Kind; kickoff: string; confirmedAt: string | null | undefined; onYes: () => void; onRelease: () => void; busy?: boolean;
}) {
  const { t, formatDateTime } = useI18n();
  const ms = new Date(kickoff).getTime() - Date.now();
  if (ms <= 0 || ms > POLICY.reminderHours * H) return null;
  if (confirmedAt) return (
    <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-brand"><CheckCircle2 className="h-4 w-4" />{t("still.done")}</p>
  );
  const by = formatDateTime(new Date(new Date(kickoff).getTime() - POLICY.reconfirmHours * H).toISOString(), { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="mt-3 rounded-xl border border-gold bg-gold-soft px-3.5 py-3">
      <p className="flex items-center gap-1.5 text-sm font-bold"><Hand className="h-4 w-4" />{t("still.title")}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{ms > POLICY.reconfirmHours * H ? t(kind === "seat" ? "still.subSeat" : "still.subTable", { time: by }) : t("still.subLate")}</p>
      <div className="mt-2.5 flex gap-2">
        <Button size="sm" className="flex-1" onClick={onYes} disabled={busy}>{t("still.yes")}</Button>
        <Button size="sm" variant="outline" onClick={onRelease} disabled={busy}>{kind === "seat" ? t("still.releaseSeat") : t("still.releaseTable")}</Button>
      </div>
    </div>
  );
}

/** Shown when guests and table bookings are paused. */
export function PausedNotice({ until, kind, className }: { until: string; kind: "guests" | "tables"; className?: string }) {
  const { t, formatDateTime } = useI18n();
  const date = formatDateTime(until, { day: "numeric", month: "short" });
  return (
    <p className={cn("flex items-start gap-1.5 rounded-xl bg-surface px-3 py-2 text-xs text-muted-foreground", className)}>
      <PauseCircle className="mt-px h-3.5 w-3.5 shrink-0" />
      <span>{kind === "guests" ? t("rel.pausedGuests", { date }) : t("rel.pausedTables", { date })}</span>
    </p>
  );
}

/** For venues: how dependable this fan has been, and whether they've confirmed today. */
export function ReliabilityTag({ label, reconfirmed }: { label?: Reliability["label"] | null; reconfirmed?: boolean }) {
  const { t } = useI18n();
  return (
    <>
      {reconfirmed && <span className="inline-flex items-center gap-0.5 font-semibold text-brand"><CheckCircle2 className="h-3 w-3" />{t("rel.reconfirmed")}</span>}
      {label && (
        <span className={cn("rounded px-1.5 py-px text-[10px] font-bold uppercase tracking-wide",
          label === "reliable" ? "bg-brand-soft text-brand" : label === "missed" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground")}>
          {t(`rel.${label}` as never)}
        </span>
      )}
    </>
  );
}

/** On the passport, only once something has been counted: points, any pause, and the rules. */
export function BookingRecord() {
  const { t } = useI18n();
  const { data } = useMyReliability();
  const paused = usePaused();
  if (!data || !Number(data.points)) return null;
  const pts = Number(data.points);
  return (
    <section className="mt-9">
      <h2 className="flex items-center gap-2 text-lg font-bold"><ShieldCheck className="h-5 w-5 text-brand" />{t("rel.title")}</h2>
      <div className="card mt-3 p-4">
        <p className="text-sm font-semibold">{t("rel.pointsN", { n: String(pts).replace(".5", "½").replace(/^0½/, "½") })}</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full", paused ? "bg-destructive" : "bg-gold")} style={{ width: `${Math.min(100, (pts / POLICY.pointsLimit) * 100)}%` }} /></div>
        {paused ? <PausedNotice until={paused} kind="guests" className="mt-3" /> : <p className="mt-2 text-xs text-muted-foreground">{t("rel.good")}</p>}
        <PolicyDetails kind="seat" className="mt-3" />
      </div>
    </section>
  );
}
