import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, MessageCircle, Share2, Target, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell, BackButton } from "@/components/layout/AppShell";
import { CardSkeletons, EmptyState, Section } from "@/components/common/bits";
import { Board } from "@/components/predictor/Board";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { whatsappShare } from "@/lib/data";
import type { BoardRow, LeagueInfo } from "@/lib/predictor";
import { copyText, shareOrCopy, siteUrl } from "@/lib/share";

/** /league/:code — a private Predictor league. The code is the invite: anyone with it can see the table and join. */
export default function LeaguePage() {
  const { code = "" } = useParams();
  const [params] = useSearchParams();
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const { data: info, isLoading } = useQuery({
    queryKey: ["league", code, user?.id],
    queryFn: async () => (((await supabase.rpc("league_info" as never, { p_code: code } as never)).data ?? []) as unknown as LeagueInfo[])[0] ?? null,
  });
  const { data: board } = useQuery({
    queryKey: ["league-board", code],
    enabled: !!info,
    refetchInterval: 60_000,
    queryFn: async () => ((await supabase.rpc("league_board" as never, { p_code: code } as never)).data ?? []) as unknown as BoardRow[],
  });

  if (isLoading) return <AppShell><CardSkeletons /></AppShell>;
  if (!info) return <AppShell><BackButton /><EmptyState icon={<Users className="h-5 w-5" />} title={t("league.notFound")} cta={{ to: "/predictor", label: t("predictor.title") }} /></AppShell>;

  const url = siteUrl(`/league/${info.code}`);
  const invite = t("league.inviteText", { name: info.name, code: info.code });
  async function join() {
    if (!user) return navigate(`/auth?mode=signup&next=${encodeURIComponent(`/league/${info!.code}`)}`);
    setBusy(true);
    const { error } = await supabase.rpc("join_league" as never, { p_code: info!.code } as never);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(t("league.joined"));
    qc.invalidateQueries({ queryKey: ["league", code] }); qc.invalidateQueries({ queryKey: ["league-board", code] }); qc.invalidateQueries({ queryKey: ["my-leagues"] });
  }
  async function share() { const r = await shareOrCopy(invite, url); if (r === "copied") toast.success(t("common.copied")); }
  async function copyCode() { if (await copyText(info!.code)) toast.success(t("common.copied")); }

  return (
    <AppShell>
      <BackButton />
      <div className="relative -mx-4 overflow-hidden bg-foreground px-4 py-6 text-background md:mx-0 md:rounded-3xl">
        <div className="absolute inset-0 bg-[radial-gradient(70%_80%_at_100%_0%,hsl(var(--primary)/0.35),transparent_60%)]" aria-hidden />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{t("league.eyebrow")}</p>
          <h1 className="mt-1 text-3xl font-extrabold leading-tight">{info.name}</h1>
          <p className="mt-1 text-sm text-background/70">{t("predictor.members", { n: info.members })}{info.owner_name ? ` · ${t("league.by", { name: info.owner_name })}` : ""}</p>
          <button onClick={copyCode} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold" dir="ltr"><span className="text-background/60">{t("league.code")}</span><span className="scoreboard text-lg tracking-widest">{info.code}</span><Copy className="h-4 w-4" /></button>
        </div>
      </div>

      {params.get("created") === "1" && info.is_member && (
        <div className="card mt-4 border-primary/40 bg-brand-soft p-4">
          <p className="font-bold">{t("league.createdT")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("league.createdB")}</p>
        </div>
      )}

      <div className="mt-4 grid gap-2">
        {!info.is_member ? (
          <Button size="lg" onClick={join} disabled={busy}>{user ? t("league.joinCta") : t("league.joinSignup")}</Button>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Button asChild><a href={whatsappShare(`${invite} ${url}`)} target="_blank" rel="noreferrer"><MessageCircle />{t("league.inviteWa")}</a></Button>
            <Button variant="outline" onClick={share}><Share2 />{t("league.invite")}</Button>
          </div>
        )}
        {info.is_member && <Button asChild variant="outline"><Link to="/predictor"><Target />{t("league.predictCta")}</Link></Button>}
      </div>

      <Section title={t("league.table")}>
        {(board ?? []).length ? <Board rows={board!} me={user?.id} /> : <CardSkeletons n={1} />}
        <p className="mt-2 text-xs text-muted-foreground">{t("league.rulesShort")}</p>
      </Section>
    </AppShell>
  );
}
