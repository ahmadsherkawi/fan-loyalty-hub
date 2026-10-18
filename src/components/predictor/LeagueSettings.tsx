import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { compLabel } from "@/lib/competitions";

/**
 * The owner's settings for a league: rename it, and remove a competition when it plays more than one.
 * Competitions can never be added or swapped, and one always stays (the server enforces the same rules).
 */
export function LeagueSettings({ open, onOpenChange, code, name, competitions }: {
  open: boolean; onOpenChange: (o: boolean) => void; code: string; name: string; competitions: string[] | null;
}) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [newName, setName] = useState(name);
  const [comps, setComps] = useState<string[] | null>(competitions);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setName(name); setComps(competitions); } }, [open, name, competitions]);

  const changed = newName.trim() !== name || (comps?.length ?? 0) !== (competitions?.length ?? 0);
  async function save() {
    setBusy(true);
    const { error } = await supabase.rpc("update_league" as never, { p_code: code, p_name: newName.trim(), p_comps: comps } as never);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(t("league.saved"));
    ["league", "league-board", "my-leagues", "my-league-comps"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl">
        <DialogHeader><DialogTitle>{t("league.settings")}</DialogTitle></DialogHeader>
        <label className="grid gap-1.5 text-sm font-semibold">{t("league.nameLabel")}
          <Input value={newName} onChange={(e) => setName(e.target.value)} maxLength={40} />
        </label>
        {comps && (
          <div>
            <p className="mb-2 text-sm font-semibold">{t("league.compsLabel")}</p>
            <div className="flex flex-wrap gap-2">
              {comps.map((c) => {
                const label = compLabel(t as never, c, c);
                return (
                  <span key={c} className="inline-flex h-9 items-center gap-1 rounded-full border border-foreground bg-foreground ps-4 pe-2 text-sm font-semibold text-background">
                    {label}
                    {comps.length > 1 && (
                      <button type="button" onClick={() => setComps(comps.filter((x) => x !== c))} aria-label={t("league.remove", { name: label })} className="rounded-full p-1 hover:bg-white/15"><X className="h-3.5 w-3.5" /></button>
                    )}
                  </span>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{t("league.compsEditHint")}</p>
          </div>
        )}
        <Button onClick={save} disabled={busy || !changed || newName.trim().length < 2} className="rounded-full">{busy ? t("common.loading") : t("league.save")}</Button>
      </DialogContent>
    </Dialog>
  );
}
