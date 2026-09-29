import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Gift, Plus, Trash2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { AppShell, BackButton } from "@/components/layout/AppShell";
import { CardSkeletons, EmptyState } from "@/components/common/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { loc, type Venue } from "@/lib/data";

type VStats = { total_checkins: number; unique_fans: number; groups_hosted: number; per_match: { id: string; home_team_name: string; away_team_name: string; kickoff: string; checkins: number; new_faces: number }[] };

export default function VenueDashboard() {
  const { id } = useParams();
  const { t, lang, formatDateTime } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const { data: venue, isLoading } = useQuery({
    queryKey: ["venue", id],
    enabled: !!id,
    queryFn: async () => (await supabase.from("venues").select("*").eq("id", id!).single()).data as Venue | null,
  });
  const allowed = !!venue && !!user && venue.owner_user_id === user.id;
  const { data: stats } = useQuery({
    queryKey: ["venue-stats", id],
    enabled: allowed,
    queryFn: async () => (await supabase.rpc("venue_stats", { p_venue: id! })).data as unknown as VStats,
  });
  const { data: offers } = useQuery({
    queryKey: ["offers-all", id],
    enabled: allowed,
    queryFn: async () => (await supabase.from("venue_offers").select("*").eq("venue_id", id!).order("created_at")).data ?? [],
  });

  async function addOffer() {
    if (!title.trim()) return;
    const { error } = await supabase.from("venue_offers").insert({ venue_id: id!, title: title.trim(), details: details.trim() || null });
    if (error) return toast.error(t("common.error"));
    setTitle(""); setDetails("");
    qc.invalidateQueries({ queryKey: ["offers-all", id] });
  }
  async function toggle(oid: string, active: boolean) { await supabase.from("venue_offers").update({ active }).eq("id", oid); qc.invalidateQueries({ queryKey: ["offers-all", id] }); }
  async function remove(oid: string) { await supabase.from("venue_offers").delete().eq("id", oid); qc.invalidateQueries({ queryKey: ["offers-all", id] }); }

  if (isLoading) return <AppShell><CardSkeletons /></AppShell>;
  if (!allowed) return <AppShell><BackButton /><EmptyState title={t("vdash.notAllowed")} /></AppShell>;
  const chart = [...(stats?.per_match ?? [])].reverse().slice(-10).map((m) => ({
    name: `${m.home_team_name.slice(0, 3)}–${m.away_team_name.slice(0, 3)}`,
    [t("vdash.returning")]: m.checkins - m.new_faces, [t("vdash.newFaces")]: m.new_faces,
  }));
  return (
    <AppShell>
      <BackButton />
      <p className="text-sm font-semibold text-primary"><Link to={`/venues/${venue!.id}`}>{loc(venue, "name", lang)}</Link></p>
      <h1 className="text-3xl font-bold">{t("page.venueDashboard")}</h1>
      <div className="mt-5 grid grid-cols-3 gap-3">
        {[{ v: stats?.total_checkins ?? 0, l: t("vdash.checkins") }, { v: stats?.unique_fans ?? 0, l: t("vdash.fans") }, { v: stats?.groups_hosted ?? 0, l: t("vdash.groups") }].map((x) => (
          <div key={x.l} className="rounded-2xl border bg-card p-4"><p className="scoreboard text-3xl font-bold">{x.v}</p><p className="text-xs text-muted-foreground">{x.l}</p></div>
        ))}
      </div>
      <div className="mt-4 rounded-3xl border bg-card p-4">
        <p className="mb-3 flex items-center gap-2 font-semibold"><TrendingUp className="h-4 w-4 text-primary" />{t("vdash.perMatch")}</p>
        {chart.length ? (
          <div className="h-56" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} width={28} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                <Bar dataKey={t("vdash.returning")} stackId="a" fill="hsl(var(--primary))" />
                <Bar dataKey={t("vdash.newFaces")} stackId="a" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <p className="text-sm text-muted-foreground">{t("vdash.noData")}</p>}
        <div className="mt-3 space-y-1">
          {(stats?.per_match ?? []).slice(0, 6).map((m) => (
            <div key={m.id} className="flex justify-between text-sm"><span>{m.home_team_name} v {m.away_team_name} · <span className="text-muted-foreground">{formatDateTime(m.kickoff, { day: "numeric", month: "short" })}</span></span><span className="scoreboard font-bold">{m.checkins}</span></div>
          ))}
        </div>
      </div>
      <div className="mt-4 rounded-3xl border bg-card p-4">
        <p className="flex items-center gap-2 font-semibold"><Gift className="h-4 w-4 text-accent" />{t("vdash.offers")}</p>
        <div className="mt-3 space-y-2">
          {(offers ?? []).map((o) => (
            <div key={o.id} className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3">
              <div className="min-w-0 flex-1"><p className="font-medium">{o.title}</p>{o.details && <p className="text-xs text-muted-foreground">{o.details}</p>}</div>
              <Switch checked={o.active} onCheckedChange={(v) => toggle(o.id, v)} />
              <Button variant="ghost" size="icon" onClick={() => remove(o.id)} aria-label={t("common.delete")}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_auto]">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("vdash.offerTitle")} />
          <Input value={details} onChange={(e) => setDetails(e.target.value)} placeholder={t("vdash.offerDetails")} />
          <Button className="rounded-full" onClick={addOffer} disabled={!title.trim()}><Plus className="me-1 h-4 w-4" />{t("vdash.add")}</Button>
        </div>
      </div>
      {!venue!.is_pro && (
        <div className="mt-4 rounded-3xl border border-accent/40 bg-accent/10 p-5">
          <p className="font-display text-lg font-bold">{t("vdash.proTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("vdash.proBody")}</p>
          <Button className="mt-3 rounded-full" variant="secondary" onClick={() => toast.success(t("vdash.proThanks"))}>{t("vdash.proCta")}</Button>
        </div>
      )}
    </AppShell>
  );
}
