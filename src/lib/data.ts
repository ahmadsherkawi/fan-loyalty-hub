import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Team = Tables<"teams">;
export type Venue = Tables<"venues">;
export type Group = Tables<"groups">;
export type Fixture = Tables<"fixtures">;
export type WatchParty = Tables<"watch_parties">;
export type Offer = Tables<"venue_offers">;

export type FixtureWithTeams = Fixture & { home_team: Team | null; away_team: Team | null };
export type PartyFull = WatchParty & {
  group: (Group & { team: Team | null }) | null;
  venue: Venue | null;
  fixture: FixtureWithTeams | null;
};
export type GroupFull = Group & { team: Team | null; home_venue: Venue | null };

export const FIXTURE_SELECT =
  "*, home_team:teams!fixtures_home_team_id_fkey(*), away_team:teams!fixtures_away_team_id_fkey(*)";
export const PARTY_SELECT = `*, group:groups(*, team:teams(*)), venue:venues(*), fixture:fixtures(${FIXTURE_SELECT})`;
export const GROUP_SELECT = "*, team:teams(*), home_venue:venues!groups_home_venue_id_fkey(*)";

export const CITIES = ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Al Ain", "Beirut", "Other"] as const;

export const isLive = (s?: string | null) => s === "IN_PLAY" || s === "PAUSED" || s === "LIVE";
export const isFinished = (s?: string | null) => s === "FINISHED" || s === "AWARDED";
export const partyTime = (p: PartyFull) => p.starts_at ?? p.fixture?.kickoff_at ?? p.created_at ?? new Date().toISOString();

/** Pick the Arabic field when Arabic is active, falling back to English. */
export function loc<T extends Record<string, unknown>>(row: T | null | undefined, field: string, lang: string): string {
  if (!row) return "";
  const ar = row[`${field}_ar`];
  const en = row[field];
  return String((lang === "ar" && ar) || en || "");
}

async function unwrap<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data as T;
}

export function useTeams() {
  return useQuery({
    queryKey: ["teams"],
    staleTime: 1000 * 60 * 60,
    queryFn: () => unwrap<Team[]>(supabase.from("teams").select("*").order("league").order("name")),
  });
}

export function useVenues(city?: string) {
  return useQuery({
    queryKey: ["venues", city ?? "all"],
    queryFn: () => {
      let q = supabase.from("venues").select("*").order("name");
      if (city) q = q.eq("city", city);
      return unwrap<Venue[]>(q);
    },
  });
}

export function useNextTeamFixture(teamId?: string | null) {
  return useQuery({
    queryKey: ["next-fixture", teamId],
    enabled: !!teamId,
    refetchInterval: 60_000,
    queryFn: async () => {
      const since = new Date(Date.now() - 3 * 3600e3).toISOString();
      const rows = await unwrap<FixtureWithTeams[]>(
        supabase.from("fixtures").select(FIXTURE_SELECT)
          .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
          .gte("kickoff_at", since).order("kickoff_at").limit(1) as never,
      );
      return rows[0] ?? null;
    },
  });
}

export function usePartiesForFixture(fixtureId?: string | null) {
  return useQuery({
    queryKey: ["parties-fixture", fixtureId],
    enabled: !!fixtureId,
    queryFn: () => unwrap<PartyFull[]>(
      supabase.from("watch_parties").select(PARTY_SELECT).eq("fixture_id", fixtureId!).neq("status", "cancelled") as never,
    ),
  });
}

export function useUpcomingParties(days = 10) {
  return useQuery({
    queryKey: ["parties-upcoming", days],
    queryFn: async () => {
      const rows = await unwrap<PartyFull[]>(
        supabase.from("watch_parties").select(PARTY_SELECT).in("status", ["scheduled", "live"]).limit(200) as never,
      );
      const now = Date.now() - 3 * 3600e3, until = Date.now() + days * 864e5;
      return rows
        .filter((p) => { const t = new Date(partyTime(p)).getTime(); return t >= now && t <= until; })
        .sort((a, b) => new Date(partyTime(a)).getTime() - new Date(partyTime(b)).getTime());
    },
  });
}

export function useGroupParties(groupId?: string) {
  return useQuery({
    queryKey: ["parties-group", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const rows = await unwrap<PartyFull[]>(
        supabase.from("watch_parties").select(PARTY_SELECT).eq("group_id", groupId!).neq("status", "cancelled") as never,
      );
      return rows.sort((a, b) => new Date(partyTime(b)).getTime() - new Date(partyTime(a)).getTime());
    },
  });
}

export function useVenueParties(venueId?: string) {
  return useQuery({
    queryKey: ["parties-venue", venueId],
    enabled: !!venueId,
    queryFn: async () => {
      const rows = await unwrap<PartyFull[]>(
        supabase.from("watch_parties").select(PARTY_SELECT).eq("venue_id", venueId!).in("status", ["scheduled", "live"]) as never,
      );
      return rows.sort((a, b) => new Date(partyTime(a)).getTime() - new Date(partyTime(b)).getTime());
    },
  });
}

export function useParty(id?: string) {
  return useQuery({
    queryKey: ["party", id],
    enabled: !!id,
    refetchInterval: 60_000,
    queryFn: () => unwrap<PartyFull>(supabase.from("watch_parties").select(PARTY_SELECT).eq("id", id!).single() as never),
  });
}

export type PartyCounts = { going: number; waitlist: number; checked_in: number };
export function usePartyCounts(id?: string) {
  return useQuery({
    queryKey: ["party-counts", id],
    enabled: !!id,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data } = await supabase.rpc("party_counts", { p_party: id! });
      return ((data as unknown) as PartyCounts) ?? { going: 0, waitlist: 0, checked_in: 0 };
    },
  });
}

export function useGroups() {
  return useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const groups = await unwrap<GroupFull[]>(supabase.from("groups").select(GROUP_SELECT).order("name") as never);
      const { data: members } = await supabase.from("group_members").select("group_id");
      const counts = new Map<string, number>();
      (members ?? []).forEach((m) => counts.set(m.group_id, (counts.get(m.group_id) ?? 0) + 1));
      return groups.map((g) => ({ ...g, member_count: counts.get(g.id) ?? 0 }));
    },
  });
}

export function useGroup(slug?: string) {
  return useQuery({
    queryKey: ["group", slug],
    enabled: !!slug,
    queryFn: () => unwrap<GroupFull>(supabase.from("groups").select(GROUP_SELECT).eq("slug", slug!).single() as never),
  });
}

export function useMyMemberships(userId?: string) {
  return useQuery({
    queryKey: ["my-memberships", userId],
    enabled: !!userId,
    queryFn: () => unwrap<(Tables<"group_members"> & { group: GroupFull | null })[]>(
      supabase.from("group_members").select(`*, group:groups(${GROUP_SELECT})`).eq("user_id", userId!) as never,
    ),
  });
}

export function useIsGroupAdmin(groupId?: string, userId?: string) {
  return useQuery({
    queryKey: ["is-admin", groupId, userId],
    enabled: !!groupId && !!userId,
    queryFn: async () => {
      const { data } = await supabase.rpc("is_group_admin", { p_group: groupId! });
      return !!data;
    },
  });
}

export type LeaderRow = { user_id: string; full_name: string | null; avatar_url: string | null; prediction_points: number; exact_scores: number; caps: number; quiz_points: number };
export function useGroupLeaderboard(groupId?: string, enabled = true) {
  return useQuery({
    queryKey: ["group-leaderboard", groupId],
    enabled: !!groupId && enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("group_leaderboard", { p_group: groupId! });
      if (error) throw error;
      return ((data as unknown) as LeaderRow[]) ?? [];
    },
  });
}

export type CityRow = { group_id: string; name: string; name_ar: string | null; team_name: string | null; members: number; caps: number; avg_prediction_points: number };
export function useCityLeaderboard(city: string) {
  return useQuery({
    queryKey: ["city-leaderboard", city],
    queryFn: async () => {
      const { data } = await supabase.rpc("city_leaderboard", { p_city: city });
      return ((data as unknown) as CityRow[]) ?? [];
    },
  });
}

export function useProfilesByIds(ids: string[]) {
  const key = [...ids].sort().join(",");
  return useQuery({
    queryKey: ["profiles", key],
    enabled: ids.length > 0,
    queryFn: () => unwrap<Tables<"profiles">[]>(supabase.from("profiles").select("*").in("user_id", ids)),
  });
}

/** Slugify with Arabic letters kept out (URL-friendly Latin only) */
export function slugify(s: string) {
  const base = s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return base || `group-${Math.random().toString(36).slice(2, 7)}`;
}

export function whatsappShare(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export async function shareOrCopy(text: string, url: string) {
  const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
  if (nav.share) {
    try { await nav.share({ text, url }); return "shared"; } catch { /* cancelled */ }
  }
  await navigator.clipboard.writeText(`${text} ${url}`);
  return "copied";
}

export function downloadIcs(title: string, start: string, durationMin: number, location: string, url: string) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const s = new Date(start), e = new Date(s.getTime() + durationMin * 60000);
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Jamhoor//EN", "BEGIN:VEVENT",
    `UID:${crypto.randomUUID()}@jamhoor`, `DTSTAMP:${fmt(new Date())}`, `DTSTART:${fmt(s)}`, `DTEND:${fmt(e)}`,
    `SUMMARY:${title.replace(/[,;]/g, " ")}`, `LOCATION:${location.replace(/[,;]/g, " ")}`, `URL:${url}`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "jamhoor-watch-party.ics";
  a.click();
  URL.revokeObjectURL(a.href);
}
