import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { relativeTime } from "@/components/notify/notifications";
import { cn } from "@/lib/utils";

type Msg = { id: string; body: string; from_venue: boolean; created_at: string; sender_id: string };

/**
 * One conversation between a fan and a venue. Fans open it from the venue page (asVenue=false);
 * the venue answers from its dashboard inbox (asVenue=true, threadId required).
 */
export function ChatThread({ venueId, threadId, asVenue, venueName }: { venueId: string; threadId?: string | null; asVenue: boolean; venueName: string }) {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);
  const { data: thread } = useQuery({
    queryKey: ["thread", venueId, threadId ?? user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (threadId) return { id: threadId };
      return (await supabase.from("venue_threads").select("id").eq("venue_id", venueId).eq("user_id", user!.id).maybeSingle()).data;
    },
  });
  const { data: msgs } = useQuery({
    queryKey: ["thread-msgs", thread?.id],
    enabled: !!thread?.id,
    refetchInterval: 6_000,
    queryFn: async () => ((await supabase.from("venue_messages").select("*").eq("thread_id", thread!.id).order("created_at")).data ?? []) as Msg[],
  });
  useEffect(() => { const b = boxRef.current; if (b) b.scrollTop = b.scrollHeight; }, [msgs]);
  useEffect(() => { if (thread?.id) supabase.rpc("mark_thread_read", { p_thread: thread.id }).then(() => qc.invalidateQueries({ queryKey: ["venue-inbox", venueId] })); }, [thread?.id, msgs?.length, qc, venueId]);

  async function send() {
    const body = text.trim();
    if (!body) return;
    setText("");
    const { error } = await supabase.rpc("send_venue_message", { p_venue: venueId, p_body: body, p_thread: asVenue ? threadId ?? null : null });
    if (error) { setText(body); return toast.error(error.message.includes("slow") ? t("wall.slow") : t("common.error")); }
    qc.invalidateQueries({ queryKey: ["thread", venueId] });
    qc.invalidateQueries({ queryKey: ["thread-msgs"] });
  }

  return (
    <div className="flex h-full flex-col">
      <div ref={boxRef} className="min-h-48 flex-1 space-y-2 overflow-y-auto p-1">
        {!(msgs ?? []).length && <p className="py-8 text-center text-sm text-muted-foreground">{asVenue ? "" : t("chat.start", { venue: venueName })}</p>}
        {(msgs ?? []).map((m) => {
          const mine = m.from_venue === asVenue;
          return (
            <div key={m.id} className={cn("max-w-[85%] rounded-2xl px-3 py-2 text-sm", mine ? "ms-auto rounded-ee-md bg-foreground text-background" : "rounded-es-md bg-surface")}>
              <p className="whitespace-pre-line">{m.body}</p>
              <p className={cn("mt-0.5 text-[10px]", mine ? "text-background/60" : "text-muted-foreground")}>{relativeTime(m.created_at, lang)}</p>
            </div>
          );
        })}
      </div>
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <Input value={text} onChange={(e) => setText(e.target.value.slice(0, 1000))} placeholder={t("chat.placeholder")} />
        <Button type="submit" size="icon" className="h-11 w-11 shrink-0" disabled={!text.trim()} aria-label={t("pundit.send")}><Send className="rtl:rotate-180" /></Button>
      </form>
    </div>
  );
}
