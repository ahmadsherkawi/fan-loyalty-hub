/**
 * Page Transition Components
 * Smooth animated transitions between pages using Framer Motion
 */

import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";
import { useLocation } from "react-router-dom";

// ============================================================
// TRANSITION VARIANTS
// ============================================================

export const pageVariants = {
  initial: {
    opacity: 0,
    y: 12,
    scale: 0.995,
  },
  enter: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.35,
      ease: [0.25, 0.1, 0.25, 1],
      when: "beforeChildren",
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.995,
    transition: {
      duration: 0.25,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

export const fadeVariants = {
  initial: {
    opacity: 0,
  },
  enter: {
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: "easeIn",
    },
  },
};

export const slideVariants = {
  initial: {
    opacity: 0,
    x: 20,
  },
  enter: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.35,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: {
      duration: 0.25,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

export const scaleVariants = {
  initial: {
    opacity: 0,
    scale: 0.95,
  },
  enter: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.35,
      ease: [0.34, 1.56, 0.64, 1], // Spring-like bounce
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: 0.2,
      ease: "easeIn",
    },
  },
};

// ============================================================
// STAGGER CONTAINER
// ============================================================

export const staggerContainerVariants = {
  initial: {},
  enter: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export const staggerItemVariants = {
  initial: {
    opacity: 0,
    y: 16,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

// ============================================================
// PAGE TRANSITION COMPONENT
// ============================================================

interface PageTransitionProps {
  children: ReactNode;
  variant?: "default" | "fade" | "slide" | "scale";
  className?: string;
}

export function PageTransition({
  children,
  variant = "default",
  className = "",
}: PageTransitionProps) {
  const variants = {
    default: pageVariants,
    fade: fadeVariants,
    slide: slideVariants,
    scale: scaleVariants,
  };

  return (
    <motion.div
      initial="initial"
      animate="enter"
      exit="exit"
      variants={variants[variant]}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================================
// ANIMATED PAGE WRAPPER
// ============================================================

interface AnimatedPageProps {
  children: ReactNode;
  variant?: "default" | "fade" | "slide" | "scale";
  className?: string;
}

export function AnimatedPage({
  children,
  variant = "default",
  className = "",
}: AnimatedPageProps) {
  return (
    <PageTransition variant={variant} className={className}>
      {children}
    </PageTransition>
  );
}

// ============================================================
// ROUTE TRANSITION WRAPPER
// ============================================================

interface RouteTransitionProps {
  children: ReactNode;
}

export function RouteTransition({ children }: RouteTransitionProps) {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="enter"
        exit="exit"
        variants={pageVariants}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================
// STAGGER CONTAINER
// ============================================================

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function StaggerContainer({
  children,
  className = "",
  delay = 0.1,
}: StaggerContainerProps) {
  return (
    <motion.div
      initial="initial"
      animate="enter"
      variants={{
        initial: {},
        enter: {
          transition: {
            staggerChildren: 0.08,
            delayChildren: delay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================================
// STAGGER ITEM
// ============================================================

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

export function StaggerItem({ children, className = "" }: StaggerItemProps) {
  return (
    <motion.div variants={staggerItemVariants} className={className}>
      {children}
    </motion.div>
  );
}

// ============================================================
// FADE IN WRAPPER
// ============================================================

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

export function FadeIn({
  children,
  delay = 0,
  duration = 0.35,
  className = "",
}: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================================
// SLIDE IN WRAPPER
// ============================================================

interface SlideInProps {
  children: ReactNode;
  direction?: "up" | "down" | "left" | "right";
  delay?: number;
  className?: string;
}

export function SlideIn({
  children,
  direction = "up",
  delay = 0,
  className = "",
}: SlideInProps) {
  const directionOffset = {
    up: { y: 24 },
    down: { y: -24 },
    left: { x: 24 },
    right: { x: -24 },
  };

  const initial = {
    opacity: 0,
    ...directionOffset[direction],
  };

  const animate = {
    opacity: 1,
    x: 0,
    y: 0,
  };

  return (
    <motion.div
      initial={initial}
      animate={animate}
      transition={{
        duration: 0.4,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================================
// SCALE IN WRAPPER
// ============================================================

interface ScaleInProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function ScaleIn({ children, delay = 0, className = "" }: ScaleInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.4,
        delay,
        ease: [0.34, 1.56, 0.64, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================================
// HOVER ANIMATIONS
// ============================================================

interface HoverScaleProps {
  children: ReactNode;
  scale?: number;
  className?: string;
}

export function HoverScale({
  children,
  scale = 1.02,
  className = "",
}: HoverScaleProps) {
  return (
    <motion.div
      whileHover={{ scale }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface HoverLiftProps {
  children: ReactNode;
  className?: string;
}

export function HoverLift({ children, className = "" }: HoverLiftProps) {
  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: "0 12px 24px -8px rgba(0,0,0,0.3)" }}
      transition={{ duration: 0.25 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================================
// LOADING SKELETON
// ============================================================

interface LoadingPulseProps {
  className?: string;
}

export function LoadingPulse({ className = "" }: LoadingPulseProps) {
  return (
    <motion.div
      animate={{
        opacity: [0.5, 1, 0.5],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={`bg-muted/30 rounded-xl ${className}`}
    />
  );
}
