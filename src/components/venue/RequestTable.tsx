import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";

/** Fan asks a venue for a table on a match night; the venue confirms or declines from its dashboard. */
export function RequestTable({ venueId, venueName, fixtureId, matchLabel, trigger }: { venueId: string; venueName: string; fixtureId: string | null; matchLabel?: string; trigger?: React.ReactNode }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState(2);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  async function send() {
    setBusy(true);
    const { error } = await supabase.rpc("request_table", { p_venue: venueId, p_fixture: fixtureId, p_size: size, p_note: note });
    setBusy(false);
    if (error) return toast.error(error.message.includes("already requested") ? t("tables.already") : error.message.includes("limit") ? t("tables.limit") : error.message.includes("started") ? t("tables.started") : t("common.error"));
    toast.success(t("tables.sent", { venue: venueName }));
    qc.invalidateQueries({ queryKey: ["my-tables"] });
    setOpen(false); setNote("");
  }
  return (
    <Dialog open={open} onOpenChange={(o) => { if (o && !user) { navigate(`/auth?next=/venues/${venueId}`); return; } setOpen(o); }}>
      <DialogTrigger asChild>{trigger ?? <Button size="sm">{t("tables.request")}</Button>}</DialogTrigger>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader><DialogTitle>{t("tables.requestAt", { venue: venueName })}</DialogTitle></DialogHeader>
        {matchLabel && <p className="text-sm text-muted-foreground">{matchLabel}</p>}
        <div className="flex items-center justify-between rounded-xl border px-3 py-2">
          <span className="text-sm font-semibold">{t("tables.people")}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="iconSm" onClick={() => setSize(Math.max(1, size - 1))} aria-label="-"><Minus /></Button>
            <span className="scoreboard w-8 text-center text-2xl font-bold">{size}</span>
            <Button variant="outline" size="iconSm" onClick={() => setSize(Math.min(20, size + 1))} aria-label="+"><Plus /></Button>
          </div>
        </div>
        <Input value={note} onChange={(e) => setNote(e.target.value.slice(0, 200))} placeholder={t("tables.notePlaceholder")} />
        <p className="text-xs text-muted-foreground">{t("tables.how")}</p>
        <Button onClick={send} disabled={busy}>{t("tables.send")}</Button>
      </DialogContent>
    </Dialog>
  );
}
