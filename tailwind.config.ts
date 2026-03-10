import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: { center: true, padding: "2rem" },
    extend: {
      fontFamily: {
        sans:    ["Montserrat", "system-ui", "sans-serif"],
        display: ["Cormorant Garamond", "serif"],
      },
      colors: {
        border:  "hsl(var(--border))",
        input:   "hsl(var(--input))",
        ring:    "hsl(var(--ring))",
        background: "#FAFAF8",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
          light:      "hsl(var(--destructive-light))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT:              "hsl(var(--sidebar-background))",
          foreground:           "hsl(var(--sidebar-foreground))",
          primary:              "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent:               "hsl(var(--sidebar-accent))",
          "accent-foreground":  "hsl(var(--sidebar-accent-foreground))",
          border:               "hsl(var(--sidebar-border))",
          ring:                 "hsl(var(--sidebar-ring))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          light:   "hsl(var(--success-light))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          light:   "hsl(var(--warning-light))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          light:   "hsl(var(--info-light))",
        },
        error:  "hsl(var(--error))",
        gold:   "#B8975A",
        "gold-light": "#F5ECD6",
        cream:  "#FAFAF8",
        // Legacy
        "deep-navy": "#1C1917",
        champagne:   "#B8975A",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        card:  "0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05)",
        "card-hover": "0 2px 8px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.09)",
        gold:  "0 4px 24px rgba(184,151,90,0.2)",
      },
      keyframes: {
        fadeUp:  { from: { opacity: "0", transform: "translateY(10px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        shimmer: { from: { backgroundPosition: "-200% 0" }, to: { backgroundPosition: "200% 0" } },
        spin:    { to: { transform: "rotate(360deg)" } },
      },
      animation: {
        "fade-up": "fadeUp 0.35s ease both",
        shimmer:   "shimmer 2s linear infinite",
        spin:      "spin 0.9s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
