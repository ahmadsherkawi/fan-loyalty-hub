import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary action: pitch green with ink text (8:1 contrast)
        default: "bg-primary text-primary-foreground shadow-sm hover:brightness-95 active:scale-[0.98]",
        primary: "bg-primary text-primary-foreground shadow-sm hover:brightness-95 active:scale-[0.98]",
        // Strong neutral action: ink
        ink: "bg-foreground text-background hover:bg-foreground/90 active:scale-[0.98]",
        accent: "bg-gold text-accent-foreground hover:brightness-95",
        outline: "border border-input bg-card text-foreground hover:bg-muted",
        outlinePrimary: "border border-brand/30 bg-card text-brand hover:bg-brand-soft",
        ghost: "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
        ghostPrimary: "bg-transparent text-brand hover:bg-brand-soft",
        secondary: "bg-muted text-foreground hover:bg-muted/70",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        link: "text-brand underline-offset-4 hover:underline",
        ai: "bg-ai text-white hover:bg-ai/90 active:scale-[0.98]",
      },
      size: {
        xs: "h-7 px-3 text-xs rounded-full",
        sm: "h-9 px-4 text-sm rounded-full",
        default: "h-11 px-5 rounded-full",
        lg: "h-12 px-7 text-base rounded-full",
        xl: "h-14 px-9 text-base rounded-full",
        icon: "h-10 w-10 rounded-full",
        iconSm: "h-8 w-8 rounded-full",
        iconLg: "h-12 w-12 rounded-full",
      },
      rounded: {
        default: "",
        full: "rounded-full",
        lg: "rounded-2xl",
        none: "rounded-none",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, rounded, asChild = false, loading, children, disabled, ...props }, ref) => {
    // When using asChild, we can't add extra elements (like loading spinner)
    // So we just pass through the loading state and let the parent handle it
    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, rounded, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, rounded, className }))}
        ref={ref}
        disabled={loading || disabled}
        {...props}
      >
        {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
