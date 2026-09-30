import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Search, Star } from "lucide-react";
import { toast } from "sonner";
import { FeatureHeader } from "@/components/common/bits";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import type { FixtureWithTeams } from "@/lib/data";
import { matchNightOver, motmOpen, type Phase } from "@/lib/matchPhase";
import { cn } from "@/lib/utils";

type Player = { name: string; position: string | null };

/** Fans pick the man of the match from the two squads — voting opens in the second half. */
export function MotmVote({ partyId, fixture, phase, checkedIn }: { partyId: string; fixture: FixtureWithTeams; phase: Phase; checkedIn: boolean }) {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const over = matchNightOver(fixture.kickoff_at);
  const open = motmOpen(phase) && !over;
  const canVote = open && checkedIn;
  const { data: votes } = useQuery({
    queryKey: ["motm", partyId],
    enabled: !!user,
    refetchInterval: open ? 20_000 : false,
    queryFn: async () => (await supabase.from("motm_votes").select("user_id, player_name").eq("watch_party_id", partyId)).data ?? [],
  });
  const { data: squads } = useQuery({
    queryKey: ["squads", fixture.id],
    enabled: !!user && canVote,
    staleTime: 60 * 60_000,
    queryFn: async () => {
      const { data } = await supabase.functions.invoke("jamhoor-ai", { body: { action: "squad", fixture_id: fixture.id } });
      return ((data as { squads?: Record<string, Player[]> })?.squads ?? {}) as Record<string, Player[]>;
    },
  });
  const mine = votes?.find((v) => v.user_id === user?.id);
  const total = votes?.length ?? 0;
  const tally = Object.entries((votes ?? []).reduce<Record<string, number>>((acc, v) => { acc[v.player_name] = (acc[v.player_name] ?? 0) + 1; return acc; }, {}))
    .sort((a, b) => b[1] - a[1]);
  const teams = [
    { id: fixture.home_team_id, name: (lang === "ar" && fixture.home_team?.name_ar) || fixture.home_team?.name || fixture.home_team_name },
    { id: fixture.away_team_id, name: (lang === "ar" && fixture.away_team?.name_ar) || fixture.away_team?.name || fixture.away_team_name },
  ];
  const lists = useMemo(() => teams.map((tm) => ({
    ...tm, players: (squads?.[tm.id ?? ""] ?? []).filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase())),
  })), [squads, q, teams[0].id, teams[1].id]);

  async function vote(player: string) {
    if (!user) return;
    const { error } = mine
      ? await supabase.from("motm_votes").update({ player_name: player }).eq("watch_party_id", partyId).eq("user_id", user.id)
      : await supabase.from("motm_votes").insert({ watch_party_id: partyId, user_id: user.id, player_name: player });
    if (error) return toast.error(error.message.includes("second half") ? t("motm.locked") : error.message.includes("check in") ? t("motm.checkInFirst") : error.message.includes("closed") ? t("motm.closed") : t("common.error"));
    toast.success(t("motm.voted", { name: player }));
    qc.invalidateQueries({ queryKey: ["motm", partyId] });
  }

  if (!user) return null;
  return (
    <div className="card p-4">
      <FeatureHeader icon={<Star />} tone="gold" title={t("motm.title")} sub={over ? t("motm.closed") : !open ? t("motm.locked") : mine ? t("motm.yourVote", { name: mine.player_name }) : checkedIn ? t("motm.subOpen") : t("motm.checkInFirst")}
        action={!canVote ? <Lock className="h-4 w-4 text-muted-foreground" /> : undefined} />
      {tally.length > 0 && (
        <div className="mt-4 space-y-2">
          {tally.slice(0, 3).map(([p, n], i) => (
            <div key={p}>
              <div className="flex justify-between text-sm"><span className={cn("font-medium", i === 0 && "font-bold")}>{p}</span><span className="scoreboard text-muted-foreground">{Math.round((n / total) * 100)}%</span></div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gold" style={{ width: `${(n / total) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      )}
      {canVote && (
        <div className="mt-4">
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("motm.search")} className="ps-9" />
          </div>
          <div className="mt-3 max-h-72 space-y-3 overflow-y-auto">
            {!squads ? <p className="text-sm text-muted-foreground">{t("common.loading")}</p> : lists.map((tm) => tm.players.length > 0 && (
              <div key={tm.id}>
                <p className="eyebrow mb-1.5">{tm.name}</p>
                <div className="flex flex-wrap gap-1.5">
                  {tm.players.map((p) => (
                    <button key={p.name} onClick={() => vote(p.name)}
                      className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors", mine?.player_name === p.name ? "border-gold bg-gold text-accent-foreground" : "bg-card hover:border-gold")}>
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {squads && lists.every((l) => !l.players.length) && <p className="text-sm text-muted-foreground">{q ? t("motm.noMatch") : t("motm.noSquad")}</p>}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">{t("motm.squadNote")}</p>
        </div>
      )}
    </div>
  );
}
