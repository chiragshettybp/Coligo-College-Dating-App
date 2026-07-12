// ============================================================================
// Public content server functions — read-only, anon-scoped Supabase access.
// These power the marketing, legal and about pages. Every reader uses the
// server publishable client (anon key) so RLS applies as an anonymous user.
// ============================================================================
import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

// ---------------------------------------------------------------- Statistics
export type LandingStat = {
  key: string;
  label: string;
  value: number;
  suffix: string;
};

export const getLandingStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<LandingStat[]> => {
    const supabase = publicClient();
    const { data, error } = await supabase
      .from("landing_statistics")
      .select("key, label, value, suffix, display_order")
      .order("display_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      key: r.key,
      label: r.label,
      value: Number(r.value),
      suffix: r.suffix ?? "",
    }));
  },
);

export const landingStatsQuery = () =>
  queryOptions({
    queryKey: ["public", "landing-stats"],
    queryFn: () => getLandingStats(),
    staleTime: 5 * 60_000,
  });

// ------------------------------------------------------------ Featured colleges
export type FeaturedCollege = {
  id: string;
  name: string;
  city: string;
  verifiedStudents: number;
  logoUrl: string | null;
};

export const getFeaturedColleges = createServerFn({ method: "GET" }).handler(
  async (): Promise<FeaturedCollege[]> => {
    const supabase = publicClient();
    const { data, error } = await supabase
      .from("featured_colleges")
      .select("id, name, city, verified_students, logo_url, display_order")
      .order("verified_students", { ascending: false })
      .order("display_order", { ascending: true })
      .limit(8);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      city: r.city ?? "",
      verifiedStudents: r.verified_students ?? 0,
      logoUrl: r.logo_url,
    }));
  },
);

export const featuredCollegesQuery = () =>
  queryOptions({
    queryKey: ["public", "featured-colleges"],
    queryFn: () => getFeaturedColleges(),
    staleTime: 5 * 60_000,
  });

// ------------------------------------------------------------------------ FAQs
export type Faq = {
  id: string;
  question: string;
  answer: string;
  category: string;
};

export const getFaqs = createServerFn({ method: "GET" }).handler(
  async (): Promise<Faq[]> => {
    const supabase = publicClient();
    const { data, error } = await supabase
      .from("faqs")
      .select("id, question, answer, category, display_order")
      .eq("is_published", true)
      .order("display_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id,
      question: r.question,
      answer: r.answer,
      category: r.category ?? "general",
    }));
  },
);

export const faqsQuery = () =>
  queryOptions({
    queryKey: ["public", "faqs"],
    queryFn: () => getFaqs(),
    staleTime: 5 * 60_000,
  });

// ------------------------------------------------------------- Legal documents
export type LegalSection =
  | { heading: string; type: "paragraph"; content: string }
  | { heading: string; type: "list"; items: string[] };

export type LegalDocument = {
  slug: string;
  title: string;
  version: number;
  sections: LegalSection[];
  lastUpdated: string;
};

export const getLegalDocument = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z
      .object({
        slug: z.enum(["privacy", "terms", "community-guidelines"]),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<LegalDocument | null> => {
    const supabase = publicClient();
    const { data: row, error } = await supabase
      .from("legal_documents")
      .select("slug, title, version, sections, last_updated")
      .eq("slug", data.slug)
      .eq("is_current", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    return {
      slug: row.slug,
      title: row.title,
      version: row.version ?? 1,
      sections: (row.sections as unknown as LegalSection[]) ?? [],
      lastUpdated: row.last_updated,
    };
  });

export const legalDocumentQuery = (slug: LegalDocument["slug"]) =>
  queryOptions({
    queryKey: ["public", "legal", slug],
    queryFn: () => getLegalDocument({ data: { slug } }),
    staleTime: 5 * 60_000,
  });

// -------------------------------------------------------- Company information
export type CompanyInfo = {
  key: string;
  title: string;
  body: string;
  sectionType: string;
  meta: Record<string, string>;
};

export const getCompanyInfo = createServerFn({ method: "GET" }).handler(
  async (): Promise<CompanyInfo[]> => {
    const supabase = publicClient();
    const { data, error } = await supabase
      .from("company_information")
      .select("key, title, body, section_type, meta, display_order")
      .eq("is_published", true)
      .order("display_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      key: r.key,
      title: r.title,
      body: r.body ?? "",
      sectionType: r.section_type ?? "overview",
      meta: (r.meta as unknown as Record<string, string>) ?? {},
    }));
  },
);

export const companyInfoQuery = () =>
  queryOptions({
    queryKey: ["public", "company-info"],
    queryFn: () => getCompanyInfo(),
    staleTime: 5 * 60_000,
  });

// -------------------------------------------------------------- Homepage media
export type HomepageMedia = {
  id: string;
  title: string;
  caption: string;
  url: string;
};

export const getHomepageMedia = createServerFn({ method: "GET" }).handler(
  async (): Promise<HomepageMedia[]> => {
    const supabase = publicClient();
    const { data, error } = await supabase
      .from("homepage_media")
      .select("id, title, caption, storage_path, display_order")
      .eq("is_published", true)
      .order("display_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => {
      const path = r.storage_path ?? "";
      const url = /^https?:\/\//.test(path)
        ? path
        : supabase.storage.from("homepage-media").getPublicUrl(path).data.publicUrl;
      return {
        id: r.id,
        title: r.title ?? "",
        caption: r.caption ?? "",
        url,
      };
    });
  },
);

export const homepageMediaQuery = () =>
  queryOptions({
    queryKey: ["public", "homepage-media"],
    queryFn: () => getHomepageMedia(),
    staleTime: 5 * 60_000,
  });
