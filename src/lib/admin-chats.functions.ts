// ============================================================================
// Admin Chat Management server functions. Thin wrappers over admin-gated RPCs
// — every RPC re-checks has_role(auth.uid(),'admin') and raises 'Forbidden'
// otherwise, so a bypassed UI still cannot read or mutate conversation data.
// A "chat" is a match (chatId === matchId). Private media paths are signed with
// the caller's own client. Keep this module import-only + createServerFn
// declarations (server-fn split rule).
// ============================================================================
import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { signAdminPaths, resolveAdminUrl } from "@/lib/admin-users.server";

type Json = string | number | boolean | null | { [k: string]: Json } | Json[];

const CHAT_BUCKET = "chat-media";

// ------------------------------------------------------------------- types
export type ChatSort =
  | "newest"
  | "oldest"
  | "last_activity"
  | "most_messages"
  | "least_messages"
  | "most_media"
  | "most_reports";

export type AdminChatFilters = {
  status?: string; // active | archived | locked | reported
  college?: string; // same | different
  activity?: string; // high | low
  reported?: boolean;
  has_media?: boolean;
  has_voice?: boolean;
  has_replies?: boolean;
  has_reactions?: boolean;
  no_messages?: boolean;
  date_from?: string;
  date_to?: string;
};

export type AdminChatRow = {
  id: string;
  user_a: string | null;
  user_b: string | null;
  user_a_name: string | null;
  user_b_name: string | null;
  user_a_avatar: string | null;
  user_b_avatar: string | null;
  college_a: string | null;
  college_b: string | null;
  dept_a: string | null;
  dept_b: string | null;
  same_college: boolean;
  created_at: string;
  last_activity: string | null;
  total_messages: number;
  images: number;
  voice: number;
  replies: number;
  reactions: number;
  read_count: number;
  reports_count: number;
  status: string;
  conversation_disabled: boolean;
  flagged: boolean;
  investigation_status: string;
  total_count: number;
};

export type ChatStats = {
  totalConversations: number;
  activeConversations: number;
  archivedConversations: number;
  lockedConversations: number;
  messagesToday: number;
  messagesWeek: number;
  imagesShared: number;
  voiceNotes: number;
  reactions: number;
  replies: number;
  reported: number;
  underReview: number;
  avgLength: number;
  avgMessagesPerMatch: number;
  activeChatters: number;
  chatsToday: number;
};

export type ChatParticipant = {
  id: string;
  name: string | null;
  phone: string | null;
  avatar: string | null;
  college: string | null;
  department: string | null;
  semester: number | null;
  graduationYear: number | null;
  accountStatus: string | null;
  verificationStatus: string | null;
  onboardingCompleted: boolean | null;
};

export type ChatReportRef = {
  id: string;
  reporterId: string | null;
  reportedId: string | null;
  reason: string | null;
  status: string | null;
  createdAt: string;
};

export type ChatTimelineEvent = { type: string; at: string };

export type AdminChatDetail = {
  id: string;
  status: string;
  matchSource: string | null;
  createdAt: string;
  lastActivity: string | null;
  unmatchedAt: string | null;
  archivedAt: string | null;
  deletedAt: string | null;
  lockedAt: string | null;
  flagged: boolean;
  suspicious: boolean;
  investigationStatus: string;
  conversationDisabled: boolean;
  adminNote: string | null;
  participantA: ChatParticipant | null;
  participantB: ChatParticipant | null;
  conversation: {
    total: number;
    text: number;
    images: number;
    voice: number;
    replies: number;
    reactions: number;
    read: number;
    firstAt: string | null;
    lastAt: string | null;
    startedBy: string | null;
  } | null;
  timeline: ChatTimelineEvent[];
  reports: ChatReportRef[];
};

export type AdminChatMessage = {
  id: string;
  sender_id: string | null;
  body: string | null;
  image_path: string | null;
  image_url: string | null;
  audio_path: string | null;
  audio_url: string | null;
  audio_duration_ms: number | null;
  kind: string;
  reply_to: string | null;
  reactions: Record<string, string[]>;
  read_at: string | null;
  delivered_at: string | null;
  created_at: string;
  flagged: boolean;
  hidden_at: string | null;
  reply: { id: string; body: string | null; senderId: string | null; kind: string } | null;
};

export type ChatMessagesPage = { messages: AdminChatMessage[]; hasMore: boolean };

export type ChatNote = {
  id: string;
  body: string;
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChatAction = {
  id: string;
  action: string;
  reason: string | null;
  previousState: Record<string, Json>;
  newState: Record<string, Json>;
  adminName: string | null;
  createdAt: string;
};

export type ChatAnalytics = {
  messagesByDay: { day: string; count: number }[];
  mediaByDay: { day: string; images: number; voice: number }[];
  byCollege: { name: string; count: number }[];
};

// --------------------------------------------------------------- validators
const filtersSchema = z
  .object({
    status: z.string().optional(),
    college: z.string().optional(),
    activity: z.string().optional(),
    reported: z.boolean().optional(),
    has_media: z.boolean().optional(),
    has_voice: z.boolean().optional(),
    has_replies: z.boolean().optional(),
    has_reactions: z.boolean().optional(),
    no_messages: z.boolean().optional(),
    date_from: z.string().optional(),
    date_to: z.string().optional(),
  })
  .partial();

const listInput = z.object({
  search: z.string().max(80).optional().default(""),
  filters: filtersSchema.optional().default({}),
  sort: z
    .enum([
      "newest",
      "oldest",
      "last_activity",
      "most_messages",
      "least_messages",
      "most_media",
      "most_reports",
    ])
    .optional()
    .default("newest"),
  limit: z.number().int().min(1).max(100).optional().default(25),
  offset: z.number().int().min(0).optional().default(0),
});

const idInput = z.object({ chatId: z.string().uuid() });
const reasonInput = z.object({ chatId: z.string().uuid(), reason: z.string().max(500).optional() });
const toggleInput = z.object({ chatId: z.string().uuid(), value: z.boolean(), reason: z.string().max(500).optional() });
const messagesInput = z.object({
  chatId: z.string().uuid(),
  before: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional().default(40),
});
const escalateInput = z.object({
  chatId: z.string().uuid(),
  status: z.enum(["none", "investigating", "resolved"]),
  reason: z.string().max(500).optional(),
});
const flagMessageInput = z.object({
  messageId: z.string().uuid(),
  value: z.boolean(),
  reason: z.string().max(500).optional(),
});
const addNoteInput = z.object({ chatId: z.string().uuid(), body: z.string().min(1).max(4000) });

// -------------------------------------------------------------------- reads
export const getChatStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ChatStats> => {
    const { data, error } = await context.supabase.rpc("admin_chat_stats");
    if (error) throw new Error(error.message);
    return data as unknown as ChatStats;
  });

export const listAdminChats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listInput.parse(d))
  .handler(async ({ data, context }): Promise<{ rows: AdminChatRow[]; total: number }> => {
    const { data: rows, error } = await context.supabase.rpc("admin_list_chats", {
      _search: data.search,
      _filters: data.filters as never,
      _sort: data.sort,
      _limit: data.limit,
      _offset: data.offset,
    });
    if (error) throw new Error(error.message);
    const list = (rows as unknown as AdminChatRow[]) ?? [];
    const signed = await signAdminPaths(
      context.supabase,
      list.flatMap((r) => [r.user_a_avatar, r.user_b_avatar]),
    );
    const withAvatars = list.map((r) => ({
      ...r,
      user_a_avatar: resolveAdminUrl(r.user_a_avatar, signed),
      user_b_avatar: resolveAdminUrl(r.user_b_avatar, signed),
      total_messages: Number(r.total_messages),
      images: Number(r.images),
      voice: Number(r.voice),
      replies: Number(r.replies),
      reactions: Number(r.reactions),
      read_count: Number(r.read_count),
      reports_count: Number(r.reports_count),
    }));
    return { rows: withAvatars, total: withAvatars.length > 0 ? Number(withAvatars[0].total_count) : 0 };
  });

export const getChatDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ data, context }): Promise<AdminChatDetail | null> => {
    const { data: res, error } = await context.supabase.rpc("admin_chat_detail", { _chat_id: data.chatId });
    if (error) throw new Error(error.message);
    if (!res) return null;
    const detail = res as unknown as AdminChatDetail;
    const signed = await signAdminPaths(context.supabase, [
      detail.participantA?.avatar,
      detail.participantB?.avatar,
    ]);
    return {
      ...detail,
      participantA: detail.participantA
        ? { ...detail.participantA, avatar: resolveAdminUrl(detail.participantA.avatar, signed) }
        : null,
      participantB: detail.participantB
        ? { ...detail.participantB, avatar: resolveAdminUrl(detail.participantB.avatar, signed) }
        : null,
    };
  });

export const getChatMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => messagesInput.parse(d))
  .handler(async ({ data, context }): Promise<ChatMessagesPage> => {
    const { data: res, error } = await context.supabase.rpc("admin_chat_messages", {
      _chat_id: data.chatId,
      _before: data.before ?? undefined,
      _limit: data.limit,
    });
    if (error) throw new Error(error.message);
    const page = (res as unknown as { messages: AdminChatMessage[]; hasMore: boolean }) ?? {
      messages: [],
      hasMore: false,
    };
    const messages = page.messages ?? [];
    const signed = await signChatMedia(
      context.supabase,
      messages.flatMap((m) => [m.image_path, m.audio_path]),
    );
    return {
      hasMore: page.hasMore,
      messages: messages.map((m) => ({
        ...m,
        reactions: m.reactions ?? {},
        image_url: resolveChatUrl(m.image_path, signed),
        audio_url: resolveChatUrl(m.audio_path, signed),
      })),
    };
  });

export const getChatNotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ data, context }): Promise<ChatNote[]> => {
    const { data: res, error } = await context.supabase.rpc("admin_chat_notes", { _chat_id: data.chatId });
    if (error) throw new Error(error.message);
    return (res as unknown as ChatNote[]) ?? [];
  });

export const getChatActions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ data, context }): Promise<ChatAction[]> => {
    const { data: res, error } = await context.supabase.rpc("admin_chat_actions", { _chat_id: data.chatId });
    if (error) throw new Error(error.message);
    return (res as unknown as ChatAction[]) ?? [];
  });

export const getChatAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ChatAnalytics> => {
    const { data, error } = await context.supabase.rpc("admin_chat_analytics");
    if (error) throw new Error(error.message);
    return data as unknown as ChatAnalytics;
  });

// --------------------------------------------------------------- mutations
export const lockChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => toggleInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { data: res, error } = await context.supabase.rpc("admin_lock_chat", {
      _chat_id: data.chatId,
      _lock: data.value,
      _reason: data.reason ?? undefined,
    });
    if (error) throw new Error(error.message);
    return res as unknown as { ok: boolean };
  });

export const archiveChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => toggleInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { data: res, error } = await context.supabase.rpc("admin_archive_chat", {
      _chat_id: data.chatId,
      _restore: data.value,
      _reason: data.reason ?? undefined,
    });
    if (error) throw new Error(error.message);
    return res as unknown as { ok: boolean };
  });

export const flagChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => toggleInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { data: res, error } = await context.supabase.rpc("admin_flag_chat", {
      _chat_id: data.chatId,
      _flag: data.value,
      _reason: data.reason ?? undefined,
    });
    if (error) throw new Error(error.message);
    return res as unknown as { ok: boolean };
  });

export const escalateChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => escalateInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { data: res, error } = await context.supabase.rpc("admin_escalate_chat", {
      _chat_id: data.chatId,
      _status: data.status,
      _reason: data.reason ?? undefined,
    });
    if (error) throw new Error(error.message);
    return res as unknown as { ok: boolean };
  });

export const deleteChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => reasonInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { data: res, error } = await context.supabase.rpc("admin_delete_chat", {
      _chat_id: data.chatId,
      _reason: data.reason ?? undefined,
    });
    if (error) throw new Error(error.message);
    return res as unknown as { ok: boolean };
  });

export const flagChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => flagMessageInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { data: res, error } = await context.supabase.rpc("admin_flag_message", {
      _message_id: data.messageId,
      _flag: data.value,
      _reason: data.reason ?? undefined,
    });
    if (error) throw new Error(error.message);
    return res as unknown as { ok: boolean };
  });

export const addChatNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => addNoteInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { error } = await context.supabase
      .from("chat_moderator_notes")
      .insert({ chat_id: data.chatId, author_id: context.userId, body: data.body });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ----------------------------------------------------------- media signing
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

async function signChatMedia(
  client: SignerClient,
  paths: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const toSign = Array.from(new Set(paths.filter((p): p is string => !!p && !p.startsWith("http"))));
  const map = new Map<string, string>();
  if (toSign.length === 0) return map;
  const { data } = await client.storage.from(CHAT_BUCKET).createSignedUrls(toSign, 3600);
  for (const row of data ?? []) {
    if (row.signedUrl && row.path) map.set(row.path, row.signedUrl);
  }
  return map;
}

function resolveChatUrl(raw: string | null | undefined, signed: Map<string, string>): string | null {
  if (!raw) return null;
  if (raw.startsWith("http")) return raw;
  return signed.get(raw) ?? null;
}

// -------------------------------------------------------------- queryOptions
export const chatStatsQuery = () =>
  queryOptions({ queryKey: ["admin", "chats", "stats"], queryFn: () => getChatStats() });

export const adminChatsQuery = (params: z.input<typeof listInput>) =>
  queryOptions({ queryKey: ["admin", "chats", "list", params], queryFn: () => listAdminChats({ data: params }) });

export const chatAnalyticsQuery = () =>
  queryOptions({ queryKey: ["admin", "chats", "analytics"], queryFn: () => getChatAnalytics() });

export const chatDetailQuery = (chatId: string) =>
  queryOptions({ queryKey: ["admin", "chat", chatId], queryFn: () => getChatDetail({ data: { chatId } }) });

export const chatNotesQuery = (chatId: string) =>
  queryOptions({ queryKey: ["admin", "chat", chatId, "notes"], queryFn: () => getChatNotes({ data: { chatId } }) });

export const chatActionsQuery = (chatId: string) =>
  queryOptions({ queryKey: ["admin", "chat", chatId, "actions"], queryFn: () => getChatActions({ data: { chatId } }) });
