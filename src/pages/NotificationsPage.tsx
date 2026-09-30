import { Bell } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell, PageTitle } from "@/components/layout/AppShell";
import { CardSkeletons, EmptyState } from "@/components/common/bits";
import { NotificationList } from "@/components/notify/notifications";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "@/lib/data";

export default function NotificationsPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useNotifications(user?.id);
  const unread = (data ?? []).filter((n) => !n.read_at).length;
  async function readAll() {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
    qc.invalidateQueries({ queryKey: ["notifications", user?.id] });
  }
  if (!user) return <AppShell><EmptyState title={t("notif.signIn")} cta={{ to: "/auth?next=/notifications", label: t("nav.signIn") }} /></AppShell>;
  return (
    <AppShell>
      <PageTitle title={t("notif.title")} sub={unread ? t("notif.unread", { n: unread }) : t("notif.allCaught")}
        action={unread ? <Button variant="outline" size="sm" onClick={readAll}>{t("notif.markAll")}</Button> : undefined} />
      {isLoading ? <CardSkeletons /> : (data ?? []).length ? <NotificationList items={data!} /> : <EmptyState icon={<Bell className="h-5 w-5" />} title={t("notif.empty")} body={t("notif.emptyBody")} />}
    </AppShell>
  );
}
