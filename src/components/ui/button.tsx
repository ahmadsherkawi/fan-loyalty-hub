import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary gradient (emerald)
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        primary: "gradient-stadium text-white shadow-stadium hover:opacity-90 hover:shadow-lg",
        
        // Gold accent gradient
        accent: "gradient-golden text-accent-foreground shadow-golden hover:opacity-90",
        
        // Outline variants
        outline: "border border-border bg-transparent hover:bg-card hover:border-primary/30",
        outlinePrimary: "border border-primary/30 bg-transparent hover:bg-primary/10 text-primary",
        
        // Ghost variants
        ghost: "bg-transparent hover:bg-card/60 text-muted-foreground hover:text-foreground",
        ghostPrimary: "bg-transparent hover:bg-primary/10 text-primary",
        
        // Secondary
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        
        // Destructive
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        
        // Link
        link: "text-primary underline-offset-4 hover:underline",
        
        // Pill variants (for navigation)
        pill: "rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10",
        pillActive: "rounded-full bg-primary/20 text-white border border-primary/30",
        
        // Glass variants
        glass: "glass-dark rounded-xl text-white hover:bg-white/10",
        glassLight: "glass rounded-xl text-foreground hover:bg-white/80",
      },
      size: {
        xs: "h-7 px-3 text-xs rounded-lg",
        sm: "h-9 px-4 text-sm rounded-xl",
        default: "h-10 px-5 rounded-xl",
        lg: "h-12 px-8 text-base rounded-xl",
        xl: "h-14 px-10 text-lg rounded-2xl",
        icon: "h-10 w-10 rounded-xl",
        iconSm: "h-8 w-8 rounded-lg",
        iconLg: "h-12 w-12 rounded-xl",
      },
      rounded: {
        default: "rounded-xl",
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
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, rounded, className }))}
        ref={ref}
        disabled={loading || disabled}
        {...props}
      >
        {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
        {children}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
