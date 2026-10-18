import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, BookmarkCheck, ChevronDown, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Item = { fixture_id: string; home: string; away: string; competition_code: string; kickoff_at: string; line: string };
type Note = { id: string; week_start: string; items: Item[]; saved: boolean };

function NoteLines({ items }: { items: Item[] }) {
  return (
    <ul className="divide-y">
      {items.map((it) => (
        <li key={it.fixture_id} className="py-2.5">
          <p className="text-xs font-semibold text-muted-foreground" dir="auto">{it.home} v {it.away}</p>
          <p className="mt-0.5 text-sm" dir="auto">{it.line}</p>
        </li>
      ))}
    </ul>
  );
}

/**
 * The weekly pundit: one press per week per league gives one short line per game shown on the league page.
 * The analysis shows once; fans save it to come back to it later. It opens again on Monday (UAE time).
 */
export function LeaguePundit({ code, fixtureIds }: { code: string; fixtureIds: string[] }) {
  const { t, lang, formatDateTime } = useI18n();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note | null>(null);
  const [showSaved, setShowSaved] = useState(false);

  const { data: status } = useQuery({
    queryKey: ["pundit-status", code],
    queryFn: async () => (((await supabase.rpc("pundit_week_status" as never, { p_code: code } as never)).data ?? []) as unknown as { used: boolean; next_open: string }[])[0] ?? null,
  });
  const { data: saved } = useQuery({
    queryKey: ["pundit-saved", code],
    queryFn: async () => ((await supabase.from("league_pundit_notes" as never).select("id, week_start, items, saved").eq("league_code", code).eq("saved", true)
      .order("week_start", { ascending: false }).limit(12)).data ?? []) as unknown as Note[],
  });
  const nextOpen = status?.next_open ? formatDateTime(`${status.next_open}T12:00:00Z`, { weekday: "long", day: "numeric", month: "short" }) : "";

  async function ask() {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("league-pundit", { body: { league_code: code, fixture_ids: fixtureIds, lang } });
    setBusy(false);
    if (error) {
      let reason = "";
      try { reason = (await (error as { context?: Response }).context?.json())?.error ?? ""; } catch { /* not JSON */ }
      qc.invalidateQueries({ queryKey: ["pundit-status", code] });
      return toast.error(t(reason === "used" ? "pundit.used" : reason === "no_games" ? "pundit.noGames" : reason === "busy" ? "pundit.busy" : "pundit.failed", { date: nextOpen }));
    }
    setNote(data.note as Note);
    qc.invalidateQueries({ queryKey: ["pundit-status", code] });
  }
  async function toggleSave(n: Note) {
    const { error } = await supabase.rpc("set_pundit_saved" as never, { p_id: n.id, p_saved: !n.saved } as never);
    if (error) return toast.error(error.message);
    if (note?.id === n.id) setNote({ ...n, saved: !n.saved });
    toast.success(t(n.saved ? "pundit.unsaved" : "pundit.saved"));
    qc.invalidateQueries({ queryKey: ["pundit-saved", code] });
  }

  return (
    <div className="card mt-4 p-4">
      <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-brand" /><p className="font-bold">{t("pundit.title")}</p></div>
      {note ? (
        <>
          <NoteLines items={note.items} />
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">{t("pundit.nextOn", { date: nextOpen })}</p>
            <Button size="sm" variant={note.saved ? "secondary" : "default"} onClick={() => toggleSave(note)}>
              {note.saved ? <BookmarkCheck /> : <Bookmark />}{t(note.saved ? "pundit.savedBtn" : "pundit.save")}
            </Button>
          </div>
        </>
      ) : status?.used ? (
        <p className="mt-1 text-sm text-muted-foreground">{t("pundit.usedThisWeek", { date: nextOpen })}</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted-foreground">{t("pundit.body")}</p>
          <Button className="mt-3 w-full" onClick={ask} disabled={busy || !fixtureIds.length}>{busy ? t("pundit.thinking") : t("pundit.cta")}</Button>
        </>
      )}

      {(saved ?? []).length > 0 && (
        <div className="mt-3 border-t pt-2">
          <button onClick={() => setShowSaved((s) => !s)} className="flex w-full items-center gap-2 py-1 text-start text-sm font-semibold" aria-expanded={showSaved}>
            <span className="flex-1">{t("pundit.savedList", { n: saved!.length })}</span>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showSaved && "rotate-180")} />
          </button>
          {showSaved && saved!.map((n) => (
            <div key={n.id} className="mt-2 rounded-xl bg-surface px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold">{t("pundit.weekOf", { date: formatDateTime(`${n.week_start}T12:00:00Z`, { day: "numeric", month: "short" }) })}</p>
                <button onClick={() => toggleSave(n)} className="text-xs font-semibold text-muted-foreground underline">{t("pundit.remove")}</button>
              </div>
              <NoteLines items={n.items} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
