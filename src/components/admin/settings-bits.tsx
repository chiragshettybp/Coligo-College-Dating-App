// ============================================================================
// settings-bits — declarative schema + helpers for the Admin Settings console.
// The field definitions here drive both the rendered forms and the client-side
// validation, mirroring the server-side ranges enforced in the settings RPCs.
// Keys match the jsonb shape stored per category in Supabase exactly.
// ============================================================================

export type FieldType = "toggle" | "number" | "text" | "textarea" | "select";

export type Field = {
  key: string;
  label: string;
  type: FieldType;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: { value: string; label: string }[];
  comingSoon?: boolean;
};

export type Category = {
  key: string;
  label: string;
  desc: string;
  fields: Field[];
};

export const CATEGORIES: Category[] = [
  {
    key: "platform",
    label: "General",
    desc: "Core application identity and versioning.",
    fields: [
      { key: "app_name", label: "Application name", type: "text" },
      { key: "app_description", label: "Application description", type: "textarea" },
      { key: "support_phone", label: "Support phone", type: "text" },
      { key: "copyright", label: "Copyright", type: "text" },
      { key: "current_version", label: "Current version", type: "text" },
      { key: "min_supported_version", label: "Minimum supported version", type: "text" },
      { key: "force_update", label: "Force update", type: "toggle", comingSoon: true },
    ],
  },
  {
    key: "authentication",
    label: "Authentication",
    desc: "Login methods, OTP and session rules. No email authentication.",
    fields: [
      { key: "mobile_login", label: "Mobile login enabled", type: "toggle" },
      { key: "otp_login", label: "OTP login enabled", type: "toggle" },
      { key: "password_login", label: "Password login enabled", type: "toggle" },
      { key: "otp_expiration_seconds", label: "OTP expiration", type: "number", min: 30, max: 3600, unit: "sec" },
      { key: "max_otp_attempts", label: "Maximum OTP attempts", type: "number", min: 1, max: 20 },
      { key: "session_duration_days", label: "Session duration", type: "number", min: 1, max: 365, unit: "days" },
      { key: "auto_logout", label: "Auto logout on inactivity", type: "toggle" },
      { key: "password_min_length", label: "Minimum password length", type: "number", min: 4, max: 64 },
      { key: "account_lock_threshold", label: "Account lock threshold", type: "number", min: 1, max: 100 },
    ],
  },
  {
    key: "onboarding",
    label: "Onboarding",
    desc: "Profile creation rules applied during sign-up.",
    fields: [
      { key: "min_age", label: "Minimum age", type: "number", min: 16, max: 30 },
      { key: "min_photos", label: "Minimum photos", type: "number", min: 0, max: 9 },
      { key: "max_photos", label: "Maximum photos", type: "number", min: 1, max: 9 },
      { key: "max_bio_length", label: "Maximum bio length", type: "number", min: 0, max: 2000 },
      { key: "min_interests", label: "Minimum interests", type: "number", min: 0, max: 30 },
      { key: "max_interests", label: "Maximum interests", type: "number", min: 1, max: 30 },
      { key: "college_required", label: "College required", type: "toggle" },
      { key: "department_required", label: "Department required", type: "toggle" },
      { key: "semester_required", label: "Semester required", type: "toggle" },
    ],
  },
  {
    key: "discovery",
    label: "Discovery",
    desc: "Recommendation and matching behaviour.",
    fields: [
      { key: "discovery_enabled", label: "Discovery enabled", type: "toggle" },
      { key: "daily_swipe_limit", label: "Daily swipe limit", type: "number", min: 0, max: 1000, comingSoon: true },
      { key: "match_creation_enabled", label: "Match creation enabled", type: "toggle" },
      { key: "auto_match_enabled", label: "Auto match enabled", type: "toggle" },
      {
        key: "ranking_algorithm",
        label: "Ranking algorithm",
        type: "select",
        options: [
          { value: "balanced", label: "Balanced" },
          { value: "activity", label: "Activity" },
          { value: "newest", label: "Newest" },
          { value: "compatibility", label: "Compatibility" },
        ],
      },
      { key: "same_college_preference", label: "Same-college preference", type: "toggle" },
      { key: "cross_college_discovery", label: "Cross-college discovery", type: "toggle" },
      { key: "cache_refresh_minutes", label: "Cache refresh", type: "number", min: 1, max: 1440, unit: "min" },
    ],
  },
  {
    key: "chat",
    label: "Chat",
    desc: "Messaging capabilities and limits.",
    fields: [
      { key: "chat_enabled", label: "Chat enabled", type: "toggle" },
      { key: "image_sharing", label: "Image sharing", type: "toggle" },
      { key: "voice_notes", label: "Voice notes", type: "toggle" },
      { key: "replies", label: "Replies", type: "toggle" },
      { key: "emoji_reactions", label: "Emoji reactions", type: "toggle" },
      { key: "read_receipts", label: "Read receipts", type: "toggle" },
      { key: "typing_indicators", label: "Typing indicators", type: "toggle" },
      { key: "max_image_size_mb", label: "Maximum image size", type: "number", min: 1, max: 100, unit: "MB" },
      { key: "max_voice_seconds", label: "Maximum voice note", type: "number", min: 5, max: 600, unit: "sec" },
      { key: "max_message_length", label: "Maximum message length", type: "number", min: 1, max: 10000 },
    ],
  },
  {
    key: "notifications",
    label: "Notifications",
    desc: "Which notification types are delivered.",
    fields: [
      { key: "in_app", label: "In-app notifications", type: "toggle" },
      { key: "match", label: "Match notifications", type: "toggle" },
      { key: "message", label: "Message notifications", type: "toggle" },
      { key: "announcement", label: "Announcement notifications", type: "toggle" },
      { key: "system_alerts", label: "System alerts", type: "toggle" },
      { key: "broadcast", label: "Broadcast notifications", type: "toggle" },
    ],
  },
  {
    key: "moderation",
    label: "Moderation",
    desc: "Safety thresholds and automated actions.",
    fields: [
      { key: "auto_block_threshold", label: "Auto-block threshold", type: "number", min: 1, max: 100 },
      { key: "report_threshold", label: "Report threshold", type: "number", min: 1, max: 100 },
      { key: "warning_threshold", label: "Warning threshold", type: "number", min: 1, max: 100 },
      { key: "automatic_suspension", label: "Automatic suspension", type: "toggle" },
      { key: "ai_moderation", label: "AI moderation", type: "toggle", comingSoon: true },
      { key: "image_moderation", label: "Image moderation", type: "toggle", comingSoon: true },
      { key: "voice_moderation", label: "Voice moderation", type: "toggle", comingSoon: true },
      { key: "spam_detection", label: "Spam detection", type: "toggle", comingSoon: true },
    ],
  },
  {
    key: "colleges",
    label: "Colleges",
    desc: "College registration and ranking behaviour.",
    fields: [
      { key: "college_registration", label: "College registration", type: "toggle" },
      { key: "ranking_updates", label: "Ranking updates", type: "toggle" },
      { key: "auto_ranking", label: "Auto ranking", type: "toggle" },
      { key: "department_sync", label: "Department synchronisation", type: "toggle" },
    ],
  },
  {
    key: "profile",
    label: "Profile",
    desc: "Default visibility and profile limits.",
    fields: [
      { key: "profile_visible_default", label: "Profile visibility default", type: "toggle" },
      { key: "online_status_default", label: "Online status default", type: "toggle" },
      { key: "read_receipts_default", label: "Read receipts default", type: "toggle" },
      { key: "bio_limit", label: "Bio limit", type: "number", min: 0, max: 2000 },
      { key: "photo_limit", label: "Photo limit", type: "number", min: 1, max: 9 },
    ],
  },
  {
    key: "security",
    label: "Security",
    desc: "Sessions, rate limits and device policy.",
    fields: [
      { key: "session_timeout_minutes", label: "Session timeout", type: "number", min: 5, max: 1440, unit: "min" },
      { key: "jwt_lifetime_minutes", label: "JWT lifetime", type: "number", min: 5, max: 1440, unit: "min" },
      { key: "rate_limiting", label: "Rate limiting", type: "toggle" },
      { key: "api_limit_per_minute", label: "API limit", type: "number", min: 10, max: 10000, unit: "/min" },
      { key: "admin_session_minutes", label: "Admin session duration", type: "number", min: 5, max: 1440, unit: "min" },
      { key: "device_limit", label: "Device limit", type: "number", min: 1, max: 50 },
      { key: "require_reauthentication", label: "Require re-authentication", type: "toggle" },
    ],
  },
];

export const FEATURE_FLAG_KEYS = [
  "discovery",
  "matches",
  "chat",
  "notifications",
  "voice_notes",
  "emoji_reactions",
  "analytics",
] as const;

export type SettingsValues = Record<string, unknown>;

// Validate a single field against its schema. Returns an error string or null.
export function validateField(field: Field, value: unknown): string | null {
  if (field.type === "number") {
    const n = Number(value);
    if (value === "" || value === null || Number.isNaN(n)) return "Enter a number";
    if (field.min !== undefined && n < field.min) return `Must be ≥ ${field.min}`;
    if (field.max !== undefined && n > field.max) return `Must be ≤ ${field.max}`;
  }
  if (field.type === "text" && typeof value === "string" && value.length > 500) return "Too long";
  if (field.type === "textarea" && typeof value === "string" && value.length > 2000) return "Too long";
  return null;
}

// Validate a whole category's values. Returns a map of key -> error.
export function validateCategory(fields: Field[], values: SettingsValues): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of fields) {
    if (f.comingSoon) continue;
    const err = validateField(f, values[f.key]);
    if (err) errors[f.key] = err;
  }
  return errors;
}

// Coerce edited values to the correct primitive types for the backend.
export function coerceValues(fields: Field[], values: SettingsValues): SettingsValues {
  const out: SettingsValues = {};
  for (const f of fields) {
    if (f.comingSoon) continue;
    const v = values[f.key];
    if (v === undefined) continue;
    out[f.key] = f.type === "number" ? Number(v) : v;
  }
  return out;
}

export function isDirty(fields: Field[], a: SettingsValues, b: SettingsValues): boolean {
  return fields.some((f) => !f.comingSoon && JSON.stringify(a[f.key]) !== JSON.stringify(b[f.key]));
}

export function humanBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// Trigger a client-side JSON file download (used by Export configuration).
export function downloadJSON(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
