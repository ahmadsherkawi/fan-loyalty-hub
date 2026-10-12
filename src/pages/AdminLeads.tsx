import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Flame, Linkedin, Mail, MessageCircle, Phone } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageTitle } from "@/components/layout/AppShell";
import { CardSkeletons, Chip, EmptyState } from "@/components/common/bits";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Lead = {
  id: string; campaign_name: string | null; name: string | null; email: string | null; job_title: string | null; company_name: string | null;
  company_domain: string | null; linkedin_url: string | null; country: string | null; phone: string | null; why_hot: string | null;
  became_hot_at: string | null; status: "new" | "contacted" | "won" | "lost"; notes: string | null;
};
const STATUSES = ["new", "contacted", "won", "lost"] as const;
const CALENDLY = "https://calendly.com/ahmadsherkawi/jamhoor-intro-15-min";

/** /admin/leads — hot leads from the Explee outreach campaigns (synced every 10 minutes). Admin only. */
export default function AdminLeads() {
  const { t, formatDateTime } = useI18n();
  const { profile, loading } = useAuth();
  const qc = useQueryClient();
  const isAdmin = profile?.role === "system_admin";
  const [filter, setFilter] = useState<"open" | "all">("open");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-leads"],
    enabled: isAdmin,
    refetchInterval: 60_000,
    queryFn: async () => ((await supabase.from("outreach_hot_leads" as never).select("*").order("became_hot_at", { ascending: false }).limit(500)).data ?? []) as unknown as Lead[],
  });
  const [notes, setNotes] = useState<Record<string, string>>({});
  if (loading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  async function save(l: Lead, patch: Partial<Lead>) {
    const { error } = await supabase.from("outreach_hot_leads" as never).update({ ...patch, updated_at: new Date().toISOString() } as never).eq("id", l.id);
    if (error) return toast.error(error.message);
    toast.success(t("leads.saved"));
    qc.invalidateQueries({ queryKey: ["admin-leads"] });
  }

  const list = (data ?? []).filter((l) => filter === "all" || l.status === "new" || l.status === "contacted");
  const counts = STATUSES.map((s) => [s, (data ?? []).filter((l) => l.status === s).length] as const);
  const wa = (p: string) => `https://wa.me/${p.replace(/[^\d]/g, "")}`;

  return (
    <AppShell>
      <PageTitle eyebrow="Admin" title={t("leads.title")} sub={t("leads.sub")} />
      <div className="mb-3 flex flex-wrap gap-2">
        <Chip active={filter === "open"} onClick={() => setFilter("open")}>{t("leads.open")}</Chip>
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>{t("leads.all")}</Chip>
        <span className="ms-auto self-center text-xs text-muted-foreground">{counts.map(([s, n]) => `${t(`leads.s.${s}` as never)} ${n}`).join(" · ")}</span>
      </div>
      {isLoading ? <CardSkeletons /> : !list.length ? <EmptyState icon={<Flame className="h-5 w-5" />} title={t("leads.empty")} body={t("leads.emptyB")} /> : (
        <div className="space-y-3">
          {list.map((l) => (
            <div key={l.id} className={cn("card p-4", l.status === "new" && "border-primary/50")}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold">{l.name || l.email}{l.job_title && <span className="font-normal text-muted-foreground"> · {l.job_title}</span>}</p>
                  <p className="text-sm text-muted-foreground">{[l.company_name || l.company_domain, l.country].filter(Boolean).join(" · ")}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{l.campaign_name}{l.became_hot_at && ` · ${formatDateTime(l.became_hot_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })}`}</p>
                </div>
                <select value={l.status} onChange={(e) => save(l, { status: e.target.value as Lead["status"] })} className="rounded-lg border bg-background px-2 py-1 text-sm">
                  {STATUSES.map((s) => <option key={s} value={s}>{t(`leads.s.${s}` as never)}</option>)}
                </select>
              </div>
              {l.why_hot && <blockquote className="mt-3 whitespace-pre-line rounded-xl bg-surface px-3 py-2 text-sm">“{l.why_hot}”</blockquote>}
              <div className="mt-3 flex flex-wrap gap-2">
                {l.email && <Button asChild size="sm" variant="outline"><a href={`mailto:${l.email}?subject=${encodeURIComponent("Jamhoor")}&body=${encodeURIComponent(`Hi ${l.name?.split(" ")[0] ?? ""},\n\nThanks for getting back to me. Here's a link to pick a time: ${CALENDLY}\n\n`)}`}><Mail />{l.email}</a></Button>}
                {l.phone && <Button asChild size="sm" variant="outline"><a href={wa(l.phone)} target="_blank" rel="noreferrer"><MessageCircle />WhatsApp</a></Button>}
                {l.phone && <Button asChild size="sm" variant="outline"><a href={`tel:${l.phone}`}><Phone />{l.phone}</a></Button>}
                {l.linkedin_url && <Button asChild size="sm" variant="outline"><a href={l.linkedin_url} target="_blank" rel="noreferrer"><Linkedin />LinkedIn</a></Button>}
              </div>
              <div className="mt-3 flex gap-2">
                <Textarea rows={1} placeholder={t("leads.notesPh")} defaultValue={l.notes ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [l.id]: e.target.value }))} className="min-h-0" />
                <Button size="sm" variant="outline" disabled={notes[l.id] === undefined} onClick={() => save(l, { notes: notes[l.id] })}>{t("leads.saveNote")}</Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="mt-6 text-center text-xs text-muted-foreground">{t("leads.foot")} · <Link to="/admin/claims" className="underline">{t("leads.toClaims")}</Link></p>
    </AppShell>
  );
}
