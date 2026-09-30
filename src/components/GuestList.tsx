import { useQueryClient } from "@tanstack/react-query";
import { UserCheck } from "lucide-react";
import { toast } from "sonner";
import { CardSkeletons, Initials } from "@/components/common/bits";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { useGuestList } from "@/lib/data";
import { checkinWindow } from "@/lib/matchPhase";

/** Reservations for one party — shared by the venue dashboard and the organiser's Host tab. */
export function GuestList({ partyId, kickoff, confirmed = true }: { partyId: string; kickoff?: string | null; confirmed?: boolean }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data, isLoading } = useGuestList(partyId);
  async function arrive(uid: string) {
    const { error } = await supabase.rpc("mark_arrived", { p_party: partyId, p_user: uid });
    if (error) return toast.error(error.message.includes("window") ? t("checkin.window") : error.message.includes("not active") ? t("vdash.arriveNeedsConfirm") : t("common.error"));
    qc.invalidateQueries({ queryKey: ["guest-list", partyId] });
    qc.invalidateQueries({ queryKey: ["venue-bookings"] });
    qc.invalidateQueries({ queryKey: ["party-counts", partyId] });
  }
  if (isLoading) return <div className="border-t p-4"><CardSkeletons n={2} /></div>;
  if (!data?.length) return <p className="border-t px-4 py-5 text-center text-sm text-muted-foreground">{t("vdash.noGuests")}</p>;
  const canMark = confirmed && (kickoff === undefined || checkinWindow(kickoff) === "open");
  const seats = data.filter((g) => g.status === "going").reduce((s, g) => s + 1 + g.guests, 0);
  return (
    <div className="border-t">
      <div className="flex justify-between bg-surface px-4 py-2 eyebrow"><span>{t("vdash.guests", { n: data.length })}</span><span>{t("vdash.seatsTotal", { n: seats })}</span></div>
      {!canMark && <p className="border-b px-4 py-2 text-xs text-muted-foreground">{confirmed ? t("vdash.arriveOnMatchDay") : t("vdash.arriveNeedsConfirm")}</p>}
      <div className="divide-y">
        {data.map((g) => (
          <div key={g.user_id} className="flex items-center gap-3 px-4 py-2.5">
            <Initials name={g.full_name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{g.full_name ?? "—"}{g.guests ? <span className="font-medium text-muted-foreground"> +{g.guests}</span> : null}</p>
              <p className="text-xs text-muted-foreground">
                {g.member_number ? `#${g.member_number} · ` : ""}{t("vdash.capsN", { n: g.caps })}{g.status === "waitlist" ? ` · ${t("party.onWaitlist")}` : ""}
              </p>
            </div>
            {g.arrived ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-bold text-brand"><UserCheck className="h-3.5 w-3.5" />{t("vdash.here")}</span>
            ) : g.status === "going" && canMark ? (
              <Button size="xs" variant="outline" onClick={() => arrive(g.user_id)}>{t("vdash.markArrived")}</Button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

