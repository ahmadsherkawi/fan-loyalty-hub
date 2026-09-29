import { useParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/I18nContext";
import Placeholder from "./Placeholder";

export default function CheckinPage() {
  const { code } = useParams();
  const { t } = useI18n();
  return (
    <Placeholder titleKey="page.checkin">
      <p className="mt-1 text-muted-foreground">{t("page.checkinBody")}</p>
      <Input defaultValue={code ?? ""} placeholder={t("page.checkinCode")} dir="ltr" className="scoreboard mt-4 h-14 max-w-xs text-center text-2xl uppercase tracking-[0.3em]" />
    </Placeholder>
  );
}
