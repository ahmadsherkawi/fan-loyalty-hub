import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarX2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";

type EditableParty = {
  id: string; title: string | null; notes: string | null; notes_ar?: string | null; capacity: number | null;
  venue_status: string; status: string;
};

/** Organiser tools for one watch party: edit the details, or cancel it (venue and fans are told). */
export function EditPartyButtons({ party, size = "sm", compact }: { party: EditableParty; size?: "sm" | "default"; compact?: boolean }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ title: "", notes: "", notes_ar: "", capacity: "" });
  const confirmed = party.venue_status === "confirmed";
  useEffect(() => {
    if (open) setF({ title: party.title ?? "", notes: party.notes ?? "", notes_ar: party.notes_ar ?? "", capacity: party.capacity ? String(party.capacity) : "" });
  }, [open, party]);
  if (party.status !== "scheduled") return null;

  const refresh = () => qc.invalidateQueries();
  async function save() {
    if (!confirmed && f.capacity && Number(f.capacity) < 1) return toast.error(t("vdash.seatsMin"));
    setBusy(true);
    const patch: Record<string, unknown> = { title: f.title.trim() || null, notes: f.notes.trim() || null, notes_ar: f.notes_ar.trim() || null };
    if (!confirmed) patch.capacity = f.capacity ? Math.round(Number(f.capacity)) : null;
    const { error } = await supabase.from("watch_parties").update(patch).eq("id", party.id);
    setBusy(false);
    if (error) return toast.error(t("common.error"));
    toast.success(t("profile.saved"));
    setOpen(false);
    refresh();
  }
  async function cancelParty() {
    setBusy(true);
    const { error } = await supabase.from("watch_parties").update({ status: "cancelled" }).eq("id", party.id);
    setBusy(false);
    setAsk(false);
    if (error) return toast.error(t("common.error"));
    toast.success(t("party.cancelledToast"));
    refresh();
  }

  return (
    <>
      {compact ? (
        <div className="flex gap-4 text-xs font-semibold">
          <button className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground" onClick={() => setOpen(true)}><Pencil className="h-3.5 w-3.5" />{t("party.edit")}</button>
          <button className="inline-flex items-center gap-1 text-muted-foreground hover:text-destructive" onClick={() => setAsk(true)}><CalendarX2 className="h-3.5 w-3.5" />{t("party.cancelParty")}</button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button variant="outline" size={size} onClick={() => setOpen(true)}><Pencil />{t("party.edit")}</Button>
          <Button variant="ghost" size={size} className="text-destructive hover:text-destructive" onClick={() => setAsk(true)}><CalendarX2 />{t("party.cancelParty")}</Button>
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader><DialogTitle>{t("party.edit")}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5"><Label>{t("org.title")}</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
            <div className="grid gap-1.5">
              <Label>{t("org.capacity")}</Label>
              <Input type="number" min={1} value={f.capacity} disabled={confirmed} onChange={(e) => setF({ ...f, capacity: e.target.value })} />
              {confirmed && <p className="text-xs text-muted-foreground">{t("party.seatsSetByVenue")}</p>}
            </div>
            <div className="grid gap-1.5"><Label>{t("org.notes")}</Label><Textarea rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label>{t("party.notesAr")}</Label><Textarea dir="rtl" rows={3} value={f.notes_ar} onChange={(e) => setF({ ...f, notes_ar: e.target.value })} /></div>
            <p className="text-xs text-muted-foreground">{t("party.editHint")}</p>
            <Button onClick={save} disabled={busy}>{busy ? t("common.loading") : t("profile.save")}</Button>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={ask} onOpenChange={setAsk}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("party.cancelPartyQ")}</AlertDialogTitle>
            <AlertDialogDescription>{t("party.cancelPartyBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("party.keepParty")}</AlertDialogCancel>
            <AlertDialogAction onClick={cancelParty} disabled={busy} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("party.cancelParty")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
