import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, CheckCircle2, ChevronRight, Instagram, MessageCircle, Settings, Share2, Tv, Users } from "lucide-react";
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
      <header className="card overflow-hidden">
        <div className="h-2" style={{ background: `linear-gradient(90deg, ${team?.primary_color ?? "#00C566"}, ${team?.secondary_color ?? team?.primary_color ?? "#00C566"})` }} />
        <div className="p-5">
          <div className="flex items-start gap-4">
            <TeamBadge shortName={team?.short_name || "FC"} primary={team?.primary_color} secondary={team?.secondary_color} size="lg" />
            <div className="min-w-0 flex-1">
              <h1 className="flex flex-wrap items-center gap-2 text-2xl font-extrabold leading-tight md:text-3xl">
                {loc(group, "name", lang)}
                {group.is_official && <BadgeCheck className="h-5 w-5 text-brand" aria-label={t("group.official")} />}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">{loc(team, "name", lang)} · {t(`city.${group.city}` as never)}</p>
              <div className="mt-1.5"><DemoChip show={group.is_demo} /></div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 divide-x rounded-xl bg-surface py-3 text-center rtl:divide-x-reverse">
            <div><p className="scoreboard text-2xl font-bold leading-none">{memberCount ?? 0}</p><p className="mt-1 text-[11px] font-medium text-muted-foreground">{t("group.statMembers")}</p></div>
            <div><p className="scoreboard text-2xl font-bold leading-none">{upcoming.length}</p><p className="mt-1 text-[11px] font-medium text-muted-foreground">{t("group.statUpcoming")}</p></div>
            <div><p className="scoreboard text-2xl font-bold leading-none">{me ? `#${me.member_number ?? "—"}` : "—"}</p><p className="mt-1 text-[11px] font-medium text-muted-foreground">{t("group.statYourNo")}</p></div>
          </div>

          <div className="mt-4 flex gap-2">
            {me ? (
              <span className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-brand-soft text-sm font-bold text-brand"><CheckCircle2 className="h-4 w-4" />{t("group.youreMember")}</span>
            ) : <Button className="flex-1" onClick={join}>{t("group.join")}</Button>}
            <Button variant="outline" size="icon" className="h-11 w-11" aria-label={t("common.share")} onClick={async () => { const r = await shareOrCopy(shareText, shareUrl); if (r === "copied") toast.success(t("common.copied")); }}><Share2 /></Button>
            <Button asChild variant="outline" size="icon" className="h-11 w-11"><a href={whatsappShare(`${shareText} ${shareUrl}`)} target="_blank" rel="noreferrer" aria-label="WhatsApp"><MessageCircle /></a></Button>
          </div>
          {me && me.role === "member" && <button className="mt-2 w-full text-center text-xs font-medium text-muted-foreground hover:text-foreground" onClick={leave}>{t("group.leave")}</button>}
        </div>
        {isAdmin && (
          <Link to={`/organiser/${group.slug}`} className="flex items-center gap-3 border-t bg-foreground px-5 py-3.5 text-background">
            <Settings className="h-4 w-4 text-primary" />
            <span className="flex-1 text-sm font-bold">{t("page.organiser")}</span>
            <span className="text-xs text-background/60">{t("group.organiserHint")}</span>
            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
          </Link>
        )}
      </header>

      <Tabs defaultValue="parties" className="mt-6">
        <TabsList className="w-full">
          <TabsTrigger value="parties">{t("group.tabParties")}</TabsTrigger>
          <TabsTrigger value="league">{t("group.tabLeague")}</TabsTrigger>
          <TabsTrigger value="news">{t("group.tabNews")}</TabsTrigger>
          <TabsTrigger value="about">{t("group.tabAbout")}</TabsTrigger>
        </TabsList>

        <TabsContent value="parties" className="space-y-6">
          {upcoming.length ? <div className="grid gap-3 md:grid-cols-2">{upcoming.map((p) => <PartyCard key={p.id} party={p} showGroup={false} />)}</div>
            : <EmptyState icon={<Tv className="h-5 w-5" />} title={t("group.noUpcoming")} />}
          {past.length > 0 && (
            <div>
              <h3 className="mb-2 eyebrow">{t("group.past")}</h3>
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
            <article key={a.id} className="card p-4">
              {a.title && <h3 className="font-semibold">{a.title}</h3>}
              <p className="mt-1 whitespace-pre-line text-sm">{(lang === "ar" && a.body_ar) || a.body}</p>
              <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(a.created_at ?? new Date().toISOString())}</p>
              {a.watch_party_id && <Link to={`/party/${a.watch_party_id}`} className="mt-2 inline-block text-sm font-bold text-brand">{t("group.openParty")}</Link>}
            </article>
          )) : <EmptyState title={t("group.noNews")} />}
        </TabsContent>

        <TabsContent value="about" className="space-y-4">
          {loc(group, "description", lang) && <p className="whitespace-pre-line">{loc(group, "description", lang)}</p>}
          {group.home_venue && (<div><h3 className="mb-2 eyebrow">{t("group.homeVenue")}</h3><VenueCard venue={group.home_venue} /></div>)}
          <div className="flex flex-wrap gap-2">
            {group.instagram && <Button asChild variant="outline" className="rounded-full"><a href={`https://instagram.com/${group.instagram.replace("@", "")}`} target="_blank" rel="noreferrer"><Instagram className="me-1.5 h-4 w-4" />{group.instagram}</a></Button>}
            {group.whatsapp_link && <Button asChild variant="outline" className="rounded-full"><a href={group.whatsapp_link} target="_blank" rel="noreferrer"><MessageCircle className="me-1.5 h-4 w-4" />{t("group.whatsappGroup")}</a></Button>}
          </div>
          {group.dues_amount_aed ? <p className="text-sm"><span className="text-muted-foreground">{t("group.dues")}: </span><span className="font-semibold">AED {group.dues_amount_aed}</span> <span className="text-muted-foreground">/ {t("group.year")}</span></p> : null}
          <p className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5" />{t("group.since", { date: formatDateTime(group.created_at ?? new Date().toISOString(), { month: "long", year: "numeric" }) })}</p>
          <div><h3 className="mb-2 eyebrow">{t("group.tabMembers")}</h3>
          {!user ? <EmptyState title={t("group.signInMembers")} cta={{ to: `/auth?next=/g/${slug}`, label: t("nav.signIn") }} /> : (
            <div className="card overflow-hidden">
              {(members ?? []).map((m) => {
                const p = profiles?.find((x) => x.user_id === m.user_id);
                return (
                  <div key={m.id} className="flex items-center gap-3 border-b px-4 py-3 last:border-0">
                    <Initials name={p?.full_name} />
                    <span className="flex-1 truncate">{p?.full_name ?? "—"}</span>
                    {m.role !== "member" && <span className="rounded-full bg-gold-soft px-2 py-0.5 text-[10px] font-bold text-gold-ink">{t(`role.${m.role}` as never)}</span>}
                    <span className="scoreboard text-xs text-muted-foreground">#{m.member_number}</span>
                  </div>
                );
              })}
            </div>
          )}
          </div>
          {past[0] && <p className="text-xs text-muted-foreground">{t("group.lastParty", { date: formatDateTime(partyTime(past[0]), { day: "numeric", month: "short" }) })}</p>}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
