import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Check, CheckCircle2, ChevronDown, Clock, Gift, Monitor, Plus, ScanLine, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell, BackButton, PageTitle } from "@/components/layout/AppShell";
import { CardSkeletons, EmptyState, FeatureHeader } from "@/components/common/bits";
import { GuestList } from "@/components/GuestList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { isFinished, loc, useVenueBookings, type Booking, type Venue } from "@/lib/data";
import { cn } from "@/lib/utils";

type VStats = {
  total_checkins: number; unique_fans: number; groups_hosted: number; pending_requests: number; upcoming_seats: number; rewards_redeemed: number;
  top_fans: { full_name: string | null; visits: number }[];
  per_match: { id: string; home_team_name: string; away_team_name: string; kickoff: string; checkins: number; new_faces: number }[];
};

export default function VenueDashboard() {
  const { id } = useParams();
  const [params] = useSearchParams();
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

  if (isLoading) return <AppShell><CardSkeletons /></AppShell>;
  if (!allowed) return <AppShell><BackButton /><EmptyState title={t("vdash.notAllowed")} /></AppShell>;

  const pending = (bookings ?? []).filter((b) => b.venue_status === "pending");
  const upcoming = (bookings ?? []).filter((b) => b.venue_status === "confirmed" && !isFinished(b.fixture_status) && b.status !== "finished");
  const past = (bookings ?? []).filter((b) => b.venue_status === "confirmed" && (isFinished(b.fixture_status) || b.status === "finished"));
  const declined = (bookings ?? []).filter((b) => b.venue_status === "declined");
  const focus = params.get("party");

  return (
    <AppShell>
      <BackButton />
      <PageTitle eyebrow={<Link to={`/venues/${venue!.id}`} className="text-brand">{loc(venue, "name", lang)}</Link>} title={t("page.venueDashboard")} />

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

      <Tabs defaultValue="bookings" className="mt-6">
        <TabsList className="w-full">
          <TabsTrigger value="bookings">{t("vdash.tabBookings")}{pending.length ? <span className="ms-1.5 rounded-full bg-live px-1.5 text-[11px] font-bold text-white">{pending.length}</span> : null}</TabsTrigger>
          <TabsTrigger value="rewards">{t("vdash.tabRewards")}</TabsTrigger>
          <TabsTrigger value="insights">{t("vdash.tabInsights")}</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="space-y-8">
          {bLoading ? <CardSkeletons /> : (
            <>
              <section>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><Clock className="h-5 w-5" />{t("vdash.needsAnswer")}</h2>
                {pending.length ? <div className="space-y-3">{pending.map((b) => <RequestCard key={b.id} b={b} venueId={id!} />)}</div>
                  : <p className="rounded-2xl bg-surface px-4 py-5 text-center text-sm text-muted-foreground">{t("vdash.noRequests")}</p>}
              </section>
              <section>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><CheckCircle2 className="h-5 w-5 text-brand" />{t("vdash.upcomingNights")}</h2>
                {upcoming.length ? <div className="space-y-3">{upcoming.map((b) => <NightCard key={b.id} b={b} defaultOpen={focus === b.id} />)}</div>
                  : <p className="rounded-2xl bg-surface px-4 py-5 text-center text-sm text-muted-foreground">{t("vdash.noUpcoming")}</p>}
              </section>
              {past.length > 0 && (
                <section>
                  <h2 className="mb-3 eyebrow">{t("vdash.recentNights")}</h2>
                  <div className="space-y-3">{past.map((b) => <NightCard key={b.id} b={b} past />)}</div>
                </section>
              )}
              {declined.length > 0 && (
                <section>
                  <h2 className="mb-3 eyebrow">{t("vdash.declined")}</h2>
                  <div className="card divide-y">{declined.map((b) => <div key={b.id} className="flex justify-between px-4 py-3 text-sm"><span>{matchName(b)} · {b.group_name}</span><span className="text-muted-foreground">{t("vdash.declinedShort")}</span></div>)}</div>
                </section>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="rewards"><RewardsPanel venueId={id!} /></TabsContent>
        <TabsContent value="insights"><Insights stats={stats} />{!venue!.is_pro && <ProCard />}</TabsContent>
      </Tabs>
    </AppShell>
  );
}

const matchName = (b: Booking) => (b.home_team_name ? `${b.home_team_name} v ${b.away_team_name}` : b.title ?? "");

function BookingHead({ b }: { b: Booking }) {
  const { lang, formatDateTime } = useI18n();
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
        <p className="mt-0.5 text-sm text-muted-foreground">{b.competition}{b.kickoff ? ` · ${formatDateTime(b.kickoff, { hour: "2-digit", minute: "2-digit", hour12: false })}` : ""}</p>
        <Link to={`/g/${b.group_slug}`} className="mt-1 inline-block text-sm font-semibold text-brand">{(lang === "ar" && b.group_name_ar) || b.group_name}</Link>
      </div>
    </div>
  );
}

function RequestCard({ b, venueId }: { b: Booking; venueId: string }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [area, setArea] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  async function answer(decision: "confirmed" | "declined") {
    setBusy(decision);
    const { error } = await supabase.rpc("respond_booking", { p_party: b.id, p_decision: decision, p_note: note, p_area: area });
    setBusy(null);
    if (error) return toast.error(t("common.error"));
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
          <Input value={area} onChange={(e) => setArea(e.target.value)} placeholder={t("vdash.areaPlaceholder")} />
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("vdash.notePlaceholder")} />
        </div>
        <div className="mt-3 flex gap-2">
          <Button className="flex-1" onClick={() => answer("confirmed")} disabled={!!busy}><Check />{busy === "confirmed" ? t("common.loading") : t("vdash.confirm")}</Button>
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
        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => setOpen(!open)}><Users />{t("vdash.guestList")}<ChevronDown className={cn("transition-transform", open && "rotate-180")} /></Button>
          {!past && <Button asChild variant="ink" size="sm"><Link to={`/party/${b.id}/screen`}><Monitor />{t("vdash.screen")}</Link></Button>}
        </div>
      </div>
      {open && <GuestList partyId={b.id} />}
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
    const { error } = await supabase.from("venue_offers").insert({ venue_id: venueId, title: form.title.trim(), details: form.details.trim() || null, min_caps: Number(form.min_caps) || 0, repeatable: form.repeatable });
    if (error) return toast.error(t("common.error"));
    setForm({ title: "", details: "", min_caps: "3", repeatable: false });
    qc.invalidateQueries({ queryKey: ["offers-all", venueId] });
  }
  async function toggle(oid: string, active: boolean) { await supabase.from("venue_offers").update({ active }).eq("id", oid); qc.invalidateQueries({ queryKey: ["offers-all", venueId] }); }
  async function remove(oid: string) { await supabase.from("venue_offers").delete().eq("id", oid); qc.invalidateQueries({ queryKey: ["offers-all", venueId] }); }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-stadium p-5 text-white shadow-lift">
        <p className="flex items-center gap-2 font-bold"><ScanLine className="h-5 w-5 text-primary" />{t("vdash.redeemTitle")}</p>
        <p className="mt-1 text-sm text-white/60">{t("vdash.redeemSub")}</p>
        <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); redeem(); }}>
          <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))} placeholder="A1B2C3" dir="ltr"
            className="scoreboard h-12 flex-1 border-white/20 bg-white/10 text-center text-2xl font-bold tracking-[0.3em] text-white placeholder:text-white/30" />
          <Button type="submit" className="h-12" disabled={code.length < 6}>{t("vdash.redeem")}</Button>
        </form>
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
        <div className="card divide-y">
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
              <Button variant="ghost" size="iconSm" onClick={() => remove(o.id)} aria-label={t("common.delete")}><Trash2 /></Button>
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
          <Button onClick={addOffer} disabled={!form.title.trim()}><Plus />{t("vdash.add")}</Button>
        </div>
      </div>

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
            <div key={m.id} className="flex justify-between text-sm"><span>{m.home_team_name} v {m.away_team_name} · <span className="text-muted-foreground">{formatDateTime(m.kickoff, { day: "numeric", month: "short" })}</span></span><span className="scoreboard font-bold">{m.checkins}</span></div>
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

function ProCard() {
  const { t } = useI18n();
  return (
    <div className="mt-4 rounded-3xl border border-gold/50 bg-gold-soft p-5">
      <p className="font-display text-lg font-bold">{t("vdash.proTitle")}</p>
      <p className="mt-1 text-sm text-muted-foreground">{t("vdash.proBody")}</p>
      <Button className="mt-3" variant="ink" onClick={() => toast.success(t("vdash.proThanks"))}>{t("vdash.proCta")}</Button>
    </div>
  );
}
