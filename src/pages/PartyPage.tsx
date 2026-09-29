import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Gift, MapPin, MessageCircle, Minus, Navigation, Plus, QrCode, Share2 } from "lucide-react";
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

  return (
    <AppShell>
      <BackButton />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {party.group && <Link to={`/g/${party.group.slug}`} className="text-sm font-semibold text-primary">{loc(party.group, "name", lang)}</Link>}
        <DemoChip show={party.is_demo} />
      </div>
      {party.title && f && party.title !== title && <h1 className="mb-3 text-2xl font-bold">{party.title}</h1>}
      {f ? <FixtureScoreboard fixture={f} /> : <h1 className="text-2xl font-bold">{title}</h1>}

      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          {/* RSVP */}
          {!done && (
            <div className="rounded-3xl border bg-card p-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="scoreboard text-3xl font-bold">{counts?.going ?? 0}{cap ? <span className="text-lg text-muted-foreground">/{cap}</span> : null}</p>
                  <p className="text-xs text-muted-foreground">{t("party.goingCount")}{counts?.waitlist ? ` · ${t("party.waitlistCount", { n: counts.waitlist })}` : ""}</p>
                </div>
                {live && <p className="text-sm font-semibold text-primary">{t("party.checkedInLive", { n: counts?.checked_in ?? 0 })}</p>}
              </div>
              {cap > 0 && <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, ((counts?.going ?? 0) / cap) * 100)}%` }} /></div>}
              {mine ? (
                <div className="mt-4 flex items-center justify-between rounded-2xl bg-primary/10 p-3">
                  <p className="text-sm font-semibold text-primary">{mine.status === "waitlist" ? t("party.onWaitlist") : t("party.youreGoing")}{mine.guests ? ` (+${mine.guests})` : ""}</p>
                  <Button variant="ghost" size="sm" className="rounded-full" onClick={cancel}>{t("party.cancel")}</Button>
                </div>
              ) : (
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex items-center rounded-full border">
                    <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setGuests(Math.max(0, guests - 1))} aria-label="-"><Minus className="h-4 w-4" /></Button>
                    <span className="w-16 text-center text-xs">{guests ? t("party.plusGuests", { n: guests }) : t("party.justMe")}</span>
                    <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setGuests(Math.min(5, guests + 1))} aria-label="+"><Plus className="h-4 w-4" /></Button>
                  </div>
                  <Button className="flex-1 rounded-full" onClick={doRsvp} disabled={busy}>{user ? t("party.rsvp") : t("party.signInToRsvp")}</Button>
                </div>
              )}
              {myCheckin && <p className="mt-3 text-center text-sm font-semibold text-accent">{t("party.youCheckedIn")}</p>}
              {user && !myCheckin && (live || mine) && (
                <Button asChild variant="outline" className="mt-3 w-full rounded-full"><Link to="/checkin"><QrCode className="me-1.5 h-4 w-4" />{t("party.checkInHere")}</Link></Button>
              )}
              {goingProfiles && goingProfiles.length > 0 && (
                <div className="mt-4 flex items-center gap-2">
                  <div className="flex -space-x-2 rtl:space-x-reverse">{goingProfiles.slice(0, 8).map((p) => <Initials key={p.user_id} name={p.full_name} />)}</div>
                  {goingProfiles.length > 8 && <span className="text-xs text-muted-foreground">+{goingProfiles.length - 8}</span>}
                </div>
              )}
            </div>
          )}

          {/* Prediction */}
          {f && !done && user && <PredictionInput fixture={f} />}

          {/* AI & match-day features */}
          {f && user && <PunditChat fixtureId={f.id} partyId={party.id} homeName={f.home_team_name} awayName={f.away_team_name} />}
          {f && user && (live || done || party.is_demo) && <HalftimeQuiz fixtureId={f.id} />}
          {user && (live || done || party.is_demo) && <MotmVote partyId={party.id} />}
          {done && user && <RecapCard party={party} />}
          {!user && (
            <EmptyState title={t("party.signInFeatures")} body={t("party.signInFeaturesBody")} cta={{ to: `/auth?next=/party/${party.id}`, label: t("nav.signIn") }} />
          )}
        </div>

        <aside className="space-y-4">
          {party.venue && (
            <div className="rounded-3xl border bg-card p-4">
              <Link to={`/venues/${party.venue.id}`} className="font-semibold hover:text-primary">{venueName}</Link>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{[party.venue.area, t(`city.${party.venue.city}` as never)].filter(Boolean).join(" · ")}</p>
              <div className="mt-3"><VenueFacts venue={party.venue} /></div>
              {party.venue.lat && party.venue.lng && (
                <Button asChild variant="outline" size="sm" className="mt-3 w-full rounded-full">
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${party.venue.lat},${party.venue.lng}`} target="_blank" rel="noreferrer"><Navigation className="me-1.5 h-4 w-4" />{t("party.directions")}</a>
                </Button>
              )}
            </div>
          )}
          {loc(party, "notes", lang) && <div className="rounded-3xl border bg-card p-4 text-sm"><p className="whitespace-pre-line">{loc(party, "notes", lang)}</p></div>}
          {(offers ?? []).length > 0 && (
            <div className="rounded-3xl border border-accent/30 bg-accent/5 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-accent"><Gift className="h-4 w-4" />{t("party.perks")}</p>
              {offers!.map((o) => (
                <div key={o.id} className="mt-2"><p className="text-sm font-medium">{loc(o, "title", lang)}</p><p className="text-xs text-muted-foreground">{loc(o, "details", lang)}</p></div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            <Button asChild variant="outline" className="rounded-full px-2"><a href={whatsappShare(`${shareText} ${url}`)} target="_blank" rel="noreferrer" aria-label="WhatsApp"><MessageCircle className="h-4 w-4" /></a></Button>
            <Button variant="outline" className="rounded-full px-2" aria-label={t("common.share")} onClick={async () => { const r = await shareOrCopy(shareText, url); if (r === "copied") toast.success(t("common.copied")); }}><Share2 className="h-4 w-4" /></Button>
            <Button variant="outline" className="rounded-full px-2" aria-label={t("party.calendar")} onClick={() => downloadIcs(title, when, 150, [venueName, party.venue?.area].filter(Boolean).join(", "), url)}><CalendarPlus className="h-4 w-4" /></Button>
          </div>
          {isAdmin && (
            <div className="rounded-3xl border bg-card p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("party.checkinCode")}</p>
              <p className="scoreboard mt-1 text-4xl font-bold tracking-[0.25em]" dir="ltr">{party.checkin_code}</p>
              <div className="mx-auto mt-3 w-fit rounded-2xl bg-white p-3"><QRCodeSVG value={`${window.location.origin}/checkin/${party.checkin_code}`} size={168} /></div>
              <p className="mt-2 text-xs text-muted-foreground">{t("party.showAtVenue")}</p>
              <Button asChild variant="outline" size="sm" className="mt-3 rounded-full"><Link to={`/party/${party.id}/screen`}>{t("party.venueScreen")}</Link></Button>
            </div>
          )}
        </aside>
      </div>
    </AppShell>
  );
}
