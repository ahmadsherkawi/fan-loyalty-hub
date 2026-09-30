import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Crown, LocateFixed, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import type { Venue } from "@/lib/data";

/** Contacts, hours, description and the venue's exact location (used to verify check-ins). */
export function VenueSettings({ venue }: { venue: Venue }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    phone: venue.phone ?? "", whatsapp: venue.whatsapp ?? "", instagram: venue.instagram ?? "", website: venue.website ?? "",
    opening_hours: venue.opening_hours ?? "", description: venue.description ?? "", description_ar: venue.description_ar ?? "",
    lat: venue.lat ?? null as number | null, lng: venue.lng ?? null as number | null, capacity: String(venue.capacity ?? ""),
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  function here() {
    navigator.geolocation?.getCurrentPosition((p) => { setF({ ...f, lat: p.coords.latitude, lng: p.coords.longitude }); toast.success(t("vset.located")); }, () => toast.error(t("checkin.needLocation")), { enableHighAccuracy: true });
  }
  async function save() {
    const { error } = await supabase.from("venues").update({
      phone: f.phone || null, whatsapp: f.whatsapp || null, instagram: f.instagram || null, website: f.website || null, opening_hours: f.opening_hours || null,
      description: f.description || null, description_ar: f.description_ar || null, lat: f.lat, lng: f.lng, capacity: f.capacity ? Number(f.capacity) : null,
    }).eq("id", venue.id);
    if (error) return toast.error(t("common.error"));
    toast.success(t("profile.saved")); setOpen(false);
    qc.invalidateQueries({ queryKey: ["venue", venue.id] });
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" size="sm"><Settings2 />{t("vset.title")}</Button></DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl">
        <DialogHeader><DialogTitle>{t("vset.title")}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>{t("venue.phone")}</Label><Input dir="ltr" value={f.phone} onChange={set("phone")} /></div>
            <div className="grid gap-1.5"><Label>WhatsApp</Label><Input dir="ltr" value={f.whatsapp} onChange={set("whatsapp")} placeholder="+9715…" /></div>
            <div className="grid gap-1.5"><Label>Instagram</Label><Input dir="ltr" value={f.instagram} onChange={set("instagram")} placeholder="@" /></div>
            <div className="grid gap-1.5"><Label>{t("vset.capacity")}</Label><Input type="number" value={f.capacity} onChange={set("capacity")} /></div>
          </div>
          <div className="grid gap-1.5"><Label>{t("vset.hours")}</Label><Input value={f.opening_hours} onChange={set("opening_hours")} placeholder="Daily 12:00 – 02:00" /></div>
          <div className="grid gap-1.5"><Label>{t("vset.about")}</Label><Textarea rows={2} value={f.description} onChange={set("description")} /></div>
          <div className="grid gap-1.5"><Label>{t("vset.aboutAr")}</Label><Textarea dir="rtl" rows={2} value={f.description_ar} onChange={set("description_ar")} /></div>
          <div className="rounded-xl bg-surface p-3">
            <p className="text-sm font-semibold">{t("vset.location")}</p>
            <p className="text-xs text-muted-foreground">{f.lat ? `${f.lat.toFixed(5)}, ${f.lng?.toFixed(5)}` : t("vset.noLocation")}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={here}><LocateFixed />{t("vset.useHere")}</Button>
            <p className="mt-2 text-[11px] text-muted-foreground">{t("vset.locationWhy")}</p>
          </div>
          <Button onClick={save}>{t("profile.save")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const PRO_FEATURES = ["pro.f1", "pro.f2", "pro.f3", "pro.f4", "pro.f5", "pro.f6"] as const;

/** What Venue Pro includes, and a request button (payments are handled offline for now). */
export function ProDialog({ venue, requested, onRequested }: { venue: Venue; requested: boolean; onRequested: () => void }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [plan, setPlan] = useState<"pro_monthly" | "pro_yearly">("pro_monthly");
  async function request() {
    const { error } = await supabase.from("venue_pro_requests").insert({ venue_id: venue.id, user_id: user!.id, plan });
    if (error) return toast.error(t("common.error"));
    toast.success(t("pro.thanks")); onRequested();
  }
  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="ink"><Crown />{venue.is_pro ? t("pro.active") : t("pro.cta")}</Button></DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Crown className="h-5 w-5 text-gold-ink" />Jamhoor Venue Pro</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">{t("pro.intro")}</p>
        <ul className="space-y-2.5">
          {PRO_FEATURES.map((k) => <li key={k} className="flex gap-2.5 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />{t(k)}</li>)}
        </ul>
        <div className="grid grid-cols-2 gap-2">
          {(["pro_monthly", "pro_yearly"] as const).map((p) => (
            <button key={p} onClick={() => setPlan(p)} className={`rounded-2xl border p-3 text-start ${plan === p ? "border-foreground ring-2 ring-foreground/10" : ""}`}>
              <p className="scoreboard text-2xl font-bold">{p === "pro_monthly" ? "AED 299" : "AED 2,990"}</p>
              <p className="text-xs text-muted-foreground">{p === "pro_monthly" ? t("pro.perMonth") : t("pro.perYear")}</p>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{t("pro.free")}</p>
        {venue.is_pro ? <p className="rounded-xl bg-brand-soft p-3 text-sm font-semibold text-brand">{t("pro.isActive")}</p>
          : requested ? <p className="rounded-xl bg-surface p-3 text-sm font-semibold">{t("pro.requested")}</p>
          : <Button onClick={request}>{t("pro.request")}</Button>}
      </DialogContent>
    </Dialog>
  );
}
