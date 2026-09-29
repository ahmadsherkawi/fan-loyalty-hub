import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import Placeholder from "./Placeholder";

export default function ProfilePage() {
  const { profile, user, signOut } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  return (
    <Placeholder titleKey="page.profile">
      {user && (
        <div className="mt-4 flex items-center justify-between rounded-2xl border bg-card p-4">
          <div><p className="font-semibold">{profile?.full_name ?? user.email}</p><p className="text-sm text-muted-foreground">{profile?.city}</p></div>
          <Button variant="outline" size="sm" className="rounded-full" onClick={async () => { await signOut(); navigate("/"); }}>
            <LogOut className="me-1.5 h-4 w-4 rtl:rotate-180" />{t("nav.signOut")}
          </Button>
        </div>
      )}
    </Placeholder>
  );
}
