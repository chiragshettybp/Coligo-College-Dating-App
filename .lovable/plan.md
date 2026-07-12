# Home Module — Implementation Plan

Builds the post-onboarding dashboard: `/home`, `/home/college-rankings`, `/home/college/:collegeId`. Every number is real Supabase data — college stats and rankings are **derived** from the `profiles` table (there is no stats table and no per-college student count column today), announcements come from a new table, and "online now" uses Supabase Realtime presence.

## Data reality check (important)

The current DB supports most of this directly. Three prompt items depend on modules that don't exist yet — handled honestly, no fakes:

- **Matches today** → a minimal real `matches` table is created now so the counter reads a true value (0 until Discovery ships). No fabricated number.
- **Messages exchanged today** → the Chat module and a messages table don't exist. This stat is **omitted** from Quick Stats until Chat ships (rather than showing a fake counter). Everything else in Quick Stats is real.
- **Departments per college** → `departments` is a global list not linked to colleges. "Departments available" and department distribution are derived from distinct `department_id` values on that college's `profiles`.

## Phase 0 — Backend foundation (migrations)

One migration, reviewed before code:

1. **`colleges`** — add nullable presentation columns: `logo_url`, `banner_url`, `description`. Ranking/counts stay derived (never stored/stale).
2. **`announcements`** table: `title`, `body`, `priority` (int), `is_pinned` (bool), `published_at`, `expires_at` (nullable), `is_active`. GRANTs: `SELECT` to `anon`+`authenticated`, `ALL` to `service_role`. RLS: public read policy limited to active, published, non-expired rows. (Admin writes come via a later Admin module / service role.)
3. **`matches`** table (minimal, real): `user_a`, `user_b`, `created_at`, unique pair. GRANTs + RLS scoped so a user only sees their own matches (`auth.uid() in (user_a,user_b)`); aggregate "today" count is served by a SECURITY DEFINER function.
4. **SECURITY DEFINER aggregate functions** (so counts never expose individual rows through RLS):
   - `college_stats(_college_id uuid)` → verified student count, gender ratio, department count, grad-year distribution, top interests.
   - `college_rankings(_limit, _offset, _search)` → colleges ranked by verified student count, with growth (new verified profiles in trailing 30 days).
   - `platform_stats()` → total verified students, participating colleges, active users (last_login in 24h), matches today.
   - `new_members(_limit)` → recent verified, onboarding-complete profiles (safe columns only: id, full_name, avatar_url, college name).
   Each `GRANT EXECUTE` to `authenticated`.
5. **Realtime**: `ALTER PUBLICATION supabase_realtime ADD TABLE announcements;` (rankings/stats refresh via presence + invalidation, not row streams).

## Phase 1 — Server functions & queries (`src/lib/home.functions.ts`)

Authenticated `createServerFn` (via `requireSupabaseAuth`) wrapping the RPCs and reads, each with a `queryOptions` factory and sensible `staleTime`:

- `getHomeDashboard` — one batched call returning profile summary, user's college + its stats, rankings preview (top 5), platform stats, new members, active announcements. Minimizes round-trips (addresses "reduce backend requests").
- `getCollegeRankings({ search, limit, offset })` — paginated/infinite list.
- `getCollegeDetail(collegeId)` — full college profile + aggregated stats; `notFound()` on missing/inactive.
- `listAnnouncements` — cached, realtime-invalidated.
- College logo/banner images resolved from Storage where present, else DS avatar/placeholder.

## Phase 2 — `/home` dashboard (`src/routes/_authenticated/home.tsx`)

Replaces the current placeholder. Loader primes `getHomeDashboard`; component uses `useSuspenseQuery`. Mobile-first vertical scroll, `BottomNav` shell, everything composed from `/ui` DS components (`Card`, `StatCard`, `Avatar`, `Chip`, `Skeleton`, `EmptyState`, `Button`, `Text`, `LargeTitleHeader`). Sections:

- **Header** — time-based greeting + first name, avatar (Storage → placeholder fallback), notification + settings `NavIconButton`s. Avatar tap → Profile.
- **College card** — logo, name, derived ranking, verified count, gender ratio, department count, Quick View → `/home/college/:id`. Handles missing/deleted college.
- **Rankings preview** — top 5 `StatCard`/rows with rank, name, count, growth; "View all" → rankings.
- **Students online** — college + national counts from presence (Phase 5).
- **Matches today** — personal + total (real from `matches`), tap → Matches (route stub/coming-soon until built).
- **New members** — horizontal avatars; tap → discovery preview (stub until Discovery ships).
- **Start swiping** — prominent primary CTA card → Discovery (stub until built).
- **Quick stats** — verified students, participating colleges, active users, matches (messages omitted per data-reality note).
- **Announcements** — pinned first then priority/newest; tap opens detail (`BottomSheet`).

Skeleton loaders per section, empty states, retry actions, no layout shift, disabled-while-loading.

## Phase 3 — `/home/college-rankings`

`TopBar` back nav, `SearchBar` (debounced, local filter after first fetch), sort (rank/name/growth via `SegmentControl`), infinite scroll (IntersectionObserver) over `getCollegeRankings`. Row → college detail. Empty / slow / error / large-dataset handling.

## Phase 4 — `/home/college/:collegeId`

Dynamic route (`$collegeId`). Banner + logo, name, ranking, verified count, gender ratio, department distribution, grad-year distribution, top interests, students online, description. Back to Home / Rankings. Invalid/deleted → DS `EmptyState` + notFound handling. Loader-fed `head()` metadata.

## Phase 5 — Realtime, navigation, a11y, verification

- **Presence**: shared `useOnlinePresence` hook — one Supabase presence channel keyed by user+college, tracked in `useEffect` with cleanup (`removeChannel`). Powers college + national online counts; handles disconnect/recovery/offline.
- **Announcements realtime**: subscribe in `useEffect`, invalidate query on change.
- **Rankings/stats**: refresh on presence sync + on window focus (avoids heavy row streaming).
- **Navigation**: `BottomNav` wired (Home active; Discovery/Matches/Profile/Settings shortcuts route to existing or coming-soon stubs), deep-linking, back nav, invalid route → 404.
- **Access rules**: only authenticated + `onboardingCompleted` users (loader redirect to `/onboarding`, already enforced by `_authenticated` gate + splash).
- **Accessibility**: keyboard nav, ARIA labels, focus states, semantic HTML, reduced-motion respected (DS already does), responsive type.
- **Verify**: `tsgo` typecheck, Supabase linter after migration, and a Playwright pass on `/home` + subroutes (using the injected session) with screenshots.

## Technical notes

- No profile rows are exposed for aggregates — all counts flow through SECURITY DEFINER RPCs returning only numbers/safe columns.
- Rankings are computed live (ordered by verified student count); growth = trailing-30-day new verified profiles.
- Caching: reference/stat queries get `staleTime` (30–120s) + realtime/focus invalidation to satisfy "never fetch identical data twice".
- Design system is reused verbatim from `/ui`; no new visual patterns.

## Out of scope (dependent on later modules)

Discovery swiping, Matches list, Chat/messages, Notifications feed, and Admin announcement management are stubbed as coming-soon destinations and wired in when those modules are built.
