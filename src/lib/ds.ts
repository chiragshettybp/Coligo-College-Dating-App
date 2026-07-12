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

/** Semantic colors — calm, low-saturation iOS palette. Dark text on light. */
export const colors = {
  primary: "#0a84ff",
  primaryDeep: "#0060df",
  secondary: "#6b7280",
  accent: "#ff375f",
  success: "#34c759",
  warning: "#ff9f0a",
  danger: "#ff3b30",
  info: "#0a84ff",
  textPrimary: "#1c1c1e",
  textSecondary: "rgba(60,60,67,0.72)",
  textMuted: "rgba(60,60,67,0.5)",
} as const;

/** Gradients — restrained. Solid-leaning surfaces, minimal color. */
export const gradients = {
  blueGloss:
    "linear-gradient(180deg, #0a84ff 0%, #0060df 100%)",
  primaryButton:
    "linear-gradient(180deg, #0a84ff 0%, #0071e3 100%)",
  glassCard:
    "linear-gradient(180deg, rgba(255,255,255,0.86) 0%, rgba(255,255,255,0.72) 100%)",
  glassButton:
    "linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)",
  pink:
    "linear-gradient(180deg, #ff6482 0%, #ff375f 100%)",
  success:
    "linear-gradient(180deg, #5cd679 0%, #34c759 100%)",
} as const;

/** Surface / glass fills — solid, layered elevation on off-white. */
export const surfaces = {
  glass: "rgba(255,255,255,0.72)",
  glassSoft: "#ffffff",
  glassPill: "rgba(255,255,255,0.7)",
  overlay: "rgba(20,20,25,0.28)",
  border: "rgba(0,0,0,0.08)",
  borderSoft: "rgba(0,0,0,0.05)",
  borderStrong: "rgba(0,0,0,0.14)",
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


