import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Crown, LocateFixed, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import type { TKey } from "@/i18n/en";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { CITIES, type Venue } from "@/lib/data";

/** Contacts, hours, description and the venue's exact location (used to verify check-ins). */
export function VenueSettings({ venue }: { venue: Venue }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const init = () => ({
    name: venue.name ?? "", name_ar: venue.name_ar ?? "", area: venue.area ?? "", city: venue.city ?? "Dubai", screens: String(venue.screens ?? ""),
    has_sound: !!venue.has_sound, alcohol_free: !!venue.alcohol_free, family_friendly: !!venue.family_friendly,
    phone: venue.phone ?? "", whatsapp: venue.whatsapp ?? "", instagram: venue.instagram ?? "", website: venue.website ?? "",
    opening_hours: venue.opening_hours ?? "", description: venue.description ?? "", description_ar: venue.description_ar ?? "",
    lat: venue.lat ?? null as number | null, lng: venue.lng ?? null as number | null, capacity: String(venue.capacity ?? ""),
  });
  const [f, setF] = useState(init);
  const [saving, setSaving] = useState(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) setF(init()); }, [open]);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  function here() {
    navigator.geolocation?.getCurrentPosition((p) => { setF((cur) => ({ ...cur, lat: p.coords.latitude, lng: p.coords.longitude })); toast.success(t("vset.located")); }, () => toast.error(t("checkin.needLocation")), { enableHighAccuracy: true });
  }
  async function save() {
    if (!f.name.trim()) return toast.error(t("vset.nameRequired"));
    setSaving(true);
    const { error } = await supabase.from("venues").update({
      name: f.name.trim(), name_ar: f.name_ar.trim() || null, area: f.area.trim() || null, city: f.city, screens: f.screens ? Math.max(0, Number(f.screens)) : null,
      has_sound: f.has_sound, alcohol_free: f.alcohol_free, family_friendly: f.family_friendly,
      phone: f.phone || null, whatsapp: f.whatsapp || null, instagram: f.instagram || null, website: f.website || null, opening_hours: f.opening_hours || null,
      description: f.description || null, description_ar: f.description_ar || null, lat: f.lat, lng: f.lng, capacity: f.capacity ? Math.max(1, Number(f.capacity)) : null,
    }).eq("id", venue.id);
    setSaving(false);
    if (error) return toast.error(t("common.error"));
    toast.success(t("profile.saved")); setOpen(false);
    qc.invalidateQueries({ queryKey: ["venue", venue.id] });
    qc.invalidateQueries({ queryKey: ["my-venues"] });
    qc.invalidateQueries({ queryKey: ["venues-directory"] });
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" size="sm"><Settings2 />{t("vset.title")}</Button></DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl">
        <DialogHeader><DialogTitle>{t("vset.title")}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5"><Label>{t("venue.name")}</Label><Input value={f.name} onChange={set("name")} /></div>
          <div className="grid gap-1.5"><Label>{t("vset.nameAr")}</Label><Input dir="rtl" value={f.name_ar} onChange={set("name_ar")} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>{t("venue.area")}</Label><Input value={f.area} onChange={set("area")} /></div>
            <div className="grid gap-1.5"><Label>{t("vset.city")}</Label>
              <select value={f.city} onChange={set("city")} className="h-11 rounded-xl border border-input bg-card px-3 text-sm">
                {CITIES.filter((c) => c !== "Other").map((c) => <option key={c} value={c}>{t(`city.${c}` as TKey)}</option>)}
              </select>
            </div>
            <div className="grid gap-1.5"><Label>{t("venue.screensLabel")}</Label><Input type="number" min={0} value={f.screens} onChange={set("screens")} /></div>
            <div className="grid gap-1.5"><Label>{t("vset.capacity")}</Label><Input type="number" min={1} value={f.capacity} onChange={set("capacity")} /></div>
          </div>
          <div className="grid gap-2 rounded-xl bg-surface p-3">
            {(["has_sound", "alcohol_free", "family_friendly"] as const).map((k) => (
              <label key={k} className="flex items-center justify-between gap-3 text-sm font-medium">
                {t(k === "has_sound" ? "venue.sound" : k === "alcohol_free" ? "venue.alcoholFree" : "venue.family")}
                <Switch checked={f[k]} onCheckedChange={(v) => setF({ ...f, [k]: v })} />
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>{t("venue.phone")}</Label><Input dir="ltr" value={f.phone} onChange={set("phone")} /></div>
            <div className="grid gap-1.5"><Label>WhatsApp</Label><Input dir="ltr" value={f.whatsapp} onChange={set("whatsapp")} placeholder="+9715…" /></div>
            <div className="grid gap-1.5"><Label>Instagram</Label><Input dir="ltr" value={f.instagram} onChange={set("instagram")} placeholder="@" /></div>
            <div className="grid gap-1.5"><Label>{t("vset.website")}</Label><Input dir="ltr" value={f.website} onChange={set("website")} placeholder="https://" /></div>
          </div>
          <div className="grid gap-1.5"><Label>{t("vset.hours")}</Label><Input value={f.opening_hours} onChange={set("opening_hours")} placeholder={t("vset.hoursPh")} /></div>
          <div className="grid gap-1.5"><Label>{t("vset.about")}</Label><Textarea rows={2} value={f.description} onChange={set("description")} /></div>
          <div className="grid gap-1.5"><Label>{t("vset.aboutAr")}</Label><Textarea dir="rtl" rows={2} value={f.description_ar} onChange={set("description_ar")} /></div>
          <div className="rounded-xl bg-surface p-3">
            <p className="text-sm font-semibold">{t("vset.location")}</p>
            <p className="text-xs text-muted-foreground">{f.lat ? `${f.lat.toFixed(5)}, ${f.lng?.toFixed(5)}` : t("vset.noLocation")}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={here}><LocateFixed />{t("vset.useHere")}</Button>
            <p className="mt-2 text-[11px] text-muted-foreground">{t("vset.locationWhy")}</p>
          </div>
          <Button onClick={save} disabled={saving}>{saving ? t("common.loading") : t("profile.save")}</Button>
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
              <p className="scoreboard text-2xl font-bold">{t("common.aed", { n: p === "pro_monthly" ? "299" : "2,990" })}</p>
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
