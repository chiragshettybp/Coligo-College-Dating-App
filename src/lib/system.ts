// ============================================================================
// System module client-safe helpers. No server imports — safe in components,
// route loaders, and the splash init pipeline.
// ============================================================================
import type { AppConfig } from "./system.functions";
import type { AccountStatus } from "./profile.functions";

// ---------------------------------------------------------------- Session id
const SESSION_ID_KEY = "cm:session-id";

/** Stable per-browser diagnostic id (not an auth session). */
export function getDiagnosticSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = localStorage.getItem(SESSION_ID_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `sid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(SESSION_ID_KEY, id);
    }
    return id;
  } catch {
    return "unavailable";
  }
}

// ---------------------------------------------------------------- Device info
export function collectDeviceInfo(): Record<string, string> {
  if (typeof navigator === "undefined") return { platform: "ssr" };
  return {
    userAgent: navigator.userAgent ?? "",
    language: navigator.language ?? "",
    platform: (navigator as Navigator & { platform?: string }).platform ?? "web",
    screen:
      typeof window !== "undefined"
        ? `${window.screen?.width ?? 0}x${window.screen?.height ?? 0}`
        : "",
    viewport:
      typeof window !== "undefined"
        ? `${window.innerWidth}x${window.innerHeight}`
        : "",
  };
}

/** Stable device token used to register a device_session row. */
export function getDeviceToken(): string {
  return getDiagnosticSessionId();
}

// ---------------------------------------------------------------- Timeout guard
export class TimeoutError extends Error {
  constructor(label: string) {
    super(`Timed out: ${label}`);
    this.name = "TimeoutError";
  }
}

/** Wrap a promise so a hung task can never block initialization forever. */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new TimeoutError(label)), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

// ---------------------------------------------------------------- Redirect logic
export type SplashState = {
  authenticated: boolean;
  onboardingCompleted: boolean;
  accountStatus: AccountStatus | null;
  config: Pick<AppConfig, "maintenanceEnabled">;
};

export type Destination =
  | { to: "/"; reason: "guest" }
  | { to: "/system/maintenance"; reason: "maintenance" }
  | { to: "/"; reason: "suspended" | "deleted"; signOut: true }
  | { to: "/app"; reason: "onboarding" | "home" };

/**
 * Pure routing engine used by the splash screen. Order matters: maintenance
 * overrides authenticated destinations; suspended/deleted accounts are logged
 * out before anything else user-facing.
 *
 * Onboarding-incomplete members are sent to `/app`, which renders the
 * onboarding-incomplete handoff until the dedicated Onboarding module ships.
 */
export function resolveDestination(state: SplashState): Destination {
  if (state.config.maintenanceEnabled) {
    return { to: "/system/maintenance", reason: "maintenance" };
  }
  if (!state.authenticated) {
    return { to: "/", reason: "guest" };
  }
  if (state.accountStatus === "suspended") {
    return { to: "/", reason: "suspended", signOut: true };
  }
  if (state.accountStatus === "deleted") {
    return { to: "/", reason: "deleted", signOut: true };
  }
  if (!state.onboardingCompleted) {
    return { to: "/app", reason: "onboarding" };
  }
  return { to: "/app", reason: "home" };
}

// ---------------------------------------------------------------- Init steps
export type InitStep = {
  id: string;
  label: string;
};

export const INIT_STEPS: InitStep[] = [
  { id: "connect", label: "Connecting securely" },
  { id: "session", label: "Restoring your session" },
  { id: "config", label: "Checking for updates" },
  { id: "profile", label: "Loading your profile" },
  { id: "prepare", label: "Preparing your experience" },
];
