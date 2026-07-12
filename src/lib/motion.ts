// ============================================================================
// Animation & Motion Token System — one unified motion language
// ----------------------------------------------------------------------------
// Single source of truth for every movement in the app. Nothing should invent
// its own duration, spring or easing — components inherit from these tokens so
// that motion stays consistent, communicates hierarchy and feels physical.
//
//   import { motion, duration, easing, spring, transition } from "@/lib/motion";
//   style={{ transition: transition("transform", "fast", "decelerated") }}
//
// Motion hierarchy: small interactions stay fast; large transitions carry more
// weight; hero moments feel cinematic. Importance of the action → its duration.
// ============================================================================

/** Duration tokens (ms). Use the name, never a raw number. */
export const durationMs = {
  instant: 0,
  ultraFast: 90,
  fast: 140,
  standard: 220,
  medium: 320,
  hero: 480,
  slow: 620,
  verySlow: 900,
} as const;
export type DurationToken = keyof typeof durationMs;

/** Same durations as CSS strings, for `transition`/`animation` shorthand. */
export const duration = Object.fromEntries(
  Object.entries(durationMs).map(([k, v]) => [k, `${v}ms`]),
) as Record<DurationToken, string>;

/** Easing curves — never linear. Each has an intent. */
export const easing = {
  standard: "cubic-bezier(0.4, 0, 0.2, 1)", // general purpose
  easeOut: "cubic-bezier(0.22, 1, 0.36, 1)", // enters, reveals
  easeIn: "cubic-bezier(0.4, 0, 1, 1)", // exits
  easeInOut: "cubic-bezier(0.45, 0, 0.55, 1)", // reversible moves
  accelerated: "cubic-bezier(0.4, 0, 1, 1)", // leaving the screen
  decelerated: "cubic-bezier(0, 0, 0.2, 1)", // arriving on screen
  momentum: "cubic-bezier(0.16, 1, 0.3, 1)", // scroll / fling settle
  naturalSpring: "cubic-bezier(0.34, 1.56, 0.64, 1)", // soft overshoot
} as const;
export type EasingToken = keyof typeof easing;

/**
 * Spring presets for JS-driven physics (Web Animations / Motion for React).
 * stiffness / damping / mass tuned per feel. Reuse — never random springs.
 */
export const spring = {
  soft: { stiffness: 210, damping: 26, mass: 1 },
  responsive: { stiffness: 320, damping: 30, mass: 0.9 },
  elastic: { stiffness: 380, damping: 18, mass: 0.8 },
  heavy: { stiffness: 180, damping: 30, mass: 1.4 },
  hero: { stiffness: 260, damping: 24, mass: 1.1 },
  gentle: { stiffness: 140, damping: 24, mass: 1 },
  critical: { stiffness: 420, damping: 38, mass: 0.7 },
} as const;
export type SpringToken = keyof typeof spring;

/**
 * Motion types — reusable enter/exit keyframe pairs. Values are consumed by the
 * `motionType` helper (or Motion for React variants). Keep them GPU-friendly:
 * only transform, opacity and filter.
 */
export const motionType = {
  fade: { from: { opacity: 0 }, to: { opacity: 1 } },
  scale: { from: { opacity: 0, transform: "scale(0.94)" }, to: { opacity: 1, transform: "scale(1)" } },
  lift: { from: { opacity: 0, transform: "translateY(8px)" }, to: { opacity: 1, transform: "translateY(0)" } },
  drop: { from: { opacity: 0, transform: "translateY(-8px)" }, to: { opacity: 1, transform: "translateY(0)" } },
  expand: { from: { opacity: 0, transform: "scale(0.86)" }, to: { opacity: 1, transform: "scale(1)" } },
  slide: { from: { opacity: 0, transform: "translateX(16px)" }, to: { opacity: 1, transform: "translateX(0)" } },
  push: { from: { opacity: 0, transform: "translateX(24px)" }, to: { opacity: 1, transform: "translateX(0)" } },
  depth: { from: { opacity: 0, transform: "scale(1.04)", filter: "blur(6px)" }, to: { opacity: 1, transform: "scale(1)", filter: "blur(0px)" } },
} as const;
export type MotionTypeToken = keyof typeof motionType;

/** Accessibility: honor the user's system Reduce Motion setting. */
export const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Build a CSS transition string from tokens. When Reduce Motion is on, movement
 * collapses to an near-instant opacity change while preserving essential
 * feedback (never fully removed).
 *
 *   transition("transform", "fast", "decelerated")
 *   transition(["opacity", "transform"], "standard", "easeOut")
 */
export function transition(
  properties: string | string[],
  d: DurationToken = "standard",
  e: EasingToken = "standard",
  delayMs = 0,
): string {
  const props = Array.isArray(properties) ? properties : [properties];
  if (prefersReducedMotion()) {
    return props.map((p) => `${p} ${duration.ultraFast} ${easing.standard}`).join(", ");
  }
  const delay = delayMs ? ` ${delayMs}ms` : "";
  return props.map((p) => `${p} ${duration[d]} ${easing[e]}${delay}`).join(", ");
}

/** Resolve a duration honoring Reduce Motion (returns ms). */
export const resolveDuration = (d: DurationToken): number =>
  prefersReducedMotion() ? Math.min(durationMs[d], durationMs.ultraFast) : durationMs[d];

/**
 * Unified motion object — the single import surface. Back-compatible aliases
 * (`base`, `snappy`, `spring` as a string) are kept for existing call sites.
 */
export const motion = {
  duration,
  durationMs,
  easing,
  spring,
  type: motionType,
  transition,
  prefersReducedMotion,
  resolveDuration,
  // --- back-compat aliases (existing components) ---
  fast: duration.fast,
  base: duration.standard,
  slow: duration.hero,
  standard: easing.standard,
  snappy: easing.easeOut,
} as const;
