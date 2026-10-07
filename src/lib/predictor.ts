import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FIXTURE_SELECT, type FixtureWithTeams } from "@/lib/data";

/** The competitions in the weekly Predictor, most-watched in the UAE first. */
export const PREDICTOR_COMPS = ["PL", "CL", "PD", "UPL", "SPL", "SA", "ACL", "BL1", "FL1", "UNL", "AGC"];
const RANK = new Map(PREDICTOR_COMPS.map((c, i) => [c, i]));

export type BoardRow = { user_id: string; name: string; points: number; exact: number; made: number };
export type LeagueInfo = { name: string; code: string; members: number; owner_name: string | null; created_at: string; is_member: boolean };
export type MyLeague = { name: string; code: string; members: number; my_rank: number | null };

/**
 * This week's Predictor games: the next 7 days of the big competitions, at most `max` games,
 * picked so every competition gets a look-in (most-watched first), then shown in kick-off order.
 */
export function usePredictorFixtures(max = 12) {
  return useQuery({
    queryKey: ["predictor-fixtures", max],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const now = Date.now();
      const { data } = await supabase.from("fixtures").select(FIXTURE_SELECT).in("competition_code", PREDICTOR_COMPS)
        .gt("kickoff_at", new Date(now - 150 * 60e3).toISOString()).lt("kickoff_at", new Date(now + 7 * 864e5).toISOString())
        .order("kickoff_at").limit(400);
      const all = (data ?? []) as unknown as FixtureWithTeams[];
      const byComp = new Map<string, FixtureWithTeams[]>();
      all.forEach((f) => { const c = f.competition_code ?? ""; byComp.set(c, [...(byComp.get(c) ?? []), f]); });
      const comps = [...byComp.keys()].sort((a, b) => (RANK.get(a) ?? 99) - (RANK.get(b) ?? 99));
      const pick: FixtureWithTeams[] = [];
      // Round-robin across competitions so the Premier League leads but others still appear
      for (let round = 0; pick.length < max && round < 20; round++) {
        for (const c of comps) { const f = byComp.get(c)?.[round]; if (f && pick.length < max) pick.push(f); }
      }
      return pick.sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at));
    },
  });
}

export function useSeasonBoard() {
  return useQuery({
    queryKey: ["season-board"],
    staleTime: 60_000,
    queryFn: async () => ((await supabase.rpc("season_leaderboard" as never)).data ?? []) as unknown as BoardRow[],
  });
}

export function useMyLeagues(enabled: boolean) {
  return useQuery({
    queryKey: ["my-leagues"],
    enabled,
    queryFn: async () => ((await supabase.rpc("my_leagues" as never)).data ?? []) as unknown as MyLeague[],
  });
}
