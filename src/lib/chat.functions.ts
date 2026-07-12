// ============================================================================
// Chat module server functions — authenticated, RLS-scoped to the current user.
// A "chat" is a mutual match; chatId === matchId. Conversation reads, sends
// (text + image + reply), read receipts, chat info, shared media, image upload
// signing, block / report / unmatch. Private media paths are signed with the
// caller's own client.
// ============================================================================
import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PHOTO_BUCKET = "profile-photos";
const CHAT_BUCKET = "chat-media";
const SIGN_TTL = 3600;

export const MESSAGE_MAX = 2000;
export const REPORT_REASON_MAX = 120;
export const REPORT_DETAILS_MAX = 2000;

// ------------------------------------------------------------------ Types ----
export type ChatListItem = {
  chatId: string;
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
  lastMessage: { body: string; senderId: string; createdAt: string; kind: string } | null;
  unreadCount: number;
};

export type ChatMessage = {
  id: string;
  body: string;
  senderId: string;
  createdAt: string;
  readAt: string | null;
  deliveredAt: string | null;
  kind: string;
  imageUrl: string | null;
  audioUrl: string | null;
  audioDurationMs: number | null;
  reactions: Record<string, string[]>;
  replyTo: { id: string; body: string; senderId: string; kind: string } | null;
};

export type Conversation = {
  viewerId: string;
  messages: ChatMessage[];
  hasMore: boolean;
};

export type ChatInfo = {
  chatId: string;
  createdAt: string;
  sharedMediaCount: number;
  other: {
    id: string;
    fullName: string | null;
    age: number | null;
    collegeName: string | null;
    departmentName: string | null;
    lastLoginAt: string | null;
    photo: string | null;
  };
};

export type SharedMediaItem = { id: string; url: string; createdAt: string };

// --------------------------------------------------------------- Helpers -----
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
  bucket: string,
  paths: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const toSign = Array.from(
    new Set(paths.filter((p): p is string => !!p && !p.startsWith("http"))),
  );
  const map = new Map<string, string>();
  if (toSign.length === 0) return map;
  const { data } = await client.storage.from(bucket).createSignedUrls(toSign, SIGN_TTL);
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

// --------------------------------------------------------------- List --------
export const getChatList = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ChatListItem[]> => {
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

    const signed = await signPaths(supabase, PHOTO_BUCKET, rows.map((r) => r.primary_photo));

    return rows.map((r) => ({
      chatId: r.match_id,
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
        r.last_message_body != null && r.last_message_sender && r.last_message_at_msg
          ? {
              body: r.last_message_body,
              senderId: r.last_message_sender,
              createdAt: r.last_message_at_msg,
              kind: "text",
            }
          : null,
      unreadCount: Number(r.unread_count) || 0,
    }));
  });

export const chatListQuery = () =>
  queryOptions({
    queryKey: ["chat", "list"],
    queryFn: () => getChatList(),
    staleTime: 10_000,
  });

// --------------------------------------------------------- Conversation ------
const PAGE_SIZE = 40;

export const getConversation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { chatId: string; before?: string; limit?: number }) =>
    z
      .object({
        chatId: z.string().uuid(),
        before: z.string().datetime().optional(),
        limit: z.number().int().min(1).max(100).optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }): Promise<Conversation> => {
    const { supabase, userId } = context;
    const limit = data.limit ?? PAGE_SIZE;

    // Fetch a descending window (newest first) so pagination via `before` works,
    // then reverse to ascending for display.
    let q = supabase
      .from("messages")
      .select(MSG_COLS)
      .eq("match_id", data.chatId)
      .order("created_at", { ascending: false })
      .limit(limit + 1);
    if (data.before) q = q.lt("created_at", data.before);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const page = rows ?? [];
    const hasMore = page.length > limit;
    const windowRows = hasMore ? page.slice(0, limit) : page;

    // Resolve reply parents.
    const parentIds = Array.from(
      new Set(windowRows.map((r) => r.reply_to).filter((x): x is string => !!x)),
    );
    const parents = new Map<string, { id: string; body: string; senderId: string; kind: string }>();
    if (parentIds.length) {
      const { data: pRows } = await supabase
        .from("messages")
        .select("id, body, sender_id, kind")
        .in("id", parentIds);
      for (const p of pRows ?? []) {
        parents.set(p.id as string, {
          id: p.id as string,
          body: p.body as string,
          senderId: p.sender_id as string,
          kind: (p.kind as string) ?? "text",
        });
      }
    }

    const signed = await signPaths(supabase, CHAT_BUCKET, [
      ...windowRows.map((r) => r.image_path),
      ...windowRows.map((r) => r.audio_path),
    ]);

    const messages: ChatMessage[] = windowRows
      .slice()
      .reverse()
      .map((r) => mapMessageRow(r, parents, signed));

    return { viewerId: userId, messages, hasMore };
  });

export const conversationQuery = (chatId: string) =>
  queryOptions({
    queryKey: ["chat", "conversation", chatId],
    queryFn: () => getConversation({ data: { chatId } }),
    staleTime: 3_000,
  });

// --------------------------------------------------------------- Send --------
export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { chatId: string; body?: string; imagePath?: string; replyTo?: string }) =>
      z
        .object({
          chatId: z.string().uuid(),
          body: z.string().trim().max(MESSAGE_MAX).optional(),
          imagePath: z.string().max(400).optional(),
          replyTo: z.string().uuid().optional(),
        })
        .refine((v) => (v.body && v.body.length > 0) || !!v.imagePath, {
          message: "Message cannot be empty",
        })
        .parse(input),
  )
  .handler(async ({ context, data }): Promise<ChatMessage> => {
    const { supabase, userId } = context;
    const kind = data.imagePath ? "image" : "text";
    const { data: row, error } = await supabase
      .from("messages")
      .insert({
        match_id: data.chatId,
        sender_id: userId,
        body: data.body ?? "",
        image_path: data.imagePath ?? null,
        reply_to: data.replyTo ?? null,
        kind,
      })
      .select("id, body, sender_id, created_at, read_at, kind, image_path, reply_to")
      .single();
    if (error) throw new Error(error.message);

    const signed = await signPaths(supabase, CHAT_BUCKET, [row.image_path]);
    return {
      id: row.id as string,
      body: (row.body as string) ?? "",
      senderId: row.sender_id as string,
      createdAt: row.created_at as string,
      readAt: (row.read_at as string) ?? null,
      kind: (row.kind as string) ?? "text",
      imageUrl: resolveUrl(row.image_path as string | null, signed),
      replyTo: null,
    };
  });

export const markConversationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { chatId: string }) =>
    z.object({ chatId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const { supabase } = context;
    const { error } = await supabase.rpc("mark_read", { _match_id: data.chatId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// --------------------------------------------------------- Image upload ------
export const createChatImageUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { chatId: string; ext: string }) =>
    z
      .object({
        chatId: z.string().uuid(),
        ext: z.enum(["jpg", "jpeg", "png", "webp", "gif"]),
      })
      .parse(input),
  )
  .handler(async ({ context, data }): Promise<{ path: string; token: string }> => {
    const { supabase, userId } = context;
    const name = `${Date.now()}-${crypto.randomUUID()}.${data.ext}`;
    const path = `${data.chatId}/${userId}/${name}`;
    const { data: signed, error } = await supabase.storage
      .from(CHAT_BUCKET)
      .createSignedUploadUrl(path);
    if (error || !signed) throw new Error(error?.message ?? "Could not prepare upload");
    return { path, token: signed.token };
  });

// --------------------------------------------------------------- Info --------
export const getChatInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { chatId: string }) =>
    z.object({ chatId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }): Promise<ChatInfo | null> => {
    const { supabase } = context;
    const { data: json, error } = await supabase.rpc("match_detail", { _match_id: data.chatId });
    if (error) throw new Error(error.message);
    if (!json) return null;

    const m = json as Record<string, unknown>;
    const other = m.other as Record<string, unknown>;
    const rawPhotos = Array.isArray(other.photos)
      ? (other.photos as { path?: string }[]).map((p) => p.path).filter((p): p is string => !!p)
      : [];
    const signed = await signPaths(supabase, PHOTO_BUCKET, rawPhotos);
    const photo = rawPhotos.length ? resolveUrl(rawPhotos[0], signed) : null;

    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("match_id", data.chatId)
      .eq("kind", "image");

    return {
      chatId: m.matchId as string,
      createdAt: m.createdAt as string,
      sharedMediaCount: count ?? 0,
      other: {
        id: other.id as string,
        fullName: (other.fullName as string) ?? null,
        age: (other.age as number) ?? null,
        collegeName: (other.collegeName as string) ?? null,
        departmentName: (other.departmentName as string) ?? null,
        lastLoginAt: (other.lastLoginAt as string) ?? null,
        photo,
      },
    };
  });

export const chatInfoQuery = (chatId: string) =>
  queryOptions({
    queryKey: ["chat", "info", chatId],
    queryFn: () => getChatInfo({ data: { chatId } }),
    staleTime: 30_000,
  });

// ------------------------------------------------------------- Shared media --
export const getSharedMedia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { chatId: string; before?: string }) =>
    z
      .object({ chatId: z.string().uuid(), before: z.string().datetime().optional() })
      .parse(input),
  )
  .handler(async ({ context, data }): Promise<{ items: SharedMediaItem[]; hasMore: boolean }> => {
    const { supabase } = context;
    const limit = 30;
    let q = supabase
      .from("messages")
      .select("id, image_path, created_at")
      .eq("match_id", data.chatId)
      .eq("kind", "image")
      .not("image_path", "is", null)
      .order("created_at", { ascending: false })
      .limit(limit + 1);
    if (data.before) q = q.lt("created_at", data.before);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const page = rows ?? [];
    const hasMore = page.length > limit;
    const windowRows = hasMore ? page.slice(0, limit) : page;

    const signed = await signPaths(supabase, CHAT_BUCKET, windowRows.map((r) => r.image_path));
    const items: SharedMediaItem[] = windowRows
      .map((r) => ({
        id: r.id as string,
        url: resolveUrl(r.image_path as string | null, signed) ?? "",
        createdAt: r.created_at as string,
      }))
      .filter((x) => !!x.url);
    return { items, hasMore };
  });

export const sharedMediaQuery = (chatId: string) =>
  queryOptions({
    queryKey: ["chat", "media", chatId],
    queryFn: () => getSharedMedia({ data: { chatId } }),
    staleTime: 15_000,
  });

// --------------------------------------------------- Block / report / unmatch -
export const blockChatUser = createServerFn({ method: "POST" })
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

export const reportChatUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; reason: string; details?: string }) =>
    z
      .object({
        userId: z.string().uuid(),
        reason: z.string().trim().min(1).max(REPORT_REASON_MAX),
        details: z.string().trim().max(REPORT_DETAILS_MAX).optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }): Promise<{ ok: true; duplicate: boolean }> => {
    const { supabase, userId } = context;
    // Prevent duplicate open reports of the same user.
    const { data: existing } = await supabase
      .from("reports")
      .select("id")
      .eq("reporter_id", userId)
      .eq("reported_id", data.userId)
      .maybeSingle();
    if (existing) return { ok: true, duplicate: true };
    const { error } = await supabase.from("reports").insert({
      reporter_id: userId,
      reported_id: data.userId,
      reason: data.reason,
      details: data.details ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true, duplicate: false };
  });

export const unmatchChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { chatId: string }) =>
    z.object({ chatId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }): Promise<{ ok: boolean }> => {
    const { supabase } = context;
    const { data: ok, error } = await supabase.rpc("unmatch", { _match_id: data.chatId });
    if (error) throw new Error(error.message);
    return { ok: !!ok };
  });

export const reportStatusQuery = (chatId: string) =>
  queryOptions({
    queryKey: ["chat", "report-status", chatId],
    queryFn: () => getChatInfo({ data: { chatId } }),
    staleTime: 30_000,
  });
