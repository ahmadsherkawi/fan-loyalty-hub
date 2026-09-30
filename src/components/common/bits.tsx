import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/i18n/I18nContext";
import { cn } from "@/lib/utils";

/** Quiet grey tag for sample data — present but never loud. */
export function DemoChip({ show }: { show?: boolean | null }) {
  const { t } = useI18n();
  if (!show) return null;
  return <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t("common.demo")}</span>;
}

/** Red pulsing LIVE tag. */
export function LivePill({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-live px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white", className)}>
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />{t("match.live")}
    </span>
  );
}

/** Marks every AI feature the same way, so fans learn to spot it. */
export function AiTag({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-ai-soft px-2 py-0.5 text-[11px] font-bold text-ai", className)}>
      <Sparkles className="h-3 w-3" />AI
    </span>
  );
}

export function Section({ title, icon, action, children, className }: { title: string; icon?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("mt-9", className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold">{icon}{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** "See all ›" link used in section headers. */
export function SeeAll({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-0.5 text-sm font-semibold text-brand hover:underline">
      {label}<ChevronRight className="h-4 w-4 rtl:rotate-180" />
    </Link>
  );
}

export function EmptyState({ icon, title, body, cta, action }: { icon?: ReactNode; title: string; body?: string; cta?: { to: string; label: string }; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed bg-surface px-6 py-9 text-center">
      {icon && <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-card text-foreground shadow-card">{icon}</div>}
      <p className="font-display text-base font-bold">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>}
      {cta && <Button asChild className="mt-5"><Link to={cta.to}>{cta.label}</Link></Button>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function CardSkeletons({ n = 3, className }: { n?: number; className?: string }) {
  return <div className={cn("grid gap-3", className)}>{Array.from({ length: n }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl bg-muted" />)}</div>;
}

export function Chip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className={cn("h-9 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors",
      active ? "border-foreground bg-foreground text-background" : "bg-card text-muted-foreground hover:text-foreground")}>
      {children}
    </button>
  );
}

export function Initials({ name, className }: { name?: string | null; className?: string }) {
  const s = (name || "?").trim().split(/[\s@.]+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return <span className={cn("inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground ring-2 ring-background", className)}>{s}</span>;
}

/** Big number + small label, used for stats everywhere. */
export function Stat({ value, label, className }: { value: ReactNode; label: string; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="scoreboard text-3xl font-bold leading-none">{value}</p>
      <p className="mt-1 truncate text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

/** Icon in a soft circle; tone decides the colour family. */
export function IconDot({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "brand" | "gold" | "ai"; className?: string }) {
  const tones = { neutral: "bg-muted text-foreground", brand: "bg-brand-soft text-brand", gold: "bg-gold-soft text-gold-ink", ai: "bg-ai-soft text-ai" };
  return <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full [&_svg]:h-5 [&_svg]:w-5", tones[tone], className)}>{children}</span>;
}

/** Header row used by every feature card (prediction, pundit, quiz…). */
export function FeatureHeader({ icon, tone = "neutral", title, sub, ai, action }: { icon: ReactNode; tone?: "neutral" | "brand" | "gold" | "ai"; title: string; sub?: string; ai?: boolean; action?: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <IconDot tone={tone}>{icon}</IconDot>
      <div className="min-w-0 flex-1">
        <h3 className="flex items-center gap-2 font-bold">{title}{ai && <AiTag />}</h3>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
