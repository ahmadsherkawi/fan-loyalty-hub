import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Crown, Instagram, MessageCircle, Settings, Share2, Tv, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell, BackButton } from "@/components/layout/AppShell";
import { TeamBadge } from "@/components/brand/TeamBadge";
import { LeaderboardTable, PartyCard, VenueCard } from "@/components/cards";
import { CardSkeletons, DemoChip, EmptyState, Initials } from "@/components/common/bits";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import {
  isFinished, loc, partyTime, shareOrCopy, useGroup, useGroupLeaderboard, useGroupParties, useIsGroupAdmin, useProfilesByIds, whatsappShare,
} from "@/lib/data";

export default function GroupPage() {
  const { slug } = useParams();
  const { t, lang, formatDateTime } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: group, isLoading, error } = useGroup(slug);
  const { data: parties } = useGroupParties(group?.id);
  const { data: isAdmin } = useIsGroupAdmin(group?.id, user?.id);
  const { data: members } = useQuery({
    queryKey: ["group-members", group?.id],
    enabled: !!group?.id && !!user,
    queryFn: async () => (await supabase.from("group_members").select("*").eq("group_id", group!.id).order("member_number")).data ?? [],
  });
  const { data: memberCount } = useQuery({
    queryKey: ["group-count", group?.id],
    enabled: !!group?.id,
    queryFn: async () => (await supabase.from("group_members").select("id", { count: "exact", head: true }).eq("group_id", group!.id)).count ?? 0,
  });
  const { data: profiles } = useProfilesByIds((members ?? []).map((m) => m.user_id));
  const { data: board } = useGroupLeaderboard(group?.id, !!user);
  const { data: announcements } = useQuery({
    queryKey: ["announcements", group?.id],
    enabled: !!group?.id,
    queryFn: async () => (await supabase.from("announcements").select("*").eq("group_id", group!.id).order("created_at", { ascending: false }).limit(20)).data ?? [],
  });

  const me = members?.find((m) => m.user_id === user?.id);
  const team = group?.team;
  const upcoming = (parties ?? []).filter((p) => !isFinished(p.fixture?.status) && p.status !== "finished").reverse();
  const past = (parties ?? []).filter((p) => isFinished(p.fixture?.status) || p.status === "finished");

  async function join() {
    if (!user) { navigate(`/auth?next=/g/${slug}`); return; }
    const { error } = await supabase.rpc("join_group", { p_group: group!.id });
    if (error) return toast.error(t("common.error"));
    toast.success(t("group.joined", { name: loc(group, "name", lang) }));
    qc.invalidateQueries();
  }
  async function leave() {
    await supabase.rpc("leave_group", { p_group: group!.id });
    qc.invalidateQueries();
  }
  const shareText = t("group.shareText", { name: loc(group, "name", lang) });
  const shareUrl = `${window.location.origin}/g/${slug}`;

  if (isLoading) return <AppShell><CardSkeletons n={3} /></AppShell>;
  if (error || !group) return <AppShell><BackButton /><EmptyState title={t("group.notFound")} cta={{ to: "/groups", label: t("page.groups") }} /></AppShell>;

  return (
    <AppShell>
      <BackButton />
      <header className="relative overflow-hidden rounded-3xl border p-5 md:p-7"
        style={{ background: `linear-gradient(135deg, ${team?.primary_color ?? "#1DB954"}55, transparent 70%)` }}>
        <div className="absolute inset-0 bg-pitch-lines opacity-60" />
        <div className="relative flex items-start gap-4">
          <TeamBadge shortName={team?.short_name || "FC"} primary={team?.primary_color} secondary={team?.secondary_color} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold md:text-3xl">{loc(group, "name", lang)}</h1>
              <DemoChip show={group.is_demo} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {loc(team, "name", lang)} · {t(`city.${group.city}` as never)} · {t("home.members", { n: memberCount ?? 0 })}
            </p>
            {group.is_official && <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-semibold text-accent"><Crown className="h-3.5 w-3.5" />{t("group.official")}</p>}
          </div>
        </div>
        <div className="relative mt-5 flex flex-wrap gap-2">
          {me ? (
            <>
              <span className="rounded-full bg-primary/15 px-3 py-2 text-sm font-medium text-primary">{t("group.memberNo", { n: me.member_number ?? "—" })}</span>
              {me.role === "member" && <Button variant="ghost" size="sm" className="rounded-full" onClick={leave}>{t("group.leave")}</Button>}
            </>
          ) : <Button className="rounded-full" onClick={join}>{t("group.join")}</Button>}
          <Button variant="outline" className="rounded-full" onClick={async () => { const r = await shareOrCopy(shareText, shareUrl); if (r === "copied") toast.success(t("common.copied")); }}>
            <Share2 className="me-1.5 h-4 w-4" />{t("common.share")}
          </Button>
          <Button asChild variant="outline" className="rounded-full"><a href={whatsappShare(`${shareText} ${shareUrl}`)} target="_blank" rel="noreferrer"><MessageCircle className="me-1.5 h-4 w-4" />WhatsApp</a></Button>
          {isAdmin && <Button asChild variant="secondary" className="rounded-full"><Link to={`/organiser/${group.slug}`}><Settings className="me-1.5 h-4 w-4" />{t("page.organiser")}</Link></Button>}
        </div>
      </header>

      <Tabs defaultValue="parties" className="mt-6">
        <TabsList className="w-full justify-start overflow-x-auto rounded-full">
          <TabsTrigger value="parties" className="rounded-full">{t("group.tabParties")}</TabsTrigger>
          <TabsTrigger value="league" className="rounded-full">{t("group.tabLeague")}</TabsTrigger>
          <TabsTrigger value="news" className="rounded-full">{t("group.tabNews")}</TabsTrigger>
          <TabsTrigger value="members" className="rounded-full">{t("group.tabMembers")}</TabsTrigger>
          <TabsTrigger value="about" className="rounded-full">{t("group.tabAbout")}</TabsTrigger>
        </TabsList>

        <TabsContent value="parties" className="space-y-6">
          {upcoming.length ? <div className="grid gap-3 md:grid-cols-2">{upcoming.map((p) => <PartyCard key={p.id} party={p} showGroup={false} />)}</div>
            : <EmptyState icon={<Tv className="h-5 w-5" />} title={t("group.noUpcoming")} />}
          {past.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{t("group.past")}</h3>
              <div className="grid gap-3 md:grid-cols-2">{past.map((p) => <PartyCard key={p.id} party={p} showGroup={false} />)}</div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="league">
          {!user ? <EmptyState title={t("group.signInLeague")} cta={{ to: `/auth?next=/g/${slug}`, label: t("nav.signIn") }} />
            : board?.length ? <LeaderboardTable rows={board} currentUserId={user.id} /> : <EmptyState title={t("league.empty")} cta={{ to: "/predict", label: t("league.makePrediction") }} />}
          <p className="mt-2 text-xs text-muted-foreground">{t("league.rules")}</p>
        </TabsContent>

        <TabsContent value="news" className="space-y-3">
          {(announcements ?? []).length ? announcements!.map((a) => (
            <article key={a.id} className="rounded-2xl border bg-card p-4">
              {a.title && <h3 className="font-semibold">{a.title}</h3>}
              <p className="mt-1 whitespace-pre-line text-sm">{(lang === "ar" && a.body_ar) || a.body}</p>
              <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(a.created_at ?? new Date().toISOString())}</p>
              {a.watch_party_id && <Link to={`/party/${a.watch_party_id}`} className="mt-2 inline-block text-sm font-medium text-primary">{t("group.openParty")}</Link>}
            </article>
          )) : <EmptyState title={t("group.noNews")} />}
        </TabsContent>

        <TabsContent value="members">
          {!user ? <EmptyState title={t("group.signInMembers")} cta={{ to: `/auth?next=/g/${slug}`, label: t("nav.signIn") }} /> : (
            <div className="overflow-hidden rounded-2xl border bg-card">
              {(members ?? []).map((m) => {
                const p = profiles?.find((x) => x.user_id === m.user_id);
                return (
                  <div key={m.id} className="flex items-center gap-3 border-b px-4 py-3 last:border-0">
                    <Initials name={p?.full_name} />
                    <span className="flex-1 truncate">{p?.full_name ?? "—"}</span>
                    {m.role !== "member" && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">{t(`role.${m.role}` as never)}</span>}
                    <span className="scoreboard text-xs text-muted-foreground">#{m.member_number}</span>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="about" className="space-y-4">
          {loc(group, "description", lang) && <p className="whitespace-pre-line">{loc(group, "description", lang)}</p>}
          {group.home_venue && (<div><h3 className="mb-2 text-sm font-semibold text-muted-foreground">{t("group.homeVenue")}</h3><VenueCard venue={group.home_venue} /></div>)}
          <div className="flex flex-wrap gap-2">
            {group.instagram && <Button asChild variant="outline" className="rounded-full"><a href={`https://instagram.com/${group.instagram.replace("@", "")}`} target="_blank" rel="noreferrer"><Instagram className="me-1.5 h-4 w-4" />{group.instagram}</a></Button>}
            {group.whatsapp_link && <Button asChild variant="outline" className="rounded-full"><a href={group.whatsapp_link} target="_blank" rel="noreferrer"><MessageCircle className="me-1.5 h-4 w-4" />{t("group.whatsappGroup")}</a></Button>}
          </div>
          {group.dues_amount_aed ? <p className="text-sm"><span className="text-muted-foreground">{t("group.dues")}: </span><span className="font-semibold">AED {group.dues_amount_aed}</span> <span className="text-muted-foreground">/ {t("group.year")}</span></p> : null}
          <p className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5" />{t("group.since", { date: formatDateTime(group.created_at ?? new Date().toISOString(), { month: "long", year: "numeric" }) })}</p>
          {past[0] && <p className="text-xs text-muted-foreground">{t("group.lastParty", { date: formatDateTime(partyTime(past[0]), { day: "numeric", month: "short" }) })}</p>}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
