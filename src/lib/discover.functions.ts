// ============================================================================
// Discovery module server functions — authenticated, RLS-scoped.
// Candidate generation, single-profile preview, swipe + transaction-safe match
// creation, match-screen payload, block & report are all served by SECURITY
// DEFINER RPCs (profiles/photos/interests are owner-only under RLS). Private
// photo storage paths are signed server-side with the user's own client — the
// "members read active member photos" storage policy authorizes it.
// ============================================================================
import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "profile-photos";
const SIGN_TTL = 3600;

// ------------------------------------------------------------------ Types ----
export type SwipeAction = "like" | "pass" | "super";

export type PhotoRef = { path: string; isPrimary: boolean; position: number };

export type DiscoverCard = {
  id: string;
  fullName: string | null;
  age: number | null;
  bio: string | null;
  gender: string | null;
  collegeName: string | null;
  departmentName: string | null;
  semester: number | null;
  graduationYear: number | null;
  sameCollege: boolean;
  sharedInterests: number;
  lastLoginAt: string | null;
  /** Signed, display-ready photo URLs (primary first). */
  photos: string[];
  interests: string[];
  mutualInterests: string[];
};

export type DiscoverProfile = {
  id: string;
  fullName: string | null;
  age: number | null;
  bio: string | null;
  gender: string | null;
  collegeName: string | null;
  departmentName: string | null;
  semester: number | null;
  graduationYear: number | null;
  sameCollege: boolean;
  lastLoginAt: string | null;
  photos: string[];
  interests: string[];
  mutualInterests: string[];
  alreadySwiped: boolean;
};

export type SwipeResult = { matched: boolean; matchId: string | null };

export type MatchScreen = {
  matchId: string;
  createdAt: string;
  me: { id: string; name: string | null; avatarUrl: string | null };
  other: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
    collegeName: string | null;
    semester: number | null;
  };
  sharedInterests: string[];
  compatibility: number;
};

// --------------------------------------------------------------- Helpers -----
type SignerClient = {
  storage: {
    from: (b: string) => {
      createSignedUrls: (
        paths: string[],
        ttl: number,
      ) => Promise<{
        data: { path: string | null; signedUrl: string | null }[] | null;
      }>;
    };
  };
};

/** Batch-sign private storage paths. Full https URLs pass through untouched. */
async function signPaths(
  client: SignerClient,
  paths: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const toSign = Array.from(
    new Set(paths.filter((p): p is string => !!p && !p.startsWith("http"))),
  );
  const map = new Map<string, string>();
  if (toSign.length === 0) return map;
  const { data } = await client.storage.from(BUCKET).createSignedUrls(toSign, SIGN_TTL);
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

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

type PhotoJson = { path?: string; isPrimary?: boolean; position?: number };
function photoPaths(v: unknown): PhotoRef[] {
  if (!Array.isArray(v)) return [];
  return (v as PhotoJson[])
    .filter((p) => typeof p?.path === "string")
    .map((p) => ({
      path: p.path as string,
      isPrimary: !!p.isPrimary,
      position: Number(p.position) || 0,
    }));
}

// --------------------------------------------------------- Discovery feed ----
export const getDiscoveryFeed = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DiscoverCard[]> => {
    const { supabase } = context;
    const { data, error } = await supabase.rpc("discover_candidates", { _limit: 20 });
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as {
      id: string;
      full_name: string | null;
      avatar_url: string | null;
      age: number | null;
      bio: string | null;
      gender: string | null;
      college_name: string | null;
      department_name: string | null;
      semester: number | null;
      graduation_year: number | null;
      same_college: boolean;
      shared_interests: number;
      last_login_at: string | null;
      photos: unknown;
      interests: unknown;
      mutual_interests: unknown;
    }[];

    // Collect every storage path (avatars + gallery) and sign in one batch.
    const allPaths: (string | null)[] = [];
    for (const r of rows) {
      allPaths.push(r.avatar_url);
      for (const p of photoPaths(r.photos)) allPaths.push(p.path);
    }
    const signed = await signPaths(supabase, allPaths);

    return rows.map((r) => {
      const gallery = photoPaths(r.photos)
        .map((p) => resolveUrl(p.path, signed))
        .filter((u): u is string => !!u);
      const avatar = resolveUrl(r.avatar_url, signed);
      const photos = avatar && !gallery.includes(avatar) ? [avatar, ...gallery] : gallery;
      return {
        id: r.id,
        fullName: r.full_name,
        age: r.age,
        bio: r.bio,
        gender: r.gender,
        collegeName: r.college_name,
        departmentName: r.department_name,
        semester: r.semester,
        graduationYear: r.graduation_year,
        sameCollege: !!r.same_college,
        sharedInterests: Number(r.shared_interests) || 0,
        lastLoginAt: r.last_login_at,
        photos,
        interests: asStringArray(r.interests),
        mutualInterests: asStringArray(r.mutual_interests),
      };
    });
  });

export const discoveryFeedQuery = () =>
  queryOptions({
    queryKey: ["discover", "feed"],
    queryFn: () => getDiscoveryFeed(),
    staleTime: 15_000,
  });

// ----------------------------------------------------- Single profile view ---
export const getDiscoverProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) =>
    z.object({ userId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }): Promise<DiscoverProfile | null> => {
    const { supabase } = context;
    const { data: json, error } = await supabase.rpc("discover_profile", {
      _target: data.userId,
    });
    if (error) throw new Error(error.message);
    if (!json) return null;

    const p = json as Record<string, unknown>;
    const rawPhotos = photoPaths(p.photos);
    const signed = await signPaths(supabase, [
      p.avatarUrl as string | null,
      ...rawPhotos.map((x) => x.path),
    ]);
    const gallery = rawPhotos
      .map((x) => resolveUrl(x.path, signed))
      .filter((u): u is string => !!u);
    const avatar = resolveUrl(p.avatarUrl as string | null, signed);
    const photos = avatar && !gallery.includes(avatar) ? [avatar, ...gallery] : gallery;

    return {
      id: p.id as string,
      fullName: (p.fullName as string) ?? null,
      age: (p.age as number) ?? null,
      bio: (p.bio as string) ?? null,
      gender: (p.gender as string) ?? null,
      collegeName: (p.collegeName as string) ?? null,
      departmentName: (p.departmentName as string) ?? null,
      semester: (p.semester as number) ?? null,
      graduationYear: (p.graduationYear as number) ?? null,
      sameCollege: !!p.sameCollege,
      lastLoginAt: (p.lastLoginAt as string) ?? null,
      photos,
      interests: asStringArray(p.interests),
      mutualInterests: asStringArray(p.mutualInterests),
      alreadySwiped: !!p.alreadySwiped,
    };
  });

export const discoverProfileQuery = (userId: string) =>
  queryOptions({
    queryKey: ["discover", "profile", userId],
    queryFn: () => getDiscoverProfile({ data: { userId } }),
    staleTime: 30_000,
  });

// ----------------------------------------------------------------- Swipe -----
export const submitSwipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { targetId: string; action: SwipeAction }) =>
    z
      .object({
        targetId: z.string().uuid(),
        action: z.enum(["like", "pass", "super"]),
      })
      .parse(input),
  )
  .handler(async ({ context, data }): Promise<SwipeResult> => {
    const { supabase } = context;
    const { data: result, error } = await supabase.rpc("swipe_profile", {
      _target: data.targetId,
      _action: data.action,
    });
    if (error) throw new Error(error.message);
    const r = (result ?? {}) as { matched?: boolean; match_id?: string };
    return { matched: !!r.matched, matchId: r.match_id ?? null };
  });

// ------------------------------------------------------------ Match screen ---
export const getMatch = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { matchId: string }) =>
    z.object({ matchId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }): Promise<MatchScreen | null> => {
    const { supabase } = context;
    const { data: json, error } = await supabase.rpc("match_screen", {
      _match_id: data.matchId,
    });
    if (error) throw new Error(error.message);
    if (!json) return null;

    const m = json as {
      matchId: string;
      createdAt: string;
      me: { id: string; name: string | null; avatarUrl: string | null };
      other: {
        id: string;
        name: string | null;
        avatarUrl: string | null;
        collegeName: string | null;
        semester: number | null;
      };
      sharedInterests: unknown;
      compatibility: number;
    };

    const signed = await signPaths(supabase, [m.me.avatarUrl, m.other.avatarUrl]);
    return {
      matchId: m.matchId,
      createdAt: m.createdAt,
      me: { ...m.me, avatarUrl: resolveUrl(m.me.avatarUrl, signed) },
      other: { ...m.other, avatarUrl: resolveUrl(m.other.avatarUrl, signed) },
      sharedInterests: asStringArray(m.sharedInterests),
      compatibility: Number(m.compatibility) || 0,
    };
  });

export const matchQuery = (matchId: string) =>
  queryOptions({
    queryKey: ["discover", "match", matchId],
    queryFn: () => getMatch({ data: { matchId } }),
    staleTime: 60_000,
  });

// ------------------------------------------------------------- Undo swipe ----
// Removes a swipe the user just made (Undo). Safe: RLS scopes deletes to own
// swipes. A match that was already created is left intact by design.
export const undoSwipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { targetId: string }) =>
    z.object({ targetId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("swipes")
      .delete()
      .eq("actor_id", userId)
      .eq("target_id", data.targetId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// --------------------------------------------------------- Send first note ---
export const sendMatchNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { matchId: string; body: string }) =>
    z
      .object({
        matchId: z.string().uuid(),
        body: z.string().trim().min(1).max(2000),
      })
      .parse(input),
  )
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("messages").insert({
      match_id: data.matchId,
      sender_id: userId,
      body: data.body,
    });
    if (error) throw new Error(error.message);
    await supabase
      .from("matches")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", data.matchId);
    return { ok: true };
  });

// ----------------------------------------------------------- Block / report --
export const blockUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) =>
    z.object({ userId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("blocks")
      .upsert(
        { blocker_id: userId, blocked_id: data.userId },
        { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reportUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; reason: string; details?: string }) =>
    z
      .object({
        userId: z.string().uuid(),
        reason: z.string().trim().min(1).max(120),
        details: z.string().trim().max(2000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("reports").insert({
      reporter_id: userId,
      reported_id: data.userId,
      reason: data.reason,
      details: data.details ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
