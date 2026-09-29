import { Hammer } from "lucide-react";
import { AppShell, BackButton } from "@/components/layout/AppShell";
import { useI18n } from "@/i18n/I18nContext";
import type { TKey } from "@/i18n/en";

export default function Placeholder({ titleKey, children }: { titleKey: TKey; children?: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <AppShell>
      <BackButton />
      <h1 className="text-3xl font-bold">{t(titleKey)}</h1>
      {children}
      <div className="mt-6 rounded-2xl border bg-card bg-pitch-lines p-10 text-center">
        <Hammer className="mx-auto mb-3 h-8 w-8 text-accent" />
        <p className="font-display text-lg font-semibold">{t("common.comingNext")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("common.comingNextBody")}</p>
      </div>
    </AppShell>
  );
}
