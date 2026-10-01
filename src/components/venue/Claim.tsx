import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Clock, KeyRound, MapPin, Search, ShieldCheck, Store } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import type { TKey } from "@/i18n/en";
import { supabase } from "@/integrations/supabase/client";
import type { Venue } from "@/lib/data";

const CODE_ERRORS: Record<string, TKey> = {
  invalid: "claim.err.invalid", taken: "claim.err.taken", too_many: "claim.err.tooMany", fan_account: "claim.err.fanAccount", signin: "claim.err.signin",
};

/** Enter the one-time code Jamhoor sent to the venue's own phone or email. Instant. */
export function ClaimCodeForm({ initialCode = "", autoSubmit = false }: { initialCode?: string; autoSubmit?: boolean }) {
  const { t } = useI18n();
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [code, setCode] = useState(initialCode);
  const [busy, setBusy] = useState(false);
  async function submit(c = code) {
    if (c.replace(/[^A-Za-z0-9]/g, "").length < 6 || busy) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("claim_venue_with_code", { p_code: c });
    setBusy(false);
    const r = data as { venue_id?: string; name?: string; error?: string } | null;
    if (error || !r) return toast.error(t("common.error"));
    if (r.error) return toast.error(t(CODE_ERRORS[r.error] ?? "common.error"));
    await refreshProfile();
    qc.invalidateQueries();
    toast.success(t("claim.done", { venue: r.name ?? "" }));
    navigate(`/venue-dashboard/${r.venue_id}?tab=showing`, { replace: true });
  }
  useEffect(() => { if (autoSubmit && initialCode) submit(initialCode); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  return (
    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <Input dir="ltr" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 12))} placeholder="AB3D-7KQ2" className="font-mono uppercase tracking-widest" autoCapitalize="characters" />
      <Button type="submit" disabled={busy || code.replace(/[^A-Za-z0-9]/g, "").length < 6}>{busy ? t("common.loading") : t("claim.useCode")}</Button>
    </form>
  );
}

/** For venue accounts without a venue: find the listing Jamhoor already made, or use a code. */
export function FindYourVenue({ showCode = true }: { showCode?: boolean }) {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  useEffect(() => { const h = setTimeout(() => setTerm(q.trim()), 300); return () => clearTimeout(h); }, [q]);
  const { data, isFetching } = useQuery({
    queryKey: ["similar-venues", term],
    enabled: term.length >= 3,
    queryFn: async () => (await supabase.rpc("similar_venues", { p_name: term, p_city: null })).data ?? [],
  });
  return (
    <div className="card p-4">
      <p className="flex items-center gap-2 font-bold"><Store className="h-5 w-5" />{t("claim.findTitle")}</p>
      <p className="mt-1 text-sm text-muted-foreground">{t("claim.findSub")}</p>
      <div className="relative mt-3">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("claim.searchPh")} className="ps-9" />
      </div>
      {term.length >= 3 && (
        <div className="mt-2 divide-y rounded-xl border">
          {(data ?? []).map((v) => (
            <div key={v.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{v.name}</p><p className="truncate text-xs text-muted-foreground">{[v.area, t(`city.${v.city}` as TKey)].filter(Boolean).join(" · ")}</p></div>
              {v.claimed ? <span className="text-xs font-semibold text-muted-foreground">{t("claim.alreadyClaimed")}</span>
                : <Button asChild size="xs"><Link to={`/venues/${v.id}?claim=1`}>{t("claim.thisIsMine")}</Link></Button>}
            </div>
          ))}
          {!isFetching && !(data ?? []).length && <p className="px-3 py-3 text-sm text-muted-foreground">{t("claim.noMatch")}</p>}
        </div>
      )}
      {showCode && (
        <div className="mt-4 border-t pt-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><KeyRound className="h-4 w-4" />{t("claim.haveCode")}</p>
          <ClaimCodeForm />
        </div>
      )}
    </div>
  );
}

function useMyClaim(venueId: string, enabled: boolean) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-claim", venueId, user?.id],
    enabled: enabled && !!user,
    queryFn: async () => (await supabase.from("venue_claims").select("id, status, created_at, reason").eq("venue_id", venueId).eq("user_id", user!.id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle()).data,
  });
}

/** On an unclaimed directory listing: "Is this your venue?" — code (instant) or a request Jamhoor verifies. */
export function ClaimVenueCard({ venue, autoOpen }: { venue: Venue; autoOpen?: boolean }) {
  const { t } = useI18n();
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(!!autoOpen);
  const { data: claim } = useMyClaim(venue.id, true);
  const here = `/venues/${venue.id}?claim=1`;
  function start() {
    if (!user) { navigate(`/auth?mode=signup&type=venue&next=${encodeURIComponent(here)}`); return; }
    setOpen(true);
  }
  const pending = claim?.status === "pending";
  return (
    <div className="mt-3 rounded-2xl border border-dashed p-4">
      <p className="flex items-center gap-2 text-sm font-bold"><ShieldCheck className="h-4 w-4" />{t("claim.isThisYours")}</p>
      {pending ? (
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><Clock className="h-4 w-4" />{t("claim.pending")}</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted-foreground">{t("claim.isThisYoursSub")}</p>
          {claim?.status === "rejected" && <p className="mt-1 text-xs text-destructive">{t("claim.rejected")}{claim.reason && claim.reason !== "claimed" ? ` · ${claim.reason}` : ""}</p>}
          <Button size="sm" variant="outline" className="mt-3" onClick={start}>{t("claim.cta")}</Button>
        </>
      )}
      <Dialog open={open && !!user} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle>{t("claim.title", { venue: venue.name })}</DialogTitle>
            <DialogDescription>{t("claim.why")}</DialogDescription>
          </DialogHeader>
          {profile?.account_type !== "venue" ? (
            <div className="space-y-3 text-sm">
              <p>{t("claim.needVenueAccount")}</p>
              <Button className="w-full" onClick={async () => { await signOut(); navigate(`/auth?mode=signup&type=venue&next=${encodeURIComponent(here)}`); }}>{t("profile.venueAccount")}</Button>
            </div>
          ) : pending ? (
            <p className="text-sm text-muted-foreground">{t("claim.pending")}</p>
          ) : (
            <Tabs defaultValue="code">
              <TabsList className="w-full">
                <TabsTrigger value="code">{t("claim.tabCode")}</TabsTrigger>
                <TabsTrigger value="verify">{t("claim.tabVerify")}</TabsTrigger>
              </TabsList>
              <TabsContent value="code" className="space-y-3">
                <p className="text-sm text-muted-foreground">{t("claim.codeHelp")}</p>
                <ClaimCodeForm />
              </TabsContent>
              <TabsContent value="verify"><ClaimRequestForm venue={venue} onDone={() => setOpen(false)} /></TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ClaimRequestForm({ venue, onDone }: { venue: Venue; onDone: () => void }) {
  const { t } = useI18n();
  const { profile, user } = useAuth();
  const qc = useQueryClient();
  const [f, setF] = useState({ name: profile?.full_name ?? "", role: "", phone: "", email: user?.email ?? "", licence: "", note: "" });
  const [atVenue, setAtVenue] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const getPosition = () => new Promise<GeolocationPosition | null>((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 });
  });

  async function submit() {
    if (busy) return;
    setBusy(true);
    const pos = atVenue ? await getPosition() : null;
    if (atVenue && !pos) toast(t("claim.noLocation"));
    const { data, error } = await supabase.rpc("request_venue_claim", {
      p_venue: venue.id, p_name: f.name, p_role: f.role, p_phone: f.phone, p_email: f.email, p_licence: f.licence, p_note: f.note,
      p_lat: pos?.coords.latitude ?? null, p_lng: pos?.coords.longitude ?? null,
    });
    setBusy(false);
    if (error) {
      const m = error.message;
      return toast.error(t(m.includes("already claimed") ? "claim.err.taken" : m.includes("fan account") ? "claim.err.fanAccount" : m.includes("missing") ? "claim.err.missing"
        : m.includes("already requested") ? "claim.pending" : m.includes("limit") ? "claim.err.limit" : "common.error"));
    }
    const d = (data as { distance_m?: number | null } | null)?.distance_m;
    toast.success(d != null && d <= 150 ? t("claim.sentNear") : t("claim.sent"));
    qc.invalidateQueries({ queryKey: ["my-claim", venue.id] });
    onDone();
  }
  const ok = f.name.trim().length >= 2 && f.phone.replace(/\D/g, "").length >= 7;
  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">{t("claim.verifyHelp")}</p>
      <div className="grid gap-1.5"><Label>{t("auth.contactName")}</Label><Input value={f.name} onChange={set("name")} /></div>
      <div className="grid gap-1.5"><Label>{t("claim.role")}</Label><Input value={f.role} onChange={set("role")} placeholder={t("claim.rolePh")} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5"><Label>{t("claim.phone")}</Label><Input dir="ltr" type="tel" value={f.phone} onChange={set("phone")} placeholder="+971" /></div>
        <div className="grid gap-1.5"><Label>{t("claim.email")}</Label><Input dir="ltr" type="email" value={f.email} onChange={set("email")} /></div>
      </div>
      <div className="grid gap-1.5"><Label>{t("claim.licence")}</Label><Input dir="ltr" value={f.licence} onChange={set("licence")} placeholder={t("common.optional")} /></div>
      <div className="grid gap-1.5"><Label>{t("claim.note")}</Label><Input value={f.note} onChange={set("note")} placeholder={t("common.optional")} /></div>
      <label className="flex items-start gap-2.5 rounded-xl bg-surface px-3 py-2.5 text-sm">
        <Checkbox checked={atVenue} onCheckedChange={(v) => setAtVenue(!!v)} className="mt-0.5" />
        <span><span className="flex items-center gap-1 font-semibold"><MapPin className="h-3.5 w-3.5" />{t("claim.atVenue")}</span><span className="text-xs text-muted-foreground">{t("claim.atVenueSub")}</span></span>
      </label>
      <Button onClick={submit} disabled={busy || !ok}>{busy ? t("common.loading") : t("claim.send")}</Button>
      <p className="flex items-start gap-1.5 text-xs text-muted-foreground"><BadgeCheck className="mt-px h-3.5 w-3.5 shrink-0" />{t("claim.howWeCheck")}</p>
    </div>
  );
}
