import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1200px" } },
    extend: {
      fontFamily: {
        sans: ["Inter Variable", "IBM Plex Sans Arabic", "system-ui", "sans-serif"],
        display: ["Inter Tight Variable", "IBM Plex Sans Arabic", "system-ui", "sans-serif"],
        score: ["Barlow Condensed", "Inter Tight Variable", "sans-serif"],
        arabic: ["IBM Plex Sans Arabic", "system-ui", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: "hsl(var(--surface))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        brand: { DEFAULT: "hsl(var(--brand))", soft: "hsl(var(--brand-soft))" },
        gold: { DEFAULT: "hsl(var(--accent))", ink: "hsl(var(--gold-ink))", soft: "hsl(var(--gold-soft))" },
        ai: { DEFAULT: "hsl(var(--ai))", soft: "hsl(var(--ai-soft))" },
        live: "hsl(var(--live))",
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        sidebar: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--foreground))",
          primary: "hsl(var(--primary))",
          "primary-foreground": "hsl(var(--primary-foreground))",
          accent: "hsl(var(--muted))",
          "accent-foreground": "hsl(var(--foreground))",
          border: "hsl(var(--border))",
          ring: "hsl(var(--ring))",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgb(11 18 32 / 0.04), 0 1px 1px rgb(11 18 32 / 0.02)",
        lift: "0 8px 24px -8px rgb(11 18 32 / 0.14), 0 2px 6px rgb(11 18 32 / 0.05)",
        nav: "0 -1px 0 rgb(11 18 32 / 0.06), 0 -8px 24px -12px rgb(11 18 32 / 0.12)",
      },
      borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)" },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
