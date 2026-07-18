/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        mona: {
          primary: "#5c37df",
          "primary-light": "#7c5ce7",
          dark: "rgb(var(--mona-dark) / <alpha-value>)",
          card: "rgb(var(--mona-card) / <alpha-value>)",
          surface: "rgb(var(--mona-surface) / <alpha-value>)",
          hover: "rgb(var(--mona-hover) / <alpha-value>)"
        },
        copilot: {
          text: "rgb(var(--copilot-text) / <alpha-value>)",
          "text-secondary": "rgb(var(--copilot-text-secondary) / <alpha-value>)",
          "text-muted": "rgb(var(--copilot-text-muted) / <alpha-value>)",
          border: "var(--copilot-border)",
          success: "#22c55e",
          warning: "#f59e0b",
          error: "#ef4444",
          info: "#3b82f6"
        }
      },
      fontFamily: {
        heading: ["Manrope", "sans-serif"],
        body: ["Roboto", "sans-serif"]
      },
      borderRadius: {
        mona: "12px"
      },
      animation: {
        "slide-in": "slideIn 0.3s ease-out",
        "fade-in": "fadeIn 0.2s ease-out",
        "pulse-dot": "pulseDot 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
      },
      keyframes: {
        slideIn: {
          "0%": { transform: "translateX(20px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" }
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
        pulseDot: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" }
        }
      }
    }
  },
  plugins: []
}
