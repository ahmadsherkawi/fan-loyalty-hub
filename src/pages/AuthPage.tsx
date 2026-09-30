import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import { toast } from "sonner";

export default function AuthPage() {
  const { t } = useI18n();
  const { user, profile, loading } = useAuth();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<"signin" | "signup">(params.get("mode") === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (params.get("error_description")?.toLowerCase().includes("provider")) toast.error(t("auth.googleUnavailable"));
  }, [params, t]);

  const next = params.get("next");
  if (!loading && user) return <Navigate to={profile && !profile.onboarding_completed ? "/onboarding" : next && next.startsWith("/") ? next : "/"} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/onboarding`, data: { full_name: fullName } },
        });
        if (error) throw error;
        if (!data.session) toast.success(t("auth.checkEmail"));
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error((err as Error).message || t("auth.error"));
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth` } });
    if (error) toast.error(error.message.toLowerCase().includes("provider") ? t("auth.googleUnavailable") : t("auth.error"));
  };

  return (
    <AppShell>
      <div className="mx-auto mt-2 max-w-sm">
        <h1 className="text-[28px] font-extrabold leading-tight">{mode === "signup" ? t("auth.signUp") : t("auth.signIn")}</h1>
        <p className="mb-6 mt-1.5 text-sm text-muted-foreground">{t("auth.sub")}</p>
        <Button type="button" variant="outline" className="w-full rounded-full" onClick={google}>{t("auth.google")}</Button>
        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />{t("auth.or")}<span className="h-px flex-1 bg-border" /></div>
        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <div className="space-y-1.5"><Label htmlFor="fn">{t("auth.fullName")}</Label><Input id="fn" value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
          )}
          <div className="space-y-1.5"><Label htmlFor="em">{t("auth.email")}</Label><Input id="em" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div className="space-y-1.5"><Label htmlFor="pw">{t("auth.password")}</Label><Input id="pw" type="password" dir="ltr" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? t("common.loading") : mode === "signup" ? t("auth.signUp") : t("auth.signIn")}</Button>
        </form>
        <button className="mt-5 w-full text-center text-sm font-semibold text-brand hover:underline" onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>
          {mode === "signup" ? t("auth.haveAccount") : t("auth.noAccount")}
        </button>
      </div>
    </AppShell>
  );
}
