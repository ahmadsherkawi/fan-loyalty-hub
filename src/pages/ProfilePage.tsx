import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, Store } from "lucide-react";
import { toast } from "sonner";
import { Initials } from "@/components/common/bits";
import { AppShell, BackButton, LanguageToggle } from "@/components/layout/AppShell";
import { GroupCard } from "@/components/cards";
import { Section } from "@/components/common/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { CITIES, loc, useMyMemberships, useTeams, type Venue } from "@/lib/data";

export default function ProfilePage() {
  const { profile, user, loading, signOut, refreshProfile } = useAuth();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const { data: teams } = useTeams();
  const { data: memberships } = useMyMemberships(user?.id);
  const { data: myVenues } = useQuery({
    queryKey: ["my-venues", user?.id],
    enabled: !!user,
    queryFn: async () => ((await supabase.from("venues").select("*").eq("owner_user_id", user!.id)).data ?? []) as Venue[],
  });
  const [name, setName] = useState("");
  useEffect(() => { setName(profile?.full_name ?? ""); }, [profile?.full_name]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth?next=/profile" replace />;

  async function save(patch: Record<string, string | null>) {
    const { error } = await supabase.from("profiles").update(patch).eq("user_id", user!.id);
    if (error) return toast.error(t("common.error"));
    await refreshProfile();
    toast.success(t("profile.saved"));
  }

  return (
    <AppShell>
      <BackButton />
      <div className="mb-5 flex items-center gap-4">
        <Initials name={profile?.full_name || user.email} className="h-16 w-16 bg-foreground text-xl text-background ring-0" />
        <div className="min-w-0">
          <h1 className="truncate text-[26px] font-extrabold leading-tight">{profile?.full_name || t("page.profile")}</h1>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>
      <div className="grid gap-4 card p-5">
        <div className="grid gap-1.5"><Label>{t("auth.fullName")}</Label>
          <div className="flex gap-2"><Input value={name} onChange={(e) => setName(e.target.value)} /><Button variant="outline" className="rounded-full" disabled={!name.trim() || name === profile?.full_name} onClick={() => save({ full_name: name.trim() })}>{t("profile.save")}</Button></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5"><Label>{t("groups.team")}</Label>
            <Select value={profile?.favorite_team_id ?? ""} onValueChange={(v) => save({ favorite_team_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{(teams ?? []).map((x) => <SelectItem key={x.id} value={x.id}>{loc(x, "name", lang)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5"><Label>{t("groups.city")}</Label>
            <Select value={profile?.city ?? ""} onValueChange={(v) => save({ city: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CITIES.map((c) => <SelectItem key={c} value={c}>{t(`city.${c}` as never)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center justify-between"><Label>{t("profile.language")}</Label><LanguageToggle /></div>
        <div className="flex items-center justify-between"><Label>{t("profile.notifications")}</Label>
          <Switch checked={profile?.notifications_enabled ?? true} onCheckedChange={(v) => supabase.from("profiles").update({ notifications_enabled: v }).eq("user_id", user.id).then(() => refreshProfile())} />
        </div>
      </div>

      <Section title={t("profile.myGroups")}>
        {(memberships ?? []).length ? <div className="grid gap-3 md:grid-cols-2">{memberships!.map((m) => m.group && <GroupCard key={m.id} group={m.group} />)}</div>
          : <Button asChild variant="outline" className="rounded-full"><Link to="/groups">{t("home.findGroup")}</Link></Button>}
      </Section>

      <Section title={t("profile.venues")} icon={<Store className="h-5 w-5 text-brand" />} action={<RegisterVenue />}>
        {(myVenues ?? []).length ? (
          <div className="grid gap-3 md:grid-cols-2">{myVenues!.map((v) => (
            <Link key={v.id} to={`/venue-dashboard/${v.id}`} className="card p-4 card-hover"><p className="font-semibold">{loc(v, "name", lang)}</p><p className="text-xs text-muted-foreground">{t("page.venueDashboard")}</p></Link>
          ))}</div>
        ) : <p className="text-sm text-muted-foreground">{t("profile.venuesEmpty")}</p>}
      </Section>

      <Button variant="ghost" className="mt-10 w-full text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={async () => { await signOut(); navigate("/"); }}>
        <LogOut className="me-1.5 h-4 w-4 rtl:rotate-180" />{t("nav.signOut")}
      </Button>
    </AppShell>
  );
}

function RegisterVenue() {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", name_ar: "", venue_type: "bar", area: "", city: "Dubai", capacity: "", screens: "", instagram: "", phone: "", alcohol_free: false, family_friendly: false });
  const set = (k: keyof typeof f) => (v: string | boolean) => setF((x) => ({ ...x, [k]: v }));
  async function submit() {
    if (!user || !f.name.trim()) return;
    const { data, error } = await supabase.from("venues").insert({
      name: f.name.trim(), name_ar: f.name_ar || null, venue_type: f.venue_type, area: f.area || null, city: f.city,
      capacity: f.capacity ? Number(f.capacity) : null, screens: f.screens ? Number(f.screens) : null, instagram: f.instagram || null,
      phone: f.phone || null, alcohol_free: f.alcohol_free, family_friendly: f.family_friendly, owner_user_id: user.id,
    }).select("id").single();
    if (error || !data) return toast.error(t("common.error"));
    qc.invalidateQueries({ queryKey: ["my-venues"] });
    setOpen(false);
    navigate(`/venue-dashboard/${data.id}`);
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline" className="rounded-full">{t("profile.registerVenue")}</Button></DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{t("profile.registerVenue")}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5"><Label>{t("venue.name")}</Label><Input value={f.name} onChange={(e) => set("name")(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>{t("venue.nameAr")}</Label><Input dir="rtl" value={f.name_ar} onChange={(e) => set("name_ar")(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>{t("venue.type")}</Label>
              <Select value={f.venue_type} onValueChange={(v) => set("venue_type")(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["bar", "cafe", "hotel", "restaurant", "lounge", "other"].map((x) => <SelectItem key={x} value={x}>{t(`vtype.${x}` as never)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5"><Label>{t("groups.city")}</Label>
              <Select value={f.city} onValueChange={(v) => set("city")(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CITIES.map((c) => <SelectItem key={c} value={c}>{t(`city.${c}` as never)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5"><Label>{t("venue.area")}</Label><Input value={f.area} onChange={(e) => set("area")(e.target.value)} placeholder="JLT" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>{t("org.capacity")}</Label><Input type="number" value={f.capacity} onChange={(e) => set("capacity")(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label>{t("venue.screensLabel")}</Label><Input type="number" value={f.screens} onChange={(e) => set("screens")(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>Instagram</Label><Input value={f.instagram} onChange={(e) => set("instagram")(e.target.value)} placeholder="@" /></div>
            <div className="grid gap-1.5"><Label>{t("venue.phone")}</Label><Input value={f.phone} onChange={(e) => set("phone")(e.target.value)} /></div>
          </div>
          <div className="flex items-center justify-between"><Label>{t("venue.alcoholFree")}</Label><Switch checked={f.alcohol_free} onCheckedChange={(v) => set("alcohol_free")(v)} /></div>
          <div className="flex items-center justify-between"><Label>{t("venue.family")}</Label><Switch checked={f.family_friendly} onCheckedChange={(v) => set("family_friendly")(v)} /></div>
          <Button className="rounded-full" onClick={submit} disabled={!f.name.trim()}>{t("profile.registerVenue")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
