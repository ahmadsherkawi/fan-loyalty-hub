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

/** Match-night features (quiz, MOTM) close 6 hours after kick-off — same rule as the server. */
export const matchNightOver = (kickoffIso?: string | null) => !!kickoffIso && Date.now() > new Date(kickoffIso).getTime() + 6 * 3600e3;

/** Check-in window: from 3 hours before kick-off to 5 hours after (same rule as the server). */
export function checkinWindow(kickoffIso?: string | null): "early" | "open" | "closed" {
  if (!kickoffIso) return "early";
  const k = new Date(kickoffIso).getTime(), now = Date.now();
  if (now < k - 3 * 3600e3) return "early";
  if (now > k + 5 * 3600e3) return "closed";
  return "open";
}
