// ============================================================================
// Design System Tokens — single source of truth
// ----------------------------------------------------------------------------
// Extracted pixel-for-pixel from the original wallet showcase card so every
// future screen (auth, onboarding, swipe, matches, chat, profile, settings)
// reuses the exact same visual language. Import from here — never hardcode.
// ============================================================================

/** App background: deep-blue radial glow + linear gradient (from the poster). */
export const APP_BACKGROUND =
  "radial-gradient(90% 55% at 50% -12%, rgba(60,120,246,0.10) 0%, rgba(60,120,246,0) 62%)," +
  "radial-gradient(80% 50% at 50% 112%, rgba(46,70,200,0.08) 0%, rgba(46,70,200,0) 58%)," +
  "linear-gradient(180deg, #05070f 0%, #070b1a 48%, #05070f 100%)";

export const FONT_FAMILY =
  "Nunito, ui-sans-serif, system-ui, sans-serif";

/** Semantic colors. */
export const colors = {
  primary: "#3ea0f2",
  primaryDeep: "#2a75dd",
  secondary: "#8ea3d6",
  accent: "#ea6fa6",
  success: "#43d9a3",
  warning: "#f5b544",
  danger: "#f2576b",
  info: "#57b0f6",
  textPrimary: "#ffffff",
  textSecondary: "rgba(205,214,238,0.72)",
  textMuted: "rgba(205,214,238,0.6)",
} as const;

/** Gradients. */
export const gradients = {
  blueGloss:
    "radial-gradient(120% 90% at 50% -10%, #57b0f6 0%, #3ea0f2 34%, #2f83e6 72%, #2a75dd 100%)",
  primaryButton:
    "linear-gradient(160deg, rgba(74,166,248,0.92) 0%, rgba(47,131,232,0.92) 55%, rgba(38,115,222,0.92) 100%)",
  glassCard:
    "linear-gradient(160deg, rgba(28,37,69,0.72) 0%, rgba(19,26,54,0.72) 42%, rgba(14,20,48,0.72) 100%)",
  glassButton:
    "linear-gradient(160deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)",
  pink:
    "radial-gradient(120% 120% at 30% 20%, #f3c6dd 0%, #ea6fa6 45%, #d0418a 100%)",
  success:
    "radial-gradient(120% 120% at 30% 20%, #a8f0d6 0%, #43d9a3 45%, #1fae7e 100%)",
} as const;

/** Surface / glass fills. */
export const surfaces = {
  glass: gradients.glassCard,
  glassSoft: "rgba(38,50,96,0.42)",
  glassPill: "rgba(18,52,120,0.42)",
  overlay: "rgba(4,8,20,0.6)",
  border: "rgba(255,255,255,0.12)",
  borderSoft: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.28)",
} as const;

/** Border radius scale (px). */
export const radii = {
  sm: 12,
  md: 18,
  lg: 26,
  xl: 38,
  "2xl": 50,
  pill: 999,
} as const;

/** Spacing scale (px). */
export const spacing = [4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96] as const;

/** Shadows. */
export const shadows = {
  soft: "0 4px 10px rgba(0,0,0,0.35)",
  medium: "0 6px 14px rgba(0,0,0,0.35)",
  large: "0 40px 70px rgba(0,0,0,0.55)",
  glass:
    "0 2px 0 rgba(255,255,255,0.06) inset, 0 40px 70px rgba(0,0,0,0.55)",
  button:
    "0 1px 0 rgba(255,255,255,0.15) inset, 0 6px 14px rgba(0,0,0,0.35)",
  primaryGlow:
    "0 1px 0 rgba(255,255,255,0.25) inset, 0 8px 18px rgba(45,120,230,0.45)",
  glow: "0 0 40px rgba(62,160,242,0.5)",
} as const;

/** Motion. */
export const motion = {
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
  fast: "0.18s",
  base: "0.24s",
  slow: "0.4s",
} as const;
