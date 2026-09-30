import type { Fixture } from "@/lib/data";

export type Phase = "pre" | "first_half" | "half_time" | "second_half" | "full_time";
export const PHASES: Phase[] = ["pre", "first_half", "half_time", "second_half", "full_time"];

/** Mirrors the database's fixture_phase(): where the match is right now. */
export function phaseOf(f?: Pick<Fixture, "status" | "halftime_home" | "kickoff_at"> | null): Phase {
  if (!f) return "pre";
  if (f.status === "FINISHED" || f.status === "AWARDED") return "full_time";
  if (f.status === "PAUSED") return "half_time";
  if (f.status === "IN_PLAY" || f.status === "LIVE") {
    const late = Date.now() > new Date(f.kickoff_at).getTime() + 60 * 60000;
    return f.halftime_home !== null || late ? "second_half" : "first_half";
  }
  return "pre";
}
export const quizOpen = (p: Phase) => p === "half_time" || p === "second_half" || p === "full_time";
export const motmOpen = (p: Phase) => p === "second_half" || p === "full_time";
