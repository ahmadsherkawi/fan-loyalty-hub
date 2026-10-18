import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { joinList, leaguesCountingFixture, type MyLeagueComps } from "@/lib/predictor";

const leagues: MyLeagueComps[] = [
  { name: "Friends and football", code: "S7YBQ3", competitions: ["PL"], created_at: "2026-10-08T04:46:51Z" },
  { name: "Office PL", code: "AAAAAA", competitions: ["PL"], created_at: "2026-10-17T19:00:00Z" },
  { name: "La liga prediction league", code: "DJXMK3", competitions: ["PD"], created_at: "2026-10-17T19:11:39Z" },
];

describe("leaguesCountingFixture", () => {
  it("counts a pick in every league that plays its competition", () => {
    expect(leaguesCountingFixture(leagues, { competition_code: "PL", kickoff_at: "2026-10-24T14:00:00Z" }).map((l) => l.code)).toEqual(["S7YBQ3", "AAAAAA"]);
  });
  it("never counts a competition a league doesn't play (no favourite-team games from other competitions)", () => {
    expect(leaguesCountingFixture(leagues, { competition_code: "CL", kickoff_at: "2026-10-21T19:00:00Z" })).toEqual([]);
  });
  it("ignores games before the day a league started, like the table does", () => {
    expect(leaguesCountingFixture(leagues, { competition_code: "PL", kickoff_at: "2026-10-16T14:00:00Z" }).map((l) => l.code)).toEqual(["S7YBQ3"]);
  });
});

describe("joinList", () => {
  it("joins names in English and Arabic", () => {
    expect(joinList(["La Liga"], "en")).toBe("La Liga");
    expect(joinList(["A", "B", "C"], "en")).toBe("A, B and C");
    expect(joinList(["أ", "ب"], "ar")).toBe("أ وب");
  });
});
