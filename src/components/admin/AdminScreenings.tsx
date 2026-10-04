import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Image as ImageIcon, Search, Tv } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { compLabel } from "@/lib/competitions";
import { FIXTURE_SELECT, loc, type FixtureWithTeams, type Venue } from "@/lib/data";

/** Admin: a venue confirmed on the phone that it's showing a match — add it so fans see it under the match, and get its story image. */
export function AdminScreenings() {
  const { t, lang, formatDateTime } = useI18n();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string | null>(null);

  const { data: fixtures } = useQuery({
    queryKey: ["admin-screen-fixtures"],
    queryFn: async () => ((await supabase.from("fixtures").select(FIXTURE_SELECT).gt("kickoff_at", new Date().toISOString())
      .lt("kickoff_at", new Date(Date.now() + 10 * 864e5).toISOString()).in("competition_code", ["AGC", "UNL", "PL", "CL", "UPL", "SPL", "PD"]).order("kickoff_at").limit(80)).data ?? []) as unknown as FixtureWithTeams[],
  });
  const fixtureId = picked ?? fixtures?.find((f) => f.competition_code === "AGC")?.id ?? fixtures?.[0]?.id ?? null;
  const { data: showing } = useQuery({
    queryKey: ["fixture-venues", fixtureId],
    enabled: !!fixtureId,
    queryFn: async () => ((await supabase.from("venue_screenings").select("venue_id").eq("fixture_id", fixtureId!)).data ?? []) as { venue_id: string }[],
  });
  const { data: results } = useQuery({
    queryKey: ["admin-venue-search", q],
    enabled: q.trim().length >= 2,
    queryFn: async () => ((await supabase.from("venues").select("*").eq("is_listed", true).or(`name.ilike.%${q.trim().replace(/[%,()]/g, "")}%,name_ar.ilike.%${q.trim().replace(/[%,()]/g, "")}%`).order("name").limit(12)).data ?? []) as unknown as Venue[],
  });
  const on = new Set((showing ?? []).map((s) => s.venue_id));

  async function add(v: Venue) {
    if (!fixtureId) return;
    const { error } = await supabase.rpc("admin_add_screening" as never, { p_venue: v.id, p_fixture: fixtureId, p_sound: true } as never);
    if (error) return toast.error(error.message);
    toast.success(t("admin.showAdded"));
    qc.invalidateQueries({ queryKey: ["fixture-venues", fixtureId] });
  }

  return (
    <div className="card mt-6 p-4">
      <p className="flex items-center gap-2 font-bold"><Tv className="h-4 w-4" />{t("admin.showT")}</p>
      <p className="mt-1 text-sm text-muted-foreground">{t("admin.showB")}</p>
      <label className="mt-3 block text-xs font-semibold">{t("admin.showMatch")}</label>
      <select className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" value={fixtureId ?? ""} onChange={(e) => setPicked(e.target.value)}>
        {(fixtures ?? []).map((f) => (
          <option key={f.id} value={f.id}>{formatDateTime(f.kickoff_at, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })} · {f.home_team_name} v {f.away_team_name} · {compLabel(t as never, f.competition_code, f.competition)}</option>
        ))}
      </select>
      <div className="relative mt-3">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="ps-9" placeholder={t("admin.showSearch")} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="mt-2 divide-y">
        {(results ?? []).map((v) => (
          <div key={v.id} className="flex items-center gap-2 py-2.5">
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{loc(v, "name", lang)}</p><p className="truncate text-xs text-muted-foreground">{v.area ?? ""} · {v.city}</p></div>
            {on.has(v.id) ? (
              <>
                <span className="flex items-center gap-1 text-xs font-bold text-brand"><Check className="h-3.5 w-3.5" />{t("admin.showAdded")}</span>
                <Button asChild size="xs" variant="outline"><Link to={`/story/${v.id}?fixture=${fixtureId}`}><ImageIcon className="h-3.5 w-3.5" />{t("admin.showStory")}</Link></Button>
              </>
            ) : <Button size="xs" onClick={() => add(v)}>{t("admin.showAdd")}</Button>}
          </div>
        ))}
      </div>
    </div>
  );
}
