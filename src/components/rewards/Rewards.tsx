import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import { useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, Gift, Lock, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import type { RewardRow } from "@/lib/data";
import { cn } from "@/lib/utils";

type Code = { code: string; expires_at: string };

/** One reward: caps needed, progress, and the claim button that produces a code the venue redeems. */
export function RewardItem({ r, showVenue = true }: { r: RewardRow; showVenue?: boolean }) {
  const { t, lang, formatDateTime } = useI18n();
  const qc = useQueryClient();
  const [code, setCode] = useState<Code | null>(null);
  const [busy, setBusy] = useState(false);
  const title = (lang === "ar" && r.title_ar) || r.title;
  const details = (lang === "ar" && r.details_ar) || r.details;
  const venue = (lang === "ar" && r.venue_name_ar) || r.venue_name;
  const used = r.last?.status === "redeemed" && !r.repeatable;
  const live = r.last?.status === "issued" && new Date(r.last.expires_at) > new Date();
  const missing = Math.max(0, r.min_caps - r.caps);
  // While the code is on screen, watch for the venue redeeming it so the fan sees it happen live
  const { data: status } = useQuery({
    queryKey: ["redemption", code?.code],
    enabled: !!code,
    refetchInterval: (q) => (q.state.data?.status === "redeemed" ? false : 3000),
    queryFn: async () => (await supabase.from("reward_redemptions").select("status, redeemed_at").eq("code", code!.code).maybeSingle()).data,
  });
  const redeemedNow = status?.status === "redeemed";
  useEffect(() => {
    if (!redeemedNow) return;
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.4 }, colors: ["#FFC53D", "#00C566", "#0B1220"] });
    qc.invalidateQueries({ queryKey: ["my-rewards"] });
  }, [redeemedNow, qc]);

  async function claim() {
    if (live && r.last) { setCode({ code: r.last.code, expires_at: r.last.expires_at }); return; }
    setBusy(true);
    const { data, error } = await supabase.rpc("claim_reward", { p_offer: r.id });
    setBusy(false);
    if (error) return toast.error(error.message.includes("members") ? t("rewards.joinFirst") : t("common.error"));
    setCode(data as unknown as Code);
    qc.invalidateQueries({ queryKey: ["my-rewards"] });
  }

  return (
    <div className={cn("card flex items-center gap-3 p-3 pe-4", !r.unlocked && "bg-surface shadow-none")}>
      <span className={cn("scoreboard flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl leading-none",
        r.unlocked ? (r.min_caps ? "bg-gold text-accent-foreground" : "bg-brand-soft text-brand") : "border-2 border-dashed bg-card text-muted-foreground")}>
        {r.min_caps ? <><span className="text-2xl font-bold">{r.min_caps}</span><span className="text-[9px] font-semibold uppercase tracking-wide">{t("league.caps")}</span></> : <Gift className="h-6 w-6" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold">{title}</p>
        {showVenue ? <p className="flex items-center gap-1 truncate text-xs text-muted-foreground"><MapPin className="h-3 w-3 shrink-0" />{venue}</p>
          : details ? <p className="truncate text-xs text-muted-foreground">{details}</p> : null}
        {!r.unlocked && r.min_caps > 0 && (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gold" style={{ width: `${Math.min(100, (r.caps / r.min_caps) * 100)}%` }} /></div>
            <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">{t("rewards.more", { n: missing })}</span>
          </div>
        )}
      </div>
      {used ? <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-brand"><CheckCircle2 className="h-4 w-4" />{t("rewards.used")}</span>
        : r.unlocked ? <Button size="sm" variant={live ? "outline" : "default"} onClick={claim} disabled={busy} className="shrink-0">{live ? t("rewards.showCode") : t("rewards.getCode")}</Button>
        : <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />}

      <Dialog open={!!code} onOpenChange={(o) => !o && setCode(null)}>
        <DialogContent className="max-w-sm rounded-3xl text-center">
          <DialogHeader><DialogTitle className="text-center">{title}</DialogTitle></DialogHeader>
          {redeemedNow ? (
            <div className="py-6">
              <CheckCircle2 className="mx-auto h-16 w-16 text-brand" />
              <p className="mt-3 text-xl font-extrabold">{t("rewards.redeemedNow")}</p>
              <p className="text-sm text-muted-foreground">{venue}{status?.redeemed_at ? ` · ${formatDateTime(status.redeemed_at, { hour: "2-digit", minute: "2-digit" })}` : ""}</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{t("rewards.showAt", { venue })}</p>
              <p className="scoreboard mt-2 text-5xl font-bold tracking-[0.2em]" dir="ltr">{code?.code}</p>
              <div className="mx-auto mt-2 w-fit rounded-2xl border bg-white p-3"><QRCodeSVG value={`jamhoor-reward:${code?.code ?? ""}`} size={150} fgColor="#0B1220" /></div>
              {code && <p className="text-xs text-muted-foreground">{t("rewards.validUntil", { date: formatDateTime(code.expires_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) })}</p>}
              <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><span className="h-2 w-2 animate-pulse rounded-full bg-primary" />{t("rewards.waiting")}</p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function RewardsSummary({ rewards, caps }: { rewards: RewardRow[]; caps: number }) {
  const { t } = useI18n();
  const ready = rewards.filter((r) => r.unlocked && !(r.last?.status === "redeemed" && !r.repeatable) && r.min_caps > 0).length;
  const next = rewards.filter((r) => !r.unlocked && r.min_caps > caps).sort((a, b) => a.min_caps - b.min_caps)[0];
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-gold-soft px-4 py-3">
      <Gift className="h-5 w-5 shrink-0 text-gold-ink" />
      <p className="flex-1 text-sm">
        <span className="font-bold">{t("rewards.ready", { n: ready })}</span>
        {next && <span className="text-muted-foreground"> · {t("rewards.nextAt", { n: next.min_caps - caps })}</span>}
      </p>
      <Link to="/passport#rewards" className="sr-only">{t("rewards.title")}</Link>
    </div>
  );
}
