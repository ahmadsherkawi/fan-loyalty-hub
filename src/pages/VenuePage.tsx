import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Gift, Instagram, MapPin, Navigation, Phone } from "lucide-react";
import { AppShell, BackButton } from "@/components/layout/AppShell";
import { GroupCard, PartyCard, VenueFacts } from "@/components/cards";
import { CardSkeletons, DemoChip, EmptyState, Section } from "@/components/common/bits";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { GROUP_SELECT, loc, useVenueParties, type GroupFull, type Venue } from "@/lib/data";

export default function VenuePage() {
  const { id } = useParams();
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const { data: venue, isLoading } = useQuery({
    queryKey: ["venue", id],
    enabled: !!id,
    queryFn: async () => (await supabase.from("venues").select("*").eq("id", id!).single()).data as Venue | null,
  });
  const { data: offers } = useQuery({
    queryKey: ["offers", id],
    enabled: !!id,
    queryFn: async () => (await supabase.from("venue_offers").select("*").eq("venue_id", id!).eq("active", true)).data ?? [],
  });
  const { data: groups } = useQuery({
    queryKey: ["venue-groups", id],
    enabled: !!id,
    queryFn: async () => ((await supabase.from("groups").select(GROUP_SELECT).eq("home_venue_id", id!)).data ?? []) as unknown as GroupFull[],
  });
  const { data: parties } = useVenueParties(id);

  if (isLoading) return <AppShell><CardSkeletons /></AppShell>;
  if (!venue) return <AppShell><BackButton /><EmptyState title={t("venue.notFound")} /></AppShell>;
  const isOwner = user && venue.owner_user_id === user.id;
  return (
    <AppShell>
      <BackButton />
      <div className="rounded-3xl border bg-card bg-pitch-lines p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">{loc(venue, "name", lang)}</h1>
          <DemoChip show={venue.is_demo} />
          {venue.is_pro && <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">PRO</span>}
        </div>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />{[venue.area, t(`city.${venue.city}` as never)].filter(Boolean).join(" · ")}</p>
        {loc(venue, "description", lang) && <p className="mt-3 text-sm">{loc(venue, "description", lang)}</p>}
        <div className="mt-4"><VenueFacts venue={venue} /></div>
        <div className="mt-4 flex flex-wrap gap-2">
          {venue.lat && venue.lng && <Button asChild variant="outline" size="sm" className="rounded-full"><a href={`https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}`} target="_blank" rel="noreferrer"><Navigation className="me-1.5 h-4 w-4" />{t("party.directions")}</a></Button>}
          {venue.instagram && <Button asChild variant="outline" size="sm" className="rounded-full"><a href={`https://instagram.com/${venue.instagram.replace("@", "")}`} target="_blank" rel="noreferrer"><Instagram className="me-1.5 h-4 w-4" />{venue.instagram}</a></Button>}
          {venue.phone && <Button asChild variant="outline" size="sm" className="rounded-full"><a href={`tel:${venue.phone}`}><Phone className="me-1.5 h-4 w-4" />{venue.phone}</a></Button>}
          {isOwner && <Button asChild size="sm" className="rounded-full"><Link to={`/venue-dashboard/${venue.id}`}><BarChart3 className="me-1.5 h-4 w-4" />{t("page.venueDashboard")}</Link></Button>}
        </div>
      </div>
      {(offers ?? []).length > 0 && (
        <Section title={t("party.perks")} icon={<Gift className="h-5 w-5 text-accent" />}>
          <div className="grid gap-3 md:grid-cols-2">{offers!.map((o) => (
            <div key={o.id} className="rounded-2xl border border-accent/30 bg-accent/5 p-4"><p className="font-medium">{loc(o, "title", lang)}</p><p className="text-sm text-muted-foreground">{loc(o, "details", lang)}</p></div>
          ))}</div>
        </Section>
      )}
      <Section title={t("venue.upcoming")}>
        {(parties ?? []).length ? <div className="grid gap-3 md:grid-cols-2">{parties!.map((p) => <PartyCard key={p.id} party={p} />)}</div> : <EmptyState title={t("venue.noParties")} />}
      </Section>
      {(groups ?? []).length > 0 && (
        <Section title={t("venue.homeOf")}>
          <div className="grid gap-3 md:grid-cols-2">{groups!.map((g) => <GroupCard key={g.id} group={g} />)}</div>
        </Section>
      )}
    </AppShell>
  );
}
