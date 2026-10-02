import { Clock, EyeOff, ImageOff, MessageCircleOff, ShieldCheck, Trash2 } from "lucide-react";
import { AppShell, BackButton, PageTitle } from "@/components/layout/AppShell";
import { useI18n } from "@/i18n/I18nContext";
import type { TKey } from "@/i18n/en";

/** /privacy — what Jamhoor keeps, for how long, and who sees it. Plain language, both languages. */
export default function PrivacyPage() {
  const { t } = useI18n();
  const rows: { icon: typeof Clock; title: TKey; body: TKey }[] = [
    { icon: ImageOff, title: "privacy.photosT", body: "privacy.photosB" },
    { icon: MessageCircleOff, title: "privacy.msgsT", body: "privacy.msgsB" },
    { icon: Clock, title: "privacy.notifT", body: "privacy.notifB" },
    { icon: Trash2, title: "privacy.bookT", body: "privacy.bookB" },
    { icon: EyeOff, title: "privacy.whoT", body: "privacy.whoB" },
    { icon: ShieldCheck, title: "privacy.keepT", body: "privacy.keepB" },
  ];
  return (
    <AppShell>
      <BackButton />
      <PageTitle title={t("privacy.title")} sub={t("privacy.sub")} />
      <div className="card divide-y">
        {rows.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex gap-3 p-4">
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
            <div><p className="font-bold">{t(title)}</p><p className="mt-1 text-sm text-muted-foreground">{t(body)}</p></div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">{t("privacy.contact")}</p>
    </AppShell>
  );
}
