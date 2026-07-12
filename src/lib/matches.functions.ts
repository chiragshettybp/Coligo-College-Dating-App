// ============================================================================
// Matches module server functions — authenticated, RLS-scoped to the current
// user. List, detail, first-note, unmatch, and preference persistence are
// served by SECURITY DEFINER RPCs; private photo storage paths are signed
// server-side with the caller's own client. Block / report / send-note reuse
// the Discovery server functions.
// ============================================================================
import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "profile-photos";
const SIGN_TTL = 3600;

export const NOTE_MAX = 500;

// ------------------------------------------------------------------ Types ----
export type MatchListItem = {
  matchId: string;
  createdAt: string;
  lastMessageAt: string | null;
  other: {
    id: string;
    fullName: string | null;
    age: number | null;
    collegeName: string | null;
    departmentName: string | null;
    lastLoginAt: string | null;
    sameCollege: boolean;
    photo: string | null;
  };
  lastMessage: { body: string; senderId: string; createdAt: string } | null;
  unreadCount: number;
};

export type MatchDetail = {
  matchId: string;
  createdAt: string;
  lastMessageAt: string | null;
  hasConversation: boolean;
  noteSent: boolean;
  other: {
    id: string;
    fullName: string | null;
    age: number | null;
    bio: string | null;
    gender: string | null;
    collegeName: string | null;
    departmentName: string | null;
    semester: number | null;
    graduationYear: number | null;
    lastLoginAt: string | null;
    sameCollege: boolean;
    photos: string[];
    interests: string[];
    mutualInterests: string[];
  };
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
function photoPaths(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return (v as PhotoJson[])
    .filter((p) => typeof p?.path === "string")
    .map((p) => p.path as string);
}

// --------------------------------------------------------------- List --------
export const getMatches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MatchListItem[]> => {
    const { supabase } = context;
    const { data, error } = await supabase.rpc("my_matches");
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as {
      match_id: string;
      created_at: string;
      last_message_at: string | null;
      other_id: string;
      full_name: string | null;
      age: number | null;
      college_name: string | null;
      department_name: string | null;
      primary_photo: string | null;
      last_login_at: string | null;
      same_college: boolean;
      last_message_body: string | null;
      last_message_sender: string | null;
      last_message_at_msg: string | null;
      unread_count: number;
    }[];

    const signed = await signPaths(supabase, rows.map((r) => r.primary_photo));

    return rows.map((r) => ({
      matchId: r.match_id,
      createdAt: r.created_at,
      lastMessageAt: r.last_message_at,
      other: {
        id: r.other_id,
        fullName: r.full_name,
        age: r.age,
        collegeName: r.college_name,
        departmentName: r.department_name,
        lastLoginAt: r.last_login_at,
        sameCollege: !!r.same_college,
        photo: resolveUrl(r.primary_photo, signed),
      },
      lastMessage:
        r.last_message_body && r.last_message_sender && r.last_message_at_msg
          ? {
              body: r.last_message_body,
              senderId: r.last_message_sender,
              createdAt: r.last_message_at_msg,
            }
          : null,
      unreadCount: Number(r.unread_count) || 0,
    }));
  });

export const matchesQuery = () =>
  queryOptions({
    queryKey: ["matches", "list"],
    queryFn: () => getMatches(),
    staleTime: 15_000,
  });

// --------------------------------------------------------------- Detail ------
export const getMatchDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { matchId: string }) =>
    z.object({ matchId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }): Promise<MatchDetail | null> => {
    const { supabase } = context;
    const { data: json, error } = await supabase.rpc("match_detail", {
      _match_id: data.matchId,
    });
    if (error) throw new Error(error.message);
    if (!json) return null;

    const m = json as Record<string, unknown>;
    const other = m.other as Record<string, unknown>;
    const rawPhotos = photoPaths(other.photos);
    const signed = await signPaths(supabase, rawPhotos);
    const photos = rawPhotos
      .map((p) => resolveUrl(p, signed))
      .filter((u): u is string => !!u);

    return {
      matchId: m.matchId as string,
      createdAt: m.createdAt as string,
      lastMessageAt: (m.lastMessageAt as string) ?? null,
      hasConversation: !!m.hasConversation,
      noteSent: !!m.noteSent,
      other: {
        id: other.id as string,
        fullName: (other.fullName as string) ?? null,
        age: (other.age as number) ?? null,
        bio: (other.bio as string) ?? null,
        gender: (other.gender as string) ?? null,
        collegeName: (other.collegeName as string) ?? null,
        departmentName: (other.departmentName as string) ?? null,
        semester: (other.semester as number) ?? null,
        graduationYear: (other.graduationYear as number) ?? null,
        lastLoginAt: (other.lastLoginAt as string) ?? null,
        sameCollege: !!other.sameCollege,
        photos,
        interests: asStringArray(other.interests),
        mutualInterests: asStringArray(other.mutualInterests),
      },
    };
  });

export const matchDetailQuery = (matchId: string) =>
  queryOptions({
    queryKey: ["matches", "detail", matchId],
    queryFn: () => getMatchDetail({ data: { matchId } }),
    staleTime: 30_000,
  });

// --------------------------------------------------------------- First note --
export const getNoteStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { matchId: string }) =>
    z.object({ matchId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }): Promise<{ noteSent: boolean }> => {
    const { supabase } = context;
    const { data: sent, error } = await supabase.rpc("note_status", {
      _match_id: data.matchId,
    });
    if (error) throw new Error(error.message);
    return { noteSent: !!sent };
  });

export const noteStatusQuery = (matchId: string) =>
  queryOptions({
    queryKey: ["matches", "note-status", matchId],
    queryFn: () => getNoteStatus({ data: { matchId } }),
    staleTime: 10_000,
  });

export const sendFirstNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { matchId: string; body: string }) =>
    z
      .object({
        matchId: z.string().uuid(),
        body: z.string().trim().min(1).max(NOTE_MAX),
      })
      .parse(input),
  )
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;
    // Prevent a duplicate first note (server-side guard).
    const { data: alreadySent } = await supabase.rpc("note_status", {
      _match_id: data.matchId,
    });
    if (alreadySent) throw new Error("You already sent your first note.");
    const { error } = await supabase.from("messages").insert({
      match_id: data.matchId,
      sender_id: userId,
      body: data.body,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// --------------------------------------------------------------- Unmatch -----
export const unmatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { matchId: string }) =>
    z.object({ matchId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }): Promise<{ ok: boolean }> => {
    const { supabase } = context;
    const { data: ok, error } = await supabase.rpc("unmatch", {
      _match_id: data.matchId,
    });
    if (error) throw new Error(error.message);
    return { ok: !!ok };
  });

// --------------------------------------------------------- Match preferences -
export type MatchSort =
  | "recent_activity"
  | "recent_match"
  | "newest_messages"
  | "unread_first"
  | "online_first"
  | "alphabetical";

export type MatchFilter =
  | "unread"
  | "online"
  | "recently_matched"
  | "same_college"
  | "same_department";

export type MatchPrefs = { sort: MatchSort; filters: MatchFilter[] };

const SORTS: MatchSort[] = [
  "recent_activity",
  "recent_match",
  "newest_messages",
  "unread_first",
  "online_first",
  "alphabetical",
];
const FILTERS: MatchFilter[] = [
  "unread",
  "online",
  "recently_matched",
  "same_college",
  "same_department",
];

export const getMatchPrefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MatchPrefs> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("settings")
      .select("match_sort, match_filters")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const sort = (data?.match_sort as MatchSort) ?? "recent_activity";
    const rawFilters = Array.isArray(data?.match_filters) ? data.match_filters : [];
    const filters = rawFilters.filter((f): f is MatchFilter =>
      FILTERS.includes(f as MatchFilter),
    );
    return { sort: SORTS.includes(sort) ? sort : "recent_activity", filters };
  });

export const matchPrefsQuery = () =>
  queryOptions({
    queryKey: ["matches", "prefs"],
    queryFn: () => getMatchPrefs(),
    staleTime: 60_000,
  });

export const updateMatchPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sort: MatchSort; filters: MatchFilter[] }) =>
    z
      .object({
        sort: z.enum([
          "recent_activity",
          "recent_match",
          "newest_messages",
          "unread_first",
          "online_first",
          "alphabetical",
        ]),
        filters: z
          .array(
            z.enum([
              "unread",
              "online",
              "recently_matched",
              "same_college",
              "same_department",
            ]),
          )
          .max(5),
      })
      .parse(input),
  )
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("settings")
      .update({ match_sort: data.sort, match_filters: data.filters })
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
