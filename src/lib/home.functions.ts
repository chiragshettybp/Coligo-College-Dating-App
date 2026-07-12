// ============================================================================
// Home module server functions — authenticated, RLS-scoped.
// Aggregates (college stats, rankings, platform stats, new members) are served
// by SECURITY DEFINER RPCs so no individual profile row is ever exposed. Avatar
// paths (private bucket) are signed server-side for display.
// ============================================================================
import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "profile-photos";
const SIGN_TTL = 3600;

// ------------------------------------------------------------------ Types ----
export type GenderMap = Record<string, number>;

export type CollegeSummary = {
  id: string;
  name: string;
  city: string | null;
  logoUrl: string | null;
  rank: number | null;
  memberCount: number;
  departmentCount: number;
  gender: GenderMap;
};

export type RankingRow = {
  id: string;
  name: string;
  city: string | null;
  logoUrl: string | null;
  memberCount: number;
  growth30d: number;
  rank: number;
};

export type PlatformStats = {
  totalStudents: number;
  participatingColleges: number;
  activeUsers: number;
  matchesToday: number;
};

export type MatchesToday = { total: number; mine: number };

export type NewMember = {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  collegeName: string | null;
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  isPinned: boolean;
  priority: number;
  publishedAt: string;
};

export type HomeDashboard = {
  profile: {
    id: string;
    firstName: string | null;
    fullName: string | null;
    avatarUrl: string | null;
    collegeId: string | null;
  };
  college: CollegeSummary | null;
  rankingsPreview: RankingRow[];
  platform: PlatformStats;
  matches: MatchesToday;
  newMembers: NewMember[];
  announcements: Announcement[];
};

export type CollegeDetail = {
  id: string;
  name: string;
  city: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  description: string | null;
  rank: number | null;
  memberCount: number;
  departmentCount: number;
  gender: GenderMap;
  departments: { name: string; count: number }[];
  gradYears: { year: number; count: number }[];
  topInterests: { name: string; count: number }[];
};

// --------------------------------------------------------------- Helpers -----
function firstNameOf(full: string | null): string | null {
  if (!full) return null;
  return full.trim().split(/\s+/)[0] ?? null;
}

type StatsJson = {
  member_count?: number;
  department_count?: number;
  gender?: GenderMap;
  grad_years?: { year: number; count: number }[];
  departments?: { name: string; count: number }[];
  top_interests?: { name: string; count: number }[];
};

/** Batch-sign private avatar storage paths using the admin client. Only the
 *  curated public-facing paths passed here are ever signed. Full https URLs are
 *  passed through untouched. */
async function signAvatars(paths: (string | null)[]): Promise<Map<string, string>> {
  const toSign = Array.from(
    new Set(paths.filter((p): p is string => !!p && !p.startsWith("http"))),
  );
  const map = new Map<string, string>();
  if (toSign.length === 0) return map;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.storage.from(BUCKET).createSignedUrls(toSign, SIGN_TTL);
  for (const row of data ?? []) {
    if (row.signedUrl && row.path) map.set(row.path, row.signedUrl);
  }
  return map;
}

function resolveUrl(raw: string | null, signed: Map<string, string>): string | null {
  if (!raw) return null;
  if (raw.startsWith("http")) return raw;
  return signed.get(raw) ?? null;
}

// ---------------------------------------------------------- Home dashboard ---
export const getHomeDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<HomeDashboard> => {
    const { supabase, userId } = context;

    const { data: prof, error: profErr } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, college_id")
      .eq("id", userId)
      .maybeSingle();
    if (profErr) throw new Error(profErr.message);

    const collegeId = prof?.college_id ?? null;

    const [
      collegeRes,
      statsRes,
      rankRes,
      rankingsRes,
      platformRes,
      matchesRes,
      membersRes,
      annRes,
    ] = await Promise.all([
      collegeId
        ? supabase.from("colleges").select("id, name, city, logo_url, is_active").eq("id", collegeId).maybeSingle()
        : Promise.resolve({ data: null, error: null } as const),
      collegeId ? supabase.rpc("college_stats", { _college_id: collegeId }) : Promise.resolve({ data: null, error: null } as const),
      collegeId ? supabase.rpc("college_rank", { _college_id: collegeId }) : Promise.resolve({ data: null, error: null } as const),
      supabase.rpc("college_rankings", { _search: "", _limit: 5, _offset: 0 }),
      supabase.rpc("platform_stats"),
      supabase.rpc("my_matches_today", { _user_id: userId }),
      supabase.rpc("new_members", { _limit: 8 }),
      supabase
        .from("announcements")
        .select("id, title, body, is_pinned, priority, published_at")
        .order("is_pinned", { ascending: false })
        .order("priority", { ascending: false })
        .order("published_at", { ascending: false })
        .limit(10),
    ]);

    const members = (membersRes.data ?? []) as NewMember[] extends never ? never : {
      id: string; full_name: string | null; avatar_url: string | null; college_name: string | null;
    }[];

    const signed = await signAvatars([prof?.avatar_url ?? null, ...members.map((m) => m.avatar_url)]);

    const stats = (statsRes.data ?? null) as StatsJson | null;
    const collegeRow = collegeRes.data;
    const college: CollegeSummary | null =
      collegeRow && collegeRow.is_active !== false
        ? {
            id: collegeRow.id,
            name: collegeRow.name,
            city: collegeRow.city,
            logoUrl: resolveUrl(collegeRow.logo_url ?? null, signed),
            rank: (rankRes.data as number | null) ?? null,
            memberCount: stats?.member_count ?? 0,
            departmentCount: stats?.department_count ?? 0,
            gender: stats?.gender ?? {},
          }
        : null;

    const platform = (platformRes.data ?? {}) as {
      total_students?: number; participating_colleges?: number; active_users?: number; matches_today?: number;
    };
    const matches = (matchesRes.data ?? {}) as { total?: number; mine?: number };

    return {
      profile: {
        id: userId,
        firstName: firstNameOf(prof?.full_name ?? null),
        fullName: prof?.full_name ?? null,
        avatarUrl: resolveUrl(prof?.avatar_url ?? null, signed),
        collegeId,
      },
      college,
      rankingsPreview: mapRankings(rankingsRes.data),
      platform: {
        totalStudents: platform.total_students ?? 0,
        participatingColleges: platform.participating_colleges ?? 0,
        activeUsers: platform.active_users ?? 0,
        matchesToday: platform.matches_today ?? 0,
      },
      matches: { total: matches.total ?? 0, mine: matches.mine ?? 0 },
      newMembers: members.map((m) => ({
        id: m.id,
        name: m.full_name,
        avatarUrl: resolveUrl(m.avatar_url, signed),
        collegeName: m.college_name,
      })),
      announcements: (annRes.data ?? []).map((a) => ({
        id: a.id,
        title: a.title,
        body: a.body,
        isPinned: a.is_pinned,
        priority: a.priority,
        publishedAt: a.published_at,
      })),
    };
  });

function mapRankings(
  data: unknown,
): RankingRow[] {
  const rows = (data ?? []) as {
    id: string; name: string; city: string | null; logo_url: string | null;
    member_count: number; growth_30d: number; rank: number;
  }[];
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    city: r.city,
    logoUrl: r.logo_url && r.logo_url.startsWith("http") ? r.logo_url : null,
    memberCount: Number(r.member_count) || 0,
    growth30d: Number(r.growth_30d) || 0,
    rank: Number(r.rank) || 0,
  }));
}

export const homeDashboardQuery = () =>
  queryOptions({
    queryKey: ["home", "dashboard"],
    queryFn: () => getHomeDashboard(),
    staleTime: 30_000,
  });

// ---------------------------------------------------------- College rankings -
export const getCollegeRankings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { search?: string; limit?: number; offset?: number }) =>
    z
      .object({
        search: z.string().max(120).optional().default(""),
        limit: z.number().int().min(1).max(50).optional().default(20),
        offset: z.number().int().min(0).optional().default(0),
      })
      .parse(input),
  )
  .handler(async ({ context, data }): Promise<{ rows: RankingRow[]; hasMore: boolean }> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase.rpc("college_rankings", {
      _search: data.search,
      _limit: data.limit + 1,
      _offset: data.offset,
    });
    if (error) throw new Error(error.message);
    const mapped = mapRankings(rows);
    const hasMore = mapped.length > data.limit;
    return { rows: hasMore ? mapped.slice(0, data.limit) : mapped, hasMore };
  });

export const collegeRankingsQuery = (search: string) =>
  queryOptions({
    queryKey: ["home", "rankings", search],
    queryFn: () => getCollegeRankings({ data: { search, limit: 20, offset: 0 } }),
    staleTime: 30_000,
  });

// ------------------------------------------------------------ College detail -
export const getCollegeDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { collegeId: string }) =>
    z.object({ collegeId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }): Promise<CollegeDetail | null> => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("colleges")
      .select("id, name, city, logo_url, banner_url, description, is_active")
      .eq("id", data.collegeId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row || row.is_active === false) return null;

    const [statsRes, rankRes] = await Promise.all([
      supabase.rpc("college_stats", { _college_id: data.collegeId }),
      supabase.rpc("college_rank", { _college_id: data.collegeId }),
    ]);
    const stats = (statsRes.data ?? {}) as StatsJson;

    return {
      id: row.id,
      name: row.name,
      city: row.city,
      logoUrl: row.logo_url && row.logo_url.startsWith("http") ? row.logo_url : null,
      bannerUrl: row.banner_url && row.banner_url.startsWith("http") ? row.banner_url : null,
      description: row.description ?? null,
      rank: (rankRes.data as number | null) ?? null,
      memberCount: stats.member_count ?? 0,
      departmentCount: stats.department_count ?? 0,
      gender: stats.gender ?? {},
      departments: stats.departments ?? [],
      gradYears: stats.grad_years ?? [],
      topInterests: stats.top_interests ?? [],
    };
  });

export const collegeDetailQuery = (collegeId: string) =>
  queryOptions({
    queryKey: ["home", "college", collegeId],
    queryFn: () => getCollegeDetail({ data: { collegeId } }),
    staleTime: 30_000,
  });

// ------------------------------------------------------------- Announcements -
export const listAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Announcement[]> => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("announcements")
      .select("id, title, body, is_pinned, priority, published_at")
      .order("is_pinned", { ascending: false })
      .order("priority", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return (data ?? []).map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      isPinned: a.is_pinned,
      priority: a.priority,
      publishedAt: a.published_at,
    }));
  });
