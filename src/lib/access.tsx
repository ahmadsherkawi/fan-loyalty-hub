import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMyVenues } from "@/lib/data";

/** Who is using the app: a fan (organisers are fans who run groups) or a venue business account. */
export function useAccount() {
  const { user, profile, loading } = useAuth();
  const isVenue = profile?.account_type === "venue";
  const { data: venues, isLoading: venuesLoading } = useMyVenues(isVenue ? user?.id : undefined);
  return {
    ready: !loading && (!user || !!profile) && (!isVenue || !venuesLoading),
    signedIn: !!user,
    isVenue,
    isFan: !!user && !isVenue,
    venues: venues ?? [],
    venueHome: venues?.[0] ? `/venue-dashboard/${venues[0].id}` : "/profile",
  };
}

/** Pages only fans (and organisers) use. Venue accounts are sent to their dashboard. */
export function FanOnly({ children }: { children: ReactNode }) {
  const a = useAccount();
  if (!a.ready) return <div className="min-h-screen bg-background" />;
  if (a.isVenue) return <Navigate to={a.venueHome} replace />;
  return <>{children}</>;
}

/** Pages only venue accounts use. Fans are sent home. */
export function VenueOnly({ children }: { children: ReactNode }) {
  const a = useAccount();
  const loc = useLocation();
  if (!a.ready) return <div className="min-h-screen bg-background" />;
  if (!a.signedIn) return <Navigate to={`/auth?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  if (!a.isVenue) return <Navigate to="/" replace />;
  return <>{children}</>;
}
