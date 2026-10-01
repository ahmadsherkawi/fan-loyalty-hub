import { useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { useAccount } from "@/lib/access";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Clock, Instagram, MapPin, MessageCircle, Navigation, Phone, Volume2, VolumeX } from "lucide-react";
import { AppShell, BackButton } from "@/components/layout/AppShell";
import { TeamBadge } from "@/components/brand/TeamBadge";
import { GroupCard, PartyCard, VenueFacts } from "@/components/cards";
import { CardSkeletons, DemoChip, EmptyState } from "@/components/common/bits";
import { RewardItem } from "@/components/rewards/Rewards";
import { ChatThread } from "@/components/venue/ChatThread";
import { RequestTable } from "@/components/venue/RequestTable";
import { PolicyDetails, PolicyNote, StillComing } from "@/components/booking/Policy";
import { ClaimVenueCard } from "@/components/venue/Claim";
import { MENU_SECTIONS } from "@/components/venue/MenuEditor";
import { compLabel } from "@/lib/competitions";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import type { TKey } from "@/i18n/en";
import { supabase } from "@/integrations/supabase/client";
import { FIXTURE_SELECT, GROUP_SELECT, loc, useMyRewards, useVenueParties, type FixtureWithTeams, type GroupFull, type Venue } from "@/lib/data";

type Screening = { id: string; sound: boolean; fixture: FixtureWithTeams };

export default function VenuePage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { t, lang, formatDateTime } = useI18n();
  const { user } = useAuth();
  const acct = useAccount();
  const qc = useQueryClient();
  const [chatParam, setChat] = useState(params.get("chat") === "1");
  const [tableBusy, setTableBusy] = useState(false);
  const { data: venue, isLoading } = useQuery({
    queryKey: ["venue", id],
    enabled: !!id,
    queryFn: async () => (await supabase.from("venues").select("*").eq("id", id!).single()).data as Venue | null,
  });
  const { data: screenings } = useQuery({
    queryKey: ["venue-screenings", id],
    enabled: !!id,
    queryFn: async () => {
      const rows = ((await supabase.from("venue_screenings").select(`id, sound, fixture:fixtures(${FIXTURE_SELECT})`).eq("venue_id", id!)).data ?? []) as unknown as Screening[];
      return rows.filter((r) => r.fixture && new Date(r.fixture.kickoff_at).getTime() > Date.now() - 2 * 3600e3)
        .sort((a, b) => new Date(a.fixture.kickoff_at).getTime() - new Date(b.fixture.kickoff_at).getTime());
    },
  });
  const { data: menu } = useQuery({
    queryKey: ["menu-public", id],
    enabled: !!id,
    queryFn: async () => (await supabase.from("venue_menu_items").select("*").eq("venue_id", id!).eq("is_available", true).order("sort")).data ?? [],
  });
  const { data: offers } = useQuery({
    queryKey: ["offers", id],
    enabled: !!id,
    queryFn: async () => (await supabase.from("venue_offers").select("*").eq("venue_id", id!).eq("active", true).order("min_caps")).data ?? [],
  });
  const { data: groups } = useQuery({
    queryKey: ["venue-groups", id],
    enabled: !!id,
    queryFn: async () => ((await supabase.from("groups").select(GROUP_SELECT).eq("home_venue_id", id!)).data ?? []) as unknown as GroupFull[],
  });
  const { data: parties } = useVenueParties(id);
  const { data: myRewards } = useMyRewards(!!user && !acct.isVenue);
  const { data: myTables } = useQuery({
    queryKey: ["my-tables", id],
    enabled: !!id && !!user && !acct.isVenue,
    queryFn: async () => (await supabase.from("table_bookings").select("id, status, party_size, venue_reply, confirmed_at, arrived_at, no_show_at, fixture:fixtures(home_team_name, away_team_name, kickoff_at)")
      .eq("venue_id", id!).eq("user_id", user!.id).neq("status", "cancelled").order("created_at", { ascending: false }).limit(3)).data ?? [],
  });

  async function cancelTable(bid: string, status: string, kickoff?: string | null) {
    const late = status === "confirmed" && !!kickoff && new Date(kickoff).getTime() - Date.now() < 3 * 3600e3;
    const q = status === "confirmed" ? t("tables.cancelConfirmedQ") : t("tables.cancelQ");
    if (!window.confirm(late ? `${q}\n\n${t("cancel.lateWarn")}` : q)) return;
    const { data, error } = await supabase.rpc("cancel_table", { p_booking: bid });
    if (error) return toast.error(t("common.error"));
    toast.success((data as { late?: boolean } | null)?.late ? t("cancel.lateToast") : t("tables.cancelled"));
    qc.invalidateQueries({ queryKey: ["my-tables", id] });
    qc.invalidateQueries({ queryKey: ["my-reliability"] });
  }
  async function reconfirmTable(bid: string) {
    setTableBusy(true);
    const { error } = await supabase.rpc("reconfirm_table", { p_booking: bid });
    setTableBusy(false);
    if (error) return toast.error(t("common.error"));
    toast.success(t("still.thanks"));
    qc.invalidateQueries({ queryKey: ["my-tables", id] }); qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  if (isLoading || !acct.ready) return <AppShell><CardSkeletons /></AppShell>;
  if (!venue) return <AppShell><BackButton /><EmptyState title={t("venue.notFound")} /></AppShell>;
  const isOwner = !!user && venue.owner_user_id === user.id;
  // Venue accounts only see their own page, as a read-only preview of what fans see
  const claimMode = !venue.owner_user_id && (params.get("claim") === "1" || acct.venues.length === 0);
  if (acct.isVenue && !isOwner && !claimMode) return <Navigate to={acct.venueHome} replace />;
  const preview = acct.isVenue && isOwner;
  const name = loc(venue, "name", lang);
  const wa = venue.whatsapp?.replace(/[^0-9]/g, "");
  const joined = !!venue.owner_user_id;
  const chat = chatParam && joined;
  const partyFixtures = new Set((parties ?? []).map((p) => p.fixture_id));

  return (
    <AppShell>
      {preview ? (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-ai-soft px-4 py-3 text-sm">
          <span className="font-semibold text-ai">{t("venue.previewBanner")}</span>
          <Button asChild size="sm" variant="ink"><Link to={acct.venueHome}>{t("venue.backToDashboard")}</Link></Button>
        </div>
      ) : <BackButton />}
      <div className="card overflow-hidden">
        {venue.cover_url && <img src={venue.cover_url} alt="" className="h-40 w-full object-cover" />}
        <div className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[26px] font-extrabold leading-tight">{name}</h1>
            {venue.is_pro && <span className="rounded-md bg-foreground px-1.5 py-0.5 text-[10px] font-bold text-background">PRO</span>}
            <DemoChip show={venue.is_demo} />
          </div>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />{[venue.area, t(`city.${venue.city}` as never)].filter(Boolean).join(" · ")}</p>
          {venue.opening_hours && <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground"><Clock className="h-4 w-4" />{venue.opening_hours}</p>}
          {loc(venue, "description", lang) && <p className="mt-3 text-sm">{loc(venue, "description", lang)}</p>}
          <div className="mt-4"><VenueFacts venue={venue} /></div>
          <div className={cn("no-scrollbar -mx-5 mt-4 flex gap-2 overflow-x-auto px-5", preview && "pointer-events-none opacity-60")} aria-disabled={preview}>
            {joined && <Button size="sm" onClick={() => setChat(true)}><MessageCircle />{t("chat.message")}</Button>}
            {joined && <RequestTable venueId={venue.id} venueName={name} fixtureId={null} trigger={<Button size="sm" variant="ink">{t("tables.request")}</Button>} />}
            {venue.phone && <Button asChild variant="outline" size="sm"><a href={`tel:${venue.phone.replace(/\s/g, "")}`}><Phone />{t("venue.call")}</a></Button>}
            {wa && <Button asChild variant="outline" size="sm"><a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer"><MessageCircle />WhatsApp</a></Button>}
            {venue.lat && venue.lng && <Button asChild variant="outline" size="sm"><a href={`https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}`} target="_blank" rel="noreferrer"><Navigation />{t("party.directions")}</a></Button>}
            {venue.instagram && <Button asChild variant="outline" size="sm"><a href={`https://instagram.com/${venue.instagram.replace("@", "")}`} target="_blank" rel="noreferrer"><Instagram />{venue.instagram}</a></Button>}
          </div>
          {!joined && <p className="mt-3 rounded-xl bg-surface px-3 py-2 text-xs text-muted-foreground">{t("venue.notJoined")}</p>}
          {!joined && !venue.is_demo && <ClaimVenueCard venue={venue} autoOpen={params.get("claim") === "1"} />}
        </div>
      </div>

      {(myTables ?? []).length > 0 && (
        <div className="mt-3 space-y-2">
          {myTables!.map((b) => {
            const fx = b.fixture as unknown as { home_team_name: string; away_team_name: string; kickoff_at: string } | null;
            const upcoming = !fx || new Date(fx.kickoff_at).getTime() > Date.now();
            return (
              <div key={b.id} className={`rounded-2xl px-4 py-3 text-sm ${b.status === "confirmed" ? "bg-brand-soft" : b.status === "declined" ? "bg-destructive/10" : "bg-surface"}`}>
                <div className="flex items-center gap-3">
                  <span className="scoreboard text-xl font-bold">{b.party_size}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{b.no_show_at ? t("tables.noShow") : b.arrived_at ? t("tables.arrived") : t(`tables.status_${b.status}` as TKey)}</p>
                    <p className="truncate text-xs text-muted-foreground">{fx ? `${fx.home_team_name} ${t("common.vs")} ${fx.away_team_name} · ${formatDateTime(fx.kickoff_at)}` : t("tables.anyNight")}{b.venue_reply ? ` · “${b.venue_reply}”` : ""}</p>
                  </div>
                  {b.status !== "declined" && upcoming && (
                    <button className="shrink-0 text-xs font-semibold text-muted-foreground hover:text-foreground" onClick={() => cancelTable(b.id, b.status, fx?.kickoff_at)}>{t("common.cancel")}</button>
                  )}
                </div>
                {b.status === "confirmed" && upcoming && (
                  <>
                    {fx && <StillComing kind="table" kickoff={fx.kickoff_at} confirmedAt={b.confirmed_at} onYes={() => reconfirmTable(b.id)} onRelease={() => cancelTable(b.id, b.status, fx.kickoff_at)} busy={tableBusy} />}
                    <PolicyDetails kind="table" kickoff={fx?.kickoff_at} title className="mt-3" />
                  </>
                )}
                {b.status === "pending" && upcoming && <PolicyNote kind="table" kickoff={fx?.kickoff_at} className="mt-2" />}
              </div>
            );
          })}
        </div>
      )}

      <Tabs defaultValue="games" className="mt-6">
        <TabsList className="w-full">
          <TabsTrigger value="games">{t("venue.tabGames")}</TabsTrigger>
          <TabsTrigger value="menu">{t("menu.title")}</TabsTrigger>
          <TabsTrigger value="rewards">{t("rewards.title")}</TabsTrigger>
        </TabsList>

        <TabsContent value="games" className="space-y-6">
          {(parties ?? []).length > 0 && (
            <section>
              <h2 className="mb-2 eyebrow">{t("venue.partiesHere")}</h2>
              <div className={cn("grid gap-3", preview && "pointer-events-none")}>{parties!.map((p) => <PartyCard key={p.id} party={p} />)}</div>
            </section>
          )}
          <section>
            <h2 className="mb-2 eyebrow">{t("venue.showing")}</h2>
            {(screenings ?? []).length ? (
              <div className="card divide-y">
                {screenings!.filter((s) => !partyFixtures.has(s.fixture.id)).slice(0, 25).map((s) => {
                  const f = s.fixture;
                  return (
                    <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-14 shrink-0 text-center">
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground">{formatDateTime(f.kickoff_at, { weekday: "short", day: "numeric" })}</p>
                        <p className="scoreboard text-lg font-bold leading-none">{formatDateTime(f.kickoff_at, { hour: "2-digit", minute: "2-digit", hour12: false })}</p>
                      </div>
                      <div className="flex shrink-0 -space-x-1.5 rtl:space-x-reverse">
                        <TeamBadge size="xs" shortName={f.home_team?.short_name || f.home_team_name.slice(0, 3)} primary={f.home_team?.primary_color} secondary={f.home_team?.secondary_color} />
                        <TeamBadge size="xs" shortName={f.away_team?.short_name || f.away_team_name.slice(0, 3)} primary={f.away_team?.primary_color} secondary={f.away_team?.secondary_color} />
                      </div>
                      <Link to={`/match/${f.id}`} className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{f.home_team_name} {t("common.vs")} {f.away_team_name}</p>
                        <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">{s.sound ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}{s.sound ? t("venue.withSound") : t("venue.noSound")} · {compLabel(t, f.competition_code, f.competition)}</p>
                      </Link>
                      {!preview && joined && new Date(f.kickoff_at).getTime() > Date.now() && <RequestTable venueId={venue.id} venueName={name} fixtureId={f.id} kickoff={f.kickoff_at} matchLabel={`${f.home_team_name} ${t("common.vs")} ${f.away_team_name} · ${formatDateTime(f.kickoff_at)}`}
                        trigger={<Button size="xs" variant="outline">{t("tables.book")}</Button>} />}
                    </div>
                  );
                })}
              </div>
            ) : <p className="rounded-2xl bg-surface px-4 py-5 text-center text-sm text-muted-foreground">{t("venue.noGames")}</p>}
          </section>
          {(groups ?? []).length > 0 && (
            <section>
              <h2 className="mb-2 eyebrow">{t("venue.homeOf")}</h2>
              <div className={cn("grid gap-3", preview && "pointer-events-none")}>{groups!.map((g) => <GroupCard key={g.id} group={g} />)}</div>
            </section>
          )}
        </TabsContent>

        <TabsContent value="menu" className="space-y-5">
          {(menu ?? []).length ? MENU_SECTIONS.map((sec) => {
            const items = (menu ?? []).filter((i) => i.section === sec);
            if (!items.length) return null;
            return (
              <section key={sec}>
                <h2 className="mb-2 eyebrow">{t(`menu.${sec}` as TKey)}</h2>
                <div className={sec === "deals" ? "grid gap-2" : "card divide-y"}>
                  {items.map((i) => (
                    <div key={i.id} className={sec === "deals" ? "flex items-center gap-3 rounded-2xl border border-gold/50 bg-gold-soft p-3" : "flex items-center gap-3 px-4 py-3"}>
                      {i.photo_url && <img src={i.photo_url} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-xl object-cover" />}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{loc(i, "name", lang)}</p>
                        {loc(i, "description", lang) && <p className="text-xs text-muted-foreground">{loc(i, "description", lang)}</p>}
                        {i.tags.length > 0 && <p className="mt-1 flex flex-wrap gap-1">{i.tags.map((tag) => <span key={tag} className="rounded bg-card px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{t(`tag.${tag}` as TKey)}</span>)}</p>}
                      </div>
                      {i.price_aed != null && <p className="shrink-0 text-end"><span className="scoreboard text-xl font-bold">{Number(i.price_aed)}</span><span className="block text-[10px] text-muted-foreground">{t("common.aedShort")}</span></p>}
                    </div>
                  ))}
                </div>
              </section>
            );
          }) : <EmptyState title={t("menu.empty")} />}
          {(menu ?? []).length > 0 && <p className="text-xs text-muted-foreground">{t("menu.pricesNote")}</p>}
        </TabsContent>

        <TabsContent value="rewards">
          {(offers ?? []).length === 0 ? <EmptyState title={t("rewards.none")} /> : myRewards && !preview ? (
            <div className="space-y-2">{myRewards.filter((r) => r.venue_id === venue.id).map((r) => <RewardItem key={r.id} r={r} showVenue={false} />)}</div>
          ) : (
            <div className="card divide-y">{offers!.map((o) => (
              <div key={o.id} className="flex items-center gap-3 px-4 py-3">
                <span className="scoreboard flex h-10 w-10 items-center justify-center rounded-xl bg-gold text-lg font-bold">{o.min_caps || "★"}</span>
                <div className="min-w-0"><p className="font-semibold">{loc(o, "title", lang)}</p><p className="text-xs text-muted-foreground">{o.min_caps ? t("rewards.unlockAt", { n: o.min_caps }) : t("rewards.memberPerk")}</p></div>
              </div>
            ))}</div>
          )}
          <p className="mt-2 text-xs text-muted-foreground">{t("rewards.howCaps")}</p>
        </TabsContent>
      </Tabs>

      <Sheet open={chat} onOpenChange={setChat}>
        <SheetContent side="bottom" className="flex h-[80vh] flex-col rounded-t-3xl">
          <SheetHeader><SheetTitle>{t("chat.with", { venue: name })}</SheetTitle></SheetHeader>
          {user ? <div className="mt-3 flex min-h-0 flex-1 flex-col"><ChatThread venueId={venue.id} asVenue={false} venueName={name} /></div>
            : <EmptyState title={t("chat.signIn")} cta={{ to: `/auth?next=/venues/${venue.id}?chat=1`, label: t("nav.signIn") }} />}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
