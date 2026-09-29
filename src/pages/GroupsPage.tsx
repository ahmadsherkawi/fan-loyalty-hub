import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell, BackButton } from "@/components/layout/AppShell";
import { GroupCard } from "@/components/cards";
import { CardSkeletons, Chip, EmptyState } from "@/components/common/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { CITIES, loc, slugify, useGroups, useTeams, useVenues } from "@/lib/data";

export default function GroupsPage() {
  const { t, lang } = useI18n();
  const { profile, user } = useAuth();
  const { data: groups, isLoading } = useGroups();
  const { data: teams } = useTeams();
  const [q, setQ] = useState("");
  const [city, setCity] = useState<string>("all");
  const [mine, setMine] = useState(false);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (groups ?? [])
      .filter((g) => city === "all" || g.city === city)
      .filter((g) => !mine || g.team_id === profile?.favorite_team_id)
      .filter((g) => !s || [g.name, g.name_ar, g.team?.name, g.team?.name_ar, g.city].some((v) => v?.toLowerCase().includes(s)))
      .sort((a, b) => Number(b.team_id === profile?.favorite_team_id) - Number(a.team_id === profile?.favorite_team_id) || b.member_count - a.member_count);
  }, [groups, q, city, mine, profile?.favorite_team_id]);
  const cities = CITIES.filter((c) => (groups ?? []).some((g) => g.city === c));
  const myTeam = teams?.find((x) => x.id === profile?.favorite_team_id);

  return (
    <AppShell>
      <BackButton />
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t("page.groups")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("groups.sub")}</p>
        </div>
        {user && <CreateGroupDialog />}
      </div>
      <div className="relative mt-5">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("groups.search")} className="h-11 rounded-full ps-9" />
      </div>
      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {myTeam && <Chip active={mine} onClick={() => setMine(!mine)}>{loc(myTeam, "name", lang)}</Chip>}
        <Chip active={city === "all"} onClick={() => setCity("all")}>{t("common.all")}</Chip>
        {cities.map((c) => <Chip key={c} active={city === c} onClick={() => setCity(c)}>{t(`city.${c}` as never)}</Chip>)}
      </div>
      <div className="mt-4">
        {isLoading ? <CardSkeletons n={4} /> : list.length ? (
          <div className="grid gap-3 md:grid-cols-2">{list.map((g) => <GroupCard key={g.id} group={g} memberCount={g.member_count} />)}</div>
        ) : <EmptyState icon={<Users className="h-5 w-5" />} title={t("groups.empty")} body={t("groups.emptyBody")} />}
      </div>
    </AppShell>
  );
}

function CreateGroupDialog() {
  const { t, lang } = useI18n();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: teams } = useTeams();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "", name_ar: "", team_id: profile?.favorite_team_id ?? "", city: profile?.city && profile.city !== "Other" ? profile.city : "Dubai",
    description: "", home_venue_id: "", dues: "", visibility: "public",
  });
  const { data: venues } = useVenues(form.city);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    if (!user || !form.name.trim()) return;
    setBusy(true);
    let slug = slugify(form.name);
    const { data: clash } = await supabase.from("groups").select("slug").like("slug", `${slug}%`);
    if (clash?.some((c) => c.slug === slug)) slug = `${slug}-${(clash.length + 1)}`;
    const { error } = await supabase.from("groups").insert({
      slug, name: form.name.trim(), name_ar: form.name_ar.trim() || null, team_id: form.team_id || null, city: form.city,
      description: form.description.trim() || null, home_venue_id: form.home_venue_id || null,
      dues_amount_aed: form.dues ? Number(form.dues) : null, visibility: form.visibility, created_by: user.id,
    });
    setBusy(false);
    if (error) { toast.error(t("common.error")); return; }
    qc.invalidateQueries({ queryKey: ["groups"] });
    qc.invalidateQueries({ queryKey: ["my-memberships"] });
    toast.success(t("groups.created"));
    setOpen(false);
    navigate(`/g/${slug}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="shrink-0 rounded-full"><Plus className="me-1 h-4 w-4" />{t("groups.create")}</Button></DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{t("groups.create")}</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5"><Label>{t("groups.name")}</Label><Input value={form.name} onChange={(e) => set("name")(e.target.value)} placeholder="Dubai Madridistas" /></div>
          <div className="grid gap-1.5"><Label>{t("groups.nameAr")}</Label><Input dir="rtl" value={form.name_ar} onChange={(e) => set("name_ar")(e.target.value)} placeholder="مدريديستا دبي" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>{t("groups.team")}</Label>
              <Select value={form.team_id} onValueChange={set("team_id")}>
                <SelectTrigger><SelectValue placeholder={t("groups.team")} /></SelectTrigger>
                <SelectContent>{(teams ?? []).map((x) => <SelectItem key={x.id} value={x.id}>{loc(x, "name", lang)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5"><Label>{t("groups.city")}</Label>
              <Select value={form.city} onValueChange={set("city")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CITIES.map((c) => <SelectItem key={c} value={c}>{t(`city.${c}` as never)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5"><Label>{t("groups.homeVenue")}</Label>
            <Select value={form.home_venue_id} onValueChange={set("home_venue_id")}>
              <SelectTrigger><SelectValue placeholder={t("groups.pickVenue")} /></SelectTrigger>
              <SelectContent>{(venues ?? []).map((v) => <SelectItem key={v.id} value={v.id}>{loc(v, "name", lang)}{v.area ? ` · ${v.area}` : ""}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5"><Label>{t("groups.description")}</Label><Textarea value={form.description} onChange={(e) => set("description")(e.target.value)} rows={3} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>{t("groups.dues")}</Label><Input type="number" inputMode="numeric" value={form.dues} onChange={(e) => set("dues")(e.target.value)} placeholder="100" /></div>
            <div className="grid gap-1.5"><Label>{t("groups.visibility")}</Label>
              <Select value={form.visibility} onValueChange={set("visibility")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">{t("groups.public")}</SelectItem>
                  <SelectItem value="private">{t("groups.private")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={submit} disabled={busy || !form.name.trim()} className="rounded-full">{busy ? t("common.loading") : t("groups.createCta")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
