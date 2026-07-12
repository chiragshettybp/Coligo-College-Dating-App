# Public Module — Phase-Wise Implementation Plan

A production-ready public section for the College Dating App: 6 routes, all content driven by Supabase (no hardcoded copy or numbers), reusing the existing `/ui` design system exactly.

## Guiding constraints
- **Design system**: reuse only `src/components/ds/*` (`Card`, `GlassPanel`, `Button`, `Chip`, `Text`, `TextField`, `Toggle`, `Skeleton`, `TopBar`, `BottomSheet`, `EmptyStateCard`, etc.) and tokens in `src/lib/ds.ts`. No new visual styles.
- **Data**: every stat, FAQ, legal document, company fact, college ranking, and screenshot comes from Supabase. Public reads via a server publishable client + narrow `TO anon` SELECT policies. Contact writes via an `anon` INSERT policy with validation.
- **Stack rules**: TanStack Start file routes under `src/routes/`, data via `createServerFn` + `queryOptions` + loader `ensureQueryData` + `useSuspenseQuery`. Each route gets its own `head()`, `errorComponent`, `notFoundComponent`.
- **Mobile-first**, sticky nav → drawer on mobile, animated section reveals, reduced-motion support, semantic HTML + ARIA.

---

## Phase 1 — Database schema & seed content
One migration creating all tables with GRANTs, RLS, and `updated_at` triggers, followed by a seed data insert.

Tables (all in `public`):
- `landing_statistics` — key (text), label, value (bigint), display_order. Public read.
- `featured_colleges` — name, city, verified_students (int), rank/display_order, logo_url. Public read.
- `faqs` — question, answer, category, display_order, is_published. Public read (published only).
- `legal_documents` — slug (`privacy`|`terms`|`community-guidelines`), title, version (int), sections (jsonb: array of {heading, type, content/items}), last_updated, is_current. Public read (current only).
- `company_information` — key, title, body, section_type (overview/mission/vision/goal/safety/roadmap/milestone), display_order. Public read.
- `homepage_media` — title, caption, storage_path, display_order, is_published. Public read.
- `contact_messages` — name, email, subject, category, message, status (default `new`), created_at, ip/user-agent audit columns. **anon INSERT** (with a `WITH CHECK` length/format guard); **no anon SELECT** (privacy). service_role full.

RLS: read tables get `TO anon` SELECT scoped to published/current rows. `contact_messages` gets anon INSERT only. Storage bucket `homepage-media` (public) for screenshots created via the storage tool.

Seed: real starter content for legal docs (privacy/terms/community-guidelines full sections), FAQs, company info, statistics, featured colleges (a handful of real Indian colleges), homepage media rows.

## Phase 2 — Shared public layout
- `src/routes/_public/route.tsx` pathless layout (SSR on) rendering shared **PublicNav** (sticky, logo, Get Started + Login buttons, active highlighting, mobile drawer via `BottomSheet`) + `<Outlet />` + **PublicFooter** (legal links, contact, copyright, social placeholders).
- Move the 6 public routes under `_public/` so they share chrome; smooth scroll + scroll-reveal helper hook honoring `prefers-reduced-motion`.
- New presentational components in `src/components/public/` (composed from `ds/*` only): `PublicNav`, `PublicFooter`, `SectionReveal`, `LegalDocument` renderer (jsonb → headings/paragraphs/lists), `Timeline`.

## Phase 3 — Data layer (server functions + query options)
- `src/lib/public-content.functions.ts`: public `createServerFn` readers using the server publishable client (anon) — `getLandingStats`, `getFeaturedColleges`, `getFaqs`, `getLegalDocument(slug)`, `getCompanyInfo`, `getHomepageMedia`. All safe-column projections.
- `src/lib/contact.functions.ts`: `submitContactMessage` — Zod-validated (trim, email, lengths, category enum), inserts via anon client, returns success; duplicate-submission guard (client dedupe + recent-duplicate check).
- `queryOptions` factories for each reader for loader priming + `useSuspenseQuery`.

## Phase 4 — Landing page (`/`)
Replace placeholder `index.tsx`. Sections: hero + value prop, dual CTAs (Get Started → `/auth`, Login → `/auth`), feature overview (5 features via `Card`/`Chip`), live statistics (from `landing_statistics`), college rankings preview (`featured_colleges`), featured screenshots (Storage-backed `homepage_media`), FAQ (`faqs`, accordion via existing patterns), footer. Skeleton loaders, animated reveals.

## Phase 5 — Legal pages (`/privacy`, `/terms`, `/community-guidelines`)
Three routes rendering `legal_documents` via the `LegalDocument` renderer. Terms shows version + last-updated; community-guidelines renders categorized icon cards. Each has own `head()`, skeletons, back-to-home.

## Phase 6 — About (`/about`)
Company overview/mission/vision/goals/safety/student-first/verification/roadmap from `company_information`, milestones via `Timeline`, live totals (colleges + registered users) from stats.

## Phase 7 — Contact (`/contact`)
Accessible form (name/email/subject/category/message) using `TextField` + validation, loading/disabled states, success confirmation, duplicate prevention, support email + social placeholders. Writes to `contact_messages`.

## Phase 8 — SEO, a11y & verification
Per-route `head()` (title/description/OG/twitter), single H1 per page, keyboard/focus/ARIA passes, lazy images, prefetch on intent. Verify: typecheck, build, Playwright smoke of all 6 routes (nav, drawer, form submit, deep links), confirm live data renders.

---

## Notes / decisions
- **Auth**: these are public pages; CTAs point to `/auth` (an auth route isn't in this prompt's scope — I'll link to `/auth` as the target). Say if you want a stub `/auth` too.
- `contact_messages` is intentionally **not** anon-readable (only insert) to protect submissions; you'd read them from an admin surface later.
- "Realtime/optimistic" is applied where meaningful (contact success feedback); legal/marketing content is cache-first via TanStack Query.

Approve and I'll execute phase by phase, starting with the migration.