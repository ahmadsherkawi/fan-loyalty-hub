# Fan Loyalty Hub — Design Optimization Plan

## Executive Summary

This plan transforms the Fan Loyalty Hub into a cohesive, premium design system with unified navigation, standardized components, and modern micro-interactions. The dark luxury aesthetic with Electric Emerald and Trophy Gold is already strong — this plan focuses on consistency, scalability, and innovation.

---

## 1. Design Token Updates

### 1.1 CSS Custom Properties (Add to `index.css`)

```css
@layer base {
  :root {
    /* ========== EXTENDED COLOR PALETTE ========== */
    
    /* Primary Scale — Electric Emerald */
    --primary-50: 152 60% 95%;
    --primary-100: 152 55% 88%;
    --primary-200: 152 50% 75%;
    --primary-300: 152 55% 60%;
    --primary-400: 152 62% 50%;
    --primary-500: 152 68% 42%; /* Base */
    --primary-600: 152 68% 38%;
    --primary-700: 152 65% 32%;
    --primary-800: 152 60% 25%;
    --primary-900: 152 55% 18%;

    /* Accent Scale — Trophy Gold */
    --accent-50: 40 80% 95%;
    --accent-100: 40 85% 88%;
    --accent-200: 40 88% 78%;
    --accent-300: 40 90% 68%;
    --accent-400: 40 92% 58%;
    --accent-500: 40 95% 54%; /* Base */
    --accent-600: 38 95% 48%;
    --accent-700: 36 90% 42%;
    --accent-800: 34 85% 35%;
    --accent-900: 32 80% 28%;

    /* Surface Colors */
    --surface-0: 220 30% 4%;   /* Darkest */
    --surface-1: 220 25% 7%;   /* Card base */
    --surface-2: 220 20% 10%;  /* Elevated */
    --surface-3: 220 18% 14%;  /* Highest */

    /* ========== TYPOGRAPHY TOKENS ========== */
    --font-display: 'Syne', 'Outfit', system-ui, sans-serif;
    --font-sans: 'Outfit', system-ui, sans-serif;
    
    /* Type Scale */
    --text-xs: 0.75rem;      /* 12px */
    --text-sm: 0.875rem;     /* 14px */
    --text-base: 1rem;       /* 16px */
    --text-lg: 1.125rem;     /* 18px */
    --text-xl: 1.25rem;      /* 20px */
    --text-2xl: 1.5rem;      /* 24px */
    --text-3xl: 1.875rem;    /* 30px */
    --text-4xl: 2.25rem;     /* 36px */
    --text-5xl: 3rem;        /* 48px */
    --text-6xl: 3.75rem;     /* 60px */
    --text-7xl: 4.5rem;      /* 72px */

    /* Line Heights */
    --leading-tight: 1.1;
    --leading-snug: 1.25;
    --leading-normal: 1.5;
    --leading-relaxed: 1.625;

    /* Letter Spacing */
    --tracking-tighter: -0.04em;
    --tracking-tight: -0.02em;
    --tracking-normal: 0;
    --tracking-wide: 0.02em;
    --tracking-wider: 0.05em;
    --tracking-widest: 0.1em;

    /* ========== SPACING TOKENS ========== */
    --space-0: 0;
    --space-1: 0.25rem;   /* 4px */
    --space-2: 0.5rem;    /* 8px */
    --space-3: 0.75rem;   /* 12px */
    --space-4: 1rem;      /* 16px */
    --space-5: 1.25rem;   /* 20px */
    --space-6: 1.5rem;    /* 24px */
    --space-8: 2rem;      /* 32px */
    --space-10: 2.5rem;   /* 40px */
    --space-12: 3rem;     /* 48px */
    --space-16: 4rem;     /* 64px */
    --space-20: 5rem;     /* 80px */
    --space-24: 6rem;     /* 96px */

    /* ========== EFFECT TOKENS ========== */
    --blur-sm: 4px;
    --blur-md: 8px;
    --blur-lg: 16px;
    --blur-xl: 24px;
    --blur-2xl: 40px;
    --blur-3xl: 64px;

    /* Animation Timing */
    --duration-instant: 100ms;
    --duration-fast: 150ms;
    --duration-normal: 250ms;
    --duration-slow: 400ms;
    --duration-slower: 600ms;
    --duration-slowest: 800ms;

    --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
    --ease-in: cubic-bezier(0.4, 0, 1, 1);
    --ease-out: cubic-bezier(0, 0, 0.2, 1);
    --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
    --ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }
}
```

### 1.2 Tailwind Config Extensions (`tailwind.config.ts`)

```typescript
// Add to theme.extend:
extend: {
  colors: {
    // Primary scale
    primary: {
      50: 'hsl(var(--primary-50))',
      100: 'hsl(var(--primary-100))',
      200: 'hsl(var(--primary-200))',
      300: 'hsl(var(--primary-300))',
      400: 'hsl(var(--primary-400))',
      500: 'hsl(var(--primary-500))',
      600: 'hsl(var(--primary-600))',
      700: 'hsl(var(--primary-700))',
      800: 'hsl(var(--primary-800))',
      900: 'hsl(var(--primary-900))',
      DEFAULT: 'hsl(var(--primary))',
      foreground: 'hsl(var(--primary-foreground))',
    },
    // Accent scale
    accent: {
      50: 'hsl(var(--accent-50))',
      // ... same pattern
      DEFAULT: 'hsl(var(--accent))',
      foreground: 'hsl(var(--accent-foreground))',
    },
    // Surface
    surface: {
      0: 'hsl(var(--surface-0))',
      1: 'hsl(var(--surface-1))',
      2: 'hsl(var(--surface-2))',
      3: 'hsl(var(--surface-3))',
    },
  },
  
  // Typography
  fontSize: {
    '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
  },
  
  // Animation durations
  transitionDuration: {
    'instant': '100ms',
    'fast': '150ms',
    'normal': '250ms',
    'slow': '400ms',
    'slower': '600ms',
    'slowest': '800ms',
  },
  
  // Timing functions
  transitionTimingFunction: {
    'bounce': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    'spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
  
  // New keyframes
  keyframes: {
    // ... existing keyframes ...
    
    'slide-down': {
      from: { opacity: '0', transform: 'translateY(-8px)' },
      to: { opacity: '1', transform: 'translateY(0)' },
    },
    'slide-up': {
      from: { opacity: '0', transform: 'translateY(8px)' },
      to: { opacity: '1', transform: 'translateY(0)' },
    },
    'pop-in': {
      '0%': { opacity: '0', transform: 'scale(0.9)' },
      '70%': { transform: 'scale(1.02)' },
      '100%': { opacity: '1', transform: 'scale(1)' },
    },
    'border-rotate': {
      from: { '--angle': '0deg' },
      to: { '--angle': '360deg' },
    },
    'shimmer-slide': {
      '0%': { transform: 'translateX(-100%)' },
      '100%': { transform: 'translateX(100%)' },
    },
    'spotlight': {
      '0%': { opacity: '0', transform: 'translate(-100%, -100%)' },
      '50%': { opacity: '1' },
      '100%': { opacity: '0', transform: 'translate(100%, 100%)' },
    },
    'pulse-ring': {
      '0%': { transform: 'scale(0.9)', opacity: '1' },
      '100%': { transform: 'scale(1.3)', opacity: '0' },
    },
  },
  
  animation: {
    'slide-down': 'slide-down 0.3s ease-out forwards',
    'slide-up': 'slide-up 0.3s ease-out forwards',
    'pop-in': 'pop-in 0.35s ease-bounce forwards',
    'border-rotate': 'border-rotate 3s linear infinite',
    'shimmer-slide': 'shimmer-slide 2s ease-in-out infinite',
    'spotlight': 'spotlight 3s ease-in-out infinite',
    'pulse-ring': 'pulse-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  },
}
```

---

## 2. Unified Navigation System

### 2.1 Navigation Component Variants

Create a unified `AppNavigation` component with these variants:

```tsx
// src/components/navigation/AppNavigation.tsx

interface NavigationProps {
  variant?: 'landing' | 'app' | 'minimal';
  showLogo?: boolean;
  showClub?: boolean;
  rightContent?: React.ReactNode;
}

// VARIANTS:

// 1. Landing Navigation (for public pages)
// - Transparent glassmorphic background
// - Logo left, centered nav pills, auth right
// - Pill buttons with hover glow effect

// 2. App Navigation (for dashboard pages)
// - Solid dark with gradient border bottom
// - Logo + Club avatar left, context nav center, user actions right
// - Context-aware section pills

// 3. Minimal Navigation
// - Ultra-thin header (h-12)
// - Logo only, single action button
```

### 2.2 Innovative Navigation Patterns

#### A. Pill Navigation Menu
```tsx
// src/components/navigation/PillNavigation.tsx

// Animated pill indicator that slides under active item
// Glassmorphic pill container
// Hover glow effect

const PillNavigation = ({ items, activeIndex }) => (
  <nav className="relative flex items-center gap-1 p-1 rounded-full bg-white/5 backdrop-blur-xl border border-white/10">
    {/* Sliding pill background */}
    <motion.div
      className="absolute h-8 rounded-full bg-primary/20 border border-primary/30"
      layoutId="nav-pill"
      animate={{ x: `${activeIndex * 100}%`, width: 'auto' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    />
    
    {items.map((item, i) => (
      <NavLink
        key={item.id}
        className={cn(
          "relative z-10 px-5 py-2 text-sm font-medium rounded-full transition-colors",
          activeIndex === i 
            ? "text-white" 
            : "text-white/60 hover:text-white"
        )}
      >
        {item.icon && <item.icon className="h-4 w-4 mr-2" />}
        {item.label}
      </NavLink>
    ))}
  </nav>
);
```

#### B. Slide Navigation (Mobile)
```tsx
// Full-screen overlay with staggered item animation
// Dramatic entrance with scale + fade

const MobileNavigation = ({ isOpen, onClose }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-surface-0/95 backdrop-blur-2xl"
      >
        {/* Close button */}
        <button onClick={onClose} className="absolute top-6 right-6">
          <X className="h-6 w-6" />
        </button>
        
        {/* Nav items with stagger */}
        <nav className="flex flex-col items-center justify-center h-full gap-6">
          {items.map((item, i) => (
            <motion.a
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="text-3xl font-display font-bold text-white hover:text-accent transition-colors"
            >
              {item.label}
            </motion.a>
          ))}
        </nav>
      </motion.div>
    )}
  </AnimatePresence>
);
```

#### C. Floating Dock Navigation
```tsx
// macOS-style dock for dashboard actions
// Expands on hover with scale animation

const FloatingDock = ({ items }) => (
  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
    <div className="flex items-end gap-2 p-2 rounded-2xl glass-dark shadow-lg">
      {items.map((item, i) => (
        <motion.button
          key={item.id}
          whileHover={{ scale: 1.15, y: -4 }}
          className="w-12 h-12 rounded-xl bg-surface-2 flex items-center justify-center"
        >
          <item.icon className="h-5 w-5" />
        </motion.button>
      ))}
    </div>
  </div>
);
```

---

## 3. Hero Section Standardization

### 3.1 Hero Component Structure

```tsx
// src/components/ui/Hero.tsx

interface HeroProps {
  variant?: 'full' | 'compact' | 'banner';
  badge?: { icon?: React.ReactNode; text: string };
  title: string;
  titleAccent?: string; // Gradient portion of title
  subtitle?: string;
  actions?: React.ReactNode;
  background?: 'gradient' | 'mesh' | 'pattern' | 'image';
  size?: 'sm' | 'md' | 'lg';
  avatar?: { src: string; fallback: string };
  stats?: Array<{ value: string; label: string }>;
}

// STANDARDIZED PADDING:
// - Full hero: py-16 md:py-24 lg:py-32
// - Compact hero: py-8 md:py-12
// - Banner hero: py-4 md:py-6
```

### 3.2 Hero Variants

#### Full Hero (Landing Pages)
```tsx
<section className="relative min-h-[90vh] flex items-center overflow-hidden">
  {/* Background layers */}
  <div className="absolute inset-0 hero-gradient" />
  <div className="absolute inset-0 gradient-mesh opacity-60" />
  <div className="absolute inset-0 grain opacity-50" />
  
  {/* Animated orbs */}
  <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] animate-pulse-slow" />
  <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-accent/8 rounded-full blur-[80px] animate-float" />
  
  <div className="container relative z-10 py-16 md:py-24">
    {/* Content */}
  </div>
</section>
```

#### Compact Hero (Dashboard)
```tsx
<div className="relative overflow-hidden rounded-3xl border border-border/40">
  <div className="absolute inset-0 gradient-hero" />
  <div className="absolute inset-0 stadium-pattern" />
  
  <div className="relative z-10 p-6 md:p-10">
    <div className="flex items-center gap-4 mb-2">
      <Badge variant="hero"> {/* New variant */}
        <Sparkles className="h-3.5 w-3.5 text-accent" />
        <span className="text-xs font-semibold uppercase tracking-widest text-accent">
          Section Label
        </span>
      </Badge>
    </div>
    
    <h1 className="text-2xl md:text-3xl font-display font-bold text-white">
      {title}
    </h1>
  </div>
</div>
```

#### Banner Hero (Simple Header)
```tsx
<div className="relative border-b border-border/40 overflow-hidden">
  <div className="absolute inset-0 gradient-mesh opacity-40" />
  
  <div className="container py-4 md:py-6 relative z-10">
    <h1 className="text-xl md:text-2xl font-display font-bold">
      {title}
    </h1>
  </div>
</div>
```

### 3.3 Standardized Badge/Tag Styling

```css
/* Add to index.css @layer components */

/* Hero badge - prominent, glassmorphic */
.badge-hero {
  @apply inline-flex items-center gap-2 px-4 py-2 rounded-full;
  @apply bg-white/5 backdrop-blur-md border border-white/10;
  @apply text-xs font-semibold uppercase tracking-widest;
}

/* Section badge - subtle */
.badge-section {
  @apply inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full;
  @apply bg-primary/10 text-primary border border-primary/20;
  @apply text-[11px] font-semibold uppercase tracking-wider;
}

/* Status badges */
.badge-success {
  @apply bg-green-500/10 text-green-400 border-green-500/20;
}

.badge-warning {
  @apply bg-yellow-500/10 text-yellow-400 border-yellow-500/20;
}

.badge-error {
  @apply bg-red-500/10 text-red-400 border-red-500/20;
}
```

---

## 4. Card Component System

### 4.1 Card Variants (CVA-based)

```tsx
// src/components/ui/card.tsx (Enhanced)

const cardVariants = cva(
  "relative overflow-hidden rounded-2xl transition-all duration-500",
  {
    variants: {
      variant: {
        // Primary content card
        default: "bg-card border border-border/50",
        
        // Stat/number display card
        stat: "bg-card border border-border/40",
        
        // Clickable action card
        action: "bg-card border border-border/50 cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-primary/20",
        
        // Glassmorphic overlay card
        glass: "bg-white/60 dark:bg-black/30 backdrop-blur-xl border border-white/30 dark:border-white/10",
        
        // Bento grid card
        bento: "bg-card border border-border/50 hover:border-primary/30 hover:shadow-lg",
        
        // Feature highlight card
        feature: "bg-gradient-to-br from-surface-1 to-surface-0 border border-border/30",
        
        // Inactive/disabled state
        disabled: "bg-card/50 border border-border/30 opacity-50 cursor-not-allowed",
      },
      
      padding: {
        none: "",
        sm: "p-4",
        default: "p-5",
        lg: "p-6",
        xl: "p-8",
      },
      
      radius: {
        default: "rounded-2xl",
        lg: "rounded-3xl",
        full: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "default",
      radius: "default",
    },
  }
);
```

### 4.2 Card Enhancements

#### Gradient Overlay Pattern
```tsx
// Reusable gradient overlay component
const CardGradientOverlay = ({ color = 'primary' }) => (
  <div className={cn(
    "absolute inset-0 bg-gradient-to-br pointer-events-none rounded-inherit",
    color === 'primary' && "from-primary/10 to-transparent",
    color === 'accent' && "from-accent/10 to-transparent",
    color === 'purple' && "from-purple-500/10 to-transparent",
    color === 'blue' && "from-blue-500/10 to-transparent",
  )} />
);
```

#### Animated Border Effect
```tsx
// Animated gradient border using pseudo-elements
const AnimatedBorderCard = ({ children }) => (
  <div className="relative group">
    {/* Animated border */}
    <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-primary via-accent to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-500" 
         style={{ animation: 'border-rotate 3s linear infinite' }}
    />
    
    {/* Card content */}
    <div className="relative bg-card rounded-2xl">
      {children}
    </div>
  </div>
);
```

#### Spotlight Hover Effect
```tsx
// Mouse-following spotlight effect
const SpotlightCard = ({ children }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  return (
    <div 
      className="relative overflow-hidden rounded-2xl bg-card"
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setPosition({ 
          x: e.clientX - rect.left, 
          y: e.clientY - rect.top 
        });
      }}
    >
      {/* Spotlight */}
      <div 
        className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, hsl(var(--primary) / 0.1), transparent 50%)`,
        }}
      />
      {children}
    </div>
  );
};
```

---

## 5. Button Hierarchy & Variants

### 5.1 Enhanced Button Variants

```tsx
// src/components/ui/button.tsx (Enhanced)

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // Primary gradient
        primary: "gradient-stadium text-white shadow-stadium hover:opacity-90 hover:shadow-lg",
        
        // Gold accent
        accent: "gradient-golden text-accent-foreground shadow-golden hover:opacity-90",
        
        // Outline
        outline: "border border-border bg-transparent hover:bg-card hover:border-primary/30",
        
        // Ghost
        ghost: "bg-transparent hover:bg-card/60",
        
        // Secondary
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        
        // Destructive
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        
        // Link
        link: "text-primary underline-offset-4 hover:underline",
        
        // Pill (navigation)
        pill: "rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10",
        
        // Pill Active
        pillActive: "rounded-full bg-primary/20 text-white border border-primary/30",
        
        // Glass
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
      
      rounded: {
        default: "rounded-xl",
        full: "rounded-full",
        lg: "rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);
```

### 5.2 Button Loading States

```tsx
// Enhanced button with loading state
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
);
```

### 5.3 Icon Button Group

```tsx
// Button group with pill container
const ButtonGroup = ({ children }) => (
  <div className="inline-flex items-center p-1 rounded-full bg-surface-1 border border-border/40">
    {children}
  </div>
);
```

---

## 6. Micro-Interaction Patterns

### 6.1 Page Transitions

```tsx
// src/components/transitions/PageTransition.tsx

import { motion, AnimatePresence } from 'framer-motion';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  enter: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

const PageTransition = ({ children }) => (
  <AnimatePresence mode="wait">
    <motion.div
      initial="initial"
      animate="enter"
      exit="exit"
      variants={pageVariants}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  </AnimatePresence>
);
```

### 6.2 Hover State Animations

```css
/* Add to index.css */

/* Scale + glow on hover */
.hover-scale-glow {
  @apply transition-all duration-300;
}
.hover-scale-glow:hover {
  @apply scale-105;
  box-shadow: 0 0 30px -5px hsl(var(--primary) / 0.4);
}

/* Lift + shadow */
.hover-lift {
  @apply transition-all duration-500;
}
.hover-lift:hover {
  @apply -translate-y-1.5 shadow-lg;
}

/* Border glow */
.hover-border-glow {
  @apply transition-all duration-300;
}
.hover-border-glow:hover {
  @apply border-primary/40;
  box-shadow: 0 0 20px -5px hsl(var(--primary) / 0.3);
}

/* Background sweep */
.hover-sweep {
  @apply relative overflow-hidden;
}
.hover-sweep::before {
  content: '';
  @apply absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent;
  transform: translateX(-100%);
  transition: transform 0.6s ease;
}
.hover-sweep:hover::before {
  transform: translateX(100%);
}
```

### 6.3 Loading State Patterns

```tsx
// Skeleton pulse
const SkeletonPulse = () => (
  <div className="animate-pulse rounded-xl bg-surface-2" />
);

// Shimmer loading
const ShimmerLoading = () => (
  <div className="relative overflow-hidden rounded-xl bg-surface-2">
    <div className="absolute inset-0 -translate-x-full animate-shimmer-slide bg-gradient-to-r from-transparent via-white/10 to-transparent" />
  </div>
);

// Spinner variants
const LoadingSpinner = ({ size = 'md' }) => (
  <Loader2 className={cn(
    "animate-spin text-primary",
    size === 'sm' && "h-4 w-4",
    size === 'md' && "h-6 w-6",
    size === 'lg' && "h-8 w-8",
  )} />
);
```

### 6.4 Success/Error Animations

```tsx
// Success checkmark animation
const SuccessAnimation = () => (
  <motion.div
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
  >
    <motion.div
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <CheckCircle className="h-12 w-12 text-green-500" />
    </motion.div>
  </motion.div>
);

// Error shake animation
const ErrorAnimation = () => (
  <motion.div
    animate={{ 
      x: [0, -10, 10, -10, 10, 0],
      transition: { duration: 0.4 }
    }}
  >
    <AlertCircle className="h-12 w-12 text-red-500" />
  </motion.div>
);

// Toast animations (CSS)
.toast-enter {
  animation: slide-in-right 0.3s ease-out forwards;
}

.toast-exit {
  animation: slide-out-right 0.3s ease-in forwards;
}

@keyframes slide-out-right {
  from { opacity: 1; transform: translateX(0); }
  to { opacity: 0; transform: translateX(24px); }
}
```

---

## 7. Typography Scale

### 7.1 Standardized Typography Classes

```css
/* Add to index.css @layer components */

/* Page Titles */
.title-page {
  @apply text-3xl md:text-4xl lg:text-5xl font-display font-bold tracking-tight leading-tight;
}

/* Section Headers */
.title-section {
  @apply text-sm font-bold uppercase tracking-widest;
}

/* Card Titles */
.title-card {
  @apply text-base font-display font-semibold leading-snug;
}

/* Body Text */
.text-body {
  @apply text-sm leading-relaxed;
}

/* Labels */
.text-label {
  @apply text-xs font-medium uppercase tracking-wide;
}

/* Captions */
.text-caption {
  @apply text-xs text-muted-foreground;
}

/* Hero Title */
.title-hero {
  @apply text-5xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight leading-[0.95];
}

/* Stat Numbers */
.text-stat {
  @apply text-3xl font-display font-bold tracking-tight tabular-nums;
}

/* Points Display */
.points-display {
  @apply font-display text-2xl font-bold bg-gradient-to-r from-accent to-yellow-400 bg-clip-text text-transparent;
}
```

### 7.2 Typography Utility Components

```tsx
// src/components/ui/Typography.tsx

export const PageTitle = ({ children, className }) => (
  <h1 className={cn("title-page", className)}>{children}</h1>
);

export const SectionHeader = ({ children, icon, action, className }) => (
  <div className={cn("flex items-center justify-between mb-4", className)}>
    <h2 className="title-section flex items-center gap-2">
      {icon}
      {children}
    </h2>
    {action}
  </div>
);

export const CardTitle = ({ children, className }) => (
  <h3 className={cn("title-card", className)}>{children}</h3>
);

export const Label = ({ children, className }) => (
  <span className={cn("text-label", className)}>{children}</span>
);
```

---

## 8. Modern Design Trends to Incorporate

### 8.1 Grain Texture

Already implemented - enhance with:

```css
/* Enhanced grain with noise SVG */
.grain-enhanced::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  opacity: 0.03;
  mix-blend-mode: overlay;
  pointer-events: none;
}
```

### 8.2 Animated Borders

```tsx
// Rotating gradient border
const AnimatedGradientBorder = ({ children }) => (
  <div className="relative p-[1px] rounded-2xl overflow-hidden">
    <div 
      className="absolute inset-0"
      style={{
        background: 'conic-gradient(from var(--angle), hsl(var(--primary)), hsl(var(--accent)), hsl(260 60% 50%), hsl(var(--primary)))',
        animation: 'border-rotate 3s linear infinite',
      }}
    />
    <div className="relative bg-card rounded-2xl">
      {children}
    </div>
  </div>
);
```

### 8.3 Spotlight Effect

```tsx
// Already defined above - use for card hover states
// Great for dark theme interactivity
```

### 8.4 Glassmorphism 2.0

```css
/* Enhanced glass with blur + noise */
.glass-premium {
  background: linear-gradient(
    135deg,
    hsl(var(--card) / 0.8),
    hsl(var(--card) / 0.4)
  );
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid hsl(var(--border) / 0.2);
  box-shadow: 
    0 8px 32px hsl(var(--background) / 0.4),
    inset 0 1px 0 hsl(var(--border) / 0.1);
}

/* Dark glass variant */
.glass-dark-premium {
  background: linear-gradient(
    135deg,
    hsl(var(--background) / 0.6),
    hsl(var(--background) / 0.3)
  );
  backdrop-filter: blur(24px) saturate(120%);
  border: 1px solid hsl(var(--border) / 0.15);
}
```

### 8.5 Mesh Gradient Backgrounds

```css
/* Enhanced mesh gradient */
.gradient-mesh-premium {
  background: 
    radial-gradient(ellipse at 20% 30%, hsl(152 68% 38% / 0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, hsl(40 95% 54% / 0.1) 0%, transparent 40%),
    radial-gradient(ellipse at 60% 80%, hsl(260 60% 50% / 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 40% 60%, hsl(200 80% 60% / 0.05) 0%, transparent 40%);
}

/* Animated mesh */
.gradient-mesh-animated {
  background: var(--gradient-mesh);
  animation: mesh-shift 20s ease-in-out infinite;
}

@keyframes mesh-shift {
  0%, 100% {
    background-position: 0% 0%, 100% 0%, 50% 100%, 0% 50%;
  }
  25% {
    background-position: 50% 0%, 50% 100%, 0% 50%, 100% 50%;
  }
  50% {
    background-position: 100% 50%, 0% 50%, 50% 0%, 50% 100%;
  }
  75% {
    background-position: 50% 100%, 50% 0%, 100% 50%, 0% 50%;
  }
}
```

### 8.6 Subtle Glow Effects

```css
/* Primary glow */
.glow-primary {
  box-shadow: 
    0 0 20px hsl(var(--primary) / 0.2),
    0 0 40px hsl(var(--primary) / 0.1),
    0 0 60px hsl(var(--primary) / 0.05);
}

/* Accent glow */
.glow-accent {
  box-shadow: 
    0 0 20px hsl(var(--accent) / 0.2),
    0 0 40px hsl(var(--accent) / 0.1);
}

/* Animated pulse glow */
.glow-pulse {
  animation: glow-pulse 2s ease-in-out infinite;
}

@keyframes glow-pulse {
  0%, 100% {
    box-shadow: 0 0 20px hsl(var(--primary) / 0.2);
  }
  50% {
    box-shadow: 0 0 40px hsl(var(--primary) / 0.4);
  }
}
```

---

## 9. Implementation Priority

### Phase 1: Foundation (Week 1)
1. Update CSS custom properties
2. Enhance Tailwind config
3. Create typography components
4. Standardize button variants

### Phase 2: Components (Week 2)
1. Implement unified navigation
2. Create card variants
3. Add hero section components
4. Build badge/tag components

### Phase 3: Interactions (Week 3)
1. Add page transitions
2. Implement hover animations
3. Create loading states
4. Add success/error animations

### Phase 4: Polish (Week 4)
1. Add grain textures
2. Implement animated borders
3. Add spotlight effects
4. Create glassmorphism variants

---

## 10. Component Checklist

### Navigation
- [ ] `AppNavigation` - unified navigation component
- [ ] `PillNavigation` - animated pill menu
- [ ] `MobileNavigation` - full-screen mobile nav
- [ ] `FloatingDock` - macOS-style dock

### Hero
- [ ] `HeroFull` - landing page hero
- [ ] `HeroCompact` - dashboard hero
- [ ] `HeroBanner` - simple header

### Cards
- [ ] `Card` with CVA variants
- [ ] `StatCard` - number displays
- [ ] `ActionCard` - clickable items
- [ ] `GlassCard` - overlay cards
- [ ] `SpotlightCard` - hover spotlight

### Buttons
- [ ] Enhanced button variants
- [ ] Loading state
- [ ] Button groups
- [ ] Icon buttons

### Typography
- [ ] `PageTitle`
- [ ] `SectionHeader`
- [ ] `CardTitle`
- [ ] `Label`
- [ ] `StatNumber`

### Effects
- [ ] `PageTransition`
- [ ] `AnimatedBorder`
- [ ] `SpotlightEffect`
- [ ] `ShimmerLoading`
- [ ] `SuccessAnimation`
- [ ] `ErrorAnimation`

---

## Quick Reference

### Spacing Scale
| Token | Value | Usage |
|-------|-------|-------|
| `py-4` | 16px | Compact section |
| `py-6` | 24px | Standard section |
| `py-8` | 32px | Comfortable section |
| `py-10` | 40px | Hero compact |
| `py-16` | 64px | Hero full |

### Border Radius
| Class | Value | Usage |
|-------|-------|-------|
| `rounded-lg` | 0.5rem | Small elements |
| `rounded-xl` | 0.75rem | Buttons, inputs |
| `rounded-2xl` | 1rem | Cards |
| `rounded-3xl` | 1.5rem | Hero sections |
| `rounded-full` | 9999px | Pills, avatars |

### Animation Durations
| Duration | Value | Usage |
|----------|-------|-------|
| `instant` | 100ms | Immediate feedback |
| `fast` | 150ms | Hover states |
| `normal` | 250ms | Standard transitions |
| `slow` | 400ms | Page transitions |
| `slower` | 600ms | Complex animations |

---

This plan provides a comprehensive roadmap for transforming the Fan Loyalty Hub design system. Start with Phase 1 (Foundation) and work through each phase systematically. Each component should be built with accessibility and performance in mind.
