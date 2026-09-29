import { cn } from "@/lib/utils";

export function JamhoorMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-8 w-8", className)} aria-hidden="true">
      <rect width="64" height="64" rx="14" className="fill-card" />
      <path d="M14 18l8 10M50 18l-8 10" className="stroke-accent" strokeWidth="3" strokeLinecap="round" />
      <circle cx="13" cy="16" r="3" className="fill-accent" />
      <circle cx="51" cy="16" r="3" className="fill-accent" />
      <circle cx="20" cy="42" r="6" className="fill-primary" />
      <circle cx="32" cy="38" r="7" className="fill-primary" />
      <circle cx="44" cy="42" r="6" className="fill-primary" />
      <path d="M8 54c4-6 10-8 12-8s8 2 12-2c4 4 10 2 12 2s8 2 12 8z" className="fill-primary" />
    </svg>
  );
}

export function Wordmark({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)} dir="ltr">
      <JamhoorMark />
      <span className="flex items-baseline gap-1.5 leading-none">
        <span className="font-display text-xl font-bold tracking-tight">Jamhoor</span>
        {!compact && <span className="hidden min-[400px]:inline font-arabic text-base font-semibold text-accent">جمهور</span>}
      </span>
    </span>
  );
}
