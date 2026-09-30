import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Check, CheckCircle2, ChevronDown, Clock, Gift, MapPin, Monitor, Plus, ScanLine, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell, BackButton, PageTitle } from "@/components/layout/AppShell";
import { CardSkeletons, EmptyState, FeatureHeader } from "@/components/common/bits";
import { GuestList } from "@/components/GuestList";
import { TableRequests } from "@/components/venue/TableRequests";
import { Inbox } from "@/components/venue/Inbox";
import { ScreeningsEditor } from "@/components/venue/ScreeningsEditor";
import { MenuEditor } from "@/components/venue/MenuEditor";
import { ProDialog, VenueSettings } from "@/components/venue/VenueSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { isFinished, loc, useVenueBookings, type Booking, type Venue } from "@/lib/data";
import { cn } from "@/lib/utils";
import { compLabel } from "@/lib/competitions";

type VStats = {
  total_checkins: number; unique_fans: number; groups_hosted: number; pending_requests: number; upcoming_seats: number; rewards_redeemed: number;
  top_fans: { full_name: string | null; visits: number }[];
  per_match: { id: string; home_team_name: string; away_team_name: string; kickoff: string; checkins: number; new_faces: number }[];
};

export default function VenueDashboard() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "tables" ? "bookings" : params.get("tab") ?? "bookings";
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const { data: venue, isLoading } = useQuery({
    queryKey: ["venue", id],
    enabled: !!id,
    queryFn: async () => (await supabase.from("venues").select("*").eq("id", id!).single()).data as Venue | null,
  });
  const allowed = !!venue && !!user && venue.owner_user_id === user.id;
  const { data: stats } = useQuery({
    queryKey: ["venue-stats", id],
    enabled: allowed,
    refetchInterval: 30_000,
    queryFn: async () => (await supabase.rpc("venue_stats", { p_venue: id! })).data as unknown as VStats,
  });
  const { data: bookings, isLoading: bLoading } = useVenueBookings(id, allowed);
  const { data: inbox } = useQuery({
    queryKey: ["venue-inbox", id],
    enabled: allowed,
    refetchInterval: 20_000,
    queryFn: async () => ((await supabase.rpc("venue_inbox", { p_venue: id! })).data ?? []) as unknown as { venue_unread: number }[],
  });
  const { data: proReq, refetch: refetchPro } = useQuery({
    queryKey: ["pro-req", id],
    enabled: allowed,
    queryFn: async () => (await supabase.from("venue_pro_requests").select("id").eq("venue_id", id!).eq("status", "new").limit(1)).data ?? [],
  });
  const unreadMsgs = (inbox ?? []).reduce((s, r) => s + (r.venue_unread ?? 0), 0);

  if (isLoading) return <AppShell><CardSkeletons /></AppShell>;
  if (!allowed) return <AppShell><BackButton /><EmptyState title={t("vdash.notAllowed")} /></AppShell>;

  const pending = (bookings ?? []).filter((b) => b.venue_status === "pending");
  const upcoming = (bookings ?? []).filter((b) => b.venue_status === "confirmed" && !isFinished(b.fixture_status) && b.status !== "finished");
  const past = (bookings ?? []).filter((b) => b.venue_status === "confirmed" && (isFinished(b.fixture_status) || b.status === "finished"));
  const focus = params.get("party");

  return (
    <AppShell>
      <PageTitle eyebrow={loc(venue, "name", lang)} title={t("page.venueDashboard")} />
      <div className="-mt-2 mb-5 flex flex-wrap gap-2">
        <VenueSettings venue={venue!} />
        <Button asChild variant="outline" size="sm"><Link to={`/venues/${venue!.id}?preview=1`}>{t("vdash.viewPublic")}</Link></Button>
        <ProDialog venue={venue!} requested={(proReq ?? []).length > 0} onRequested={() => refetchPro()} />
      </div>
      {(venue!.lat == null || venue!.lng == null) && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-gold/60 bg-gold-soft px-4 py-3">
          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-gold-ink" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-bold">{t("vdash.setLocationTitle")}</p>
            <p className="text-muted-foreground">{t("vdash.setLocationBody")}</p>
            <div className="mt-2"><VenueSettings venue={venue!} /></div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { v: stats?.pending_requests ?? pending.length, l: t("vdash.pendingRequests"), hot: (stats?.pending_requests ?? pending.length) > 0 },
          { v: stats?.upcoming_seats ?? 0, l: t("vdash.seatsBooked") },
          { v: stats?.total_checkins ?? 0, l: t("vdash.checkins") },
          { v: stats?.rewards_redeemed ?? 0, l: t("vdash.rewardsRedeemed") },
        ].map((x) => (
          <div key={x.l} className={cn("rounded-2xl p-4", x.hot ? "bg-foreground text-background" : "card")}>
            <p className="scoreboard text-3xl font-bold leading-none">{x.v}</p>
            <p className={cn("mt-1 text-xs", x.hot ? "text-background/70" : "text-muted-foreground")}>{x.l}</p>
          </div>
        ))}
      </div>

      <Tabs value={tab} onValueChange={(v) => { const n = new URLSearchParams(params); n.set("tab", v); n.delete("thread"); setParams(n, { replace: true }); }} className="mt-6">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="bookings" className="flex-none">{t("vdash.tabBookings")}{pending.length ? <span className="ms-1.5 rounded-full bg-live px-1.5 text-[11px] font-bold text-white">{pending.length}</span> : null}</TabsTrigger>
          <TabsTrigger value="inbox" className="flex-none">{t("vdash.tabInbox")}{unreadMsgs ? <span className="ms-1.5 rounded-full bg-live px-1.5 text-[11px] font-bold text-white">{unreadMsgs}</span> : null}</TabsTrigger>
          <TabsTrigger value="showing" className="flex-none">{t("vdash.tabShowing")}</TabsTrigger>
          <TabsTrigger value="menu" className="flex-none">{t("vdash.tabMenu")}</TabsTrigger>
          <TabsTrigger value="rewards" className="flex-none">{t("vdash.tabRewards")}</TabsTrigger>
          <TabsTrigger value="insights" className="flex-none">{t("vdash.tabInsights")}</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="space-y-8">
          {bLoading ? <CardSkeletons /> : (
            <>
              <section>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><Clock className="h-5 w-5" />{t("vdash.needsAnswer")}</h2>
                {pending.length ? <div className="space-y-3">{pending.map((b) => <RequestCard key={`${b.id}-${b.capacity}`} b={b} venueId={id!} located={venue!.lat != null && venue!.lng != null} />)}</div>
                  : <p className="rounded-2xl bg-surface px-4 py-5 text-center text-sm text-muted-foreground">{t("vdash.noRequests")}</p>}
              </section>
              <section>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><CheckCircle2 className="h-5 w-5 text-brand" />{t("vdash.upcomingNights")}</h2>
                {upcoming.length ? <div className="space-y-3">{upcoming.map((b) => <NightCard key={b.id} b={b} defaultOpen={focus === b.id} />)}</div>
                  : <p className="rounded-2xl bg-surface px-4 py-5 text-center text-sm text-muted-foreground">{t("vdash.noUpcoming")}</p>}
              </section>
              <section>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><Users className="h-5 w-5" />{t("tables.title")}</h2>
                <TableRequests venueId={id!} />
              </section>
              {past.length > 0 && (
                <section>
                  <h2 className="mb-3 eyebrow">{t("vdash.recentNights")}</h2>
                  <div className="space-y-3">{past.map((b) => <NightCard key={b.id} b={b} past />)}</div>
                </section>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="inbox"><Inbox venueId={id!} venueName={loc(venue, "name", lang)} initialThread={params.get("thread")} /></TabsContent>
        <TabsContent value="showing"><ScreeningsEditor venueId={id!} /></TabsContent>
        <TabsContent value="menu"><MenuEditor venueId={id!} /></TabsContent>
        <TabsContent value="rewards"><RewardsPanel venueId={id!} /></TabsContent>
        <TabsContent value="insights"><Insights stats={stats} /></TabsContent>
      </Tabs>
    </AppShell>
  );
}

function useMatchName() {
  const { t } = useI18n();
  return (b: { home_team_name: string | null; away_team_name: string | null; title?: string | null }) =>
    b.home_team_name ? `${b.home_team_name} ${t("common.vs")} ${b.away_team_name}` : b.title ?? "";
}

function BookingHead({ b }: { b: Booking }) {
  const { t, lang, formatDateTime } = useI18n();
  const matchName = useMatchName();
  return (
    <div className="flex items-start gap-3">
      {b.kickoff && (
        <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-foreground py-2 text-background">
          <span className="text-[10px] font-semibold uppercase opacity-80">{formatDateTime(b.kickoff, { weekday: "short" })}</span>
          <span className="scoreboard text-2xl font-bold leading-none">{formatDateTime(b.kickoff, { day: "numeric" })}</span>
          <span className="text-[10px] font-semibold uppercase opacity-80">{formatDateTime(b.kickoff, { month: "short" })}</span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-bold leading-tight">{matchName(b)}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{compLabel(t, b.competition_code, b.competition)}{b.kickoff ? ` · ${formatDateTime(b.kickoff, { hour: "2-digit", minute: "2-digit", hour12: false })}` : ""}</p>
        <p className="mt-1 text-sm font-semibold text-brand">{(lang === "ar" && b.group_name_ar) || b.group_name}</p>
      </div>
    </div>
  );
}

function RequestCard({ b, venueId, located }: { b: Booking; venueId: string; located: boolean }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [area, setArea] = useState("");
  const [note, setNote] = useState("");
  const [seats, setSeats] = useState(String(b.capacity ?? ""));
  const [busy, setBusy] = useState<string | null>(null);
  async function answer(decision: "confirmed" | "declined") {
    if (decision === "confirmed" && seats && Number(seats) < 1) return toast.error(t("vdash.seatsMin"));
    setBusy(decision);
    const { error } = await supabase.rpc("respond_booking", { p_party: b.id, p_decision: decision, p_note: note, p_area: area, p_capacity: seats ? Math.round(Number(seats)) : null });
    setBusy(null);
    if (error) {
      const m = error.message;
      qc.invalidateQueries({ queryKey: ["venue-bookings", venueId] });
      return toast.error(m.includes("location") ? t("vdash.setLocationTitle") : m.includes("started") ? t("vdash.tooLate") : m.includes("cancelled") ? t("vdash.partyCancelled") : m.includes("capacity") ? t("vdash.seatsMin") : t("common.error"));
    }
    toast.success(decision === "confirmed" ? t("vdash.confirmedToast", { group: b.group_name }) : t("vdash.declinedToast"));
    qc.invalidateQueries({ queryKey: ["venue-bookings", venueId] });
    qc.invalidateQueries({ queryKey: ["venue-stats", venueId] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }
  return (
    <div className="card overflow-hidden border-foreground/20">
      <div className="flex items-center gap-2 bg-surface px-4 py-2 text-xs font-semibold text-muted-foreground"><Clock className="h-3.5 w-3.5" />{t("vdash.requestFrom", { name: b.organiser ?? "—" })}</div>
      <div className="p-4">
        <BookingHead b={b} />
        <div className="mt-4 grid grid-cols-3 divide-x rounded-xl bg-surface py-2.5 text-center rtl:divide-x-reverse">
          <div><p className="scoreboard text-xl font-bold leading-none">{b.capacity ?? "—"}</p><p className="mt-1 text-[11px] text-muted-foreground">{t("vdash.seatsAsked")}</p></div>
          <div><p className="scoreboard text-xl font-bold leading-none">{b.seats}</p><p className="mt-1 text-[11px] text-muted-foreground">{t("vdash.alreadyReserved")}</p></div>
          <div><p className="scoreboard text-xl font-bold leading-none">{b.group_members}</p><p className="mt-1 text-[11px] text-muted-foreground">{t("vdash.groupSize")}</p></div>
        </div>
        <div className="mt-4 grid gap-2">
          <label className="flex items-center gap-3 rounded-xl border px-3">
            <span className="flex-1 text-sm font-semibold">{t("vdash.seatsYouGive")}</span>
            <Input type="number" min={1} value={seats} onChange={(e) => setSeats(e.target.value)} className="h-10 w-24 border-0 text-end scoreboard text-lg font-bold focus-visible:ring-0" />
          </label>
          {b.seats > Number(seats || 0) && seats && <p className="text-xs font-medium text-destructive">{t("vdash.overbookWarn", { n: b.seats - Number(seats) })}</p>}
          <Input value={area} onChange={(e) => setArea(e.target.value)} placeholder={t("vdash.areaPlaceholder")} />
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("vdash.notePlaceholder")} />
        </div>
        <div className="mt-3 flex gap-2">
          <Button className="flex-1" onClick={() => answer("confirmed")} disabled={!!busy || !located} title={!located ? t("vdash.setLocationTitle") : undefined}><Check />{busy === "confirmed" ? t("common.loading") : t("vdash.confirm")}</Button>
          <Button variant="outline" onClick={() => answer("declined")} disabled={!!busy}><X />{t("vdash.decline")}</Button>
        </div>
      </div>
    </div>
  );
}

function NightCard({ b, past, defaultOpen }: { b: Booking; past?: boolean; defaultOpen?: boolean }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(!!defaultOpen);
  const pct = b.capacity ? Math.min(100, (b.seats / b.capacity) * 100) : 0;
  return (
    <div className={cn("card overflow-hidden", defaultOpen && "ring-2 ring-primary")}>
      <div className="p-4">
        <BookingHead b={b} />
        {b.reserved_area && <p className="mt-3 inline-flex rounded-lg bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand">{b.reserved_area}</p>}
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="flex items-baseline gap-1" dir="ltr"><span className="scoreboard text-3xl font-bold leading-none">{past ? b.checked_in : b.seats}</span>{!past && b.capacity ? <span className="scoreboard text-lg text-muted-foreground">/ {b.capacity}</span> : null}</p>
            <p className="text-xs text-muted-foreground">{past ? t("vdash.fansCame") : t("vdash.seatsReservedBy", { n: b.reservations })}{!past && b.waitlist ? ` · ${t("party.waitlistCount", { n: b.waitlist })}` : ""}</p>
          </div>
          {!past && <p className="text-end text-xs text-muted-foreground"><span className="scoreboard block text-xl font-bold text-foreground">{b.checked_in}</span>{t("vdash.arrived")}</p>}
        </div>
        {!past && b.capacity ? <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} /></div> : null}
        {!past && <SeatsEditor b={b} />}
        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => setOpen(!open)}><Users />{t("vdash.guestList")}<ChevronDown className={cn("transition-transform", open && "rotate-180")} /></Button>
          {!past && <Button asChild variant="ink" size="sm"><Link to={`/party/${b.id}/screen`}><Monitor />{t("vdash.screen")}</Link></Button>}
        </div>
      </div>
      {open && <GuestList partyId={b.id} kickoff={b.kickoff} confirmed={b.venue_status === "confirmed"} />}
    </div>
  );
}

function RewardsPanel({ venueId }: { venueId: string }) {
  const { t, lang, formatDateTime } = useI18n();
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [result, setResult] = useState<{ fan: string | null; title: string; title_ar: string | null; caps: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", details: "", min_caps: "3", repeatable: false });
  const [adding, setAdding] = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const { data: offers } = useQuery({
    queryKey: ["offers-all", venueId],
    queryFn: async () => (await supabase.from("venue_offers").select("*").eq("venue_id", venueId).order("min_caps")).data ?? [],
  });
  const { data: recent } = useQuery({
    queryKey: ["redemptions", venueId],
    queryFn: async () => (await supabase.from("reward_redemptions").select("id, status, redeemed_at, created_at, offer:venue_offers(title, title_ar)").eq("venue_id", venueId).eq("status", "redeemed").order("redeemed_at", { ascending: false }).limit(10)).data ?? [],
  });

  async function redeem() {
    setErr(null); setResult(null);
    const { data, error } = await supabase.rpc("redeem_reward", { p_venue: venueId, p_code: code });
    if (error) {
      const m = error.message;
      setErr(m.includes("already") ? t("vdash.codeUsed") : m.includes("expired") ? t("vdash.codeExpired") : t("vdash.codeInvalid"));
      return;
    }
    setResult(data as never); setCode("");
    qc.invalidateQueries({ queryKey: ["redemptions", venueId] });
    qc.invalidateQueries({ queryKey: ["venue-stats", venueId] });
  }
  async function addOffer() {
    if (!form.title.trim()) return;
    const caps = Math.min(500, Math.max(0, Math.round(Number(form.min_caps) || 0)));
    setAdding(true);
    const { error } = await supabase.from("venue_offers").insert({ venue_id: venueId, title: form.title.trim(), details: form.details.trim() || null, min_caps: caps, repeatable: form.repeatable });
    setAdding(false);
    if (error) return toast.error(t("common.error"));
    setForm({ title: "", details: "", min_caps: "3", repeatable: false });
    toast.success(t("vdash.rewardAdded"));
    refreshOffers();
  }
  const refreshOffers = () => { qc.invalidateQueries({ queryKey: ["offers-all", venueId] }); qc.invalidateQueries({ queryKey: ["offers", venueId] }); qc.invalidateQueries({ queryKey: ["my-rewards"] }); };
  async function toggle(oid: string, active: boolean) {
    const { error } = await supabase.from("venue_offers").update({ active }).eq("id", oid);
    if (error) toast.error(t("common.error"));
    refreshOffers();
  }
  async function remove(oid: string) {
    const { error } = await supabase.from("venue_offers").delete().eq("id", oid);
    if (error && error.message.includes("history")) {
      const { error: offErr } = await supabase.from("venue_offers").update({ active: false }).eq("id", oid);
      if (offErr) toast.error(t("common.error")); else toast.success(t("vdash.rewardSwitchedOff"));
    }
    else if (error) toast.error(t("common.error"));
    setConfirmDel(null);
    refreshOffers();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-stadium p-5 text-white shadow-lift">
        <p className="flex items-center gap-2 font-bold"><ScanLine className="h-5 w-5 text-primary" />{t("vdash.redeemTitle")}</p>
        <p className="mt-1 text-sm text-white/60">{t("vdash.redeemSub")}</p>
        <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); redeem(); }}>
          <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))} placeholder="A1B2C3" dir="ltr"
            className="scoreboard h-12 flex-1 border-white/20 bg-white/10 text-center text-2xl font-bold tracking-[0.3em] text-white placeholder:text-white/30" />
          <Button id="redeem-submit" type="submit" className="h-12" disabled={code.length < 6}>{t("vdash.redeem")}</Button>
        </form>
        <ScanButton onCode={(c) => { setCode(c); setTimeout(() => document.getElementById("redeem-submit")?.click(), 50); }} />
        {err && <p className="mt-3 rounded-lg bg-live/20 px-3 py-2 text-sm font-semibold">{err}</p>}
        {result && (
          <div className="mt-3 flex items-center gap-3 rounded-xl bg-primary px-4 py-3 text-primary-foreground">
            <CheckCircle2 className="h-6 w-6 shrink-0" />
            <div><p className="font-bold">{(lang === "ar" && result.title_ar) || result.title}</p><p className="text-sm">{t("vdash.redeemedFor", { name: result.fan ?? "—", caps: result.caps })}</p></div>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold">{t("vdash.yourRewards")}</h2>
        {(offers ?? []).length === 0 && <p className="rounded-2xl bg-surface px-4 py-5 text-center text-sm text-muted-foreground">{t("vdash.noRewards")}</p>}
        <div className={cn("card divide-y", (offers ?? []).length === 0 && "hidden")}>
          {(offers ?? []).map((o) => (
            <div key={o.id} className="flex items-center gap-3 px-4 py-3">
              <span className={cn("scoreboard flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl text-lg font-bold leading-none", o.min_caps ? "bg-gold text-accent-foreground" : "bg-muted text-muted-foreground")}>
                {o.min_caps || <Gift className="h-5 w-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{loc(o, "title", lang)}</p>
                <p className="truncate text-xs text-muted-foreground">{o.min_caps ? t("rewards.unlockAt", { n: o.min_caps }) : t("rewards.memberPerk")}{o.details ? ` · ${loc(o, "details", lang)}` : ""}</p>
              </div>
              <Switch checked={o.active} onCheckedChange={(v) => toggle(o.id, v)} aria-label={t("vdash.active")} />
              <Button variant="ghost" size="iconSm" onClick={() => setConfirmDel(o.id)} aria-label={t("common.delete")}><Trash2 /></Button>
            </div>
          ))}
        </div>
        <div className="card mt-3 grid gap-3 p-4">
          <p className="eyebrow">{t("vdash.newReward")}</p>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t("vdash.offerTitle")} />
          <Input value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} placeholder={t("vdash.offerDetails")} />
          <div className="grid grid-cols-2 items-end gap-3">
            <div className="grid gap-1.5"><Label>{t("vdash.capsNeeded")}</Label><Input type="number" min={0} value={form.min_caps} onChange={(e) => setForm({ ...form, min_caps: e.target.value })} /></div>
            <label className="flex h-11 items-center justify-between rounded-xl border px-3 text-sm">{t("vdash.repeatable")}<Switch checked={form.repeatable} onCheckedChange={(v) => setForm({ ...form, repeatable: v })} /></label>
          </div>
          <p className="text-xs text-muted-foreground">{t("vdash.capsHint")}</p>
          <Button onClick={addOffer} disabled={!form.title.trim() || adding}><Plus />{t("vdash.add")}</Button>
        </div>
      </div>
      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("vdash.deleteRewardQ")}</AlertDialogTitle>
            <AlertDialogDescription>{t("vdash.deleteRewardBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDel && remove(confirmDel)}>{t("common.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {(recent ?? []).length > 0 && (
        <div>
          <h2 className="mb-3 eyebrow">{t("vdash.recentRedemptions")}</h2>
          <div className="card divide-y">
            {recent!.map((r) => {
              const o = r.offer as unknown as { title: string; title_ar: string | null } | null;
              return <div key={r.id} className="flex justify-between px-4 py-3 text-sm"><span className="font-medium">{(lang === "ar" && o?.title_ar) || o?.title}</span><span className="text-muted-foreground">{r.redeemed_at ? formatDateTime(r.redeemed_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}</span></div>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Insights({ stats }: { stats?: VStats }) {
  const { t, formatDateTime } = useI18n();
  const matchName = useMatchName();
  const chart = [...(stats?.per_match ?? [])].reverse().slice(-10).map((m) => ({
    name: `${m.home_team_name.slice(0, 3)}–${m.away_team_name.slice(0, 3)}`,
    [t("vdash.returning")]: m.checkins - m.new_faces, [t("vdash.newFaces")]: m.new_faces,
  }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4"><p className="scoreboard text-3xl font-bold leading-none">{stats?.unique_fans ?? 0}</p><p className="mt-1 text-xs text-muted-foreground">{t("vdash.fans")}</p></div>
        <div className="card p-4"><p className="scoreboard text-3xl font-bold leading-none">{stats?.groups_hosted ?? 0}</p><p className="mt-1 text-xs text-muted-foreground">{t("vdash.groups")}</p></div>
      </div>
      <div className="card p-4">
        <FeatureHeader icon={<Users />} title={t("vdash.perMatch")} />
        {chart.length ? (
          <div className="mt-4 h-56" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} width={28} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                <Bar dataKey={t("vdash.returning")} stackId="a" fill="#0B1220" />
                <Bar dataKey={t("vdash.newFaces")} stackId="a" fill="#00C566" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <p className="mt-3 text-sm text-muted-foreground">{t("vdash.noData")}</p>}
        <div className="mt-3 space-y-1">
          {(stats?.per_match ?? []).slice(0, 6).map((m) => (
            <div key={m.id} className="flex justify-between text-sm"><span>{matchName(m)} · <span className="text-muted-foreground">{formatDateTime(m.kickoff, { day: "numeric", month: "short" })}</span></span><span className="scoreboard font-bold">{m.checkins}</span></div>
          ))}
        </div>
      </div>
      {(stats?.top_fans ?? []).length > 0 && (
        <div className="card overflow-hidden">
          <p className="border-b bg-surface px-4 py-2.5 eyebrow">{t("vdash.topFans")}</p>
          {stats!.top_fans.map((f, i) => (
            <div key={i} className="flex items-center gap-3 border-b px-4 py-2.5 last:border-0">
              <span className={cn("scoreboard flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold", i === 0 ? "bg-gold" : "text-muted-foreground")}>{i + 1}</span>
              <span className="flex-1 truncate text-sm font-medium">{f.full_name ?? "—"}</span>
              <span className="scoreboard text-lg font-bold">{f.visits}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Opens the camera and reads a fan's reward QR (jamhoor-reward:CODE). */
function ScanButton({ onCode }: { onCode: (code: string) => void }) {
  const { t } = useI18n();
  const [on, setOn] = useState(false);
  const cb = useRef(onCode);
  cb.current = onCode;
  useEffect(() => {
    if (!on) return;
    let scanner: { stop: () => Promise<void>; clear: () => void } | null = null;
    let stopped = false;
    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (stopped) return;
      const s = new Html5Qrcode("reward-reader");
      scanner = s as unknown as typeof scanner;
      s.start({ facingMode: "environment" }, { fps: 10, qrbox: 200 }, (text) => {
        const m = text.match(/([A-Z0-9]{6})$/i);
        if (m) { setOn(false); cb.current(m[1].toUpperCase()); }
      }, () => undefined).catch(() => { setOn(false); toast.error(t("checkin.noCamera")); });
    });
    return () => { stopped = true; scanner?.stop().then(() => scanner?.clear()).catch(() => undefined); };
  }, [on, t]);
  return on ? (
    <div className="mt-3"><div id="reward-reader" className="overflow-hidden rounded-2xl" /><Button variant="ghost" className="mt-2 w-full text-white hover:bg-white/10 hover:text-white" onClick={() => setOn(false)}>{t("checkin.stopScan")}</Button></div>
  ) : <Button variant="ghost" className="mt-2 w-full text-white/80 hover:bg-white/10 hover:text-white" onClick={() => setOn(true)}><ScanLine />{t("vdash.scanFanCode")}</Button>;
}

function SeatsEditor({ b }: { b: Booking }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState(String(b.capacity ?? ""));
  const [saving, setSaving] = useState(false);
  async function save() {
    if (!(Number(v) >= 1)) return toast.error(t("vdash.seatsMin"));
    setSaving(true);
    const { error } = await supabase.rpc("set_party_capacity", { p_party: b.id, p_capacity: Math.round(Number(v)) });
    setSaving(false);
    if (error) return toast.error(t("common.error"));
    toast.success(t("vdash.seatsSaved")); setEdit(false);
    qc.invalidateQueries({ queryKey: ["venue-bookings"] });
    qc.invalidateQueries({ queryKey: ["venue-stats"] });
    qc.invalidateQueries({ queryKey: ["guest-list", b.id] });
    qc.invalidateQueries({ queryKey: ["party-counts", b.id] });
  }
  if (!edit) return <button onClick={() => setEdit(true)} className="mt-2 text-xs font-semibold text-brand hover:underline">{t("vdash.changeSeats")}</button>;
  return (
    <div className="mt-2 flex items-center gap-2">
      <Input type="number" min={1} value={v} onChange={(e) => setV(e.target.value)} className="h-9 w-24" />
      <Button size="sm" onClick={save} disabled={!v || saving}>{t("profile.save")}</Button>
      <Button size="sm" variant="ghost" onClick={() => setEdit(false)}>{t("common.cancel")}</Button>
    </div>
  );
}
