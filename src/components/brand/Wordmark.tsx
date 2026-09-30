import { cn } from "@/lib/utils";

/** Jamhoor mark: an ink tile, two floodlights and a green crowd. */
export function JamhoorMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-8 w-8", className)} aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#0B1220" />
      <path d="M13 13l9 11M51 13l-9 11" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round" />
      <circle cx="12" cy="12" r="3.5" fill="#FFFFFF" />
      <circle cx="52" cy="12" r="3.5" fill="#FFFFFF" />
      <circle cx="21" cy="39" r="5.5" fill="#00C566" />
      <circle cx="32" cy="35" r="6.5" fill="#00C566" />
      <circle cx="43" cy="39" r="5.5" fill="#00C566" />
      <path d="M9 55c3-7 8-9 12-9 4 0 7 2 11-2 4 4 7 2 11 2 4 0 9 2 12 9z" fill="#00C566" />
    </svg>
  );
}

export function Wordmark({ className, compact, invert }: { className?: string; compact?: boolean; invert?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)} dir="ltr">
      <JamhoorMark />
      <span className={cn("flex items-baseline gap-1.5 leading-none", invert ? "text-white" : "text-foreground")}>
        <span className="font-display text-[19px] font-extrabold tracking-tight">Jamhoor</span>
        {!compact && <span className={cn("hidden font-arabic text-sm font-semibold min-[400px]:inline", invert ? "text-white/60" : "text-muted-foreground")}>جمهور</span>}
      </span>
    </span>
  );
}
