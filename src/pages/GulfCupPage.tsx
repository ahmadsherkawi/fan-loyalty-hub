import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { MessageCircle, Share2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageTitle } from "@/components/layout/AppShell";
import { PredictionInput } from "@/components/match/PredictionInput";
import { CardSkeletons, EmptyState, Initials } from "@/components/common/bits";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { FIXTURE_SELECT, whatsappShare, type FixtureWithTeams } from "@/lib/data";
import { shareOrCopy, siteUrl } from "@/lib/share";
import { cn } from "@/lib/utils";

const CODE = "AGC";
type Row = { user_id: string; name: string; points: number; exact: number; made: number; last_at: string };

/** /gulf-cup — predict the Gulf Cup knockout games and compete with friends on one leaderboard. Bragging rights only. */
export default function GulfCupPage() {
  const { t, formatDateTime } = useI18n();
  const { user } = useAuth();

  const { data: fixtures, isLoading } = useQuery({
    queryKey: ["cup-fixtures", CODE],
    queryFn: async () => ((await supabase.from("fixtures").select(FIXTURE_SELECT).eq("competition_code", CODE)
      .gt("kickoff_at", new Date(Date.now() - 3 * 864e5).toISOString()).order("kickoff_at").limit(20)).data ?? []) as unknown as FixtureWithTeams[],
  });
  const { data: board } = useQuery({
    queryKey: ["cup-board", CODE],
    refetchInterval: 60_000,
    queryFn: async () => ((await supabase.rpc("competition_leaderboard" as never, { p_code: CODE } as never)).data ?? []) as unknown as Row[],
  });

  const url = siteUrl("/gulf-cup");
  const invite = t("cup.invite");
  async function share() {
    const r = await shareOrCopy(invite, url);
    if (r === "copied") toast.success(t("common.copied"));
  }

  return (
    <AppShell>
      <PageTitle eyebrow={t("comp.AGC")} title={t("cup.title")} sub={t("cup.sub")} />

      {!user && (
        <div className="card mb-4 flex items-center justify-between gap-3 bg-foreground p-4 text-background">
          <p className="text-sm font-semibold">{t("cup.joinToPlay")}</p>
          <Button asChild size="sm"><Link to={`/auth?mode=signup&next=${encodeURIComponent("/gulf-cup")}`}>{t("cup.join")}</Link></Button>
        </div>
      )}

      {isLoading ? <CardSkeletons /> : (fixtures ?? []).length === 0 ? (
        <EmptyState icon={<Trophy className="h-5 w-5" />} title={t("cup.none")} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {(fixtures ?? []).map((f) => (
            <div key={f.id} className="card p-3">
              <p className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span className="truncate">{formatDateTime(f.kickoff_at, { weekday: "long", day: "numeric", month: "short" })}</span>
                <span className="scoreboard text-sm font-semibold text-foreground">{formatDateTime(f.kickoff_at, { hour: "2-digit", minute: "2-digit", hour12: false })}</span>
              </p>
              <PredictionInput fixture={f} compact bare />
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={share}><Share2 />{t("cup.challenge")}</Button>
        <Button asChild variant="outline"><a href={whatsappShare(`${invite} ${url}`)} target="_blank" rel="noreferrer"><MessageCircle />WhatsApp</a></Button>
      </div>

      <h2 className="mb-2 mt-8 text-lg font-bold">{t("cup.board")}</h2>
      {(board ?? []).length === 0 ? (
        <EmptyState title={t("league.empty")} />
      ) : (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-[2rem_1fr_3rem_3rem] gap-2 border-b bg-surface px-4 py-2.5 eyebrow">
            <span>#</span><span>{t("league.fan")}</span><span className="text-end">{t("league.pts")}</span><span className="text-end">{t("league.exact")}</span>
          </div>
          {(board ?? []).map((r, i) => (
            <div key={r.user_id} className={cn("grid grid-cols-[2rem_1fr_3rem_3rem] items-center gap-2 border-b px-4 py-3 text-sm last:border-0", r.user_id === user?.id && "bg-brand-soft")}>
              <span className={cn("scoreboard flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold", i === 0 ? "bg-gold text-accent-foreground" : "text-muted-foreground")}>{i + 1}</span>
              <span className="flex min-w-0 items-center gap-2"><Initials name={r.name} className="h-7 w-7" /><span className="truncate font-medium">{r.name}</span></span>
              <span className="scoreboard text-end text-lg font-bold">{r.points}</span>
              <span className="scoreboard text-end text-lg text-muted-foreground">{r.exact}</span>
            </div>
          ))}
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">{t("cup.rules")}</p>
    </AppShell>
  );
}
