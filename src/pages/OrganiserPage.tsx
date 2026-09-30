import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarX2, Clock, MessageCircle, Sparkles, TicketCheck, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, BackButton, PageTitle } from "@/components/layout/AppShell";
import { CardSkeletons, EmptyState, FeatureHeader, Initials } from "@/components/common/bits";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { FIXTURE_SELECT, isFinished, loc, partyTime, useGroupParties, useGroup, useIsGroupAdmin, useProfilesByIds, useVenues, whatsappShare, type FixtureWithTeams } from "@/lib/data";

type Stats = {
  members: number; paid: number; new_last_30d: number; parties: number; total_checkins: number;
  per_party: { id: string; title: string | null; kickoff: string; home_team_name: string | null; away_team_name: string | null; checkins: number; going: number }[];
  top_fans: { full_name: string; caps: number }[];
};
type Draft = { fixture_id: string; venue_id: string; capacity: string; title: string; notes: string; announcement_en: string; announcement_ar: string };
const emptyDraft: Draft = { fixture_id: "", venue_id: "", capacity: "", title: "", notes: "", announcement_en: "", announcement_ar: "" };

export default function OrganiserPage() {
  const { slug } = useParams();
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const { data: group, isLoading } = useGroup(slug);
  const { data: isAdmin, isLoading: adminLoading } = useIsGroupAdmin(group?.id, user?.id);

  if (isLoading || adminLoading) return <AppShell><CardSkeletons /></AppShell>;
  if (!group || !isAdmin) return <AppShell><BackButton /><EmptyState title={t("org.notAllowed")} cta={{ to: slug ? `/g/${slug}` : "/groups", label: t("nav.back") }} /></AppShell>;
  return (
    <AppShell>
      <BackButton />
      <PageTitle eyebrow={<Link to={`/g/${group.slug}`} className="text-brand">{loc(group, "name", lang)}</Link>} title={t("page.organiser")} />
      <Tabs defaultValue="party">
        <TabsList className="w-full">
          <TabsTrigger value="party">{t("org.tabParty")}</TabsTrigger>
          <TabsTrigger value="stats">{t("org.tabStats")}</TabsTrigger>
          <TabsTrigger value="members">{t("org.tabMembers")}</TabsTrigger>
          <TabsTrigger value="news">{t("org.tabNews")}</TabsTrigger>
        </TabsList>
        <TabsContent value="party" className="space-y-6"><MatchNights groupId={group.id} city={group.city} /><PartyCreator groupId={group.id} teamId={group.team_id} city={group.city} homeVenueId={group.home_venue_id} slug={group.slug} /></TabsContent>
        <TabsContent value="stats"><StatsPanel groupId={group.id} /></TabsContent>
        <TabsContent value="members"><MembersPanel groupId={group.id} dues={group.dues_amount_aed} /></TabsContent>
        <TabsContent value="news"><NewsPanel groupId={group.id} slug={group.slug} /></TabsContent>
      </Tabs>
      {!user && null}
    </AppShell>
  );
}

function PartyCreator({ groupId, teamId, city, homeVenueId, slug }: { groupId: string; teamId: string | null; city: string; homeVenueId: string | null; slug: string }) {
  const { t, lang, formatDateTime } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [thinking, setThinking] = useState(false);
  const [draft, setDraft] = useState<Draft>({ ...emptyDraft, venue_id: homeVenueId ?? "" });
  const [created, setCreated] = useState<{ id: string; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const { data: venues } = useVenues(city);
  const { data: fixtures } = useQuery({
    queryKey: ["org-fixtures", teamId],
    queryFn: async () => {
      let q = supabase.from("fixtures").select(FIXTURE_SELECT).gt("kickoff_at", new Date(Date.now() - 3 * 3600e3).toISOString())
        .lt("kickoff_at", new Date(Date.now() + 45 * 864e5).toISOString()).order("kickoff_at").limit(60);
      if (teamId) q = q.or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`);
      return ((await q).data ?? []) as unknown as FixtureWithTeams[];
    },
  });
  const set = (k: keyof Draft) => (v: string) => setDraft((d) => ({ ...d, [k]: v }));

  async function askCopilot() {
    if (!prompt.trim()) return;
    setThinking(true);
    const { data, error } = await supabase.functions.invoke("jamhoor-ai", { body: { action: "copilot", group_id: groupId, prompt, lang } });
    setThinking(false);
    const d = (data as { draft?: Record<string, unknown>; error?: string }) ?? {};
    if (error || d.error || !d.draft) return toast.error(t("common.error"));
    const x = d.draft;
    setDraft({
      fixture_id: (x.fixture_id as string) ?? "", venue_id: (x.venue_id as string) ?? homeVenueId ?? "",
      capacity: x.capacity ? String(x.capacity) : "", title: (x.title as string) ?? "", notes: (x.notes as string) ?? "",
      announcement_en: (x.announcement_en as string) ?? "", announcement_ar: (x.announcement_ar as string) ?? "",
    });
  }

  async function create() {
    if (!user || !draft.fixture_id) return;
    setSaving(true);
    const { data: party, error } = await supabase.from("watch_parties").insert({
      group_id: groupId, fixture_id: draft.fixture_id, venue_id: draft.venue_id || null, title: draft.title || null,
      notes: draft.notes || null, capacity: draft.capacity ? Number(draft.capacity) : null, created_by: user.id,
    }).select("id").single();
    if (error || !party) { setSaving(false); return toast.error(t("common.error")); }
    if (draft.announcement_en || draft.announcement_ar) {
      await supabase.from("announcements").insert({
        group_id: groupId, author_id: user.id, title: draft.title || null, body: draft.announcement_en || draft.announcement_ar,
        body_ar: draft.announcement_ar || null, watch_party_id: party.id,
      });
    }
    setSaving(false);
    const url = `${window.location.origin}/party/${party.id}`;
    const text = `${lang === "ar" ? draft.announcement_ar || draft.announcement_en : draft.announcement_en || draft.announcement_ar}\n\n${url}`;
    setCreated({ id: party.id, text });
    qc.invalidateQueries();
    toast.success(t("org.partyCreated"));
  }

  if (created) {
    return (
      <div className="card p-5 text-center">
        <p className="text-lg font-bold">{t("org.partyCreated")}</p>
        {draft.venue_id && <p className="mx-auto mt-2 inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted-foreground"><Clock className="h-3.5 w-3.5" />{t("org.requestSent", { venue: loc(venues?.find((v) => v.id === draft.venue_id), "name", lang) })}</p>}
        <p className="mt-2 text-sm text-muted-foreground">{t("org.nowShare")}</p>
        <pre className="mt-4 whitespace-pre-wrap rounded-2xl bg-surface p-4 font-sans text-start text-sm" dir="auto">{created.text}</pre>
        <div className="mt-4 grid gap-2 md:grid-cols-3">
          <Button asChild className="rounded-full"><a href={whatsappShare(created.text)} target="_blank" rel="noreferrer"><MessageCircle className="me-1.5 h-4 w-4" />{t("org.postWhatsapp")}</a></Button>
          <Button asChild variant="outline" className="rounded-full"><Link to={`/party/${created.id}`}>{t("org.openParty")}</Link></Button>
          <Button variant="ghost" className="rounded-full" onClick={() => { setCreated(null); setDraft({ ...emptyDraft, venue_id: homeVenueId ?? "" }); setPrompt(""); }}>{t("org.another")}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-ai/20 bg-ai-soft p-4">
        <FeatureHeader icon={<Sparkles />} tone="ai" ai title={t("org.copilot")} sub={t("org.copilotHint")} />
        <Textarea className="mt-3 bg-card" rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={t("org.copilotPlaceholder")} />
        <Button variant="ai" className="mt-3 w-full" onClick={askCopilot} disabled={thinking || !prompt.trim()}><Wand2 className="me-1.5 h-4 w-4" />{thinking ? t("org.thinking") : t("org.draftIt")}</Button>
      </div>
      <div className="grid gap-4 card p-4">
        <p className="eyebrow">{t("org.orManual")}</p>
        <div className="grid gap-1.5"><Label>{t("org.fixture")}</Label>
          <Select value={draft.fixture_id} onValueChange={set("fixture_id")}>
            <SelectTrigger><SelectValue placeholder={t("org.pickFixture")} /></SelectTrigger>
            <SelectContent>{(fixtures ?? []).map((f) => <SelectItem key={f.id} value={f.id}>{f.home_team_name} v {f.away_team_name} · {formatDateTime(f.kickoff_at)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <div className="grid gap-1.5"><Label>{t("org.venue")}</Label>
            <Select value={draft.venue_id} onValueChange={set("venue_id")}>
              <SelectTrigger><SelectValue placeholder={t("groups.pickVenue")} /></SelectTrigger>
              <SelectContent>{(venues ?? []).map((v) => <SelectItem key={v.id} value={v.id}>{loc(v, "name", lang)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5"><Label>{t("org.capacity")}</Label><Input type="number" value={draft.capacity} onChange={(e) => set("capacity")(e.target.value)} /></div>
        </div>
        <div className="grid gap-1.5"><Label>{t("org.title")}</Label><Input value={draft.title} onChange={(e) => set("title")(e.target.value)} /></div>
        <div className="grid gap-1.5"><Label>{t("org.notes")}</Label><Textarea rows={2} value={draft.notes} onChange={(e) => set("notes")(e.target.value)} /></div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-1.5"><Label>{t("org.announceEn")}</Label><Textarea rows={4} dir="ltr" value={draft.announcement_en} onChange={(e) => set("announcement_en")(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>{t("org.announceAr")}</Label><Textarea rows={4} dir="rtl" value={draft.announcement_ar} onChange={(e) => set("announcement_ar")(e.target.value)} /></div>
        </div>
        <Button className="rounded-full" onClick={create} disabled={saving || !draft.fixture_id}>{saving ? t("common.loading") : t("org.createParty")}</Button>
      </div>
    </div>
  );
}

function StatsPanel({ groupId }: { groupId: string }) {
  const { t, formatDateTime } = useI18n();
  const { data: s } = useQuery({
    queryKey: ["group-stats", groupId],
    queryFn: async () => (await supabase.rpc("group_stats", { p_group: groupId })).data as unknown as Stats,
  });
  if (!s) return <CardSkeletons />;
  const chart = [...s.per_party].reverse().slice(-10).map((p) => ({
    name: p.home_team_name ? `${p.home_team_name.slice(0, 3)}–${(p.away_team_name ?? "").slice(0, 3)}` : (p.title ?? "").slice(0, 8),
    [t("party.going")]: p.going, [t("party.checkedIn")]: p.checkins, date: p.kickoff ? formatDateTime(p.kickoff, { day: "numeric", month: "short" }) : "",
  }));
  const tiles = [
    { v: s.members, l: t("org.members") }, { v: `${s.paid}/${s.members}`, l: t("org.duesPaid") },
    { v: s.new_last_30d, l: t("org.new30") }, { v: s.parties, l: t("org.parties") }, { v: s.total_checkins, l: t("org.checkins") },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {tiles.map((x, i) => <div key={x.l} className={i === 0 ? "col-span-2 rounded-2xl bg-foreground p-4 text-background md:col-span-1" : "card p-4"}><p className="scoreboard text-3xl font-bold leading-none">{x.v}</p><p className={i === 0 ? "mt-1 text-xs text-background/60" : "mt-1 text-xs text-muted-foreground"}>{x.l}</p></div>)}
      </div>
      {chart.length > 0 && (
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between"><p className="font-bold">{t("org.turnout")}</p><div className="flex gap-3 text-xs text-muted-foreground"><span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-[#CBD2DC]" />{t("party.going")}</span><span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-foreground" />{t("party.checkedIn")}</span></div></div>
          <div className="h-56" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={28} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                <Bar dataKey={t("party.going")} fill="#CBD2DC" radius={[6, 6, 0, 0]} />
                <Bar dataKey={t("party.checkedIn")} fill="#0B1220" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {s.top_fans.length > 0 && (
        <div className="card p-4">
          <p className="mb-2 font-semibold">{t("org.topFans")}</p>
          {s.top_fans.map((f, i) => <div key={i} className="flex justify-between py-1.5 text-sm"><span>{i + 1}. {f.full_name}</span><span className="scoreboard font-bold">{f.caps}</span></div>)}
        </div>
      )}
    </div>
  );
}

function MembersPanel({ groupId, dues }: { groupId: string; dues: number | null }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: members } = useQuery({
    queryKey: ["org-members", groupId],
    queryFn: async () => (await supabase.from("group_members").select("*").eq("group_id", groupId).order("member_number")).data ?? [],
  });
  const { data: profiles } = useProfilesByIds((members ?? []).map((m) => m.user_id));
  async function update(id: string, patch: { role?: string; dues_status?: string; dues_paid_until?: string | null }) {
    const { error } = await supabase.from("group_members").update(patch).eq("id", id);
    if (error) toast.error(t("common.error"));
    qc.invalidateQueries({ queryKey: ["org-members", groupId] });
    qc.invalidateQueries({ queryKey: ["group-stats", groupId] });
  }
  const yearEnd = `${new Date().getFullYear() + (new Date().getMonth() >= 6 ? 1 : 0)}-06-30`;
  return (
    <div className="space-y-3">
      {dues ? <p className="text-sm text-muted-foreground">{t("org.duesInfo", { amount: dues })}</p> : null}
      <div className="overflow-hidden card">
        {(members ?? []).map((m) => {
          const p = profiles?.find((x) => x.user_id === m.user_id);
          return (
            <div key={m.id} className="flex flex-wrap items-center gap-3 border-b px-4 py-3 last:border-0">
              <Initials name={p?.full_name} />
              <div className="min-w-0 flex-1"><p className="truncate font-medium">{p?.full_name ?? "—"}</p><p className="scoreboard text-xs text-muted-foreground">#{m.member_number}</p></div>
              <Select value={m.dues_status} onValueChange={(v) => update(m.id, { dues_status: v, dues_paid_until: v === "paid" ? yearEnd : null })}>
                <SelectTrigger className="h-8 w-28 rounded-full text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{["unpaid", "paid", "exempt"].map((s) => <SelectItem key={s} value={s}>{t(`dues.${s}` as never)}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={m.role} disabled={m.role === "owner" || m.user_id === user?.id} onValueChange={(v) => update(m.id, { role: v })}>
                <SelectTrigger className="h-8 w-28 rounded-full text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{["member", "admin", "owner"].map((r) => <SelectItem key={r} value={r} disabled={r === "owner"}>{t(`role.${r}` as never)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NewsPanel({ groupId, slug }: { groupId: string; slug: string }) {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [en, setEn] = useState("");
  const [ar, setAr] = useState("");
  const [posted, setPosted] = useState<string | null>(null);
  useEffect(() => { setPosted(null); }, [title, en, ar]);
  async function post() {
    if (!user || !(en || ar)) return;
    const { error } = await supabase.from("announcements").insert({ group_id: groupId, author_id: user.id, title: title || null, body: en || ar, body_ar: ar || null });
    if (error) return toast.error(t("common.error"));
    qc.invalidateQueries({ queryKey: ["announcements", groupId] });
    setPosted(`${title ? `${title}\n` : ""}${lang === "ar" ? ar || en : en || ar}\n\n${window.location.origin}/g/${slug}`);
    toast.success(t("org.posted"));
  }
  return (
    <div className="grid gap-3 card p-4">
      <div className="grid gap-1.5"><Label>{t("org.title")}</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid gap-1.5"><Label>{t("org.announceEn")}</Label><Textarea rows={4} dir="ltr" value={en} onChange={(e) => setEn(e.target.value)} /></div>
        <div className="grid gap-1.5"><Label>{t("org.announceAr")}</Label><Textarea rows={4} dir="rtl" value={ar} onChange={(e) => setAr(e.target.value)} /></div>
      </div>
      <Button className="rounded-full" onClick={post} disabled={!(en || ar)}>{t("org.post")}</Button>
      {posted && <Button asChild variant="outline" className="rounded-full"><a href={whatsappShare(posted)} target="_blank" rel="noreferrer"><MessageCircle className="me-1.5 h-4 w-4" />{t("org.postWhatsapp")}</a></Button>}
    </div>
  );
}

/** The organiser's upcoming match nights with the venue's answer, and a quick way to move a declined booking. */
function MatchNights({ groupId, city }: { groupId: string; city: string }) {
  const { t, lang, formatDateTime } = useI18n();
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const { data: parties } = useGroupParties(groupId);
  const { data: venues } = useVenues(city);
  const [moving, setMoving] = useState<string | null>(params.get("party"));
  const upcoming = (parties ?? []).filter((p) => !isFinished(p.fixture?.status) && p.status !== "finished" && p.status !== "cancelled")
    .sort((a, b) => new Date(partyTime(a)).getTime() - new Date(partyTime(b)).getTime());
  if (!upcoming.length) return null;
  async function move(partyId: string, venueId: string) {
    const { error } = await supabase.from("watch_parties").update({ venue_id: venueId }).eq("id", partyId);
    if (error) return toast.error(t("common.error"));
    setMoving(null);
    toast.success(t("org.requestSent", { venue: loc(venues?.find((v) => v.id === venueId), "name", lang) }));
    qc.invalidateQueries({ queryKey: ["parties-group", groupId] });
  }
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold">{t("org.matchNights")}</h2>
      <div className="card divide-y">
        {upcoming.map((p) => {
          const st = p.venue_status;
          return (
            <div key={p.id} className="px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <Link to={`/party/${p.id}`} className="block truncate font-semibold hover:underline">{p.fixture ? `${p.fixture.home_team_name} v ${p.fixture.away_team_name}` : p.title}</Link>
                  <p className="truncate text-xs text-muted-foreground">{formatDateTime(partyTime(p))} · {loc(p.venue, "name", lang) || t("party.venueTbc")}</p>
                </div>
                <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold",
                  st === "confirmed" ? "bg-brand-soft text-brand" : st === "declined" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground")}>
                  {st === "confirmed" ? <TicketCheck className="h-3.5 w-3.5" /> : st === "declined" ? <CalendarX2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                  {t(`org.status_${st}` as never)}
                </span>
              </div>
              {st === "confirmed" && p.reserved_area && <p className="mt-1 text-xs text-brand">{p.reserved_area}</p>}
              {st === "declined" && p.venue_note && <p className="mt-1 text-xs text-destructive">{p.venue_note}</p>}
              {(st === "declined" || moving === p.id) && (
                <div className="mt-2">
                  <Select onValueChange={(v) => move(p.id, v)}>
                    <SelectTrigger className="h-10"><SelectValue placeholder={t("org.moveTo")} /></SelectTrigger>
                    <SelectContent>{(venues ?? []).filter((v) => v.id !== p.venue_id).map((v) => <SelectItem key={v.id} value={v.id}>{loc(v, "name", lang)}{v.area ? ` · ${v.area}` : ""}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
