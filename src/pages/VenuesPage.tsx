import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, MapPin, Search, Store, Tv } from "lucide-react";
import { AppShell, PageTitle } from "@/components/layout/AppShell";
import { CardSkeletons, Chip, DemoChip, EmptyState } from "@/components/common/bits";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { CITIES, loc, type Venue } from "@/lib/data";

type Next = { venue_id: string; fixture: { home_team_name: string; away_team_name: string; kickoff_at: string } | null };

/** Where to watch: every listed venue, Pro venues first, with the next game on their screens. */
export default function VenuesPage() {
  const { t, lang, formatDateTime } = useI18n();
  const [city, setCity] = useState("all");
  const [q, setQ] = useState("");
  const { data: venues, isLoading } = useQuery({
    queryKey: ["venues-directory"],
    queryFn: async () => ((await supabase.from("venues").select("*").eq("is_listed", true).order("is_pro", { ascending: false }).order("name")).data ?? []) as Venue[],
  });
  const { data: next } = useQuery({
    queryKey: ["venues-next-games"],
    queryFn: async () => ((await supabase.from("venue_screenings").select("venue_id, fixture:fixtures(home_team_name, away_team_name, kickoff_at)")
      .gte("fixture.kickoff_at", new Date().toISOString())).data ?? []) as unknown as Next[],
  });
  const nextByVenue = useMemo(() => {
    const m = new Map<string, { count: number; first: Next["fixture"] }>();
    (next ?? []).filter((n) => n.fixture && new Date(n.fixture.kickoff_at) > new Date()).forEach((n) => {
      const cur = m.get(n.venue_id) ?? { count: 0, first: null };
      cur.count++;
      if (!cur.first || new Date(n.fixture!.kickoff_at) < new Date(cur.first.kickoff_at)) cur.first = n.fixture;
      m.set(n.venue_id, cur);
    });
    return m;
  }, [next]);
  const cities = CITIES.filter((c) => (venues ?? []).some((v) => v.city === c));
  const s = q.trim().toLowerCase();
  // Venues on Jamhoor (they take bookings) first, then everything we've listed that shows football
  const list = (venues ?? []).filter((v) => (city === "all" || v.city === city) && (!s || [v.name, v.name_ar, v.area].some((x) => x?.toLowerCase().includes(s))))
    .sort((a, b) => Number(!!b.owner_user_id) - Number(!!a.owner_user_id));

  return (
    <AppShell>
      <PageTitle title={t("venues.title")} sub={t("venues.sub")} />
      <div className="relative">
        <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("venues.search")} className="h-12 rounded-full bg-surface ps-11" />
      </div>
      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip active={city === "all"} onClick={() => setCity("all")}>{t("common.all")}</Chip>
        {cities.map((c) => <Chip key={c} active={city === c} onClick={() => setCity(c)}>{t(`city.${c}` as never)}</Chip>)}
      </div>
      <div className="mt-4 grid gap-3">
        {isLoading ? <CardSkeletons /> : list.length ? list.map((v) => {
          const n = nextByVenue.get(v.id);
          return (
            <Link key={v.id} to={`/venues/${v.id}`} className="card card-hover flex items-center gap-3 p-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted"><Store className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate font-bold">{loc(v, "name", lang)}</p>
                  {v.is_pro && <span className="rounded-md bg-foreground px-1.5 py-0.5 text-[10px] font-bold text-background">PRO</span>}
                  <DemoChip show={v.is_demo} />
                </div>
                <p className="flex items-center gap-1 truncate text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{[v.area, t(`city.${v.city}` as never)].filter(Boolean).join(" · ")}{v.screens ? ` · ${t("venue.screens", { n: v.screens })}` : ""}</p>
                {n?.first && <p className="mt-1 flex items-center gap-1 truncate text-xs font-semibold text-brand"><Tv className="h-3 w-3" />{t("venues.next")}: {n.first.home_team_name} {t("common.vs")} {n.first.away_team_name} · {formatDateTime(n.first.kickoff_at, { weekday: "short", hour: "2-digit", minute: "2-digit" })}</p>}
              </div>
              {v.owner_user_id || n?.count
                ? <div className="text-center"><p className="scoreboard text-xl font-bold leading-none">{n?.count ?? 0}</p><p className="text-[10px] text-muted-foreground">{t("venues.games")}</p></div>
                : <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{t(`vtype.${v.venue_type}` as never)}</span>}
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground rtl:rotate-180" />
            </Link>
          );
        }) : <EmptyState icon={<Store className="h-5 w-5" />} title={t("venues.empty")} />}
      </div>
      <Link to="/auth?mode=signup&type=venue" className="mt-6 block rounded-2xl bg-surface p-4 text-center text-sm">
        <span className="font-semibold">{t("venues.ownVenue")}</span> <span className="text-brand">{t("landing.venueCta")} →</span>
      </Link>
    </AppShell>
  );
}
