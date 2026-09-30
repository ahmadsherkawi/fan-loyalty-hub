import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, CheckCircle2, Gift, MapPin, MessageCircle, Minus, Navigation, Plus, QrCode, Share2, Stamp, Tv } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { AppShell, BackButton } from "@/components/layout/AppShell";
import { FixtureScoreboard } from "@/components/match/FixtureScoreboard";
import { VenueFacts } from "@/components/cards";
import { CardSkeletons, DemoChip, EmptyState, Initials } from "@/components/common/bits";
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
  downloadIcs, isFinished, isLive, loc, partyTime, shareOrCopy, useIsGroupAdmin, useParty, usePartyCounts, useProfilesByIds, whatsappShare,
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

  const { data: rsvps } = useQuery({
    queryKey: ["rsvps", id],
    enabled: !!id && !!user,
    queryFn: async () => (await supabase.from("rsvps").select("*").eq("watch_party_id", id!).neq("status", "cancelled").order("created_at")).data ?? [],
  });
  const { data: myCheckin } = useQuery({
    queryKey: ["my-checkin", id, user?.id],
    enabled: !!id && !!user,
    queryFn: async () => (await supabase.from("checkins").select("id").eq("watch_party_id", id!).eq("user_id", user!.id).maybeSingle()).data,
  });
  const { data: offers } = useQuery({
    queryKey: ["offers", party?.venue_id],
    enabled: !!party?.venue_id,
    queryFn: async () => (await supabase.from("venue_offers").select("*").eq("venue_id", party!.venue_id!).eq("active", true)).data ?? [],
  });
  const goingIds = (rsvps ?? []).filter((r) => r.status === "going").map((r) => r.user_id);
  const { data: goingProfiles } = useProfilesByIds(goingIds);
  const mine = rsvps?.find((r) => r.user_id === user?.id);

  if (isLoading) return <AppShell><CardSkeletons n={3} /></AppShell>;
  if (error || !party) return <AppShell><BackButton /><EmptyState title={t("party.notFound")} cta={{ to: "/", label: t("notFound.home") }} /></AppShell>;

  const f = party.fixture;
  const live = isLive(f?.status) || party.status === "live";
  const done = isFinished(f?.status) || party.status === "finished";
  const when = partyTime(party);
  const title = f ? `${f.home_team_name} v ${f.away_team_name}` : party.title ?? t("page.party");
  const venueName = loc(party.venue, "name", lang);
  const url = `${window.location.origin}/party/${party.id}`;
  const shareText = t("party.shareText", { match: title, venue: venueName || "", time: formatDateTime(when) });
  const cap = party.capacity ?? 0;

  async function doRsvp() {
    if (!user) { navigate(`/auth?next=/party/${party!.id}`); return; }
    setBusy(true);
    const { data, error } = await supabase.rpc("rsvp", { p_party: party!.id, p_guests: guests });
    setBusy(false);
    if (error) return toast.error(t("common.error"));
    toast.success((data as { status?: string })?.status === "waitlist" ? t("party.waitlisted") : t("party.youreGoing"));
    qc.invalidateQueries({ queryKey: ["rsvps", id] }); qc.invalidateQueries({ queryKey: ["party-counts", id] });
  }
  async function cancel() {
    await supabase.rpc("cancel_rsvp", { p_party: party!.id });
    qc.invalidateQueries({ queryKey: ["rsvps", id] }); qc.invalidateQueries({ queryKey: ["party-counts", id] });
  }

  const pct = cap ? Math.min(100, ((counts?.going ?? 0) / cap) * 100) : 0;
  const share = async () => { const r = await shareOrCopy(shareText, url); if (r === "copied") toast.success(t("common.copied")); };

  return (
    <AppShell>
      <BackButton />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {party.group && <Link to={`/g/${party.group.slug}`} className="text-sm font-bold text-brand hover:underline">{loc(party.group, "name", lang)}</Link>}
        <DemoChip show={party.is_demo} />
      </div>
      {party.title && f && party.title !== title && <h1 className="mb-4 text-[26px] font-extrabold leading-tight">{party.title}</h1>}
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
      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
        <Button asChild variant="outline" size="sm"><a href={whatsappShare(`${shareText} ${url}`)} target="_blank" rel="noreferrer"><MessageCircle />WhatsApp</a></Button>
        <Button variant="outline" size="sm" onClick={share}><Share2 />{t("common.share")}</Button>
        <Button variant="outline" size="sm" onClick={() => downloadIcs(title, when, 150, [venueName, party.venue?.area].filter(Boolean).join(", "), url)}><CalendarPlus />{t("party.calendar")}</Button>
      </div>

      {/* RSVP — the one thing every visitor needs */}
      {!done && (
        <div className="card mt-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-baseline gap-1.5">
              <span dir="ltr" className="flex items-baseline gap-1.5"><span className="scoreboard text-4xl font-bold leading-none">{counts?.going ?? 0}</span>
              {cap ? <span className="scoreboard text-xl text-muted-foreground">/ {cap}</span> : null}</span>
              <span className="ms-1 text-sm font-medium text-muted-foreground">{t("party.goingCount")}</span>
            </div>
            {goingProfiles && goingProfiles.length > 0 && (
              <div className="flex -space-x-2 rtl:space-x-reverse">{goingProfiles.slice(0, 4).map((p) => <Initials key={p.user_id} name={p.full_name} />)}</div>
            )}
          </div>
          {cap > 0 && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>}
          {counts?.waitlist ? <p className="mt-2 text-xs text-muted-foreground">{t("party.waitlistCount", { n: counts.waitlist })}</p> : null}
          {live && <p className="mt-2 text-sm font-semibold text-brand">{t("party.checkedInLive", { n: counts?.checked_in ?? 0 })}</p>}

          {mine ? (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-brand-soft px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-bold text-brand"><CheckCircle2 className="h-5 w-5" />{mine.status === "waitlist" ? t("party.onWaitlist") : t("party.youreGoing")}{mine.guests ? ` (+${mine.guests})` : ""}</p>
              <button className="text-sm font-semibold text-muted-foreground hover:text-foreground" onClick={cancel}>{t("party.cancel")}</button>
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-2">
              <div className="flex h-11 items-center rounded-full border bg-card">
                <button className="flex h-11 w-10 items-center justify-center text-muted-foreground hover:text-foreground" onClick={() => setGuests(Math.max(0, guests - 1))} aria-label="-"><Minus className="h-4 w-4" /></button>
                <span className="w-14 text-center text-xs font-semibold">{guests ? t("party.plusGuests", { n: guests }) : t("party.justMe")}</span>
                <button className="flex h-11 w-10 items-center justify-center text-muted-foreground hover:text-foreground" onClick={() => setGuests(Math.min(5, guests + 1))} aria-label="+"><Plus className="h-4 w-4" /></button>
              </div>
              <Button className="flex-1" onClick={doRsvp} disabled={busy}>{user ? t("party.rsvp") : t("party.signInToRsvp")}</Button>
            </div>
          )}
          {myCheckin && <p className="mt-3 flex items-center justify-center gap-1.5 text-sm font-bold text-gold-ink"><Stamp className="h-4 w-4" />{t("party.youCheckedIn")}</p>}
          {user && !myCheckin && (live || mine) && (
            <Button asChild variant="ink" className="mt-3 w-full"><Link to="/checkin"><QrCode />{t("party.checkInHere")}</Link></Button>
          )}
        </div>
      )}

      <Tabs defaultValue="match" className="mt-6">
        <TabsList className="w-full">
          <TabsTrigger value="match">{t("party.tabMatch")}</TabsTrigger>
          <TabsTrigger value="venue">{t("party.tabVenue")}</TabsTrigger>
          {isAdmin && <TabsTrigger value="host">{t("party.tabHost")}</TabsTrigger>}
        </TabsList>

        <TabsContent value="match" className="space-y-3">
          {!user ? (
            <EmptyState title={t("party.signInFeatures")} body={t("party.signInFeaturesBody")} cta={{ to: `/auth?next=/party/${party.id}`, label: t("nav.signIn") }} />
          ) : (
            <>
              {f && !done && <PredictionInput fixture={f} />}
              {f && <PunditChat fixtureId={f.id} partyId={party.id} homeName={f.home_team_name} awayName={f.away_team_name} />}
              {f && (live || done || party.is_demo) && <HalftimeQuiz fixtureId={f.id} />}
              {(live || done || party.is_demo) && <MotmVote partyId={party.id} />}
              {done && <RecapCard party={party} />}
            </>
          )}
        </TabsContent>

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
            <div className="card p-4"><p className="eyebrow mb-1">{t("party.notes")}</p><p className="whitespace-pre-line text-sm">{loc(party, "notes", lang)}</p></div>
          )}
          {(offers ?? []).length > 0 && (
            <div className="rounded-2xl border border-gold/50 bg-gold-soft p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-gold-ink"><Gift className="h-4 w-4" />{t("party.perks")}</p>
              {offers!.map((o) => (
                <div key={o.id} className="mt-2"><p className="text-sm font-semibold">{loc(o, "title", lang)}</p><p className="text-xs text-muted-foreground">{loc(o, "details", lang)}</p></div>
              ))}
            </div>
          )}
        </TabsContent>

        {isAdmin && (
          <TabsContent value="host">
            <div className="card p-5 text-center">
              <p className="eyebrow">{t("party.checkinCode")}</p>
              <p className="scoreboard mt-1 text-5xl font-bold tracking-[0.2em]" dir="ltr">{party.checkin_code}</p>
              <div className="mx-auto mt-4 w-fit rounded-2xl border bg-white p-3"><QRCodeSVG value={`${window.location.origin}/checkin/${party.checkin_code}`} size={176} fgColor="#0B1220" /></div>
              <p className="mt-3 text-sm text-muted-foreground">{t("party.showAtVenue")}</p>
              <Button asChild variant="ink" className="mt-4"><Link to={`/party/${party.id}/screen`}><Tv />{t("party.venueScreen")}</Link></Button>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </AppShell>
  );
}
