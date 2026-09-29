import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nContext";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <AppShell>
      <div className="mx-auto mt-10 max-w-md rounded-3xl border bg-card bg-pitch-lines p-10 text-center">
        <p className="scoreboard text-6xl font-bold text-accent" dir="ltr">4 – 0 – 4</p>
        <h1 className="mt-4 text-2xl font-bold">{t("notFound.title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("notFound.body")}</p>
        <Button asChild className="mt-6 rounded-full"><Link to="/">{t("notFound.home")}</Link></Button>
      </div>
    </AppShell>
  );
}
