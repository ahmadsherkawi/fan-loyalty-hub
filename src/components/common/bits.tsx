import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/i18n/I18nContext";
import { cn } from "@/lib/utils";

export function DemoChip({ show }: { show?: boolean | null }) {
  const { t } = useI18n();
  if (!show) return null;
  return <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">{t("common.demo")}</span>;
}

export function Section({ title, icon, action, children, className }: { title: string; icon?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("mt-8", className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">{icon}{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ icon, title, body, cta }: { icon?: ReactNode; title: string; body?: string; cta?: { to: string; label: string } }) {
  return (
    <div className="rounded-3xl border border-dashed bg-card/50 p-8 text-center">
      {icon && <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">{icon}</div>}
      <p className="font-display font-semibold">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>}
      {cta && <Button asChild className="mt-4 rounded-full"><Link to={cta.to}>{cta.label}</Link></Button>}
    </div>
  );
}

export function CardSkeletons({ n = 3, className }: { n?: number; className?: string }) {
  return <div className={cn("grid gap-3", className)}>{Array.from({ length: n }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>;
}

export function Chip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
      active ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground")}>
      {children}
    </button>
  );
}

export function Initials({ name, className }: { name?: string | null; className?: string }) {
  const s = (name || "?").trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return <span className={cn("inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold ring-2 ring-background", className)}>{s}</span>;
}
