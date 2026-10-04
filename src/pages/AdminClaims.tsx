import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, KeyRound, MapPin, Phone, Search, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageTitle } from "@/components/layout/AppShell";
import { CardSkeletons } from "@/components/common/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { copyText, siteUrl } from "@/lib/share";
import { cn } from "@/lib/utils";
import { AdminScreenings } from "@/components/admin/AdminScreenings";

type Claim = {
  id: string; venue_id: string; status: string; contact_name: string; role: string | null; phone: string; email: string | null; licence_no: string | null; note: string | null;
  distance_m: number | null; created_at: string; reason: string | null; venue_name: string; area: string | null; city: string; listed_phone: string | null; website: string | null;
  instagram: string | null; listed_email: string | null; listed_whatsapp: string | null; account_email: string | null; venue_taken: boolean;
};

/** Jamhoor admin: verify venue claims (call the venue's listed number, never the number the claimant typed) and hand out claim codes. */
export default function AdminClaims() {
  const { t, formatDateTime } = useI18n();
  const { profile, loading } = useAuth();
  const qc = useQueryClient();
  const isAdmin = profile?.role === "system_admin";
  const { data, isLoading } = useQuery({
    queryKey: ["admin-claims"],
    enabled: isAdmin,
    refetchInterval: 60_000,
    queryFn: async () => ((await supabase.rpc("admin_venue_claims")).data ?? []) as unknown as Claim[],
  });
  const [busy, setBusy] = useState<string | null>(null);
  if (loading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  async function review(c: Claim, approve: boolean) {
    const reason = approve ? "" : window.prompt(t("admin.rejectReason")) ?? null;
    if (reason === null) return;
    setBusy(c.id);
    const { error } = await supabase.rpc("review_venue_claim", { p_claim: c.id, p_approve: approve, p_reason: reason });
    setBusy(null);
    if (error) return toast.error(error.message.includes("already claimed") ? t("claim.err.taken") : t("common.error"));
    toast.success(approve ? t("admin.approved") : t("admin.rejected"));
    qc.invalidateQueries({ queryKey: ["admin-claims"] });
  }

  return (
    <AppShell>
      <PageTitle eyebrow="Admin" title={t("admin.claimsTitle")} sub={t("admin.claimsSub")} />
      <div className="-mt-4 mb-6"><AdminScreenings /></div>
      {isLoading ? <CardSkeletons n={2} /> : !data?.length ? (
        <p className="rounded-2xl bg-surface px-4 py-5 text-center text-sm text-muted-foreground">{t("admin.noClaims")}</p>
      ) : (
        <div className="space-y-3">
          {data.map((c) => (
            <div key={c.id} className={cn("card p-4", c.status === "pending" && "border-foreground/20")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold">{c.venue_name}</p>
                  <p className="text-xs text-muted-foreground">{[c.area, c.city].filter(Boolean).join(" · ")} · {formatDateTime(c.created_at)}</p>
                </div>
                <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-bold", c.status === "pending" ? "bg-gold-soft text-gold-ink" : c.status === "approved" ? "bg-brand-soft text-brand" : "bg-muted text-muted-foreground")}>{c.status}</span>
              </div>
              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-xl bg-surface p-3">
                  <p className="eyebrow mb-1">{t("admin.claimant")}</p>
                  <p className="font-semibold">{c.contact_name}{c.role ? ` · ${c.role}` : ""}</p>
                  <p dir="ltr" className="text-start">{c.phone}{c.email ? ` · ${c.email}` : ""}</p>
                  <p className="text-xs text-muted-foreground">{t("admin.account")}: {c.account_email ?? "—"}</p>
                  {c.licence_no && <p className="text-xs">{t("claim.licence")}: {c.licence_no}</p>}
                  {c.note && <p className="mt-1 text-xs" dir="auto">“{c.note}”</p>}
                  <p className={cn("mt-1 flex items-center gap-1 text-xs", c.distance_m != null && c.distance_m <= 150 ? "font-semibold text-brand" : "text-muted-foreground")}>
                    <MapPin className="h-3 w-3" />{c.distance_m == null ? t("admin.noLocation") : t("admin.distance", { m: c.distance_m.toLocaleString() })}
                  </p>
                </div>
                <div className="rounded-xl border p-3">
                  <p className="eyebrow mb-1">{t("admin.callBack")}</p>
                  {c.listed_phone ? <a href={`tel:${c.listed_phone}`} dir="ltr" className="flex items-center gap-1 font-semibold text-brand"><Phone className="h-3.5 w-3.5" />{c.listed_phone}</a> : <p className="text-muted-foreground">—</p>}
                  {c.listed_whatsapp && <a href={`https://wa.me/${c.listed_whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" dir="ltr" className="block text-xs">WhatsApp {c.listed_whatsapp}</a>}
                  {c.listed_email && <a href={`mailto:${c.listed_email}`} className="block text-xs">{c.listed_email}</a>}
                  {c.website && <a href={c.website} target="_blank" rel="noreferrer" className="block truncate text-xs text-muted-foreground">{c.website}</a>}
                  {c.listed_phone && c.phone.replace(/\D/g, "").endsWith(c.listed_phone.replace(/\D/g, "").slice(-7)) && <p className="mt-1 text-xs font-semibold text-brand">{t("admin.phoneMatches")}</p>}
                </div>
              </div>
              {c.status === "pending" && !c.venue_taken && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" className="flex-1" disabled={busy === c.id} onClick={() => review(c, true)}><Check />{t("admin.approve")}</Button>
                  <Button size="sm" variant="outline" disabled={busy === c.id} onClick={() => review(c, false)}><X />{t("admin.reject")}</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <CodeLookup />
    </AppShell>
  );
}

/** Find a listing and get its one-time claim link to send to the venue's own phone/email. */
function CodeLookup() {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [codes, setCodes] = useState<Record<string, string>>({});
  useEffect(() => { const h = setTimeout(() => setTerm(q.trim()), 300); return () => clearTimeout(h); }, [q]);
  const { data } = useQuery({
    queryKey: ["similar-venues", term],
    enabled: term.length >= 3,
    queryFn: async () => (await supabase.rpc("similar_venues", { p_name: term, p_city: null })).data ?? [],
  });
  async function get(id: string, refresh = false) {
    const { data: r, error } = await supabase.rpc("venue_claim_code", { p_venue: id, p_refresh: refresh });
    if (error) return toast.error(error.message.includes("already claimed") ? t("claim.err.taken") : t("common.error"));
    setCodes((c) => ({ ...c, [id]: (r as { code: string }).code }));
  }
  return (
    <section className="mt-10">
      <h2 className="flex items-center gap-2 text-lg font-bold"><KeyRound className="h-5 w-5" />{t("admin.codesTitle")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("admin.codesSub")}</p>
      <div className="relative mt-3">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("claim.searchPh")} className="ps-9" />
      </div>
      <div className="mt-2 divide-y rounded-xl border empty:hidden">
        {term.length >= 3 && (data ?? []).map((v) => (
          <div key={v.id} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{v.name}</p><p className="text-xs text-muted-foreground">{[v.area, v.city].filter(Boolean).join(" · ")}</p></div>
            {v.claimed ? <span className="text-xs text-muted-foreground">{t("claim.alreadyClaimed")}</span>
              : codes[v.id] ? (
                <>
                  <code className="rounded bg-surface px-2 py-1 text-sm font-bold tracking-widest">{codes[v.id]}</code>
                  <Button size="xs" variant="outline" onClick={async () => { await copyText(siteUrl(`/claim/${codes[v.id]}`)); toast.success(t("common.copied")); }}><Copy />{t("admin.copyLink")}</Button>
                  <Button size="xs" variant="ghost" onClick={() => get(v.id, true)}>{t("admin.newCode")}</Button>
                </>
              ) : <Button size="xs" onClick={() => get(v.id)}>{t("admin.getCode")}</Button>}
          </div>
        ))}
      </div>
    </section>
  );
}
