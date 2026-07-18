export const theme = {
  colors: {
    primary: "#5c37df",
    primaryLight: "#7c5ce7",
    primaryGradient: "linear-gradient(135deg, #5c37df 0%, #7c5ce7 100%)",

    success: "#22c55e",
    warning: "#f59e0b",
    error: "#ef4444",
    info: "#3b82f6",

    suggestionConsistency: "#ef4444",
    suggestionFollowUp: "#f59e0b",
    suggestionCoverage: "#3b82f6",
    suggestionBias: "#f97316",
    suggestionInfo: "#8b5cf6",

    coverageFull: "#22c55e",
    coveragePartial: "#f59e0b",
    coverageEmpty: "#374151"
  },

  dark: {
    bgDark: "#1a1a2e",
    bgCard: "#0a0c24",
    bgSurface: "#16182d",
    bgHover: "#1e2045",
    textPrimary: "#f1f5f9",
    textSecondary: "#cbd5e1",
    textMuted: "#94a3b8",
    border: "rgba(148, 163, 184, 0.15)",
    borderHover: "rgba(148, 163, 184, 0.3)"
  },

  light: {
    bgDark: "#f8f9fc",
    bgCard: "#ffffff",
    bgSurface: "#edf0f7",
    bgHover: "#e2e8f0",
    textPrimary: "#1e293b",
    textSecondary: "#475569",
    textMuted: "#64748b",
    border: "rgba(100, 116, 139, 0.2)",
    borderHover: "rgba(100, 116, 139, 0.35)"
  },

  fonts: {
    heading: "'Manrope', sans-serif",
    body: "'Roboto', sans-serif"
  },

  radii: {
    sm: "6px",
    md: "8px",
    lg: "12px",
    xl: "16px"
  },

  fontSizes: {
    xs: "11px",
    sm: "13px",
    base: "14px",
    md: "15px",
    lg: "18px",
    xl: "22px"
  }
} as const

export type Theme = typeof theme
