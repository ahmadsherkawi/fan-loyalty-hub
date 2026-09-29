import { Navigate } from "react-router-dom";
import { Tv } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import Landing from "./Landing";

export default function Home() {
  const { user, profile, loading } = useAuth();
  const { t, formatDateTime } = useI18n();
  if (loading) return null;
  if (!user) return <Landing />;
  if (profile && !profile.onboarding_completed) return <Navigate to="/onboarding" replace />;
  return (
    <AppShell>
      <p className="text-sm text-muted-foreground">{formatDateTime(new Date(), { weekday: "long", day: "numeric", month: "long" })}</p>
      <h1 className="mt-1 text-3xl font-bold">{t("home.welcome")}{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}</h1>
      <section className="mt-6 rounded-3xl border bg-card bg-pitch-lines p-6">
        <div className="flex items-center gap-2 text-accent"><Tv className="h-5 w-5" /><h2 className="text-lg font-semibold text-foreground">{t("home.tonight")}</h2></div>
        <p className="mt-6 py-8 text-center text-muted-foreground">{t("home.tonightEmpty")}</p>
        <p className="text-xs text-muted-foreground">{t("home.localTime")}</p>
      </section>
    </AppShell>
  );
}
