import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Clock, MessageCircle, Utensils, Award, Bell, CalendarCheck2, CalendarX2, Gift, Megaphone, PartyPopper, Stamp, Ticket, TicketCheck, Tv, Users } from "lucide-react";
import { IconDot } from "@/components/common/bits";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import type { TKey } from "@/i18n/en";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications, type Notification } from "@/lib/data";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "brand" | "gold" | "ai";
const KINDS: Record<string, { icon: ReactNode; tone: Tone }> = {
  booking_request: { icon: <CalendarCheck2 />, tone: "neutral" },
  reservations: { icon: <Ticket />, tone: "brand" },
  booking_confirmed: { icon: <TicketCheck />, tone: "brand" },
  booking_declined: { icon: <CalendarX2 />, tone: "neutral" },
  seat_confirmed: { icon: <TicketCheck />, tone: "brand" },
  new_party: { icon: <Tv />, tone: "neutral" },
  waitlist_promoted: { icon: <PartyPopper />, tone: "brand" },
  announcement: { icon: <Megaphone />, tone: "neutral" },
  badge_earned: { icon: <Award />, tone: "gold" },
  reward_unlocked: { icon: <Gift />, tone: "gold" },
  reward_redeemed: { icon: <Gift />, tone: "gold" },
  cap_earned: { icon: <Stamp />, tone: "gold" },
  moved_to_waitlist: { icon: <Clock />, tone: "neutral" },
  table_request: { icon: <Utensils />, tone: "neutral" },
  table_confirmed: { icon: <Utensils />, tone: "brand" },
  table_declined: { icon: <Utensils />, tone: "neutral" },
  table_cancelled: { icon: <Utensils />, tone: "neutral" },
  venue_message: { icon: <MessageCircle />, tone: "neutral" },
  venue_reply: { icon: <MessageCircle />, tone: "brand" },
  party_rsvps: { icon: <Ticket />, tone: "brand" },
  party_cancelled: { icon: <CalendarX2 />, tone: "neutral" },
  venue_declined_fan: { icon: <CalendarX2 />, tone: "neutral" },
};

export function useUnreadCount() {
  const { user } = useAuth();
  const { data } = useNotifications(user?.id);
  return (data ?? []).filter((n) => !n.read_at).length;
}

export function NotificationBell() {
  const { t } = useI18n();
  const n = useUnreadCount();
  return (
    <Link to="/notifications" aria-label={t("notif.title")} className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border bg-card transition-colors hover:bg-muted">
      <Bell className="h-4 w-4" />
      {n > 0 && <span className="scoreboard absolute -end-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-live px-1 text-[11px] font-bold text-white ring-2 ring-background">{n > 9 ? "9+" : n}</span>}
    </Link>
  );
}

/** Turns a stored notification into a localized title + body. */
export function useNotificationText() {
  const { t, lang, formatDateTime } = useI18n();
  return (n: Notification) => {
    const d = n.data as Record<string, string | number | null>;
    const pick = (k: string) => String((lang === "ar" && d[`${k}_ar`]) || d[k] || "");
    const when = d.kickoff ? formatDateTime(String(d.kickoff), { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
    const vars = {
      group: pick("group"), venue: pick("venue"),
      match: lang === "ar" ? String(d.match_ar || String(d.match ?? "").replace(" v ", " ضد ")) : String(d.match ?? ""), when, title: pick("title"), body: pick("body"),
      latest: String(d.latest ?? ""), seats: String(d.seats ?? 0), n: String(d.new_count ?? 1), reservations: String(d.reservations ?? 0),
      caps: String(d.caps ?? d.min_caps ?? ""), area: String(d.area ?? ""), note: String(d.note ?? ""),
      badge: d.badge ? t(`badge.${d.badge}` as TKey) : "", capacity: String(d.capacity ?? "—"),
      size: String(d.size ?? ""), fan: String(d.fan ?? ""), reply: d.reply ? `· “${d.reply}”` : "",
    };
    const k = n.kind === "booking_request" && d.changed ? "booking_changed" : n.kind === "announcement" && !vars.title ? "announcement_notitle" : n.kind;
    const title = t(`notif.${k}.t` as TKey, vars);
    let body = t(`notif.${k}.b` as TKey, vars);
    if (k === "booking_confirmed" && vars.area) body += ` · ${vars.area}`;
    if (k === "booking_declined" && vars.note) body = vars.note;
    // Tidy separators left behind by empty values (e.g. a table request without a specific match)
    body = body.replace(/(\s*·\s*)+$/, "").replace(/^\s*·\s*/, "").replace(/·\s*·/g, "·").trim();
    return { title: title.replace(/(\s*·\s*)+$/, ""), body };
  };
}

export function relativeTime(iso: string, lang: string) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(lang === "ar" ? "ar" : "en", { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  return rtf.format(Math.round(diff / 86400), "day");
}

export function NotificationList({ items, compact }: { items: Notification[]; compact?: boolean }) {
  const { lang } = useI18n();
  const text = useNotificationText();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  async function open(n: Notification) {
    if (!n.read_at) {
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id);
      qc.invalidateQueries({ queryKey: ["notifications", user?.id] });
    }
    if (n.link) navigate(n.link);
  }
  return (
    <div className="card divide-y overflow-hidden">
      {items.map((n) => {
        const k = KINDS[n.kind] ?? { icon: <Users />, tone: "neutral" as Tone };
        const { title, body } = text(n);
        return (
          <button key={n.id} onClick={() => open(n)} className={cn("flex w-full items-start gap-3 px-4 py-3.5 text-start transition-colors hover:bg-surface", !n.read_at && "bg-brand-soft/40")}>
            <IconDot tone={k.tone} className="h-9 w-9">{k.icon}</IconDot>
            <div className="min-w-0 flex-1">
              <p className={cn("text-sm", n.read_at ? "font-medium" : "font-bold")}>{title}</p>
              {body && <p className={cn("mt-0.5 text-sm text-muted-foreground", compact && "line-clamp-1")}>{body}</p>}
              <p className="mt-1 text-xs text-muted-foreground">{relativeTime(n.updated_at, lang)}</p>
            </div>
            {!n.read_at && <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}
