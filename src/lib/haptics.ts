// ============================================================================
// Haptic Feedback Design System — single tactile language
// ----------------------------------------------------------------------------
// One source of truth for every meaningful interaction. Each token maps to a
// vibration signature (Web Vibration API — Android/Chromium; iOS Safari has no
// web haptics, so it degrades to a silent no-op). Haptics are never the only
// feedback: motion + visuals always accompany them.
//
// Usage:  import { haptic } from "@/lib/haptics";  haptic("success")
// ============================================================================

export type HapticToken =
  | "selection"
  | "light"
  | "medium"
  | "heavy"
  | "softSuccess"
  | "strongSuccess"
  | "warning"
  | "error"
  | "confirm"
  | "longPress"
  | "swipeSnap"
  | "cardDrop"
  | "match"
  | "navigation"
  | "messageSent"
  | "messageReceived"
  | "profileSaved";

/**
 * Signatures in milliseconds. Numbers = single buzz; arrays = [vibrate, pause,
 * vibrate, ...]. Kept short and restrained — subtle enough for daily repeated
 * use, distinct enough that unrelated actions never share a pattern.
 */
const PATTERNS: Record<HapticToken, number | number[]> = {
  // Core impact scale
  selection: 8,
  light: 12,
  medium: 22,
  heavy: 38,
  // Meaning-driven
  softSuccess: [14, 40, 22],
  strongSuccess: [22, 40, 34],
  warning: [26, 60, 26],
  error: [40, 50, 40, 50, 40],
  confirm: [10, 30, 18],
  longPress: 24,
  swipeSnap: 10,
  cardDrop: [12, 24, 20],
  // The match moment: anticipation · pause · warm success · subtle echo
  match: [16, 90, 30, 60, 14],
  navigation: 6,
  messageSent: 8,
  messageReceived: [8, 40, 8],
  profileSaved: [14, 40, 22],
};

let enabled = true;

/** Allow the app (or a settings screen) to globally mute haptics. */
export function setHapticsEnabled(value: boolean) {
  enabled = value;
}

function canVibrate(): boolean {
  if (!enabled) return false;
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  if (typeof navigator.vibrate !== "function") return false;
  // Respect the user's reduced-motion preference as a proxy for "calmer feedback".
  const reduced =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return false;
  return true;
}

/**
 * Fire a semantic haptic. Never blocks the UI — call it at the exact
 * interaction milestone (button peak-compression, card settle, match peak).
 * No-ops silently on unsupported platforms.
 */
export function haptic(token: HapticToken): void {
  if (!canVibrate()) return;
  try {
    navigator.vibrate(PATTERNS[token]);
  } catch {
    /* ignore — haptics are enhancement-only */
  }
}
