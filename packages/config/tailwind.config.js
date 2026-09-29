module.exports = {
  content: [
    "../../packages/ui/**/*.{js,ts,jsx,tsx}",
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(var(--primary-hover))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        info: "hsl(var(--info))",
        chart: {
          navy: "hsl(var(--chart-navy))",
          blue: "hsl(var(--chart-blue))",
          sky: "hsl(var(--chart-sky))",
          orange: "hsl(var(--chart-orange))",
          gold: "hsl(var(--chart-gold))",
        },
        auth: {
          surface: "hsl(var(--auth-surface))",
          soft: "hsl(var(--auth-surface-soft))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          deep: "hsl(var(--sidebar-deep))",
          foreground: "hsl(var(--sidebar-foreground))",
          muted: "hsl(var(--sidebar-muted))",
          active: "hsl(var(--sidebar-active))",
          "active-foreground": "hsl(var(--sidebar-active-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius-card)",
        md: "var(--radius-control)",
        sm: "6px",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        card: "0 1px 2px rgb(15 37 68 / 0.04), 0 4px 14px rgb(15 37 68 / 0.05)",
        dropdown: "0 8px 24px rgb(15 37 68 / 0.12)",
        "auth-card": "0 10px 30px -10px rgba(0,0,0,0.1)",
      },
      backgroundImage: {
        "auth-page":
          "linear-gradient(110deg, hsl(var(--auth-surface)) 0%, hsl(var(--auth-surface)) 36%, hsl(var(--auth-surface-soft)) 68%, hsl(var(--auth-surface-soft)) 100%)",
      },
      fontFamily: {
        sans: ["Manrope", "sans-serif"],
      },
      height: {
        header: "4rem",
        "sidebar-item": "2.75rem",
      },
      spacing: {
        "section": "1.25rem",
        "page-x": "1.5rem",
        "page-y": "1.25rem",
      },
    },
  },
  plugins: [],
};
