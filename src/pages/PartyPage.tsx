import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, CalendarX2, CheckCircle2, Clock, TicketCheck, Users, Gift, MapPin, MessageCircle, Minus, Navigation, Plus, QrCode, Share2, Stamp, Tv } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { AppShell, BackButton } from "@/components/layout/AppShell";
import { FixtureScoreboard } from "@/components/match/FixtureScoreboard";
import { VenueFacts } from "@/components/cards";
import { CardSkeletons, DemoChip, EmptyState, FeatureHeader } from "@/components/common/bits";
import { MatchWall } from "@/components/party/MatchWall";
import { checkinWindow, phaseOf, type Phase } from "@/lib/matchPhase";
import { GuestList } from "@/components/GuestList";
import { EditPartyButtons } from "@/components/party/EditParty";
import { PausedNotice, PolicyDetails, PolicyNote, StillComing, usePaused } from "@/components/booking/Policy";
import { cn } from "@/lib/utils";
import { PunditChat } from "@/components/ai/PunditChat";
import { HalftimeQuiz } from "@/components/ai/HalftimeQuiz";
import { MotmVote } from "@/components/ai/MotmVote";
import { RecapCard } from "@/components/ai/RecapCard";
import { PredictionInput } from "@/components/match/PredictionInput";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import {
  downloadIcs, isFinished, isLive, loc, partyTime, shareOrCopy, useIsGroupAdmin, useParty, usePartyCounts, whatsappShare,
} from "@/lib/data";

export default function PartyPage() {
  const { id } = useParams();
  const { t, lang, formatDateTime } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: party, isLoading, error } = useParty(id);
  const { data: counts } = usePartyCounts(id);
  const { data: isAdmin } = useIsGroupAdmin(party?.group_id, user?.id);
  const [guests, setGuests] = useState(0);
  const [busy, setBusy] = useState(false);
  const pausedUntil = usePaused();

  const { data: rsvps } = useQuery({
    queryKey: ["rsvps", id],
    enabled: !!id && !!user,
    queryFn: async () => (await supabase.from("rsvps").select("*").eq("watch_party_id", id!).eq("user_id", user!.id).neq("status", "cancelled")).data ?? [],
  });
  const { data: myCheckin } = useQuery({
    queryKey: ["my-checkin", id, user?.id],
    enabled: !!id && !!user,
    queryFn: async () => (await supabase.from("checkins").select("id").eq("watch_party_id", id!).eq("user_id", user!.id).maybeSingle()).data,
  });
  const { data: offers } = useQuery({
    queryKey: ["offers", party?.venue_id],
    enabled: !!party?.venue_id,
    queryFn: async () => (await supabase.from("venue_offers").select("*").eq("venue_id", party!.venue_id!).eq("active", true).order("min_caps")).data ?? [],
  });
  const mine = rsvps?.find((r) => r.user_id === user?.id);

  if (isLoading) return <AppShell><CardSkeletons n={3} /></AppShell>;
  if (error || !party) return <AppShell><BackButton /><EmptyState title={t("party.notFound")} cta={{ to: "/", label: t("notFound.home") }} /></AppShell>;

  const f = party.fixture;
  const live = isLive(f?.status) || party.status === "live";
  const done = isFinished(f?.status) || party.status === "finished";
  const when = partyTime(party);
  const homeN = (lang === "ar" && f?.home_team?.name_ar) || f?.home_team_name;
  const awayN = (lang === "ar" && f?.away_team?.name_ar) || f?.away_team_name;
  const title = f ? `${homeN} ${t("common.vs")} ${awayN}` : party.title ?? t("page.party");
  const cancelled = party.status === "cancelled";
  const venueName = loc(party.venue, "name", lang);
  const url = `${window.location.origin}/party/${party.id}`;
  const shareText = t("party.shareText", { match: title, venue: venueName || "", time: formatDateTime(when) });
  const cap = party.capacity ?? 0;
  const isVenueOwner = !!user && party.venue?.owner_user_id === user.id;
  const phase: Phase = phaseOf(f);
  const win = checkinWindow(when);
  const rsvpClosed = new Date(when).getTime() <= Date.now();

  async function doRsvp() {
    if (!user) { navigate(`/auth?next=/party/${party!.id}`); return; }
    setBusy(true);
    const { data, error } = await supabase.rpc("rsvp", { p_party: party!.id, p_guests: guests });
    setBusy(false);
    if (error) return toast.error(error.message.includes("reservations closed") ? t("party.rsvpClosed") : error.message.includes("party closed") ? t("party.cancelledBanner") : error.message.includes("declined") ? t("party.venueCantHost") : error.message.includes("guests paused") ? t("party.guestsPaused") : t("common.error"));
    toast.success((data as { status?: string })?.status === "waitlist" ? t("party.waitlisted") : party!.venue_status === "pending" ? t("party.seatHeld") : t("party.youreGoing"));
    qc.invalidateQueries({ queryKey: ["rsvps", id] }); qc.invalidateQueries({ queryKey: ["party-counts", id] });
  }
  async function cancel() {
    const late = mine?.status === "going" && party!.venue_status === "confirmed" && new Date(when).getTime() - Date.now() < 3 * 3600e3;
    const q = mine?.status === "waitlist" ? t("party.leaveWaitlistQ") : t("party.cancelRsvpQ");
    if (!window.confirm(late ? `${q}\n\n${t("cancel.lateWarn")}` : q)) return;
    const { data, error } = await supabase.rpc("cancel_rsvp", { p_party: party!.id });
    if (error) return toast.error(t("common.error"));
    toast.success((data as { late?: boolean } | null)?.late ? t("cancel.lateToast") : t("party.rsvpCancelled"));
    qc.invalidateQueries({ queryKey: ["rsvps", id] }); qc.invalidateQueries({ queryKey: ["party-counts", id] });
    qc.invalidateQueries({ queryKey: ["my-reliability"] });
  }
  async function reconfirm() {
    setBusy(true);
    const { error } = await supabase.rpc("reconfirm_rsvp", { p_party: party!.id });
    setBusy(false);
    if (error) return toast.error(t("common.error"));
    toast.success(t("still.thanks"));
    qc.invalidateQueries({ queryKey: ["rsvps", id] }); qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  const pct = cap ? Math.min(100, ((counts?.going ?? 0) / cap) * 100) : 0;
  const share = async () => { const r = await shareOrCopy(shareText, url); if (r === "copied") toast.success(t("common.copied")); else if (r === "failed") toast.error(t("common.error")); };

  return (
    <AppShell>
      <BackButton />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {party.group && <Link to={`/g/${party.group.slug}`} className="text-sm font-bold text-brand hover:underline">{loc(party.group, "name", lang)}</Link>}
        <DemoChip show={party.is_demo} />
      </div>
      {party.title && f && party.title !== title && <h1 className="mb-4 text-[26px] font-extrabold leading-tight" dir="auto">{party.title}</h1>}
      {f ? (
        <FixtureScoreboard fixture={f} footer={
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 shrink-0 text-primary" />
            <span className="min-w-0 flex-1 truncate font-semibold">{venueName || t("party.venueTbc")}</span>
            <span className="shrink-0 text-white/60">{formatDateTime(when, { weekday: "short", hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        } />
      ) : <h1 className="text-2xl font-extrabold">{title}</h1>}

      {/* Quick actions — always labelled */}
      <div className={cn("no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4", cancelled && "hidden")}>
        <Button asChild variant="outline" size="sm"><a href={whatsappShare(`${shareText} ${url}`)} target="_blank" rel="noreferrer"><MessageCircle />WhatsApp</a></Button>
        <Button variant="outline" size="sm" onClick={share}><Share2 />{t("common.share")}</Button>
        <Button variant="outline" size="sm" onClick={() => downloadIcs(title, when, 150, [venueName, party.venue?.area].filter(Boolean).join(", "), url)}><CalendarPlus />{t("party.calendar")}</Button>
      </div>

      {cancelled && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-destructive/10 px-4 py-3">
          <CalendarX2 className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="text-sm"><p className="font-bold text-destructive">{t("party.cancelledBanner")}</p><p className="text-muted-foreground">{t("party.cancelledSub")}</p></div>
        </div>
      )}

      {party.venue && party.venue_status !== "none" && !done && !cancelled && (
        <div className={cn("mt-4 flex items-start gap-3 rounded-2xl px-4 py-3",
          party.venue_status === "confirmed" ? "bg-brand-soft" : party.venue_status === "declined" ? "bg-destructive/10" : "bg-surface")}>
          {party.venue_status === "confirmed" ? <TicketCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
            : party.venue_status === "declined" ? <CalendarX2 className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            : <Clock className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />}
          <div className="min-w-0 text-sm">
            <p className={cn("font-bold", party.venue_status === "confirmed" ? "text-brand" : party.venue_status === "declined" ? "text-destructive" : "")}>
              {t(`party.venue_${party.venue_status}` as never, { venue: venueName })}
            </p>
            <p className="text-muted-foreground" dir="auto">
              {party.venue_status === "confirmed" ? [party.reserved_area, party.venue_note].filter(Boolean).join(" · ") || t("party.venue_confirmedSub")
                : party.venue_status === "declined" ? party.venue_note || t("party.venue_declinedSub")
                : t("party.venue_pendingSub")}
            </p>
          </div>
        </div>
      )}

      {/* RSVP — the one thing every visitor needs */}
      {!done && !cancelled && (
        <div className="card mt-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-baseline gap-1.5">
              <span dir="ltr" className="flex items-baseline gap-1.5"><span className="scoreboard text-4xl font-bold leading-none">{counts?.going ?? 0}</span>
              {cap ? <span className="scoreboard text-xl text-muted-foreground">/ {cap}</span> : null}</span>
              <span className="ms-1 text-sm font-medium text-muted-foreground">{t("party.goingCount")}</span>
            </div>
          </div>
          {cap > 0 && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>}
          {counts?.waitlist ? <p className="mt-2 text-xs text-muted-foreground">{t("party.waitlistCount", { n: counts.waitlist })}</p> : null}
          {live && <p className="mt-2 text-sm font-semibold text-brand">{t("party.checkedInLive", { n: counts?.checked_in ?? 0 })}</p>}

          {mine ? (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-brand-soft px-4 py-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-bold text-brand"><CheckCircle2 className="h-5 w-5" />{party.venue_status === "declined" ? t("party.fanDeclined") : mine.status === "waitlist" ? t("party.onWaitlist") : party.venue_status === "pending" ? t("party.seatHeld") : t("party.youreGoing")}{mine.guests ? ` (+${mine.guests})` : ""}</p>
                {mine.status === "going" && party.venue_status === "pending" && <p className="ms-7 text-xs text-muted-foreground">{t("party.seatHeldSub")}</p>}
              </div>
              <button className="text-sm font-semibold text-muted-foreground hover:text-foreground" onClick={cancel}>{t("party.cancel")}</button>
            </div>
          ) : rsvpClosed ? (
            <p className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-surface py-3 text-sm font-semibold text-muted-foreground"><Clock className="h-4 w-4" />{t("party.rsvpClosed")}</p>
          ) : (
            <div className="mt-4 flex items-center gap-2">
              <div className="flex h-11 items-center rounded-full border bg-card">
                <button className="flex h-11 w-10 items-center justify-center text-muted-foreground hover:text-foreground" onClick={() => setGuests(Math.max(0, guests - 1))} aria-label="-"><Minus className="h-4 w-4" /></button>
                <span className="w-14 text-center text-xs font-semibold">{guests === 1 ? t("party.plusOneGuest") : guests ? t("party.plusGuests", { n: guests }) : t("party.justMe")}</span>
                <button className="flex h-11 w-10 items-center justify-center text-muted-foreground hover:text-foreground" onClick={() => setGuests(Math.min(5, guests + 1))} disabled={!!pausedUntil} aria-label="+"><Plus className="h-4 w-4" /></button>
              </div>
              <Button className="flex-1" onClick={doRsvp} disabled={busy || party.venue_status === "declined"}>{user ? t("party.rsvp") : t("party.signInToRsvp")}</Button>
            </div>
          )}
          {mine?.status === "going" && party.venue_status === "confirmed" && !myCheckin && !rsvpClosed && (
            <>
              <StillComing kind="seat" kickoff={when} confirmedAt={mine.confirmed_at} onYes={reconfirm} onRelease={cancel} busy={busy} />
              <PolicyDetails kind="seat" kickoff={when} title className="mt-3" />
            </>
          )}
          {mine && party.venue_status !== "declined" && !(mine.status === "going" && party.venue_status === "confirmed") && !rsvpClosed && <PolicyNote kind="seat" kickoff={when} className="mt-3" />}
          {!mine && !rsvpClosed && (
            <>
              {pausedUntil && <PausedNotice until={pausedUntil} kind="guests" className="mt-3" />}
              <PolicyNote kind="seat" kickoff={when} className="mt-3" />
            </>
          )}
          {myCheckin && <p className="mt-3 flex items-center justify-center gap-1.5 text-sm font-bold text-gold-ink"><Stamp className="h-4 w-4" />{t("party.youCheckedIn")}</p>}
          {user && !myCheckin && (live || mine) && party.venue_status === "confirmed" && (win === "open"
            ? <Button asChild variant="ink" className="mt-3 w-full"><Link to="/checkin"><QrCode />{t("party.checkInHere")}</Link></Button>
            : win === "early" ? <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground"><QrCode className="h-3.5 w-3.5" />{t("party.checkinOpensAt", { time: formatDateTime(new Date(new Date(when).getTime() - 3 * 3600e3).toISOString(), { weekday: "short", hour: "2-digit", minute: "2-digit" }) })}</p>
            : null)}
        </div>
      )}

      {!cancelled && <Tabs defaultValue="match" className="mt-6">
        <TabsList className="w-full">
          <TabsTrigger value="match">{t("party.tabMatch")}</TabsTrigger>
          <TabsTrigger value="wall">{t("party.tabWall")}</TabsTrigger>
          <TabsTrigger value="venue">{t("party.tabVenue")}</TabsTrigger>
          {(isAdmin || isVenueOwner) && <TabsTrigger value="host">{t("party.tabHost")}</TabsTrigger>}
        </TabsList>

        <TabsContent value="match" className="space-y-3">
          {!user ? (
            <EmptyState title={t("party.signInFeatures")} body={t("party.signInFeaturesBody")} cta={{ to: `/auth?next=/party/${party.id}`, label: t("nav.signIn") }} />
          ) : (
            <>
              {f && !done && <PredictionInput fixture={f} />}
              {f && <PunditChat fixtureId={f.id} partyId={party.id} homeName={homeN ?? f.home_team_name} awayName={awayN ?? f.away_team_name} />}
              {f && <HalftimeQuiz fixtureId={f.id} partyId={party.id} phase={phase} kickoff={f.kickoff_at} />}
              {f && <MotmVote partyId={party.id} fixture={f} phase={phase} checkedIn={!!myCheckin} />}
              {done && <RecapCard party={party} />}
            </>
          )}
        </TabsContent>

        <TabsContent value="wall"><MatchWall partyId={party.id} checkedIn={!!myCheckin} isHost={!!isAdmin || isVenueOwner} /></TabsContent>

        <TabsContent value="venue" className="space-y-3">
          {party.venue ? (
            <div className="card p-4">
              <Link to={`/venues/${party.venue.id}`} className="text-lg font-bold hover:underline">{venueName}</Link>
              <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{[party.venue.area, t(`city.${party.venue.city}` as never)].filter(Boolean).join(" · ")}</p>
              <div className="mt-3"><VenueFacts venue={party.venue} /></div>
              {party.venue.lat && party.venue.lng && (
                <Button asChild variant="outline" className="mt-4 w-full">
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${party.venue.lat},${party.venue.lng}`} target="_blank" rel="noreferrer"><Navigation />{t("party.directions")}</a>
                </Button>
              )}
            </div>
          ) : <EmptyState title={t("party.venueTbc")} />}
          {loc(party, "notes", lang) && (
            <div className="card p-4"><p className="eyebrow mb-1">{t("party.notes")}</p><p className="whitespace-pre-line text-sm" dir="auto">{loc(party, "notes", lang)}</p></div>
          )}
          {(offers ?? []).length > 0 && (
            <div className="rounded-2xl border border-gold/50 bg-gold-soft p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-gold-ink"><Gift className="h-4 w-4" />{t("party.perks")}</p>
              {offers!.map((o) => (
                <div key={o.id} className="mt-2 flex items-start justify-between gap-3">
                  <div><p className="text-sm font-semibold">{loc(o, "title", lang)}</p><p className="text-xs text-muted-foreground">{loc(o, "details", lang)}</p></div>
                  <span className="shrink-0 rounded-md bg-card px-1.5 py-0.5 text-[10px] font-bold text-gold-ink">{o.min_caps ? t("rewards.unlockAt", { n: o.min_caps }) : t("rewards.memberPerk")}</span>
                </div>
              ))}
              {party.venue && <Link to={`/venues/${party.venue.id}`} className="mt-3 inline-block text-sm font-bold text-gold-ink hover:underline">{t("party.seeRewards")}</Link>}
            </div>
          )}
        </TabsContent>

        {(isAdmin || isVenueOwner) && (
          <TabsContent value="host" className="space-y-3">
            {isAdmin && (party.venue_status === "declined" || party.venue_status === "none") && !cancelled && (
              <Button asChild variant="ink" className="w-full"><Link to={`/organiser/${party.group?.slug}?party=${party.id}`}>{t("party.pickAnotherVenue")}</Link></Button>
            )}
            {isAdmin && !cancelled && <div className="card p-4"><EditPartyButtons party={party} /></div>}
            <div className="card p-4">
              <FeatureHeader icon={<Users />} title={t("party.turnout")} sub={isVenueOwner ? t("party.guestListSub") : t("party.privacyNote")} />
              <div className="mt-4 grid grid-cols-3 divide-x rounded-xl bg-surface py-3 text-center rtl:divide-x-reverse">
                <div><p className="scoreboard text-2xl font-bold leading-none">{counts?.going ?? 0}</p><p className="mt-1 text-[11px] text-muted-foreground">{t("vdash.seatsTotal", { n: "" }).trim()}</p></div>
                <div><p className="scoreboard text-2xl font-bold leading-none">{counts?.waitlist ?? 0}</p><p className="mt-1 text-[11px] text-muted-foreground">{t("party.waitlistShort")}</p></div>
                <div><p className="scoreboard text-2xl font-bold leading-none">{counts?.checked_in ?? 0}</p><p className="mt-1 text-[11px] text-muted-foreground">{t("vdash.arrived")}</p></div>
              </div>
            </div>
            {isVenueOwner && <div className="card overflow-hidden"><GuestList partyId={party.id} kickoff={when} confirmed={party.venue_status === "confirmed"} /></div>}
            <div className="card p-5 text-center">
              <FeatureHeader icon={<Tv />} title={t("party.venueScreen")} sub={t("party.screenHowTo")} />
              <Button asChild variant="ink" className="mt-4 w-full"><Link to={`/party/${party.id}/screen`}><Tv />{t("party.openScreen")}</Link></Button>
            </div>
          </TabsContent>
        )}
      </Tabs>}
    </AppShell>
  );
}
