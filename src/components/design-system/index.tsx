/**
 * Fan Loyalty Hub - Enhanced UI Components
 * Sample implementations of the design system
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

// ============================================================
// ENHANCED BUTTON COMPONENT
// ============================================================

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "gradient-stadium text-white shadow-stadium hover:opacity-90 hover:shadow-lg",
        accent: "gradient-golden text-accent-foreground shadow-golden hover:opacity-90",
        outline: "border border-border bg-transparent hover:bg-card hover:border-primary/30",
        ghost: "bg-transparent hover:bg-card/60",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        link: "text-primary underline-offset-4 hover:underline",
        pill: "rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10",
        pillActive: "rounded-full bg-primary/20 text-white border border-primary/30",
        glass: "glass-dark rounded-xl text-white hover:bg-white/10",
      },
      size: {
        xs: "h-7 px-3 text-xs rounded-lg",
        sm: "h-9 px-4 text-sm rounded-xl",
        default: "h-10 px-5 rounded-xl",
        lg: "h-12 px-8 text-base rounded-xl",
        xl: "h-14 px-10 text-lg rounded-2xl",
        icon: "h-10 w-10 rounded-xl",
        iconSm: "h-8 w-8 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      disabled={loading || disabled}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };

// ============================================================
// ENHANCED CARD COMPONENT
// ============================================================

const cardVariants = cva(
  "relative overflow-hidden rounded-2xl transition-all duration-500",
  {
    variants: {
      variant: {
        default: "bg-card border border-border/50",
        stat: "bg-card border border-border/40",
        action: "bg-card border border-border/50 cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-primary/20",
        glass: "bg-white/60 dark:bg-black/30 backdrop-blur-xl border border-white/30 dark:border-white/10",
        bento: "bg-card border border-border/50 hover:border-primary/30 hover:shadow-lg",
        feature: "bg-gradient-to-br from-surface-1 to-surface-0 border border-border/30",
        disabled: "bg-card/50 border border-border/30 opacity-50 cursor-not-allowed",
      },
      padding: {
        none: "",
        sm: "p-4",
        default: "p-5",
        lg: "p-6",
        xl: "p-8",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "default",
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  gradientColor?: "primary" | "accent" | "purple" | "blue";
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, gradientColor, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, padding, className }))}
      {...props}
    >
      {gradientColor && (
        <div className={cn(
          "card-gradient-overlay",
          gradientColor === "primary" && "card-gradient-primary",
          gradientColor === "accent" && "card-gradient-accent",
          gradientColor === "purple" && "card-gradient-purple",
          gradientColor === "blue" && "card-gradient-blue"
        )} />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("title-card", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("", className)} {...props} />
));
CardContent.displayName = "CardContent";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, cardVariants };

// ============================================================
// TYPOGRAPHY COMPONENTS
// ============================================================

interface PageTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  accent?: string;
}

const PageTitle = React.forwardRef<HTMLHeadingElement, PageTitleProps>(
  ({ className, children, accent, ...props }, ref) => (
    <h1 ref={ref} className={cn("title-page", className)} {...props}>
      {children}
      {accent && (
        <>
          <br />
          <span className="text-gradient-hero">{accent}</span>
        </>
      )}
    </h1>
  )
);
PageTitle.displayName = "PageTitle";

interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

const SectionHeader = React.forwardRef<HTMLDivElement, SectionHeaderProps>(
  ({ className, children, icon, action, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center justify-between mb-4", className)}
      {...props}
    >
      <h2 className="title-section flex items-center gap-2">
        {icon}
        {children}
      </h2>
      {action}
    </div>
  )
);
SectionHeader.displayName = "SectionHeader";

const StatNumber = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, children, ...props }, ref) => (
  <span ref={ref} className={cn("text-stat", className)} {...props}>
    {children}
  </span>
));
StatNumber.displayName = "StatNumber";

const Label = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, children, ...props }, ref) => (
  <span ref={ref} className={cn("text-label", className)} {...props}>
    {children}
  </span>
));
Label.displayName = "Label";

export { PageTitle, SectionHeader, StatNumber, Label };

// ============================================================
// BADGE COMPONENTS
// ============================================================

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        hero: "bg-white/5 backdrop-blur-md border-white/10 text-xs font-semibold uppercase tracking-widest",
        section: "bg-primary/10 text-primary border-primary/20 text-[11px] font-semibold uppercase tracking-wider",
        success: "bg-green-500/10 text-green-400 border-green-500/20",
        warning: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
        error: "bg-red-500/10 text-red-400 border-red-500/20",
        info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

// ============================================================
// STAT CARD COMPONENT
// ============================================================

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  className?: string;
  gradientColor?: "primary" | "accent" | "purple" | "blue" | "orange";
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ icon, label, value, trend, trendValue, className, gradientColor = "primary" }, ref) => (
    <Card
      ref={ref}
      variant="stat"
      className={cn("group", className)}
      gradientColor={gradientColor}
    >
      <div className="relative z-10 pt-5 pb-4 px-4">
        <div className={cn(
          "mb-2.5 h-9 w-9 rounded-xl bg-card/80 border border-border/30 flex items-center justify-center",
          gradientColor === "primary" && "text-primary",
          gradientColor === "accent" && "text-accent",
          gradientColor === "purple" && "text-purple-400",
          gradientColor === "blue" && "text-blue-400",
          gradientColor === "orange" && "text-orange-400"
        )}>
          {icon}
        </div>
        <StatNumber>{value.toLocaleString()}</StatNumber>
        <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{label}</p>
        {trend && trendValue && (
          <p className={cn(
            "text-xs mt-1",
            trend === "up" && "text-green-500",
            trend === "down" && "text-red-500",
            trend === "neutral" && "text-muted-foreground"
          )}>
            {trend === "up" && "↑"}
            {trend === "down" && "↓"}
            {trendValue}
          </p>
        )}
      </div>
    </Card>
  )
);
StatCard.displayName = "StatCard";

export { StatCard };

// ============================================================
// HERO SECTION COMPONENTS
// ============================================================

interface HeroBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
}

const HeroBadge = React.forwardRef<HTMLDivElement, HeroBadgeProps>(
  ({ className, children, icon, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "inline-flex items-center gap-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-full px-5 py-2.5",
        className
      )}
      {...props}
    >
      {icon}
      <span className="text-sm font-medium text-white/80 tracking-wide">
        {children}
      </span>
    </div>
  )
);
HeroBadge.displayName = "HeroBadge";

interface HeroSectionProps extends React.HTMLAttributes<HTMLElement> {
  variant?: "full" | "compact" | "banner";
  badge?: { icon?: React.ReactNode; text: string };
  title: string;
  titleAccent?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  avatar?: { src?: string; fallback: string; onUpload?: () => void };
}

const HeroSection = React.forwardRef<HTMLElement, HeroSectionProps>(
  ({ 
    className, 
    variant = "compact", 
    badge, 
    title, 
    titleAccent, 
    subtitle, 
    actions,
    avatar,
    children,
    ...props 
  }, ref) => {
    if (variant === "full") {
      return (
        <section
          ref={ref}
          className={cn("relative min-h-[90vh] flex items-center overflow-hidden", className)}
          {...props}
        >
          <div className="absolute inset-0 hero-gradient" />
          <div className="absolute inset-0 gradient-mesh opacity-60" />
          <div className="absolute inset-0 grain opacity-50" />
          
          <div className="container relative z-10 py-16 md:py-24">
            <div className="max-w-5xl mx-auto text-center space-y-10">
              {badge && (
                <HeroBadge icon={badge.icon}>
                  {badge.text}
                </HeroBadge>
              )}
              <PageTitle accent={titleAccent}>{title}</PageTitle>
              {subtitle && (
                <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
                  {subtitle}
                </p>
              )}
              {actions && (
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
                  {actions}
                </div>
              )}
            </div>
          </div>
        </section>
      );
    }
    
    if (variant === "banner") {
      return (
        <div
          ref={ref}
          className={cn("relative border-b border-border/40 overflow-hidden", className)}
          {...props}
        >
          <div className="absolute inset-0 gradient-mesh opacity-40" />
          <div className="container py-4 md:py-6 relative z-10">
            <h1 className="text-xl md:text-2xl font-display font-bold">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
        </div>
      );
    }
    
    // Compact variant (default for dashboard)
    return (
      <div
        ref={ref}
        className={cn("relative overflow-hidden rounded-3xl border border-border/40", className)}
        {...props}
      >
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute inset-0 stadium-pattern" />
        <div className="absolute inset-0 pitch-lines opacity-30" />
        
        <div className="relative z-10 p-6 md:p-10">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-5">
              {avatar && (
                <div className="w-20 h-20 rounded-2xl border-2 border-white/20 shadow-lg overflow-hidden bg-white/10 flex items-center justify-center">
                  {avatar.src ? (
                    <img src={avatar.src} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-white/60">
                      {avatar.fallback}
                    </span>
                  )}
                </div>
              )}
              <div>
                {badge && (
                  <div className="flex items-center gap-2 mb-1">
                    {badge.icon}
                    <span className="text-[11px] font-semibold text-accent uppercase tracking-widest">
                      {badge.text}
                    </span>
                  </div>
                )}
                <h1 className="text-2xl md:text-3xl font-display font-bold text-white leading-tight">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-white/50 text-sm mt-0.5">{subtitle}</p>
                )}
              </div>
            </div>
            {actions}
          </div>
          {children}
        </div>
      </div>
    );
  }
);
HeroSection.displayName = "HeroSection";

export { HeroBadge, HeroSection };

// ============================================================
// SKELETON COMPONENT
// ============================================================

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant = "rectangular", width, height, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "skeleton-shimmer rounded-xl",
        variant === "circular" && "rounded-full",
        variant === "text" && "rounded h-4 w-full",
        className
      )}
      style={{ width, height }}
      {...props}
    />
  )
);
Skeleton.displayName = "Skeleton";

export { Skeleton };

// ============================================================
// SPOTLIGHT CARD (Interactive hover effect)
// ============================================================

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  spotlightColor?: string;
}

const SpotlightCard = React.forwardRef<HTMLDivElement, SpotlightCardProps>(
  ({ className, children, spotlightColor, ...props }, ref) => {
    const [position, setPosition] = React.useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = React.useState(false);
    
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setPosition({ 
        x: e.clientX - rect.left, 
        y: e.clientY - rect.top 
      });
    };
    
    return (
      <div
        ref={ref}
        className={cn(
          "relative overflow-hidden rounded-2xl bg-card border border-border/50 transition-all duration-500 hover:shadow-lg hover:border-primary/20",
          className
        )}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        {...props}
      >
        {/* Spotlight effect */}
        <div 
          className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300"
          style={{
            opacity: isHovered ? 1 : 0,
            background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, ${spotlightColor || 'hsl(var(--primary) / 0.1)'}, transparent 50%)`,
          }}
        />
        {children}
      </div>
    );
  }
);
SpotlightCard.displayName = "SpotlightCard";

export { SpotlightCard };

// ============================================================
// ANIMATED BORDER CARD
// ============================================================

type AnimatedBorderCardProps = React.HTMLAttributes<HTMLDivElement>;

const AnimatedBorderCard = React.forwardRef<HTMLDivElement, AnimatedBorderCardProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("relative group", className)} {...props}>
      {/* Animated border */}
      <div 
        className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-primary via-accent to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ 
          backgroundSize: '200% 200%',
          animation: 'gradient-shift 3s linear infinite'
        }}
      />
      
      {/* Card content */}
      <div className="relative bg-card rounded-2xl p-5">
        {children}
      </div>
    </div>
  )
);
AnimatedBorderCard.displayName = "AnimatedBorderCard";

export { AnimatedBorderCard };

// ============================================================
// FLOATING DOCK COMPONENT
// ============================================================

interface DockItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}

interface FloatingDockProps extends React.HTMLAttributes<HTMLDivElement> {
  items: DockItem[];
}

const FloatingDock = React.forwardRef<HTMLDivElement, FloatingDockProps>(
  ({ className, items, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("floating-dock", className)}
      {...props}
    >
      {items.map((item) => (
        <button
          key={item.id}
          onClick={item.onClick}
          className={cn(
            "dock-item",
            item.active && "bg-primary/20 border border-primary/30"
          )}
          title={item.label}
        >
          {item.icon}
        </button>
      ))}
    </div>
  )
);
FloatingDock.displayName = "FloatingDock";

export { FloatingDock };
