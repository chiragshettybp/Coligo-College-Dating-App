// ============================================================================
// Design System Tokens — single source of truth
// ----------------------------------------------------------------------------
// Extracted pixel-for-pixel from the original wallet showcase card so every
// future screen (auth, onboarding, swipe, matches, chat, profile, settings)
// reuses the exact same visual language. Import from here — never hardcode.
// ============================================================================

/** App background: calm, elegant off-white system (iOS-first). No glow. */
export const APP_BACKGROUND =
  "radial-gradient(120% 80% at 50% -20%, #ffffff 0%, rgba(255,255,255,0) 60%)," +
  "linear-gradient(180deg, #f8f8f7 0%, #f6f7f9 52%, #f4f5f7 100%)";

export const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", ui-sans-serif, system-ui, sans-serif';

/** Font weights — used intentionally, no excessive bold. */
export const weights = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  heavy: 800,
} as const;

/** Mobile-first type scale. size / lineHeight / weight / letterSpacing. */
export const type = {
  displayLg: { fontSize: 40, lineHeight: 1.05, fontWeight: weights.heavy, letterSpacing: "-0.03em" },
  displayMd: { fontSize: 34, lineHeight: 1.08, fontWeight: weights.heavy, letterSpacing: "-0.03em" },
  displaySm: { fontSize: 28, lineHeight: 1.1, fontWeight: weights.bold, letterSpacing: "-0.02em" },
  headingLg: { fontSize: 24, lineHeight: 1.15, fontWeight: weights.bold, letterSpacing: "-0.02em" },
  headingMd: { fontSize: 20, lineHeight: 1.2, fontWeight: weights.bold, letterSpacing: "-0.015em" },
  headingSm: { fontSize: 18, lineHeight: 1.25, fontWeight: weights.semibold, letterSpacing: "-0.01em" },
  titleMd: { fontSize: 16, lineHeight: 1.3, fontWeight: weights.semibold, letterSpacing: "-0.005em" },
  bodyLg: { fontSize: 16, lineHeight: 1.5, fontWeight: weights.regular, letterSpacing: "0" },
  bodyMd: { fontSize: 14, lineHeight: 1.5, fontWeight: weights.regular, letterSpacing: "0" },
  bodySm: { fontSize: 13, lineHeight: 1.45, fontWeight: weights.regular, letterSpacing: "0" },
  caption: { fontSize: 12, lineHeight: 1.4, fontWeight: weights.medium, letterSpacing: "0.01em" },
  overline: { fontSize: 11, lineHeight: 1.3, fontWeight: weights.bold, letterSpacing: "0.08em", textTransform: "uppercase" as const },
  label: { fontSize: 14, lineHeight: 1.2, fontWeight: weights.semibold, letterSpacing: "0" },
  button: { fontSize: 15, lineHeight: 1, fontWeight: weights.semibold, letterSpacing: "-0.01em" },
  number: { fontSize: 34, lineHeight: 1, fontWeight: weights.heavy, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" as const },
} as const;

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

/**
 * Elevation — realistic multi-layer depth. Each level stacks a tight contact
 * shadow, a soft ambient shadow and a top inner highlight (directional light
 * from above) rather than one heavy blurred drop. Calmer, more physical.
 */
export const shadows = {
  soft:
    "0 1px 2px rgba(0,0,0,0.30), 0 4px 10px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.05)",
  medium:
    "0 1px 2px rgba(0,0,0,0.34), 0 8px 20px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.06)",
  large:
    "0 2px 4px rgba(0,0,0,0.34), 0 16px 32px rgba(0,0,0,0.34), 0 32px 64px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.06)",
  glass:
    "0 2px 4px rgba(0,0,0,0.30), 0 20px 44px rgba(0,0,0,0.36), inset 0 1px 0 rgba(255,255,255,0.07)",
  button:
    "0 1px 2px rgba(0,0,0,0.30), 0 3px 8px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.14)",
  primaryGlow:
    "0 1px 2px rgba(0,0,0,0.28), 0 6px 16px rgba(45,120,230,0.34), inset 0 1px 0 rgba(255,255,255,0.24)",
  glow: "0 0 32px rgba(62,160,242,0.36)",
} as const;

/**
 * Motion — one unified language. Re-exported from the dedicated motion token
 * system so every screen inherits the same durations, springs, easings and
 * motion types. Import `motion` (or the granular tokens) from here or
 * "@/lib/motion" — never hardcode animation values.
 */
export {
  motion,
  duration,
  durationMs,
  easing,
  spring,
  motionType,
  transition,
  prefersReducedMotion,
  resolveDuration,
} from "./motion";
export type {
  DurationToken,
  EasingToken,
  SpringToken,
  MotionTypeToken,
} from "./motion";


