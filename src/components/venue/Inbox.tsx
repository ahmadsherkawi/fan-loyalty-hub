import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { EmptyState, Initials } from "@/components/common/bits";
import { useI18n } from "@/i18n/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { relativeTime } from "@/components/notify/notifications";
import { ChatThread } from "./ChatThread";
import { cn } from "@/lib/utils";

type Row = { id: string; user_id: string; full_name: string | null; last_message_at: string; venue_unread: number; last_body: string | null };

export function Inbox({ venueId, venueName, initialThread }: { venueId: string; venueName: string; initialThread?: string | null }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState<string | null>(initialThread ?? null);
  const { data } = useQuery({
    queryKey: ["venue-inbox", venueId],
    refetchInterval: 15_000,
    queryFn: async () => ((await supabase.rpc("venue_inbox", { p_venue: venueId })).data ?? []) as unknown as Row[],
  });
  const current = data?.find((r) => r.id === open);
  if (open) return (
    <div className="card flex h-[60vh] flex-col p-3">
      <button onClick={() => setOpen(null)} className="mb-2 flex items-center gap-2 border-b pb-2 text-sm font-bold"><ArrowLeft className="h-4 w-4 rtl:rotate-180" />{current?.full_name ?? t("chat.fan")}</button>
      <ChatThread venueId={venueId} threadId={open} asVenue venueName={venueName} />
    </div>
  );
  if (!data?.length) return <EmptyState icon={<MessageCircle className="h-5 w-5" />} title={t("chat.inboxEmpty")} body={t("chat.inboxEmptyBody")} />;
  return (
    <div className="card divide-y overflow-hidden">
      {data.map((r) => (
        <button key={r.id} onClick={() => setOpen(r.id)} className={cn("flex w-full items-center gap-3 px-4 py-3 text-start hover:bg-surface", r.venue_unread > 0 && "bg-brand-soft/40")}>
          <Initials name={r.full_name} />
          <div className="min-w-0 flex-1">
            <p className={cn("truncate text-sm", r.venue_unread ? "font-bold" : "font-medium")}>{r.full_name ?? t("chat.fan")}</p>
            <p className="truncate text-xs text-muted-foreground">{r.last_body}</p>
          </div>
          <div className="text-end">
            <p className="text-[11px] text-muted-foreground">{relativeTime(r.last_message_at, lang)}</p>
            {r.venue_unread > 0 && <span className="scoreboard mt-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold">{r.venue_unread}</span>}
          </div>
        </button>
      ))}
    </div>
  );
}
