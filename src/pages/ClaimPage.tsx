import { Navigate, useParams } from "react-router-dom";
import { AppShell, PageTitle } from "@/components/layout/AppShell";
import { ClaimCodeForm, FindYourVenue } from "@/components/venue/Claim";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";

/** /claim/:code — the link in Jamhoor's message to a venue. Sign up as a venue, and the listing becomes yours. */
export default function ClaimPage() {
  const { code } = useParams();
  const { t } = useI18n();
  const { user, profile, loading, signOut } = useAuth();
  const here = `/claim${code ? `/${code}` : ""}`;
  if (loading) return null;
  if (!user) return <Navigate to={`/auth?mode=signup&type=venue&next=${encodeURIComponent(here)}`} replace />;
  if (profile && !profile.onboarding_completed && profile.account_type !== "venue") return <Navigate to={`/onboarding?next=${encodeURIComponent(here)}`} replace />;
  return (
    <AppShell>
      <PageTitle eyebrow={t("claim.eyebrow")} title={t("claim.pageTitle")} sub={t("claim.pageSub")} />
      {profile?.account_type !== "venue" ? (
        <div className="card space-y-3 p-4 text-sm">
          <p>{t("claim.needVenueAccount")}</p>
          <Button className="w-full" onClick={async () => { await signOut(); window.location.assign(`/auth?mode=signup&type=venue&next=${encodeURIComponent(here)}`); }}>{t("profile.venueAccount")}</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="card p-4">
            <p className="mb-2 text-sm font-semibold">{t("claim.enterCode")}</p>
            <ClaimCodeForm initialCode={code ?? ""} autoSubmit={!!code} />
          </div>
          <FindYourVenue showCode={false} />
        </div>
      )}
    </AppShell>
  );
}
