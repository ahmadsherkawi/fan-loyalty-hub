import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, BookmarkCheck, ChevronDown, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Item = { fixture_id: string; home: string; away: string; competition_code: string; kickoff_at: string; line_en: string; line_ar: string };
type Week = { week_id: string | null; week_start: string; items: Item[] | null; saved: boolean; next_open: string };

function Lines({ items }: { items: Item[] }) {
  const { lang } = useI18n();
  return (
    <ul className="divide-y">
      {items.map((it) => (
        <li key={it.fixture_id} className="py-2.5">
          <p className="text-xs font-semibold text-muted-foreground" dir="auto">{it.home} v {it.away}</p>
          <p className="mt-0.5 text-sm" dir="auto">{lang === "ar" ? it.line_ar : it.line_en}</p>
        </li>
      ))}
    </ul>
  );
}

/**
 * The weekly pundit: one analysis per league per week, one short line per game. The first member to press it
 * writes it (one AI call), and every member then sees the same analysis until Monday (UAE time). Fans can save a week.
 */
export function LeaguePundit({ code, fixtureIds }: { code: string; fixtureIds: string[] }) {
  const { t, formatDateTime } = useI18n();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  const { data: week } = useQuery({
    queryKey: ["pundit-week", code],
    queryFn: async () => (((await supabase.rpc("league_pundit" as never, { p_code: code } as never)).data ?? []) as unknown as Week[])[0] ?? null,
  });
  const { data: saved } = useQuery({
    queryKey: ["pundit-saved", code],
    queryFn: async () => ((await supabase.rpc("league_pundit_saved" as never, { p_code: code } as never)).data ?? []) as unknown as { week_id: string; week_start: string; items: Item[] }[],
  });
  const nextOpen = week?.next_open ? formatDateTime(`${week.next_open}T12:00:00Z`, { weekday: "long", day: "numeric", month: "short" }) : "";
  const refresh = () => { qc.invalidateQueries({ queryKey: ["pundit-week", code] }); qc.invalidateQueries({ queryKey: ["pundit-saved", code] }); };

  async function ask() {
    setBusy(true);
    const { error } = await supabase.functions.invoke("league-pundit", { body: { league_code: code, fixture_ids: fixtureIds } });
    setBusy(false);
    if (error) {
      let reason = "";
      try { reason = (await (error as { context?: Response }).context?.json())?.error ?? ""; } catch { /* not JSON */ }
      toast.error(t(reason === "no_games" ? "pundit.noGames" : reason === "busy" ? "pundit.busy" : "pundit.failed"));
    }
    refresh();
  }
  async function setSaved(weekId: string, on: boolean) {
    const { error } = await supabase.rpc("save_league_pundit" as never, { p_week: weekId, p_saved: on } as never);
    if (error) return toast.error(error.message);
    toast.success(t(on ? "pundit.saved" : "pundit.unsaved"));
    refresh();
  }

  return (
    <div className="card mt-4 p-4">
      <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-brand" /><p className="font-bold">{t("pundit.title")}</p></div>
      {week?.items?.length ? (
        <>
          <Lines items={week.items} />
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">{t("pundit.nextOn", { date: nextOpen })}</p>
            <Button size="sm" variant={week.saved ? "secondary" : "default"} onClick={() => setSaved(week.week_id!, !week.saved)}>
              {week.saved ? <BookmarkCheck /> : <Bookmark />}{t(week.saved ? "pundit.savedBtn" : "pundit.save")}
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted-foreground">{t("pundit.body")}</p>
          <Button className="mt-3 w-full" onClick={ask} disabled={busy || !fixtureIds.length || !week}>{busy ? t("pundit.thinking") : t("pundit.cta")}</Button>
        </>
      )}

      {(saved ?? []).length > 0 && (
        <div className="mt-3 border-t pt-2">
          <button onClick={() => setShowSaved((s) => !s)} className="flex w-full items-center gap-2 py-1 text-start text-sm font-semibold" aria-expanded={showSaved}>
            <span className="flex-1">{t("pundit.savedList", { n: saved!.length })}</span>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showSaved && "rotate-180")} />
          </button>
          {showSaved && saved!.map((n) => (
            <div key={n.week_id} className="mt-2 rounded-xl bg-surface px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold">{t("pundit.weekOf", { date: formatDateTime(`${n.week_start}T12:00:00Z`, { day: "numeric", month: "short" }) })}</p>
                <button onClick={() => setSaved(n.week_id, false)} className="text-xs font-semibold text-muted-foreground underline">{t("pundit.remove")}</button>
              </div>
              <Lines items={n.items} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
