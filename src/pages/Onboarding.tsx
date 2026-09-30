import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Check, Search } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { TeamBadge } from "@/components/brand/TeamBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n, type Lang } from "@/i18n/I18nContext";
import type { TKey } from "@/i18n/en";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const CITIES = ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Al Ain", "Beirut", "Other"] as const;

export default function Onboarding() {
  const { t, lang, setLang } = useI18n();
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [teams, setTeams] = useState<Tables<"teams">[]>([]);
  const [q, setQ] = useState("");
  const [teamId, setTeamId] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("teams").select("*").order("league").order("name").then(({ data }) => setTeams(data ?? []));
  }, []);
  useEffect(() => {
    if (profile) { setTeamId(profile.favorite_team_id); setCity(profile.city); }
  }, [profile]);

  const grouped = useMemo(() => {
    const s = q.trim().toLowerCase();
    const m = new Map<string, Tables<"teams">[]>();
    teams
      .filter((tm) => !s || tm.name.toLowerCase().includes(s) || tm.name_ar?.includes(q.trim()) || tm.short_name.toLowerCase().includes(s))
      .forEach((tm) => { const k = tm.league || "—"; m.set(k, [...(m.get(k) ?? []), tm]); });
    return [...m.entries()];
  }, [teams, q]);

  if (!loading && !user) return <Navigate to="/auth" replace />;

  const finish = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      favorite_team_id: teamId, city, preferred_language: lang, onboarding_completed: true,
    }).eq("user_id", user.id);
    setSaving(false);
    if (error) { toast.error(t("onb.saveError")); return; }
    await refreshProfile();
    navigate("/", { replace: true });
  };

  const next = () => (step < 3 ? setStep(step + 1) : finish());

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{t("onb.step", { n: step })}</p>
          <Button variant="ghost" size="sm" onClick={finish} disabled={saving}>{t("common.skip")}</Button>
        </div>
        <div className="mb-6 flex gap-1.5">{[1, 2, 3].map((i) => <span key={i} className={cn("h-1 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-muted")} />)}</div>

        {step === 1 && (
          <section>
            <h1 className="mb-6 text-[28px] font-extrabold leading-tight">{t("onb.langTitle")}</h1>
            <div className="grid grid-cols-2 gap-3">
              {([["en", "English"], ["ar", "العربية"]] as [Lang, string][]).map(([l, label]) => (
                <button key={l} onClick={() => setLang(l)} className={cn("card p-6 text-xl font-semibold transition-colors", lang === l && "border-brand bg-brand-soft ring-2 ring-brand/15", l === "ar" && "font-arabic")}>{label}</button>
              ))}
            </div>
          </section>
        )}

        {step === 2 && (
          <section>
            <h1 className="mb-4 text-[28px] font-extrabold leading-tight">{t("onb.teamTitle")}</h1>
            <div className="relative mb-4">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("onb.teamSearch")} className="ps-9" />
            </div>
            {grouped.length === 0 && <p className="py-8 text-center text-muted-foreground">{t("onb.noTeams")}</p>}
            <div className="space-y-5">
              {grouped.map(([league, list]) => (
                <div key={league}>
                  <h2 className="mb-2 eyebrow">{league}</h2>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {list.map((tm) => (
                      <button key={tm.id} onClick={() => setTeamId(tm.id)} className={cn("relative flex flex-col items-center gap-2 card p-3 text-center text-xs font-medium", teamId === tm.id && "border-brand bg-brand-soft ring-2 ring-brand/15")}>
                        {teamId === tm.id && <Check className="absolute end-2 top-2 h-4 w-4 text-brand" />}
                        <TeamBadge shortName={tm.short_name} primary={tm.primary_color} secondary={tm.secondary_color} />
                        <span className="line-clamp-2">{lang === "ar" && tm.name_ar ? tm.name_ar : tm.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {step === 3 && (
          <section>
            <h1 className="mb-6 text-[28px] font-extrabold leading-tight">{t("onb.cityTitle")}</h1>
            <div className="grid grid-cols-2 gap-2">
              {CITIES.map((c) => (
                <button key={c} onClick={() => setCity(c)} className={cn("card p-4 text-start font-medium", city === c && "border-brand bg-brand-soft ring-2 ring-brand/15")}>{t(`city.${c}` as TKey)}</button>
              ))}
            </div>
          </section>
        )}

        <div className="sticky bottom-20 mt-8 md:bottom-4">
          <Button className="w-full rounded-full" size="lg" onClick={next} disabled={saving}>{step < 3 ? t("common.next") : t("common.finish")}</Button>
        </div>
      </div>
    </AppShell>
  );
}
