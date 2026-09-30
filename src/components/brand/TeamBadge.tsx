import { cn } from "@/lib/utils";

interface Props {
  shortName: string;
  primary?: string | null;
  secondary?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = { xs: "h-6 w-5 text-[7px]", sm: "h-8 w-7 text-[9px]", md: "h-12 w-10 text-[11px]", lg: "h-16 w-14 text-sm", xl: "h-20 w-[4.25rem] text-base" };

/** Generic shield in team colours — never an official crest. Colours come from data, so inline styles are intentional. */
export function TeamBadge({ shortName, primary, secondary, size = "md", className }: Props) {
  const p = primary || "#00C566";
  const s = secondary || "#FFFFFF";
  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center", sizes[size], className)} aria-label={shortName}>
      <svg viewBox="0 0 40 48" className="absolute inset-0 h-full w-full drop-shadow-[0_1px_1.5px_rgba(11,18,32,0.25)]">
        <path d="M20 2 L37 8 V24 C37 35 29 42 20 46 C11 42 3 35 3 24 V8 Z" fill={p} stroke={s} strokeWidth="2.5" />
        <path d="M20 2 L20 46" stroke={s} strokeOpacity="0.25" strokeWidth="6" />
      </svg>
      <span className="relative font-display font-bold uppercase tracking-tight" style={{ color: s }} dir="ltr">
        {shortName.slice(0, 4)}
      </span>
    </span>
  );
}
