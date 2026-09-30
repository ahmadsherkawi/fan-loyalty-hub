import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/i18n/I18nContext";
import type { TKey } from "@/i18n/en";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const MENU_SECTIONS = ["deals", "food", "drinks", "shisha", "dessert"] as const;
export const MENU_TAGS = ["halal", "veg", "spicy", "sharing", "alcohol_free", "alcohol"] as const;
type Item = { id: string; section: string; name: string; name_ar: string | null; description: string | null; price_aed: number | null; photo_url: string | null; tags: string[]; is_available: boolean };

export function MenuEditor({ venueId }: { venueId: string }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const empty = { section: "food", name: "", name_ar: "", description: "", price: "", tags: [] as string[], photo: null as File | null };
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  const { data: items } = useQuery({
    queryKey: ["menu", venueId],
    queryFn: async () => ((await supabase.from("venue_menu_items").select("*").eq("venue_id", venueId).order("section").order("sort")).data ?? []) as Item[],
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["menu", venueId] });

  async function add() {
    if (!f.name.trim()) return;
    setBusy(true);
    let photo_url: string | null = null;
    if (f.photo) {
      const path = `${venueId}/menu/${Date.now()}-${f.photo.name.replace(/[^a-z0-9.]/gi, "")}`;
      const { error } = await supabase.storage.from("venue-media").upload(path, f.photo, { contentType: f.photo.type });
      if (!error) photo_url = supabase.storage.from("venue-media").getPublicUrl(path).data.publicUrl;
    }
    const { error } = await supabase.from("venue_menu_items").insert({
      venue_id: venueId, section: f.section, name: f.name.trim(), name_ar: f.name_ar.trim() || null, description: f.description.trim() || null,
      price_aed: f.price ? Number(f.price) : null, tags: f.tags, photo_url, sort: (items ?? []).filter((i) => i.section === f.section).length + 1,
    });
    setBusy(false);
    if (error) return toast.error(t("common.error"));
    setF({ ...empty, section: f.section }); refresh();
  }

  return (
    <div className="space-y-5">
      {MENU_SECTIONS.map((sec) => {
        const list = (items ?? []).filter((i) => i.section === sec);
        if (!list.length) return null;
        return (
          <div key={sec}>
            <p className="eyebrow mb-2">{t(`menu.${sec}` as TKey)}</p>
            <div className="card divide-y">
              {list.map((i) => (
                <div key={i.id} className={cn("flex items-center gap-3 px-4 py-3", !i.is_available && "opacity-50")}>
                  {i.photo_url && <img src={i.photo_url} alt="" className="h-11 w-11 rounded-lg object-cover" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{i.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{i.description}</p>
                  </div>
                  <span className="scoreboard shrink-0 text-lg font-bold">{i.price_aed != null ? Number(i.price_aed) : "—"}</span>
                  <Switch checked={i.is_available} onCheckedChange={async (v) => { await supabase.from("venue_menu_items").update({ is_available: v }).eq("id", i.id); refresh(); }} aria-label={t("menu.available")} />
                  <Button variant="ghost" size="iconSm" onClick={async () => { await supabase.from("venue_menu_items").delete().eq("id", i.id); refresh(); }} aria-label={t("common.delete")}><Trash2 /></Button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <div className="card grid gap-3 p-4">
        <p className="eyebrow">{t("menu.addItem")}</p>
        <div className="grid grid-cols-[1fr_6.5rem] gap-3">
          <Select value={f.section} onValueChange={(v) => setF({ ...f, section: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{MENU_SECTIONS.map((s) => <SelectItem key={s} value={s}>{t(`menu.${s}` as TKey)}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="number" inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} placeholder="AED" />
        </div>
        <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder={t("menu.name")} />
        <Input dir="rtl" value={f.name_ar} onChange={(e) => setF({ ...f, name_ar: e.target.value })} placeholder={t("menu.nameAr")} />
        <Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder={t("menu.description")} />
        <div className="flex flex-wrap gap-1.5">
          {MENU_TAGS.map((tag) => (
            <button key={tag} type="button" onClick={() => setF({ ...f, tags: f.tags.includes(tag) ? f.tags.filter((x) => x !== tag) : [...f.tags, tag] })}
              className={cn("rounded-full border px-3 py-1 text-xs font-semibold", f.tags.includes(tag) ? "border-foreground bg-foreground text-background" : "bg-card text-muted-foreground")}>
              {t(`tag.${tag}` as TKey)}
            </button>
          ))}
        </div>
        <Label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <ImagePlus className="h-4 w-4" />{f.photo ? f.photo.name : t("menu.addPhoto")}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => setF({ ...f, photo: e.target.files?.[0] ?? null })} />
        </Label>
        <Button onClick={add} disabled={busy || !f.name.trim()}><Plus />{t("menu.add")}</Button>
      </div>
    </div>
  );
}
