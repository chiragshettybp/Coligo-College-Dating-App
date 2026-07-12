// ============================================================================
// Notifications module server functions — authenticated, RLS-scoped to the
// current user. List (paginated, newest-first), detail with resolved related
// actor + target-existence check, mark-read / mark-all-read, soft delete,
// unread count, and per-category preferences. Related profile photos are
// signed server-side with the caller's own client. Design/data only — no mocks.
// ============================================================================
import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PHOTO_BUCKET = "profile-photos";
const SIGN_TTL = 3600;
export const NOTIFICATIONS_PAGE_SIZE = 25;

// ------------------------------------------------------------------ Types ----
/** Notification payload — a flat, JSON-serializable bag of navigation hints. */
export type NotifData = Record<string, string | number | boolean | null>;

export type NotificationActor = {
  id: string;
  name: string | null;
  photo: string | null;
};

export type NotificationItem = {
  id: string;
  type: string;
  category: string;
  title: string;
  body: string | null;
  priority: string;
  createdAt: string;
  readAt: string | null;
  route: string | null;
  data: NotifData;
  actor: NotificationActor | null;
};

export type NotificationPage = {
  items: NotificationItem[];
  nextCursor: string | null;
};

export type NotificationDetail = NotificationItem & {
  /** False when the linked destination (match / chat) no longer exists. */
  targetExists: boolean;
};

export type NotificationPreference = {
  category: string;
  inApp: boolean;
  push: boolean;
  email: boolean;
};

// ------------------------------------------------------------- Type helpers --
export const NOTIFICATION_CATEGORIES = [
  "matches",
  "messages",
  "system",
  "security",
  "account",
] as const;

/** Mirror of public.notification_category — keep in sync with the migration. */
export function categoryForType(type: string): string {
  switch (type.toLowerCase()) {
    case "match":
    case "match_created":
    case "note":
    case "first_note":
      return "matches";
    case "message":
    case "new_message":
      return "messages";
    case "security_alert":
      return "security";
    case "account_notice":
    case "profile_update":
      return "account";
    default:
      return "system";
  }
}

function deriveRoute(type: string, data: NotifData): string | null {
  const explicit = typeof data.route === "string" ? data.route : null;
  if (explicit) return explicit;
  const matchId = typeof data.matchId === "string" ? data.matchId : null;
  const cat = categoryForType(type);
  if (cat === "messages" && matchId) return `/chat/${matchId}`;
  if (cat === "matches" && matchId) return `/discover/match/${matchId}`;
  return null;
}

// --------------------------------------------------------------- Signing -----
type SignerClient = {
  storage: {
    from: (b: string) => {
      createSignedUrls: (
        paths: string[],
        ttl: number,
      ) => Promise<{ data: { path: string | null; signedUrl: string | null }[] | null }>;
    };
  };
};

async function signPaths(
  client: SignerClient,
  paths: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const toSign = Array.from(
    new Set(paths.filter((p): p is string => !!p && !p.startsWith("http"))),
  );
  const map = new Map<string, string>();
  if (toSign.length === 0) return map;
  const { data } = await client.storage.from(PHOTO_BUCKET).createSignedUrls(toSign, SIGN_TTL);
  for (const row of data ?? []) {
    if (row.signedUrl && row.path) map.set(row.path, row.signedUrl);
  }
  return map;
}

function resolveUrl(raw: string | null | undefined, signed: Map<string, string>): string | null {
  if (!raw) return null;
  if (raw.startsWith("http")) return raw;
  return signed.get(raw) ?? null;
}

type NotifRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: NotifData | null;
  priority: string | null;
  read_at: string | null;
  created_at: string;
};

type ActorClient = {
  from: (t: string) => {
    select: (c: string) => {
      in: (col: string, vals: string[]) => Promise<{ data: unknown[] | null }>;
    };
  };
};

/** Resolve the related profile (name + primary photo) for each notification. */
async function loadActors(
  supabase: ActorClient & SignerClient,
  rows: NotifRow[],
): Promise<Map<string, NotificationActor>> {
  const ids = new Set<string>();
  for (const r of rows) {
    const d = r.data ?? {};
    for (const key of ["otherId", "senderId", "actorId", "userId"]) {
      const v = d[key];
      if (typeof v === "string") ids.add(v);
    }
  }
  const map = new Map<string, NotificationActor>();
  if (ids.size === 0) return map;
  const idList = Array.from(ids);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", idList);
  const { data: photos } = await supabase
    .from("photos")
    .select("user_id, storage_path, is_primary, position")
    .in("user_id", idList);

  const primaryPhoto = new Map<string, string>();
  for (const p of (photos ?? []) as {
    user_id: string;
    storage_path: string;
    is_primary: boolean;
    position: number;
  }[]) {
    const cur = primaryPhoto.get(p.user_id);
    if (!cur || p.is_primary) primaryPhoto.set(p.user_id, p.storage_path);
  }

  const allPaths = [
    ...Array.from(primaryPhoto.values()),
    ...((profiles ?? []) as { avatar_url: string | null }[]).map((p) => p.avatar_url),
  ];
  const signed = await signPaths(supabase, allPaths);

  for (const p of (profiles ?? []) as {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  }[]) {
    const path = primaryPhoto.get(p.id) ?? p.avatar_url;
    map.set(p.id, { id: p.id, name: p.full_name, photo: resolveUrl(path, signed) });
  }
  return map;
}

function pickActor(
  data: NotifData,
  actors: Map<string, NotificationActor>,
): NotificationActor | null {
  for (const key of ["otherId", "senderId", "actorId", "userId"]) {
    const v = data[key];
    if (typeof v === "string" && actors.has(v)) return actors.get(v)!;
  }
  return null;
}

function toItem(r: NotifRow, actors: Map<string, NotificationActor>): NotificationItem {
  const data = r.data ?? {};
  return {
    id: r.id,
    type: r.type,
    category: categoryForType(r.type),
    title: r.title,
    body: r.body,
    priority: r.priority ?? "normal",
    createdAt: r.created_at,
    readAt: r.read_at,
    route: deriveRoute(r.type, data),
    data,
    actor: pickActor(data, actors),
  };
}

// ----------------------------------------------------------------- List ------
export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { cursor?: string | null; limit?: number } | undefined) =>
    z
      .object({
        cursor: z.string().datetime().nullish(),
        limit: z.number().int().min(1).max(100).optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<NotificationPage> => {
    const { supabase } = context;
    const limit = data.limit ?? NOTIFICATIONS_PAGE_SIZE;

    let q = supabase
      .from("notifications")
      .select("id, type, title, body, data, priority, read_at, created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit + 1);
    if (data.cursor) q = q.lt("created_at", data.cursor);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const list = (rows ?? []) as unknown as NotifRow[];
    const hasMore = list.length > limit;
    const page = hasMore ? list.slice(0, limit) : list;
    const actors = await loadActors(supabase as unknown as ActorClient & SignerClient, page);

    return {
      items: page.map((r) => toItem(r, actors)),
      nextCursor: hasMore ? page[page.length - 1].created_at : null,
    };
  });

// --------------------------------------------------------------- Detail ------
export const getNotification = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<NotificationDetail | null> => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("notifications")
      .select("id, type, title, body, data, priority, read_at, created_at")
      .eq("id", data.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;

    const r = row as unknown as NotifRow;
    const actors = await loadActors(supabase as unknown as ActorClient & SignerClient, [r]);
    const item = toItem(r, actors);

    // Target-existence: if the notification links to a match, verify it is
    // still reachable (active + not blocked) via RLS-scoped read.
    let targetExists = true;
    const matchId = typeof item.data.matchId === "string" ? item.data.matchId : null;
    if (matchId) {
      const { data: m } = await supabase
        .from("matches")
        .select("id, status")
        .eq("id", matchId)
        .maybeSingle();
      targetExists = !!m && (m as { status: string }).status === "active";
    }

    return { ...item, targetExists };
  });

// ------------------------------------------------------------ Mutations ------
export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ updated: number }> => {
    const { error, data: n } = await context.supabase.rpc("mark_notification_read", {
      _id: data.id,
    });
    if (error) throw new Error(error.message);
    return { updated: Number(n) || 0 };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ updated: number }> => {
    const { error, data: n } = await context.supabase.rpc("mark_all_notifications_read");
    if (error) throw new Error(error.message);
    return { updated: Number(n) || 0 };
  });

export const deleteNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ deleted: boolean }> => {
    const { error, data: ok } = await context.supabase.rpc("soft_delete_notification", {
      _id: data.id,
    });
    if (error) throw new Error(error.message);
    return { deleted: !!ok };
  });

export const getUnreadNotificationCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<number> => {
    const { error, data } = await context.supabase.rpc("unread_notifications_count");
    if (error) throw new Error(error.message);
    return Number(data) || 0;
  });

// ---------------------------------------------------------- Preferences ------
export const getNotificationPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<NotificationPreference[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("notification_preferences")
      .select("category, in_app, push, email")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);

    const saved = new Map(
      ((data ?? []) as { category: string; in_app: boolean; push: boolean; email: boolean }[]).map(
        (r) => [r.category, r],
      ),
    );
    // Return a full row per known category, defaulting to enabled.
    return NOTIFICATION_CATEGORIES.map((category) => {
      const r = saved.get(category);
      return {
        category,
        inApp: r ? r.in_app : true,
        push: r ? r.push : true,
        email: r ? r.email : false,
      };
    });
  });

export const updateNotificationPreference = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { category: string; inApp: boolean; push: boolean; email: boolean }) =>
    z
      .object({
        category: z.enum(NOTIFICATION_CATEGORIES),
        inApp: z.boolean(),
        push: z.boolean(),
        email: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("notification_preferences").upsert(
      {
        user_id: userId,
        category: data.category,
        in_app: data.inApp,
        push: data.push,
        email: data.email,
      },
      { onConflict: "user_id,category" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// --------------------------------------------------------- Query options -----
export function notificationsQuery(limit = NOTIFICATIONS_PAGE_SIZE) {
  return queryOptions({
    queryKey: ["notifications", "list", limit],
    queryFn: () => listNotifications({ data: { limit } }),
  });
}

export function unreadNotificationCountQuery() {
  return queryOptions({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => getUnreadNotificationCount(),
  });
}

export function notificationDetailQuery(id: string) {
  return queryOptions({
    queryKey: ["notifications", "detail", id],
    queryFn: () => getNotification({ data: { id } }),
  });
}

export function notificationPreferencesQuery() {
  return queryOptions({
    queryKey: ["notifications", "preferences"],
    queryFn: () => getNotificationPreferences(),
  });
}
