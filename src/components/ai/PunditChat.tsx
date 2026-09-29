import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Msg = { id: string; role: string; content: string };

export function PunditChat({ fixtureId, partyId, homeName, awayName }: { fixtureId: string; partyId?: string; homeName: string; awayName: string }) {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const key = ["ai-messages", fixtureId, user?.id];
  const { data: messages } = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: async () => ((await supabase.from("ai_messages").select("id, role, content").eq("fixture_id", fixtureId).order("created_at")).data ?? []) as Msg[],
  });
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages, pending]);

  const suggestions = [
    t("pundit.s1", { home: homeName, away: awayName }),
    t("pundit.s2"),
    t("pundit.s3"),
  ];

  async function ask(q: string) {
    const message = q.trim();
    if (!message || busy) return;
    setBusy(true); setErr(null); setPending(message); setText("");
    const { data, error } = await supabase.functions.invoke("jamhoor-ai", { body: { action: "pundit", fixture_id: fixtureId, watch_party_id: partyId, message, lang } });
    setBusy(false); setPending(null);
    if (error || (data as { error?: string })?.error) { setErr((data as { error?: string })?.error ?? t("pundit.error")); return; }
    qc.invalidateQueries({ queryKey: key });
  }

  if (!user) return null;
  return (
    <div className="rounded-3xl border bg-card p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-accent"><Sparkles className="h-5 w-5" /></span>
        <div>
          <h3 className="font-semibold">{t("pundit.title")}</h3>
          <p className="text-xs text-muted-foreground">{t("pundit.sub")}</p>
        </div>
      </div>
      <div className="mt-4 max-h-80 space-y-3 overflow-y-auto">
        {(messages ?? []).map((m) => (
          <div key={m.id} className={cn("max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm", m.role === "user" ? "ms-auto bg-primary text-primary-foreground" : "bg-secondary")}>{m.content}</div>
        ))}
        {pending && <div className="ms-auto max-w-[85%] rounded-2xl bg-primary px-3 py-2 text-sm text-primary-foreground">{pending}</div>}
        {busy && <div className="flex w-16 gap-1 rounded-2xl bg-secondary px-3 py-3">{[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: `${i * 120}ms` }} />)}</div>}
        {err && <p className="text-sm text-destructive">{err}</p>}
        <div ref={endRef} />
      </div>
      {(messages ?? []).length === 0 && !pending && (
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((s) => <button key={s} onClick={() => ask(s)} className="rounded-full border bg-background px-3 py-1.5 text-xs hover:border-primary">{s}</button>)}
        </div>
      )}
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); ask(text); }}>
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={t("pundit.placeholder")} className="rounded-full" maxLength={500} />
        <Button type="submit" size="icon" className="shrink-0 rounded-full" disabled={busy || !text.trim()} aria-label={t("pundit.send")}><Send className="h-4 w-4 rtl:rotate-180" /></Button>
      </form>
      <p className="mt-2 text-[11px] text-muted-foreground">{t("pundit.disclaimer")}</p>
    </div>
  );
}
